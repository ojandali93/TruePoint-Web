"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../../../lib/api";

// ─── Types (server shapes — see adminPlatform.service.ts) ──────────────────────

interface UserDetail {
  profile: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    created_at: string;
  };
  subscription: { plan: string; status: string } | null;
  usage: {
    collections: number;
    masterSetsTracked: number;
    centeringReports: number;
    aiGradingReports: number;
    gradingSubmissions: number;
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

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [aiReports, setAiReports] = useState<AIGradingReportRow[]>([]);
  const [centeringReports, setCenteringReports] = useState<
    CenteringReportRow[]
  >([]);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collectionOpen, setCollectionOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [detailRes, aiRes, centeringRes] = await Promise.all([
          api.get<{ data: UserDetail }>(`/admin/users/${userId}/detail`),
          api.get<{ data: AIGradingReportRow[] }>(
            `/admin/users/${userId}/ai-grading-reports`,
          ),
          api.get<{ data: CenteringReportRow[] }>(
            `/admin/users/${userId}/centering-reports`,
          ),
        ]);
        if (!mounted) return;
        setDetail(detailRes.data.data);
        setAiReports(aiRes.data.data ?? []);
        setCenteringReports(centeringRes.data.data ?? []);
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "Failed to load user.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const loadCollection = async () => {
    setCollectionOpen(true);
    if (collection.length > 0) return; // already loaded
    try {
      const r = await api.get<{
        data: { items: CollectionItem[] };
      }>(`/admin/users/${userId}/collection`);
      setCollection(r.data.data.items ?? []);
    } catch {
      // leave collection empty — the panel shows "no items" either way
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, color: "var(--text-dim)", fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div style={{ padding: 40 }}>
        <div style={{ color: "#EF4444", fontSize: 13 }}>
          {error ?? "User not found."}
        </div>
      </div>
    );
  }

  const displayName =
    detail.profile.full_name || detail.profile.username || detail.profile.id;
  const plan = detail.subscription?.plan ?? "starter";

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
          {plan.toUpperCase()}
          {detail.subscription?.status ? ` · ${detail.subscription.status}` : ""}
        </div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          {displayName}
        </h1>
        <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
          {detail.profile.username ? `@${detail.profile.username} · ` : ""}
          joined {new Date(detail.profile.created_at).toLocaleDateString()}
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
        {/* AI Grading Reports */}
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>
            AI Grading Reports ({detail.usage.aiGradingReports})
          </div>
          <div
            style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 14 }}
          >
            Date, card, and predicted grades — tap any row for the full report
            as the user saw it.
          </div>
          {aiReports.length === 0 ? (
            <EmptyRow label="No AI grading reports." />
          ) : (
            <RowList>
              {aiReports.map((r) => (
                <ReportRow
                  key={r.id}
                  onClick={() =>
                    router.push(`/admin/users/${userId}/ai-grading/${r.id}`)
                  }
                  title={r.card_name || "Untitled card"}
                  subtitle={r.set_name || undefined}
                  right={
                    r.status === "completed"
                      ? `TP ${r.tp_score ?? r.overall_score ?? "—"}`
                      : r.status
                  }
                  date={r.created_at}
                />
              ))}
            </RowList>
          )}
        </div>

        {/* Centering Reports */}
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>
            Centering Reports ({detail.usage.centeringReports})
          </div>
          <div
            style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 14 }}
          >
            Same shape as AI grading — tap for the full measurement + grade
            breakdown.
          </div>
          {centeringReports.length === 0 ? (
            <EmptyRow label="No centering reports." />
          ) : (
            <RowList>
              {centeringReports.map((r) => (
                <ReportRow
                  key={r.id}
                  onClick={() =>
                    router.push(`/admin/users/${userId}/centering/${r.id}`)
                  }
                  title={r.label || `${r.side ?? "front"} scan`}
                  subtitle={r.card_id ?? undefined}
                  right={
                    r.truepoint_score != null
                      ? `TP ${r.truepoint_score}`
                      : (r.psa_grade ?? "—")
                  }
                  date={r.created_at}
                />
              ))}
            </RowList>
          )}
        </div>

        {/* Collection (read-only) */}
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={sectionTitleStyle}>Collection (read-only)</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                {detail.usage.collections} collection
                {detail.usage.collections === 1 ? "" : "s"} tracked.
              </div>
            </div>
            {!collectionOpen && (
              <button
                onClick={loadCollection}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Load inventory
              </button>
            )}
          </div>
          {collectionOpen && (
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
      </div>
    </div>
  );
}

// ─── Shared row helpers ─────────────────────────────────────────────────────────

function RowList({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>;
}

function EmptyRow({ label }: { label: string }) {
  return <div style={{ fontSize: 13, color: "var(--text-dim)" }}>{label}</div>;
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
        <div
          style={{
            fontSize: 13,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
          {new Date(date).toLocaleDateString()}
          {subtitle ? ` · ${subtitle}` : ""}
        </div>
      </div>
      {right && (
        <span
          style={{
            fontSize: 12,
            fontFamily: "DM Mono, monospace",
            color: "var(--gold)",
            flexShrink: 0,
          }}
        >
          {right}
        </span>
      )}
    </button>
  );
}
