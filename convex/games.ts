import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, type MutationCtx } from "./_generated/server";

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
