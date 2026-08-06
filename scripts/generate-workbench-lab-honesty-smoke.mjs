#!/usr/bin/env node
/**
 * AIT-444 + AIT-459 + AIT-473: Generate workbench first-run Lab/Live honesty.
 *
 * When Home Generate→360 opens generate-workbench (effect=360-spin-showcase):
 * - Lab sample CTAs stay 0 credits (never Mini trial / 10-cr claim)
 * - Free Mini product copy only when freeLiveOpen
 * - Wait stage Free Mini brand only when freeLiveOpen (fail-closed)
 * - Remix deep links stay workbench (not forced Moment)
 * - Home entry sources (AIT-462 doors + explore rail) get Lab sample vs
 *   Live gated labels — no Free Mini open-trial fiction on shell/first-run
 *   Tags: home-hero, app-shell-home, home-trust, home-gallery-pedestal,
 *         home-explore-rail
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
const waitStage = read("components/GenerateWaitStage.tsx");
const contractLib = read("lib/createRouteContract.ts");
const timeout = read("lib/clientTimeout.ts");
const meClient = read("lib/meClient.ts");
const samples = read("lib/samples.ts");
const packageJson = read("package.json");
const jobIntents = read("lib/jobIntents.ts");
const landing = read("components/LandingToolPanel.tsx");

// ── Dual-path prerequisite (AIT-432 / createRouteContract) ────────────────
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
  /WORKBENCH_LAB_LIVE_HONESTY|0 credits|Lab sample is 0 credits/,
  "workbench header must state Lab sample 0 credits honesty"
);
assert.match(
  workbenchShell,
  /data-workbench-lab-honesty=["']0-credit-lab["']/,
  "workbench shell must mark 0-credit Lab honesty attr"
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
  /data-quote-credits=\{[\s\S]*?demoMode \|\| labStill[\s\S]*?["']0["']/,
  "quote chip must mark 0 credits for Lab/demo"
);

// ── Wait stage Free Mini honesty (AIT-444) ────────────────────────────────
assert.match(
  waitStage,
  /freeLiveOpen\s*=\s*false/,
  "GenerateWaitStage freeLiveOpen must default fail-closed"
);
assert.match(
  waitStage,
  /data-wait-free-live=\{freeLiveOpen \? ["']open["'] : ["']closed["']\}/,
  "wait stage must mark freeLive open/closed"
);
assert.match(
  waitStage,
  /data-wait-pace-hint=\{freeLiveOpen \? ["']mini["'] : ["']gated["']\}/,
  "wait pace hint must gate Mini brand on freeLiveOpen"
);
assert.match(
  waitStage,
  /typical Mini 1–3 min/,
  "wait stage keeps Mini pace copy for open Free Mini"
);
assert.match(
  waitStage,
  /Live gated · no public Free Mini/,
  "wait stage fail-closed copy when Live closed"
);
assert.match(
  waitStage,
  /data-wait-long-hint=\{freeLiveOpen \? ["']mini["'] : ["']gated["']\}/,
  "long-wait Mini brand must gate on freeLiveOpen"
);
// Unconditional Mini brand on live wait is residual thrash
assert.doesNotMatch(
  waitStage,
  /!demoMode \? \(\s*<span[^>]*>\s*· typical Mini 1–3 min/,
  "wait pace must not hard-code Mini when freeLiveOpen is false"
);
assert.match(
  createStudio,
  /freeLiveOpen=\{freeLiveOpen\}/,
  "CreateStudio must pass freeLiveOpen into GenerateWaitStage"
);
assert.match(
  landing,
  /freeLiveOpen=\{freeLiveOpen\}/,
  "LandingToolPanel must pass freeLiveOpen into GenerateWaitStage"
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

// ── Generate→360 deep link helper ─────────────────────────────────────────
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

// Package wiring
assert.match(
  packageJson,
  /"generate-workbench-lab-honesty-smoke":\s*"node scripts\/generate-workbench-lab-honesty-smoke\.mjs"/,
  "package.json must wire generate-workbench-lab-honesty-smoke"
);
assert.match(
  packageJson,
  /"create-route-360-smoke"/,
  "package.json must keep create-route-360-smoke"
);
assert.match(
  packageJson,
  /"generate-360-cta-smoke"/,
  "package.json must keep generate-360-cta-smoke (generate path)"
);

// ── AIT-459 / AIT-473: Home entry → workbench Lab/Live honesty ─────────────
assert.match(
  contractLib,
  /export const HOME_GENERATE_ENTRY_SOURCES/,
  "createRouteContract must export HOME_GENERATE_ENTRY_SOURCES"
);
// AIT-462 money doors + explore rail — workbench must treat all as entry tags
for (const tag of [
  "home-hero",
  "app-shell-home",
  "home-trust",
  "home-gallery-pedestal",
  "home-explore-rail",
]) {
  assert.match(
    contractLib,
    new RegExp(`["']${tag}["']`),
    `HOME_GENERATE_ENTRY_SOURCES must include ${tag}`
  );
}
assert.match(
  contractLib,
  /export function isHomeGenerateEntrySource/,
  "createRouteContract must export isHomeGenerateEntrySource"
);
assert.match(
  contractLib,
  /export function homeGenerateEntryLabel/,
  "createRouteContract must export homeGenerateEntryLabel for entry eyebrows"
);
assert.match(
  contractLib,
  /export const WORKBENCH_LAB_LIVE_HONESTY/,
  "createRouteContract must export WORKBENCH_LAB_LIVE_HONESTY"
);
assert.match(
  contractLib,
  /Lab sample · 0 credits · Live gated · not Free Mini open trial/,
  "WORKBENCH_LAB_LIVE_HONESTY must state Lab sample + Live gated + not Free Mini open trial"
);

assert.match(
  createPage,
  /isHomeGenerateEntrySource/,
  "create page must detect Home Generate entry sources"
);
assert.match(
  createPage,
  /WORKBENCH_LAB_LIVE_HONESTY/,
  "create page must surface WORKBENCH_LAB_LIVE_HONESTY"
);
assert.match(
  createPage,
  /data-workbench-honesty=["']lab-live["']/,
  "workbench shell must mark lab-live honesty strip"
);
assert.match(
  createPage,
  /data-workbench-live-gate=["']gated["']/,
  "workbench shell must mark Live gate closed/default"
);
assert.match(
  createPage,
  /data-home-generate-entry=\{homeEntry \? entrySource : undefined\}/,
  "workbench shell must expose AIT-462 home entry source tags when present"
);
assert.match(
  createPage,
  /data-workbench-entry=\{entrySource \|\| undefined\}/,
  "workbench shell must expose workbench entry source tag"
);
// Shell honesty must not sell Free Mini as open trial
assert.doesNotMatch(
  workbenchShell,
  /Free Mini trial|10 free credits/i,
  "workbench shell must not claim Free Mini open trial"
);
// Honesty constant is rendered (literal lives in createRouteContract)
assert.match(
  workbenchShell,
  /WORKBENCH_LAB_LIVE_HONESTY|not Free Mini open trial/,
  "workbench shell must print Lab/Live honesty line"
);

// Home doors stay dual-path: createGenerate360Href → effect=360-spin-showcase
const homeHero = read("components/HomeCinemaHero.tsx");
const homeRail = read("components/HomeExploreRecipeRail.tsx");
const appShell = read("components/AppShell.tsx");
assert.match(
  homeHero,
  /createGenerate360Href\(["']home-hero["']\)/,
  "HomeCinemaHero primary door must use createGenerate360Href(home-hero)"
);
assert.match(
  homeRail,
  /createGenerate360Href\(["']home-explore-rail["']\)/,
  "HomeExploreRecipeRail 360 door must use createGenerate360Href(home-explore-rail)"
);
assert.match(
  appShell,
  /createGenerate360Href\(["']app-shell-home["']\)/,
  "AppShell home Generate door must use createGenerate360Href(app-shell-home)"
);
assert.match(
  jobIntents,
  /export function createGenerate360Href/,
  "createGenerate360Href helper required for Home doors"
);
// home-trust / home-gallery-pedestal doors may land via AIT-462 PR; workbench
// side still recognizes those tags so first-run stays honest when they land.

// CreateStudio: home entry honesty banner; no /projects/{entry} dead link
assert.match(
  createStudio,
  /isHomeGenerateEntrySource/,
  "CreateStudio must detect home entry sources"
);
assert.match(
  createStudio,
  /homeGenerateEntryLabel/,
  "CreateStudio must label AIT-462 home entry sources via homeGenerateEntryLabel"
);
assert.match(
  createStudio,
  /data-home-generate-entry=\{initialSource\}/,
  "CreateStudio must mark home entry honesty strip"
);
assert.match(
  createStudio,
  /data-workbench-entry-honesty=["']lab-live["']/,
  "CreateStudio home entry strip must mark lab-live honesty"
);
assert.match(
  createStudio,
  /WORKBENCH_LAB_LIVE_HONESTY/,
  "CreateStudio home entry must reuse WORKBENCH_LAB_LIVE_HONESTY"
);
assert.match(
  createStudio,
  /not a Free Mini open trial/,
  "CreateStudio home entry must deny Free Mini open-trial fiction"
);
// Project remix link only for non-entry sources
assert.match(
  createStudio,
  /remixProjectSource/,
  "CreateStudio must separate remix project sources from home entry tags"
);
assert.doesNotMatch(
  createStudio,
  /href=\{`\/projects\/\$\{encodeURIComponent\(initialSource\)\}`\}/,
  "CreateStudio must not deep-link /projects/{AIT-462 home entry tags}"
);

console.log("generate-workbench-lab-honesty-smoke: ok");
