"use client";

/**
 * Import Collection — review page. The product, per the design brief:
 * bucket sections (exact/high collapsed by default with counts,
 * needs-review as click-to-pick candidate cards with art, unmatched as
 * excluded rows), a running "ready to import" count, brand tokens
 * throughout. Web port of mobile's review.tsx.
 *
 * Never auto-imports a needs-review guess: a row only joins the confirm
 * count once the user has clicked a specific candidate (buildImportPlan,
 * src/lib/importPlan.ts, is the single source of truth for what "ready"
 * means — this page, progress, and summary all call it the same way so
 * the count can't drift between pages).
 */

import { MatchCandidateCard } from "@/components/import/MatchCandidateCard";
import { ImportStepHeader } from "@/components/import/ImportStepHeader";
import { ROUTES } from "@/constants/routes";
import { buildImportPlan } from "@/lib/importPlan";
import { useImportFlowStore } from "@/stores/importFlow.store";
import { MatchResult, ParsedImportRow } from "@/types/csvImport";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";

const rowLabel = (row: ParsedImportRow): string =>
  `${row.set} — ${row.productName}${row.cardNumber ? ` #${row.cardNumber}` : ""}`;

function BucketSection({
  title,
  count,
  tone,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  tone: "positive" | "neutral";
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 16,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              background: tone === "positive" ? "rgba(61,170,110,0.15)" : "var(--surface-2)",
              color: tone === "positive" ? "var(--green)" : "var(--text-secondary)",
            }}
          >
            {count}
          </span>
          <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>{title}</span>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expanded ? "rotate(180deg)" : undefined, transition: "transform 0.15s ease" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {expanded && <div style={{ padding: "0 16px 12px" }}>{children}</div>}
    </div>
  );
}

