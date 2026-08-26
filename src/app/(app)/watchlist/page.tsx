"use client";

/**
 * Watchlist — /watchlist
 *
 * Gated behind the "watchlist" flag. Entry point is the ★ Watchlist button
 * in the dashboard header, shown only when the flag is on for this account.
 * Mirrors the mobile watchlist feature-for-feature: cards, graded cards, or
 * products; current/buy/sell always visible on the row; 7-day trend; a
 * picker covering search + inventory for both cards and products; and one
 * item modal that handles both create (with the raw-or-graded step for
 * cards) and edit (a real summary, not just bare trigger inputs).
 */

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import api from "../../../lib/api";
import {
  addToWatchlist,
  removeFromWatchlist,
  updateWatchlistItem,
  useWatchlist,
  type SevenDayChange,
  type WatchlistItem,
  type WatchlistItemInput,
} from "../../../hooks/useWatchlist";
import {
  useGradeLadder,
  type LadderEntry,
} from "../../../hooks/useRegradeTracker";
import { PriceChartingAttribution } from "../../../components/cards/PriceChartingAttribution";

// ─── Shared bits ────────────────────────────────────────────────────────────

const COMPANY_COLORS: Record<string, string> = {
  PSA: "#C9A84C",
  BGS: "#378ADD",
  CGC: "#3DAA6E",
  TAG: "#D85A30",
  SGC: "#9B59B6",
};

interface CardSearchResult {
  id: string;
  name: string;
  number: string;
  rarity: string | null;
  image_small: string | null;
}
interface ProductSearchResult {
  id: string;
  name: string;
  product_type: string | null;
  image_url: string | null;
}
interface InventoryPickItem {
  id: string;
  item_type: string;
  grading_company: string | null;
  grade: string | null;
  card: {
    id: string;
    name: string;
    number: string;
    image_small: string | null;
  } | null;
  product: {
    id: string;
    name: string;
    product_type: string;
    image_url: string | null;
  } | null;
}

interface WatchlistPick {
  kind: "card" | "product";
  id: string;
  name: string;
  subtitle: string;
  imageSmall: string | null;
  currentGradingCompany?: string | null;
  currentGrade?: string | null;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function WatchlistPage() {
  const router = useRouter();
  const { data: items, loading, error, refetch } = useWatchlist();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingPick, setPendingPick] = useState<WatchlistPick | null>(null);
  const [editing, setEditing] = useState<WatchlistItem | null>(null);

  return (
    <div style={{ minHeight: "100vh" }}>
      <div
        style={{
          padding: "28px 40px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-dim)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
            padding: 0,
            marginBottom: 12,
          }}
        >
          ← Dashboard
        </button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                color: "var(--gold)",
                letterSpacing: "0.1em",
                fontFamily: "DM Mono, monospace",
                marginBottom: 6,
              }}
            >
              TRACKING
            </div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              Watchlist
            </h1>
          </div>
          <button
            onClick={() => setPickerOpen(true)}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: "none",
              background: "var(--gold)",
              color: "var(--charcoal, #0E0E12)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            + Add to watchlist
          </button>
        </div>
      </div>

      <div style={{ padding: "28px 40px", maxWidth: 900, margin: "0 auto" }}>
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: 80,
              color: "var(--text-dim)",
              fontSize: 13,
            }}
          >
            Loading…
          </div>
        ) : error ? (
          <div
            style={{
              textAlign: "center",
              padding: 80,
              color: "#e85f5f",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        ) : !items || items.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              border: "1px solid var(--border)",
              borderRadius: 12,
              background: "var(--surface)",
              color: "var(--text-dim)",
              fontSize: 13,
            }}
          >
            Nothing on your watchlist yet. Add a card or product to track its
            price and set buy/sell triggers.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((item) => (
              <WatchlistRow
                key={item.id}
                item={item}
                onClick={() => setEditing(item)}
              />
            ))}
          </div>
        )}
      </div>

      {pickerOpen && (
        <PickerOverlay
          onClose={() => setPickerOpen(false)}
          onPick={(pick) => {
            setPickerOpen(false);
            setPendingPick(pick);
          }}
        />
      )}

      {(pendingPick || editing) && (
        <ItemOverlay
          pendingPick={pendingPick}
          existingItem={editing}
          onClose={() => {
            setPendingPick(null);
            setEditing(null);
          }}
          onChanged={refetch}
        />
      )}
    </div>
  );
}

// ─── Row ────────────────────────────────────────────────────────────────────

