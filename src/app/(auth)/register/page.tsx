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
import api from "../../../lib/api";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    full_name: z
      .string()
      .min(2, "Enter your full name")
      .max(100, "Name is too long"),
    email: z.string().email("Enter a valid email address"),
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{7,14}$/, "Enter a valid phone number")
      .optional()
      .or(z.literal("")),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type FormData = z.infer<typeof schema>;

// ─── Plan badge shown at top ──────────────────────────────────────────────────

const PLAN_META = {
  starter: { name: "Starter", price: "Free", color: "#3DAA6E" },
  collector: { name: "Collector", price: "$9.99/mo", color: "#C9A84C" },
  pro: { name: "Pro", price: "$19.99/mo", color: "#BA7517" },
} as const;

type PlanKey = keyof typeof PLAN_META;

function SelectedPlanBadge({ plan }: { plan: PlanKey }) {
  const meta = PLAN_META[plan];
  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${meta.color}44`,
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: meta.color,
          }}
        />
        <span
          style={{
            fontSize: 13,
            color: "var(--text-primary)",
            fontWeight: 500,
          }}
        >
          {meta.name} plan
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
          {meta.price}
        </span>
      </div>
      <Link
        href='/#pricing'
        style={{
          fontSize: 11,
          color: "var(--text-dim)",
          textDecoration: "none",
          letterSpacing: "0.04em",
        }}
      >
        Change
      </Link>
    </div>
  );
}

// ─── Password strength indicator ──────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const checks = [
    { label: "8+ characters", pass: password.length >= 8 },
    { label: "Uppercase letter", pass: /[A-Z]/.test(password) },
    { label: "Number", pass: /[0-9]/.test(password) },
  ];

  const passed = checks.filter((c) => c.pass).length;
  const color =
    passed === 1 ? "var(--red)" : passed === 2 ? "#E8A838" : "var(--green)";
  const label = passed === 1 ? "Weak" : passed === 2 ? "Fair" : "Strong";

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i <= passed ? color : "var(--border)",
              transition: "background 0.2s ease",
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 12 }}>
          {checks.map((c) => (
            <span
              key={c.label}
              style={{
                fontSize: 10,
                color: c.pass ? "var(--green)" : "var(--text-dim)",
                display: "flex",
                alignItems: "center",
                gap: 3,
                transition: "color 0.2s ease",
              }}
            >
              {c.pass ? "✓" : "○"} {c.label}
            </span>
          ))}
        </div>
        <span style={{ fontSize: 10, color, fontWeight: 500 }}>{label}</span>
      </div>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = (searchParams.get("plan") ?? "starter") as PlanKey;
  const plan = PLAN_META[planParam] ? planParam : "starter";

  const [serverError, setServerError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "verify">("form");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // eslint-disable-next-line react-hooks/incompatible-library
  const password = watch("password", "");

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        // Note: emailRedirectTo is unused now since we manage verification
        // ourselves. Safe to keep or remove.
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setServerError(
            "An account with this email already exists. Sign in instead.",
          );
        } else {
          setServerError(authError.message);
        }
        return;
      }

      if (!authData.user || !authData.session) {
        // With Supabase's "Confirm email" turned OFF, session should always
        // be present. If it's not, something is misconfigured.
        setServerError("Account creation failed. Please try again.");
        return;
      }

      // Save name + phone to user metadata
      if (data.phone || data.full_name) {
        try {
          await supabase.auth.updateUser({
            data: { full_name: data.full_name, phone: data.phone },
          });
        } catch (err) {
          console.error("Failed to save profile metadata:", err);
        }
      }

      // Always go to onboarding. Email verification happens at the END of
      // onboarding (after Stripe), not before signup.
      router.push(`/onboarding?plan=${plan}`);
    } catch (err: unknown) {
      setServerError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  };

  // ─── Email verification screen ──────────────────────────────────────────────
  // if (step === "verify") {
  //   return (
  //     <div
  //       style={{
  //         background: "var(--surface)",
  //         border: "1px solid var(--border)",
  //         borderRadius: 12,
  //         padding: "40px 32px",
  //         textAlign: "center",
  //       }}
  //     >
  //       <div
  //         style={{
  //           width: 56,
  //           height: 56,
  //           borderRadius: "50%",
  //           background: "rgba(201,168,76,0.15)",
  //           border: "1px solid rgba(201,168,76,0.4)",
  //           display: "flex",
  //           alignItems: "center",
  //           justifyContent: "center",
  //           fontSize: 22,
  //           margin: "0 auto 20px",
  //         }}
  //       >
  //         ✉
  //       </div>
  //       <h2
  //         style={{
  //           fontSize: 20,
  //           fontWeight: 500,
  //           color: "var(--text-primary)",
  //           marginBottom: 10,
  //         }}
  //       >
  //         Check your email
  //       </h2>
  //       <p
  //         style={{
  //           fontSize: 13,
  //           color: "var(--text-secondary)",
  //           lineHeight: 1.7,
  //           marginBottom: 24,
  //         }}
  //       >
  //         We sent a confirmation link to{" "}
  //         <span
  //           style={{
  //             color: "var(--gold)",
  //             fontFamily: "DM Mono, monospace",
  //             fontSize: 12,
  //           }}
  //         >
  //           {submittedEmail}
  //         </span>
  //         . Click the link to activate your account and continue setup.
  //       </p>
  //       <div
  //         style={{
  //           background: "var(--surface-2)",
  //           border: "1px solid var(--border)",
  //           borderRadius: 8,
  //           padding: "14px",
  //           fontSize: 12,
  //           color: "var(--text-dim)",
  //           lineHeight: 1.6,
  //         }}
  //       >
  //         Didn&apos;t receive it? Check your spam folder or{" "}
  //         <button
  //           onClick={async () => {
  //             await supabase.auth.resend({
  //               type: "signup",
  //               email: submittedEmail,
  //             });
  //           }}
  //           style={{
  //             background: "none",
  //             border: "none",
  //             color: "var(--gold)",
  //             cursor: "pointer",
  //             fontSize: 12,
  //             fontFamily: "inherit",
  //             padding: 0,
  //           }}
  //         >
  //           resend the email
  //         </button>
  //         .
  //       </div>
  //     </div>
  //   );
  // }

  // ─── Main registration form ─────────────────────────────────────────────────
  return (
    <div>
      <SelectedPlanBadge plan={plan} />

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "32px",
        }}
      >
        <div style={{ marginBottom: 28 }}>
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
              lineHeight: 1.6,
            }}
          >
            {plan === "starter"
              ? "Free forever — no credit card required."
              : "Start your 14-day free trial. Cancel anytime."}
          </p>
        </div>

        {/* Progress indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 28,
            padding: "10px 14px",
            background: "var(--surface-2)",
            borderRadius: 8,
            border: "1px solid var(--border)",
          }}
        >
          {["Account", "Profile", "Plan"].map((s, i) => (
            <div
              key={s}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flex: i < 2 ? 1 : undefined,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: i === 0 ? "var(--gold)" : "var(--surface-3)",
                    border: `1px solid ${i === 0 ? "var(--gold)" : "var(--border)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: i === 0 ? "#0D0E11" : "var(--text-dim)",
                    fontWeight: 500,
                  }}
                >
                  {i + 1}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: i === 0 ? "var(--text-primary)" : "var(--text-dim)",
                    fontFamily: "DM Mono, monospace",
                    letterSpacing: "0.04em",
                  }}
                >
                  {s.toUpperCase()}
                </span>
              </div>
              {i < 2 && (
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: "var(--border)",
                  }}
                />
              )}
            </div>
          ))}
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
          {/* Full name */}
          <Input
            label='Full name'
            type='text'
            placeholder='Omar Jandali'
            error={errors.full_name?.message}
            autoComplete='name'
            {...register("full_name")}
          />

          {/* Email */}
          <Input
            label='Email address'
            type='email'
            placeholder='you@example.com'
            error={errors.email?.message}
            autoComplete='email'
            {...register("email")}
          />

          {/* Phone */}
          <Input
            label='Phone number'
            type='tel'
            placeholder='+1 (555) 000-0000'
            error={errors.phone?.message}
            hint='Optional — used for grading update alerts'
            autoComplete='tel'
            {...register("phone")}
          />

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <Input
              label='Password'
              type='password'
              placeholder='Min. 8 characters'
              error={errors.password?.message}
              autoComplete='new-password'
              {...register("password")}
            />
            <PasswordStrength password={password} />
          </div>

          {/* Confirm password */}
          <Input
            label='Confirm password'
            type='password'
            placeholder='Re-enter your password'
            error={errors.confirm_password?.message}
            autoComplete='new-password'
            {...register("confirm_password")}
          />

          <Button
            type='submit'
            variant='primary'
            size='lg'
            loading={isSubmitting}
            fullWidth
            style={{ marginTop: 4 }}
          >
            Create account — continue to profile
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
      <RegisterForm />
    </Suspense>
  );
}
