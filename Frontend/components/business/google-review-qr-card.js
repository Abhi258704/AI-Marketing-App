"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, ExternalLink, QrCode, RefreshCw } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getGoogleBusinessReviewLink } from "@/lib/api/google-business";
import { getErrorMessage } from "@/lib/api/client";

export function GoogleReviewQrCard({ businessId, businessName }) {
  const [reviewUrl, setReviewUrl] = useState("");
  const [locationTitle, setLocationTitle] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const loadReviewLink = async () => {
    setLoading(true);
    setError("");
    setReviewUrl("");
    setQrDataUrl("");
    try {
      const result = await getGoogleBusinessReviewLink(businessId);
      if (!result.reviewUrl) throw new Error("Google didn't provide a review link for this location.");
      setReviewUrl(result.reviewUrl);
      setLocationTitle(result.locationTitle || businessName);
      const dataUrl = await QRCode.toDataURL(result.reviewUrl, {
        errorCorrectionLevel: "H",
        margin: 2,
        width: 640,
        color: { dark: "#111827", light: "#FFFFFF" },
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load the Google review link."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviewLink();
    // Load once for the currently selected business; parent remounts on business switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const safeName = (businessName || "business").trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "business";
  const fileName = safeName + "-google-review-qr.png";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(reviewUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Couldn't copy the link. You can select and copy it manually.");
    }
  };

  return (
    <Card className="mt-4 max-w-3xl">
      <CardHeader
        title="Google review QR code"
        description={locationTitle ? `Google listing: ${locationTitle}` : "Your connected Google Business Profile listing"}
        action={<QrCode className="h-5 w-5 text-muted" aria-hidden />}
      />
      <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex h-56 w-56 shrink-0 items-center justify-center rounded-xl border border-line bg-white p-3">
          {qrDataUrl ? (
            <Image src={qrDataUrl} alt={`Google review QR code for ${businessName}`} width={224} height={224} unoptimized className="h-full w-full object-contain" />
          ) : (
            <p className="px-3 text-center text-sm text-muted">{loading ? "Loading Google review link…" : "QR code unavailable"}</p>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-6 text-muted">
            Customers can scan this QR code with their phone camera to open your Google listing's review screen. Print it for your counter, reception, receipts or packaging.
          </p>
          {reviewUrl && (
            <p className="mt-3 break-all rounded-lg bg-sunken px-3 py-2 text-xs text-muted">{reviewUrl}</p>
          )}
          {error && (
            <div role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p>{error}</p>
              <p className="mt-1 text-xs">Make sure Google Business Profile is connected and this business has a linked, verified Google location.</p>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={qrDataUrl || undefined} download={fileName} aria-disabled={!qrDataUrl}
              className={`inline-flex h-9 items-center gap-2 rounded-lg bg-brand-700 px-3 text-sm font-medium text-white hover:bg-brand-800 ${!qrDataUrl ? "pointer-events-none opacity-50" : ""}`}>
              <Download className="h-4 w-4" /> Download QR
            </a>
            <Button variant="secondary" size="sm" onClick={copyLink} disabled={!reviewUrl}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy review link"}
            </Button>
            {reviewUrl && <a href={reviewUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm font-medium hover:bg-sunken">
              <ExternalLink className="h-4 w-4" /> Open Google
            </a>}
            <Button variant="ghost" size="sm" onClick={loadReviewLink} loading={loading}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
