"use client";

/**
 * useCenteringReports — fetches AI centering reports for the current user.
 *
 * Endpoints (all auth-gated):
 *   GET    /centering/reports          → list (paginated, 20 per page)
 *   GET    /centering/reports/:id      → single report detail
 *   DELETE /centering/reports/:id      → delete a report
 *
 * Pattern matches the rest of the codebase: useState + useEffect, no react-query.
 */

import { useCallback, useEffect, useState } from "react";

import api from "../lib/api";

// ─── Types — mirror backend's CenteringReport ─────────────────────────────────

export interface BorderPositions {
  outerLeft: number;
  outerRight: number;
  outerTop: number;
  outerBottom: number;
  innerLeft: number;
  innerRight: number;
  innerTop: number;
  innerBottom: number;
}

export interface CenteringReport {
  id: string;
  userId: string;
  cardId: string | null;
  inventoryItemId: string | null;
  side: "front" | "back";
  imageWidth: number;
  imageHeight: number;
  dpi: number;
  rotation: number;
  borders: BorderPositions;
  measurements: {
    leftMm: number;
    rightMm: number;
    topMm: number;
    bottomMm: number;
  };
  percentages: {
    leftPct: number;
    rightPct: number;
    topPct: number;
    bottomPct: number;
    lrWorse: number;
    tbWorse: number;
    worstAxis: number;
  };
  truepointScore: number;
  grades: {
    psa: string;
    bgs: string;
    cgc: string;
    sgc: string;
    tag: string;
  };
  label: string | null;
  imageUrl: string | null;
  createdAt: string;
}

// ─── List ────────────────────────────────────────────────────────────────────

export function useCenteringReports() {
  const [reports, setReports] = useState<CenteringReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: CenteringReport[] }>(
        "/centering/reports",
      );
      setReports(res.data.data ?? []);
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object" &&
        "error" in err.response.data &&
        typeof err.response.data.error === "string"
          ? err.response.data.error
          : "Failed to load reports";
      setError(message);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const remove = useCallback(async (reportId: string) => {
    try {
      await api.delete(`/centering/reports/${reportId}`);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object" &&
        "error" in err.response.data &&
        typeof err.response.data.error === "string"
          ? err.response.data.error
          : "Failed to delete";
      // Re-throw so the UI can show an error
      throw new Error(message);
    }
  }, []);

  return { reports, loading, error, reload: load, remove };
}

// ─── Detail ──────────────────────────────────────────────────────────────────

export function useCenteringReport(reportId: string | undefined) {
  const [report, setReport] = useState<CenteringReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;

    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      api
        .get<{ data: CenteringReport }>(`/centering/reports/${reportId}`)
        .then((res) => {
          if (!cancelled) setReport(res.data.data);
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            const message =
              err &&
              typeof err === "object" &&
              "response" in err &&
              err.response &&
              typeof err.response === "object" &&
              "data" in err.response &&
              err.response.data &&
              typeof err.response.data === "object" &&
              "error" in err.response.data &&
              typeof err.response.data.error === "string"
                ? err.response.data.error
                : "Failed to load report";
            setError(message);
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
  }, [reportId]);

  return {
    report: reportId ? report : null,
    loading: reportId ? loading : false,
    error: reportId ? error : null,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Tier color for a TruePoint score (0–100). Mirrors grading conventions:
 * 95+ green, 85+ blue, 70+ gold, 50+ orange, below 50 red.
 */
export function scoreTierColor(score: number): string {
  if (score >= 95) return "#3DAA6E";
  if (score >= 85) return "#378ADD";
  if (score >= 70) return "#C9A84C";
  if (score >= 50) return "#F59E0B";
  return "#C94C4C";
}

/** Short formatter for the L/R/T/B percentages display ("48 / 52"). */
export function formatLRTB(left: number, right: number): string {
  return `${Math.round(left)} / ${Math.round(right)}`;
}
