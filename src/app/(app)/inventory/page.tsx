/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCollections } from "../../../context/CollectionContext";
import {
  usePendingAction,
  PendingCard,
} from "../../../context/PendingActionContext";
import { ROUTES } from "../../../constants/routes";
import api from "../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemType = "raw_card" | "graded_card" | "sealed_product";
type GradingCompany = "PSA" | "BGS" | "CGC" | "SGC" | "TAG";
type FilterTab = "all" | "raw_card" | "graded_card" | "sealed_product";

interface CardRef {
  id: string;
  name: string;
  number: string;
  rarity: string | null;
  set_id: string;
  image_small: string | null;
  sets?: { id: string; name: string };
}

interface ProductRef {
  id: string;
  name: string;
  product_type: string;
  set_id: string;
  image_url: string | null;
}

interface MarketValue {
  marketPrice: number | null;
  source: string | null;
}

interface InventoryItem {
  id: string;
  item_type: ItemType;
  card_id: string | null;
  product_id: string | null;
  grading_company: GradingCompany | null;
  grade: string | null;
  serial_number: string | null;
  is_sealed: boolean | null;
  purchase_price: number | null;
  purchase_date: string | null;
  notes: string | null;
  added_at: string;
  card: CardRef | null;
  product: ProductRef | null;
  marketValue: MarketValue;
  gainLoss: number | null;
  gainLossPct: number | null;
}

interface InventorySummary {
  totalItems: number;
  rawCards: number;
  gradedCards: number;
  sealedProducts: number;
  totalCostBasis: number;
  totalMarketValue: number;
  totalGainLoss: number;
  totalGainLossPct: number | null;
}

