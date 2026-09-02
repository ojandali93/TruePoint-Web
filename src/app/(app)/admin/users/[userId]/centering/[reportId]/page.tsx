"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../../../../../lib/api";

interface CenteringReport {
  id: string;
  user_id: string;
  card_id: string | null;
  side: string | null;
  label: string | null;
  image_url: string | null;
  left_pct: number | null;
  right_pct: number | null;
  top_pct: number | null;
  bottom_pct: number | null;
  left_border_mm: number | null;
  right_border_mm: number | null;
  top_border_mm: number | null;
  bottom_border_mm: number | null;
  lr_worse: number | null;
  tb_worse: number | null;
  worst_axis: string | null;
  truepoint_score: number | null;
  psa_grade: string | null;
  bgs_grade: string | null;
  cgc_grade: string | null;
  sgc_grade: string | null;
  tag_grade: string | null;
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

const GRADE_COMPANIES: { key: keyof CenteringReport; label: string }[] = [
  { key: "psa_grade", label: "PSA" },
  { key: "bgs_grade", label: "BGS" },
  { key: "cgc_grade", label: "CGC" },
  { key: "sgc_grade", label: "SGC" },
  { key: "tag_grade", label: "TAG" },
];

export default function AdminCenteringReportPage() {
  const router = useRouter();
  const params = useParams<{ userId: string; reportId: string }>();
  const { userId, reportId } = params;

  const [report, setReport] = useState<CenteringReport | null>(null);
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
          data: { report: CenteringReport; flag: ReportFlag | null };
        }>(`/admin/users/${userId}/centering-reports/${reportId}`);
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
        reportType: "centering",
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
      await api.delete(`/admin/flagged-reports/centering/${reportId}`);
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

  const grades = GRADE_COMPANIES.filter((g) => report[g.key]);

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
          CENTERING REPORT{flag && " · FLAGGED"}
        </div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          {report.label || `${report.side ?? "Front"} scan`}
        </h1>
        <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
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
        {/* Image */}
        <div style={cardStyle}>
          <SectionTitle>Submitted scan</SectionTitle>
          <div style={{ marginTop: 14 }}>
            {report.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={report.image_url}
                alt={report.side ?? "Card scan"}
                style={{
                  width: 260,
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                }}
              />
            ) : (
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                No image on this report.
              </div>
            )}
          </div>
        </div>

        {/* Measurements */}
        <div style={cardStyle}>
          <SectionTitle>
            Centering{" "}
            <span style={{ color: "var(--gold)", fontWeight: 500 }}>
              — TP {report.truepoint_score ?? "—"}
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
            <Metric label="Left" value={report.left_pct} suffix="%" />
            <Metric label="Right" value={report.right_pct} suffix="%" />
            <Metric label="Top" value={report.top_pct} suffix="%" />
            <Metric label="Bottom" value={report.bottom_pct} suffix="%" />
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-dim)" }}>
            L/R worse: {report.lr_worse ?? "—"} · T/B worse: {report.tb_worse ?? "—"}
            {report.worst_axis ? ` · worst axis: ${report.worst_axis}` : ""}
          </div>
          {(report.left_border_mm != null || report.right_border_mm != null) && (
            <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-dim)" }}>
              Border (mm) — L {report.left_border_mm ?? "—"} · R{" "}
              {report.right_border_mm ?? "—"} · T {report.top_border_mm ?? "—"} · B{" "}
              {report.bottom_border_mm ?? "—"}
            </div>
          )}
        </div>

        {/* Predicted grades per company */}
        {grades.length > 0 && (
          <div style={cardStyle}>
            <SectionTitle>Predicted grades</SectionTitle>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {grades.map((g, i) => (
                <div
                  key={g.key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                    paddingTop: i > 0 ? 10 : 0,
                  }}
                >
                  <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                    {g.label}
                  </span>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: 13, color: "var(--gold)" }}>
                    {String(report[g.key])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Golden-set flag control — identical shape to the AI grading page */}
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | null;
  suffix?: string;
}) {
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
        {value != null ? `${value}${suffix ?? ""}` : "—"}
      </div>
    </div>
  );
}
