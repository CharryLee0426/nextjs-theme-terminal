import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";

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
    prompt: v.string(),
    htmlId: v.id("_storage"),
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
      prompt: args.prompt.trim(),
      htmlId: args.htmlId,
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
