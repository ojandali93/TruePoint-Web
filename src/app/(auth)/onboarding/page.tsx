"use client";
import { useState, Suspense, useCallback, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { ROUTES } from "../../../constants/routes";
import api from "../../../lib/api";
import { useTrialDays } from "../../../hooks/useTrialDays";
import { createClient } from "../../../lib/supabase";
import { PlanProvider, useFlag } from "../../../context/PlanContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "profile" | "plan" | "billing" | "confirm";

// ACE added 2026-08-25 — see constants/grading.ts header note.
const GRADING_COMPANIES = ["PSA", "BGS", "CGC", "TAG", "SGC", "ACE"] as const;

const CURRENCIES = [
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "JPY", label: "JPY — Japanese Yen" },
] as const;

const COLLECTING_YEARS = [
  { value: "less_than_1", label: "Less than 1 year" },
  { value: "1_to_3", label: "1 – 3 years" },
  { value: "3_to_5", label: "3 – 5 years" },
  { value: "5_to_10", label: "5 – 10 years" },
  { value: "over_10", label: "10+ years" },
] as const;

// Numbers verified against truepoint-server/src/services/plan.service.ts's
// FEATURE_MIN_PLAN/MONTHLY_LIMITS/STATIC_LIMITS (source of truth) —
// UX_OVERHAUL_PLAN.md §7 go-live fix, not hand-typed. Previously wrong:
// master sets said 3 (real: 5), arbitrage said 50/mo (real: 15/mo), price
// alerts said 10 cards (real: 5 — watchlist_items, price alerts merged
// into it), AI grading reports and submission tracking weren't listed on
// any tier despite both being free-tier-accessible with real caps
// (5/mo, 5 active respectively) since Phase 1 gate 4. Pro price corrected
// from a stale $24.99 to the decided $14.99/mo (§7); annual pricing lives
// in PLAN_META_V2 below, gated behind pro_pricing_v2 — this legacy object
// stays monthly-only, matching its pre-existing shape.
const PLAN_META = {
  starter: {
    name: "Starter",
    price: "$0",
    cadence: "Free forever",
    color: "#3DAA6E",
    features: [
      "Reverse Holo centering score",
      "AI grading reports (5/mo)",
      "Submission tracking (5 active)",
      "Master set tracker (5 sets)",
      "Card search & live prices",
      "Set browser",
    ],
  },
  collector: {
    name: "Collector",
    price: "$9.99",
    cadence: "per month",
    color: "#C9A84C",
    features: [
      "AI grading reports (5/mo)",
      "Regrade arbitrage (15/mo)",
      "Submission tracking (5 active)",
      "Unlimited master sets",
      "Singles & graded inventory",
      "Price alerts (5 cards)",
    ],
  },
  pro: {
    name: "Pro",
    price: "$14.99",
    cadence: "per month",
    color: "#BA7517",
    features: [
      "Unlimited AI grading reports",
      "Unlimited regrade arbitrage",
      "Unlimited submission tracking",
      "Sealed collection tracking",
      "Full portfolio dashboard",
      "Unlimited price alerts",
    ],
  },
} as const;

// v2 pricing (Free + Pro, monthly/annual) — gated behind the pro_pricing_v2
// flag (UX_OVERHAUL_PLAN.md §7 Phase 1 gate 6, mirrors mobile's
// paywall.tsx showProPricingV2 pattern). Free tier reuses the "starter"
// PlanKey under the hood (checkout/schema untouched — this is a display +
// billingPeriod change, not a new plan type) but is labeled "Free" here.
const PLAN_META_V2 = {
  free: {
    name: "Free",
    price: "$0",
    cadence: "Free forever",
    color: "#3DAA6E",
    features: [
      "Card search & live prices · set browser",
      "Reverse Holo centering score",
      "AI grading reports (5/mo)",
      "Regrade arbitrage (15/mo)",
      "Submission tracking (5 active)",
      "Master set tracker (5 sets)",
      "Watchlist + price alerts (5 cards)",
      "Import — unlimited, always free",
    ],
  },
  pro: {
    monthly: { price: "$14.99", cadence: "per month" },
    annual: { price: "$129.99", cadence: "per year (~$10.83/mo)" },
    color: "#BA7517",
    features: [
      "Unlimited AI grading reports",
      "Unlimited regrade arbitrage",
      "Unlimited submission tracking",
      "Full portfolio dashboard (movers, attribution, history)",
      "Unlimited master sets, watchlist, price alerts",
      "Early access to new features",
    ],
  },
} as const;

