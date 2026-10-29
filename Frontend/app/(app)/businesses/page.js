"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, Check, Globe, MapPin, Phone, Plus } from "lucide-react";
import { useBusiness } from "@/components/providers/business-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, CardSkeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { getDisabledBusinesses, removeDisabledBusiness } from "@/lib/local-store";
import { toggleBusinessStatus } from "@/lib/api/businesses";
import { getErrorMessage } from "@/lib/api/client";

function DisabledBusinesses() {
  const { user } = useAuth();
  const { refreshBusinesses } = useBusiness();
  const toast = useToast();
  const [list, setList] = useState(() => getDisabledBusinesses(user.id));
  const [busyId, setBusyId] = useState(null);

  if (list.length === 0) return null;

  async function enable(item) {
    setBusyId(item.id);
    try {
      await toggleBusinessStatus(item.id);
      removeDisabledBusiness(user.id, item.id);
      setList((l) => l.filter((b) => b.id !== item.id));
      refreshBusinesses();
      toast.success(`${item.name} is enabled again`);
    } catch (e) {
      toast.error("Couldn't enable business", { message: getErrorMessage(e) });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="mt-8">
      <CardHeader
        title="Disabled in this browser"
        description="The API hides disabled businesses, so we remember the ones you disabled here so you can bring them back."
      />
      <ul className="divide-y divide-line">
        {list.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{b.name}</p>
              <Link href={`/businesses/${b.id}`} className="text-xs text-brand-700 hover:underline">View details</Link>
            </div>
            <Button size="sm" variant="secondary" loading={busyId === b.id} onClick={() => enable(b)}>Enable</Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function BusinessesPage() {
  const { businesses, activeBusinessId, selectBusiness, loading, error, refreshBusinesses } = useBusiness();

  return (
    <>
      <PageHeader
        title="Businesses"
        description="Each business has its own social accounts, posts, audits and analytics."
        actions={<ButtonLink href="/businesses/new"><Plus className="h-4 w-4" aria-hidden /> New business</ButtonLink>}
      />

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          <CardSkeleton lines={4} /><CardSkeleton lines={4} />
        </div>
      )}
      {error && <ErrorState error={error} onRetry={refreshBusinesses} />}

      {!loading && !error && businesses.length === 0 && (
        <EmptyState
          icon={Building2}
          title="No businesses yet"
          description="Create your first business to start generating content, connecting accounts and running audits."
          action={<ButtonLink href="/businesses/new">Create a business</ButtonLink>}
        />
      )}

      {!loading && businesses.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {businesses.map((b) => {
            const active = b._id === activeBusinessId;
            return (
              <li key={b._id}>
                <Card className={active ? "ring-2 ring-brand-600" : ""}>
                  <CardBody className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold">{b.name}</h2>
                        <p className="text-sm text-muted">{b.category || "No category"}</p>
                      </div>
                      {active && <Badge tone="brand"><Check className="h-3 w-3" aria-hidden /> Active</Badge>}
                    </div>
                    <ul className="space-y-1.5 text-sm text-muted">
                      {b.address && <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span className="truncate">{b.address}</span></li>}
                      {b.phone && <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{b.phone}</li>}
                      {b.website && <li className="flex gap-2"><Globe className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span className="truncate">{b.website}</span></li>}
                    </ul>
                    <div className="flex gap-2">
                      {!active && <Button size="sm" variant="secondary" onClick={() => selectBusiness(b._id)}>Set as active</Button>}
                      <ButtonLink size="sm" variant="ghost" href={`/businesses/${b._id}`}>View &amp; edit</ButtonLink>
                    </div>
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <DisabledBusinesses />
    </>
  );
}
