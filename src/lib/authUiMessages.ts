/**
 * Map auth / Convex errors to user-facing copy (no stack traces or request IDs).
 */

function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err ?? "");
}

/** Sign-in: do not distinguish missing user vs bad password (security). */
export function signInFailureUserMessage(_err: unknown): string {
  return "Incorrect username or password.";
}

/** Sign-up: generic message; avoids exposing internal validation details. */
export function signUpFailureUserMessage(err: unknown): string {
  const t = errorText(err);
  if (/already|exists|duplicate|taken/i.test(t)) {
    return "That username is already taken. Try another.";
  }
  if (/password|8 characters|too short/i.test(t)) {
    return "Password does not meet requirements (at least 8 characters).";
  }
  if (/username|3|32|characters|underscore/i.test(t)) {
    return "Username must be 3–32 characters (lowercase letters, digits, underscore).";
  }
  return "Could not create account. Please check your details and try again.";
}

/** Profile / password change action — no request IDs or stack traces. */
export function profileUpdateFailureUserMessage(err: unknown): string {
  const t = errorText(err);
  if (
    /InvalidSecret|invalid.*secret|wrong.*password|credentials|Unauthorized|\b401\b/i.test(
      t,
    )
  ) {
    return "Current password is incorrect.";
  }
  if (/not signed in|Not signed in/i.test(t)) {
    return "You are not signed in. Please sign in again.";
  }
  if (/already taken/i.test(t)) {
    return "That username is already taken. Try another.";
  }
  if (/at least 8|8 characters|Password must/i.test(t)) {
    return "New password must be at least 8 characters.";
  }
  if (/3.?32|Username must|only contain lowercase|underscore/i.test(t)) {
    return "Username must be 3–32 characters (lowercase letters, digits, underscore only).";
  }
  if (/Enter a new username/i.test(t)) {
    return "Enter a new username and/or password to save.";
  }
  if (/missing|No password account|User record/i.test(t)) {
    return "Could not update profile. Please try again.";
  }
  return "Could not update profile. Please check your details and try again.";
}
