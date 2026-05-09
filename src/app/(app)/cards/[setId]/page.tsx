/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, use, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useSetCards } from "../../../../hooks/useCards";
import api from "../../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

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

type SortKey = "number" | "name" | "rarity";
type TabKey = "cards" | "products";

interface CardVariant {
  variantType: string;
  label: string;
  color: string;
  sortOrder: number;
}

interface VariantPrice {
  variant: string;
  market: number | null;
  source: string;
}

interface ProductPrice {
  source: string;
  market_price: number | null;
}
interface Product {
  id: string;
  name: string;
  set_id: string;
  product_type: string;
  image_url: string | null;
  product_price_cache: ProductPrice[];
}

// Quick-add item in the staging basket
interface BasketItem {
  key: string; // unique: cardId::variantType or productId
  itemType: "raw_card" | "sealed_product";
  cardId?: string;
  productId?: string;
  variantType?: string;
  name: string;
  image: string | null;
  variantLabel?: string;
  variantColor?: string;
  quantity: number;
}

const fmt = (v: number | null) => (v != null ? `$${v.toFixed(2)}` : "—");
const productTypeLabel = (t: string) =>
  t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const rarityAbbr = (r: string | null | undefined) => {
  if (!r) return "";
  const m: Record<string, string> = {
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
  return m[r] ?? r.charAt(0);
};

const TCG_TO_VARIANT: Record<string, string> = {
  normal: "normal",
  reverseHolofoil: "reverse_holo",
  holofoil: "holo",
  "1stEdition": "first_edition",
  unlimited: "normal",
  unlimitedHolofoil: "holo",
};

const getPriceForVariant = (
  variantType: string,
  prices: VariantPrice[],
): number | null => {
  const tcgNames = Object.entries(TCG_TO_VARIANT)
    .filter(([, v]) => v === variantType)
    .map(([k]) => k);
  const match = prices.find(
    (p) => p.source === "tcgplayer" && tcgNames.includes(p.variant),
  );
  return (
    match?.market ??
    prices.find((p) => tcgNames.includes(p.variant))?.market ??
    null
  );
};

// ─── Floating basket bar ──────────────────────────────────────────────────────

function BasketBar({
  items,
  onRemove,
  onChangeQty,
  onClear,
  onSave,
  saving,
}: {
  items: BasketItem[];
  onRemove: (key: string) => void;
  onChangeQty: (key: string, qty: number) => void;
  onClear: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalItems = items.reduce((a, b) => a + b.quantity, 0);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 200,
        width: "min(800px, calc(100vw - 48px))",
        background: "#1C1F27",
        border: "1px solid var(--gold)",
        borderRadius: 16,
        boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
        overflow: "hidden",
      }}
    >
      {/* Expanded list */}
      {expanded && (
        <div
          style={{
            maxHeight: 260,
            overflowY: "auto",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {items.map((item) => (
            <div
              key={item.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 16px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {item.image && (
                <img
                  src={item.image}
                  alt=''
                  style={{
                    width: 24,
                    height: 34,
                    objectFit: "contain",
                    borderRadius: 2,
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
                {item.variantLabel && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 2,
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: item.variantColor,
                      }}
                    />
                    <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
                      {item.variantLabel}
                    </span>
                  </div>
                )}
              </div>
              {/* Qty controls */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  onClick={() => onChangeQty(item.key, item.quantity - 1)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  −
                </button>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    fontFamily: "DM Mono, monospace",
                    minWidth: 20,
                    textAlign: "center",
                  }}
                >
                  {item.quantity}
                </span>
                <button
                  onClick={() => onChangeQty(item.key, item.quantity + 1)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  +
                </button>
              </div>
              <button
                onClick={() => onRemove(item.key)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  fontSize: 16,
                  padding: "0 4px",
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
        }}
      >
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            flex: 1,
            textAlign: "left",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0D0E11" }}>
              {items.length}
            </span>
          </div>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              {totalItems} card{totalItems !== 1 ? "s" : ""} ready to add
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
              {expanded ? "▲ Hide list" : "▼ Review selection"}
            </div>
          </div>
        </button>

        <button
          onClick={onClear}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          Clear all
        </button>

        <button
          onClick={onSave}
          disabled={saving}
          style={{
            padding: "10px 24px",
            borderRadius: 9,
            border: "none",
            background: "var(--gold)",
            color: "#0D0E11",
            fontSize: 13,
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: saving ? 0.7 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {saving ? "Adding..." : `Add to inventory →`}
        </button>
      </div>
    </div>
  );
}

// ─── Card item with quick-add ─────────────────────────────────────────────────

function CardItem({
  card,
  setId,
  variants,
  prices,
  expanded,
  onToggleExpand,
  basket,
  onBasketChange,
}: {
  card: any;
  setId: string;
  variants: CardVariant[];
  prices: VariantPrice[];
  expanded: boolean;
  onToggleExpand: () => void;
  basket: Map<string, number>;
  onBasketChange: (
    key: string,
    name: string,
    image: string | null,
    variantLabel?: string,
    variantColor?: string,
    delta?: number,
    cardId?: string,
    variantType?: string,
  ) => void;
}) {
  const router = useRouter();

  const allPrices = prices
    .map((p) => p.market)
    .filter((p): p is number => p != null);
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : null;
  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : null;
  const hasPrices = minPrice != null;
  const singlePrice = minPrice === maxPrice;
  const priceLabel = hasPrices
    ? singlePrice
      ? fmt(minPrice)
      : `${fmt(minPrice)} – ${fmt(maxPrice)}`
    : null;

  // Total qty of this card (all variants) in basket
  const totalInBasket =
    variants.length > 0
      ? variants.reduce(
          (sum, v) => sum + (basket.get(`${card.id}::${v.variantType}`) ?? 0),
          0,
        )
      : (basket.get(`${card.id}::normal`) ?? 0);

  return (
    <div
      style={{
        background:
          totalInBasket > 0 ? "rgba(201,168,76,0.05)" : "var(--surface)",
        border: `1px solid ${totalInBasket > 0 ? "rgba(201,168,76,0.4)" : "var(--border)"}`,
        borderRadius: 10,
        overflow: "hidden",
        transition: "border-color 0.15s ease, transform 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (totalInBasket === 0) {
          e.currentTarget.style.borderColor = "var(--gold-dim)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }
      }}
      onMouseLeave={(e) => {
        if (totalInBasket === 0) {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      {/* Image */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => router.push(`/cards/${setId}/${card.id}`)}
          style={{
            width: "100%",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 10,
            paddingBottom: 0,
          }}
        >
          {card.images?.small ? (
            <Image
              src={card.images.small}
              alt={card.name}
              width={150}
              height={210}
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                borderRadius: 6,
              }}
            />
          ) : (
            <div
              style={{
                aspectRatio: "2.5/3.5",
                background: "var(--surface-2)",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-dim)",
                fontSize: 11,
              }}
            >
              {card.name}
            </div>
          )}
        </button>

        {/* Total badge if any in basket */}
        {totalInBasket > 0 && (
          <div
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "var(--gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#0D0E11",
                fontFamily: "DM Mono, monospace",
              }}
            >
              {totalInBasket}
            </span>
          </div>
        )}
      </div>

      {/* Name + number */}
      <div style={{ padding: "8px 10px 0" }}>
        <button
          onClick={() => router.push(`/cards/${setId}/${card.id}`)}
          style={{
            width: "100%",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            textAlign: "left",
            padding: 0,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: 2,
              lineHeight: 1.3,
            }}
          >
            {card.name}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: "var(--text-dim)",
                fontFamily: "DM Mono, monospace",
              }}
            >
              #{card.number}
            </span>
            {card.rarity && (
              <span
                style={{
                  fontSize: 9,
                  color: "var(--text-dim)",
                  fontFamily: "DM Mono, monospace",
                }}
              >
                {rarityAbbr(card.rarity)}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Variants with +/- or simple + for no-variant cards */}
      {variants.length > 0 ? (
        <div style={{ padding: "8px 10px 10px" }}>
          {/* Collapse/expand toggle */}
          <button
            onClick={onToggleExpand}
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: "0 0 6px",
              marginBottom: expanded ? 6 : 0,
              borderBottom: expanded ? "1px solid var(--border)" : "none",
            }}
          >
            {!expanded && (
              <>
                <div style={{ display: "flex", gap: 3 }}>
                  {variants.map((v) => (
                    <div
                      key={v.variantType}
                      title={v.label}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: v.color,
                        boxShadow: `0 0 3px ${v.color}66`,
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {priceLabel && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--gold)",
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      {priceLabel}
                    </span>
                  )}
                  <span style={{ fontSize: 9, color: "var(--text-dim)" }}>
                    ▼
                  </span>
                </div>
              </>
            )}
            {expanded && (
              <>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-dim)",
                    fontFamily: "DM Mono, monospace",
                    letterSpacing: "0.06em",
                  }}
                >
                  VARIANTS & PRICES
                </span>
                <span style={{ fontSize: 9, color: "var(--text-dim)" }}>▲</span>
              </>
            )}
          </button>

          {/* Expanded: per-variant rows with +/- */}
          {expanded && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {variants.map((v) => {
                const price = getPriceForVariant(v.variantType, prices);
                const qty = basket.get(`${card.id}::${v.variantType}`) ?? 0;
                return (
                  <div
                    key={v.variantType}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 6px",
                      borderRadius: 6,
                      background: qty > 0 ? `${v.color}15` : `${v.color}08`,
                      border: `1px solid ${qty > 0 ? `${v.color}40` : `${v.color}18`}`,
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: v.color,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 10,
                          color: qty > 0 ? v.color : "var(--text-dim)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {v.label}
                      </div>
                      {price != null && (
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--gold)",
                            fontFamily: "DM Mono, monospace",
                          }}
                        >
                          {fmt(price)}
                        </div>
                      )}
                    </div>
                    {/* +/- controls */}
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 3 }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onBasketChange(
                            `${card.id}::${v.variantType}`,
                            card.name,
                            card.images?.small ?? null,
                            v.label,
                            v.color,
                            -1,
                            card.id,
                            v.variantType,
                          );
                        }}
                        disabled={qty === 0}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 3,
                          border: "1px solid var(--border)",
                          background: "var(--surface)",
                          color:
                            qty === 0
                              ? "var(--border)"
                              : "var(--text-secondary)",
                          cursor: qty === 0 ? "not-allowed" : "pointer",
                          fontSize: 13,
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
                          color: qty > 0 ? v.color : "var(--text-dim)",
                          fontFamily: "DM Mono, monospace",
                          fontWeight: qty > 0 ? 600 : 400,
                        }}
                      >
                        {qty}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onBasketChange(
                            `${card.id}::${v.variantType}`,
                            card.name,
                            card.images?.small ?? null,
                            v.label,
                            v.color,
                            1,
                            card.id,
                            v.variantType,
                          );
                        }}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 3,
                          border: "1px solid var(--border)",
                          background: "var(--surface)",
                          color: "var(--text-secondary)",
                          cursor: "pointer",
                          fontSize: 13,
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* No variants — simple +/- at bottom */
        <div
          style={{
            padding: "6px 10px 10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {priceLabel && (
            <span
              style={{
                fontSize: 11,
                color: "var(--gold)",
                fontFamily: "DM Mono, monospace",
              }}
            >
              {priceLabel}
            </span>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginLeft: "auto",
            }}
          >
            <button
              onClick={() =>
                onBasketChange(
                  `${card.id}::normal`,
                  card.name,
                  card.images?.small ?? null,
                  undefined,
                  undefined,
                  -1,
                  card.id,
                  "normal",
                )
              }
              disabled={(basket.get(`${card.id}::normal`) ?? 0) === 0}
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color:
                  (basket.get(`${card.id}::normal`) ?? 0) === 0
                    ? "var(--border)"
                    : "var(--text-secondary)",
                cursor:
                  (basket.get(`${card.id}::normal`) ?? 0) === 0
                    ? "not-allowed"
                    : "pointer",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              −
            </button>
            <span
              style={{
                fontSize: 12,
                minWidth: 16,
                textAlign: "center",
                fontFamily: "DM Mono, monospace",
                color:
                  (basket.get(`${card.id}::normal`) ?? 0) > 0
                    ? "var(--gold)"
                    : "var(--text-dim)",
                fontWeight:
                  (basket.get(`${card.id}::normal`) ?? 0) > 0 ? 600 : 400,
              }}
            >
              {basket.get(`${card.id}::normal`) ?? 0}
            </span>
            <button
              onClick={() =>
                onBasketChange(
                  `${card.id}::normal`,
                  card.name,
                  card.images?.small ?? null,
                  undefined,
                  undefined,
                  1,
                  card.id,
                  "normal",
                )
              }
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Products grid with quick-add ─────────────────────────────────────────────

function ProductsGrid({
  setId,
  basket,
  onBasketChange,
}: {
  setId: string;
  basket: Map<string, number>;
  onBasketChange: (
    key: string,
    name: string,
    image: string | null,
    variantLabel: undefined,
    variantColor: undefined,
    delta: number,
    cardId: undefined,
    variantType: undefined,
    productId: string,
  ) => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .get<{ data: Product[] }>(`/cards/sealed/${setId}`)
      .then((res) => setProducts(res.data.data ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [setId]);

  const productTypes = [...new Set(products.map((p) => p.product_type))];
  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || p.product_type === filterType;
    return matchSearch && matchType;
  });

  if (loading)
    return (
      <div
        style={{
          textAlign: "center",
          padding: 80,
          color: "var(--text-dim)",
          fontSize: 13,
        }}
      >
        Loading products...
      </div>
    );
  if (!products.length)
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 24px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 16 }}>□</div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 8,
          }}
        >
          No sealed products yet
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Product data hasn&apos;t been synced for this set yet.
        </div>
      </div>
    );

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search products...'
            style={{
              width: "100%",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "9px 14px 9px 36px",
              fontSize: 13,
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
              fontSize: 14,
              color: "var(--text-dim)",
            }}
          >
            ⌕
          </span>
        </div>
        {productTypes.length > 1 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => setFilterType(null)}
              style={{
                padding: "7px 14px",
                borderRadius: 6,
                border: `1px solid ${!filterType ? "var(--gold)" : "var(--border)"}`,
                background: !filterType
                  ? "rgba(201,168,76,0.12)"
                  : "var(--surface)",
                color: !filterType ? "var(--gold)" : "var(--text-secondary)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              All
            </button>
            {productTypes.map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type === filterType ? null : type)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 6,
                  border: `1px solid ${filterType === type ? "var(--gold)" : "var(--border)"}`,
                  background:
                    filterType === type
                      ? "rgba(201,168,76,0.12)"
                      : "var(--surface)",
                  color:
                    filterType === type
                      ? "var(--gold)"
                      : "var(--text-secondary)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                }}
              >
                {productTypeLabel(type)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        {filtered.map((product) => {
          const tcg = product.product_price_cache?.find(
            (p) => p.source === "tcgplayer",
          );
          const heroPrice = tcg?.market_price ?? null;
          const qty = basket.get(`product::${product.id}`) ?? 0;

          return (
            <div
              key={product.id}
              style={{
                background:
                  qty > 0 ? "rgba(201,168,76,0.05)" : "var(--surface)",
                border: `1px solid ${qty > 0 ? "rgba(201,168,76,0.4)" : "var(--border)"}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: 130,
                  background: "var(--surface-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    style={{
                      maxHeight: 120,
                      maxWidth: "90%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <div style={{ fontSize: 28, color: "var(--text-dim)" }}>
                    □
                  </div>
                )}
                {qty > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "var(--gold)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#0D0E11",
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      {qty}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ padding: "12px 14px" }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--gold)",
                    letterSpacing: "0.08em",
                    fontFamily: "DM Mono, monospace",
                    marginBottom: 3,
                  }}
                >
                  {productTypeLabel(product.product_type).toUpperCase()}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    marginBottom: 8,
                    lineHeight: 1.3,
                  }}
                >
                  {product.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  {heroPrice != null && (
                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--gold)",
                        fontFamily: "DM Mono, monospace",
                        fontWeight: 500,
                      }}
                    >
                      {fmt(heroPrice)}
                    </span>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      marginLeft: "auto",
                    }}
                  >
                    <button
                      onClick={() =>
                        onBasketChange(
                          `product::${product.id}`,
                          product.name,
                          product.image_url,
                          undefined,
                          undefined,
                          -1,
                          undefined,
                          undefined,
                          product.id,
                        )
                      }
                      disabled={qty === 0}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 4,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        color:
                          qty === 0 ? "var(--border)" : "var(--text-secondary)",
                        cursor: qty === 0 ? "not-allowed" : "pointer",
                        fontSize: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      −
                    </button>
                    <span
                      style={{
                        fontSize: 13,
                        minWidth: 18,
                        textAlign: "center",
                        fontFamily: "DM Mono, monospace",
                        color: qty > 0 ? "var(--gold)" : "var(--text-dim)",
                        fontWeight: qty > 0 ? 600 : 400,
                      }}
                    >
                      {qty}
                    </span>
                    <button
                      onClick={() =>
                        onBasketChange(
                          `product::${product.id}`,
                          product.name,
                          product.image_url,
                          undefined,
                          undefined,
                          1,
                          undefined,
                          undefined,
                          product.id,
                        )
                      }
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 4,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                        fontSize: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SetPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = use(params);
  const { cards, loading, error } = useSetCards(setId);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("number");
  const [filterRarity, setFilterRarity] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("cards");

  // Variants + prices
  const [cardVariants, setCardVariants] = useState<Map<string, CardVariant[]>>(
    new Map(),
  );
  const [variantStatus, setVariantStatus] = useState<
    "pending" | "ready" | null
  >(null);
  const [cardPrices, setCardPrices] = useState<Map<string, VariantPrice[]>>(
    new Map(),
  );
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  // Basket: key → BasketItem
  const [basket, setBasket] = useState<Map<string, BasketItem>>(new Map());
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load variants
  useEffect(() => {
    api
      .get<{ data: { status: string } }>(`/variants/sets/${setId}/status`)
      .then((res) =>
        setVariantStatus(res.data.data.status as "pending" | "ready"),
      )
      .catch(() => setVariantStatus(null));
  }, [setId]);

  useEffect(() => {
    if (variantStatus !== "ready") return;
    api
      .get<{ data: any[] }>(`/variants/sets/${setId}/cards`)
      .then((res) => {
        const map = new Map<string, CardVariant[]>();
        for (const card of res.data.data ?? []) {
          if (card.variants?.length) map.set(card.id, card.variants);
        }
        setCardVariants(map);
      })
      .catch(() => {});
  }, [setId, variantStatus]);

  // Load prices
  useEffect(() => {
    api
      .get<{ data: Record<string, VariantPrice[]> }>(
        `/cards/sets/${setId}/prices`,
      )
      .then((res) => {
        const map = new Map<string, VariantPrice[]>();
        for (const [id, prices] of Object.entries(res.data.data ?? {}))
          map.set(id, prices);
        setCardPrices(map);
      })
      .catch(() => {});
  }, [setId]);

  // Basket helpers
  // quantityMap: just key → qty for passing to CardItem/ProductsGrid
  const quantityMap = new Map<string, number>(
    Array.from(basket.entries()).map(([k, v]) => [k, v.quantity]),
  );

  const handleBasketChange = useCallback(
    (
      key: string,
      name: string,
      image: string | null,
      variantLabel?: string,
      variantColor?: string,
      delta = 1,
      cardId?: string,
      variantType?: string,
      productId?: string,
    ) => {
      setBasket((prev) => {
        const next = new Map(prev);
        const current = next.get(key);
        const newQty = (current?.quantity ?? 0) + delta;

        if (newQty <= 0) {
          next.delete(key);
        } else {
          next.set(key, {
            key,
            itemType: productId ? "sealed_product" : "raw_card",
            cardId: cardId ?? undefined,
            productId: productId ?? undefined,
            variantType: variantType ?? undefined,
            name,
            image,
            variantLabel,
            variantColor,
            quantity: newQty,
          });
        }
        return next;
      });
    },
    [],
  );

  const handleSave = async () => {
    if (basket.size === 0) return;
    setSaving(true);
    try {
      const items = Array.from(basket.values()).map((item) => ({
        itemType: item.itemType,
        cardId: item.cardId ?? null,
        productId: item.productId ?? null,
        variantType: item.variantType ?? null,
        quantity: item.quantity,
        isSealed: item.itemType === "sealed_product" ? true : null,
      }));

      await api.post("/inventory/batch", { items });
      setSaveSuccess(true);
      setBasket(new Map());
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("[SetPage] Batch add failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const toggleCard = useCallback((cardId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }, []);

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedCards(new Set());
      setAllExpanded(false);
    } else {
      setExpandedCards(new Set(filtered.map((c: any) => c.id)));
      setAllExpanded(true);
    }
  };

  const rarities = [
    ...new Set(cards.map((c: any) => c.rarity).filter(Boolean)),
  ].sort(
    (a: any, b: any) => RARITY_ORDER.indexOf(a) - RARITY_ORDER.indexOf(b),
  ) as string[];
  const types = [...new Set(cards.flatMap((c: any) => c.types ?? []))];

  const filtered = cards
    .filter((c: any) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.number.includes(search);
      const matchRarity = !filterRarity || c.rarity === filterRarity;
      const matchType = !filterType || c.types?.includes(filterType);
      return matchSearch && matchRarity && matchType;
    })
    .sort((a: any, b: any) => {
      if (sortBy === "number")
        return (
          parseInt(a.number) - parseInt(b.number) ||
          a.number.localeCompare(b.number)
        );
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "rarity")
        return (
          RARITY_ORDER.indexOf(a.rarity ?? "") -
          RARITY_ORDER.indexOf(b.rarity ?? "")
        );
      return 0;
    });

  const setName = (cards[0] as any)?.set?.name ?? setId;
  const basketItems = Array.from(basket.values());

  return (
    <div
      style={{
        padding: "32px 40px",
        maxWidth: 1400,
        margin: "0 auto",
        paddingBottom: basket.size > 0 ? 120 : 40,
      }}
    >
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
        <span style={{ color: "var(--text-secondary)" }}>{setName}</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 11,
            color: "var(--gold)",
            letterSpacing: "0.1em",
            fontFamily: "DM Mono, monospace",
            marginBottom: 8,
          }}
        >
          {setName.toUpperCase()}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 500,
                color: "var(--text-primary)",
                marginBottom: 4,
              }}
            >
              {activeTab === "cards" ? "Card Browser" : "Sealed Products"}
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {activeTab === "cards"
                ? loading
                  ? "Loading..."
                  : `${filtered.length} of ${cards.length} cards`
                : "Booster boxes, ETBs, tins, bundles, and more"}
            </p>
          </div>
          {saveSuccess && (
            <div
              style={{
                background: "rgba(61,170,110,0.15)",
                border: "1px solid rgba(61,170,110,0.4)",
                borderRadius: 10,
                padding: "8px 16px",
                fontSize: 13,
                color: "#3DAA6E",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              ✓ Added to inventory
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--border)",
          marginBottom: 28,
        }}
      >
        {(
          [
            {
              key: "cards",
              label: `Cards ${!loading ? `(${cards.length})` : ""}`,
            },
            { key: "products", label: "Sealed Products" },
          ] as { key: TabKey; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 24px",
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
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "cards" && (
        <>
          {variantStatus === "pending" && (
            <div
              style={{
                background: "rgba(201,168,76,0.06)",
                border: "1px solid rgba(201,168,76,0.2)",
                borderRadius: 10,
                padding: "12px 18px",
                marginBottom: 20,
                fontSize: 12,
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 16 }}>⏳</span>
              Variant data for this set is being prepared. Variants and
              per-variant prices will appear once ready.
            </div>
          )}

          {variantStatus === "ready" && cardVariants.size > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              {/* Variant legend */}
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  flexWrap: "wrap",
                  alignItems: "center",
                  fontSize: 11,
                  color: "var(--text-dim)",
                }}
              >
                {[
                  { color: "#6B7280", label: "Normal" },
                  { color: "#A78BFA", label: "Reverse Holo" },
                  { color: "#F59E0B", label: "Holofoil" },
                  { color: "#EF4444", label: "Poké Ball" },
                  { color: "#8B5CF6", label: "Master Ball" },
                ].map((v) => (
                  <div
                    key={v.label}
                    style={{ display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: v.color,
                        boxShadow: `0 0 4px ${v.color}66`,
                      }}
                    />
                    {v.label}
                  </div>
                ))}
              </div>

              {/* Standalone expand/collapse toggle */}
              <button
                onClick={toggleAll}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 20px",
                  borderRadius: 9,
                  border: `1px solid ${allExpanded ? "var(--gold)" : "var(--border)"}`,
                  background: allExpanded
                    ? "rgba(201,168,76,0.1)"
                    : "var(--surface)",
                  color: allExpanded ? "var(--gold)" : "var(--text-secondary)",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: 11 }}>{allExpanded ? "▲" : "▼"}</span>
                {allExpanded
                  ? "Collapse variant prices"
                  : "Expand variant prices"}
              </button>
            </div>
          )}

          {/* Controls */}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 24,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Search by name or number...'
                style={{
                  width: "100%",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "9px 14px 9px 36px",
                  fontSize: 13,
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
                  fontSize: 14,
                  color: "var(--text-dim)",
                }}
              >
                ⌕
              </span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "9px 14px",
                fontSize: 12,
                color: "var(--text-secondary)",
                fontFamily: "DM Mono, monospace",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value='number'>Sort: Number</option>
              <option value='name'>Sort: Name</option>
              <option value='rarity'>Sort: Rarity</option>
            </select>
            {rarities.length > 0 && (
              <select
                value={filterRarity ?? ""}
                onChange={(e) => setFilterRarity(e.target.value || null)}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "9px 14px",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  fontFamily: "inherit",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value=''>All rarities</option>
                {rarities.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
            {types.length > 0 && (
              <select
                value={filterType ?? ""}
                onChange={(e) => setFilterType(e.target.value || null)}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "9px 14px",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  fontFamily: "inherit",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value=''>All types</option>
                {(types as string[]).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </div>

          {loading && (
            <div
              style={{
                textAlign: "center",
                padding: 80,
                color: "var(--text-dim)",
                fontSize: 13,
              }}
            >
              Loading cards...
            </div>
          )}
          {error && (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                fontSize: 13,
                color: "#C94C4C",
              }}
            >
              {error}
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 60,
                color: "var(--text-dim)",
                fontSize: 13,
              }}
            >
              No cards match your filters.
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: 12,
                alignItems: "start",
              }}
            >
              {filtered.map((card: any) => (
                <CardItem
                  key={card.id}
                  card={card}
                  setId={setId}
                  variants={cardVariants.get(card.id) ?? []}
                  prices={cardPrices.get(card.id) ?? []}
                  expanded={expandedCards.has(card.id)}
                  onToggleExpand={() => toggleCard(card.id)}
                  basket={quantityMap}
                  onBasketChange={handleBasketChange}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "products" && (
        <ProductsGrid
          setId={setId}
          basket={quantityMap}
          onBasketChange={handleBasketChange as any}
        />
      )}

      {/* Floating basket bar */}
      {basketItems.length > 0 && (
        <BasketBar
          items={basketItems}
          onRemove={(key) =>
            setBasket((prev) => {
              const next = new Map(prev);
              next.delete(key);
              return next;
            })
          }
          onChangeQty={(key, qty) => {
            setBasket((prev) => {
              const next = new Map(prev);
              const item = next.get(key);
              if (!item) return prev;
              if (qty <= 0) next.delete(key);
              else next.set(key, { ...item, quantity: qty });
              return next;
            });
          }}
          onClear={() => setBasket(new Map())}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}
