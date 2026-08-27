/**
 * Turns the import flow store's state (parsed rows + match results + the
 * user's needs-review resolutions/skips) into what /import/commit needs:
 * the confirmed items to write, and the persistent not-imported list
 * (requirement B — unmatched + skipped + unsupported-category, one shape).
 *
 * Pure logic, byte-identical to mobile's src/lib/importPlan.ts (framework
 * agnostic — no RN/DOM dependency either side) so review/progress/summary
 * pages on both platforms can't drift about what "490 imported" means.
 */

import {
  ConfirmedImportItem,
  MatchResult,
  NotImportedRow,
  ParsedImportRow,
} from "@/types/csvImport";
import { RowResolution } from "@/stores/importFlow.store";

const conditionFor = (raw: string): string | null => (raw === "Near Mint" ? "NM" : null);

const KNOWN_COMPANIES = new Set(["PSA", "BGS", "CGC", "SGC", "TAG", "ACE"]);

/**
 * Deliberate simplification vs. the server's parseGradeColumn (locked-tier
 * aware — CGC/BGS Pristine, BGS Black Label): only used for a needs-review
 * row the user resolved by clicking a candidate, where the server's own
 * match already ran and (for ambiguous-set/ambiguous-candidates rows
 * specifically) never reached grade parsing because it short-circuited on
 * the ambiguity first. Covers the common case (sub-10 numeric, bare
 * default-10) correctly; a resolved row that ALSO happens to need a
 * Pristine/Black-Label tier falls back to a plain "COMPANY N" rather than
 * the precise locked string — same documented gap as mobile's copy.
 */
const lightGradeParse = (raw: string): { company: string | null; grade: string | null } => {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "ungraded") return { company: null, grade: null };
  const parts = trimmed.split(/\s+/);
  const company = parts[0]?.toUpperCase();
  const numeric = parts[1];
  if (!company || !KNOWN_COMPANIES.has(company) || !numeric || !/^\d+(\.\d+)?$/.test(numeric)) {
    return { company: null, grade: null };
  }
  const numericTrimmed = numeric.replace(/\.0$/, "");
  return { company, grade: `${company} ${numericTrimmed}` };
};

export interface ImportPlan {
  items: ConfirmedImportItem[];
  notImported: NotImportedRow[];
}

export const buildImportPlan = (
  rows: ParsedImportRow[],
  results: MatchResult[],
  resolutions: Record<number, RowResolution>,
  skipped: Record<number, true>,
  unsupportedCategoryRows: Array<{
    rowIndex: number;
    category: string;
    portfolioName: string;
    set: string;
    productName: string;
    cardNumber: string;
  }>,
): ImportPlan => {
  const rowByIndex = new Map(rows.map((r) => [r.rowIndex, r]));
  const items: ConfirmedImportItem[] = [];
  const notImported: NotImportedRow[] = [];

  for (const r of results) {
    const src = rowByIndex.get(r.rowIndex);
    if (!src) continue;

    if (skipped[r.rowIndex]) {
      notImported.push({
        rowIndex: r.rowIndex,
        reason: "skipped",
        portfolioName: src.portfolioName,
        category: src.category,
        set: src.set,
        productName: src.productName,
        cardNumber: src.cardNumber,
      });
      continue;
    }

    const resolution = resolutions[r.rowIndex];

    if (r.confidence === "exact" || r.confidence === "high") {
      items.push({
        rowIndex: r.rowIndex,
        itemType: r.itemType,
        cardId: r.matchedCardId,
        productId: r.matchedProductId,
        grade: r.resolvedGrade ?? null,
        gradingCompany: r.resolvedGradingCompany ?? null,
        variantType: r.resolvedVariantType ?? null,
        isSealed: r.resolvedIsSealed,
        quantity: src.quantity,
        purchasePrice: src.averageCostPaid,
        condition: conditionFor(src.cardCondition),
      });
      continue;
    }

    if (resolution) {
      const isGraded = src.grade.trim().toLowerCase() !== "ungraded";
      const light = isGraded ? lightGradeParse(src.grade) : { company: null, grade: null };
      items.push({
        rowIndex: r.rowIndex,
        itemType: r.itemType,
        cardId: resolution.cardId ?? r.matchedCardId,
        productId: resolution.productId ?? r.matchedProductId,
        grade: r.resolvedGrade ?? light.grade,
        gradingCompany: r.resolvedGradingCompany ?? light.company,
        variantType: r.resolvedVariantType ?? null,
        isSealed: r.itemType === "sealed_product",
        quantity: src.quantity,
        purchasePrice: src.averageCostPaid,
        condition: conditionFor(src.cardCondition),
      });
      continue;
    }

    // needs-review, not resolved, not skipped — and everything in the
    // unmatched bucket — join the persistent not-imported list. Never
    // guessed into `items`.
    notImported.push({
      rowIndex: r.rowIndex,
      reason: "unmatched",
      portfolioName: src.portfolioName,
      category: src.category,
      set: src.set,
      productName: src.productName,
      cardNumber: src.cardNumber,
    });
  }

  for (const u of unsupportedCategoryRows) {
    notImported.push({
      rowIndex: u.rowIndex,
      reason: "unsupported-category",
      portfolioName: u.portfolioName,
      category: u.category,
      set: u.set,
      productName: u.productName,
      cardNumber: u.cardNumber,
    });
  }

  return { items, notImported };
};
