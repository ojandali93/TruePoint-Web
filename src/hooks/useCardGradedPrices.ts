"use client";

/**
 * useCardGradedPrices — fetches PokeTrace-sourced graded prices for a card.
 *
 * Backend: GET /cards/:cardId/graded-prices
 *   → { data: { cardId, cached, prices: GradedPriceRow[] } }
 *
 * Mirrors useCards.ts pattern: useState + useEffect, no react-query.
 *
 * The backend handles caching (24h TTL on the PokeTrace fetch), so we don't
 * need client-side caching. Each card detail mount makes one call.
 */

import { useEffect, useState } from "react";

import api from "../lib/api";

export interface GradedPriceRow {
  company: "PSA" | "BGS" | "CGC" | "SGC" | "TAG" | "ACE" | string;
  grade: string;
  marketPrice: number;
  fetchedAt: string;
}

export interface GradedPricesResponse {
  cardId: string;
  cached: boolean;
  prices: GradedPriceRow[];
}

export const useCardGradedPrices = (cardId: string) => {
  const [data, setData] = useState<GradedPricesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cardId) return;

    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      api
        .get<{ data: GradedPricesResponse }>(`/cards/${cardId}/graded-prices`)
        .then((res) => {
          if (!cancelled) setData(res.data.data);
        })
        .catch((err) => {
          if (!cancelled) {
            // Graded prices are non-critical — log the error so we can see it in
            // the console, but don't crash the whole card detail screen.
            console.warn("[useCardGradedPrices] error:", err);
            setError(err.message ?? "Failed to load graded prices");
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [cardId]);

  return {
    data: cardId ? data : null,
    prices: cardId ? (data?.prices ?? []) : [],
    loading: cardId ? loading : false,
    error: cardId ? error : null,
  };
};
