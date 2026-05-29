"use client";

/**
 * Set detail page — /cards/[setId]
 *
 * Two tabs:
 *   • Cards    — uses useSetGrid (pattern collapse, phantom filter, variant dots)
 *   • Products — uses useSetProducts (sealed booster boxes, ETBs, etc.)
 *
 * Pure render: data comes from hooks, no migrations or transforms inline.
 *
 * Visual style: web's gold/charcoal language. Variant indicators borrow
 * mobile's colored-dot vocabulary (see VariantDots component).
 */

import { useMemo, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { useCollections } from "../../../../context/CollectionContext";
import { useSetGrid, type GridCard } from "../../../../hooks/useSetGrid";
import {
  useSetProducts,
  getProductMarketPrice,
  productTypeLabel,
  type SetProduct,
} from "../../../../hooks/useProducts";
import {
  VariantDots,
  VariantPriceList,
  priceRangeText,
} from "../../../../components/cards/VariantDots";
import QuickAddInventory from "../../../../components/cards/QuickAddInventory";
import type { QuickAddVariant } from "../../../../components/cards/QuickAddInventory";

// ─── Sorting ─────────────────────────────────────────────────────────────────

type SortKey = "number" | "name" | "rarity";
type TabKey = "cards" | "products";

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

/**
 * Sort so STANDARD-NUMBERED cards come first (by leading integer), then
 * non-numbered / prefixed (promos, RC1, GG01) at the end.
 */
function compareCardNumbers(a: string, b: string): number {
  const lead = (n: string): number | null => {
    const m = (n ?? "").trim().match(/^(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  };
  const an = lead(a);
  const bn = lead(b);
  if (an !== null && bn === null) return -1;
  if (an === null && bn !== null) return 1;
  if (an !== null && bn !== null) {
    if (an !== bn) return an - bn;
    return (a ?? "").localeCompare(b ?? "");
  }
  return (a ?? "").localeCompare(b ?? "");
}

const rarityAbbr = (r: string | null | undefined): string => {
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SetPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeCollectionId } = useCollections();

  const { cards, loading, error } = useSetGrid(setId);

  const [activeTab, setActiveTab] = useState<TabKey>(
    searchParams.get("tab") === "products" ? "products" : "cards",
  );
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("number");
  const [filterRarity, setFilterRarity] = useState<string | null>(null);

  // Rarities derived from the grid (code cards already filtered upstream)
  const rarities = useMemo(() => {
    const uniq = Array.from(
      new Set(cards.map((g) => g.card.rarity).filter(Boolean)),
    ) as string[];
    return uniq.sort(
      (a, b) => RARITY_ORDER.indexOf(a) - RARITY_ORDER.indexOf(b),
    );
  }, [cards]);

  const filtered = useMemo(() => {
    return [...cards]
      .filter((g) => {
        const term = search.trim().toLowerCase();
        const matchSearch =
          !term ||
          g.card.name.toLowerCase().includes(term) ||
          g.card.number.includes(term);
        const matchRarity = !filterRarity || g.card.rarity === filterRarity;
        return matchSearch && matchRarity;
      })
      .sort((a, b) => {
        if (sortBy === "number")
          return compareCardNumbers(a.card.number, b.card.number);
        if (sortBy === "name") return a.card.name.localeCompare(b.card.name);
        if (sortBy === "rarity")
          return (
            RARITY_ORDER.indexOf(a.card.rarity ?? "") -
            RARITY_ORDER.indexOf(b.card.rarity ?? "")
          );
        return 0;
      });
  }, [cards, search, filterRarity, sortBy]);

  const setName = cards[0]?.card.set?.name ?? setId;

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
        {[
          {
            key: "cards" as const,
            label: `Cards ${!loading ? `(${cards.length})` : ""}`,
          },
          { key: "products" as const, label: "Sealed Products" },
        ].map((tab) => (
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

      {activeTab === "cards" && (
        <CardsTab
          loading={loading}
          error={error}
          filtered={filtered}
          totalCards={cards.length}
          search={search}
          setSearch={setSearch}
          sortBy={sortBy}
          setSortBy={setSortBy}
          rarities={rarities}
          filterRarity={filterRarity}
          setFilterRarity={setFilterRarity}
          setId={setId}
          setName={setName}
          activeCollectionId={activeCollectionId}
          onCardTap={(g) => router.push(`/cards/${setId}/${g.card.id}`)}
        />
      )}

      {activeTab === "products" && <ProductsTab setId={setId} />}
    </div>
  );
}

// ─── Cards tab ───────────────────────────────────────────────────────────────

function CardsTab({
  loading,
  error,
  filtered,
  totalCards,
  search,
  setSearch,
  sortBy,
  setSortBy,
  rarities,
  filterRarity,
  setFilterRarity,
  setId,
  setName,
  activeCollectionId,
  onCardTap,
}: {
  loading: boolean;
  error: string | null;
  filtered: GridCard[];
  totalCards: number;
  search: string;
  setSearch: (s: string) => void;
  sortBy: SortKey;
  setSortBy: (k: SortKey) => void;
  rarities: string[];
  filterRarity: string | null;
  setFilterRarity: (r: string | null) => void;
  setId: string;
  setName: string;
  activeCollectionId: string | null | undefined;
  onCardTap: (g: GridCard) => void;
}) {
  return (
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
          style={selectStyle}
        >
          <option value='number'>Sort: Number</option>
          <option value='name'>Sort: Name</option>
          <option value='rarity'>Sort: Rarity</option>
        </select>

        {rarities.length > 0 && (
          <select
            value={filterRarity ?? ""}
            onChange={(e) => setFilterRarity(e.target.value || null)}
            style={selectStyle}
          >
            <option value=''>All rarities</option>
            {rarities.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading && <div style={messageStyle}>Loading cards...</div>}
      {error && (
        <div style={{ ...messageStyle, color: "var(--red)" }}>{error}</div>
      )}

      {!loading && !error && filtered.length === 0 && totalCards === 0 && (
        <div style={messageStyle}>
          No cards in this set yet. Run a catalog sync to populate.
        </div>
      )}

      {!loading && !error && filtered.length === 0 && totalCards > 0 && (
        <div style={messageStyle}>No cards match your filters.</div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          {filtered.map((g) => (
            <CardTile
              key={g.card.id}
              gridCard={g}
              setId={setId}
              setName={setName}
              activeCollectionId={activeCollectionId}
              onCardTap={onCardTap}
            />
          ))}
        </div>
      )}
    </>
  );
}

function CardTile({
  gridCard,
  setId,
  setName,
  activeCollectionId,
  onCardTap,
}: {
  gridCard: GridCard;
  setId: string;
  setName: string;
  activeCollectionId: string | null | undefined;
  onCardTap: (g: GridCard) => void;
}) {
  const { card, variants } = gridCard;
  const priceText = priceRangeText(variants);

  // QuickAddInventory's variants prop — never empty
  const qaVariants: QuickAddVariant[] =
    variants.length > 0
      ? variants.map((v) => ({
          variant: v.variant,
          label: v.label,
          marketPrice: v.market,
        }))
      : [{ variant: "normal", label: "Normal", marketPrice: null }];

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 12,
        textAlign: "left",
        transition: "border-color 0.15s ease, transform 0.15s ease",
        fontFamily: "inherit",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor =
          "var(--gold-dim)";
        (e.currentTarget as HTMLDivElement).style.transform =
          "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Image — click to detail */}
      {card.images?.small && (
        <div
          style={{
            borderRadius: 6,
            overflow: "hidden",
            cursor: "pointer",
          }}
          onClick={() => onCardTap(gridCard)}
        >
          <Image
            src={card.images.small}
            alt={card.name}
            width={150}
            height={210}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>
      )}

      {/* Name — click to detail */}
      <div
        onClick={() => onCardTap(gridCard)}
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--text-primary)",
          lineHeight: 1.3,
          cursor: "pointer",
        }}
      >
        {card.name}
      </div>

      {/* Number + rarity */}
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
                    : "var(--text-dim)",
              fontFamily: "DM Mono, monospace",
              letterSpacing: "0.04em",
            }}
          >
            {rarityAbbr(card.rarity)}
          </span>
        )}
      </div>

      {/* Price range + variant dots */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "var(--green)",
            fontWeight: 500,
            fontFamily: "DM Mono, monospace",
          }}
        >
          {priceText}
        </span>
        <VariantDots variants={variants} />
      </div>

      {/* Expanded per-variant prices */}
      {variants.length > 1 && <VariantPriceList variants={variants} />}

      {/* Quick add */}
      <QuickAddInventory
        cardId={card.id}
        cardName={card.name}
        setId={setId}
        setName={card.set?.name ?? setName}
        cardNumber={card.number}
        imageSmall={card.images?.small ?? null}
        variants={qaVariants}
        collectionId={activeCollectionId}
      />
    </div>
  );
}

