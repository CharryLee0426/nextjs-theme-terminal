import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  galleryPosts: defineTable({
    title: v.string(),
    text: v.string(),
    imageIds: v.array(v.id("_storage")),
    /** User-chosen ordering time (ms since epoch); newest appears first (left). */
    displayAt: v.number(),
    likes: v.number(),
    dislikes: v.number(),
  }).index("by_displayAt", ["displayAt"]),
});
