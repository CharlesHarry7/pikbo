/** Public launch plans. Legacy creator/shop values are never accepted here. */
export type PlanId = "free" | "founding_studio";

export const PAID_PLAN_ID = "founding_studio" as const;
/** Flat price for the only admitted 5s / Fast / 720p Moment contract. */
export const CREDITS_PER_VIDEO = 10;
export const FOUNDING_STUDIO_MOMENTS = 9 as const;
/** Legacy Pack capacity retained for the private compatibility workflow. */
export const FOUNDING_STUDIO_PACKS = 3 as const;
export const FOUNDING_STUDIO_CREDITS =
  FOUNDING_STUDIO_MOMENTS * CREDITS_PER_VIDEO;

export function isPlanId(value: unknown): value is PlanId {
  return value === "free" || value === PAID_PLAN_ID;
}

export function isPaidPlanId(value: unknown): value is typeof PAID_PLAN_ID {
  return value === PAID_PLAN_ID;
}

export type Plan = {
  id: PlanId;
  name: string;
  priceMonthly: number; // USD
  credits: number;
  blurb: string;
  perks: string[];
  featured?: boolean;
  cta: string;
  watermark: boolean;
  /** Honest engine cap: Seedance ships 480p (free) / 720p (paid). */
  resolution: "480p" | "720p";
  commercial: boolean;
  priority: boolean;
  /** Stripe Price ID env key name (optional until wired) */
  stripePriceEnv?: string;
};

/**
 * Founding Studio is deliberately finite: nine directed Moments at the
 * current fixed 5s Fast contract. Public Checkout stays disabled until the
 * private delivery, billing, refund, and measured p95 cost gates pass.
 */
export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    credits: 0,
    blurb:
      "Explore labeled toy-video examples at no cost. Your upload is not processed on the public demo path.",
    perks: [
      "Labeled preview examples · 0 credits",
      "Explore the three Launch Pack formats",
      "Upload and configure before sign-in",
      "Your photo stays on your device in demo mode",
    ],
    cta: "Explore cached demos",
    watermark: true,
    resolution: "480p",
    commercial: false,
    priority: false,
  },
  {
    id: PAID_PLAN_ID,
    name: "Founding Studio",
    priceMonthly: 49,
    credits: FOUNDING_STUDIO_CREDITS,
    blurb:
      "For toy sellers turning owned product photos into directed launch Moments.",
    perks: [
      `${FOUNDING_STUDIO_MOMENTS} directed Moments / billing month`,
      "Fixed 5s Fast 720p private outputs",
      "Choose one visual direction per generation",
      "Private Library delivery and owner-only downloads",
      "Credits roll over while the subscription remains active",
      "Commercial use for rights-owned product photos",
    ],
    featured: true,
    cta: "Join Founding Studio when billing opens",
    watermark: false,
    resolution: "720p",
    commercial: true,
    priority: false,
    stripePriceEnv: "STRIPE_PRICE_FOUNDING_STUDIO",
  },
];

export function getPlan(id: PlanId | string | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function clipsFromCredits(credits: number): number {
  return Math.floor(credits / CREDITS_PER_VIDEO);
}
