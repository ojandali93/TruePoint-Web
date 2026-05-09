"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import api from "../../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GradePrice {
  company: string;
  grade: string;
  price: number;
  source: string;
}

interface Opportunity {
  inventoryId: string;
  cardId: string;
  cardName: string;
  cardNumber: string;
  setName: string;
  setId: string;
  imageSmall: string | null;
  rarity: string | null;
  rawPrice: number | null;
  purchasePrice: number | null;
  gradePrices: GradePrice[];
  bestGrade: GradePrice | null;
  bestProfit: number | null;
  bestROI: number | null;
  gradingCostUsed: number;
  recommendation: "strong_buy" | "buy" | "marginal" | "hold" | "no_data";
}

interface Summary {
  totalRawCards: number;
  cardsWithData: number;
  strongBuy: number;
  buy: number;
  marginal: number;
  hold: number;
  topOpportunities: Opportunity[];
  allOpportunities: Opportunity[];
}

interface GradingCosts {
  PSA: Record<string, number>;
  BGS: Record<string, number>;
  CGC: Record<string, number>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number | null, prefix = "$") =>
  v !== null
    ? `${prefix}${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";

const fmtPct = (v: number | null) =>
  v !== null ? `${v >= 0 ? "+" : ""}${v.toFixed(0)}%` : "—";

const RECO_CONFIG = {
  strong_buy: {
    label: "Strong Buy",
    color: "#10B981",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.3)",
  },
  buy: {
    label: "Buy",
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.3)",
  },
  marginal: {
    label: "Marginal",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
  },
  hold: {
    label: "Hold",
    color: "#6B7280",
    bg: "rgba(107,114,128,0.12)",
    border: "rgba(107,114,128,0.3)",
  },
  no_data: {
    label: "No Data",
    color: "#4B5563",
    bg: "rgba(75,85,99,0.08)",
    border: "rgba(75,85,99,0.2)",
  },
};

// ─── Company colours ──────────────────────────────────────────────────────────
const COMPANY_COLORS: Record<string, string> = {
  PSA: "#3B82F6",
  BGS: "#8B5CF6",
  CGC: "#F59E0B",
  EBAY: "#EF4444",
  TAG: "#10B981",
  ACE: "#EC4899",
  GMA: "#06B6D4",
  SGC: "#6366F1",
};

// ─── Custom calculator modal ──────────────────────────────────────────────────
function GradingCalculator({ onClose }: { onClose: () => void }) {
  const [rawPrice, setRawPrice] = useState("");
  const [gradedPrice, setGradedPrice] = useState("");
  const [gradingFee, setGradingFee] = useState("25");

  const raw = parseFloat(rawPrice) || 0;
  const graded = parseFloat(gradedPrice) || 0;
  const fee = parseFloat(gradingFee) || 0;
  const profit = graded - raw - fee;
  const roi = raw + fee > 0 ? (profit / (raw + fee)) * 100 : null;
  const hasData = raw > 0 && graded > 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 420,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface-2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                color: "var(--gold)",
                fontFamily: "DM Mono, monospace",
                letterSpacing: "0.08em",
                marginBottom: 2,
              }}
            >
              GRADING CALCULATOR
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              Custom ROI Check
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: "var(--text-dim)",
              fontSize: 18,
              cursor: "pointer",
              padding: "0 4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Inputs */}
        <div
          style={{
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {[
            {
              label: "Raw card price",
              value: rawPrice,
              onChange: setRawPrice,
              placeholder: "0.00",
            },
            {
              label: "Expected graded price",
              value: gradedPrice,
              onChange: setGradedPrice,
              placeholder: "0.00",
            },
            {
              label: "Grading fee",
              value: gradingFee,
              onChange: setGradingFee,
              placeholder: "25.00",
            },
          ].map((field) => (
            <div key={field.label}>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-dim)",
                  fontFamily: "DM Mono, monospace",
                  marginBottom: 6,
                  letterSpacing: "0.06em",
                }}
              >
                {field.label.toUpperCase()}
              </div>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-dim)",
                    fontSize: 13,
                  }}
                >
                  $
                </span>
                <input
                  type='number'
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder={field.placeholder}
                  style={{
                    width: "100%",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "9px 12px 9px 26px",
                    fontSize: 14,
                    color: "var(--text-primary)",
                    fontFamily: "DM Mono, monospace",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          ))}

          {/* Result */}
          {hasData && (
            <div
              style={{
                marginTop: 4,
                padding: "16px",
                borderRadius: 10,
                background:
                  profit > 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${profit > 0 ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                {[
                  { label: "Total cost", value: fmt(raw + fee) },
                  { label: "Graded value", value: fmt(graded) },
                  {
                    label: "Net profit",
                    value: `${profit >= 0 ? "+" : "-"}${fmt(profit)}`,
                    color: profit > 0 ? "#10B981" : "#EF4444",
                  },
                  {
                    label: "ROI",
                    value: roi !== null ? fmtPct(roi) : "—",
                    color: profit > 0 ? "#10B981" : "#EF4444",
                  },
                ].map((r) => (
                  <div key={r.label}>
                    <div
                      style={{
                        fontSize: 9,
                        color: "var(--text-dim)",
                        fontFamily: "DM Mono, monospace",
                        marginBottom: 3,
                      }}
                    >
                      {r.label.toUpperCase()}
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        fontFamily: "DM Mono, monospace",
                        color: r.color ?? "var(--text-primary)",
                      }}
                    >
                      {r.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Card row ─────────────────────────────────────────────────────────────────

function OpportunityRow({
  opp,
  expanded,
  onToggle,
  service,
  grade,
}: {
  opp: Opportunity;
  expanded: boolean;
  onToggle: () => void;
  service: string;
  grade: string;
}) {
  const reco = RECO_CONFIG[opp.recommendation];

  // For collapsed row — find the specific grade matching the current filter
  const filteredGrade =
    opp.gradePrices.find(
      (g) =>
        g.company.toUpperCase() === service.toUpperCase() && g.grade === grade,
    ) ?? opp.bestGrade;

  const filteredProfit = filteredGrade
    ? filteredGrade.price - (opp.rawPrice ?? 0) - opp.gradingCostUsed
    : opp.bestProfit;

  // Group grades by company for expanded view
  const byCompany = opp.gradePrices.reduce(
    (acc, g) => {
      const key = g.company.toUpperCase();
      if (!acc[key]) acc[key] = [];
      acc[key].push(g);
      return acc;
    },
    {} as Record<string, GradePrice[]>,
  );

  // Sort each company's grades numerically descending
  for (const co of Object.keys(byCompany)) {
    byCompany[co].sort((a, b) => parseFloat(b.grade) - parseFloat(a.grade));
  }

  return (
    <div
      style={{
        border: `1px solid ${expanded ? reco.border : "var(--border)"}`,
        borderRadius: 10,
        overflow: "hidden",
        background: expanded ? reco.bg : "var(--surface)",
        transition: "all 0.15s ease",
      }}
    >
      {/* Collapsed row */}
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 16px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {/* Card image */}
        <div
          style={{
            width: 36,
            height: 50,
            flexShrink: 0,
            borderRadius: 4,
            overflow: "hidden",
            background: "var(--surface-2)",
          }}
        >
          {opp.imageSmall && (
            <Image
              src={opp.imageSmall}
              alt={opp.cardName}
              width={36}
              height={50}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
        </div>

        {/* Card info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: 2,
            }}
          >
            {opp.cardName}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-dim)",
              fontFamily: "DM Mono, monospace",
            }}
          >
            #{opp.cardNumber} · {opp.setName}
          </div>
        </div>

        {/* Raw price */}
        <div style={{ textAlign: "right", minWidth: 70 }}>
          <div
            style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 2 }}
          >
            RAW
          </div>
          <div
            style={{
              fontSize: 13,
              fontFamily: "DM Mono, monospace",
              color: "var(--text-secondary)",
            }}
          >
            {fmt(opp.rawPrice)}
          </div>
        </div>

        <div style={{ color: "var(--text-dim)", fontSize: 12 }}>→</div>

        {/* Graded price — shows the selected company+grade from filters */}
        <div style={{ textAlign: "right", minWidth: 90 }}>
          <div
            style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 2 }}
          >
            {filteredGrade ? (
              <span
                style={{
                  color:
                    COMPANY_COLORS[filteredGrade.company.toUpperCase()] ??
                    "var(--text-dim)",
                }}
              >
                {filteredGrade.company} {filteredGrade.grade}
              </span>
            ) : (
              "GRADED"
            )}
          </div>
          <div
            style={{
              fontSize: 13,
              fontFamily: "DM Mono, monospace",
              color: filteredGrade
                ? (COMPANY_COLORS[filteredGrade.company.toUpperCase()] ??
                  reco.color)
                : "var(--text-dim)",
            }}
          >
            {filteredGrade ? fmt(filteredGrade.price) : "—"}
          </div>
        </div>

        {/* Profit */}
        <div style={{ textAlign: "right", minWidth: 80 }}>
          <div
            style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 2 }}
          >
            PROFIT
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "DM Mono, monospace",
              color:
                filteredProfit !== null && filteredProfit > 0
                  ? "#10B981"
                  : filteredProfit !== null
                    ? "#EF4444"
                    : "var(--text-dim)",
            }}
          >
            {filteredProfit !== null
              ? `${filteredProfit >= 0 ? "+" : "-"}${fmt(filteredProfit)}`
              : "—"}
          </div>
        </div>

        {/* ROI badge */}
        <div
          style={{
            padding: "4px 10px",
            borderRadius: 20,
            flexShrink: 0,
            background: reco.bg,
            border: `1px solid ${reco.border}`,
            fontSize: 11,
            fontWeight: 600,
            color: reco.color,
            fontFamily: "DM Mono, monospace",
            minWidth: 70,
            textAlign: "center",
          }}
        >
          {opp.bestROI !== null ? fmtPct(opp.bestROI) : reco.label}
        </div>

        <span style={{ color: "var(--text-dim)", fontSize: 10 }}>
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{
            padding: "0 16px 16px",
            borderTop: `1px solid ${reco.border}`,
          }}
        >
          <div
            style={{
              marginTop: 14,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Cost breakdown */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-dim)",
                  fontFamily: "DM Mono, monospace",
                  marginBottom: 8,
                  letterSpacing: "0.06em",
                }}
              >
                COST BREAKDOWN
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                }}
              >
                {[
                  { label: "Raw value", value: fmt(opp.rawPrice) },
                  { label: "Grading fee", value: fmt(opp.gradingCostUsed) },
                  {
                    label: "Total in",
                    value: fmt((opp.rawPrice ?? 0) + opp.gradingCostUsed),
                  },
                ].map((r) => (
                  <div key={r.label}>
                    <div
                      style={{
                        fontSize: 9,
                        color: "var(--text-dim)",
                        fontFamily: "DM Mono, monospace",
                        marginBottom: 3,
                      }}
                    >
                      {r.label.toUpperCase()}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      {r.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Grading companies — each in its own bubble */}
            {Object.entries(byCompany).map(([company, grades]) => {
              const color = COMPANY_COLORS[company] ?? "#6B7280";
              const bestForCompany = grades[0];
              const companyProfit = bestForCompany
                ? bestForCompany.price -
                  (opp.rawPrice ?? 0) -
                  opp.gradingCostUsed
                : null;
              return (
                <div
                  key={company}
                  style={{
                    background: "var(--surface)",
                    border: `1px solid ${color}30`,
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  {/* Company header */}
                  <div
                    style={{
                      padding: "8px 14px",
                      background: `${color}10`,
                      borderBottom: `1px solid ${color}20`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color,
                        fontFamily: "DM Mono, monospace",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {company}
                    </div>
                    {companyProfit !== null && (
                      <div
                        style={{
                          fontSize: 11,
                          fontFamily: "DM Mono, monospace",
                          color: companyProfit > 0 ? "#10B981" : "#EF4444",
                          fontWeight: 500,
                        }}
                      >
                        Best: {companyProfit >= 0 ? "+" : ""}
                        {fmt(companyProfit)}
                      </div>
                    )}
                  </div>
                  {/* Grades */}
                  <div
                    style={{
                      padding: "10px 14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {grades.map((g) => {
                      const profit =
                        g.price - (opp.rawPrice ?? 0) - opp.gradingCostUsed;
                      const roi =
                        (opp.rawPrice ?? 0) + opp.gradingCostUsed > 0
                          ? (profit /
                              ((opp.rawPrice ?? 0) + opp.gradingCostUsed)) *
                            100
                          : null;
                      return (
                        <div
                          key={g.grade}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--text-secondary)",
                              fontFamily: "DM Mono, monospace",
                            }}
                          >
                            {company} {g.grade}
                            <span
                              style={{
                                fontSize: 10,
                                color: "var(--text-dim)",
                                marginLeft: 6,
                              }}
                            >
                              {g.source}
                            </span>
                          </span>
                          <div
                            style={{
                              display: "flex",
                              gap: 12,
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 13,
                                color,
                                fontFamily: "DM Mono, monospace",
                                fontWeight: 500,
                              }}
                            >
                              {fmt(g.price)}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                fontFamily: "DM Mono, monospace",
                                color: profit > 0 ? "#10B981" : "#EF4444",
                                minWidth: 60,
                                textAlign: "right",
                              }}
                            >
                              {profit >= 0 ? "+" : ""}
                              {fmt(profit)}
                            </span>
                            {roi !== null && (
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: "2px 7px",
                                  borderRadius: 12,
                                  background:
                                    profit > 0
                                      ? "rgba(16,185,129,0.12)"
                                      : "rgba(239,68,68,0.12)",
                                  color: profit > 0 ? "#10B981" : "#EF4444",
                                  fontFamily: "DM Mono, monospace",
                                  minWidth: 50,
                                  textAlign: "center",
                                }}
                              >
                                {fmtPct(roi)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* No graded data */}
            {Object.keys(byCompany).length === 0 && (
              <div
                style={{
                  padding: "14px",
                  textAlign: "center",
                  fontSize: 12,
                  color: "var(--text-dim)",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              >
                No graded price data available for this card
              </div>
            )}

            {/* Verdict */}
            <div
              style={{
                background: reco.bg,
                border: `1px solid ${reco.border}`,
                borderRadius: 8,
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: reco.color,
                    fontFamily: "DM Mono, monospace",
                    marginBottom: 4,
                    letterSpacing: "0.06em",
                  }}
                >
                  VERDICT
                </div>
                <div
                  style={{ fontSize: 13, fontWeight: 600, color: reco.color }}
                >
                  {reco.label}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  maxWidth: 300,
                  textAlign: "right",
                  lineHeight: 1.5,
                }}
              >
                {opp.recommendation === "strong_buy" &&
                  "Excellent candidate. High return after grading costs."}
                {opp.recommendation === "buy" &&
                  "Good candidate. Solid return expected."}
                {opp.recommendation === "marginal" &&
                  "Modest return. Check condition and pop report first."}
                {opp.recommendation === "hold" &&
                  "Low ROI at current market prices."}
                {opp.recommendation === "no_data" &&
                  "Not enough price data to make a recommendation."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GradingArbitragePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [costs, setCosts] = useState<GradingCosts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [service, setService] = useState("PSA");
  const [tier, setTier] = useState("value");
  const [grade, setGrade] = useState("10");
  const [filter, setFilter] = useState<
    "all" | "strong_buy" | "buy" | "marginal" | "hold" | "no_data"
  >("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [showCalc, setShowCalc] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [arbRes, costRes] = await Promise.all([
        api.get<{ data: Summary }>(
          `/grading/arbitrage?service=${service}&tier=${tier}&grade=${grade}`,
        ),
        costs
          ? Promise.resolve(null)
          : api.get<{ data: GradingCosts }>("/grading/costs"),
      ]);
      setSummary(arbRes.data.data);
      if (costRes) setCosts(costRes.data.data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load arbitrage data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchData();
    }, 0);
    return () => clearTimeout(t);
  }, [service, tier, grade]); // eslint-disable-line react-hooks/exhaustive-deps -- refetch when filters change only

  const tierOptions = costs
    ? Object.keys(costs[service as keyof GradingCosts] ?? {})
    : [];
  const gradeOptions = ["10", "9.5", "9", "8.5", "8"];

  const filtered = (summary?.allOpportunities ?? []).filter((o) => {
    const matchFilter = filter === "all" || o.recommendation === filter;
    const matchSearch =
      !search ||
      o.cardName.toLowerCase().includes(search.toLowerCase()) ||
      o.setName.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
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
          GRADING
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          Regrade Arbitrage
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Which raw cards in your inventory are worth grading? Ranked by ROI
          after grading costs.
        </p>
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 24,
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              fontFamily: "DM Mono, monospace",
              marginBottom: 5,
            }}
          >
            GRADING COMPANY
          </div>
          <select
            value={service}
            onChange={(e) => {
              setService(e.target.value);
              setTier(
                Object.keys(
                  costs?.[e.target.value as keyof GradingCosts] ?? {},
                )[0] ?? "value",
              );
            }}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 12,
              color: "var(--text-primary)",
              fontFamily: "inherit",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value='PSA'>PSA</option>
            <option value='BGS'>BGS (Beckett)</option>
            <option value='CGC'>CGC</option>
          </select>
        </div>

        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              fontFamily: "DM Mono, monospace",
              marginBottom: 5,
            }}
          >
            SERVICE TIER
          </div>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 12,
              color: "var(--text-primary)",
              fontFamily: "inherit",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {tierOptions.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)} ($
                {costs?.[service as keyof GradingCosts]?.[t]})
              </option>
            ))}
          </select>
        </div>

        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              fontFamily: "DM Mono, monospace",
              marginBottom: 5,
            }}
          >
            TARGET GRADE
          </div>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 12,
              color: "var(--text-primary)",
              fontFamily: "inherit",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {gradeOptions.map((g) => (
              <option key={g} value={g}>
                {service === "BGS" ? `BGS ${g}` : `${service} ${g}`}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            padding: "8px 18px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text-secondary)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
            alignSelf: "flex-end",
          }}
        >
          {loading ? "Loading..." : "Recalculate"}
        </button>
        <button
          onClick={() => setShowCalc(true)}
          style={{
            padding: "8px 18px",
            borderRadius: 8,
            border: "1px solid var(--gold)",
            background: "rgba(201,168,76,0.1)",
            color: "var(--gold)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
            alignSelf: "flex-end",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>⌗</span> Custom Calculator
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 13, color: "#EF4444", marginBottom: 20 }}>
          {error}
        </div>
      )}

      {summary && !loading && (
        <>
          {/* Summary stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 10,
              marginBottom: 24,
            }}
          >
            {[
              {
                label: "RAW CARDS",
                value: summary.totalRawCards,
                color: "var(--text-primary)",
              },
              {
                label: "STRONG BUY",
                value: summary.strongBuy,
                color: "#10B981",
              },
              { label: "BUY", value: summary.buy, color: "#3B82F6" },
              { label: "MARGINAL", value: summary.marginal, color: "#F59E0B" },
              { label: "HOLD", value: summary.hold, color: "#6B7280" },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: "var(--text-dim)",
                    letterSpacing: "0.08em",
                    fontFamily: "DM Mono, monospace",
                    marginBottom: 6,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    color: s.color,
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Filter bar */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Search cards or sets...'
                style={{
                  width: "100%",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "8px 14px 8px 34px",
                  fontSize: 12,
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 13,
                  color: "var(--text-dim)",
                }}
              >
                ⌕
              </span>
            </div>
            {(
              [
                "all",
                "strong_buy",
                "buy",
                "marginal",
                "hold",
                "no_data",
              ] as const
            ).map((f) => {
              const cfg =
                f === "all"
                  ? {
                      label: "All",
                      color: "var(--text-primary)",
                      bg: "var(--surface)",
                      border: "var(--border)",
                    }
                  : RECO_CONFIG[f];
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 20,
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    border: `1px solid ${active ? (f === "all" ? "var(--gold)" : cfg.border) : "var(--border)"}`,
                    background: active
                      ? f === "all"
                        ? "rgba(201,168,76,0.12)"
                        : cfg.bg
                      : "var(--surface)",
                    color: active
                      ? f === "all"
                        ? "var(--gold)"
                        : cfg.color
                      : "var(--text-dim)",
                  }}
                >
                  {f === "all" ? "All" : RECO_CONFIG[f].label}
                </button>
              );
            })}
          </div>

          <p
            style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 16 }}
          >
            {filtered.length} card{filtered.length !== 1 ? "s" : ""} · sorted by
            ROI
          </p>

          {/* No raw cards */}
          {summary.totalRawCards === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "60px 24px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 16 }}>📦</div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  marginBottom: 8,
                }}
              >
                No raw cards in inventory
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Add raw cards to your inventory to see grading opportunities.
              </div>
            </div>
          )}

          {/* Opportunity list */}
          {filtered.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((opp) => (
                <OpportunityRow
                  key={opp.inventoryId}
                  opp={opp}
                  expanded={expanded.has(opp.inventoryId)}
                  onToggle={() => toggleExpand(opp.inventoryId)}
                  service={service}
                  grade={grade}
                />
              ))}
            </div>
          )}
        </>
      )}

      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: 80,
            color: "var(--text-dim)",
            fontSize: 13,
          }}
        >
          Calculating grading opportunities...
        </div>
      )}
      {showCalc && <GradingCalculator onClose={() => setShowCalc(false)} />}
    </div>
  );
}
