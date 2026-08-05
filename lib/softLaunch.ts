/**
 * Soft-launch freezes from docs/prd/SOFT_NAV_AND_PRESETS.md (+ suite Modules).
 * Code imports this so G1/G2 cannot drift from the product contract.
 *
 * 2026-07-26 GSC P0: PRIMARY = real indexable core only.
 * Preview/Lab routes stay crawlable + noindex, but remain outside primary navigation.
 */

/** First-dollar product: one fixed, private seller Moment. */
export const MOMENT_CREATE_HREF =
  "/create?mode=moment&effect=street-power-up" as const;

/** Seller-first frontdoor: one clear path from promise to private assets. */
export const PRIMARY_NAV = [
  { href: "/", label: "Home" },
  {
    href: `${MOMENT_CREATE_HREF}&source=primary-nav`,
    label: "Create",
  },
  { href: "/library", label: "Library" },
  { href: "/pricing", label: "Pricing" },
  { href: "/profile", label: "Account" },
] as const;

export const PRIMARY_NAV_HREFS = PRIMARY_NAV.map((item) => item.href);

/**
 * Mobile bottom nav: same five product doors as desktop.
 * Exactly one primary Generate entry (Moment / 360 path) — UI elevates it;
 * secondary doors stay de-emphasized peers, not equal CTAs.
 */
export const MOBILE_NAV = [
  { href: "/", label: "Home" },
  {
    href: `${MOMENT_CREATE_HREF}&source=primary-nav`,
    label: "Generate",
    primary: true,
  },
  { href: "/library", label: "Library" },
  { href: "/pricing", label: "Pricing" },
  { href: "/profile", label: "Account" },
] as const;

export const MOBILE_NAV_HREFS = MOBILE_NAV.map((item) => item.href);

/** At most these eight registered recipes may appear on the homepage proof wall. */
export const HOME_PROOF_SLUGS = [
  "floating-hero",
  "blind-box-unboxing",
  "miniature-scene",
  "paparazzi-flash",
  "360-spin-showcase",
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
