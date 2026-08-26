"use client";

/**
 * Card detail page — /cards/[setId]/[cardId]
 *
 * Sections:
 *   1. Header (breadcrumb + name)
 *   2. Image
 *   3. Tabs: All Prices · Grading Analysis
 *
 * Data sources:
 *   - useCardDetail        → card + per-source price entries (with phantom filter helper)
 *   - useCardGradedPrices  → PokeTrace-sourced graded prices
 *   - usePriceHistory      → time-series raw prices for chart
 *
 * Preserves the existing web-exclusive ROI calculator. Drops the old big
 * file's table-style sections in favor of cleaner inline panels.
 */

import { useMemo, useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";

import api from "../../../../../lib/api";
import { useCollections } from "../../../../../context/CollectionContext";
import { useFlag } from "../../../../../context/PlanContext";
import {
  useCardDetail,
  flattenAndFilterPrices,
} from "../../../../../hooks/useCardDetail";
import { useCardGradedPrices } from "../../../../../hooks/useCardGradedPrices";
import type { GradedPriceRow } from "../../../../../hooks/useCardGradedPrices";
import { PriceChartingAttribution } from "../../../../../components/cards/PriceChartingAttribution";
import { useTrackedRegrades } from "../../../../../hooks/useRegradeTracker";
import {
  patternKeyFromName,
  variantLabel,
  variantColor,
} from "../../../../../lib/variants";
import RawPriceHistoryChart from "../../../../../components/cards/RawPriceHistoryChart";
import RecentSalesSection from "../../../../../components/cards/RecentSalesSection";
import QuickAddInventory from "../../../../../components/cards/QuickAddInventory";
import type { QuickAddVariant } from "../../../../../components/cards/QuickAddInventory";
import QuickAddGradedInventory from "../../../../../components/cards/QuickAddGradedInventory";
import { TrackRegradeModal } from "../../../../../components/grading/TrackRegradeModal";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (val: number | null) =>
  val != null
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(val)
    : "—";

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CardDetailPage({
  params,
}: {
  params: Promise<{ setId: string; cardId: string }>;
}) {
  const { setId, cardId } = use(params);
  const { activeCollectionId } = useCollections();

  const { card, prices, loading, error } = useCardDetail(cardId);
  const { prices: gradedPrices } = useCardGradedPrices(cardId);

  // Regrade tracker — entry point only renders when the flag is on for this
  // account (hiding the button, not just what it opens).
  const canTrackRegrades = useFlag("regrade_tracker");
  const { data: trackedData, refetch: refetchTracked } =
    useTrackedRegrades(canTrackRegrades);
  const existingTracked =
    trackedData?.items.find((i) => i.cardId === cardId) ?? null;
  const [trackModalOpen, setTrackModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<"prices" | "grading">("grading");

  // Flattened + phantom-filtered raw price list
  const allPrices = useMemo(() => flattenAndFilterPrices(prices), [prices]);

  // Raw market price = best TCGPlayer market for the dominant raw variant
  // (used by the ROI calculator)
  const rawPrice = useMemo<number | null>(() => {
    const tcg = (prices?.tcgplayer ?? []).filter((p) => !p.grade);
    const prefer = tcg.find(
      (p) => p.variant === "holofoil" || p.variant === "normal",
    );
    return prefer?.marketPrice ?? tcg[0]?.marketPrice ?? null;
  }, [prices]);

  // QuickAdd variants — derived from raw price rows (deduped by variant)
  const quickAddVariants = useMemo<QuickAddVariant[]>(() => {
    const rawRows = (prices?.tcgplayer ?? []).filter(
      (p) => !p.grade && p.lowPrice != null,
    );
    const seen = new Set<string>();
    const out: QuickAddVariant[] = [];
    for (const r of rawRows) {
      const v = r.variant ?? "normal";
      if (seen.has(v)) continue;
      seen.add(v);
      out.push({
        variant: v,
        label: variantLabel(v),
        marketPrice: r.marketPrice,
      });
    }
    if (out.length === 0) {
      out.push({ variant: "normal", label: "Normal", marketPrice: null });
    }
    return out;
  }, [prices]);

  if (loading) {
    return <div style={messageStyle}>Loading card...</div>;
  }
  if (error) {
    return <div style={{ ...messageStyle, color: "var(--red)" }}>{error}</div>;
  }
  if (!card) {
    return <div style={messageStyle}>Card not found.</div>;
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 24,
          fontSize: 12,
          color: "var(--text-dim)",
        }}
      >
        <Link
          href='/cards'
          style={{ color: "var(--text-dim)", textDecoration: "none" }}
        >
          Sets
        </Link>
        <span>›</span>
        <Link
          href={`/cards/${setId}`}
          style={{ color: "var(--text-dim)", textDecoration: "none" }}
        >
          {card.set?.name ?? setId}
        </Link>
        <span>›</span>
        <span style={{ color: "var(--text-secondary)" }}>{card.name}</span>
      </div>

      {/* Header + image + quick add */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 320px) 1fr",
          gap: 32,
          marginBottom: 32,
          alignItems: "start",
        }}
      >
        {/* Image */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {card.images?.large && (
            <Image
              src={card.images.large}
              alt={card.name}
              width={320}
              height={448}
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          )}
        </div>

        {/* Meta + quick add */}
        <div>
          <div
            style={{
              fontSize: 11,
              color: "var(--gold)",
              letterSpacing: "0.1em",
              fontFamily: "DM Mono, monospace",
              marginBottom: 6,
            }}
          >
            {(card.set?.name ?? "").toUpperCase()} · #{card.number}
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: 16,
            }}
          >
            {card.name}
          </h1>
          {card.rarity && (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginBottom: 16,
                fontFamily: "DM Mono, monospace",
              }}
            >
              {card.rarity}
            </div>
          )}

          {rawPrice != null && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 20,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-dim)",
                  letterSpacing: "0.08em",
                  fontFamily: "DM Mono, monospace",
                  marginBottom: 4,
                }}
              >
                RAW MARKET
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  fontFamily: "DM Mono, monospace",
                }}
              >
                {fmt(rawPrice)}
              </div>
            </div>
          )}

          <QuickAddInventory
            cardId={card.id}
            cardName={card.name}
            setId={setId}
            setName={card.set?.name ?? setId}
            cardNumber={card.number}
            imageSmall={card.images?.small ?? null}
            variants={quickAddVariants}
            collectionId={activeCollectionId}
          />
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--border)",
          marginBottom: 24,
        }}
      >
        {[
          { key: "grading" as const, label: "Grading Analysis" },
          { key: "prices" as const, label: "All Prices" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "10px 24px",
              border: "none",
              borderBottom: `2px solid ${activeTab === t.key ? "var(--gold)" : "transparent"}`,
              background: "transparent",
              color:
                activeTab === t.key ? "var(--text-primary)" : "var(--text-dim)",
              fontSize: 13,
              fontWeight: activeTab === t.key ? 500 : 400,
              cursor: "pointer",
              fontFamily: "inherit",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "grading" && (
        <>
          <GradeTenComparison gradedPrices={gradedPrices} cardId={cardId} />
          <GradingAnalysis
            rawPrice={rawPrice}
            gradedPrices={gradedPrices}
            cardId={cardId}
            collectionId={activeCollectionId}
          />
        </>
      )}

      {activeTab === "prices" && (
        <>
          <div style={{ marginBottom: 24 }}>
            <RawPriceHistoryChart cardId={cardId} />
          </div>
          <RecentSalesSection cardId={cardId} />
          <RawPricesPanel prices={allPrices} />
          <GradedPricesPanel gradedPrices={gradedPrices} />

          {canTrackRegrades && (
            <button
              onClick={() => setTrackModalOpen(true)}
              style={{
                width: "100%",
                marginTop: 16,
                padding: "12px 0",
                borderRadius: 10,
                border: `1px solid ${existingTracked ? "rgba(201,168,76,0.35)" : "var(--border)"}`,
                background: "var(--surface-2)",
                color: "var(--gold)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {existingTracked
                ? `Tracking · ${existingTracked.targetCompany} ${existingTracked.targetGrade} target`
                : "Track for regrade"}
            </button>
          )}
        </>
      )}

      {trackModalOpen && card && (
        <TrackRegradeModal
          onClose={() => setTrackModalOpen(false)}
          onSaved={refetchTracked}
          onDeleted={refetchTracked}
          createCardId={card.id}
          createCardName={card.name}
          createCardNumber={card.number}
          existing={existingTracked ?? undefined}
        />
      )}
    </div>
  );
}

// ─── Grading Analysis (with ROI calculator) ──────────────────────────────────

// ─── Grade 10 Comparison ────────────────────────────────────────────────────
//
// "What does a 10 go for, company to company." Takes the same gradedPrices
// the page already fetched — no separate request. Sorted by price
// descending, since seeing which company's 10 commands the highest price
// is the actual point of comparing them.

// ─── Grade 10 Comparison ────────────────────────────────────────────────────
//
// "What does a 10 go for, company to company." Always shows all 4 major
// companies (PSA, BGS, TAG, CGC) in a 2x2 grid, even ones with no data for
// this card (shown as "—") — a stable, always-present set of 4 slots
// rather than "whichever happen to have data," so the on/off toggle below
// means something consistent from card to card. Each company can be
// toggled off via the chips above — persisted to localStorage (not
// per-card; a standing preference), defaulting to all 4 on. Tapping a
// company with real data expands a compact price-history chart for that
// exact company+grade — card_price_history has been snapshotting graded
// prices daily all along, this is the first UI that reads it back out.

const MAJOR_COMPANIES = ["PSA", "BGS", "TAG", "CGC"] as const;
type MajorCompany = (typeof MAJOR_COMPANIES)[number];
const COMPANY_COLORS: Record<string, string> = {
  PSA: "#C9A84C",
  BGS: "#378ADD",
  CGC: "#3DAA6E",
  TAG: "#D85A30",
  SGC: "#7F77DD",
};
const TOGGLE_STORAGE_KEY = "truepoint-grade-ten-comparison-companies";

function useCompanyToggle(): [Set<MajorCompany>, (c: MajorCompany) => void] {
  const [enabled, setEnabled] = useState<Set<MajorCompany>>(
    new Set(MAJOR_COMPANIES),
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TOGGLE_STORAGE_KEY);
      if (!raw) return;
      const parsed: string[] = JSON.parse(raw);
      const valid = parsed.filter((c): c is MajorCompany =>
        (MAJOR_COMPANIES as readonly string[]).includes(c),
      );
      if (valid.length > 0) setEnabled(new Set(valid));
    } catch {
      // best-effort — keep the all-enabled default
    }
  }, []);

  const toggle = (company: MajorCompany) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(company)) {
        if (next.size === 1) return prev; // never allow zero
        next.delete(company);
      } else {
        next.add(company);
      }
      try {
        localStorage.setItem(
          TOGGLE_STORAGE_KEY,
          JSON.stringify(Array.from(next)),
        );
      } catch {
        // best-effort
      }
      return next;
    });
  };

  return [enabled, toggle];
}

