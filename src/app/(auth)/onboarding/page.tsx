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
import { createClient } from "../../../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "profile" | "collector" | "billing" | "confirm";

const GRADING_COMPANIES = ["PSA", "BGS", "CGC", "TAG", "SGC"] as const;

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

const PLAN_META = {
  starter: {
    name: "Starter",
    price: "$0",
    cadence: "Free forever",
    color: "#3DAA6E",
    features: [
      "TruePoint centering score",
      "Master set tracker (3 sets)",
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
      "Regrade arbitrage (50/mo)",
      "Unlimited master sets",
      "Singles & graded inventory",
      "Price alerts (10 cards)",
    ],
  },
  pro: {
    name: "Pro",
    price: "$19.99",
    cadence: "per month",
    color: "#BA7517",
    features: [
      "Unlimited regrade arbitrage",
      "Sealed collection tracking",
      "Full portfolio dashboard",
      "Unlimited price alerts",
    ],
  },
} as const;

type PlanKey = keyof typeof PLAN_META;

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
});

type ProfileData = z.infer<typeof profileSchema>;

// Step 2 — collector profile questions
const collectorSchema = z.object({
  favorite_pokemon: z.string().max(100).optional().or(z.literal("")),
  favorite_set: z.string().max(100).optional().or(z.literal("")),
  collecting_years: z.string().optional(),
  collection_type: z.enum(["sealed", "unsealed", "both"]),
  collector_style: z.enum(["grading", "singles", "both"]),
});

type CollectorData = z.infer<typeof collectorSchema>;

// ─── Shared components ────────────────────────────────────────────────────────

function StepIndicator({ current, plan }: { current: Step; plan: PlanKey }) {
  const isPaid = plan !== "starter";
  const steps: { key: Step; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "collector", label: "Collection" },
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

function PlanSummaryCard({ plan }: { plan: PlanKey }) {
  const meta = PLAN_META[plan];
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
          {meta.price}/{meta.cadence === "Free forever" ? "free" : "mo"}
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
    defaultValues: { currency: "USD", preferred_grading_company: "PSA" },
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

// ─── Step 2: Collector profile ────────────────────────────────────────────────

function CollectorStep({
  onNext,
  onBack,
}: {
  onNext: (data: CollectorData) => void;
  onBack: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<CollectorData>({
    resolver: zodResolver(collectorSchema),
    defaultValues: {
      collection_type: "both",
      collector_style: "both",
      collecting_years: "",
    },
  });

  const [serverError, setServerError] = useState<string | null>(null);
  const collectionType = watch("collection_type");
  const collectorStyle = watch("collector_style");
  const collectingYears = watch("collecting_years");

  const onSubmit = async (data: CollectorData) => {
    setServerError(null);
    try {
      await api.put("/users/me", {
        favorite_pokemon: data.favorite_pokemon || null,
        favorite_set: data.favorite_set || null,
        collecting_years: data.collecting_years || null,
        collection_type: data.collection_type,
        collector_style: data.collector_style,
      });
      onNext(data);
    } catch (err: unknown) {
      setServerError(
        err instanceof Error
          ? err.message
          : "Failed to save preferences. Please try again.",
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ display: "flex", flexDirection: "column", gap: 22 }}
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
          Tell us about your collection
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >
          This helps us personalize your TruePoint experience. All fields are
          optional.
        </p>
      </div>

      {serverError && <ErrorBanner message={serverError} />}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Input
          label='Favorite Pokémon'
          placeholder='Charizard'
          hint='Optional'
          {...register("favorite_pokemon")}
        />
        <Input
          label='Favorite set'
          placeholder='Base Set, Obsidian Flames...'
          hint='Optional'
          {...register("favorite_set")}
        />
      </div>

      <ToggleGroup
        label='How long have you been collecting?'
        options={COLLECTING_YEARS.map((y) => ({
          value: y.value,
          label: y.label,
        }))}
        value={collectingYears ?? ""}
        onChange={(val) => setValue("collecting_years", val)}
      />

      <ToggleGroup
        label='Do you primarily collect sealed or unsealed?'
        hint='This helps us show the most relevant inventory features first.'
        options={[
          { value: "sealed", label: "Sealed" },
          { value: "unsealed", label: "Unsealed" },
          { value: "both", label: "Both" },
        ]}
        value={collectionType}
        onChange={(val) =>
          setValue("collection_type", val as CollectorData["collection_type"])
        }
      />

      <ToggleGroup
        label='Do you prefer grading cards or working with singles?'
        hint='Used to prioritize features in your dashboard.'
        options={[
          { value: "grading", label: "Grading" },
          { value: "singles", label: "Singles" },
          { value: "both", label: "Both" },
        ]}
        value={collectorStyle}
        onChange={(val) =>
          setValue("collector_style", val as CollectorData["collector_style"])
        }
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginTop: 8,
        }}
      >
        <Button
          type='submit'
          variant='primary'
          size='lg'
          fullWidth
          loading={isSubmitting}
        >
          Continue
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='md'
          fullWidth
          onClick={onBack}
        >
          ← Back
        </Button>
      </div>
    </form>
  );
}

// ─── Step 3: Billing ──────────────────────────────────────────────────────────

function BillingStep({
  plan,
  onNext,
  onBack,
}: {
  plan: PlanKey;
  onNext: () => void;
  onBack: () => void;
}) {
  const meta = PLAN_META[plan];
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Only load Stripe when this component mounts — not at module level
  const stripePromise = useMemo(
    () => loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!),
    [],
  );

  const fetchClientSecret = useCallback(async () => {
    try {
      const res = await api.post<{
        data: { clientSecret: string; sessionId: string };
      }>("/billing/create-checkout-session", { plan });
      return res.data.data.clientSecret;
    } catch (err: unknown) {
      setSessionError(
        err instanceof Error ? err.message : "Failed to initialize payment",
      );
      return "";
    }
  }, [plan]);

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
          14 days free — you won&apos;t be charged until your trial ends. Cancel
          anytime.
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
              14-day free trial
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
              then {meta.price}/mo
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
        Secured by Stripe. TruePoint never stores your card details.
        <br />
        Cancel anytime before the trial ends.
      </p>
    </div>
  );
}

