/**
 * Legacy set-ID redirect map.
 *
 * Populated once during the catalog migration that moved sets from text IDs
 * ("sv5", "base1", "me2pt5") to numeric TCGAPIs group IDs ("23821", "12345").
 *
 * After the migration, the `sets` table only contains numeric IDs. This map
 * preserves the ability to follow old URLs / bookmarks like `/cards/sv5` and
 * silently route them to the new equivalent `/cards/23821`.
 *
 * Generated once and committed to the repo. Should not need updates unless
 * a future migration further changes set IDs.
 *
 * How to (re)generate: run the SQL in MIGRATION_PLAN.md, Phase A1 — the
 * mapping rows it returns (only the ones marked "✅ matched") are pasted
 * here as { [old_text_id]: "<new_numeric_id>" }.
 *
 * Anything not in this map is treated as a "real" set ID (numeric or
 * otherwise) and passed through to the API as-is.
 */

export const LEGACY_SET_ID_MAP: Record<string, string> = {
  // TODO: fill in from migration output. Example shape:
  // sv5: "23821",
  // sv8pt5: "23899",
  // base1: "12345",
};

/**
 * If the given setId is a known legacy text id, return its modern numeric id.
 * Otherwise return null (caller should pass setId through unchanged).
 *
 * Cheap O(1) lookup, no API calls.
 */
export function resolveLegacySetId(setId: string | undefined): string | null {
  if (!setId) return null;
  return LEGACY_SET_ID_MAP[setId] ?? null;
}

/**
 * A text-ID looks like one of: alphanumeric starting with a letter, hyphenated
 * codes, mixed-case. A numeric-ID is all digits.
 *
 * Used to short-circuit redirect checks for confidently-numeric IDs without
 * a map lookup.
 */
export function isProbablyLegacyId(setId: string | undefined): boolean {
  if (!setId) return false;
  return !/^\d+$/.test(setId);
}
