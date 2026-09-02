"use client";

// Client-boundary wrapper for the root layout (which stays a server
// component — see layout.tsx). Its only job right now is firing PostHog
// init once on mount; a plain useEffect, not a context provider, since
// analytics.ts already holds its own module-level state (no React state to
// share downward). Kept as its own file/component rather than inlined in
// layout.tsx so layout.tsx doesn't need "use client" itself.

import { useEffect, type ReactNode } from "react";
import { initAnalytics } from "@/lib/analytics";
import { captureRefCookie } from "@/lib/referral";

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    initAnalytics();
    // AUDITS/affiliate-system-plan.md §2.1 — unconditional, see
    // referral.ts's own header for why this can't be per-user flag-gated
    // pre-auth; the real gate is server-side, at signup.
    captureRefCookie();
  }, []);

  return <>{children}</>;
}
