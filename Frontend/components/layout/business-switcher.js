"use client";

import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { useBusiness } from "@/components/providers/business-provider";
import { Skeleton } from "@/components/ui/feedback";

export function BusinessSwitcher() {
  const { businesses, activeBusinessId, selectBusiness, loading, error } = useBusiness();

  if (loading) return <Skeleton className="h-10 w-44" />;

  if (error) {
    return <span className="text-sm text-red-700">Couldn&apos;t load businesses</span>;
  }

  if (businesses.length === 0) {
    return (
      <Link
        href="/businesses/new"
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-dashed border-line-strong px-3 text-sm font-medium text-brand-700 hover:bg-brand-50"
      >
        <Plus className="h-4 w-4" aria-hidden /> Add a business
      </Link>
    );
  }

  return (
    <div className="relative">
      <label htmlFor="active-business" className="sr-only">
        Active business
      </label>
      <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      <select
        id="active-business"
        value={activeBusinessId || ""}
        onChange={(e) => selectBusiness(e.target.value)}
        className="h-10 w-44 max-w-full truncate rounded-lg border border-line-strong bg-surface pl-9 pr-8 text-sm font-medium text-ink sm:w-60"
      >
        {businesses.map((b) => (
          <option key={b._id} value={b._id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
}
