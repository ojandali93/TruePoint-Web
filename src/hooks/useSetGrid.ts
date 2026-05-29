"use client";

/**
 * useSetGrid — composes useSetCards + useSetPrices into ready-to-render
 * tiles for the set browser.
 *
 * Mirrors mobile's src/hooks/useSetGrid.ts behavior:
 *
 *   1. Cards sharing a `number` are collapsed into ONE tile (representing the
 *      base/normal printing). Pattern siblings (Erika's Oddish (Poke Ball),
 *      Chikorita (Energy Symbol Pattern), etc.) appear as additional variant
 *      dots on that one tile.
 *
 *   2. Real variant dots come from market_prices (via useSetPrices). Phantom
 *      rows — market price exists but low price is null, meaning no real
 *      listings — are filtered out so users don't see fake variants.
 *
 *   3. Pattern siblings contribute their own dot keyed by the pattern name
 *      ("pokeball", "masterball", etc.) and carry their own card_id so the
 *      quick-add flow knows which card to write to.
 *
 *   4. Code cards (rarity = "code card") are hidden — they're digital
 *      redemption codes, not collectibles.
 */

import { useMemo } from "react";

import {
  patternKeyFromName,
  variantColor,
  variantLabel,
  variantMeta,
} from "../lib/variants";

import {
  type PokemonCard,
  type SetPriceMap,
  useSetCards,
  useSetPrices,
} from "./useBrowse";

// ─── Output types ─────────────────────────────────────────────────────────────

export interface CardVariantPrice {
  /** Global variant key (looks up color/label in VARIANTS registry). */
  variant: string;
  /** Market price for this specific (card, variant) cell. */
  market: number | null;
  /** Variant accent color (from registry). */
  color: string;
  /** Display label (e.g. "Holofoil", "Poké Ball"). */
  label: string;
  /** The card id this variant actually belongs to. Pattern siblings are
   *  distinct card rows, so this carries the sibling's id, not the rep's. */
  cardId: string;
}

export interface GridCard {
  /** Representative card to render + navigate to. */
  card: PokemonCard;
  /** Aggregated variant dots for this card number. */
  variants: CardVariantPrice[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isCodeCard = (rarity: string | null | undefined): boolean =>
  (rarity ?? "").toLowerCase().trim() === "code card";

const isBasePrinting = (name: string | null | undefined): boolean =>
  !/\(.*\)/.test(name ?? "");

/** Strip pattern suffix and "- NNN/NNN" so collapsed names read cleanly. */
const cleanName = (name: string | null | undefined): string =>
  (name ?? "")
    .replace(/\s*-\s*\d+\/\d+/g, "")
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSetGrid(setId: string | undefined) {
  const {
    cards: rawCards,
    loading: cardsLoading,
    error: cardsError,
  } = useSetCards(setId);
  const {
    priceMap,
    loading: pricesLoading,
    error: pricesError,
  } = useSetPrices(setId);

  // Memoize the heavy grouping so we don't redo it every render.
  const cards = useMemo(
    () => buildGrid(rawCards, priceMap),
    [rawCards, priceMap],
  );

  return {
    cards,
    loading: cardsLoading || pricesLoading,
    error: cardsError ?? pricesError ?? null,
  };
}

// Exposed for testing or direct use without the hook wrapper.
export function buildGrid(
  rawCards: PokemonCard[],
  priceMap: SetPriceMap,
): GridCard[] {
  // 1. Drop code cards entirely.
  const cards = rawCards.filter((c) => !isCodeCard(c.rarity));

  // 2. Group by number (blank numbers stay individual).
  const byNumber = new Map<string, PokemonCard[]>();
  const blanks: PokemonCard[] = [];
  for (const card of cards) {
    const num = (card.number ?? "").trim();
    if (!num) {
      blanks.push(card);
      continue;
    }
    if (!byNumber.has(num)) byNumber.set(num, []);
    byNumber.get(num)!.push(card);
  }

  const out: GridCard[] = [];

  const buildGroup = (group: PokemonCard[]): GridCard => {
    // Representative = base printing (no paren), else lowest id.
    const rep =
      group.find((c) => isBasePrinting(c.name)) ??
      [...group].sort((a, b) => a.id.localeCompare(b.id))[0];

    // Aggregate variants across every printing of this number.
    const merged = new Map<string, CardVariantPrice>();

    for (const card of group) {
      const patternKey = patternKeyFromName(card.name);
      const rows = priceMap[card.id] ?? [];

      if (patternKey) {
        // Pattern sibling: contributes ONE dot keyed by the pattern.
        // Priced from this card's best real (low != null) row, else first
        // row with a market price.
        const realRow =
          rows.find((r) => r.low != null) ?? rows.find((r) => r.market != null);
        if (realRow && !merged.has(patternKey)) {
          merged.set(patternKey, {
            variant: patternKey,
            market: realRow.market,
            color: variantColor(patternKey),
            label: variantLabel(patternKey),
            cardId: card.id,
          });
        }
      } else {
        // Base card: keep its real variants (phantom-filtered).
        for (const r of rows) {
          if (r.low == null) continue; // drop phantom
          if (merged.has(r.variant)) continue;
          merged.set(r.variant, {
            variant: r.variant,
            market: r.market,
            color: variantColor(r.variant),
            label: variantLabel(r.variant),
            cardId: card.id,
          });
        }
      }
    }

    const variants = Array.from(merged.values()).sort(
      (a, b) =>
        variantMeta(a.variant).sortOrder - variantMeta(b.variant).sortOrder,
    );

    return {
      card: { ...rep, name: cleanName(rep.name) },
      variants,
    };
  };

  for (const group of byNumber.values()) {
    out.push(buildGroup(group));
  }
  for (const blank of blanks) {
    out.push({ card: blank, variants: [] });
  }

  return out;
}
