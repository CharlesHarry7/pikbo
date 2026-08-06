#!/usr/bin/env node
/**
 * AIT-312: Generate workbench first-run fold after dual-path.
 *
 * Source contract:
 * - /create dual-path mounts workbench without fixedMomentContract
 * - workbench shell marks first-run fold (upload + sticky)
 * - CreateStudio workbench path exposes fold markers + honest Lab/Live labels
 * - No fixed-Moment chrome bleed on workbench (no GuestMomentCreateGate)
 * - No Free Mini copy when Live is closed (freeLiveOpen gate)
 *
 * Run: node scripts/workbench-first-run-smoke.mjs
 *   or: npm run workbench-first-run-smoke
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const createPage = read("app/create/page.tsx");
const createStudio = read("components/CreateStudio.tsx");
const contractLib = read("lib/createRouteContract.ts");

// ── Dual-path prerequisite (AIT-226 / createRouteContract) ────────────────
assert.match(
  createPage,
  /resolveCreateRouteContract/,
  "create page must route via resolveCreateRouteContract"
);
assert.match(
  createPage,
  /data-create-contract=["']generate-workbench["']/,
  "create page must mark generate-workbench path"
);
assert.match(
  createPage,
  /data-create-contract=["']fixed-moment["']/,
  "create page must keep fixed-moment path"
);
assert.match(
  contractLib,
  /export function resolveCreateRouteContract/,
  "createRouteContract must export resolveCreateRouteContract"
);
assert.match(
  contractLib,
  /360-spin-showcase/,
  "createRouteContract must know 360-spin-showcase"
);

// ── Workbench first-run page markers ──────────────────────────────────────
assert.match(
  createPage,
  /data-workbench-first-run=["']upload-sticky["']/,
  "workbench shell must mark first-run upload-sticky fold"
);
assert.match(
  createPage,
  /data-create-header=["']workbench-compact-mobile["']/,
  "workbench header must be compact-mobile for fold"
);
assert.match(
  createPage,
  /data-generate-360=\{is360 \? ["']true["'] : ["']false["']\}/,
  "workbench must expose data-generate-360"
);
assert.match(
  createPage,
  /Lab free · Live gated|private Live is checked/,
  "workbench header must use honest Lab / Live language"
);

// Workbench CreateStudio: no fixedMomentContract, remix props through
const workbenchStudio = createPage.match(
  /data-create-contract=["']generate-workbench["'][\s\S]*?<CreateStudio([\s\S]*?)\/>/
)?.[1];
assert.ok(workbenchStudio, "generate-workbench CreateStudio must exist");
assert.match(
  workbenchStudio,
  /initialEffect=\{effectSlug\}/,
  "workbench must pass remix effect through"
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

// No Moment chrome bleed: GuestMomentCreateGate only wraps fixed-moment
const workbenchShell = createPage.match(
  /data-create-contract=["']generate-workbench["'][\s\S]*?<CreateSeoFooter/
)?.[0];
assert.ok(workbenchShell, "workbench shell with SEO footer must exist");
assert.doesNotMatch(
  workbenchShell,
  /GuestMomentCreateGate/,
  "workbench must not use Street Power-Up guest gate"
);
assert.doesNotMatch(
  workbenchShell,
  /Pikbo Moment · private render/,
  "workbench must not show fixed Moment eyebrow"
);
assert.doesNotMatch(
  workbenchShell,
  /Street Power-Up/,
  "workbench shell must not bleed Street Power-Up chrome"
);
assert.match(
  workbenchShell,
  /Pikbo Generate ·/,
  "workbench must use Generate eyebrow, not Moment"
);

// Fixed Moment still locked
const momentBlock = createPage.match(
  /data-create-contract=["']fixed-moment["'][\s\S]*?<\/GuestMomentCreateGate>/
)?.[0];
assert.ok(momentBlock, "fixed-moment branch must exist");
assert.match(
  momentBlock,
  /fixedMomentContract/,
  "fixed Moment path must pass fixedMomentContract"
);

// ── CreateStudio workbench fold markers ───────────────────────────────────
assert.match(
  createStudio,
  /const workbenchFirstRun\s*=\s*!fixedMomentContract/,
  "CreateStudio must define workbenchFirstRun as !fixedMomentContract"
);
assert.match(
  createStudio,
  /data-studio-contract=\{\s*fixedMomentContract\s*\?\s*["']fixed-moment["']\s*:\s*["']generate-workbench["']\s*\}/,
  "CreateStudio must mark studio-contract fixed-moment | generate-workbench"
);
assert.match(
  createStudio,
  /data-workbench-first-run=\{\s*workbenchFirstRun\s*\?\s*["']upload-sticky["']\s*:\s*undefined\s*\}/,
  "CreateStudio must mark workbench first-run fold"
);
assert.match(
  createStudio,
  /data-workbench-controls=\{\s*workbenchFirstRun\s*\?\s*["']above-fold["']\s*:\s*undefined\s*\}/,
  "CreateStudio controls must mark above-fold on workbench first-run"
);
assert.match(
  createStudio,
  /data-upload-zone=\{\s*workbenchFirstRun\s*\?\s*["']workbench["']\s*:\s*["']default["']\s*\}/,
  "workbench upload zone marker required"
);
assert.match(
  createStudio,
  /data-workbench-sticky=\{\s*workbenchFirstRun\s*\?\s*["']first-run["']\s*:\s*undefined\s*\}/,
  "sticky must mark workbench first-run primary"
);
assert.match(
  createStudio,
  /data-first-run-path=\{workbenchFirstRun\s*\?\s*["']compact["']\s*:\s*["']full["']\}/,
  "workbench path chrome compact marker required"
);
assert.match(
  createStudio,
  /data-mode-banner=\{workbenchFirstRun\s*\?\s*["']workbench-compact["']\s*:\s*["']default["']\}/,
  "workbench mode banner compact marker required"
);
assert.match(
  createStudio,
  /min-h-\[118px\]/,
  "workbench upload zone must use compact min-height for fold"
);
assert.match(
  createStudio,
  /data-first-run-action=["']upload["']/,
  "sticky upload action marker required"
);
assert.match(
  createStudio,
  /data-first-run-action=["']generate["']/,
  "sticky generate action marker required"
);
assert.match(
  createStudio,
  /data-first-run-action=["']lab-preview["']/,
  "sticky lab-preview action marker required"
);

// Suite chrome desktop-only (no mobile chrome bleed into fold)
assert.match(
  createStudio,
  /data-workbench-suite-chrome=["']desktop-only["']/,
  "GenerateSuiteChrome must stay desktop-only on workbench"
);

// ── Honest labels: no Free Mini when Live closed ──────────────────────────
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
  /Lab sample · private Live gated/,
  "closed-Live workbench must offer Lab sample / Live gated copy"
);
assert.match(
  createStudio,
  /demoMode \|\| !freeLiveOpen/,
  "Lab sample free CTA must win when Live closed"
);
// Residual: Free Mini UI copy only via freeLiveOpen-gated banner
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
// Free Mini trial-used branch must stay behind freeLiveOpen
assert.match(
  createStudio,
  /trialDone && isFree && freeLiveOpen \? \([\s\S]*?Free Mini trial used/,
  "Free Mini trial-used UI must be gated by freeLiveOpen"
);

// ── AIT-344 residual: sticky pad tokens + finite open + source honesty ────
const globalsCss = read("app/globals.css");
const jobIntents = read("lib/jobIntents.ts");

assert.match(
  globalsCss,
  /--sticky-generate-pad:/,
  "globals must define --sticky-generate-pad for workbench content pad"
);
assert.match(
  globalsCss,
  /--sticky-generate-pad-safe:/,
  "globals must define --sticky-generate-pad-safe for nav-less Moment"
);
assert.match(
  globalsCss,
  /--mobile-nav-clearance:/,
  "globals must define --mobile-nav-clearance for sticky bottom offset"
);
assert.match(
  createStudio,
  /pb-\[var\(--sticky-generate-pad\)\]/,
  "workbench content must pad with --sticky-generate-pad (not bare pb-36)"
);
assert.match(
  createStudio,
  /pb-\[var\(--sticky-generate-pad-safe\)\]/,
  "fixed Moment content must pad with --sticky-generate-pad-safe"
);
assert.doesNotMatch(
  createStudio,
  /\bpb-36\b/,
  "CreateStudio must not use bare pb-36 under sticky Generate"
);
assert.match(
  createStudio,
  /bottom-\[var\(--mobile-nav-clearance\)\]/,
  "workbench sticky must sit on --mobile-nav-clearance"
);
assert.match(
  createStudio,
  /bottom-\[var\(--floating-cta-safe-bottom\)\]/,
  "Moment sticky must sit on --floating-cta-safe-bottom"
);
assert.match(
  createStudio,
  /data-create-source=\{\s*initialSource \? initialSource\.slice\(0, 64\) : undefined\s*\}/,
  "CreateStudio must expose entry source for Home→360 deep links"
);
assert.match(
  createPage,
  /data-create-source=\{/,
  "workbench shell must mark data-create-source from query"
);
assert.match(
  createStudio,
  /timeoutMs:\s*STUDIO_SESSION_BOOT_MS/,
  "CreateStudio open must use finite STUDIO_SESSION_BOOT_MS wall-clock"
);
assert.match(
  createStudio,
  /data-studio-open-state=\{sessionBoot\}/,
  "finite Studio open state marker required"
);
assert.match(
  createStudio,
  /data-studio-open-retry/,
  "Studio open timeout must expose Retry access check"
);
assert.match(
  createStudio,
  /data-lab-sample-honesty=["']owned-path["']/,
  "Lab still must mark honest owned-photo replace path"
);
assert.match(
  createStudio,
  /not your photo/,
  "Lab still must say not your photo (no fake UGC)"
);

// Home deep-link sources that land on effect=360-spin-showcase
for (const source of [
  "home-hero",
  "home-proof-wall",
  "home-explore-rail",
  "hf-product-rail",
]) {
  assert.match(
    jobIntents,
    /createGenerate360Href/,
    "createGenerate360Href required for Home→360 sources"
  );
  // Source tags live on call sites; helper must accept optional source
  assert.match(
    jobIntents,
    /export function createGenerate360Href\(source\?: string\)/,
    "createGenerate360Href must accept source tag"
  );
  void source;
}

// Known Home→360 call sites (proof residual stack lands honest source tags)
const homeProof = read("components/HomeViralWall.tsx");
const homeExplore = read("components/HomeExploreRecipeRail.tsx");
const hfRail = read("components/HfProductRail.tsx");
assert.match(
  homeProof,
  /createGenerate360Href\(["']home-proof-wall["']\)/,
  "home-proof-wall must deep-link Generate 360 with source tag"
);
assert.match(
  homeExplore,
  /createGenerate360Href\(["']home-explore-rail["']\)/,
  "home-explore-rail must deep-link Generate 360 with source tag"
);
assert.match(
  hfRail,
  /createGenerate360Href\(["']hf-product-rail["']\)/,
  "hf-product-rail must deep-link Generate 360 with source tag"
);

console.log("workbench-first-run-smoke: ok");
