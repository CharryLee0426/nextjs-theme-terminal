import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";

const styleValidator = v.union(v.literal("none"), v.literal("anime"));

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

export const createImage = mutation({
  args: {
    imageId: v.id("_storage"),
    style: styleValidator,
    model: v.string(),
    extraPrompt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("Not signed in.");
    }

    const model = args.model.trim();
    if (!model) {
      throw new ConvexError("Model is required.");
    }

    return await ctx.db.insert("canvasImages", {
      userId,
      imageId: args.imageId,
      createdAt: Date.now(),
      style: args.style,
      model,
      extraPrompt: args.extraPrompt.trim(),
    });
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    const images = await ctx.db
      .query("canvasImages")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return Promise.all(
      images.map(async (image) => ({
        _id: image._id,
        userId: image.userId,
        createdAt: image.createdAt,
        style: image.style,
        model: image.model,
        extraPrompt: image.extraPrompt,
        imageUrl: await ctx.storage.getUrl(image.imageId),
      })),
    );
  },
});
