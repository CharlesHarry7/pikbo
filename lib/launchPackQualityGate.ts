/**
 * Manual Launch Pack quality gate.
 *
 * This module is deliberately pure: no environment reads, clock, network,
 * database, Storage, Provider, credits, retry, or UI behavior. A durable job
 * may be technically `succeeded` while its manual seller-quality decision is
 * `retry` or `hard_failed`; those state machines must never be conflated.
 */

import {
  SELLER_PACK_ITEMS,
  type SellerPackChildKey,
  type SellerPackItem,
  type SellerPackSlug,
} from "@/lib/sellerPackContract";

export const LAUNCH_PACK_QUALITY_SCHEMA_VERSION = 1 as const;

export const LAUNCH_PACK_QUALITY_DECISIONS = [
  "pass",
  "retry",
  "hard_failed",
] as const;

export type LaunchPackChildQualityDecision =
  (typeof LAUNCH_PACK_QUALITY_DECISIONS)[number];

export type LaunchPackQualityStatus =
  | "pending"
  | "review_required"
  | "pass"
  | "retry"
  | "hard_failed";

export const LAUNCH_PACK_REFERENCE_SURFACES = [
  "front",
  "side",
  "back",
  "packaging",
  "physical_product",
] as const;

export type LaunchPackReferenceSurface =
  (typeof LAUNCH_PACK_REFERENCE_SURFACES)[number];

export const LAUNCH_PACK_QUALITY_REASON_CODES = [
  "sku_unrecognizable",
  "wrong_sku_variant_or_colorway",
  "silhouette_or_proportion_drift",
  "face_paint_or_marking_drift",
  "accessory_limb_or_base_drift",
  "material_drift",
  "invented_logo_text_or_packaging",
  "unverifiable_commercial_surface",
  "identity_break_during_motion",
  "cross_clip_identity_mismatch",
  "cross_clip_identity_unverifiable",
  "technical_delivery_failure",
  "incorrect_format_contract",
  "minor_identity_artifact",
  "product_obscured",
  "unsafe_crop",
  "listing_motion_not_informative",
  "listing_background_hides_detail",
  "reveal_action_incomplete",
  "reveal_clean_hold_missing",
  "social_first_second_unreadable",
  "social_effect_overpowers_product",
  "social_clean_hold_missing",
  "publish_as_is_rejected",
] as const;

export type LaunchPackQualityReasonCode =
  (typeof LAUNCH_PACK_QUALITY_REASON_CODES)[number];

export type LaunchPackReferenceCoverage = {
  physicalSkuAvailable: boolean;
  surfaces: LaunchPackReferenceSurface[];
};

export type LaunchPackIdentityReview = {
  toyRecognized: boolean;
  sameSkuVariantColorway: "match" | "wrong" | "unverifiable";
  silhouetteAndProportions:
    | "stable"
    | "minor_artifact"
    | "wrong"
    | "unverifiable";
  facePaintAndMarkings:
    | "stable"
    | "minor_artifact"
    | "wrong"
    | "not_visible"
    | "unverifiable";
  accessoriesLimbsAndBase:
    | "stable"
    | "minor_artifact"
    | "wrong"
    | "not_applicable"
    | "unverifiable";
  material:
    | "stable"
    | "minor_artifact"
    | "wrong"
    | "unverifiable";
  logoPackagingText: "truthful" | "not_shown" | "wrong" | "unverifiable";
  motionContinuity: "stable" | "minor_artifact" | "identity_break";
  unseenSurfaces: "verified" | "not_shown" | "unverifiable";
};

export type LaunchPackTechnicalReview = {
  privateResultAvailable: true;
  playable: boolean;
  aspectRatio: "1:1" | "9:16";
  durationSec: number;
  resolution: "720p";
  blackFrames: "none" | "present";
  frozenFrames: "none" | "present";
  truncated: boolean;
};

export type ListingSpinReview = {
  kind: "listing_spin";
  subjectFullyInFrame: boolean;
  rotationSupportsInspection: boolean;
  backgroundKeepsDetailsVisible: boolean;
  safeAreaClear: boolean;
  productPageReady: boolean;
};

export type BlindBoxRevealReview = {
  kind: "blind_box_reveal";
  revealActionCompletes: boolean;
  cleanProductHoldSec: number;
  productUnobscuredAtHold: boolean;
  packagingTruth: "match" | "not_shown" | "wrong" | "unverifiable";
  safeAreaClear: boolean;
  dropReady: boolean;
};

