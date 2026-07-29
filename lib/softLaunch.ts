/**
 * Soft-launch freezes from docs/prd/SOFT_NAV_AND_PRESETS.md (+ suite Modules).
 * Code imports this so G1/G2 cannot drift from the product contract.
 *
 * 2026-07-26 GSC P0: PRIMARY = real indexable core only.
 * Preview/Lab doors live under More (crawlable + noindex, not robots.txt block).
 */

/** Wave A availability is a UI capability contract, not provider provenance. */
export type CapabilityState =
  | "live"
  | "validation"
  | "preview"
  | "coming_soon";

export const CAPABILITY_STATE_LABELS: Record<CapabilityState, string> = {
  live: "Live",
  validation: "Validation",
  preview: "Preview",
  coming_soon: "Coming soon",
};

export type WaveADestinationId =
  | "explore"
  | "recipes"
  | "generate"
  | "seller_pack"
  | "library"
  | "learn"
  | "pricing";

export type WaveADestination = {
  id: WaveADestinationId;
  href: string;
  label: string;
  /** Home rail may use a more explicit product-action label. */
  homeLabel?: string;
  description: string;
  emoji: string;
  state: CapabilityState;
  /** Extra truth boundary shown with the state, never a cloud claim. */
  note?: string;
};

export const WAVE_A_GENERATE_HREF = "/create" as const;

/**
 * Single source of truth for every visible Wave A shell / home destination.
 * `live` means the destination itself is available, never that paid provider
 * generation or durable cloud persistence is generally enabled.
 */
export const WAVE_A_DESTINATIONS: Record<
  WaveADestinationId,
  WaveADestination
> = {
  explore: {
    id: "explore",
    href: "/explore",
    label: "Explore",
    homeLabel: "Explore Projects",
    description: "Inspect paired Lab project evidence",
    emoji: "◉",
    state: "preview",
    note: "Cached examples",
  },
  recipes: {
    id: "recipes",
    href: "/effects",
    label: "Recipes",
    description: "Search reusable toy-motion recipes",
    emoji: "▶",
    state: "preview",
    note: "Cached + concept",
  },
  generate: {
    id: "generate",
    href: WAVE_A_GENERATE_HREF,
    label: "Create",
    homeLabel: "Generate",
    description: "Owned photo → reviewed video draft",
    emoji: "✦",
    state: "validation",
    note: "Live access gated",
  },
  seller_pack: {
    id: "seller_pack",
    href: "/create?mode=seller-pack",
    label: "Seller Starter Pack",
    description: "One photo → three fixed seller jobs",
    emoji: "▦",
    state: "validation",
    note: "Quote before Live",
  },
  library: {
    id: "library",
    href: "/library",
    label: "Library",
    description: "Return to saved clips and recipes",
    emoji: "▢",
    state: "preview",
    note: "Local to this device",
  },
  learn: {
    id: "learn",
    href: "/guides",
    label: "Learn",
    description: "Rights, listing, and launch guides",
    emoji: "◎",
    state: "live",
  },
  pricing: {
    id: "pricing",
    href: "/pricing",
    label: "Pricing",
    description: "Review current plan and credit framing",
    emoji: "◇",
    state: "live",
  },
};

export const PRIMARY_NAV_IDS = [
  "explore",
  "recipes",
  "generate",
  "library",
  "pricing",
] as const satisfies readonly WaveADestinationId[];

export const HOME_ENTRY_IDS = [
  "generate",
  "seller_pack",
  "explore",
  "recipes",
  "library",
  "learn",
] as const satisfies readonly WaveADestinationId[];

function destinationList(ids: readonly WaveADestinationId[]) {
  return ids.map((id) => WAVE_A_DESTINATIONS[id]);
}

/** Primary product path for the toy-Recipe browsing loop. */
export const PRIMARY_NAV = destinationList(PRIMARY_NAV_IDS);

export const PRIMARY_NAV_HREFS = PRIMARY_NAV.map((item) => item.href);

/** Mobile mirrors the same five product doors; secondary routes stay hidden. */
export const MOBILE_NAV = destinationList(PRIMARY_NAV_IDS);

export const MOBILE_NAV_HREFS = MOBILE_NAV.map((item) => item.href);

/** Compact first-viewport rail: exactly the six real Wave A doors. */
export const HOME_ENTRY_RAIL = destinationList(HOME_ENTRY_IDS);

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
