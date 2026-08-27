"use client";

/**
 * Import Collection — history (requirement B: the persistent record is
 * reachable after the import session ends). Reached from Settings ->
 * Import history. Lists past import_jobs rows; clicking one opens
 * history/[jobId] for the full not-imported list. Web port of mobile's
 * history.tsx.
 */

import { ImportStepHeader } from "@/components/import/ImportStepHeader";
import { ROUTES } from "@/constants/routes";
import { useImportJobs } from "@/hooks/useCsvImport";
import { useRouter } from "next/navigation";

export default function ImportHistoryPage() {
  const router = useRouter();
  const { data: jobs, loading, error, refetch } = useImportJobs();

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px" }}>
      <ImportStepHeader title="Import History" />

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
      ) : error ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
            Couldn&apos;t load your import history.
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
      ) : !jobs || jobs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
            No imports yet
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Collections you import from Collectr or another app will show up here.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {jobs.map((job) => (
            <button
              key={job.id}
              onClick={() => router.push(ROUTES.IMPORT_JOB(job.id))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 16,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface)"; }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>
                  {job.importedCount} item{job.importedCount === 1 ? "" : "s"} imported
                </div>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
                  {new Date(job.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {job.notImported.length > 0 ? ` · ${job.notImported.length} not imported` : ""}
                </div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