export type SocialFlashReview = {
  kind: "social_flash";
  recognizableWithinFirstSecond: boolean;
  toyRemainsHero: boolean;
  cleanProductHold: boolean;
  effectsSupportProduct: boolean;
  safeAreaClear: boolean;
  shortFormReady: boolean;
};

export type LaunchPackFormatReview =
  | ListingSpinReview
  | BlindBoxRevealReview
  | SocialFlashReview;

export type LaunchPackQualityDefect = {
  reasonCode: LaunchPackQualityReasonCode;
  timestampSec: number;
  note?: string;
};

export type LaunchPackRecordedDecision = {
  manualDecision: LaunchPackChildQualityDecision;
  reasonCodes: LaunchPackQualityReasonCode[];
  targetedRetryInstruction?: string;
};

export type LaunchPackChildQualityReview = {
  packJobId: string;
  attemptKey: string;
  childKey: SellerPackChildKey;
  effectSlug: SellerPackSlug;
  aspectRatio: SellerPackItem["aspectRatio"];
  durationSec: 5;
  inputSha256: string;
  outputSha256: string;
  fullClipWatched: true;
  technical: LaunchPackTechnicalReview;
  identity: LaunchPackIdentityReview;
  formatReview: LaunchPackFormatReview;
  publishExactFileWithoutEditing: boolean;
  targetChannel:
    | "marketplace_listing"
    | "launch_social"
    | "short_form_social";
  defects: LaunchPackQualityDefect[];
  recordedDecision: LaunchPackRecordedDecision;
};

export type LaunchPackQualityReview = {
  schemaVersion: typeof LAUNCH_PACK_QUALITY_SCHEMA_VERSION;
  reviewId: string;
  packRunId: string;
  inputAssetId: string;
  inputSha256: string;
  skuLabel: string;
  rightsConfirmed: true;
  referenceCoverage: LaunchPackReferenceCoverage;
  crossClipIdentity: "match" | "wrong" | "unverifiable";
  crossClipDefects: LaunchPackQualityDefect[];
  reviewer: {
    id: string;
    role: "seller" | "internal";
  };
  reviewedAt: string;
  children: LaunchPackChildQualityReview[];
};

export type LaunchPackChildQualityEvaluation = {
  packJobId: string;
  childKey: SellerPackChildKey;
  decision: LaunchPackChildQualityDecision;
  reasonCodes: LaunchPackQualityReasonCode[];
};

export type LaunchPackQualityEvaluation = {
  valid: boolean;
  status: LaunchPackQualityStatus;
  passedChildCount: number;
  hasPassingSiblings: boolean;
  errors: string[];
  packReasonCodes: LaunchPackQualityReasonCode[];
  children: LaunchPackChildQualityEvaluation[];
};

export type LaunchPackQualityReplayDecision =
  | { kind: "idempotent"; identity: string }
  | { kind: "conflict"; identity: string }
  | { kind: "different_identity" }
  | { kind: "invalid"; errors: string[] };

// Canonical lowercase avoids case-variant duplicate and replay identities.
const SHA256 = /^[a-f0-9]{64}$/;
const ISO_WITH_TIMEZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = []
): boolean {
  const allowed = new Set([...required, ...optional]);
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => allowed.has(key))
  );
}

function hasBoundedText(value: unknown, min = 1, max = 256): value is string {
  return (
    typeof value === "string" &&
    value.trim() === value &&
    value.length >= min &&
    value.length <= max
  );
}

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[]
): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function isIsoDateTime(value: unknown): value is string {
  return (
    typeof value === "string" &&
    ISO_WITH_TIMEZONE.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function pushUnique<T>(target: T[], value: T) {
  if (!target.includes(value)) target.push(value);
}

function sameReasonSet(
  left: readonly LaunchPackQualityReasonCode[],
  right: readonly LaunchPackQualityReasonCode[]
): boolean {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    new Set(right).size === right.length &&
    left.every((reason) => right.includes(reason))
  );
}

function validateReferenceCoverage(
  value: unknown,
  errors: string[]
): value is LaunchPackReferenceCoverage {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["physicalSkuAvailable", "surfaces"])
  ) {
    errors.push("referenceCoverage must contain only physicalSkuAvailable and surfaces");
    return false;
  }
  if (typeof value.physicalSkuAvailable !== "boolean") {
    errors.push("referenceCoverage.physicalSkuAvailable must be boolean");
  }
  if (
    !Array.isArray(value.surfaces) ||
    value.surfaces.length === 0 ||
    !value.surfaces.every((surface) =>
      isOneOf(surface, LAUNCH_PACK_REFERENCE_SURFACES)
    ) ||
    new Set(value.surfaces).size !== value.surfaces.length
  ) {
    errors.push("referenceCoverage.surfaces must be unique known reference surfaces");
  }
  return errors.length === 0;
}

