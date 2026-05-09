/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, use, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCardDetail } from "../../../../../hooks/useCards";
import api from "../../../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CardVariant {
  variantType: string;
  label: string;
  color: string;
  sortOrder: number;
}

type GradingTab = "psa" | "bgs" | "cgc" | "sgc" | "tag";
type PageTab = "grading" | "prices";

const COMPANY_COLORS: Record<string, string> = {
  psa: "#C9A84C",
  bgs: "#378ADD",
  cgc: "#3DAA6E",
  sgc: "#7F77DD",
  tag: "#D85A30",
};

const RARITY_COLORS: Record<string, string> = {
  "Special Illustration Rare": "#C9A84C",
  "Hyper Rare": "#A78BFA",
  "Illustration Rare": "#8A8FA0",
  "Ultra Rare": "#378ADD",
  "Double Rare": "#64748B",
};

const fmt = (v: number | null | undefined) =>
  v != null ? `$${v.toFixed(2)}` : "—";

const fmtGain = (v: number | null | undefined) =>
  v != null ? `${v >= 0 ? "+" : ""}$${Math.abs(v).toFixed(2)}` : "—";

const gainColor = (v: number | null | undefined) =>
  v == null ? "var(--text-dim)" : v >= 0 ? "#3DAA6E" : "#C94C4C";

// ─── Grade configs ─────────────────────────────────────────────────────────

const GRADING_GRADES: Record<GradingTab, { grade: string; label: string }[]> = {
  psa: [
    { grade: "10", label: "PSA 10 Gem Mint" },
    { grade: "9", label: "PSA 9 Mint" },
  ],
  bgs: [
    { grade: "Black Label", label: "BGS Black Label" },
    { grade: "10", label: "BGS 10 Pristine" },
    { grade: "9.5", label: "BGS 9.5 Gem Mint" },
  ],
  cgc: [
    { grade: "Pristine 10", label: "CGC Pristine 10" },
    { grade: "10", label: "CGC 10" },
    { grade: "9.5", label: "CGC 9.5" },
  ],
  sgc: [
    { grade: "10", label: "SGC 10 Gem Mint" },
    { grade: "9.5", label: "SGC 9.5" },
  ],
  tag: [
    { grade: "Pristine 10", label: "TAG Pristine 10" },
    { grade: "10", label: "TAG 10 Gem Mint" },
  ],
};

// ─── Variant badge ────────────────────────────────────────────────────────────

function VariantBadge({ variant }: { variant: CardVariant }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 20,
        border: `1px solid ${variant.color}44`,
        background: `${variant.color}12`,
      }}
    >
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: variant.color,
          boxShadow: `0 0 4px ${variant.color}88`,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 11,
          color: variant.color,
          fontFamily: "DM Mono, monospace",
          letterSpacing: "0.04em",
        }}
      >
        {variant.label}
      </span>
    </div>
  );
}

// ─── Grading ROI row ──────────────────────────────────────────────────────────

