import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listPosts = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db
      .query("galleryPosts")
      .withIndex("by_displayAt")
      .order("desc")
      .collect();

    return Promise.all(
      posts.map(async (p) => ({
        _id: p._id,
        title: p.title,
        text: p.text,
        displayAt: p.displayAt,
        likes: p.likes,
        dislikes: p.dislikes,
        imageUrls: (
          await Promise.all(p.imageIds.map((id) => ctx.storage.getUrl(id)))
        ).filter((url): url is string => url != null),
      })),
    );
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const createPost = mutation({
  args: {
    title: v.string(),
    text: v.string(),
    imageIds: v.array(v.id("_storage")),
    displayAt: v.number(),
  },
  handler: async (ctx, args) => {
    const title = args.title.trim();
    const text = args.text.trim();
    if (!title) throw new Error("Title is required");
    if (!text) throw new Error("Text is required");
    if (args.imageIds.length === 0) {
      throw new Error("At least one image is required");
    }
    await ctx.db.insert("galleryPosts", {
      title,
      text,
      imageIds: args.imageIds,
      displayAt: args.displayAt,
      likes: 0,
      dislikes: 0,
    });
  },
});

export const like = mutation({
  args: { postId: v.id("galleryPosts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post) throw new Error("Post not found");
    await ctx.db.patch(postId, { likes: post.likes + 1 });
  },
});

export const dislike = mutation({
  args: { postId: v.id("galleryPosts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post) throw new Error("Post not found");
    await ctx.db.patch(postId, { dislikes: post.dislikes + 1 });
  },
});
