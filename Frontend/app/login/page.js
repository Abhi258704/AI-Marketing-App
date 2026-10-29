"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { Megaphone, CalendarClock, ClipboardCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert, Spinner } from "@/components/ui/feedback";
import { GOOGLE_CLIENT_ID } from "@/lib/config";
import { getErrorMessage } from "@/lib/api/client";

const HIGHLIGHTS = [
  { icon: Sparkles, text: "Generate on-brand captions and hashtags with AI" },
  { icon: CalendarClock, text: "Schedule posts to Facebook and Instagram" },
  { icon: ClipboardCheck, text: "Audit your business profile and act on recommendations" },
];

function LoginContent() {
  const { status, login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const expired = params.get("reason") === "expired";

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  async function handleCredential(credentialResponse) {
    if (!credentialResponse?.credential) {
      setError("Google didn't return a credential. Please try again.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(credentialResponse.credential);
      router.replace("/dashboard");
    } catch (e) {
      setError(getErrorMessage(e, "Sign-in failed. Please try again."));
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-brand-800 p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <Megaphone className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-semibold">AI Marketing Platform</span>
        </div>
        <div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
            Marketing for local businesses, without the busywork.
          </h2>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-brand-100">
                <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-brand-200">Sign in with the Google account you use for your business.</p>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-white">
              <Megaphone className="h-5 w-5" aria-hidden />
            </span>
            <span className="font-semibold">AI Marketing Platform</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted">Use your Google account to continue.</p>

          <div className="mt-6 space-y-4">
            {expired && (
              <Alert tone="warning" title="Your session ended">
                Please sign in again to continue.
              </Alert>
            )}
            {error && (
              <Alert tone="danger" title="Couldn't sign you in">
                {error}
              </Alert>
            )}
            {!GOOGLE_CLIENT_ID ? (
              <Alert tone="danger" title="Google sign-in isn't configured">
                Set <code className="rounded bg-white/60 px-1">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in{" "}
                <code className="rounded bg-white/60 px-1">Frontend/.env.local</code> and restart the dev server.
              </Alert>
            ) : submitting ? (
              <div className="flex h-11 items-center gap-3 text-sm text-muted">
                <Spinner label="Signing in" /> Signing you in…
              </div>
            ) : (
              <div className="flex min-h-11 justify-start">
                <GoogleLogin
                  onSuccess={handleCredential}
                  onError={() => setError("Google sign-in was cancelled or failed. Please try again.")}
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                />
              </div>
            )}
          </div>

          <p className="mt-8 text-xs leading-relaxed text-muted">
            We only use your Google profile (name, email, photo) to create your account. Social platform
            permissions are requested separately when you connect Facebook or Instagram.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
