"use client";

import { QrCode } from "lucide-react";
import { useBusiness } from "@/components/providers/business-provider";
import { FeedbackQrCard } from "@/components/business/feedback-qr-card";
import { ButtonLink } from "@/components/ui/button";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/card";

export default function FeedbackQrCodesPage() {
  const { businesses, loading, error, refreshBusinesses } = useBusiness();

  return (
    <>
      <PageHeader
        title="Feedback QR codes"
        description="Generate, download and share a feedback QR code for each of your businesses."
      />

      {loading && (
        <div className="grid gap-4 xl:grid-cols-2">
          <CardSkeleton lines={5} />
          <CardSkeleton lines={5} />
        </div>
      )}

      {error && <ErrorState error={error} onRetry={refreshBusinesses} title="Couldn't load businesses" />}

      {!loading && !error && businesses.length === 0 && (
        <EmptyState
          icon={QrCode}
          title="No active businesses"
          description="Create or enable a business to generate its customer feedback QR code."
          action={<ButtonLink href="/businesses">Go to businesses</ButtonLink>}
        />
      )}

      {!loading && !error && businesses.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-2">
          {businesses.map((business) => (
            <FeedbackQrCard
              key={business._id}
              businessId={business._id}
              businessName={business.name}
            />
          ))}
        </div>
      )}
    </>
  );
}
