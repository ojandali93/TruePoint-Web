/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import api from "../../../lib/api";
import { ROUTES } from "../../../constants/routes";
import { useCollections } from "../../../context/CollectionContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortfolioData {
  currentValue: number;
  costBasis: number;
  gainLoss: number;
  gainLossPct: number | null;
  changeToday: number | null;
  changeTodayPct: number | null;
  change7d: number | null;
  change7dPct: number | null;
  change30d: number | null;
  change30dPct: number | null;
  // Flat breakdown fields — matches getPortfolio's actual return shape
  rawCardValue: number;
  gradedCardValue: number;
  sealedProductValue: number;
  rawCards: number;
  gradedCards: number;
  sealedProducts: number;
  history: { date: string; totalValue: number }[];
  totalItems: number;
  topGainers: TopPerformer[];
  allTimeHigh: number;
}

interface TopPerformer {
  id: string;
  name: string;
  setName: string;
  imageUrl: string | null;
  marketPrice: number | null;
  gainLoss: number | null;
  gainLossPct: number | null;
  gradingCompany: string | null;
  grade: string | null;
}

interface MasterSetProgress {
  setId: string;
  setName: string;
  logoUrl: string | null;
  completionPct: number;
  ownedVariants: number;
  totalVariants: number;
  needCount: number;
}

interface GradingSubmissionCardPreview {
  id: string;
  cardName: string;
  cardImage: string | null;
}

interface GradingSubmission {
  id: string;
  company: string; // was "gradingCompany"
  serviceTier: string | null;
  status: string;
  submittedAt: string | null;
  daysInTransit: number;
  cardCount: number;
  totalCost: number | null; // was "gradingCost"
  totalGradedValue: number | null;
  cards?: GradingSubmissionCardPreview[]; // first 4 thumbnails
}

interface GradingSummary {
  totalSubmissions: number;
  activeInPipeline: number;
  returned: number;
  totalSpentOnGrading: number;
  netProfitLoss1Year?: number;
  totalROI: number | null;
}

