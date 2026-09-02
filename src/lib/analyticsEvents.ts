// src/lib/analyticsEvents.ts
//
// Web's copy of mobile's src/lib/analyticsEvents.ts — same event-name
// constants, kept in sync by hand (separate repos, no shared package; same
// convention as PriceChartingAttribution.tsx). Taxonomy approved
// 2026-09-02. Not every event applies to web (app_opened_cold/warm are
// mobile lifecycle concepts — web relies on PostHog's own $pageview
// autocapture instead) — this file still lists them for parity/reference,
// call sites just don't exist for the ones that don't apply.

export const ANALYTICS_EVENTS = {
  ONBOARDING_STEP_VIEWED: "onboarding_step_viewed",
  ONBOARDING_COMPLETED: "onboarding_completed",
  SIGNUP_STARTED: "signup_started",
  SIGNUP_COMPLETED: "signup_completed",
  FIRST_RUN_HERO_SHOWN: "first_run_hero_shown",
  FIRST_RUN_DOOR_TAPPED: "first_run_door_tapped",
  FEATURE_USED_AI_GRADING: "feature_used_ai_grading",
  FEATURE_USED_CENTERING: "feature_used_centering",
  FEATURE_USED_ARBITRAGE: "feature_used_arbitrage",
  FEATURE_USED_IMPORT: "feature_used_import",
  FEATURE_USED_WATCHLIST: "feature_used_watchlist",
  FEATURE_USED_SUBMISSIONS: "feature_used_submissions",
  FEATURE_USED_MASTER_SETS: "feature_used_master_sets",
  FEATURE_USED_SEARCH: "feature_used_search",
  AI_GRADING_COMPLETED: "ai_grading_completed",
  PAYWALL_VIEWED: "paywall_viewed",
  PAYWALL_DISMISSED: "paywall_dismissed",
  PURCHASE_STARTED: "purchase_started",
  PURCHASE_COMPLETED: "purchase_completed",
  PERMISSION_DENIED: "permission_denied",
  COMMUNITY_LINK_TAPPED: "community_link_tapped",

  // Affiliate + referral programs (added post-taxonomy, own request —
  // AUDITS/affiliate-system-plan.md / AUDITS/referral-program-plan.md —
  // same infra as community_link_tapped above).
  AFFILIATE_APPLY_TAPPED: "affiliate_apply_tapped",
  AFFILIATE_CODE_COPIED: "affiliate_code_copied",
  AFFILIATE_LINK_SHARED: "affiliate_link_shared",
  REFERRAL_CODE_COPIED: "referral_code_copied",
  REFERRAL_CODE_SHARED: "referral_code_shared",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
