"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ChevronDown, User } from "lucide-react";
import { api } from "../../convex/_generated/api";

export function UserNav({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const viewer = useQuery(api.account.viewer);
  const { signOut } = useAuthActions();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, close]);

  const handleSignOut = async () => {
    close();
    onNavigate?.();
    await signOut();
    router.refresh();
  };

  const label =
    viewer?.name ?? viewer?.email ?? (isAuthenticated ? "…" : null);

  if (authLoading || (isAuthenticated && viewer === undefined)) {
    return (
      <span className={mobile ? "user-nav user-nav--mobile" : "user-nav"}>
        <span className="user-nav__loading">auth…</span>
      </span>
    );
  }

  if (!isAuthenticated || viewer === null) {
    return (
      <Link
        href="/sign"
        className={mobile ? "user-nav user-nav--mobile" : "user-nav"}
        onClick={onNavigate}
      >
        <span className="user-nav__login">log in</span>
      </Link>
    );
  }

  return (
    <div
      className={mobile ? "user-nav user-nav--mobile" : "user-nav"}
      ref={wrapRef}
    >
      <button
        type="button"
        className="user-nav__trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <User size={16} aria-hidden />
        <span className="user-nav__name">{label}</span>
        <ChevronDown size={14} className={open ? "user-nav__chev user-nav__chev--open" : "user-nav__chev"} aria-hidden />
      </button>
      {open ? (
        <ul className="user-nav__menu" role="menu">
          <li role="none">
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => {
                close();
                onNavigate?.();
              }}
            >
              profile
            </Link>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="user-nav__signout"
              onClick={() => void handleSignOut()}
            >
              sign out
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
