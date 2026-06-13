"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "../../../../lib/supabase";
import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";
import { ROUTES } from "../../../../constants/routes";
import api from "../../../../lib/api";

// ─── Schema (mirrors register) ────────────────────────────────────────────────

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

interface ClaimPrefill {
  affiliate_id: string;
  name: string;
  slug: string | null;
  type: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  instagram: string | null;
  website: string | null;
}

function apiError(err: unknown, fallback: string): string {
  const e = err as {
    response?: { data?: { error?: string } };
    message?: string;
  };
  return e?.response?.data?.error ?? e?.message ?? fallback;
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function ClaimForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const supabase = createClient();

  const [phase, setPhase] = useState<"loading" | "invalid" | "ready">(
    "loading",
  );
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [affiliate, setAffiliate] = useState<ClaimPrefill | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  // After signUp succeeds, if the consume call fails we keep the account and
  // let the user retry just the linking step (re-signup would fail).
  const [needsConsumeRetry, setNeedsConsumeRetry] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // eslint-disable-next-line react-hooks/incompatible-library
  const password = watch("password", "");

  // Validate the token + prefill on mount.
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setTokenError("This link is missing a claim code.");
      setPhase("invalid");
      return;
    }
    (async () => {
      try {
        const r = await api.get(
          `/affiliates/claim/${encodeURIComponent(token)}`,
        );
        if (cancelled) return;
        const data = r.data.data as ClaimPrefill;
        setAffiliate(data);
        reset({
          full_name: data.contact_name ?? "",
          email: data.contact_email ?? "",
          phone: data.contact_phone ?? "",
          password: "",
          confirm_password: "",
        });
        setPhase("ready");
      } catch (err) {
        if (cancelled) return;
        setTokenError(
          apiError(err, "This claim code is invalid, used, or expired."),
        );
        setPhase("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, reset]);

  const finish = () => router.push(`${ROUTES.ONBOARDING}?plan=starter`);

  const consume = async () => {
    await api.post("/affiliates/claim/consume", { token });
  };

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setServerError(
            "An account with this email already exists. Sign in first, then open your invite link again.",
          );
        } else {
          setServerError(authError.message);
        }
        return;
      }

      if (!authData.user || !authData.session) {
        setServerError("Account creation failed. Please try again.");
        return;
      }

      // Save name + phone to user metadata (best-effort).
      try {
        await supabase.auth.updateUser({
          data: { full_name: data.full_name, phone: data.phone },
        });
      } catch (err) {
        console.error("Failed to save profile metadata:", err);
      }

      // Link the affiliate record + grant the comp Pro benefit. The session
      // now exists, so the api client sends the auth header.
      try {
        await consume();
      } catch (err) {
        // Account exists; only the linking failed. Let them retry that step.
        setNeedsConsumeRetry(true);
        setServerError(
          `Your account was created, but linking your affiliate record failed: ${apiError(
            err,
            "please try again",
          )}.`,
        );
        return;
      }

      finish();
    } catch (err: unknown) {
      setServerError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  };

  const onRetryConsume = async () => {
    setRetrying(true);
    setServerError(null);
    try {
      await consume();
      finish();
    } catch (err) {
      setServerError(apiError(err, "Linking failed. Please contact support."));
    } finally {
      setRetrying(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "32px 28px",
          textAlign: "center",
          color: "var(--text-dim)",
          fontSize: 14,
        }}
      >
        Validating your invite…
      </div>
    );
  }

  if (phase === "invalid") {
    return (
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "32px 28px",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 8,
          }}
        >
          We couldn&apos;t open this invite
        </div>
        <div
          style={{
            fontSize: 14,
            color: "var(--text-dim)",
            lineHeight: 1.6,
            marginBottom: 20,
          }}
        >
          {tokenError} If you think this is a mistake, reply to your invite
          email and we&apos;ll send a fresh one.
        </div>
        <Link
          href={ROUTES.LOGIN ?? "/login"}
          style={{ color: "var(--gold)", fontSize: 14 }}
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "28px",
      }}
    >
      {/* Partner banner */}
      <div
        style={{
          background: "rgba(201,168,76,0.08)",
          border: "1px solid rgba(201,168,76,0.3)",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 22,
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.1em",
            color: "var(--gold)",
            fontFamily: "DM Mono, monospace",
            marginBottom: 4,
          }}
        >
          AFFILIATE INVITE
        </div>
        <div style={{ fontSize: 14, color: "var(--text-primary)" }}>
          Creating the partner account for <strong>{affiliate?.name}</strong>.
          Your account includes <strong>Pro, free</strong> as a partner.
        </div>
      </div>

      <h1
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 4,
        }}
      >
        Create your affiliate account
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 22 }}>
        Set a password to finish. You can edit your details below.
      </p>

      {serverError && (
        <div
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            color: "var(--red)",
            marginBottom: 20,
          }}
        >
          {serverError}
        </div>
      )}

      {needsConsumeRetry ? (
        <Button
          type='button'
          variant='primary'
          size='lg'
          loading={retrying}
          fullWidth
          onClick={onRetryConsume}
        >
          Retry linking my affiliate account
        </Button>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: "flex", flexDirection: "column", gap: 18 }}
        >
          <Input
            label='Full name'
            type='text'
            placeholder='Your name'
            error={errors.full_name?.message}
            autoComplete='name'
            {...register("full_name")}
          />

          <Input
            label='Email address'
            type='email'
            placeholder='you@example.com'
            hint="This is the email you'll sign in with"
            error={errors.email?.message}
            autoComplete='email'
            {...register("email")}
          />

          <Input
            label='Phone number'
            type='tel'
            placeholder='+1 (555) 000-0000'
            error={errors.phone?.message}
            hint='Optional'
            autoComplete='tel'
            {...register("phone")}
          />

          <Input
            label='Password'
            type='password'
            placeholder='Min. 8 characters'
            error={errors.password?.message}
            autoComplete='new-password'
            {...register("password")}
          />

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
            Create affiliate account
          </Button>
        </form>
      )}

      <p
        style={{
          textAlign: "center",
          marginTop: 24,
          fontSize: 13,
          color: "var(--text-dim)",
        }}
      >
        Already have an account?{" "}
        <Link href={ROUTES.LOGIN ?? "/login"} style={{ color: "var(--gold)" }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function AffiliateClaimPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            textAlign: "center",
            color: "var(--text-dim)",
            fontSize: 14,
            padding: 32,
          }}
        >
          Loading…
        </div>
      }
    >
      <ClaimForm />
    </Suspense>
  );
}
