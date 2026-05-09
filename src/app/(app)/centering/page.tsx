"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import api from "../../../lib/api";
import { createBrowserClient } from "@supabase/ssr";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BorderPositions {
  outerLeft: number;
  outerRight: number;
  outerTop: number;
  outerBottom: number;
  innerLeft: number;
  innerRight: number;
  innerTop: number;
  innerBottom: number;
}

interface CenteringResult {
  measurements: {
    leftMm: number;
    rightMm: number;
    topMm: number;
    bottomMm: number;
  };
  percentages: {
    leftPct: number;
    rightPct: number;
    topPct: number;
    bottomPct: number;
    lrWorse: number;
    tbWorse: number;
    worstAxis: number;
  };
  truepointScore: number;
  grades: { psa: string; bgs: string; cgc: string; sgc: string; tag: string };
}

interface SavedReport {
  id: string;
  label: string | null;
  side: string;
  imageUrl: string | null;
  truepointScore: number;
  percentages: CenteringResult["percentages"];
  measurements: CenteringResult["measurements"];
  grades: CenteringResult["grades"];
  createdAt: string;
}

type Side = "front" | "back";
type LineKey = keyof BorderPositions;
type PageTab = "analyze" | "reports";

// ─── Constants ────────────────────────────────────────────────────────────────

const COMPANY_COLORS: Record<string, string> = {
  psa: "#C9A84C",
  bgs: "#378ADD",
  cgc: "#3DAA6E",
  sgc: "#7F77DD",
  tag: "#D85A30",
};

const DEFAULT_BORDERS: BorderPositions = {
  outerLeft: 0.05,
  outerRight: 0.95,
  outerTop: 0.05,
  outerBottom: 0.95,
  innerLeft: 0.12,
  innerRight: 0.88,
  innerTop: 0.12,
  innerBottom: 0.88,
};

const BASE_CANVAS_W = 500;
const BASE_CANVAS_H = 700;
const MAX_ZOOM = 16;
const MIN_ZOOM = 0.5;
const clamp = (v: number, mn: number, mx: number) =>
  Math.max(mn, Math.min(mx, v));

// ─── Score helpers ────────────────────────────────────────────────────────────

const getScoreColor = (s: number) =>
  s >= 90 ? "#3DAA6E" : s >= 75 ? "#C9A84C" : s >= 60 ? "#E8A838" : "#C94C4C";
const getScoreLabel = (s: number) =>
  s >= 90 ? "Excellent" : s >= 75 ? "Good" : s >= 60 ? "Fair" : "Poor";

// ─── Best Practices Modal ─────────────────────────────────────────────────────

function BestPracticesModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 32,
          maxWidth: 560,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 24,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                color: "var(--gold)",
                letterSpacing: "0.1em",
                fontFamily: "DM Mono, monospace",
                marginBottom: 4,
              }}
            >
              BEST PRACTICES
            </div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              Getting the most accurate results
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-dim)",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Dimensions */}
          <div
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "16px 18px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 16 }}>📐</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                Recommended image dimensions
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {[
                {
                  label: "Minimum",
                  value: "600 × 840 px",
                  sub: "~150 DPI",
                  color: "#E8A838",
                },
                {
                  label: "Recommended",
                  value: "1200 × 1680 px",
                  sub: "~300 DPI",
                  color: "#C9A84C",
                },
                {
                  label: "Optimal",
                  value: "2400 × 3360 px",
                  sub: "~600 DPI",
                  color: "#3DAA6E",
                },
                {
                  label: "Professional",
                  value: "4800 × 6720 px",
                  sub: "~1200 DPI",
                  color: "#3DAA6E",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: "var(--surface)",
                    border: `1px solid ${item.color}33`,
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: item.color,
                      letterSpacing: "0.06em",
                      fontFamily: "DM Mono, monospace",
                      marginBottom: 4,
                    }}
                  >
                    {item.label.toUpperCase()}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {item.value}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-dim)",
                      marginTop: 2,
                    }}
                  >
                    {item.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* White background */}
          <div
            style={{
              background: "rgba(61,170,110,0.08)",
              border: "1px solid rgba(61,170,110,0.3)",
              borderRadius: 10,
              padding: "14px 18px",
              display: "flex",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>⬜</span>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#3DAA6E",
                  marginBottom: 4,
                }}
              >
                Use a plain white background
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                Cards scanned or photographed against a clean white surface
                produce the clearest contrast between card edge and background,
                making border line placement significantly easier and more
                precise. Avoid textured, colored, or patterned backgrounds.
              </div>
            </div>
          </div>
          {/* Tips */}
          <div
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "16px 18px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 16 }}>🔍</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                Scanning & photography tips
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {[
                {
                  icon: "✓",
                  color: "#3DAA6E",
                  text: "Use a flatbed scanner at 600+ DPI for best results",
                },
                {
                  icon: "✓",
                  color: "#3DAA6E",
                  text: "Keep the card perfectly flat — no curls or warps",
                },
                {
                  icon: "✓",
                  color: "#3DAA6E",
                  text: "Align the card straight — avoid diagonal angles",
                },
                {
                  icon: "✓",
                  color: "#3DAA6E",
                  text: "Ensure even lighting with no harsh shadows or glare",
                },
                {
                  icon: "✗",
                  color: "#C94C4C",
                  text: "Avoid phone photos at angles — perspective distorts borders",
                },
                {
                  icon: "✗",
                  color: "#C94C4C",
                  text: "Never scan cards in sleeves or top loaders",
                },
              ].map((tip) => (
                <div
                  key={tip.text}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    style={{ color: tip.color, fontWeight: 700, flexShrink: 0 }}
                  >
                    {tip.icon}
                  </span>
                  {tip.text}
                </div>
              ))}
            </div>
          </div>
          {/* Tools hint */}
          <div
            style={{
              background: "rgba(201,168,76,0.06)",
              border: "1px solid rgba(201,168,76,0.25)",
              borderRadius: 10,
              padding: "12px 16px",
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: "var(--gold)" }}>Pro tip:</strong> Use the
            line color pickers if your card&apos;s border makes it hard to see
            the gold or blue lines. Black & white mode helps with dark or foil
            cards. Zoom up to 16× for pixel-precise placement.
          </div>
        </div>
        <div
          style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              border: "none",
              background: "var(--gold)",
              color: "#0D0E11",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Report detail modal ──────────────────────────────────────────────────────

