/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import api from "../../../../lib/api";
import { usePlan } from "@/context/PlanContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GradePrediction {
  grade: number;
  label: string;
  isBlackLabel?: boolean;
  isPristine?: boolean;
}

interface SavedReport {
  id: string;
  card_name: string | null;
  set_name: string | null;
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  predictions: any;
  confidence: number;
  recommendation: string;
  recommendation_reason: string;
  notes: string | null;
  issues: string[];
  strengths: string[];
  centering_ratio_front: string | null;
  centering_ratio_back: string | null;
  front_image: string | null;
  back_image: string | null;
  overall_score: number | null;
  status: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COMPANY_COLORS: Record<string, string> = {
  PSA: "#3B82F6",
  BGS: "#8B5CF6",
  CGC: "#F59E0B",
  TAG: "#10B981",
};
const gradeColor = (g: number) =>
  g >= 9.8
    ? "#FFD700"
    : g >= 9.5
      ? "#10B981"
      : g >= 9
        ? "#3B82F6"
        : g >= 8
          ? "#F59E0B"
          : "#EF4444";
const RECO = {
  grade: {
    color: "#10B981",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.3)",
    icon: "✓",
    label: "Grade It",
  },
  borderline: {
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.3)",
    icon: "~",
    label: "Borderline",
  },
  skip: {
    color: "#EF4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.3)",
    icon: "✗",
    label: "Skip",
  },
};

// ─── Tips modal ───────────────────────────────────────────────────────────────

// ─── Processing modal ─────────────────────────────────────────────────────────