function GradeTenComparison({
  gradedPrices,
  cardId,
}: {
  gradedPrices: GradedPriceRow[];
  cardId: string;
}) {
  const [enabledCompanies, toggleCompany] = useCompanyToggle();
  const [expanded, setExpanded] = useState<MajorCompany | null>(null);

  const tens = MAJOR_COMPANIES.map((company) => {
    const match = gradedPrices.find(
      (p) => p.grade === "10" && p.company === company,
    );
    return { company, price: match?.marketPrice ?? null };
  });

  const anyData = tens.some((t) => t.price != null);
  if (!anyData) return null;

  const visible = tens.filter((t) => enabledCompanies.has(t.company));

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 10,
          color: "var(--text-dim)",
          letterSpacing: "0.08em",
          fontFamily: "DM Mono, monospace",
          marginBottom: 10,
        }}
      >
        GRADE 10 COMPARISON
      </div>

      {/* Toggle chips */}
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}
      >
        {MAJOR_COMPANIES.map((company) => {
          const on = enabledCompanies.has(company);
          const color = COMPANY_COLORS[company] ?? "#8A8FA0";
          return (
            <button
              key={company}
              onClick={() => toggleCompany(company)}
              style={{
                padding: "4px 10px",
                borderRadius: 100,
                border: `1px solid ${on ? color : "var(--border)"}`,
                background: on ? `${color}22` : "transparent",
                color: on ? color : "var(--text-dim)",
                fontSize: 10,
                fontWeight: on ? 700 : 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {company}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
          All companies hidden — click a chip above to show one.
        </div>
      ) : (
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          {visible.map((t) => {
            const color = COMPANY_COLORS[t.company] ?? "#8A8FA0";
            const isExpanded = expanded === t.company;
            return (
              <div
                key={t.company}
                style={{
                  gridColumn: isExpanded ? "1 / -1" : undefined,
                  borderRadius: 10,
                  background: "var(--surface)",
                  border: `1px solid ${color}55`,
                  overflow: "hidden",
                  cursor: t.price != null ? "pointer" : "default",
                }}
                onClick={() =>
                  t.price != null &&
                  setExpanded((cur) => (cur === t.company ? null : t.company))
                }
              >
                <div style={{ textAlign: "center", padding: "14px 10px" }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color,
                      letterSpacing: "0.06em",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {t.company} 10
                  </div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 500,
                      color:
                        t.price != null
                          ? "var(--text-primary)"
                          : "var(--text-dim)",
                      marginTop: 4,
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {t.price != null ? `$${t.price.toFixed(0)}` : "—"}
                  </div>
                  {t.price != null && (
                    <div
                      style={{
                        fontSize: 9,
                        color: "var(--text-dim)",
                        marginTop: 2,
                      }}
                    >
                      {isExpanded ? "Hide history" : "Click for history"}
                    </div>
                  )}
                </div>
                {isExpanded && (
                  <GradedHistoryPanel
                    cardId={cardId}
                    company={t.company}
                    grade='10'
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
      {tens.some((t) => t.price != null) &&
        gradedPrices.some((p) => p.grade === "10" && p.source === "pricecharting") && (
          <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
            <PriceChartingAttribution
              productId={
                gradedPrices.find((p) => p.grade === "10" && p.source === "pricecharting")
                  ?.sourceProductId
              }
            />
          </div>
        )}
    </div>
  );
}

function GradedHistoryPanel({
  cardId,
  company,
  grade,
}: {
  cardId: string;
  company: string;
  grade: string;
}) {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<{ date: string; price: number }[]>([]);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<{
        data: {
          series: {
            variant: string;
            points: { date: string; price: number }[];
          }[];
          isFallbackToCurrentPrice?: boolean;
        };
      }>(`/cards/${cardId}/price-history/graded`, {
        params: { company, grade, range },
      })
      .then((res) => {
        if (cancelled) return;
        setPoints(res.data.data.series?.[0]?.points ?? []);
        setIsFallback(!!res.data.data.isFallbackToCurrentPrice);
      })
      .catch(() => {
        if (!cancelled) setPoints([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cardId, company, grade, range]);

  const color = COMPANY_COLORS[company] ?? "#8A8FA0";
  const width = 400;
  const height = 56;

  return (
    <div
      style={{
        borderTop: "1px solid var(--border)",
        padding: 12,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
          {loading
            ? "Loading…"
            : isFallback
              ? "Only today's price — not enough history yet"
              : `${points.length} snapshot${points.length === 1 ? "" : "s"}`}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: "2px 8px",
                borderRadius: 6,
                border: "none",
                background: range === r ? `${color}22` : "transparent",
                color: range === r ? color : "var(--text-dim)",
                fontSize: 9,
                fontWeight: range === r ? 700 : 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Loading…</div>
      ) : points.length < 2 ? (
        <div style={{ fontSize: 12, color: "var(--text-primary)" }}>
          {points.length === 1
            ? `Current: $${points[0].price.toFixed(2)}`
            : "No data available."}
        </div>
      ) : (
        <>
          {(() => {
            const prices = points.map((p) => p.price);
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            const range2 = max - min || 1;
            const coords = points.map((p, i) => {
              const x = (i / (points.length - 1)) * width;
              const y = height - ((p.price - min) / range2) * (height - 8) - 4;
              return `${x},${y}`;
            });
            return (
              <svg
                width='100%'
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio='none'
              >
                <polyline
                  points={coords.join(" ")}
                  fill='none'
                  stroke={color}
                  strokeWidth={1.5}
                />
              </svg>
            );
          })()}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: 9, color: "var(--text-dim)" }}>
              ${points[0].price.toFixed(0)}
            </span>
            <span style={{ fontSize: 9, color: "var(--text-dim)" }}>
              ${points[points.length - 1].price.toFixed(0)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function GradingAnalysis({
  rawPrice,
  gradedPrices,
  cardId,
  collectionId,
}: {
  rawPrice: number | null;
  gradedPrices: GradedPriceRow[];
  cardId: string;
  collectionId: string | null | undefined;
}) {
  const [gradingCost, setGradingCost] = useState(24.99);

  const raw = rawPrice ?? 0;

  const roi = (graded: number | null): number | null => {
    if (!graded || !raw) return null;
    return Math.round(
      ((graded - raw - gradingCost) / (raw + gradingCost)) * 100,
    );
  };
  const profit = (graded: number | null): number | null => {
    if (!graded || !raw) return null;
    return graded - raw - gradingCost;
  };

  // Order companies canonically, sort grades descending within each
  // ACE added 2026-08-25 — see constants/grading.ts header note. This is the
  // full graded-price list (all companies data exists for), NOT the
  // curated MAJOR_COMPANIES 4-slot widget above — that one is a deliberate
  // documented design choice and is left untouched.
  const COMPANY_ORDER = ["PSA", "BGS", "CGC", "TAG", "SGC", "ACE"];
  const COMPANY_COLORS: Record<string, string> = {
    PSA: "#C9A84C",
    BGS: "#378ADD",
    CGC: "#3DAA6E",
    TAG: "#D85A30",
    SGC: "#9B59B6",
    ACE: "#2FA8A0",
  };

  const byCompany = useMemo(() => {
    const m = new Map<string, GradedPriceRow[]>();
    for (const row of gradedPrices) {
      const arr = m.get(row.company) ?? [];
      arr.push(row);
      m.set(row.company, arr);
    }
    // Sort grades descending (BGS Black Label first within BGS)
    const sortGrade = (a: string, b: string): number => {
      const aBlack = a.toLowerCase().includes("black");
      const bBlack = b.toLowerCase().includes("black");
      if (aBlack !== bBlack) return aBlack ? -1 : 1;
      const aN = parseFloat(a);
      const bN = parseFloat(b);
      if (isNaN(aN) || isNaN(bN)) return a.localeCompare(b);
      return bN - aN;
    };
    for (const arr of m.values())
      arr.sort((a, b) => sortGrade(a.grade, b.grade));
    return m;
  }, [gradedPrices]);

  const companies = COMPANY_ORDER.filter((c) => byCompany.has(c));

  if (companies.length === 0) {
    return (
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 40,
          textAlign: "center",
          color: "var(--text-dim)",
          fontSize: 13,
        }}
      >
        Graded pricing coming soon for this card.
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Header with cost input */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
            GRADING ANALYSIS
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: "var(--text-primary)",
            }}
          >
            Is it worth grading?
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            alignItems: "flex-end",
          }}
        >
          <label
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              letterSpacing: "0.06em",
              fontFamily: "DM Mono, monospace",
            }}
          >
            GRADING COST
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              $
            </span>
            <input
              type='number'
              value={gradingCost}
              onChange={(e) => setGradingCost(parseFloat(e.target.value) || 0)}
              style={{
                width: 72,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "5px 8px",
                fontSize: 13,
                color: "var(--text-primary)",
                fontFamily: "DM Mono, monospace",
                outline: "none",
                textAlign: "right",
              }}
            />
          </div>
          <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
            Total in: {fmt(raw + gradingCost)}
          </span>
        </div>
      </div>

      {/* Raw value bar */}
      <div
        style={{
          padding: "14px 24px",
          borderBottom: "1px solid var(--border)",
          background: "rgba(201,168,76,0.06)",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "var(--text-dim)",
            letterSpacing: "0.08em",
            fontFamily: "DM Mono, monospace",
          }}
        >
          RAW VALUE
        </span>
        <span
          style={{
            fontSize: 22,
            fontWeight: 500,
            color: "var(--text-primary)",
            fontFamily: "DM Mono, monospace",
          }}
        >
          {fmt(rawPrice)}
        </span>
      </div>

      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "200px 1fr 1fr 1fr 180px",
          gap: 12,
          padding: "10px 24px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface-2)",
        }}
      >
        {["GRADE", "GRADED VALUE", "NET PROFIT", "ROI", "ADD"].map((h) => (
          <div
            key={h}
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              letterSpacing: "0.08em",
              fontFamily: "DM Mono, monospace",
              textAlign: h === "ADD" ? "right" : "left",
            }}
          >
            {h}
          </div>
        ))}
      </div>

      {/* Company sections */}
      {companies.map((company) => {
        const rows = byCompany.get(company)!;
        const color = COMPANY_COLORS[company] ?? "#8A8FA0";
        return (
          <div
            key={company}
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div
              style={{
                padding: "10px 24px",
                background: `${color}0D`,
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: color,
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color,
                  letterSpacing: "0.1em",
                  fontFamily: "DM Mono, monospace",
                }}
              >
                {company}
              </span>
            </div>

            {rows.map((r) => {
              const roiVal = roi(r.marketPrice);
              const profitVal = profit(r.marketPrice);
              const worth = roiVal != null && roiVal > 0;
              const isBlack = r.grade.toLowerCase().includes("black");

              return (
                <div
                  key={`${company}-${r.grade}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "200px 1fr 1fr 1fr 180px",
                    gap: 12,
                    padding: "14px 24px",
                    borderBottom: "1px solid var(--border)",
                    alignItems: "center",
                    background: isBlack
                      ? "rgba(55,138,221,0.05)"
                      : "transparent",
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignSelf: "start",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 500,
                      color: isBlack ? "#fff" : color,
                      background: isBlack
                        ? "linear-gradient(135deg, #1a1a1a, #333)"
                        : `${color}18`,
                      border: isBlack
                        ? "1px solid rgba(255,255,255,0.2)"
                        : `1px solid ${color}33`,
                      padding: "4px 10px",
                      borderRadius: 20,
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {isBlack && <span style={{ fontSize: 10 }}>◼</span>}
                    {company} {r.grade}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {fmt(r.marketPrice)}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      color: worth ? "#3DAA6E" : "#C94C4C",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {profitVal != null
                      ? `${profitVal >= 0 ? "+" : ""}${fmt(profitVal)}`
                      : "—"}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: worth ? "#3DAA6E" : "#C94C4C",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {roiVal != null
                      ? `${roiVal >= 0 ? "+" : ""}${roiVal}%`
                      : "—"}
                  </div>
                  <QuickAddGradedInventory
                    cardId={cardId}
                    gradingCompany={
                      company as "PSA" | "BGS" | "CGC" | "SGC" | "TAG" | "ACE"
                    }
                    grade={r.grade}
                    collectionId={collectionId}
                    accentColor={color}
                  />
                </div>
              );
            })}
          </div>
        );
      })}

      <div
        style={{
          padding: "12px 24px",
          fontSize: 11,
          color: "var(--text-dim)",
          lineHeight: 1.6,
          background: "var(--surface-2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span>
          ROI assumes the raw card sells at TCGPlayer market and you receive
          the graded copy at the displayed price after fees.
        </span>
        {gradedPrices.some((p) => p.source === "pricecharting") && (
          <PriceChartingAttribution
            productId={gradedPrices.find((p) => p.source === "pricecharting")?.sourceProductId}
          />
        )}
      </div>
    </div>
  );
}

// ─── All Prices panel ────────────────────────────────────────────────────────

const SOURCE_META: Record<string, { label: string; color: string }> = {
  tcgplayer: { label: "TCGPlayer", color: "#378ADD" },
  cardmarket: { label: "CardMarket", color: "#3DAA6E" },
  justtcg: { label: "JustTCG", color: "#C9A84C" },
  ebay: { label: "eBay Sold", color: "#D85A30" },
};

function RawPricesPanel({
  prices,
}: {
  prices: ReturnType<typeof flattenAndFilterPrices>;
}) {
  const raw = prices.filter((p) => !p.grade);
  if (raw.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontSize: 11,
          color: "var(--text-dim)",
          letterSpacing: "0.08em",
          marginBottom: 12,
          fontFamily: "DM Mono, monospace",
        }}
      >
        RAW PRICES
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {raw.map((p, i) => {
          const meta = SOURCE_META[p.source] ?? {
            label: p.source,
            color: "#8A8FA0",
          };
          return (
            <div
              key={`${p.cardId}-${p.source}-${p.variant}-${i}`}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr 1fr 1fr 1fr",
                gap: 16,
                padding: "12px 16px",
                background: "var(--surface-2)",
                borderRadius:
                  i === 0
                    ? "8px 8px 0 0"
                    : i === raw.length - 1
                      ? "0 0 8px 8px"
                      : 0,
                border: "1px solid var(--border)",
                borderTop: i > 0 ? "none" : "1px solid var(--border)",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: meta.color,
                  }}
                />
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {meta.label}
                </span>
                {p.variant && (
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--text-dim)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {variantLabel(p.variant)}
                  </span>
                )}
              </div>
              {(
                [
                  { label: "LOW", val: p.lowPrice },
                  { label: "MID", val: p.midPrice },
                  { label: "HIGH", val: p.highPrice },
                  { label: "MARKET", val: p.marketPrice },
                ] as const
              ).map(({ label, val }) => (
                <div key={label}>
                  <div
                    style={{
                      fontSize: 9,
                      color: "var(--text-dim)",
                      letterSpacing: "0.06em",
                      marginBottom: 2,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: label === "MARKET" ? 500 : 400,
                      color:
                        label === "MARKET"
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {fmt(val)}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GradedPricesPanel({
  gradedPrices,
}: {
  gradedPrices: GradedPriceRow[];
}) {
  if (gradedPrices.length === 0) return null;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "var(--text-dim)",
            letterSpacing: "0.08em",
            fontFamily: "DM Mono, monospace",
          }}
        >
          GRADED PRICES
        </div>
        {gradedPrices.some((p) => p.source === "pricecharting") && (
          <PriceChartingAttribution
            productId={gradedPrices.find((p) => p.source === "pricecharting")?.sourceProductId}
          />
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {gradedPrices.map((g, i) => (
          <div
            key={`${g.company}-${g.grade}`}
            style={{
              display: "grid",
              gridTemplateColumns: "180px 1fr",
              gap: 16,
              padding: "10px 16px",
              background: "var(--surface-2)",
              borderRadius:
                i === 0
                  ? "8px 8px 0 0"
                  : i === gradedPrices.length - 1
                    ? "0 0 8px 8px"
                    : 0,
              border: "1px solid var(--border)",
              borderTop: i > 0 ? "none" : "1px solid var(--border)",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {g.company} {g.grade}
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--gold)",
                fontFamily: "DM Mono, monospace",
              }}
            >
              {fmt(g.marketPrice)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const messageStyle: React.CSSProperties = {
  textAlign: "center",
  padding: 80,
  color: "var(--text-dim)",
  fontSize: 13,
};