function SimpleMatchRow({ row, result }: { row: ParsedImportRow; result: MatchResult }) {
  return (
    <div style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
      <div style={{ fontSize: 13, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {result.matchedName ?? rowLabel(row)}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {result.matchedSetName} {result.matchedNumber ? `#${result.matchedNumber}` : ""}
        {row.grade && row.grade.toLowerCase() !== "ungraded" ? ` · ${result.resolvedGrade ?? row.grade}` : ""}
      </div>
    </div>
  );
}

function NeedsReviewRow({
  row,
  result,
  resolvedCandidateKey,
  skipped,
  onPick,
  onSkip,
  onUnskip,
}: {
  row: ParsedImportRow;
  result: MatchResult;
  resolvedCandidateKey: string | null;
  skipped: boolean;
  onPick: (cardId?: string, productId?: string) => void;
  onSkip: () => void;
  onUnskip: () => void;
}) {
  const candidates =
    result.candidates && result.candidates.length > 0
      ? result.candidates
      : result.matchedCardId || result.matchedProductId
        ? [
            {
              cardId: result.matchedCardId,
              productId: result.matchedProductId,
              setId: result.matchedSetId ?? "",
              setName: result.matchedSetName ?? "",
              name: result.matchedName ?? rowLabel(row),
              number: result.matchedNumber,
              imageUrl: result.matchedImageUrl,
            },
          ]
        : [];

  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${skipped ? "var(--border)" : "#e8a83855"}`,
        borderRadius: 8,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        opacity: skipped ? 0.55 : 1,
      }}
    >
      <div>
        <div style={{ fontSize: 13, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {rowLabel(row)}
        </div>
        {row.grade && row.grade.toLowerCase() !== "ungraded" && (
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{row.grade}</div>
        )}
        <div style={{ fontSize: 12, color: "#e8a838", marginTop: 2 }}>{result.reason}</div>
      </div>

      {!skipped && candidates.length > 0 && (
        <div style={{ display: "flex", overflowX: "auto", paddingBottom: 4 }}>
          {candidates.map((c, i) => {
            const key = `${c.cardId ?? ""}|${c.productId ?? ""}`;
            return (
              <MatchCandidateCard
                key={c.cardId ?? c.productId ?? i}
                candidate={c}
                selected={resolvedCandidateKey === key}
                onClick={() => onPick(c.cardId, c.productId)}
              />
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={skipped ? onUnskip : onSkip}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            fontSize: 12,
            color: "var(--text-dim)",
            textDecoration: "underline",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {skipped ? "Skipped — click to undo" : "Skip this item"}
        </button>
      </div>
    </div>
  );
}

function UnmatchedRow({ row, result }: { row: ParsedImportRow; result: MatchResult }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 0", borderTop: "1px solid var(--border)" }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 3, flexShrink: 0 }}>
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {rowLabel(row)}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{result.reason}</div>
      </div>
    </div>
  );
}

export default function ImportReviewPage() {
  const router = useRouter();

  const parseResult = useImportFlowStore((s) => s.parseResult);
  const matchResult = useImportFlowStore((s) => s.matchResult);
  const resolutions = useImportFlowStore((s) => s.resolutions);
  const skipped = useImportFlowStore((s) => s.skipped);
  const resolveRow = useImportFlowStore((s) => s.resolveRow);
  const skipRow = useImportFlowStore((s) => s.skipRow);
  const unskipRow = useImportFlowStore((s) => s.unskipRow);
  const setPendingCommitItems = useImportFlowStore((s) => s.setPendingCommitItems);

  const [exactExpanded, setExactExpanded] = useState(false);
  const [highExpanded, setHighExpanded] = useState(false);

  useEffect(() => {
    if (!parseResult || !matchResult) {
      router.replace(ROUTES.IMPORT);
    }
  }, [parseResult, matchResult, router]);

  const rowByIndex = useMemo(
    () => new Map((parseResult?.rows ?? []).map((r) => [r.rowIndex, r])),
    [parseResult],
  );

  const buckets = useMemo(() => {
    const results = matchResult?.results ?? [];
    return {
      exact: results.filter((r) => r.confidence === "exact"),
      high: results.filter((r) => r.confidence === "high"),
      needsReview: results.filter((r) => r.confidence === "needs-review"),
      unmatched: results.filter((r) => r.confidence === "unmatched"),
    };
  }, [matchResult]);

  const plan = useMemo(() => {
    if (!parseResult || !matchResult) return { items: [], notImported: [] };
    return buildImportPlan(
      parseResult.rows,
      matchResult.results,
      resolutions,
      skipped,
      parseResult.unsupportedCategoryRows,
    );
  }, [parseResult, matchResult, resolutions, skipped]);

  if (!parseResult || !matchResult) return null;

  const readyCount = plan.items.length;

  const handleConfirm = () => {
    setPendingCommitItems(plan.items);
    router.push(ROUTES.IMPORT_PROGRESS);
  };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px 120px" }}>
      <ImportStepHeader
        title="Review Import"
        subtitle={`${readyCount} item${readyCount === 1 ? "" : "s"} ready to import`}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {parseResult.unsupportedCategorySummary && (
          <div
            style={{
              display: "flex",
              gap: 8,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: 12,
              alignItems: "flex-start",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1, flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {parseResult.unsupportedCategorySummary}
            </span>
          </div>
        )}

        <BucketSection title="Ready to import" count={buckets.exact.length} tone="positive" expanded={exactExpanded} onToggle={() => setExactExpanded((v) => !v)}>
          {buckets.exact.map((r) => {
            const row = rowByIndex.get(r.rowIndex);
            return row ? <SimpleMatchRow key={r.rowIndex} row={row} result={r} /> : null;
          })}
        </BucketSection>

        <BucketSection title="Matched" count={buckets.high.length} tone="positive" expanded={highExpanded} onToggle={() => setHighExpanded((v) => !v)}>
          {buckets.high.map((r) => {
            const row = rowByIndex.get(r.rowIndex);
            return row ? <SimpleMatchRow key={r.rowIndex} row={row} result={r} /> : null;
          })}
        </BucketSection>

        {buckets.needsReview.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>
              Needs review ({buckets.needsReview.length})
            </div>
            {buckets.needsReview.map((r) => {
              const row = rowByIndex.get(r.rowIndex);
              if (!row) return null;
              const resolution = resolutions[r.rowIndex];
              const resolvedKey = resolution
                ? `${resolution.cardId ?? ""}|${resolution.productId ?? ""}`
                : null;
              return (
                <NeedsReviewRow
                  key={r.rowIndex}
                  row={row}
                  result={r}
                  resolvedCandidateKey={resolvedKey}
                  skipped={!!skipped[r.rowIndex]}
                  onPick={(cardId, productId) => resolveRow(r.rowIndex, { cardId, productId })}
                  onSkip={() => skipRow(r.rowIndex)}
                  onUnskip={() => unskipRow(r.rowIndex)}
                />
              );
            })}
          </div>
        )}

        {buckets.unmatched.length > 0 && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
              Can&apos;t import ({buckets.unmatched.length})
            </div>
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>
              We couldn&apos;t confirm these — add them manually after import.
            </div>
            {buckets.unmatched.map((r) => {
              const row = rowByIndex.get(r.rowIndex);
              return row ? <UnmatchedRow key={r.rowIndex} row={row} result={r} /> : null;
            })}
          </div>
        )}
      </div>

      {/* sticky, not fixed — a fixed bar spans the full viewport and would
          sit on top of the desktop sidebar; sticky stays inside this
          content column's own bounds. */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          marginTop: 24,
          marginLeft: -24,
          marginRight: -24,
          padding: 16,
          background: "var(--charcoal)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <button
          onClick={handleConfirm}
          disabled={readyCount === 0}
          style={{
            width: "100%",
            background: readyCount === 0 ? "var(--gold-dim)" : "var(--gold)",
            color: "#0D0E11",
            border: "none",
            borderRadius: 6,
            padding: "13px 20px",
            fontSize: 14,
            fontWeight: 500,
            cursor: readyCount === 0 ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          Import {readyCount} item{readyCount === 1 ? "" : "s"}
        </button>
      </div>
    </div>
  );
}
