/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useMemo } from "react";
import api from "../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CardVariant {
  variantType: string;
  label: string;
  color: string;
  sortOrder: number;
}

interface SetCard {
  id: string;
  name: string;
  number: string;
  rarity: string | null;
  images: { small: string | null; large: string | null };
  variants: CardVariant[];
}

interface PulledCard {
  cardId: string;
  variantType: string;
  count: number;
}

interface InventoryItem {
  id: string;
  product: { name: string; set_id: string } | null;
}

// ─── Rarity abbreviation ──────────────────────────────────────────────────────

const rarityAbbr = (rarity: string | null) => {
  if (!rarity) return "";
  const map: Record<string, string> = {
    "Special Illustration Rare": "SIR",
    "Hyper Rare": "HR",
    "Illustration Rare": "IR",
    "Ultra Rare": "UR",
    "Double Rare": "RR",
    "Rare Holo": "H",
    Rare: "R",
    Uncommon: "U",
    Common: "C",
    Promo: "P",
  };
  return map[rarity] ?? rarity.charAt(0);
};

const RARITY_ORDER = [
  "Special Illustration Rare",
  "Hyper Rare",
  "Illustration Rare",
  "Ultra Rare",
  "Double Rare",
  "Rare Holo",
  "Rare",
  "Uncommon",
  "Common",
  "Promo",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function OpenProductModal({
  item,
  onClose,
  onOpened,
}: {
  item: InventoryItem;
  onClose: () => void;
  onOpened: () => void;
}) {
  const [cards, setCards] = useState<SetCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [variantStatus, setVariantStatus] = useState<
    "pending" | "ready" | null
  >(null);

  // Pulled cards: key = `${cardId}::${variantType}`, value = count
  const [pulled, setPulled] = useState<Map<string, number>>(new Map());
  const [search, setSearch] = useState("");
  const [filterRarity, setFilterRarity] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setId = item.product?.set_id;

  useEffect(() => {
    if (!setId) return;
    Promise.all([
      api.get<{ data: { status: string } }>(`/variants/sets/${setId}/status`),
      api.get<{ data: SetCard[] }>(`/variants/sets/${setId}/cards`),
    ])
      .then(([statusRes, cardsRes]) => {
        setVariantStatus(statusRes.data.data.status as "pending" | "ready");
        const sorted = (cardsRes.data.data ?? []).sort((a, b) => {
          const ri =
            RARITY_ORDER.indexOf(a.rarity ?? "") -
            RARITY_ORDER.indexOf(b.rarity ?? "");
          if (ri !== 0) return ri;
          return (
            parseInt(a.number) - parseInt(b.number) ||
            a.number.localeCompare(b.number)
          );
        });
        setCards(sorted);
      })
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, [setId]);

  const rarities = useMemo(
    () =>
      [...new Set(cards.map((c) => c.rarity).filter(Boolean))].sort(
        (a, b) => RARITY_ORDER.indexOf(a!) - RARITY_ORDER.indexOf(b!),
      ) as string[],
    [cards],
  );

  const filteredCards = useMemo(
    () =>
      cards.filter((c) => {
        const matchSearch =
          !search ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.number.includes(search);
        const matchRarity = !filterRarity || c.rarity === filterRarity;
        return matchSearch && matchRarity;
      }),
    [cards, search, filterRarity],
  );

  const getCount = (cardId: string, variantType: string) =>
    pulled.get(`${cardId}::${variantType}`) ?? 0;

  const adjust = (cardId: string, variantType: string, delta: number) => {
    const key = `${cardId}::${variantType}`;
    const current = pulled.get(key) ?? 0;
    const next = Math.max(0, current + delta);
    setPulled((prev) => {
      const map = new Map(prev);
      if (next === 0) map.delete(key);
      else map.set(key, next);
      return map;
    });
  };

  const totalPulled = Array.from(pulled.values()).reduce((a, b) => a + b, 0);

  const handleOpen = async () => {
    if (totalPulled === 0) {
      setError("Add at least one pulled card");
      return;
    }
    setSaving(true);
    setError("");

    const pulledCards: {
      cardId: string;
      variantType?: string;
      purchasePrice?: null;
      notes?: null;
    }[] = [];
    for (const [key, count] of pulled.entries()) {
      const [cardId, variantType] = key.split("::");
      for (let i = 0; i < count; i++) {
        pulledCards.push({ cardId, variantType });
      }
    }

    try {
      await api.post(`/inventory/${item.id}/open`, { pulledCards });
      onOpened();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Failed to open product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          maxWidth: 900,
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexShrink: 0,
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
              OPEN PRODUCT
            </div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: "var(--text-primary)",
                marginBottom: 4,
              }}
            >
              {item.product?.name}
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Select cards you pulled. Use + and − to add multiple copies.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-dim)",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        {/* "Coming soon" state */}
        {variantStatus === "pending" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 40,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 20 }}>⏳</div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: "var(--text-primary)",
                marginBottom: 10,
              }}
            >
              Set data is being prepared
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.7,
                maxWidth: 400,
              }}
            >
              Card variants for this set are being configured. Check back soon —
              this usually takes 1–2 days for new releases.
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && variantStatus !== "pending" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-dim)",
              fontSize: 13,
            }}
          >
            Loading set cards...
          </div>
        )}

        {/* Card grid */}
        {!loading && variantStatus === "ready" && (
          <>
            {/* Filters */}
            <div
              style={{
                padding: "12px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
                flexShrink: 0,
              }}
            >
              <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 13,
                    color: "var(--text-dim)",
                  }}
                >
                  ⌕
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder='Search cards...'
                  style={{
                    width: "100%",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 7,
                    padding: "7px 12px 7px 30px",
                    fontSize: 12,
                    color: "var(--text-primary)",
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  onClick={() => setFilterRarity(null)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: `1px solid ${!filterRarity ? "var(--gold)" : "var(--border)"}`,
                    background: !filterRarity
                      ? "rgba(201,168,76,0.1)"
                      : "transparent",
                    color: !filterRarity ? "var(--gold)" : "var(--text-dim)",
                    fontSize: 10,
                    cursor: "pointer",
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  ALL
                </button>
                {rarities.map((r) => (
                  <button
                    key={r}
                    onClick={() =>
                      setFilterRarity(r === filterRarity ? null : r)
                    }
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      border: `1px solid ${filterRarity === r ? "var(--gold)" : "var(--border)"}`,
                      background:
                        filterRarity === r
                          ? "rgba(201,168,76,0.1)"
                          : "transparent",
                      color:
                        filterRarity === r ? "var(--gold)" : "var(--text-dim)",
                      fontSize: 10,
                      cursor: "pointer",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {rarityAbbr(r)}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable card grid */}
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                  gap: 12,
                }}
              >
                {filteredCards.map((card) => {
                  const hasAnyPulled = card.variants.some(
                    (v) => getCount(card.id, v.variantType) > 0,
                  );

                  return (
                    <div
                      key={card.id}
                      style={{
                        background: hasAnyPulled
                          ? "rgba(201,168,76,0.06)"
                          : "var(--surface-2)",
                        border: `1px solid ${hasAnyPulled ? "rgba(201,168,76,0.4)" : "var(--border)"}`,
                        borderRadius: 10,
                        overflow: "hidden",
                        transition: "border-color 0.15s ease",
                      }}
                    >
                      {/* Card image */}
                      <div style={{ position: "relative", padding: 8 }}>
                        {card.images.small ? (
                          <img
                            src={card.images.small}
                            alt={card.name}
                            style={{
                              width: "100%",
                              height: "auto",
                              display: "block",
                              borderRadius: 4,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              aspectRatio: "2.5/3.5",
                              background: "var(--surface)",
                              borderRadius: 4,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--text-dim)",
                              fontSize: 10,
                            }}
                          >
                            {card.name}
                          </div>
                        )}
                        {/* Rarity badge */}
                        <div
                          style={{
                            position: "absolute",
                            top: 12,
                            right: 12,
                            fontSize: 8,
                            fontFamily: "DM Mono, monospace",
                            background: "rgba(0,0,0,0.7)",
                            color: "rgba(255,255,255,0.7)",
                            padding: "1px 4px",
                            borderRadius: 4,
                          }}
                        >
                          {rarityAbbr(card.rarity)}
                        </div>
                      </div>

                      {/* Card name */}
                      <div
                        style={{
                          padding: "0 8px 6px",
                          fontSize: 10,
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          lineHeight: 1.3,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {card.name}
                      </div>

                      {/* Variant +/- controls */}
                      <div
                        style={{
                          padding: "0 6px 8px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        {card.variants.map((variant) => {
                          const count = getCount(card.id, variant.variantType);
                          return (
                            <div
                              key={variant.variantType}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                background:
                                  count > 0
                                    ? `${variant.color}15`
                                    : "var(--surface)",
                                border: `1px solid ${count > 0 ? `${variant.color}44` : "var(--border)"}`,
                                borderRadius: 6,
                                padding: "3px 4px",
                                transition: "all 0.15s ease",
                              }}
                            >
                              {/* Variant dot + label */}
                              <div
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: variant.color,
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  fontSize: 9,
                                  color:
                                    count > 0
                                      ? variant.color
                                      : "var(--text-dim)",
                                  flex: 1,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  fontFamily: "DM Mono, monospace",
                                }}
                              >
                                {variant.label}
                              </span>

                              {/* Count controls */}
                              <button
                                onClick={() =>
                                  adjust(card.id, variant.variantType, -1)
                                }
                                disabled={count === 0}
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: 4,
                                  border: "1px solid var(--border)",
                                  background: "var(--surface)",
                                  color:
                                    count === 0
                                      ? "var(--border)"
                                      : "var(--text-secondary)",
                                  cursor:
                                    count === 0 ? "not-allowed" : "pointer",
                                  fontSize: 14,
                                  lineHeight: 1,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                −
                              </button>
                              <span
                                style={{
                                  fontSize: 11,
                                  minWidth: 14,
                                  textAlign: "center",
                                  color:
                                    count > 0
                                      ? variant.color
                                      : "var(--text-dim)",
                                  fontFamily: "DM Mono, monospace",
                                  fontWeight: count > 0 ? 600 : 400,
                                }}
                              >
                                {count}
                              </span>
                              <button
                                onClick={() =>
                                  adjust(card.id, variant.variantType, 1)
                                }
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: 4,
                                  border: "1px solid var(--border)",
                                  background: "var(--surface)",
                                  color: "var(--text-secondary)",
                                  cursor: "pointer",
                                  fontSize: 14,
                                  lineHeight: 1,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                +
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--surface-2)",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {totalPulled > 0 ? (
              <span>
                <span
                  style={{
                    color: "var(--gold)",
                    fontWeight: 500,
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  {totalPulled}
                </span>{" "}
                card{totalPulled !== 1 ? "s" : ""} selected
              </span>
            ) : (
              <span style={{ color: "var(--text-dim)" }}>
                No cards selected yet
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {error && (
              <span
                style={{ fontSize: 12, color: "#C94C4C", alignSelf: "center" }}
              >
                {error}
              </span>
            )}
            <button
              onClick={onClose}
              style={{
                padding: "8px 18px",
                borderRadius: 7,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleOpen}
              disabled={
                saving || totalPulled === 0 || variantStatus !== "ready"
              }
              style={{
                padding: "8px 20px",
                borderRadius: 7,
                border: "none",
                background:
                  totalPulled > 0 ? "var(--gold)" : "var(--surface-2)",
                color: totalPulled > 0 ? "#0D0E11" : "var(--text-dim)",
                fontSize: 13,
                fontWeight: 500,
                cursor: totalPulled === 0 ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving
                ? "Opening..."
                : `Save ${totalPulled} pull${totalPulled !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
