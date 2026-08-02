/**
 * Pure Launch Pack seller-quality contract regression.
 *
 * No Provider, Storage, database, credits, retry or UI calls are made here.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const root = process.cwd();

function loadTypeScriptModule(relativePath, dependencies = {}) {
  const source = readFileSync(join(root, relativePath), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "exports", "module", compiled)(
    (id) => {
      if (Object.hasOwn(dependencies, id)) return dependencies[id];
      throw new Error(`unexpected ${relativePath} import: ${id}`);
    },
    loaded.exports,
    loaded
  );
  return loaded.exports;
}

const sellerPack = loadTypeScriptModule("lib/sellerPackContract.ts");
const quality = loadTypeScriptModule("lib/launchPackQualityGate.ts", {
  "@/lib/sellerPackContract": sellerPack,
});

const qualitySource = readFileSync(
  join(root, "lib/launchPackQualityGate.ts"),
  "utf8"
);
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const workflow = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
const documentedWorkflow = readFileSync(
  join(root, "docs/ci/github-actions-ci.yml"),
  "utf8"
);

assert.doesNotMatch(
  qualitySource,
  /process\.env|\bfetch\s*\(|new Date\s*\(|@fal-ai|supabase|stripe|objectKey|signedUrl/i,
  "quality contract must stay deterministic and free of operational/sensitive dependencies"
);
assert.equal(
  packageJson.scripts["launch-pack-quality-gate"],
  "node scripts/launch-pack-quality-gate.mjs"
);
assert.match(workflow, /npm run launch-pack-quality-gate/);
assert.match(documentedWorkflow, /npm run launch-pack-quality-gate/);

const inputHash = "1".repeat(64);

function stableIdentity() {
  return {
    toyRecognized: true,
    sameSkuVariantColorway: "match",
    silhouetteAndProportions: "stable",
    facePaintAndMarkings: "stable",
    accessoriesLimbsAndBase: "stable",
    material: "stable",
    logoPackagingText: "truthful",
    motionContinuity: "stable",
    unseenSurfaces: "verified",
  };
}

function passingFormat(childKey) {
  if (childKey === "listing_spin") {
    return {
      kind: childKey,
      subjectFullyInFrame: true,
      rotationSupportsInspection: true,
      backgroundKeepsDetailsVisible: true,
      safeAreaClear: true,
      productPageReady: true,
    };
  }
  if (childKey === "blind_box_reveal") {
    return {
      kind: childKey,
      revealActionCompletes: true,
      cleanProductHoldSec: 1.25,
      productUnobscuredAtHold: true,
      packagingTruth: "match",
      safeAreaClear: true,
      dropReady: true,
    };
  }
  return {
    kind: childKey,
    recognizableWithinFirstSecond: true,
    toyRemainsHero: true,
    cleanProductHold: true,
    effectsSupportProduct: true,
    safeAreaClear: true,
    shortFormReady: true,
  };
}

function passingReview() {
  return {
    schemaVersion: 1,
    reviewId: "review-quality-0001",
    packRunId: "pack-run-quality-0001",
    inputAssetId: "input-asset-quality-0001",
    inputSha256: inputHash,
    skuLabel: "Owned vinyl SKU 01",
    rightsConfirmed: true,
    referenceCoverage: {
      physicalSkuAvailable: true,
      surfaces: ["front", "side", "back", "packaging", "physical_product"],
    },
    crossClipIdentity: "match",
    crossClipDefects: [],
    reviewer: { id: "seller-reviewer-01", role: "seller" },
    reviewedAt: "2026-08-02T12:00:00+08:00",
    children: sellerPack.SELLER_PACK_ITEMS.map((item, index) => ({
      packJobId: `pack-job-quality-000${index + 1}`,
      attemptKey: `attempt-quality-000${index + 1}`,
      childKey: item.key,
      effectSlug: item.slug,
      aspectRatio: item.aspectRatio,
      durationSec: item.durationSec,
      inputSha256: inputHash,
      outputSha256: String(index + 2).repeat(64),
      fullClipWatched: true,
      technical: {
        privateResultAvailable: true,
        playable: true,
        aspectRatio: item.aspectRatio,
        durationSec: item.durationSec,
        resolution: "720p",
        blackFrames: "none",
        frozenFrames: "none",
        truncated: false,
      },
      identity: stableIdentity(),
      formatReview: passingFormat(item.key),
      publishExactFileWithoutEditing: true,
      targetChannel:
        item.key === "listing_spin"
          ? "marketplace_listing"
          : item.key === "blind_box_reveal"
            ? "launch_social"
            : "short_form_social",
      defects: [],
      recordedDecision: {
        manualDecision: "pass",
        reasonCodes: [],
      },
    })),
  };
}

function deepClone(value) {
  return structuredClone(value);
}

function recordDecision(child, decision, reasons, instruction) {
  child.recordedDecision = {
    manualDecision: decision,
    reasonCodes: [...reasons],
    ...(instruction ? { targetedRetryInstruction: instruction } : {}),
  };
  child.defects = reasons.map((reasonCode, index) => ({
    reasonCode,
    timestampSec: Math.min(4.9, index * 0.25),
    note: `Observed ${reasonCode}`,
  }));
}

const pass = passingReview();
const passEvaluation = quality.evaluateLaunchPackQualityReview(pass);
assert.equal(passEvaluation.valid, true);
assert.equal(passEvaluation.status, "pass");
assert.deepEqual(
  passEvaluation.children.map((child) => child.decision),
  ["pass", "pass", "pass"]
);

// A technically succeeded Pack with no review is not a quality pass.
const missing = quality.evaluateLaunchPackQualityReview(undefined);
assert.equal(missing.valid, false);
assert.equal(missing.status, "pending");

for (const mutate of [
  (review) => review.children.pop(),
  (review) => review.children.reverse(),
  (review) => {
    review.children[1].packJobId = review.children[0].packJobId;
  },
  (review) => {
    review.children[1].outputSha256 = review.children[0].outputSha256;
  },
  (review) => {
    review.children[0].effectSlug = "paparazzi-flash";
  },
  (review) => {
    review.children[0].aspectRatio = "9:16";
  },
  (review) => {
    review.children[0].durationSec = 10;
  },
  (review) => {
    review.children[0].inputSha256 = "9".repeat(64);
  },
  (review) => {
    review.unexpected = true;
  },
]) {
  const malformed = passingReview();
  mutate(malformed);
  const result = quality.evaluateLaunchPackQualityReview(malformed);
  assert.equal(result.valid, false);
  assert.equal(result.status, "review_required");
}

// A fixable listing crop keeps the two passing siblings and never becomes a
// complete Pack pass.
const retryListing = passingReview();
retryListing.children[0].formatReview.subjectFullyInFrame = false;
retryListing.children[0].formatReview.productPageReady = false;
retryListing.children[0].publishExactFileWithoutEditing = false;
recordDecision(
  retryListing.children[0],
  "retry",
  ["unsafe_crop", "publish_as_is_rejected"],
  "Keep the whole toy and base inside the square product-safe area."
);
const retryEvaluation = quality.evaluateLaunchPackQualityReview(retryListing);
assert.equal(retryEvaluation.valid, true);
assert.equal(retryEvaluation.status, "retry");
assert.equal(retryEvaluation.passedChildCount, 2);
assert.equal(retryEvaluation.hasPassingSiblings, true);
assert.deepEqual(
  retryEvaluation.children.map((child) => child.decision),
  ["retry", "pass", "pass"]
);

const allRetry = passingReview();
for (const child of allRetry.children) {
  child.publishExactFileWithoutEditing = false;
  recordDecision(
    child,
    "retry",
    ["publish_as_is_rejected"],
    "Regenerate this format before the seller publishes the file."
  );
}
const allRetryEvaluation = quality.evaluateLaunchPackQualityReview(allRetry);
assert.equal(allRetryEvaluation.valid, true);
assert.equal(allRetryEvaluation.status, "retry");
assert.equal(allRetryEvaluation.passedChildCount, 0);
assert.equal(allRetryEvaluation.hasPassingSiblings, false);
assert.equal(
  allRetryEvaluation.children.filter((child) => child.decision === "pass").length,
  0
);

// A commercially material identity defect vetoes every average/pretty score.
const identityFailure = passingReview();
identityFailure.children[2].identity.sameSkuVariantColorway = "wrong";
recordDecision(identityFailure.children[2], "hard_failed", [
  "wrong_sku_variant_or_colorway",
]);
const identityEvaluation = quality.evaluateLaunchPackQualityReview(identityFailure);
assert.equal(identityEvaluation.valid, true);
assert.equal(identityEvaluation.status, "hard_failed");
assert.equal(identityEvaluation.children[2].decision, "hard_failed");

// A complete 360-style listing cannot pass when the hidden surfaces have no
// physical/front-side-back reference coverage.
const unverifiableSpin = passingReview();
unverifiableSpin.referenceCoverage = {
  physicalSkuAvailable: false,
  surfaces: ["front", "packaging"],
};
recordDecision(unverifiableSpin.children[0], "hard_failed", [
  "unverifiable_commercial_surface",
]);
const spinEvaluation = quality.evaluateLaunchPackQualityReview(unverifiableSpin);
assert.equal(spinEvaluation.valid, true);
assert.equal(spinEvaluation.status, "hard_failed");

const hiddenSurfaceNotShown = passingReview();
hiddenSurfaceNotShown.children[0].identity.unseenSurfaces = "not_shown";
recordDecision(
  hiddenSurfaceNotShown.children[0],
  "retry",
  ["listing_motion_not_informative"],
  "Show the referenced side and back surfaces before calling this a Listing Spin."
);
const hiddenSurfaceEvaluation =
  quality.evaluateLaunchPackQualityReview(hiddenSurfaceNotShown);
assert.equal(hiddenSurfaceEvaluation.valid, true);
assert.equal(hiddenSurfaceEvaluation.status, "retry");
assert.equal(hiddenSurfaceEvaluation.passedChildCount, 2);
assert.equal(hiddenSurfaceEvaluation.hasPassingSiblings, true);
assert.equal(hiddenSurfaceEvaluation.children[0].decision, "retry");

// A reveal may omit packaging, but it cannot invent packaging without a real
// packaging or physical-product reference.
const inventedPackaging = passingReview();
inventedPackaging.referenceCoverage = {
  physicalSkuAvailable: false,
  surfaces: ["front", "side", "back"],
};
recordDecision(inventedPackaging.children[1], "hard_failed", [
  "unverifiable_commercial_surface",
]);
const packagingEvaluation =
  quality.evaluateLaunchPackQualityReview(inventedPackaging);
assert.equal(packagingEvaluation.valid, true);
assert.equal(packagingEvaluation.status, "hard_failed");

// Social effects cannot make the toy unreadable in the opening second.
const socialRetry = passingReview();
socialRetry.children[2].formatReview.recognizableWithinFirstSecond = false;
socialRetry.children[2].formatReview.toyRemainsHero = false;
socialRetry.children[2].publishExactFileWithoutEditing = false;
recordDecision(
  socialRetry.children[2],
  "retry",
  [
    "social_first_second_unreadable",
    "social_effect_overpowers_product",
    "publish_as_is_rejected",
  ],
  "Reduce the opening effect and hold a clean product frame in the first second."
);
const socialEvaluation = quality.evaluateLaunchPackQualityReview(socialRetry);
assert.equal(socialEvaluation.valid, true);
assert.equal(socialEvaluation.status, "retry");
assert.equal(socialEvaluation.passedChildCount, 2);
assert.equal(socialEvaluation.hasPassingSiblings, true);

// Cross-clip mismatch is a Pack hard failure even when each individual child
// rubric was otherwise recorded as passing.
const crossClipFailure = passingReview();
crossClipFailure.crossClipIdentity = "wrong";
crossClipFailure.crossClipDefects = [
  {
    reasonCode: "cross_clip_identity_mismatch",
    timestampSec: 1.5,
    note: "The Social Flash child is visibly a different colorway.",
  },
];
const crossClipEvaluation =
  quality.evaluateLaunchPackQualityReview(crossClipFailure);
assert.equal(crossClipEvaluation.valid, true);
assert.equal(crossClipEvaluation.status, "hard_failed");
assert.deepEqual(crossClipEvaluation.packReasonCodes, [
  "cross_clip_identity_mismatch",
]);

// Recorded decisions never override the deterministic criteria.
const dishonestPass = passingReview();
dishonestPass.children[0].identity.toyRecognized = false;
assert.equal(
  quality.evaluateLaunchPackQualityReview(dishonestPass).status,
  "review_required"
);
const passWithReason = passingReview();
passWithReason.children[0].recordedDecision.reasonCodes = ["unsafe_crop"];
passWithReason.children[0].defects = [
  { reasonCode: "unsafe_crop", timestampSec: 1 },
];
assert.equal(
  quality.evaluateLaunchPackQualityReview(passWithReason).status,
  "review_required"
);

// Review replay is exact: same attempt/output/payload is idempotent; changed
// metadata under the same identity conflicts; a new attempt/output is distinct.
const replay = quality.compareLaunchPackQualityReviewReplay(pass, deepClone(pass));
assert.equal(replay.kind, "idempotent");
const conflictingReplay = deepClone(pass);
conflictingReplay.skuLabel = "A different label under the same evidence identity";
assert.equal(
  quality.compareLaunchPackQualityReviewReplay(pass, conflictingReplay).kind,
  "conflict"
);
const changedReviewIdCannotBypassConflict = deepClone(pass);
changedReviewIdCannotBypassConflict.reviewId = "review-quality-0002";
changedReviewIdCannotBypassConflict.skuLabel =
  "A changed verdict payload under the same reviewer and output identity";
assert.equal(
  quality.compareLaunchPackQualityReviewReplay(
    pass,
    changedReviewIdCannotBypassConflict
  ).kind,
  "conflict",
  "caller-controlled reviewId must not bypass replay conflict detection"
);
const newAttempt = deepClone(pass);
newAttempt.children[0].attemptKey = "attempt-quality-new-0001";
newAttempt.children[0].outputSha256 = "8".repeat(64);
assert.equal(
  quality.compareLaunchPackQualityReviewReplay(pass, newAttempt).kind,
  "different_identity"
);
const independentSellerReview = deepClone(pass);
independentSellerReview.reviewId = "review-quality-seller-0002";
independentSellerReview.reviewer = { id: "seller-reviewer-02", role: "seller" };
independentSellerReview.reviewedAt = "2026-08-02T12:10:00+08:00";
assert.equal(
  quality.compareLaunchPackQualityReviewReplay(pass, independentSellerReview).kind,
  "different_identity",
  "two independent reviewers may assess the same output under separate review ids"
);

const caseVariantDuplicate = passingReview();
caseVariantDuplicate.children[0].outputSha256 = "a".repeat(64);
caseVariantDuplicate.children[1].outputSha256 =
  caseVariantDuplicate.children[0].outputSha256.toUpperCase();
assert.equal(
  quality.evaluateLaunchPackQualityReview(caseVariantDuplicate).status,
  "review_required",
  "SHA-256 evidence must use canonical lowercase and reject case-variant duplicates"
);
const casingReplayBase = passingReview();
casingReplayBase.children[0].outputSha256 = "a".repeat(64);
const casingOnlyReplay = deepClone(casingReplayBase);
casingOnlyReplay.children[0].outputSha256 =
  casingOnlyReplay.children[0].outputSha256.toUpperCase();
assert.equal(
  quality.compareLaunchPackQualityReviewReplay(casingReplayBase, casingOnlyReplay)
    .kind,
  "invalid",
  "hash casing cannot create a different replay identity"
);

const colonIdentityA = passingReview();
colonIdentityA.packRunId = "12345678:abcdefgh";
colonIdentityA.inputAssetId = "ijklmnop";
const colonIdentityB = passingReview();
colonIdentityB.packRunId = "12345678";
colonIdentityB.inputAssetId = "abcdefgh:ijklmnop";
assert.equal(
  quality.compareLaunchPackQualityReviewReplay(colonIdentityA, colonIdentityB)
    .kind,
  "different_identity",
  "structured replay identity must not collide when IDs contain delimiters"
);

// The checked-in example is deliberately unassessed and cannot be promoted as
// a passed review or mistaken for a real customer result.
const template = JSON.parse(
  readFileSync(
    join(root, "docs/evidence/templates/LAUNCH_PACK_QUALITY_REVIEW_V1.example.json"),
    "utf8"
  )
);
const templateEvaluation = quality.evaluateLaunchPackQualityReview(template);
assert.equal(templateEvaluation.valid, false);
assert.notEqual(templateEvaluation.status, "pass");

console.log(
  "launch-pack-quality-gate: PASS (exact trio · identity veto · reference truth · publish-as-is · replay binding · blank template fail-closed)"
);
