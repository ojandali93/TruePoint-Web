"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import api from "../../lib/api";
import { ROUTES } from "../../constants/routes";

interface SearchSet {
  id: string;
  name: string;
  series: string;
  symbol_url: string | null;
  logo_url: string | null;
}

interface SearchCard {
  id: string;
  name: string;
  number: string;
  rarity: string | null;
  set_id: string;
  image_small: string | null;
}

interface SearchProduct {
  id: string;
  name: string;
  product_type: string;
  set_id: string;
  image_url: string | null;
}

interface SearchResults {
  sets: SearchSet[];
  cards: SearchCard[];
  products: SearchProduct[];
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  booster_box: "Booster Box",
  elite_trainer_box: "ETB",
  ultra_premium_collection: "UPC",
  special_collection: "Special Collection",
  tin: "Tin",
  bundle: "Bundle",
  blister: "Blister",
  promo_pack: "Promo",
  collection: "Collection",
};

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.length < 2) {
      setResults(null);
      setOpen(false);
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (query.length < 2) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get<{ data: SearchResults }>(
          `/cards/search/global?q=${encodeURIComponent(query)}`,
        );
        setResults(res.data.data);
        setOpen(true);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keyboard shortcut — Cmd/Ctrl + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const hasResults =
    results &&
    (results.sets.length > 0 ||
      results.cards.length > 0 ||
      results.products.length > 0);

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <div style={{ position: "relative", padding: "0 10px", marginBottom: 8 }}>
      {/* Search input */}
      <div style={{ position: "relative" }}>
        <span
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 13,
            color: "var(--text-dim)",
            pointerEvents: "none",
          }}
        >
          ⌕
        </span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder='Search cards, sets, products...'
          style={{
            width: "100%",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 32px 8px 30px",
            fontSize: 12,
            color: "var(--text-primary)",
            fontFamily: "inherit",
            outline: "none",
            transition: "border-color 0.15s ease",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--gold-dim)";
            if (query.length >= 2) setOpen(true);
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--border)";
          }}
        />
        {/* Kbd hint or loading */}
        <span
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 10,
            color: "var(--text-dim)",
            fontFamily: "DM Mono, monospace",
          }}
        >
          {loading ? "..." : query.length === 0 ? "⌘K" : ""}
        </span>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          style={{
            position: "absolute",
            top: "100%",
            left: 10,
            right: 10,
            marginTop: 4,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
            zIndex: 100,
            overflow: "hidden",
            maxHeight: 420,
            overflowY: "auto",
          }}
        >
          {!hasResults && !loading && (
            <div
              style={{
                padding: "20px 16px",
                textAlign: "center",
                fontSize: 12,
                color: "var(--text-dim)",
              }}
            >
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Sets */}
          {results && results.sets.length > 0 && (
            <div>
              <div
                style={{
                  padding: "8px 14px 4px",
                  fontSize: 10,
                  color: "var(--text-dim)",
                  letterSpacing: "0.08em",
                  fontFamily: "DM Mono, monospace",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--surface-2)",
                }}
              >
                SETS
              </div>
              {results.sets.map((set) => (
                <button
                  key={set.id}
                  onClick={() => handleSelect(ROUTES.SET(set.id))}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    transition: "background 0.1s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {set.symbol_url ? (
                    <Image
                      src={set.symbol_url}
                      alt=''
                      width={18}
                      height={18}
                      style={{ objectFit: "contain" }}
                    />
                  ) : (
                    <span style={{ fontSize: 14, color: "var(--text-dim)" }}>
                      ◈
                    </span>
                  )}
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--text-primary)",
                      }}
                    >
                      {set.name}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-dim)" }}>
                      {set.series}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Cards */}
          {results && results.cards.length > 0 && (
            <div>
              <div
                style={{
                  padding: "8px 14px 4px",
                  fontSize: 10,
                  color: "var(--text-dim)",
                  letterSpacing: "0.08em",
                  fontFamily: "DM Mono, monospace",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--surface-2)",
                }}
              >
                CARDS
              </div>
              {results.cards.map((card) => (
                <button
                  key={card.id}
                  onClick={() =>
                    handleSelect(ROUTES.CARD(card.set_id, card.id))
                  }
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 14px",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    transition: "background 0.1s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {card.image_small ? (
                    <Image
                      src={card.image_small}
                      alt={card.name}
                      width={28}
                      height={40}
                      style={{ objectFit: "contain", borderRadius: 3 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 28,
                        height: 40,
                        background: "var(--surface-3)",
                        borderRadius: 3,
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
                      {card.name}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-dim)" }}>
                      #{card.number}
                      {card.rarity && ` · ${card.rarity}`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Products */}
          {results && results.products.length > 0 && (
            <div>
              <div
                style={{
                  padding: "8px 14px 4px",
                  fontSize: 10,
                  color: "var(--text-dim)",
                  letterSpacing: "0.08em",
                  fontFamily: "DM Mono, monospace",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--surface-2)",
                }}
              >
                SEALED PRODUCTS
              </div>
              {results.products.map((product) => (
                <button
                  key={product.id}
                  onClick={() =>
                    handleSelect(`${ROUTES.SET(product.set_id)}?tab=products`)
                  }
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    transition: "background 0.1s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ fontSize: 16, color: "var(--text-dim)" }}>
                    □
                  </span>
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
                      {product.name}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--gold)",
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      {PRODUCT_TYPE_LABELS[product.product_type] ??
                        product.product_type}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
