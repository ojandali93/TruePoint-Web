/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * PortfolioValueHero — the dashboard's value section, mirroring the mobile
 * PortfolioValueChart layout:
 *
 *   ┌────────────────────────┬─────────────────────────┐
 *   │ TOTAL COLLECTION VALUE  │ 24H   +1.2%   +$84      │
 *   │ $12,480.55              │ 7D    +3.4%   +$410     │
 *   │  ╱╲    detailed chart   │ 30D   -0.8%   -$96      │
 *   │ ╱  ╲__╱╲___             │ ─────────────────────── │
 *   │ [7D] [30D] [90D]        │ 248 items               │
 *   │                         │ ● Raw 180 · $4.2k …     │
 *   └────────────────────────┴─────────────────────────┘
 *
 * Self-contained: accepts the dashboard's portfolio object structurally and
 * uses only CSS variables already defined in globals.css.
 */

interface HistoryPoint {
  date: string;
  totalValue: number;
}

interface PortfolioLike {
  currentValue?: number;
  gainLoss?: number;
  gainLossPct?: number | null;
  changeToday?: number | null;
  changeTodayPct?: number | null;
  change7d?: number | null;
  change7dPct?: number | null;
  change30d?: number | null;
  change30dPct?: number | null;
  rawCardValue?: number;
  gradedCardValue?: number;
  sealedProductValue?: number;
  rawCards?: number;
  gradedCards?: number;
  sealedProducts?: number;
  totalItems?: number;
  history?: HistoryPoint[];
}

const GREEN = "#10B981";
const RED = "#EF4444";

const fmtUSD = (v: number | null | undefined): string =>
  v == null
    ? "—"
    : v.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      });

const fmtSignedUSD = (v: number | null | undefined): string => {
  if (v == null) return "—";
  const sign = v >= 0 ? "+" : "−";
  return `${sign}${fmtUSD(Math.abs(v))}`;
};

const fmtPct = (v: number | null | undefined): string =>
  v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

const colorFor = (v: number | null | undefined): string =>
  v == null ? "var(--text-dim)" : v >= 0 ? GREEN : RED;

// ─── nice-axis helpers (ported from mobile PortfolioValueChart) ───────────────
const MIN_SPAN_RATIO = 0.03;
const DATA_PADDING_RATIO = 0.2;
const GRID_TICKS = 4;

function niceNum(range: number, round: boolean): number {
  const r = range || 1;
  const exp = Math.floor(Math.log10(r));
  const frac = r / Math.pow(10, exp);
  let nice: number;
  if (round) nice = frac < 1.5 ? 1 : frac < 3 ? 2 : frac < 7 ? 5 : 10;
  else nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return nice * Math.pow(10, exp);
}

const fmtTick = (n: number): string => {
  if (n >= 1000) return `$${(n / 1000).toFixed(2).replace(/\.?0+$/, "")}k`;
  return `$${Math.round(n)}`;
};

type Range = 7 | 30 | 90;
const RANGES: { label: string; value: Range }[] = [
  { label: "7D", value: 7 },
  { label: "30D", value: 30 },
  { label: "90D", value: 90 },
];

