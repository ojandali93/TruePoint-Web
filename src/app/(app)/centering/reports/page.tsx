/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * Centering reports list — /centering/reports
 *
 * Shows all of the user's saved AI centering analyses. Each row is tappable
 * to drill into the full report detail. Supports deletion inline.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  useCenteringReports,
  scoreTierColor,
  type CenteringReport,
} from "../../../../hooks/useCenteringReports";

export default function CenteringReportsPage() {
  const router = useRouter();
  const { reports, loading, error, remove } = useCenteringReports();
  const [search, setSearch] = useState("");
  const [filterSide, setFilterSide] = useState<"all" | "front" | "back">("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = reports.filter((r) => {
    if (filterSide !== "all" && r.side !== filterSide) return false;
    if (search && !(r.label ?? "").toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const handleDelete = async (reportId: string) => {
    if (!confirm("Delete this centering report? This can't be undone.")) return;
    setDeleting(reportId);
    setDeleteError(null);
    try {
      await remove(reportId);
    } catch (err: any) {
      setDeleteError(err.message ?? "Couldn't delete");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 24,
          fontSize: 12,
          color: "var(--text-dim)",
        }}
      >
        <Link
          href='/centering'
          style={{ color: "var(--text-dim)", textDecoration: "none" }}
        >
          Centering
        </Link>
        <span>›</span>
        <span style={{ color: "var(--text-secondary)" }}>Saved reports</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontSize: 11,
            color: "var(--gold)",
            letterSpacing: "0.1em",
            fontFamily: "DM Mono, monospace",
            marginBottom: 8,
          }}
        >
          CENTERING REPORTS
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          Saved analyses
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {loading
            ? "Loading..."
            : `${filtered.length}${
                filtered.length !== reports.length
                  ? ` of ${reports.length}`
                  : ""
              } report${filtered.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {/* Filters */}
      <div
        style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search by label...'
            style={{
              width: "100%",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "10px 14px 10px 38px",
              fontSize: 13,
              color: "var(--text-primary)",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 14,
              color: "var(--text-dim)",
            }}
          >
            ⌕
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["all", "front", "back"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterSide(s)}
              style={{
                padding: "8px 14px",
                borderRadius: 6,
                border: `1px solid ${filterSide === s ? "var(--gold)" : "var(--border)"}`,
                background:
                  filterSide === s ? "rgba(201,168,76,0.12)" : "var(--surface)",
                color:
                  filterSide === s ? "var(--gold)" : "var(--text-secondary)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                textTransform: "capitalize",
              }}
            >
              {s === "all" ? "All sides" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div
          style={{
            padding: 16,
            background: "rgba(201,76,76,0.08)",
            border: "1px solid rgba(201,76,76,0.3)",
            borderRadius: 8,
            color: "var(--red)",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}
      {deleteError && (
        <div
          style={{
            padding: 12,
            background: "rgba(201,76,76,0.08)",
            border: "1px solid rgba(201,76,76,0.3)",
            borderRadius: 8,
            color: "var(--red)",
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          {deleteError}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: 80,
            color: "var(--text-dim)",
            fontSize: 13,
          }}
        >
          Loading reports...
        </div>
      )}

      {/* Empty */}
      {!loading && reports.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 24px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 16 }}>📐</div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: 8,
            }}
          >
            No saved reports yet
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              marginBottom: 16,
            }}
          >
            Run a centering analysis and save the results to see them here.
          </div>
          <Link
            href='/centering'
            style={{
              display: "inline-block",
              padding: "9px 18px",
              borderRadius: 8,
              background: "var(--gold)",
              color: "#0D0E11",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Start a centering analysis
          </Link>
        </div>
      )}

      {/* Empty after filter (but has reports) */}
      {!loading && reports.length > 0 && filtered.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: "var(--text-dim)",
            fontSize: 13,
          }}
        >
          No reports match your filters.
        </div>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((r) => (
            <ReportRow
              key={r.id}
              report={r}
              deleting={deleting === r.id}
              onOpen={() => router.push(`/centering/reports/${r.id}`)}
              onDelete={() => handleDelete(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function ReportRow({
  report,
  deleting,
  onOpen,
  onDelete,
}: {
  report: CenteringReport;
  deleting: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const score = report.truepointScore;
  const color = scoreTierColor(score);
  const date = new Date(report.createdAt);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "72px 1fr 200px 100px 80px",
        gap: 16,
        alignItems: "center",
        padding: "14px 20px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        cursor: "pointer",
        transition: "border-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--gold-dim)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
      }}
      onClick={onOpen}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: 72,
          height: 96,
          borderRadius: 6,
          background: "var(--surface-2)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {report.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={report.imageUrl}
            alt={report.label ?? "Centering report"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <span style={{ fontSize: 20, color: "var(--text-dim)" }}>📐</span>
        )}
      </div>

      {/* Label + metadata */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {report.label || "Untitled report"}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-dim)",
            fontFamily: "DM Mono, monospace",
            display: "flex",
            gap: 12,
          }}
        >
          <span style={{ textTransform: "uppercase" }}>{report.side}</span>
          <span>
            L/R: {Math.round(report.percentages.leftPct)} /{" "}
            {Math.round(report.percentages.rightPct)}
          </span>
          <span>
            T/B: {Math.round(report.percentages.topPct)} /{" "}
            {Math.round(report.percentages.bottomPct)}
          </span>
        </div>
      </div>

      {/* Predicted grades */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {(["psa", "bgs", "cgc"] as const).map((co) => (
          <div
            key={co}
            style={{
              fontSize: 11,
              fontFamily: "DM Mono, monospace",
              color: "var(--text-dim)",
            }}
          >
            <span style={{ color: "var(--text-secondary)" }}>
              {co.toUpperCase()}
            </span>
            : {report.grades[co]}
          </div>
        ))}
      </div>

      {/* TruePoint score */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 9,
            color: "var(--text-dim)",
            letterSpacing: "0.06em",
            marginBottom: 4,
            fontFamily: "DM Mono, monospace",
          }}
        >
          TRUEPOINT
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            color,
            fontFamily: "DM Mono, monospace",
          }}
        >
          {Math.round(score)}
        </div>
      </div>

      {/* Date + delete */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "var(--text-dim)",
            fontFamily: "DM Mono, monospace",
            textAlign: "right",
            lineHeight: 1.4,
          }}
        >
          {dateStr}
          <br />
          {timeStr}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={deleting}
          aria-label='Delete report'
          style={{
            border: "1px solid var(--border)",
            background: "transparent",
            color: deleting ? "var(--text-dim)" : "var(--red)",
            fontSize: 10,
            padding: "3px 8px",
            borderRadius: 4,
            cursor: deleting ? "default" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {deleting ? "..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
