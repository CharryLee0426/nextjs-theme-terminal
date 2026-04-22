"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAppToast } from "@/components/ToastProvider";
import { signInFailureUserMessage } from "@/lib/authUiMessages";

export default function SignPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const toast = useAppToast();
  const [pending, setPending] = useState(false);

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
        <button className="auth-form__submit" type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
        <p className="auth-form__hint">
          Don&apos;t have one,{" "}
          <Link href="/signup">sign up!</Link>
        </p>
      </form>
    </div>
  );
}