interface SearchResult {
  id: string;
  name: string;
  number?: string;
  set_id?: string;
  image_small?: string | null;
  image_url?: string | null;
  product_type?: string;
  sets?: { name: string };
  _type: "card" | "product";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADING_COMPANIES: GradingCompany[] = ["PSA", "BGS", "CGC", "SGC", "TAG"];

const COMPANY_COLORS: Record<GradingCompany, string> = {
  PSA: "#C9A84C",
  BGS: "#378ADD",
  CGC: "#3DAA6E",
  SGC: "#7F77DD",
  TAG: "#D85A30",
};

const GRADES_BY_COMPANY: Record<GradingCompany, string[]> = {
  PSA: ["10", "9", "8", "7", "6", "5", "4", "3", "2", "1"],
  BGS: ["Black Label", "10", "9.5", "9", "8.5", "8", "7.5", "7", "6", "5"],
  CGC: ["Pristine 10", "10", "9.5", "9", "8.5", "8", "7.5", "7", "6", "5"],
  SGC: ["10", "9.5", "9", "8.5", "8", "7.5", "7", "6", "5", "4"],
  TAG: ["Pristine 10", "10", "9", "8", "7", "6", "5"],
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  booster_box: "Booster Box",
  elite_trainer_box: "ETB",
  ultra_premium_collection: "UPC",
  special_collection: "Special Collection",
  tin: "Tin",
  bundle: "Bundle",
  blister: "Blister",
  promo_pack: "Promo Pack",
  collection: "Collection",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number | null | undefined) =>
  v != null ? `$${v.toFixed(2)}` : "—";

const fmtPct = (v: number | null | undefined) =>
  v != null ? `${v >= 0 ? "+" : ""}${v.toFixed(1)}%` : "—";

const gainColor = (v: number | null | undefined) =>
  v == null ? "var(--text-dim)" : v >= 0 ? "#3DAA6E" : "#C94C4C";

// ─── Debounced search hook ────────────────────────────────────────────────────

function useSearch(query: string, type: "cards" | "products", delay = 300) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        if (type === "cards") {
          const res = await api.get<{ data: any[] }>(
            `/cards/search?q=${encodeURIComponent(query)}&pageSize=22`,
          );
          console.log(res.data.data);
          setResults(
            (res.data.data ?? []).map((c: any) => ({
              id: c.id,
              name: c.name,
              number: c.number ?? null,
              set_id: c.set?.id ?? c.set_id ?? null,
              // Handle both PokemonCard shape (images.small) and DB shape (image_small)
              image_small: c.images?.small ?? c.image_small ?? null,
              // Handle both shapes for set name
              sets: c.set ? { name: c.set.name } : (c.sets ?? null),
              _type: "card" as const,
            })),
          );
        } else {
          const res = await api.get<{ data: any }>(
            `/cards/search/global?q=${encodeURIComponent(query)}`,
          );
          setResults(
            (res.data.data?.products ?? []).map((p: any) => ({
              id: p.id,
              name: p.name,
              product_type: p.product_type,
              set_id: p.set_id ?? null,
              image_url: p.image_url ?? null,
              sets: p.set_id ? { name: p.set_id } : null,
              _type: "product" as const,
            })),
          );
        }
      } catch (err) {
        console.error("[useSearch] failed:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [query, type, delay]);

  return {
    results: query.length < 2 ? [] : results,
    loading: query.length < 2 ? false : loading,
  };
}

// ─── Summary bar ─────────────────────────────────────────────────────────────

function SummaryBar({ summary }: { summary: InventorySummary }) {
  const gainColor2 = summary.totalGainLoss >= 0 ? "#3DAA6E" : "#C94C4C";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12,
        marginBottom: 28,
      }}
    >
      {[
        {
          label: "TOTAL ITEMS",
          value: summary.totalItems.toString(),
          sub: `${summary.rawCards} raw · ${summary.gradedCards} graded · ${summary.sealedProducts} sealed`,
          color: "var(--text-primary)",
        },
        {
          label: "COST BASIS",
          value: fmt(summary.totalCostBasis),
          sub: "Total invested",
          color: "var(--text-primary)",
        },
        {
          label: "MARKET VALUE",
          value: fmt(summary.totalMarketValue),
          sub: "Based on current prices",
          color: "var(--gold)",
        },
        {
          label: "GAIN / LOSS",
          value: `${summary.totalGainLoss >= 0 ? "+" : ""}${fmt(summary.totalGainLoss)}`,
          sub: fmtPct(summary.totalGainLossPct),
          color: gainColor2,
        },
      ].map((stat) => (
        <div
          key={stat.label}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "16px 20px",
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "var(--text-dim)",
              letterSpacing: "0.1em",
              fontFamily: "DM Mono, monospace",
              marginBottom: 8,
            }}
          >
            {stat.label}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: stat.color,
              fontFamily: "DM Mono, monospace",
              lineHeight: 1,
              marginBottom: 4,
            }}
          >
            {stat.value}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
            {stat.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Item card ────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  onEdit,
  onDelete,
  onOpen,
  selected,
  onSelect,
}: {
  item: InventoryItem;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onOpen: (item: InventoryItem) => void;
  selected?: boolean;
  onSelect?: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const isSealed = item.item_type === "sealed_product" && item.is_sealed;
  const image = item.card?.image_small ?? item.product?.image_url ?? null;
  const name = item.card?.name ?? item.product?.name ?? "Unknown";
  const setName = item.card?.sets?.name ?? "";
  const cardNumber = item.card?.number ? `#${item.card.number}` : "";

  return (
    <div
      style={{
        background: "var(--surface)",
        border: selected ? "2px solid var(--gold)" : "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        transition: "border-color 0.15s ease, transform 0.15s ease",
        position: "relative",
        cursor: onSelect ? "pointer" : "default",
      }}
      onClick={
        onSelect
          ? (e) => {
              e.stopPropagation();
              onSelect(item.id);
            }
          : undefined
      }
      onMouseEnter={(e) => {
        if (!selected)
          (e.currentTarget as HTMLDivElement).style.borderColor =
            "var(--gold-dim)";
        (e.currentTarget as HTMLDivElement).style.transform =
          "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          (e.currentTarget as HTMLDivElement).style.borderColor =
            "var(--border)";
        }
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Image */}
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
        {image ? (
          <img
            src={image}
            alt={name}
            style={{ maxHeight: 130, maxWidth: "100%", objectFit: "contain" }}
          />
        ) : (
          <div style={{ fontSize: 28, color: "var(--text-dim)" }}>□</div>
        )}

        {/* Type badge */}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            fontSize: 9,
            fontFamily: "DM Mono, monospace",
            letterSpacing: "0.06em",
            padding: "2px 7px",
            borderRadius: 10,
            background:
              item.item_type === "graded_card"
                ? `${COMPANY_COLORS[item.grading_company!]}22`
                : item.item_type === "sealed_product"
                  ? "rgba(55,138,221,0.15)"
                  : "rgba(201,168,76,0.15)",
            color:
              item.item_type === "graded_card"
                ? COMPANY_COLORS[item.grading_company!]
                : item.item_type === "sealed_product"
                  ? "#378ADD"
                  : "var(--gold)",
            border: `1px solid ${
              item.item_type === "graded_card"
                ? `${COMPANY_COLORS[item.grading_company!]}44`
                : item.item_type === "sealed_product"
                  ? "rgba(55,138,221,0.3)"
                  : "rgba(201,168,76,0.3)"
            }`,
          }}
        >
          {item.item_type === "graded_card"
            ? `${item.grading_company} ${item.grade}`
            : item.item_type === "sealed_product"
              ? isSealed
                ? "SEALED"
                : "OPENED"
              : "RAW"}
        </div>

        {/* Menu */}
        <div ref={menuRef} style={{ position: "absolute", top: 8, right: 8 }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-dim)",
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ⋯
          </button>
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: 30,
                right: 0,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                overflow: "hidden",
                zIndex: 10,
                minWidth: 140,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}
            >
              {[
                {
                  label: "Edit",
                  action: () => {
                    onEdit(item);
                    setMenuOpen(false);
                  },
                },
                ...(isSealed
                  ? [
                      {
                        label: "Open product",
                        action: () => {
                          onOpen(item);
                          setMenuOpen(false);
                        },
                      },
                    ]
                  : []),
                {
                  label: "Remove",
                  action: () => {
                    onDelete(item.id);
                    setMenuOpen(false);
                  },
                  danger: true,
                },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={opt.action}
                  style={{
                    width: "100%",
                    padding: "9px 14px",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    background: "transparent",
                    color: (opt as any).danger
                      ? "#C94C4C"
                      : "var(--text-secondary)",
                    fontSize: 12,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "14px 16px" }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 2,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-dim)",
            fontFamily: "DM Mono, monospace",
            marginBottom: 12,
          }}
        >
          {setName} {cardNumber}
          {item.item_type === "sealed_product" &&
            item.product?.product_type &&
            ` · ${PRODUCT_TYPE_LABELS[item.product.product_type] ?? item.product.product_type}`}
        </div>

        {/* Serial number */}
        {item.serial_number && (
          <div
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              fontFamily: "DM Mono, monospace",
              marginBottom: 10,
            }}
          >
            S/N: {item.serial_number}
          </div>
        )}

        {/* Prices */}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: 10,
            display: "flex",
            flexDirection: "column",
            gap: 5,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
              Market
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: item.marketValue.marketPrice
                  ? "var(--gold)"
                  : "var(--text-dim)",
                fontFamily: "DM Mono, monospace",
              }}
            >
              {fmt(item.marketValue.marketPrice)}
            </span>
          </div>

          {item.purchase_price != null && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                Paid
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  fontFamily: "DM Mono, monospace",
                }}
              >
                {fmt(item.purchase_price)}
              </span>
            </div>
          )}

          {item.gainLoss != null && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                G/L
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: gainColor(item.gainLoss),
                  fontFamily: "DM Mono, monospace",
                }}
              >
                {item.gainLoss >= 0 ? "+" : ""}
                {fmt(item.gainLoss)}
                {item.gainLossPct != null && (
                  <span style={{ fontSize: 10, marginLeft: 4 }}>
                    ({fmtPct(item.gainLossPct)})
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Add/Edit modal ───────────────────────────────────────────────────────────

function AddEditModal({
  editItem,
  activeCollectionId,
  onClose,
  onSaved,
}: {
  editItem: InventoryItem | null;
  activeCollectionId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!editItem;

  const [itemType, setItemType] = useState<ItemType>(
    editItem?.item_type ?? "raw_card",
  );
  const [gradingCompany, setGradingCompany] = useState<GradingCompany | "">(
    editItem?.grading_company ?? "",
  );
  const [grade, setGrade] = useState(editItem?.grade ?? "");
  const [serialNumber, setSerialNumber] = useState(
    editItem?.serial_number ?? "",
  );
  const [isSealed, setIsSealed] = useState(editItem?.is_sealed ?? true);
  const [purchasePrice, setPurchasePrice] = useState(
    editItem?.purchase_price?.toString() ?? "",
  );
  const [purchaseDate, setPurchaseDate] = useState(
    editItem?.purchase_date ?? "",
  );
  const [notes, setNotes] = useState(editItem?.notes ?? "");

  // Card / product search
  const [cardSearch, setCardSearch] = useState("");
  const [selectedCard, setSelectedCard] = useState<SearchResult | null>(
    editItem?.card
      ? { ...editItem.card, _type: "card", number: editItem.card.number }
      : null,
  );
  const [selectedProduct, setSelectedProduct] = useState<SearchResult | null>(
    editItem?.product ? { ...editItem.product, _type: "product" } : null,
  );
  const [showDropdown, setShowDropdown] = useState(false);

  const searchType = itemType === "sealed_product" ? "products" : "cards";
  const { results, loading: searchLoading } = useSearch(cardSearch, searchType);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    if (!isEdit) {
      if (
        (itemType === "raw_card" || itemType === "graded_card") &&
        !selectedCard
      ) {
        setError("Please select a card");
        return;
      }
      if (itemType === "graded_card" && (!gradingCompany || !grade)) {
        setError("Please select grading company and grade");
        return;
      }
      if (itemType === "sealed_product" && !selectedProduct) {
        setError("Please select a product");
        return;
      }
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        purchasePrice: purchasePrice ? Number(purchasePrice) : null,
        purchaseDate: purchaseDate || null,
        notes: notes || null,
      };

      if (!isEdit) {
        body.itemType = itemType;
        if (itemType !== "sealed_product") body.cardId = selectedCard?.id;
        if (itemType === "sealed_product") body.productId = selectedProduct?.id;
        if (itemType === "graded_card") {
          body.gradingCompany = gradingCompany;
          body.grade = grade;
          body.serialNumber = serialNumber || null;
        }
        if (itemType === "sealed_product") body.isSealed = isSealed;
        await api.post("/inventory", {
          ...body,
          collection_id: activeCollectionId ?? undefined,
        });
      } else {
        if (itemType === "graded_card") {
          body.gradingCompany = gradingCompany || null;
          body.grade = grade || null;
          body.serialNumber = serialNumber || null;
        }
        if (itemType === "sealed_product") body.isSealed = isSealed;
        await api.put(`/inventory/${editItem!.id}`, body);
      }

      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "9px 13px",
    fontSize: 13,
    color: "var(--text-primary)",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    fontSize: 11,
    color: "var(--text-secondary)",
    marginBottom: 6,
    display: "block",
    letterSpacing: "0.04em",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
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
          padding: 32,
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
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
              {isEdit ? "EDIT ITEM" : "ADD TO INVENTORY"}
            </div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              {isEdit
                ? (editItem.card?.name ?? editItem.product?.name)
                : "New inventory item"}
            </h2>
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

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Item type — only on add */}
          {!isEdit && (
            <div>
              <label style={labelStyle}>Item type</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(
                  [
                    { key: "raw_card", label: "Raw Card" },
                    { key: "graded_card", label: "Graded Card" },
                    { key: "sealed_product", label: "Product" },
                  ] as { key: ItemType; label: string }[]
                ).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => {
                      setItemType(t.key);
                      setSelectedCard(null);
                      setSelectedProduct(null);
                      setCardSearch("");
                    }}
                    style={{
                      flex: 1,
                      padding: "8px 4px",
                      borderRadius: 8,
                      border: `1px solid ${itemType === t.key ? "var(--gold)" : "var(--border)"}`,
                      background:
                        itemType === t.key
                          ? "rgba(201,168,76,0.1)"
                          : "var(--surface-2)",
                      color:
                        itemType === t.key
                          ? "var(--gold)"
                          : "var(--text-secondary)",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Card / product search — only on add */}
          {!isEdit && (
            <div style={{ position: "relative" }}>
              <label style={labelStyle}>
                {itemType === "sealed_product"
                  ? "Search product"
                  : "Search card"}
              </label>
              {selectedCard || selectedProduct ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "var(--surface-2)",
                    border: "1px solid var(--gold)",
                    borderRadius: 8,
                    padding: "8px 12px",
                  }}
                >
                  {(selectedCard?.image_small ||
                    selectedProduct?.image_url) && (
                    <img
                      src={
                        selectedCard?.image_small ??
                        selectedProduct?.image_url ??
                        ""
                      }
                      alt=''
                      style={{
                        width: 28,
                        height: 40,
                        objectFit: "contain",
                        borderRadius: 3,
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--text-primary)",
                      }}
                    >
                      {selectedCard?.name ?? selectedProduct?.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-dim)",
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      {selectedCard?.sets?.name ??
                        (selectedProduct?.product_type
                          ? PRODUCT_TYPE_LABELS[selectedProduct.product_type]
                          : "")}
                      {selectedCard?.number ? ` · #${selectedCard.number}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCard(null);
                      setSelectedProduct(null);
                      setCardSearch("");
                    }}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--text-dim)",
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <input
                    value={cardSearch}
                    onChange={(e) => {
                      setCardSearch(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder={
                      itemType === "sealed_product"
                        ? "Search booster boxes, ETBs..."
                        : "Search by card name..."
                    }
                    style={inputStyle}
                  />
                  {showDropdown && cardSearch.length >= 2 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: 4,
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
                        zIndex: 100,
                        maxHeight: 280,
                        overflowY: "auto",
                      }}
                    >
                      {searchLoading && (
                        <div
                          style={{
                            padding: "12px 16px",
                            fontSize: 12,
                            color: "var(--text-dim)",
                          }}
                        >
                          Searching...
                        </div>
                      )}
                      {!searchLoading && results.length === 0 && (
                        <div
                          style={{
                            padding: "12px 16px",
                            fontSize: 12,
                            color: "var(--text-dim)",
                          }}
                        >
                          No results found
                        </div>
                      )}
                      {results.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            if (r._type === "card") setSelectedCard(r);
                            else setSelectedProduct(r);
                            setCardSearch("");
                            setShowDropdown(false);
                          }}
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
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              "var(--surface-2)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          {(r.image_small || r.image_url) && (
                            <img
                              src={r.image_small ?? r.image_url ?? ""}
                              alt=''
                              style={{
                                width: 24,
                                height: 34,
                                objectFit: "contain",
                                borderRadius: 2,
                              }}
                            />
                          )}
                          <div>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: "var(--text-primary)",
                              }}
                            >
                              {r.name}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--text-dim)",
                                fontFamily: "DM Mono, monospace",
                              }}
                            >
                              {r.sets?.name}
                              {r.number ? ` · #${r.number}` : ""}
                              {r.product_type
                                ? ` · ${PRODUCT_TYPE_LABELS[r.product_type] ?? r.product_type}`
                                : ""}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Grading fields */}
          {itemType === "graded_card" && (
            <>
              <div>
                <label style={labelStyle}>Grading company</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {GRADING_COMPANIES.map((co) => (
                    <button
                      key={co}
                      onClick={() => {
                        setGradingCompany(co);
                        setGrade("");
                      }}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 6,
                        border: `1px solid ${gradingCompany === co ? COMPANY_COLORS[co] : "var(--border)"}`,
                        background:
                          gradingCompany === co
                            ? `${COMPANY_COLORS[co]}18`
                            : "transparent",
                        color:
                          gradingCompany === co
                            ? COMPANY_COLORS[co]
                            : "var(--text-secondary)",
                        fontSize: 12,
                        cursor: "pointer",
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      {co}
                    </button>
                  ))}
                </div>
              </div>

              {gradingCompany && (
                <div>
                  <label style={labelStyle}>Grade</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {GRADES_BY_COMPANY[gradingCompany].map((g) => (
                      <button
                        key={g}
                        onClick={() => setGrade(g)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 6,
                          border: `1px solid ${grade === g ? COMPANY_COLORS[gradingCompany] : "var(--border)"}`,
                          background:
                            grade === g
                              ? `${COMPANY_COLORS[gradingCompany]}18`
                              : "transparent",
                          color:
                            grade === g
                              ? COMPANY_COLORS[gradingCompany]
                              : "var(--text-secondary)",
                          fontSize: 12,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={labelStyle}>Serial number (optional)</label>
                <input
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder='e.g. 12345678'
                  style={inputStyle}
                />
              </div>
            </>
          )}

          {/* Sealed status */}
          {itemType === "sealed_product" && (
            <div>
              <label style={labelStyle}>Status</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { v: true, label: "Sealed" },
                  { v: false, label: "Opened" },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setIsSealed(opt.v)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: 8,
                      border: `1px solid ${isSealed === opt.v ? "var(--gold)" : "var(--border)"}`,
                      background:
                        isSealed === opt.v
                          ? "rgba(201,168,76,0.1)"
                          : "var(--surface-2)",
                      color:
                        isSealed === opt.v
                          ? "var(--gold)"
                          : "var(--text-secondary)",
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Purchase info */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label style={labelStyle}>Purchase price (optional)</label>
              <input
                type='number'
                min='0'
                step='0.01'
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder='0.00'
                style={{ ...inputStyle, fontFamily: "DM Mono, monospace" }}
              />
            </div>
            <div>
              <label style={labelStyle}>Purchase date (optional)</label>
              <input
                type='date'
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                style={{ ...inputStyle, colorScheme: "dark" }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder='Any notes about this item...'
              rows={2}
              style={{
                ...inputStyle,
                resize: "vertical",
                lineHeight: 1.5,
              }}
            />
          </div>

          {error && (
            <div
              style={{
                fontSize: 12,
                color: "#C94C4C",
                padding: "8px 12px",
                background: "rgba(201,76,76,0.1)",
                borderRadius: 6,
                border: "1px solid rgba(201,76,76,0.2)",
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              marginTop: 4,
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: "9px 20px",
                borderRadius: 8,
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
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "9px 24px",
                borderRadius: 8,
                border: "none",
                background: "var(--gold)",
                color: "#0D0E11",
                fontSize: 13,
                fontWeight: 500,
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving
                ? "Saving..."
                : isEdit
                  ? "Save changes"
                  : "Add to inventory"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Open product modal ───────────────────────────────────────────────────────

function OpenProductModal({
  item,
  onClose,
  onOpened,
}: {
  item: InventoryItem;
  onClose: () => void;
  onOpened: () => void;
}) {
  const [pulledCards, setPulledCards] = useState<
    {
      id: string;
      cardId: string;
      cardName: string;
      image: string | null;
      purchasePrice: string;
      notes: string;
    }[]
  >([]);
  const [search, setSearch] = useState("");
  const [showDrop, setShowDrop] = useState(false);
  const { results, loading } = useSearch(search, "cards");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addCard = (r: SearchResult) => {
    setPulledCards((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        cardId: r.id,
        cardName: r.name,
        image: r.image_small ?? null,
        purchasePrice: "",
        notes: "",
      },
    ]);
    setSearch("");
    setShowDrop(false);
  };

  const removeCard = (id: string) =>
    setPulledCards((prev) => prev.filter((c) => c.id !== id));

  const handleOpen = async () => {
    if (!pulledCards.length) {
      setError("Add at least one pulled card");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post(`/inventory/${item.id}/open`, {
        pulledCards: pulledCards.map((c) => ({
          cardId: c.cardId,
          purchasePrice: c.purchasePrice ? Number(c.purchasePrice) : null,
          notes: c.notes || null,
        })),
      });
      onOpened();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to open product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
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
          padding: 32,
          maxWidth: 560,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
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
              }}
            >
              {item.product?.name}
            </h2>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginTop: 4,
              }}
            >
              Record the cards you pulled. They will be added to your inventory
              and this product will be removed.
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

        {/* Card search */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowDrop(true);
            }}
            onFocus={() => setShowDrop(true)}
            placeholder='Search and add pulled cards...'
            style={{
              width: "100%",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "9px 13px",
              fontSize: 13,
              color: "var(--text-primary)",
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {showDrop && search.length >= 2 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: 4,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
                zIndex: 100,
                maxHeight: 240,
                overflowY: "auto",
              }}
            >
              {loading && (
                <div
                  style={{
                    padding: "10px 14px",
                    fontSize: 12,
                    color: "var(--text-dim)",
                  }}
                >
                  Searching...
                </div>
              )}
              {!loading && results.length === 0 && (
                <div
                  style={{
                    padding: "10px 14px",
                    fontSize: 12,
                    color: "var(--text-dim)",
                  }}
                >
                  No results
                </div>
              )}
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => addCard(r)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 14px",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {r.image_small && (
                    <img
                      src={r.image_small}
                      alt=''
                      style={{ width: 22, height: 30, objectFit: "contain" }}
                    />
                  )}
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--text-primary)",
                      }}
                    >
                      {r.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-dim)",
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      {r.sets?.name}
                      {r.number ? ` · #${r.number}` : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pulled cards list */}
        {pulledCards.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                marginBottom: 4,
              }}
            >
              {pulledCards.length} card{pulledCards.length !== 1 ? "s" : ""}{" "}
              added
            </div>
            {pulledCards.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                {c.image && (
                  <img
                    src={c.image}
                    alt=''
                    style={{
                      width: 24,
                      height: 34,
                      objectFit: "contain",
                      borderRadius: 2,
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      marginBottom: 6,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {c.cardName}
                  </div>
                  <input
                    type='number'
                    min='0'
                    step='0.01'
                    placeholder='Purchase price (optional)'
                    value={c.purchasePrice}
                    onChange={(e) =>
                      setPulledCards((prev) =>
                        prev.map((p) =>
                          p.id === c.id
                            ? { ...p, purchasePrice: e.target.value }
                            : p,
                        ),
                      )
                    }
                    style={{
                      width: "100%",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 5,
                      padding: "5px 9px",
                      fontSize: 11,
                      color: "var(--text-primary)",
                      fontFamily: "DM Mono, monospace",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <button
                  onClick={() => removeCard(c.id)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--text-dim)",
                    cursor: "pointer",
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {pulledCards.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "24px 0",
              color: "var(--text-dim)",
              fontSize: 13,
            }}
          >
            Search for cards you pulled from this product
          </div>
        )}

        {error && (
          <div
            style={{
              fontSize: 12,
              color: "#C94C4C",
              padding: "8px 12px",
              background: "rgba(201,76,76,0.1)",
              borderRadius: 6,
              border: "1px solid rgba(201,76,76,0.2)",
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            borderTop: "1px solid var(--border)",
            paddingTop: 16,
            marginTop: 4,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
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
            disabled={saving || !pulledCards.length}
            style={{
              padding: "9px 24px",
              borderRadius: 8,
              border: "none",
              background: pulledCards.length
                ? "var(--gold)"
                : "var(--surface-2)",
              color: pulledCards.length ? "#0D0E11" : "var(--text-dim)",
              fontSize: 13,
              fontWeight: 500,
              cursor: saving || !pulledCards.length ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving
              ? "Opening..."
              : `Open product — add ${pulledCards.length} card${pulledCards.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [openItem, setOpenItem] = useState<InventoryItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const {
    collections,
    activeCollectionId,
    activeCollection,
    setActiveCollectionId,
  } = useCollections();
  const hasMultipleCollections = collections.length > 1;
  const router = useRouter();
  const { setPendingAction } = usePendingAction();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedItems = items.filter((item) => selectedIds.has(item.id));

  const buildPendingCards = (items: InventoryItem[]): PendingCard[] =>
    items.map((item) => ({
      inventoryId: item.id,
      cardId: item.card_id,
      name: item.card?.name ?? item.product?.name ?? "Unknown",
      number: item.card?.number ?? "",
      setName: item.card?.sets?.name ?? "",
      imageSmall: item.card?.image_small ?? item.product?.image_url ?? null,
      marketPrice: item.marketValue?.marketPrice ?? null,
      purchasePrice: item.purchase_price,
      itemType: item.item_type,
      gradingCompany: item.grading_company,
      grade: item.grade,
    }));

  const handleTrade = () => {
    setPendingAction(buildPendingCards(selectedItems), "trade");
    router.push(ROUTES.GRADING);
  };

  const handleSubmit = () => {
    setPendingAction(buildPendingCards(selectedItems), "submit");
    router.push(ROUTES.GRADING);
  };

  const load = useCallback(async () => {
    try {
      const params = activeCollectionId
        ? `?collectionId=${activeCollectionId}`
        : "";
      const res = await api.get<{
        data: { items: InventoryItem[]; summary: InventorySummary };
      }>(`/inventory${params}`);
      setItems(res.data.data.items ?? []);
      setSummary(res.data.data.summary ?? null);
    } catch (err) {
      console.error("[Inventory] Load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [activeCollectionId]);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(t);
  }, [load]);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/inventory/${id}`);
      setDeleteConfirm(null);
      load();
    } catch (err) {
      console.error("[Inventory] Delete failed:", err);
    }
  };

  const filtered = items.filter((item) => {
    const matchTab = filterTab === "all" || item.item_type === filterTab;
    const matchSearch =
      !search ||
      (item.card?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (item.product?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (item.card?.sets?.name ?? "")
        .toLowerCase()
        .includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: items.length },
    { key: "raw_card", label: "Raw Cards", count: summary?.rawCards ?? 0 },
    { key: "graded_card", label: "Graded", count: summary?.gradedCards ?? 0 },
    {
      key: "sealed_product",
      label: "Sealed",
      count: summary?.sealedProducts ?? 0,
    },
  ];

  return (
    <>
      {/* Modals */}
      {(showAddModal || editItem) && (
        <AddEditModal
          editItem={editItem}
          activeCollectionId={activeCollectionId}
          onClose={() => {
            setShowAddModal(false);
            setEditItem(null);
          }}
          onSaved={() => {
            setShowAddModal(false);
            setEditItem(null);
            load();
          }}
        />
      )}
      {openItem && (
        <OpenProductModal
          item={openItem}
          onClose={() => setOpenItem(null)}
          onOpened={() => {
            setOpenItem(null);
            load();
          }}
        />
      )}
      {deleteConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "28px 32px",
              maxWidth: 360,
              width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚠</div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "var(--text-primary)",
                marginBottom: 8,
              }}
            >
              Remove from inventory?
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginBottom: 24,
              }}
            >
              This action cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  flex: 1,
                  padding: "9px",
                  borderRadius: 8,
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
                onClick={() => handleDelete(deleteConfirm)}
                style={{
                  flex: 1,
                  padding: "9px",
                  borderRadius: 8,
                  border: "none",
                  background: "#C94C4C",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "32px 40px", maxWidth: 1400, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 28,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: "var(--gold)",
                letterSpacing: "0.1em",
                fontFamily: "DM Mono, monospace",
                marginBottom: 8,
              }}
            >
              {activeCollection
                ? activeCollection.name.toUpperCase()
                : "ALL COLLECTIONS"}
            </div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 500,
                color: "var(--text-primary)",
                marginBottom: 4,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {activeCollection ? (
                <>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: activeCollection.color,
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  {activeCollection.name}
                </>
              ) : (
                "Inventory"
              )}
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {activeCollection
                ? `${summary?.totalItems ?? 0} items · $${(summary?.totalMarketValue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} market value`
                : "Track your raw cards, graded cards, and sealed products"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Desktop: show full "Manage Collections" label. Mobile: icon only */}
            <a
              href='/inventory/collections'
              className='inventory-manage-btn'
              style={{
                padding: "10px 14px",
                borderRadius: 9,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: 12,
                fontFamily: "inherit",
                textDecoration: "none",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>◈</span>
              <span className='inventory-manage-label'>Manage Collections</span>
            </a>
            <button
              onClick={() => setShowAddModal(true)}
              className='inventory-add-btn'
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: 9,
                border: "none",
                background: "var(--gold)",
                color: "#0D0E11",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
              Add item
            </button>
          </div>
        </div>

        {/* ── Collection switcher ──────────────────────────────────────────────
            Always visible. Shows pills for each collection + a + New pill.
            On mobile: horizontally scrollable. On desktop: wraps.
        ── */}
        <div className='inventory-collection-row'>
          {hasMultipleCollections && (
            <button
              onClick={() => setActiveCollectionId(null)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                border: `1px solid ${activeCollectionId === null ? "var(--gold)" : "var(--border)"}`,
                background:
                  activeCollectionId === null
                    ? "rgba(201,168,76,0.12)"
                    : "transparent",
                color:
                  activeCollectionId === null
                    ? "var(--gold)"
                    : "var(--text-secondary)",
                cursor: "pointer",
                fontFamily: "inherit",
                flexShrink: 0,
              }}
            >
              All
            </button>
          )}
          {collections.map((col) => (
            <button
              key={col.id}
              onClick={() => setActiveCollectionId(col.id)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                border: `1px solid ${activeCollectionId === col.id ? col.color : "var(--border)"}`,
                background:
                  activeCollectionId === col.id
                    ? `${col.color}20`
                    : "transparent",
                color:
                  activeCollectionId === col.id
                    ? col.color
                    : "var(--text-secondary)",
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: col.color,
                  display: "inline-block",
                }}
              />
              {col.name}
              {col.itemCount > 0 && (
                <span style={{ fontSize: 10, opacity: 0.65 }}>
                  {col.itemCount}
                </span>
              )}
            </button>
          ))}
          {/* + New Collection pill — always shown */}
          <a
            href='/inventory/collections'
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              border: "1px dashed var(--border)",
              background: "transparent",
              color: "var(--text-dim)",
              fontFamily: "inherit",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 4,
              flexShrink: 0,
            }}
          >
            + New Collection
          </a>
        </div>

        {/* Summary */}
        {summary && <SummaryBar summary={summary} />}

        {/* Tabs + search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border)",
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", gap: 0 }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderBottom: `2px solid ${filterTab === tab.key ? "var(--gold)" : "transparent"}`,
                  background: "transparent",
                  color:
                    filterTab === tab.key
                      ? "var(--text-primary)"
                      : "var(--text-dim)",
                  fontSize: 13,
                  fontWeight: filterTab === tab.key ? 500 : 400,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  marginBottom: -1,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {tab.label}
                <span
                  style={{
                    fontSize: 10,
                    padding: "1px 6px",
                    borderRadius: 10,
                    background:
                      filterTab === tab.key
                        ? "rgba(201,168,76,0.15)"
                        : "var(--surface-2)",
                    color:
                      filterTab === tab.key ? "var(--gold)" : "var(--text-dim)",
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 14,
                color: "var(--text-dim)",
              }}
            >
              ⌕
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search inventory...'
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 14px 8px 32px",
                fontSize: 12,
                color: "var(--text-primary)",
                fontFamily: "inherit",
                outline: "none",
                width: 220,
              }}
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: 80,
              color: "var(--text-dim)",
              fontSize: 13,
            }}
          >
            Loading inventory...
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <div
              style={{
                fontSize: 36,
                marginBottom: 16,
                color: "var(--text-dim)",
              }}
            >
              □
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "var(--text-primary)",
                marginBottom: 8,
              }}
            >
              {items.length === 0
                ? "Your inventory is empty"
                : "No items match your filter"}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                marginBottom: 24,
              }}
            >
              {items.length === 0
                ? activeCollection
                  ? `No cards in "${activeCollection.name}" yet. Add one with the button above.`
                  : "Add raw cards, graded cards, or sealed products to start tracking your collection"
                : "Try adjusting your search or filter"}
            </div>
            {items.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  padding: "10px 24px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--gold)",
                  color: "#0D0E11",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Add your first item
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {!loading && filtered.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            {filtered.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onEdit={setEditItem}
                onDelete={(id) => setDeleteConfirm(id)}
                onOpen={setOpenItem}
                selected={selectedIds.has(item.id)}
                onSelect={toggleSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Floating selection action bar ── */}
      {selectedIds.size > 0 && (
        <div
          className='inventory-float-bar'
          style={{
            position: "fixed",
            bottom: "calc(var(--mobile-nav-height, 0px) + 16px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            minWidth: 280,
            maxWidth: "90vw",
          }}
        >
          {/* Count badge */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--gold)",
              color: "#0D0E11",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "DM Mono, monospace",
              flexShrink: 0,
            }}
          >
            {selectedIds.size}
          </div>

          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              flex: 1,
              whiteSpace: "nowrap",
            }}
          >
            card{selectedIds.size !== 1 ? "s" : ""} selected
          </div>

          {/* Submit for grading — any count */}
          <button
            onClick={handleSubmit}
            title='Submit selected cards for grading'
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid rgba(59,130,246,0.4)",
              background: "rgba(59,130,246,0.1)",
              color: "#3B82F6",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Submit for Grading
          </button>

          {/* Trade Calculator */}
          <button
            onClick={handleTrade}
            title='Send to Trade Calculator'
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "none",
              background: "var(--gold)",
              color: "#0D0E11",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            ⇄ Trade
          </button>

          {/* Clear */}
          <button
            onClick={clearSelection}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-dim)",
              cursor: "pointer",
              fontSize: 16,
              padding: "4px",
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
