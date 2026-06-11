"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { createClient } from "../../lib/supabase";
import { ROUTES } from "../../constants/routes";

// Routes inside (auth) that should NOT auto-redirect logged-in users to
// the dashboard. Logged-in-but-unverified users need to be able to sit
// on /verify-email and click the resend button. Without this exclusion,
// the auth layout would bounce them to /dashboard, then the
// EmailVerificationGate would bounce them back here — infinite loop.
//
// /onboarding belongs here too: a user who just signed up DOES have a
// session, and onboarding is where they finish setting up their profile,
// collection, and (for paid plans) billing — BEFORE the verification email
// is sent at the end of the flow. Without this, signup creates the session,
// register pushes to /onboarding, this layout sees the session and replaces
// to /dashboard, and the EmailVerificationGate then sends them to
// /verify-email — so the entire profile/onboarding flow gets skipped.
const AUTH_ROUTES_TO_KEEP = [
  ROUTES.ONBOARDING,
  "/verify-email",
  "/reset-password",
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    // Don't bounce logged-in users away from /verify-email. Verification
    // is enforced by the (app) layout's EmailVerificationGate — letting
    // verified users sit here is fine, and unverified users NEED to be here.
    if (AUTH_ROUTES_TO_KEEP.includes(pathname)) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace(ROUTES.DASHBOARD);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--charcoal)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <Image
            src='/tp-logo-gold-white.png'
            alt='TruePoint TCG'
            height={40}
            width={180}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
        {children}
      </div>
    </div>
  );
}