function ValueChart({
  history,
  anchorValue,
  height = 200,
}: {
  history: HistoryPoint[];
  anchorValue: number;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth || 360);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const PAD_X = 4;
  const PAD_Y = 12;

  const { linePath, areaPath, ticks, lineColor } = useMemo(() => {
    const pts = history.map((h) => h.totalValue);
    if (pts.length < 2)
      return {
        linePath: "",
        areaPath: "",
        ticks: [] as { value: number; y: number }[],
        lineColor: "var(--gold)",
      };

    const w = width - PAD_X * 2;
    const h = height - PAD_Y * 2;

    const dataMin = Math.min(...pts);
    const dataMax = Math.max(...pts);
    const dataRange = dataMax - dataMin;
    const center = (dataMin + dataMax) / 2;
    const anchor = anchorValue > 0 ? anchorValue : center;

    const desiredSpan = Math.max(
      anchor * MIN_SPAN_RATIO,
      dataRange * (1 + DATA_PADDING_RATIO * 2),
      1,
    );

    let lo = center - desiredSpan / 2;
    let hi = center + desiredSpan / 2;
    if (lo < 0) {
      hi -= lo;
      lo = 0;
    }

    const niceRange = niceNum(hi - lo, false);
    const step = niceNum(niceRange / Math.max(1, GRID_TICKS - 1), true);
    const min = Math.max(0, Math.floor(lo / step) * step);
    const max = Math.ceil(hi / step) * step;
    const span = max - min || 1;

    const yFor = (v: number) => PAD_Y + (1 - (v - min) / span) * h;
    const cs = pts.map((v, i) => {
      const x = PAD_X + (i / (pts.length - 1)) * w;
      return [x, yFor(v)] as const;
    });

    const tickStep = step / 2;
    const tk: { value: number; y: number }[] = [];
    for (let t = min; t <= max + tickStep * 0.5; t += tickStep)
      tk.push({ value: t, y: yFor(t) });

    const line = cs
      .map(
        ([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`,
      )
      .join(" ");
    const area =
      `${line} L ${cs[cs.length - 1][0].toFixed(2)} ${height - PAD_Y} ` +
      `L ${cs[0][0].toFixed(2)} ${height - PAD_Y} Z`;

    const up = pts[pts.length - 1] >= pts[0];
    return {
      linePath: line,
      areaPath: area,
      ticks: tk,
      lineColor: up ? GREEN : RED,
    };
  }, [history, width, height, anchorValue]);

  if (linePath.length === 0) {
    return (
      <div
        ref={ref}
        style={{
          height,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
        }}
      >
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Not enough history yet
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-dim)",
            textAlign: "center",
          }}
        >
          The chart fills in as daily snapshots accumulate.
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg width={width} height={height} style={{ display: "block" }}>
        <defs>
          <linearGradient id='pvhArea' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0' stopColor={lineColor} stopOpacity={0.22} />
            <stop offset='1' stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <line
            key={`g-${t.value}`}
            x1={PAD_X}
            y1={t.y}
            x2={width - PAD_X}
            y2={t.y}
            stroke='var(--border)'
            strokeWidth={1}
            strokeDasharray='4,4'
            opacity={0.5}
          />
        ))}
        <path d={areaPath} fill='url(#pvhArea)' />
        <path
          d={linePath}
          stroke={lineColor}
          strokeWidth={2}
          fill='none'
          strokeLinejoin='round'
          strokeLinecap='round'
        />
        {ticks.map((t) => (
          <text
            key={`l-${t.value}`}
            x={width - 4}
            y={Math.max(PAD_Y + 8, t.y - 3)}
            fontSize={9}
            fill='var(--text-dim)'
            textAnchor='end'
            fontFamily='DM Mono, monospace'
          >
            {fmtTick(t.value)}
          </text>
        ))}
      </svg>
    </div>
  );
}

function ChangeRow({
  label,
  pct,
  amount,
}: {
  label: string;
  pct: number | null | undefined;
  amount: number | null | undefined;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        padding: "7px 0",
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: "var(--text-dim)",
          fontFamily: "DM Mono, monospace",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
      <span style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "DM Mono, monospace",
            color: colorFor(pct),
          }}
        >
          {fmtPct(pct)}
        </span>
        <span
          style={{
            fontSize: 12,
            fontFamily: "DM Mono, monospace",
            color: colorFor(amount),
            minWidth: 74,
            textAlign: "right",
          }}
        >
          {fmtSignedUSD(amount)}
        </span>
      </span>
    </div>
  );
}

export default function PortfolioValueHero({
  portfolio,
  loading = false,
}: {
  portfolio: PortfolioLike | null;
  loading?: boolean;
}) {
  const [range, setRange] = useState<Range>(30);

  const fullHistory = portfolio?.history ?? [];
  const visibleHistory = useMemo(
    () => fullHistory.slice(-range),
    [fullHistory, range],
  );

  const totalValue = portfolio?.currentValue ?? 0;
  const breakdown = [
    {
      label: "Raw",
      count: portfolio?.rawCards ?? 0,
      value: portfolio?.rawCardValue ?? 0,
      color: "#6B7280",
    },
    {
      label: "Graded",
      count: portfolio?.gradedCards ?? 0,
      value: portfolio?.gradedCardValue ?? 0,
      color: "var(--gold)",
    },
    {
      label: "Sealed",
      count: portfolio?.sealedProducts ?? 0,
      value: portfolio?.sealedProductValue ?? 0,
      color: "#8B5CF6",
    },
  ];

  return (
    <div
      className='portfolio-value-hero'
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 0,
        display: "grid",
        gridTemplateColumns: "minmax(280px, 1.1fr) minmax(220px, 0.9fr)",
        marginBottom: 20,
        overflow: "hidden",
      }}
    >
      {/* ── Left: value + chart ── */}
      <div
        style={{
          padding: "20px 24px",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "var(--text-dim)",
            fontFamily: "DM Mono, monospace",
            letterSpacing: "0.07em",
            marginBottom: 6,
          }}
        >
          TOTAL COLLECTION VALUE
        </div>
        <div
          style={{
            fontSize: 34,
            fontWeight: 700,
            color: "var(--text-primary)",
            fontFamily: "DM Mono, monospace",
            lineHeight: 1,
            marginBottom: 14,
          }}
        >
          {loading ? "…" : fmtUSD(totalValue)}
        </div>

        <ValueChart history={visibleHistory} anchorValue={totalValue} />

        {/* Range toggle */}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {RANGES.map((r) => {
            const active = r.value === range;
            const available = fullHistory.length >= 2;
            return (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                disabled={!available}
                style={{
                  padding: "5px 14px",
                  borderRadius: 100,
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  fontFamily: "DM Mono, monospace",
                  cursor: available ? "pointer" : "default",
                  border: `1px solid ${active ? "var(--gold)" : "transparent"}`,
                  background: active ? "rgba(201,168,76,0.14)" : "transparent",
                  color: active ? "var(--gold)" : "var(--text-dim)",
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right: changes + items ── */}
      <div
        style={{
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 1d / 7d / 30d */}
        <div
          style={{ borderBottom: "1px solid var(--border)", paddingBottom: 6 }}
        >
          <ChangeRow
            label='24H'
            pct={portfolio?.changeTodayPct}
            amount={portfolio?.changeToday}
          />
          <ChangeRow
            label='7D'
            pct={portfolio?.change7dPct}
            amount={portfolio?.change7d}
          />
          <ChangeRow
            label='30D'
            pct={portfolio?.change30dPct}
            amount={portfolio?.change30d}
          />
        </div>

        {/* Overall gain / loss */}
        <div
          style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}
        >
          <div
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              fontFamily: "DM Mono, monospace",
              letterSpacing: "0.07em",
              marginBottom: 4,
            }}
          >
            TOTAL GAIN / LOSS
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              fontFamily: "DM Mono, monospace",
              color: colorFor(portfolio?.gainLoss),
            }}
          >
            {fmtSignedUSD(portfolio?.gainLoss)}{" "}
            <span
              style={{ fontSize: 12, color: colorFor(portfolio?.gainLossPct) }}
            >
              {fmtPct(portfolio?.gainLossPct)}
            </span>
          </div>
        </div>

        {/* Items + breakdown */}
        <div style={{ paddingTop: 12 }}>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              fontFamily: "DM Mono, monospace",
              letterSpacing: "0.07em",
              marginBottom: 4,
            }}
          >
            ITEMS
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              fontFamily: "DM Mono, monospace",
              color: "var(--text-primary)",
              marginBottom: 10,
            }}
          >
            {(portfolio?.totalItems ?? 0).toLocaleString()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {breakdown.map((b) => (
              <div
                key={b.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: b.color,
                      display: "inline-block",
                    }}
                  />
                  <span
                    style={{ fontSize: 12, color: "var(--text-secondary)" }}
                  >
                    {b.label}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-primary)",
                      fontWeight: 600,
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {b.count.toLocaleString()}
                  </span>
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-dim)",
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  {fmtUSD(b.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
