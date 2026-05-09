"use client";
import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";

export interface PokemonSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  images: { symbol: string; logo: string };
}

export interface PokemonCard {
  id: string;
  name: string;
  number: string;
  supertype: string;
  subtypes: string[];
  hp: string | null;
  types: string[] | null;
  rarity: string | null;
  set: { id: string; name: string };
  images: { small: string; large: string };
}

export interface CardPrices {
  tcgplayer: PriceEntry[];
  cardmarket: PriceEntry[];
  justtcg: PriceEntry[];
  ebay: PriceEntry[];
}

export interface PriceEntry {
  cardId: string;
  source: string;
  variant: string | null;
  grade: string | null;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  /**
   * Some endpoints return nested price fields (e.g. `prices.market`, `prices.low`).
   * Keep this optional for backward compatibility with the flat fields above.
   */
  prices?: Record<string, number | null> & {
    market?: number | null;
    low?: number | null;
    high?: number | null;
    avg30?: number | null;
    trend?: number | null;
    median?: number | null;
    count?: number | null;
  };
  fetchedAt: string;
}

export const useSets = () => {
  const [sets, setSets] = useState<PokemonSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ data: PokemonSet[]; count: number }>("/cards/sets")
      .then((res) => setSets(res.data.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { sets, loading, error };
};

export const useSetCards = (setId: string) => {
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!setId) return;
    api
      .get<{ data: PokemonCard[] }>(`/cards/sets/${setId}/cards`)
      .then((res) => setCards(res.data.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [setId]);

  return { cards, loading, error };
};

export const useCardDetail = (cardId: string) => {
  const [card, setCard] = useState<PokemonCard | null>(null);
  const [prices, setPrices] = useState<CardPrices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cardId) return;
    Promise.all([
      api.get<{ data: PokemonCard }>(`/cards/${cardId}`),
      api.get<{ data: { card: PokemonCard; prices: CardPrices } }>(
        `/cards/${cardId}/prices`,
      ),
    ])
      .then(([cardRes, priceRes]) => {
        setCard(cardRes.data.data);
        const priceData = priceRes.data.data.prices;
        console.log("[useCardDetail] raw prices response:", priceRes.data);
        console.log("[useCardDetail] tcgplayer prices:", priceData?.tcgplayer);
        console.log(
          "[useCardDetail] cardmarket prices:",
          priceData?.cardmarket,
        );
        setPrices(priceData);
      })
      .catch((err) => {
        console.error("[useCardDetail] error:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [cardId]);

  return { card, prices, loading, error };
};

export const useCardSearch = () => {
  const [results, setResults] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string, setId?: string) => {
    if (!query && !setId) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (setId) params.set("setId", setId);
      const res = await api.get<{ data: PokemonCard[] }>(
        `/cards/search?${params}`,
      );
      setResults(res.data.data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, search };
};