function ReportModal({
  report,
  onClose,
}: {
  report: SavedReport;
  onClose: () => void;
}) {
  const color = getScoreColor(report.truepointScore);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 32,
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 24,
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
              {report.side.toUpperCase()} ·{" "}
              {new Date(report.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              {report.label ?? "Untitled report"}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-dim)",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        {/* Image preview */}
        {report.imageUrl && (
          <div
            style={{
              marginBottom: 20,
              borderRadius: 10,
              overflow: "hidden",
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              display: "flex",
              justifyContent: "center",
              padding: 12,
            }}
          >
            <img
              src={report.imageUrl}
              alt={report.label ?? "Card scan"}
              style={{
                maxHeight: 240,
                maxWidth: "100%",
                objectFit: "contain",
                borderRadius: 6,
              }}
            />
          </div>
        )}

        {/* Score */}
        <div
          style={{
            textAlign: "center",
            background: `${color}12`,
            border: `1px solid ${color}33`,
            borderRadius: 12,
            padding: "20px 24px",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              letterSpacing: "0.1em",
              fontFamily: "DM Mono, monospace",
              marginBottom: 6,
            }}
          >
            TRUEPOINT SCORE
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color,
              fontFamily: "DM Mono, monospace",
              lineHeight: 1,
            }}
          >
            {report.truepointScore.toFixed(1)}
          </div>
          <div style={{ fontSize: 13, color, marginTop: 6, fontWeight: 500 }}>
            {getScoreLabel(report.truepointScore)}
          </div>
        </div>

        {/* Axes */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            marginBottom: 20,
          }}
        >
          {[
            {
              label: "Left / Right",
              worse: report.percentages.lrWorse,
              a: report.percentages.leftPct,
              b: report.percentages.rightPct,
              mmA: report.measurements.leftMm,
              mmB: report.measurements.rightMm,
              labelA: "Left",
              labelB: "Right",
            },
            {
              label: "Top / Bottom",
              worse: report.percentages.tbWorse,
              a: report.percentages.topPct,
              b: report.percentages.bottomPct,
              mmA: report.measurements.topMm,
              mmB: report.measurements.bottomMm,
              labelA: "Top",
              labelB: "Bottom",
            },
          ].map((axis) => {
            const axisColor =
              axis.worse <= 52
                ? "#3DAA6E"
                : axis.worse <= 55
                  ? "#C9A84C"
                  : axis.worse <= 60
                    ? "#E8A838"
                    : "#C94C4C";
            return (
              <div key={axis.label}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    marginBottom: 6,
                  }}
                >
                  <span>{axis.label}</span>
                  <span
                    style={{
                      color: axisColor,
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {axis.worse.toFixed(1)} / {(100 - axis.worse).toFixed(1)}
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: "var(--surface-2)",
                    borderRadius: 4,
                    overflow: "hidden",
                    position: "relative",
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: 0,
                      width: 1,
                      height: "100%",
                      background: "var(--border)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      height: "100%",
                      width: `${axis.a}%`,
                      background: axisColor,
                      borderRadius: 4,
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    fontFamily: "DM Mono, monospace",
                    color: "var(--text-dim)",
                  }}
                >
                  <span>
                    {axis.labelA}: {axis.a.toFixed(1)}% ({axis.mmA.toFixed(2)}
                    mm)
                  </span>
                  <span>
                    {axis.labelB}: {axis.b.toFixed(1)}% ({axis.mmB.toFixed(2)}
                    mm)
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Grades */}
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "8px 16px",
              borderBottom: "1px solid var(--border)",
              fontSize: 10,
              color: "var(--text-dim)",
              letterSpacing: "0.08em",
              fontFamily: "DM Mono, monospace",
            }}
          >
            GRADE PREDICTIONS
          </div>
          {Object.entries(report.grades).map(([co, grade], i, arr) => (
            <div
              key={co}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "9px 16px",
                borderBottom:
                  i < arr.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: COMPANY_COLORS[co],
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  {co.toUpperCase()}
                </span>
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: COMPANY_COLORS[co],
                  fontWeight: 500,
                }}
              >
                {grade}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Reports history tab ──────────────────────────────────────────────────────

function ReportsTab() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SavedReport | null>(null);

  useEffect(() => {
    api
      .get<{ data: SavedReport[] }>("/centering/reports")
      .then((res) => setReports(res.data.data ?? []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div
        style={{
          padding: 60,
          textAlign: "center",
          color: "var(--text-dim)",
          fontSize: 13,
        }}
      >
        Loading reports...
      </div>
    );
  if (!reports.length)
    return (
      <div style={{ padding: 80, textAlign: "center" }}>
        <div
          style={{ fontSize: 32, marginBottom: 16, color: "var(--text-dim)" }}
        >
          ⊹
        </div>
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
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Analyze a card and save a report — it will appear here.
        </div>
      </div>
    );

  return (
    <>
      {selected && (
        <ReportModal report={selected} onClose={() => setSelected(null)} />
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
        }}
      >
        {reports.map((report) => {
          const color = getScoreColor(report.truepointScore);
          return (
            <button
              key={report.id}
              onClick={() => setSelected(report)}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 20,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                transition: "border-color 0.15s, transform 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--gold-dim)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {/* Thumbnail */}
              {report.imageUrl && (
                <div
                  style={{
                    marginBottom: 12,
                    borderRadius: 7,
                    overflow: "hidden",
                    background: "var(--surface-2)",
                    height: 90,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid var(--border)",
                  }}
                >
                  <img
                    src={report.imageUrl}
                    alt=''
                    style={{
                      maxHeight: 90,
                      maxWidth: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 14,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      marginBottom: 3,
                    }}
                  >
                    {report.label ?? "Untitled"}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-dim)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {report.side.toUpperCase()} ·{" "}
                    {new Date(report.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color,
                    fontFamily: "DM Mono, monospace",
                    lineHeight: 1,
                  }}
                >
                  {report.truepointScore.toFixed(1)}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "L/R", worse: report.percentages.lrWorse },
                  { label: "T/B", worse: report.percentages.tbWorse },
                ].map((axis) => {
                  const axisColor =
                    axis.worse <= 52
                      ? "#3DAA6E"
                      : axis.worse <= 55
                        ? "#C9A84C"
                        : "#C94C4C";
                  return (
                    <div key={axis.label}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 10,
                          color: "var(--text-dim)",
                          marginBottom: 3,
                          fontFamily: "DM Mono, monospace",
                        }}
                      >
                        <span>{axis.label}</span>
                        <span style={{ color: axisColor }}>
                          {axis.worse.toFixed(1)} /{" "}
                          {(100 - axis.worse).toFixed(1)}
                        </span>
                      </div>
                      <div
                        style={{
                          height: 4,
                          background: "var(--surface-2)",
                          borderRadius: 2,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${axis.worse}%`,
                            background: axisColor,
                            borderRadius: 2,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                {Object.entries(report.grades).map(([co, grade]) => (
                  <span
                    key={co}
                    style={{
                      fontSize: 9,
                      padding: "2px 6px",
                      borderRadius: 10,
                      background: `${COMPANY_COLORS[co]}18`,
                      color: COMPANY_COLORS[co],
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {co.toUpperCase()} {grade}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ─── Axis tooltip ─────────────────────────────────────────────────────────────

function AxisBar({
  label,
  worse,
  a,
  b,
  mmA,
  mmB,
  labelA,
  labelB,
}: {
  label: string;
  worse: number;
  a: number;
  b: number;
  mmA: number;
  mmB: number;
  labelA: string;
  labelB: string;
}) {
  const [hovered, setHovered] = useState(false);
  const axisColor =
    worse <= 52
      ? "#3DAA6E"
      : worse <= 55
        ? "#C9A84C"
        : worse <= 60
          ? "#E8A838"
          : "#C94C4C";

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
          fontSize: 11,
          color: "var(--text-secondary)",
        }}
      >
        <span>{label}</span>
        <span
          style={{
            fontFamily: "DM Mono, monospace",
            color: axisColor,
            fontSize: 11,
          }}
        >
          {worse.toFixed(1)} / {(100 - worse).toFixed(1)}
        </span>
      </div>
      <div
        style={{
          height: 8,
          background: "var(--surface-2)",
          borderRadius: 4,
          overflow: "hidden",
          position: "relative",
          cursor: "help",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            width: 1,
            height: "100%",
            background: "var(--border)",
            zIndex: 1,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${a}%`,
            background: axisColor,
            borderRadius: 4,
            transition: "width 0.2s ease",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
          fontSize: 11,
          fontFamily: "DM Mono, monospace",
          color: "var(--text-dim)",
        }}
      >
        <span>{a.toFixed(1)}%</span>
        <span>{b.toFixed(1)}%</span>
      </div>

      {/* Tooltip */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1C1F27",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 14px",
            zIndex: 100,
            marginBottom: 8,
            whiteSpace: "nowrap",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              letterSpacing: "0.08em",
              fontFamily: "DM Mono, monospace",
              marginBottom: 8,
            }}
          >
            MEASUREMENTS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {[
              { name: labelA, pct: a, mm: mmA },
              { name: labelB, pct: b, mm: mmB },
            ].map((row) => (
              <div
                key={row.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 20,
                }}
              >
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {row.name} border
                </span>
                <div style={{ display: "flex", gap: 10 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {row.pct.toFixed(2)}%
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-dim)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {row.mm.toFixed(2)}mm
                  </span>
                </div>
              </div>
            ))}
          </div>
          {/* Tooltip arrow */}
          <div
            style={{
              position: "absolute",
              bottom: -5,
              left: "50%",
              width: 10,
              height: 10,
              background: "#1C1F27",
              border: "1px solid var(--border)",
              borderRadius: 2,
              transform: "translateX(-50%) rotate(45deg)",
              borderTop: "none",
              borderLeft: "none",
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Score display ─────────────────────────────────────────────────────────────

function ScoreDisplay({ result }: { result: CenteringResult }) {
  const { truepointScore, percentages, grades, measurements } = result;
  const color = getScoreColor(truepointScore);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          background: "var(--surface)",
          border: `1px solid ${color}55`,
          borderRadius: 12,
          padding: "20px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "var(--text-dim)",
            letterSpacing: "0.1em",
            fontFamily: "DM Mono, monospace",
            marginBottom: 8,
          }}
        >
          TRUEPOINT SCORE
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color,
            fontFamily: "DM Mono, monospace",
            lineHeight: 1,
          }}
        >
          {truepointScore.toFixed(1)}
        </div>
        <div style={{ fontSize: 13, color, marginTop: 8, fontWeight: 500 }}>
          {getScoreLabel(truepointScore)}
        </div>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "16px 20px",
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
          CENTERING AXES{" "}
          <span style={{ fontSize: 9, opacity: 0.6 }}>
            (hover for measurements)
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <AxisBar
            label='Left / Right'
            worse={percentages.lrWorse}
            a={percentages.leftPct}
            b={percentages.rightPct}
            mmA={measurements.leftMm}
            mmB={measurements.rightMm}
            labelA='Left'
            labelB='Right'
          />
          <AxisBar
            label='Top / Bottom'
            worse={percentages.tbWorse}
            a={percentages.topPct}
            b={percentages.bottomPct}
            mmA={measurements.topMm}
            mmB={measurements.bottomMm}
            labelA='Top'
            labelB='Bottom'
          />
        </div>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "10px 18px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface-2)",
            fontSize: 10,
            color: "var(--text-dim)",
            letterSpacing: "0.08em",
            fontFamily: "DM Mono, monospace",
          }}
        >
          CENTERING GRADE PREDICTIONS
        </div>
        {Object.entries(grades).map(([company, grade], i, arr) => (
          <div
            key={company}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "11px 18px",
              borderBottom:
                i < arr.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: COMPANY_COLORS[company],
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  fontFamily: "DM Mono, monospace",
                  letterSpacing: "0.06em",
                }}
              >
                {company.toUpperCase()}
              </span>
            </div>
            <span
              style={{
                fontSize: 13,
                color: COMPANY_COLORS[company],
                fontWeight: 500,
              }}
            >
              {grade}
            </span>
          </div>
        ))}
        <div
          style={{
            padding: "8px 18px",
            fontSize: 10,
            color: "var(--text-dim)",
            lineHeight: 1.5,
            background: "var(--surface-2)",
          }}
        >
          Centering only — corners, edges & surface affect the final grade
        </div>
      </div>
    </div>
  );
}

// ─── Image upload ─────────────────────────────────────────────────────────────

function ImageUpload({
  label,
  onUpload,
  canvasW,
  canvasH,
}: {
  label: string;
  onUpload: (url: string, w: number, h: number) => void;
  canvasW: number;
  canvasH: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hovering, setHovering] = useState(false);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      const img = new window.Image();
      img.onload = () => onUpload(url, img.naturalWidth, img.naturalHeight);
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setHovering(true);
      }}
      onDragLeave={() => setHovering(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHovering(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
      }}
      style={{
        border: `2px dashed ${hovering ? "var(--gold)" : "var(--border)"}`,
        borderRadius: 12,
        cursor: "pointer",
        background: hovering ? "rgba(201,168,76,0.04)" : "var(--surface)",
        transition: "border-color 0.15s, background 0.15s",
        width: canvasW,
        height: canvasH,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        boxSizing: "border-box",
      }}
    >
      <input
        ref={inputRef}
        type='file'
        accept='image/jpeg,image/png,image/webp,image/tiff'
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: "50%",
          border: `1px solid ${hovering ? "var(--gold)" : "var(--border)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          color: hovering ? "var(--gold)" : "var(--text-dim)",
          transition: "all 0.15s",
        }}
      >
        ⊹
      </div>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: hovering ? "var(--gold)" : "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Click or drag & drop
        </div>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
          JPG · PNG · WebP · TIFF
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: "var(--gold)",
            fontFamily: "DM Mono, monospace",
          }}
        >
          Recommended: 1200×1680px @ 300 DPI
        </div>
      </div>
    </div>
  );
}

// ─── Canvas ────────────────────────────────────────────────────────────────────

function CenteringCanvas({
  imageUrl,
  borders,
  onChange,
  zoom,
  panX,
  panY,
  onZoomChange,
  onPanChange,
  outerColor,
  innerColor,
  rotation,
  grayscale,
  canvasW,
  canvasH,
}: {
  imageUrl: string;
  borders: BorderPositions;
  onChange: (b: BorderPositions) => void;
  zoom: number;
  panX: number;
  panY: number;
  onZoomChange: (z: number) => void;
  onPanChange: (x: number, y: number) => void;
  outerColor: string;
  innerColor: string;
  rotation: number;
  grayscale: boolean;
  canvasW: number;
  canvasH: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingLine = useRef<LineKey | null>(null);
  const isPanning = useRef(false);
  const lastPanPos = useRef({ x: 0, y: 0 });
  const spaceHeld = useRef(false);
  const naturalDims = useRef({ w: 1, h: 1 });

  const DEG = (rotation * Math.PI) / 180;

  const getImageRect = useCallback(
    (nw: number, nh: number) => {
      const imgAspect = nw / nh;
      const canvasAspect = canvasW / canvasH;
      let baseW: number, baseH: number;
      if (imgAspect > canvasAspect) {
        baseW = canvasW;
        baseH = canvasW / imgAspect;
      } else {
        baseH = canvasH;
        baseW = canvasH * imgAspect;
      }
      const drawW = baseW * zoom;
      const drawH = baseH * zoom;
      const offsetX = (canvasW - baseW) / 2 - (drawW - baseW) / 2 + panX;
      const offsetY = (canvasH - baseH) / 2 - (drawH - baseH) / 2 + panY;
      return { drawW, drawH, offsetX, offsetY };
    },
    [zoom, panX, panY, canvasW, canvasH],
  );

  useEffect(() => {
    const img = new window.Image();
    img.src = imageUrl;
    img.onload = () => {
      naturalDims.current = { w: img.naturalWidth, h: img.naturalHeight };
    };
  }, [imageUrl]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        spaceHeld.current = true;
        if (canvasRef.current) canvasRef.current.style.cursor = "grab";
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeld.current = false;
        if (canvasRef.current) canvasRef.current.style.cursor = "default";
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new window.Image();
    img.src = imageUrl;
    img.onload = () => {
      ctx.clearRect(0, 0, canvasW, canvasH);
      ctx.fillStyle = "#0D0E11";
      ctx.fillRect(0, 0, canvasW, canvasH);

      const { drawW, drawH, offsetX, offsetY } = getImageRect(
        img.naturalWidth,
        img.naturalHeight,
      );

      ctx.save();
      ctx.rect(0, 0, canvasW, canvasH);
      ctx.clip();

      // Apply rotation around image center
      if (rotation !== 0) {
        const cx = offsetX + drawW / 2;
        const cy = offsetY + drawH / 2;
        ctx.translate(cx, cy);
        ctx.rotate(DEG);
        ctx.translate(-cx, -cy);
      }

      if (grayscale) {
        ctx.filter = "grayscale(100%) contrast(1.1)";
      }
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      ctx.filter = "none";
      ctx.restore();

      // Draw lines on top (no rotation — lines are in canvas space)
      ctx.save();
      ctx.rect(0, 0, canvasW, canvasH);
      ctx.clip();

      const b = borders;
      const ol = offsetX + b.outerLeft * drawW;
      const or2 = offsetX + b.outerRight * drawW;
      const ot = offsetY + b.outerTop * drawH;
      const ob = offsetY + b.outerBottom * drawH;
      const il = offsetX + b.innerLeft * drawW;
      const ir = offsetX + b.innerRight * drawW;
      const it = offsetY + b.innerTop * drawH;
      const ib = offsetY + b.innerBottom * drawH;

      const hr = Math.max(4, 6 / Math.sqrt(zoom));
      const lw = Math.max(1, 1.5 / Math.sqrt(zoom));

      const drawLine = (
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        color: string,
        label: string,
        isV: boolean,
      ) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(mx, my, hr, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(mx, my, hr * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.font = `bold ${Math.max(8, 9 / Math.sqrt(zoom))}px DM Mono, monospace`;
        ctx.textAlign = isV ? "left" : "center";
        ctx.fillText(
          label,
          mx + (isV ? hr + 2 : 0),
          my + (isV ? 3 : -(hr + 2)),
        );
      };

      drawLine(ol, 0, ol, canvasH, outerColor, "OL", true);
      drawLine(or2, 0, or2, canvasH, outerColor, "OR", true);
      drawLine(0, ot, canvasW, ot, outerColor, "OT", false);
      drawLine(0, ob, canvasW, ob, outerColor, "OB", false);
      drawLine(il, 0, il, canvasH, innerColor, "IL", true);
      drawLine(ir, 0, ir, canvasH, innerColor, "IR", true);
      drawLine(0, it, canvasW, it, innerColor, "IT", false);
      drawLine(0, ib, canvasW, ib, innerColor, "IB", false);

      // Percentage labels
      const fs = Math.max(8, 10 / Math.sqrt(zoom));
      ctx.font = `${fs}px DM Mono, monospace`;
      const drawPct = (text: string, x: number, y: number) => {
        ctx.textAlign = "center";
        const w = ctx.measureText(text).width;
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(x - w / 2 - 3, y - fs, w + 6, fs + 4);
        ctx.fillStyle = outerColor;
        ctx.fillText(text, x, y);
      };
      const lw2 = (((il - ol) / drawW) * 100).toFixed(1);
      const rw2 = (((or2 - ir) / drawW) * 100).toFixed(1);
      const tw = (((it - ot) / drawH) * 100).toFixed(1);
      const bw = (((ob - ib) / drawH) * 100).toFixed(1);
      const midY = offsetY + drawH / 2;
      const midX = offsetX + drawW / 2;
      if ((ol + il) / 2 > 0) drawPct(`${lw2}%`, (ol + il) / 2, midY);
      if ((ir + or2) / 2 < canvasW) drawPct(`${rw2}%`, (ir + or2) / 2, midY);
      if ((ot + it) / 2 > 0) drawPct(`${tw}%`, midX, (ot + it) / 2 + fs);
      if ((ib + ob) / 2 < canvasH) drawPct(`${bw}%`, midX, (ib + ob) / 2 + fs);

      ctx.restore();

      // HUD
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(8, 8, 72, 20);
      ctx.fillStyle = "rgba(201,168,76,0.9)";
      ctx.font = "10px DM Mono, monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${zoom.toFixed(1)}×  ${rotation.toFixed(1)}°`, 13, 22);
    };
  }, [
    imageUrl,
    borders,
    zoom,
    panX,
    panY,
    outerColor,
    innerColor,
    rotation,
    grayscale,
    canvasW,
    canvasH,
    getImageRect,
    DEG,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Un-rotate a canvas point to image space
  const unrotatePoint = (
    x: number,
    y: number,
    dims: { w: number; h: number },
  ) => {
    const { drawW, drawH, offsetX, offsetY } = getImageRect(dims.w, dims.h);
    const cx = offsetX + drawW / 2;
    const cy = offsetY + drawH / 2;
    const dx = x - cx;
    const dy = y - cy;
    const cos = Math.cos(-DEG);
    const sin = Math.sin(-DEG);
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  };

  const getHitLine = useCallback(
    (x: number, y: number): LineKey | null => {
      const THRESHOLD = Math.max(8, 12 / Math.sqrt(zoom));
      const { drawW, drawH, offsetX, offsetY } = getImageRect(
        naturalDims.current.w,
        naturalDims.current.h,
      );
      const p =
        rotation !== 0 ? unrotatePoint(x, y, naturalDims.current) : { x, y };
      const rx = p.x;
      const ry = p.y;
      const b = borders;
      const vLines: [LineKey, number][] = [
        ["outerLeft", offsetX + b.outerLeft * drawW],
        ["outerRight", offsetX + b.outerRight * drawW],
        ["innerLeft", offsetX + b.innerLeft * drawW],
        ["innerRight", offsetX + b.innerRight * drawW],
      ];
      const hLines: [LineKey, number][] = [
        ["outerTop", offsetY + b.outerTop * drawH],
        ["outerBottom", offsetY + b.outerBottom * drawH],
        ["innerTop", offsetY + b.innerTop * drawH],
        ["innerBottom", offsetY + b.innerBottom * drawH],
      ];
      for (const [key, val] of vLines)
        if (Math.abs(rx - val) < THRESHOLD) return key;
      for (const [key, val] of hLines)
        if (Math.abs(ry - val) < THRESHOLD) return key;
      return null;
    },
    [borders, zoom, getImageRect, rotation, DEG],
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (e.button === 2 || spaceHeld.current) {
      isPanning.current = true;
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
      e.preventDefault();
      return;
    }
    const hit = getHitLine(x, y);
    if (hit) {
      draggingLine.current = hit;
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (isPanning.current) {
      const dx = e.clientX - lastPanPos.current.x;
      const dy = e.clientY - lastPanPos.current.y;
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      onPanChange(panX + dx, panY + dy);
      return;
    }
    if (spaceHeld.current) {
      canvas.style.cursor = "grab";
      return;
    }
    if (draggingLine.current) {
      canvas.style.cursor =
        draggingLine.current.includes("Left") ||
        draggingLine.current.includes("Right")
          ? "ew-resize"
          : "ns-resize";
      const { drawW, drawH, offsetX, offsetY } = getImageRect(
        naturalDims.current.w,
        naturalDims.current.h,
      );
      const p =
        rotation !== 0 ? unrotatePoint(x, y, naturalDims.current) : { x, y };
      const key = draggingLine.current;
      const isV = key.includes("Left") || key.includes("Right");
      const raw = isV ? (p.x - offsetX) / drawW : (p.y - offsetY) / drawH;
      const clamped = clamp(raw, 0.001, 0.999);
      const next = { ...borders, [key]: clamped };
      if (
        next.outerLeft >= next.innerLeft ||
        next.innerRight >= next.outerRight ||
        next.outerTop >= next.innerTop ||
        next.innerBottom >= next.outerBottom
      )
        return;
      onChange(next);
      return;
    }
    const hit = getHitLine(x, y);
    canvas.style.cursor = hit
      ? hit.includes("Left") || hit.includes("Right")
        ? "ew-resize"
        : "ns-resize"
      : "default";
  };

  const handleMouseUp = () => {
    draggingLine.current = null;
    isPanning.current = false;
    if (canvasRef.current)
      canvasRef.current.style.cursor = spaceHeld.current ? "grab" : "default";
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newZoom = clamp(zoom * factor, MIN_ZOOM, MAX_ZOOM);
    const scale = newZoom / zoom;
    onZoomChange(newZoom);
    onPanChange(mx - scale * (mx - panX), my - scale * (my - panY));
  };

  return (
    <canvas
      ref={canvasRef}
      width={canvasW}
      height={canvasH}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        display: "block",
        borderRadius: 10,
        userSelect: "none",
        border: "1px solid var(--border)",
      }}
    />
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function Toolbar({
  zoom,
  onZoom,
  onPanReset,
  rotation,
  onRotation,
  grayscale,
  onGrayscale,
  outerColor,
  onOuterColor,
  innerColor,
  onInnerColor,
  canvasScale,
  onCanvasScale,
}: {
  zoom: number;
  onZoom: (z: number) => void;
  onPanReset: () => void;
  rotation: number;
  onRotation: (r: number) => void;
  grayscale: boolean;
  onGrayscale: (v: boolean) => void;
  outerColor: string;
  onOuterColor: (c: string) => void;
  innerColor: string;
  onInnerColor: (c: string) => void;
  canvasScale: number;
  onCanvasScale: (s: number) => void;
}) {
  const presets = [1, 2, 4, 8, 12, 16];
  const btn = {
    border: "1px solid var(--border)",
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "inherit",
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
        marginBottom: 10,
      }}
    >
      {/* Zoom */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "4px 8px",
        }}
      >
        <button
          onClick={() => onZoom(clamp(zoom / 1.5, MIN_ZOOM, MAX_ZOOM))}
          style={{ ...btn, width: 26, height: 26, fontSize: 16 }}
        >
          −
        </button>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-secondary)",
            fontFamily: "DM Mono, monospace",
            minWidth: 36,
            textAlign: "center",
          }}
        >
          {zoom.toFixed(1)}×
        </span>
        <button
          onClick={() => onZoom(clamp(zoom * 1.5, MIN_ZOOM, MAX_ZOOM))}
          style={{ ...btn, width: 26, height: 26, fontSize: 16 }}
        >
          +
        </button>
        <div
          style={{
            width: 1,
            height: 18,
            background: "var(--border)",
            margin: "0 2px",
          }}
        />
        {presets.map((s) => (
          <button
            key={s}
            onClick={() => {
              onZoom(s);
              onPanReset();
            }}
            style={{
              ...btn,
              padding: "2px 6px",
              height: 22,
              fontSize: 10,
              fontFamily: "DM Mono, monospace",
              borderColor:
                Math.abs(zoom - s) < 0.1 ? "var(--gold)" : "var(--border)",
              color:
                Math.abs(zoom - s) < 0.1 ? "var(--gold)" : "var(--text-dim)",
              background:
                Math.abs(zoom - s) < 0.1
                  ? "rgba(201,168,76,0.1)"
                  : "transparent",
            }}
          >
            {s}×
          </button>
        ))}
        <button
          onClick={onPanReset}
          style={{
            ...btn,
            padding: "2px 8px",
            height: 22,
            fontSize: 10,
            fontFamily: "DM Mono, monospace",
          }}
        >
          FIT
        </button>
      </div>

      {/* Rotation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "4px 8px",
        }}
      >
        <button
          onClick={() => onRotation(+(rotation - 0.1).toFixed(1))}
          style={{ ...btn, width: 24, height: 24, fontSize: 13 }}
        >
          ↺
        </button>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-secondary)",
            fontFamily: "DM Mono, monospace",
            minWidth: 40,
            textAlign: "center",
          }}
        >
          {rotation.toFixed(1)}°
        </span>
        <button
          onClick={() => onRotation(+(rotation + 0.1).toFixed(1))}
          style={{ ...btn, width: 24, height: 24, fontSize: 13 }}
        >
          ↻
        </button>
        {rotation !== 0 && (
          <button
            onClick={() => onRotation(0)}
            style={{
              ...btn,
              padding: "2px 6px",
              fontSize: 10,
              fontFamily: "DM Mono, monospace",
            }}
          >
            0°
          </button>
        )}
      </div>

      {/* B&W */}
      <button
        onClick={() => onGrayscale(!grayscale)}
        style={{
          ...btn,
          padding: "5px 12px",
          fontSize: 12,
          height: 34,
          background: grayscale ? "rgba(201,168,76,0.12)" : "var(--surface)",
          borderColor: grayscale ? "var(--gold)" : "var(--border)",
          color: grayscale ? "var(--gold)" : "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <span style={{ fontSize: 14 }}>◑</span> B&W
      </button>

      {/* Line color pickers */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "4px 10px",
        }}
      >
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Lines:</span>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              background: outerColor,
              border: "1px solid rgba(255,255,255,0.2)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <input
              type='color'
              value={outerColor}
              onChange={(e) => onOuterColor(e.target.value)}
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0,
                cursor: "pointer",
                width: "100%",
                height: "100%",
              }}
            />
          </div>
          <span style={{ fontSize: 10, color: "var(--text-dim)" }}>outer</span>
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              background: innerColor,
              border: "1px solid rgba(255,255,255,0.2)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <input
              type='color'
              value={innerColor}
              onChange={(e) => onInnerColor(e.target.value)}
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0,
                cursor: "pointer",
                width: "100%",
                height: "100%",
              }}
            />
          </div>
          <span style={{ fontSize: 10, color: "var(--text-dim)" }}>inner</span>
        </label>
      </div>

      {/* Canvas scale */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "4px 10px",
        }}
      >
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Size:</span>
        <input
          type='range'
          min={0.5}
          max={1.4}
          step={0.05}
          value={canvasScale}
          onChange={(e) => onCanvasScale(+e.target.value)}
          style={{ width: 72, accentColor: "var(--gold)", cursor: "pointer" }}
        />
        <span
          style={{
            fontSize: 10,
            color: "var(--text-secondary)",
            fontFamily: "DM Mono, monospace",
            minWidth: 28,
          }}
        >
          {Math.round(canvasScale * 100)}%
        </span>
      </div>
    </div>
  );
}