function WatchlistRow({
  item,
  onClick,
}: {
  item: WatchlistItem;
  onClick: () => void;
}) {
  const triggered = item.buyTriggered || item.sellTriggered;

  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        border: `1px solid ${triggered ? "rgba(201,168,76,0.45)" : "var(--border)"}`,
        borderRadius: 10,
        background: "var(--surface)",
        padding: 14,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 56,
            borderRadius: 6,
            background: "var(--surface-2)",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {item.imageSmall && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageSmall}
              alt={item.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.name}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.subtitle}
            {item.targetCompany
              ? `  ·  ${item.targetCompany} ${item.targetGrade}`
              : ""}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {item.currentPrice != null
              ? `$${item.currentPrice.toFixed(2)}`
              : "—"}
          </div>
          {item.sevenDayChange && (
            <SevenDayBadge change={item.sevenDayChange} />
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid var(--border)",
        }}
      >
        <PriceStat
          label='Buy at'
          value={item.buyBelowPrice}
          active={item.buyTriggered}
        />
        <PriceStat
          label='Sell at'
          value={item.sellAbovePrice}
          active={item.sellTriggered}
        />
      </div>
    </button>
  );
}

function PriceStat({
  label,
  value,
  active,
}: {
  label: string;
  value: number | null;
  active: boolean;
}) {
  const color = active ? "var(--gold)" : "var(--text-dim)";
  return (
    <div style={{ flex: 1 }}>
      <div
        style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: 0.4 }}
      >
        {label.toUpperCase()}
        {active ? " · HIT" : ""}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: active ? 700 : 500,
          color,
          marginTop: 1,
        }}
      >
        {value != null ? `$${value.toFixed(2)}` : "Not set"}
      </div>
    </div>
  );
}

function SevenDayBadge({ change }: { change: SevenDayChange }) {
  const up = change.changeAmount >= 0;
  const color = up ? "#10B981" : "#e85f5f";
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color, marginTop: 2 }}>
      {up ? "▲" : "▼"} {up ? "+" : ""}
      {change.changePercent.toFixed(1)}%
    </div>
  );
}

// ─── Shell ──────────────────────────────────────────────────────────────────

