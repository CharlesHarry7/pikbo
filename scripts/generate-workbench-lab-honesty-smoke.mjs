#!/usr/bin/env node
/**
 * AIT-382: Generate workbench Lab sample honesty after dual-path.
 *
 * When Home Generate→360 opens generate-workbench (effect=360-spin-showcase):
 * - Lab sample CTAs stay 0 credits (never Mini trial / 10-cr claim)
 * - Free Mini product copy only when freeLiveOpen
 * - CreateStudio open remains finite (timeout + retry)
 * - Remix deep links stay workbench (not forced Moment)
 *
 * Run: node scripts/generate-workbench-lab-honesty-smoke.mjs
 *   or: npm run generate-workbench-lab-honesty-smoke
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const createPage = read("app/create/page.tsx");
const createStudio = read("components/CreateStudio.tsx");
const contractLib = read("lib/createRouteContract.ts");
const timeout = read("lib/clientTimeout.ts");
const meClient = read("lib/meClient.ts");
const samples = read("lib/samples.ts");
const packageJson = read("package.json");
const jobIntents = read("lib/jobIntents.ts");
const homeViral = read("components/HomeViralWall.tsx");
const homeExplore = read("components/HomeExploreRecipeRail.tsx");
const homeHero = read("components/HomeCinemaHero.tsx");

// ── Dual-path prerequisite (AIT-369 / createRouteContract) ────────────────
assert.match(
  contractLib,
  /export function resolveCreateRouteContract/,
  "createRouteContract must export resolveCreateRouteContract"
);
assert.match(
  createPage,
  /resolveCreateRouteContract/,
  "create page must dual-path via resolveCreateRouteContract"
);
assert.match(
  createPage,
  /data-create-contract=["']generate-workbench["']/,
  "create page must mark generate-workbench"
);
assert.match(
  createPage,
  /data-create-contract=["']fixed-moment["']/,
  "create page must keep fixed-moment"
);
assert.match(
  createPage,
  /data-workbench-lab-honesty=["']0-credit-lab["']/,
  "workbench shell must mark 0-credit Lab honesty"
);

// Workbench CreateStudio: remix props, no fixedMomentContract
const workbenchStudio = createPage.match(
  /data-create-contract=["']generate-workbench["'][\s\S]*?<CreateStudio([\s\S]*?)\/>/
)?.[1];
assert.ok(workbenchStudio, "generate-workbench CreateStudio must exist");
assert.match(
  workbenchStudio,
  /initialEffect=\{effectSlug\}/,
  "workbench must pass remix effect"
);
assert.match(
  workbenchStudio,
  /initialSample=\{firstRunSample\}/,
  "workbench must pass Lab try sample when present"
);
assert.doesNotMatch(
  workbenchStudio,
  /fixedMomentContract/,
  "workbench CreateStudio must NOT set fixedMomentContract"
);
assert.doesNotMatch(
  workbenchStudio,
  /initialEffect=["']street-power-up["']/,
  "workbench must not hard-code street-power-up"
);

// No Moment chrome on workbench
const workbenchShell = createPage.match(
  /data-create-contract=["']generate-workbench["'][\s\S]*?<CreateSeoFooter/
)?.[0];
assert.ok(workbenchShell, "workbench shell with SEO footer must exist");
assert.doesNotMatch(
  workbenchShell,
  /GuestMomentCreateGate/,
  "workbench must not use Street Power-Up guest gate"
);
assert.match(
  workbenchShell,
  /0 credits|Lab sample is 0 credits/,
  "workbench header must state Lab sample 0 credits"
);

// ── Lab sample CTAs: always free / 0 credits (never Mini trial on Lab path) ─
assert.match(
  createStudio,
  /data-lab-sample-cta=["']free["']/,
  "Lab sample CTA must mark free (0-credit path)"
);
assert.match(
  createStudio,
  /data-lab-sample-cost=["']0["']/,
  "Lab sample cost line must mark 0 credits"
);
assert.match(
  createStudio,
  /t\(["']create\.oneTapCached["']\)/,
  "primary Lab one-tap must use free cached label"
);
assert.match(
  createStudio,
  /t\(["']create\.labSampleFree["']\)/,
  "empty-state Lab CTA must use free Lab sample label"
);
// Residual: Lab path must not switch to Mini trial CTA keys
assert.doesNotMatch(
  createStudio,
  /t\(["']create\.oneTapMini["']\)/,
  "Lab one-tap must not claim Mini trial credits"
);
assert.doesNotMatch(
  createStudio,
  /t\(["']create\.labSampleMini["']\)/,
  "Lab empty-state must not claim Mini trial"
);

// loadSampleToy toast stays 0 credits
assert.match(
  createStudio,
  /cached · 0 credits/,
  "Lab sample toast must state cached 0 credits"
);
assert.doesNotMatch(
  createStudio,
  /live Mini uses 10 credits/,
  "Lab sample path must not toast live Mini 10 credits"
);

// ── Free Mini product copy only when freeLiveOpen ─────────────────────────
assert.match(
  createStudio,
  /const freeLiveOpen\s*=\s*Boolean\(/,
  "CreateStudio must compute freeLiveOpen"
);
assert.match(
  createStudio,
  /canLiveGenerate\(session\)/,
  "freeLiveOpen must gate on canLiveGenerate"
);
assert.match(
  createStudio,
  /freeLive\.liveEnabled\s*!==\s*false/,
  "freeLiveOpen must respect freeLive.liveEnabled"
);
assert.match(
  createStudio,
  /trialDone && isFree && freeLiveOpen/,
  "Free Mini trial-used banner must require freeLiveOpen"
);
assert.match(
  createStudio,
  /trialDone && isFree && freeLiveOpen \? \([\s\S]*?Free Mini trial used/,
  "Free Mini trial-used UI must be gated by freeLiveOpen"
);

// Residual Free Mini surfaces (UI strings) — only trial-used banner allowed
const freeMiniUi = [
  ...createStudio.matchAll(/^\s*Free Mini[^\n]*/gm),
].map((m) => m[0].trim());
for (const hit of freeMiniUi) {
  assert.match(
    hit,
    /Free Mini trial used/,
    `unexpected Free Mini surface copy: ${hit}`
  );
}