// ─── Label prompt ─────────────────────────────────────────────────────────────

function LabelPrompt({
  onSave,
  onCancel,
  saving,
}: {
  onSave: (label: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [label, setLabel] = useState("");
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 28,
          maxWidth: 400,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          Name this report
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            marginBottom: 18,
            lineHeight: 1.6,
          }}
        >
          Give this centering report a label so you can identify it later. You
          can include the card name, set, or condition.
        </div>
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave(label);
            if (e.key === "Escape") onCancel();
          }}
          placeholder='e.g. Charizard ex SIR sv3 Front'
          style={{
            width: "100%",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            color: "var(--text-primary)",
            fontFamily: "inherit",
            outline: "none",
            boxSizing: "border-box",
            marginBottom: 16,
          }}
        />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "8px 18px",
              borderRadius: 7,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(label)}
            disabled={saving}
            style={{
              padding: "8px 18px",
              borderRadius: 7,
              border: "none",
              background: "var(--gold)",
              color: "#0D0E11",
              fontSize: 12,
              fontWeight: 500,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving..." : "Save report"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CenteringPage() {
  const [pageTab, setPageTab] = useState<PageTab>("analyze");
  const [activeSide, setActiveSide] = useState<Side>("front");
  const [showTips, setShowTips] = useState(false);
  const [showLabelPrompt, setShowLabelPrompt] = useState(false);

  // Tool settings
  const [outerColor, setOuterColor] = useState("#C9A84C");
  const [innerColor, setInnerColor] = useState("#378ADD");
  const [grayscale, setGrayscale] = useState(false);
  const [canvasScale, setCanvasScale] = useState(0.85);

  const canvasW = Math.round(BASE_CANVAS_W * canvasScale);
  const canvasH = Math.round(BASE_CANVAS_H * canvasScale);

  // Front state
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [frontDims, setFrontDims] = useState({ w: 0, h: 0 });
  const [frontBorders, setFrontBorders] =
    useState<BorderPositions>(DEFAULT_BORDERS);
  const [frontResult, setFrontResult] = useState<CenteringResult | null>(null);
  const [frontZoom, setFrontZoom] = useState(1);
  const [frontPanX, setFrontPanX] = useState(0);
  const [frontPanY, setFrontPanY] = useState(0);
  const [frontRotation, setFrontRotation] = useState(0);

  // Back state
  const [backImage, setBackImage] = useState<string | null>(null);
  const [backDims, setBackDims] = useState({ w: 0, h: 0 });
  const [backBorders, setBackBorders] =
    useState<BorderPositions>(DEFAULT_BORDERS);
  const [backResult, setBackResult] = useState<CenteringResult | null>(null);
  const [backZoom, setBackZoom] = useState(1);
  const [backPanX, setBackPanX] = useState(0);
  const [backPanY, setBackPanY] = useState(0);
  const [backRotation, setBackRotation] = useState(0);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isFront = activeSide === "front";
  const currentImage = isFront ? frontImage : backImage;
  const currentBorders = isFront ? frontBorders : backBorders;
  const currentResult = isFront ? frontResult : backResult;
  const currentDims = isFront ? frontDims : backDims;
  const currentZoom = isFront ? frontZoom : backZoom;
  const currentPanX = isFront ? frontPanX : backPanX;
  const currentPanY = isFront ? frontPanY : backPanY;
  const currentRotation = isFront ? frontRotation : backRotation;

  const setBorders = isFront ? setFrontBorders : setBackBorders;
  const setZoom = isFront ? setFrontZoom : setBackZoom;
  const setRotation = isFront ? setFrontRotation : setBackRotation;

  const setPan = useCallback(
    (x: number, y: number) => {
      if (isFront) {
        setFrontPanX(x);
        setFrontPanY(y);
      } else {
        setBackPanX(x);
        setBackPanY(y);
      }
    },
    [isFront],
  );

  const resetView = useCallback(() => {
    setZoom(1);
    setPan(0, 0);
  }, [setZoom, setPan]);

  const analyze = useCallback(
    async (
      borders: BorderPositions,
      dims: { w: number; h: number },
      side: Side,
    ) => {
      if (!dims.w) return;
      try {
        const res = await api.post<{ data: CenteringResult }>(
          "/centering/analyze",
          {
            borders,
            imageWidth: dims.w,
            imageHeight: dims.h,
            dpi: 300,
            rotation: 0,
            side,
          },
        );
        if (side === "front") setFrontResult(res.data.data);
        else setBackResult(res.data.data);
      } catch (err) {
        console.error("[Centering] Analysis failed:", err);
      }
    },
    [],
  );

  useEffect(() => {
    if (!frontImage) return;
    const t = setTimeout(() => analyze(frontBorders, frontDims, "front"), 200);
    return () => clearTimeout(t);
  }, [frontBorders, frontDims, frontImage, analyze]);

  useEffect(() => {
    if (!backImage) return;
    const t = setTimeout(() => analyze(backBorders, backDims, "back"), 200);
    return () => clearTimeout(t);
  }, [backBorders, backDims, backImage, analyze]);

  const handleUpload = (side: Side, url: string, w: number, h: number) => {
    if (side === "front") {
      setFrontImage(url);
      setFrontDims({ w, h });
      setFrontBorders(DEFAULT_BORDERS);
      setFrontZoom(1);
      setFrontPanX(0);
      setFrontPanY(0);
      setFrontRotation(0);
      setFrontResult(null);
    } else {
      setBackImage(url);
      setBackDims({ w, h });
      setBackBorders(DEFAULT_BORDERS);
      setBackZoom(1);
      setBackPanX(0);
      setBackPanY(0);
      setBackRotation(0);
      setBackResult(null);
    }
  };

  const handleRemove = (side: Side) => {
    if (side === "front") {
      setFrontImage(null);
      setFrontResult(null);
      setFrontZoom(1);
      setFrontPanX(0);
      setFrontPanY(0);
    } else {
      setBackImage(null);
      setBackResult(null);
      setBackZoom(1);
      setBackPanX(0);
      setBackPanY(0);
    }
  };

  const handleSaveWithLabel = async (label: string) => {
    if (!currentDims.w || !currentResult || !currentImage) return;
    setSaving(true);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload image to Supabase storage
      let imageUrl: string | null = null;
      try {
        const fetchRes = await fetch(currentImage);
        const blob = await fetchRes.blob();
        const ext = blob.type.includes("png") ? "png" : "jpg";
        const path = `${user.id}/${Date.now()}-${activeSide}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("Centering Images")
          .upload(path, blob, { contentType: blob.type, upsert: false });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("Centering Images")
            .getPublicUrl(path);
          imageUrl = urlData.publicUrl;
        } else {
          console.warn(
            "[Centering] Image upload failed, saving without image:",
            uploadError.message,
          );
        }
      } catch (imgErr) {
        console.warn(
          "[Centering] Image upload error, saving without image:",
          imgErr,
        );
      }

      await api.post("/centering/reports", {
        borders: currentBorders,
        imageWidth: currentDims.w,
        imageHeight: currentDims.h,
        dpi: 300,
        rotation: currentRotation,
        side: activeSide,
        label: label || null,
        imageUrl,
      });

      setShowLabelPrompt(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("[Centering] Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {showTips && <BestPracticesModal onClose={() => setShowTips(false)} />}
      {showLabelPrompt && (
        <LabelPrompt
          onSave={handleSaveWithLabel}
          onCancel={() => setShowLabelPrompt(false)}
          saving={saving}
        />
      )}

      <div style={{ padding: "28px 36px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: "var(--gold)",
                letterSpacing: "0.1em",
                fontFamily: "DM Mono, monospace",
                marginBottom: 6,
              }}
            >
              CENTERING TOOL
            </div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 500,
                color: "var(--text-primary)",
                marginBottom: 4,
              }}
            >
              TruePoint Score
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Upload card scans · drag border lines · get your score
            </p>
          </div>
          <button
            onClick={() => setShowTips(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-secondary)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--gold-dim)";
              e.currentTarget.style.color = "var(--gold)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <span>💡</span> Image guide & best practices
          </button>
        </div>

        {/* Page tabs */}
        <div
          style={{
            display: "flex",
            gap: 0,
            borderBottom: "1px solid var(--border)",
            marginBottom: 24,
          }}
        >
          {[
            { key: "analyze", label: "Analyze" },
            { key: "reports", label: "Saved Reports" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPageTab(tab.key as PageTab)}
              style={{
                padding: "10px 24px",
                border: "none",
                borderBottom: `2px solid ${pageTab === tab.key ? "var(--gold)" : "transparent"}`,
                background: "transparent",
                color:
                  pageTab === tab.key
                    ? "var(--text-primary)"
                    : "var(--text-dim)",
                fontSize: 13,
                fontWeight: pageTab === tab.key ? 500 : 400,
                cursor: "pointer",
                fontFamily: "inherit",
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {pageTab === "reports" ? (
          <ReportsTab />
        ) : (
          <>
            {/* Legend */}
            <div
              style={{
                display: "flex",
                gap: 16,
                marginBottom: 16,
                flexWrap: "wrap",
                alignItems: "center",
                fontSize: 11,
                color: "var(--text-dim)",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 18,
                    height: 2,
                    background: outerColor,
                    display: "inline-block",
                    borderRadius: 1,
                  }}
                />
                Outer border
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 18,
                    height: 2,
                    background: innerColor,
                    display: "inline-block",
                    borderRadius: 1,
                  }}
                />
                Inner border
              </span>
              <span>
                🖱 Scroll = zoom · Right-click drag or Space+drag = pan · Arrow
                keys +/− for 0.1° rotation
              </span>
            </div>

            {/* Toolbar */}
            <Toolbar
              zoom={currentZoom}
              onZoom={setZoom}
              onPanReset={resetView}
              rotation={currentRotation}
              onRotation={setRotation}
              grayscale={grayscale}
              onGrayscale={setGrayscale}
              outerColor={outerColor}
              onOuterColor={setOuterColor}
              innerColor={innerColor}
              onInnerColor={setInnerColor}
              canvasScale={canvasScale}
              onCanvasScale={setCanvasScale}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: 28,
                alignItems: "start",
              }}
            >
              {/* Canvas column */}
              <div>
                {/* Side tabs */}
                <div
                  style={{
                    display: "flex",
                    gap: 0,
                    borderBottom: "1px solid var(--border)",
                    marginBottom: 14,
                    width: canvasW,
                  }}
                >
                  {(["front", "back"] as Side[]).map((side) => {
                    const r = side === "front" ? frontResult : backResult;
                    return (
                      <button
                        key={side}
                        onClick={() => setActiveSide(side)}
                        style={{
                          padding: "8px 18px",
                          border: "none",
                          borderBottom: `2px solid ${activeSide === side ? "var(--gold)" : "transparent"}`,
                          background: "transparent",
                          color:
                            activeSide === side
                              ? "var(--text-primary)"
                              : "var(--text-dim)",
                          fontSize: 13,
                          fontWeight: activeSide === side ? 500 : 400,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          marginBottom: -1,
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        {side.charAt(0).toUpperCase() + side.slice(1)}
                        {r && (
                          <span
                            style={{
                              fontSize: 10,
                              padding: "1px 6px",
                              borderRadius: 10,
                              background: `${getScoreColor(r.truepointScore)}20`,
                              color: getScoreColor(r.truepointScore),
                              fontFamily: "DM Mono, monospace",
                            }}
                          >
                            {r.truepointScore.toFixed(1)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {currentImage ? (
                  <>
                    <CenteringCanvas
                      imageUrl={currentImage}
                      borders={currentBorders}
                      onChange={setBorders}
                      zoom={currentZoom}
                      panX={currentPanX}
                      panY={currentPanY}
                      onZoomChange={setZoom}
                      onPanChange={setPan}
                      outerColor={outerColor}
                      innerColor={innerColor}
                      rotation={currentRotation}
                      grayscale={grayscale}
                      canvasW={canvasW}
                      canvasH={canvasH}
                    />
                    {/* Controls row */}
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 10,
                        alignItems: "center",
                        width: canvasW,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        onClick={() => setBorders(DEFAULT_BORDERS)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          background: "transparent",
                          color: "var(--text-secondary)",
                          fontSize: 12,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Reset lines
                      </button>
                      <button
                        onClick={() => handleRemove(activeSide)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          background: "transparent",
                          color: "var(--text-secondary)",
                          fontSize: 12,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Change image
                      </button>
                      <button
                        onClick={() => {
                          if (currentResult) setShowLabelPrompt(true);
                        }}
                        disabled={!currentResult}
                        style={{
                          padding: "6px 16px",
                          borderRadius: 6,
                          border: "none",
                          background: saved ? "#3DAA6E" : "var(--gold)",
                          color: "#0D0E11",
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: !currentResult ? "not-allowed" : "pointer",
                          fontFamily: "inherit",
                          opacity: !currentResult ? 0.5 : 1,
                          marginLeft: "auto",
                          transition: "background 0.2s ease",
                        }}
                      >
                        {saved ? "✓ Saved" : "Save report"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageUpload
                      label={`Upload ${activeSide} of card`}
                      onUpload={(url, w, h) =>
                        handleUpload(activeSide, url, w, h)
                      }
                      canvasW={canvasW}
                      canvasH={canvasH}
                    />
                    <div
                      style={{
                        marginTop: 12,
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        padding: "12px 16px",
                        width: canvasW,
                        boxSizing: "border-box",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          marginBottom: 8,
                        }}
                      >
                        How to use
                      </div>
                      {[
                        "1. Upload a front scan against a white background",
                        "2. Drag the outer lines to the card edges",
                        "3. Drag the inner lines to the artwork border",
                        "4. Zoom up to 16× for precise placement",
                        "5. Use rotation to straighten a slightly angled scan",
                        "6. Repeat for the back — save and label your report",
                      ].map((s) => (
                        <div
                          key={s}
                          style={{
                            fontSize: 11,
                            color: "var(--text-secondary)",
                            padding: "2px 0",
                            lineHeight: 1.5,
                          }}
                        >
                          {s}
                        </div>
                      ))}
                      <button
                        onClick={() => setShowTips(true)}
                        style={{
                          marginTop: 8,
                          fontSize: 11,
                          color: "var(--gold)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          padding: 0,
                        }}
                      >
                        View image guidelines →
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Score panel — always right */}
              <div style={{ maxWidth: 360, minWidth: 300 }}>
                {currentResult ? (
                  <ScoreDisplay result={currentResult} />
                ) : (
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "48px 24px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 14px",
                        fontSize: 22,
                        color: "var(--text-dim)",
                      }}
                    >
                      ⊹
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        marginBottom: 6,
                      }}
                    >
                      No score yet
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        lineHeight: 1.7,
                      }}
                    >
                      Upload a card scan and position the border lines
                    </div>
                  </div>
                )}
                {frontResult && backResult && (
                  <div
                    style={{
                      marginTop: 14,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "16px 20px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-dim)",
                        letterSpacing: "0.08em",
                        fontFamily: "DM Mono, monospace",
                        marginBottom: 12,
                      }}
                    >
                      COMBINED SUMMARY
                    </div>
                    {[
                      { label: "Front", r: frontResult },
                      { label: "Back", r: backResult },
                    ].map(({ label, r }) => (
                      <div
                        key={label}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 0",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {label}
                        </span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--text-dim)",
                              fontFamily: "DM Mono, monospace",
                            }}
                          >
                            L/R {r.percentages.lrWorse.toFixed(1)} · T/B{" "}
                            {r.percentages.tbWorse.toFixed(1)}
                          </span>
                          <span
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              color: getScoreColor(r.truepointScore),
                              fontFamily: "DM Mono, monospace",
                            }}
                          >
                            {r.truepointScore.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div
                      style={{
                        paddingTop: 12,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{ fontSize: 12, color: "var(--text-secondary)" }}
                      >
                        Avg TruePoint Score
                      </span>
                      <span
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          fontFamily: "DM Mono, monospace",
                          color: getScoreColor(
                            (frontResult.truepointScore +
                              backResult.truepointScore) /
                              2,
                          ),
                        }}
                      >
                        {(
                          (frontResult.truepointScore +
                            backResult.truepointScore) /
                          2
                        ).toFixed(1)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
