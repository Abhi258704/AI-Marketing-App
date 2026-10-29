"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogOut, Settings } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { ConfirmDialog } from "@/components/ui/dialog";

export function Avatar({ user, size = 36 }) {
  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();
  if (user?.profilePicture) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote Google avatar; no optimisation needed
      <img
        src={user.profilePicture}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initial}
    </span>
  );
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-line hover:ring-line-strong"
      >
        <Avatar user={user} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-sunken"
          >
            <Settings className="h-4 w-4 text-muted" aria-hidden /> Settings
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setConfirm(true);
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-sunken"
          >
            <LogOut className="h-4 w-4 text-muted" aria-hidden /> Sign out
          </button>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={logout}
        title="Sign out?"
        confirmLabel="Sign out"
      >
        <p>You&apos;ll need to sign in with Google again to continue.</p>
      </ConfirmDialog>
    </div>
  );
}
