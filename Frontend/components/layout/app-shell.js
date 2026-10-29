"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Brand, SidebarNav } from "./sidebar-nav";
import { BusinessSwitcher } from "./business-switcher";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";

export function AppShell({ children }) {
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!drawer) return undefined;
    const onKey = (e) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawer]);

  return (
    <div className="min-h-screen lg:pl-64">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center border-b border-line px-3">
          <Brand />
        </div>
        <SidebarNav />
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} aria-hidden />
          <aside
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="flex h-16 items-center justify-between border-b border-line px-3">
              <Brand />
              <button
                type="button"
                onClick={() => setDrawer(false)}
                className="rounded-lg p-2 text-muted hover:bg-sunken"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-ink hover:bg-sunken lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <BusinessSwitcher />
          <div className="ml-auto flex items-center gap-1.5">
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
