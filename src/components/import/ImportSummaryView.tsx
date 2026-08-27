"use client";

/**
 * ImportSummaryView — shared presentational body for both the fresh
 * post-commit summary page and a past job's page (GET /import/jobs/:id —
 * requirement B: reachable after the import session that created it has
 * ended). One component renders both so they can't drift about what "490
 * imported" means. Web port of mobile's component of the same name.
 */

import { NotImportedRow } from "@/types/csvImport";

const REASON_LABELS: Record<NotImportedRow["reason"], string> = {
  unmatched: "couldn't confirm",
  skipped: "skipped",
  "unsupported-category": "unsupported category",
};

export interface ImportSummaryViewProps {
  importedCount: number;
  portfolioValue: number | null;
  notImported: NotImportedRow[];
  /** Shown above the count, e.g. a date for a past job */
  eyebrow?: string;
}

export function ImportSummaryView({
  importedCount,
  portfolioValue,
  notImported,
  eyebrow,
}: ImportSummaryViewProps) {
  const reasonCounts = notImported.reduce<Record<string, number>>((acc, r) => {
    acc[r.reason] = (acc[r.reason] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ textAlign: "center", padding: "16px 0" }}>
        {eyebrow && (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-dim)",
              letterSpacing: "0.08em",
              marginBottom: 4,
            }}
          >
            {eyebrow.toUpperCase()}
          </div>
        )}
        <div
          className="font-display"
          style={{ fontSize: 56, lineHeight: 1, color: "var(--gold)" }}
        >
          {importedCount}
        </div>
        <div style={{ fontSize: 15, color: "var(--text-secondary)", marginTop: 6 }}>
          item{importedCount === 1 ? "" : "s"} imported
        </div>
        {portfolioValue != null && (
          <div style={{ fontSize: 17, fontWeight: 500, color: "var(--text-primary)", marginTop: 16 }}>
            Valued at ${portfolioValue.toFixed(2)} by ReverseHolo pricing
          </div>
        )}
      </div>

      {notImported.length > 0 && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div style={{ fontSize: 17, fontWeight: 500, color: "var(--text-primary)" }}>
              {notImported.length} not imported
            </div>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
            We couldn&apos;t confirm or import these — add them manually.
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>
            {Object.entries(reasonCounts)
              .map(([reason, count]) => `${count} ${REASON_LABELS[reason as NotImportedRow["reason"]] ?? reason}`)
              .join(" · ")}
          </div>

          {notImported.map((row) => (
            <div
              key={row.rowIndex}
              style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {row.set} — {row.productName}
                {row.cardNumber ? ` #${row.cardNumber}` : ""}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                {row.category} · {REASON_LABELS[row.reason] ?? row.reason}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