type BillingPeriod = "monthly" | "annual";

type PlanKey = keyof typeof PLAN_META;

interface PlanDisplay {
  name: string;
  price: string;
  cadence: string;
  color: string;
  features: readonly string[];
}

// Single lookup every step reads through — legacy PLAN_META when the flag
// is off (or for "collector", which v2 retires from display entirely),
// PLAN_META_V2 when on. Keeps the flag/billingPeriod branching in one
// place instead of duplicated across PlanSummaryCard/PlanStep/BillingStep/
// ConfirmStep.
function planDisplay(
  plan: PlanKey,
  v2: boolean,
  billingPeriod: BillingPeriod,
): PlanDisplay {
  if (v2 && plan === "starter") {
    return { ...PLAN_META_V2.free, name: "Free" };
  }
  if (v2 && plan === "pro") {
    const pricing = PLAN_META_V2.pro[billingPeriod];
    return {
      name: "Pro",
      price: pricing.price,
      cadence: pricing.cadence,
      color: PLAN_META_V2.pro.color,
      features: PLAN_META_V2.pro.features,
    };
  }
  return PLAN_META[plan];
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

// Step 1 — username + preferences only (full_name already saved in register)
const profileSchema = z.object({
  username: z
    .string()
    .min(3, "At least 3 characters")
    .max(30, "Maximum 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, and underscores only"),
  currency: z.string(),
  preferred_grading_company: z.string(),
  collecting_years: z.string().optional(),
});

type ProfileData = z.infer<typeof profileSchema>;

// ─── Shared components ────────────────────────────────────────────────────────

function StepIndicator({ current, plan }: { current: Step; plan: PlanKey }) {
  const isPaid = plan !== "starter";
  const steps: { key: Step; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "plan", label: "Plan" },
    ...(isPaid ? [{ key: "billing" as Step, label: "Payment" }] : []),
    { key: "confirm", label: "Confirm" },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        marginBottom: 32,
      }}
    >
      {steps.map((step, i) => {
        const currentIndex = steps.findIndex((s) => s.key === current);
        const isDone = currentIndex > i;
        const isActive = step.key === current;
        return (
          <div
            key={step.key}
            style={{
              display: "flex",
              alignItems: "center",
              flex: i < steps.length - 1 ? 1 : undefined,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: isDone
                    ? "#3DAA6E"
                    : isActive
                      ? "#C9A84C"
                      : "var(--surface-3)",
                  border: `1px solid ${isDone ? "#3DAA6E" : isActive ? "#C9A84C" : "var(--border)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 500,
                  color: isDone || isActive ? "#0D0E11" : "var(--text-dim)",
                  transition: "all 0.3s ease",
                }}
              >
                {isDone ? "✓" : i + 1}
              </div>
              <span
                style={{
                  fontSize: 10,
                  color: isActive ? "var(--text-primary)" : "var(--text-dim)",
                  letterSpacing: "0.04em",
                  fontFamily: "DM Mono, monospace",
                }}
              >
                {step.label.toUpperCase()}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: isDone ? "#3DAA6E" : "var(--border)",
                  margin: "0 8px",
                  marginBottom: 20,
                  transition: "background 0.3s ease",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PlanSummaryCard({
  plan,
  v2,
  billingPeriod,
}: {
  plan: PlanKey;
  v2: boolean;
  billingPeriod: BillingPeriod;
}) {
  const meta = planDisplay(plan, v2, billingPeriod);
  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${meta.color}44`,
        borderRadius: 10,
        padding: "14px 18px",
        marginBottom: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            fontSize: 10,
            color: "var(--text-dim)",
            letterSpacing: "0.08em",
            fontFamily: "DM Mono, monospace",
          }}
        >
          PLAN
        </div>
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          {meta.name}
        </span>
        <span
          style={{
            fontSize: 11,
            color: meta.color,
            fontFamily: "DM Mono, monospace",
            background: `${meta.color}18`,
            padding: "2px 8px",
            borderRadius: 20,
            border: `1px solid ${meta.color}33`,
          }}
        >
          {meta.price}/
          {meta.cadence === "Free forever"
            ? "free"
            : v2 && plan === "pro" && billingPeriod === "annual"
              ? "yr"
              : "mo"}
        </span>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
        {meta.cadence}
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        background: "rgba(201,76,76,0.1)",
        border: "1px solid rgba(201,76,76,0.3)",
        borderRadius: 6,
        padding: "10px 14px",
        fontSize: 13,
        color: "var(--red)",
      }}
    >
      {message}
    </div>
  );
}

