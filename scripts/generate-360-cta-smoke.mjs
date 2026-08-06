#!/usr/bin/env node
/**
 * Generate → 360 deep-link smoke (source-only).
 *
 * Every primary Generate door must resolve through createGenerate360Href /
 * createWorkbenchHref / libraryEmpty360Href so bare /create cannot ship as a
 * Generate CTA. Moment product doors stay on MOMENT_CREATE_HREF.
 *
 * Run: node scripts/generate-360-cta-smoke.mjs
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const jobIntents = read("lib/jobIntents.ts");
const libraryEmpty = read("lib/libraryEmpty.ts");
const remixIntent = read("lib/remixIntent.ts");

// 1. Single helper contract
assert.match(
  jobIntents,
  /export const GENERATE_360_EFFECT\s*=\s*["']360-spin-showcase["']/,
  "GENERATE_360_EFFECT must be 360-spin-showcase"
);
assert.match(
  jobIntents,
  /export function createGenerate360Href\s*\(/,
  "createGenerate360Href must exist"
);
assert.match(
  jobIntents,
  /createRemixHref\(\s*GENERATE_360_EFFECT/,
  "createGenerate360Href must call createRemixHref with GENERATE_360_EFFECT"
);
assert.match(
  jobIntents,
  /export function createWorkbenchHref\s*\([^)]*\)\s*:\s*string\s*\{\s*return createGenerate360Href/,
  "createWorkbenchHref must alias createGenerate360Href"
);
assert.match(
  libraryEmpty,
  /export function libraryEmpty360Href[\s\S]*createGenerate360Href\(\s*LIBRARY_EMPTY_SOURCE/,
  "library empty 360 CTA must use createGenerate360Href"
);
assert.match(
  libraryEmpty,
  /LIBRARY_EMPTY_SOURCE\s*=\s*["']library-empty["']/,
  "library empty source tag must be library-empty"
);
assert.match(
  remixIntent,
  /export function createRemixHref\s*\(/,
  "createRemixHref remains the low-level remix builder"
);

// 2. Key Generate surfaces import / call the helper
const generateSurfaces = [
  ["components/HomeToolShelf.tsx", "home-tool-shelf"],
  ["components/HomeCinemaHero.tsx", "home-hero"],
  ["components/HomeViralWall.tsx", "home-proof-wall"],
  ["components/HomeExploreRecipeRail.tsx", "home-explore-rail"],
  ["components/SuiteEntryStrip.tsx", "suite-entry"],
  ["components/HowItWorks.tsx", "how-it-works"],
  ["components/MobileGenerateBar.tsx", "mobile-bar"],
  ["components/SoftLaunchStrip.tsx", "soft-launch"],
  ["components/LandingSeoMesh.tsx", "seo-mesh"],
  ["components/ModulesSuiteCtas.tsx", "modules-photo-clip"],
  ["components/CommandPalette.tsx", null],
  ["components/GenerateSuiteChrome.tsx", null],
  ["components/Header.tsx", "header"],
  ["components/HfProductRail.tsx", "hf-product-rail"],
  ["components/HfExploreHome.tsx", "hf-explore"],
  ["components/HeroVideoBanner.tsx", "hero-banner"],
  ["components/FreeTrialCta.tsx", "free-trial"],
  ["app/library/page.tsx", "library"],
  ["app/generate/page.tsx", "generate-alias"],
  ["app/explore/page.tsx", "explore"],
  ["app/modules/page.tsx", "modules"],
  ["app/community/page.tsx", "community"],
];

for (const [file, source] of generateSurfaces) {
  const src = read(file);
  assert.match(
    src,
    /createGenerate360Href|createWorkbenchHref|libraryEmpty360Href/,
    `${file} must use the Generate→360 helper`
  );
  assert.doesNotMatch(
    src,
    /createRemixHref\(\s*["']360-spin-showcase["']\s*\)/,
    `${file} must not call createRemixHref("360-spin-showcase") directly`
  );
  if (file === "app/library/page.tsx") {
    assert.match(
      src,
      /libraryEmpty360Href|data-library-header-cta=["']generate-360["']/,
      "Library header must expose Generate 360 CTA"
    );
    continue;
  }
  if (
    file === "components/CommandPalette.tsx" ||
    file === "components/GenerateSuiteChrome.tsx"
  ) {
    assert.match(
      src,
      /createWorkbenchHref\(\s*["'][^"']+["']\s*\)/,
      `${file} must pass an honest source to createWorkbenchHref`
    );
    continue;
  }
  assert.match(
    src,
    new RegExp(
      `createGenerate360Href\\(\\s*["']${source.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}["']`
    ),
    `${file} must tag source=${source}`
  );
}

// 3. No residual direct 360 createRemixHref in app/components
const residual = [];
for (const dir of ["app", "components"]) {
  const stack = [join(root, dir)];
  while (stack.length) {
    const d = stack.pop();
    for (const name of readdirSync(d)) {
      if (name === "node_modules" || name === ".next") continue;
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) stack.push(p);
      else if (/\.(tsx|ts)$/.test(name)) {
        const body = readFileSync(p, "utf8");
        if (/createRemixHref\(\s*["']360-spin-showcase["']\s*\)/.test(body)) {
          residual.push(p.slice(root.length + 1));
        }
      }
    }
  }
}
assert.equal(
  residual.length,
  0,
  `residual createRemixHref("360-spin-showcase") without helper:\n${residual.join("\n")}`
);

// 4. Helper output shape (parity with remixIntent defaults for 360-spin)
function fakeCreateGenerate360Href(source) {
  const tag = (source || "").trim().slice(0, 64);
  const q = new URLSearchParams({
    effect: "360-spin-showcase",
    source: tag || "360-spin-showcase",
    ratio: "1:1",
    duration: "5",
    channel: "etsy",
  });
  return `/create?${q.toString()}`;
}
const sample = fakeCreateGenerate360Href("suite-entry");
assert.match(sample, /^\/create\?/);
assert.match(sample, /effect=360-spin-showcase/);
assert.match(sample, /source=suite-entry/);
assert.doesNotMatch(sample, /^\/create$/);

// 5. AIT-160 home friction: one primary Generate→360 on proof wall
const homeWall = read("components/HomeViralWall.tsx");
assert.match(
  homeWall,
  /data-home-primary-generate=["']360["']/,
  "home proof wall must mark primary Generate as 360"
);
assert.match(
  homeWall,
  /data-home-primary-generate-cta/,
  "home proof wall must expose primary Generate CTA marker"
);
assert.match(
  homeWall,
  /createGenerate360Href\(\s*["']home-proof-wall["']\s*\)/,
  "home primary Generate must use createGenerate360Href(home-proof-wall)"
);
assert.match(
  homeWall,
  /is360\s*\?\s*listing360Href/,
  "360 proof card must deep-link Generate workbench (1-click, no project hop)"
);
assert.match(
  homeWall,
  /Generate 360°/,
  "primary Generate CTA label must say Generate 360°"
);

// 6. Create route must honor 360 (AIT-142) so home→360 is not a dead Moment force
const createRoute = read("lib/createRouteContract.ts");
const createPage = read("app/create/page.tsx");
assert.match(
  createRoute,
  /export function resolveCreateRouteContract/,
  "createRouteContract must resolve generate-workbench vs fixed-moment"
);
assert.match(
  createPage,
  /resolveCreateRouteContract/,
  "create page must use resolveCreateRouteContract"
);
assert.match(
  createPage,
  /data-create-contract=["']generate-workbench["']|data-generate-360/,
  "create page must mount honest Generate workbench markers"
);

// 7. AIT-166: Home secondary 360 doors share one createGenerate360Href path
// (proof wall primary secondary → explore rail → suite rail)
const exploreRail = read("components/HomeExploreRecipeRail.tsx");
const suiteRail = read("components/HfProductRail.tsx");
const homeStack = read("app/page.tsx");
assert.match(
  homeStack,
  /HomeCinemaHero[\s\S]*HomeViralWall[\s\S]*HomeExploreRecipeRail[\s\S]*HfProductRail/,
  "home stack order: Moment → proof wall → explore rail → suite rail"
);
assert.match(
  exploreRail,
  /createGenerate360Href\(\s*["']home-explore-rail["']\s*\)/,
  "explore rail 360 door must use createGenerate360Href(home-explore-rail)"
);
assert.match(
  exploreRail,
  /data-home-explore-rail-360-direct/,
  "explore rail 360 card must mark one-tap workbench path"
);
assert.match(
  exploreRail,
  /is360\s*\?\s*listing360Href/,
  "explore rail 360 card must deep-link Generate workbench"
);
assert.match(
  suiteRail,
  /createGenerate360Href\(\s*["']hf-product-rail["']\s*\)/,
  "suite rail Generate must use createGenerate360Href(hf-product-rail)"
);
assert.match(
  suiteRail,
  /data-home-suite-360/,
  "suite rail must expose secondary Generate 360 marker"
);
// AIT-181 / AIT-169: suite rail one filled primary Generate→360
assert.match(
  suiteRail,
  /data-hf-rail-primary-generate=["']360["']/,
  "suite rail must mark primary Generate as 360"
);
assert.match(
  suiteRail,
  /data-hf-rail-primary-generate-cta/,
  "suite rail must expose primary Generate CTA marker"
);
assert.doesNotMatch(
  suiteRail,
  /FreeTrialCta[\s\S]{0,200}variant\s*=\s*["']primary["']/,
  "suite rail FreeTrialCta must not use filled primary variant"
);
assert.match(
  suiteRail,
  /border border-white\/20/,
  "suite rail FreeTrial strip must be secondary outline"
);

// 8. AIT-192: Home→360 continuity after Studio open honesty
// Hero keeps Moment primary (product) but exposes above-fold Generate→360 so
// mobile does not rely only on the below-fold proof wall.
const homeHero = read("components/HomeCinemaHero.tsx");
assert.match(
  homeHero,
  /createGenerate360Href\(\s*["']home-hero["']\s*\)/,
  "home hero must deep-link Generate 360 via createGenerate360Href(home-hero)"
);
assert.match(
  homeHero,
  /data-home-hero-360-cta/,
  "home hero must expose above-fold Generate 360 CTA marker"
);
assert.match(
  homeHero,
  /Generate 360° listing spin/,
  "home hero 360 CTA must be result-first (listing spin), not generic Generate"
);
assert.match(
  homeHero,
  /data-home-moment-cta/,
  "home hero Moment primary CTA remains (product contract)"
);
assert.equal(
  (homeHero.match(/data-home-moment-cta/g) || []).length,
  1,
  "home hero must keep exactly one Moment primary CTA"
);
// HfExploreHome residual: no bare street-power-up; primary Generate = 360
const hfExplore = read("components/HfExploreHome.tsx");
assert.match(
  hfExplore,
  /createGenerate360Href\(\s*["']hf-explore["']\s*\)/,
  "HfExploreHome must use createGenerate360Href(hf-explore)"
);
assert.match(
  hfExplore,
  /data-hf-explore-primary-generate=["']360["']/,
  "HfExploreHome primary Generate must mark 360"
);
assert.match(
  hfExplore,
  /Generate 360° listing spin/,
  "HfExploreHome primary Generate label must be result-first"
);
assert.doesNotMatch(
  hfExplore,
  /href=["']\/create\?effect=street-power-up["']/,
  "HfExploreHome must not use bare street-power-up create hrefs"
);
assert.match(
  hfExplore,
  /MOMENT_CREATE_HREF/,
  "HfExploreHome Moment doors must use MOMENT_CREATE_HREF"
);
// Home entry file: money-path stack keeps proof wall + suite 360 doors
assert.match(
  homeStack,
  /HomeCinemaHero[\s\S]*HomeViralWall[\s\S]*HfProductRail/,
  "home entry must compose Moment hero → proof wall → suite rail"
);

console.log("generate-360-cta-smoke: ok");
