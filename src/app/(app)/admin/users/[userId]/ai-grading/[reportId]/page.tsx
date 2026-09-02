"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../../../../../lib/api";

interface Prediction {
  company: string;
  likely: string;
  range?: string;
  note?: string;
}

interface AIGradingReport {
  id: string;
  user_id: string;
  card_name: string | null;
  set_name: string | null;
  status: string;
  front_image: string | null;
  back_image: string | null;
  centering: number | null;
  corners: number | null;
  edges: number | null;
  surface: number | null;
  overall_score: number | null;
  tp_score: number | null;
  centering_ratio_front: string | null;
  centering_ratio_back: string | null;
  predictions: Prediction[] | null;
  issues: string[] | null;
  strengths: string[] | null;
  confidence: number | null;
  notes: string | null;
  recommendation: string | null;
  recommendation_reason: string | null;
  actual_company: string | null;
  actual_grade: number | null;
  created_at: string;
}

interface ReportFlag {
  id: string;
  reason: string;
  flagged_by: string;
  flagged_at: string;
}

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 20,
};

export default function AdminAIGradingReportPage() {
  const router = useRouter();
  const params = useParams<{ userId: string; reportId: string }>();
  const { userId, reportId } = params;

  const [report, setReport] = useState<AIGradingReport | null>(null);
  const [flag, setFlag] = useState<ReportFlag | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [flagging, setFlagging] = useState(false);
  const [flagNotice, setFlagNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !reportId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await api.get<{
          data: { report: AIGradingReport; flag: ReportFlag | null };
        }>(`/admin/users/${userId}/ai-grading-reports/${reportId}`);
        if (!mounted) return;
        setReport(r.data.data.report);
        setFlag(r.data.data.flag);
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "Failed to load report.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId, reportId]);

  const handleFlag = async () => {
    if (!flagReason.trim()) return;
    setFlagging(true);
    setFlagNotice(null);
    try {
      const r = await api.post<{ data: ReportFlag }>("/admin/flagged-reports", {
        reportId,
        reportType: "ai_grading",
        reason: flagReason.trim(),
      });
      setFlag(r.data.data);
      setFlagNotice("Flagged for the golden-set candidate review.");
    } catch (e) {
      setFlagNotice(
        e instanceof Error ? e.message : "Failed to flag this report.",
      );
    } finally {
      setFlagging(false);
    }
  };

  const handleUnflag = async () => {
    setFlagging(true);
    setFlagNotice(null);
    try {
      await api.delete(`/admin/flagged-reports/ai_grading/${reportId}`);
      setFlag(null);
      setFlagReason("");
      setFlagNotice("Flag removed.");
    } catch (e) {
      setFlagNotice(e instanceof Error ? e.message : "Failed to remove flag.");
    } finally {
      setFlagging(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, color: "var(--text-dim)", fontSize: 13 }}>
        Loading…
      </div>
    );
  }
  if (error || !report) {
    return (
      <div style={{ padding: 40, color: "#EF4444", fontSize: 13 }}>
        {error ?? "Report not found."}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          padding: "28px 40px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <button
          onClick={() => router.push(`/admin/users/${userId}`)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-dim)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
            padding: 0,
            marginBottom: 12,
          }}
        >
          ← Back to user
        </button>
        <div
          style={{
            fontSize: 10,
            color: "var(--gold)",
            letterSpacing: "0.1em",
            fontFamily: "DM Mono, monospace",
            marginBottom: 6,
          }}
        >
          AI GRADING REPORT · {report.status.toUpperCase()}
          {flag && " · FLAGGED"}
        </div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          {report.card_name || "Untitled card"}
        </h1>
        <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
          {report.set_name ? `${report.set_name} · ` : ""}
          {new Date(report.created_at).toLocaleString()}
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          padding: "28px 40px",
          maxWidth: 900,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Photos — exactly as the user submitted them */}
        <div style={cardStyle}>
          <SectionTitle>Submitted photos</SectionTitle>
          <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
            {report.front_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={report.front_image}
                alt="Front"
                style={{
                  width: 220,
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                }}
              />
            ) : (
              <EmptyNote label="No front image." />
            )}
            {report.back_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={report.back_image}
                alt="Back"
                style={{
                  width: 220,
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                }}
              />
            ) : (
              <EmptyNote label="No back image." />
            )}
          </div>
        </div>

        {/* Subgrades */}
        <div style={cardStyle}>
          <SectionTitle>
            Subgrades{" "}
            <span style={{ color: "var(--gold)", fontWeight: 500 }}>
              — TP {report.tp_score ?? report.overall_score ?? "—"}
            </span>
          </SectionTitle>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              marginTop: 14,
            }}
          >
            <Metric label="Centering" value={report.centering} />
            <Metric label="Corners" value={report.corners} />
            <Metric label="Edges" value={report.edges} />
            <Metric label="Surface" value={report.surface} />
          </div>
          {(report.centering_ratio_front || report.centering_ratio_back) && (
            <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-dim)" }}>
              Centering ratio — front: {report.centering_ratio_front ?? "—"} ·
              back: {report.centering_ratio_back ?? "—"}
            </div>
          )}
          {report.confidence != null && (
            <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-dim)" }}>
              Model confidence: {Math.round(report.confidence * 100)}%
            </div>
          )}
        </div>

        {/* Predicted grades per company */}
        {report.predictions && report.predictions.length > 0 && (
          <div style={cardStyle}>
            <SectionTitle>Predicted grades</SectionTitle>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {report.predictions.map((p, i) => (
                <div
                  key={`${p.company}-${i}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                    paddingTop: i > 0 ? 10 : 0,
                  }}
                >
                  <div>
                    <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                      {p.company}
                    </span>
                    {p.note && (
                      <span style={{ fontSize: 12, color: "var(--text-dim)", marginLeft: 8 }}>
                        {p.note}
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: "DM Mono, monospace", fontSize: 13, color: "var(--gold)" }}>
                    {p.likely}
                    {p.range ? ` (${p.range})` : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendation */}
        {report.recommendation && (
          <div style={cardStyle}>
            <SectionTitle>Recommendation</SectionTitle>
            <div style={{ marginTop: 10, fontSize: 14, color: "var(--text-primary)", textTransform: "capitalize" }}>
              {report.recommendation.replace(/_/g, " ")}
            </div>
            {report.recommendation_reason && (
              <div style={{ marginTop: 6, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {report.recommendation_reason}
              </div>
            )}
          </div>
        )}

        {/* Findings — issues/strengths/notes, same content the user saw */}
        {(report.issues?.length || report.strengths?.length || report.notes) && (
          <div style={cardStyle}>
            <SectionTitle>Findings</SectionTitle>
            {report.strengths && report.strengths.length > 0 && (
              <FindingList label="Strengths" color="#10B981" items={report.strengths} />
            )}
            {report.issues && report.issues.length > 0 && (
              <FindingList label="Issues" color="#EF4444" items={report.issues} />
            )}
            {report.notes && (
              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-dim)",
                    fontFamily: "DM Mono, monospace",
                    marginBottom: 6,
                    letterSpacing: "0.06em",
                  }}
                >
                  GRADER&apos;S ASSESSMENT
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  {report.notes}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actual grade, if the user recorded one */}
        {report.actual_company && report.actual_grade != null && (
          <div style={cardStyle}>
            <SectionTitle>Actual grade (user-recorded)</SectionTitle>
            <div style={{ marginTop: 10, fontSize: 14, color: "var(--text-primary)" }}>
              {report.actual_company} {report.actual_grade}
            </div>
          </div>
        )}

        {/* Golden-set flag control */}
        <div style={{ ...cardStyle, borderColor: flag ? "var(--gold)" : "var(--border)" }}>
          <SectionTitle>Golden-set flag</SectionTitle>
          {flag ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, color: "var(--gold)", marginBottom: 4 }}>
                Flagged {new Date(flag.flagged_at).toLocaleString()}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>
                &ldquo;{flag.reason}&rdquo;
              </div>
              <button
                onClick={handleUnflag}
                disabled={flagging}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid rgba(239,68,68,0.3)",
                  background: "transparent",
                  color: "#EF4444",
                  fontSize: 12,
                  cursor: flagging ? "default" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {flagging ? "Removing…" : "Remove flag"}
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>
                Marks this report as a golden-set candidate for the grading
                calibration harness.
              </div>
              <textarea
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="Why is this a good calibration candidate?"
                rows={2}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--surface-2, var(--surface))",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  fontFamily: "inherit",
                  resize: "vertical",
                  marginBottom: 10,
                }}
              />
              <button
                onClick={handleFlag}
                disabled={flagging || !flagReason.trim()}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: flagReason.trim() ? "var(--gold)" : "var(--border)",
                  color: "#0D0E11",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: flagReason.trim() && !flagging ? "pointer" : "default",
                  fontFamily: "inherit",
                }}
              >
                {flagging ? "Flagging…" : "Flag for golden set"}
              </button>
            </div>
          )}
          {flagNotice && (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-dim)" }}>
              {flagNotice}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shared bits ─────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
      {children}
    </div>
  );
}

function EmptyNote({ label }: { label: string }) {
  return <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{label}</div>;
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div
      style={{
        background: "var(--charcoal, #0D0E11)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "10px 12px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 4 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 16, fontFamily: "DM Mono, monospace", color: "var(--text-primary)" }}>
        {value != null ? value.toFixed(1) : "—"}
      </div>
    </div>
  );
}

function FindingList({
  label,
  color,
  items,
}: {
  label: string;
  color: string;
  items: string[];
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          fontSize: 10,
          color,
          fontFamily: "DM Mono, monospace",
          marginBottom: 6,
          letterSpacing: "0.06em",
        }}
      >
        {label.toUpperCase()}
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 8,
            fontSize: 13,
            color: "var(--text-secondary)",
            marginBottom: 4,
          }}
        >
          <span style={{ color, flexShrink: 0 }}>{label === "Strengths" ? "✓" : "✗"}</span>
          {item}
        </div>
      ))}
    </div>
  );
}
