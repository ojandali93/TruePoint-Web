"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../../../lib/api";

// ─── User portal consolidation (2026-09-02, adjusted 2026-09-02) ───────────
// One user portal, not two. This page absorbed everything that used to live
// only in the separate "Users" tab on /admin (PlatformUsers, now deleted):
// plan override (WITH the duration control — mobile's own version silently
// omitted it and always granted indefinitely, which was the wrong behavior
// to keep; this is the one true version now) and resend-verification.
//
// Single page, no tabs. Profile/usage/subscription (the fast "analytical
// information" — one query) load immediately on open, same as before.
// Inventory, AI grading reports, and centering reports are each behind
// their own "View …" button and fetch ONLY on click — the previous version
// fetched AI grading + centering reports eagerly on mount alongside the
// slow /detail call, and the combined load was timing out on real accounts.
// Nothing here fetches until asked for it, and each of the three stays
// independent so one slow list never blocks another.

// ─── Types (server shapes — see adminPlatform.service.ts) ──────────────────────

interface UserDetail {
  profile: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
    currency: string | null;
    preferred_grading_company: string | null;
    show_market_values: boolean | null;
    favorite_pokemon: string | null;
    favorite_set: string | null;
    collecting_years: string | null;
    collection_type: string | null;
    collector_style: string | null;
    email_verified: boolean | null;
    email_verified_at: string | null;
    affiliation: string | null;
    affiliation_id: string | null;
    created_at: string;
    updated_at: string | null;
  };
  subscription: {
    plan: string;
    status: string;
    platform: string;
    trial_ends_at: string | null;
    current_period_end: string | null;
    created_at: string | null;
    stripe_customer_id: string | null;
    rc_app_user_id: string | null;
  } | null;
  affiliate: { id: string; name: string; slug: string | null; type: string; status: string } | null;
  inventory: {
    totalCards: number;
    rawCards: number;
    gradedCards: number;
    sealedProducts: number;
    marketValue: number;
    costBasis: number;
    gainLoss: number;
  } | null;
  usage: {
    collections: number;
    masterSetsTracked: number;
    centeringReports: number;
    aiGradingReports: number;
    gradingSubmissions: number;
    ebayReports: number;
    feedbackSubmitted: number;
    errorLogs: number;
  };
  activity: {
    lastLoginAt: string | null;
    deviceCount: number;
    recentDevices: Array<{
      device_type: string | null;
      device_name: string | null;
      os: string | null;
      browser: string | null;
      push_provider: string | null;
      last_login_at: string | null;
      last_seen: string | null;
      is_active: boolean | null;
    }>;
  };
}

interface AIGradingReportRow {
  id: string;
  card_name: string | null;
  set_name: string | null;
  status: string;
  overall_score: number | null;
  tp_score: number | null;
  recommendation: string | null;
  created_at: string;
}

interface CenteringReportRow {
  id: string;
  card_id: string | null;
  side: string | null;
  label: string | null;
  truepoint_score: number | null;
  psa_grade: string | null;
  worst_axis: string | null;
  created_at: string;
}

interface CollectionItem {
  id: string;
  item_type: string;
  card_id: string | null;
  product_id: string | null;
  grading_company: string | null;
  grade: string | null;
  condition: string | null;
  quantity: number;
  card?: { name: string } | null;
  product?: { name: string } | null;
  marketValue: { marketPrice: number | null; source: string | null };
}

interface ErrorLogRow {
  id: string;
  created_at: string;
  severity: string;
  source: string;
  message: string;
  request_path: string | null;
  resolved: boolean;
}

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 20,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: "var(--text-primary)",
  marginBottom: 4,
};

const money = (n: number | null | undefined): string =>
  n == null
    ? "—"
    : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dateStr = (s: string | null | undefined): string => (s ? new Date(s).toLocaleDateString() : "—");