// Closed-Live Lab honesty copy
assert.match(
  createStudio,
  /Lab sample · private Live gated · 0 credits/,
  "closed Live must keep Lab sample 0-credit copy"
);
assert.match(
  createStudio,
  /Lab sample · 0 credits · not Free Mini Live/,
  "open Free Mini still must not rebrand Lab sample as Free Mini"
);

// Sticky / quote chips fail-closed to 0 when Lab/demo
assert.match(
  createStudio,
  /data-sticky-credits=\{demoMode \|\| labStill \? ["']0["'] : ["']live["']\}/,
  "sticky credits must mark 0 for Lab/demo"
);
assert.match(
  createStudio,
  /data-quote-credits=\{demoMode \|\| labStill \? ["']0["']/,
  "quote chip must mark 0 credits for Lab/demo"
);

// ── Finite Studio open + Lab sample timeout/retry ─────────────────────────
assert.match(timeout, /STUDIO_SESSION_BOOT_MS\s*=\s*8_000/);
assert.match(timeout, /LAB_SAMPLE_LOAD_MS\s*=\s*12_000/);
assert.match(meClient, /timeoutMs\?: number/);
assert.match(meClient, /ClientTimeoutError/);
assert.match(samples, /withTimeout\(load\(\), timeoutMs/);
assert.match(createStudio, /Opening studio…/);
assert.match(createStudio, /sessionBoot === "timeout"/);
assert.match(createStudio, /data-studio-open-retry/);
assert.match(createStudio, /Retry access check/);
assert.match(createStudio, /Lab sample timed out/);
assert.match(createStudio, /data-lab-sample-error/);
assert.match(createStudio, /data-lab-sample-retry/);
assert.match(createStudio, /Retry Lab sample/);
assert.match(createStudio, /fetchMe\(\{\s*timeoutMs:\s*STUDIO_SESSION_BOOT_MS\s*\}\)/);
assert.doesNotMatch(createStudio, /elapsed\s*>=\s*STUDIO_SESSION_BOOT_MS/);

// ── Home remix deep links still land on workbench (not forced Moment) ─────
assert.match(
  jobIntents,
  /export function createGenerate360Href/,
  "createGenerate360Href helper required"
);
assert.match(
  jobIntents,
  /360-spin-showcase|GENERATE_360_EFFECT/,
  "360 deep link must target listing spin effect"
);
for (const [label, src] of [
  ["HomeViralWall", homeViral],
  ["HomeExploreRecipeRail", homeExplore],
  ["HomeCinemaHero", homeHero],
]) {
  assert.match(
    src,
    /createGenerate360Href/,
    `${label} must deep-link via createGenerate360Href (workbench, not Moment)`
  );
  assert.doesNotMatch(
    src,
    /mode=moment.*360-spin|360-spin.*mode=moment/,
    `${label} must not force Moment mode onto 360`
  );
}

// Package wiring
assert.match(
  packageJson,
  /"generate-workbench-lab-honesty-smoke":\s*"node scripts\/generate-workbench-lab-honesty-smoke\.mjs"/,
  "package.json must wire generate-workbench-lab-honesty-smoke"
);

console.log(
  "generate-workbench-lab-honesty-smoke: PASS (workbench Lab sample 0 credits; Free Mini only freeLiveOpen; finite open/retry; remix→workbench)"
);
