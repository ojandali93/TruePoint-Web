"use client";

/**
 * usePriceHistory — fetches the raw price history time series for a card.
 *
 * Backend: GET /cards/:cardId/price-history?range=7d|30d|90d
 *   → { data: { range, series: [{ variant, points: [{date, price}, ...] }] } }
 *
 * Mirrors useCards.ts pattern: useState + useEffect, no react-query.
 *
 * Refetches when either cardId or range changes. Variant strings come back
 * as raw camelCase from market_prices.variant (e.g. 'normal', 'holofoil',
 * 'reverseHolofoil', 'firstEditionHolofoil') — display name mapping is the
 * consumer's responsibility.
 */

import { useEffect, useState } from "react";

import api from "../lib/api";

export type PriceHistoryRange = "7d" | "30d" | "90d";

export interface PriceHistoryPoint {
  date: string; // YYYY-MM-DD
  price: number;
}

export interface PriceHistorySeries {
  variant: string;
  points: PriceHistoryPoint[];
}

export interface PriceHistoryResponse {
  range: PriceHistoryRange;
  series: PriceHistorySeries[];
}

export const usePriceHistory = (
  cardId: string,
  range: PriceHistoryRange = "7d",
) => {
  const [data, setData] = useState<PriceHistoryResponse | null>(null);
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
        .get<{ data: PriceHistoryResponse }>(`/cards/${cardId}/price-history`, {
          params: { range },
        })
        .then((res) => {
          if (!cancelled) setData(res.data.data);
        })
        .catch((err) => {
          if (!cancelled) {
            console.warn("[usePriceHistory] error:", err);
            setError(err.message ?? "Failed to load price history");
            setData(null);
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
  }, [cardId, range]);

  return {
    data: cardId ? data : null,
    series: cardId ? (data?.series ?? []) : [],
    loading: cardId ? loading : false,
    error: cardId ? error : null,
  };
};