// ─── Step 4: Confirm ──────────────────────────────────────────────────────────

function ConfirmStep({
  plan,
  profileData,
  onFinish,
}: {
  plan: PlanKey;
  profileData: ProfileData | null;
  onFinish: () => void;
}) {
  const meta = PLAN_META[plan];

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
          Welcome to TruePoint, collector. Your{" "}
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

function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = (searchParams.get("plan") ?? "starter") as PlanKey;
  const plan = PLAN_META[planParam] ? planParam : "starter";
  const isPaid = plan !== "starter";

  const [step, setStep] = useState<Step>("profile");
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      // Coming back from Stripe — verify and go straight to dashboard
      api
        .post("/billing/verify-session", { sessionId })
        .then(() => {
          router.push(ROUTES.DASHBOARD); // ← go to dashboard, not confirm step
        })
        .catch((err) => {
          console.error("Session verify failed:", err);
          router.push(ROUTES.DASHBOARD); // ← still go to dashboard even if verify fails
        });
    }
  }, [searchParams, router]);

  const handleProfileNext = (data: ProfileData) => {
    setProfileData(data);
    setStep("collector");
  };

  const handleCollectorNext = () => {
    setStep(isPaid ? "billing" : "confirm");
  };

  const handleBillingNext = () => setStep("confirm");
  const handleFinish = () => router.push(ROUTES.DASHBOARD);

  return (
    <div>
      <StepIndicator current={step} plan={plan} />
      <PlanSummaryCard plan={plan} />

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "32px",
        }}
      >
        {step === "profile" && <ProfileStep onNext={handleProfileNext} />}
        {step === "collector" && (
          <CollectorStep
            onNext={handleCollectorNext}
            onBack={() => setStep("profile")}
          />
        )}
        {step === "billing" && isPaid && (
          <BillingStep
            plan={plan}
            onNext={handleBillingNext}
            onBack={() => setStep("collector")}
          />
        )}
        {step === "confirm" && (
          <ConfirmStep
            plan={plan}
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
  );
}
