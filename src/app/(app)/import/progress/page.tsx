"use client";

/**
 * Import Collection — commit in progress. Web port of mobile's
 * progress.tsx. Fires POST /import/commit with the plan built on the
 * review page (pendingCommitItems, already stored — this page never
 * re-derives it, so a retry sends the exact same payload). No back
 * button while committing.
 *
 * On failure, the retry action is labeled "Resume," not "Start over" —
 * idempotencyKey never changes across retries of the same commit attempt,
 * so a dropped connection is always safe to retry: either the original
 * request never landed and this proceeds fresh, or it did land and the
 * server returns the same job with replayed=true.
 */

import { ImportStepHeader } from "@/components/import/ImportStepHeader";
import { ROUTES } from "@/constants/routes";
import { commitImport } from "@/hooks/useCsvImport";
import { buildImportPlan } from "@/lib/importPlan";
import { useImportFlowStore } from "@/stores/importFlow.store";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function ImportProgressPage() {
  const router = useRouter();
  const parseResult = useImportFlowStore((s) => s.parseResult);
  const pendingCommitItems = useImportFlowStore((s) => s.pendingCommitItems);
  const idempotencyKey = useImportFlowStore((s) => s.idempotencyKey);
  const setCommitResult = useImportFlowStore((s) => s.setCommitResult);
  const matchResultForPlan = useImportFlowStore((s) => s.matchResult); // used only to recompute notImported on resume, see below
  const resolutions = useImportFlowStore((s) => s.resolutions);
  const skipped = useImportFlowStore((s) => s.skipped);

  const [failed, setFailed] = useState(false);
  const startedRef = useRef(false);

  const runCommit = async () => {
    if (!parseResult || !pendingCommitItems || !idempotencyKey) {
      router.replace(ROUTES.IMPORT);
      return;
    }
    setFailed(false);
    try {
      // notImported is recomputed from the same store state rather than
      // cached alongside pendingCommitItems — cheap, pure, and guarantees
      // a resume reconstructs the identical payload.
      const plan = buildImportPlan(
        parseResult.rows,
        matchResultForPlan?.results ?? [],
        resolutions,
        skipped,
        parseResult.unsupportedCategoryRows,
      );
      const result = await commitImport({
        idempotencyKey,
        totalRows: parseResult.rows.length + parseResult.unsupportedCategoryRows.length,
        items: pendingCommitItems,
        notImported: plan.notImported,
      });
      setCommitResult(result);
      router.replace(ROUTES.IMPORT_SUMMARY);
    } catch {
      setFailed(true);
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    runCommit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const itemCount = pendingCommitItems?.length ?? 0;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px" }}>
      <ImportStepHeader title="Importing" showBack={false} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center" }}>
        {!failed ? (
          <>
            <div
              style={{
                width: 32,
                height: 32,
                border: "3px solid var(--border)",
                borderTopColor: "var(--gold)",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
                marginBottom: 20,
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ fontSize: 17, fontWeight: 500, color: "var(--text-primary)" }}>
              Importing {itemCount} item{itemCount === 1 ? "" : "s"}…
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8 }}>
              This can take a moment for a large collection.
            </p>
          </>
        ) : (
          <>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                background: "var(--surface)",
                border: "1px solid var(--red)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8 }}>
              Connection dropped
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 340, marginBottom: 24 }}>
              Your import didn&apos;t finish, but nothing was lost — it&apos;s safe to pick up where this left off.
            </p>
            <button
              onClick={runCommit}
              style={{
                background: "transparent",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "10px 24px",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Resume import
            </button>
          </>
        )}
      </div>
    </div>
  );
}
