import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
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

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile: (params) => {
        const raw = String(params.email ?? "").trim();
        if (!raw) {
          throw new ConvexError("Username is required.");
        }
        const username = normalizeUsername(raw);
        validateUsernameShape(username);
        return {
          email: username,
          name: raw,
        };
      },
    }),
  ],
});
