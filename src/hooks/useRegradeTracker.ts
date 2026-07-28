"use client";

/**
 * useRegradeTracker — regrade tracker (unowned graded arbitrage) hooks.
 *
 * Mirrors usePriceHistory.ts's pattern: useState + useEffect, no
 * react-query — this codebase's web hooks don't use it. Mutations
 * (create/update/delete) are plain exported async functions rather than
 * hook-wrapped mutations, since there's no query-cache to invalidate here;
 * callers call the function then call the list hook's `refetch`.
 *
 * All of these hit /api/v1/regrades/..., which is gated server-side behind
 * the "regrade_tracker" flag — a 404 here means the flag isn't on for this
 * account, not that something's broken.
 */

import { useCallback, useEffect, useState } from "react";

import api from "../lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────
// No shared grading.types.ts exists on web today (grading/page.tsx keeps its
// own local Opportunity/Summary types) — these live here since the hook is
// the one shared thing both the grading page and card detail page import.

export interface LadderEntry {
  company: string;
  grade: string;
  gradeValue: number;
  price: number;
}

export interface GradeLadderResult {
  cardId: string;
  cardName: string;
  cardNumber: string;
  setName: string;
  setId: string;
  imageSmall: string | null;
  rarity: string | null;
  rawPrice: number | null;
  ladder: LadderEntry[];
  pricedAsOf: string | null;
}

export type TrackedRegradeStatus =
  | "researching"
  | "owned"
  | "submitted"
  | "returned"
  | "sold";

export const TRACKED_REGRADE_STATUSES: TrackedRegradeStatus[] = [
  "researching",
  "owned",
  "submitted",
  "returned",
  "sold",
];

export interface TrackedRegradeRow {
  id: string;
  cardId: string;
  cardName: string;
  cardNumber: string;
  setName: string;
  imageSmall: string | null;
  currentCompany: string | null;
  currentGrade: string | null;
  subCentering: number | null;
  subCorners: number | null;
  subEdges: number | null;
  subSurface: number | null;
  targetCompany: string;
  targetGrade: string;
  targetPrice: number | null;
  currentPrice: number | null;
  acquisitionPrice: number | null;
  gradingCostUsed: number;
  estimatedProfit: number | null;
  estimatedROI: number | null;
  status: TrackedRegradeStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrackedRegradeSummary {
  totalTracked: number;
  totalBasis: number;
  projectedValue: number;
  totalUpside: number;
  byStatus: Partial<Record<TrackedRegradeStatus, number>>;
}

export interface TrackedRegradesResult {
  summary: TrackedRegradeSummary;
  items: TrackedRegradeRow[];
}

export interface TrackedRegradeInput {
  cardId: string;
  currentCompany?: string | null;
  currentGrade?: string | null;
  subCentering?: number | null;
  subCorners?: number | null;
  subEdges?: number | null;
  subSurface?: number | null;
  targetCompany: string;
  targetGrade: string;
  acquisitionPrice?: number | null;
  status?: TrackedRegradeStatus;
  notes?: string | null;
}

// ─── Ladder (read-only, works for any card — no ownership) ─────────────────

export const useGradeLadder = (cardId: string | null) => {
  const [data, setData] = useState<GradeLadderResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No setState here — this used to call setData(null) synchronously,
    // which React's set-state-in-effect rule correctly flags (it forces an
    // extra render pass). Bare return instead; the exposed `data` below is
    // derived from `cardId` directly, matching usePriceHistory.ts's pattern.
    if (!cardId) return;

    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      api
        .get<{ data: GradeLadderResult }>(`/regrades/${cardId}/ladder`)
        .then((res) => {
          if (!cancelled) setData(res.data.data);
        })
        .catch((err) => {
          if (!cancelled) {
            console.warn("[useGradeLadder] error:", err);
            setError(err.message ?? "Failed to load price ladder");
            setData(null);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [cardId]);

  return {
    data: cardId ? data : null,
    loading: cardId ? loading : false,
    error: cardId ? error : null,
  };
};

// ─── Tracked list ───────────────────────────────────────────────────────────

/**
 * Defends against a stale backend still serving the old bare-array response
 * instead of the current { summary, items } shape — same reasoning as the
 * mobile hook's version of this function; keep both in sync.
 */
const normalizeTrackedRegradesResult = (
  raw: unknown,
): TrackedRegradesResult => {
  if (
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as { items?: unknown }).items)
  ) {
    return raw as TrackedRegradesResult;
  }
  const items = Array.isArray(raw) ? (raw as TrackedRegradeRow[]) : [];
  return {
    items,
    summary: {
      totalTracked: items.length,
      totalBasis: 0,
      projectedValue: 0,
      totalUpside: 0,
      byStatus: {},
    },
  };
};

export const useTrackedRegrades = (enabled: boolean = true) => {
  const [data, setData] = useState<TrackedRegradesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refetchTick, setRefetchTick] = useState(0);

  const refetch = useCallback(() => setRefetchTick((t) => t + 1), []);

  useEffect(() => {
    // Bare return, no setState — same reasoning as useGradeLadder above.
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<{ data: unknown }>("/regrades")
      .then((res) => {
        if (!cancelled) setData(normalizeTrackedRegradesResult(res.data.data));
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("[useTrackedRegrades] error:", err);
          setError(err.message ?? "Failed to load tracked cards");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, refetchTick]);

  return {
    data: enabled ? data : null,
    loading: enabled ? loading : false,
    error: enabled ? error : null,
    refetch,
  };
};

// ─── Mutations — plain async functions, no hook wrapper needed ─────────────

export const createTrackedRegrade = async (
  input: TrackedRegradeInput,
): Promise<TrackedRegradeRow> => {
  const res = await api.post<{ data: TrackedRegradeRow }>("/regrades", input);
  return res.data.data;
};

export const updateTrackedRegrade = async (
  id: string,
  patch: Partial<TrackedRegradeInput>,
): Promise<TrackedRegradeRow> => {
  const res = await api.patch<{ data: TrackedRegradeRow }>(
    `/regrades/${id}`,
    patch,
  );
  return res.data.data;
};

export const deleteTrackedRegrade = async (id: string): Promise<void> => {
  await api.delete(`/regrades/${id}`);
};
