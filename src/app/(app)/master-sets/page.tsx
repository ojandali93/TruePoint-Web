/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import api from "../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SetProgress {
  setId: string;
  setName: string;
  seriesName: string | null;
  logoUrl: string | null;
  totalCards: number;
  totalVariants: number;
  ownedVariants: number;
  completionPct: number;
  missingCards: number;
  missingVariants: number;
  isTracked: boolean;
}

interface PlanLimit {
  allowed: boolean;
  current: number;
  limit: number | null;
  plan: string;
}

interface AllSet {
  id: string;
  name: string;
  series: string;
  logo_url: string | null;
  release_date: string | null;
}

// ─── Progress ring ────────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 56 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color =
    pct === 100
      ? "#10B981"
      : pct >= 75
        ? "#3B82F6"
        : pct >= 40
          ? "#F59E0B"
          : "#6B7280";

  return (
    <svg
      width={size}
      height={size}
      style={{ transform: "rotate(-90deg)", flexShrink: 0 }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill='none'
        stroke='var(--border)'
        strokeWidth={5}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill='none'
        stroke={color}
        strokeWidth={5}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
      <text
        x='50%'
        y='50%'
        textAnchor='middle'
        dominantBaseline='middle'
        style={{
          transform: "rotate(90deg)",
          transformOrigin: "50% 50%",
          fontSize: size < 50 ? 9 : 11,
          fontFamily: "DM Mono, monospace",
          fontWeight: 600,
          fill: color,
        }}
      >
        {pct}%
      </text>
    </svg>
  );
}

// ─── Tracked set card ─────────────────────────────────────────────────────────

