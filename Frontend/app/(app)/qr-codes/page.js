"use client";

import { useBusiness } from "@/components/providers/business-provider";
import { ButtonLink } from "@/components/ui/button";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/card";
import { QrCode } from "lucide-react";
import { GoogleReviewQrCard } from "@/components/business/google-review-qr-card";

export default function GoogleReviewQrPage() {
  const { activeBusiness, loading, error, refreshBusinesses } = useBusiness();

  return (
    <>
      <PageHeader
        title="Google Review QR"
        description="Let customers scan a code and leave a review directly on your Google Business Profile."
      />
      {loading && <CardSkeleton lines={5} />}
      {error && <ErrorState error={error} onRetry={refreshBusinesses} title="Couldn't load your business" />}
      {!loading && !error && !activeBusiness && (
        <EmptyState
          icon={QrCode}
          title="No current business selected"
          description="Create or enable a business, then select it to generate its Google review QR code."
          action={<ButtonLink href="/businesses">Go to businesses</ButtonLink>}
        />
      )}
      {!loading && !error && activeBusiness && (
        <GoogleReviewQrCard
          businessId={activeBusiness._id || activeBusiness.id}
          businessName={activeBusiness.name}
        />
      )}
    </>
  );
}
