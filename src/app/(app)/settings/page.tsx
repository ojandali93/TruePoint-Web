/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../lib/supabase";
import { ROUTES } from "../../../constants/routes";
import { deactivateCurrentDevice } from "@/lib/deviceTracking";
import { getDeviceId } from "@/lib/device";
import api from "@/lib/api";

interface Profile {
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface Stats {
  totalCards: number;
  gradedCards: number;
  portfolioValue: number;
}

interface DeviceRow {
  id: string;
  deviceId: string | null;
  deviceName: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  lastSeen: string | null;
  firstSeenAt: string | null;
}

function SettingsRow({
  icon,
  label,
  sublabel,
  href,
  danger,
  onClick,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  href?: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 0",
        borderBottom: "1px solid var(--border)",
        cursor: "pointer",
        width: "100%",
      }}
    >
      <span
        style={{
          fontSize: 18,
          color: danger ? "var(--red)" : "var(--gold)",
          width: 24,
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 14,
            color: danger ? "var(--red)" : "var(--text-primary)",
            fontWeight: 400,
          }}
        >
          {label}
        </div>
        {sublabel && (
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
            {sublabel}
          </div>
        )}
      </div>
      {!danger && (
        <span style={{ fontSize: 14, color: "var(--text-dim)" }}>›</span>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          fontFamily: "inherit",
          textAlign: "left",
          padding: 0,
          cursor: "pointer",
        }}
      >
        {content}
      </button>
    );
  }

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none", display: "block" }}>
        {content}
      </Link>
    );
  }

  return content;
}

// ─── Active sessions helpers ───────────────────────────────────────────────

