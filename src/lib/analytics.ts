// src/lib/analytics.ts
//
// PostHog integration, Part A infrastructure (mobile's twin file —
// mobile/src/lib/analytics.ts — carries the fuller design rationale;
// mirrored here for web). Event instrumentation itself is a separate,
// later step pending taxonomy approval; this file is the plumbing that
// step will call into.
//
// HARD BOUNDARY: PostHog is an analysis layer ONLY — no app logic (auth
// gating, feature flags, metering) may read from it.
//
// Never throws, never blocks render: every export is a safe no-op if
// PostHog isn't configured (missing env vars). init() is called once from
// providers.tsx, not awaited before anything renders.
//
// Durable anonymous ID: same role as mobile's, persisted in localStorage
// instead of AsyncStorage, key style matches the existing device-id
// convention (src/lib/device.ts's tp_device_id) rather than inventing a
// new one — this is a DIFFERENT id for a different purpose (PostHog
// identity vs. this app's own device-management feature), not a reuse of
// that value, just the same naming/generation pattern (crypto.randomUUID
// with the same SSR-safe / private-browsing-safe fallback device.ts
// already established).

import posthog from "posthog-js";

const ANON_ID_KEY = "tp_posthog_anonymous_id";

function generateUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `anon_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

let initialized = false;
let anonymousId: string | null = null;

function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(ANON_ID_KEY);
    if (existing) return existing;
    const id = generateUuid();
    window.localStorage.setItem(ANON_ID_KEY, id);
    return id;
  } catch {
    // localStorage disabled (private browsing, etc.) — session-only,
    // matches device.ts's own fallback behavior for the same case.
    return generateUuid();
  }
}

/**
 * Call once, client-side only (providers.tsx). Reads
 * NEXT_PUBLIC_POSTHOG_KEY / NEXT_PUBLIC_POSTHOG_HOST; no-ops silently if
 * either is missing. Omar sets these env vars himself on Render — this
 * file never hardcodes a key.
 */
export function initAnalytics(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  try {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    if (!key || !host) {
      console.log("[analytics] PostHog env vars not set — no-op mode");
      return;
    }

    anonymousId = getOrCreateAnonymousId();

    posthog.init(key, {
      api_host: host,
      // Next.js App Router does full client-side navigations without a
      // page (re)load, and posthog-js's own $pageview autocapture is
      // tuned for that — capture_pageview left at its default (true).
      person_profiles: "always",
      // Session replay: enabled here (web has no native-module gate the
      // way mobile does — posthog-js's replay recorder is pure browser
      // JS). Masking config below; see this session's report for the
      // exact privacy-policy language this needs.
      session_recording: {
        maskAllInputs: true,
        maskInputOptions: {
          password: true,
          email: true,
        },
        // Belt-and-suspenders beyond maskAllInputs (which covers <input>/
        // <textarea> generically): explicit selectors for anything that
        // isn't a plain form input but still shows sensitive text — card
        // notes rendered as plain divs/spans, not inputs.
        maskTextSelector: "[data-ph-mask], .ph-mask",
      },
    });

    posthog.identify(anonymousId);
  } catch (err) {
    console.warn("[analytics] init failed, running in no-op mode:", err);
  }
}

export function getAnalyticsAnonymousId(): string | null {
  return anonymousId;
}

/** Same identify-then-alias ordering and reasoning as mobile's
 *  identifySignup — see that file's doc comment. */
export function identifySignup(
  userId: string,
  properties?: Record<string, unknown>,
): void {
  if (!initialized) return;
  try {
    posthog.identify(userId, properties);
    if (anonymousId) posthog.alias(anonymousId);
  } catch (err) {
    console.warn("[analytics] identifySignup failed:", err);
  }
}

export function identifyLogin(
  userId: string,
  properties?: Record<string, unknown>,
): void {
  if (!initialized) return;
  try {
    posthog.identify(userId, properties);
  } catch (err) {
    console.warn("[analytics] identifyLogin failed:", err);
  }
}

export function resetAnalytics(): void {
  if (!initialized) return;
  try {
    posthog.reset();
    anonymousId = generateUuid();
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(ANON_ID_KEY, anonymousId);
      } catch {
        // private browsing etc. — session-only id, same as init's fallback
      }
    }
    posthog.identify(anonymousId);
  } catch (err) {
    console.warn("[analytics] resetAnalytics failed:", err);
  }
}

export function captureAnalyticsEvent(
  name: string,
  properties?: Record<string, unknown>,
): void {
  if (!initialized) return;
  try {
    posthog.capture(name, properties);
  } catch (err) {
    console.warn(`[analytics] capture(${name}) failed:`, err);
  }
}
