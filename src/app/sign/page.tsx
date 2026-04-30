"use client";

import { useAction } from "convex/react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAppToast } from "@/components/ToastProvider";
import {
  passwordResetFailureUserMessage,
  signInFailureUserMessage,
} from "@/lib/authUiMessages";
import { api } from "../../../convex/_generated/api";

const TurnstileLazy = dynamic(
  () => import("@marsidev/react-turnstile").then((m) => m.Turnstile),
  { ssr: false },
);

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

const RESET_SUCCESS_HINT =
  "If an account exists for that username, the password has been updated. You can sign in.";

export default function SignPage() {
  const { signIn } = useAuthActions();
  const resetPassword = useAction(api.passwordReset.resetPasswordWithCaptcha);
  const router = useRouter();
  const toast = useAppToast();
  const [pending, setPending] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotPending, setForgotPending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const bumpTurnstile = useCallback(() => {
    setTurnstileToken(null);
    setTurnstileKey((k) => k + 1);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("flow", "signIn");
    try {
      await signIn("password", fd);
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.show(signInFailureUserMessage(err), "error");
    } finally {
      setPending(false);
    }
  }

  async function onForgotSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const username = (
      form.elements.namedItem("forgotUsername") as HTMLInputElement
    ).value.trim();
    const newPassword = (
      form.elements.namedItem("forgotNewPassword") as HTMLInputElement
    ).value;
    const newPassword2 = (
      form.elements.namedItem("forgotNewPassword2") as HTMLInputElement
    ).value;
    if (newPassword !== newPassword2) {
      toast.show("New password fields do not match.", "error");
      return;
    }
    if (!turnstileSiteKey) {
      toast.show(
        passwordResetFailureUserMessage(
          new Error("Password reset is not configured."),
        ),
        "error",
      );
      return;
    }
    if (!turnstileToken) {
      toast.show("Complete the captcha before resetting.", "error");
      return;
    }
    setForgotPending(true);
    try {
      await resetPassword({
        username,
        newPassword,
        turnstileToken,
      });
      toast.show(RESET_SUCCESS_HINT, "info");
      setForgotOpen(false);
      form.reset();
      bumpTurnstile();
    } catch (err) {
      toast.show(passwordResetFailureUserMessage(err), "error");
      bumpTurnstile();
    } finally {
      setForgotPending(false);
    }
  }

  return (
    <div className="page framed auth-page">
      <div className="terminal-header">
        <span className="terminal-prompt">charry@terminal:~$</span>
        <span className="terminal-command">login</span>
      </div>
      <h1>Sign in</h1>
      <p className="auth-form__hint">
        Use your username and password. Usernames are stored in lowercase (a–z,
        0–9, underscore).
      </p>
      <form className="auth-form" onSubmit={(ev) => void onSubmit(ev)}>
        <label>
          Username
          <input name="email" autoComplete="username" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <p className="auth-form__hint auth-form__hint--row">
          <button
            type="button"
            className="auth-form__link-button"
            onClick={() => {
              setForgotOpen((o) => !o);
              if (forgotOpen) bumpTurnstile();
            }}
          >
            {forgotOpen ? "Back to sign in" : "Forgot my password"}
          </button>
        </p>
        <button className="auth-form__submit" type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
        <p className="auth-form__hint">
          Don&apos;t have one,{" "}
          <Link href="/signup">sign up!</Link>
        </p>
      </form>

      {forgotOpen ? (
        <div className="auth-form__forgot">
          <h2 className="auth-form__forgot-title">Reset password</h2>
          <p className="auth-form__hint">
            Enter your username, complete the captcha, and choose a new
            password (at least 8 characters).
          </p>
          {!turnstileSiteKey ? (
            <p className="auth-form__error">
              Password reset needs Cloudflare Turnstile: set{" "}
              <code className="auth-form__code">NEXT_PUBLIC_TURNSTILE_SITE_KEY</code>{" "}
              (Next.js) and{" "}
              <code className="auth-form__code">TURNSTILE_SECRET_KEY</code>{" "}
              (Convex env). Use{" "}
              <a
                href="https://developers.cloudflare.com/turnstile/troubleshooting/testing/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Cloudflare test keys
              </a>{" "}
              locally if needed.
            </p>
          ) : null}
          <form
            className="auth-form"
            onSubmit={(ev) => void onForgotSubmit(ev)}
          >
            <label>
              Username
              <input
                name="forgotUsername"
                autoComplete="username"
                required
              />
            </label>
            <label>
              New password
              <input
                name="forgotNewPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </label>
            <label>
              Confirm new password
              <input
                name="forgotNewPassword2"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </label>
            {turnstileSiteKey ? (
              <div className="auth-form__turnstile" key={turnstileKey}>
                <TurnstileLazy
                  siteKey={turnstileSiteKey}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onExpire={() => setTurnstileToken(null)}
                  options={{ theme: "dark" }}
                />
              </div>
            ) : null}
            <button
              className="auth-form__submit"
              type="submit"
              disabled={
                forgotPending ||
                !turnstileSiteKey ||
                (turnstileSiteKey.length > 0 && !turnstileToken)
              }
            >
              {forgotPending ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
