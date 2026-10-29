"use client";

import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";

export default function RouteError({ error, reset }) {
  return (
    <div className="mx-auto max-w-lg py-16">
      <Alert
        tone="danger"
        title="This page hit an unexpected error"
        action={<Button size="sm" variant="secondary" onClick={reset}>Try again</Button>}
      >
        {error?.message || "Please try again. If it keeps happening, reload the page."}
      </Alert>
    </div>
  );
}
