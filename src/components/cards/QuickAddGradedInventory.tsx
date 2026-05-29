/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * QuickAddGradedInventory — inline +/- stepper + add button for adding a
 * graded copy of a card to inventory.
 *
 * Renders compactly to fit inside a grading-analysis row (next to the ROI
 * column). Mirrors the UX of the existing QuickAddInventory but writes
 * graded_card items with company + grade.
 *
 * Plan locking is handled the same way — uses the usePlan() snapshot to
 * disable adds for users whose plan doesn't permit inventory tracking, and
 * surfaces 403 PLAN_FEATURE_LOCKED / PLAN_LIMIT_REACHED responses as inline
 * upgrade CTAs.
 */

import { useState, useCallback } from "react";
import Link from "next/link";

import api from "../../lib/api";
import { usePlan } from "../../context/PlanContext";

interface PlanErrorBody {
  code?: "PLAN_FEATURE_LOCKED" | "PLAN_LIMIT_REACHED";
  upgradeTo?: "collector" | "pro";
  error?: string;
}

const PLAN_LABEL: Record<string, string> = {
  collector: "Collector",
  pro: "Pro",
};

interface QuickAddGradedInventoryProps {
  cardId: string;
  /** Grading company exactly as the backend expects ("PSA", "BGS", etc.) */
  gradingCompany: "PSA" | "BGS" | "CGC" | "SGC" | "TAG";
  /** Grade string exactly as PokeTrace returns it ("10", "9.5", "Black Label", etc.) */
  grade: string;
  collectionId?: string | null;
  /** Optional accent color used for the button border in resting state */
  accentColor?: string;
}

export default function QuickAddGradedInventory({
  cardId,
  gradingCompany,
  grade,
  collectionId,
  accentColor = "var(--gold)",
}: QuickAddGradedInventoryProps) {
  const { features, loading: planLoading } = usePlan();
  const [qty, setQty] = useState(0);
  const [added, setAdded] = useState(0);
  const [loading, setLoading] = useState(false);
  const [planLock, setPlanLock] = useState<PlanErrorBody | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inc = () => setQty((n) => Math.min(n + 1, 99));
  const dec = () => setQty((n) => Math.max(n - 1, 0));

  const handleAdd = useCallback(async () => {
    if (qty === 0) return;
    setLoading(true);
    setError(null);
    setPlanLock(null);
    try {
      await Promise.all(
        Array.from({ length: qty }).map(() =>
          api.post("/inventory", {
            itemType: "graded_card",
            cardId,
            gradingCompany,
            grade,
            quantity: 1,
            collection_id: collectionId ?? null,
          }),
        ),
      );
      setAdded((n) => n + qty);
      setQty(0);
    } catch (err: any) {
      const body = err?.response?.data as PlanErrorBody | undefined;
      if (
        body?.code === "PLAN_FEATURE_LOCKED" ||
        body?.code === "PLAN_LIMIT_REACHED"
      ) {
        setPlanLock(body);
      } else {
        console.error("[QuickAddGradedInventory] add failed:", err);
        setError("Couldn't add. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [qty, cardId, gradingCompany, grade, collectionId]);

  // Plan-locked state
  if (!planLoading && !features.inventory_tracking) {
    return (
      <div
        style={{
          fontSize: 10,
          color: "var(--text-dim)",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          alignItems: "flex-end",
        }}
      >
        <span>Inventory locked</span>
        <Link
          href='/settings/billing'
          style={{ color: "var(--gold)", textDecoration: "none" }}
        >
          Upgrade
        </Link>
      </div>
    );
  }

  if (planLock) {
    return (
      <div
        style={{
          fontSize: 10,
          color: "var(--text-dim)",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          alignItems: "flex-end",
        }}
      >
        <span>
          {planLock.code === "PLAN_LIMIT_REACHED"
            ? "Plan limit reached"
            : "Plan required"}
        </span>
        <Link
          href='/settings/billing'
          style={{ color: "var(--gold)", textDecoration: "none" }}
        >
          Upgrade to{" "}
          {PLAN_LABEL[planLock.upgradeTo ?? "collector"] ?? "next plan"}
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        justifyContent: "flex-end",
      }}
    >
      {/* Stepper */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <button
          onClick={dec}
          disabled={qty === 0 || loading}
          aria-label='Decrease quantity'
          style={{
            width: 26,
            height: 26,
            border: "none",
            background: "transparent",
            color: qty === 0 ? "var(--text-dim)" : "var(--text-secondary)",
            fontSize: 14,
            cursor: qty === 0 || loading ? "default" : "pointer",
            fontFamily: "inherit",
          }}
        >
          −
        </button>
        <span
          style={{
            minWidth: 22,
            textAlign: "center",
            fontSize: 12,
            color: "var(--text-primary)",
            fontFamily: "DM Mono, monospace",
          }}
        >
          {qty}
        </span>
        <button
          onClick={inc}
          disabled={loading}
          aria-label='Increase quantity'
          style={{
            width: 26,
            height: 26,
            border: "none",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: 14,
            cursor: loading ? "default" : "pointer",
            fontFamily: "inherit",
          }}
        >
          +
        </button>
      </div>

      {/* Add button — only shows when qty > 0 */}
      {qty > 0 && (
        <button
          onClick={handleAdd}
          disabled={loading}
          style={{
            padding: "5px 10px",
            border: `1px solid ${accentColor}`,
            borderRadius: 6,
            background: `${accentColor}18`,
            color: accentColor,
            fontSize: 11,
            fontWeight: 500,
            cursor: loading ? "default" : "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          {loading ? "Adding..." : `Add ${qty}`}
        </button>
      )}

      {/* Recently-added feedback (transient flash) */}
      {qty === 0 && added > 0 && (
        <span
          style={{
            fontSize: 10,
            color: "var(--green)",
            fontFamily: "DM Mono, monospace",
            whiteSpace: "nowrap",
          }}
        >
          +{added} added
        </span>
      )}

      {/* Generic error */}
      {error && (
        <span
          style={{
            fontSize: 10,
            color: "var(--red)",
            whiteSpace: "nowrap",
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
