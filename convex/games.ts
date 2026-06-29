import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

async function requireGameAdmin(ctx: MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError("Not signed in.");
  }
  const user = await ctx.db.get(userId);
  if (user?.role !== "admin") {
    throw new ConvexError("Games require administrator access.");
  }
}

async function requireUserId(ctx: MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError("Not signed in.");
  }
  return userId;
}

async function requireSessionOwner(
  ctx: MutationCtx,
  sessionId: Id<"gameChatSessions">,
) {
  const userId = await requireUserId(ctx);
  const session = await ctx.db.get(sessionId);
  if (!session || session.userId !== userId) {
    throw new ConvexError("Chat session not found.");
  }
  return session;
}

const chatMessageValidator = v.object({
  id: v.string(),
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  details: v.optional(v.array(v.string())),
});

const draftGameValidator = v.object({
  generated: v.optional(v.literal(true)),
  gameName: v.string(),
  slug: v.string(),
  fileName: v.string(),
  analysisFileName: v.string(),
  analysisMarkdown: v.string(),
  html: v.string(),
  imageUrl: v.string(),
  imageSource: v.string(),
  imageNote: v.optional(v.union(v.string(), v.null())),
  prompt: v.string(),
  visibleProcess: v.array(v.string()),
  verificationConclusion: v.union(v.literal("PASS"), v.literal("FAIL")),
  verificationReasons: v.array(v.string()),
  skillPath: v.string(),
  openAiModel: v.string(),
});

function sessionTitle(title: string, messages: Array<{ content: string }>) {
  const rawTitle = title.trim() || messages[0]?.content.trim() || "Untitled game chat";
  return rawTitle.length > 72 ? `${rawTitle.slice(0, 69)}...` : rawTitle;
}

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const games = await ctx.db
      .query("games")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();

    return Promise.all(
      games.map(async (game) => ({
        _id: game._id,
        name: game.name,
        prompt: game.prompt,
        createdAt: game.createdAt,
        likes: game.likes,
        htmlUrl: await ctx.storage.getUrl(game.htmlId),
        analysisUrl: game.analysisId ? await ctx.storage.getUrl(game.analysisId) : null,
        htmlFileName: game.htmlFileName,
        analysisFileName: game.analysisFileName,
        imageUrl: await ctx.storage.getUrl(game.imageId),
      })),
    );
  },
});

export const listChatSessions = query({
  args: { archived: v.optional(v.boolean()) },
  handler: async (ctx, { archived = false }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    const sessions = await ctx.db
      .query("gameChatSessions")
      .withIndex("by_user_updatedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return sessions
      .filter((session) => (archived ? session.archivedAt != null : session.archivedAt == null))
      .map((session) => ({
        _id: session._id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        archivedAt: session.archivedAt,
        messages: session.messages,
        draft: session.draft,
      }));
  },
});

export const saveChatSession = mutation({
  args: {
    sessionId: v.optional(v.id("gameChatSessions")),
    title: v.string(),
    messages: v.array(chatMessageValidator),
    draft: v.optional(draftGameValidator),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    const title = sessionTitle(args.title, args.messages);

    if (args.sessionId) {
      const session = await ctx.db.get(args.sessionId);
      if (!session || session.userId !== userId) {
        throw new ConvexError("Chat session not found.");
      }

      await ctx.db.patch(args.sessionId, {
        title,
        messages: args.messages,
        draft: args.draft,
        updatedAt: now,
        archivedAt: undefined,
      });
      return args.sessionId;
    }

    return await ctx.db.insert("gameChatSessions", {
      userId,
      title,
      createdAt: now,
      updatedAt: now,
      messages: args.messages,
      draft: args.draft,
    });
  },
});

export const archiveChatSession = mutation({
  args: { sessionId: v.id("gameChatSessions") },
  handler: async (ctx, { sessionId }) => {
    await requireSessionOwner(ctx, sessionId);
    await ctx.db.patch(sessionId, {
      archivedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const restoreChatSession = mutation({
  args: { sessionId: v.id("gameChatSessions") },
  handler: async (ctx, { sessionId }) => {
    await requireSessionOwner(ctx, sessionId);
    await ctx.db.patch(sessionId, {
      archivedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const deleteChatSession = mutation({
  args: { sessionId: v.id("gameChatSessions") },
  handler: async (ctx, { sessionId }) => {
    await requireSessionOwner(ctx, sessionId);
    await ctx.db.delete(sessionId);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("Not signed in.");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const createGame = mutation({
  args: {
    name: v.string(),
    slug: v.optional(v.string()),
    prompt: v.string(),
    htmlId: v.id("_storage"),
    analysisId: v.optional(v.id("_storage")),
    htmlFileName: v.optional(v.string()),
    analysisFileName: v.optional(v.string()),
    imageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("Not signed in.");
    }

    const name = args.name.trim();
    if (!name) {
      throw new ConvexError("Game name is required.");
    }

    return await ctx.db.insert("games", {
      userId,
      name,
      slug: args.slug,
      prompt: args.prompt.trim(),
      htmlId: args.htmlId,
      analysisId: args.analysisId,
      htmlFileName: args.htmlFileName,
      analysisFileName: args.analysisFileName,
      imageId: args.imageId,
      createdAt: Date.now(),
      likes: 0,
    });
  },
});

export const like = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) {
      throw new ConvexError("Game not found.");
    }
    await ctx.db.patch(gameId, { likes: game.likes + 1 });
  },
});

export const deleteGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    await requireGameAdmin(ctx);

    const game = await ctx.db.get(gameId);
    if (!game) {
      throw new ConvexError("Game not found.");
    }

    await Promise.all([
      ctx.storage.delete(game.htmlId),
      game.analysisId ? ctx.storage.delete(game.analysisId) : Promise.resolve(),
      ctx.storage.delete(game.imageId),
    ]);
    await ctx.db.delete(gameId);
  },
});