function OverlayShell({
  width = 480,
  onClose,
  children,
}: {
  width?: number;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 24,
          width,
          maxWidth: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

const fieldLabel = {
  fontSize: 11,
  color: "var(--text-dim)",
  marginBottom: 6,
  textTransform: "uppercase" as const,
  letterSpacing: 0.5,
};
const inputStyle = {
  width: "100%",
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 12,
  color: "var(--text-primary)",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box" as const,
};

// ─── Picker ─────────────────────────────────────────────────────────────────

function PickerOverlay({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (pick: WatchlistPick) => void;
}) {
  const [query, setQuery] = useState("");
  const [cardResults, setCardResults] = useState<CardSearchResult[]>([]);
  const [productResults, setProductResults] = useState<ProductSearchResult[]>(
    [],
  );
  const [searching, setSearching] = useState(false);

  const [inventoryItems, setInventoryItems] = useState<InventoryPickItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: { items: InventoryPickItem[] } }>("/inventory")
      .then((res) => {
        const items = (res.data.data.items ?? []).filter(
          (it) =>
            (it.item_type === "raw_card" ||
              it.item_type === "graded_card" ||
              it.item_type === "sealed_product") &&
            (it.card || it.product),
        );
        setInventoryItems(items);
      })
      .catch(() => setInventoryItems([]))
      .finally(() => setInventoryLoading(false));
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setCardResults([]);
      setProductResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get<{
          data: { cards: CardSearchResult[]; products: ProductSearchResult[] };
        }>(`/cards/search/global?q=${encodeURIComponent(q)}`);
        setCardResults(res.data.data?.cards ?? []);
        setProductResults(res.data.data?.products ?? []);
      } catch {
        setCardResults([]);
        setProductResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const isSearching = query.trim().length > 0;

  return (
    <OverlayShell width={480} onClose={onClose}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          Add to watchlist
        </div>
        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: 18,
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder='Search any card or product, or browse below'
        autoFocus
        style={{ ...inputStyle, marginBottom: 14 }}
      />

      <div style={{ maxHeight: "55vh", overflowY: "auto" }}>
        {isSearching ? (
          searching ? (
            <div
              style={{ padding: 20, fontSize: 12, color: "var(--text-dim)" }}
            >
              Searching…
            </div>
          ) : cardResults.length === 0 && productResults.length === 0 ? (
            <div
              style={{ padding: 20, fontSize: 12, color: "var(--text-dim)" }}
            >
              No matches.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {cardResults.map((c) => (
                <PickRow
                  key={`card-${c.id}`}
                  name={c.name}
                  detail={`${c.number ? `#${c.number}` : ""}${c.rarity ? `  ·  ${c.rarity}` : ""}`}
                  imageSmall={c.image_small}
                  onClick={() =>
                    onPick({
                      kind: "card",
                      id: c.id,
                      name: c.name,
                      subtitle: c.number ? `#${c.number}` : "",
                      imageSmall: c.image_small,
                    })
                  }
                />
              ))}
              {productResults.map((p) => (
                <PickRow
                  key={`product-${p.id}`}
                  name={p.name}
                  detail={p.product_type ?? "Sealed product"}
                  imageSmall={p.image_url}
                  onClick={() =>
                    onPick({
                      kind: "product",
                      id: p.id,
                      name: p.name,
                      subtitle: p.product_type ?? "",
                      imageSmall: p.image_url,
                    })
                  }
                />
              ))}
            </div>
          )
        ) : (
          <>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-dim)",
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              FROM YOUR INVENTORY
            </div>
            {inventoryLoading ? (
              <div
                style={{ padding: 20, fontSize: 12, color: "var(--text-dim)" }}
              >
                Loading…
              </div>
            ) : inventoryItems.length === 0 ? (
              <div
                style={{ padding: 20, fontSize: 12, color: "var(--text-dim)" }}
              >
                Nothing in your inventory yet. Search above instead.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {inventoryItems.map((item) => {
                  if (item.item_type === "sealed_product" && item.product) {
                    return (
                      <PickRow
                        key={item.id}
                        name={item.product.name}
                        detail={item.product.product_type}
                        imageSmall={item.product.image_url}
                        onClick={() =>
                          onPick({
                            kind: "product",
                            id: item.product!.id,
                            name: item.product!.name,
                            subtitle: item.product!.product_type,
                            imageSmall: item.product!.image_url,
                          })
                        }
                      />
                    );
                  }
                  if (item.card) {
                    return (
                      <PickRow
                        key={item.id}
                        name={item.card.name}
                        detail={
                          item.grading_company && item.grade
                            ? `${item.grading_company} ${item.grade}`
                            : `Raw${item.card.number ? `  ·  #${item.card.number}` : ""}`
                        }
                        imageSmall={item.card.image_small}
                        onClick={() =>
                          onPick({
                            kind: "card",
                            id: item.card!.id,
                            name: item.card!.name,
                            subtitle: item.card!.number
                              ? `#${item.card!.number}`
                              : "",
                            imageSmall: item.card!.image_small,
                            currentGradingCompany: item.grading_company,
                            currentGrade: item.grade,
                          })
                        }
                      />
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </>
        )}
      </div>
    </OverlayShell>
  );
}

function PickRow({
  name,
  detail,
  imageSmall,
  onClick,
}: {
  name: string;
  detail: string;
  imageSmall: string | null;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--surface-2)",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          width: 32,
          height: 44,
          flexShrink: 0,
          borderRadius: 4,
          overflow: "hidden",
          background: "var(--surface)",
        }}
      >
        {imageSmall && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSmall}
            alt={name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{detail}</div>
      </div>
    </button>
  );
}

// ─── Item overlay (create + edit) ──────────────────────────────────────────

function ItemOverlay({
  pendingPick,
  existingItem,
  onClose,
  onChanged,
}: {
  pendingPick: WatchlistPick | null;
  existingItem: WatchlistItem | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const isCreate = !!pendingPick;
  const router = useRouter();

  const [gradeChoice, setGradeChoice] = useState<"raw" | "graded" | null>(
    pendingPick?.currentGradingCompany ? "graded" : null,
  );
  const [targetCompany, setTargetCompany] = useState<string | null>(
    pendingPick?.currentGradingCompany ?? null,
  );
  const [targetGrade, setTargetGrade] = useState<string | null>(
    pendingPick?.currentGrade ?? null,
  );
  const [buyBelow, setBuyBelow] = useState(
    existingItem?.buyBelowPrice != null
      ? String(existingItem.buyBelowPrice)
      : "",
  );
  const [sellAbove, setSellAbove] = useState(
    existingItem?.sellAbovePrice != null
      ? String(existingItem.sellAbovePrice)
      : "",
  );
  const [notes, setNotes] = useState(existingItem?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ladderCardId =
    isCreate && pendingPick?.kind === "card" && gradeChoice === "graded"
      ? pendingPick.id
      : null;
  const ladder = useGradeLadder(ladderCardId);

  const needsGradeStep = isCreate && pendingPick?.kind === "card";
  const gradeStepResolved =
    !needsGradeStep ||
    gradeChoice === "raw" ||
    (gradeChoice === "graded" && !!targetGrade);

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    const triggerPatch = {
      buyBelowPrice: buyBelow ? Number(buyBelow) : null,
      sellAbovePrice: sellAbove ? Number(sellAbove) : null,
      notes: notes.trim() || null,
    };
    try {
      if (isCreate && pendingPick) {
        const input: WatchlistItemInput = {
          cardId: pendingPick.kind === "card" ? pendingPick.id : null,
          productId: pendingPick.kind === "product" ? pendingPick.id : null,
          targetCompany: gradeChoice === "graded" ? targetCompany : null,
          targetGrade: gradeChoice === "graded" ? targetGrade : null,
          ...triggerPatch,
        };
        await addToWatchlist(input);
      } else if (existingItem) {
        await updateWatchlistItem(existingItem.id, triggerPatch);
      }
      onChanged();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!existingItem) return;
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    setRemoving(true);
    try {
      await removeFromWatchlist(existingItem.id);
      onChanged();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to remove");
      setRemoving(false);
    }
  };

  const submitting = saving || removing;
  const summaryImage = isCreate
    ? pendingPick?.imageSmall
    : existingItem?.imageSmall;
  const summaryName = isCreate ? pendingPick?.name : existingItem?.name;
  const summarySubtitle = isCreate
    ? pendingPick?.subtitle
    : existingItem?.subtitle;

  return (
    <OverlayShell width={480} onClose={submitting ? () => {} : onClose}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          {isCreate ? "Add to watchlist" : "Watching"}
        </div>
        <button
          onClick={onClose}
          disabled={submitting}
          style={{
            border: "none",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: 18,
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Summary */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 44,
            height: 62,
            borderRadius: 6,
            background: "var(--surface)",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {summaryImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={summaryImage}
              alt={summaryName ?? ""}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {summaryName}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            {summarySubtitle}
            {!isCreate && existingItem?.targetCompany
              ? `  ·  ${existingItem.targetCompany} ${existingItem.targetGrade}`
              : ""}
          </div>
          {!isCreate && existingItem && (
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                marginTop: 4,
              }}
            >
              <span
                style={{ fontSize: 15, fontWeight: 700, color: "var(--gold)" }}
              >
                {existingItem.currentPrice != null
                  ? `$${existingItem.currentPrice.toFixed(2)}`
                  : "—"}
              </span>
              {existingItem.sevenDayChange && (
                <SevenDayBadge change={existingItem.sevenDayChange} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* View details — edit mode only; nothing to navigate to yet during
          create, the item doesn't exist as a watchlist row. */}
      {!isCreate && existingItem && (
        <button
          onClick={() => {
            onClose();
            if (
              existingItem.kind === "card" &&
              existingItem.cardId &&
              existingItem.setId
            ) {
              router.push(
                `/cards/${existingItem.setId}/${existingItem.cardId}`,
              );
            } else if (
              existingItem.kind === "product" &&
              existingItem.productId
            ) {
              router.push(`/products/${existingItem.productId}`);
            }
          }}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "10px 0",
            marginBottom: 16,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-primary)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {existingItem.kind === "card"
            ? "View card details"
            : "View product details"}{" "}
          →
        </button>
      )}

      {/* Raw / graded step */}
      {needsGradeStep && (
        <div style={{ marginBottom: 16 }}>
          <div style={fieldLabel}>Track raw price, or a specific grade?</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button
              onClick={() => {
                setGradeChoice("raw");
                setTargetCompany(null);
                setTargetGrade(null);
              }}
              style={choiceStyle(gradeChoice === "raw")}
            >
              Raw price
            </button>
            <button
              onClick={() => setGradeChoice("graded")}
              style={choiceStyle(gradeChoice === "graded")}
            >
              Specific grade
            </button>
          </div>

          {gradeChoice === "graded" && (
            <GradeGridPicker
              ladder={ladder}
              selectedCompany={targetCompany}
              selectedGrade={targetGrade}
              onPick={(company, grade) => {
                setTargetCompany(company);
                setTargetGrade(grade);
              }}
            />
          )}
        </div>
      )}

      {/* Triggers */}
      {gradeStepResolved && (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={fieldLabel}>
              Buy trigger — notify when price drops below
            </div>
            <input
              value={buyBelow}
              onChange={(e) =>
                setBuyBelow(e.target.value.replace(/[^0-9.]/g, ""))
              }
              placeholder='e.g. 40.00'
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={fieldLabel}>
              Sell trigger — notify when price rises above
            </div>
            <input
              value={sellAbove}
              onChange={(e) =>
                setSellAbove(e.target.value.replace(/[^0-9.]/g, ""))
              }
              placeholder='e.g. 80.00'
              style={inputStyle}
            />
          </div>
          <div
            style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 16 }}
          >
            Triggers show as hit right in the app the moment price crosses them.
            Push notifications for these aren&apos;t turned on yet.
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={fieldLabel}>Notes</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder='Optional'
              rows={2}
              style={{ ...inputStyle, resize: "vertical" as const }}
            />
          </div>

          {err && (
            <div style={{ fontSize: 11, color: "#e85f5f", marginBottom: 12 }}>
              {err}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={submitting}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 8,
              border: "none",
              background: "var(--gold)",
              color: "var(--charcoal, #0E0E12)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              opacity: submitting ? 0.6 : 1,
              marginBottom: isCreate ? 0 : 12,
            }}
          >
            {saving ? "Saving…" : isCreate ? "Add to watchlist" : "Save"}
          </button>

          {!isCreate && existingItem && (
            <button
              onClick={handleRemove}
              disabled={submitting}
              style={{
                width: "100%",
                padding: "8px 0",
                borderRadius: 8,
                border: "1px solid #e85f5f55",
                background: "transparent",
                color: "#e85f5f",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                opacity: removing ? 0.6 : 1,
              }}
            >
              {removing
                ? "Removing…"
                : confirmRemove
                  ? "Click again to confirm remove"
                  : "Remove from watchlist"}
            </button>
          )}
        </>
      )}
    </OverlayShell>
  );
}

function GradeGridPicker({
  ladder,
  selectedCompany,
  selectedGrade,
  onPick,
}: {
  ladder: ReturnType<typeof useGradeLadder>;
  selectedCompany: string | null;
  selectedGrade: string | null;
  onPick: (company: string, grade: string) => void;
}) {
  if (ladder.loading)
    return (
      <div
        style={{ padding: "12px 0", fontSize: 12, color: "var(--text-dim)" }}
      >
        Loading…
      </div>
    );
  if (ladder.error)
    return (
      <div style={{ fontSize: 11, color: "#e85f5f" }}>
        Couldn&apos;t load prices for this card.
      </div>
    );

  const rows = ladder.data?.ladder ?? [];
  const byCompany = new Map<string, LadderEntry[]>();
  for (const row of rows) {
    if (!byCompany.has(row.company)) byCompany.set(row.company, []);
    byCompany.get(row.company)!.push(row);
  }
  if (byCompany.size === 0) {
    return (
      <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
        No graded price data yet for this card.
      </div>
    );
  }

  return (
    <div>
      {Array.from(byCompany.entries()).map(([company, entries]) => (
        <div key={company} style={{ marginBottom: 10 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: COMPANY_COLORS[company] ?? "var(--text-secondary)",
              marginBottom: 6,
            }}
          >
            {company}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {entries.map((e) => {
              const isSelected =
                selectedCompany === company && selectedGrade === e.grade;
              return (
                <button
                  key={`${company}-${e.grade}`}
                  onClick={() => onPick(company, e.grade)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: `1px solid ${isSelected ? "var(--gold)" : "var(--border)"}`,
                    background: isSelected
                      ? "rgba(201,168,76,0.15)"
                      : "var(--surface-2)",
                    color: isSelected ? "var(--gold)" : "var(--text-primary)",
                    fontSize: 11,
                    fontWeight: isSelected ? 700 : 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {e.grade} · ${e.price.toFixed(0)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {rows.some((r) => r.source === "pricecharting") && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
          <PriceChartingAttribution
            productId={rows.find((r) => r.source === "pricecharting")?.sourceProductId}
          />
        </div>
      )}
    </div>
  );
}

function choiceStyle(active: boolean) {
  return {
    flex: 1,
    padding: "10px 0",
    borderRadius: 8,
    border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
    background: active ? "rgba(201,168,76,0.1)" : "var(--surface-2)",
    color: active ? "var(--gold)" : "var(--text-primary)",
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}