function validateTechnical(
  value: unknown,
  path: string,
  errors: string[]
): value is LaunchPackTechnicalReview {
  const keys = [
    "privateResultAvailable",
    "playable",
    "aspectRatio",
    "durationSec",
    "resolution",
    "blackFrames",
    "frozenFrames",
    "truncated",
  ];
  if (!isRecord(value) || !hasOnlyKeys(value, keys)) {
    errors.push(`${path}.technical has missing or unknown fields`);
    return false;
  }
  if (value.privateResultAvailable !== true) {
    errors.push(`${path}.technical.privateResultAvailable must be true`);
  }
  if (typeof value.playable !== "boolean") {
    errors.push(`${path}.technical.playable must be boolean`);
  }
  if (!isOneOf(value.aspectRatio, ["1:1", "9:16"] as const)) {
    errors.push(`${path}.technical.aspectRatio is invalid`);
  }
  if (typeof value.durationSec !== "number" || !Number.isFinite(value.durationSec)) {
    errors.push(`${path}.technical.durationSec must be finite`);
  }
  if (value.resolution !== "720p") {
    errors.push(`${path}.technical.resolution must be 720p`);
  }
  if (!isOneOf(value.blackFrames, ["none", "present"] as const)) {
    errors.push(`${path}.technical.blackFrames is invalid`);
  }
  if (!isOneOf(value.frozenFrames, ["none", "present"] as const)) {
    errors.push(`${path}.technical.frozenFrames is invalid`);
  }
  if (typeof value.truncated !== "boolean") {
    errors.push(`${path}.technical.truncated must be boolean`);
  }
  return true;
}

function validateIdentity(
  value: unknown,
  path: string,
  errors: string[]
): value is LaunchPackIdentityReview {
  const keys = [
    "toyRecognized",
    "sameSkuVariantColorway",
    "silhouetteAndProportions",
    "facePaintAndMarkings",
    "accessoriesLimbsAndBase",
    "material",
    "logoPackagingText",
    "motionContinuity",
    "unseenSurfaces",
  ];
  if (!isRecord(value) || !hasOnlyKeys(value, keys)) {
    errors.push(`${path}.identity has missing or unknown fields`);
    return false;
  }
  const checks: Array<[unknown, readonly string[], string]> = [
    [value.sameSkuVariantColorway, ["match", "wrong", "unverifiable"], "sameSkuVariantColorway"],
    [value.silhouetteAndProportions, ["stable", "minor_artifact", "wrong", "unverifiable"], "silhouetteAndProportions"],
    [value.facePaintAndMarkings, ["stable", "minor_artifact", "wrong", "not_visible", "unverifiable"], "facePaintAndMarkings"],
    [value.accessoriesLimbsAndBase, ["stable", "minor_artifact", "wrong", "not_applicable", "unverifiable"], "accessoriesLimbsAndBase"],
    [value.material, ["stable", "minor_artifact", "wrong", "unverifiable"], "material"],
    [value.logoPackagingText, ["truthful", "not_shown", "wrong", "unverifiable"], "logoPackagingText"],
    [value.motionContinuity, ["stable", "minor_artifact", "identity_break"], "motionContinuity"],
    [value.unseenSurfaces, ["verified", "not_shown", "unverifiable"], "unseenSurfaces"],
  ];
  if (typeof value.toyRecognized !== "boolean") {
    errors.push(`${path}.identity.toyRecognized must be boolean`);
  }
  for (const [candidate, allowed, key] of checks) {
    if (typeof candidate !== "string" || !allowed.includes(candidate)) {
      errors.push(`${path}.identity.${key} is invalid`);
    }
  }
  return true;
}

