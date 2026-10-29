"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Megaphone } from "lucide-react";
import { cn } from "@/lib/cn";
import { NAV_GROUPS } from "./nav-config";
import { useNotifications } from "@/components/providers/notifications-provider";

export function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-white">
        <Megaphone className="h-4 w-4" aria-hidden />
      </span>
      <span className="text-sm font-semibold leading-tight tracking-tight">
        AI Marketing
        <span className="block text-xs font-normal text-muted">Platform</span>
      </span>
    </Link>
  );
}

export function SidebarNav({ onNavigate }) {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

  return (
    <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group, i) => (
        <div key={group.label || i}>
          {group.label && (
            <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted/80">
              {group.label}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                      active ? "bg-brand-50 text-brand-800" : "text-ink/75 hover:bg-sunken hover:text-ink"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", active ? "text-brand-700" : "text-muted")} aria-hidden />
                    <span className="flex-1">{label}</span>
                    {href === "/notifications" && unreadCount > 0 && (
                      <span className="rounded-full bg-brand-700 px-1.5 text-[11px] font-semibold text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
