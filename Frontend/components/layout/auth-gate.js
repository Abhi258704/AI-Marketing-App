"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Spinner } from "@/components/ui/feedback";

export function FullPageSpinner({ label = "Loading" }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner label={label} />
    </div>
  );
}

export function AuthGate({ children }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") return <FullPageSpinner label="Checking your session" />;
  return children;
}
