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
  set: PokemonSet;
  images: { small: string; large: string };
}

export interface CardPrice {
  cardId: string;
  source: "tcgplayer" | "cardmarket" | "justtcg" | "ebay";
  variant: string | null;
  grade: string | null;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  /**
   * Some API responses use nested price fields (e.g. `prices.market`).
   * Optional so callers can support both shapes.
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

export interface CardPrices {
  tcgplayer: CardPrice[];
  cardmarket: CardPrice[];
  justtcg: CardPrice[];
  ebay: CardPrice[];
}
