"use client";

/**
 * PriceChartingAttribution — the one shared attribution line for every
 * surface that can render a source='pricecharting' graded price (card
 * detail's full graded-price panel, the grade-10 comparison widget, the
 * regrade tracker ladder). Per the PriceCharting licensing terms (email
 * archived, Brady Haugh @ vgpc.com — Legendary tier permits display with
 * attribution + linkback until $1k/mo revenue; see CLAUDE.md), NEVER render
 * this on a PokeTrace-only surface — callers must gate on whether a
 * pricecharting row is actually present in what's currently shown, not
 * just whether the flag is on for the user.
 *
 * One component so every surface's attribution stays byte-identical
 * instead of drifting into per-page copies with slightly different
 * wording/links. Mirrors mobile's src/components/cards/PriceChartingAttribution.tsx
 * — same gating rule, same URL scheme, kept in sync by hand (no shared
 * package between the two repos).
 *
 * Usage:
 *   {hasPriceChartingRow && (
 *     <PriceChartingAttribution productId={pcRow.sourceProductId} />
 *   )}
 */

const FALLBACK_URL = "https://www.pricecharting.com";

/**
 * https://www.pricecharting.com/game/<id> — verified live (2026-08-26): a
 * bare numeric id 301-redirects to the canonical slugged product page
 * (e.g. /game/pokemon-phantasmal-flames/dawn-118). productId is null for
 * rows synced before source_product_id was captured (see
 * migrations/2026-08-26_market_prices_source_product_id.sql) — the bare
 * domain is an acceptable fallback link per the license's terms, not an
 * error state.
 */
const linkFor = (productId: string | null | undefined): string =>
  productId ? `https://www.pricecharting.com/game/${productId}` : FALLBACK_URL;

export function PriceChartingAttribution({
  productId,
}: {
  productId?: string | null;
}) {
  return (
    <a
      href={linkFor(productId)}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 10,
        color: "var(--text-dim)",
        textDecoration: "none",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--gold)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--text-dim)";
      }}
    >
      Prices by PriceCharting ↗
    </a>
  );
}
