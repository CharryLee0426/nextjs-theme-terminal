import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  invalidateSessions,
  modifyAccountCredentials,
} from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

async function verifyTurnstileToken(
  token: string,
  secret: string,
): Promise<boolean> {
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  const json = (await res.json()) as { success?: boolean };
  return json.success === true;
}

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

/**
 * Reset password after Turnstile verification. Does not reveal whether the
 * username exists (client should show one generic success message).
 */
export const resetPasswordWithCaptcha = action({
  args: {
    username: v.string(),
    newPassword: v.string(),
    turnstileToken: v.string(),
  },
  handler: async (ctx, args) => {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      throw new ConvexError("Password reset is not configured.");
    }
    if (!args.turnstileToken.trim()) {
      throw new ConvexError("Captcha verification failed. Try again.");
    }
    const captchaOk = await verifyTurnstileToken(
      args.turnstileToken,
      secret,
    );
    if (!captchaOk) {
      throw new ConvexError("Captcha verification failed. Try again.");
    }

    const username = normalizeUsername(args.username);
    validateUsernameShape(username);
    validatePasswordShape(args.newPassword);

    const account = await ctx.runQuery(
      internal.account.findPasswordAccountByUsername,
      { username },
    );
    if (account === null) {
      return;
    }

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: username, secret: args.newPassword },
    });
    await invalidateSessions(ctx, { userId: account.userId });
  },
});
