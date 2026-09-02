// src/hooks/useTrialDays.ts
//
// Single source of truth for trial-length copy (2026-09-02 fact-check:
// PlanStep and BillingStep contradicted each other in the same onboarding
// flow — 7 days vs. 14 — while Stripe checkout actually executes
// trial_period_days=14). Reads GET /billing/config (public, no auth,
// server's own TRIAL_DAYS constant) instead of any component hardcoding a
// number — this can't drift again the way the old copy did, because
// there's nothing left for a copy edit to get out of sync with.
//
// FALLBACK_TRIAL_DAYS is not a second source of truth to keep in sync —
// it's what renders for the one render frame before the fetch resolves,
// and only if /billing/config is ever actually unreachable. If the real
// value ever changes, the endpoint is the only place that needs to know.

import { useEffect, useState } from "react";
import api from "../lib/api";

const FALLBACK_TRIAL_DAYS = 14;

export function useTrialDays(): number {
  const [days, setDays] = useState(FALLBACK_TRIAL_DAYS);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ data: { trialDays: number } }>("/billing/config")
      .then((res) => {
        const value = res.data?.data?.trialDays;
        if (!cancelled && typeof value === "number") setDays(value);
      })
      .catch(() => {
        /* keep the fallback — never let a config fetch failure break the copy */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return days;
}
