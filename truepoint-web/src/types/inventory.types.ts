export type InventoryItemType = "sealed" | "single" | "graded";
export type GradingCompany = "PSA" | "BGS" | "CGC" | "TAG" | "SGC";
export type GradingStatus = "raw" | "submitted" | "returned";

export interface InventoryItem {
  id: string;
  userId: string;
  cardId: string | null;
  type: InventoryItemType;
  name: string;
  quantity: number;
  costBasis: number;
  acquiredAt: string;
  notes: string | null;
  // Graded-specific
  gradingCompany: GradingCompany | null;
  grade: string | null;
  certNumber: string | null;
  gradingStatus: GradingStatus | null;
  createdAt: string;
}
