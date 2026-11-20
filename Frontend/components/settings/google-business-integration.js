"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Link2, RefreshCw, Unlink, Check } from "lucide-react";
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
  getGoogleBusinessLocationMapping,
  saveGoogleBusinessLocationMapping,
  deleteGoogleBusinessLocationMapping,
} from "@/lib/api/google-business";

export function GoogleBusinessIntegration() {
  const { activeBusiness } = useBusiness();
  const businessId = activeBusiness?._id || activeBusiness?.id;
  const [connection, setConnection] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [accountName, setAccountName] = useState("");
  const [selectedLocationName, setSelectedLocationName] = useState("");
  const [mapping, setMapping] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
        setMapping(null);
        setAccountName("");
        setSelectedLocationName("");
      }
    } catch (err) {
      setError(err.message || "Couldn't load Google Business Profile connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConnection(); }, [loadConnection]);

  useEffect(() => {
    let cancelled = false;
    async function loadMapping() {
      setMapping(null);
      setLocations([]);
      setAccountName("");
      setSelectedLocationName("");
      setNotice("");
      if (!businessId || connection?.status !== "connected") return;
      try {
        const result = await getGoogleBusinessLocationMapping(businessId);
        if (cancelled) return;
        const saved = result.mapping || null;
        setMapping(saved);
        if (saved?.googleAccountName) {
          setAccountName(saved.googleAccountName);
          const accountId = saved.googleAccountName.split("/").pop();
          const locationResult = await listGoogleBusinessLocations(accountId);
          if (cancelled) return;
          setLocations(locationResult.locations || []);
          setSelectedLocationName(saved.googleLocationName || "");
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Couldn't load the saved Google location.");
      }
    }
    loadMapping();
    return () => { cancelled = true; };
  }, [businessId, connection?.status]);

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
    setAccountName(value);
    setSelectedLocationName("");
    setLocations([]);
    if (!value) return;
    setBusy("locations");
    setError("");
    try {
      const result = await listGoogleBusinessLocations(value.split("/").pop());
      setLocations(result.locations || []);
    } catch (err) {
      setError(err.message || "Couldn't load locations for this account.");
    } finally {
      setBusy("");
    }
  };

  const handleSaveMapping = async () => {
    if (!businessId || !accountName || !selectedLocationName) return;
    setBusy("save");
    setError("");
    setNotice("");
    try {
      const result = await saveGoogleBusinessLocationMapping(businessId, {
        accountName,
        locationName: selectedLocationName,
      });
      setMapping(result.mapping || null);
      setNotice(result.message || "Google location linked successfully.");
    } catch (err) {
      setError(err.message || "Couldn't link this Google location.");
    } finally {
      setBusy("");
    }
  };

  const handleUnlink = async () => {
    if (!businessId || !window.confirm("Unlink this Google location from the selected business?")) return;
    setBusy("unlink");
    setError("");
    setNotice("");
    try {
      await deleteGoogleBusinessLocationMapping(businessId);
      setMapping(null);
      setSelectedLocationName("");
      setNotice("Google location unlinked.");
    } catch (err) {
      setError(err.message || "Couldn't unlink this Google location.");
    } finally {
      setBusy("");
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Disconnect Google Business Profile? Your saved business-to-location link will remain, but Google features will stop working until you reconnect.")) return;
    setBusy("disconnect");
    setError("");
    try {
      await disconnectGoogleBusiness();
      setConnection(null);
      setAccounts([]);
      setLocations([]);
      setAccountName("");
      setSelectedLocationName("");
    } catch (err) {
      setError(err.message || "Couldn't disconnect Google Business Profile.");
    } finally {
      setBusy("");
    }
  };

  const selectedLocation = locations.find((location) => location.name === selectedLocationName);

  return (
    <Card>
      <CardHeader
        title="Google Business Profile"
        description={activeBusiness ? `Connect the Google listing for ${activeBusiness.name}.` : "Select a business before connecting a Google listing."}
        action={connection?.status === "connected" ? <Badge tone="success">Connected</Badge> : <Badge>Not connected</Badge>}
      />
      <CardBody className="space-y-4">
        {error && <Alert tone="danger" title="Google Business Profile">{error}</Alert>}
        {notice && <Alert tone="success" title="Google Business Profile">{notice}</Alert>}
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
            {!activeBusiness ? (
              <p className="text-sm text-muted">Select a business to manage its Google location.</p>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label htmlFor="gbp-account" className="block text-sm font-medium">Google Business account</label>
                  <select id="gbp-account" value={accountName} onChange={(e) => handleAccountChange(e.target.value)} className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm" disabled={!accounts.length || Boolean(busy)}>
                    <option value="">Choose an account</option>
                    {accounts.map((account) => <option key={account.name} value={account.name}>{account.accountName || account.name} {account.type ? `· ${account.type}` : ""}</option>)}
                  </select>
                </div>
                {busy === "locations" && <div className="flex items-center gap-2 text-sm text-muted"><Spinner /> Loading locations…</div>}
                {accountName && locations.length > 0 && (
                  <div className="space-y-2">
                    <label htmlFor="gbp-location" className="block text-sm font-medium">Google location for {activeBusiness.name}</label>
                    <select id="gbp-location" value={selectedLocationName} onChange={(e) => setSelectedLocationName(e.target.value)} className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm" disabled={Boolean(busy)}>
                      <option value="">Choose a location</option>
                      {locations.map((location) => <option key={location.name} value={location.name}>{location.title || "Untitled location"}</option>)}
                    </select>
                    {selectedLocation && <p className="text-xs text-muted">{selectedLocation.storefrontAddress?.addressLines?.join(", ") || "Address not provided"}</p>}
                  </div>
                )}
                {accountName && !busy && locations.length === 0 && <p className="text-xs text-muted">No locations found for this Google account.</p>}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleSaveMapping} loading={busy === "save"} disabled={!selectedLocationName || !accountName || Boolean(busy)}>
                    <Check className="h-4 w-4" /> {mapping ? "Update linked location" : "Link location"}
                  </Button>
                  {mapping && <Button variant="secondary" onClick={handleUnlink} loading={busy === "unlink"} disabled={Boolean(busy)}><Unlink className="h-4 w-4" /> Unlink location</Button>}
                </div>
                {mapping && <p className="text-xs text-muted">Linked to this business: {mapping.locationTitle}</p>}
              </div>
            )}
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
