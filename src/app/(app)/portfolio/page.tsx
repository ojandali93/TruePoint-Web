/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useCallback } from "react";
import { useCollections } from "../../../context/CollectionContext";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
} from "recharts";
import api from "../../../lib/api";
import { FeatureGate } from "@/components/PlanGuards";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryPoint {
  date: string;
  totalValue: number;
  costBasis: number;
  gainLoss: number;
  rawCardValue: number;
  gradedCardValue: number;
  sealedProductValue: number;
}

interface TopPerformer {
  id: string;
  name: string;
  setName: string;
  imageUrl: string | null;
  itemType: string;
  gradingCompany: string | null;
  grade: string | null;
  purchasePrice: number | null;
  marketPrice: number | null;
  gainLoss: number | null;
  gainLossPct: number | null;
}

interface PortfolioData {
  currentValue: number;
  costBasis: number;
  gainLoss: number;
  gainLossPct: number | null;
  // Flat breakdown fields — matches getPortfolio's actual return shape
  rawCardValue: number;
  gradedCardValue: number;
  sealedProductValue: number;
  rawCards: number;
  gradedCards: number;
  sealedProducts: number;
  history: HistoryPoint[];
  allTimeHigh: number;
  allTimeLow: number;
  changeToday: number | null;
  changeTodayPct: number | null;
  change7d: number | null;
  change7dPct: number | null;
  change30d: number | null;
  change30dPct: number | null;
  topGainers: TopPerformer[];
  topLosers: TopPerformer[];
  totalItems: number;
  lastSnapshotDate: string | null;
  hasHistory: boolean;
}

type Range = "7d" | "30d" | "90d" | "all";
type ChartMode = "value" | "breakdown";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number | null | undefined) =>
  v != null
    ? `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";

const fmtShort = (v: number) => {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

const fmtPct = (v: number | null | undefined) =>
  v != null ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` : "—";

const gainColor = (v: number | null | undefined) =>
  v == null ? "var(--text-dim)" : v >= 0 ? "#3DAA6E" : "#C94C4C";

const gainBg = (v: number | null | undefined) =>
  v == null
    ? "transparent"
    : v >= 0
      ? "rgba(61,170,110,0.1)"
      : "rgba(201,76,76,0.1)";

const formatDate = (d: string) => {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatDateLong = (d: string) => {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const RANGE_DAYS: Record<Range, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: 9999,
};

const filterHistory = (
  history: HistoryPoint[],
  range: Range,
): HistoryPoint[] => {
  if (range === "all") return history;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range]);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return history.filter((h) => h.date >= cutoffStr);
};

// ─── Custom chart tooltip ──────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#1C1F27",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "12px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        minWidth: 180,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--text-dim)",
          marginBottom: 10,
          fontFamily: "DM Mono, monospace",
        }}
      >
        {formatDateLong(label)}
      </div>
      {payload.map((entry: any) => (
        <div
          key={entry.dataKey}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: entry.color,
              }}
            />
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {entry.name}
            </span>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-primary)",
              fontFamily: "DM Mono, monospace",
            }}
          >
            {fmt(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  subColor,
  size = "normal",
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  size?: "normal" | "large";
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "16px 20px",
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: "var(--text-dim)",
          letterSpacing: "0.1em",
          fontFamily: "DM Mono, monospace",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: size === "large" ? 28 : 20,
          fontWeight: 600,
          color: "var(--text-primary)",
          fontFamily: "DM Mono, monospace",
          lineHeight: 1,
          marginBottom: 4,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 12,
            color: subColor ?? "var(--text-dim)",
            fontWeight: subColor ? 500 : 400,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Change badge ─────────────────────────────────────────────────────────────

function ChangeBadge({
  label,
  change,
  pct,
}: {
  label: string;
  change: number | null;
  pct: number | null;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "var(--text-dim)",
          letterSpacing: "0.08em",
          fontFamily: "DM Mono, monospace",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: gainColor(change),
          fontFamily: "DM Mono, monospace",
        }}
      >
        {change != null ? `${change >= 0 ? "+" : ""}${fmt(change)}` : "—"}
      </div>
      {pct != null && (
        <div
          style={{
            fontSize: 11,
            color: gainColor(pct),
            background: gainBg(pct),
            borderRadius: 4,
            padding: "1px 5px",
            display: "inline-block",
            width: "fit-content",
          }}
        >
          {fmtPct(pct)}
        </div>
      )}
    </div>
  );
}