function validateFormatReview(
  value: unknown,
  expected: SellerPackItem,
  path: string,
  errors: string[]
): value is LaunchPackFormatReview {
  if (!isRecord(value) || value.kind !== expected.key) {
    errors.push(`${path}.formatReview.kind must match ${expected.key}`);
    return false;
  }
  const booleanKeys: string[] = [];
  if (expected.key === "listing_spin") {
    if (
      !hasOnlyKeys(value, [
        "kind",
        "subjectFullyInFrame",
        "rotationSupportsInspection",
        "backgroundKeepsDetailsVisible",
        "safeAreaClear",
        "productPageReady",
      ])
    ) {
      errors.push(`${path}.formatReview listing fields are incomplete or unknown`);
      return false;
    }
    booleanKeys.push(
      "subjectFullyInFrame",
      "rotationSupportsInspection",
      "backgroundKeepsDetailsVisible",
      "safeAreaClear",
      "productPageReady"
    );
  } else if (expected.key === "blind_box_reveal") {
    if (
      !hasOnlyKeys(value, [
        "kind",
        "revealActionCompletes",
        "cleanProductHoldSec",
        "productUnobscuredAtHold",
        "packagingTruth",
        "safeAreaClear",
        "dropReady",
      ])
    ) {
      errors.push(`${path}.formatReview reveal fields are incomplete or unknown`);
      return false;
    }
    booleanKeys.push(
      "revealActionCompletes",
      "productUnobscuredAtHold",
      "safeAreaClear",
      "dropReady"
    );
    if (
      typeof value.cleanProductHoldSec !== "number" ||
      !Number.isFinite(value.cleanProductHoldSec) ||
      value.cleanProductHoldSec < 0 ||
      value.cleanProductHoldSec > expected.durationSec
    ) {
      errors.push(`${path}.formatReview.cleanProductHoldSec is invalid`);
    }
    if (
      !isOneOf(value.packagingTruth, [
        "match",
        "not_shown",
        "wrong",
        "unverifiable",
      ] as const)
    ) {
      errors.push(`${path}.formatReview.packagingTruth is invalid`);
    }
  } else {
    if (
      !hasOnlyKeys(value, [
        "kind",
        "recognizableWithinFirstSecond",
        "toyRemainsHero",
        "cleanProductHold",
        "effectsSupportProduct",
        "safeAreaClear",
        "shortFormReady",
      ])
    ) {
      errors.push(`${path}.formatReview social fields are incomplete or unknown`);
      return false;
    }
    booleanKeys.push(
      "recognizableWithinFirstSecond",
      "toyRemainsHero",
      "cleanProductHold",
      "effectsSupportProduct",
      "safeAreaClear",
      "shortFormReady"
    );
  }
  for (const key of booleanKeys) {
    if (typeof value[key] !== "boolean") {
      errors.push(`${path}.formatReview.${key} must be boolean`);
    }
  }
  return true;
}

function validateDefects(
  value: unknown,
  durationSec: number,
  path: string,
  errors: string[]
): value is LaunchPackQualityDefect[] {
  if (!Array.isArray(value)) {
    errors.push(`${path}.defects must be an array`);
    return false;
  }
  const seen = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const defect = value[index];
    const defectPath = `${path}.defects[${index}]`;
    if (
      !isRecord(defect) ||
      !hasOnlyKeys(defect, ["reasonCode", "timestampSec"], ["note"])
    ) {
      errors.push(`${defectPath} has missing or unknown fields`);
      continue;
    }
    if (!isOneOf(defect.reasonCode, LAUNCH_PACK_QUALITY_REASON_CODES)) {
      errors.push(`${defectPath}.reasonCode is invalid`);
    } else if (seen.has(defect.reasonCode)) {
      errors.push(`${path}.defects cannot duplicate reasonCode ${defect.reasonCode}`);
    } else {
      seen.add(defect.reasonCode);
    }
    if (
      typeof defect.timestampSec !== "number" ||
      !Number.isFinite(defect.timestampSec) ||
      defect.timestampSec < 0 ||
      defect.timestampSec > durationSec
    ) {
      errors.push(`${defectPath}.timestampSec must fall inside the clip`);
    }
    if (
      defect.note !== undefined &&
      !hasBoundedText(defect.note, 1, 300)
    ) {
      errors.push(`${defectPath}.note must be 1-300 trimmed characters`);
    }
  }
  return true;
}

