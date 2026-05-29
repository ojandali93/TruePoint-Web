/**
 * Variant registry — single source of truth for variant labels/colors used
 * across set browser, card detail, and inventory.
 *
 * Mirrors mobile's src/lib/variants.ts so a card's variant dots match
 * exactly between platforms.
 *
 * Keys are the backend's variant strings (from market_prices.variant /
 * card_variants.variant_type) plus pattern-printing keys derived from card
 * names for sets like Ascended Heroes where each ball/pattern printing is a
 * separate card row sharing one number.
 */

export interface VariantMeta {
  key: string;
  label: string;
  color: string;
  sortOrder: number;
}

export const VARIANTS: Record<string, VariantMeta> = {
  // ── Standard printings (from market_prices.variant) ──
  normal: { key: "normal", label: "Normal", color: "#E5C97E", sortOrder: 0 },
  holofoil: {
    key: "holofoil",
    label: "Holofoil",
    color: "#9B8EDB",
    sortOrder: 1,
  },
  reverseHolofoil: {
    key: "reverseHolofoil",
    label: "Reverse Holo",
    color: "#7BC4E2",
    sortOrder: 2,
  },
  "1stEditionNormal": {
    key: "1stEditionNormal",
    label: "1st Edition",
    color: "#F59E0B",
    sortOrder: 3,
  },
  "1stEditionHolofoil": {
    key: "1stEditionHolofoil",
    label: "1st Ed Holo",
    color: "#C9A84C",
    sortOrder: 4,
  },
  unlimited: {
    key: "unlimited",
    label: "Unlimited",
    color: "#6B7280",
    sortOrder: 5,
  },
  unlimitedHolofoil: {
    key: "unlimitedHolofoil",
    label: "Unlimited Holo",
    color: "#8B5CF6",
    sortOrder: 6,
  },
  cosmosHolofoil: {
    key: "cosmosHolofoil",
    label: "Cosmos Holo",
    color: "#A78BFA",
    sortOrder: 7,
  },
  crackedIce: {
    key: "crackedIce",
    label: "Cracked Ice",
    color: "#BAE6FD",
    sortOrder: 8,
  },

  // ── Ball / pattern printings (derived from card name suffix) ──
  pokeball: {
    key: "pokeball",
    label: "Poké Ball",
    color: "#EF4444",
    sortOrder: 20,
  },
  greatball: {
    key: "greatball",
    label: "Great Ball",
    color: "#3B82F6",
    sortOrder: 21,
  },
  ultraball: {
    key: "ultraball",
    label: "Ultra Ball",
    color: "#F97316",
    sortOrder: 22,
  },
  masterball: {
    key: "masterball",
    label: "Master Ball",
    color: "#6366F1",
    sortOrder: 23,
  },
  friendball: {
    key: "friendball",
    label: "Friend Ball",
    color: "#22C55E",
    sortOrder: 24,
  },
  loveball: {
    key: "loveball",
    label: "Love Ball",
    color: "#EC4899",
    sortOrder: 25,
  },
  healball: {
    key: "healball",
    label: "Heal Ball",
    color: "#F472B6",
    sortOrder: 26,
  },
  quickball: {
    key: "quickball",
    label: "Quick Ball",
    color: "#0EA5E9",
    sortOrder: 27,
  },
  duskball: {
    key: "duskball",
    label: "Dusk Ball",
    color: "#64748B",
    sortOrder: 28,
  },
  premierball: {
    key: "premierball",
    label: "Premier Ball",
    color: "#E2E8F0",
    sortOrder: 29,
  },
  timerball: {
    key: "timerball",
    label: "Timer Ball",
    color: "#FB7185",
    sortOrder: 30,
  },
  nestball: {
    key: "nestball",
    label: "Nest Ball",
    color: "#84CC16",
    sortOrder: 31,
  },
  diveball: {
    key: "diveball",
    label: "Dive Ball",
    color: "#06B6D4",
    sortOrder: 32,
  },
  netball: {
    key: "netball",
    label: "Net Ball",
    color: "#14B8A6",
    sortOrder: 33,
  },
  energyPattern: {
    key: "energyPattern",
    label: "Energy Pattern",
    color: "#10B981",
    sortOrder: 34,
  },
};

const FALLBACK: VariantMeta = {
  key: "unknown",
  label: "Variant",
  color: "#6B7280",
  sortOrder: 99,
};

export const variantMeta = (key: string | null | undefined): VariantMeta => {
  if (!key) return FALLBACK;
  return VARIANTS[key] ?? { ...FALLBACK, key, label: key };
};

export const variantColor = (key: string | null | undefined): string =>
  variantMeta(key).color;

export const variantLabel = (key: string | null | undefined): string =>
  variantMeta(key).label;

/**
 * Derive a variant key from a card-name parenthetical pattern suffix.
 * "Erika's Oddish (Poke Ball)" → "pokeball"
 * "Chikorita (Energy Symbol Pattern)" → "energyPattern"
 * Returns null if the name has no recognized pattern suffix (base card).
 */
const PATTERN_NAME_MAP: Record<string, string> = {
  "poke ball": "pokeball",
  pokeball: "pokeball",
  "great ball": "greatball",
  "ultra ball": "ultraball",
  "master ball": "masterball",
  "friend ball": "friendball",
  "love ball": "loveball",
  "heal ball": "healball",
  "quick ball": "quickball",
  "dusk ball": "duskball",
  "premier ball": "premierball",
  "timer ball": "timerball",
  "nest ball": "nestball",
  "dive ball": "diveball",
  "net ball": "netball",
  "energy symbol pattern": "energyPattern",
  "energy pattern": "energyPattern",
  "cracked ice": "crackedIce",
  "cracked ice holofoil": "crackedIce",
  cosmos: "cosmosHolofoil",
  "cosmos holofoil": "cosmosHolofoil",
};

export const patternKeyFromName = (
  name: string | null | undefined,
): string | null => {
  const m = (name ?? "").match(/\(([^)]+)\)/);
  if (!m) return null;
  const raw = m[1].toLowerCase().trim();
  return PATTERN_NAME_MAP[raw] ?? null;
};
