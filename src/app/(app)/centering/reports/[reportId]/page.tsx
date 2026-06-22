"use client";

/**
 * Centering report detail — /centering/reports/[reportId]
 *
 * Shows a single saved analysis with the image + border overlay, measurements,
 * percentages, predicted grades, and Reverse Holo score.
 */

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  useCenteringReport,
  scoreTierColor,
  type BorderPositions,
} from "../../../../../hooks/useCenteringReports";

const COMPANY_COLORS: Record<string, string> = {
  psa: "#C9A84C",
  bgs: "#378ADD",
  cgc: "#3DAA6E",
  sgc: "#9B59B6",
  tag: "#D85A30",
};

export default function CenteringReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = use(params);
  const router = useRouter();
  const { report, loading, error } = useCenteringReport(reportId);

  if (loading) {
    return (
      <div
        style={{
          padding: 80,
          textAlign: "center",
          color: "var(--text-dim)",
          fontSize: 13,
        }}
      >
        Loading report...
      </div>
    );
  }

  if (error || !report) {
    return (
      <div
        style={{
          padding: 80,
          textAlign: "center",
          color: "var(--red)",
          fontSize: 13,
        }}
      >
        {error ?? "Report not found"}
        <div style={{ marginTop: 16 }}>
          <Link
            href='/centering/reports'
            style={{ color: "var(--gold)", textDecoration: "none" }}
          >
            ← Back to reports
          </Link>
        </div>
      </div>
    );
  }

  const score = report.rhScore;
  const scoreColor = scoreTierColor(score);
  const date = new Date(report.createdAt);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

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
        <Link
          href='/centering/reports'
          style={{ color: "var(--text-dim)", textDecoration: "none" }}
        >
          Saved reports
        </Link>
        <span>›</span>
        <span style={{ color: "var(--text-secondary)" }}>
          {report.label || "Untitled report"}
        </span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 11,
            color: "var(--gold)",
            letterSpacing: "0.1em",
            fontFamily: "DM Mono, monospace",
            marginBottom: 8,
          }}
        >
          {report.side.toUpperCase()} · {dateStr}
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          {report.label || "Untitled report"}
        </h1>
      </div>

      {/* Two-column: image+overlay on left, stats on right */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 420px) 1fr",
          gap: 32,
          marginBottom: 32,
          alignItems: "start",
        }}
      >
        {/* Image with SVG border overlay */}
        <ImageWithOverlay report={report} />

        {/* Right column: score, grades, measurements */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Score */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-dim)",
                  letterSpacing: "0.08em",
                  fontFamily: "DM Mono, monospace",
                  marginBottom: 4,
                }}
              >
                REVERSE HOLO SCORE
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                }}
              >
                Worst axis: {Math.round(report.percentages.worstAxis)}%
              </div>
            </div>
            <div
              style={{
                fontSize: 48,
                fontWeight: 600,
                color: scoreColor,
                fontFamily: "DM Mono, monospace",
                lineHeight: 1,
              }}
            >
              {Math.round(score)}
            </div>
          </div>

          {/* Percentages grid */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--text-dim)",
                letterSpacing: "0.08em",
                fontFamily: "DM Mono, monospace",
                marginBottom: 14,
              }}
            >
              REVERSE HOLO PERCENTAGES
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <PercentRow
                label='LEFT / RIGHT'
                left={report.percentages.leftPct}
                right={report.percentages.rightPct}
                worse={report.percentages.lrWorse}
              />
              <PercentRow
                label='TOP / BOTTOM'
                left={report.percentages.topPct}
                right={report.percentages.bottomPct}
                worse={report.percentages.tbWorse}
              />
            </div>
          </div>

          {/* Measurements (mm) */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--text-dim)",
                letterSpacing: "0.08em",
                fontFamily: "DM Mono, monospace",
                marginBottom: 14,
              }}
            >
              REVERSE HOLO MEASUREMENTS (MM)
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gap: 12,
              }}
            >
              {(["left", "right", "top", "bottom"] as const).map((edge) => (
                <div key={edge}>
                  <div
                    style={{
                      fontSize: 9,
                      color: "var(--text-dim)",
                      letterSpacing: "0.06em",
                      fontFamily: "DM Mono, monospace",
                      marginBottom: 4,
                    }}
                  >
                    {edge.toUpperCase()}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {report.measurements[`${edge}Mm`].toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Predicted grades */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--text-dim)",
                letterSpacing: "0.08em",
                fontFamily: "DM Mono, monospace",
                marginBottom: 14,
              }}
            >
              REVERSE HOLO GRADES
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 10,
              }}
            >
              {(["psa", "bgs", "cgc", "sgc", "tag"] as const).map((co) => {
                const color = COMPANY_COLORS[co] ?? "var(--text-dim)";
                return (
                  <div key={co} style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 9,
                        color,
                        letterSpacing: "0.08em",
                        fontFamily: "DM Mono, monospace",
                        marginBottom: 6,
                        fontWeight: 600,
                      }}
                    >
                      {co.toUpperCase()}
                    </div>
                    <div
                      style={{
                        padding: "8px 4px",
                        borderRadius: 8,
                        background: `${color}15`,
                        border: `1px solid ${color}33`,
                        fontSize: 14,
                        fontWeight: 600,
                        color,
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      {report.grades[co]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={() => router.push("/centering/reports")}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          ← Back to reports
        </button>
        <button
          onClick={() => router.push("/centering")}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "1px solid var(--gold)",
            background: "var(--gold)",
            color: "#0D0E11",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          New analysis
        </button>
      </div>
    </div>
  );
}

// ─── Image with border overlay ───────────────────────────────────────────────

function ImageWithOverlay({
  report,
}: {
  report: {
    imageUrl: string | null;
    imageWidth: number;
    imageHeight: number;
    borders: BorderPositions;
  };
}) {
  const { imageUrl, imageWidth, imageHeight, borders } = report;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
        aspectRatio: `${imageWidth} / ${imageHeight}`,
      }}
    >
      {imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt='Centering report'
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              objectFit: "contain",
            }}
          />
          {/* SVG overlay — coords match imageWidth/imageHeight viewBox */}
          <svg
            viewBox={`0 0 ${imageWidth} ${imageHeight}`}
            preserveAspectRatio='none'
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          >
            {/* Outer border (yellow) */}
            <rect
              x={borders.outerLeft}
              y={borders.outerTop}
              width={borders.outerRight - borders.outerLeft}
              height={borders.outerBottom - borders.outerTop}
              fill='none'
              stroke='#C9A84C'
              strokeWidth={2}
              vectorEffect='non-scaling-stroke'
            />
            {/* Inner border (cyan) */}
            <rect
              x={borders.innerLeft}
              y={borders.innerTop}
              width={borders.innerRight - borders.innerLeft}
              height={borders.innerBottom - borders.innerTop}
              fill='none'
              stroke='#7BC4E2'
              strokeWidth={2}
              vectorEffect='non-scaling-stroke'
            />
          </svg>
        </>
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-dim)",
            fontSize: 13,
          }}
        >
          No image saved with this report
        </div>
      )}
    </div>
  );
}

// ─── Percent row ─────────────────────────────────────────────────────────────

function PercentRow({
  label,
  left,
  right,
  worse,
}: {
  label: string;
  left: number;
  right: number;
  worse: number;
}) {
  // Color the worse-axis value to flag uneven centering
  const worseColor =
    worse >= 70
      ? "#C94C4C"
      : worse >= 60
        ? "#F59E0B"
        : worse >= 55
          ? "#C9A84C"
          : "#3DAA6E";

  return (
    <div>
      <div
        style={{
          fontSize: 9,
          color: "var(--text-dim)",
          letterSpacing: "0.06em",
          fontFamily: "DM Mono, monospace",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: worseColor,
          fontFamily: "DM Mono, monospace",
          marginBottom: 2,
        }}
      >
        {Math.round(left)} / {Math.round(right)}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "var(--text-dim)",
          fontFamily: "DM Mono, monospace",
        }}
      >
        worst: {Math.round(worse)}%
      </div>
    </div>
  );
}