function ToggleGroup({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label
        style={{
          fontSize: 12,
          color: "var(--text-secondary)",
          letterSpacing: "0.04em",
          fontWeight: 500,
        }}
      >
        {label}
      </label>
      {hint && (
        <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: -4 }}>
          {hint}
        </p>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type='button'
            onClick={() => onChange(opt.value)}
            style={{
              flex: options.length <= 3 ? 1 : undefined,
              padding: "9px 16px",
              borderRadius: 8,
              border: `1px solid ${value === opt.value ? "var(--gold)" : "var(--border)"}`,
              background:
                value === opt.value
                  ? "rgba(201,168,76,0.12)"
                  : "var(--surface-2)",
              color:
                value === opt.value ? "var(--gold)" : "var(--text-secondary)",
              fontSize: 13,
              fontWeight: value === opt.value ? 500 : 400,
              cursor: "pointer",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 1: Profile setup ────────────────────────────────────────────────────

function ProfileStep({ onNext }: { onNext: (data: ProfileData) => void }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      currency: "USD",
      preferred_grading_company: "PSA",
      collecting_years: "",
    },
  });

  const [serverError, setServerError] = useState<string | null>(null);
  const selectedGrading = watch("preferred_grading_company");
  const selectedCurrency = watch("currency");

  const onSubmit = async (data: ProfileData) => {
    setServerError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const fullName = user?.user_metadata?.full_name ?? null;

      await api.put("/users/me", {
        username: data.username,
        full_name: fullName, // ← pull from auth metadata
        currency: data.currency,
        preferred_grading_company: data.preferred_grading_company,
        collecting_years: data.collecting_years || null,
      });

      try {
        await api.post("/users/me/notifications", {
          notify_price_alerts: true,
          notify_grading_updates: true,
          notify_marketing: false,
        });
      } catch {
        // already exists
      }

      onNext(data);
    } catch (err: unknown) {
      setServerError(
        err instanceof Error
          ? err.message
          : "Failed to save profile. Please try again.",
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          Set up your profile
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >
          Choose a username and set your collection preferences.
        </p>
      </div>

      {serverError && <ErrorBanner message={serverError} />}

      <Input
        label='Username'
        placeholder='charizard_collector'
        error={errors.username?.message}
        hint='Public — letters, numbers, and underscores only'
        autoComplete='username'
        {...register("username")}
      />

      <Input
        label='Years collecting'
        placeholder='e.g. 5'
        inputMode='numeric'
        error={errors.collecting_years?.message}
        {...register("collecting_years")}
      />

      {/* Currency */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            letterSpacing: "0.04em",
            fontWeight: 500,
          }}
        >
          Currency preference
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              type='button'
              onClick={() => setValue("currency", c.code)}
              style={{
                padding: "7px 14px",
                borderRadius: 6,
                border: `1px solid ${selectedCurrency === c.code ? "var(--gold)" : "var(--border)"}`,
                background:
                  selectedCurrency === c.code
                    ? "rgba(201,168,76,0.12)"
                    : "var(--surface-2)",
                color:
                  selectedCurrency === c.code
                    ? "var(--gold)"
                    : "var(--text-secondary)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "DM Mono, monospace",
                transition: "all 0.15s ease",
              }}
            >
              {c.code}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
          {CURRENCIES.find((c) => c.code === selectedCurrency)?.label}
        </span>
      </div>

      {/* Grading company */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            letterSpacing: "0.04em",
            fontWeight: 500,
          }}
        >
          Preferred grading company
        </label>
        <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: -4 }}>
          Used as the default in centering predictions and regrade calculations.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          {GRADING_COMPANIES.map((company) => (
            <button
              key={company}
              type='button'
              onClick={() => setValue("preferred_grading_company", company)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 8,
                border: `1px solid ${selectedGrading === company ? "var(--gold)" : "var(--border)"}`,
                background:
                  selectedGrading === company
                    ? "rgba(201,168,76,0.12)"
                    : "var(--surface-2)",
                color:
                  selectedGrading === company
                    ? "var(--gold)"
                    : "var(--text-secondary)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {company}
            </button>
          ))}
        </div>
      </div>

      <Button
        type='submit'
        variant='primary'
        size='lg'
        fullWidth
        loading={isSubmitting}
        style={{ marginTop: 8 }}
      >
        Continue
      </Button>
    </form>
  );
}

