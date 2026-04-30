import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// Override auth `users` to add `role`; keep fields aligned with @convex-dev/auth.
const users = defineTable({
  name: v.optional(v.string()),
  image: v.optional(v.string()),
  email: v.optional(v.string()),
  emailVerificationTime: v.optional(v.number()),
  phone: v.optional(v.string()),
  phoneVerificationTime: v.optional(v.number()),
  isAnonymous: v.optional(v.boolean()),
  role: v.optional(v.string()),
})
  .index("email", ["email"])
  .index("phone", ["phone"]);

export default defineSchema({
  ...authTables,
  users,
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