function deviceIcon(t: string | null): string {
  if (t === "mobile") return "📱";
  if (t === "tablet") return "📲";
  return "💻";
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function ActiveSessions({
  devices,
  currentDeviceId,
  onRevoke,
  refreshing,
}: {
  devices: DeviceRow[];
  currentDeviceId: string | null;
  onRevoke: (id: string) => Promise<void>;
  refreshing: boolean;
}) {
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleRevoke = async (rowId: string) => {
    if (
      !window.confirm(
        "Sign out this device? It will need to log in again to use TruePoint.",
      )
    )
      return;
    setRevokingId(rowId);
    try {
      await onRevoke(rowId);
    } catch (err) {
      console.error("[Settings] revoke device failed:", err);
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "0 20px",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "var(--text-dim)",
          letterSpacing: "0.08em",
          fontFamily: "DM Mono, monospace",
          paddingTop: 14,
          paddingBottom: 8,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>ACTIVE SESSIONS</span>
        {refreshing && (
          <span
            style={{
              fontSize: 9,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            refreshing…
          </span>
        )}
      </div>

      {devices.length === 0 ? (
        <div
          style={{
            padding: "16px 0 18px",
            fontSize: 12,
            color: "var(--text-dim)",
          }}
        >
          No active sessions found.
        </div>
      ) : (
        devices.map((d, i) => {
          const isCurrent = d.deviceId === currentDeviceId;
          const isLast = i === devices.length - 1;
          return (
            <div
              key={d.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 0",
                borderBottom: isLast ? "none" : "1px solid var(--border)",
              }}
            >
              <span style={{ fontSize: 22, width: 24, textAlign: "center" }}>
                {deviceIcon(d.deviceType)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {d.deviceName ?? "Unknown device"}
                  </span>
                  {isCurrent && (
                    <span
                      style={{
                        fontSize: 9,
                        padding: "2px 6px",
                        borderRadius: 10,
                        background: "rgba(16,185,129,0.12)",
                        color: "#10B981",
                        border: "1px solid rgba(16,185,129,0.3)",
                        fontFamily: "DM Mono, monospace",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      This device
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-dim)",
                    marginTop: 2,
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  Last active {relativeTime(d.lastSeen ?? d.lastLoginAt)}
                </div>
              </div>
              {!isCurrent && (
                <button
                  onClick={() => handleRevoke(d.id)}
                  disabled={revokingId === d.id}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 7,
                    border: "1px solid rgba(239,68,68,0.3)",
                    background: "transparent",
                    color: "#EF4444",
                    fontSize: 11,
                    cursor: revokingId === d.id ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    fontWeight: 500,
                    opacity: revokingId === d.id ? 0.6 : 1,
                  }}
                >
                  {revokingId === d.id ? "…" : "Sign out"}
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Deactivate account modal ──────────────────────────────────────────────

function DeactivateModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");

  const handleConfirm = async () => {
    setConfirming(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      console.error("[Settings] deactivate failed", err);
      setError("Couldn't deactivate your account. Please contact support.");
      setConfirming(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 250,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 24,
          width: "100%",
          maxWidth: 420,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "#EF4444",
            fontFamily: "DM Mono, monospace",
            letterSpacing: "0.08em",
            marginBottom: 4,
          }}
        >
          DEACTIVATE ACCOUNT
        </div>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 14,
          }}
        >
          Are you sure?
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            marginBottom: 14,
          }}
        >
          Deactivating will sign you out of all devices and cancel your
          subscription at period end. Your data is preserved for 30 days in case
          you change your mind. Contact support for permanent deletion.
        </p>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-dim)",
            marginBottom: 6,
          }}
        >
          Type{" "}
          <strong style={{ color: "var(--text-primary)" }}>DEACTIVATE</strong>{" "}
          to confirm:
        </div>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder='DEACTIVATE'
          style={{
            width: "100%",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "9px 12px",
            fontSize: 13,
            color: "var(--text-primary)",
            fontFamily: "DM Mono, monospace",
            outline: "none",
            boxSizing: "border-box",
            marginBottom: 14,
          }}
        />
        {error && (
          <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 10 }}>
            {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={confirming}
            style={{
              padding: "9px 16px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={typed !== "DEACTIVATE" || confirming}
            style={{
              padding: "9px 16px",
              borderRadius: 8,
              border: "none",
              background: "#EF4444",
              color: "#fff",
              fontSize: 12,
              fontWeight: 500,
              cursor:
                typed === "DEACTIVATE" && !confirming
                  ? "pointer"
                  : "not-allowed",
              fontFamily: "inherit",
              opacity: typed === "DEACTIVATE" && !confirming ? 1 : 0.5,
            }}
          >
            {confirming ? "Deactivating…" : "Deactivate"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main settings page ────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<string>("starter");

  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [devicesRefreshing, setDevicesRefreshing] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [showDeactivate, setShowDeactivate] = useState(false);

  const loadDevices = useCallback(async () => {
    setDevicesRefreshing(true);
    try {
      const res = await api.get<{ data: DeviceRow[] }>(
        "/auth/devices?activeOnly=true",
      );
      setDevices(res.data.data);
    } catch (err) {
      console.error("[Settings] device load failed:", err);
    } finally {
      setDevicesRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setCurrentDeviceId(getDeviceId());
      void loadDevices();
    }, 0);
    return () => window.clearTimeout(t);
  }, [loadDevices]);

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace(ROUTES.HOME);
        return;
      }

      setUserEmail(session.user.email ?? null);
      setIsAdmin(session.user.app_metadata?.role === "admin");

      const { data: prof } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url")
        .eq("id", session.user.id)
        .single();
      if (prof) setProfile(prof);

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (sub?.plan) setPlan(sub.plan);

      const [cardsRes, gradedRes] = await Promise.all([
        supabase
          .from("inventory")
          .select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id),
        supabase
          .from("inventory")
          .select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id)
          .eq("item_type", "graded_card"),
      ]);

      setStats({
        totalCards: cardsRes.count ?? 0,
        gradedCards: gradedRes.count ?? 0,
        portfolioValue: 0,
      });

      setLoading(false);
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRevokeDevice = useCallback(
    async (rowId: string) => {
      await api.delete(`/auth/devices/${rowId}`);
      await loadDevices();
    },
    [loadDevices],
  );

  const handleSignOut = async () => {
    await deactivateCurrentDevice();
    await supabase.auth.signOut();
    router.replace(ROUTES.HOME);
  };

  const handleDeactivate = async () => {
    await api.post("/users/me/deactivate");
    // Server invalidates the session — we just sign out locally too
    await supabase.auth.signOut();
    router.replace("/");
  };

  const displayName = profile?.full_name ?? profile?.username ?? "Collector";
  const initials = displayName.charAt(0).toUpperCase();

  if (loading) {
    return (
      <div
        style={{
          padding: 24,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 300,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            border: "2px solid var(--border)",
            borderTopColor: "var(--gold)",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div
        className='settings-desktop-header'
        style={{ padding: "32px 32px 0" }}
      >
        <div
          style={{
            fontSize: 10,
            color: "var(--text-dim)",
            letterSpacing: "0.08em",
            fontFamily: "DM Mono, monospace",
            marginBottom: 8,
          }}
        >
          PROFILE
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          Account
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Manage your profile, settings, and preferences
        </p>
      </div>

      <div style={{ padding: "24px 24px 120px" }}>
        {/* Profile card */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 20,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(201,168,76,0.15)",
              border: "1px solid rgba(201,168,76,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: "var(--gold)",
                fontFamily: "DM Mono, monospace",
              }}
            >
              {initials}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: "var(--text-primary)",
                marginBottom: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-dim)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                marginBottom: 6,
              }}
            >
              {userEmail}
            </div>
            <span
              style={{
                fontSize: 10,
                padding: "3px 8px",
                borderRadius: 4,
                background: "rgba(201,168,76,0.15)",
                color: "var(--gold)",
                border: "1px solid rgba(201,168,76,0.3)",
                fontFamily: "DM Mono, monospace",
                letterSpacing: "0.04em",
              }}
            >
              {plan.toUpperCase()} PLAN
            </span>
          </div>
        </div>

        {/* Stats strip */}
        {stats && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "14px 16px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                {stats.totalCards.toLocaleString()}
              </div>
              <div
                style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}
              >
                items tracked
              </div>
            </div>
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "14px 16px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                {stats.gradedCards.toLocaleString()}
              </div>
              <div
                style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}
              >
                graded cards
              </div>
            </div>
          </div>
        )}

        {/* Settings */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "0 20px",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              letterSpacing: "0.08em",
              fontFamily: "DM Mono, monospace",
              paddingTop: 14,
              paddingBottom: 4,
            }}
          >
            SETTINGS
          </div>
          <SettingsRow
            icon='🔔'
            label='Notifications'
            sublabel='Price alerts and submission updates'
            href={ROUTES.SETTINGS_NOTIFICATIONS}
          />
          <SettingsRow
            icon='💳'
            label='Subscription & billing'
            sublabel={`${plan.charAt(0).toUpperCase() + plan.slice(1)} plan`}
            href={ROUTES.SETTINGS_BILLING}
          />
          <div style={{ borderBottom: "none" }}>
            <SettingsRow
              icon='⚙'
              label='Account settings'
              sublabel='Email, password, and profile'
              href={ROUTES.SETTINGS}
            />
          </div>
        </div>

        {/* Active sessions */}
        <ActiveSessions
          devices={devices}
          currentDeviceId={currentDeviceId}
          onRevoke={handleRevokeDevice}
          refreshing={devicesRefreshing}
        />

        {/* Support & legal */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "0 20px",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              letterSpacing: "0.08em",
              fontFamily: "DM Mono, monospace",
              paddingTop: 14,
              paddingBottom: 4,
            }}
          >
            SUPPORT & LEGAL
          </div>
          <SettingsRow
            icon='💬'
            label='Contact support'
            sublabel='Tap the chat bubble (bottom right) on any page'
          />
          <div style={{ borderBottom: "none" }}>
            <SettingsRow
              icon='📄'
              label='Terms of service'
              sublabel='Read our terms and policies'
              href='/terms'
            />
          </div>
        </div>

        {/* Admin section */}
        {isAdmin && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid rgba(201,168,76,0.25)",
              borderRadius: 14,
              padding: "0 20px",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--gold-dim)",
                letterSpacing: "0.08em",
                fontFamily: "DM Mono, monospace",
                paddingTop: 14,
                paddingBottom: 4,
              }}
            >
              ADMIN
            </div>
            <SettingsRow
              icon='⬡'
              label='Admin dashboard'
              sublabel='Users, sync, analytics'
              href={ROUTES.ADMIN}
            />
            <SettingsRow
              icon='⬡'
              label='Variant management'
              sublabel='Card variant rules and sync'
              href={ROUTES.ADMIN_VARIANTS}
            />
            <div style={{ borderBottom: "none" }}>
              <SettingsRow
                icon='⬡'
                label='Analytics'
                sublabel='User and collection analytics'
                href={ROUTES.ADMIN_ANALYTICS_USERS}
              />
            </div>
          </div>
        )}

        {/* Sign out */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "0 20px",
            marginBottom: 12,
          }}
        >
          <SettingsRow
            icon='↪'
            label='Sign out'
            danger
            onClick={handleSignOut}
          />
        </div>

        {/* Danger zone */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 14,
            padding: "0 20px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#EF4444",
              letterSpacing: "0.08em",
              fontFamily: "DM Mono, monospace",
              paddingTop: 14,
              paddingBottom: 4,
            }}
          >
            DANGER ZONE
          </div>
          <SettingsRow
            icon='⊗'
            label='Deactivate account'
            sublabel='Sign out all devices and cancel subscription'
            danger
            onClick={() => setShowDeactivate(true)}
          />
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: 24,
            fontSize: 11,
            color: "var(--text-dim)",
            fontFamily: "DM Mono, monospace",
          }}
        >
          TruePoint TCG · v1.0
        </div>
      </div>

      {showDeactivate && (
        <DeactivateModal
          onClose={() => setShowDeactivate(false)}
          onConfirm={handleDeactivate}
        />
      )}
    </div>
  );
}