function ProcessingModal({
  onClose,
  onViewReports,
}: {
  onClose: () => void;
  onViewReports: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 420,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "28px 28px 24px", textAlign: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "3px solid var(--border)",
              borderTopColor: "var(--gold)",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px",
            }}
          />
          <div
            style={{
              fontSize: 10,
              color: "var(--gold)",
              fontFamily: "DM Mono, monospace",
              letterSpacing: "0.1em",
              marginBottom: 10,
            }}
          >
            REPORT SUBMITTED
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: 12,
            }}
          >
            Gemini is analyzing your card
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              marginBottom: 20,
            }}
          >
            AI grading reports typically take{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              1–3 minutes
            </strong>{" "}
            to process. Once complete, your report will appear in{" "}
            <strong style={{ color: "var(--text-primary)" }}>My Reports</strong>
            .
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 9,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Close
            </button>
            <button
              onClick={onViewReports}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 9,
                border: "none",
                background: "var(--gold)",
                color: "#0D0E11",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              View My Reports →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Report detail modal ──────────────────────────────────────────────────────

function ReportModal({
  report,
  onClose,
  onDelete,
}: {
  report: SavedReport;
  onClose: () => void;
  onDelete: () => void;
}) {
  const reco = RECO[report.recommendation as keyof typeof RECO] ?? RECO.skip;
  const avg =
    (report.centering + report.corners + report.edges + report.surface) / 4;
  const preds = report.predictions ?? {};

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 800,
          overflow: "hidden",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface-2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 1,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                color: "var(--gold)",
                fontFamily: "DM Mono, monospace",
                letterSpacing: "0.08em",
                marginBottom: 4,
              }}
            >
              AI GRADING REPORT
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              {report.card_name ?? "Unknown Card"}
              {report.set_name ? ` · ${report.set_name}` : ""}
            </div>
            <div
              style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}
            >
              {new Date(report.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              {" · "}Confidence: {report.confidence}%
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={onDelete}
              style={{
                padding: "6px 12px",
                borderRadius: 7,
                border: "1px solid rgba(239,68,68,0.3)",
                background: "rgba(239,68,68,0.08)",
                color: "#EF4444",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Delete
            </button>
            <button
              onClick={onClose}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--text-dim)",
                fontSize: 22,
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        <div
          style={{
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Card images */}
          {(report.front_image || report.back_image) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              {[
                { label: "Front", src: report.front_image },
                { label: "Back", src: report.back_image },
              ].map((img) => (
                <div key={img.label}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-dim)",
                      fontFamily: "DM Mono, monospace",
                      marginBottom: 6,
                    }}
                  >
                    {img.label.toUpperCase()}
                  </div>
                  {img.src ? (
                    <div
                      style={{
                        borderRadius: 10,
                        overflow: "hidden",
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <img
                        src={img.src}
                        alt={img.label}
                        style={{
                          width: "100%",
                          display: "block",
                          objectFit: "contain",
                          maxHeight: 280,
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        borderRadius: 10,
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        height: 200,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-dim)",
                        fontSize: 12,
                      }}
                    >
                      No image
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Recommendation */}
          <div
            style={{
              padding: "14px 18px",
              borderRadius: 12,
              background: reco.bg,
              border: `1px solid ${reco.border}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: reco.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  color: "#fff",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {reco.icon}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: reco.color }}>
                {reco.label}
              </div>
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}
            >
              {report.recommendation_reason}
            </div>
          </div>

          {/* AI Overall Score */}
          {report.overall_score != null && (
            <div
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                gap: 24,
              }}
            >
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-dim)",
                    fontFamily: "DM Mono, monospace",
                    letterSpacing: "0.07em",
                    marginBottom: 6,
                  }}
                >
                  GEMINI AI SCORE
                </div>
                <div
                  style={{
                    fontSize: 52,
                    fontWeight: 800,
                    fontFamily: "DM Mono, monospace",
                    lineHeight: 1,
                    color:
                      report.overall_score >= 9.5
                        ? "#FFD700"
                        : report.overall_score >= 9
                          ? "#10B981"
                          : report.overall_score >= 8
                            ? "#3B82F6"
                            : report.overall_score >= 7
                              ? "#F59E0B"
                              : "#EF4444",
                  }}
                >
                  {report.overall_score.toFixed(1)}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-dim)",
                    marginTop: 4,
                  }}
                >
                  /10
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    marginBottom: 4,
                  }}
                >
                  {report.overall_score >= 9.5
                    ? "Exceptional Condition"
                    : report.overall_score >= 9
                      ? "Excellent Condition"
                      : report.overall_score >= 8.5
                        ? "Very Good Condition"
                        : report.overall_score >= 8
                          ? "Good Condition"
                          : report.overall_score >= 7
                            ? "Moderate Wear"
                            : "Significant Wear"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  Gemini Vision&apos;s holistic assessment of this card&apos;s
                  overall condition based on centering, corners, edges, and
                  surface quality.
                </div>
                {/* Score bar */}
                <div
                  style={{
                    marginTop: 10,
                    height: 6,
                    background: "var(--border)",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(report.overall_score / 10) * 100}%`,
                      borderRadius: 3,
                      background:
                        report.overall_score >= 9.5
                          ? "#FFD700"
                          : report.overall_score >= 9
                            ? "#10B981"
                            : report.overall_score >= 8
                              ? "#3B82F6"
                              : report.overall_score >= 7
                                ? "#F59E0B"
                                : "#EF4444",
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Subgrades + grade predictions side by side */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            {/* Subgrades */}
            <div
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-dim)",
                    fontFamily: "DM Mono, monospace",
                    letterSpacing: "0.07em",
                  }}
                >
                  SUBGRADES
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-dim)",
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  AVG{" "}
                  <span
                    style={{
                      color: gradeColor(avg),
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    {avg.toFixed(2)}
                  </span>
                </div>
              </div>
              {[
                { label: "Centering", score: report.centering },
                { label: "Corners", score: report.corners },
                { label: "Edges", score: report.edges },
                { label: "Surface", score: report.surface },
              ].map(({ label, score }) => (
                <div key={label} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{ fontSize: 11, color: "var(--text-secondary)" }}
                    >
                      {label}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: "DM Mono, monospace",
                        color: gradeColor(score),
                      }}
                    >
                      {score.toFixed(1)}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: "var(--border)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(score / 10) * 100}%`,
                        background: gradeColor(score),
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              ))}
              {report.centering_ratio_front && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-dim)",
                    marginTop: 8,
                  }}
                >
                  Centering — Front:{" "}
                  <span
                    style={{
                      fontFamily: "DM Mono, monospace",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {report.centering_ratio_front}
                  </span>
                  {report.centering_ratio_back && (
                    <span>
                      {" "}
                      · Back:{" "}
                      <span
                        style={{
                          fontFamily: "DM Mono, monospace",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {report.centering_ratio_back}
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Grade predictions */}
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-dim)",
                  fontFamily: "DM Mono, monospace",
                  letterSpacing: "0.07em",
                  marginBottom: 10,
                }}
              >
                PREDICTED GRADES
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {(["PSA", "BGS", "CGC", "TAG"] as const).map((co) => {
                  const pred = preds[co.toLowerCase()];
                  if (!pred) return null;
                  const color = COMPANY_COLORS[co];
                  const isSpecial = pred.isBlackLabel || pred.isPristine;
                  return (
                    <div
                      key={co}
                      style={{
                        border: `1px solid ${isSpecial ? "#FFD700" : color + "40"}`,
                        borderRadius: 10,
                        overflow: "hidden",
                        background: isSpecial
                          ? "rgba(255,215,0,0.05)"
                          : "var(--surface)",
                        position: "relative",
                      }}
                    >
                      {isSpecial && (
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 2,
                            background:
                              "linear-gradient(90deg,#FFD700,#FFA500,#FFD700)",
                          }}
                        />
                      )}
                      <div
                        style={{
                          padding: "8px 10px",
                          borderBottom: `1px solid ${isSpecial ? "rgba(255,215,0,0.2)" : "var(--border)"}`,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color }}>
                          {co}
                        </span>
                        {(pred.isBlackLabel || pred.isPristine) && (
                          <span
                            style={{
                              fontSize: 7,
                              padding: "1px 4px",
                              borderRadius: 3,
                              background: "rgba(255,215,0,0.15)",
                              color: "#FFD700",
                              fontFamily: "DM Mono, monospace",
                              border: "1px solid rgba(255,215,0,0.3)",
                            }}
                          >
                            ★ {pred.isBlackLabel ? "BLACK LABEL" : "PRISTINE"}
                          </span>
                        )}
                      </div>
                      <div
                        style={{ padding: "12px 10px", textAlign: "center" }}
                      >
                        <div
                          style={{
                            fontSize: 28,
                            fontWeight: 800,
                            fontFamily: "DM Mono, monospace",
                            color: isSpecial
                              ? "#FFD700"
                              : gradeColor(pred.grade),
                            lineHeight: 1,
                            marginBottom: 3,
                          }}
                        >
                          {pred.grade % 1 === 0
                            ? pred.grade.toFixed(0)
                            : pred.grade.toFixed(1)}
                        </div>
                        <div
                          style={{
                            fontSize: 8,
                            color: "var(--text-dim)",
                            lineHeight: 1.4,
                          }}
                        >
                          {pred.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Issues + Strengths */}
          {((report.issues?.length ?? 0) > 0 ||
            (report.strengths?.length ?? 0) > 0) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              {(report.strengths?.length ?? 0) > 0 && (
                <div
                  style={{
                    background: "rgba(16,185,129,0.06)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    borderRadius: 10,
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "#10B981",
                      fontFamily: "DM Mono, monospace",
                      marginBottom: 10,
                      letterSpacing: "0.06em",
                    }}
                  >
                    STRENGTHS
                  </div>
                  {report.strengths.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginBottom: 6,
                        display: "flex",
                        gap: 8,
                        lineHeight: 1.5,
                      }}
                    >
                      <span style={{ color: "#10B981", flexShrink: 0 }}>✓</span>
                      {s}
                    </div>
                  ))}
                </div>
              )}
              {(report.issues?.length ?? 0) > 0 && (
                <div
                  style={{
                    background: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 10,
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "#EF4444",
                      fontFamily: "DM Mono, monospace",
                      marginBottom: 10,
                      letterSpacing: "0.06em",
                    }}
                  >
                    ISSUES FOUND
                  </div>
                  {report.issues.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginBottom: 6,
                        display: "flex",
                        gap: 8,
                        lineHeight: 1.5,
                      }}
                    >
                      <span style={{ color: "#EF4444", flexShrink: 0 }}>✗</span>
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {report.notes && (
            <div
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "14px 18px",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-dim)",
                  fontFamily: "DM Mono, monospace",
                  marginBottom: 8,
                  letterSpacing: "0.06em",
                }}
              >
                GRADER&apos;S ASSESSMENT
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.7,
                }}
              >
                {report.notes}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Report grid card ─────────────────────────────────────────────────────────

function ReportCard({
  report,
  onClick,
}: {
  report: SavedReport;
  onClick: () => void;
}) {
  const reco = RECO[report.recommendation as keyof typeof RECO] ?? RECO.skip;
  const isProcessing = report.status === "processing";
  const isFailed = report.status === "failed";
  const psaGrade = report.predictions?.psa?.grade;

  return (
    <div
      onClick={!isProcessing ? onClick : undefined}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        cursor: isProcessing ? "default" : "pointer",
        transition: "border-color 0.15s, transform 0.1s",
      }}
      onMouseEnter={(e) => {
        if (!isProcessing) {
          e.currentTarget.style.borderColor = "var(--gold)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Card images */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          height: 140,
          background: "#0D0E11",
        }}
      >
        {[report.front_image, report.back_image].map((img, i) => (
          <div
            key={i}
            style={{
              overflow: "hidden",
              borderRight: i === 0 ? "1px solid var(--border)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#111",
            }}
          >
            {img ? (
              <img
                src={img}
                alt={i === 0 ? "Front" : "Back"}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              <div style={{ fontSize: 24, opacity: 0.2 }}>🃏</div>
            )}
          </div>
        ))}
      </div>

      {/* Info */}
      <div style={{ padding: "10px 12px" }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {report.card_name ?? "Unknown Card"}
        </div>
        {report.set_name && (
          <div
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              marginBottom: 8,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {report.set_name}
          </div>
        )}

        {isProcessing ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "#F59E0B",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                border: "1.5px solid #F59E0B",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            Processing...
          </div>
        ) : isFailed ? (
          <div style={{ fontSize: 11, color: "#EF4444" }}>
            ❌ Analysis failed
          </div>
        ) : (
          <div>
            {/* AI Score + recommendation */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              {report.overall_score != null && (
                <div
                  style={{ display: "flex", alignItems: "baseline", gap: 3 }}
                >
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      fontFamily: "DM Mono, monospace",
                      color: gradeColor(report.overall_score),
                      lineHeight: 1,
                    }}
                  >
                    {report.overall_score.toFixed(1)}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: "var(--text-dim)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    /10 AI
                  </span>
                </div>
              )}
              <div
                style={{
                  padding: "3px 8px",
                  borderRadius: 12,
                  background: reco.bg,
                  border: `1px solid ${reco.border}`,
                  color: reco.color,
                  fontSize: 9,
                  fontWeight: 600,
                }}
              >
                {reco.icon} {reco.label}
              </div>
            </div>
            {/* Company grades */}
            <div style={{ display: "flex", gap: 8 }}>
              {psaGrade != null && (
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 8,
                      color: "var(--text-dim)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    PSA
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: "DM Mono, monospace",
                      color: gradeColor(psaGrade),
                    }}
                  >
                    {psaGrade}
                  </div>
                </div>
              )}
              {report.predictions?.bgs?.grade != null && (
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 8,
                      color: "var(--text-dim)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    BGS
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: "DM Mono, monospace",
                      color: COMPANY_COLORS.BGS,
                    }}
                  >
                    {report.predictions.bgs.grade}
                  </div>
                </div>
              )}
              {report.predictions?.cgc?.grade != null && (
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 8,
                      color: "var(--text-dim)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    CGC
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: "DM Mono, monospace",
                      color: COMPANY_COLORS.CGC,
                    }}
                  >
                    {report.predictions.cgc.grade}
                  </div>
                </div>
              )}
              {report.predictions?.tag?.grade != null && (
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 8,
                      color: "var(--text-dim)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    TAG
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: "DM Mono, monospace",
                      color: COMPANY_COLORS.TAG,
                    }}
                  >
                    {report.predictions.tag.grade}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Image drop zone ──────────────────────────────────────────────────────────

