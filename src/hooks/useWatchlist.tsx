"use client";

/**
 * useWatchlist — cards a user is tracking, with optional buy/sell price
 * triggers. Trigger DETECTION is computed server-side on every fetch;
 * trigger DELIVERY (an actual push) isn't wired up yet.
 */

import { useCallback, useEffect, useState } from "react";

import api from "../lib/api";

export interface SevenDayChange {
  priceThen: number;
  changeAmount: number;
  changePercent: number;
}

export interface WatchlistItem {
  id: string;
  kind: "card" | "product";
  cardId: string | null;
  productId: string | null;
  targetCompany: string | null;
  targetGrade: string | null;
  name: string;
  subtitle: string;
  imageSmall: string | null;
  currentPrice: number | null;
  sevenDayChange: SevenDayChange | null;
  buyBelowPrice: number | null;
  sellAbovePrice: number | null;
  buyTriggered: boolean;
  sellTriggered: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistItemInput {
  cardId?: string | null;
  productId?: string | null;
  targetCompany?: string | null;
  targetGrade?: string | null;
  buyBelowPrice?: number | null;
  sellAbovePrice?: number | null;
  notes?: string | null;
}

export function useWatchlist() {
  const [data, setData] = useState<WatchlistItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTick, setRefetchTick] = useState(0);

  const refetch = useCallback(() => setRefetchTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<{ data: WatchlistItem[] }>("/watchlist")
      .then((res) => {
        if (!cancelled) setData(res.data.data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("[useWatchlist] error:", err);
          setError(err.message ?? "Failed to load watchlist");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refetchTick]);

  return { data, loading, error, refetch };
}

export async function addToWatchlist(
  input: WatchlistItemInput,
): Promise<WatchlistItem> {
  const res = await api.post<{ data: WatchlistItem }>("/watchlist", input);
  return res.data.data;
}

export async function updateWatchlistItem(
  id: string,
  patch: Partial<WatchlistItemInput>,
): Promise<void> {
  await api.patch(`/watchlist/${id}`, patch);
}

export async function removeFromWatchlist(id: string): Promise<void> {
  await api.delete(`/watchlist/${id}`);
}