// ─── Top performer row ─────────────────────────────────────────────────────────

function PerformerRow({ item, rank }: { item: TopPerformer; rank: number }) {
  const COMPANY_COLORS: Record<string, string> = {
    PSA: "#C9A84C",
    BGS: "#378ADD",
    CGC: "#3DAA6E",
    SGC: "#7F77DD",
    TAG: "#D85A30",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--text-dim)",
          fontFamily: "DM Mono, monospace",
          width: 16,
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        {rank}
      </div>
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=''
          style={{
            width: 28,
            height: 40,
            objectFit: "contain",
            borderRadius: 3,
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: 28,
            height: 40,
            background: "var(--surface-2)",
            borderRadius: 3,
            flexShrink: 0,
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.name}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 2,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              fontFamily: "DM Mono, monospace",
            }}
          >
            {item.setName}
          </span>
          {item.gradingCompany && (
            <span
              style={{
                fontSize: 9,
                padding: "1px 5px",
                borderRadius: 8,
                background: `${COMPANY_COLORS[item.gradingCompany]}18`,
                color: COMPANY_COLORS[item.gradingCompany],
                fontFamily: "DM Mono, monospace",
              }}
            >
              {item.gradingCompany} {item.grade}
            </span>
          )}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: gainColor(item.gainLoss),
            fontFamily: "DM Mono, monospace",
          }}
        >
          {item.gainLoss != null
            ? `${item.gainLoss >= 0 ? "+" : ""}${fmt(item.gainLoss)}`
            : "—"}
        </div>
        {item.gainLossPct != null && (
          <div
            style={{
              fontSize: 10,
              color: gainColor(item.gainLossPct),
              background: gainBg(item.gainLossPct),
              borderRadius: 4,
              padding: "1px 5px",
              marginTop: 2,
              fontFamily: "DM Mono, monospace",
            }}
          >
            {fmtPct(item.gainLossPct)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "80px 24px" }}>
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          fontSize: 28,
          color: "var(--text-dim)",
        }}
      >
        ◎
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 500,
          color: "var(--text-primary)",
          marginBottom: 10,
        }}
      >
        Your portfolio is empty
      </div>
      <div
        style={{
          fontSize: 13,
          color: "var(--text-secondary)",
          lineHeight: 1.7,
          maxWidth: 400,
          margin: "0 auto 28px",
        }}
      >
        Add cards and products to your inventory to start tracking your
        collection value. Market prices are pulled automatically.
      </div>
      <a
        href='/inventory'
        style={{
          display: "inline-block",
          padding: "10px 24px",
          borderRadius: 8,
          background: "var(--gold)",
          color: "#0D0E11",
          fontSize: 13,
          fontWeight: 500,
          textDecoration: "none",
        }}
      >
        Go to Inventory
      </a>
    </div>
  );
}

// ─── No history notice ────────────────────────────────────────────────────────

