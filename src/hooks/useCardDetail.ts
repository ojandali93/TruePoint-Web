"use client";

/**
 * useCardDetail — fetches one card and its full price entry list.
 *
 * The /cards/:cardId/prices endpoint returns prices grouped by source
 * (tcgplayer / cardmarket / justtcg / ebay). We flatten them into one array
 * since the card detail screen treats them uniformly.
 */

import { useEffect, useState } from "react";

import api from "../lib/api";

import { type PokemonCard } from "./useBrowse";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriceEntry {
  cardId: string;
  source: string;
  variant: string | null;
  grade: string | null;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  fetchedAt: string;
}

interface CardPricesByGroup {
  tcgplayer: PriceEntry[];
  cardmarket: PriceEntry[];
  justtcg: PriceEntry[];
  ebay: PriceEntry[];
}

interface CardPricesResponse {
  card: PokemonCard;
  prices: CardPricesByGroup;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useCardDetail(cardId: string | undefined) {
  const [card, setCard] = useState<PokemonCard | null>(null);
  const [prices, setPrices] = useState<CardPricesByGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cardId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<{ data: PokemonCard }>(`/cards/${cardId}`),
      api.get<{ data: CardPricesResponse }>(`/cards/${cardId}/prices`),
    ])
      .then(([cardRes, priceRes]) => {
        if (cancelled) return;
        setCard(cardRes.data.data);
        setPrices(priceRes.data.data.prices);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to load card");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  return { card, prices, loading, error };
}

/**
 * Flatten the grouped CardPrices into one array, applying the same phantom
 * filter the set browser uses (drop raw rows where marketPrice exists but
 * lowPrice is null — fake TCGPlayer variants).
 */
export function flattenAndFilterPrices(
  prices: CardPricesByGroup | null,
): PriceEntry[] {
  if (!prices) return [];
  const all = [
    ...(prices.tcgplayer ?? []),
    ...(prices.cardmarket ?? []),
    ...(prices.justtcg ?? []),
    ...(prices.ebay ?? []),
  ];
  return all.filter((p) => {
    if (p.grade) return true; // never filter graded rows
    if (p.lowPrice == null && p.marketPrice != null) return false; // phantom
    return true;
  });
}