function validateRecordedDecision(
  value: unknown,
  path: string,
  errors: string[]
): value is LaunchPackRecordedDecision {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(
      value,
      ["manualDecision", "reasonCodes"],
      ["targetedRetryInstruction"]
    )
  ) {
    errors.push(`${path}.recordedDecision has missing or unknown fields`);
    return false;
  }
  if (!isOneOf(value.manualDecision, LAUNCH_PACK_QUALITY_DECISIONS)) {
    errors.push(`${path}.recordedDecision.manualDecision is invalid`);
  }
  if (
    !Array.isArray(value.reasonCodes) ||
    !value.reasonCodes.every((reason) =>
      isOneOf(reason, LAUNCH_PACK_QUALITY_REASON_CODES)
    ) ||
    new Set(value.reasonCodes).size !== value.reasonCodes.length
  ) {
    errors.push(`${path}.recordedDecision.reasonCodes must be unique known reasons`);
  }
  if (
    value.targetedRetryInstruction !== undefined &&
    !hasBoundedText(value.targetedRetryInstruction, 1, 500)
  ) {
    errors.push(`${path}.recordedDecision.targetedRetryInstruction is invalid`);
  }
  return true;
}

function deriveChildDecision(
  review: LaunchPackQualityReview,
  child: LaunchPackChildQualityReview,
  expected: SellerPackItem
): LaunchPackChildQualityEvaluation {
  const hard: LaunchPackQualityReasonCode[] = [];
  const retry: LaunchPackQualityReasonCode[] = [];
  const identity = child.identity;

  if (!identity.toyRecognized) pushUnique(hard, "sku_unrecognizable");
  if (identity.sameSkuVariantColorway !== "match") {
    pushUnique(hard, "wrong_sku_variant_or_colorway");
  }
  if (["wrong", "unverifiable"].includes(identity.silhouetteAndProportions)) {
    pushUnique(hard, "silhouette_or_proportion_drift");
  } else if (identity.silhouetteAndProportions === "minor_artifact") {
    pushUnique(retry, "minor_identity_artifact");
  }
  if (["wrong", "unverifiable"].includes(identity.facePaintAndMarkings)) {
    pushUnique(hard, "face_paint_or_marking_drift");
  } else if (identity.facePaintAndMarkings === "minor_artifact") {
    pushUnique(retry, "minor_identity_artifact");
  } else if (identity.facePaintAndMarkings === "not_visible") {
    pushUnique(retry, "product_obscured");
  }
  if (["wrong", "unverifiable"].includes(identity.accessoriesLimbsAndBase)) {
    pushUnique(hard, "accessory_limb_or_base_drift");
  } else if (identity.accessoriesLimbsAndBase === "minor_artifact") {
    pushUnique(retry, "minor_identity_artifact");
  }
  if (["wrong", "unverifiable"].includes(identity.material)) {
    pushUnique(hard, "material_drift");
  } else if (identity.material === "minor_artifact") {
    pushUnique(retry, "minor_identity_artifact");
  }
  if (identity.logoPackagingText === "wrong") {
    pushUnique(hard, "invented_logo_text_or_packaging");
  } else if (identity.logoPackagingText === "unverifiable") {
    pushUnique(hard, "unverifiable_commercial_surface");
  }
  if (identity.motionContinuity === "identity_break") {
    pushUnique(hard, "identity_break_during_motion");
  } else if (identity.motionContinuity === "minor_artifact") {
    pushUnique(retry, "minor_identity_artifact");
  }
  if (identity.unseenSurfaces === "unverifiable") {
    pushUnique(hard, "unverifiable_commercial_surface");
  }

  const technical = child.technical;
  if (
    !technical.playable ||
    technical.blackFrames === "present" ||
    technical.frozenFrames === "present" ||
    technical.truncated
  ) {
    pushUnique(retry, "technical_delivery_failure");
  }
  if (
    technical.aspectRatio !== expected.aspectRatio ||
    Math.abs(technical.durationSec - expected.durationSec) > 0.25 ||
    technical.resolution !== "720p"
  ) {
    pushUnique(retry, "incorrect_format_contract");
  }

  if (expected.key === "listing_spin") {
    const format = child.formatReview as ListingSpinReview;
    const surfaces = new Set(review.referenceCoverage.surfaces);
    const fullProductVerifiable =
      review.referenceCoverage.physicalSkuAvailable ||
      surfaces.has("physical_product") ||
      (surfaces.has("front") && surfaces.has("side") && surfaces.has("back"));
    if (format.rotationSupportsInspection && !fullProductVerifiable) {
      pushUnique(hard, "unverifiable_commercial_surface");
    }
    if (
      format.rotationSupportsInspection &&
      identity.unseenSurfaces === "not_shown"
    ) {
      pushUnique(retry, "listing_motion_not_informative");
    }
    if (!format.subjectFullyInFrame || !format.safeAreaClear) {
      pushUnique(retry, "unsafe_crop");
    }
    if (!format.rotationSupportsInspection) {
      pushUnique(retry, "listing_motion_not_informative");
    }
    if (!format.backgroundKeepsDetailsVisible) {
      pushUnique(retry, "listing_background_hides_detail");
    }
    if (!format.productPageReady) {
      pushUnique(retry, "publish_as_is_rejected");
    }
  } else if (expected.key === "blind_box_reveal") {
    const format = child.formatReview as BlindBoxRevealReview;
    const hasPackagingReference =
      review.referenceCoverage.physicalSkuAvailable ||
      review.referenceCoverage.surfaces.includes("packaging");
    if (format.packagingTruth === "wrong") {
      pushUnique(hard, "invented_logo_text_or_packaging");
    } else if (
      format.packagingTruth === "unverifiable" ||
      (!hasPackagingReference && format.packagingTruth !== "not_shown")
    ) {
      pushUnique(hard, "unverifiable_commercial_surface");
    }
    if (!format.revealActionCompletes) {
      pushUnique(retry, "reveal_action_incomplete");
    }
    if (format.cleanProductHoldSec < 1 || !format.productUnobscuredAtHold) {
      pushUnique(retry, "reveal_clean_hold_missing");
    }
    if (!format.safeAreaClear) pushUnique(retry, "unsafe_crop");
    if (!format.dropReady) pushUnique(retry, "publish_as_is_rejected");
  } else {
    const format = child.formatReview as SocialFlashReview;
    if (!format.recognizableWithinFirstSecond) {
      pushUnique(retry, "social_first_second_unreadable");
    }
    if (!format.toyRemainsHero || !format.effectsSupportProduct) {
      pushUnique(retry, "social_effect_overpowers_product");
    }
    if (!format.cleanProductHold) {
      pushUnique(retry, "social_clean_hold_missing");
    }
    if (!format.safeAreaClear) pushUnique(retry, "unsafe_crop");
    if (!format.shortFormReady) {
      pushUnique(retry, "publish_as_is_rejected");
    }
  }

  if (!child.publishExactFileWithoutEditing) {
    pushUnique(retry, "publish_as_is_rejected");
  }

  const reasonCodes = hard.length > 0 ? hard : retry;
  return {
    packJobId: child.packJobId,
    childKey: child.childKey,
    decision: hard.length > 0 ? "hard_failed" : retry.length > 0 ? "retry" : "pass",
    reasonCodes,
  };
}

