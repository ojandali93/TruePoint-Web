/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useCallback } from "react";
import api from "../../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VariantDef {
  type: string;
  label: string;
  color: string;
  sort_order: number;
}

interface SetVariantRule {
  rarity: string;
  variants: VariantDef[];
}

interface CardData {
  id: string;
  name: string;
  number: string;
  rarity: string | null;
  images: { small: string | null };
  variants?: VariantDef[];
}

interface PokemonSet {
  id: string;
  name: string;
  series: string;
  status?: "pending" | "ready";
}

// ─── All known variant types ──────────────────────────────────────────────────
// Grouped for display — common ones shown by default, rare ones collapsible

const VARIANT_GROUPS: { label: string; variants: VariantDef[] }[] = [
  {
    label: "Standard",
    variants: [
      { type: "normal", label: "Normal", color: "#6B7280", sort_order: 0 },
      {
        type: "reverse_holo",
        label: "Reverse Holo",
        color: "#A78BFA",
        sort_order: 1,
      },
      { type: "holo", label: "Holofoil", color: "#F59E0B", sort_order: 2 },
      {
        type: "first_edition",
        label: "1st Edition",
        color: "#10B981",
        sort_order: 3,
      },
      {
        type: "shadowless",
        label: "Shadowless",
        color: "#64748B",
        sort_order: 4,
      },
    ],
  },
  {
    label: "Ball Holos",
    variants: [
      {
        type: "pokeball_holo",
        label: "Poké Ball Holo",
        color: "#EF4444",
        sort_order: 10,
      },
      {
        type: "masterball_holo",
        label: "Master Ball Holo",
        color: "#8B5CF6",
        sort_order: 11,
      },
      {
        type: "greatball_holo",
        label: "Great Ball Holo",
        color: "#3B82F6",
        sort_order: 12,
      },
      {
        type: "ultraball_holo",
        label: "Ultra Ball Holo",
        color: "#F97316",
        sort_order: 13,
      },
      {
        type: "loveball_holo",
        label: "Love Ball Holo",
        color: "#FB7185",
        sort_order: 14,
      },
      {
        type: "friendball_holo",
        label: "Friend Ball Holo",
        color: "#4ADE80",
        sort_order: 15,
      },
      {
        type: "quickball_holo",
        label: "Quick Ball Holo",
        color: "#FDE68A",
        sort_order: 16,
      },
      {
        type: "duskball_holo",
        label: "Dusk Ball Holo",
        color: "#7C3AED",
        sort_order: 17,
      },
    ],
  },
  {
    label: "Special Foils",
    variants: [
      {
        type: "energy_holo",
        label: "Energy Holo",
        color: "#06B6D4",
        sort_order: 20,
      },
      {
        type: "cosmos_holo",
        label: "Cosmos Holo",
        color: "#EC4899",
        sort_order: 21,
      },
      {
        type: "galaxy_holo",
        label: "Galaxy Holo",
        color: "#6366F1",
        sort_order: 22,
      },
      {
        type: "starlight_holo",
        label: "Starlight Holo",
        color: "#FBBF24",
        sort_order: 23,
      },
      {
        type: "cracked_ice_holo",
        label: "Cracked Ice Holo",
        color: "#67E8F9",
        sort_order: 24,
      },
      {
        type: "mirror_holo",
        label: "Mirror Holo",
        color: "#C0C0C0",
        sort_order: 25,
      },
    ],
  },
];

// Flat lookup of all built-in variants by type
const ALL_KNOWN_VARIANTS = new Map<string, VariantDef>(
  VARIANT_GROUPS.flatMap((g) => g.variants).map((v) => [v.type, v]),
);

const COMMON_RARITIES = [
  "Common",
  "Uncommon",
  "Rare",
  "Rare Holo",
  "Double Rare",
  "Ultra Rare",
  "Illustration Rare",
  "Special Illustration Rare",
  "Hyper Rare",
  "Promo",
  "Rare Holo V",
  "Rare Holo VMAX",
  "Rare Holo VSTAR",
  "Rare Ultra",
  "Rare Rainbow",
  "Rare Secret",
];