function ImageDropZone({
  label,
  sublabel,
  preview,
  onFile,
  onClear,
}: {
  label: string;
  sublabel: string;
  preview: string | null;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) onFile(f);
  };
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "var(--text-secondary)",
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: preview ? "#10B981" : "var(--border)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            color: preview ? "#fff" : "var(--text-dim)",
            flexShrink: 0,
          }}
        >
          {preview ? "✓" : ""}
        </span>
        {label}
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={() => !preview && ref.current?.click()}
        style={{
          border: `2px dashed ${drag ? "var(--gold)" : preview ? "#10B981" : "var(--border)"}`,
          borderRadius: 12,
          background: drag
            ? "rgba(201,168,76,0.04)"
            : preview
              ? "rgba(16,185,129,0.04)"
              : "var(--surface)",
          cursor: preview ? "default" : "pointer",
          overflow: "hidden",
          transition: "all 0.15s",
          minHeight: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt={label}
              style={{
                maxWidth: "100%",
                maxHeight: 200,
                objectFit: "contain",
                display: "block",
                padding: 8,
              }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "rgba(0,0,0,0.6)",
                border: "none",
                color: "#fff",
                borderRadius: "50%",
                width: 24,
                height: 24,
                cursor: "pointer",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>
              📷
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              {sublabel}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-dim)" }}>
              Drop or click · JPG, PNG, WebP
            </div>
          </div>
        )}
      </div>
      <input
        ref={ref}
        type='file'
        accept='image/jpeg,image/png,image/webp'
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AIGradingPage() {
  const { refresh: refreshPlan } = usePlan();
  const [tab, setTab] = useState<"analyze" | "reports">("analyze");
  const [showProcessing, setShowProcessing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(
    null,
  );

  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [frontBase64, setFrontBase64] = useState<string | null>(null);
  const [frontMime, setFrontMime] = useState("image/jpeg");
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [backBase64, setBackBase64] = useState<string | null>(null);
  const [backMime, setBackMime] = useState("image/jpeg");
  const [cardName, setCardName] = useState("");
  const [setName, setSetName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [reports, setReports] = useState<SavedReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  const handleFile = useCallback((file: File, side: "front" | "back") => {
    if (file.size > 20 * 1024 * 1024) {
      setError("Image must be under 20MB");
      return;
    }
    setError("");
    const compress = (
      f: File,
    ): Promise<{ preview: string; base64: string; mime: string }> =>
      new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(f);
        img.onload = () => {
          const MAX = 1200;
          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas
            .getContext("2d")!
            .drawImage(img, 0, 0, canvas.width, canvas.height);
          const preview = canvas.toDataURL("image/jpeg", 0.85);
          URL.revokeObjectURL(url);
          resolve({
            preview,
            base64: preview.split(",")[1],
            mime: "image/jpeg",
          });
        };
        img.src = url;
      });
    compress(file).then(({ preview, base64, mime }) => {
      if (side === "front") {
        setFrontPreview(preview);
        setFrontBase64(base64);
        setFrontMime(mime);
      } else {
        setBackPreview(preview);
        setBackBase64(base64);
        setBackMime(mime);
      }
    });
  }, []);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await api.get<{ data: SavedReport[] }>("/grading/ai-reports");
      setReports(res.data.data);
    } catch {
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== "reports") return;
    const t = setTimeout(() => {
      void loadReports();
    }, 0);
    return () => clearTimeout(t);
  }, [tab, loadReports]);

  const handleAnalyze = async () => {
    if (!frontBase64 || !backBase64) return;
    setLoading(true);
    setError("");
    try {
      await api.post(
        "/grading/ai-analyze",
        {
          frontBase64,
          frontMime,
          backBase64,
          backMime,
          cardName: cardName || undefined,
          setName: setName || undefined,
        },
        { timeout: 120000 },
      );
      await refreshPlan();
      setShowProcessing(true);
    } catch (err: any) {
      setError(err?.message ?? "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFrontPreview(null);
    setFrontBase64(null);
    setBackPreview(null);
    setBackBase64(null);
    setError("");
    setCardName("");
    setSetName("");
  };

  const handleDeleteReport = async (id: string) => {
    await api.delete(`/grading/ai-reports/${id}`).catch(() => {});
    setReports((prev) => prev.filter((r) => r.id !== id));
    setSelectedReport(null);
  };

  const bothUploaded = !!frontBase64 && !!backBase64;

  return (
    <div style={{ padding: "28px 40px", maxWidth: 1060, margin: "0 auto" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--gold)",
              letterSpacing: "0.1em",
              fontFamily: "DM Mono, monospace",
              marginBottom: 6,
            }}
          >
            AI POWERED · GEMINI VISION
          </div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: 4,
            }}
          >
            Grade Prediction
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Upload front and back for predicted PSA, BGS, CGC, and TAG grades.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--border)",
          marginBottom: 24,
        }}
      >
        {[
          { key: "analyze", label: "Analyze Card" },
          {
            key: "reports",
            label: `My Reports${reports.length > 0 ? ` (${reports.length})` : ""}`,
          },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            style={{
              padding: "10px 20px",
              border: "none",
              borderBottom: `2px solid ${tab === t.key ? "var(--gold)" : "transparent"}`,
              background: "transparent",
              color: tab === t.key ? "var(--gold)" : "var(--text-dim)",
              fontSize: 12,
              fontWeight: tab === t.key ? 500 : 400,
              cursor: "pointer",
              fontFamily: "inherit",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Analyze tab ── */}
      {tab === "analyze" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 340px",
            gap: 28,
            alignItems: "start",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <ImageDropZone
                label='Front of card'
                sublabel='Upload front'
                preview={frontPreview}
                onFile={(f) => handleFile(f, "front")}
                onClear={() => {
                  setFrontPreview(null);
                  setFrontBase64(null);
                }}
              />
              <ImageDropZone
                label='Back of card'
                sublabel='Upload back'
                preview={backPreview}
                onFile={(f) => handleFile(f, "back")}
                onClear={() => {
                  setBackPreview(null);
                  setBackBase64(null);
                }}
              />
            </div>

            {!bothUploaded && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-dim)",
                  textAlign: "center",
                  padding: "8px",
                  background: "rgba(201,168,76,0.05)",
                  border: "1px solid rgba(201,168,76,0.15)",
                  borderRadius: 8,
                }}
              >
                Both front and back required for accurate grade prediction
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              {[
                {
                  label: "CARD NAME (optional)",
                  k: "cardName",
                  v: cardName,
                  set: setCardName,
                  ph: "Charizard ex",
                },
                {
                  label: "SET (optional)",
                  k: "setName",
                  v: setName,
                  set: setSetName,
                  ph: "Obsidian Flames",
                },
              ].map((f) => (
                <div key={f.k}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-dim)",
                      fontFamily: "DM Mono, monospace",
                      marginBottom: 5,
                    }}
                  >
                    {f.label}
                  </div>
                  <input
                    value={f.v}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder={f.ph}
                    style={{
                      width: "100%",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 13,
                      color: "var(--text-primary)",
                      fontFamily: "inherit",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}
            </div>

            {error && (
              <div
                style={{
                  fontSize: 12,
                  color: "#EF4444",
                  padding: "8px 12px",
                  background: "rgba(239,68,68,0.08)",
                  borderRadius: 8,
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!bothUploaded || loading}
              style={{
                padding: "13px",
                borderRadius: 10,
                border: "none",
                background:
                  bothUploaded && !loading ? "var(--gold)" : "var(--surface-2)",
                color: bothUploaded && !loading ? "#0D0E11" : "var(--text-dim)",
                fontSize: 14,
                fontWeight: 600,
                cursor: bothUploaded && !loading ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      display: "inline-block",
                      width: 16,
                      height: 16,
                      border: "2px solid #0D0E11",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  Submitting...
                </>
              ) : (
                "✦ Analyze Card"
              )}
            </button>
          </div>

          {/* ── Tips panel — always visible to the right ── */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              overflow: "hidden",
              position: "sticky",
              top: 24,
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--border)",
                background: "var(--surface-2)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 14 }}>💡</span>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--gold)",
                  fontFamily: "DM Mono, monospace",
                  letterSpacing: "0.08em",
                  fontWeight: 500,
                }}
              >
                PHOTO GUIDELINES
              </div>
            </div>
            <div
              style={{
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {[
                {
                  icon: "⬜",
                  title: "White background",
                  desc: "Place card flat on a plain white surface.",
                },
                {
                  icon: "📷",
                  title: "Flat, overhead shot",
                  desc: "Camera directly above — all four corners visible.",
                },
                {
                  icon: "💡",
                  title: "Even lighting",
                  desc: "Natural daylight or diffused light. Avoid flash glare.",
                },
                {
                  icon: "🖨️",
                  title: "Scan for best results",
                  desc: "Flatbed scanner at 300+ DPI gives highest accuracy.",
                },
                {
                  icon: "🔍",
                  title: "Both sides required",
                  desc: "Back centering and defects affect the final grade.",
                },
                {
                  icon: "🤚",
                  title: "Handle by edges",
                  desc: "Fingerprints lower the surface subgrade.",
                },
              ].map((tip) => (
                <div key={tip.title} style={{ display: "flex", gap: 12 }}>
                  <div
                    style={{
                      fontSize: 18,
                      flexShrink: 0,
                      width: 24,
                      textAlign: "center",
                      marginTop: 1,
                    }}
                  >
                    {tip.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        marginBottom: 2,
                      }}
                    >
                      {tip.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                      }}
                    >
                      {tip.desc}
                    </div>
                  </div>
                </div>
              ))}
              <div
                style={{
                  marginTop: 4,
                  padding: "10px 12px",
                  background: "rgba(201,168,76,0.06)",
                  border: "1px solid rgba(201,168,76,0.2)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: "var(--gold)" }}>Note:</strong> AI
                predictions are estimates. Submit to PSA, BGS, CGC, or TAG for
                official grades.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reports tab — grid ── */}
      {tab === "reports" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
              {reports.length} report{reports.length !== 1 ? "s" : ""}
            </div>
            <button
              onClick={loadReports}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-dim)",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              ↺ Refresh
            </button>
          </div>

          {reportsLoading ? (
            <div
              style={{
                padding: 60,
                textAlign: "center",
                color: "var(--text-dim)",
              }}
            >
              Loading...
            </div>
          ) : reports.length === 0 ? (
            <div
              style={{
                padding: "60px 24px",
                textAlign: "center",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  marginBottom: 6,
                }}
              >
                No reports yet
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginBottom: 16,
                }}
              >
                Analyze a card to save your first grading report.
              </div>
              <button
                onClick={() => setTab("analyze")}
                style={{
                  padding: "9px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--gold)",
                  color: "#0D0E11",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Analyze a card
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 14,
              }}
            >
              {reports.map((r) => (
                <ReportCard
                  key={r.id}
                  report={r}
                  onClick={() => setSelectedReport(r)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showProcessing && (
        <ProcessingModal
          onClose={() => {
            setShowProcessing(false);
            reset();
          }}
          onViewReports={() => {
            setShowProcessing(false);
            reset();
            setTab("reports");
            loadReports();
          }}
        />
      )}
      {selectedReport && (
        <ReportModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onDelete={() => handleDeleteReport(selectedReport.id)}
        />
      )}
    </div>
  );
}