function validateChild(
  value: unknown,
  expected: SellerPackItem,
  index: number,
  inputSha256: string,
  errors: string[]
): value is LaunchPackChildQualityReview {
  const path = `children[${index}]`;
  const required = [
    "packJobId",
    "attemptKey",
    "childKey",
    "effectSlug",
    "aspectRatio",
    "durationSec",
    "inputSha256",
    "outputSha256",
    "fullClipWatched",
    "technical",
    "identity",
    "formatReview",
    "publishExactFileWithoutEditing",
    "targetChannel",
    "defects",
    "recordedDecision",
  ];
  if (!isRecord(value) || !hasOnlyKeys(value, required)) {
    errors.push(`${path} has missing or unknown fields`);
    return false;
  }
  if (!hasBoundedText(value.packJobId, 8, 128)) {
    errors.push(`${path}.packJobId is invalid`);
  }
  if (!hasBoundedText(value.attemptKey, 8, 128)) {
    errors.push(`${path}.attemptKey is invalid`);
  }
  if (
    value.childKey !== expected.key ||
    value.effectSlug !== expected.slug ||
    value.aspectRatio !== expected.aspectRatio ||
    value.durationSec !== expected.durationSec
  ) {
    errors.push(`${path} must match the frozen ${expected.key} contract`);
  }
  if (value.inputSha256 !== inputSha256 || !SHA256.test(String(value.inputSha256))) {
    errors.push(`${path}.inputSha256 must match the Pack input hash`);
  }
  if (typeof value.outputSha256 !== "string" || !SHA256.test(value.outputSha256)) {
    errors.push(`${path}.outputSha256 must be a SHA-256 digest`);
  }
  if (value.fullClipWatched !== true) {
    errors.push(`${path}.fullClipWatched must be true`);
  }
  if (typeof value.publishExactFileWithoutEditing !== "boolean") {
    errors.push(`${path}.publishExactFileWithoutEditing must be boolean`);
  }
  const expectedChannel =
    expected.key === "listing_spin"
      ? "marketplace_listing"
      : expected.key === "blind_box_reveal"
        ? "launch_social"
        : "short_form_social";
  if (value.targetChannel !== expectedChannel) {
    errors.push(`${path}.targetChannel must be ${expectedChannel}`);
  }
  validateTechnical(value.technical, path, errors);
  validateIdentity(value.identity, path, errors);
  validateFormatReview(value.formatReview, expected, path, errors);
  validateDefects(value.defects, expected.durationSec, path, errors);
  validateRecordedDecision(value.recordedDecision, path, errors);
  return true;
}

