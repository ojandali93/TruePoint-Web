/* eslint-disable react-hooks/set-state-in-effect */
"use client";

/**
 * Browse/sets hooks for the rebuilt set list + set detail pages.
 *
 * All hooks follow the codebase pattern: useState + useEffect, no react-query.
 * Each hook is self-contained — pages don't have to compose multiple
 * fetches manually.
 */

import { useEffect, useState } from "react";

import api from "../lib/api";

// ─── Common types ────────────────────────────────────────────────────────────

export interface PokemonSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  language?: string | null;
  game?: string | null; // "pokemon" | "onepiece" | … — defaults to "pokemon"
  images: { symbol: string; logo: string };
}

export interface PokemonCard {
  id: string;
  name: string;
  number: string;
  supertype: string | null;
  subtypes: string[];
  hp: string | null;
  types: string[] | null;
  rarity: string | null;
  set: { id: string; name: string };
  images: { small: string | null; large: string | null };
}

/** A raw card price row as returned by /cards/sets/:setId/prices. */
export interface CardPriceRow {
  variant: string;
  market: number | null;
  low: number | null;
  source: string;
}

/** Bulk price map keyed by cardId. */
export type SetPriceMap = Record<string, CardPriceRow[]>;

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** All sets (used on the set list page). */
export function useSets() {
  const [sets, setSets] = useState<PokemonSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<{ data: PokemonSet[] }>("/cards/sets")
      .then((res) => {
        if (!cancelled) setSets(res.data.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to load sets");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { sets, loading, error };
}

/** Cards in a given set. */
export function useSetCards(setId: string | undefined) {
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!setId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<{ data: PokemonCard[] }>(`/cards/sets/${setId}/cards`)
      .then((res) => {
        if (!cancelled) setCards(res.data.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to load cards");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setId]);

  return { cards, loading, error };
}

/** Bulk prices for every card in a set. Keyed by card id. */
export function useSetPrices(setId: string | undefined) {
  const [priceMap, setPriceMap] = useState<SetPriceMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!setId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<{ data: SetPriceMap }>(`/cards/sets/${setId}/prices`)
      .then((res) => {
        if (!cancelled) setPriceMap(res.data.data ?? {});
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? "Failed to load prices");
          setPriceMap({});
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setId]);

  return { priceMap, loading, error };
}
