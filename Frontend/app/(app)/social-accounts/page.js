"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Globe2, Lock, RefreshCw } from "lucide-react";
import { Facebook, Instagram } from "@/components/ui/brand-icons";
import { RequireBusiness } from "@/components/layout/require-business";
import { useToast } from "@/components/providers/toast-provider";
import { Card, CardBody, PageHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, Badge, CardSkeleton, ErrorState } from "@/components/ui/feedback";
import { useApi } from "@/lib/use-api";
import { getFacebookConnectUrl, getInstagramConnectUrl, keepInstagramAccount as keepInstagramAccountApi, listSocialAccounts } from "@/lib/api/social-accounts";
import { getErrorMessage } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";

const PLATFORM_CONFIG = {
  facebook: {
    label: "Facebook Page",
    icon: Facebook,
    getUrl: getFacebookConnectUrl,
    note: "Connects the first Facebook Page returned by your Facebook login. Used for publishing posts and Page insights.",
    popupName: "Facebook",
  },
  instagram: {
    label: "Instagram professional account",
    icon: Instagram,
    getUrl: getInstagramConnectUrl,
    note: "Requires an Instagram Business or Creator account. Used for publishing images and account insights.",
    popupName: "Instagram",
  },
};

function connectionState(account) {
  if (!account) return { tone: "neutral", label: "Not connected" };
  const expired = account.tokenExpiresAt && new Date(account.tokenExpiresAt) <= new Date();
  if (account.status === "expired" || expired) return { tone: "danger", label: "Token expired" };
  if (account.status === "disconnected") return { tone: "neutral", label: "Disconnected" };
  if (account.status === "connected") return { tone: "success", label: "Connected" };
  return { tone: "neutral", label: account.status };
}