// ─── Step 3: Billing ──────────────────────────────────────────────────────────

function BillingStep({
  plan,
  v2,
  billingPeriod,
  onNext,
  onBack,
}: {
  plan: PlanKey;
  v2: boolean;
  billingPeriod: BillingPeriod;
  onNext: () => void;
  onBack: () => void;
}) {
  const meta = planDisplay(plan, v2, billingPeriod);
  const [sessionError, setSessionError] = useState<string | null>(null);
  // Single source of truth for the trial length shown below — see
  // useTrialDays.ts's own header for why this replaced a hardcoded "14".
  const trialDays = useTrialDays();

  // Only load Stripe when this component mounts — not at module level
  const stripePromise = useMemo(
    () => loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!),
    [],
  );

  const fetchClientSecret = useCallback(async () => {
    try {
      // billingPeriod is included ONLY when the v2 flag is actually on —
      // the server resolves plan==="pro" && billingPeriod straight to
      // STRIPE_PRO_V2_PRICE_IDS regardless of who's asking, so sending it
      // unconditionally would silently move every "pro" checkout onto the
      // new (not-yet-approved-for-launch) Stripe prices the moment this
      // shipped, flag or no flag. v2-off pro checkouts must keep resolving
      // to the legacy STRIPE_PRICE_IDS.pro price exactly as before.
      const res = await api.post<{
        data: { clientSecret: string; sessionId: string };
      }>("/billing/create-checkout-session", {
        plan,
        ...(v2 && plan === "pro" ? { billingPeriod } : {}),
      });
      return res.data.data.clientSecret;
    } catch (err: unknown) {
      setSessionError(
        err instanceof Error ? err.message : "Failed to initialize payment",
      );
      return "";
    }
  }, [plan, v2, billingPeriod]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          Start your free trial
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >
          {trialDays} days free — you won&apos;t be charged until your trial
          ends. Cancel anytime.
        </p>
      </div>

      {/* Trial summary */}
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
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              {meta.name} plan
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                marginTop: 2,
              }}
            >
              {trialDays}-day free trial
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 11,
                color: "#3DAA6E",
                fontFamily: "DM Mono, monospace",
                marginBottom: 2,
              }}
            >
              FREE FOR 14 DAYS
            </div>
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
              then {meta.price} {meta.cadence}
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 20px" }}>
          {meta.features.map((f) => (
            <div
              key={f}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 0",
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              <span style={{ color: meta.color, fontSize: 11 }}>✓</span>
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Stripe embedded checkout */}
      {sessionError ? (
        <ErrorBanner message={sessionError} />
      ) : (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ fetchClientSecret, onComplete: onNext }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      )}

      <Button
        type='button'
        variant='ghost'
        size='md'
        fullWidth
        onClick={onBack}
      >
        ← Back
      </Button>

      <p
        style={{
          fontSize: 11,
          color: "var(--text-dim)",
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        Secured by Stripe. Reverse Holo never stores your card details.
        <br />
        Cancel anytime before the trial ends.
      </p>
    </div>
  );
}

// ─── Step 4: Confirm ──────────────────────────────────────────────────────────

function ConfirmStep({
  plan,
  v2,
  billingPeriod,
  profileData,
  onFinish,
}: {
  plan: PlanKey;
  v2: boolean;
  billingPeriod: BillingPeriod;
  profileData: ProfileData | null;
  onFinish: () => void;
}) {
  const meta = planDisplay(plan, v2, billingPeriod);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(61,170,110,0.15)",
          border: "1px solid rgba(61,170,110,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          marginTop: 8,
        }}
      >
        ✓
      </div>

      <div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 8,
          }}
        >
          You&apos;re all set
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            lineHeight: 1.7,
            maxWidth: 340,
          }}
        >
          Welcome to Reverse Holo, collector. Your{" "}
          <span style={{ color: meta.color }}>{meta.name}</span> account is
          ready.
        </p>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "20px 24px",
          width: "100%",
          textAlign: "left",
        }}
      >
        {[
          { label: "Username", value: `@${profileData?.username ?? "—"}` },
          { label: "Plan", value: `${meta.name} — ${meta.cadence}` },
          { label: "Currency", value: profileData?.currency ?? "USD" },
          {
            label: "Default grading",
            value: profileData?.preferred_grading_company ?? "PSA",
          },
        ].map((row, i, arr) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom:
                i < arr.length - 1 ? "1px solid var(--border)" : "none",
              fontSize: 13,
            }}
          >
            <span style={{ color: "var(--text-secondary)" }}>{row.label}</span>
            <span
              style={{
                color: "var(--text-primary)",
                fontFamily:
                  row.label === "Username" ? "DM Mono, monospace" : "inherit",
                fontSize: row.label === "Username" ? 12 : 13,
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <Button
        type='button'
        variant='primary'
        size='lg'
        fullWidth
        onClick={onFinish}
        style={{ marginTop: 4 }}
      >
        Go to dashboard
      </Button>
    </div>
  );
}

