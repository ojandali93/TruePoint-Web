/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

interface NotificationSettings {
  notify_price_alerts: boolean;
  notify_grading_updates: boolean;
  notify_marketing: boolean;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>({
    notify_price_alerts: true,
    notify_grading_updates: true,
    notify_marketing: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ data: NotificationSettings }>(
          "/users/me/notifications",
        );
        if (!cancelled) setSettings(res.data.data);
      } catch (err: any) {
        // If 404, the row hasn't been created yet — that's fine, defaults
        // are already in state. PUT below will create it.
        if (err?.response?.status !== 404) {
          console.error("[Notifications] load failed:", err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings((p) => ({ ...p, [key]: !p[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      // Use PUT — server handles both create and update
      await api.put("/users/me/notifications", settings);
      setSavedMessage("Preferences saved");
      setTimeout(() => setSavedMessage(null), 2500);
    } catch (err) {
      console.error("[Notifications] save failed:", err);
      setError("Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px 120px" }}
    >
      {/* Back link */}
      <Link
        href='/settings'
        style={{
          fontSize: 12,
          color: "var(--text-dim)",
          textDecoration: "none",
          marginBottom: 16,
          display: "inline-block",
        }}
      >
        ← Back to settings
      </Link>

      <div
        style={{
          fontSize: 10,
          color: "var(--text-dim)",
          letterSpacing: "0.08em",
          fontFamily: "DM Mono, monospace",
          marginBottom: 8,
        }}
      >
        SETTINGS
      </div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 500,
          color: "var(--text-primary)",
          marginBottom: 4,
        }}
      >
        Notifications
      </h1>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-secondary)",
          marginBottom: 28,
        }}
      >
        Choose which emails and alerts you receive
      </p>

      {loading ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--text-dim)",
            fontSize: 13,
          }}
        >
          Loading…
        </div>
      ) : (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "0 20px",
          }}
        >
          <ToggleRow
            label='Price alerts'
            sublabel='When cards you watch change in value'
            value={settings.notify_price_alerts}
            onChange={() => handleToggle("notify_price_alerts")}
          />
          <ToggleRow
            label='Grading updates'
            sublabel='When your submissions advance through grading'
            value={settings.notify_grading_updates}
            onChange={() => handleToggle("notify_grading_updates")}
          />
          <ToggleRow
            label='Product news'
            sublabel='New features and TruePoint updates'
            value={settings.notify_marketing}
            onChange={() => handleToggle("notify_marketing")}
            isLast
          />
        </div>
      )}

      {/* Save bar */}
      <div
        style={{
          marginTop: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
          {savedMessage && (
            <span style={{ color: "#10B981" }}>✓ {savedMessage}</span>
          )}
          {error && <span style={{ color: "#EF4444" }}>{error}</span>}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          style={{
            padding: "10px 20px",
            borderRadius: 9,
            border: "none",
            background: "var(--gold)",
            color: "#0D0E11",
            fontSize: 13,
            fontWeight: 500,
            cursor: saving || loading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: saving || loading ? 0.6 : 1,
          }}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Toggle row ─────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  sublabel,
  value,
  onChange,
  isLast,
}: {
  label: string;
  sublabel?: string;
  value: boolean;
  onChange: () => void;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 0",
        borderBottom: isLast ? "none" : "1px solid var(--border)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            color: "var(--text-primary)",
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
      <button
        onClick={onChange}
        aria-pressed={value}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          border: "none",
          padding: 2,
          cursor: "pointer",
          background: value ? "var(--gold)" : "var(--surface-2)",
          transition: "background 0.18s",
          display: "flex",
          alignItems: "center",
          justifyContent: value ? "flex-end" : "flex-start",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: value ? "#0D0E11" : "var(--text-dim)",
            display: "block",
            transition: "transform 0.18s",
          }}
        />
      </button>
    </div>
  );
}
