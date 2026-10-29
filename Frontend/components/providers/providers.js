"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { GOOGLE_CLIENT_ID } from "@/lib/config";
import { ToastProvider } from "./toast-provider";
import { AuthProvider } from "./auth-provider";

export function Providers({ children }) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </GoogleOAuthProvider>
  );
}
