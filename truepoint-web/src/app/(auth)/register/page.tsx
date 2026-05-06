"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "../../../lib/supabase";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { ROUTES } from "../../../constants/routes";

const schema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

const PLAN_DETAILS = {
  starter: {
    name: "Starter",
    price: "Free",
    color: "#3DAA6E",
    features: [
      "TruePoint centering score",
      "Master set tracker (3 sets)",
      "Card search & live prices",
    ],
  },
  collector: {
    name: "Collector",
    price: "$9.99/mo",
    color: "#C9A84C",
    features: [
      "Regrade arbitrage (50/mo)",
      "Unlimited master sets",
      "Singles & graded inventory",
    ],
  },
  pro: {
    name: "Pro",
    price: "$19.99/mo",
    color: "#BA7517",
    features: [
      "Unlimited regrade arbitrage",
      "Sealed collection tracking",
      "Full portfolio dashboard",
    ],
  },
} as const;

type PlanKey = keyof typeof PLAN_DETAILS;

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = (searchParams.get("plan") ?? "starter") as PlanKey;
  const plan = PLAN_DETAILS[planParam] ?? PLAN_DETAILS.starter;

  const [serverError, setServerError] = useState<string | null>(null);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
          data: { plan: planParam },
        },
      });

      if (error) {
        setServerError(error.message);
        return;
      }

      // For starter — go directly to onboarding
      // For paid plans — go to billing setup (placeholder for now)
      if (planParam === "starter") {
        router.push(ROUTES.ONBOARDING);
      } else {
        router.push(`${ROUTES.ONBOARDING}?plan=${planParam}&setup=billing`);
      }
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  };

  return (
    <div>
      {/* Selected plan indicator */}
      <div
        style={{
          background: "var(--surface)",
          border: `1px solid ${plan.color}44`,
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
            SELECTED PLAN
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              {plan.name}
            </span>
            <span
              style={{
                fontSize: 11,
                color: plan.color,
                fontFamily: "DM Mono, monospace",
                background: `${plan.color}18`,
                padding: "2px 8px",
                borderRadius: 20,
                border: `1px solid ${plan.color}33`,
              }}
            >
              {plan.price}
            </span>
          </div>
          <div
            style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}
          >
            {plan.features.map((f) => (
              <span
                key={f}
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ color: plan.color, fontSize: 9 }}>✓</span> {f}
              </span>
            ))}
          </div>
        </div>
        <Link
          href='#pricing'
          onClick={() => router.back()}
          style={{
            fontSize: 11,
            color: "var(--text-dim)",
            textDecoration: "none",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
            paddingLeft: 16,
          }}
        >
          Change plan
        </Link>
      </div>

      {/* Form card */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "32px",
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 6,
            letterSpacing: "0.02em",
          }}
        >
          Create your account
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            marginBottom: 28,
            lineHeight: 1.6,
          }}
        >
          {planParam === "starter"
            ? "Free forever — no credit card required."
            : "Start your 14-day free trial. Cancel anytime."}
        </p>

        {serverError && (
          <div
            style={{
              background: "rgba(201,76,76,0.1)",
              border: "1px solid rgba(201,76,76,0.3)",
              borderRadius: 6,
              padding: "10px 14px",
              fontSize: 13,
              color: "var(--red)",
              marginBottom: 20,
            }}
          >
            {serverError}
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: "flex", flexDirection: "column", gap: 18 }}
        >
          <Input
            label='Email address'
            type='email'
            placeholder='you@example.com'
            error={errors.email?.message}
            autoComplete='email'
            {...register("email")}
          />
          <Input
            label='Password'
            type='password'
            placeholder='Min. 8 characters'
            error={errors.password?.message}
            hint='At least 8 characters, one uppercase, one number'
            autoComplete='new-password'
            {...register("password")}
          />
          <Input
            label='Confirm password'
            type='password'
            placeholder='Re-enter your password'
            error={errors.confirmPassword?.message}
            autoComplete='new-password'
            {...register("confirmPassword")}
          />

          <Button
            type='submit'
            variant='primary'
            size='lg'
            loading={isSubmitting}
            fullWidth
            style={{ marginTop: 4 }}
          >
            {planParam === "starter"
              ? "Create free account"
              : `Start ${plan.name} trial`}
          </Button>
        </form>

        <p
          style={{
            fontSize: 11,
            color: "var(--text-dim)",
            textAlign: "center",
            marginTop: 20,
            lineHeight: 1.6,
          }}
        >
          By creating an account you agree to our{" "}
          <a href='/terms' style={{ color: "var(--text-secondary)" }}>
            Terms of Service
          </a>{" "}
          and{" "}
          <a href='/privacy' style={{ color: "var(--text-secondary)" }}>
            Privacy Policy
          </a>
          .
        </p>
      </div>

      {/* Switch to login */}
      <p
        style={{
          textAlign: "center",
          marginTop: 24,
          fontSize: 13,
          color: "var(--text-secondary)",
        }}
      >
        Already have an account?{" "}
        <Link
          href={ROUTES.LOGIN}
          style={{
            color: "var(--gold)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div style={{ color: "var(--text-secondary)", textAlign: "center" }}>
          Loading...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