export function evaluateLaunchPackQualityReview(
  value: unknown
): LaunchPackQualityEvaluation {
  if (value == null) {
    return {
      valid: false,
      status: "pending",
      passedChildCount: 0,
      hasPassingSiblings: false,
      errors: ["quality review is missing"],
      packReasonCodes: [],
      children: [],
    };
  }
  const errors: string[] = [];
  const required = [
    "schemaVersion",
    "reviewId",
    "packRunId",
    "inputAssetId",
    "inputSha256",
    "skuLabel",
    "rightsConfirmed",
    "referenceCoverage",
    "crossClipIdentity",
    "crossClipDefects",
    "reviewer",
    "reviewedAt",
    "children",
  ];
  if (!isRecord(value) || !hasOnlyKeys(value, required)) {
    return {
      valid: false,
      status: "review_required",
      passedChildCount: 0,
      hasPassingSiblings: false,
      errors: ["quality review has missing or unknown root fields"],
      packReasonCodes: [],
      children: [],
    };
  }
  if (value.schemaVersion !== LAUNCH_PACK_QUALITY_SCHEMA_VERSION) {
    errors.push("schemaVersion must be 1");
  }
  for (const key of ["reviewId", "packRunId", "inputAssetId"] as const) {
    if (!hasBoundedText(value[key], 8, 128)) errors.push(`${key} is invalid`);
  }
  if (typeof value.inputSha256 !== "string" || !SHA256.test(value.inputSha256)) {
    errors.push("inputSha256 must be a SHA-256 digest");
  }
  if (!hasBoundedText(value.skuLabel, 1, 120)) errors.push("skuLabel is invalid");
  if (value.rightsConfirmed !== true) errors.push("rightsConfirmed must be true");
  validateReferenceCoverage(value.referenceCoverage, errors);
  if (!isOneOf(value.crossClipIdentity, ["match", "wrong", "unverifiable"] as const)) {
    errors.push("crossClipIdentity is invalid");
  }
  validateDefects(value.crossClipDefects, 5, "pack", errors);
  if (
    !isRecord(value.reviewer) ||
    !hasOnlyKeys(value.reviewer, ["id", "role"]) ||
    !hasBoundedText(value.reviewer.id, 3, 128) ||
    !isOneOf(value.reviewer.role, ["seller", "internal"] as const)
  ) {
    errors.push("reviewer must contain a named id and seller/internal role");
  }
  if (!isIsoDateTime(value.reviewedAt)) {
    errors.push("reviewedAt must be ISO 8601 with timezone");
  }
  const rawChildren = value.children;
  if (!Array.isArray(rawChildren) || rawChildren.length !== SELLER_PACK_ITEMS.length) {
    errors.push("children must contain the exact three fixed formats");
  } else {
    SELLER_PACK_ITEMS.forEach((expected, index) => {
      validateChild(
        rawChildren[index],
        expected,
        index,
        String(value.inputSha256),
        errors
      );
    });
    const childRecords = rawChildren.filter(isRecord);
    const jobIds = childRecords.map((child) => child.packJobId);
    const outputHashes = childRecords.map((child) => child.outputSha256);
    if (new Set(jobIds).size !== jobIds.length) errors.push("packJobIds must be unique");
    if (new Set(outputHashes).size !== outputHashes.length) {
      errors.push("outputSha256 values must be unique per format");
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      status: "review_required",
      passedChildCount: 0,
      hasPassingSiblings: false,
      errors,
      packReasonCodes: [],
      children: [],
    };
  }

  const review = value as unknown as LaunchPackQualityReview;
  const children = review.children.map((child, index) =>
    deriveChildDecision(review, child, SELLER_PACK_ITEMS[index])
  );

  children.forEach((evaluation, index) => {
    const recorded = review.children[index].recordedDecision;
    const defectCodes = review.children[index].defects.map(
      (defect) => defect.reasonCode
    );
    if (recorded.manualDecision !== evaluation.decision) {
      errors.push(
        `children[${index}].recordedDecision.manualDecision conflicts with derived ${evaluation.decision}`
      );
    }
    if (!sameReasonSet(recorded.reasonCodes, evaluation.reasonCodes)) {
      errors.push(`children[${index}].recordedDecision.reasonCodes conflict with derived reasons`);
    }
    if (!sameReasonSet(defectCodes, evaluation.reasonCodes)) {
      errors.push(`children[${index}].defects must timestamp every derived reason exactly once`);
    }
    if (
      evaluation.decision === "retry" &&
      !hasBoundedText(recorded.targetedRetryInstruction, 1, 500)
    ) {
      errors.push(`children[${index}] retry requires targetedRetryInstruction`);
    }
    if (
      evaluation.decision === "pass" &&
      (recorded.reasonCodes.length > 0 ||
        review.children[index].defects.length > 0 ||
        recorded.targetedRetryInstruction !== undefined)
    ) {
      errors.push(`children[${index}] pass cannot carry failure evidence`);
    }
  });

  if (errors.length > 0) {
    return {
      valid: false,
      status: "review_required",
      passedChildCount: 0,
      hasPassingSiblings: false,
      errors,
      packReasonCodes: [],
      children,
    };
  }

  const packReasonCodes: LaunchPackQualityReasonCode[] = [];
  if (review.crossClipIdentity === "wrong") {
    packReasonCodes.push("cross_clip_identity_mismatch");
  } else if (review.crossClipIdentity === "unverifiable") {
    packReasonCodes.push("cross_clip_identity_unverifiable");
  }
  const packDefectCodes = review.crossClipDefects.map(
    (defect) => defect.reasonCode
  );
  if (!sameReasonSet(packDefectCodes, packReasonCodes)) {
    return {
      valid: false,
      status: "review_required",
      passedChildCount: 0,
      hasPassingSiblings: false,
      errors: ["crossClipDefects must timestamp the derived Pack identity reason exactly once"],
      packReasonCodes,
      children,
    };
  }
  const hasHardFailure =
    packReasonCodes.length > 0 ||
    children.some((child) => child.decision === "hard_failed");
  const passCount = children.filter((child) => child.decision === "pass").length;
  const allPass = children.every((child) => child.decision === "pass");
  return {
    valid: true,
    status: hasHardFailure ? "hard_failed" : allPass ? "pass" : "retry",
    passedChildCount: passCount,
    hasPassingSiblings: passCount > 0 && !allPass,
    errors: [],
    packReasonCodes,
    children,
  };
}

