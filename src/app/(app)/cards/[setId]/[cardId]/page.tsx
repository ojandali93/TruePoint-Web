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

import { useMemo, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";

import { useCollections } from "../../../../../context/CollectionContext";
import {
  useCardDetail,
  flattenAndFilterPrices,
} from "../../../../../hooks/useCardDetail";
import { useCardGradedPrices } from "../../../../../hooks/useCardGradedPrices";
import type { GradedPriceRow } from "../../../../../hooks/useCardGradedPrices";
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
        <GradingAnalysis
          rawPrice={rawPrice}
          gradedPrices={gradedPrices}
          cardId={cardId}
          collectionId={activeCollectionId}
        />
      )}

      {activeTab === "prices" && (
        <>
          <div style={{ marginBottom: 24 }}>
            <RawPriceHistoryChart cardId={cardId} />
          </div>
          <RecentSalesSection cardId={cardId} />
          <RawPricesPanel prices={allPrices} />
          <GradedPricesPanel gradedPrices={gradedPrices} />
        </>
      )}
    </div>
  );
}

// ─── Grading Analysis (with ROI calculator) ──────────────────────────────────

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
  const COMPANY_ORDER = ["PSA", "BGS", "CGC", "TAG", "SGC"];
  const COMPANY_COLORS: Record<string, string> = {
    PSA: "#C9A84C",
    BGS: "#378ADD",
    CGC: "#3DAA6E",
    TAG: "#D85A30",
    SGC: "#9B59B6",
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
                      company as "PSA" | "BGS" | "CGC" | "SGC" | "TAG"
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
        }}
      >
        ROI assumes the raw card sells at TCGPlayer market and you receive the
        graded copy at the displayed PokeTrace price after fees.
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
          fontSize: 11,
          color: "var(--text-dim)",
          letterSpacing: "0.08em",
          marginBottom: 12,
          fontFamily: "DM Mono, monospace",
        }}
      >
        GRADED PRICES (POKETRACE)
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
