/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useCallback } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import api from "../../../lib/api";
import SyncPanel from "@/components/admin/SyncPanel";
import UsersListPanel from "@/components/admin/UsersListPanel";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserStats {
  totalUsers: number;
  newLast30Days: number;
  newLast7Days: number;
  subscriptions: {
    free: number;
    collector: number;
    pro: number;
    trialing: number;
    canceled: number;
    pastDue: number;
    totalPaid: number;
    conversionRate: number;
  };
}

interface CollectionStats {
  inventory: {
    totalItems: number;
    byType: Record<string, number>;
    uniqueUsers: number;
    avgSizePerUser: number;
  };
  masterSets: {
    totalTrackedSets: number;
    usersTrackingSets: number;
    avgSetsPerUser: number;
    mostTracked: { setId: string; count: number }[];
  };
  portfolio: {
    totalSnapshots: number;
    usersWithPortfolio: number;
    avgPortfolioValue: number;
    totalPortfolioValue: number;
  };
  centering: { totalReports: number };
  database: {
    totalCards: number;
    totalSets: number;
    cardsWithPrices: number;
    priceCoveragePct: number;
  };
}

interface ErrorLog {
  id: string;
  created_at: string;
  severity: "warning" | "error" | "critical";
  source: string;
  message: string;
  stack_trace?: string;
  request_path?: string;
  request_method?: string;
  metadata?: Record<string, unknown>;
  resolved: boolean;
  user?: { id: string; username?: string; full_name?: string } | null;
}

interface ActivityLog {
  id: string;
  created_at: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
  duration_ms?: number;
  user?: { id: string; username?: string; full_name?: string } | null;
}

type FlagAudience = "off" | "allowlist" | "admins" | "percentage" | "everyone";

interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  audience: FlagAudience;
  allowed_user_ids: string[];
  rollout_percentage: number;
  description?: string;
  updated_at: string;
}

interface FlagUserResult {
  id: string;
  username?: string;
  full_name?: string;
}

// Mirrors server/src/constants/featureFlagKeys.ts's KnownFlag — served via
// GET /admin/flags/known-keys, not imported directly (separate codebase).
interface KnownFlag {
  key: string;
  label: string;
  description: string;
}

interface GradingCost {
  id: string;
  company: string;
  tier: string;
  cost_usd: number;
  turnaround?: string;
}

interface AppSetting {
  key: string;
  value: unknown;
  description?: string;
  updated_at: string;
}

type Tab =
  | "users"
  | "collection"
  | "platform_users"
  | "errors"
  | "activity"
  | "flags"
  | "costs"
  | "settings"
  | "feedback"
  | "satisfaction"
  | "sync";
// ─── Shared UI ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color = "var(--text-primary)",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
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
          letterSpacing: "0.07em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color,
          fontFamily: "DM Mono, monospace",
          marginBottom: sub ? 2 : 0,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{sub}</div>
      )}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        fontSize: 10,
        color: "var(--text-dim)",
        fontFamily: "DM Mono, monospace",
        letterSpacing: "0.08em",
        marginBottom: 12,
        marginTop: 24,
        paddingBottom: 6,
        borderBottom: "1px solid var(--border)",
      }}
    >
      {title}
    </div>
  );
}

function Loader() {
  return (
    <div style={{ padding: 60, textAlign: "center", color: "var(--text-dim)" }}>
      Loading...
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div
      style={{
        padding: "40px 0",
        textAlign: "center",
        color: "var(--text-dim)",
        fontSize: 13,
      }}
    >
      {msg}
    </div>
  );
}

const sevColor = (s: string) =>
  s === "critical" ? "#EF4444" : s === "error" ? "#F59E0B" : "#6B7280";

const catColor = (c: string) =>
  c === "support"
    ? "var(--gold)"
    : c === "bug"
      ? "#EF4444"
      : c === "feature"
        ? "#3B82F6"
        : c === "general"
          ? "#8B5CF6"
          : "#6B7280";

const fmtDate = (d: string) =>
  new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// ─── User Analytics (existing) ──────────────────────────────────────────────

// ─── User analytics tab ───────────────────────────────────────────────────────

