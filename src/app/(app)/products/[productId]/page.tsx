"use client";

/**
 * Product detail page — /products/[productId]
 *
 * Sealed product details: image, type, set, all per-source prices.
 *
 * Backend endpoint required: GET /cards/product/:productId
 * (see DELIVERY README — this endpoint must be added to the backend)
 */

import { use } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  useProductDetail,
  productTypeLabel,
  getProductMarketPrice,
} from "../../../../hooks/useProducts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (val: number | null) =>
  val != null
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(val)
    : "—";

const SOURCE_META: Record<string, { label: string; color: string }> = {
  tcgplayer: { label: "TCGPlayer", color: "#378ADD" },
  cardmarket: { label: "CardMarket", color: "#3DAA6E" },
  ebay: { label: "eBay Sold", color: "#D85A30" },
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = use(params);
  const { product, loading, error } = useProductDetail(productId);

  if (loading) return <div style={messageStyle}>Loading product...</div>;
  if (error)
    return <div style={{ ...messageStyle, color: "var(--red)" }}>{error}</div>;
  if (!product) return <div style={messageStyle}>Product not found.</div>;

  const heroPrice = getProductMarketPrice(product);
  const typeLabel = productTypeLabel(product.product_type);
  const rows = product.product_price_cache ?? [];

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
          href={`/cards/${product.set_id}?tab=products`}
          style={{ color: "var(--text-dim)", textDecoration: "none" }}
        >
          Sealed Products
        </Link>
        <span>›</span>
        <span style={{ color: "var(--text-secondary)" }}>{product.name}</span>
      </div>

      {/* Hero */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(260px, 360px) 1fr",
          gap: 32,
          marginBottom: 32,
          alignItems: "start",
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            aspectRatio: "1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            position: "relative",
          }}
        >
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              style={{ objectFit: "contain", padding: 24 }}
            />
          ) : (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-dim)",
                fontFamily: "DM Mono, monospace",
                letterSpacing: "0.06em",
              }}
            >
              {typeLabel.toUpperCase()}
            </div>
          )}
        </div>

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
            {typeLabel.toUpperCase()}
          </div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: 16,
              lineHeight: 1.3,
            }}
          >
            {product.name}
          </h1>

          {product.description && (
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                marginBottom: 20,
              }}
            >
              {product.description}
            </p>
          )}

          {heroPrice != null && (
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
                MARKET PRICE
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 500,
                  color: "var(--gold)",
                  fontFamily: "DM Mono, monospace",
                }}
              >
                {fmt(heroPrice)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Price sources */}
      {rows.length > 0 && (
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
            PRICE SOURCES
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {rows.map((row, i) => {
              const meta = SOURCE_META[row.source] ?? {
                label: row.source,
                color: "#8A8FA0",
              };
              return (
                <div
                  key={`${row.source}-${i}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "160px 1fr 1fr 1fr 1fr",
                    gap: 16,
                    padding: "14px 18px",
                    background: "var(--surface-2)",
                    borderRadius:
                      i === 0
                        ? "8px 8px 0 0"
                        : i === rows.length - 1
                          ? "0 0 8px 8px"
                          : 0,
                    border: "1px solid var(--border)",
                    borderTop: i > 0 ? "none" : "1px solid var(--border)",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: meta.color,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        fontWeight: 500,
                      }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  {(
                    [
                      { label: "LOW", val: row.low_price },
                      { label: "MID", val: row.mid_price },
                      { label: "HIGH", val: row.high_price },
                      { label: "MARKET", val: row.market_price },
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
      )}
    </div>
  );
}

const messageStyle: React.CSSProperties = {
  textAlign: "center",
  padding: 80,
  color: "var(--text-dim)",
  fontSize: 13,
};
