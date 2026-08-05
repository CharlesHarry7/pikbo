/**
 * Soft-launch freezes from docs/prd/SOFT_NAV_AND_PRESETS.md (+ suite Modules).
 * Code imports this so G1/G2 cannot drift from the product contract.
 *
 * 2026-07-26 GSC P0: indexable core stays tight (sitemap + robots).
 * AIT-83: Explore is back on product chrome for one-click Lab browse, but stays
 * noindex (CONCEPT_ROBOTS) — not a cold-start rank peer. Cap visible peers ≤6.
 * Cinema/Models/Community stay out of primary.
 */

/** First-dollar product: one fixed, private seller Moment. */
export const MOMENT_CREATE_HREF =
  "/create?mode=moment&effect=street-power-up" as const;

/** Seller-first frontdoor + Explore Lab wall (noindex). Max 6 peers. */
export const PRIMARY_NAV = [
  { href: "/", label: "Home" },
  {
    href: `${MOMENT_CREATE_HREF}&source=primary-nav`,
    label: "Create",
  },
  { href: "/explore", label: "Explore" },
  { href: "/library", label: "Library" },
  { href: "/pricing", label: "Pricing" },
  { href: "/profile", label: "Account" },
] as const;

export const PRIMARY_NAV_HREFS = PRIMARY_NAV.map((item) => item.href);

/** Mobile mirrors desktop product doors (≤6); one-click Explore. */
export const MOBILE_NAV = [
  { href: "/", label: "Home" },
  {
    href: `${MOMENT_CREATE_HREF}&source=primary-nav`,
    label: "Create",
  },
  { href: "/explore", label: "Explore" },
  { href: "/library", label: "Library" },
  { href: "/pricing", label: "Pricing" },
  { href: "/profile", label: "Account" },
] as const;

export const MOBILE_NAV_HREFS = MOBILE_NAV.map((item) => item.href);

/**
 * At most these eight registered recipes may appear on the homepage proof wall.
 * Order is render order: 360 listing spin is pinned in the first 4 slots so the
 * mobile 2-col wall shows it in the first 2×2 without deep scroll (AIT-60 / AIT-99).
 */
export const HOME_PROOF_SLUGS = [
  "360-spin-showcase",
  "floating-hero",
  "blind-box-unboxing",
  "miniature-scene",
  "paparazzi-flash",
  "mystery-box-reveal",
  "make-figure-dance",
  "display-case-glam",
] as const;

export type HomeProofSlug = (typeof HOME_PROOF_SLUGS)[number];

export const HOME_PROOF_LIMIT = HOME_PROOF_SLUGS.length;

export function isHomeProofSlug(slug: string): slug is HomeProofSlug {
  return (HOME_PROOF_SLUGS as readonly string[]).includes(slug);
}

/** Retention preview badge; it is not provider provenance or formal QA. */
export const HOME_PROOF_BADGE = "PIKBO Lab · cached prototype" as const;
