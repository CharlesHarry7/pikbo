#!/usr/bin/env node
/**
 * AIT-325: Lab sample try hydrate on 360 workbench first-run.
 *
 * Source contract:
 * - createLabSampleTryHref → effect=360-spin-showcase + try=1&sample=
 * - /create dual-path mounts generate-workbench for that href (no Moment chrome)
 * - CreateStudio receives initialSample and hydrates Lab still + deep-link recipe
 * - Lab honesty: not-your-photo / Lab prototype markers; upload replace path clear
 * - Moment path (mode=moment) still fixed street-power-up; try hydrate does not
 *   force workbench on Moment
 * - Home Lab sample doors (feature carousel, free trial, soft launch, modules)
 *   use createLabSampleTryHref
 *
 * Run: node scripts/lab-sample-try-hydrate-smoke.mjs
 *   or: npm run lab-sample-try-hydrate-smoke
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const jobIntents = read("lib/jobIntents.ts");
const createPage = read("app/create/page.tsx");
const createStudio = read("components/CreateStudio.tsx");
const contractLib = read("lib/createRouteContract.ts");
const samples = read("lib/samples.ts");

// ── Helper emits 360 workbench + try/sample ───────────────────────────────
assert.match(
  jobIntents,
  /export function createLabSampleTryHref/,
  "createLabSampleTryHref must be exported"
);
assert.match(
  jobIntents,
  /createGenerate360Href/,
  "Lab sample try must build on createGenerate360Href (360 workbench)"
);
assert.match(
  jobIntents,
  /try=1&sample=/,
  "Lab sample try must set try=1&sample="
);
assert.match(
  jobIntents,
  /360-spin-showcase|GENERATE_360_EFFECT/,
  "Lab sample try must target listing 360 recipe"
);

// ── Dual-path prerequisite (AIT-312 / AIT-142) ────────────────────────────
assert.match(
  contractLib,
  /export function resolveCreateRouteContract/,
  "createRouteContract required for workbench vs Moment"
);
assert.match(
  createPage,
  /resolveCreateRouteContract/,
  "create page must dual-path route"
);
assert.match(
  createPage,
  /data-create-contract=["']generate-workbench["']/,
  "workbench shell required for Lab try"
);
assert.match(
  createPage,
  /data-create-contract=["']fixed-moment["']/,
  "Moment shell must remain"
);

// ── firstRunSample → workbench CreateStudio ───────────────────────────────
assert.match(
  createPage,
  /const firstRunSample[\s\S]*?sp\.sample[\s\S]*?try === ["']1["']/,
  "create page must derive firstRunSample from sample/try"
);
assert.match(
  createPage,
  /data-lab-sample-try=\{firstRunSample \? ["']1["'] : undefined\}/,
  "workbench shell must mark data-lab-sample-try when sample/try present"
);
assert.match(
  createPage,
  /data-first-run-sample=\{firstRunSample/,
  "workbench shell must expose data-first-run-sample"
);

const workbenchStudio = createPage.match(
  /data-create-contract=["']generate-workbench["'][\s\S]*?<CreateStudio([\s\S]*?)\/>/
)?.[1];
assert.ok(workbenchStudio, "generate-workbench CreateStudio must exist");
assert.match(
  workbenchStudio,
  /initialSample=\{firstRunSample\}/,
  "workbench must pass firstRunSample into CreateStudio"
);
assert.match(
  workbenchStudio,
  /initialEffect=\{effectSlug\}/,
  "workbench must pass remix effect (360) through"
);
assert.doesNotMatch(
  workbenchStudio,
  /fixedMomentContract/,
  "workbench CreateStudio must NOT set fixedMomentContract"
);
assert.doesNotMatch(
  workbenchStudio,
  /initialEffect=["']street-power-up["']/,
  "workbench Lab try must not hard-code Street Power-Up"
);

// No Moment chrome on workbench Lab try shell
const workbenchShell = createPage.match(
  /data-create-contract=["']generate-workbench["'][\s\S]*?<CreateSeoFooter/
)?.[0];
assert.ok(workbenchShell, "workbench shell with SEO footer must exist");
assert.doesNotMatch(
  workbenchShell,
  /GuestMomentCreateGate/,
  "Lab try workbench must not use Street Power-Up guest gate"
);
assert.doesNotMatch(
  workbenchShell,
  /Street Power-Up/,
  "Lab try workbench shell must not bleed Street Power-Up chrome"
);
assert.match(
  workbenchShell,
  /Pikbo Generate ·/,
  "Lab try workbench must use Generate eyebrow"
);

// Moment path still receives firstRunSample but keeps fixed contract
const momentBlock = createPage.match(
  /data-create-contract=["']fixed-moment["'][\s\S]*?<\/GuestMomentCreateGate>/
)?.[0];
assert.ok(momentBlock, "fixed-moment shell must exist");
assert.match(
  momentBlock,
  /fixedMomentContract/,
  "Moment path must keep fixedMomentContract"
);
assert.match(
  momentBlock,
  /initialEffect=["']street-power-up["']|initialEffect=\{FIXED_MOMENT_EFFECT\}|initialEffect=\{["']street-power-up["']\}/,
  "Moment path must keep street-power-up"
);
assert.match(
  momentBlock,
  /initialSample=\{firstRunSample\}/,
  "Moment path may still hydrate Lab still without leaving Moment"
);

// ── CreateStudio hydrate + honesty + replace ──────────────────────────────
assert.match(
  createStudio,
  /preferDeepLinkEffect/,
  "Lab try hydrate must prefer deep-link workbench recipe"
);
assert.match(
  createStudio,
  /data-lab-sample-try=\{labSampleTryState\}/,
  "CreateStudio must expose lab sample try state markers"
);
assert.match(
  createStudio,
  /data-lab-sample-id=/,
  "CreateStudio must expose lab sample id"
);
assert.match(
  createStudio,
  /data-lab-sample-still=["']ready["']|data-lab-sample-preview=/,
  "public path must surface loaded Lab still after try hydrate"
);
assert.match(
  createStudio,
  /data-upload-replace=\{labStill \? ["']lab-to-owned["'] : ["']owned["']\}/,
  "private path must mark Lab→owned replace path"
);
assert.match(
  createStudio,
  /Replace Lab sample|replace Lab sample with your photo/,
  "upload replace path must be labeled for Lab still"
);
assert.match(
  createStudio,
  /not your photo|not-your-photo|not your photo/,
  "Lab still must stay labeled not-your-photo"
);
assert.match(
  createStudio,
  /labSampleId|lab-sample-/,
  "generate path must tag Lab sample provenance"
);
assert.match(
  createStudio,
  /PIKBO Lab prototype sample/,
  "auto-generate toast must stay Lab prototype honesty"
);

// Scout Lab sample maps to 360 listing spin (matches createLabSampleTryHref)
assert.match(
  samples,
  /id:\s*["']scout["'][\s\S]*?effect:\s*["']360-spin-showcase["']/,
  "scout sample recipe must be 360-spin-showcase"
);

// ── Home / suite Lab sample doors ─────────────────────────────────────────
const labTryDoors = [
  ["components/HomeFeatureCarousel.tsx", /createLabSampleTryHref/],
  ["components/FreeTrialCta.tsx", /createLabSampleTryHref/],
  ["components/SoftLaunchStrip.tsx", /createLabSampleTryHref/],
  ["components/ModulesSuiteCtas.tsx", /createLabSampleTryHref/],
  ["components/ModulesMobileCta.tsx", /createLabSampleTryHref/],
];
for (const [rel, re] of labTryDoors) {
  const src = read(rel);
  assert.match(
    src,
    re,
    `${rel} Lab sample door must use createLabSampleTryHref`
  );
}

console.log("lab-sample-try-hydrate-smoke: ok");
