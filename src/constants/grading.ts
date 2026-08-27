export const GRADING_COMPANIES = ["PSA", "BGS", "CGC", "TAG", "SGC"] as const;

export const GRADE_SCALES = {
  PSA: ["10", "9", "8", "7", "6", "5", "4", "3", "2", "1"],
  BGS: ["10", "9.5", "9", "8.5", "8", "7.5", "7"],
  CGC: ["10", "9.5", "9", "8.5", "8"],
  TAG: ["10", "9.5", "9", "8.5", "8", "7.5"],
  SGC: ["10", "9.5", "9", "8.5", "8"],
} as const;

// The shared source for grading-company badge/ladder colors, consolidated
// here 2026-08-27 (W3.5) from what had been 9 hand-copied duplicates
// across the app — most had already drifted (SGC alone had 3 different
// hex values across cards/watchlist/centering-reports; ACE was missing
// from watchlist/TrackRegradeModal entirely) — the same two-copies-
// drifted class of bug as variantKey and the insert builders.
//
// Actually imported by: cards/[setId]/[cardId]/page.tsx, watchlist/page.tsx,
// TrackRegradeModal.tsx, portfolio/page.tsx. Import this rather than
// re-declaring a local copy if you add another consumer.
//
// Deliberately NOT imported by (kept local, on purpose, not oversight):
//   - grading/page.tsx, grading/ai/page.tsx — their own distinct, wider
//     palette (also covers EBAY/GMA, which this doesn't), every value
//     besides ACE differs on purpose, not drift. Only ACE was corrected
//     there, to this file's token, since ACE is one real company with one
//     real brand color regardless of which page's scheme is active.
//   - centering/page.tsx, centering/reports/[reportId]/page.tsx — lowercase
//     company-code keys ("psa" not "PSA"), a real structural difference
//     for that feature's own data model; importing this uppercase-keyed
//     map would silently break every lookup. Their mutual SGC drift was
//     synced against each other instead.
//   - inventory/page.tsx — already correct (including ACE) independently;
//     left alone because it's mid-edit in unrelated in-flight work when
//     this consolidation happened, not because it needs its own copy.
//
// Typed as Record<string, string>, not `as const` — every existing call
// site indexes by a runtime company string (grading_company column values,
// etc.), not a value known at the type level, so a literal-keyed type
// would break every one of those call sites under strict mode.
export const COMPANY_COLORS: Record<string, string> = {
  PSA: "#C9A84C",
  BGS: "#378ADD",
  CGC: "#3DAA6E",
  TAG: "#D85A30",
  SGC: "#7F77DD",
  ACE: "#2FA8A0",
};
