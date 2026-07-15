"use client";

/**
 * Recent Sales — expandable card-detail section (web).
 * Last 15 TCGPlayer sold listings, outliers flagged, plus a Buy button.
 * Lazy: only fetches once expanded.
 */

import { useState } from "react";
import { useRecentSales, type RecentSale } from "../../hooks/useRecentSales";

const money = (n: number | null | undefined) =>
  n == null ? "—" : `$${n.toFixed(2)}`;
const shortDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export default function RecentSalesSection({ cardId }: { cardId: string }) {
  const [open, setOpen] = useState(false);
  const { data, loading, error } = useRecentSales(cardId, open);

  const buy = () => {
    const url =
      data?.productUrl ?? `https://www.tcgplayer.com/product/${cardId}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      style={{
        marginTop: 16,
        border: "1px solid var(--border)",
        borderRadius: 12,
        background: "var(--surface)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: 16,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          color: "var(--text-primary)",
        }}
      >
        <span
          style={{ fontWeight: 700, fontSize: 14, flex: 1, textAlign: "left" }}
        >
          Recent Sales
        </span>
        {data?.median != null && !open && (
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            ~{money(data.median)}
          </span>
        )}
        <span
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
            color: "var(--text-secondary)",
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div style={{ padding: "0 16px 16px" }}>
          {loading ? (
            <div
              style={{
                padding: "20px 0",
                color: "var(--text-secondary)",
                fontSize: 13,
              }}
            >
              Loading recent sales…
            </div>
          ) : error ? (
            <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
              Couldn&apos;t load recent sales right now.
            </div>
          ) : !data || data.sales.length === 0 ? (
            <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
              No recent TCGPlayer sales found for this card.
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 20, padding: "4px 0 12px" }}>
                <Summary label='Median' value={money(data.median)} />
                <Summary
                  label='Avg (ex-outliers)'
                  value={money(data.average)}
                />
                <Summary label='Sales' value={String(data.count)} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.sales.map((s, i) => (
                  <SaleRow key={`${s.date}-${i}`} sale={s} />
                ))}
              </div>

              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-dim)",
                  marginTop: 8,
                }}
              >
                Outliers (flagged) are excluded from the average. Source:
                TCGPlayer sold listings.
              </div>

              <button
                onClick={buy}
                style={{
                  width: "100%",
                  marginTop: 12,
                  padding: "10px 0",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 700,
                  background: "var(--gold)",
                  color: "#0E0E12",
                }}
              >
                Buy on TCGPlayer ↗
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{label}</div>
      <div
        style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}
      >
        {value}
      </div>
    </div>
  );
}

function SaleRow({ sale }: { sale: RecentSale }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        opacity: sale.isOutlier ? 0.55 : 1,
      }}
    >
      <span style={{ fontSize: 11, color: "var(--text-dim)", width: 44 }}>
        {shortDate(sale.date)}
      </span>
      <span
        style={{
          flex: 1,
          fontSize: 13,
          color: "var(--text-secondary)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {[sale.condition, sale.variant].filter(Boolean).join(" · ") || "—"}
      </span>
      {sale.isOutlier && (
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: "#A8493A",
            background: "rgba(168,73,58,0.15)",
            borderRadius: 4,
            padding: "1px 5px",
          }}
        >
          ⚠ outlier
        </span>
      )}
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "var(--text-primary)",
          textDecoration: sale.isOutlier ? "line-through" : "none",
        }}
      >
        {money(sale.price)}
      </span>
    </div>
  );
}
