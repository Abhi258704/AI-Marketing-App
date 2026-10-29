"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Power } from "lucide-react";
import { useBusiness } from "@/components/providers/business-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, Badge, CardSkeleton, ErrorState } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/dialog";
import { BusinessForm } from "@/components/business/business-form";
import { useApi } from "@/lib/use-api";
import { getBusiness, toggleBusinessStatus, updateBusiness } from "@/lib/api/businesses";
import { getErrorMessage } from "@/lib/api/client";
import { addDisabledBusiness, removeDisabledBusiness } from "@/lib/local-store";
import { formatDateTime } from "@/lib/format";

const DETAILS = [
  ["Category", "category"],
  ["Description", "description"],
  ["Address", "address"],
  ["Phone", "phone"],
  ["Website", "website"],
  ["Logo URL", "logoUrl"],
];

export default function BusinessDetailPage({ params }) {
  const { businessId } = use(params);
  const { user } = useAuth();
  const toast = useToast();
  const { refreshBusinesses, selectBusiness } = useBusiness();
  const { data, loading, error, reload, mutate } = useApi(() => getBusiness(businessId), [businessId]);
  const [editing, setEditing] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [toggling, setToggling] = useState(false);

  const business = data?.business;

  async function handleUpdate(payload) {
    const res = await updateBusiness(businessId, payload);
    mutate(() => ({ business: res.business }));
    refreshBusinesses();
    setEditing(false);
    toast.success("Business updated");
  }

  async function handleToggle() {
    setToggling(true);
    try {
      const res = await toggleBusinessStatus(businessId);
      mutate(() => ({ business: res.business }));
      if (res.business.isActive) {
        removeDisabledBusiness(user.id, businessId);
        selectBusiness(businessId);
        toast.success("Business enabled");
      } else {
        addDisabledBusiness(user.id, { id: businessId, name: res.business.name });
        toast.success("Business disabled", {
          message: "It's hidden from the business list but nothing was deleted.",
          action: { label: "Undo", onClick: () => toggleBusinessStatus(businessId).then((r) => { mutate(() => ({ business: r.business })); removeDisabledBusiness(user.id, businessId); refreshBusinesses(); }).catch((e) => toast.error("Couldn't undo", { message: getErrorMessage(e) })) },
        });
      }
      refreshBusinesses();
      setConfirmToggle(false);
    } catch (e) {
      toast.error("Couldn't change status", { message: getErrorMessage(e) });
    } finally {
      setToggling(false);
    }
  }

  return (
    <>
      <Link href="/businesses" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All businesses
      </Link>

      {loading && <CardSkeleton lines={6} />}
      {error && <ErrorState error={error} onRetry={reload} title={error.status === 404 ? "Business not found" : "Couldn't load this business"} />}

      {business && (
        <>
          <PageHeader
            title={business.name}
            eyebrow="Business"
            description={business.category || undefined}
            actions={
              <>
                {!editing && <Button variant="secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden /> Edit</Button>}
                <Button variant={business.isActive ? "danger-outline" : "primary"} onClick={() => setConfirmToggle(true)}>
                  <Power className="h-4 w-4" aria-hidden /> {business.isActive ? "Disable" : "Enable"}
                </Button>
              </>
            }
          />

          {!business.isActive && (
            <Alert tone="warning" title="This business is disabled" className="mb-4">
              Content generation, publishing, audits and analytics are unavailable until you enable it again.
            </Alert>
          )}

          {editing ? (
            <Card className="max-w-2xl">
              <CardHeader title="Edit business" />
              <CardBody>
                <BusinessForm initial={business} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
              </CardBody>
            </Card>
          ) : (
            <Card className="max-w-2xl">
              <CardHeader title="Details" action={<Badge tone={business.isActive ? "success" : "neutral"}>{business.isActive ? "Active" : "Disabled"}</Badge>} />
              <dl className="divide-y divide-line">
                {DETAILS.map(([label, key]) => (
                  <div key={key} className="grid gap-1 px-5 py-3 sm:grid-cols-3 sm:gap-4">
                    <dt className="text-sm text-muted">{label}</dt>
                    <dd className="break-words text-sm sm:col-span-2">{business[key] || <span className="text-muted">Not provided</span>}</dd>
                  </div>
                ))}
                <div className="grid gap-1 px-5 py-3 sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm text-muted">Created</dt>
                  <dd className="text-sm sm:col-span-2">{formatDateTime(business.createdAt)}</dd>
                </div>
                <div className="grid gap-1 px-5 py-3 sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm text-muted">Last updated</dt>
                  <dd className="text-sm sm:col-span-2">{formatDateTime(business.updatedAt)}</dd>
                </div>
              </dl>
            </Card>
          )}

          <ConfirmDialog
            open={confirmToggle}
            onClose={() => setConfirmToggle(false)}
            onConfirm={handleToggle}
            loading={toggling}
            tone={business.isActive ? "danger" : "primary"}
            title={business.isActive ? `Disable ${business.name}?` : `Enable ${business.name}?`}
            confirmLabel={business.isActive ? "Disable business" : "Enable business"}
          >
            {business.isActive ? (
              <>
                <p>The business will be hidden from your list and its scheduled posts will fail to publish while it&apos;s disabled.</p>
                <p>Nothing is deleted. You can enable it again from this page or from the Businesses page.</p>
              </>
            ) : (
              <p>The business will reappear in your list and become your active business.</p>
            )}
          </ConfirmDialog>
        </>
      )}
    </>
  );
}
