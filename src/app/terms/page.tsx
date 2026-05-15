/* eslint-disable react/no-unescaped-entities */
// src/app/terms/page.tsx
//
// Static terms of service. Public route, no auth required.
// Update CONTENT_VERSION when material changes are made.

import Link from "next/link";

const CONTENT_VERSION = "2026.05.15";

export default function TermsPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        color: "var(--text-primary)",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px" }}>
        <Link
          href="/"
          style={{
            fontSize: 12,
            color: "var(--text-dim)",
            textDecoration: "none",
            marginBottom: 24,
            display: "inline-block",
            fontFamily: "DM Mono, monospace",
          }}
        >
          ← TruePoint TCG
        </Link>

        <div
          style={{
            fontSize: 10,
            color: "var(--gold)",
            fontFamily: "DM Mono, monospace",
            letterSpacing: "0.08em",
            marginBottom: 6,
          }}
        >
          LEGAL
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 500,
            marginBottom: 6,
          }}
        >
          Terms of Service
        </h1>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-dim)",
            fontFamily: "DM Mono, monospace",
            marginBottom: 32,
          }}
        >
          Last updated: {CONTENT_VERSION}
        </p>

        <div
          style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: "var(--text-secondary)",
          }}
        >
          <Section title='1. Acceptance of terms'>
            By creating an account or using TruePoint TCG ("the service", "we",
            "us"), you agree to these Terms of Service. If you do not agree, do
            not use the service.
          </Section>

          <Section title='2. Account responsibility'>
            You are responsible for maintaining the confidentiality of your
            account credentials and for all activity that occurs under your
            account. Notify us immediately of any unauthorized use.
          </Section>

          <Section title='3. Subscription and billing'>
            Paid plans renew automatically. You may cancel at any time from your
            account settings; cancellation takes effect at the end of the
            current billing period. Refunds are issued at our discretion and
            only in cases of clear billing error.
          </Section>

          <Section title='4. Acceptable use'>
            You agree not to use the service to (a) infringe any third party's
            rights, (b) attempt to access data not intended for you, (c)
            interfere with the service's operation, (d) use automated systems to
            scrape or download data in volumes inconsistent with normal use, or
            (e) violate any applicable law.
          </Section>

          <Section title='5. AI grading reports'>
            AI grading predictions are estimates only, not guarantees. The
            actual grade assigned by a third-party grading service may differ.
            TruePoint is not responsible for grading outcomes, submission costs,
            or value differences resulting from reliance on AI predictions.
          </Section>

          <Section title='6. Market pricing'>
            Card values shown on the service are sourced from third-party APIs
            and may be inaccurate, outdated, or unavailable for some cards.
            TruePoint does not buy, sell, or broker cards and makes no
            representation about market value for the purpose of any specific
            transaction.
          </Section>

          <Section title='7. User content'>
            You retain ownership of content you submit (collection data, notes,
            feedback). By submitting it, you grant us a non-exclusive license to
            store and display it within the service.
          </Section>

          <Section title='8. Service availability'>
            We strive for high availability but do not guarantee uninterrupted
            service. Scheduled maintenance, third-party outages (Stripe,
            Supabase, TCGAPIs, pokemontcg.io, Resend), or other factors may
            cause downtime.
          </Section>

          <Section title='9. Termination'>
            You may deactivate your account at any time from settings. We may
            suspend or terminate accounts that violate these terms. Upon
            termination, access ends but data retention follows our Privacy
            Policy.
          </Section>

          <Section title='10. Disclaimer of warranties'>
            The service is provided "as is" without warranties of any kind,
            express or implied. We do not warrant that the service will be
            error-free, secure, or available at any particular time.
          </Section>

          <Section title='11. Limitation of liability'>
            To the maximum extent permitted by law, TruePoint's total liability
            arising from your use of the service is limited to the amount you
            paid in the 12 months preceding the claim.
          </Section>

          <Section title='12. Changes to these terms'>
            We may update these terms from time to time. Material changes will
            be communicated via email or an in-app notice. Continued use of the
            service after changes constitutes acceptance.
          </Section>

          <Section title='13. Contact'>
            Questions about these terms can be sent through the in-app support
            form (the 💬 button on any page) or directly to{" "}
            <a
              href='mailto:support@truepointtcg.com'
              style={{ color: "var(--gold)", textDecoration: "none" }}
            >
              support@truepointtcg.com
            </a>
            .
          </Section>
        </div>

        <div
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: "1px solid var(--border)",
            fontSize: 11,
            color: "var(--text-dim)",
            fontFamily: "DM Mono, monospace",
            textAlign: "center",
          }}
        >
          © TruePoint TCG · All rights reserved
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontSize: 16,
          fontWeight: 500,
          color: "var(--text-primary)",
          marginBottom: 8,
        }}
      >
        {title}
      </h2>
      <p style={{ margin: 0 }}>{children}</p>
    </section>
  );
}
