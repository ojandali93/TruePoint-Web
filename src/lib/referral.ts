// src/lib/referral.ts
//
// AUDITS/affiliate-system-plan.md §2.1 / AUDITS/referral-program-plan.md
// §2.2 — the ?ref= cookie. Last-touch: re-stamped on every ?ref= landing,
// which both resets its own 30-day expiry AND overwrites whatever code was
// there before (the doc's own ruling: "whichever affiliate's link the
// user clicked most recently... is the one credited").
//
// Deliberately unconditional — this only writes an inert cookie, read by
// nothing until register/page.tsx sends it to POST /me/attribution at
// signup, which is where the real feature-flag gate lives (server-side,
// per user). Flags in this codebase are resolved per-user
// (resolveFlagsForUser), and there is no user yet on an anonymous page
// load — capturing the cookie itself can't be gated the same way without
// inventing an anonymous-flag-check that doesn't exist elsewhere in this
// codebase. Setting an unread cookie changes nothing about what a
// flag-off user sees or does, so this doesn't touch the funnel it's not
// supposed to touch.

const REF_COOKIE_NAME = "rh_ref";
const REF_COOKIE_DAYS = 30;

export function captureRefCookie(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref")?.trim();
  if (!ref) return;

  const expires = new Date();
  expires.setUTCDate(expires.getUTCDate() + REF_COOKIE_DAYS);
  document.cookie = `${REF_COOKIE_NAME}=${encodeURIComponent(ref)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

export function getRefCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${REF_COOKIE_NAME}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}
