/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "../../../lib/api";

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

interface UserRow {
  id: string;
  username?: string;
  full_name?: string;
  created_at: string;
  subscription?: { plan: string; status: string }[];
}

interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  description?: string;
  updated_at: string;
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
  | "settings";

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

// ─── Platform Users ───────────────────────────────────────────────────────────

function PlatformUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [planModal, setPlanModal] = useState<UserRow | null>(null);
  const [newPlan, setNewPlan] = useState<"collector" | "pro">("collector");
  const [planNote, setPlanNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const r = await api.get<{ data: { users: UserRow[]; total: number } }>(
        `/admin/users?search=${encodeURIComponent(q)}&limit=50`,
      );
      setUsers(r.data.data.users);
      setTotal(r.data.data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(t);
  }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search);
  };

  const overridePlan = async () => {
    if (!planModal) return;
    setSaving(true);
    try {
      await api.patch(`/admin/users/${planModal.id}/plan`, {
        plan: newPlan,
        note: planNote,
      });
      setPlanModal(null);
      setPlanNote("");
      load(search);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
          {total} users total
        </div>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search name or username…'
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "7px 12px",
              fontSize: 12,
              color: "var(--text-primary)",
              fontFamily: "inherit",
              outline: "none",
              width: 240,
            }}
          />
          <button
            type='submit'
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
            Search
          </button>
        </form>
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
            gridTemplateColumns: "1fr 1fr 100px 110px 130px",
            padding: "9px 16px",
            background: "var(--surface-2)",
            borderBottom: "1px solid var(--border)",
            fontSize: 10,
            color: "var(--text-dim)",
            fontFamily: "DM Mono, monospace",
            letterSpacing: "0.06em",
          }}
        >
          <span>NAME</span>
          <span>ID</span>
          <span>PLAN</span>
          <span>JOINED</span>
          <span></span>
        </div>
        {loading ? (
          <Loader />
        ) : users.length === 0 ? (
          <EmptyState msg='No users found' />
        ) : (
          users.map((u) => {
            const sub = u.subscription?.[0];
            const pc =
              sub?.plan === "pro"
                ? "var(--gold)"
                : sub?.plan === "collector"
                  ? "#3B82F6"
                  : "#6B7280";
            return (
              <div
                key={u.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 100px 110px 130px",
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--border)",
                  alignItems: "center",
                  fontSize: 12,
                }}
              >
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                  {u.full_name ?? u.username ?? "—"}
                </span>
                <span
                  style={{
                    color: "var(--text-dim)",
                    fontFamily: "DM Mono, monospace",
                    fontSize: 11,
                  }}
                >
                  {u.id.slice(0, 14)}…
                </span>
                <span
                  style={{
                    color: pc,
                    fontFamily: "DM Mono, monospace",
                    fontSize: 11,
                    textTransform: "uppercase",
                  }}
                >
                  {sub?.plan ?? "free"}
                </span>
                <span style={{ color: "var(--text-dim)", fontSize: 11 }}>
                  {new Date(u.created_at).toLocaleDateString()}
                </span>
                <button
                  onClick={() => {
                    setPlanModal(u);
                    setNewPlan((sub?.plan as any) ?? "collector");
                  }}
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
                  Override Plan
                </button>
              </div>
            );
          })
        )}
      </div>

      {planModal && (
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
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 24,
              width: 360,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--text-primary)",
                marginBottom: 4,
              }}
            >
              Override Plan
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-dim)",
                marginBottom: 16,
              }}
            >
              {planModal.full_name ?? planModal.username ?? planModal.id}
            </div>
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-dim)",
                  marginBottom: 6,
                }}
              >
                NEW PLAN
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["collector", "pro"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setNewPlan(p)}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 8,
                      border: `1px solid ${newPlan === p ? "var(--gold)" : "var(--border)"}`,
                      background:
                        newPlan === p ? "rgba(201,168,76,0.1)" : "transparent",
                      color:
                        newPlan === p ? "var(--gold)" : "var(--text-secondary)",
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textTransform: "capitalize",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-dim)",
                  marginBottom: 6,
                }}
              >
                NOTE (OPTIONAL)
              </div>
              <input
                value={planNote}
                onChange={(e) => setPlanNote(e.target.value)}
                placeholder='Reason for override…'
                style={{
                  width: "100%",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 12,
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setPlanModal(null)}
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
                onClick={overridePlan}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "8px 0",
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
                {saving ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
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

  const load = useCallback(async () => {
    setLoading(true);
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

function FeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ data: FeatureFlag[] }>("/admin/flags")
      .then((r) => setFlags(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (key: string, cur: boolean) => {
    setToggling(key);
    try {
      await api.patch(`/admin/flags/${key}`, { enabled: !cur });
      setFlags((prev) =>
        prev.map((f) => (f.key === key ? { ...f, enabled: !cur } : f)),
      );
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
        }}
      >
        Changes take effect immediately on the next API request — no deploy
        needed.
      </div>
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
              alignItems: "center",
              gap: 14,
            }}
          >
            <div style={{ flex: 1 }}>
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
            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
              {new Date(flag.updated_at).toLocaleDateString()}
            </span>
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
        ))}
      </div>
    </div>
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
      </div>
      <div style={{ padding: "28px 40px", maxWidth: 1200, margin: "0 auto" }}>
        {activeTab === "users" && <UserAnalytics />}
        {activeTab === "collection" && <CollectionAnalytics />}
        {activeTab === "platform_users" && <PlatformUsers />}
        {activeTab === "errors" && <ErrorLogs />}
        {activeTab === "activity" && <ActivityLogs />}
        {activeTab === "flags" && <FeatureFlags />}
        {activeTab === "costs" && <GradingCosts />}
        {activeTab === "settings" && <PlatformSettings />}
      </div>
    </div>
  );
}
