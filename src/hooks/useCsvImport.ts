"use client";

/**
 * CSV import — calls against the backend's /import endpoints
 * (docs/csv-import-design.md, truepoint-server). Mirrors useRegradeTracker.ts's
 * pattern (this codebase's web hooks don't use react-query — mobile's
 * equivalent hook does, since mobile has it wired; kept the two files'
 * request/response shapes identical, just the hook plumbing adapted per
 * platform). parse/match/commit are plain exported async functions (the
 * wizard holds each step's result in importFlow.store, not a query cache);
 * useImportJobs/useImportJob ARE useState+useEffect reads — the persistent,
 * re-fetchable part (requirement B: retrievable after the session ends).
 *
 * Backend endpoints:
 *   POST /import/parse    { csv }                              -> ParseCsvResult
 *   POST /import/match    { rows }                              -> MatchRowsResult
 *   POST /import/commit   { idempotencyKey, totalRows, items, notImported } -> CommitImportResult
 *   GET  /import/jobs                                            -> ImportJobRow[]
 *   GET  /import/jobs/:id                                        -> ImportJobRow
 */

import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import {
  CommitImportRequest,
  CommitImportResult,
  ImportJobRow,
  MatchRowsResult,
  ParsedImportRow,
  ParseCsvResult,
} from "../types/csvImport";

// Parsing + matching a large CSV means dozens of catalog queries server-side
// — longer than the client's default 10s timeout (lib/api.ts) comfortably
// covers for a full ~500-row file. Import calls get their own generous
// timeout rather than raising the global default for every other endpoint.
const IMPORT_TIMEOUT_MS = 60000;

export const parseImportCsv = async (csv: string): Promise<ParseCsvResult> => {
  const res = await api.post<{ data: ParseCsvResult }>(
    "/import/parse",
    { csv },
    { timeout: IMPORT_TIMEOUT_MS },
  );
  return res.data.data;
};

export const matchImportRows = async (
  rows: ParsedImportRow[],
): Promise<MatchRowsResult> => {
  const res = await api.post<{ data: MatchRowsResult }>(
    "/import/match",
    { rows },
    { timeout: IMPORT_TIMEOUT_MS },
  );
  return res.data.data;
};

export const commitImport = async (
  request: CommitImportRequest,
): Promise<CommitImportResult> => {
  const res = await api.post<{ data: CommitImportResult }>(
    "/import/commit",
    request,
    { timeout: IMPORT_TIMEOUT_MS },
  );
  return res.data.data;
};

export const useImportJobs = (enabled: boolean = true) => {
  const [data, setData] = useState<ImportJobRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refetchTick, setRefetchTick] = useState(0);

  const refetch = useCallback(() => setRefetchTick((t) => t + 1), []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<{ data: ImportJobRow[] }>("/import/jobs")
      .then((res) => {
        if (!cancelled) setData(res.data.data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("[useImportJobs] error:", err);
          setError(err.message ?? "Failed to load import history");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, refetchTick]);

  return {
    data: enabled ? data : null,
    loading: enabled ? loading : false,
    error: enabled ? error : null,
    refetch,
  };
};

export const useImportJob = (jobId: string | null) => {
  const [data, setData] = useState<ImportJobRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refetchTick, setRefetchTick] = useState(0);

  const refetch = useCallback(() => setRefetchTick((t) => t + 1), []);

  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<{ data: ImportJobRow }>(`/import/jobs/${jobId}`)
      .then((res) => {
        if (!cancelled) setData(res.data.data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("[useImportJob] error:", err);
          setError(err.message ?? "Failed to load this import");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [jobId, refetchTick]);

  return {
    data: jobId ? data : null,
    loading: jobId ? loading : false,
    error: jobId ? error : null,
    refetch,
  };
};
