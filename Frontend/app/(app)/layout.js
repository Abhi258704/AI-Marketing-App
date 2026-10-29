"use client";

import { AuthGate } from "@/components/layout/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { BusinessProvider } from "@/components/providers/business-provider";
import { NotificationsProvider } from "@/components/providers/notifications-provider";

// Protected area: nothing below renders (or fetches) until a session is confirmed.
export default function ProtectedLayout({ children }) {
  return (
    <AuthGate>
      <BusinessProvider>
        <NotificationsProvider>
          <AppShell>{children}</AppShell>
        </NotificationsProvider>
      </BusinessProvider>
    </AuthGate>
  );
}
