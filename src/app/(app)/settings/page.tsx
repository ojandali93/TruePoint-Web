"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../lib/supabase";
import { ROUTES } from "../../../constants/routes";

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

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<string>("collector");

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

      // Pull basic stats
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
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace(ROUTES.HOME);
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
      {/* Page header — visible on desktop */}
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
        {/* ── Profile card ── */}
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
          {/* Avatar */}
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

          {/* Info */}
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

        {/* ── Stats strip ── */}
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

        {/* ── Settings section ── */}
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

        {/* ── Admin section — only shown if admin ── */}
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

        {/* ── Sign out ── */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "0 20px",
          }}
        >
          <SettingsRow
            icon='↪'
            label='Sign out'
            danger
            onClick={handleSignOut}
          />
        </div>

        {/* Version info */}
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
    </div>
  );
}
