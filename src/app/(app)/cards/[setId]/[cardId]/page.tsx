"use client";
import { useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCardDetail } from "../../../../../hooks/useCards";
import type { PriceEntry } from "../../../../../hooks/useCards";
import QuickAddInventory from "../../../../../components/cards/QuickAddInventory";
import { useCollections } from "../../../../../context/CollectionContext";
import type { QuickAddVariant } from "../../../../../components/cards/QuickAddInventory";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (val: number | null, currency = "USD") =>
  val != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
        val,
      )
    : "—";

const profitPct = (graded: number, raw: number, cost: number): number =>
  Math.round(((graded - raw - cost) / (raw + cost)) * 100);

const getMarketPrice = (
  prices: PriceEntry[],
  source: string,
  variant?: string | null,
  grade?: string | null,
): number | null => {
  const match = prices.find(
    (p) =>
      p.source === source &&
      (variant === undefined || p.variant === variant) &&
      (grade === undefined || p.grade === grade),
  );
  return match?.marketPrice ?? null;
};

// ─── Grading Analysis ─────────────────────────────────────────────────────────

function GradingAnalysis({
  rawPrice,
  cardmarketPrices,
}: {
  rawPrice: number | null;
  cardmarketPrices: PriceEntry[];
}) {
  const [gradingCost, setGradingCost] = useState(24.99);

  // Pop count state for each grade
  const [popCounts, setPopCounts] = useState<Record<string, string>>({});
  const setPop = (key: string, val: string) =>
    setPopCounts((prev) => ({ ...prev, [key]: val }));

  const raw = rawPrice ?? 0;

  const fmt = (val: number | null) =>
    val != null
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(val)
      : "—";

  const roi = (graded: number | null): number | null => {
    if (!graded || !raw) return null;
    return Math.round(
      ((graded - raw - gradingCost) / (raw + gradingCost)) * 100,
    );
  };

  const netProfit = (graded: number | null): number | null => {
    if (!graded || !raw) return null;
    return graded - raw - gradingCost;
  };

  const getPrice = (grade: string): number | null =>
    cardmarketPrices.find((p) => p.grade === grade)?.marketPrice ?? null;

  // All grade rows grouped by company
  const COMPANIES = [
    {
      name: "PSA",
      color: "#C9A84C",
      grades: [
        { key: "PSA 10", label: "PSA 10 — Gem Mint", showPop: true },
        { key: "PSA 9", label: "PSA 9 — Mint", showPop: true },
      ],
    },
    {
      name: "BGS",
      color: "#378ADD",
      grades: [
        {
          key: "BGS Black Label",
          label: "BGS Black Label — Pristine 10",
          showPop: true,
        },
        { key: "BGS 10", label: "BGS 10 — Pristine", showPop: false },
        { key: "BGS 9.5", label: "BGS 9.5 — Gem Mint", showPop: false },
      ],
    },
    {
      name: "TAG",
      color: "#D85A30",
      grades: [
        { key: "TAG 10", label: "TAG 10 — Gem Mint", showPop: true },
        { key: "TAG 9", label: "TAG 9 — Mint", showPop: false },
      ],
    },
    {
      name: "CGC",
      color: "#3DAA6E",
      grades: [
        { key: "CGC 10", label: "CGC 10 — Pristine", showPop: true },
        { key: "CGC 9", label: "CGC 9 — Mint", showPop: false },
      ],
    },
  ];

  const hasAnyData = COMPANIES.some((c) =>
    c.grades.some((g) => getPrice(g.key) != null),
  );

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Header */}
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

        {/* Grading cost */}
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
          padding: "16px 24px",
          borderBottom: "1px solid var(--border)",
          background: "rgba(201,168,76,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              letterSpacing: "0.08em",
              fontFamily: "DM Mono, monospace",
              marginBottom: 4,
            }}
          >
            RAW VALUE
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
        <div
          style={{
            fontSize: 11,
            color: "var(--text-dim)",
            textAlign: "right",
            lineHeight: 1.8,
          }}
        >
          <div>TCGPlayer market price</div>
          <div>Grading cost: {fmt(gradingCost)}</div>
        </div>
      </div>

      {!hasAnyData ? (
        <div
          style={{
            padding: "40px 24px",
            textAlign: "center",
            color: "var(--text-dim)",
            fontSize: 13,
          }}
        >
          Graded price data not available for this card yet.
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "220px 1fr 1fr 1fr 1fr",
              gap: 12,
              padding: "10px 24px",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface-2)",
            }}
          >
            {["GRADE", "GRADED VALUE", "NET PROFIT", "ROI", "POP COUNT"].map(
              (h) => (
                <div
                  key={h}
                  style={{
                    fontSize: 10,
                    color: "var(--text-dim)",
                    letterSpacing: "0.08em",
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  {h}
                </div>
              ),
            )}
          </div>

          {/* Company sections */}
          {COMPANIES.map((company) => {
            const visibleGrades = company.grades.filter(
              (g) => getPrice(g.key) != null,
            );
            if (visibleGrades.length === 0) return null;

            return (
              <div
                key={company.name}
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                {/* Company header */}
                <div
                  style={{
                    padding: "10px 24px",
                    background: `${company.color}0D`,
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: company.color,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: company.color,
                      letterSpacing: "0.1em",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {company.name}
                  </span>
                </div>

                {/* Grade rows */}
                {company.grades.map((g) => {
                  const price = getPrice(g.key);
                  if (price == null) return null;

                  const roiVal = roi(price);
                  const profit = netProfit(price);
                  const isWorth = roiVal != null && roiVal > 0;
                  const isBlackLabel = g.key === "BGS Black Label";

                  return (
                    <div
                      key={g.key}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "220px 1fr 1fr 1fr 1fr",
                        gap: 12,
                        padding: "16px 24px",
                        borderBottom: "1px solid var(--border)",
                        alignItems: "center",
                        background: isBlackLabel
                          ? "rgba(55,138,221,0.05)"
                          : "transparent",
                      }}
                    >
                      {/* Grade label */}
                      <div>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 500,
                            color: isBlackLabel ? "#fff" : company.color,
                            background: isBlackLabel
                              ? "linear-gradient(135deg, #1a1a1a, #333)"
                              : `${company.color}18`,
                            border: isBlackLabel
                              ? "1px solid rgba(255,255,255,0.2)"
                              : `1px solid ${company.color}33`,
                            padding: "4px 10px",
                            borderRadius: 20,
                            fontFamily: "DM Mono, monospace",
                            marginBottom: 4,
                          }}
                        >
                          {isBlackLabel && (
                            <span style={{ fontSize: 10 }}>◼</span>
                          )}
                          {g.label}
                        </div>
                      </div>

                      {/* Graded value */}
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          fontFamily: "DM Mono, monospace",
                        }}
                      >
                        {fmt(price)}
                      </div>

                      {/* Net profit */}
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 500,
                          color: isWorth ? "#3DAA6E" : "#C94C4C",
                          fontFamily: "DM Mono, monospace",
                        }}
                      >
                        {profit != null
                          ? `${profit >= 0 ? "+" : ""}${fmt(profit)}`
                          : "—"}
                      </div>

                      {/* ROI */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 22,
                            fontWeight: 700,
                            color: isWorth ? "#3DAA6E" : "#C94C4C",
                            fontFamily: "DM Mono, monospace",
                          }}
                        >
                          {roiVal != null
                            ? `${roiVal >= 0 ? "+" : ""}${roiVal}%`
                            : "—"}
                        </span>
                        {roiVal != null && (
                          <span
                            style={{
                              fontSize: 9,
                              padding: "3px 7px",
                              borderRadius: 20,
                              background: isWorth
                                ? "rgba(61,170,110,0.15)"
                                : "rgba(201,76,76,0.15)",
                              color: isWorth ? "#3DAA6E" : "#C94C4C",
                              fontFamily: "DM Mono, monospace",
                              letterSpacing: "0.06em",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {isWorth ? "✓ WORTH IT" : "✗ SKIP"}
                          </span>
                        )}
                      </div>

                      {/* Pop count */}
                      <div>
                        {g.showPop ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <input
                              type='number'
                              value={popCounts[g.key] ?? ""}
                              onChange={(e) => setPop(g.key, e.target.value)}
                              placeholder='—'
                              style={{
                                width: 72,
                                background: "var(--surface-2)",
                                border: "1px solid var(--border)",
                                borderRadius: 6,
                                padding: "5px 8px",
                                fontSize: 12,
                                color: "var(--text-primary)",
                                fontFamily: "DM Mono, monospace",
                                outline: "none",
                                textAlign: "center",
                              }}
                            />
                            {popCounts[g.key] && (
                              <span
                                style={{
                                  fontSize: 10,
                                  color:
                                    parseInt(popCounts[g.key]) < 100
                                      ? "#3DAA6E"
                                      : parseInt(popCounts[g.key]) < 500
                                        ? "#C9A84C"
                                        : "#C94C4C",
                                  fontFamily: "DM Mono, monospace",
                                }}
                              >
                                {parseInt(popCounts[g.key]) < 100
                                  ? "LOW POP"
                                  : parseInt(popCounts[g.key]) < 500
                                    ? "MED POP"
                                    : "HIGH POP"}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span
                            style={{ fontSize: 11, color: "var(--text-dim)" }}
                          >
                            —
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Footer note */}
          <div
            style={{
              padding: "12px 24px",
              fontSize: 11,
              color: "var(--text-dim)",
              lineHeight: 1.7,
              background: "var(--surface-2)",
            }}
          >
            <span style={{ color: "var(--gold)" }}>◼ BGS Black Label</span> is
            the rarest Beckett grade — requires a perfect 10 across all four
            subgrades. Population is typically single digits for most cards. ·{" "}
            Pop count data is manual input — PSA, BGS, and TAG population APIs
            coming in a future update. · Prices sourced from CardMarket graded
            sales data.
          </div>
        </>
      )}
    </div>
  );
}

// ─── Price table ──────────────────────────────────────────────────────────────

function PriceTable({ prices }: { prices: PriceEntry[] }) {
  const sourceLabels: Record<string, string> = {
    tcgplayer: "TCGPlayer",
    cardmarket: "CardMarket",
    justtcg: "JustTCG",
    ebay: "eBay Sold",
  };

  const sourceColors: Record<string, string> = {
    tcgplayer: "#378ADD",
    cardmarket: "#3DAA6E",
    justtcg: "#C9A84C",
    ebay: "#D85A30",
  };

  // Group by source, show raw prices only in this table
  const rawPrices = prices.filter((p) => !p.grade);
  const gradedPrices = prices.filter((p) => p.grade);

  if (rawPrices.length === 0 && gradedPrices.length === 0) {
    return (
      <div
        style={{
          padding: "24px",
          textAlign: "center",
          color: "var(--text-dim)",
          fontSize: 13,
        }}
      >
        No pricing data available yet.
      </div>
    );
  }

  return (
    <div>
      {/* Raw prices */}
      {rawPrices.length > 0 && (
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
            {rawPrices.map((p, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr 1fr 1fr 1fr",
                  gap: 16,
                  padding: "12px 16px",
                  background: "var(--surface-2)",
                  borderRadius:
                    i === 0
                      ? "8px 8px 0 0"
                      : i === rawPrices.length - 1
                        ? "0 0 8px 8px"
                        : 0,
                  border: "1px solid var(--border)",
                  borderTop: i > 0 ? "none" : "1px solid var(--border)",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: sourceColors[p.source] ?? "#8A8FA0",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{ fontSize: 12, color: "var(--text-secondary)" }}
                  >
                    {sourceLabels[p.source] ?? p.source}
                  </span>
                  {p.variant && (
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-dim)",
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      {p.variant}
                    </span>
                  )}
                </div>
                {[
                  { label: "LOW", val: p.lowPrice },
                  { label: "MID", val: p.midPrice },
                  { label: "HIGH", val: p.highPrice },
                  { label: "MARKET", val: p.marketPrice },
                ].map(({ label, val }) => (
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
            ))}
          </div>
        </div>
      )}

      {/* Graded prices */}
      {gradedPrices.length > 0 && (
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
            GRADED PRICES
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {gradedPrices.map((p, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr",
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
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: sourceColors[p.source] ?? "#8A8FA0",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{ fontSize: 12, color: "var(--text-secondary)" }}
                  >
                    {p.grade}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--gold-light)",
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  {fmt(p.marketPrice)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main card detail page ────────────────────────────────────────────────────

export default function CardDetailPage({
  params,
}: {
  params: Promise<{ setId: string; cardId: string }>;
}) {
  const { setId, cardId } = use(params);
  const { card, prices, loading, error } = useCardDetail(cardId);
  const [activeTab, setActiveTab] = useState<"prices" | "grading">("grading");
  const [imageFlipped, setImageFlipped] = useState(false);
  const { activeCollectionId } = useCollections();

  if (loading) {
    return (
      <div
        style={{
          padding: 80,
          textAlign: "center",
          color: "var(--text-dim)",
          fontSize: 13,
        }}
      >
        Loading card...
      </div>
    );
  }

  if (error || !card) {
    return (
      <div
        style={{
          padding: 80,
          textAlign: "center",
          color: "var(--red)",
          fontSize: 13,
        }}
      >
        {error ?? "Card not found"}
      </div>
    );
  }

  const allPrices = [
    ...(prices?.tcgplayer ?? []),
    ...(prices?.cardmarket ?? []),
    ...(prices?.justtcg ?? []),
    ...(prices?.ebay ?? []),
  ];

  // Build raw variant list for QuickAdd (dedupe by variant, prefer TCGPlayer prices)
  const rawVariants: QuickAddVariant[] = (() => {
    const raw = (prices?.tcgplayer ?? []).filter((p) => !p.grade);
    if (raw.length === 0) {
      const fallback = allPrices.find((p) => !p.grade);
      if (fallback)
        return [
          {
            variant: fallback.variant ?? "normal",
            label: fallback.variant ?? "Normal",
            marketPrice: fallback.marketPrice,
          },
        ];
      return [{ variant: "normal", label: "Normal", marketPrice: null }];
    }
    const seen = new Set<string>();
    return raw.reduce<QuickAddVariant[]>((acc, p) => {
      const v = p.variant ?? "normal";
      if (!seen.has(v)) {
        seen.add(v);
        acc.push({ variant: v, label: v, marketPrice: p.marketPrice });
      }
      return acc;
    }, []);
  })();

  const rawPrice =
    prices?.tcgplayer?.find(
      (p) => !p.grade && (p.variant === "holofoil" || p.variant === "normal"),
    )?.marketPrice ??
    prices?.tcgplayer?.[0]?.marketPrice ??
    null;

  const tabs = [
    { key: "grading", label: "Grading Analysis" },
    { key: "prices", label: "All Prices" },
  ] as const;

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
          {card.set.name}
        </Link>
        <span>›</span>
        <span style={{ color: "var(--text-secondary)" }}>{card.name}</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: 32,
          alignItems: "start",
        }}
      >
        {/* Card image */}
        <div>
          <div
            style={{
              position: "relative",
              cursor: "pointer",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              transition: "transform 0.3s ease",
            }}
            onClick={() => setImageFlipped(!imageFlipped)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <Image
              src={card.images.large}
              alt={card.name}
              width={280}
              height={392}
              style={{ width: "100%", height: "auto", display: "block" }}
              priority
            />
          </div>

          {/* Card meta */}
          <div
            style={{
              marginTop: 16,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 16,
            }}
          >
            {[
              { label: "Number", value: `#${card.number}` },
              { label: "Rarity", value: card.rarity ?? "—" },
              { label: "Type", value: card.types?.join(", ") ?? "—" },
              { label: "HP", value: card.hp ?? "—" },
              { label: "Supertype", value: card.supertype ?? "—" },
              { label: "Subtypes", value: card.subtypes?.join(", ") ?? "—" },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "7px 0",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 12,
                }}
              >
                <span style={{ color: "var(--text-dim)" }}>{row.label}</span>
                <span
                  style={{
                    color: "var(--text-secondary)",
                    fontFamily:
                      row.label === "Number" ? "DM Mono, monospace" : "inherit",
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Card title */}
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
              {card.set.name.toUpperCase()} · #{card.number}
            </div>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 500,
                color: "var(--text-primary)",
                marginBottom: 8,
                letterSpacing: "0.02em",
              }}
            >
              {card.name}
            </h1>
            {card.rarity && (
              <div
                style={{
                  display: "inline-block",
                  fontSize: 11,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: "rgba(201,168,76,0.12)",
                  color: "var(--gold)",
                  border: "1px solid rgba(201,168,76,0.3)",
                  fontFamily: "DM Mono, monospace",
                }}
              >
                {card.rarity}
              </div>
            )}
          </div>

          {/* Raw market price hero */}
          {rawPrice && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-dim)",
                    letterSpacing: "0.08em",
                    marginBottom: 4,
                  }}
                >
                  MARKET PRICE (RAW)
                </div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 500,
                    color: "var(--gold)",
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  {fmt(rawPrice)}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-dim)",
                  textAlign: "right",
                }}
              >
                <div>TCGPlayer</div>
                <div style={{ marginTop: 4, fontSize: 10 }}>Market price</div>
              </div>
            </div>
          )}

          {/* Quick Add to Inventory */}
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
                fontSize: 11,
                color: "var(--text-dim)",
                fontFamily: "DM Mono, monospace",
                letterSpacing: "0.08em",
                marginBottom: 4,
              }}
            >
              ADD TO INVENTORY
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginBottom: 8,
              }}
            >
              Raw cards — select variant and quantity
            </div>
            <QuickAddInventory
              cardId={cardId}
              cardName={card.name}
              setId={setId}
              setName={card.set?.name ?? setId}
              cardNumber={card.number}
              imageSmall={card.images?.small ?? null}
              variants={rawVariants}
              collectionId={activeCollectionId}
            />
          </div>

          {/* Tabs */}
          <div>
            <div
              style={{
                display: "flex",
                gap: 0,
                borderBottom: "1px solid var(--border)",
                marginBottom: 20,
              }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: "10px 20px",
                    border: "none",
                    borderBottom: `2px solid ${activeTab === tab.key ? "var(--gold)" : "transparent"}`,
                    background: "transparent",
                    color:
                      activeTab === tab.key
                        ? "var(--text-primary)"
                        : "var(--text-dim)",
                    fontSize: 13,
                    fontWeight: activeTab === tab.key ? 500 : 400,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "color 0.15s ease",
                    marginBottom: -1,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "grading" && (
              <GradingAnalysis
                rawPrice={rawPrice}
                cardmarketPrices={prices?.cardmarket ?? []}
              />
            )}

            {activeTab === "prices" && (
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <PriceTable prices={allPrices} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
