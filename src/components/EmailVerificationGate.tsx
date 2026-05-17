"use client";

// src/components/EmailVerificationGate.tsx
//
// Centralized verification gate. Wraps the authenticated app shell.
// Loads the current user's verification status once on mount; if
// email_verified is false, redirects to /verify-email.
//
// IMPORTANT: this is application-enforced verification (Option 2).
// Place this ONCE at the (app) layout level. Do NOT scatter it across
// individual pages.
//
// Behavior on error: redirect to /verify-email rather than fail open.
// If we can't determine status, assume unverified — safer for a verification
// gate. The /verify-email page has a resend button and will work fine.

import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import api from "../lib/api";

interface VerificationState {
  loading: boolean;
  verified: boolean;
}

export default function EmailVerificationGate({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<VerificationState>({
    loading: true,
    verified: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{
          data: { emailVerified: boolean; sentAt: string | null };
        }>("/auth/verification-status");
        if (cancelled) return;
        setState({
          loading: false,
          verified: res.data.data.emailVerified,
        });
      } catch (err) {
        console.error("[EmailVerificationGate] status check failed", err);
        // Fail CLOSED: if we can't determine status, treat as unverified.
        // Verification is a security boundary — better to over-redirect
        // than to let an unverified user slip into the app.
        if (!cancelled) {
          setState({ loading: false, verified: false });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Redirect to /verify-email when unverified
  useEffect(() => {
    if (state.loading) return;
    if (!state.verified && pathname !== "/verify-email") {
      router.replace("/verify-email");
    }
  }, [state, pathname, router]);

  if (state.loading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-dim)",
          fontSize: 13,
        }}
      >
        Loading…
      </div>
    );
  }

  // While we're redirecting, render nothing — prevents flicker
  if (!state.verified) return null;

  return <>{children}</>;
}
