/**
 * Creative Director Phase B2/B3 — Director Plan preflight (cost + fidelity).
 * Pure summary for "confirm before generate" — no provider calls.
 * Single Generate + Seller Pack / batch share the same DirectorPlan shape.
 */

import { CREDITS_PER_VIDEO } from "@/lib/pricing";
import {
  sellerPackQuote,
  sellerPackQuoteLabel,
  sellerPackShortfall,
  type SellerPackQuote,
} from "@/lib/sellerPackQuote";
import type { ToyIdentity } from "@/lib/toyIdentity";
import { viralName } from "@/lib/viralNames";

export type DirectorPlanInput = {
  hasImage: boolean;
  effect: string;
  effectName: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  durationSec: number;
  resolution: string;
  demoMode: boolean;
  isFree: boolean;
  trialDone: boolean;
  creditsLeft: number | null;
  clipsLeft: number | null;
  identity: ToyIdentity;
  ownsRights: boolean;
  labSample?: boolean;
  /** Commercial goal label if selected */
  jobLabel?: string | null;
};

export type DirectorPlanRow = {
  id: string;
  label: string;
  value: string;
  tone?: "ok" | "warn" | "muted";
};

export type DirectorPlan = {
  ready: boolean;
  title: string;
  modeLabel: string;
  costLabel: string;
  rows: DirectorPlanRow[];
  blockers: string[];
  canGenerate: boolean;
  creditsPerClip: number;
};

/**
 * Build a confirmable Director Plan from Create composer state.
 */