function UserAnalytics() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: UserStats }>("/admin/analytics/users")
      .then((r) => setStats(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div
        style={{ padding: 60, textAlign: "center", color: "var(--text-dim)" }}
      >
        Loading...
      </div>
    );
  if (!stats) return null;

  const total = stats.totalUsers || 1;

  return (
    <div>
      <SectionHeader title='USER OVERVIEW' />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 24,
        }}
      >
        <StatCard
          label='TOTAL USERS'
          value={stats.totalUsers.toLocaleString()}
        />
        <StatCard
          label='NEW (7 DAYS)'
          value={stats.newLast7Days}
          color='#10B981'
        />
        <StatCard
          label='NEW (30 DAYS)'
          value={stats.newLast30Days}
          color='#3B82F6'
        />
        <StatCard
          label='PAID USERS'
          value={stats.subscriptions.totalPaid}
          color='var(--gold)'
          sub={`${stats.subscriptions.conversionRate}% conversion`}
        />
      </div>

      <SectionHeader title='SUBSCRIPTION BREAKDOWN' />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          marginBottom: 24,
        }}
      >
        <StatCard
          label='FREE TIER'
          value={stats.subscriptions.free}
          sub={`${Math.round((stats.subscriptions.free / total) * 100)}% of users`}
          color='#6B7280'
        />
        <StatCard
          label='COLLECTOR'
          value={stats.subscriptions.collector}
          sub={`${Math.round((stats.subscriptions.collector / total) * 100)}% of users`}
          color='#3B82F6'
        />
        <StatCard
          label='PRO'
          value={stats.subscriptions.pro}
          sub={`${Math.round((stats.subscriptions.pro / total) * 100)}% of users`}
          color='var(--gold)'
        />
      </div>

      <SectionHeader title='SUBSCRIPTION STATUS' />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
        }}
      >
        <StatCard
          label='TRIALING'
          value={stats.subscriptions.trialing}
          color='#F59E0B'
        />
        <StatCard
          label='CANCELED'
          value={stats.subscriptions.canceled}
          color='#EF4444'
        />
        <StatCard
          label='PAST DUE'
          value={stats.subscriptions.pastDue}
          color='#EF4444'
        />
      </div>

      {/* Visual breakdown bar */}
      <div
        style={{
          marginTop: 24,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "16px 18px",
        }}
      >
        <div
          style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 10 }}
        >
          USER DISTRIBUTION
        </div>
        <div
          style={{
            height: 24,
            borderRadius: 6,
            overflow: "hidden",
            display: "flex",
          }}
        >
          {[
            {
              label: "Free",
              count: stats.subscriptions.free,
              color: "#374151",
            },
            {
              label: "Trial",
              count: stats.subscriptions.trialing,
              color: "#F59E0B",
            },
            {
              label: "Collector",
              count: stats.subscriptions.collector,
              color: "#3B82F6",
            },
            { label: "Pro", count: stats.subscriptions.pro, color: "#C9A84C" },
          ]
            .filter((s) => s.count > 0)
            .map((s) => (
              <div
                key={s.label}
                title={`${s.label}: ${s.count}`}
                style={{
                  width: `${(s.count / total) * 100}%`,
                  background: s.color,
                  transition: "width 0.5s ease",
                }}
              />
            ))}
        </div>
        <div
          style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}
        >
          {[
            { label: "Free", color: "#374151" },
            { label: "Trial", color: "#F59E0B" },
            { label: "Collector", color: "#3B82F6" },
            { label: "Pro", color: "#C9A84C" },
          ].map((l) => (
            <div
              key={l.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                color: "var(--text-dim)",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: l.color,
                }}
              />
              {l.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Collection Analytics (existing) ────────────────────────────────────────

// ─── Collection analytics tab ─────────────────────────────────────────────────

function CollectionAnalytics() {
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: CollectionStats }>("/admin/analytics/collection")
      .then((r) => setStats(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div
        style={{ padding: 60, textAlign: "center", color: "var(--text-dim)" }}
      >
        Loading...
      </div>
    );
  if (!stats) return null;

  const fmt = (v: number) =>
    v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`;

  return (
    <div>
      <SectionHeader title='INVENTORY' />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 24,
        }}
      >
        <StatCard
          label='TOTAL ITEMS'
          value={stats.inventory.totalItems.toLocaleString()}
        />
        <StatCard
          label='UNIQUE COLLECTORS'
          value={stats.inventory.uniqueUsers}
        />
        <StatCard
          label='AVG COLLECTION SIZE'
          value={stats.inventory.avgSizePerUser}
          sub='cards per user'
        />
        <StatCard
          label='RAW CARDS'
          value={stats.inventory.byType.raw_card?.toLocaleString() ?? 0}
          color='#3B82F6'
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10,
          marginBottom: 24,
        }}
      >
        <StatCard
          label='GRADED CARDS'
          value={stats.inventory.byType.graded_card?.toLocaleString() ?? 0}
          color='var(--gold)'
        />
        <StatCard
          label='SEALED PRODUCTS'
          value={stats.inventory.byType.sealed_product?.toLocaleString() ?? 0}
          color='#8B5CF6'
        />
      </div>

      <SectionHeader title='PORTFOLIO' />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          marginBottom: 24,
        }}
      >
        <StatCard
          label='USERS WITH PORTFOLIO'
          value={stats.portfolio.usersWithPortfolio}
        />
        <StatCard
          label='AVG PORTFOLIO VALUE'
          value={fmt(stats.portfolio.avgPortfolioValue)}
          color='var(--gold)'
        />
        <StatCard
          label='TOTAL VALUE TRACKED'
          value={fmt(stats.portfolio.totalPortfolioValue)}
          color='#10B981'
        />
      </div>

      <SectionHeader title='MASTER SETS' />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          marginBottom: 24,
        }}
      >
        <StatCard
          label='SETS BEING TRACKED'
          value={stats.masterSets.totalTrackedSets}
        />
        <StatCard
          label='USERS TRACKING'
          value={stats.masterSets.usersTrackingSets}
        />
        <StatCard
          label='AVG SETS PER USER'
          value={stats.masterSets.avgSetsPerUser}
        />
      </div>

      {/* Most tracked sets */}
      {stats.masterSets.mostTracked.length > 0 && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            overflow: "hidden",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              padding: "10px 16px",
              background: "var(--surface-2)",
              borderBottom: "1px solid var(--border)",
              fontSize: 10,
              color: "var(--text-dim)",
              fontFamily: "DM Mono, monospace",
              letterSpacing: "0.06em",
            }}
          >
            MOST TRACKED SETS
          </div>
          {stats.masterSets.mostTracked.slice(0, 8).map((s, i) => (
            <div
              key={s.setId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "9px 16px",
                borderBottom: i < 7 ? "1px solid var(--border)" : "none",
                fontSize: 12,
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>{s.setId}</span>
              <span
                style={{
                  fontFamily: "DM Mono, monospace",
                  color: "var(--gold)",
                }}
              >
                {s.count} users
              </span>
            </div>
          ))}
        </div>
      )}

      <SectionHeader title='DATABASE & PRICING' />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 24,
        }}
      >
        <StatCard
          label='TOTAL CARDS'
          value={stats.database.totalCards.toLocaleString()}
        />
        <StatCard label='TOTAL SETS' value={stats.database.totalSets} />
        <StatCard
          label='CARDS WITH PRICES'
          value={stats.database.cardsWithPrices.toLocaleString()}
          color='#10B981'
        />
        <StatCard
          label='PRICE COVERAGE'
          value={`${stats.database.priceCoveragePct}%`}
          color={stats.database.priceCoveragePct > 90 ? "#10B981" : "#F59E0B"}
        />
      </div>

      <SectionHeader title='OTHER' />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10,
        }}
      >
        <StatCard
          label='CENTERING REPORTS'
          value={stats.centering.totalReports.toLocaleString()}
        />
      </div>
    </div>
  );
}

// ─── Error Logs ───────────────────────────────────────────────────────────────

function ErrorLogs() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [total, setTotal] = useState(0);
  const [severity, setSeverity] = useState("");
  const [resolved, setResolved] = useState("false");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const p = new URLSearchParams({ limit: "50", resolved });
      if (severity) p.set("severity", severity);
      const [lr, sr] = await Promise.all([
        api.get<{ data: { logs: ErrorLog[]; total: number } }>(
          `/admin/logs/errors?${p}`,
        ),
        api.get<{ data: Record<string, number> }>("/admin/logs/errors/summary"),
      ]);
      setLogs(lr.data.data.logs);
      setTotal(lr.data.data.total);
      setSummary(sr.data.data);
    } catch (err: any) {
      // Previously this had no catch — a failing request left the tab silently
      // empty with no clue why. Surface it instead.
      console.error("[Admin] error logs failed to load:", err);
      setLoadError(
        err?.response?.data?.error ??
          err?.message ??
          "Failed to load error logs.",
      );
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [severity, resolved]);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(t);
  }, [load]);

  const resolve = async (id: string) => {
    setResolving(id);
    try {
      await api.patch(`/admin/logs/errors/${id}/resolve`);
      load();
    } finally {
      setResolving(null);
    }
  };

  return (
    <div>
      {loadError && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: 8,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#EF4444",
            fontSize: 13,
          }}
        >
          {loadError}
        </div>
      )}
      {summary && (
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          {[
            { label: "Critical", key: "critical", color: "#EF4444" },
            { label: "Errors", key: "error", color: "#F59E0B" },
            { label: "Warnings", key: "warning", color: "#6B7280" },
            { label: "Unresolved", key: "unresolved", color: "var(--gold)" },
          ].map((b) => (
            <div
              key={b.key}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 14px",
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: b.color,
                  fontFamily: "DM Mono, monospace",
                }}
              >
                {summary[b.key] ?? 0}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                {b.label}
              </span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["", "critical", "error", "warning"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSeverity(s)}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: `1px solid ${severity === s ? sevColor(s || "none") || "var(--gold)" : "var(--border)"}`,
              background:
                severity === s ? `${sevColor(s || "x")}22` : "transparent",
              color:
                severity === s
                  ? sevColor(s) || "var(--gold)"
                  : "var(--text-dim)",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {s || "All"}
          </button>
        ))}
        <select
          value={resolved}
          onChange={(e) => setResolved(e.target.value)}
          style={{
            marginLeft: "auto",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            color: "var(--text-primary)",
            fontFamily: "inherit",
            outline: "none",
          }}
        >
          <option value='false'>Unresolved</option>
          <option value='true'>Resolved</option>
          <option value=''>All</option>
        </select>
        <span
          style={{
            fontSize: 12,
            color: "var(--text-dim)",
            alignSelf: "center",
          }}
        >
          {total}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {loading ? (
          <Loader />
        ) : logs.length === 0 ? (
          <EmptyState msg='No errors found 🎉' />
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              style={{
                background: "var(--surface)",
                border: `1px solid ${expanded === log.id ? sevColor(log.severity) : "var(--border)"}`,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 16px",
                  cursor: "pointer",
                }}
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
              >
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 7px",
                    borderRadius: 4,
                    background: `${sevColor(log.severity)}22`,
                    color: sevColor(log.severity),
                    fontFamily: "DM Mono, monospace",
                    flexShrink: 0,
                    textTransform: "uppercase",
                  }}
                >
                  {log.severity}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--gold)",
                    fontFamily: "DM Mono, monospace",
                    flexShrink: 0,
                  }}
                >
                  {log.source}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-primary)",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {log.message}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-dim)",
                    flexShrink: 0,
                  }}
                >
                  {fmtDate(log.created_at)}
                </span>
                {!log.resolved ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resolve(log.id);
                    }}
                    disabled={resolving === log.id}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 6,
                      border: "1px solid #10B981",
                      background: "rgba(16,185,129,0.08)",
                      color: "#10B981",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      flexShrink: 0,
                    }}
                  >
                    {resolving === log.id ? "…" : "Resolve"}
                  </button>
                ) : (
                  <span
                    style={{
                      fontSize: 10,
                      color: "#10B981",
                      fontFamily: "DM Mono, monospace",
                      flexShrink: 0,
                    }}
                  >
                    ✓ DONE
                  </span>
                )}
              </div>
              {expanded === log.id && (
                <div
                  style={{
                    borderTop: "1px solid var(--border)",
                    padding: "12px 16px",
                    background: "var(--surface-2)",
                  }}
                >
                  {log.request_path && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-dim)",
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ color: "var(--text-secondary)" }}>
                        {log.request_method}
                      </span>{" "}
                      {log.request_path}
                    </div>
                  )}
                  {log.user && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-dim)",
                        marginBottom: 6,
                      }}
                    >
                      User:{" "}
                      {log.user.full_name ?? log.user.username ?? log.user.id}
                    </div>
                  )}
                  {log.metadata && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-dim)",
                        marginBottom: 6,
                      }}
                    >
                      Metadata:{" "}
                      <code style={{ color: "var(--text-secondary)" }}>
                        {JSON.stringify(log.metadata)}
                      </code>
                    </div>
                  )}
                  {log.stack_trace && (
                    <pre
                      style={{
                        fontSize: 10,
                        color: "#F59E0B",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        padding: "10px 12px",
                        overflow: "auto",
                        maxHeight: 200,
                        fontFamily: "DM Mono, monospace",
                        margin: 0,
                      }}
                    >
                      {log.stack_trace.slice(0, 1500)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Activity Logs ────────────────────────────────────────────────────────────

function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: "50" });
      if (actionFilter) p.set("action", actionFilter);
      const r = await api.get<{ data: { logs: ActivityLog[]; total: number } }>(
        `/admin/logs/activity?${p}`,
      );
      setLogs(r.data.data.logs);
      setTotal(r.data.data.total);
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(t);
  }, [load]);

  const ac = (a: string) =>
    a.includes("error")
      ? "#EF4444"
      : a.includes("grading")
        ? "var(--gold)"
        : a.includes("inventory")
          ? "#3B82F6"
          : a.includes("auth")
            ? "#8B5CF6"
            : "var(--text-dim)";

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder='Filter by action (e.g. inventory, grading)…'
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "7px 12px",
            fontSize: 12,
            color: "var(--text-primary)",
            fontFamily: "inherit",
            outline: "none",
            width: 300,
          }}
        />
        <button
          onClick={load}
          style={{
            padding: "7px 14px",
            borderRadius: 8,
            border: "none",
            background: "var(--surface-3)",
            color: "var(--text-secondary)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Filter
        </button>
        <span
          style={{
            fontSize: 12,
            color: "var(--text-dim)",
            alignSelf: "center",
          }}
        >
          {total} events
        </span>
      </div>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "180px 1fr 160px 80px",
            padding: "9px 16px",
            background: "var(--surface-2)",
            borderBottom: "1px solid var(--border)",
            fontSize: 10,
            color: "var(--text-dim)",
            fontFamily: "DM Mono, monospace",
            letterSpacing: "0.06em",
          }}
        >
          <span>ACTION</span>
          <span>USER / RESOURCE</span>
          <span>TIME</span>
          <span>MS</span>
        </div>
        {loading ? (
          <Loader />
        ) : logs.length === 0 ? (
          <EmptyState msg='No activity yet' />
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr 160px 80px",
                padding: "9px 16px",
                borderBottom: "1px solid var(--border)",
                alignItems: "center",
                fontSize: 12,
              }}
            >
              <span
                style={{
                  color: ac(log.action),
                  fontFamily: "DM Mono, monospace",
                  fontSize: 11,
                }}
              >
                {log.action}
              </span>
              <span
                data-ph-mask
                style={{
                  color: "var(--text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {log.user?.full_name ?? log.user?.username ?? "—"}
                {log.resource_type && (
                  <span style={{ color: "var(--text-dim)" }}>
                    {" "}
                    · {log.resource_type}
                  </span>
                )}
              </span>
              <span style={{ color: "var(--text-dim)", fontSize: 11 }}>
                {fmtDate(log.created_at)}
              </span>
              <span
                style={{
                  color: "var(--text-dim)",
                  fontFamily: "DM Mono, monospace",
                  fontSize: 11,
                }}
              >
                {log.duration_ms ?? "—"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Feature Flags ────────────────────────────────────────────────────────────
//
// Resolution precedence (mirrors featureFlag.service.ts on the backend):
//   1. enabled=false            → off for everyone, no matter what
//   2. user in allowed_user_ids → on, regardless of audience (additive)
//   3. audience rules apply

const AUDIENCE_LABEL: Record<FlagAudience, string> = {
  off: "Off",
  allowlist: "Allowlist",
  admins: "Admins",
  percentage: "Percentage",
  everyone: "Everyone",
};

const ALL_AUDIENCES: FlagAudience[] = [
  "off",
  "allowlist",
  "admins",
  "percentage",
  "everyone",
];

function flagStatusText(f: FeatureFlag): string {
  if (!f.enabled) return "Off — killed";
  switch (f.audience) {
    case "off":
      return "On — nobody targeted";
    case "allowlist":
      return `On — ${f.allowed_user_ids.length} user${f.allowed_user_ids.length === 1 ? "" : "s"}`;
    case "admins":
      return "On — admins only";
    case "percentage":
      return `On — ${f.rollout_percentage}% rollout`;
    case "everyone":
      return "On — everyone";
    default:
      return "On";
  }
}

function flagStatusColor(f: FeatureFlag): string {
  if (!f.enabled || f.audience === "off") return "var(--text-dim)";
  if (f.audience === "everyone") return "#10B981";
  return "var(--gold)";
}

function FeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [editing, setEditing] = useState<FeatureFlag | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () =>
    api
      .get<{ data: FeatureFlag[] }>("/admin/flags")
      .then((r) => setFlags(r.data.data ?? []));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  // Master kill switch only — the fast path, doesn't need the full editor.
  const toggle = async (key: string, cur: boolean) => {
    setToggling(key);
    try {
      const r = await api.patch<{ data: FeatureFlag }>(`/admin/flags/${key}`, {
        enabled: !cur,
      });
      setFlags((prev) => prev.map((f) => (f.key === key ? r.data.data : f)));
    } finally {
      setToggling(null);
    }
  };

  if (loading) return <Loader />;
  return (
    <div>
      <div
        style={{
          background: "rgba(201,168,76,0.06)",
          border: "1px solid rgba(201,168,76,0.2)",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 16,
          fontSize: 12,
          color: "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span>
          Changes take effect immediately on the next API request — no deploy
          needed. The master switch must be ON for audience targeting below it
          to matter.
        </span>
        <button
          onClick={() => setCreating(true)}
          style={{
            flexShrink: 0,
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            background: "var(--gold)",
            color: "var(--charcoal, #0E0E12)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          + New Flag
        </button>
      </div>

      {flags.length === 0 ? (
        <div
          style={{
            padding: "40px 0",
            textAlign: "center",
            color: "var(--text-dim)",
            fontSize: 13,
          }}
        >
          No feature flags yet. Create one to get started.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {flags.map((flag) => (
            <div
              key={flag.id}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "14px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      marginBottom: 2,
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {flag.key}
                  </div>
                  {flag.description && (
                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                      {flag.description}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setEditing(flag)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-secondary)",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    flexShrink: 0,
                  }}
                >
                  Configure
                </button>
                <button
                  onClick={() => toggle(flag.key, flag.enabled)}
                  disabled={toggling === flag.key}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    border: "none",
                    cursor: "pointer",
                    background: flag.enabled ? "#10B981" : "var(--surface-3)",
                    position: "relative",
                    transition: "background 0.2s",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 3,
                      left: flag.enabled ? 22 : 3,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.2s",
                    }}
                  />
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  paddingTop: 8,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    background: flagStatusColor(flag),
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: flagStatusColor(flag),
                  }}
                >
                  {flagStatusText(flag)}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-dim)",
                    marginLeft: "auto",
                  }}
                >
                  {new Date(flag.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <FlagEditorOverlay
          flag={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setFlags((prev) =>
              prev.map((f) => (f.key === updated.key ? updated : f)),
            );
            setEditing(null);
          }}
          onDeleted={(key) => {
            setFlags((prev) => prev.filter((f) => f.key !== key));
            setEditing(null);
          }}
        />
      )}

      {creating && (
        <CreateFlagOverlay
          onClose={() => setCreating(false)}
          onCreated={(created) => {
            setFlags((prev) =>
              [...prev, created].sort((a, b) => a.key.localeCompare(b.key)),
            );
            setCreating(false);
            setEditing(created); // straight into configuring the audience
          }}
        />
      )}
    </div>
  );
}

// ─── Shared overlay chrome ──────────────────────────────────────────────────

function FlagOverlayShell({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 24,
          width: 420,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

const flagLabelStyle: CSSProperties = {
  fontSize: 11,
  color: "var(--text-dim)",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const flagInputStyle: CSSProperties = {
  width: "100%",
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 12,
  color: "var(--text-primary)",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

function chipStyle(active: boolean): CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 8,
    border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
    background: active ? "rgba(201,168,76,0.1)" : "transparent",
    color: active ? "var(--gold)" : "var(--text-secondary)",
    fontSize: 12,
    fontWeight: active ? 700 : 400,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

// ─── Create flag ────────────────────────────────────────────────────────────

function CreateFlagOverlay({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (flag: FeatureFlag) => void;
}) {
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [knownFlags, setKnownFlags] = useState<KnownFlag[]>([]);

  useEffect(() => {
    api
      .get<{ data: KnownFlag[] }>("/admin/flags/known-keys")
      .then((r) => setKnownFlags(r.data.data ?? []))
      .catch(() => setKnownFlags([])); // suggestions are a nicety, not required
  }, []);

  const pickKnown = (flag: KnownFlag) => {
    setKey(flag.key);
    // Only prefill description if nothing's typed yet — don't clobber it.
    setDescription((prev) => prev || flag.description);
  };

  const submit = async () => {
    const normalized = key
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_");
    if (!normalized || normalized.length < 3) {
      setErr("Key must be at least 3 characters (letters, numbers, _).");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const r = await api.post<{ data: FeatureFlag }>("/admin/flags", {
        key: normalized,
        description: description.trim() || undefined,
      });
      onCreated(r.data.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create flag.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlagOverlayShell onClose={onClose}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "var(--text-primary)",
          marginBottom: 4,
        }}
      >
        New feature flag
      </div>
      <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 16 }}>
        Created dark: killed on, audience allowlist. Nobody sees it until you
        add a user.
      </div>

      {knownFlags.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={flagLabelStyle}>Connect to a feature already built</div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 8,
            }}
          >
            {knownFlags.map((f) => (
              <button
                key={f.key}
                onClick={() => pickKnown(f)}
                style={chipStyle(key === f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-dim)" }}>
            Clicking one fills the key below exactly as the code checks for it —
            no chance of a typo mismatch. Building something new instead? Just
            type its key below; it doesn&apos;t have to be on this list yet.
          </div>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <div style={flagLabelStyle}>Key</div>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder='regrade_tracker'
          autoFocus
          style={{ ...flagInputStyle, fontFamily: "DM Mono, monospace" }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={flagLabelStyle}>Description (optional)</div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder='What this gates'
          rows={3}
          style={{ ...flagInputStyle, resize: "vertical" }}
        />
      </div>

      {err && (
        <div style={{ fontSize: 11, color: "#C94C4C", marginBottom: 12 }}>
          {err}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onClose}
          disabled={saving}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: 8,
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
          onClick={submit}
          disabled={saving}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: 8,
            border: "none",
            background: "var(--gold)",
            color: "var(--charcoal, #0E0E12)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Creating…" : "Create"}
        </button>
      </div>
    </FlagOverlayShell>
  );
}

// ─── Edit flag (audience / allowlist / percentage) ─────────────────────────

function FlagEditorOverlay({
  flag,
  onClose,
  onSaved,
  onDeleted,
}: {
  flag: FeatureFlag;
  onClose: () => void;
  onSaved: (flag: FeatureFlag) => void;
  onDeleted: (key: string) => void;
}) {
  const [audience, setAudience] = useState<FlagAudience>(flag.audience);
  const [allowedIds, setAllowedIds] = useState<string[]>(flag.allowed_user_ids);
  const [allowedLabels, setAllowedLabels] = useState<Record<string, string>>(
    Object.fromEntries(flag.allowed_user_ids.map((id) => [id, id])),
  );
  const [percentage, setPercentage] = useState(String(flag.rollout_percentage));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<FlagUserResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      const q = userSearch.trim();
      setSearching(true);
      try {
        const r = await api.get<{
          data: { users: FlagUserResult[]; total: number };
        }>(`/admin/users?search=${encodeURIComponent(q)}&limit=20`);
        setUserResults(r.data.data.users ?? []);
      } catch {
        setUserResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [userSearch]);

  const addUser = (u: FlagUserResult) => {
    setAllowedIds((prev) => (prev.includes(u.id) ? prev : [...prev, u.id]));
    setAllowedLabels((prev) => ({
      ...prev,
      [u.id]: u.full_name ?? u.username ?? u.id,
    }));
  };

  const save = async () => {
    const pct = Math.max(0, Math.min(100, Number(percentage) || 0));
    setSaving(true);
    setErr(null);
    try {
      const r = await api.patch<{ data: FeatureFlag }>(
        `/admin/flags/${flag.key}`,
        {
          audience,
          allowed_user_ids: allowedIds,
          rollout_percentage: pct,
        },
      );
      onSaved(r.data.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await api.delete(`/admin/flags/${flag.key}`);
      onDeleted(flag.key);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete.");
      setDeleting(false);
    }
  };

  return (
    <FlagOverlayShell onClose={onClose}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "var(--text-primary)",
          fontFamily: "DM Mono, monospace",
          marginBottom: 2,
        }}
      >
        {flag.key}
      </div>
      {flag.description && (
        <div
          style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 12 }}
        >
          {flag.description}
        </div>
      )}
      <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 16 }}>
        The master switch (list view) must be ON for any of this to take effect.
        Allowlisted users always see the feature, regardless of audience below.
      </div>

      {/* Audience picker */}
      <div style={{ marginBottom: 16 }}>
        <div style={flagLabelStyle}>Audience</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {ALL_AUDIENCES.map((a) => (
            <button
              key={a}
              onClick={() => setAudience(a)}
              style={chipStyle(audience === a)}
            >
              {AUDIENCE_LABEL[a]}
            </button>
          ))}
        </div>
      </div>

      {/* Percentage */}
      {audience === "percentage" && (
        <div style={{ marginBottom: 16 }}>
          <div style={flagLabelStyle}>Rollout percentage</div>
          <input
            value={percentage}
            onChange={(e) =>
              setPercentage(e.target.value.replace(/[^0-9]/g, ""))
            }
            placeholder='0–100'
            style={flagInputStyle}
          />
          <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 6 }}>
            Stable per user — the same person always lands on the same side of
            the split.
          </div>
        </div>
      )}

      {/* Allowlist — additive to every audience, so always shown */}
      <div style={{ marginBottom: 16 }}>
        <div style={flagLabelStyle}>Allowlist ({allowedIds.length})</div>

        {allowedIds.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginBottom: 10,
            }}
          >
            {allowedIds.map((id) => (
              <div
                key={id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--surface-2)",
                  borderRadius: 8,
                  padding: "6px 10px",
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontSize: 11,
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {allowedLabels[id] ?? id}
                </span>
                <button
                  onClick={() =>
                    setAllowedIds((prev) => prev.filter((x) => x !== id))
                  }
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#C94C4C",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          placeholder='Search name or username to add… (this is where your tester account goes)'
          style={flagInputStyle}
        />
        {userSearch.trim() && (
          <div
            style={{
              marginTop: 6,
              maxHeight: 160,
              overflowY: "auto",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          >
            {searching ? (
              <div
                style={{
                  padding: 10,
                  fontSize: 11,
                  color: "var(--text-dim)",
                }}
              >
                Searching…
              </div>
            ) : userResults.length === 0 ? (
              <div
                style={{
                  padding: 10,
                  fontSize: 11,
                  color: "var(--text-dim)",
                }}
              >
                No matches.
              </div>
            ) : (
              userResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    addUser(u);
                    setUserSearch("");
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-primary)",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {u.full_name ?? u.username ?? "Unnamed"}
                  {u.username && (
                    <span style={{ color: "var(--text-dim)", marginLeft: 6 }}>
                      @{u.username}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {err && (
        <div style={{ fontSize: 11, color: "#C94C4C", marginBottom: 12 }}>
          {err}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={onClose}
          disabled={saving}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Close
        </button>
        <button
          onClick={save}
          disabled={saving}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: 8,
            border: "none",
            background: "var(--gold)",
            color: "var(--charcoal, #0E0E12)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
        <button
          onClick={remove}
          disabled={deleting}
          style={{
            width: "100%",
            padding: "8px 0",
            borderRadius: 8,
            border: "none",
            background: "#C94C4C",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            opacity: deleting ? 0.6 : 1,
          }}
        >
          {deleting
            ? "Deleting…"
            : confirmDelete
              ? "Tap again to confirm delete"
              : "Delete flag"}
        </button>
      </div>
    </FlagOverlayShell>
  );
}

// ─── Grading Costs ────────────────────────────────────────────────────────────

function GradingCosts() {
  const [costs, setCosts] = useState<GradingCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [editTA, setEditTA] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<{ data: GradingCost[] }>("/admin/grading-costs")
      .then((r) => setCosts(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  const save = async (id: string) => {
    setSaving(true);
    try {
      await api.patch(`/admin/grading-costs/${id}`, {
        costUsd: parseFloat(editVal),
        turnaround: editTA || undefined,
      });
      setCosts((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, cost_usd: parseFloat(editVal), turnaround: editTA }
            : c,
        ),
      );
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  const grouped = costs.reduce<Record<string, GradingCost[]>>((acc, c) => {
    if (!acc[c.company]) acc[c.company] = [];
    acc[c.company].push(c);
    return acc;
  }, {});

  return (
    <div>
      <div
        style={{
          background: "rgba(201,168,76,0.06)",
          border: "1px solid rgba(201,168,76,0.2)",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 16,
          fontSize: 12,
          color: "var(--text-secondary)",
        }}
      >
        These fees are used in the grading arbitrage calculator. Update them
        when companies change their pricing.
      </div>
      {Object.entries(grouped).map(([company, rows]) => (
        <div key={company} style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-secondary)",
              fontFamily: "DM Mono, monospace",
              letterSpacing: "0.08em",
              marginBottom: 8,
            }}
          >
            {company}
          </div>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {rows.map((cost, i) => (
              <div
                key={cost.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 100px 1fr 130px",
                  alignItems: "center",
                  padding: "11px 16px",
                  borderBottom:
                    i < rows.length - 1 ? "1px solid var(--border)" : "none",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-primary)",
                    textTransform: "capitalize",
                  }}
                >
                  {cost.tier.replace(/_/g, " ")}
                </span>
                {editing === cost.id ? (
                  <input
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    autoFocus
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--gold)",
                      borderRadius: 6,
                      padding: "5px 8px",
                      fontSize: 12,
                      color: "var(--text-primary)",
                      fontFamily: "DM Mono, monospace",
                      outline: "none",
                      width: "100%",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--gold)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    ${cost.cost_usd}
                  </span>
                )}
                {editing === cost.id ? (
                  <input
                    value={editTA}
                    onChange={(e) => setEditTA(e.target.value)}
                    placeholder='Turnaround'
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      padding: "5px 8px",
                      fontSize: 12,
                      color: "var(--text-primary)",
                      fontFamily: "inherit",
                      outline: "none",
                      width: "100%",
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                    {cost.turnaround ?? "—"}
                  </span>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    justifyContent: "flex-end",
                  }}
                >
                  {editing === cost.id ? (
                    <>
                      <button
                        onClick={() => save(cost.id)}
                        disabled={saving}
                        style={{
                          padding: "4px 12px",
                          borderRadius: 6,
                          border: "none",
                          background: "var(--gold)",
                          color: "#0D0E11",
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        {saving ? "…" : "Save"}
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          background: "transparent",
                          color: "var(--text-secondary)",
                          fontSize: 11,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setEditing(cost.id);
                        setEditVal(String(cost.cost_usd));
                        setEditTA(cost.turnaround ?? "");
                      }}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--text-secondary)",
                        fontSize: 11,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Settings + Sync ──────────────────────────────────────────────────────────

function PlatformSettings() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncSetId, setSyncSetId] = useState("");

  useEffect(() => {
    api
      .get<{ data: AppSetting[] }>("/admin/settings")
      .then((r) => setSettings(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  const saveSetting = async (key: string) => {
    setSaving(true);
    try {
      let v: unknown = editVal;
      try {
        v = JSON.parse(editVal);
      } catch {
        v = editVal;
      }
      await api.patch(`/admin/settings/${key}`, { value: v });
      setSettings((prev) =>
        prev.map((s) => (s.key === key ? { ...s, value: v } : s)),
      );
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const runSync = async (endpoint: string, label: string) => {
    setSyncing(label);
    setSyncResult(null);
    try {
      await api.post(endpoint);
      setSyncResult(`✓ ${label} started — watch server logs.`);
    } catch (err: any) {
      setSyncResult(`✗ Failed: ${err?.message}`);
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div style={{ maxWidth: 740 }}>
      <SectionHeader title='DATA SYNC' />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: "Sync Sets",
            desc: "Fetch set list from pokemontcg.io",
            endpoint: "/sync/sets",
            color: "#3B82F6",
          },
          {
            label: "Sync All Cards",
            desc: "Full card backfill — 30–90 min",
            endpoint: "/sync/cards",
            color: "#8B5CF6",
          },
          {
            label: "Map Sets → TCGAPIs",
            desc: "Link DB sets to TCGAPIs group IDs",
            endpoint: "/sync/tcgapis/map-sets",
            color: "#F59E0B",
          },
          {
            label: "Full TCGAPIs Sync",
            desc: "Variants + prices for all sets — 10–30 min",
            endpoint: "/sync/tcgapis/all",
            color: "var(--gold)",
          },
          {
            label: "Refresh Prices",
            desc: "Daily price refresh for all sets",
            endpoint: "/sync/tcgapis/prices",
            color: "#10B981",
          },
          {
            label: "Sync Set Images",
            desc: "Fill missing set logos/symbols from pokemontcg.io — only fills blanks, never overwrites",
            endpoint: "/sync/set-images",
            color: "#EC4899",
          },
        ].map((a) => (
          <div
            key={a.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "13px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  marginBottom: 2,
                }}
              >
                {a.label}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                {a.desc}
              </div>
            </div>
            <button
              onClick={() => runSync(a.endpoint, a.label)}
              disabled={syncing !== null}
              style={{
                padding: "7px 18px",
                borderRadius: 8,
                border: "none",
                background: syncing ? "var(--surface-2)" : a.color,
                color: syncing ? "var(--text-dim)" : "#0D0E11",
                fontSize: 12,
                fontWeight: 500,
                cursor: syncing ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                flexShrink: 0,
              }}
            >
              {syncing === a.label ? "Running…" : "Run"}
            </button>
          </div>
        ))}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "13px 18px",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: 2,
            }}
          >
            Sync Single Set
          </div>
          <div
            style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 10 }}
          >
            Sync one set by ID (e.g. sv8, swsh9)
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={syncSetId}
              onChange={(e) => setSyncSetId(e.target.value)}
              placeholder='Set ID'
              style={{
                flex: 1,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "7px 12px",
                fontSize: 12,
                color: "var(--text-primary)",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <button
              onClick={() =>
                syncSetId &&
                runSync(`/sync/tcgapis/set/${syncSetId}`, `Sync ${syncSetId}`)
              }
              disabled={!syncSetId || syncing !== null}
              style={{
                padding: "7px 18px",
                borderRadius: 8,
                border: "none",
                background:
                  syncSetId && !syncing ? "#10B981" : "var(--surface-2)",
                color: syncSetId && !syncing ? "#fff" : "var(--text-dim)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {syncing?.startsWith("Sync ") ? "Running…" : "Run"}
            </button>
          </div>
        </div>
      </div>

      {syncResult && (
        <div
          style={{
            marginBottom: 20,
            padding: "10px 14px",
            borderRadius: 8,
            background: syncResult.startsWith("✓")
              ? "rgba(16,185,129,0.08)"
              : "rgba(239,68,68,0.08)",
            border: `1px solid ${syncResult.startsWith("✓") ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
            fontSize: 13,
            color: syncResult.startsWith("✓") ? "#10B981" : "#EF4444",
          }}
        >
          {syncResult}
        </div>
      )}

      <SectionHeader title='APP SETTINGS' />
      {loading ? (
        <Loader />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {settings.map((s) => (
            <div
              key={s.key}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "13px 18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: editing === s.key ? 10 : 0,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      fontFamily: "DM Mono, monospace",
                      marginBottom: 2,
                    }}
                  >
                    {s.key}
                  </div>
                  {s.description && (
                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                      {s.description}
                    </div>
                  )}
                </div>
                {editing !== s.key && (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--gold)",
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      {JSON.stringify(s.value)}
                    </span>
                    <button
                      onClick={() => {
                        setEditing(s.key);
                        setEditVal(JSON.stringify(s.value));
                      }}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--text-secondary)",
                        fontSize: 11,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
              {editing === s.key && (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    autoFocus
                    style={{
                      flex: 1,
                      background: "var(--surface-2)",
                      border: "1px solid var(--gold)",
                      borderRadius: 8,
                      padding: "7px 12px",
                      fontSize: 12,
                      color: "var(--text-primary)",
                      fontFamily: "DM Mono, monospace",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={() => saveSetting(s.key)}
                    disabled={saving}
                    style={{
                      padding: "7px 14px",
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
                    {saving ? "…" : "Save"}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    style={{
                      padding: "7px 12px",
                      borderRadius: 8,
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
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Feedback & Support ───────────────────────────────────────────────────────

interface FeedbackRow {
  id: string;
  created_at: string;
  category: string;
  message: string;
  app_version: string | null;
  platform: string | null;
  contact_email: string | null;
  status: string;
  admin_notes: string | null;
  user_id: string | null;
  user?: {
    id: string;
    username: string | null;
    full_name: string | null;
  } | null;
}

function Feedback() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("open");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (status) p.set("status", status);
      if (category) p.set("category", category);
      const r = await api.get<{
        data: { feedback: FeedbackRow[]; total: number };
      }>(`/admin/feedback?${p.toString()}`);
      setRows(r.data.data.feedback);
      setTotal(r.data.data.total);
    } finally {
      setLoading(false);
    }
  }, [status, category]);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(t);
  }, [load]);

  const setRowStatus = async (id: string, next: string) => {
    setWorking(id);
    try {
      await api.patch(`/admin/feedback/${id}`, { status: next });
      load();
    } finally {
      setWorking(null);
    }
  };

  return (
    <div>
      {/* Filters — category chips + status select, matching Error Logs */}
      <div
        style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}
      >
        {(["", "support", "bug", "feature", "general", "other"] as const).map(
          (c) => {
            const active = category === c;
            const col = c ? catColor(c) : "var(--gold)";
            return (
              <button
                key={c || "all"}
                onClick={() => setCategory(c)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: `1px solid ${active ? col : "var(--border)"}`,
                  background: active ? `${col}22` : "transparent",
                  color: active ? col : "var(--text-dim)",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textTransform: "capitalize",
                }}
              >
                {c || "All"}
              </button>
            );
          },
        )}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{
            marginLeft: "auto",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            color: "var(--text-primary)",
            fontFamily: "inherit",
            outline: "none",
          }}
        >
          <option value='open'>Open</option>
          <option value='resolved'>Resolved</option>
          <option value=''>All</option>
        </select>
        <span
          style={{
            fontSize: 12,
            color: "var(--text-dim)",
            alignSelf: "center",
          }}
        >
          {total}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {loading ? (
          <Loader />
        ) : rows.length === 0 ? (
          <EmptyState msg='No feedback yet' />
        ) : (
          rows.map((f) => {
            const resolved = f.status === "resolved";
            return (
              <div
                key={f.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "12px 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 7px",
                      borderRadius: 4,
                      background: `${catColor(f.category)}22`,
                      color: catColor(f.category),
                      fontFamily: "DM Mono, monospace",
                      flexShrink: 0,
                      textTransform: "uppercase",
                    }}
                  >
                    {f.category}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                    {f.platform ?? "—"} · {f.app_version ?? "—"}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      color: "var(--text-dim)",
                      flexShrink: 0,
                    }}
                  >
                    {fmtDate(f.created_at)}
                  </span>
                  {resolved ? (
                    <button
                      onClick={() => setRowStatus(f.id, "open")}
                      disabled={working === f.id}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--text-secondary)",
                        fontSize: 11,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        flexShrink: 0,
                      }}
                    >
                      {working === f.id ? "…" : "Reopen"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setRowStatus(f.id, "resolved")}
                      disabled={working === f.id}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 6,
                        border: "1px solid #10B981",
                        background: "rgba(16,185,129,0.08)",
                        color: "#10B981",
                        fontSize: 11,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        flexShrink: 0,
                      }}
                    >
                      {working === f.id ? "…" : "Resolve"}
                    </button>
                  )}
                </div>

                <div
                  data-ph-mask
                  style={{
                    fontSize: 13,
                    color: "var(--text-primary)",
                    whiteSpace: "pre-wrap",
                    marginBottom: 8,
                  }}
                >
                  {f.message}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11,
                    color: "var(--text-dim)",
                  }}
                >
                  <span data-ph-mask>
                    {f.user?.full_name ??
                      f.user?.username ??
                      f.user_id ??
                      "unknown"}
                  </span>
                  {f.contact_email && (
                    <span data-ph-mask style={{ color: "var(--text-secondary)" }}>
                      · {f.contact_email}
                    </span>
                  )}
                  {resolved && (
                    <span
                      style={{
                        marginLeft: "auto",
                        color: "#10B981",
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      ✓ RESOLVED
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Satisfaction (product_feedback — a DIFFERENT table from `feedback`
// above, see FEEDBACK_DESIGN.md §1.1: rating/reason-primary, not
// support-ticket free-text-primary. Deliberately its own tab, not folded
// into "Feedback".) ─────────────────────────────────────────────────────────

interface ProductFeedbackRow {
  id: string;
  created_at: string;
  feedback_type: "periodic" | "cancellation";
  rating: number | null;
  cancellation_reasons: string[] | null;
  was_trial: boolean | null;
  free_text: string | null;
  trigger_context: string;
  app_version: string | null;
  platform: string | null;
  user_id: string;
  user: { id: string; username: string | null; full_name: string | null } | null;
}

interface CancellationReasonBreakdownRow {
  reason: string;
  wasTrial: boolean | null;
  count: number;
}

interface RatingTrendPoint {
  weekStart: string;
  averageRating: number;
  count: number;
}

const REASON_LABELS: Record<string, string> = {
  too_expensive: "Too expensive",
  missing_feature: "Missing a feature",
  didnt_work_as_expected: "Didn't work as expected",
  not_using_enough: "Not using it enough",
  switched_to_another_app: "Switched to another app",
  just_exploring: "Just exploring",
  other: "Other",
};

function pivotReasonBreakdown(
  rows: CancellationReasonBreakdownRow[],
): { reason: string; label: string; trial: number; paid: number; unknown: number }[] {
  const byReason = new Map<
    string,
    { trial: number; paid: number; unknown: number }
  >();
  for (const row of rows) {
    const bucket = byReason.get(row.reason) ?? { trial: 0, paid: 0, unknown: 0 };
    if (row.wasTrial === true) bucket.trial += row.count;
    else if (row.wasTrial === false) bucket.paid += row.count;
    else bucket.unknown += row.count;
    byReason.set(row.reason, bucket);
  }
  return Array.from(byReason.entries())
    .map(([reason, counts]) => ({
      reason,
      label: REASON_LABELS[reason] ?? reason,
      ...counts,
    }))
    .sort((a, b) => b.trial + b.paid + b.unknown - (a.trial + a.paid + a.unknown));
}

function Satisfaction() {
  const [rows, setRows] = useState<ProductFeedbackRow[]>([]);
  const [total, setTotal] = useState(0);
  const [feedbackType, setFeedbackType] = useState<"" | "periodic" | "cancellation">("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [loading, setLoading] = useState(true);

  const [breakdown, setBreakdown] = useState<CancellationReasonBreakdownRow[]>([]);
  const [ratingTrend, setRatingTrend] = useState<RatingTrendPoint[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (feedbackType) p.set("feedback_type", feedbackType);
      if (cancellationReason) p.set("cancellation_reason", cancellationReason);
      const r = await api.get<{
        data: { feedback: ProductFeedbackRow[]; total: number };
      }>(`/admin/product-feedback?${p.toString()}`);
      setRows(r.data.data.feedback);
      setTotal(r.data.data.total);
    } finally {
      setLoading(false);
    }
  }, [feedbackType, cancellationReason]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const r = await api.get<{
        data: {
          cancellationReasonBreakdown: CancellationReasonBreakdownRow[];
          ratingTrend: RatingTrendPoint[];
        };
      }>("/admin/product-feedback/summary");
      setBreakdown(r.data.data.cancellationReasonBreakdown);
      setRatingTrend(r.data.data.ratingTrend);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadList();
    }, 0);
    return () => clearTimeout(t);
  }, [loadList]);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadSummary();
    }, 0);
    return () => clearTimeout(t);
  }, [loadSummary]);

  const pivoted = pivotReasonBreakdown(breakdown);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* ─── Cancellation reason breakdown, segmented trial/paid ─────────── */}
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 12,
          }}
        >
          Cancellation reasons (90 days) — trial vs. paid
        </div>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 16,
            height: 280,
          }}
        >
          {summaryLoading ? (
            <Loader />
          ) : pivoted.length === 0 ? (
            <EmptyState msg='No cancellation feedback in this window' />
          ) : (
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={pivoted} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray='3 3' stroke='var(--border)' opacity={0.4} />
                <XAxis
                  dataKey='label'
                  tick={{ fontSize: 10, fill: "var(--text-dim)" }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={{ stroke: "var(--border)" }}
                  interval={0}
                  angle={-20}
                  textAnchor='end'
                  height={50}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "var(--text-dim)" }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={{ stroke: "var(--border)" }}
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey='paid' name='Paid' fill='#EF4444' stackId='a' />
                <Bar dataKey='trial' name='Trial' fill='var(--gold)' stackId='a' />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ─── Rating trend ──────────────────────────────────────────────── */}
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 12,
          }}
        >
          Rating trend (weekly average, last 12 weeks)
        </div>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 16,
            height: 240,
          }}
        >
          {summaryLoading ? (
            <Loader />
          ) : ratingTrend.length === 0 ? (
            <EmptyState msg='No periodic ratings yet' />
          ) : (
            <ResponsiveContainer width='100%' height='100%'>
              <LineChart data={ratingTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray='3 3' stroke='var(--border)' opacity={0.4} />
                <XAxis
                  dataKey='weekStart'
                  tick={{ fontSize: 10, fill: "var(--text-dim)" }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={{ stroke: "var(--border)" }}
                  minTickGap={20}
                />
                <YAxis
                  domain={[1, 5]}
                  tick={{ fontSize: 10, fill: "var(--text-dim)" }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={{ stroke: "var(--border)" }}
                  width={24}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value, name) =>
                    name === "averageRating" ? [value, "Avg rating"] : [value, name]
                  }
                />
                <Line
                  type='monotone'
                  dataKey='averageRating'
                  stroke='var(--gold)'
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ─── Recent submissions ────────────────────────────────────────── */}
      <div>
        <div
          style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}
        >
          {(["", "periodic", "cancellation"] as const).map((t) => {
            const active = feedbackType === t;
            return (
              <button
                key={t || "all"}
                onClick={() => {
                  setFeedbackType(t);
                  if (t !== "cancellation") setCancellationReason("");
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
                  background: active ? "var(--gold)22" : "transparent",
                  color: active ? "var(--gold)" : "var(--text-dim)",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textTransform: "capitalize",
                }}
              >
                {t || "All"}
              </button>
            );
          })}
          <span
            style={{ fontSize: 12, color: "var(--text-dim)", alignSelf: "center", marginLeft: "auto" }}
          >
            {total}
          </span>
        </div>

        {feedbackType === "cancellation" && (
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {(["", ...Object.keys(REASON_LABELS)] as const).map((r) => {
              const active = cancellationReason === r;
              return (
                <button
                  key={r || "all-reasons"}
                  onClick={() => setCancellationReason(r)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
                    background: active ? "var(--gold)22" : "transparent",
                    color: active ? "var(--gold)" : "var(--text-dim)",
                    fontSize: 10,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {r ? REASON_LABELS[r] : "All reasons"}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {loading ? (
            <Loader />
          ) : rows.length === 0 ? (
            <EmptyState msg='No submissions yet' />
          ) : (
            rows.map((f) => (
              <div
                key={f.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "12px 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 7px",
                      borderRadius: 4,
                      background: f.feedback_type === "cancellation" ? "#EF444422" : "var(--gold)22",
                      color: f.feedback_type === "cancellation" ? "#EF4444" : "var(--gold)",
                      fontFamily: "DM Mono, monospace",
                      flexShrink: 0,
                      textTransform: "uppercase",
                    }}
                  >
                    {f.feedback_type}
                  </span>
                  {f.rating !== null && (
                    <span style={{ fontSize: 12, color: "var(--text-primary)" }}>
                      {"★".repeat(f.rating)}
                      {"☆".repeat(5 - f.rating)}
                    </span>
                  )}
                  {f.cancellation_reasons && f.cancellation_reasons.length > 0 && (
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {f.cancellation_reasons.map((r) => REASON_LABELS[r] ?? r).join(", ")}
                    </span>
                  )}
                  {f.was_trial !== null && (
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-dim)",
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      {f.was_trial ? "TRIAL" : "PAID"}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-dim)",
                      fontFamily: "DM Mono, monospace",
                      marginLeft: "auto",
                    }}
                  >
                    {new Date(f.created_at).toLocaleDateString()}
                  </span>
                </div>
                {f.free_text && (
                  <div
                    data-ph-mask
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      marginBottom: 6,
                    }}
                  >
                    “{f.free_text}”
                  </div>
                )}
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-dim)",
                    display: "flex",
                    gap: 8,
                  }}
                >
                  <span data-ph-mask>{f.user?.full_name ?? f.user?.username ?? f.user_id}</span>
                  <span>·</span>
                  <span>{f.trigger_context}</span>
                  {f.platform && (
                    <>
                      <span>·</span>
                      <span>{f.platform}{f.app_version ? ` ${f.app_version}` : ""}</span>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main admin page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("users");

  const tabs: { key: Tab; label: string }[] = [
    { key: "users", label: "User Analytics" },
    { key: "collection", label: "Collection" },
    { key: "platform_users", label: "Users" },
    { key: "errors", label: "Error Logs" },
    { key: "activity", label: "Activity" },
    { key: "flags", label: "Feature Flags" },
    { key: "costs", label: "Grading Costs" },
    { key: "settings", label: "Settings & Sync" },
    { key: "feedback", label: "Feedback" },
    { key: "satisfaction", label: "Satisfaction" },
    { key: "sync", label: "Manual Sync" },
  ];

  return (
    <div style={{ minHeight: "100vh" }}>
      <div
        style={{
          padding: "28px 40px 0",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
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
            fontSize: 26,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 16,
          }}
        >
          Dashboard
        </h1>
        <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 18px",
                border: "none",
                whiteSpace: "nowrap",
                borderBottom: `2px solid ${activeTab === tab.key ? "var(--gold)" : "transparent"}`,
                background: "transparent",
                color:
                  activeTab === tab.key ? "var(--gold)" : "var(--text-dim)",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: activeTab === tab.key ? 500 : 400,
                transition: "color 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => router.push("/admin/variants")}
            style={{
              padding: "10px 18px",
              border: "none",
              borderBottom: "2px solid transparent",
              background: "transparent",
              color: "var(--text-dim)",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            Variants ↗
          </button>
        </div>

        {/* Management section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 16,
            paddingTop: 14,
            paddingBottom: 4,
            borderTop: "1px solid var(--border)",
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              fontFamily: "DM Mono, monospace",
              letterSpacing: "0.08em",
            }}
          >
            MANAGEMENT
          </span>
          <button
            onClick={() => router.push("/admin/affiliates")}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            Manage Affiliates ↗
          </button>
          <button
            onClick={() => router.push("/admin/outreach")}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            Outreach CRM ↗
          </button>
          <button
            onClick={() => router.push("/admin/notification-test")}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            Notification Testing ↗
          </button>
        </div>
      </div>
      <div style={{ padding: "28px 40px", maxWidth: 1200, margin: "0 auto" }}>
        {activeTab === "users" && <UserAnalytics />}
        {activeTab === "collection" && <CollectionAnalytics />}
        {activeTab === "platform_users" && <UsersListPanel />}
        {activeTab === "errors" && <ErrorLogs />}
        {activeTab === "activity" && <ActivityLogs />}
        {activeTab === "flags" && <FeatureFlags />}
        {activeTab === "costs" && <GradingCosts />}
        {activeTab === "settings" && <PlatformSettings />}
        {activeTab === "feedback" && <Feedback />}
        {activeTab === "satisfaction" && <Satisfaction />}
        {activeTab === "sync" && <SyncPanel />}
      </div>
    </div>
  );
}
