"use client";

import { QrCode } from "lucide-react";
import { useBusiness } from "@/components/providers/business-provider";
import { FeedbackQrCard } from "@/components/business/feedback-qr-card";
import { ButtonLink } from "@/components/ui/button";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/card";

export default function FeedbackQrCodesPage() {
  const { activeBusiness, loading, error, refreshBusinesses } = useBusiness();

  return (
    <>
      <PageHeader
        title="Feedback QR code"
        description="Generate, download and share the feedback QR code for your currently selected business."
      />

      {loading && <CardSkeleton lines={5} />}

      {error && <ErrorState error={error} onRetry={refreshBusinesses} title="Couldn't load your business" />}

      {!loading && !error && !activeBusiness && (
        <EmptyState
          icon={QrCode}
          title="No current business selected"
          description="Create or enable a business, then select it as your current business to generate its customer feedback QR code."
          action={<ButtonLink href="/businesses">Go to businesses</ButtonLink>}
        />
      )}

      {!loading && !error && activeBusiness && (
        <FeedbackQrCard
          businessId={activeBusiness._id}
          businessName={activeBusiness.name}
        />
      )}
    </>
  );
}
