/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import api from "../../lib/api";

// ─── Types (mirror backend getUserDetail response) ──────────────────────────

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
  affiliate: {
    id: string;
    name: string;
    slug: string | null;
    type: string;
    status: string;
  } | null;
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

export interface UserDetailModalProps {
  userId: string;
  /** Fallback display name shown in the header while loading */
  fallbackName?: string | null;
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const money = (n: number | null | undefined): string =>
  n == null
    ? "—"
    : `$${n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

const date = (s: string | null | undefined): string =>
  s ? new Date(s).toLocaleDateString() : "—";

const dateTime = (s: string | null | undefined): string =>
  s ? new Date(s).toLocaleString() : "Never";

const titleCase = (s: string | null | undefined): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.06em",
          color: "var(--text-dim)",
          fontFamily: "DM Mono, monospace",
          marginBottom: 6,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: accent ?? "var(--text-primary)",
          fontFamily: "DM Mono, monospace",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        letterSpacing: "0.08em",
        color: "var(--text-dim)",
        fontFamily: "DM Mono, monospace",
        textTransform: "uppercase",
        margin: "18px 0 10px",
      }}
    >
      {children}
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
      <span
        style={{
          color: "var(--text-primary)",
          textAlign: "right",
          wordBreak: "break-word",
        }}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

// ─── Modal ─────────────────────────────────────────────────────────────────

export default function UserDetailModal({
  userId,
  fallbackName,
  onClose,
}: UserDetailModalProps) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<{ data: UserDetail }>(`/admin/users/${userId}/detail`)
      .then((r) => {
        if (!cancelled) setDetail(r.data.data);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load user");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const p = detail?.profile;
  const headerName =
    p?.full_name ?? p?.username ?? fallbackName ?? userId.slice(0, 12);
  const sub = detail?.subscription;
  const planColor =
    sub?.plan === "pro"
      ? "var(--gold)"
      : sub?.plan === "collector"
        ? "#3B82F6"
        : "#6B7280";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 120,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "5vh 16px",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 640,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px",
            borderBottom: "1px solid var(--border)",
            position: "sticky",
            top: 0,
            background: "var(--surface)",
            zIndex: 1,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {headerName}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-dim)",
                fontFamily: "DM Mono, monospace",
                marginTop: 2,
              }}
            >
              {userId}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                color: planColor,
                fontFamily: "DM Mono, monospace",
                fontSize: 12,
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {sub?.plan ?? "free"}
            </span>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text-secondary)",
                width: 30,
                height: 30,
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
              }}
              aria-label='Close'
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "10px 22px 24px" }}>
          {loading ? (
            <div
              style={{
                padding: "40px 0",
                textAlign: "center",
                color: "var(--text-dim)",
                fontSize: 13,
              }}
            >
              Loading…
            </div>
          ) : error ? (
            <div
              style={{
                padding: "40px 0",
                textAlign: "center",
                color: "#EF4444",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          ) : detail ? (
            <>
              {/* Collection snapshot */}
              <SectionLabel>Collection</SectionLabel>
              {detail.inventory ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 10,
                  }}
                >
                  <StatTile
                    label='Total cards'
                    value={detail.inventory.totalCards.toLocaleString()}
                  />
                  <StatTile
                    label='Market value'
                    value={money(detail.inventory.marketValue)}
                    accent='var(--gold)'
                  />
                  <StatTile
                    label='Gain / loss'
                    value={money(detail.inventory.gainLoss)}
                    accent={
                      detail.inventory.gainLoss >= 0 ? "#10B981" : "#EF4444"
                    }
                  />
                  <StatTile
                    label='Raw'
                    value={detail.inventory.rawCards.toLocaleString()}
                  />
                  <StatTile
                    label='Graded'
                    value={detail.inventory.gradedCards.toLocaleString()}
                  />
                  <StatTile
                    label='Sealed'
                    value={detail.inventory.sealedProducts.toLocaleString()}
                  />
                </div>
              ) : (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-dim)",
                    padding: "8px 0",
                  }}
                >
                  Valuation unavailable.
                </div>
              )}

              {/* Feature usage */}
              <SectionLabel>Activity &amp; Feature Usage</SectionLabel>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                }}
              >
                <StatTile
                  label='Collections'
                  value={detail.usage.collections}
                />
                <StatTile
                  label='Master sets tracked'
                  value={detail.usage.masterSetsTracked}
                />
                <StatTile
                  label='Grading submissions'
                  value={detail.usage.gradingSubmissions}
                />
                <StatTile
                  label='Centering reports'
                  value={detail.usage.centeringReports}
                />
                <StatTile
                  label='AI grading reports'
                  value={detail.usage.aiGradingReports}
                />
                <StatTile
                  label='eBay analyses'
                  value={detail.usage.ebayReports}
                />
                <StatTile
                  label='Feedback sent'
                  value={detail.usage.feedbackSubmitted}
                />
                <StatTile
                  label='Error logs'
                  value={detail.usage.errorLogs}
                  accent={detail.usage.errorLogs > 0 ? "#F59E0B" : undefined}
                />
                <StatTile label='Devices' value={detail.activity.deviceCount} />
              </div>

              {/* Profile */}
              <SectionLabel>Profile</SectionLabel>
              <div>
                <Field label='Username' value={p?.username} />
                <Field label='Full name' value={p?.full_name} />
                <Field label='Phone' value={p?.phone} />
                <Field
                  label='Email verified'
                  value={
                    p?.email_verified ? (
                      <span style={{ color: "#10B981" }}>
                        ✓ {date(p?.email_verified_at)}
                      </span>
                    ) : (
                      <span style={{ color: "#F59E0B" }}>Unverified</span>
                    )
                  }
                />
                <Field label='Favorite Pokémon' value={p?.favorite_pokemon} />
                <Field label='Favorite set' value={p?.favorite_set} />
                <Field label='Collecting years' value={p?.collecting_years} />
                <Field
                  label='Collection type'
                  value={titleCase(p?.collection_type)}
                />
                <Field
                  label='Collector style'
                  value={titleCase(p?.collector_style)}
                />
                <Field
                  label='Preferred grader'
                  value={p?.preferred_grading_company}
                />
                <Field label='Currency' value={p?.currency} />
                <Field
                  label='Affiliation'
                  value={
                    detail.affiliate
                      ? `${detail.affiliate.name} (${detail.affiliate.type})`
                      : p?.affiliation
                  }
                />
                <Field label='Joined' value={date(p?.created_at)} />
                <Field
                  label='Last login'
                  value={dateTime(detail.activity.lastLoginAt)}
                />
              </div>

              {/* Subscription */}
              <SectionLabel>Subscription</SectionLabel>
              {sub ? (
                <div>
                  <Field
                    label='Plan'
                    value={
                      <span
                        style={{
                          color: planColor,
                          textTransform: "uppercase",
                          fontFamily: "DM Mono, monospace",
                        }}
                      >
                        {sub.plan}
                      </span>
                    }
                  />
                  <Field label='Status' value={titleCase(sub.status)} />
                  <Field
                    label='Billing platform'
                    value={titleCase(sub.platform)}
                  />
                  <Field
                    label='Renews / ends'
                    value={date(sub.current_period_end)}
                  />
                  {sub.trial_ends_at && (
                    <Field label='Trial ends' value={date(sub.trial_ends_at)} />
                  )}
                  {sub.stripe_customer_id && (
                    <Field
                      label='Stripe customer'
                      value={
                        <span style={{ fontFamily: "DM Mono, monospace" }}>
                          {sub.stripe_customer_id}
                        </span>
                      }
                    />
                  )}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-dim)",
                    padding: "8px 0",
                  }}
                >
                  No subscription record (free tier).
                </div>
              )}

              {/* Recent devices */}
              {detail.activity.recentDevices.length > 0 && (
                <>
                  <SectionLabel>Recent Devices</SectionLabel>
                  <div
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    {detail.activity.recentDevices.map((d, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "9px 14px",
                          borderBottom:
                            i === detail.activity.recentDevices.length - 1
                              ? "none"
                              : "1px solid var(--border)",
                          fontSize: 12,
                        }}
                      >
                        <span style={{ color: "var(--text-primary)" }}>
                          {[d.device_name, d.os, d.browser]
                            .filter(Boolean)
                            .join(" · ") ||
                            d.device_type ||
                            "Unknown device"}
                        </span>
                        <span
                          style={{
                            color: "var(--text-dim)",
                            fontSize: 11,
                            fontFamily: "DM Mono, monospace",
                          }}
                        >
                          {date(d.last_login_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
