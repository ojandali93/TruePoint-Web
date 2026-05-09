/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import api from "../../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TCGdexSet {
  id: string;
  name: string;
  releaseDate?: string;
}

interface MappingResult {
  ourId: string;
  ourName: string;
  tcgdexId: string | null;
  matchType: "existing" | "direct" | "normalized" | "name" | "none";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const zeroPad = (id: string): string =>
  id.replace(/^([a-z]+)(\d)([a-z]|pt\d|$)/i, (_, p, d, s) => `${p}0${d}${s}`);

const normName = (n: string) =>
  n
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const MATCH_COLORS: Record<string, string> = {
  existing: "#6B7280",
  direct: "#3DAA6E",
  normalized: "#3B82F6",
  name: "#F59E0B",
  none: "#C94C4C",
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const [step, setStep] = useState<
    "idle" | "fetching" | "fetched" | "saving" | "done"
  >("idle");
  const [tcgdexSets, setTcgdexSets] = useState<TCGdexSet[]>([]);
  const [mappings, setMappings] = useState<MappingResult[]>([]);
  const [error, setError] = useState("");
  const [savedCount, setSavedCount] = useState(0);

  // ── Step 1: fetch from TCGdex directly in browser then match to our sets ──

  const handleFetch = async () => {
    setStep("fetching");
    setError("");

    try {
      // Fetch TCGdex sets — works from browser, blocked from Render server
      const tcgRes = await fetch("https://api.tcgdex.net/v2/en/sets");
      if (!tcgRes.ok) throw new Error(`TCGdex error: ${tcgRes.status}`);
      const tcgSets: TCGdexSet[] = await tcgRes.json();
      setTcgdexSets(tcgSets);

      // Fetch our sets from backend
      const ourRes = await api.get<{
        data: { id: string; name: string; tcgdex_id: string | null }[];
      }>("/cards/sets");
      const ourSets = ourRes.data.data ?? [];

      // Build TCGdex lookup maps
      const byId = new Map(tcgSets.map((s) => [s.id.toLowerCase(), s]));
      const byPadded = new Map(
        tcgSets.map((s) => [zeroPad(s.id).toLowerCase(), s]),
      );
      const byName = new Map(tcgSets.map((s) => [normName(s.name), s]));

      // Match each of our sets
      const results: MappingResult[] = ourSets.map((set) => {
        if (set.tcgdex_id) {
          return {
            ourId: set.id,
            ourName: set.name,
            tcgdexId: set.tcgdex_id,
            matchType: "existing",
          };
        }

        const direct = byId.get(set.id.toLowerCase());
        if (direct)
          return {
            ourId: set.id,
            ourName: set.name,
            tcgdexId: direct.id,
            matchType: "direct",
          };

        const padded = byPadded.get(zeroPad(set.id).toLowerCase());
        if (padded)
          return {
            ourId: set.id,
            ourName: set.name,
            tcgdexId: padded.id,
            matchType: "normalized",
          };

        const named = byName.get(normName(set.name));
        if (named)
          return {
            ourId: set.id,
            ourName: set.name,
            tcgdexId: named.id,
            matchType: "name",
          };

        return {
          ourId: set.id,
          ourName: set.name,
          tcgdexId: null,
          matchType: "none",
        };
      });

      setMappings(results);
      setStep("fetched");
    } catch (err: any) {
      setError(err?.message ?? "Fetch failed");
      setStep("idle");
    }
  };

  // ── Step 2: save new mappings to backend ──────────────────────────────────

  const handleSave = async () => {
    setStep("saving");
    setError("");
    try {
      const toSave = mappings
        .filter((m) => m.tcgdexId && m.matchType !== "existing")
        .map((m) => ({ setId: m.ourId, tcgdexId: m.tcgdexId }));

      if (toSave.length) {
        await api.post("/admin/sets/tcgdex-ids", { mappings: toSave });
      }

      setSavedCount(toSave.length);
      setStep("done");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.message ?? "Save failed");
      setStep("fetched");
    }
  };

