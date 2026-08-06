#!/usr/bin/env node
/**
 * Home Moment archive + suite rail Create/Generate door honesty (AIT-176).
 *
 * Locks:
 * - No bare `/create` or bare `/create?effect=street-power-up` on Home product doors
 * - Create doors use MOMENT_CREATE_HREF; Generate doors use createGenerate360Href
 * - Live-gated chips present on Moment CTAs; cached Lab labels on Lab doors
 * - PublicLaunchPackSample has no "available now" private-render claim
 * - No Official-as-customer CTA wording on archive doors
 *
 * Run: node scripts/home-moment-doors-smoke.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const softLaunch = read("lib/softLaunch.ts");
const home = read("app/page.tsx");
const homeHero = read("components/HomeCinemaHero.tsx");
const homeWall = read("components/HomeViralWall.tsx");
const hfRail = read("components/HfProductRail.tsx");
const publicSample = read("components/PublicLaunchPackSample.tsx");
const suiteDoors = read("components/SuiteDoorLinks.tsx");
const featureCarousel = read("components/HomeFeatureCarousel.tsx");
const momentShowcase = read("components/HomeMomentShowcase.tsx");

// --- Canonical helpers ---
assert.match(
  softLaunch,
  /export const MOMENT_CREATE_HREF\s*=\s*["']\/create\?mode=moment&effect=street-power-up["']/,
  "MOMENT_CREATE_HREF must be mode=moment + street-power-up"
);

// --- Home stack: Moment hero → proof wall → HF rail ---
assert.match(home, /<HomeCinemaHero/);
assert.match(home, /<HomeViralWall/);
assert.match(home, /<HfProductRail/);
assert.doesNotMatch(home, /PublicLaunchPackSample/);

// No bare create product doors on mounted Home surfaces
const homeSurfaces = [
  ["app/page.tsx", home],
  ["components/HomeCinemaHero.tsx", homeHero],
  ["components/HomeViralWall.tsx", homeWall],
  ["components/HfProductRail.tsx", hfRail],
];

const bareCreateHref = /href=["']\/create["']/;
const bareEffectHref = /["']\/create\?effect=street-power-up/;

for (const [label, src] of homeSurfaces) {
  assert.ok(
    !bareCreateHref.test(src),
    `${label}: no bare href="/create"`
  );
  assert.ok(
    !bareEffectHref.test(src),
    `${label}: no bare /create?effect=street-power-up (use MOMENT_CREATE_HREF)`
  );
}

// Hero Moment CTA
assert.match(homeHero, /href=\{MOMENT_CREATE_HREF\}/);
assert.match(homeHero, /data-home-moment-cta/);
assert.match(homeHero, /data-live-gated=["']true["']/);
assert.match(homeHero, /Live-gated/);
assert.match(homeHero, /Cached Lab sample|cached 6s archive/i);
assert.doesNotMatch(homeHero, /available now/i);
assert.doesNotMatch(homeHero, /Subscribe now|Buy now|Start free trial/i);
assert.match(homeHero, /not open checkout|Live-gated/i);

// Proof wall
assert.match(homeWall, /MOMENT_CREATE_HREF/);
assert.match(homeWall, /createGenerate360Href\(["']home-proof-wall["']\)/);
assert.match(homeWall, /Live-gated/);
assert.match(homeWall, /cached Lab/i);
assert.ok(!bareEffectHref.test(homeWall), "home wall: no bare street-power-up create");

// HF product rail
assert.match(hfRail, /MOMENT_CREATE_HREF/);
assert.match(hfRail, /createGenerate360Href\(["']hf-product-rail["']\)/);
assert.match(hfRail, /source=hf-product-rail/);
assert.match(hfRail, /Live-gated/);
assert.match(hfRail, /Lab/);
assert.ok(!bareEffectHref.test(hfRail), "hf rail: no bare street-power-up create");
assert.doesNotMatch(hfRail, /available now|Subscribe now|Buy now/i);

// --- PublicLaunchPackSample archive honesty (residual / create surface) ---
assert.match(
  publicSample,
  /const createHref = `\$\{MOMENT_CREATE_HREF\}&source=home-motion-archive`/
);
assert.match(publicSample, /data-live-gated=["']true["']/);
assert.match(publicSample, /Live-gated/);
assert.match(publicSample, /not open checkout/i);
assert.match(publicSample, /Cached Lab|cached Lab/i);
assert.match(publicSample, /Preview a concept direction/);
assert.match(publicSample, /data-concept-preview=["']true["']/);
assert.doesNotMatch(publicSample, /available now/i);
assert.doesNotMatch(
  publicSample,
  /Preview an Official Concept/
);
assert.doesNotMatch(
  publicSample,
  /Private render available now/
);
assert.ok(
  !bareEffectHref.test(publicSample),
  "PublicLaunchPackSample: no bare street-power-up create"
);
// Concept preview keeps moment= path (not private Live)
assert.match(
  publicSample,
  /\/create\?moment=\$\{momentId\}&source=home-concept-preview/
);

// --- Suite rails residual ---
assert.match(suiteDoors, /MOMENT_CREATE_HREF/);
assert.match(suiteDoors, /createGenerate360Href\(["']suite-doors["']\)/);
assert.match(suiteDoors, /source=suite-doors/);
assert.match(suiteDoors, /Live-gated/);
assert.ok(!bareEffectHref.test(suiteDoors), "suite doors: no bare street-power-up");
assert.ok(!bareCreateHref.test(suiteDoors), "suite doors: no bare /create");

assert.match(featureCarousel, /MOMENT_CREATE_HREF/);
assert.match(featureCarousel, /source=home-feature/);
assert.match(featureCarousel, /Live-gated/);
assert.ok(
  !bareEffectHref.test(featureCarousel),
  "feature carousel: no bare street-power-up"
);

assert.match(momentShowcase, /MOMENT_CREATE_HREF/);
assert.match(momentShowcase, /source=home-moment-showcase/);
assert.match(momentShowcase, /Live-gated/);
assert.match(momentShowcase, /data-concept-preview=["']true["']/);
assert.ok(
  !/href=["']\/create\?moment=capsule-reveal["']/.test(momentShowcase),
  "showcase must not use untagged capsule-reveal href"
);

console.log("home-moment-doors-smoke: ok");