function TrackedSetCard({
  set,
  onUntrack,
}: {
  set: SetProgress;
  onUntrack: () => void;
}) {
  const router = useRouter();
  const [untracking, setUntracking] = useState(false);

  const handleUntrack = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setUntracking(true);
    try {
      await api.delete(`/master-sets/${set.setId}/track`);
      onUntrack();
    } catch {
      setUntracking(false);
    }
  };

  const statusColor =
    set.completionPct === 100
      ? "#10B981"
      : set.completionPct >= 75
        ? "#3B82F6"
        : set.completionPct >= 40
          ? "#F59E0B"
          : "#6B7280";

  return (
    <div
      onClick={() => router.push(`/master-sets/${set.setId}`)}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "18px 20px",
        cursor: "pointer",
        transition: "all 0.15s ease",
        display: "flex",
        gap: 16,
        alignItems: "center",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = statusColor;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Set logo */}
      <div
        style={{
          width: 48,
          height: 48,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {set.logoUrl ? (
          <img
            src={set.logoUrl}
            alt={set.setName}
            style={{ maxWidth: 48, maxHeight: 48, objectFit: "contain" }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              background: "var(--surface-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            📦
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 2,
          }}
        >
          {set.setName}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-dim)",
            fontFamily: "DM Mono, monospace",
            marginBottom: 6,
          }}
        >
          {set.seriesName}
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            fontSize: 11,
            color: "var(--text-dim)",
          }}
        >
          <span style={{ color: statusColor }}>
            {set.ownedVariants}/{set.totalVariants} variants
          </span>
          {set.missingCards > 0 && (
            <span>{set.missingCards} cards missing</span>
          )}
          {set.completionPct === 100 && (
            <span style={{ color: "#10B981" }}>✓ Complete!</span>
          )}
        </div>
      </div>

      {/* Progress ring */}
      <ProgressRing pct={set.completionPct} />

      {/* Untrack */}
      <button
        onClick={handleUntrack}
        disabled={untracking}
        style={{
          border: "none",
          background: "transparent",
          color: "var(--text-dim)",
          cursor: "pointer",
          padding: "4px 6px",
          fontSize: 14,
          opacity: untracking ? 0.5 : 1,
        }}
        title='Stop tracking'
      >
        ✕
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MasterSetsPage() {
  const [tracked, setTracked] = useState<SetProgress[]>([]);
  const [limit, setLimit] = useState<PlanLimit | null>(null);
  const [allSets, setAllSets] = useState<AllSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBrowse, setShowBrowse] = useState(false);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [upgradeMsg, setUpgradeMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get<{
        data: { sets: SetProgress[]; limit: PlanLimit };
      }>("/master-sets");
      setTracked(res.data.data.sets);
      setLimit(res.data.data.limit);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadAllSets = async () => {
    if (allSets.length) {
      setShowBrowse(true);
      return;
    }
    const res = await api.get<{ data: AllSet[] }>("/cards/sets");
    setAllSets(res.data.data ?? []);
    setShowBrowse(true);
  };

  const handleTrack = async (setId: string) => {
    setAdding(setId);
    setUpgradeMsg("");
    try {
      await api.post(`/master-sets/${setId}/track`);
      await load();
      setShowBrowse(false);
    } catch (err: any) {
      if (err?.response?.data?.upgradeRequired) {
        setUpgradeMsg(err.response.data.error);
        setShowBrowse(false);
      }
    } finally {
      setAdding(null);
    }
  };

  const trackedIds = new Set(tracked.map((s) => s.setId));
  const filteredSets = allSets.filter(
    (s) =>
      !trackedIds.has(s.id) &&
      (!search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.series?.toLowerCase().includes(search.toLowerCase())),
  );

  const atLimit = limit && !limit.allowed;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 28,
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
            COLLECTION
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: 4,
            }}
          >
            Master Sets
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Track your completion across every set — cards and variants.
          </p>
        </div>
        <button
          onClick={loadAllSets}
          style={{
            padding: "10px 20px",
            borderRadius: 9,
            border: "none",
            background: "var(--gold)",
            color: "#0D0E11",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          + Track a Set
        </button>
      </div>

      {/* Plan limit bar */}
      {limit?.plan === "free" && (
        <div
          style={{
            background: "rgba(201,168,76,0.06)",
            border: "1px solid rgba(201,168,76,0.2)",
            borderRadius: 10,
            padding: "12px 18px",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Free plan:{" "}
            <span style={{ color: "var(--gold)", fontWeight: 500 }}>
              {limit.current}/{limit.limit} sets
            </span>{" "}
            tracked. Upgrade to track unlimited sets.
          </div>
          <a
            href='/settings/billing'
            style={{
              fontSize: 11,
              color: "var(--gold)",
              fontFamily: "DM Mono, monospace",
              textDecoration: "none",
              padding: "4px 12px",
              border: "1px solid rgba(201,168,76,0.4)",
              borderRadius: 6,
            }}
          >
            Upgrade →
          </a>
        </div>
      )}

      {/* Upgrade error */}
      {upgradeMsg && (
        <div
          style={{
            background: "rgba(201,68,68,0.08)",
            border: "1px solid rgba(201,68,68,0.25)",
            borderRadius: 10,
            padding: "12px 18px",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, color: "#C94C4C" }}>{upgradeMsg}</span>
          <a
            href='/settings/billing'
            style={{
              fontSize: 11,
              color: "var(--gold)",
              textDecoration: "none",
              padding: "4px 12px",
              border: "1px solid rgba(201,168,76,0.4)",
              borderRadius: 6,
            }}
          >
            Upgrade →
          </a>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: "var(--text-dim)",
            fontSize: 13,
          }}
        >
          Loading...
        </div>
      )}

      {/* Tracked sets */}
      {!loading && tracked.length === 0 && !showBrowse && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 24px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 16 }}>🏆</div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: 8,
            }}
          >
            No sets tracked yet
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              marginBottom: 20,
            }}
          >
            Pick a set to start tracking your completion progress.
          </div>
          <button
            onClick={loadAllSets}
            style={{
              padding: "10px 24px",
              borderRadius: 9,
              border: "none",
              background: "var(--gold)",
              color: "#0D0E11",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Browse Sets
          </button>
        </div>
      )}

      {!loading && tracked.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tracked.map((set) => (
            <TrackedSetCard
              key={set.setId}
              set={set}
              onUntrack={() =>
                setTracked((prev) => prev.filter((s) => s.setId !== set.setId))
              }
            />
          ))}
        </div>
      )}

      {/* Browse sets panel */}
      {showBrowse && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 200,
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
              borderRadius: 14,
              width: "100%",
              maxWidth: 560,
              maxHeight: "80vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "18px 20px",
                borderBottom: "1px solid var(--border)",
                background: "var(--surface-2)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--gold)",
                    fontFamily: "DM Mono, monospace",
                    letterSpacing: "0.08em",
                    marginBottom: 2,
                  }}
                >
                  TRACK A SET
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  {atLimit
                    ? `Limit reached (${limit?.limit} sets on free plan)`
                    : "Choose a set to track"}
                </div>
              </div>
              <button
                onClick={() => setShowBrowse(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--text-dim)",
                  fontSize: 18,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {atLimit ? (
              <div style={{ padding: 32, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>⭐</div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    marginBottom: 8,
                  }}
                >
                  Upgrade to track unlimited sets
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginBottom: 20,
                  }}
                >
                  Free plan allows {limit?.limit} tracked sets. Upgrade to
                  Collector or Pro for unlimited.
                </div>
                <a
                  href='/settings/billing'
                  style={{
                    display: "inline-block",
                    padding: "10px 28px",
                    borderRadius: 9,
                    background: "var(--gold)",
                    color: "#0D0E11",
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  View Plans →
                </a>
              </div>
            ) : (
              <>
                <div
                  style={{
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--border)",
                    flexShrink: 0,
                  }}
                >
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder='Search sets...'
                    autoFocus
                    style={{
                      width: "100%",
                      background: "var(--surface-2)",
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
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {filteredSets.map((set) => (
                    <button
                      key={set.id}
                      onClick={() => handleTrack(set.id)}
                      disabled={adding === set.id}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        border: "none",
                        borderBottom: "1px solid var(--border)",
                        background: "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        opacity: adding === set.id ? 0.6 : 1,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--text-primary)",
                            fontWeight: 500,
                          }}
                        >
                          {set.name}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--text-dim)",
                            fontFamily: "DM Mono, monospace",
                            marginTop: 2,
                          }}
                        >
                          {set.series} · {set.id}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: "var(--gold)" }}>
                        {adding === set.id ? "Adding..." : "+ Track"}
                      </span>
                    </button>
                  ))}
                  {filteredSets.length === 0 && (
                    <div
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        fontSize: 12,
                        color: "var(--text-dim)",
                      }}
                    >
                      {search
                        ? "No sets match your search"
                        : "All sets are already tracked"}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
