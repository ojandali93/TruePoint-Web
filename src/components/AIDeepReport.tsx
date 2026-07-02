/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// src/components/AIDeepReport.tsx
//
// Phase-3 web UI for the deepened AI grading pipeline. Three drop-in sections
// that read the new `report` (deep objective analysis) and `predictions`
// (richer per-company shape) columns. Styled to match grading/ai/page.tsx
// (inline styles + CSS variables). Import and render inside the report card.

import { useState } from "react";
import api from "../lib/api";

const sevColor = (s: number) =>
  s >= 55
    ? "var(--data-negative, #A8493A)"
    : s >= 30
      ? "var(--gold)"
      : "var(--text-secondary)";
const scoreColor = (s: number) =>
  s >= 90
    ? "var(--data-positive, #5C8C5A)"
    : s >= 75
      ? "var(--gold)"
      : "var(--data-negative, #A8493A)";
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const card: React.CSSProperties = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};
const eyebrow: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: 1,
  fontWeight: 700,
  color: "var(--text-dim)",
  textTransform: "uppercase",
};

// ─── 1. Objective analysis ────────────────────────────────────────────────────

export function AIObjectiveReport({ report }: { report: any }) {
  if (!report || typeof report !== "object") return null;
  const centering: any[] = Array.isArray(report.centering)
    ? report.centering
    : [];
  const corners: any[] = Array.isArray(report.corners) ? report.corners : [];
  const edges: any[] = Array.isArray(report.edges) ? report.edges : [];
  const surface: any[] = Array.isArray(report.surface) ? report.surface : [];
  const dings: any[] = Array.isArray(report.dings) ? report.dings : [];
  const dims = report.dimensions ?? {};
  const front = centering.find((c) => c.side === "front");
  const back = centering.find((c) => c.side === "back");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h3 style={{ color: "var(--text-primary)", fontWeight: 700, margin: 0 }}>
        Objective analysis
      </h3>

      {dings.length > 0 && (
        <div style={card}>
          <div style={eyebrow}>Dings · notable defects ({dings.length})</div>
          {dings.map((d, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                padding: "6px 0",
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  marginTop: 6,
                  background: sevColor(d.severity ?? 0),
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  {String(d.type ?? "Defect")}
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                  {String(d.side ?? "")} · {String(d.category ?? "")}
                  {d.location ? ` · ${d.location}` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    color: sevColor(d.severity ?? 0),
                    fontWeight: 700,
                    fontFamily: "monospace",
                  }}
                >
                  sev {Math.round(d.severity ?? 0)}
                </div>
                <div style={{ color: "var(--text-dim)", fontSize: 10 }}>
                  {Math.round(d.confidence ?? 0)}% conf
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(front || back) && (
        <div style={card}>
          <div style={eyebrow}>Centering</div>
          <div style={{ display: "flex", gap: 24 }}>
            {[
              { label: "FRONT", m: front },
              { label: "BACK", m: back },
            ].map(({ label, m }) =>
              m ? (
                <div key={label}>
                  <div
                    style={{
                      color: "var(--text-dim)",
                      fontSize: 10,
                      letterSpacing: 0.5,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      color: "var(--text-primary)",
                      fontWeight: 700,
                      fontFamily: "monospace",
                    }}
                  >
                    {m.leftRight} · {m.topBottom}
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                    worst axis {m.worstAxisPct}%
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </div>
      )}

      {(corners.length > 0 || edges.length > 0) && (
        <div style={card}>
          {corners.length > 0 && (
            <>
              <div style={eyebrow}>Corners</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {corners.map((c, i) => (
                  <Chip
                    key={i}
                    label={`${c.side?.[0]?.toUpperCase() ?? ""}·${c.position ?? ""}`}
                    value={Math.round(c.score ?? 0)}
                    color={scoreColor(c.score ?? 0)}
                  />
                ))}
              </div>
            </>
          )}
          {edges.length > 0 && (
            <>
              <div style={eyebrow}>Edges</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {edges.map((e, i) => (
                  <Chip
                    key={i}
                    label={`${e.side?.[0]?.toUpperCase() ?? ""}·${e.position ?? ""}`}
                    value={Math.round(e.score ?? 0)}
                    color={scoreColor(e.score ?? 0)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {surface.length > 0 && (
        <div style={card}>
          <div style={eyebrow}>Surface ({surface.length})</div>
          {surface.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                {String(s.type ?? "").replace(/_/g, " ")}
                {s.location ? ` — ${s.location}` : ""} ({String(s.side ?? "")})
              </span>
              <span
                style={{
                  color: sevColor(s.severity ?? 0),
                  fontWeight: 700,
                  fontFamily: "monospace",
                }}
              >
                {Math.round(s.severity ?? 0)}
              </span>
            </div>
          ))}
        </div>
      )}

      {(dims.heightIn || dims.widthIn) && (
        <div style={card}>
          <div style={eyebrow}>Dimensions</div>
          <div
            style={{
              color: "var(--text-primary)",
              fontWeight: 700,
              fontFamily: "monospace",
            }}
          >
            {dims.heightIn ? `${dims.heightIn}"` : "—"} H ×{" "}
            {dims.widthIn ? `${dims.widthIn}"` : "—"} W
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 8px",
        borderRadius: 8,
        background: "var(--surface)",
        border: `1px solid ${color}44`,
        fontSize: 11,
      }}
    >
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ color, fontWeight: 700, fontFamily: "monospace" }}>
        {value}
      </span>
    </span>
  );
}

// ─── 2. Predictions ───────────────────────────────────────────────────────────

const COMPANIES = [
  { key: "psa", name: "PSA" },
  { key: "bgs", name: "BGS" },
  { key: "cgc", name: "CGC" },
  { key: "tag", name: "TAG" },
] as const;

export function AIPredictions({ predictions }: { predictions: any }) {
  if (!predictions || typeof predictions !== "object") return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <h3 style={{ color: "var(--text-primary)", fontWeight: 700, margin: 0 }}>
        Predicted grades
      </h3>
      {COMPANIES.map(({ key, name }) => {
        const p = predictions[key];
        if (!p) return null;
        const range =
          Array.isArray(p.gradeRange) && p.gradeRange.length === 2
            ? `${fmt(p.gradeRange[0])}–${fmt(p.gradeRange[1])}`
            : null;
        const special = p.isBlackLabel
          ? "Black Label"
          : p.isPristine
            ? "Pristine"
            : null;
        return (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: "var(--surface)",
              border: `1px solid ${special ? "var(--gold)" : "var(--border)"}`,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ textAlign: "center", minWidth: 56 }}>
              <div
                style={{
                  color: "var(--text-dim)",
                  fontSize: 9,
                  letterSpacing: 1,
                  fontWeight: 700,
                }}
              >
                {name}
              </div>
              <div
                style={{ color: "var(--gold)", fontWeight: 800, fontSize: 30 }}
              >
                {fmt(p.grade)}
              </div>
              {key === "tag" && p.score1000 ? (
                <div style={{ color: "var(--text-dim)", fontSize: 10 }}>
                  {p.score1000}/1000
                </div>
              ) : null}
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                {special ?? p.label ?? `${name} ${fmt(p.grade)}`}
              </div>
              {range && (
                <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                  Likely range {range}
                  {typeof p.confidence === "number"
                    ? ` · ${p.confidence}% conf`
                    : ""}
                </div>
              )}
              {p.limitingFactor ? (
                <div style={{ color: "var(--text-dim)", fontSize: 11 }}>
                  Limited by: {p.limitingFactor}
                </div>
              ) : null}
              {key === "bgs" && p.subgrades ? (
                <div
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: 11,
                    fontFamily: "monospace",
                  }}
                >
                  C {fmt(p.subgrades.centering)} · Co {fmt(p.subgrades.corners)}{" "}
                  · E {fmt(p.subgrades.edges)} · S {fmt(p.subgrades.surface)}
                </div>
              ) : null}
              {key === "psa" &&
              Array.isArray(p.qualifiers) &&
              p.qualifiers.length > 0 ? (
                <div
                  style={{
                    color: "var(--data-negative, #A8493A)",
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  Qualifiers: {p.qualifiers.join(", ")}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
      <p
        style={{
          color: "var(--text-dim)",
          fontSize: 11,
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        Predictions are estimates from photos, not a substitute for professional
        grading. Micro-defects may not be visible in a photo — low confidence
        widens the range.
      </p>
    </div>
  );
}

// ─── 3. Record actual grade ───────────────────────────────────────────────────

export function RecordActualGrade({
  reportId,
  existing,
  onSaved,
}: {
  reportId: string;
  existing?: { company?: string | null; grade?: number | null };
  onSaved?: () => void;
}) {
  const [company, setCompany] = useState<string | null>(
    existing?.company ?? null,
  );
  const [grade, setGrade] = useState<number | null>(existing?.grade ?? null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(Boolean(existing?.grade));
  const grades = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6];

  const save = async () => {
    if (!company || grade == null) return;
    setSaving(true);
    try {
      await api.patch(`/grading/ai-reports/${reportId}/actual`, {
        company,
        grade,
      });
      setSaved(true);
      onSaved?.();
    } catch {
      /* keep form open for retry */
    } finally {
      setSaving(false);
    }
  };

  const pill = (active: boolean): React.CSSProperties => ({
    padding: "7px 12px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
    background: active ? "var(--gold)" : "var(--surface)",
    color: active ? "#0E0E12" : "var(--text-secondary)",
    border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
  });

  return (
    <div style={card}>
      <div style={eyebrow}>
        {saved ? "Real grade recorded" : "Got it graded? Add the real grade"}
      </div>
      <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
        Recording the real grade helps us measure and improve prediction
        accuracy.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {COMPANIES.map(({ key, name }) => (
          <button
            key={key}
            type='button'
            onClick={() => {
              setCompany(key);
              setSaved(false);
            }}
            style={pill(company === key)}
          >
            {name}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {grades.map((g) => (
          <button
            key={g}
            type='button'
            onClick={() => {
              setGrade(g);
              setSaved(false);
            }}
            style={{ ...pill(grade === g), fontFamily: "monospace" }}
          >
            {Number.isInteger(g) ? g : g.toFixed(1)}
          </button>
        ))}
      </div>
      <button
        type='button'
        onClick={save}
        disabled={!company || grade == null || saving}
        style={{
          padding: "12px",
          borderRadius: 10,
          border: "none",
          cursor: !company || grade == null ? "default" : "pointer",
          fontWeight: 700,
          background:
            !company || grade == null ? "var(--surface)" : "var(--gold)",
          color: !company || grade == null ? "var(--text-dim)" : "#0E0E12",
        }}
      >
        {saving ? "Saving…" : saved ? "Update real grade" : "Save real grade"}
      </button>
    </div>
  );
}
