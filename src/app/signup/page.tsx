"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAppToast } from "@/components/ToastProvider";
import { signUpFailureUserMessage } from "@/lib/authUiMessages";

export default function SignupPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const toast = useAppToast();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("flow", "signUp");
    try {
      await signIn("password", fd);
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.show(signUpFailureUserMessage(err), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="page framed auth-page">
      <div className="terminal-header">
        <span className="terminal-prompt">charry@terminal:~$</span>
        <span className="terminal-command">register</span>
      </div>
      <h1>Create account</h1>
      <p className="auth-form__hint">
        Pick a unique username (3–32 characters: lowercase letters, digits,
        underscore) and a password (at least 8 characters).
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
            autoComplete="new-password"
            required
            minLength={8}
          />
        </label>
        <button className="auth-form__submit" type="submit" disabled={pending}>
          {pending ? "Creating account…" : "Sign up"}
        </button>
        <p className="auth-form__hint">
          Already have an account? <Link href="/sign">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
