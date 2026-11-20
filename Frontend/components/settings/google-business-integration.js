"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Link2, RefreshCw, Unlink } from "lucide-react";
import { useBusiness } from "@/components/providers/business-provider";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, Badge, Spinner } from "@/components/ui/feedback";
import {
  connectGoogleBusiness,
  disconnectGoogleBusiness,
  getGoogleBusinessConnection,
  listGoogleBusinessAccounts,
  listGoogleBusinessLocations,
} from "@/lib/api/google-business";

export function GoogleBusinessIntegration() {
  const { activeBusiness } = useBusiness();
  const [connection, setConnection] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const loadConnection = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getGoogleBusinessConnection();
      setConnection(result.connection || null);
      if (result.connected) {
        const accountResult = await listGoogleBusinessAccounts();
        setAccounts(accountResult.accounts || []);
      } else {
        setAccounts([]);
        setLocations([]);
      }
    } catch (err) {
      setError(err.message || "Couldn't load Google Business Profile connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConnection(); }, [loadConnection]);

  const handleConnect = async () => {
    setBusy("connect");
    setError("");
    try {
      const result = await connectGoogleBusiness();
      if (!result.authorizationUrl) throw new Error("Google didn't return an authorization link.");
      window.location.assign(result.authorizationUrl);
    } catch (err) {
      setError(err.message || "Couldn't start Google connection.");
      setBusy("");
    }
  };

  const handleAccountChange = async (value) => {
    setAccountId(value);
    setLocations([]);
    if (!value) return;
    setBusy("locations");
    setError("");
    try {
      const result = await listGoogleBusinessLocations(value);
      setLocations(result.locations || []);
    } catch (err) {
      setError(err.message || "Couldn't load locations for this account.");
    } finally {
      setBusy("");
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Disconnect Google Business Profile?")) return;
    setBusy("disconnect");
    setError("");
    try {
      await disconnectGoogleBusiness();
      setConnection(null);
      setAccounts([]);
      setLocations([]);
      setAccountId("");
    } catch (err) {
      setError(err.message || "Couldn't disconnect Google Business Profile.");
    } finally {
      setBusy("");
    }
  };

  return (
    <Card>
      <CardHeader
        title="Google Business Profile"
        description={activeBusiness ? `Connect the Google listing for ${activeBusiness.name}.` : "Select a business before connecting a Google listing."}
        action={connection?.status === "connected" ? <Badge tone="success">Connected</Badge> : <Badge>Not connected</Badge>}
      />
      <CardBody className="space-y-4">
        {error && <Alert tone="danger" title="Google Business Profile">{error}</Alert>}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted"><Spinner /> Checking connection…</div>
        ) : connection?.status === "connected" ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{connection.googleName || "Google account"}</p>
                <p className="text-sm text-muted">{connection.googleEmail || "Connected Google account"}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={loadConnection} disabled={Boolean(busy)}>
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
            </div>
            <div className="space-y-2">
              <label htmlFor="gbp-account" className="block text-sm font-medium">Google Business account</label>
              <select id="gbp-account" value={accountId} onChange={(e) => handleAccountChange(e.target.value)} className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm" disabled={!accounts.length || Boolean(busy)}>
                <option value="">Choose an account</option>
                {accounts.map((account) => <option key={account.name} value={account.name?.split("/").pop()}>{account.accountName || account.name} {account.type ? `· ${account.type}` : ""}</option>)}
              </select>
              {busy === "locations" && <div className="flex items-center gap-2 text-sm text-muted"><Spinner /> Loading locations…</div>}
              {locations.length > 0 && (
                <div className="space-y-2 rounded-lg border border-line p-3">
                  <p className="text-sm font-medium">Available locations</p>
                  {locations.map((location) => (
                    <div key={location.name} className="flex items-start gap-2 border-t border-line pt-2 text-sm">
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                      <div><p className="font-medium">{location.title || "Untitled location"}</p><p className="text-xs text-muted">{location.storefrontAddress?.addressLines?.join(", ") || "Address not provided"}</p></div>
                    </div>
                  ))}
                  <p className="text-xs text-muted">Location linking to this app business is the next backend step.</p>
                </div>
              )}
              {accountId && !busy && locations.length === 0 && <p className="text-xs text-muted">No locations found for this Google account.</p>}
            </div>
            <div className="border-t border-line pt-3">
              <Button variant="danger-outline" size="sm" onClick={handleDisconnect} loading={busy === "disconnect"} disabled={Boolean(busy)}><Unlink className="h-4 w-4" /> Disconnect Google</Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted">Connect the Google account that has Owner or Manager access to your business listing. You can choose the account and location after authorizing.</p>
            <Button onClick={handleConnect} loading={busy === "connect"} disabled={!activeBusiness || Boolean(busy)}><Link2 className="h-4 w-4" /> Connect Google Business</Button>
            {!activeBusiness && <p className="text-xs text-muted">Create or select a business first.</p>}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