export function buildDirectorPlan(input: DirectorPlanInput): DirectorPlan {
  const credits = CREDITS_PER_VIDEO;
  const rows: DirectorPlanRow[] = [];
  const blockers: string[] = [];

  if (!input.hasImage) {
    blockers.push("Add a toy photo first");
  }
  if (!input.ownsRights && !input.demoMode) {
    blockers.push("Confirm photo ownership before live generate");
  }
  if (!input.demoMode && input.trialDone && input.isFree) {
    blockers.push("Free Mini trial exhausted — Lab demos stay free");
  }
  if (
    !input.demoMode &&
    input.creditsLeft !== null &&
    input.creditsLeft < credits &&
    !(input.trialDone && input.isFree)
  ) {
    // When trial done we already blocked; otherwise credit gate
    if (input.creditsLeft < credits) {
      blockers.push(`Need ${credits} credits (have ${input.creditsLeft})`);
    }
  }

  if (input.jobLabel) {
    rows.push({
      id: "goal",
      label: "Goal",
      value: input.jobLabel,
      tone: "ok",
    });
  }

  rows.push({
    id: "recipe",
    label: "Recipe",
    value: viralName(input.effect, input.effectName),
    tone: "ok",
  });

  rows.push({
    id: "format",
    label: "Format",
    value: input.demoMode
      ? "Lab demo · 0 credits · not your photo motion"
      : input.isFree
        ? `Mini · ${input.durationSec}s · ${input.resolution} · ${input.aspectRatio} · on-player mark`
        : `${input.durationSec}s · ${input.resolution} · ${input.aspectRatio}`,
    tone: input.demoMode ? "muted" : "ok",
  });

  rows.push({
    id: "fidelity",
    label: "Mode",
    value:
      input.identity.mode === "story"
        ? "Story · expressive motion, toy stays recognizable"
        : "Sales · fidelity first (paint / logo / sculpt)",
    tone: "ok",
  });

  if (input.identity.sku || input.identity.preserve) {
    rows.push({
      id: "bible",
      label: "Bible",
      value: [
        input.identity.sku || null,
        input.identity.preserve ? `preserve: ${input.identity.preserve}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      tone: "ok",
    });
  } else {
    rows.push({
      id: "bible",
      label: "Bible",
      value: "Optional — add SKU / preserve in Asset Brief",
      tone: "muted",
    });
  }

  if (input.labSample) {
    rows.push({
      id: "source",
      label: "Source",
      value: "Official Lab still · not a customer SKU",
      tone: "warn",
    });
  }

  let costLabel: string;
  if (input.demoMode) {
    costLabel = "0 credits · cached Lab demo";
  } else if (input.trialDone && input.isFree) {
    costLabel = "Live blocked · trial used";
  } else {
    const left =
      input.clipsLeft !== null
        ? ` · ~${input.clipsLeft} live left`
        : input.creditsLeft !== null
          ? ` · ${input.creditsLeft} cr left`
          : "";
    costLabel = `${credits} credits this clip${left} · failed live refunds when confirmed`;
  }

  const modeLabel = input.demoMode
    ? "Lab preview"
    : input.isFree
      ? "Live Mini trial"
      : "Live generation";

  const ready = input.hasImage;
  // Generate button still enforces rights; plan.canGenerate is advisory for UI emphasis
  const canGenerate =
    ready &&
    blockers.length === 0 &&
    (input.demoMode || input.ownsRights);

  return {
    ready,
    title: "Director Plan · confirm cost",
    modeLabel,
    costLabel,
    rows,
    blockers,
    canGenerate,
    creditsPerClip: credits,
  };
}

/** Fixed Seller Pack commercial children (must match BatchStudio SELLER_PACK_ITEMS). */
export const SELLER_PACK_PLAN_CHILDREN = [
  {
    key: "listing_spin",
    label: "Listing Spin",
    channel: "Marketplace gallery",
    aspectRatio: "1:1" as const,
  },
  {
    key: "box_reveal",
    label: "Box Reveal",
    channel: "Drop / restock",
    aspectRatio: "9:16" as const,
  },
  {
    key: "social_hook",
    label: "Social Hook",
    channel: "TikTok / Reels",
    aspectRatio: "9:16" as const,
  },
] as const;

export type SellerPackDirectorPlanInput = {
  hasImage: boolean;
  demoMode: boolean;
  isFree: boolean;
  trialDone: boolean;
  creditsLeft: number | null;
  clipsLeft: number | null;
  ownsRights: boolean;
  durationSec: number;
  resolution: string;
  /** Lab sample still — not customer SKU */
  labSample?: boolean;
  /** Optional character bible from Asset Brief */
  identity?: ToyIdentity | null;
};

/**
 * Director Plan for Seller Pack (Launch Pack) — 3 children, total quote.
 */
export function buildSellerPackDirectorPlan(
  input: SellerPackDirectorPlanInput
): DirectorPlan {
  const quote: SellerPackQuote = sellerPackQuote({
    demo: input.demoMode,
    childCount: SELLER_PACK_PLAN_CHILDREN.length,
  });
  const rows: DirectorPlanRow[] = [];
  const blockers: string[] = [];

  if (!input.hasImage) {
    blockers.push("Add a toy photo first");
  }
  if (!input.ownsRights && !input.demoMode) {
    blockers.push("Confirm photo ownership before live pack");
  }
  if (!input.demoMode && input.trialDone && input.isFree) {
    blockers.push(
      "Free Mini covers one 10-cr job — full Launch Pack needs more credits"
    );
  }
  if (
    !input.demoMode &&
    input.creditsLeft !== null &&
    input.creditsLeft < quote.totalCredits
  ) {
    const short = sellerPackShortfall(quote, input.creditsLeft);
    blockers.push(
      `Need ${quote.totalCredits} credits (short ${short} · have ${input.creditsLeft})`
    );
  }

  rows.push({
    id: "goal",
    label: "Goal",
    value: "Seller Pack · Launch (listing + reveal + hook)",
    tone: "ok",
  });

  rows.push({
    id: "children",
    label: "Clips",
    value: SELLER_PACK_PLAN_CHILDREN.map(
      (c) => `${c.label} ${c.aspectRatio}`
    ).join(" · "),
    tone: "ok",
  });

  rows.push({
    id: "format",
    label: "Format",
    value: input.demoMode
      ? "3 Lab demos · 0 credits · not your photo motion"
      : input.isFree
        ? `Mini · ${input.durationSec}s · ${input.resolution} · on-player mark per child`
        : `${input.durationSec}s · ${input.resolution} · sequential Seedance`,
    tone: input.demoMode ? "muted" : "ok",
  });

  rows.push({
    id: "fidelity",
    label: "Mode",
    value: "Sales · same still · fidelity first across three formats",
    tone: "ok",
  });

  rows.push({
    id: "quote",
    label: "Quote",
    value: sellerPackQuoteLabel(quote),
    tone: input.demoMode ? "muted" : "ok",
  });

  if (input.identity?.sku || input.identity?.preserve) {
    rows.push({
      id: "bible",
      label: "Bible",
      value: [
        input.identity.sku || null,
        input.identity.preserve
          ? `preserve: ${input.identity.preserve}`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
      tone: "ok",
    });
  }

  if (input.labSample) {
    rows.push({
      id: "source",
      label: "Source",
      value: "Official Lab still · not a customer SKU",
      tone: "warn",
    });
  }

  let costLabel: string;
  if (input.demoMode) {
    costLabel = "0 credits · 3 cached Lab demos";
  } else if (blockers.some((b) => b.includes("Need") || b.includes("Free Mini"))) {
    costLabel = blockers[0];
  } else {
    const left =
      input.clipsLeft !== null
        ? ` · ~${input.clipsLeft} single live left`
        : input.creditsLeft !== null
          ? ` · ${input.creditsLeft} cr left`
          : "";
    costLabel = `${quote.totalCredits} credits pack total (3×${quote.creditsPerChild})${left} · failed child refunds ${quote.creditsPerChild}`;
  }

  const modeLabel = input.demoMode
    ? "Lab pack preview"
    : input.isFree
      ? "Live Mini · pack quote"
      : "Live Seller Pack";

  const ready = input.hasImage;
  const canGenerate =
    ready &&
    blockers.length === 0 &&
    (input.demoMode || input.ownsRights);

  return {
    ready,
    title: "Director Plan · Launch Pack",
    modeLabel,
    costLabel,
    rows,
    blockers,
    canGenerate,
    creditsPerClip: quote.creditsPerChild,
  };
}
