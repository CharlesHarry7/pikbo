/**
 * US$49 Launch Pack order-intent contract — pre-payment only.
 *
 * Pure module (no path aliases) so Node smoke scripts can transpile it.
 * Never invents checkout, paid, accepted, production, delivered, or refund states.
 * Never persists contact details, images, notes, or prompts.
 */

import {
  SELLER_PACK_ITEMS,
  type SellerPackSlug,
} from "./sellerPackContract";

/** One-time service offer for one authorized toy SKU. */
export const LAUNCH_PACK_OFFER = {
  priceUsd: 49 as const,
  currency: "USD" as const,
  kind: "one_time" as const,
  scope: "one_authorized_toy_sku" as const,
  deliveryTargetHours: 24 as const,
  revisionsIncluded: 1 as const,
  /** Stripe / public ordering remain disabled. */
  paymentOpen: false as const,
  label: "US$49 Launch Pack",
  blurb:
    "One-time service for one authorized toy SKU: three launch-ready video drafts, 24-hour delivery target, one revision.",
} as const;

/**
 * Commercial deliverable labels mapped to the frozen Seller Pack trio.
 * Cached Lab examples must never be presented as the customer's SKU.
 */
export const LAUNCH_PACK_DELIVERABLES = [
  {
    key: "product_showcase" as const,
    commercialLabel: "Product showcase",
    /** Frozen Seller Pack slug — must stay "360-spin-showcase". */
    recipeSlug: "360-spin-showcase" as SellerPackSlug,
    contractLabel: SELLER_PACK_ITEMS[0].label,
    aspectRatio: SELLER_PACK_ITEMS[0].aspectRatio,
  },
  {
    key: "reveal_unboxing" as const,
    commercialLabel: "Reveal or unboxing-style draft",
    /** Frozen Seller Pack slug — must stay "blind-box-unboxing". */
    recipeSlug: "blind-box-unboxing" as SellerPackSlug,
    contractLabel: SELLER_PACK_ITEMS[1].label,
    aspectRatio: SELLER_PACK_ITEMS[1].aspectRatio,
  },
  {
    key: "social_hook" as const,
    commercialLabel: "Social Hook",
    /** Frozen Seller Pack slug — must stay "paparazzi-flash". */
    recipeSlug: "paparazzi-flash" as SellerPackSlug,
    contractLabel: SELLER_PACK_ITEMS[2].label,
    aspectRatio: SELLER_PACK_ITEMS[2].aspectRatio,
  },
] as const;

/** Compile-time-ish guard: commercial map stays aligned with the frozen trio. */
const _slugGuard: true =
  LAUNCH_PACK_DELIVERABLES[0].recipeSlug === SELLER_PACK_ITEMS[0].slug &&
  LAUNCH_PACK_DELIVERABLES[1].recipeSlug === SELLER_PACK_ITEMS[1].slug &&
  LAUNCH_PACK_DELIVERABLES[2].recipeSlug === SELLER_PACK_ITEMS[2].slug
    ? true
    : (false as never);
void _slugGuard;

export type LaunchPackDeliverable = (typeof LAUNCH_PACK_DELIVERABLES)[number];

/**
 * Honest pre-payment states only.
 * Forbidden without a real backend: paid | accepted | in_production |
 * delivered | refund | submitted | checkout.
 */
export type LaunchPackOrderIntentStatus =
  | "draft"
  | "ready_for_manual_review"
  | "payment_not_open";

export const LAUNCH_PACK_ORDER_INTENT_STATUSES = [
  "draft",
  "ready_for_manual_review",
  "payment_not_open",
] as const satisfies readonly LaunchPackOrderIntentStatus[];

export const LAUNCH_PACK_FORBIDDEN_STATUSES = [
  "paid",
  "accepted",
  "in_production",
  "delivered",
  "refund",
  "refunded",
  "submitted",
  "checkout",
  "processing_payment",
] as const;

/** Channel choices — enum keys only; free-text notes stay out of analytics. */
export const LAUNCH_PACK_CHANNELS = [
  { id: "etsy", label: "Etsy / marketplace listing" },
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram Reels" },
  { id: "shopify", label: "Shopify / own store" },
  { id: "drop", label: "Drop / restock announcement" },
  { id: "other", label: "Other sales channel" },
] as const;