// ─── Main flow ────────────────────────────────────────────────────────────────

// ─── Step 2: Plan selection (the single paywall — matches mobile) ──────────────

function PlanStep({
  initialPlan,
  v2,
  billingPeriod,
  onBillingPeriodChange,
  onSelect,
  onBack,
}: {
  initialPlan: PlanKey;
  v2: boolean;
  billingPeriod: BillingPeriod;
  onBillingPeriodChange: (period: BillingPeriod) => void;
  onSelect: (plan: PlanKey) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<PlanKey>(
    initialPlan === "starter" ? "collector" : initialPlan,
  );
  // v2 retires the Collector tier from display entirely (§7: Free + Pro
  // only) — Pro is the sole paid option once the flag is on.
  const paid: PlanKey[] = v2 ? ["pro"] : ["collector", "pro"];
  // Single source of truth — this screen previously hardcoded "7", which
  // contradicted BillingStep's "14" one step later in the same flow (both
  // now read the same live value). See useTrialDays.ts.
  const trialDays = useTrialDays();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          Choose your plan
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >
          Start with a {trialDays}-day free trial. Cancel anytime.
        </p>
      </div>

      {v2 && (
        <ToggleGroup
          label='Billing'
          hint='Annual saves ~28% vs. monthly'
          options={[
            { value: "monthly", label: "Monthly" },
            { value: "annual", label: "Annual" },
          ]}
          value={billingPeriod}
          onChange={(val) => onBillingPeriodChange(val as BillingPeriod)}
        />
      )}

      {paid.map((key) => {
        const meta = planDisplay(key, v2, billingPeriod);
        const isSel = selected === key;
        return (
          <button
            key={key}
            type='button'
            onClick={() => setSelected(key)}
            style={{
              textAlign: "left",
              background: isSel ? "rgba(201,168,76,0.08)" : "var(--surface-2)",
              border: `${isSel ? 2 : 1}px solid ${isSel ? "var(--gold)" : "var(--border)"}`,
              borderRadius: 12,
              padding: 20,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              fontFamily: "inherit",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    border: `2px solid ${isSel ? "var(--gold)" : "var(--border)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {isSel && (
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        background: "var(--gold)",
                      }}
                    />
                  )}
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {meta.name}
                </span>
                {key === "collector" && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      color: "#0E0E12",
                      background: "var(--gold)",
                      borderRadius: 5,
                      padding: "2px 6px",
                    }}
                  >
                    MOST POPULAR
                  </span>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: isSel ? "var(--gold)" : "var(--text-primary)",
                  }}
                >
                  {meta.price}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#3DAA6E",
                    fontWeight: 600,
                  }}
                >
                  {trialDays}-day free trial
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {meta.features.map((f) => (
                <div
                  key={f}
                  style={{ fontSize: 12, color: "var(--text-secondary)" }}
                >
                  • {f}
                </div>
              ))}
            </div>
          </button>
        );
      })}

      <Button
        type='button'
        variant='primary'
        size='lg'
        fullWidth
        onClick={() => onSelect(selected)}
        style={{ marginTop: 4 }}
      >
        Start {trialDays}-day free trial
      </Button>

      <button
        type='button'
        onClick={() => onSelect("starter")}
        style={{
          background: "none",
          border: "none",
          color: "var(--text-secondary)",
          fontSize: 13,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {v2 ? "Continue with Free" : "Continue with Starter (free)"}
      </button>

      <button
        type='button'
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: "var(--text-dim)",
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        &larr; Back
      </button>
    </div>
  );
}

function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = (searchParams.get("plan") ?? "collector") as PlanKey;
  const initialPlan: PlanKey = PLAN_META[planParam] ? planParam : "collector";
  // billingPeriod param carried from the marketing page's CTA
  // (/register?plan=pro&billingPeriod=annual), same pattern as ?plan=.
  // Only meaningful once v2 is on and plan is "pro"; annual-defaulted to
  // match mobile paywall.tsx's showProPricingV2 toggle default.
  const billingPeriodParam = searchParams.get("billingPeriod");
  const initialBillingPeriod: BillingPeriod =
    billingPeriodParam === "monthly" ? "monthly" : "annual";

  const v2 = useFlag("pro_pricing_v2");
  const [step, setStep] = useState<Step>("profile");
  const [plan, setPlan] = useState<PlanKey>(initialPlan);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(
    initialBillingPeriod,
  );
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const isPaid = plan !== "starter";

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      api
        .post("/billing/verify-session", { sessionId })
        .then(async () => {
          try {
            await api.post("/auth/send-verification-email", {});
          } catch (err) {
            console.error("Failed to send verification email:", err);
          }
          router.push("/verify-email");
        })
        .catch((err) => {
          console.error("Session verify failed:", err);
          router.push("/verify-email");
        });
    }
  }, [searchParams, router]);

  const handleProfileNext = (data: ProfileData) => {
    setProfileData(data);
    setStep("plan");
  };

  const handlePlanSelect = (chosen: PlanKey) => {
    setPlan(chosen);
    setStep(chosen !== "starter" ? "billing" : "confirm");
  };

  const handleBillingNext = () => setStep("confirm");

  const handleFinish = async () => {
    try {
      await api.post("/auth/send-verification-email", {});
    } catch (err) {
      console.error("[Onboarding] send verification email failed:", err);
    }
    router.push("/verify-email");
  };

  return (
    <div>
      <StepIndicator current={step} plan={plan} />
      {(step === "billing" || step === "confirm") && (
        <PlanSummaryCard plan={plan} v2={v2} billingPeriod={billingPeriod} />
      )}

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "32px",
        }}
      >
        {step === "profile" && <ProfileStep onNext={handleProfileNext} />}
        {step === "plan" && (
          <PlanStep
            initialPlan={initialPlan}
            v2={v2}
            billingPeriod={billingPeriod}
            onBillingPeriodChange={setBillingPeriod}
            onSelect={handlePlanSelect}
            onBack={() => setStep("profile")}
          />
        )}
        {step === "billing" && isPaid && (
          <BillingStep
            plan={plan}
            v2={v2}
            billingPeriod={billingPeriod}
            onNext={handleBillingNext}
            onBack={() => setStep("plan")}
          />
        )}
        {step === "confirm" && (
          <ConfirmStep
            plan={plan}
            v2={v2}
            billingPeriod={billingPeriod}
            profileData={profileData}
            onFinish={handleFinish}
          />
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    // PlanProvider scoped to this page only, not the shared (auth) layout
    // — /login and /register (also under (auth)) have no session yet, and
    // PlanContext's GET /me/plan would just 401 there. By the time a user
    // reaches onboarding they're already signed in (register.tsx's
    // supabase.auth.signUp already ran), so it's safe here. Degrades
    // gracefully either way — PlanContext swallows fetch failures and
    // useFlag returns false while loading/on error (see its own header
    // comment), so a failed fetch just means the legacy UI renders.
    <PlanProvider>
      <Suspense
        fallback={
          <div
            style={{
              color: "var(--text-secondary)",
              textAlign: "center",
              padding: 40,
            }}
          >
            Loading...
          </div>
        }
      >
        <OnboardingFlow />
      </Suspense>
    </PlanProvider>
  );
}
