// src/lib/setSeries.ts
//
// Series grouping for the set browser. TCGAPIs-native sets have series = null
// in the DB, so we derive the series from the set NAME using the systematic
// prefixes TCGAPIs uses (ME01:, SV01:, SWSH01, SM -, POP Series N, etc.).
//
// Mirrors mobile's src/lib/setSeries.ts so set browser categories look
// identical on both platforms.

import { type PokemonSet } from "../hooks/useBrowse";

// ── Series identifiers ──
export const SERIES = {
  MEGA: "Mega Evolution",
  SV: "Scarlet & Violet",
  SWSH: "Sword & Shield",
  SM: "Sun & Moon",
  POP: "POP Series",
  TRAINER_KITS: "Trainer Kits",
  MCDONALDS: "McDonald's Collections",
  BATTLE_ACADEMY: "Battle Academy",
  TRICK_OR_TREAT: "Trick or Trade",
  WORLDS: "World Championship Decks",
  OTHER: "Other Sets & Promos",
} as const;

export type SeriesName = (typeof SERIES)[keyof typeof SERIES];

/**
 * Display order. Main eras first (newest era → oldest), then special families.
 * Anything classified as a series not listed here falls right before OTHER.
 */
export const SERIES_ORDER: SeriesName[] = [
  SERIES.MEGA,
  SERIES.SV,
  SERIES.SWSH,
  SERIES.SM,
  SERIES.POP,
  SERIES.TRAINER_KITS,
  SERIES.MCDONALDS,
  SERIES.BATTLE_ACADEMY,
  SERIES.TRICK_OR_TREAT,
  SERIES.WORLDS,
  SERIES.OTHER,
];

export type SetLanguage = "English" | "Japanese";

const MINOR_SET_PATTERN =
  /\b(promo|promos|energies|deck|decks|box|boxes|collection|tin|gift|blister|premium|elite\s*trainer|build\s*&?\s*battle|starter|bundle|jumbo|sample|demo|prerelease|staff|sleeve|pin)\b/i;

export function isMajorSet(set: Pick<PokemonSet, "name">): boolean {
  return !MINOR_SET_PATTERN.test(set.name);
}

/** API may include language; otherwise infer from name (JP script → Japanese). */
export function getSetLanguage(
  set: Pick<PokemonSet, "name" | "language">,
): SetLanguage {
  if (set.language === "English" || set.language === "Japanese") {
    return set.language;
  }
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(set.name)
    ? "Japanese"
    : "English";
}

/** Classify a set into a series by its name. */
export function classifySeries(name: string): SeriesName {
  const n = name ?? "";

  // Main eras — match the systematic TCGAPIs prefixes
  if (/^ME\d/.test(n) || /^ME[:E]/.test(n) || n.startsWith("ME "))
    return SERIES.MEGA;
  if (/^SV\d/.test(n) || n.startsWith("SV:") || n.startsWith("SVE:"))
    return SERIES.SV;
  if (/^SWSH\d/.test(n) || n.startsWith("SWSH:")) return SERIES.SWSH;
  if (n.startsWith("SM -") || n.startsWith("SM:") || /^SM\s/.test(n))
    return SERIES.SM;

  // Special families — each its own category
  if (n.startsWith("POP Series")) return SERIES.POP;
  if (/Trainer Kit/i.test(n)) return SERIES.TRAINER_KITS;
  if (/McDonald/i.test(n)) return SERIES.MCDONALDS;
  if (/Battle Academy/i.test(n)) return SERIES.BATTLE_ACADEMY;
  if (/Trick or Trade/i.test(n)) return SERIES.TRICK_OR_TREAT;
  if (/World Championship/i.test(n)) return SERIES.WORLDS;

  return SERIES.OTHER;
}

/**
 * For POP Series, sort by the series NUMBER (1→9) rather than release date,
 * since they all share a backfilled date.
 */
export function popSeriesNumber(name: string): number | null {
  const m = name.match(/POP Series\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

export interface GroupedSets {
  series: string;
  sets: PokemonSet[];
}

/**
 * Group sets into series and order them:
 *   - groups in SERIES_ORDER
 *   - within a main-era group: newest release date first
 *   - within POP: by series number ascending
 *   - within other special groups: newest release date first
 * Different series are NEVER mixed together.
 */
export function groupSetsBySeries(sets: PokemonSet[]): GroupedSets[] {
  const buckets = new Map<SeriesName, PokemonSet[]>();
  for (const set of sets) {
    const series = classifySeries(set.name);
    if (!buckets.has(series)) buckets.set(series, []);
    buckets.get(series)!.push(set);
  }

  for (const [series, list] of buckets) {
    if (series === SERIES.POP) {
      list.sort((a, b) => {
        const an = popSeriesNumber(a.name) ?? 999;
        const bn = popSeriesNumber(b.name) ?? 999;
        return an - bn;
      });
    } else {
      list.sort((a, b) =>
        (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""),
      );
    }
  }

  const ordered: GroupedSets[] = [];
  const seen = new Set<SeriesName>();
  for (const series of SERIES_ORDER) {
    if (buckets.has(series)) {
      ordered.push({ series, sets: buckets.get(series)! });
      seen.add(series);
    }
  }
  for (const [series, list] of buckets) {
    if (!seen.has(series)) {
      const otherIdx = ordered.findIndex((g) => g.series === SERIES.OTHER);
      const entry = { series, sets: list };
      if (otherIdx >= 0) ordered.splice(otherIdx, 0, entry);
      else ordered.push(entry);
    }
  }

  return ordered;
}
