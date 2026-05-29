/**
 * Portfolio API types.
 *
 * Mirrors the backend's `PortfolioData` shape in
 * `backend/src/services/portfolio.service.ts`. Single source of truth — any
 * page that consumes `GET /portfolio` should import from here.
 *
 * Field name pinned to the API (e.g. `totalValue`, not `currentValue`). The
 * previous local interfaces in the dashboard and portfolio pages renamed
 * these fields, then patched around it with `??` fallbacks. That's gone now.
 */

export interface HistoryPoint {
  date: string;
  totalValue: number;
  costBasis: number;
  gainLoss: number;
  rawCardValue: number;
  gradedCardValue: number;
  sealedProductValue: number;
}

export interface TopPerformer {
  id: string;
  name: string;
  setName: string;
  imageUrl: string | null;
  itemType: string;
  gradingCompany: string | null;
  grade: string | null;
  purchasePrice: number | null;
  marketPrice: number | null;
  gainLoss: number | null;
  gainLossPct: number | null;
}

export interface PortfolioData {
  userId: string;
  collectionId: string | null;
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPct: number | null;
  rawCardValue: number;
  gradedCardValue: number;
  sealedProductValue: number;
  rawCards: number;
  gradedCards: number;
  sealedProducts: number;
  history: HistoryPoint[];
  allTimeHigh: number;
  allTimeLow: number;
  changeToday: number | null;
  changeTodayPct: number | null;
  change7d: number | null;
  change7dPct: number | null;
  change30d: number | null;
  change30dPct: number | null;
  topGainers: TopPerformer[];
  topLosers: TopPerformer[];
  totalItems: number;
  lastSnapshotDate: string | null;
  hasHistory: boolean;
}
