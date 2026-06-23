"use client";

import { useState } from "react";
import api from "../../lib/api";

export interface SoldModalItem {
  id: string;
  name: string;
  setName: string | null;
  imageSmall: string | null;
  purchasePrice: number | null;
  quantity: number | null;
  detail: string | null;
}

const PLATFORMS = [
  "eBay",
  "TCGPlayer",
  "Whatnot",
  "Facebook",
  "Local",
  "Other",
];

const money = (n: number | null | undefined) =>
  n == null
    ? "—"
    : `$${n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

export default function SoldModal({
  item,
  onClose,
  onSold,
}: {
  item: SoldModalItem;
  onClose: () => void;
  onSold: () => void;
}) {
  const [soldPrice, setSoldPrice] = useState("");
  const [soldPlatform, setSoldPlatform] = useState("");
  const [customPlatform, setCustomPlatform] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const platform =
    soldPlatform === "Other" ? customPlatform.trim() : soldPlatform;

  const handleSubmit = async () => {
    const price = Number(soldPrice);
    if (!soldPrice || Number.isNaN(price) || price < 0) {
      setError("Enter a valid sale price");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await api.patch(`/inventory/${item.id}/sold`, {
        soldPrice: price,
        soldPlatform: platform || null,
      });
      onSold();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to mark as sold");
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
          maxWidth: 480,
          width: "100%",
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
              MARK AS SOLD
            </div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              Record sale
            </h2>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginTop: 4,
              }}
            >
              This item will move to your sold inventory and track realized
              profit.
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
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            marginBottom: 20,
          }}
        >
          {item.imageSmall ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageSmall}
              alt={item.name}
              style={{
                width: 36,
                height: 50,
                objectFit: "contain",
                borderRadius: 4,
              }}
            />
          ) : (
            <div
              style={{
                width: 36,
                height: 50,
                borderRadius: 4,
                background: "var(--surface)",
              }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.name}
            </div>
            <div
              style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}
            >
              {[
                item.setName,
                item.detail,
                item.quantity != null && item.quantity > 1
                  ? `×${item.quantity}`
                  : null,
                item.purchasePrice != null
                  ? `Paid ${money(item.purchasePrice)}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Sale price *
            </span>
            <input
              type='number'
              min='0'
              step='0.01'
              placeholder='0.00'
              value={soldPrice}
              onChange={(e) => setSoldPrice(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 14,
                color: "var(--text-primary)",
                fontFamily: "DM Mono, monospace",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Platform
            </span>
            <select
              value={soldPlatform}
              onChange={(e) => setSoldPlatform(e.target.value)}
              style={{
                width: "100%",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 14,
                color: "var(--text-primary)",
                fontFamily: "inherit",
              }}
            >
              <option value=''>Select platform (optional)</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          {soldPlatform === "Other" && (
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Platform name
              </span>
              <input
                type='text'
                placeholder='Where did you sell it?'
                value={customPlatform}
                onChange={(e) => setCustomPlatform(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 14,
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                }}
              />
            </label>
          )}
        </div>

        {error && (
          <div
            style={{
              marginTop: 14,
              fontSize: 12,
              color: "#EF4444",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 24,
          }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              borderRadius: 8,
              padding: "10px 16px",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={saving}
            style={{
              border: "none",
              background: "var(--gold)",
              color: "#000",
              borderRadius: 8,
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Mark as sold"}
          </button>
        </div>
      </div>
    </div>
  );
}
