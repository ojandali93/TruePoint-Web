"use client";
import { Suspense, useEffect, useState } from "react";
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
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type FormData = z.infer<typeof schema>;

type State =
  | { kind: "landing"; token: string } // user landed with a token, hasn't clicked yet
  | { kind: "exchanging" }
  | { kind: "ready" }
  | { kind: "invalid"; message: string }
  | { kind: "success" };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordLoading() {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "32px",
        textAlign: "center",
      }}
    >
      <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Loading…</p>
    </div>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [state, setState] = useState<State>(() => {
    // Initialize from URL on first render
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const token = code ?? tokenHash;

    if (!token) {
      return {
        kind: "invalid",
        message:
          "This password reset link is invalid. Request a new one from the login page.",
      };
    }
    return { kind: "landing", token };
  });

  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // Manually triggered on button click — prevents email scanners /
  // Gmail's link prefetcher from consuming the one-time token before the
  // user actually opens the page in their browser.
  const handleVerifyAndContinue = async () => {
    if (state.kind !== "landing") return;
    setState({ kind: "exchanging" });

    const { error } = await supabase.auth.verifyOtp({
      token_hash: state.token,
      type: "recovery",
    });

    if (error) {
      console.error("[reset-password] verifyOtp failed:", error);
      setState({
        kind: "invalid",
        message:
          "This password reset link is invalid or has expired. Request a new one from the login page.",
      });
      return;
    }
    setState({ kind: "ready" });
  };

  // Also: if there's an error fragment in the URL (e.g. otp_expired from
  // a prefetched / reused link), surface it immediately rather than letting
  // the user click "Continue" to a known-broken token.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (
      !hash.includes("error_code=otp_expired") &&
      !hash.includes("error=access_denied")
    ) {
      return;
    }
    const t = window.setTimeout(() => {
      setState({
        kind: "invalid",
        message:
          "This password reset link has already been used or has expired. Request a new one from the login page.",
      });
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        setServerError(error.message);
        return;
      }

      await supabase.auth.signOut();
      setState({ kind: "success" });

      setTimeout(() => {
        router.push(ROUTES.LOGIN);
      }, 2000);
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  };

  // ─── Render: landing (token in URL, user hasn't clicked yet) ───────────
  if (state.kind === "landing") {
    return (
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
          Reset your password
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            marginBottom: 28,
          }}
        >
          Tap continue to confirm it&apos;s you and choose a new password.
        </p>

        <Button onClick={handleVerifyAndContinue}>Continue to reset</Button>

        <div
          style={{
            marginTop: 20,
            paddingTop: 20,
            borderTop: "1px solid var(--border)",
            textAlign: "center",
          }}
        >
          <Link
            href={ROUTES.LOGIN}
            style={{ fontSize: 13, color: "var(--text-secondary)" }}
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  // ─── Render: exchanging token ───────────────────────────────────────────
  if (state.kind === "exchanging") {
    return (
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "32px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          Verifying your reset link…
        </p>
      </div>
    );
  }

  // ─── Render: invalid / expired token ───────────────────────────────────
  if (state.kind === "invalid") {
    return (
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
          Link not valid
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            marginBottom: 28,
          }}
        >
          {state.message}
        </p>
        <Link href={ROUTES.LOGIN}>
          <Button>Back to login</Button>
        </Link>
      </div>
    );
  }

  // ─── Render: success ───────────────────────────────────────────────────
  if (state.kind === "success") {
    return (
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid rgba(61,170,110,0.3)",
          borderRadius: 12,
          padding: "32px",
          textAlign: "center",
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
          Password updated
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            marginBottom: 0,
          }}
        >
          Redirecting you to sign in…
        </p>
      </div>
    );
  }

  // ─── Render: form (ready state) ────────────────────────────────────────
  return (
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
        Set a new password
      </h1>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-secondary)",
          marginBottom: 28,
        }}
      >
        Choose a strong password you don&apos;t use anywhere else.
      </p>

      {serverError && (
        <div
          style={{
            background: "rgba(201,76,76,0.1)",
            border: "1px solid rgba(201,76,76,0.3)",
            borderRadius: 6,
            padding: "10px 12px",
            marginBottom: 20,
            fontSize: 13,
            color: "var(--red)",
          }}
        >
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Input
          label='New password'
          type='password'
          autoComplete='new-password'
          placeholder='Min. 8 characters'
          error={errors.password?.message}
          {...register("password")}
        />

        <Input
          label='Confirm new password'
          type='password'
          autoComplete='new-password'
          placeholder='Re-enter your new password'
          error={errors.confirm_password?.message}
          {...register("confirm_password")}
        />

        <Button type='submit' disabled={isSubmitting} style={{ marginTop: 8 }}>
          {isSubmitting ? "Updating…" : "Update password"}
        </Button>
      </form>

      <div
        style={{
          marginTop: 20,
          paddingTop: 20,
          borderTop: "1px solid var(--border)",
          textAlign: "center",
        }}
      >
        <Link
          href={ROUTES.LOGIN}
          style={{ fontSize: 13, color: "var(--text-secondary)" }}
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
