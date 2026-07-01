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
  canvasImages: defineTable({
    userId: v.id("users"),
    imageId: v.id("_storage"),
    createdAt: v.number(),
    style: v.union(v.literal("none"), v.literal("anime")),
    model: v.string(),
    extraPrompt: v.string(),
  })
    .index("by_user_createdAt", ["userId", "createdAt"])
    .index("by_createdAt", ["createdAt"]),
  games: defineTable({
    userId: v.id("users"),
    name: v.string(),
    slug: v.optional(v.string()),
    prompt: v.string(),
    htmlId: v.id("_storage"),
    analysisId: v.optional(v.id("_storage")),
    htmlFileName: v.optional(v.string()),
    analysisFileName: v.optional(v.string()),
    imageId: v.id("_storage"),
    createdAt: v.number(),
    likes: v.number(),
  }).index("by_createdAt", ["createdAt"]),
  gameChatSessions: defineTable({
    userId: v.id("users"),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    archivedAt: v.optional(v.number()),
    messages: v.array(
      v.object({
        id: v.string(),
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
        details: v.optional(v.array(v.string())),
      }),
    ),
    draft: v.optional(
      v.object({
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
      }),
    ),
  })
    .index("by_user_updatedAt", ["userId", "updatedAt"])
    .index("by_user_archivedAt", ["userId", "archivedAt"]),
});
