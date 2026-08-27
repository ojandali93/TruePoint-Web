"use client";

/**
 * One past import job's summary — requirement B, the actual "reachable
 * after the session ends" path: GET /import/jobs/:id, fresh from the
 * server (not anything cached from the original commit), rendered through
 * the same ImportSummaryView the live summary page uses. Web port of
 * mobile's history/[jobId].tsx.
 *
 * params arrives as a Promise even in this client component — this repo's
 * Next version convention (see products/[productId]/page.tsx), unwrapped
 * via React's use().
 */

import { use } from "react";
import { ImportSummaryView } from "@/components/import/ImportSummaryView";
import { ImportStepHeader } from "@/components/import/ImportStepHeader";
import { useImportJob } from "@/hooks/useCsvImport";

export default function ImportHistoryJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const { data: job, loading, error, refetch } = useImportJob(jobId);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px" }}>
      <ImportStepHeader title="Import" />

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <div
            style={{
              width: 28,
              height: 28,
              border: "3px solid var(--border)",
              borderTopColor: "var(--gold)",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error || !job ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
            Couldn&apos;t load this import.
          </p>
          <button
            onClick={() => refetch()}
            style={{
              background: "transparent",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "8px 20px",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <ImportSummaryView
          importedCount={job.importedCount}
          portfolioValue={job.portfolioValueAtImport}
          notImported={job.notImported}
          eyebrow={new Date(job.createdAt).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        />
      )}
    </div>
  );
}