export type LaunchPackChannelId = (typeof LAUNCH_PACK_CHANNELS)[number]["id"];

/** Style choices — product-facing enums only. */
export const LAUNCH_PACK_STYLES = [
  { id: "sales_fidelity", label: "Sales mode · product fidelity first" },
  { id: "cinematic_reveal", label: "Cinematic reveal" },
  { id: "social_energy", label: "Social energy / hook-first" },
  { id: "shelf_lifestyle", label: "Shelf / lifestyle setting" },
  { id: "other", label: "Other (describe in delivery notes)" },
] as const;

export type LaunchPackStyleId = (typeof LAUNCH_PACK_STYLES)[number]["id"];

/** Six required information groups for a complete order brief. */
export const LAUNCH_PACK_BRIEF_FIELDS = [
  "contactMethod",
  "localImage",
  "materialRights",
  "intendedChannel",
  "expectedStyle",
  "deliveryNotes",
] as const;

export type LaunchPackBriefField = (typeof LAUNCH_PACK_BRIEF_FIELDS)[number];

/**
 * In-memory brief shape. Sensitive values (contact, notes) must stay in
 * React state only unless the user explicitly copies or downloads.
 */
export type LaunchPackOrderBriefInput = {
  contactMethod: string;
  /** True when a local image File is selected in the UI (bytes never stored here). */
  hasLocalImage: boolean;
  materialRightsConfirmed: boolean;
  intendedChannel: LaunchPackChannelId | "";
  expectedStyle: LaunchPackStyleId | "";
  deliveryNotes: string;
};

export type LaunchPackOrderBriefEvaluation = {
  status: LaunchPackOrderIntentStatus;
  complete: boolean;
  missing: LaunchPackBriefField[];
  paymentOpen: false;
  /** Always false until an owner-confirmed intake address exists. */
  intakeConfigured: false;
  nextStepMessage: string;
};

/** No public intake endpoint is configured in this bounded slice. */
export const LAUNCH_PACK_INTAKE_ENDPOINT: null = null;

export function isLaunchPackIntakeConfigured(): false {
  return false;
}

export function isForbiddenLaunchPackStatus(status: string): boolean {
  return (LAUNCH_PACK_FORBIDDEN_STATUSES as readonly string[]).includes(status);
}

/**
 * Pure validation + honest status.
 * Complete brief → ready_for_manual_review (not paid / not submitted).
 * Incomplete → draft. Payment is never open in this module.
 */
export function evaluateLaunchPackOrderBrief(
  input: LaunchPackOrderBriefInput
): LaunchPackOrderBriefEvaluation {
  const missing: LaunchPackBriefField[] = [];

  const contact = input.contactMethod.trim();
  if (contact.length < 3) missing.push("contactMethod");
  if (!input.hasLocalImage) missing.push("localImage");
  if (!input.materialRightsConfirmed) missing.push("materialRights");
  if (!input.intendedChannel) missing.push("intendedChannel");
  if (!input.expectedStyle) missing.push("expectedStyle");
  // Notes may be short but must be present as an intentional field.
  if (input.deliveryNotes.trim().length < 1) missing.push("deliveryNotes");

  const complete = missing.length === 0;
  const status: LaunchPackOrderIntentStatus = complete
    ? "ready_for_manual_review"
    : "draft";

  return {
    status,
    complete,
    missing,
    paymentOpen: false,
    intakeConfigured: false,
    nextStepMessage: complete
      ? "Brief is ready for manual review. Payment is not open yet — no checkout, charge, or provider run will start. Copy or download your brief to share it with the Pikbo owner when invited; no owner intake endpoint is configured in this build."
      : "Complete every field below to prepare a manual-review brief. Payment stays closed until the owner opens ordering.",
  };
}

/** Commercial status shown next to primary action — always closed here. */
export function launchPackPaymentDisclosure(): {
  status: "payment_not_open";
  label: string;
  detail: string;
} {
  return {
    status: "payment_not_open",
    label: "Payment is not open yet",
    detail:
      "US$49 is the planned one-time price. Checkout, Stripe, and production ordering are not available in this build.",
  };
}

