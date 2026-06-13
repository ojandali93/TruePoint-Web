// src/app/affiliate-terms/page.tsx
//
// Public page rendering the full TruePoint Affiliate & Partner Program
// Agreement. Linked from the affiliate claim screens (web + mobile) so a
// prospective affiliate can read the exact terms before claiming a code.
//
// NOTE: Publish only after legal approval. Keep this text in sync with the
// signed agreement document. Bracketed items are pending final values.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Affiliate & Partner Program Agreement · TruePoint TCG",
  description:
    "The full terms of the TruePoint TCG Affiliate & Partner Program.",
};

const EFFECTIVE = "06/12/2026";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 36 }}>
      <h2
        id={id}
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 12,
          scrollMarginTop: 90,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          fontSize: 15,
          lineHeight: 1.7,
          color: "var(--text-secondary)",
        }}
      >
        {children}
      </div>
    </section>
  );
}

function Clause({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p style={{ margin: 0 }}>
      <strong style={{ color: "var(--text-primary)" }}>{n}&nbsp;&nbsp;</strong>
      {children}
    </p>
  );
}

export default function AffiliateTermsPage() {
  return (
    <div style={{ background: "var(--charcoal, #0D0E11)", minHeight: "100vh" }}>
      <div
        style={{
          maxWidth: 820,
          margin: "0 auto",
          padding: "64px 24px 96px",
        }}
      >
        {/* Header */}
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.14em",
            color: "var(--gold)",
            fontFamily: "DM Mono, monospace",
            marginBottom: 10,
          }}
        >
          TRUEPOINT TCG
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 8,
            lineHeight: 1.2,
          }}
        >
          Affiliate &amp; Partner Program Agreement
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 4 }}>
          Effective date: {EFFECTIVE}
        </p>
        <div
          style={{
            height: 1,
            background: "var(--border)",
            margin: "24px 0 4px",
          }}
        />

        <p
          style={{
            fontSize: 15,
            lineHeight: 1.7,
            color: "var(--text-secondary)",
            marginTop: 24,
          }}
        >
          This Affiliate &amp; Partner Program Agreement (this{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            &ldquo;Agreement&rdquo;
          </strong>
          ) is entered into between{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            Truepoint TCG Inc.
          </strong>{" "}
          (the{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            &ldquo;Company,&rdquo; &ldquo;we,&rdquo; or &ldquo;us&rdquo;
          </strong>
          ), operator of the TruePoint TCG application and the website at
          truepointtcg.com, and the individual or entity that enrolls in the
          Program and accepts these terms (the{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            &ldquo;Affiliate&rdquo; or &ldquo;you&rdquo;
          </strong>
          ). This Agreement is effective on the date you enroll and accept it.
        </p>

        <Section id='overview' title='1. Overview of the Program'>
          <Clause n='1.1'>
            The TruePoint Affiliate &amp; Partner Program (the
            &ldquo;Program&rdquo;) allows approved Affiliates to refer new users
            to TruePoint using a unique referral code. When a referred user
            subscribes to a paid plan, the Affiliate may earn commissions as set
            out in this Agreement. Participation is voluntary, non-exclusive,
            and may be modified or terminated as provided herein.
          </Clause>
        </Section>

        <Section id='definitions' title='2. Definitions'>
          <Clause n='2.1'>
            <em>&ldquo;Referral Code&rdquo;</em> means the unique code assigned
            to the Affiliate, which a new user enters during signup.
          </Clause>
          <Clause n='2.2'>
            <em>&ldquo;Referred Account&rdquo;</em> means a TruePoint user
            account that entered the Affiliate&rsquo;s valid Referral Code at
            the time the account was created and that is attributed to the
            Affiliate under Section 4.
          </Clause>
          <Clause n='2.3'>
            <em>&ldquo;Paid Plan&rdquo;</em> means the Collector subscription or
            the Pro subscription. The free Starter plan is not a Paid Plan and
            never generates commission.
          </Clause>
          <Clause n='2.4'>
            <em>&ldquo;Net Collected Subscription Revenue&rdquo;</em> means the
            subscription fees actually received and retained by the Company from
            a Referred Account for a given billing period, after deducting: (a)
            app-marketplace commissions and fees charged by Apple (App Store)
            and Google (Google Play); (b) payment-processing and
            subscription-management fees (e.g., Stripe, RevenueCat); (c) sales
            taxes, VAT, or similar amounts collected and remitted; (d) refunds,
            credits, reversals, and chargebacks; and (e) any discounts,
            promotional credits, or price reductions applied to that account.
            Commission is calculated solely on this net amount and never on the
            advertised list price.
          </Clause>
          <Clause n='2.5'>
            <em>&ldquo;Commission&rdquo;</em> means the amount the Affiliate
            earns under Section 5.
          </Clause>
          <Clause n='2.6'>
            <em>&ldquo;Hold Period&rdquo;</em> means the period of thirty (30)
            days after the close of a billing period before Commission for that
            period becomes eligible for payout, allowing refunds, chargebacks,
            and reversals to be reconciled.
          </Clause>
          <Clause n='2.7'>
            <em>&ldquo;Payout Threshold&rdquo;</em> means USD $75.00. Earned,
            cleared Commission is not paid until the Affiliate&rsquo;s available
            balance reaches or exceeds this amount.
          </Clause>
          <Clause n='2.8'>
            <em>&ldquo;Self-Generated Account&rdquo;</em> means any account
            created by the Affiliate, by a person in the Affiliate&rsquo;s
            household, or sharing the Affiliate&rsquo;s payment method, device,
            or contact details, or otherwise created to claim Commission on the
            Affiliate&rsquo;s own activity. The Affiliate&rsquo;s own account
            (including the partner account established under Section 8) is a
            Self-Generated Account. Self-Generated Accounts are excluded and
            never earn Commission.
          </Clause>
        </Section>

        <Section id='enrollment' title='3. Enrollment and Eligibility'>
          <Clause n='3.1'>
            To participate, you must be approved by the Company, be of legal age
            in your jurisdiction, and provide accurate identifying and (when
            required for payout) tax and payment information.
          </Clause>
          <Clause n='3.2'>
            The Company may approve or decline any application in its discretion
            and may suspend or remove any Affiliate who violates this Agreement.
          </Clause>
          <Clause n='3.3'>
            You are an independent contractor. This Agreement does not create an
            employment, partnership, joint-venture, or agency relationship, and
            you have no authority to bind or make representations on behalf of
            the Company.
          </Clause>
        </Section>

        <Section id='attribution' title='4. Attribution'>
          <Clause n='4.1'>
            <strong style={{ color: "var(--text-primary)" }}>
              First-touch, at signup.
            </strong>{" "}
            A user is attributed to the Affiliate only if the user enters the
            Affiliate&rsquo;s valid Referral Code during account creation. Codes
            entered after an account already exists do not create attribution.
          </Clause>
          <Clause n='4.2'>
            <strong style={{ color: "var(--text-primary)" }}>
              One code per account.
            </strong>{" "}
            Each account may be attributed to at most one Affiliate. If a code
            is mistyped or does not match an active Affiliate, no attribution is
            created.
          </Clause>
          <Clause n='4.3'>
            <strong style={{ color: "var(--text-primary)" }}>
              Recorded attribution.
            </strong>{" "}
            At the time of attribution, the Company records the Referred
            Account, the Affiliate, the date, and the applicable Commission
            rate. This record is the authoritative basis for Commission and is
            not altered by later changes to the user&rsquo;s profile or the
            Affiliate&rsquo;s details.
          </Clause>
          <Clause n='4.4'>
            <strong style={{ color: "var(--text-primary)" }}>
              No retroactive attribution.
            </strong>{" "}
            Accounts created before the Affiliate joined the Program, or without
            the Affiliate&rsquo;s code, are not Referred Accounts.
          </Clause>
        </Section>

        <Section id='commission' title='5. Commission Structure'>
          <Clause n='5.1'>
            Subject to the remainder of this Agreement, the Affiliate earns, per
            billing period, for each Referred Account that is an active paying
            subscriber during that period, the following percentage of Net
            Collected Subscription Revenue from that account:
          </Clause>

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              overflow: "hidden",
              margin: "4px 0",
            }}
          >
            {[
              ["Collector", "5%", "Net Collected Subscription Revenue"],
              ["Pro", "7%", "Net Collected Subscription Revenue"],
              ["Starter (free)", "None", "\u2014"],
            ].map((row, i) => (
              <div
                key={row[0]}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 80px 1.4fr",
                  padding: "11px 16px",
                  borderTop: i === 0 ? "none" : "1px solid var(--border)",
                  background: i === 0 ? "var(--surface)" : "transparent",
                  fontSize: 14,
                }}
              >
                <span style={{ color: "var(--text-primary)" }}>{row[0]}</span>
                <span style={{ color: "var(--gold)", fontWeight: 600 }}>
                  {row[1]}
                </span>
                <span style={{ color: "var(--text-dim)" }}>{row[2]}</span>
              </div>
            ))}
          </div>

          <Clause n='5.2'>
            <strong style={{ color: "var(--text-primary)" }}>
              Rate of record.
            </strong>{" "}
            The rates above are the default rates. The Commission rates that
            apply to a given Affiliate are those recorded for that Affiliate at
            enrollment (the Company may agree to different rates with a
            particular Affiliate in writing). The Company may change default
            rates for new Affiliates, or prospectively for existing Affiliates
            on thirty (30) days&rsquo; notice; rate changes do not reduce
            Commission already accrued.
          </Clause>
          <Clause n='5.3'>
            <strong style={{ color: "var(--text-primary)" }}>
              Duration &mdash; while subscribed.
            </strong>{" "}
            Commission continues to accrue for as long as the Referred Account
            remains an active paid subscriber, billing period after billing
            period. If the account cancels, lapses, or downgrades to the free
            Starter plan, Commission for that account stops for any period in
            which it is not an active paying subscriber. If the account later
            resubscribes, Commission resumes, as the account remains attributed
            to the Affiliate.
          </Clause>
          <Clause n='5.4'>
            <strong style={{ color: "var(--text-primary)" }}>
              Net, not gross.
            </strong>{" "}
            All Commission is calculated on Net Collected Subscription Revenue
            as defined in Section 2.4. The Affiliate bears a proportionate share
            of marketplace fees, processing fees, taxes, refunds, and discounts
            through this net calculation.
          </Clause>
          <Clause n='5.5'>
            <strong style={{ color: "var(--text-primary)" }}>
              Exclusions.
            </strong>{" "}
            No Commission is earned on (a) the free Starter plan; (b)
            Self-Generated Accounts, including the Affiliate&rsquo;s own partner
            account; (c) amounts refunded, reversed, or charged back; (d) taxes
            and fees; or (e) any account obtained through conduct prohibited
            under Section 9.
          </Clause>
        </Section>

        <Section id='holds' title='6. Holds, Clawbacks, and Adjustments'>
          <Clause n='6.1'>
            <strong style={{ color: "var(--text-primary)" }}>
              Hold Period.
            </strong>{" "}
            Commission for a billing period accrues when the underlying revenue
            is collected but becomes eligible for payout only after the Hold
            Period.
          </Clause>
          <Clause n='6.2'>
            <strong style={{ color: "var(--text-primary)" }}>Clawback.</strong>{" "}
            If revenue underlying any Commission is later refunded, reversed,
            charged back, or otherwise not retained by the Company, the
            corresponding Commission is reversed. Reversed amounts are deducted
            from the Affiliate&rsquo;s current balance and, if the balance is
            insufficient, from future Commission. If the Program ends or the
            Affiliate is terminated with a negative balance attributable to
            clawbacks, the Company may, to the extent permitted by law, recover
            the shortfall.
          </Clause>
          <Clause n='6.3'>
            <strong style={{ color: "var(--text-primary)" }}>
              Adjustments for fraud or error.
            </strong>{" "}
            The Company may withhold, reverse, or adjust Commission reasonably
            attributable to fraud, abuse, error, or violation of this Agreement.
          </Clause>
        </Section>

        <Section id='payment' title='7. Payment Terms'>
          <Clause n='7.1'>
            <strong style={{ color: "var(--text-primary)" }}>Threshold.</strong>{" "}
            Cleared Commission is paid only once the Affiliate&rsquo;s available
            balance meets or exceeds the Payout Threshold of $75.00. Balances
            below the threshold roll over to subsequent periods until the
            threshold is met.
          </Clause>
          <Clause n='7.2'>
            <strong style={{ color: "var(--text-primary)" }}>Schedule.</strong>{" "}
            Eligible payouts are issued on a monthly basis, covering cleared
            Commission that has passed its Hold Period as of the calculation
            date.
          </Clause>
          <Clause n='7.3'>
            <strong style={{ color: "var(--text-primary)" }}>Method.</strong>{" "}
            Payouts are made via PayPal. The Affiliate is responsible for
            providing and maintaining an accurate PayPal account for payouts.
            The Company may add or change supported payout methods in the future
            on notice to the Affiliate.
          </Clause>
          <Clause n='7.4'>
            <strong style={{ color: "var(--text-primary)" }}>
              Payout portal availability.
            </strong>{" "}
            The Affiliate payout portal is expected to be available on or about
            July 1, 2026. Once available, the Affiliate may log in to the
            Affiliate dashboard to add the PayPal account to which payouts will
            be sent. Until the Affiliate has provided valid PayPal payout
            details, Commission continues to accrue and is tracked, but no
            payout is issued; accrued Commission is paid in the first eligible
            payout cycle after valid details are provided and the Payout
            Threshold is met.
          </Clause>
          <Clause n='7.5'>
            <strong style={{ color: "var(--text-primary)" }}>Currency.</strong>{" "}
            All amounts are stated and paid in U.S. dollars.
          </Clause>
          <Clause n='7.6'>
            <strong style={{ color: "var(--text-primary)" }}>
              No payment below threshold or for reversed amounts.
            </strong>{" "}
            The Company is not obligated to pay Commission that has not cleared,
            that remains below the threshold, or that has been reversed under
            Section 6.
          </Clause>
        </Section>

        <Section id='benefit' title='8. Partner Subscription Benefit'>
          <Clause n='8.1'>
            <strong style={{ color: "var(--text-primary)" }}>Benefit.</strong>{" "}
            An approved Affiliate is eligible for a complimentary Pro
            subscription on one account designated by the Affiliate, provided at
            no charge, for as long as that account remains active, the Affiliate
            remains enrolled in the Program, and the Affiliate is in good
            standing under this Agreement.
          </Clause>
          <Clause n='8.2'>
            <strong style={{ color: "var(--text-primary)" }}>
              Personal benefit only; no Commission.
            </strong>{" "}
            This benefit applies to the Affiliate&rsquo;s own designated
            account. Because that account is a Self-Generated Account, it does
            not generate Commission for the Affiliate.
          </Clause>
          <Clause n='8.3'>
            <strong style={{ color: "var(--text-primary)" }}>
              Conditions.
            </strong>{" "}
            The benefit is non-transferable, has no cash value, and may be
            discontinued if the Affiliate is terminated, leaves the Program, or
            misuses the account. Upon termination of the Affiliate&rsquo;s
            participation, the Company may convert the account to the free
            Starter plan.
          </Clause>
        </Section>

        <Section id='conduct' title='9. Prohibited Conduct'>
          <p style={{ margin: 0 }}>You agree not to:</p>
          <ul
            style={{
              margin: 0,
              paddingLeft: 22,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <li>
              create, solicit, or facilitate Self-Generated Accounts, or
              otherwise manipulate signups or attribution;
            </li>
            <li>
              use spam, deceptive claims, fake reviews, bots, incentivized
              clicks, or misleading advertising to obtain signups;
            </li>
            <li>
              misrepresent TruePoint, its features, pricing, or your
              relationship to the Company;
            </li>
            <li>
              bid on or misuse the Company&rsquo;s trademarks, brand names, or
              domains in paid search or advertising except as expressly
              permitted in writing;
            </li>
            <li>
              make any promise, guarantee, or representation to users on the
              Company&rsquo;s behalf;
            </li>
            <li>
              distribute your Referral Code in any manner that violates
              applicable law (including advertising-disclosure and
              consumer-protection rules) or any platform&rsquo;s terms; or
            </li>
            <li>
              engage in any conduct that harms the Company&rsquo;s reputation or
              violates this Agreement.
            </li>
          </ul>
          <Clause n='9.1'>
            Violation may result in forfeiture of unpaid Commission, reversal of
            paid Commission, suspension, and termination.
          </Clause>
        </Section>

        <Section id='term' title='10. Term and Termination'>
          <Clause n='10.1'>
            <strong style={{ color: "var(--text-primary)" }}>Term.</strong> This
            Agreement begins on the Effective Date and continues until
            terminated.
          </Clause>
          <Clause n='10.2'>
            <strong style={{ color: "var(--text-primary)" }}>
              Termination for convenience.
            </strong>{" "}
            Either party may terminate on thirty (30) days&rsquo; written notice
            (email to the address on file is sufficient).
          </Clause>
          <Clause n='10.3'>
            <strong style={{ color: "var(--text-primary)" }}>
              Termination for cause.
            </strong>{" "}
            The Company may terminate immediately for breach, fraud, abuse, or
            prohibited conduct.
          </Clause>
          <Clause n='10.4'>
            <strong style={{ color: "var(--text-primary)" }}>
              Effect of termination.
            </strong>{" "}
            On termination: (a) you must stop using your Referral Code and the
            Company&rsquo;s marks; (b) Commission that has properly accrued and
            cleared (net of clawbacks and subject to the Payout Threshold) will
            be paid in the next regular payout cycle; (c) Commission that has
            not yet cleared the Hold Period [confirm: paid after clearing, or
            forfeited]; and (d) the provisions concerning clawback, taxes,
            confidentiality, disclaimers, and limitation of liability survive.
          </Clause>
          <Clause n='10.5'>
            <strong style={{ color: "var(--text-primary)" }}>
              No further accrual.
            </strong>{" "}
            After termination, no further Commission accrues, even for accounts
            that remain subscribed.
          </Clause>
        </Section>

        <Section id='taxes' title='11. Taxes'>
          <Clause n='11.1'>
            You are solely responsible for all taxes on amounts you receive
            under this Agreement.
          </Clause>
          <Clause n='11.2'>
            You agree to provide a completed IRS Form W-9 (or Form W-8BEN, if
            applicable) and any other tax documentation the Company reasonably
            requires before payout. The Company may withhold payouts until valid
            tax information is provided and may issue tax forms (e.g., Form
            1099) where required by law.
          </Clause>
        </Section>

        <Section id='confidentiality' title='12. Confidentiality'>
          <Clause n='12.1'>
            Non-public information you receive through the Program (including
            dashboards, metrics, and the rates offered to you) is confidential
            and may be used only to participate in the Program.
          </Clause>
        </Section>

        <Section
          id='disclaimers'
          title='13. Disclaimers and Limitation of Liability'
        >
          <Clause n='13.1'>
            The Program and any dashboard data are provided &ldquo;as is.&rdquo;
            Reported figures are estimates that may be adjusted for refunds,
            chargebacks, fraud review, and error, and are not a guarantee of
            payment.
          </Clause>
          <Clause n='13.2'>
            To the maximum extent permitted by law, the Company is not liable
            for indirect, incidental, special, or consequential damages, and the
            Company&rsquo;s total liability under this Agreement will not exceed
            the total Commission properly payable to you in the six (6) months
            preceding the claim.
          </Clause>
        </Section>

        <Section id='changes' title='14. Changes to the Agreement and Program'>
          <Clause n='14.1'>
            The Company may modify this Agreement or the Program on thirty (30)
            days&rsquo; notice (by email or in-app/dashboard notice). Changes
            apply prospectively. Continued participation after the effective
            date of a change constitutes acceptance. Changes do not reduce
            Commission already accrued.
          </Clause>
        </Section>

        <Section id='general' title='15. General'>
          <Clause n='15.1'>
            <strong style={{ color: "var(--text-primary)" }}>
              Governing law.
            </strong>{" "}
            This Agreement is governed by the laws of the State of Deleware,
            without regard to conflict-of-laws rules.
          </Clause>
          <Clause n='15.2'>
            <strong style={{ color: "var(--text-primary)" }}>
              Assignment.
            </strong>{" "}
            You may not assign this Agreement without the Company&rsquo;s
            written consent. The Company may assign it.
          </Clause>
          <Clause n='15.3'>
            <strong style={{ color: "var(--text-primary)" }}>
              Entire agreement.
            </strong>{" "}
            This Agreement is the entire agreement on this subject and
            supersedes prior discussions.
          </Clause>
          <Clause n='15.4'>
            <strong style={{ color: "var(--text-primary)" }}>
              Severability.
            </strong>{" "}
            If any provision is unenforceable, the remainder remains in effect.
          </Clause>
          <Clause n='15.5'>
            <strong style={{ color: "var(--text-primary)" }}>No waiver.</strong>{" "}
            Failure to enforce a provision is not a waiver of it.
          </Clause>
        </Section>

        <Section id='acceptance' title='16. Acceptance'>
          <Clause n='16.1'>
            By enrolling in the Program and/or accepting these terms, you
            acknowledge that you have read, understood, and agree to this
            Agreement.
          </Clause>
        </Section>

        <div
          style={{
            marginTop: 48,
            paddingTop: 20,
            borderTop: "1px solid var(--border)",
            fontSize: 13,
            color: "var(--text-dim)",
            lineHeight: 1.7,
          }}
        >
          Questions about the Program? Contact{" "}
          <a
            href='mailto:support@truepointtcg.com'
            style={{ color: "var(--gold)" }}
          >
            contact@truepointtcg.com
          </a>
          .
        </div>
      </div>
    </div>
  );
}
