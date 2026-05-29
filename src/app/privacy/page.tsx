/* eslint-disable react/no-unescaped-entities */
// src/app/privacy/page.tsx
//
// Static privacy policy. Public route, no auth required.
// Required by both Apple App Store and Google Play Store before submission.
// Update CONTENT_VERSION when material changes are made.

import Link from "next/link";

const CONTENT_VERSION = "2026.05.29";

export default function PrivacyPage() {
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
          href='/'
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
          Privacy Policy
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
          <Section title='1. Who we are'>
            TruePoint TCG ("we", "us") is a Pokémon trading card portfolio and
            grading-analysis service. This policy describes what information we
            collect when you use our iOS app, Android app, or website at
            truepointtcg.com (collectively, "the service"), and how we use it.
          </Section>

          <Section title='2. Information you provide'>
            When you create an account we collect your email address and a
            password (stored as a salted hash; we never see or store the
            plaintext password). You may optionally provide a username, display
            name, and profile photo. When you add cards to your inventory or run
            analyses, we store that data so we can show it back to you later.
            When you contact support or submit feedback we keep the message and
            your email so we can respond.
          </Section>

          <Section title='3. Information collected automatically'>
            When you use the service we automatically receive standard request
            data: IP address, device type, operating system, app version, and
            the URLs you visit within the service. We use this for security,
            debugging, and rate limiting. We do not use third-party analytics,
            advertising SDKs, or behavioral tracking.
          </Section>

          <Section title='4. Card photos and AI centering reports'>
            If you use the AI centering analysis feature, we receive the card
            photo you upload and store it together with the resulting
            measurements so the report remains viewable later. Photos are
            associated with your account and not shared with other users. You
            can delete an AI centering report at any time from the reports list;
            deletion removes both the report and its photo from our storage.
          </Section>

          <Section title='5. Payments and subscriptions'>
            Subscriptions purchased on the iOS app are processed by Apple; we
            receive only the entitlement status (whether your subscription is
            active) via RevenueCat. We never see your payment information.
            Subscriptions purchased on the web are processed by Stripe; we
            receive your billing email and a Stripe customer ID, but never your
            card number or full card details — those stay with Stripe.
          </Section>

          <Section title='6. Third-party services we use'>
            We rely on the following processors to operate the service: Supabase
            (database hosting and authentication), Stripe (web billing), Apple
            App Store / RevenueCat (mobile billing), Resend (transactional
            email), TCGAPIs and pokemontcg.io (card metadata and market prices),
            PokeTrace (graded card sale data), and Render or similar (server
            hosting). Each processor has its own privacy policy and we share
            with them only what is needed for the service to function. We do not
            sell personal information.
          </Section>

          <Section title='7. Push notifications'>
            If you opt in to push notifications on the mobile app, your device
            registers a push token with us. We use it only to deliver
            notifications you have opted into (price alerts, daily summaries,
            account events). You can disable push notifications in iOS Settings
            or Android Settings at any time; the token becomes inert.
          </Section>

          <Section title='8. Email'>
            We send transactional emails (verification, password reset,
            receipts, account events) regardless of marketing preference because
            they are required for the service to function. We do not currently
            send marketing email. If we add a marketing mailing list in the
            future, it will be strictly opt-in with a one-click unsubscribe
            link.
          </Section>

          <Section title='9. Data retention'>
            We keep your account data as long as your account is active. When
            you deactivate your account from settings, your personal data and
            collection are deleted within 30 days. Some anonymized or aggregated
            data (e.g. error logs without your user ID, financial records
            required for tax purposes) may be retained longer where required by
            law or for legitimate business operation.
          </Section>

          <Section title='10. Your rights'>
            You can access and edit most of your data from inside the app
            (collection items, profile information, notification preferences).
            You can deactivate your account from settings at any time. If you
            are in the EU, UK, California, or other jurisdiction with formal
            data-protection rights, you may also request a copy of your data or
            its deletion by emailing{" "}
            <a
              href='mailto:support@truepointtcg.com'
              style={{ color: "var(--gold)" }}
            >
              support@truepointtcg.com
            </a>
            . We respond within 30 days.
          </Section>

          <Section title='11. Children'>
            The service is not directed at children under 13 and we do not
            knowingly collect personal information from them. If you believe a
            child under 13 has provided personal information, email us and we
            will delete it.
          </Section>

          <Section title='12. Security'>
            We use industry-standard security practices including encryption in
            transit (HTTPS), encryption at rest for the database, hashed
            passwords, and access controls on administrative tools. No system is
            perfectly secure; if we become aware of a breach affecting your
            information we will notify you as required by applicable law.
          </Section>

          <Section title='13. International transfers'>
            Our service is operated from the United States. If you use the
            service from outside the US, your information will be transferred to
            and processed in the US.
          </Section>

          <Section title='14. Changes to this policy'>
            We may update this policy as the service evolves. Material changes
            will be reflected in the "Last updated" date above and, where
            appropriate, communicated by email. Continued use of the service
            after a change constitutes acceptance.
          </Section>

          <Section title='15. Contact'>
            Questions or requests:{" "}
            <a
              href='mailto:support@truepointtcg.com'
              style={{ color: "var(--gold)" }}
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
