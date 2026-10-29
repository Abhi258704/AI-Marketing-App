"use client";

import { useState } from "react";
import { Check, LogOut, Minus } from "lucide-react";
import { Avatar } from "@/components/layout/user-menu";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/dialog";
import { API_BASE_URL } from "@/lib/config";
import { clearUserLocalData } from "@/lib/local-store";
import { formatDateTime } from "@/lib/format";

const FEATURES = [
  { name: "Facebook Page publishing & insights", ok: true },
  { name: "Instagram publishing & insights", ok: true },
  { name: "AI content generation & business audit", ok: true },
  { name: "Google Business Profile", ok: false, note: "Waiting for Google API approval." },
  { name: "Customer reviews & replies", ok: false, note: "Needs Google Business Profile access and backend endpoints." },
  { name: "SEO keyword rankings", ok: false, note: "Needs a data provider and backend endpoint." },
  { name: "Image upload", ok: false, note: "No upload endpoint yet. Use public image URLs." },
  { name: "Real-time notifications", ok: false, note: "Notifications refresh periodically; there is no push channel." },
];

export default function SettingsPage() {
  const { user, expiresAt, logout } = useAuth();
  const toast = useToast();
  const [confirm, setConfirm] = useState(null);

  return (
    <>
      <PageHeader title="Settings" description="Your account and what this app currently supports." />
      <div className="grid max-w-3xl gap-6">
        <Card>
          <CardHeader title="Profile" description="Managed by your Google account." />
          <CardBody className="flex items-center gap-4">
            <Avatar user={user} size={56} />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{user?.name}</p>
              <p className="truncate text-sm text-muted">{user?.email}</p>
              {user?.role && <Badge className="mt-1.5 capitalize">{user.role}</Badge>}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Session" />
          <dl className="divide-y divide-line text-sm">
            <div className="flex justify-between gap-3 px-5 py-3"><dt className="text-muted">Session expires</dt><dd>{expiresAt ? formatDateTime(expiresAt) : "Unknown"}</dd></div>
            <div className="flex justify-between gap-3 px-5 py-3"><dt className="text-muted">Backend</dt><dd className="truncate font-mono text-xs">{API_BASE_URL}</dd></div>
          </dl>
          <CardBody className="flex flex-wrap gap-2 border-t border-line">
            <Button variant="secondary" onClick={() => setConfirm("logout")}><LogOut className="h-4 w-4" aria-hidden /> Sign out</Button>
            <Button variant="ghost" onClick={() => setConfirm("clear")}>Clear data stored in this browser</Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Feature availability" description="What works today and what's waiting on the backend or third parties." />
          <ul className="divide-y divide-line">
            {FEATURES.map((f) => (
              <li key={f.name} className="flex items-start gap-3 px-5 py-3">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${f.ok ? "bg-emerald-100 text-emerald-700" : "bg-sunken text-muted"}`}>
                  {f.ok ? <Check className="h-3 w-3" aria-hidden /> : <Minus className="h-3 w-3" aria-hidden />}
                </span>
                <div>
                  <p className="text-sm font-medium">{f.name} <span className="sr-only">{f.ok ? "available" : "unavailable"}</span></p>
                  {f.note && <p className="text-xs text-muted">{f.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <ConfirmDialog open={confirm === "logout"} onClose={() => setConfirm(null)} onConfirm={logout} title="Sign out?" confirmLabel="Sign out">
        <p>You&apos;ll need to sign in with Google again.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === "clear"}
        onClose={() => setConfirm(null)}
        onConfirm={() => { const n = clearUserLocalData(user.id); setConfirm(null); toast.success("Browser data cleared", { message: `${n} item${n === 1 ? "" : "s"} removed. Reload to see the change.` }); }}
        title="Clear data stored in this browser?"
        confirmLabel="Clear data"
        tone="danger"
      >
        <p>This removes your remembered business selection, audit history and publish results kept in this browser. Nothing on the server is deleted.</p>
        <p className="text-amber-800">Without publish results, the app can&apos;t tell which platforms a post already published to, so check Facebook/Instagram before retrying a publish.</p>
      </ConfirmDialog>
    </>
  );
}
