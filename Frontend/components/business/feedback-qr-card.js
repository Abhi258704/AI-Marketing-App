"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, ExternalLink, QrCode } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";

export function FeedbackQrCard({ businessId, businessName }) {
  const [feedbackUrl, setFeedbackUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const url = new URL(`/feedback/${businessId}`, window.location.origin).toString();

    setFeedbackUrl(url);
    setQrDataUrl("");
    setError("");

    QRCode.toDataURL(url, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 320,
      color: {
        dark: "#111827",
        light: "#FFFFFF",
      },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't generate the QR code. Please refresh the page.");
      });

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const fileName = `${(businessName || "business").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "business"}-feedback-qr.png`;

  return (
    <Card className="mt-4 max-w-2xl">
      <CardHeader
        title="Customer feedback QR code"
        action={<QrCode className="h-5 w-5 text-muted" aria-hidden />}
      />
      <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-44 w-44 shrink-0 items-center justify-center rounded-xl border border-line bg-white p-3">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR code for ${businessName} customer feedback form`} className="h-full w-full object-contain" />
          ) : (
            <p className="px-2 text-center text-xs text-muted">
              {error || "Generating QR code…"}
            </p>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">
            Customers can scan this code with their phone camera to open your feedback form.
            Print it and place it at your counter, reception or on receipts.
          </p>
          <p className="mt-3 break-all rounded-lg bg-sunken px-3 py-2 text-xs text-muted">
            {feedbackUrl || "Preparing feedback link…"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={qrDataUrl || undefined}
              download={fileName}
              aria-disabled={!qrDataUrl}
              className={buttonClasses({
                variant: "primary",
                size: "sm",
                className: !qrDataUrl ? "pointer-events-none opacity-50" : "",
              })}
            >
              <Download className="h-4 w-4" aria-hidden />
              Download QR
            </a>
            <a
              href={feedbackUrl || undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!feedbackUrl}
              className={buttonClasses({
                variant: "secondary",
                size: "sm",
                className: !feedbackUrl ? "pointer-events-none opacity-50" : "",
              })}
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              Open form
            </a>
          </div>
          {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
        </div>
      </CardBody>
    </Card>
  );
}