/**
 * Build a plain-text brief for user-controlled copy/download only.
 * Callers must not send this string to analytics, localStorage, or servers.
 */
export function formatLaunchPackBriefForExport(opts: {
  contactMethod: string;
  intendedChannel: LaunchPackChannelId | "";
  expectedStyle: LaunchPackStyleId | "";
  deliveryNotes: string;
  materialRightsConfirmed: boolean;
  hasLocalImage: boolean;
  /** Never include image bytes or data URLs — filename only if user-visible. */
  localImageName?: string | null;
  evaluatedAt?: string;
}): string {
  const channel =
    LAUNCH_PACK_CHANNELS.find((c) => c.id === opts.intendedChannel)?.label ||
    opts.intendedChannel ||
    "(not set)";
  const style =
    LAUNCH_PACK_STYLES.find((s) => s.id === opts.expectedStyle)?.label ||
    opts.expectedStyle ||
    "(not set)";
  const evaluation = evaluateLaunchPackOrderBrief({
    contactMethod: opts.contactMethod,
    hasLocalImage: opts.hasLocalImage,
    materialRightsConfirmed: opts.materialRightsConfirmed,
    intendedChannel: opts.intendedChannel,
    expectedStyle: opts.expectedStyle,
    deliveryNotes: opts.deliveryNotes,
  });
  const lines = [
    "Pikbo Launch Pack — order brief (user export)",
    `Offer: ${LAUNCH_PACK_OFFER.label} · one-time · one authorized toy SKU`,
    `Price: US$${LAUNCH_PACK_OFFER.priceUsd}`,
    `Delivery target: ${LAUNCH_PACK_OFFER.deliveryTargetHours} hours`,
    `Revisions included: ${LAUNCH_PACK_OFFER.revisionsIncluded}`,
    `Payment open: no`,
    `Brief status: ${evaluation.status}`,
    `Intake endpoint configured: no`,
    "",
    "Deliverables (fixed Seller Pack recipes — not a live order):",
    ...LAUNCH_PACK_DELIVERABLES.map(
      (d, i) =>
        `  ${i + 1}. ${d.commercialLabel} → ${d.contractLabel} (${d.recipeSlug}, ${d.aspectRatio})`
    ),
    "",
    "Order information:",
    `  Contact method: ${opts.contactMethod.trim() || "(not set)"}`,
    `  Local toy image selected: ${opts.hasLocalImage ? "yes" : "no"}`,
    opts.localImageName
      ? `  Local image label (device only): ${opts.localImageName}`
      : "  Local image label: (none)",
    `  Material rights confirmed: ${opts.materialRightsConfirmed ? "yes" : "no"}`,
    `  Intended channel: ${channel}`,
    `  Expected style: ${style}`,
    `  Delivery notes: ${opts.deliveryNotes.trim() || "(not set)"}`,
    "",
    "Honesty notes:",
    "  - This export does not submit an order, start payment, or run a provider.",
    "  - Cached Create previews are Lab prototypes, not this SKU.",
    "  - Image bytes are not embedded in this file.",
    `  - Exported at: ${opts.evaluatedAt || new Date().toISOString()}`,
  ];
  return lines.join("\n");
}

/** Non-sensitive analytics meta only — no contact, notes, image, URLs, tokens. */
export function launchPackOfferAnalyticsMeta(): Record<
  string,
  string | number | boolean
> {
  return {
    price_usd: LAUNCH_PACK_OFFER.priceUsd,
    payment_open: false,
    delivery_hours: LAUNCH_PACK_OFFER.deliveryTargetHours,
    revisions: LAUNCH_PACK_OFFER.revisionsIncluded,
    deliverable_count: LAUNCH_PACK_DELIVERABLES.length,
    offer_kind: LAUNCH_PACK_OFFER.kind,
  };
}

export function launchPackBriefAnalyticsMeta(
  evaluation: LaunchPackOrderBriefEvaluation
): Record<string, string | number | boolean> {
  return {
    price_usd: LAUNCH_PACK_OFFER.priceUsd,
    payment_open: false,
    brief_complete: evaluation.complete,
    brief_status: evaluation.status,
    missing_count: evaluation.missing.length,
    intake_configured: false,
  };
}