  const newMappings = mappings.filter(
    (m) => m.tcgdexId && m.matchType !== "existing",
  );
  const unmatched = mappings.filter((m) => m.matchType === "none");
  const existing = mappings.filter((m) => m.matchType === "existing");

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontSize: 10,
            color: "var(--gold)",
            letterSpacing: "0.1em",
            fontFamily: "DM Mono, monospace",
            marginBottom: 6,
          }}
        >
          ADMIN
        </div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          Settings
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Admin tools for data management and sync operations.
        </p>
      </div>

      {/* ── TCGdex ID Mapper card ── */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        {/* Card header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface-2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                color: "var(--gold)",
                letterSpacing: "0.08em",
                fontFamily: "DM Mono, monospace",
                marginBottom: 4,
              }}
            >
              TCGDEX SET ID MAPPER
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                maxWidth: 520,
                lineHeight: 1.5,
              }}
            >
              Fetches all sets from TCGdex directly in your browser (bypasses
              server IP block), matches them to your sets table, and saves the{" "}
              <code
                style={{
                  background: "rgba(255,255,255,0.06)",
                  padding: "1px 5px",
                  borderRadius: 3,
                  fontSize: 11,
                  fontFamily: "DM Mono, monospace",
                }}
              >
                tcgdex_id
              </code>{" "}
              column. Required before running the TCGdex price sync.
            </div>
          </div>

          {/* Status pill */}
          {step === "done" && (
            <div
              style={{
                padding: "5px 12px",
                borderRadius: 20,
                background: "rgba(61,170,110,0.12)",
                border: "1px solid rgba(61,170,110,0.3)",
                fontSize: 11,
                color: "#3DAA6E",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              ✓ {savedCount} saved
            </div>
          )}
        </div>

        <div style={{ padding: 24 }}>
          {/* Idle state */}
          {(step === "idle" || step === "fetching") && (
            <button
              onClick={handleFetch}
              disabled={step === "fetching"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 24px",
                borderRadius: 9,
                border: "none",
                background: "var(--gold)",
                color: "#0D0E11",
                fontSize: 13,
                fontWeight: 600,
                cursor: step === "fetching" ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: step === "fetching" ? 0.7 : 1,
              }}
            >
              {step === "fetching" ? (
                <>
                  <span
                    style={{
                      display: "inline-block",
                      width: 14,
                      height: 14,
                      border: "2px solid #0D0E11",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  Fetching from TCGdex...
                </>
              ) : (
                <>
                  <span style={{ fontSize: 16 }}>⇣</span>
                  Fetch TCGdex sets & auto-match
                </>
              )}
            </button>
          )}

          {/* Fetched state */}
          {(step === "fetched" || step === "saving") && mappings.length > 0 && (
            <>
              {/* Stats row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                {[
                  {
                    label: "TCGDEX SETS",
                    value: tcgdexSets.length,
                    color: "var(--text-primary)",
                  },
                  {
                    label: "ALREADY MAPPED",
                    value: existing.length,
                    color: "#6B7280",
                  },
                  {
                    label: "NEW MATCHES",
                    value: newMappings.length,
                    color: "#3DAA6E",
                  },
                  {
                    label: "UNMATCHED",
                    value: unmatched.length,
                    color: unmatched.length > 0 ? "#F59E0B" : "#6B7280",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "12px 14px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        color: "var(--text-dim)",
                        letterSpacing: "0.07em",
                        fontFamily: "DM Mono, monospace",
                        marginBottom: 5,
                      }}
                    >
                      {s.label}
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 600,
                        color: s.color,
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* New mappings list */}
              {newMappings.length > 0 && (
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    overflow: "hidden",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      padding: "8px 14px",
                      background: "var(--surface-2)",
                      borderBottom: "1px solid var(--border)",
                      fontSize: 10,
                      color: "var(--text-dim)",
                      fontFamily: "DM Mono, monospace",
                      letterSpacing: "0.06em",
                    }}
                  >
                    NEW MAPPINGS TO SAVE
                  </div>
                  <div style={{ maxHeight: 220, overflowY: "auto" }}>
                    {newMappings.map((m) => (
                      <div
                        key={m.ourId}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 14px",
                          borderBottom: "1px solid var(--border)",
                          fontSize: 12,
                        }}
                      >
                        <span
                          style={{ color: "var(--text-secondary)", flex: 1 }}
                        >
                          {m.ourName}
                        </span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "DM Mono, monospace",
                              color: "var(--text-dim)",
                              fontSize: 10,
                            }}
                          >
                            {m.ourId}
                          </span>
                          <span
                            style={{ color: "var(--text-dim)", fontSize: 12 }}
                          >
                            →
                          </span>
                          <span
                            style={{
                              fontFamily: "DM Mono, monospace",
                              color: "#3DAA6E",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {m.tcgdexId}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: `${MATCH_COLORS[m.matchType]}20`,
                              color: MATCH_COLORS[m.matchType],
                              border: `1px solid ${MATCH_COLORS[m.matchType]}40`,
                            }}
                          >
                            {m.matchType}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unmatched warning */}
              {unmatched.length > 0 && (
                <div
                  style={{
                    background: "rgba(245,158,11,0.06)",
                    border: "1px solid rgba(245,158,11,0.2)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    marginBottom: 16,
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 500,
                      color: "#F59E0B",
                      marginBottom: 6,
                    }}
                  >
                    {unmatched.length} sets not found in TCGdex — these are
                    custom or non-English sets:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {unmatched.map((m) => (
                      <span
                        key={m.ourId}
                        style={{
                          fontSize: 10,
                          padding: "2px 7px",
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: 4,
                          fontFamily: "DM Mono, monospace",
                          color: "var(--text-dim)",
                        }}
                      >
                        {m.ourId}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div
                  style={{ fontSize: 12, color: "#C94C4C", marginBottom: 12 }}
                >
                  {error}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  onClick={handleFetch}
                  disabled={step === "saving"}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-secondary)",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Re-fetch
                </button>
                <button
                  onClick={handleSave}
                  disabled={step === "saving" || newMappings.length === 0}
                  style={{
                    padding: "10px 24px",
                    borderRadius: 8,
                    border: "none",
                    background:
                      newMappings.length > 0
                        ? "var(--gold)"
                        : "var(--surface-2)",
                    color:
                      newMappings.length > 0 ? "#0D0E11" : "var(--text-dim)",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor:
                      step === "saving" || newMappings.length === 0
                        ? "not-allowed"
                        : "pointer",
                    fontFamily: "inherit",
                    opacity: step === "saving" ? 0.7 : 1,
                  }}
                >
                  {step === "saving"
                    ? "Saving..."
                    : `Save ${newMappings.length} mappings →`}
                </button>
              </div>
            </>
          )}

          {/* Done state */}
          {step === "done" && (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontSize: 13, color: "#3DAA6E" }}>
                ✓ {savedCount} new TCGdex IDs saved to your sets table. You can
                now run{" "}
                <code
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    padding: "1px 5px",
                    borderRadius: 3,
                    fontSize: 11,
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  POST /sync/prices/tcgdex
                </code>{" "}
                in Postman.
              </div>
              <button
                onClick={() => {
                  setStep("idle");
                  setMappings([]);
                  setError("");
                }}
                style={{
                  padding: "7px 14px",
                  borderRadius: 7,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-dim)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                Reset
              </button>
            </div>
          )}

          {error && step === "idle" && (
            <div style={{ fontSize: 12, color: "#C94C4C", marginTop: 10 }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
