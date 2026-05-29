"use client";

/**
 * RawPriceHistoryChart — line chart of raw card prices over time, per variant.
 *
 * Data source: GET /cards/:cardId/price-history?range=7d|30d (via usePriceHistory).
 *
 * Uses recharts (already in package.json). Multi-line: one Line per variant in
 * the series. Shared y-axis (USD); shared x-axis (date).
 *
 * Range toggle: 7D / 30D (per Omar's spec).
 *
 * Empty state shows when the API returns no series or every series has < 2
 * dated points (can't draw a line with one point). Copy mirrors mobile.
 *
 * Visual style follows the card detail page's existing component vocabulary:
 *   - --surface, --border, --gold, --text-* CSS vars
 *   - DM Mono for numbers (matches the rest of the screen)
 */

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  type PriceHistoryRange,
  type PriceHistorySeries,
  usePriceHistory,
} from "../../hooks/usePriceHistory";

// ─── Variant label & color mapping ────────────────────────────────────────────
// Backend variants are camelCase. Web doesn't have a central VARIANT_LABELS
// constant so we inline a small mapping. Anything unrecognized falls through
// to the raw string.

const VARIANT_LABEL: Record<string, string> = {
  normal: "Normal",
  holofoil: "Holofoil",
  reverseHolofoil: "Reverse Holofoil",
  reverse_holofoil: "Reverse Holofoil",
  unlimited: "Unlimited",
  unlimitedHolofoil: "Unlimited Holofoil",
  "1stEditionNormal": "1st Edition",
  "1stEditionHolofoil": "1st Edition Holofoil",
  firstEditionNormal: "1st Edition",
  firstEditionHolofoil: "1st Edition Holofoil",
  shadowless: "Shadowless",
  pokeball: "Poké Ball Pattern",
  masterball: "Master Ball Pattern",
};

const VARIANT_COLOR: Record<string, string> = {
  normal: "#C9A84C", // gold
  holofoil: "#378ADD",
  reverseHolofoil: "#A78BFA",
  reverse_holofoil: "#A78BFA",
  unlimited: "#3DAA6E",
  unlimitedHolofoil: "#3DAA6E",
  "1stEditionNormal": "#D85A30",
  "1stEditionHolofoil": "#D85A30",
  firstEditionNormal: "#D85A30",
  firstEditionHolofoil: "#D85A30",
  shadowless: "#8A8FA0",
  pokeball: "#FF6B9D",
  masterball: "#7C3AED",
};

const variantLabel = (v: string): string => VARIANT_LABEL[v] ?? v;
const variantColor = (v: string): string => VARIANT_COLOR[v] ?? "#8A8FA0";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtPrice = (val: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

// Parse YYYY-MM-DD as a *local* date so display labels don't shift by timezone.
const fmtShortDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

// Build a recharts-friendly dataset: one row per date with columns per variant.
// We don't interpolate across missing dates — if a variant has no snapshot on a
// given day, recharts draws a gap (connectNulls={false}).
function buildChartData(series: PriceHistorySeries[]): {
  rows: Array<{ date: string; [variant: string]: string | number | null }>;
  variantsWithData: string[];
} {
  const dateSet = new Set<string>();
  for (const s of series) for (const p of s.points) dateSet.add(p.date);
  const dates = Array.from(dateSet).sort(); // YYYY-MM-DD sorts chronologically

  // Index points by (variant, date)
  const byVariantDate = new Map<string, Map<string, number>>();
  const variantsWithData: string[] = [];
  for (const s of series) {
    if (s.points.length < 2) continue; // need at least 2 to draw
    const inner = new Map<string, number>();
    for (const p of s.points) inner.set(p.date, p.price);
    byVariantDate.set(s.variant, inner);
    variantsWithData.push(s.variant);
  }

  const rows = dates.map((date) => {
    const row: { date: string; [k: string]: string | number | null } = { date };
    for (const v of variantsWithData) {
      const inner = byVariantDate.get(v);
      const px = inner?.get(date);
      row[v] = px ?? null;
    }
    return row;
  });

  return { rows, variantsWithData };
}

// ─── Component ────────────────────────────────────────────────────────────────

const RANGES: { label: string; value: PriceHistoryRange }[] = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
];

interface Props {
  cardId: string;
  height?: number;
}

export default function RawPriceHistoryChart({ cardId, height = 240 }: Props) {
  const [range, setRange] = useState<PriceHistoryRange>("7d");
  const { series, loading, error } = usePriceHistory(cardId, range);

  const { rows, variantsWithData } = useMemo(
    () => buildChartData(series),
    [series],
  );

  const isEmpty = !loading && !error && rows.length < 2;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "20px 24px",
      }}
    >
      {/* Header — title + range toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: "var(--gold)",
              letterSpacing: "0.1em",
              fontFamily: "DM Mono, monospace",
              marginBottom: 4,
            }}
          >
            PRICE HISTORY
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--text-primary)",
            }}
          >
            Raw price over time
          </div>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {RANGES.map((r) => {
            const active = r.value === range;
            return (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 100,
                  border: active
                    ? "1px solid var(--gold)"
                    : "1px solid transparent",
                  background: active ? "rgba(201,168,76,0.14)" : "transparent",
                  color: active ? "var(--gold)" : "var(--text-dim)",
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  fontFamily: "DM Mono, monospace",
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart body */}
      <div style={{ height, position: "relative" }}>
        {loading ? (
          <Center>Loading price history…</Center>
        ) : error ? (
          <Center>Couldn’t load price history.</Center>
        ) : isEmpty ? (
          <Center>
            <div style={{ textAlign: "center", lineHeight: 1.6 }}>
              <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                Not enough history yet
              </div>
              <div
                style={{
                  color: "var(--text-dim)",
                  fontSize: 11,
                  marginTop: 4,
                }}
              >
                Price chart fills in as daily snapshots accumulate.
              </div>
            </div>
          </Center>
        ) : (
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart
              data={rows}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray='3 3'
                stroke='var(--border)'
                opacity={0.4}
              />
              <XAxis
                dataKey='date'
                tickFormatter={fmtShortDate}
                tick={{ fontSize: 10, fill: "var(--text-dim)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={{ stroke: "var(--border)" }}
                minTickGap={20}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--text-dim)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={{ stroke: "var(--border)" }}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(2)}`
                }
                width={64}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(label) =>
                  typeof label === "string" ? fmtShortDate(label) : label
                }
                formatter={(value, name) => {
                  const v = typeof value === "number" ? value : null;
                  const n = typeof name === "string" ? name : String(name);
                  if (v == null) return ["—", variantLabel(n)];
                  return [fmtPrice(v), variantLabel(n)];
                }}
              />
              {variantsWithData.map((v) => (
                <Line
                  key={v}
                  type='monotone'
                  dataKey={v}
                  name={v}
                  stroke={variantColor(v)}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend — only when 2+ variants render */}
      {!isEmpty && !loading && !error && variantsWithData.length >= 2 ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 16,
            marginTop: 12,
          }}
        >
          {variantsWithData.map((v) => (
            <div
              key={v}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: "var(--text-secondary)",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 2,
                  background: variantColor(v),
                  display: "inline-block",
                }}
              />
              {variantLabel(v)}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-dim)",
        fontSize: 12,
      }}
    >
      {children}
    </div>
  );
}