interface ArbitrageOpp {
  cardId: string;
  cardName: string;
  setName: string;
  imageSmall: string | null;
  rawPrice: number | null;
  bestGrade: { company: string; grade: string; price: number } | null;
  bestROI: number | null;
  bestProfit: number | null;
  recommendation: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number | null, prefix = "$") =>
  v != null
    ? `${prefix}${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";

const fmtK = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;

const fmtPct = (v: number | null) =>
  v != null ? `${v >= 0 ? "+" : ""}${v.toFixed(1)}%` : null;

const changeColor = (v: number | null) =>
  v == null
    ? "var(--text-dim)"
    : v > 0
      ? "#10B981"
      : v < 0
        ? "#EF4444"
        : "var(--text-dim)";

const STATUS_COLORS: Record<string, string> = {
  submitted: "#6B7280",
  received: "#3B82F6",
  grading: "#F59E0B",
  shipped_back: "#8B5CF6",
  returned: "#10B981",
};

// ─── Mini sparkline ───────────────────────────────────────────────────────────

function Sparkline({
  data,
  color = "#10B981",
}: {
  data: number[];
  color?: string;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 120,
    h = 36;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline
        points={pts}
        fill='none'
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin='round'
        strokeLinecap='round'
      />
    </svg>
  );
}

// ─── Progress ring ────────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 44 }: { pct: number; size?: number }) {
  const r = (size - 5) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color =
    pct === 100
      ? "#10B981"
      : pct >= 75
        ? "#3B82F6"
        : pct >= 40
          ? "#F59E0B"
          : "#6B7280";
  return (
    <svg
      width={size}
      height={size}
      style={{ transform: "rotate(-90deg)", flexShrink: 0 }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill='none'
        stroke='var(--border)'
        strokeWidth={4}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill='none'
        stroke={color}
        strokeWidth={4}
        strokeDasharray={circ}
        strokeDashoffset={offset}
      />
      <text
        x='50%'
        y='50%'
        textAnchor='middle'
        dominantBaseline='middle'
        style={{
          transform: "rotate(90deg)",
          transformOrigin: "50% 50%",
          fontSize: 10,
          fontFamily: "DM Mono, monospace",
          fontWeight: 600,
          fill: color,
        }}
      >
        {pct}%
      </text>
    </svg>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
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
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "var(--text-dim)",
            fontFamily: "DM Mono, monospace",
            letterSpacing: "0.08em",
          }}
        >
          {title}
        </div>
        {action && (
          <button
            onClick={() => router.push(action.href)}
            style={{
              fontSize: 11,
              color: "var(--gold)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {action.label} →
          </button>
        )}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton({ w = "100%", h = 20 }: { w?: string | number; h?: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        background: "var(--surface-2)",
        borderRadius: 6,
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [masterSets, setMasterSets] = useState<{
    sets: MasterSetProgress[];
  } | null>(null);
  const [gradingSubmissions, setGradingSubmissions] = useState<
    GradingSubmission[]
  >([]);
  const [gradingSummary, setGradingSummary] = useState<GradingSummary | null>(
    null,
  );
  const [arbitrage, setArbitrage] = useState<ArbitrageOpp[]>([]);
  const [loading, setLoading] = useState({
    portfolio: true,
    masterSets: true,
    grading: true,
    arbitrage: true,
  });

  const { collections, activeCollectionId, setActiveCollectionId } =
    useCollections();
  const hasMultipleCollections = collections.length > 1;

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace(ROUTES.HOME);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, full_name")
        .eq("id", session.user.id)
        .single();

      setUsername(
        profile?.username ??
          profile?.full_name ??
          session.user.email?.split("@")[0] ??
          "Collector",
      );

      // Load all sections in parallel
      Promise.all([
        // Portfolio — backend returns totalValue/totalGainLoss/totalGainLossPct/totalCostBasis
        // The dashboard uses currentValue/gainLoss/gainLossPct/costBasis, so we adapt here.
        api
          .get<{ data: any }>(
            `/portfolio?days=30${activeCollectionId ? "&collectionId=" + activeCollectionId : ""}`,
          )
          .then((r) => {
            const p = r.data.data;
            setPortfolio({
              ...p,
              currentValue: p.totalValue ?? p.currentValue ?? 0,
              gainLoss: p.totalGainLoss ?? p.gainLoss ?? 0,
              gainLossPct: p.totalGainLossPct ?? p.gainLossPct ?? null,
              costBasis: p.totalCostBasis ?? p.costBasis ?? 0,
            });
          })
          .catch(() => {})
          .finally(() => setLoading((p) => ({ ...p, portfolio: false }))),

        // Master sets
        api
          .get<{ data: { sets: MasterSetProgress[] } }>("/master-sets")
          .then((r) => setMasterSets(r.data.data))
          .catch(() => {})
          .finally(() => setLoading((p) => ({ ...p, masterSets: false }))),

        // Grading
        Promise.all([
          api.get<{ data: GradingSubmission[] }>("/grading/submissions"),
          api.get<{ data: GradingSummary }>("/grading/submissions/summary"),
        ])
          .then(([subRes, sumRes]) => {
            setGradingSubmissions(
              subRes.data.data
                .filter((s) => s.status !== "returned")
                .slice(0, 4),
            );
            setGradingSummary(sumRes.data.data);
          })
          .catch(() => {})
          .finally(() => setLoading((p) => ({ ...p, grading: false }))),

        // Arbitrage top picks
        api
          .get<{ data: { allOpportunities: ArbitrageOpp[] } }>(
            "/grading/arbitrage?service=PSA&tier=value&grade=10",
          )
          .then((r) =>
            setArbitrage(
              (r.data.data.allOpportunities ?? [])
                .filter(
                  (o) =>
                    o.recommendation === "strong_buy" ||
                    o.recommendation === "buy",
                )
                .slice(0, 3),
            ),
          )
          .catch(() => {})
          .finally(() => setLoading((p) => ({ ...p, arbitrage: false }))),
      ]);
    };
    load();
  }, [router, supabase, activeCollectionId]);

  const sparkData = portfolio?.history.map((h) => h.totalValue) ?? [];
  const netPositive = (portfolio?.gainLoss ?? 0) >= 0;

  // Near-complete master sets (80%+, not 100%)
  const nearComplete = (masterSets?.sets ?? [])
    .filter((s) => s.completionPct >= 80 && s.completionPct < 100)
    .slice(0, 3);

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontSize: 10,
            color: "var(--gold)",
            letterSpacing: "0.1em",
            fontFamily: "DM Mono, monospace",
            marginBottom: 6,
          }}
        >
          {new Date()
            .toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })
            .toUpperCase()}
        </div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          {greeting}, {username} 👋
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Here&apos;s your collection at a glance.
        </p>
      </div>

      {/* ── Collection switcher — shown when user has multiple collections ── */}
      {hasMultipleCollections && (
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 20,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "var(--text-dim)",
              fontFamily: "DM Mono, monospace",
              marginRight: 4,
            }}
          >
            VIEWING:
          </span>
          <button
            onClick={() => setActiveCollectionId(null)}
            style={{
              padding: "5px 12px",
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
            All
          </button>
          {collections.map((col) => (
            <button
              key={col.id}
              onClick={() => setActiveCollectionId(col.id)}
              style={{
                padding: "5px 12px",
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
                gap: 5,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
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

      {/* ── Row 1: Portfolio value hero + quick stats ── */}
      <div
        className='dashboard-stats-grid'
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {/* Total value */}
        <div
          className='dashboard-stats-hero'
          style={{
            gridColumn: "1 / 3",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {loading.portfolio ? (
            <div style={{ flex: 1 }}>
              <Skeleton h={32} w={160} />
              <div style={{ marginTop: 8 }}>
                <Skeleton h={16} w={100} />
              </div>
            </div>
          ) : (
            <>
              <div>
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
                    fontSize: 32,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    fontFamily: "DM Mono, monospace",
                    lineHeight: 1,
                  }}
                >
                  {fmt(portfolio?.currentValue ?? 0)}
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                  {[
                    { label: "24h", val: portfolio?.changeTodayPct ?? null },
                    { label: "7d", val: portfolio?.change7dPct ?? null },
                    { label: "30d", val: portfolio?.change30dPct ?? null },
                  ].map((c) => (
                    <div key={c.label} style={{ fontSize: 11 }}>
                      <span style={{ color: "var(--text-dim)" }}>
                        {c.label}{" "}
                      </span>
                      <span
                        style={{
                          color: changeColor(c.val),
                          fontFamily: "DM Mono, monospace",
                          fontWeight: 500,
                        }}
                      >
                        {fmtPct(c.val) ?? "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <Sparkline
                data={sparkData}
                color={netPositive ? "#10B981" : "#EF4444"}
              />
            </>
          )}
        </div>

        {/* Gain/Loss */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "20px 24px",
          }}
        >
          {loading.portfolio ? (
            <Skeleton h={48} />
          ) : (
            <>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-dim)",
                  fontFamily: "DM Mono, monospace",
                  letterSpacing: "0.07em",
                  marginBottom: 8,
                }}
              >
                TOTAL GAIN / LOSS
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  fontFamily: "DM Mono, monospace",
                  color: netPositive ? "#10B981" : "#EF4444",
                }}
              >
                {portfolio?.gainLoss != null
                  ? `${netPositive ? "+" : "-"}${fmt(portfolio.gainLoss)}`
                  : "—"}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: changeColor(portfolio?.gainLossPct ?? null),
                  fontFamily: "DM Mono, monospace",
                  marginTop: 4,
                }}
              >
                {fmtPct(portfolio?.gainLossPct ?? null) ?? "—"} overall
              </div>
            </>
          )}
        </div>

        {/* Total items */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "20px 24px",
          }}
        >
          {loading.portfolio ? (
            <Skeleton h={48} />
          ) : (
            <>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-dim)",
                  fontFamily: "DM Mono, monospace",
                  letterSpacing: "0.07em",
                  marginBottom: 8,
                }}
              >
                CARDS IN COLLECTION
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  fontFamily: "DM Mono, monospace",
                  color: "var(--text-primary)",
                }}
              >
                {(portfolio?.totalItems ?? 0).toLocaleString()}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 6,
                  flexWrap: "wrap",
                }}
              >
                {[
                  {
                    label: "Raw",
                    val: portfolio?.rawCards ?? 0,
                    color: "#6B7280",
                  },
                  {
                    label: "Graded",
                    val: portfolio?.gradedCards ?? 0,
                    color: "var(--gold)",
                  },
                  {
                    label: "Sealed",
                    val: portfolio?.sealedProducts ?? 0,
                    color: "#8B5CF6",
                  },
                ].map((b) => (
                  <span
                    key={b.label}
                    style={{ fontSize: 10, color: "var(--text-dim)" }}
                  >
                    <span style={{ color: b.color, fontWeight: 600 }}>
                      {b.val}
                    </span>{" "}
                    {b.label}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Row 2: Quick actions ── */}
      <div
        className='dashboard-quick-actions'
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: "Browse Sets",
            icon: "◈",
            href: ROUTES.CARDS,
            color: "#3B82F6",
          },
          {
            label: "Add to Inventory",
            icon: "☰",
            href: ROUTES.INVENTORY,
            color: "#10B981",
          },
          {
            label: "Submit for Grading",
            icon: "↗",
            href: ROUTES.GRADING,
            color: "#F59E0B",
          },
          {
            label: "Centering Tool",
            icon: "⊹",
            href: ROUTES.CENTERING,
            color: "#8B5CF6",
          },
        ].map((a) => (
          <button
            key={a.href}
            onClick={() => router.push(a.href)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 18px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "border-color 0.15s, transform 0.1s",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = a.color;
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span style={{ fontSize: 18, color: a.color }}>{a.icon}</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-secondary)",
              }}
            >
              {a.label}
            </span>
          </button>
        ))}
      </div>

      {/* ── Row 3: Master sets + Grading pipeline ── */}
      <div
        className='dashboard-side-grid'
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* Master sets */}
        <Section
          title='MASTER SETS'
          action={{ label: "View all", href: ROUTES.MASTER_SETS }}
        >
          {loading.masterSets ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Skeleton h={48} />
              <Skeleton h={48} />
              <Skeleton h={48} />
            </div>
          ) : (masterSets?.sets ?? []).length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "20px 0",
                color: "var(--text-dim)",
                fontSize: 12,
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>★</div>
              No sets tracked yet.
              <button
                onClick={() => router.push(ROUTES.MASTER_SETS)}
                style={{
                  display: "block",
                  margin: "10px auto 0",
                  background: "transparent",
                  border: "none",
                  color: "var(--gold)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Start tracking →
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(masterSets?.sets ?? []).slice(0, 4).map((set) => (
                <div
                  key={set.setId}
                  onClick={() => router.push(ROUTES.MASTER_SET(set.setId))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    cursor: "pointer",
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "var(--surface-2)",
                    border: "1px solid transparent",
                    transition: "border-color 0.12s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "var(--border)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "transparent")
                  }
                >
                  {set.logoUrl && (
                    <img
                      src={set.logoUrl}
                      alt={set.setName}
                      style={{
                        height: 28,
                        objectFit: "contain",
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
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {set.setName}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-dim)",
                        marginTop: 1,
                      }}
                    >
                      {set.completionPct === 100
                        ? "✓ Complete"
                        : `${set.needCount} cards needed`}
                    </div>
                  </div>
                  <ProgressRing pct={set.completionPct} size={40} />
                </div>
              ))}

              {/* Near-complete callout */}
              {nearComplete.length > 0 && (
                <div
                  style={{
                    background: "rgba(59,130,246,0.06)",
                    border: "1px solid rgba(59,130,246,0.2)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    marginTop: 4,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#3B82F6",
                      fontWeight: 500,
                      marginBottom: 2,
                    }}
                  >
                    Almost there!
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                    {nearComplete[0].setName} is {nearComplete[0].completionPct}
                    % complete — only {nearComplete[0].needCount} more cards
                    needed.
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Grading pipeline */}
        <Section
          title='GRADING PIPELINE'
          action={{ label: "View all", href: ROUTES.GRADING }}
        >
          {loading.grading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Skeleton h={48} />
              <Skeleton h={48} />
            </div>
          ) : (
            <>
              {/* Summary row */}
              {gradingSummary && gradingSummary.totalSubmissions > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 8,
                    marginBottom: 14,
                  }}
                >
                  {[
                    {
                      label: "Active",
                      value: gradingSummary.activeInPipeline,
                      color: "#F59E0B",
                    },
                    {
                      label: "Returned",
                      value: gradingSummary.returned,
                      color: "#10B981",
                    },
                    {
                      label: "ROI",
                      value:
                        gradingSummary.totalROI != null
                          ? `${gradingSummary.totalROI >= 0 ? "+" : ""}${gradingSummary.totalROI.toFixed(0)}%`
                          : "—",
                      color:
                        (gradingSummary.totalROI ?? 0) >= 0
                          ? "#10B981"
                          : "#EF4444",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "8px 12px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          color: "var(--text-dim)",
                          fontFamily: "DM Mono, monospace",
                          marginBottom: 3,
                        }}
                      >
                        {s.label}
                      </div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          fontFamily: "DM Mono, monospace",
                          color: s.color,
                        }}
                      >
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {gradingSubmissions.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px 0",
                    color: "var(--text-dim)",
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📬</div>
                  No active submissions.
                  <button
                    onClick={() => router.push(ROUTES.GRADING)}
                    style={{
                      display: "block",
                      margin: "10px auto 0",
                      background: "transparent",
                      border: "none",
                      color: "var(--gold)",
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Submit a card →
                  </button>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {gradingSubmissions.map((sub) => (
                    <div
                      key={sub.id}
                      onClick={() => router.push(ROUTES.GRADING)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "var(--surface-2)",
                        cursor: "pointer",
                        border: "1px solid transparent",
                        transition: "border-color 0.12s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.borderColor = "var(--border)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.borderColor = "transparent")
                      }
                    >
                      {sub.cards?.[0]?.cardImage && (
                        <div
                          style={{
                            width: 32,
                            height: 44,
                            flexShrink: 0,
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <img
                            src={sub.cards[0].cardImage}
                            alt={sub.cards[0].cardName}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: "var(--text-primary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {sub.company} · {sub.cardCount} card
                          {sub.cardCount === 1 ? "" : "s"}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--text-dim)",
                            fontFamily: "DM Mono, monospace",
                            marginTop: 2,
                          }}
                        >
                          {sub.serviceTier ?? ""}
                          {sub.daysInTransit != null
                            ? ` · ${sub.daysInTransit}d in transit`
                            : ""}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: "right" }}>
                        <div
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 10,
                            background: `${STATUS_COLORS[sub.status]}20`,
                            color: STATUS_COLORS[sub.status],
                            fontFamily: "DM Mono, monospace",
                            border: `1px solid ${STATUS_COLORS[sub.status]}40`,
                          }}
                        >
                          {sub.status.replace("_", " ")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Section>
      </div>

      {/* ── Row 4: Top performers + Arbitrage opportunities ── */}
      <div
        className='dashboard-side-grid'
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* Top gainers */}
        <Section
          title='TOP PERFORMERS'
          action={{ label: "View portfolio", href: ROUTES.PORTFOLIO }}
        >
          {loading.portfolio ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton h={44} />
              <Skeleton h={44} />
              <Skeleton h={44} />
            </div>
          ) : (portfolio?.topGainers ?? []).length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "20px 0",
                color: "var(--text-dim)",
                fontSize: 12,
              }}
            >
              Add cards with purchase prices to track performance.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(portfolio?.topGainers ?? []).slice(0, 5).map((card) => (
                <div
                  key={card.id}
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  {card.imageUrl && (
                    <div
                      style={{
                        width: 30,
                        height: 42,
                        flexShrink: 0,
                        borderRadius: 3,
                        overflow: "hidden",
                        background: "var(--surface-2)",
                      }}
                    >
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {card.name}{" "}
                      {card.grade
                        ? `(${card.gradingCompany} ${card.grade})`
                        : ""}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-dim)",
                        marginTop: 1,
                      }}
                    >
                      {card.setName}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontFamily: "DM Mono, monospace",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {fmt(card.marketPrice)}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontFamily: "DM Mono, monospace",
                        color: "#10B981",
                        fontWeight: 600,
                      }}
                    >
                      +{fmtPct(card.gainLossPct)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Grading opportunities */}
        <Section
          title='TOP GRADING OPPORTUNITIES'
          action={{ label: "View arbitrage", href: ROUTES.GRADING }}
        >
          {loading.arbitrage ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton h={44} />
              <Skeleton h={44} />
              <Skeleton h={44} />
            </div>
          ) : arbitrage.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "20px 0",
                color: "var(--text-dim)",
                fontSize: 12,
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>⇄</div>
              No strong grading opportunities found.
              <br />
              <span style={{ fontSize: 11 }}>
                Add raw cards to your inventory to see opportunities.
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {arbitrage.map((opp) => (
                <div
                  key={opp.cardId}
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  {opp.imageSmall && (
                    <div
                      style={{
                        width: 30,
                        height: 42,
                        flexShrink: 0,
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src={opp.imageSmall}
                        alt={opp.cardName}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {opp.cardName}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-dim)",
                        marginTop: 1,
                      }}
                    >
                      Raw {fmt(opp.rawPrice)} → {opp.bestGrade?.company}{" "}
                      {opp.bestGrade?.grade} {fmt(opp.bestGrade?.price ?? null)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 10,
                        background:
                          opp.recommendation === "strong_buy"
                            ? "rgba(16,185,129,0.12)"
                            : "rgba(59,130,246,0.12)",
                        color:
                          opp.recommendation === "strong_buy"
                            ? "#10B981"
                            : "#3B82F6",
                        fontFamily: "DM Mono, monospace",
                        border: `1px solid ${opp.recommendation === "strong_buy" ? "rgba(16,185,129,0.3)" : "rgba(59,130,246,0.3)"}`,
                      }}
                    >
                      +{opp.bestROI?.toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* ── Row 5: Collection value breakdown ── */}
      {portfolio && !loading.portfolio && (
        <Section title='COLLECTION BREAKDOWN'>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
            }}
          >
            {[
              {
                label: "Raw Cards",
                count: portfolio.rawCards,
                value: portfolio.rawCardValue,
                color: "#6B7280",
              },
              {
                label: "Graded Cards",
                count: portfolio.gradedCards,
                value: portfolio.gradedCardValue,
                color: "var(--gold)",
              },
              {
                label: "Sealed Products",
                count: portfolio.sealedProducts,
                value: portfolio.sealedProductValue,
                color: "#8B5CF6",
              },
            ].map((b) => {
              const pct =
                portfolio.currentValue > 0
                  ? Math.round((b.value / portfolio.currentValue) * 100)
                  : 0;
              return (
                <div
                  key={b.label}
                  style={{
                    background: "var(--surface-2)",
                    border: `1px solid ${b.color}30`,
                    borderRadius: 10,
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        fontWeight: 500,
                      }}
                    >
                      {b.label}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: b.color,
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      {pct}%
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      fontFamily: "DM Mono, monospace",
                      color: "var(--text-primary)",
                      marginBottom: 4,
                    }}
                  >
                    {fmtK(b.value)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                    {b.count.toLocaleString()} items
                  </div>
                  <div
                    style={{
                      height: 3,
                      background: "var(--border)",
                      borderRadius: 2,
                      marginTop: 10,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: b.color,
                        borderRadius: 2,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}
