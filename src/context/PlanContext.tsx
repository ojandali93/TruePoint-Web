// src/context/PlanContext.tsx
//
// Centralized plan state. Wrap the (app) layout with <PlanProvider> and
// any component can ask:
//   const { features, usage, isAdmin } = usePlan();
//   if (!features.portfolio_dashboard) { return <UpgradeCard plan="pro" /> }
//
// One API call per session — refresh after user takes a gated action so
// usage counters stay current.

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import api from "../lib/api";

export type PlanKey = "starter" | "collector" | "pro";

export type FeatureKey =
  | "inventory_tracking"
  | "sealed_inventory"
  | "pack_opening"
  | "portfolio_dashboard"
  | "regrade_arbitrage"
  | "submission_tracking"
  | "ai_grading";

export interface UsageInfo {
  used: number;
  limit: number | null;
  remaining: number | null;
}

export interface PlanSnapshot {
  plan: PlanKey;
  effectivePlan: PlanKey;
  isAdmin: boolean;
  features: Record<FeatureKey, boolean>;
  /**
   * Feature-flag rollout state, resolved server-side. Distinct from
   * `features`: that's entitlement (does your PLAN include this), this is
   * rollout (has it SHIPPED to you yet). Keys are arbitrary strings, so this
   * is intentionally not a closed union — flags come and go.
   */
  flags: Record<string, boolean>;
  usage: {
    aiGradingReports: UsageInfo;
    submissions: UsageInfo;
  };
  staticLimits: {
    collections: number | null;
    masterSets: number | null;
    priceAlerts: number | null;
  };
}

interface PlanContextValue {
  snapshot: PlanSnapshot | null;
  loading: boolean;
  refresh: () => Promise<void>;
  // Convenience accessors that don't crash before snapshot loads
  isAdmin: boolean;
  plan: PlanKey;
  features: Record<FeatureKey, boolean>;
  flags: Record<string, boolean>;
  usage: PlanSnapshot["usage"] | null;
}

const DEFAULT_FEATURES: Record<FeatureKey, boolean> = {
  inventory_tracking: false,
  sealed_inventory: false,
  pack_opening: false,
  portfolio_dashboard: false,
  regrade_arbitrage: false,
  submission_tracking: false,
  ai_grading: false,
};

const DEFAULT_FLAGS: Record<string, boolean> = {};

const PlanContext = createContext<PlanContextValue>({
  snapshot: null,
  loading: true,
  refresh: async () => {},
  isAdmin: false,
  plan: "starter",
  features: DEFAULT_FEATURES,
  flags: DEFAULT_FLAGS,
  usage: null,
});

export const PlanProvider = ({ children }: { children: ReactNode }) => {
  const [snapshot, setSnapshot] = useState<PlanSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<{ data: PlanSnapshot }>("/me/plan");
      setSnapshot(res.data.data);
    } catch (err) {
      console.error("[PlanContext] load failed:", err);
      // On failure, keep snapshot null — UI treats as starter / no features.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(t);
  }, [refresh]);

  return (
    <PlanContext.Provider
      value={{
        snapshot,
        loading,
        refresh,
        isAdmin: snapshot?.isAdmin ?? false,
        plan: snapshot?.effectivePlan ?? "starter",
        features: snapshot?.features ?? DEFAULT_FEATURES,
        flags: snapshot?.flags ?? DEFAULT_FLAGS,
        usage: snapshot?.usage ?? null,
      }}
    >
      {children}
    </PlanContext.Provider>
  );
};

export const usePlan = () => useContext(PlanContext);

/**
 * Gate an unreleased feature:
 *
 *   if (useFlag("regrade_tracker")) { ... }
 *
 * Returns false while the snapshot is loading and false for unknown keys, so
 * dark features flicker IN rather than out. Never render a gated feature and
 * then yank it away.
 *
 * Not to be confused with usePlan().features — that's subscription
 * entitlement. This is rollout state.
 */
export const useFlag = (key: string): boolean => {
  const { flags } = useContext(PlanContext);
  return flags[key] === true;
};
