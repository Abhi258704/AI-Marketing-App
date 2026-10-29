"use client";

import { Building2 } from "lucide-react";
import { useBusiness } from "@/components/providers/business-provider";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";

/** Renders children(business) only when a business is selected; otherwise a truthful state. */
export function RequireBusiness({ children, description }) {
  const { activeBusiness, loading, error, refreshBusinesses } = useBusiness();

  if (loading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={refreshBusinesses} title="Couldn't load your businesses" />;
  if (!activeBusiness) {
    return (
      <EmptyState
        icon={Building2}
        title="Add your first business"
        description={description || "Everything in the platform is organised around a business. Create one to get started."}
        action={<ButtonLink href="/businesses/new">Create a business</ButtonLink>}
      />
    );
  }
  return children(activeBusiness);
}
