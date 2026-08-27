/**
 * In-progress CSV import session state — web port of mobile's
 * src/stores/importFlow.store.ts, same shape and same reasoning: a zustand
 * store rather than route/query state, because the wizard (source picker ->
 * instructions -> upload -> review -> confirm -> progress -> summary) needs
 * to carry a ~500-row payload across several App Router pages, and this is
 * explicitly SESSION state, not a cached server resource — cleared by
 * startNewImport()/reset(), never persisted to disk/localStorage. The
 * persistent record (requirement B) lives server-side in import_jobs,
 * fetched fresh via useImportJob() when revisiting from history.
 *
 * idempotencyKey is generated once per session (startNewImport) and never
 * regenerated on error — a dropped connection is always safe to retry:
 * either the original request never landed and this proceeds fresh, or it
 * did land and the server returns the same job with replayed=true.
 */

import { create } from "zustand";
import {
  CommitImportResult,
  ConfirmedImportItem,
  MatchRowsResult,
  ParseCsvResult,
} from "@/types/csvImport";

export interface RowResolution {
  cardId?: string;
  productId?: string;
}

interface ImportFlowState {
  fileName: string | null;
  csvText: string | null;
  parseResult: ParseCsvResult | null;
  matchResult: MatchRowsResult | null;
  /** rowIndex -> the candidate the user clicked to confirm on a needs-review row */
  resolutions: Record<number, RowResolution>;
  /** rowIndex -> true for rows the user explicitly chose to skip */
  skipped: Record<number, true>;
  idempotencyKey: string | null;
  commitResult: CommitImportResult | null;
  /** Set right before calling commit — lets the progress/summary pages resume after a dropped connection without re-deriving the payload. */
  pendingCommitItems: ConfirmedImportItem[] | null;

  startNewImport: (fileName: string, csvText: string) => void;
  setParseResult: (r: ParseCsvResult) => void;
  setMatchResult: (r: MatchRowsResult) => void;
  resolveRow: (rowIndex: number, choice: RowResolution) => void;
  skipRow: (rowIndex: number) => void;
  unskipRow: (rowIndex: number) => void;
  setPendingCommitItems: (items: ConfirmedImportItem[]) => void;
  setCommitResult: (r: CommitImportResult) => void;
  reset: () => void;
}

const newIdempotencyKey = (): string =>
  `imp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const useImportFlowStore = create<ImportFlowState>((set) => ({
  fileName: null,
  csvText: null,
  parseResult: null,
  matchResult: null,
  resolutions: {},
  skipped: {},
  idempotencyKey: null,
  commitResult: null,
  pendingCommitItems: null,

  startNewImport: (fileName, csvText) =>
    set({
      fileName,
      csvText,
      parseResult: null,
      matchResult: null,
      resolutions: {},
      skipped: {},
      idempotencyKey: newIdempotencyKey(),
      commitResult: null,
      pendingCommitItems: null,
    }),

  setParseResult: (parseResult) => set({ parseResult }),
  setMatchResult: (matchResult) => set({ matchResult }),

  resolveRow: (rowIndex, choice) =>
    set((s) => ({
      resolutions: { ...s.resolutions, [rowIndex]: choice },
      skipped: Object.fromEntries(
        Object.entries(s.skipped).filter(([k]) => Number(k) !== rowIndex),
      ) as Record<number, true>,
    })),

  skipRow: (rowIndex) =>
    set((s) => ({ skipped: { ...s.skipped, [rowIndex]: true } })),

  unskipRow: (rowIndex) =>
    set((s) => ({
      skipped: Object.fromEntries(
        Object.entries(s.skipped).filter(([k]) => Number(k) !== rowIndex),
      ) as Record<number, true>,
    })),

  setPendingCommitItems: (pendingCommitItems) => set({ pendingCommitItems }),
  setCommitResult: (commitResult) => set({ commitResult }),

  reset: () =>
    set({
      fileName: null,
      csvText: null,
      parseResult: null,
      matchResult: null,
      resolutions: {},
      skipped: {},
      idempotencyKey: null,
      commitResult: null,
      pendingCommitItems: null,
    }),
}));
