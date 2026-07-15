/**
 * Recent TCGPlayer sales for a card (last 15, outliers flagged).
 * Backend: GET /cards/:cardId/recent-sales. Lazy — pass enabled=false until
 * the section is expanded. Mirrors usePriceHistory (useState + useEffect).
 */
import { useEffect, useState } from "react";
import api from "../lib/api";

export interface RecentSale {
  date: string;
  condition: string | null;
  variant: string | null;
  price: number;
  isOutlier: boolean;
}
export interface RecentSalesResult {
  productUrl: string;
  count: number;
  median: number | null;
  average: number | null;
  sales: RecentSale[];
}

export function useRecentSales(cardId: string, enabled: boolean) {
  const [data, setData] = useState<RecentSalesResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !cardId || data) return;
    let alive = true;

    void (async () => {
      try {
        const res = await api.get<{ data: RecentSalesResult }>(
          `/cards/${cardId}/recent-sales`,
        );
        if (!alive) return;
        setData(res.data.data);
      } catch (e: unknown) {
        if (!alive) return;
        setError(
          e &&
            typeof e === "object" &&
            "response" in e &&
            e.response &&
            typeof e.response === "object" &&
            "data" in e.response &&
            e.response.data &&
            typeof e.response.data === "object" &&
            "error" in e.response.data &&
            typeof e.response.data.error === "string"
            ? e.response.data.error
            : "Failed to load sales",
        );
      }
    })();

    return () => {
      alive = false;
    };
  }, [cardId, enabled, data]);

  const loading = enabled && !!cardId && !data && !error;

  return { data, loading, error };
}
