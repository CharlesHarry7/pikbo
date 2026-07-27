import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import {
  invalidOfficialEvidenceFixtures,
  validOfficialEvidence,
} from "../tests/fixtures/showcaseEvidenceFixtures.mjs";

const root = process.cwd();
const require = createRequire(import.meta.url);
const ts = require("typescript");

const evidenceSource = fs.readFileSync(
  path.join(root, "lib/showcaseEvidence.ts"),
  "utf8"
);
const transpiled = ts.transpileModule(evidenceSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const evidenceModule = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`
);

const {
  assertShowcasePromotionGate,
  evidenceGatedProvenanceLabel,
  showcaseEvidenceChecklist,
  validateShowcaseEvidence,
} = evidenceModule;

const validProjectAssets = {
  referencePoster: validOfficialEvidence.source.inputAssetPath,
  outputVideo: validOfficialEvidence.output.videoPath,
  poster: validOfficialEvidence.output.posterPath,
};

assert.equal(
  validateShowcaseEvidence(validOfficialEvidence).valid,
  true,
  "valid official fixture must pass"
);
assert.doesNotThrow(() =>
  assertShowcasePromotionGate({
    slug: "valid-official-fixture",
    provenance: "official_verified",
    evidence: validOfficialEvidence,
    ...validProjectAssets,
  })
);
assert.equal(
  evidenceGatedProvenanceLabel({
    slug: "prototype-label-fixture",
    provenance: "cached_prototype",
  }),
  "PIKBO Lab · cached prototype",
  "prototype label must not imply Official, Customer, or verified input-output"
);
assert.equal(
  evidenceGatedProvenanceLabel({
    slug: "verified-label-fixture",
    provenance: "official_verified",
    evidence: validOfficialEvidence,
    ...validProjectAssets,
  }),
  "Verified official example",
  "verified label may appear only after the complete gate passes"
);
assert.doesNotThrow(() =>
  assertShowcasePromotionGate({
    slug: "valid-live-fixture",
    provenance: "live_generated",
    evidence: validOfficialEvidence,
    ...validProjectAssets,
  })
);
assert.throws(
  () =>
    assertShowcasePromotionGate({
      slug: "evidence-assets-do-not-match-registry",
      provenance: "official_verified",
      evidence: validOfficialEvidence,
      ...validProjectAssets,
      outputVideo: "/evidence/case-001/different-output.mp4",
    }),
  /registered source\/output assets do not match/,
  "promotion must fail when registry media differs from the evidence record"
);
assert.equal(
  showcaseEvidenceChecklist(validOfficialEvidence).every(
    (item) => item.complete
  ),
  true,
  "valid fixture checklist must be complete"
);

for (const fixture of invalidOfficialEvidenceFixtures) {
  const result = validateShowcaseEvidence(fixture.evidence);
  assert.equal(result.valid, false, `${fixture.name} must fail validation`);
  assert.throws(
    () =>
      assertShowcasePromotionGate({
        slug: fixture.name,
        provenance: "official_verified",
        evidence: fixture.evidence,
        ...validProjectAssets,
      }),
    /cannot be promoted/,
    `${fixture.name} must fail the promotion gate`
  );
}

for (const provenance of [
  "official",
  "official_verified",
  "live",
  "live_generated",
]) {
  assert.throws(
    () =>
      assertShowcasePromotionGate({
        slug: `missing-${provenance}`,
        provenance,
      }),
    /cannot be promoted/,
    `${provenance} without evidence must fail`
  );
}

assert.doesNotThrow(() =>
  assertShowcasePromotionGate({
    slug: "prototype-without-evidence",
    provenance: "cached_prototype",
  })
);
assert.throws(
  () =>
    assertShowcasePromotionGate({
      slug: "prototype-with-legacy-score",
      provenance: "cached_prototype",
      qualityScores: { identity: 5 },
    }),
  /legacy public score fields/
);

const showcaseRegistry = fs.readFileSync(
  path.join(root, "lib/showcaseProjects.ts"),
  "utf8"
);
assert.match(
  showcaseRegistry,
  /assertShowcasePromotionGate\(project\)/,
  "registry import/build path must execute the promotion gate"
);
assert.match(
  showcaseRegistry,
  /provenance:\s*"cached_prototype"/,
  "current cached projects must remain prototypes"
);
assert.doesNotMatch(
  showcaseRegistry,
  /provenance:\s*"(?:official_verified|live_generated)"/,
  "fixtures must not silently promote a public project"
);

console.log(
  `showcase-promotion-gate: PASS (1 valid official, ${invalidOfficialEvidenceFixtures.length} invalid evidence fixtures + registry mismatch, prototypes unchanged)`
);
