"use client";
import { useState, use, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

interface ProductPrice {
  source: "tcgplayer" | "cardmarket" | "ebay";
  low_price: number | null;
  mid_price: number | null;
  high_price: number | null;
  market_price: number | null;
  fetched_at: string;
}

interface Product {
  id: string;
  name: string;
  set_id: string;
  product_type: string;
  image_url: string | null;
  product_price_cache: ProductPrice[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (val: number | null) => (val != null ? `$${val.toFixed(2)}` : "—");

const productTypeLabel = (type: string) =>
  type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const rarityAbbr = (rarity: string | null | undefined): string => {
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

const SOURCE_META = {
  tcgplayer: { label: "TCGPlayer", color: "#378ADD" },
  cardmarket: { label: "CardMarket", color: "#3DAA6E" },
  ebay: { label: "eBay Sold", color: "#D85A30" },
} as const;

// ─── Products grid ────────────────────────────────────────────────────────────

function ProductsGrid({ setId }: { setId: string }) {
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

  if (loading) {
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
  }

  if (!products.length) {
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
        <div
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >
          Sealed product data for this set hasn&apos;t been synced yet.
          <br />
          Trigger a product sync from the admin panel to populate this.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Product controls */}
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

        {/* Product type filter */}
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

      <p
        style={{
          fontSize: 13,
          color: "var(--text-secondary)",
          marginBottom: 20,
        }}
      >
        {filtered.length} product{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Products grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {filtered.map((product) => {
          const tcg = product.product_price_cache?.find(
            (p) => p.source === "tcgplayer",
          );
          const cm = product.product_price_cache?.find(
            (p) => p.source === "cardmarket",
          );
          const ebay = product.product_price_cache?.find(
            (p) => p.source === "ebay",
          );
          const hasPrices = tcg || cm || ebay;

          // Best market price for the hero display
          const heroPrice =
            tcg?.market_price ?? cm?.market_price ?? ebay?.market_price ?? null;

          return (
            <div
              key={product.id}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                overflow: "hidden",
                transition: "border-color 0.15s ease, transform 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "var(--gold-dim)";
                (e.currentTarget as HTMLDivElement).style.transform =
                  "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "var(--border)";
                (e.currentTarget as HTMLDivElement).style.transform =
                  "translateY(0)";
              }}
            >
              {/* Product image placeholder */}
              <div
                style={{
                  height: 140,
                  background: "var(--surface-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderBottom: "1px solid var(--border)",
                  position: "relative",
                }}
              >
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    style={{ objectFit: "contain", padding: 16 }}
                  />
                ) : (
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 32,
                        color: "var(--text-dim)",
                        marginBottom: 6,
                      }}
                    >
                      □
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-dim)",
                        fontFamily: "DM Mono, monospace",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {productTypeLabel(product.product_type).toUpperCase()}
                    </div>
                  </div>
                )}
              </div>

              {/* Product info */}
              <div style={{ padding: "16px 18px" }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--gold)",
                    letterSpacing: "0.08em",
                    fontFamily: "DM Mono, monospace",
                    marginBottom: 6,
                  }}
                >
                  {productTypeLabel(product.product_type).toUpperCase()}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    marginBottom: 14,
                    lineHeight: 1.4,
                    minHeight: 36,
                  }}
                >
                  {product.name}
                </div>

                {/* Hero price */}
                {heroPrice && (
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 500,
                      color: "var(--gold)",
                      fontFamily: "DM Mono, monospace",
                      marginBottom: 12,
                    }}
                  >
                    {fmt(heroPrice)}
                  </div>
                )}

                {/* Price breakdown */}
                {hasPrices ? (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {(
                      [
                        { source: "tcgplayer", data: tcg },
                        { source: "cardmarket", data: cm },
                        { source: "ebay", data: ebay },
                      ] as const
                    ).map(({ source, data }) => {
                      const meta = SOURCE_META[source];
                      if (!data) return null;
                      return (
                        <div
                          key={source}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "6px 10px",
                            background: "var(--surface-2)",
                            borderRadius: 6,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <div
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: meta.color,
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                fontSize: 11,
                                color: "var(--text-secondary)",
                              }}
                            >
                              {meta.label}
                            </span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: data.market_price
                                  ? "var(--text-primary)"
                                  : "var(--text-dim)",
                                fontFamily: "DM Mono, monospace",
                              }}
                            >
                              {fmt(data.market_price)}
                            </span>
                            {data.low_price && data.high_price && (
                              <div
                                style={{
                                  fontSize: 10,
                                  color: "var(--text-dim)",
                                  fontFamily: "DM Mono, monospace",
                                }}
                              >
                                {fmt(data.low_price)} – {fmt(data.high_price)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "10px",
                      background: "var(--surface-2)",
                      borderRadius: 6,
                      textAlign: "center",
                      fontSize: 12,
                      color: "var(--text-dim)",
                    }}
                  >
                    Price data pending sync
                  </div>
                )}
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
  const router = useRouter();

  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>(
    searchParams.get("tab") === "products" ? "products" : "cards",
  );

  const rarities = [
    ...new Set(cards.map((c) => c.rarity).filter(Boolean)),
  ].sort((a, b) => RARITY_ORDER.indexOf(a!) - RARITY_ORDER.indexOf(b!));

  const types = [...new Set(cards.flatMap((c) => c.types ?? []))];

  const filtered = cards
    .filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.number.includes(search);
      const matchRarity = !filterRarity || c.rarity === filterRarity;
      const matchType = !filterType || c.types?.includes(filterType);
      return matchSearch && matchRarity && matchType;
    })
    .sort((a, b) => {
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

  const setName = cards[0]?.set?.name ?? setId;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1400, margin: "0 auto" }}>
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
              transition: "color 0.15s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Cards tab ──────────────────────────────────────────────────────── */}
      {activeTab === "cards" && (
        <>
          {/* Controls */}
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
                  <option key={r} value={r!}>
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
                {types.map((t) => (
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
                color: "var(--red)",
                fontSize: 13,
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

          {/* Card grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 12,
            }}
          >
            {filtered.map((card) => (
              <button
                key={card.id}
                onClick={() => router.push(`/cards/${setId}/${card.id}`)}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "border-color 0.15s ease, transform 0.15s ease",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--gold-dim)";
                  e.currentTarget.style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {card.images?.small && (
                  <div
                    style={{
                      marginBottom: 8,
                      borderRadius: 6,
                      overflow: "hidden",
                    }}
                  >
                    <Image
                      src={card.images.small}
                      alt={card.name}
                      width={150}
                      height={210}
                      style={{
                        width: "100%",
                        height: "auto",
                        display: "block",
                      }}
                    />
                  </div>
                )}
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    marginBottom: 3,
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
                        color:
                          card.rarity === "Special Illustration Rare"
                            ? "var(--gold)"
                            : card.rarity === "Hyper Rare"
                              ? "#C9A84C"
                              : card.rarity === "Illustration Rare"
                                ? "#8A8FA0"
                                : "var(--text-dim)",
                        fontFamily: "DM Mono, monospace",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {rarityAbbr(card.rarity)}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Products tab ───────────────────────────────────────────────────── */}
      {activeTab === "products" && <ProductsGrid setId={setId} />}
    </div>
  );
}
