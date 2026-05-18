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
  | { kind: "exchanging" }
  | { kind: "ready" }
  | { kind: "invalid"; message: string }
  | { kind: "success" };

// ─── Outer component: wraps the inner one in a Suspense boundary so
//     useSearchParams() doesn't bail out of static page generation. ────────
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

// ─── Inner component: actual reset-password logic ──────────────────────────
function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [state, setState] = useState<State>({ kind: "exchanging" });
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // ─── On mount: validate the token and establish a recovery session ─────
  useEffect(() => {
    const exchangeToken = async () => {
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      // Supabase password-reset emails may include the token under either
      // `code=...` (PKCE-flow projects) or `token_hash=...` (legacy projects).
      // In both cases, we use verifyOtp() rather than exchangeCodeForSession()
      // because verifyOtp doesn't require a PKCE code_verifier — meaning the
      // link works even when opened in a different browser/device than the
      // one that requested it (e.g., requested from the mobile app, opened
      // on a desktop browser).
      const token = code ?? tokenHash;

      if (token) {
        if (type && type !== "recovery") {
          setState({
            kind: "invalid",
            message: "This link isn't a password reset link.",
          });
          return;
        }

        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
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
        return;
      }

      // ─── Implicit flow fallback (hash fragment) ───────────────────────
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setState({ kind: "ready" });
        return;
      }

      await new Promise((r) => setTimeout(r, 250));
      const recheck = await supabase.auth.getSession();
      if (recheck.data.session) {
        setState({ kind: "ready" });
        return;
      }

      setState({
        kind: "invalid",
        message:
          "This password reset link is invalid or has expired. Request a new one from the login page.",
      });
    };

    void exchangeToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── On submit: update the password ─────────────────────────────────────
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

      // Force sign-out so the user re-authenticates with the new password.
      await supabase.auth.signOut();

      setState({ kind: "success" });

      setTimeout(() => {
        router.push(ROUTES.LOGIN);
      }, 2000);
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  };

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
