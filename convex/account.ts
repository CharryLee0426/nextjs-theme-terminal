import { v } from "convex/values";
import {
  query,
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import {
  getAuthUserId,
  retrieveAccount,
  modifyAccountCredentials,
} from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase();
}

function validateUsernameShape(username: string) {
  if (username.length < 3 || username.length > 32) {
    throw new ConvexError("Username must be 3–32 characters.");
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    throw new ConvexError(
      "Username may only contain lowercase letters, digits, and underscores.",
    );
  }
}

function validatePasswordShape(password: string) {
  if (!password || password.length < 8) {
    throw new ConvexError("Password must be at least 8 characters.");
  }
}

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
});

export const findPasswordAccountByUsername = internalQuery({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    return await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", username),
      )
      .unique();
  },
});

export const applyUsernameChange = internalMutation({
  args: {
    userId: v.id("users"),
    newProviderAccountId: v.string(),
    newDisplayName: v.string(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", args.userId).eq("provider", "password"),
      )
      .unique();
    if (!account) {
      throw new ConvexError("No password account for this user.");
    }
    await ctx.db.patch(account._id, {
      providerAccountId: args.newProviderAccountId,
    });
    await ctx.db.patch(args.userId, {
      email: args.newProviderAccountId,
      name: args.newDisplayName,
    });
  },
});

export const updateProfile = action({
  args: {
    currentPassword: v.string(),
    newUsername: v.optional(v.string()),
    newPassword: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("Not signed in.");
    }
    const user = await ctx.runQuery(internal.account.getUserById, {
      userId,
    });
    if (!user?.email) {
      throw new ConvexError("User record is missing.");
    }
    const currentKey = user.email;

    await retrieveAccount(ctx, {
      provider: "password",
      account: { id: currentKey, secret: args.currentPassword },
    });

    const trimmedNewUsername = args.newUsername?.trim();
    const hasNewUsername =
      trimmedNewUsername !== undefined && trimmedNewUsername.length > 0;
    const hasNewPassword =
      args.newPassword !== undefined && args.newPassword.length > 0;

    if (!hasNewUsername && !hasNewPassword) {
      throw new ConvexError("Enter a new username and/or password to update.");
    }

    let loginKey = currentKey;

    if (hasNewUsername) {
      const next = normalizeUsername(trimmedNewUsername!);
      validateUsernameShape(next);
      if (next !== currentKey) {
        const existing = await ctx.runQuery(
          internal.account.findPasswordAccountByUsername,
          { username: next },
        );
        if (existing !== null && existing.userId !== userId) {
          throw new ConvexError("That username is already taken.");
        }
        await ctx.runMutation(internal.account.applyUsernameChange, {
          userId,
          newProviderAccountId: next,
          newDisplayName: trimmedNewUsername!,
        });
        loginKey = next;
      }
    }

    if (hasNewPassword) {
      validatePasswordShape(args.newPassword!);
      await modifyAccountCredentials(ctx, {
        provider: "password",
        account: { id: loginKey, secret: args.newPassword! },
      });
    }
  },
});
