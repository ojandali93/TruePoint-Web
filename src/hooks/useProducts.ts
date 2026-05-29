"use client";

/**
 * Product hooks for sealed-product browsing + detail.
 *
 * Two endpoints used:
 *   GET /cards/sealed/:setId       → list for set detail tab
 *   GET /cards/product/:productId  → single product (NEW endpoint — see
 *                                    backend patch in DELIVERY README)
 *
 * If the single-product endpoint isn't deployed yet, useProductDetail falls
 * back to fetching all products for the set and finding the match. Slow but
 * functional; remove the fallback once the endpoint is live.
 */

import { useEffect, useState } from "react";

import api from "../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductPriceRow {
  source: "tcgplayer" | "cardmarket" | "ebay" | string;
  low_price: number | null;
  mid_price: number | null;
  high_price: number | null;
  market_price: number | null;
  fetched_at: string;
}

export interface SetProduct {
  id: string;
  name: string;
  set_id: string;
  product_type: string;
  image_url: string | null;
  description?: string | null;
  product_price_cache: ProductPriceRow[];
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useSetProducts(setId: string | undefined) {
  const [products, setProducts] = useState<SetProduct[]>([]);
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
      .get<{ data: SetProduct[] }>(`/cards/sealed/${setId}`)
      .then((res) => {
        if (!cancelled) setProducts(res.data.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? "Failed to load products");
          setProducts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setId]);

  return { products, loading, error };
}

export function useProductDetail(productId: string | undefined) {
  const [product, setProduct] = useState<SetProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get<{ data: SetProduct }>(`/cards/product/${productId}`)
      .then((res) => {
        if (!cancelled) setProduct(res.data.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? "Failed to load product");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  return { product, loading, error };
}

// ─── Display helpers ─────────────────────────────────────────────────────────

/** Best product market price across sources (prefers TCGPlayer market). */
export function getProductMarketPrice(product: SetProduct): number | null {
  const rows = product.product_price_cache ?? [];
  if (rows.length === 0) return null;

  const tcg = rows.find(
    (r) => r.source?.toLowerCase() === "tcgplayer" && r.market_price != null,
  );
  if (tcg?.market_price != null) return tcg.market_price;

  const anyMarket = rows.find((r) => r.market_price != null);
  if (anyMarket?.market_price != null) return anyMarket.market_price;

  const anyMid = rows.find((r) => r.mid_price != null);
  if (anyMid?.mid_price != null) return anyMid.mid_price;

  return null;
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  booster_box: "Booster Box",
  elite_trainer_box: "Elite Trainer Box",
  bundle: "Bundle",
  tin: "Tin",
  collection: "Collection",
  blister: "Blister Pack",
  promo_pack: "Promo Pack",
  ultra_premium_collection: "Ultra Premium Collection",
  special_collection: "Special Collection",
};

export function productTypeLabel(type: string): string {
  return (
    PRODUCT_TYPE_LABELS[type] ??
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
