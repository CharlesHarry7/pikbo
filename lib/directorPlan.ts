/**
 * Creative Director Phase B2 — Director Plan preflight (cost + fidelity).
 * Pure summary for "confirm before generate" — no provider calls.
 */

import { CREDITS_PER_VIDEO } from "@/lib/pricing";
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
    value: "Sales · fidelity first (paint / logo / sculpt)",
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
