"use client";
import { useState, useEffect, useRef, useCallback } from "react";
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

type Variant = "sidebar" | "bar";

export default function GlobalSearch({
  variant = "sidebar",
}: {
  variant?: Variant;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Bar variant: where to anchor the full-content results panel.
  const [panelRect, setPanelRect] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);

  const updateRect = useCallback(() => {
    const el = barRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPanelRect({ left: r.left, top: r.bottom, width: r.width });
  }, []);

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

  // Keep the bar panel sized to the content area
  useEffect(() => {
    if (variant !== "bar" || !open) return;
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [variant, open, updateRect]);

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
    (results.cards.length > 0 ||
      results.sets.length > 0 ||
      results.products.length > 0);

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  // ─── Result rows (shared by both variants; cards first) ────────────────────
  const sectionLabel = (text: string) => (
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
      {text}
    </div>
  );

  const rowBase: React.CSSProperties = {
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
  };
  const hoverIn = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "var(--surface-2)";
  };
  const hoverOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "transparent";
  };

  const renderSections = () => (
    <>
      {!hasResults && !loading && (
        <div
          style={{
            padding: "28px 16px",
            textAlign: "center",
            fontSize: 13,
            color: "var(--text-dim)",
          }}
        >
          No results for &ldquo;{query}&rdquo;
        </div>
      )}

      {/* Cards first */}
      {results && results.cards.length > 0 && (
        <div>
          {sectionLabel("CARDS")}
          {results.cards.map((card) => (
            <button
              key={card.id}
              onClick={() => handleSelect(ROUTES.CARD(card.set_id, card.id))}
              style={rowBase}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
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
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {card.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                  #{card.number}
                  {card.rarity && ` · ${card.rarity}`}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Sets */}
      {results && results.sets.length > 0 && (
        <div>
          {sectionLabel("SETS")}
          {results.sets.map((set) => (
            <button
              key={set.id}
              onClick={() => handleSelect(ROUTES.SET(set.id))}
              style={rowBase}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
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
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  {set.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                  {set.series}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Products */}
      {results && results.products.length > 0 && (
        <div>
          {sectionLabel("SEALED PRODUCTS")}
          {results.products.map((product) => (
            <button
              key={product.id}
              onClick={() =>
                handleSelect(`${ROUTES.SET(product.set_id)}?tab=products`)
              }
              style={rowBase}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
            >
              <span style={{ fontSize: 16, color: "var(--text-dim)" }}>□</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
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
                    fontSize: 11,
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
    </>
  );

  // ─── Bar variant: permanent full-width row + content-filling results ───────
  if (variant === "bar") {
    return (
      <div
        ref={barRef}
        className='content-search-bar'
        style={{
          position: "relative",
          padding: "12px 24px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div style={{ position: "relative", maxWidth: 720 }}>
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 15,
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
              borderRadius: 10,
              padding: "11px 40px 11px 36px",
              fontSize: 14,
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
          <span
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 11,
              color: "var(--text-dim)",
              fontFamily: "DM Mono, monospace",
            }}
          >
            {loading ? "..." : query.length === 0 ? "⌘K" : ""}
          </span>
        </div>

        {/* Full-content results panel */}
        {open && panelRect && (
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              left: panelRect.left,
              top: panelRect.top,
              width: panelRect.width,
              bottom: 0,
              background: "var(--charcoal)",
              borderTop: "1px solid var(--border)",
              zIndex: 90,
              overflowY: "auto",
            }}
          >
            <div style={{ maxWidth: 720, margin: "0 auto", padding: "8px 0" }}>
              {renderSections()}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Sidebar variant (default — used inside the mobile drawer) ─────────────
  return (
    <div style={{ position: "relative", padding: "0 10px", marginBottom: 8 }}>
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
          {renderSections()}
        </div>
      )}
    </div>
  );
}