function NoHistoryBanner({
  lastSnapshotDate,
}: {
  lastSnapshotDate: string | null;
}) {
  return (
    <div
      style={{
        background: "rgba(201,168,76,0.06)",
        border: "1px solid rgba(201,168,76,0.2)",
        borderRadius: 10,
        padding: "12px 18px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 24,
        fontSize: 12,
        color: "var(--text-secondary)",
        lineHeight: 1.6,
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>📈</span>
      <span>
        {lastSnapshotDate
          ? `Chart data is being collected — first snapshot taken ${formatDateLong(lastSnapshotDate)}. Come back daily to see your portfolio growth over time.`
          : "Portfolio history chart will appear here once daily snapshots begin running. Your first snapshot is scheduled for tonight."}
      </span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("30d");
  const [chartMode, setChartMode] = useState<ChartMode>("value");
  const [snapshotting, setSnapshotting] = useState(false);
  const [snapshotDone, setSnapshotDone] = useState(false);

  const { activeCollectionId, collections, setActiveCollectionId } =
    useCollections();
  const hasMultipleCollections = collections.length > 1;
  const collectionParam = activeCollectionId
    ? `&collectionId=${activeCollectionId}`
    : "";

  const load = useCallback(async (days = 90) => {
    try {
      const res = await api.get<{ data: any }>(
        `/portfolio?days=${days}${collectionParam}`,
      );
      const p = res.data.data;
      // Backend uses totalValue/totalGainLoss/totalGainLossPct/totalCostBasis;
      // adapt to dashboard's preferred names so the rest of the file reads work unchanged.
      setData({
        ...p,
        currentValue: p.totalValue ?? p.currentValue ?? 0,
        gainLoss: p.totalGainLoss ?? p.gainLoss ?? 0,
        gainLossPct: p.totalGainLossPct ?? p.gainLossPct ?? null,
        costBasis: p.totalCostBasis ?? p.costBasis ?? 0,
      });
    } catch (err) {
      console.error("[Portfolio] Load failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void load(90);
    }, 0);
    return () => clearTimeout(t);
  }, [load]);

  const handleSnapshot = async () => {
    setSnapshotting(true);
    try {
      await api.post("/portfolio/snapshot");
      setSnapshotDone(true);
      setTimeout(() => setSnapshotDone(false), 3000);
      load(90);
    } catch (err) {
      console.error("[Portfolio] Snapshot failed:", err);
    } finally {
      setSnapshotting(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 400,
        }}
      >
        <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
          Loading portfolio...
        </div>
      </div>
    );
  }

  if (!data || data.totalItems === 0) {
    return (
      <div style={{ padding: "32px 40px", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--gold)",
              letterSpacing: "0.1em",
              fontFamily: "DM Mono, monospace",
              marginBottom: 8,
            }}
          >
            COLLECTION
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: "var(--text-primary)",
            }}
          >
            Portfolio
          </h1>
        </div>
        <EmptyState />
      </div>
    );
  }

  const filteredHistory = filterHistory(data.history, range);
  const isPositive = data.gainLoss >= 0;

  return (
    <FeatureGate
      feature='portfolio_dashboard'
      upgradeTo='pro'
      featureLabel='the portfolio dashboard'
    >
      <div style={{ padding: "32px 40px", maxWidth: 1400, margin: "0 auto" }}>
        {/* ── Collection switcher ── */}
        {hasMultipleCollections && (
          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 24,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => setActiveCollectionId(null)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                border: `1px solid ${activeCollectionId === null ? "var(--gold)" : "var(--border)"}`,
                background:
                  activeCollectionId === null
                    ? "rgba(201,168,76,0.12)"
                    : "transparent",
                color:
                  activeCollectionId === null
                    ? "var(--gold)"
                    : "var(--text-secondary)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              All Collections
            </button>
            {collections.map((col) => (
              <button
                key={col.id}
                onClick={() => setActiveCollectionId(col.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 500,
                  border: `1px solid ${activeCollectionId === col.id ? col.color : "var(--border)"}`,
                  background:
                    activeCollectionId === col.id
                      ? `${col.color}20`
                      : "transparent",
                  color:
                    activeCollectionId === col.id
                      ? col.color
                      : "var(--text-secondary)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: col.color,
                    display: "inline-block",
                  }}
                />
                {col.name}
              </button>
            ))}
          </div>
        )}

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 28,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: "var(--gold)",
                letterSpacing: "0.1em",
                fontFamily: "DM Mono, monospace",
                marginBottom: 8,
              }}
            >
              COLLECTION
            </div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 500,
                color: "var(--text-primary)",
                marginBottom: 4,
              }}
            >
              Portfolio
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {data.totalItems} item{data.totalItems !== 1 ? "s" : ""} ·{" "}
              {data.lastSnapshotDate
                ? `Last snapshot ${formatDateLong(data.lastSnapshotDate)}`
                : "No snapshots yet"}
            </p>
          </div>
          <button
            onClick={handleSnapshot}
            disabled={snapshotting}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: snapshotDone ? "#3DAA6E" : "var(--surface)",
              color: snapshotDone ? "white" : "var(--text-secondary)",
              fontSize: 12,
              cursor: snapshotting ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: snapshotting ? 0.6 : 1,
              transition: "background 0.2s ease",
            }}
          >
            {snapshotDone
              ? "✓ Snapshot saved"
              : snapshotting
                ? "Saving..."
                : "Save snapshot"}
          </button>
        </div>

        {/* No history notice */}
        {!data.hasHistory && (
          <NoHistoryBanner lastSnapshotDate={data.lastSnapshotDate} />
        )}

        {/* Hero value */}
        <div
          style={{
            background: "var(--surface)",
            border: `1px solid ${isPositive ? "rgba(61,170,110,0.3)" : "rgba(201,76,76,0.3)"}`,
            borderRadius: 16,
            padding: "28px 32px",
            marginBottom: 20,
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 32,
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-dim)",
                letterSpacing: "0.1em",
                fontFamily: "DM Mono, monospace",
                marginBottom: 10,
              }}
            >
              TOTAL PORTFOLIO VALUE
            </div>
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: "var(--text-primary)",
                fontFamily: "DM Mono, monospace",
                lineHeight: 1,
                marginBottom: 8,
              }}
            >
              {fmt(data.currentValue)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontSize: 14,
                  color: gainColor(data.gainLoss),
                  fontWeight: 500,
                  fontFamily: "DM Mono, monospace",
                }}
              >
                {data.gainLoss >= 0 ? "+" : ""}
                {fmt(data.gainLoss)}
              </span>
              <span
                style={{
                  fontSize: 12,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: gainBg(data.gainLoss),
                  color: gainColor(data.gainLoss),
                  fontFamily: "DM Mono, monospace",
                }}
              >
                {fmtPct(data.gainLossPct)}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
                all time
              </span>
            </div>
          </div>

          {/* Quick change stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
            }}
          >
            <ChangeBadge
              label='TODAY'
              change={data.changeToday}
              pct={data.changeTodayPct}
            />
            <ChangeBadge
              label='7 DAYS'
              change={data.change7d}
              pct={data.change7dPct}
            />
            <ChangeBadge
              label='30 DAYS'
              change={data.change30d}
              pct={data.change30dPct}
            />
          </div>
        </div>

        {/* Summary stats row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <StatCard
            label='COST BASIS'
            value={fmt(data.costBasis)}
            sub='Total invested'
          />
          <StatCard
            label='ALL TIME HIGH'
            value={fmt(data.allTimeHigh)}
            sub='Peak value'
          />
          <StatCard
            label='ALL TIME LOW'
            value={fmt(data.allTimeLow)}
            sub='Lowest recorded'
          />
          <StatCard
            label='RAW CARDS'
            value={fmt(data.rawCardValue)}
            sub={`${data.rawCards} cards`}
          />
          <StatCard
            label='GRADED CARDS'
            value={fmt(data.gradedCardValue)}
            sub={`${data.gradedCards} cards`}
          />
          <StatCard
            label='SEALED PRODUCTS'
            value={fmt(data.sealedProductValue)}
            sub={`${data.sealedProducts} items`}
          />
        </div>

        {/* Chart */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "24px 28px",
            marginBottom: 28,
          }}
        >
          {/* Chart controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  marginBottom: 2,
                }}
              >
                Value over time
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                {filteredHistory.length} data point
                {filteredHistory.length !== 1 ? "s" : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {/* Chart mode */}
              <div
                style={{
                  display: "flex",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                {(["value", "breakdown"] as ChartMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setChartMode(mode)}
                    style={{
                      padding: "6px 14px",
                      border: "none",
                      background:
                        chartMode === mode
                          ? "rgba(201,168,76,0.15)"
                          : "transparent",
                      color:
                        chartMode === mode ? "var(--gold)" : "var(--text-dim)",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      borderRight: "1px solid var(--border)",
                      textTransform: "capitalize",
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Range */}
              <div
                style={{
                  display: "flex",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                {(["7d", "30d", "90d", "all"] as Range[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    style={{
                      padding: "6px 12px",
                      border: "none",
                      background:
                        range === r ? "rgba(201,168,76,0.15)" : "transparent",
                      color: range === r ? "var(--gold)" : "var(--text-dim)",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "DM Mono, monospace",
                      borderRight: "1px solid var(--border)",
                    }}
                  >
                    {r === "all" ? "ALL" : r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chart area */}
          {filteredHistory.length < 2 ? (
            <div
              style={{
                height: 280,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-dim)",
                fontSize: 13,
                gap: 8,
              }}
            >
              <span style={{ fontSize: 28 }}>📊</span>
              Not enough data to show a chart yet.
              <span style={{ fontSize: 11 }}>
                Snapshots are saved daily — check back tomorrow.
              </span>
            </div>
          ) : chartMode === "value" ? (
            <ResponsiveContainer width='100%' height={280}>
              <AreaChart
                data={filteredHistory}
                margin={{ top: 5, right: 5, bottom: 5, left: 0 }}
              >
                <defs>
                  <linearGradient
                    id='valueGradient'
                    x1='0'
                    y1='0'
                    x2='0'
                    y2='1'
                  >
                    <stop
                      offset='5%'
                      stopColor={isPositive ? "#3DAA6E" : "#C94C4C"}
                      stopOpacity={0.2}
                    />
                    <stop
                      offset='95%'
                      stopColor={isPositive ? "#3DAA6E" : "#C94C4C"}
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id='costGradient' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#C9A84C' stopOpacity={0.1} />
                    <stop offset='95%' stopColor='#C9A84C' stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray='3 3'
                  stroke='rgba(255,255,255,0.04)'
                />
                <XAxis
                  dataKey='date'
                  tickFormatter={formatDate}
                  tick={{
                    fontSize: 10,
                    fill: "var(--text-dim)",
                    fontFamily: "DM Mono, monospace",
                  }}
                  axisLine={false}
                  tickLine={false}
                  interval='preserveStartEnd'
                />
                <YAxis
                  tickFormatter={fmtShort}
                  tick={{
                    fontSize: 10,
                    fill: "var(--text-dim)",
                    fontFamily: "DM Mono, monospace",
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type='monotone'
                  dataKey='totalValue'
                  name='Portfolio Value'
                  stroke={isPositive ? "#3DAA6E" : "#C94C4C"}
                  strokeWidth={2}
                  fill='url(#valueGradient)'
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Area
                  type='monotone'
                  dataKey='costBasis'
                  name='Cost Basis'
                  stroke='#C9A84C'
                  strokeWidth={1.5}
                  strokeDasharray='4 3'
                  fill='url(#costGradient)'
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width='100%' height={280}>
              <AreaChart
                data={filteredHistory}
                margin={{ top: 5, right: 5, bottom: 5, left: 0 }}
              >
                <defs>
                  <linearGradient id='rawGrad' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#C9A84C' stopOpacity={0.3} />
                    <stop offset='95%' stopColor='#C9A84C' stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id='gradedGrad' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#378ADD' stopOpacity={0.3} />
                    <stop offset='95%' stopColor='#378ADD' stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id='sealedGrad' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#3DAA6E' stopOpacity={0.3} />
                    <stop offset='95%' stopColor='#3DAA6E' stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray='3 3'
                  stroke='rgba(255,255,255,0.04)'
                />
                <XAxis
                  dataKey='date'
                  tickFormatter={formatDate}
                  tick={{
                    fontSize: 10,
                    fill: "var(--text-dim)",
                    fontFamily: "DM Mono, monospace",
                  }}
                  axisLine={false}
                  tickLine={false}
                  interval='preserveStartEnd'
                />
                <YAxis
                  tickFormatter={fmtShort}
                  tick={{
                    fontSize: 10,
                    fill: "var(--text-dim)",
                    fontFamily: "DM Mono, monospace",
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  formatter={(value) => (
                    <span
                      style={{ fontSize: 11, color: "var(--text-secondary)" }}
                    >
                      {value}
                    </span>
                  )}
                />
                <Area
                  type='monotone'
                  dataKey='rawCardValue'
                  name='Raw Cards'
                  stroke='#C9A84C'
                  strokeWidth={2}
                  fill='url(#rawGrad)'
                  dot={false}
                  stackId='1'
                />
                <Area
                  type='monotone'
                  dataKey='gradedCardValue'
                  name='Graded Cards'
                  stroke='#378ADD'
                  strokeWidth={2}
                  fill='url(#gradedGrad)'
                  dot={false}
                  stackId='1'
                />
                <Area
                  type='monotone'
                  dataKey='sealedProductValue'
                  name='Sealed Products'
                  stroke='#3DAA6E'
                  strokeWidth={2}
                  fill='url(#sealedGrad)'
                  dot={false}
                  stackId='1'
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Breakdown donut + top performers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            marginBottom: 28,
          }}
        >
          {/* Value breakdown */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                background: "var(--surface-2)",
                fontSize: 10,
                color: "var(--text-dim)",
                letterSpacing: "0.08em",
                fontFamily: "DM Mono, monospace",
              }}
            >
              VALUE BREAKDOWN
            </div>
            {[
              {
                label: "Raw Cards",
                value: data.rawCardValue,
                count: data.rawCards,
                color: "#C9A84C",
              },
              {
                label: "Graded Cards",
                value: data.gradedCardValue,
                count: data.gradedCards,
                color: "#378ADD",
              },
              {
                label: "Sealed Products",
                value: data.sealedProductValue,
                count: data.sealedProducts,
                color: "#3DAA6E",
              },
            ].map((row) => {
              const pct =
                data.currentValue > 0
                  ? (row.value / data.currentValue) * 100
                  : 0;
              return (
                <div
                  key={row.label}
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: row.color,
                        }}
                      />
                      <span
                        style={{ fontSize: 13, color: "var(--text-primary)" }}
                      >
                        {row.label}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                        {row.count} items
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          fontFamily: "DM Mono, monospace",
                        }}
                      >
                        {fmt(row.value)}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-dim)" }}>
                        {pct.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      height: 4,
                      background: "var(--surface-2)",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: row.color,
                        borderRadius: 2,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cost vs Value */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                background: "var(--surface-2)",
                fontSize: 10,
                color: "var(--text-dim)",
                letterSpacing: "0.08em",
                fontFamily: "DM Mono, monospace",
              }}
            >
              COST VS MARKET VALUE
            </div>
            <div style={{ padding: "20px" }}>
              {/* Visual bar comparison */}
              <div style={{ marginBottom: 20 }}>
                {[
                  {
                    label: "Cost Basis",
                    value: data.costBasis,
                    color: "#C9A84C",
                  },
                  {
                    label: "Market Value",
                    value: data.currentValue,
                    color: isPositive ? "#3DAA6E" : "#C94C4C",
                  },
                ].map((bar) => {
                  const maxVal = Math.max(data.costBasis, data.currentValue);
                  const pct = maxVal > 0 ? (bar.value / maxVal) * 100 : 0;
                  return (
                    <div key={bar.label} style={{ marginBottom: 14 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 6,
                          fontSize: 12,
                        }}
                      >
                        <span style={{ color: "var(--text-secondary)" }}>
                          {bar.label}
                        </span>
                        <span
                          style={{
                            color: "var(--text-primary)",
                            fontFamily: "DM Mono, monospace",
                            fontWeight: 500,
                          }}
                        >
                          {fmt(bar.value)}
                        </span>
                      </div>
                      <div
                        style={{
                          height: 10,
                          background: "var(--surface-2)",
                          borderRadius: 5,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: bar.color,
                            borderRadius: 5,
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Gain/loss display */}
              <div
                style={{
                  background: gainBg(data.gainLoss),
                  border: `1px solid ${isPositive ? "rgba(61,170,110,0.3)" : "rgba(201,76,76,0.3)"}`,
                  borderRadius: 10,
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-dim)",
                    letterSpacing: "0.08em",
                    fontFamily: "DM Mono, monospace",
                    marginBottom: 8,
                  }}
                >
                  TOTAL GAIN / LOSS
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                  }}
                >
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      color: gainColor(data.gainLoss),
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {data.gainLoss >= 0 ? "+" : ""}
                    {fmt(data.gainLoss)}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      color: gainColor(data.gainLossPct),
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {fmtPct(data.gainLossPct)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top gainers and losers */}
        {(data.topGainers.length > 0 || data.topLosers.length > 0) && (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
          >
            {/* Top gainers */}
            {data.topGainers.length > 0 && (
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--border)",
                    background: "var(--surface-2)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 14 }}>🏆</span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--text-dim)",
                      letterSpacing: "0.08em",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    TOP GAINERS
                  </span>
                </div>
                {data.topGainers.map((item, i) => (
                  <PerformerRow key={item.id} item={item} rank={i + 1} />
                ))}
                {data.topGainers.length === 0 && (
                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      fontSize: 12,
                      color: "var(--text-dim)",
                    }}
                  >
                    No gainers yet — add purchase prices to track performance
                  </div>
                )}
              </div>
            )}

            {/* Top losers */}
            {data.topLosers.length > 0 && (
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--border)",
                    background: "var(--surface-2)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 14 }}>📉</span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--text-dim)",
                      letterSpacing: "0.08em",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    TOP LOSERS
                  </span>
                </div>
                {data.topLosers.map((item, i) => (
                  <PerformerRow key={item.id} item={item} rank={i + 1} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* No performers message */}
        {data.topGainers.length === 0 &&
          data.topLosers.length === 0 &&
          data.totalItems > 0 && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "24px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.7,
                }}
              >
                Add purchase prices to your inventory items to see top gainers
                and losers here.
              </div>
            </div>
          )}
      </div>
    </FeatureGate>
  );
}
