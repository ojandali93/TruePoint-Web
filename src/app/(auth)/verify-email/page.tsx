/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// src/app/(auth)/verify-email/page.tsx
//
// Two roles:
//   1. With ?token= query param → POST the token to /auth/verify-email and
//      show success/failure. (User clicked the link in their email.)
//   2. Without a token → show a "check your email" screen with a resend button.
//      (User just finished signup and was redirected here.)

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "../../../lib/api";
import { createClient } from "../../../lib/supabase";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  // Verification result state (only used when token is present)
  const [verifying, setVerifying] = useState(!!token);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Resend state (only used when token is absent)
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  // ── Token verification path ────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await api.post("/auth/verify-email", { token });
        if (cancelled) return;
        setVerified(true);
        // Redirect to dashboard after a brief celebration moment
        setTimeout(() => {
          router.replace("/dashboard");
        }, 1800);
      } catch (err: any) {
        if (cancelled) return;
        const msg =
          err?.response?.data?.error ??
          "We couldn't verify this link. It may have expired.";
        setVerifyError(msg);
      } finally {
        if (!cancelled) setVerifying(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  // ── Resend path: load user email from current session ─────────────────
  useEffect(() => {
    if (token) return; // Skip if we're in verification mode
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? null);
    })();
  }, [token]);

  const handleResend = useCallback(async () => {
    setResending(true);
    setResendError(null);
    setResendMessage(null);
    try {
      await api.post("/auth/send-verification-email", {});
      setResendMessage("Sent — check your inbox.");
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ?? "Couldn't send. Try again in a moment.";
      setResendError(msg);
    } finally {
      setResending(false);
    }
  }, []);

  // ── Render: token verification result ──────────────────────────────────
  if (token) {
    return (
      <Container>
        {verifying && (
          <>
            <Icon>✦</Icon>
            <Title>Verifying your email…</Title>
            <Subtle>Hang tight, this should only take a second.</Subtle>
          </>
        )}
        {!verifying && verified && (
          <>
            <Icon>✓</Icon>
            <Title>Email confirmed</Title>
            <Subtle>Taking you to your dashboard…</Subtle>
          </>
        )}
        {!verifying && verifyError && (
          <>
            <Icon style={{ color: "#EF4444" }}>!</Icon>
            <Title>Verification failed</Title>
            <Subtle>{verifyError}</Subtle>
            <ActionGroup>
              <ResendInfo>
                Sign in and request a new verification email.
              </ResendInfo>
              <Link href='/login' style={primaryButtonStyle}>
                Go to login
              </Link>
            </ActionGroup>
          </>
        )}
      </Container>
    );
  }

  // ── Render: "check your email" screen ──────────────────────────────────
  return (
    <Container>
      <Icon>✉</Icon>
      <Title>Check your email</Title>
      <Subtle>
        We sent a verification link to{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          {userEmail ?? "your email"}
        </strong>
        . Click it to activate your account.
      </Subtle>

      <ActionGroup>
        <ResendInfo>Didn&apos;t get the email?</ResendInfo>
        <button
          onClick={handleResend}
          disabled={resending}
          style={primaryButtonStyle}
        >
          {resending ? "Sending…" : "Resend verification email"}
        </button>
        {resendMessage && (
          <div style={{ fontSize: 12, color: "#10B981", marginTop: 8 }}>
            {resendMessage}
          </div>
        )}
        {resendError && (
          <div style={{ fontSize: 12, color: "#EF4444", marginTop: 8 }}>
            {resendError}
          </div>
        )}
      </ActionGroup>

      <SignOutLink />
    </Container>
  );
}

// ─── Layout helpers ─────────────────────────────────────────────────────────

function Container({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "40px 30px",
          width: "100%",
          maxWidth: 440,
          textAlign: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Icon({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: "rgba(201,168,76,0.1)",
        border: "1px solid rgba(201,168,76,0.3)",
        color: "var(--gold)",
        fontSize: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 18px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h1
      style={{
        fontSize: 22,
        fontWeight: 500,
        color: "var(--text-primary)",
        marginBottom: 10,
      }}
    >
      {children}
    </h1>
  );
}

function Subtle({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 13,
        color: "var(--text-secondary)",
        lineHeight: 1.6,
        marginBottom: 24,
      }}
    >
      {children}
    </p>
  );
}

function ActionGroup({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        paddingTop: 18,
        borderTop: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      {children}
    </div>
  );
}

function ResendInfo({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>
      {children}
    </p>
  );
}

function SignOutLink() {
  const router = useRouter();
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };
  return (
    <div style={{ marginTop: 24, fontSize: 12, color: "var(--text-dim)" }}>
      Wrong account?{" "}
      <button
        onClick={handleSignOut}
        style={{
          background: "none",
          border: "none",
          color: "var(--gold)",
          fontFamily: "inherit",
          fontSize: 12,
          cursor: "pointer",
          padding: 0,
          textDecoration: "underline",
        }}
      >
        Sign out
      </button>
    </div>
  );
}

const primaryButtonStyle: React.CSSProperties = {
  padding: "10px 22px",
  borderRadius: 9,
  border: "none",
  background: "var(--gold)",
  color: "#0D0E11",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
  textDecoration: "none",
  display: "inline-block",
};

// ─── Default export with Suspense (required for useSearchParams) ───────────

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
