/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useCallback, useEffect, useState } from "react";
import api from "../../lib/api";

interface SoldItem {
  id: string;
  item_type: string;
  grading_company: string | null;
  grade: string | null;
  quantity: number | null;
  purchase_price: number | null;
  sold_price: number | null;
  sold_platform: string | null;
  sold_at: string | null;
  costBasis: number;
  proceeds: number;
  profit: number;
  profitPct: number | null;
  card?: { name: string; number: string; sets?: { name: string } | null; image_small: string | null } | null;
  product?: { name: string; image_url: string | null } | null;
}

interface SoldSummary {
  count: number;
  totalCostBasis: number;
  totalProceeds: number;
  totalProfit: number;
  totalProfitPct: number | null;
}

const money = (n: number | null | undefined) =>
  n == null
    ? "—"
    : `$${n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

const signedMoney = (n: number) =>
  `${n >= 0 ? "+" : "−"}${money(Math.abs(n))}`;

const date = (s: string | null) =>
  s ? new Date(s).toLocaleDateString() : "—";

async function fetchSoldInventory() {
  const res = await api.get<{ data: { items: SoldItem[]; summary: SoldSummary } }>(
    "/inventory/sold",
  );
  return res.data.data;
}

export default function SoldView({
  onChanged,
}: {
  // called after an unsell so the parent can refresh active inventory
  onChanged?: () => void;
}) {
  const [items, setItems] = useState<SoldItem[]>([]);
  const [summary, setSummary] = useState<SoldSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSoldInventory();
      setItems(data.items ?? []);
      setSummary(data.summary ?? null);
    } catch (e) {
      console.error("[SoldView] load failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchSoldInventory();
        if (cancelled) return;
        setItems(data.items ?? []);
        setSummary(data.summary ?? null);
      } catch (e) {
        console.error("[SoldView] load failed:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const unsell = async (id: string) => {
    try {
      await api.patch(`/inventory/${id}/unsell`);
      await load();
      onChanged?.();
    } catch (e) {
      console.error("[SoldView] unsell failed:", e);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: "48px 0", textAlign: "center" }}>
        <div style={{ fontSize: 15, color: "var(--text-primary)", marginBottom: 6 }}>
          No sales yet
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Mark an item as sold from its menu to start tracking realized profit.
        </div>
      </div>
    );
  }

  const profitColor = (n: number) => (n >= 0 ? "#10B981" : "#EF4444");

  return (
    <div>
      {/* Realized-profit summary */}
      {summary && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <SummaryTile label="Items sold" value={String(summary.count)} />
          <SummaryTile label="Total cost" value={money(summary.totalCostBasis)} />
          <SummaryTile label="Total proceeds" value={money(summary.totalProceeds)} accent="var(--gold)" />
          <SummaryTile
            label="Realized profit"
            value={signedMoney(summary.totalProfit)}
            accent={profitColor(summary.totalProfit)}
            sub={
              summary.totalProfitPct != null
                ? `${summary.totalProfitPct >= 0 ? "+" : ""}${summary.totalProfitPct.toFixed(1)}%`
                : undefined
            }
          />
        </div>
      )}

      {/* Sold list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((it) => {
          const name = it.card?.name ?? it.product?.name ?? "Unknown";
          const img = it.card?.image_small ?? it.product?.image_url ?? null;
          const detail =
            it.item_type === "graded_card" && it.grading_company
              ? `${it.grading_company} ${it.grade ?? ""}`.trim()
              : it.card?.sets?.name ?? "";
          return (
            <div
              key={it.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 16px",
                borderRadius: 12,
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt={name} style={{ width: 36, height: 50, objectFit: "contain", borderRadius: 4 }} />
              ) : (
                <div style={{ width: 36, height: 50, borderRadius: 4, background: "var(--surface-2)" }} />
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {name}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
                  {[detail, it.sold_platform, date(it.sold_at)].filter(Boolean).join(" · ")}
                </div>
              </div>

              {/* cost → sold → profit */}
              <div style={{ textAlign: "right", fontFamily: "DM Mono, monospace", minWidth: 150 }}>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                  {money(it.costBasis)} → {money(it.proceeds)}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: profitColor(it.profit) }}>
                  {signedMoney(it.profit)}
                  {it.profitPct != null && (
                    <span style={{ fontSize: 11, marginLeft: 6, opacity: 0.8 }}>
                      {it.profitPct >= 0 ? "+" : ""}
                      {it.profitPct.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => unsell(it.id)}
                title="Move back to active inventory"
                style={{
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                }}
              >
                Unsell
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: string;
  accent?: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.06em",
          color: "var(--text-dim)",
          textTransform: "uppercase",
          fontFamily: "DM Mono, monospace",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, color: accent ?? "var(--text-primary)", fontFamily: "DM Mono, monospace" }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: accent ?? "var(--text-dim)", fontFamily: "DM Mono, monospace", marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}