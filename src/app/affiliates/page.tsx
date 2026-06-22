"use client";
// src/app/affiliates/page.tsx
//
// Public affiliate program page: details up top, application form at the bottom.
// Top-level (outside (auth)/(app)) so it's reachable logged-out and logged-in.
//
// - Logged out  → guest application (email required; backend blocks emails that
//   already have an account and routes them to apply in-app).
// - Logged in   → member application, prefilled from the session; the backend
//   trusts the session for identity. If they already have an affiliate record,
//   we show their status instead of the form.

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import api from "../../lib/api";

type Phase = "loading" | "form" | "already" | "submitted";

interface Socials {
  instagram: string;
  tiktok: string;
  youtube: string;
  twitter: string;
  facebook: string;
}

const EMPTY_SOCIALS: Socials = {
  instagram: "",
  tiktok: "",
  youtube: "",
  twitter: "",
  facebook: "",
};

function apiError(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

const TERMS = [
  [
    "5% / 7% commission",
    "Earn 5% on Collector and 7% on Pro from members who join with your code — on revenue actually collected, net of fees.",
  ],
  ["No commission on free", "Free Starter accounts don't generate commission."],
  [
    "Paid via PayPal",
    "Paid monthly once your balance reaches $75 (held ~30 days to cover refunds).",
  ],
  [
    "Recurring",
    "You keep earning for as long as a referred member stays subscribed.",
  ],
  ["Pro, free", "Approved affiliates get a complimentary Pro account."],
  [
    "Payouts open July 2026",
    "Add your PayPal in your affiliate dashboard around July 1, 2026.",
  ],
];

export default function AffiliatesPage() {
  const supabase = createClient();

  const [phase, setPhase] = useState<Phase>("loading");
  const [isMember, setIsMember] = useState(false);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [requestedSlug, setRequestedSlug] = useState("");
  const [socials, setSocials] = useState<Socials>(EMPTY_SOCIALS);
  const [hp, setHp] = useState(""); // honeypot — must stay empty

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (!cancelled) setPhase("form");
        return;
      }

      // Logged in: prefill from session, and check for an existing application.
      const u = session.user;
      if (!cancelled) {
        setIsMember(true);
        setName((u.user_metadata?.full_name as string) ?? "");
        setEmail(u.email ?? "");
        setPhone((u.user_metadata?.phone as string) ?? "");
      }
      try {
        const r = await api.get("/affiliates/me");
        const aff = r.data?.data;
        if (!cancelled) {
          if (aff) {
            setExistingStatus(aff.status ?? "pending");
            setPhase("already");
          } else {
            setPhase("form");
          }
        }
      } catch {
        if (!cancelled) setPhase("form");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const onSubmit = async () => {
    setError(null);
    if (!name.trim() && !businessName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!isMember && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email.");
      return;
    }
    setSubmitting(true);
    try {
      const cleanSocials: Record<string, string> = {};
      (Object.keys(socials) as (keyof Socials)[]).forEach((k) => {
        if (socials[k].trim()) cleanSocials[k] = socials[k].trim();
      });

      // api injects the session JWT automatically → member branch when logged in.
      await api.post("/affiliates/apply", {
        name: name.trim(),
        business_name: businessName.trim(),
        email: email.trim(), // ignored server-side for members
        phone: phone.trim(),
        requested_slug: requestedSlug.trim(),
        socials: cleanSocials,
        hp_field: hp, // honeypot
      });
      setPhase("submitted");
    } catch (err) {
      setError(apiError(err, "Something went wrong. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const setSocial = (k: keyof Socials, v: string) =>
    setSocials((s) => ({ ...s, [k]: v }));

  return (
    <div style={{ background: "var(--charcoal, #0D0E11)", minHeight: "100vh" }}>
      <div
        style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 96px" }}
      >
        {/* Header */}
        <Link
          href='/'
          style={{
            fontSize: 13,
            color: "var(--text-dim)",
            textDecoration: "none",
          }}
        >
          ← Reverse Holo TCG
        </Link>
        <h1
          className='font-display'
          style={{
            fontSize: "clamp(34px, 6vw, 56px)",
            letterSpacing: "0.02em",
            lineHeight: 1.05,
            marginTop: 20,
            marginBottom: 14,
            color: "var(--text-primary)",
          }}
        >
          BECOME A <span className='gold-shimmer'>REVERSE HOLO</span> AFFILIATE
        </h1>
        <p
          style={{
            fontSize: 16,
            color: "var(--text-secondary)",
            lineHeight: 1.7,
            maxWidth: 580,
            marginBottom: 36,
          }}
        >
          Share Reverse Holo with your audience and earn recurring commission on
          every member who joins with your code — plus Pro, free, as a partner.
        </p>

        {/* Program terms */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginBottom: 28,
          }}
          className='landing-2col-grid'
        >
          {TERMS.map(([title, body]) => (
            <div
              key={title}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "18px 20px",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--gold)",
                  marginBottom: 6,
                }}
              >
                {title}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                {body}
              </div>
            </div>
          ))}
        </div>
        <Link
          href='/affiliate-terms'
          target='_blank'
          style={{ fontSize: 13, color: "var(--gold)", fontWeight: 500 }}
        >
          Read the full Affiliate Agreement →
        </Link>

        {/* Form / states */}
        <div style={{ marginTop: 44 }}>
          {phase === "loading" && (
            <div style={{ color: "var(--text-dim)", fontSize: 14 }}>
              Loading…
            </div>
          )}

          {phase === "already" && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "28px",
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
                {existingStatus === "active"
                  ? "You're already an affiliate 🎉"
                  : existingStatus === "rejected"
                    ? "Your previous application wasn't approved"
                    : "Your application is pending"}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                {existingStatus === "active"
                  ? "Your partner account is active. Your referral code and dashboard live in the app."
                  : existingStatus === "rejected"
                    ? "If you think this was a mistake, reach out to support@reverseholo.io."
                    : "We've received your application and will email you once it's reviewed."}
              </div>
            </div>
          )}

          {phase === "submitted" && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid rgba(201,168,76,0.3)",
                borderRadius: 14,
                padding: "28px",
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
                Application received
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                Thanks! We&apos;ll review your application and email you
                {isMember ? "" : " at the address you provided"} with next
                steps.
              </div>
            </div>
          )}

          {phase === "form" && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "28px",
              }}
            >
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: 4,
                }}
              >
                Apply to the program
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-dim)",
                  marginBottom: 22,
                }}
              >
                {isMember
                  ? "You're signed in — we'll link this to your account."
                  : "Already have a Reverse Holo account? Sign in first, then apply from the app."}
              </p>

              {error && (
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
                  {error}
                </div>
              )}

              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <Input
                  label='Your name'
                  placeholder='Jane Doe'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  label='Business name'
                  placeholder='Jane Cards (optional)'
                  hint='Leave blank if you collect/create as an individual'
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
                <Input
                  label='Email'
                  type='email'
                  placeholder='you@example.com'
                  value={email}
                  disabled={isMember}
                  hint={isMember ? "Using your account email" : undefined}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  label='Phone'
                  type='tel'
                  placeholder='(555) 000-0000'
                  hint='Optional'
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Input
                  label='Preferred referral code'
                  placeholder='jane-cards'
                  hint="We'll confirm or adjust this when we approve you"
                  value={requestedSlug}
                  onChange={(e) => setRequestedSlug(e.target.value)}
                />

                <div style={{ marginTop: 4 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      marginBottom: 10,
                      letterSpacing: "0.04em",
                    }}
                  >
                    SOCIAL ACCOUNTS
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <Input
                      label='Instagram'
                      placeholder='@handle'
                      value={socials.instagram}
                      onChange={(e) => setSocial("instagram", e.target.value)}
                    />
                    <Input
                      label='TikTok'
                      placeholder='@handle'
                      value={socials.tiktok}
                      onChange={(e) => setSocial("tiktok", e.target.value)}
                    />
                    <Input
                      label='YouTube'
                      placeholder='channel or @handle'
                      value={socials.youtube}
                      onChange={(e) => setSocial("youtube", e.target.value)}
                    />
                    <Input
                      label='X / Twitter'
                      placeholder='@handle'
                      value={socials.twitter}
                      onChange={(e) => setSocial("twitter", e.target.value)}
                    />
                    <Input
                      label='Facebook'
                      placeholder='page or profile'
                      value={socials.facebook}
                      onChange={(e) => setSocial("facebook", e.target.value)}
                    />
                  </div>
                </div>

                {/* Honeypot — hidden from humans; bots fill it. */}
                <div
                  aria-hidden='true'
                  style={{
                    position: "absolute",
                    left: "-9999px",
                    width: 1,
                    height: 1,
                    overflow: "hidden",
                  }}
                >
                  <label>
                    Do not fill this field
                    <input
                      type='text'
                      tabIndex={-1}
                      autoComplete='off'
                      value={hp}
                      onChange={(e) => setHp(e.target.value)}
                    />
                  </label>
                </div>

                <Button
                  type='button'
                  variant='primary'
                  size='lg'
                  loading={submitting}
                  fullWidth
                  onClick={onSubmit}
                  style={{ marginTop: 6 }}
                >
                  Submit application
                </Button>

                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-dim)",
                    lineHeight: 1.6,
                    marginTop: 2,
                  }}
                >
                  By applying you agree to the{" "}
                  <Link
                    href='/affiliate-terms'
                    target='_blank'
                    style={{ color: "var(--gold)" }}
                  >
                    Affiliate &amp; Partner Program Agreement
                  </Link>
                  . Applications are reviewed before approval.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
