"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { ROUTES } from "../../../constants/routes";
import api from "../../../lib/api";

import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { useCallback } from "react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "profile" | "billing" | "confirm";

const GRADING_COMPANIES = ["PSA", "BGS", "CGC", "TAG", "SGC"] as const;
const CURRENCIES = [
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "JPY", label: "JPY — Japanese Yen" },
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

const profileSchema = z.object({
  username: z
    .string()
    .min(3, "At least 3 characters")
    .max(30, "Maximum 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, and underscores only"),
  full_name: z.string().min(1, "Enter your name").max(100),
  currency: z.string(),
  preferred_grading_company: z.string(),
});

type ProfileData = z.infer<typeof profileSchema>;

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ current, plan }: { current: Step; plan: PlanKey }) {
  const isPaid = plan !== "starter";
  const steps: { key: Step; label: string }[] = [
    { key: "profile", label: "Profile" },
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
        const isDone = steps.findIndex((s) => s.key === current) > i;
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
                    ? "var(--green)"
                    : isActive
                      ? "var(--gold)"
                      : "var(--surface-3)",
                  border: `1px solid ${isDone ? "var(--green)" : isActive ? "var(--gold)" : "var(--border)"}`,
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
                  background: isDone ? "var(--green)" : "var(--border)",
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
        padding: "16px 20px",
        marginBottom: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 10,
            color: "var(--text-dim)",
            letterSpacing: "0.08em",
            marginBottom: 4,
            fontFamily: "DM Mono, monospace",
          }}
        >
          YOUR PLAN
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 15,
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
      </div>
      <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
        {meta.cadence}
      </div>
    </div>
  );
}

// ─── Step 1: Profile ──────────────────────────────────────────────────────────

function ProfileStep({
  onNext,
}: {
  plan: PlanKey;
  onNext: (data: ProfileData) => void;
}) {
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
    },
  });

  const [serverError, setServerError] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedGrading = watch("preferred_grading_company");
  const selectedCurrency = watch("currency");

  const onSubmit = async (data: ProfileData) => {
    setServerError(null);
    try {
      await api.post("/users/me", data);
      await api.post("/users/me/notifications", {});
      onNext(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to save profile. Please try again.";
      setServerError(message);
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
          This is how other collectors will find you on TruePoint.
        </p>
      </div>

      {serverError && (
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
          {serverError}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Input
          label='Username'
          placeholder='charizard_collector'
          error={errors.username?.message}
          hint='Public — letters, numbers, underscores'
          {...register("username")}
        />
        <Input
          label='Full name'
          placeholder='Omar Jandali'
          error={errors.full_name?.message}
          {...register("full_name")}
        />
      </div>

      {/* Currency selector */}
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

      {/* Grading company selector */}
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

// ─── Step 2: Billing ──────────────────────────────────────────────────────────

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

  // Stripe calls this to get the clientSecret — must be a stable callback
  const fetchClientSecret = useCallback(async () => {
    try {
      const res = await api.post<{
        data: { clientSecret: string; sessionId: string };
      }>("/billing/create-checkout-session", { plan });
      return res.data.data.clientSecret;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to initialize payment";
      setSessionError(message);
      return "";
    }
  }, [plan]);

  const handleComplete = async () => {
    // Stripe will redirect to the return_url — verify the session there
    // The return_url on the server already points back to onboarding
    onNext();
  };

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
                color: "var(--green)",
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

      {/* Stripe Embedded Checkout */}
      {sessionError ? (
        <div
          style={{
            background: "rgba(201,76,76,0.1)",
            border: "1px solid rgba(201,76,76,0.3)",
            borderRadius: 8,
            padding: "16px",
            fontSize: 13,
            color: "var(--red)",
          }}
        >
          {sessionError}
        </div>
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
            options={{ fetchClientSecret, onComplete: handleComplete }}
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

// ─── Step 3: Confirm ──────────────────────────────────────────────────────────

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
      {/* Success mark */}
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
          Welcome to TruePoint,{" "}
          {profileData?.full_name?.split(" ")[0] ?? "collector"}. Your{" "}
          <span style={{ color: meta.color }}>{meta.name}</span> account is
          ready.
        </p>
      </div>

      {/* Account summary */}
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
          { label: "Username", value: `@${profileData?.username}` },
          { label: "Plan", value: `${meta.name} — ${meta.cadence}` },
          { label: "Currency", value: profileData?.currency ?? "USD" },
          {
            label: "Default grading",
            value: profileData?.preferred_grading_company ?? "PSA",
          },
        ].map((row) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: "1px solid var(--border)",
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
        {/* Remove bottom border from last item */}
        <style>{`.confirm-last { border-bottom: none !important; }`}</style>
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

// ─── Main Onboarding Page ─────────────────────────────────────────────────────

function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = (searchParams.get("plan") ?? "starter") as PlanKey;
  const plan = PLAN_META[planParam] ? planParam : "starter";
  const isPaid = plan !== "starter";

  const [step, setStep] = useState<Step>("profile");
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  const handleProfileNext = (data: ProfileData) => {
    setProfileData(data);
    setStep(isPaid ? "billing" : "confirm");
  };

  const handleBillingNext = () => setStep("confirm");
  const handleBack = () => setStep("profile");
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
        {step === "profile" && (
          <ProfileStep plan={plan} onNext={handleProfileNext} />
        )}
        {step === "billing" && isPaid && (
          <BillingStep
            plan={plan}
            onNext={handleBillingNext}
            onBack={handleBack}
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
