/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useCallback } from "react";
import api from "../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuickAddVariant {
  variant: string; // e.g. "normal", "holofoil", "reverseHolofoil"
  label: string; // display label
  marketPrice: number | null;
}

interface QuickAddInventoryProps {
  cardId: string;
  cardName: string;
  setId: string;
  setName: string;
  cardNumber: string;
  imageSmall: string | null;
  variants: QuickAddVariant[];
  collectionId?: string | null;
}

const VARIANT_LABELS: Record<string, string> = {
  normal: "Normal",
  holofoil: "Holofoil",
  reverseHolofoil: "Reverse Holo",
  "1stEditionHolofoil": "1st Ed Holo",
  "1stEditionNormal": "1st Ed Normal",
  unlimitedHolofoil: "Unlimited Holo",
  unlimitedNormal: "Unlimited",
  shadowlessHolofoil: "Shadowless Holo",
  shadowlessNormal: "Shadowless",
};

function variantLabel(v: string): string {
  return (
    VARIANT_LABELS[v] ??
    v
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim()
  );
}

// ─── QuickAddInventory ────────────────────────────────────────────────────────
// Renders a compact add-to-inventory UI for each raw card variant.
// Used on both the set browser card grid and the card detail page.

export default function QuickAddInventory({
  cardId,
  cardName,
  setId,
  setName,
  cardNumber,
  imageSmall,
  variants,
  collectionId,
}: QuickAddInventoryProps) {
  // qty[variant] = current pending quantity
  const [qty, setQty] = useState<Record<string, number>>({});
  // added[variant] = number successfully added (for feedback)
  const [added, setAdded] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getQty = (v: string) => qty[v] ?? 0;

  const increment = (v: string) =>
    setQty((p) => ({ ...p, [v]: Math.min((p[v] ?? 0) + 1, 99) }));

  const decrement = (v: string) =>
    setQty((p) => ({ ...p, [v]: Math.max((p[v] ?? 0) - 1, 0) }));

  const handleAdd = useCallback(
    async (variant: QuickAddVariant) => {
      const count = getQty(variant.variant);
      if (count === 0) return;
      setLoading(variant.variant);
      setError(null);
      try {
        // Add one inventory entry per quantity
        await Promise.all(
          Array.from({ length: count }).map(() =>
            api.post("/inventory", {
              itemType: "raw_card",
              cardId,
              collection_id: collectionId ?? null,
            }),
          ),
        );
        setAdded((p) => ({
          ...p,
          [variant.variant]: (p[variant.variant] ?? 0) + count,
        }));
        setQty((p) => ({ ...p, [variant.variant]: 0 }));
      } catch (err: any) {
        setError(err?.message ?? "Failed to add");
      } finally {
        setLoading(null);
      }
    },
    [qty, cardId, collectionId],
  );

  if (variants.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      {error && (
        <div style={{ fontSize: 10, color: "var(--red)", marginBottom: 4 }}>
          {error}
        </div>
      )}
      {variants.map((v) => {
        const q = getQty(v.variant);
        const isAdding = loading === v.variant;
        const doneCount = added[v.variant] ?? 0;

        return (
          <div
            key={v.variant}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 0",
              borderTop: "1px solid var(--border)",
            }}
          >
            {/* Variant label */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {variantLabel(v.variant)}
              </div>
              {v.marketPrice !== null && (
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--gold)",
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  ${v.marketPrice.toFixed(2)}
                </div>
              )}
            </div>

            {/* Done badge */}
            {doneCount > 0 && q === 0 && (
              <span
                style={{
                  fontSize: 9,
                  color: "#10B981",
                  fontFamily: "DM Mono, monospace",
                  background: "rgba(16,185,129,0.1)",
                  padding: "2px 5px",
                  borderRadius: 4,
                }}
              >
                +{doneCount} added
              </span>
            )}

            {/* Qty stepper */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                flexShrink: 0,
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  decrement(v.variant);
                }}
                disabled={q === 0}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: q === 0 ? "var(--text-dim)" : "var(--text-secondary)",
                  cursor: q === 0 ? "not-allowed" : "pointer",
                  fontSize: 13,
                  lineHeight: 1,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                −
              </button>
              <span
                style={{
                  fontSize: 11,
                  minWidth: 14,
                  textAlign: "center",
                  color: q > 0 ? "var(--text-primary)" : "var(--text-dim)",
                  fontFamily: "DM Mono, monospace",
                }}
              >
                {q}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  increment(v.variant);
                }}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: 13,
                  lineHeight: 1,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                +
              </button>
            </div>

            {/* Add button — only shown when qty > 0 */}
            {q > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAdd(v);
                }}
                disabled={isAdding}
                style={{
                  padding: "3px 8px",
                  borderRadius: 5,
                  border: "none",
                  background: isAdding ? "var(--surface-2)" : "var(--gold)",
                  color: isAdding ? "var(--text-dim)" : "#0D0E11",
                  fontSize: 10,
                  fontWeight: 500,
                  cursor: isAdding ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {isAdding ? "…" : "Add"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
