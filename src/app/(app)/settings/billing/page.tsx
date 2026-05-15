/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

interface Subscription {
  id: string;
  plan: "starter" | "collector" | "pro";
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
}

const PLAN_DISPLAY: Record<
  string,
  { name: string; price: string; perks: string[] }
> = {
  starter: {
    name: "Starter",
    price: "$0/mo",
    perks: ["TruePoint centering", "3 master sets", "Card search"],
  },
  collector: {
    name: "Collector",
    price: "$9.99/mo",
    perks: [
      "100 AI grading reports/mo",
      "4 submissions/mo",
      "Inventory tracking",
      "50 regrade arbitrage/mo",
    ],
  },
  pro: {
    name: "Pro",
    price: "$19.99/mo",
    perks: [
      "Unlimited AI grading",
      "Unlimited submissions",
      "Sealed inventory",
      "Full portfolio dashboard",
    ],
  },
};

const STATUS_COLORS: Record<string, string> = {
  trialing: "#3B82F6",
  active: "#10B981",
  past_due: "#F59E0B",
  canceled: "#EF4444",
  incomplete: "#F59E0B",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BillingSettingsPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await api.get<{ data: Subscription | null }>(
        "/billing/subscription",
      );
      setSubscription(res.data.data);
    } catch (err) {
      console.error("[Billing] load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const handleCancel = async () => {
    if (
      !window.confirm(
        "Cancel your subscription? You'll keep access until the end of your current period.",
      )
    )
      return;
    setCanceling(true);
    setError(null);
    setMessage(null);
    try {
      await api.post("/billing/cancel");
      setMessage("Subscription canceled. Access continues until period end.");
      await load();
    } catch (err) {
      console.error("[Billing] cancel failed:", err);
      setError("Couldn't cancel. Please try again or contact support.");
    } finally {
      setCanceling(false);
    }
  };

  const handleUpgrade = (plan: "collector" | "pro") => {
    router.push(`/onboarding?plan=${plan}`);
  };

  const plan = subscription?.plan ?? "starter";
  const planInfo = PLAN_DISPLAY[plan];
  const statusColor = STATUS_COLORS[subscription?.status ?? ""] ?? "#6B7280";

  return (
    <div
      style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px 120px" }}
    >
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
        BILLING
      </div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 500,
          color: "var(--text-primary)",
          marginBottom: 4,
        }}
      >
        Subscription
      </h1>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-secondary)",
          marginBottom: 28,
        }}
      >
        Manage your TruePoint plan
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
        <>
          {/* Current plan card */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 22,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 14,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-dim)",
                    fontFamily: "DM Mono, monospace",
                    letterSpacing: "0.08em",
                    marginBottom: 4,
                  }}
                >
                  CURRENT PLAN
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  {planInfo.name}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--gold)",
                    fontFamily: "DM Mono, monospace",
                    marginTop: 2,
                  }}
                >
                  {planInfo.price}
                </div>
              </div>
              {subscription && (
                <span
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 12,
                    background: `${statusColor}20`,
                    color: statusColor,
                    border: `1px solid ${statusColor}40`,
                    fontFamily: "DM Mono, monospace",
                    fontWeight: 500,
                    textTransform: "uppercase",
                  }}
                >
                  {subscription.status.replace("_", " ")}
                </span>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginBottom: 16,
              }}
            >
              {planInfo.perks.map((perk) => (
                <div
                  key={perk}
                  style={{ fontSize: 13, color: "var(--text-secondary)" }}
                >
                  <span style={{ color: "#10B981", marginRight: 8 }}>✓</span>
                  {perk}
                </div>
              ))}
            </div>

            {subscription && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                  paddingTop: 14,
                  borderTop: "1px solid var(--border)",
                  fontSize: 11,
                  fontFamily: "DM Mono, monospace",
                  color: "var(--text-dim)",
                }}
              >
                {subscription.trialEndsAt && (
                  <div>
                    <div style={{ marginBottom: 2 }}>TRIAL ENDS</div>
                    <div style={{ color: "var(--text-primary)" }}>
                      {fmtDate(subscription.trialEndsAt)}
                    </div>
                  </div>
                )}
                {subscription.currentPeriodEnd && (
                  <div>
                    <div style={{ marginBottom: 2 }}>RENEWS</div>
                    <div style={{ color: "var(--text-primary)" }}>
                      {fmtDate(subscription.currentPeriodEnd)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Plan switcher */}
          {plan !== "pro" && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid rgba(201,168,76,0.3)",
                borderRadius: 14,
                padding: 20,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  marginBottom: 6,
                }}
              >
                {plan === "starter"
                  ? "Upgrade to a paid plan"
                  : "Upgrade to Pro"}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginBottom: 14,
                }}
              >
                {plan === "starter"
                  ? "Unlock inventory tracking, AI grading reports, and submission tracking."
                  : "Unlock unlimited AI grading, sealed inventory, and the full portfolio dashboard."}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {plan === "starter" && (
                  <button
                    onClick={() => handleUpgrade("collector")}
                    style={{
                      padding: "9px 16px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--surface-2)",
                      color: "var(--text-primary)",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Upgrade to Collector — $9.99/mo
                  </button>
                )}
                <button
                  onClick={() => handleUpgrade("pro")}
                  style={{
                    padding: "9px 16px",
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
                  Upgrade to Pro — $19.99/mo
                </button>
              </div>
            </div>
          )}

          {/* Cancel subscription */}
          {subscription &&
            subscription.status !== "canceled" &&
            plan !== "starter" && (
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    marginBottom: 4,
                  }}
                >
                  Cancel subscription
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginBottom: 12,
                  }}
                >
                  You&apos;ll keep access until the end of your current period.
                </div>
                <button
                  onClick={handleCancel}
                  disabled={canceling}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid rgba(239,68,68,0.3)",
                    background: "transparent",
                    color: "#EF4444",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: canceling ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    opacity: canceling ? 0.6 : 1,
                  }}
                >
                  {canceling ? "Canceling…" : "Cancel subscription"}
                </button>
              </div>
            )}

          {message && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 14px",
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.3)",
                borderRadius: 8,
                color: "#10B981",
                fontSize: 12,
              }}
            >
              {message}
            </div>
          )}
          {error && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 14px",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 8,
                color: "#EF4444",
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}