function GradeRow({
  label,
  gradedPrice,
  rawPrice,
  gradingCost,
  color,
}: {
  label: string;
  gradedPrice: number | null;
  rawPrice: number | null;
  gradingCost: number;
  color: string;
}) {
  const roi =
    gradedPrice != null && rawPrice != null
      ? gradedPrice - rawPrice - gradingCost
      : null;
  const roiPct =
    roi != null && (rawPrice ?? 0) + gradingCost > 0
      ? (roi / ((rawPrice ?? 0) + gradingCost)) * 100
      : null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{ width: 3, height: 28, borderRadius: 2, background: color }}
        />
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-primary)",
            }}
          >
            {label}
          </div>
          {gradedPrice != null && (
            <div
              style={{
                fontSize: 10,
                color: "var(--text-dim)",
                fontFamily: "DM Mono, monospace",
              }}
            >
              Graded: {fmt(gradedPrice)}
            </div>
          )}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        {roi != null ? (
          <>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: gainColor(roi),
                fontFamily: "DM Mono, monospace",
              }}
            >
              {fmtGain(roi)}
            </div>
            {roiPct != null && (
              <div style={{ fontSize: 10, color: gainColor(roiPct) }}>
                {roiPct >= 0 ? "+" : ""}
                {roiPct.toFixed(1)}% ROI
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>No data</div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CardDetailPage({
  params,
}: {
  params: Promise<{ setId: string; cardId: string }>;
}) {
  const { setId, cardId } = use(params);
  const { card, prices, loading, error } = useCardDetail(cardId);

  const [pageTab, setPageTab] = useState<PageTab>("grading");
  const [gradingTab, setGradingTab] = useState<GradingTab>("psa");
  const [gradingCost, setGradingCost] = useState(24.99);
  const [variants, setVariants] = useState<CardVariant[]>([]);
  const [variantStatus, setVariantStatus] = useState<
    "loading" | "ready" | "pending" | "none"
  >("loading");

  // Load card variants
  useEffect(() => {
    if (!setId) return;
    api
      .get<{ data: any[] }>(`/variants/sets/${setId}/cards`)
      .then((res) => {
        const cardData = (res.data.data ?? []).find(
          (c: any) => c.id === cardId,
        );
        if (cardData?.variants?.length) {
          setVariants(cardData.variants);
          setVariantStatus("ready");
        } else {
          // Check set status
          api
            .get<{ data: { status: string } }>(`/variants/sets/${setId}/status`)
            .then((statusRes) => {
              setVariantStatus(
                statusRes.data.data.status === "ready" ? "none" : "pending",
              );
            })
            .catch(() => setVariantStatus("none"));
        }
      })
      .catch(() => setVariantStatus("none"));
  }, [setId, cardId]);

  if (loading)
    return (
      <div
        style={{
          padding: "60px 40px",
          textAlign: "center",
          color: "var(--text-dim)",
          fontSize: 13,
        }}
      >
        Loading card...
      </div>
    );

  if (error || !card)
    return (
      <div
        style={{
          padding: "60px 40px",
          textAlign: "center",
          color: "var(--red)",
          fontSize: 13,
        }}
      >
        {error ?? "Card not found"}
      </div>
    );

  const rawEntry = prices?.tcgplayer?.find((p) => !p.grade);
  const rawPrice =
    rawEntry?.prices?.market ??
    rawEntry?.marketPrice ??
    prices?.tcgplayer?.[0]?.prices?.market ??
    prices?.tcgplayer?.[0]?.marketPrice ??
    null;

  // Get graded prices for current company
  const getGradedPrice = (company: string, grade: string): number | null => {
    const gradeKey = grade.toLowerCase().replace(/\s+/g, "_");
    return (
      prices?.tcgplayer?.find(
        (p) => p.grade?.toLowerCase().replace(/\s+/g, "_") === gradeKey,
      )?.prices?.market ?? null
    );
  };

  return (
    <div style={{ padding: "28px 36px", maxWidth: 1200, margin: "0 auto" }}>
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: 32,
          alignItems: "start",
        }}
      >
        {/* ── Left column ── */}
        <div>
          {/* Card image */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            {card.images?.large ? (
              <Image
                src={card.images.large}
                alt={card.name}
                width={300}
                height={420}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            ) : (
              <div
                style={{
                  height: 420,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-dim)",
                  fontSize: 13,
                }}
              >
                No image
              </div>
            )}
          </div>

          {/* Card metadata */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            {[
              { label: "Number", value: `#${card.number}` },
              { label: "Rarity", value: card.rarity },
              { label: "Type", value: card.types?.join(", ") },
              { label: "HP", value: card.hp },
              { label: "Supertype", value: card.supertype },
              { label: "Subtypes", value: card.subtypes?.join(", ") },
            ]
              .filter((r) => r.value)
              .map((row, i, arr) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 16px",
                    borderBottom:
                      i < arr.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
                    {row.label}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color:
                        row.label === "Rarity"
                          ? (RARITY_COLORS[row.value!] ??
                            "var(--text-secondary)")
                          : "var(--text-secondary)",
                      fontWeight: row.label === "Rarity" ? 500 : 400,
                      textAlign: "right",
                      maxWidth: 160,
                    }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
          </div>

          {/* Variants section */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "10px 16px",
                borderBottom: "1px solid var(--border)",
                background: "var(--surface-2)",
                fontSize: 10,
                color: "var(--text-dim)",
                letterSpacing: "0.08em",
                fontFamily: "DM Mono, monospace",
              }}
            >
              VARIANTS
            </div>
            <div style={{ padding: "14px 16px" }}>
              {variantStatus === "loading" && (
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                  Loading...
                </div>
              )}
              {variantStatus === "pending" && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  <span style={{ color: "var(--gold)" }}>⏳ </span>
                  Variant data for this set is being prepared. Check back soon.
                </div>
              )}
              {variantStatus === "none" && (
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                  No variant data available
                </div>
              )}
              {variantStatus === "ready" && variants.length > 0 && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {variants.map((v) => (
                    <VariantBadge key={v.variantType} variant={v} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div>
          {/* Card header */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 11,
                color: "var(--gold)",
                letterSpacing: "0.1em",
                fontFamily: "DM Mono, monospace",
                marginBottom: 6,
              }}
            >
              {card.set?.name?.toUpperCase()} · #{card.number}
            </div>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 500,
                color: "var(--text-primary)",
                marginBottom: 10,
              }}
            >
              {card.name}
            </h1>
            {card.rarity && (
              <span
                style={{
                  display: "inline-block",
                  fontSize: 12,
                  padding: "4px 12px",
                  borderRadius: 20,
                  border: `1px solid ${RARITY_COLORS[card.rarity] ?? "var(--border)"}44`,
                  background: `${RARITY_COLORS[card.rarity] ?? "transparent"}11`,
                  color: RARITY_COLORS[card.rarity] ?? "var(--text-secondary)",
                }}
              >
                {card.rarity}
              </span>
            )}
          </div>

          {/* Page tabs */}
          <div
            style={{
              display: "flex",
              gap: 0,
              borderBottom: "1px solid var(--border)",
              marginBottom: 24,
            }}
          >
            {(
              [
                { key: "grading", label: "Grading Analysis" },
                { key: "prices", label: "All Prices" },
              ] as { key: PageTab; label: string }[]
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setPageTab(tab.key)}
                style={{
                  padding: "10px 24px",
                  border: "none",
                  borderBottom: `2px solid ${pageTab === tab.key ? "var(--gold)" : "transparent"}`,
                  background: "transparent",
                  color:
                    pageTab === tab.key
                      ? "var(--text-primary)"
                      : "var(--text-dim)",
                  fontSize: 13,
                  fontWeight: pageTab === tab.key ? 500 : 400,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Grading Analysis tab ── */}
          {pageTab === "grading" && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              {/* Header with grading cost */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 24px",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--surface-2)",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 10,
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
                      fontSize: 14,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                    }}
                  >
                    Is it worth grading?
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-dim)",
                      marginBottom: 6,
                    }}
                  >
                    GRADING COST
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span
                      style={{ fontSize: 13, color: "var(--text-secondary)" }}
                    >
                      $
                    </span>
                    <input
                      type='number'
                      min={0}
                      step={0.01}
                      value={gradingCost}
                      onChange={(e) => setGradingCost(Number(e.target.value))}
                      style={{
                        width: 70,
                        background: "var(--surface)",
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
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-dim)",
                      marginTop: 4,
                    }}
                  >
                    Total in: {fmt((rawPrice ?? 0) + gradingCost)}
                  </div>
                </div>
              </div>

              {/* Raw value */}
              <div
                style={{
                  padding: "14px 24px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
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
                      fontSize: 20,
                      fontWeight: 600,
                      color: rawPrice
                        ? "var(--text-primary)"
                        : "var(--text-dim)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {rawPrice ? fmt(rawPrice) : "—"}
                  </div>
                </div>
                <div
                  style={{
                    textAlign: "right",
                    fontSize: 11,
                    color: "var(--text-dim)",
                  }}
                >
                  <div>TCGPlayer market price</div>
                  <div>Grading cost: {fmt(gradingCost)}</div>
                </div>
              </div>

              {/* Company tabs */}
              <div
                style={{
                  display: "flex",
                  gap: 0,
                  borderBottom: "1px solid var(--border)",
                  padding: "0 24px",
                }}
              >
                {(Object.keys(GRADING_GRADES) as GradingTab[]).map((co) => (
                  <button
                    key={co}
                    onClick={() => setGradingTab(co)}
                    style={{
                      padding: "10px 16px",
                      border: "none",
                      borderBottom: `2px solid ${gradingTab === co ? COMPANY_COLORS[co] : "transparent"}`,
                      background: "transparent",
                      color:
                        gradingTab === co
                          ? COMPANY_COLORS[co]
                          : "var(--text-dim)",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "DM Mono, monospace",
                      marginBottom: -1,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {co.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Grade rows */}
              <div style={{ padding: "0 24px 8px" }}>
                {GRADING_GRADES[gradingTab].map((g) => (
                  <GradeRow
                    key={g.grade}
                    label={g.label}
                    gradedPrice={getGradedPrice(gradingTab, g.grade)}
                    rawPrice={rawPrice}
                    gradingCost={gradingCost}
                    color={COMPANY_COLORS[gradingTab]}
                  />
                ))}
                {GRADING_GRADES[gradingTab].every(
                  (g) => getGradedPrice(gradingTab, g.grade) === null,
                ) && (
                  <div
                    style={{
                      padding: "20px 0",
                      textAlign: "center",
                      fontSize: 12,
                      color: "var(--text-dim)",
                    }}
                  >
                    Graded price data not available for this card yet
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── All Prices tab ── */}
          {pageTab === "prices" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* TCGPlayer */}
              {prices?.tcgplayer && (
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
                      padding: "12px 20px",
                      borderBottom: "1px solid var(--border)",
                      background: "var(--surface-2)",
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
                        background: "#378ADD",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-dim)",
                        letterSpacing: "0.08em",
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      TCGPLAYER
                    </span>
                  </div>
                  {prices.tcgplayer.map((p: any, i: number) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 20px",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-primary)",
                            fontWeight: 500,
                          }}
                        >
                          {p.variant ?? "Normal"}
                          {p.grade ? ` — ${p.grade}` : ""}
                        </div>
                        {p.prices?.low != null && (
                          <div
                            style={{
                              fontSize: 10,
                              color: "var(--text-dim)",
                              fontFamily: "DM Mono, monospace",
                            }}
                          >
                            Low: {fmt(p.prices.low)} · High:{" "}
                            {fmt(p.prices.high)}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: "var(--gold)",
                          fontFamily: "DM Mono, monospace",
                        }}
                      >
                        {fmt(p.prices?.market)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* CardMarket */}
              {prices?.cardmarket && prices.cardmarket.length > 0 && (
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
                      padding: "12px 20px",
                      borderBottom: "1px solid var(--border)",
                      background: "var(--surface-2)",
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
                        background: "#3DAA6E",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-dim)",
                        letterSpacing: "0.08em",
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      CARDMARKET
                    </span>
                  </div>
                  {prices.cardmarket.map((p: any, i: number) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 20px",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-primary)",
                            fontWeight: 500,
                          }}
                        >
                          {p.grade ? `Graded — ${p.grade}` : "Near Mint"}
                        </div>
                        {p.prices?.avg30 != null && (
                          <div
                            style={{
                              fontSize: 10,
                              color: "var(--text-dim)",
                              fontFamily: "DM Mono, monospace",
                            }}
                          >
                            30-day avg: {fmt(p.prices.avg30)}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: "#3DAA6E",
                          fontFamily: "DM Mono, monospace",
                        }}
                      >
                        {fmt(p.prices?.trend ?? p.prices?.market)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* eBay */}
              {prices?.ebay && prices.ebay.length > 0 && (
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
                      padding: "12px 20px",
                      borderBottom: "1px solid var(--border)",
                      background: "var(--surface-2)",
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
                        background: "#D85A30",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-dim)",
                        letterSpacing: "0.08em",
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      EBAY SOLD
                    </span>
                  </div>
                  {prices.ebay.map((p: any, i: number) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 20px",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-primary)",
                            fontWeight: 500,
                          }}
                        >
                          {p.grade
                            ? `${p.source?.toUpperCase()} ${p.grade}`
                            : "Raw"}
                        </div>
                        {p.prices?.count != null && (
                          <div
                            style={{ fontSize: 10, color: "var(--text-dim)" }}
                          >
                            {p.prices.count} recent sales
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: "#D85A30",
                          fontFamily: "DM Mono, monospace",
                        }}
                      >
                        {fmt(p.prices?.median ?? p.prices?.market)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No price data */}
              {(!prices ||
                Object.values(prices).every((arr: any) => !arr?.length)) && (
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: "40px 24px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
                    Price data not available for this card yet
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-dim)",
                      marginTop: 6,
                    }}
                  >
                    Prices sync every 48 hours
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