// ─── Products tab ────────────────────────────────────────────────────────────

function ProductsTab({ setId }: { setId: string }) {
  const router = useRouter();
  const { products, loading, error } = useSetProducts(setId);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);

  const types = useMemo(
    () => Array.from(new Set(products.map((p) => p.product_type))),
    [products],
  );

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const matchSearch =
          !search || p.name.toLowerCase().includes(search.toLowerCase());
        const matchType = !filterType || p.product_type === filterType;
        return matchSearch && matchType;
      }),
    [products, search, filterType],
  );

  if (loading) return <div style={messageStyle}>Loading products...</div>;
  if (error)
    return <div style={{ ...messageStyle, color: "var(--red)" }}>{error}</div>;

  if (products.length === 0) {
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
          Sealed product data for this set hasn&apos;t been synced.
        </div>
      </div>
    );
  }

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

        {types.length > 1 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ProductTypeChip
              label='All'
              active={!filterType}
              onClick={() => setFilterType(null)}
            />
            {types.map((t) => (
              <ProductTypeChip
                key={t}
                label={productTypeLabel(t)}
                active={filterType === t}
                onClick={() => setFilterType(t === filterType ? null : t)}
              />
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {filtered.map((product) => (
          <ProductTile
            key={product.id}
            product={product}
            onClick={() => router.push(`/products/${product.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

function ProductTypeChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 14px",
        borderRadius: 6,
        border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
        background: active ? "rgba(201,168,76,0.12)" : "var(--surface)",
        color: active ? "var(--gold)" : "var(--text-secondary)",
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function ProductTile({
  product,
  onClick,
}: {
  product: SetProduct;
  onClick: () => void;
}) {
  const heroPrice = getProductMarketPrice(product);
  const typeLabel = productTypeLabel(product.product_type);

  return (
    <button
      onClick={onClick}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        padding: 0,
        transition: "border-color 0.15s ease, transform 0.15s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          "var(--gold-dim)";
        (e.currentTarget as HTMLButtonElement).style.transform =
          "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          "var(--border)";
        (e.currentTarget as HTMLButtonElement).style.transform =
          "translateY(0)";
      }}
    >
      <div
        style={{
          height: 160,
          background: "var(--surface-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: "1px solid var(--border)",
          padding: 16,
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
          <div
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              fontFamily: "DM Mono, monospace",
              letterSpacing: "0.06em",
            }}
          >
            {typeLabel.toUpperCase()}
          </div>
        )}
      </div>
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
          {typeLabel.toUpperCase()}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 10,
            lineHeight: 1.4,
            minHeight: 36,
          }}
        >
          {product.name}
        </div>
        {heroPrice != null ? (
          <div
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: "var(--gold)",
              fontFamily: "DM Mono, monospace",
            }}
          >
            ${heroPrice.toFixed(2)}
          </div>
        ) : (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-dim)",
            }}
          >
            Price unavailable
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const messageStyle: React.CSSProperties = {
  textAlign: "center",
  padding: 80,
  color: "var(--text-dim)",
  fontSize: 13,
};

const selectStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "9px 14px",
  fontSize: 12,
  color: "var(--text-secondary)",
  fontFamily: "DM Mono, monospace",
  outline: "none",
  cursor: "pointer",
};