function PlatformCard({ platform, accounts, business, pending, onStart, keeping, onKeep }) {
  const cfg = PLATFORM_CONFIG[platform];
  const Icon = cfg.icon;
  // Keep disconnected Instagram records in storage for publication history, but
  // don't present them as duplicate active accounts in the connection UI.
  const list = accounts.filter(
    (a) => a.platform === platform && (platform !== "instagram" || a.status !== "disconnected")
  );
  // Prefer a connected account for the headline status.
  const primary = list.find((a) => a.status === "connected") || list[0];
  const state = connectionState(primary);
  const connected = state.label === "Connected";

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sunken"><Icon className="h-5 w-5" aria-hidden /></span>
            <div>
              <h2 className="text-sm font-semibold">{cfg.label}</h2>
              <p className="text-xs text-muted">{business.name}</p>
            </div>
          </div>
          <Badge tone={state.tone}>{connected && <CheckCircle2 className="h-3 w-3" aria-hidden />}{state.label}</Badge>
        </div>

        {platform === "instagram" ? (
          list.length > 0 ? (
            <div className="space-y-3">
              {list.length > 1 && (
                <p className="text-xs text-muted">
                  Multiple Instagram connections were found. Choose the account this business should publish to; all other Instagram connections will be disconnected.
                </p>
              )}
              <div className="space-y-2">
                {list.map((account) => {
                  const accountState = connectionState(account);
                  return (
                    <div key={account._id} className="rounded-lg border border-line p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">
                          {account.accountName || account.platformAccountId}
                        </span>
                        <Badge tone={accountState.tone}>
                          {accountState.label}
                        </Badge>
                      </div>
                      <dl className="mt-2 space-y-1 text-xs text-muted">
                        <div className="flex justify-between gap-3">
                          <dt>Connected</dt>
                          <dd>{formatDateTime(account.connectedAt)}</dd>
                        </div>
                        {account.tokenExpiresAt && (
                          <div className="flex justify-between gap-3">
                            <dt>Access expires</dt>
                            <dd>{formatDateTime(account.tokenExpiresAt)}</dd>
                          </div>
                        )}
                      </dl>
                      {list.length > 1 && (
                        <div className="mt-3">
                          <Button
                            variant={account.status === "connected" ? "secondary" : "primary"}
                            size="sm"
                            onClick={() => onKeep(account._id)}
                            loading={keeping === account._id}
                            disabled={Boolean(keeping)}
                          >
                            Keep this account
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">{cfg.note}</p>
          )
        ) : primary ? (
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted">Account</dt><dd className="truncate font-medium">{primary.accountName || primary.platformAccountId}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Connected</dt><dd>{formatDateTime(primary.connectedAt)}</dd></div>
            {primary.tokenExpiresAt && (
              <div className="flex justify-between gap-3"><dt className="text-muted">Access expires</dt><dd>{formatDateTime(primary.tokenExpiresAt)}</dd></div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-muted">{cfg.note}</p>
        )}

        <Button variant={connected ? "secondary" : "primary"} size="sm" onClick={() => onStart(platform)} loading={pending === platform}>
          {connected ? "Reconnect" : primary ? "Reconnect" : `Connect ${cfg.popupName}`}
        </Button>
      </CardBody>
    </Card>
  );
}

function SocialAccountsContent({ business }) {
  const toast = useToast();
  const { data, loading, error, reload } = useApi(() => listSocialAccounts(business._id), [business._id]);
  const [starting, setStarting] = useState(null);
  const [flow, setFlow] = useState(null); // { platform, authUrl }
  const [refreshing, setRefreshing] = useState(false);
  const [keeping, setKeeping] = useState(null);

  const accounts = data?.socialAccounts || [];

  async function start(platform) {
    setStarting(platform);
    setFlow(null);
    try {
      const { authUrl } = await PLATFORM_CONFIG[platform].getUrl(business._id);
      if (!authUrl) throw new Error("The server didn't return an authorization link.");
      setFlow({ platform, authUrl });
      // Popup blockers may refuse this (it's after an async call); the panel below has a manual link.
      window.open(authUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(`Couldn't start ${PLATFORM_CONFIG[platform].popupName} connection`, { message: getErrorMessage(e) });
    } finally {
      setStarting(null);
    }
  }

  async function chooseInstagramAccount(socialAccountId) {
    setKeeping(socialAccountId);
    try {
      await keepInstagramAccountApi(socialAccountId);
      await reload();
      toast.success("Instagram account updated", {
        message: "Only the selected Instagram account is now active for this business. Other Instagram connections have been disconnected.",
      });
    } catch (e) {
      toast.error("Couldn't update Instagram account", { message: getErrorMessage(e) });
    } finally {
      setKeeping(null);
    }
  }

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  }, [reload]);

  // When the user returns from the authorization tab, re-check connections automatically.
  useEffect(() => {
    if (!flow) return undefined;
    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [flow, reload]);

  return (
    <>
      <PageHeader
        title="Social accounts"
        description={`Connect the accounts ${business.name} publishes to.`}
        actions={<Button variant="secondary" onClick={refresh} loading={refreshing}><RefreshCw className="h-4 w-4" aria-hidden /> Refresh connections</Button>}
      />

      {flow && (
        <Alert tone="info" title={`Finish connecting ${PLATFORM_CONFIG[flow.platform].popupName}`} className="mb-6">
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>
              Authorize in the new tab.{" "}
              <a href={flow.authUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium underline">
                Tab didn&apos;t open? Open the authorization page <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </li>
            <li>When finished, the backend shows a short confirmation message in that tab. It won&apos;t redirect back here automatically.</li>
            <li>Close that tab, return here, and select <strong>Refresh connections</strong> (this page also re-checks when you switch back).</li>
          </ol>
        </Alert>
      )}

      {loading && !data && <div className="grid gap-4 md:grid-cols-2"><CardSkeleton lines={4} /><CardSkeleton lines={4} /></div>}
      {error && <ErrorState error={error} onRetry={reload} title="Couldn't load connected accounts" />}

      {(data || (!loading && !error)) && (
        <div className="grid gap-4 md:grid-cols-2">
          <PlatformCard platform="facebook" accounts={accounts} business={business} pending={starting} onStart={start} />
          <PlatformCard platform="instagram" accounts={accounts} business={business} pending={starting} onStart={start} keeping={keeping} onKeep={chooseInstagramAccount} />

          <Card className="border-dashed md:col-span-2">
            <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sunken"><Globe2 className="h-5 w-5 text-muted" aria-hidden /></span>
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold">Google Business Profile <Badge tone="warning"><Lock className="h-3 w-3" aria-hidden /> Coming soon</Badge></h2>
                  <p className="mt-0.5 max-w-xl text-sm text-muted">
                    Google hasn&apos;t approved this project&apos;s Business Profile API access yet, so connecting, posting, reviews and insights aren&apos;t available. This will be enabled once access is granted.
                  </p>
                </div>
              </div>
              <Button variant="secondary" size="sm" disabled>Unavailable</Button>
            </CardBody>
          </Card>
        </div>
      )}

      <p className="mt-6 text-xs text-muted">Access tokens are stored on the server only. They are never sent to or shown in this app.</p>
    </>
  );
}

export default function SocialAccountsPage() {
  return <RequireBusiness>{(business) => <SocialAccountsContent business={business} />}</RequireBusiness>;
}
