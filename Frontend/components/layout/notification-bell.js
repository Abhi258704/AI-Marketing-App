"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useNotifications } from "@/components/providers/notifications-provider";
import { useBusiness } from "@/components/providers/business-provider";
import { useToast } from "@/components/providers/toast-provider";
import { notificationTarget } from "@/lib/notification-links";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/cn";
import { getErrorMessage } from "@/lib/api/client";

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, loaded } = useNotifications();
  const { businesses, selectBusiness } = useBusiness();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

  const recent = notifications.slice(0, 5);

  async function openNotification(n) {
    setOpen(false);
    try {
      if (!n.isRead) await markRead(n._id);
    } catch (e) {
      toast.error("Couldn't mark as read", { message: getErrorMessage(e) });
    }
    if (n.businessId && businesses.some((b) => b._id === n.businessId)) selectBusiness(n.businessId);
    const target = notificationTarget(n);
    router.push(target?.href || "/notifications");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-ink/80 hover:bg-sunken"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-xs font-medium text-brand-700 hover:underline"
                onClick={() => markAllRead().catch((e) => toast.error("Couldn't update", { message: getErrorMessage(e) }))}
              >
                Mark all as read
              </button>
            )}
          </div>
          <ul className="max-h-80 divide-y divide-line overflow-y-auto">
            {!loaded && <li className="px-4 py-6 text-center text-sm text-muted">Loading…</li>}
            {loaded && recent.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted">You&apos;re all caught up.</li>
            )}
            {recent.map((n) => (
              <li key={n._id}>
                <button
                  type="button"
                  onClick={() => openNotification(n)}
                  className={cn("flex w-full gap-2.5 px-4 py-3 text-left hover:bg-sunken", !n.isRead && "bg-brand-50/50")}
                >
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.isRead ? "bg-transparent" : "bg-brand-600")} aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{n.title}</span>
                    <span className="line-clamp-2 text-xs text-muted">{n.message}</span>
                    <span className="mt-0.5 block text-xs text-muted/80">{formatRelative(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-2.5 text-center text-sm font-medium text-brand-700 hover:bg-sunken"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