export function launchPackQualityReviewIdentity(
  review: LaunchPackQualityReview
): string {
  return stableJson({
    schemaVersion: review.schemaVersion,
    reviewer: review.reviewer,
    packRunId: review.packRunId,
    inputAssetId: review.inputAssetId,
    inputSha256: review.inputSha256,
    children: review.children.map((child) => ({
      packJobId: child.packJobId,
      attemptKey: child.attemptKey,
      outputSha256: child.outputSha256,
    })),
  });
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function compareLaunchPackQualityReviewReplay(
  existing: unknown,
  incoming: unknown
): LaunchPackQualityReplayDecision {
  const existingEvaluation = evaluateLaunchPackQualityReview(existing);
  const incomingEvaluation = evaluateLaunchPackQualityReview(incoming);
  if (!existingEvaluation.valid || !incomingEvaluation.valid) {
    return {
      kind: "invalid",
      errors: [
        ...existingEvaluation.errors.map((error) => `existing: ${error}`),
        ...incomingEvaluation.errors.map((error) => `incoming: ${error}`),
      ],
    };
  }
  const existingReview = existing as LaunchPackQualityReview;
  const incomingReview = incoming as LaunchPackQualityReview;
  const existingIdentity = launchPackQualityReviewIdentity(existingReview);
  const incomingIdentity = launchPackQualityReviewIdentity(incomingReview);
  if (existingIdentity !== incomingIdentity) return { kind: "different_identity" };
  return stableJson(existingReview) === stableJson(incomingReview)
    ? { kind: "idempotent", identity: existingIdentity }
    : { kind: "conflict", identity: existingIdentity };
}
