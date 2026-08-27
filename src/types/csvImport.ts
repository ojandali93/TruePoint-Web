/**
 * CSV import types — mirror the server's src/types/csvImport.types.ts
 * response shapes exactly (camelCase JSON, same field names). No shared
 * package between the repos, so these are duplicated by hand — kept
 * byte-identical to mobile's src/types/csvImport.ts; update both if the
 * server's shapes change.
 */

export type ImportGame = "pokemon" | "onepiece";

export interface ParsedImportRow {
  rowIndex: number;
  portfolioName: string;
  category: "Pokemon" | "One Piece";
  game: ImportGame;
  set: string;
  productName: string;
  cardNumber: string;
  rarity: string;
  variance: string;
  grade: string;
  cardCondition: string;
  averageCostPaid: number | null;
  quantity: number;
  marketPriceCollectr: number | null;
  priceOverride: string;
  watchlist: string;
  dateAdded: string;
  notes: string;
  isJp: boolean;
  productNameStripped: string;
  isSealedSignature: boolean;
}

export interface ImportParseError {
  rowIndex: number;
  message: string;
  raw: string;
}

export interface UnsupportedCategoryRow {
  rowIndex: number;
  category: string;
  portfolioName: string;
  set: string;
  productName: string;
  cardNumber: string;
}

export interface ParseCsvResult {
  rows: ParsedImportRow[];
  errors: ImportParseError[];
  unsupportedCategoryRows: UnsupportedCategoryRow[];
  categoryCounts: Record<string, number>;
  unsupportedCategorySummary: string | null;
}

export type Confidence = "exact" | "high" | "needs-review" | "unmatched";

export type ReasonCode =
  | "ok"
  | "ambiguous-set"
  | "unmatched-set"
  | "unmatched-number"
  | "ambiguous-candidates"
  | "qualifier-tiebreak"
  | "unmatched-product"
  | "ambiguous-product"
  | "unpriced-grade-tier"
  | "unparseable-grade"
  | "variance-unmatched";

export interface MatchCandidate {
  cardId?: string;
  productId?: string;
  setId: string;
  setName: string;
  name: string;
  number?: string;
  imageUrl?: string | null;
}

export type ItemType = "raw_card" | "graded_card" | "sealed_product";

export interface MatchResult {
  rowIndex: number;
  itemType: ItemType;
  confidence: Confidence;
  reasonCode: ReasonCode;
  reason: string;

  matchedSetId?: string;
  matchedSetName?: string;
  matchedCardId?: string;
  matchedProductId?: string;
  matchedNumber?: string;
  matchedName?: string;
  matchedImageUrl?: string | null;

  resolvedGrade?: string | null;
  resolvedGradingCompany?: string | null;
  resolvedVariantType?: string | null;
  resolvedIsSealed?: boolean;

  candidates?: MatchCandidate[];
}

export interface MatchRowsResult {
  results: MatchResult[];
  summary: Record<Confidence, number>;
}

export type NotImportedReason = "unmatched" | "skipped" | "unsupported-category";

export interface NotImportedRow {
  rowIndex: number;
  reason: NotImportedReason;
  portfolioName: string;
  category: string;
  set: string;
  productName: string;
  cardNumber: string;
}

export interface ConfirmedImportItem {
  rowIndex: number;
  itemType: ItemType;
  cardId?: string;
  productId?: string;
  grade?: string | null;
  gradingCompany?: string | null;
  variantType?: string | null;
  isSealed?: boolean;
  quantity: number;
  purchasePrice?: number | null;
  condition?: string | null;
}

export interface CommitImportRequest {
  idempotencyKey: string;
  totalRows: number;
  items: ConfirmedImportItem[];
  notImported: NotImportedRow[];
}

export interface CommitImportResult {
  importJobId: string;
  imported: number;
  notImportedCount: number;
  portfolioValue: number | null;
  notImported: NotImportedRow[];
  replayed: boolean;
}

export interface ImportJobRow {
  id: string;
  userId: string;
  source: string;
  idempotencyKey: string;
  totalRows: number;
  importedCount: number;
  notImported: NotImportedRow[];
  portfolioValueAtImport: number | null;
  status: string;
  createdAt: string;
}
