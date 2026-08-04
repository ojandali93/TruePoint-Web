"use client";

/**
 * VariantDots — variant indicator strip used on the set browser card tile.
 *
 * Mobile uses a row of colored circles, each color from the variant registry.
 * On hover/expanded view, we surface the variant labels + per-variant prices.
 *
 * Three rendering modes:
 *   • <VariantDots variants={...} />       compact row of dots
 *   • <VariantPriceList variants={...} />  vertical list (variant + price)
 *   • <PriceRange variants={...} />        text "$0.83 – $12.30"
 *
 * Phantom filter happens upstream (useSetGrid). This component renders
 * whatever it's given.
 */

import { type CardVariantPrice } from "../../hooks/useSetGrid";

// Market price is TCGPlayer's own weighted calc — needs enough recent
// SALES history, not just listings, so it's null more often than you'd
// expect for anything thin-traded (expensive, brand-new, rare). Falling
// back through mid → low → high means a card with real, known pricing
// still shows a number here instead of nothing, even when TCGPlayer's own
// market figure isn't confident enough yet to publish. This is a display
// fallback only — market stays whatever it actually is in the data; this
// never gets written back anywhere.
function displayPrice(v: CardVariantPrice): number | null {
  return v.market ?? v.mid ?? v.low ?? v.high;
}

// ─── Dots ─────────────────────────────────────────────────────────────────────

export function VariantDots({
  variants,
  size = 7,
  gap = 3,
}: {
  variants: CardVariantPrice[];
  size?: number;
  gap?: number;
}) {
  if (variants.length === 0) return null;
  return (
    <div style={{ display: "flex", gap }}>
      {variants.map((v) => {
        const price = displayPrice(v);
        return (
          <span
            key={`${v.variant}-${v.cardId}`}
            title={`${v.label}${price != null ? ` — $${price.toFixed(2)}` : ""}`}
            style={{
              width: size,
              height: size,
              borderRadius: "50%",
              background: v.color,
              display: "inline-block",
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Expanded price list ──────────────────────────────────────────────────────

export function VariantPriceList({
  variants,
}: {
  variants: CardVariantPrice[];
}) {
  if (variants.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {variants.map((v) => {
        const price = displayPrice(v);
        return (
          <div
            key={`${v.variant}-${v.cardId}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
              fontSize: 10,
              color: "var(--text-secondary)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: v.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {v.label}
              </span>
            </div>
            <span
              style={{
                fontFamily: "DM Mono, monospace",
                color: price != null ? "var(--green)" : "var(--text-dim)",
                flexShrink: 0,
              }}
            >
              {price != null ? `$${price.toFixed(2)}` : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Price range (one-line summary) ───────────────────────────────────────────

export function priceRangeText(variants: CardVariantPrice[]): string {
  const prices = variants
    .map(displayPrice)
    .filter((p): p is number => p != null);
  if (prices.length === 0) return "—";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `$${min.toFixed(2)}`;
  return `$${min.toFixed(2)} – $${max.toFixed(2)}`;
}
