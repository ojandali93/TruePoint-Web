"use client";

// Client-boundary wrapper for the root layout (which stays a server
// component — see layout.tsx). Its only job right now is firing PostHog
// init once on mount; a plain useEffect, not a context provider, since
// analytics.ts already holds its own module-level state (no React state to
// share downward). Kept as its own file/component rather than inlined in
// layout.tsx so layout.tsx doesn't need "use client" itself.

import { useEffect, type ReactNode } from "react";
import { initAnalytics } from "@/lib/analytics";

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    initAnalytics();
  }, []);

  return <>{children}</>;
}
