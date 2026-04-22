"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useAction, useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAppToast } from "@/components/ToastProvider";
import { profileUpdateFailureUserMessage } from "@/lib/authUiMessages";

export default function ProfilePage() {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const viewer = useQuery(api.account.viewer);
  const updateProfile = useAction(api.account.updateProfile);
  const toast = useAppToast();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const currentPassword = (
      form.elements.namedItem("currentPassword") as HTMLInputElement
    ).value;
    const newUsername = (
      form.elements.namedItem("newUsername") as HTMLInputElement
    ).value.trim();
    const newPassword = (
      form.elements.namedItem("newPassword") as HTMLInputElement
    ).value;
    const newPassword2 = (
      form.elements.namedItem("newPassword2") as HTMLInputElement
    ).value;

    if (newPassword !== newPassword2) {
      toast.show("New password fields do not match.", "error");
      return;
    }

    setPending(true);
    try {
      await updateProfile({
        currentPassword,
        newUsername: newUsername.length > 0 ? newUsername : undefined,
        newPassword: newPassword.length > 0 ? newPassword : undefined,
      });
      toast.show("Profile updated.", "info");
      form.reset();
    } catch (err) {
      toast.show(profileUpdateFailureUserMessage(err), "error");
    } finally {
      setPending(false);
    }
  }

  if (authLoading || (isAuthenticated && viewer === undefined)) {
    return (
      <div className="page framed auth-page">
        <p className="auth-form__hint">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated || viewer == null) {
    return (
      <div className="page framed auth-page">
        <h1>Profile</h1>
        <p className="auth-form__hint">
          You need to be signed in.{" "}
          <Link href="/sign">Go to sign in</Link>
        </p>
      </div>
    );
  }

  const user = viewer;

  return (
    <div className="page framed auth-page">
      <div className="terminal-header">
        <span className="terminal-prompt">charry@terminal:~$</span>
        <span className="terminal-command">chfn</span>
      </div>
      <h1>Profile</h1>
      <p className="auth-form__hint">
        Change your display username and/or password. Username must stay unique.
        Re-enter your current password to confirm any change.
      </p>
      <form
        key={`${user._id}-${user.email ?? ""}`}
        className="auth-form"
        onSubmit={(ev) => void onSubmit(ev)}
      >
        <label>
          Current password
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <label>
          New username (optional)
          <input
            name="newUsername"
            type="text"
            autoComplete="username"
            placeholder={user.name ?? user.email ?? ""}
            defaultValue={user.name ?? user.email ?? ""}
          />
        </label>
        <label>
          New password (optional)
          <input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
          />
        </label>
        <label>
          Confirm new password
          <input
            name="newPassword2"
            type="password"
            autoComplete="new-password"
            minLength={8}
          />
        </label>
        <button className="auth-form__submit" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