// ─── Generate a type key from a label ────────────────────────────────────────

const labelToType = (label: string): string =>
  label
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

// ─── Variant selector ─────────────────────────────────────────────────────────
// Shows all known variants grouped + allows adding custom ones

function VariantSelector({
  selected,
  customVariants,
  onChange,
  onAddCustom,
}: {
  selected: VariantDef[];
  customVariants: VariantDef[];
  onChange: (v: VariantDef[]) => void;
  onAddCustom: (v: VariantDef) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customColor, setCustomColor] = useState("#FF6B6B");

  const toggle = (variant: VariantDef) => {
    const exists = selected.find((v) => v.type === variant.type);
    if (exists) {
      onChange(selected.filter((v) => v.type !== variant.type));
    } else {
      const newSelected = [...selected, variant];
      newSelected.sort((a, b) => a.sort_order - b.sort_order);
      onChange(newSelected);
    }
  };

  const handleAddCustom = () => {
    if (!customLabel.trim()) return;
    const type = labelToType(customLabel);
    if (
      ALL_KNOWN_VARIANTS.has(type) ||
      customVariants.find((v) => v.type === type)
    ) {
      alert(`A variant with type "${type}" already exists.`);
      return;
    }
    const newVariant: VariantDef = {
      type,
      label: customLabel.trim(),
      color: customColor,
      sort_order: 100 + customVariants.length,
    };
    onAddCustom(newVariant);
    setCustomLabel("");
    setShowCustomForm(false);
  };

  const visibleGroups = showAll ? VARIANT_GROUPS : VARIANT_GROUPS.slice(0, 2); // Standard + Ball Holos by default

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Grouped variant pills */}
      {visibleGroups.map((group) => (
        <div key={group.label}>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              fontFamily: "DM Mono, monospace",
              marginBottom: 5,
              letterSpacing: "0.06em",
            }}
          >
            {group.label.toUpperCase()}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {group.variants.map((v) => {
              const active = !!selected.find((s) => s.type === v.type);
              return (
                <button
                  key={v.type}
                  onClick={() => toggle(v)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 10px",
                    borderRadius: 16,
                    border: `1px solid ${active ? v.color : "var(--border)"}`,
                    background: active ? `${v.color}20` : "transparent",
                    color: active ? v.color : "var(--text-dim)",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.12s ease",
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: v.color,
                      flexShrink: 0,
                    }}
                  />
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Show more / less toggle */}
      <button
        onClick={() => setShowAll((v) => !v)}
        style={{
          alignSelf: "flex-start",
          fontSize: 11,
          color: "var(--text-dim)",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          padding: "2px 0",
          textDecoration: "underline",
        }}
      >
        {showAll
          ? "↑ Show less"
          : `↓ Show more (${VARIANT_GROUPS.slice(2).flatMap((g) => g.variants).length} special foils)`}
      </button>

      {/* Special foils section (shown when expanded) */}
      {showAll && (
        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              fontFamily: "DM Mono, monospace",
              marginBottom: 5,
              letterSpacing: "0.06em",
            }}
          >
            SPECIAL FOILS
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {VARIANT_GROUPS[2].variants.map((v) => {
              const active = !!selected.find((s) => s.type === v.type);
              return (
                <button
                  key={v.type}
                  onClick={() => toggle(v)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 10px",
                    borderRadius: 16,
                    border: `1px solid ${active ? v.color : "var(--border)"}`,
                    background: active ? `${v.color}20` : "transparent",
                    color: active ? v.color : "var(--text-dim)",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: v.color,
                      flexShrink: 0,
                    }}
                  />
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom variants (ones added for this set) */}
      {customVariants.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              fontFamily: "DM Mono, monospace",
              marginBottom: 5,
              letterSpacing: "0.06em",
            }}
          >
            CUSTOM
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {customVariants.map((v) => {
              const active = !!selected.find((s) => s.type === v.type);
              return (
                <button
                  key={v.type}
                  onClick={() => toggle(v)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 10px",
                    borderRadius: 16,
                    border: `1px solid ${active ? v.color : "var(--border)"}`,
                    background: active ? `${v.color}20` : "transparent",
                    color: active ? v.color : "var(--text-dim)",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: v.color,
                      flexShrink: 0,
                    }}
                  />
                  {v.label}
                  <span style={{ fontSize: 9, opacity: 0.6 }}>custom</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add custom variant */}
      {!showCustomForm ? (
        <button
          onClick={() => setShowCustomForm(true)}
          style={{
            alignSelf: "flex-start",
            fontSize: 11,
            color: "var(--gold)",
            background: "none",
            border: "1px dashed rgba(201,168,76,0.4)",
            borderRadius: 16,
            cursor: "pointer",
            fontFamily: "inherit",
            padding: "3px 10px",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span>+</span> Add custom variant
        </button>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
          <input
            autoFocus
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddCustom();
              if (e.key === "Escape") setShowCustomForm(false);
            }}
            placeholder='Variant name (e.g. Team Rocket Holo)'
            style={{
              flex: 1,
              minWidth: 160,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "5px 9px",
              fontSize: 12,
              color: "var(--text-primary)",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
              Color
            </span>
            <input
              type='color'
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              style={{
                width: 28,
                height: 28,
                padding: 2,
                border: "1px solid var(--border)",
                borderRadius: 4,
                cursor: "pointer",
                background: "transparent",
              }}
            />
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: customColor,
              }}
            />
          </div>
          {customLabel && (
            <div
              style={{
                fontSize: 10,
                color: "var(--text-dim)",
                fontFamily: "DM Mono, monospace",
              }}
            >
              type: {labelToType(customLabel)}
            </div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={handleAddCustom}
              disabled={!customLabel.trim()}
              style={{
                padding: "5px 14px",
                borderRadius: 6,
                border: "none",
                background: customLabel.trim()
                  ? "var(--gold)"
                  : "var(--surface)",
                color: customLabel.trim() ? "#0D0E11" : "var(--text-dim)",
                fontSize: 11,
                cursor: customLabel.trim() ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowCustomForm(false);
                setCustomLabel("");
              }}
              style={{
                padding: "5px 10px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-dim)",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main admin page ──────────────────────────────────────────────────────────

export default function AdminVariantsPage() {
  const [sets, setSets] = useState<PokemonSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<CardData[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [setSearch, setSetSearch] = useState("");

  // Rules: rarity → selected variants
  const [rules, setRules] = useState<SetVariantRule[]>([]);
  // Card overrides: cardId → VariantDef[]
  const [cardOverrides, setCardOverrides] = useState<Map<string, VariantDef[]>>(
    new Map(),
  );
  // Custom variants added for this set session
  const [customVariants, setCustomVariants] = useState<VariantDef[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);
  const [cardSearch, setCardSearch] = useState("");

  // Load sets
  useEffect(() => {
    api
      .get<{ data: PokemonSet[] }>("/cards/sets")
      .then((res) => setSets(res.data.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  // Load set data when selected
  const loadSet = useCallback(async (setId: string) => {
    setCardsLoading(true);
    setCards([]);
    setRules([]);
    setCardOverrides(new Map());
    setExpandedCards(new Set());
    setCustomVariants([]);
    setSaveResult(null);

    try {
      const [cardsRes, variantsRes] = await Promise.all([
        api.get<{ data: CardData[] }>(`/variants/sets/${setId}/cards`),
        api.get<{ data: { rules: any[]; status: string } }>(
          `/variants/sets/${setId}`,
        ),
      ]);

      const cardsData = cardsRes.data.data ?? [];
      setCards(cardsData);

      // Load existing rules
      const rulesData = variantsRes.data.data?.rules ?? [];
      setRules(
        rulesData.map((r: any) => ({
          rarity: r.rarity,
          variants: r.variants ?? [],
        })),
      );

      // Load card overrides from cards that have per-card variant data
      const overrideMap = new Map<string, VariantDef[]>();
      const ruleMap = new Map(
        rulesData.map((r: any) => [r.rarity, r.variants ?? []]),
      );

      for (const card of cardsData as any[]) {
        if (!card.variants?.length) continue;

        // Get what the rarity rule would assign this card
        const ruleVariants: string[] = (ruleMap.get(card.rarity) ?? []).map(
          (v: any) => v.type,
        );
        const cardVariantTypes: string[] = card.variants.map(
          (v: any) => v.variantType ?? v.type,
        );

        // Only store as override if the card's variants genuinely differ from the rule
        const isDifferent =
          ruleVariants.length !== cardVariantTypes.length ||
          ruleVariants.some((t) => !cardVariantTypes.includes(t));

        if (isDifferent) {
          overrideMap.set(
            card.id,
            card.variants.map((v: any) => ({
              type: v.variantType ?? v.type,
              label: v.label,
              color: v.color,
              sort_order: v.sortOrder ?? v.sort_order ?? 0,
            })),
          );
        }
      }
      setCardOverrides(overrideMap);

      // Detect any custom variant types that aren't in the known list
      const knownTypes = new Set(ALL_KNOWN_VARIANTS.keys());
      const foundCustom: VariantDef[] = [];
      for (const rule of rulesData) {
        for (const v of rule.variants ?? []) {
          if (
            !knownTypes.has(v.type) &&
            !foundCustom.find((c) => c.type === v.type)
          ) {
            foundCustom.push(v);
          }
        }
      }
      if (foundCustom.length) setCustomVariants(foundCustom);
    } catch (err) {
      console.error("[AdminVariants] Load failed:", err);
    } finally {
      setCardsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedSetId) return;
    const t = setTimeout(() => {
      void loadSet(selectedSetId);
    }, 0);
    return () => clearTimeout(t);
  }, [selectedSetId, loadSet]);

  const rarities = [
    ...new Set(cards.map((c) => c.rarity).filter(Boolean)),
  ] as string[];

  const getRuleForRarity = (rarity: string): VariantDef[] =>
    rules.find((r) => r.rarity === rarity)?.variants ?? [];

  const updateRule = (rarity: string, variants: VariantDef[]) => {
    setRules((prev) => {
      const existing = prev.find((r) => r.rarity === rarity);
      if (existing)
        return prev.map((r) => (r.rarity === rarity ? { ...r, variants } : r));
      return [...prev, { rarity, variants }];
    });
  };

  const handleAddCustomVariant = (v: VariantDef) => {
    setCustomVariants((prev) => [...prev, v]);
  };

  const handleSave = async () => {
    if (!selectedSetId) return;
    setSaving(true);
    setSaveResult(null);
    try {
      const overridesArray = Array.from(cardOverrides.entries()).map(
        ([cardId, variants]) => ({
          cardId,
          variants: variants.map((v) => ({
            variantType: v.type,
            label: v.label,
            color: v.color,
            sortOrder: v.sort_order,
          })),
        }),
      );

      const res = await api.post(`/variants/sets/${selectedSetId}/save`, {
        rules,
        cardOverrides: overridesArray,
      });

      setSaveResult({
        ok: true,
        msg: `✓ Saved — ${(res.data as any).data?.saved ?? 0} variant records published`,
      });
      setTimeout(() => setSaveResult(null), 5000);
    } catch (err: any) {
      setSaveResult({
        ok: false,
        msg: err?.response?.data?.error ?? "Save failed",
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredCards = cards.filter(
    (c) =>
      !cardSearch ||
      c.name.toLowerCase().includes(cardSearch.toLowerCase()) ||
      c.number.includes(cardSearch),
  );

  const filteredSets = sets.filter(
    (s) =>
      !setSearch ||
      s.name.toLowerCase().includes(setSearch.toLowerCase()) ||
      s.id.toLowerCase().includes(setSearch.toLowerCase()),
  );

  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--text-dim)", fontSize: 13 }}>
        Loading sets...
      </div>
    );

  return (
    <div style={{ padding: "28px 36px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontSize: 10,
            color: "var(--gold)",
            letterSpacing: "0.1em",
            fontFamily: "DM Mono, monospace",
            marginBottom: 6,
          }}
        >
          ADMIN
        </div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          Variant Manager
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Configure card variants per set. Set rules apply to all cards of a
          rarity unless overridden per card.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* ── Set list ── */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            overflow: "hidden",
            maxHeight: "82vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface-2)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--text-dim)",
                letterSpacing: "0.08em",
                fontFamily: "DM Mono, monospace",
                marginBottom: 6,
              }}
            >
              SELECT SET
            </div>
            <input
              value={setSearch}
              onChange={(e) => setSetSearch(e.target.value)}
              placeholder='Search sets...'
              style={{
                width: "100%",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 11,
                color: "var(--text-primary)",
                fontFamily: "inherit",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filteredSets.map((set) => (
              <button
                key={set.id}
                onClick={() => setSelectedSetId(set.id)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  background:
                    selectedSetId === set.id
                      ? "rgba(201,168,76,0.1)"
                      : "transparent",
                  color:
                    selectedSetId === set.id
                      ? "var(--gold)"
                      : "var(--text-secondary)",
                  fontSize: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{ fontWeight: selectedSetId === set.id ? 500 : 400 }}
                  >
                    {set.name}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-dim)",
                      fontFamily: "DM Mono, monospace",
                      marginTop: 1,
                    }}
                  >
                    {set.id}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Editor ── */}
        <div>
          {!selectedSetId ? (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "60px 24px",
                textAlign: "center",
                color: "var(--text-dim)",
                fontSize: 13,
              }}
            >
              Select a set from the left to configure its variants
            </div>
          ) : cardsLoading ? (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "60px 24px",
                textAlign: "center",
                color: "var(--text-dim)",
                fontSize: 13,
              }}
            >
              Loading set data...
            </div>
          ) : (
            <>
              {/* ── Rarity rules ── */}
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  overflow: "hidden",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--border)",
                    background: "var(--surface-2)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-dim)",
                      letterSpacing: "0.08em",
                      fontFamily: "DM Mono, monospace",
                      marginBottom: 2,
                    }}
                  >
                    DEFAULT RULES BY RARITY
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    Pick which variants apply to each rarity. Cards with
                    overrides ignore these.
                  </div>
                </div>
                <div
                  style={{
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                  }}
                >
                  {(rarities.length > 0
                    ? rarities
                    : COMMON_RARITIES.slice(0, 8)
                  ).map((rarity) => (
                    <div
                      key={rarity}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        paddingBottom: 18,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--text-primary)",
                          fontWeight: 500,
                          marginBottom: 10,
                        }}
                      >
                        {rarity}
                        {getRuleForRarity(rarity).length > 0 && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 10,
                              color: "var(--text-dim)",
                              fontFamily: "DM Mono, monospace",
                            }}
                          >
                            ({getRuleForRarity(rarity).length} variant
                            {getRuleForRarity(rarity).length !== 1
                              ? "s"
                              : ""}{" "}
                            selected)
                          </span>
                        )}
                      </div>
                      <VariantSelector
                        selected={getRuleForRarity(rarity)}
                        customVariants={customVariants}
                        onChange={(v) => updateRule(rarity, v)}
                        onAddCustom={handleAddCustomVariant}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Card-level overrides ── */}
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  overflow: "hidden",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--border)",
                    background: "var(--surface-2)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-dim)",
                      letterSpacing: "0.08em",
                      fontFamily: "DM Mono, monospace",
                      marginBottom: 2,
                    }}
                  >
                    CARD-LEVEL OVERRIDES
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    Override specific cards that differ from their rarity rule.{" "}
                    {cardOverrides.size > 0 &&
                      `${cardOverrides.size} override${cardOverrides.size !== 1 ? "s" : ""} set.`}
                  </div>
                </div>

                <div
                  style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <input
                    value={cardSearch}
                    onChange={(e) => setCardSearch(e.target.value)}
                    placeholder='Search cards by name or number...'
                    style={{
                      width: "100%",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "7px 12px",
                      fontSize: 12,
                      color: "var(--text-primary)",
                      fontFamily: "inherit",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ maxHeight: 480, overflowY: "auto" }}>
                  {filteredCards.length === 0 && (
                    <div
                      style={{
                        padding: "20px",
                        textAlign: "center",
                        fontSize: 12,
                        color: "var(--text-dim)",
                      }}
                    >
                      {cards.length === 0
                        ? "No cards found for this set"
                        : "No cards match your search"}
                    </div>
                  )}
                  {filteredCards.map((card) => {
                    const isExpanded = expandedCards.has(card.id);
                    const hasOverride = cardOverrides.has(card.id);
                    const currentVariants =
                      cardOverrides.get(card.id) ??
                      getRuleForRarity(card.rarity ?? "");

                    return (
                      <div
                        key={card.id}
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <button
                          onClick={() =>
                            setExpandedCards((prev) => {
                              const next = new Set(prev);
                              if (next.has(card.id)) next.delete(card.id);
                              else next.add(card.id);
                              return next;
                            })
                          }
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 16px",
                            border: "none",
                            background: hasOverride
                              ? "rgba(201,168,76,0.04)"
                              : "transparent",
                            cursor: "pointer",
                            textAlign: "left",
                            fontFamily: "inherit",
                          }}
                        >
                          {card.images.small && (
                            <img
                              src={card.images.small}
                              alt=''
                              style={{
                                width: 26,
                                height: 36,
                                objectFit: "contain",
                                borderRadius: 2,
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: "var(--text-primary)",
                              }}
                            >
                              {card.name}
                              {hasOverride && (
                                <span
                                  style={{
                                    marginLeft: 6,
                                    fontSize: 9,
                                    color: "var(--gold)",
                                    fontFamily: "DM Mono, monospace",
                                  }}
                                >
                                  OVERRIDE
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: "var(--text-dim)",
                                fontFamily: "DM Mono, monospace",
                              }}
                            >
                              #{card.number} · {card.rarity}
                            </div>
                          </div>
                          {/* Variant dots */}
                          <div style={{ display: "flex", gap: 3 }}>
                            {currentVariants.slice(0, 6).map((v) => (
                              <div
                                key={v.type}
                                title={v.label}
                                style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: "50%",
                                  background: v.color,
                                }}
                              />
                            ))}
                            {currentVariants.length > 6 && (
                              <span
                                style={{
                                  fontSize: 9,
                                  color: "var(--text-dim)",
                                }}
                              >
                                +{currentVariants.length - 6}
                              </span>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--text-dim)",
                              flexShrink: 0,
                            }}
                          >
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        </button>

                        {isExpanded && (
                          <div
                            style={{
                              padding: "12px 16px 16px 52px",
                              background: "var(--surface-2)",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--text-secondary)",
                                marginBottom: 10,
                              }}
                            >
                              {hasOverride
                                ? "This card has a custom override:"
                                : `Using rarity rule for "${card.rarity}". Override below to customize:`}
                            </div>
                            <VariantSelector
                              selected={
                                cardOverrides.get(card.id) ??
                                getRuleForRarity(card.rarity ?? "")
                              }
                              customVariants={customVariants}
                              onChange={(v) => {
                                setCardOverrides((prev) => {
                                  const next = new Map(prev);
                                  if (!v.length) next.delete(card.id);
                                  else next.set(card.id, v);
                                  return next;
                                });
                              }}
                              onAddCustom={handleAddCustomVariant}
                            />
                            {hasOverride && (
                              <button
                                onClick={() =>
                                  setCardOverrides((prev) => {
                                    const next = new Map(prev);
                                    next.delete(card.id);
                                    return next;
                                  })
                                }
                                style={{
                                  marginTop: 10,
                                  fontSize: 11,
                                  color: "var(--text-dim)",
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                  padding: 0,
                                }}
                              >
                                ✕ Remove override — revert to rarity rule
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Save bar ── */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {cards.length} cards · {cardOverrides.size} card override
                  {cardOverrides.size !== 1 ? "s" : ""} ·{" "}
                  {customVariants.length} custom variant
                  {customVariants.length !== 1 ? "s" : ""}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {saveResult && (
                    <div
                      style={{
                        fontSize: 12,
                        color: saveResult.ok ? "#3DAA6E" : "#C94C4C",
                      }}
                    >
                      {saveResult.msg}
                    </div>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      padding: "10px 28px",
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
                    {saving ? "Saving..." : "Save variants & publish set"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