const dateTimeStr = (s: string | null | undefined): string => (s ? new Date(s).toLocaleString() : "Never");
const titleCase = (s: string | null | undefined): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "—");

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Each of the three below is independent: its own loaded/loading flag,
  // fetched only when its "View …" button is clicked, never on mount.
  const [aiReports, setAiReports] = useState<AIGradingReportRow[]>([]);
  const [aiReportsLoaded, setAiReportsLoaded] = useState(false);
  const [aiReportsLoading, setAiReportsLoading] = useState(false);

  const [centeringReports, setCenteringReports] = useState<CenteringReportRow[]>([]);
  const [centeringLoaded, setCenteringLoaded] = useState(false);
  const [centeringLoading, setCenteringLoading] = useState(false);

  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [collectionLoaded, setCollectionLoaded] = useState(false);
  const [collectionLoading, setCollectionLoading] = useState(false);

  const [errorLogs, setErrorLogs] = useState<ErrorLogRow[]>([]);
  const [errorLogsOpen, setErrorLogsOpen] = useState(false);
  const [errorLogsLoading, setErrorLogsLoading] = useState(false);

  // Plan override
  const [planModal, setPlanModal] = useState(false);
  const [newPlan, setNewPlan] = useState<"collector" | "pro">("collector");
  const [durationMonths, setDurationMonths] = useState<number | null>(3);
  const [planNote, setPlanNote] = useState("");
  const [savingPlan, setSavingPlan] = useState(false);

  // Resend verification
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // /detail is independently slow for a large account (live inventory
  // valuation across every item) — its own effect, own loading flag, own
  // raised timeout. This is the only thing that fetches on mount.
  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async () => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const r = await api.get<{ data: UserDetail }>(`/admin/users/${userId}/detail`, { timeout: 30000 });
        if (mounted) setDetail(r.data.data);
      } catch (e) {
        if (mounted) setDetailError(e instanceof Error ? e.message : "Failed to load profile.");
      } finally {
        if (mounted) setDetailLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const loadAiReports = async () => {
    if (aiReportsLoaded) return;
    setAiReportsLoading(true);
    try {
      const r = await api.get<{ data: AIGradingReportRow[] }>(`/admin/users/${userId}/ai-grading-reports`);
      setAiReports(r.data.data ?? []);
      setAiReportsLoaded(true);
    } catch {
      // leave empty — the panel shows "no reports" either way
    } finally {
      setAiReportsLoading(false);
    }
  };

  const loadCenteringReports = async () => {
    if (centeringLoaded) return;
    setCenteringLoading(true);
    try {
      const r = await api.get<{ data: CenteringReportRow[] }>(`/admin/users/${userId}/centering-reports`);
      setCenteringReports(r.data.data ?? []);
      setCenteringLoaded(true);
    } catch {
      // leave empty — the panel shows "no reports" either way
    } finally {
      setCenteringLoading(false);
    }
  };

  const loadCollection = async () => {
    if (collectionLoaded) return;
    setCollectionLoading(true);
    try {
      const r = await api.get<{ data: { items: CollectionItem[] } }>(`/admin/users/${userId}/collection`);
      setCollection(r.data.data.items ?? []);
      setCollectionLoaded(true);
    } catch {
      // leave collection empty — the panel shows "no items" either way
    } finally {
      setCollectionLoading(false);
    }
  };

  const loadErrorLogs = async () => {
    setErrorLogsOpen(true);
    if (errorLogs.length > 0) return;
    setErrorLogsLoading(true);
    try {
      const r = await api.get<{ data: ErrorLogRow[] }>(`/admin/users/${userId}/errors`);
      setErrorLogs(r.data.data ?? []);
    } catch {
      // leave empty — the panel shows "no errors" either way
    } finally {
      setErrorLogsLoading(false);
    }
  };

  const openPlanModal = () => {
    setNewPlan((detail?.subscription?.plan as "collector" | "pro" | undefined) ?? "collector");
    setDurationMonths(3);
    setPlanNote("");
    setPlanModal(true);
  };

  const overridePlan = async () => {
    setSavingPlan(true);
    try {
      await api.patch(`/admin/users/${userId}/plan`, { plan: newPlan, note: planNote, durationMonths });
      setPlanModal(false);
      // Refetch — the new plan/status should reflect immediately.
      const r = await api.get<{ data: UserDetail }>(`/admin/users/${userId}/detail`, { timeout: 30000 });
      setDetail(r.data.data);
    } finally {
      setSavingPlan(false);
    }
  };

  const resendVerification = async () => {
    setResendState("sending");
    try {
      const r = await api.post<{ data: { sent: boolean; alreadyVerified: boolean } }>(
        `/admin/users/${userId}/resend-verification`,
      );
      setResendState("sent");
      if (r.data.data.alreadyVerified && detail) {
        setDetail({ ...detail, profile: { ...detail.profile, email_verified: true } });
      }
    } catch {
      setResendState("error");
    }
  };

  const p = detail?.profile;
  const displayName = p?.full_name || p?.username || userId;
  const sub = detail?.subscription;
  const plan = sub?.plan ?? "starter";
  const planColor = plan === "pro" ? "var(--gold)" : plan === "collector" ? "#3B82F6" : "#6B7280";
  const verified = p?.email_verified === true;

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ padding: "28px 40px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <button
          onClick={() => router.push("/admin/users")}
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
          ← Users
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
          {detailLoading ? "LOADING PROFILE…" : `${plan.toUpperCase()}${sub?.status ? ` · ${sub.status}` : ""}`}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
          {displayName}
        </h1>
        <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
          {detailError ? (
            <span style={{ color: "#EF4444" }}>{detailError}</span>
          ) : detail ? (
            <>
              {p?.username ? `@${p.username} · ` : ""}
              joined {dateStr(p?.created_at)}
            </>
          ) : (
            "Loading profile…"
          )}
        </div>
      </div>

      {/* Body — one page, no tabs */}
      <div style={{ padding: "28px 40px", maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Usage tiles */}
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Activity &amp; Feature Usage</div>
          {detail ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
              <StatTile label="Collections" value={detail.usage.collections} />
              <StatTile label="Master sets tracked" value={detail.usage.masterSetsTracked} />
              <StatTile label="Grading submissions" value={detail.usage.gradingSubmissions} />
              <StatTile label="Centering reports" value={detail.usage.centeringReports} />
              <StatTile label="AI grading reports" value={detail.usage.aiGradingReports} />
              <StatTile label="eBay analyses" value={detail.usage.ebayReports} />
              <StatTile label="Feedback sent" value={detail.usage.feedbackSubmitted} />
              <StatTile
                label="Error logs"
                value={detail.usage.errorLogs}
                accent={detail.usage.errorLogs > 0 ? "#F59E0B" : undefined}
              />
              <StatTile label="Devices" value={detail.activity.deviceCount} />
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 8 }}>Loading…</div>
          )}
          {detail?.inventory && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              <StatTile label="Total cards" value={detail.inventory.totalCards.toLocaleString()} />
              <StatTile label="Market value" value={money(detail.inventory.marketValue)} accent="var(--gold)" />
              <StatTile
                label="Gain / loss"
                value={money(detail.inventory.gainLoss)}
                accent={detail.inventory.gainLoss >= 0 ? "#10B981" : "#EF4444"}
              />
            </div>
          )}
        </div>

        {/* Subscription + Plan/Resend actions */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={sectionTitleStyle}>Subscription</div>
            <div style={{ display: "flex", gap: 8 }}>
              <ActionButton onClick={openPlanModal}>Override plan</ActionButton>
              {!verified && (
                <ActionButton
                  onClick={resendVerification}
                  disabled={resendState === "sending"}
                  color={resendState === "sent" ? "#10B981" : resendState === "error" ? "#EF4444" : undefined}
                >
                  {resendState === "sending"
                    ? "Sending…"
                    : resendState === "sent"
                      ? "Sent ✓"
                      : resendState === "error"
                        ? "Retry"
                        : "Resend verification"}
                </ActionButton>
              )}
            </div>
          </div>
          {sub ? (
            <div style={{ marginTop: 14 }}>
              <Field
                label="Plan"
                value={
                  <span style={{ color: planColor, textTransform: "uppercase", fontSize: 12, fontWeight: 700 }}>
                    {sub.plan}
                  </span>
                }
              />
              <Field label="Status" value={titleCase(sub.status)} />
              <Field label="Billing platform" value={titleCase(sub.platform)} />
              <Field label="Renews / ends" value={dateStr(sub.current_period_end)} />
              {sub.trial_ends_at && <Field label="Trial ends" value={dateStr(sub.trial_ends_at)} />}
              {sub.stripe_customer_id && <Field label="Stripe customer" value={sub.stripe_customer_id} />}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 14 }}>
              No subscription record (free tier).
            </div>
          )}
        </div>

        {/* Profile */}
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Profile</div>
          <div style={{ marginTop: 14 }}>
            <Field label="Username" value={p?.username} />
            <Field label="Full name" value={p?.full_name} />
            <Field label="Phone" value={p?.phone} />
            <Field
              label="Email verified"
              value={
                verified ? (
                  <span style={{ color: "#10B981" }}>✓ {dateStr(p?.email_verified_at)}</span>
                ) : (
                  <span style={{ color: "#F59E0B" }}>Unverified</span>
                )
              }
            />
            <Field label="Favorite Pokémon" value={p?.favorite_pokemon} />
            <Field label="Favorite set" value={p?.favorite_set} />
            <Field label="Collecting years" value={p?.collecting_years} />
            <Field label="Collection type" value={titleCase(p?.collection_type)} />
            <Field label="Collector style" value={titleCase(p?.collector_style)} />
            <Field label="Preferred grader" value={p?.preferred_grading_company} />
            <Field label="Currency" value={p?.currency} />
            <Field
              label="Affiliation"
              value={detail?.affiliate ? `${detail.affiliate.name} (${detail.affiliate.type})` : p?.affiliation}
            />
            <Field label="Joined" value={dateStr(p?.created_at)} />
            <Field label="Last login" value={dateTimeStr(detail?.activity.lastLoginAt)} />
          </div>
        </div>

        {/* Recent devices */}
        {detail && detail.activity.recentDevices.length > 0 && (
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>Recent Devices</div>
            <div style={{ marginTop: 14 }}>
              {detail.activity.recentDevices.map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "9px 0",
                    borderTop: i === 0 ? "none" : "1px solid var(--border)",
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: "var(--text-primary)" }}>
                    {[d.device_name, d.os, d.browser].filter(Boolean).join(" · ") ||
                      d.device_type ||
                      "Unknown device"}
                  </span>
                  <span style={{ color: "var(--text-dim)", fontSize: 11 }}>{dateStr(d.last_login_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inventory — read-only, fetched only on click */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={sectionTitleStyle}>Inventory (read-only)</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                {detail ? `${detail.usage.collections} collection${detail.usage.collections === 1 ? "" : "s"} tracked.` : "Loading…"}
              </div>
            </div>
            {!collectionLoaded && (
              <ActionButton onClick={loadCollection} disabled={collectionLoading}>
                {collectionLoading ? "Loading…" : "View inventory"}
              </ActionButton>
            )}
          </div>
          {collectionLoaded && (
            <div style={{ marginTop: 14 }}>
              {collection.length === 0 ? (
                <EmptyRow label="No inventory items." />
              ) : (
                <RowList>
                  {collection.slice(0, 200).map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 4px",
                        borderTop: "1px solid var(--border)",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: "var(--text-primary)" }}>
                        {item.card?.name || item.product?.name || item.id}
                        {item.quantity > 1 ? ` ×${item.quantity}` : ""}
                        {item.grading_company && item.grade
                          ? ` · ${item.grading_company} ${item.grade}`
                          : item.condition
                            ? ` · ${item.condition}`
                            : ""}
                      </span>
                      <span style={{ color: "var(--text-dim)", fontSize: 12 }}>
                        {item.marketValue.marketPrice != null
                          ? `$${item.marketValue.marketPrice.toLocaleString()}`
                          : "—"}
                      </span>
                    </div>
                  ))}
                </RowList>
              )}
            </div>
          )}
        </div>

        {/* AI Grading Reports — fetched only on click */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={sectionTitleStyle}>AI Grading Reports</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                {detail ? `${detail.usage.aiGradingReports} submitted.` : "Loading…"}
              </div>
            </div>
            {!aiReportsLoaded && (
              <ActionButton onClick={loadAiReports} disabled={aiReportsLoading}>
                {aiReportsLoading ? "Loading…" : "View AI grading reports"}
              </ActionButton>
            )}
          </div>
          {aiReportsLoaded && (
            <div style={{ marginTop: 14 }}>
              {aiReports.length === 0 ? (
                <EmptyRow label="No AI grading reports." />
              ) : (
                <RowList>
                  {aiReports.map((r) => (
                    <ReportRow
                      key={r.id}
                      onClick={() => router.push(`/admin/users/${userId}/ai-grading/${r.id}`)}
                      title={r.card_name || "Untitled card"}
                      subtitle={r.set_name || undefined}
                      right={r.status === "completed" ? `TP ${r.tp_score ?? r.overall_score ?? "—"}` : r.status}
                      date={r.created_at}
                    />
                  ))}
                </RowList>
              )}
            </div>
          )}
        </div>

        {/* Centering Reports — fetched only on click */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={sectionTitleStyle}>Centering Reports</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                {detail ? `${detail.usage.centeringReports} submitted.` : "Loading…"}
              </div>
            </div>
            {!centeringLoaded && (
              <ActionButton onClick={loadCenteringReports} disabled={centeringLoading}>
                {centeringLoading ? "Loading…" : "View centering reports"}
              </ActionButton>
            )}
          </div>
          {centeringLoaded && (
            <div style={{ marginTop: 14 }}>
              {centeringReports.length === 0 ? (
                <EmptyRow label="No centering reports." />
              ) : (
                <RowList>
                  {centeringReports.map((r) => (
                    <ReportRow
                      key={r.id}
                      onClick={() => router.push(`/admin/users/${userId}/centering/${r.id}`)}
                      title={r.label || `${r.side ?? "front"} scan`}
                      subtitle={r.card_id ?? undefined}
                      right={r.truepoint_score != null ? `TP ${r.truepoint_score}` : (r.psa_grade ?? "—")}
                      date={r.created_at}
                    />
                  ))}
                </RowList>
              )}
            </div>
          )}
        </div>

        {/* Error history — lazy, per-user filtered view of the same
            error_logs table the global Error Logs admin tab reads. */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={sectionTitleStyle}>Error History</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                {detail ? `${detail.usage.errorLogs} logged.` : "Loading…"}
              </div>
            </div>
            {!errorLogsOpen && <ActionButton onClick={loadErrorLogs}>Load errors</ActionButton>}
          </div>
          {errorLogsOpen && (
            <div style={{ marginTop: 14 }}>
              {errorLogsLoading ? (
                <EmptyRow label="Loading…" />
              ) : errorLogs.length === 0 ? (
                <EmptyRow label="No error logs." />
              ) : (
                <RowList>
                  {errorLogs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        padding: "10px 4px",
                        borderTop: "1px solid var(--border)",
                        fontSize: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <span
                          style={{
                            color:
                              log.severity === "error"
                                ? "#EF4444"
                                : log.severity === "warning"
                                  ? "#F59E0B"
                                  : "var(--text-secondary)",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            fontSize: 10,
                          }}
                        >
                          {log.severity} · {log.source}
                          {log.resolved ? " · resolved" : ""}
                        </span>
                        <span style={{ color: "var(--text-dim)", fontSize: 11, flexShrink: 0 }}>
                          {dateTimeStr(log.created_at)}
                        </span>
                      </div>
                      <div style={{ color: "var(--text-primary)", marginTop: 4 }}>{log.message}</div>
                      {log.request_path && (
                        <div style={{ color: "var(--text-dim)", fontSize: 11, marginTop: 2 }}>
                          {log.request_path}
                        </div>
                      )}
                    </div>
                  ))}
                </RowList>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Plan override modal */}
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
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, width: 360 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
              Override Plan
            </div>
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 16 }}>{displayName}</div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 6 }}>NEW PLAN</div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["collector", "pro"] as const).map((pl) => (
                  <button
                    key={pl}
                    onClick={() => setNewPlan(pl)}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 8,
                      border: `1px solid ${newPlan === pl ? "var(--gold)" : "var(--border)"}`,
                      background: newPlan === pl ? "rgba(201,168,76,0.1)" : "transparent",
                      color: newPlan === pl ? "var(--gold)" : "var(--text-secondary)",
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textTransform: "capitalize",
                    }}
                  >
                    {pl}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 6 }}>DURATION</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(
                  [
                    { label: "Indefinite", v: null },
                    { label: "1 mo", v: 1 },
                    { label: "3 mo", v: 3 },
                    { label: "6 mo", v: 6 },
                    { label: "12 mo", v: 12 },
                  ] as { label: string; v: number | null }[]
                ).map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setDurationMonths(opt.v)}
                    style={{
                      flex: "1 0 auto",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: `1px solid ${durationMonths === opt.v ? "var(--gold)" : "var(--border)"}`,
                      background: durationMonths === opt.v ? "rgba(201,168,76,0.1)" : "transparent",
                      color: durationMonths === opt.v ? "var(--gold)" : "var(--text-secondary)",
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 6 }}>
                {durationMonths
                  ? `Comp trial — expires in ${durationMonths} month${durationMonths > 1 ? "s" : ""} (status: trialing).`
                  : "Indefinite comp grant (status: active)."}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 6 }}>NOTE (OPTIONAL)</div>
              <input
                value={planNote}
                onChange={(e) => setPlanNote(e.target.value)}
                placeholder="Reason for override…"
                style={{
                  width: "100%",
                  background: "var(--surface-2, var(--surface))",
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
                onClick={() => setPlanModal(false)}
                disabled={savingPlan}
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
                disabled={savingPlan}
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
                {savingPlan ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared bits ─────────────────────────────────────────────────────────────

function RowList({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>;
}

function EmptyRow({ label }: { label: string }) {
  return <div style={{ fontSize: 13, color: "var(--text-dim)" }}>{label}</div>;
}

function ActionButton({
  onClick,
  disabled,
  color,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "7px 14px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "transparent",
        color: color ?? "var(--text-secondary)",
        fontSize: 12,
        cursor: disabled ? "default" : "pointer",
        fontFamily: "inherit",
        opacity: disabled ? 0.6 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div
      style={{
        flexBasis: "31%",
        flexGrow: 1,
        background: "var(--surface-2, var(--surface))",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
      <div style={{ fontSize: 9, letterSpacing: 0.5, color: "var(--text-dim)", marginBottom: 4, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: accent ?? "var(--text-primary)" }}>{value}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "7px 0",
        borderBottom: "1px solid var(--border)",
        fontSize: 12,
      }}
    >
      <span style={{ color: "var(--text-dim)" }}>{label}</span>
      {typeof value === "string" || value == null ? (
        <span style={{ color: "var(--text-primary)", textAlign: "right" }}>{value ?? "—"}</span>
      ) : (
        value
      )}
    </div>
  );
}

function ReportRow({
  onClick,
  title,
  subtitle,
  right,
  date,
}: {
  onClick: () => void;
  title: string;
  subtitle?: string;
  right?: string | null;
  date: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 4px",
        borderTop: "1px solid var(--border)",
        background: "transparent",
        border: "none",
        borderTopWidth: 1,
        borderTopStyle: "solid",
        borderTopColor: "var(--border)",
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
        width: "100%",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
          {new Date(date).toLocaleDateString()}
          {subtitle ? ` · ${subtitle}` : ""}
        </div>
      </div>
      {right && (
        <span style={{ fontSize: 12, fontFamily: "DM Mono, monospace", color: "var(--gold)", flexShrink: 0 }}>{right}</span>
      )}
    </button>
  );
}
