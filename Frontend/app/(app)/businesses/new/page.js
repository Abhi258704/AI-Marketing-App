"use client";

import { useRouter } from "next/navigation";
import { useBusiness } from "@/components/providers/business-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Card, CardBody, PageHeader } from "@/components/ui/card";
import { BusinessForm } from "@/components/business/business-form";
import { createBusiness } from "@/lib/api/businesses";

export default function NewBusinessPage() {
  const router = useRouter();
  const toast = useToast();
  const { refreshBusinesses, selectBusiness } = useBusiness();

  async function handleSubmit(payload) {
    const { business } = await createBusiness(payload);
    selectBusiness(business._id);
    refreshBusinesses();
    toast.success("Business created", { message: `${business.name} is now your active business.` });
    router.push("/dashboard");
  }

  return (
    <>
      <PageHeader title="New business" description="Tell us about the business you're marketing. You can edit this later." />
      <Card className="max-w-2xl">
        <CardBody>
          <BusinessForm submitLabel="Create business" onSubmit={handleSubmit} onCancel={() => router.back()} />
        </CardBody>
      </Card>
    </>
  );
}
