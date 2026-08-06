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
  ["components/HomeViralWall.tsx", "home-proof-wall"],
  ["components/HomeBrowseCta.tsx", "home-browse"],
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

// 5. AIT-71 — floating Generate never under home indicator/nav; correct z-index
const globalsCss = read("app/globals.css");
const layoutSrc = read("app/layout.tsx");
const homePage = read("app/page.tsx");
const browseCta = read("components/HomeBrowseCta.tsx");
const mobileBar = read("components/MobileGenerateBar.tsx");
const modulesCta = read("components/ModulesMobileCta.tsx");

assert.match(
  globalsCss,
  /--mobile-nav-clearance:\s*calc\(/,
  "globals must define --mobile-nav-clearance = tab content + safe-area"
);
assert.match(
  globalsCss,
  /--floating-cta-safe-bottom:\s*max\(/,
  "globals must define --floating-cta-safe-bottom for nav-less Moment home"
);
assert.match(
  globalsCss,
  /--floating-generate-z:\s*40/,
  "floating Generate z-index token must sit under sticky header/nav (50)"
);
assert.match(
  layoutSrc,
  /viewportFit:\s*["']cover["']/,
  "root viewport must use viewport-fit=cover so safe-area env() resolves"
);
assert.match(
  homePage,
  /HomeBrowseCta/,
  "Moment home must mount the floating Generate browse CTA"
);
assert.match(
  browseCta,
  /bottom-\[var\(--floating-cta-safe-bottom\)\]/,
  "home floating Generate must use safe-area bottom (no tab nav on home)"
);
assert.match(
  browseCta,
  /z-\[var\(--floating-generate-z\)\]/,
  "home floating Generate must use --floating-generate-z"
);
assert.match(
  browseCta,
  /createGenerate360Href\(["']home-browse["']\)/,
  "home browse CTA must deep-link Generate→360 via home-browse source"
);
assert.doesNotMatch(
  browseCta,
  /bottom-\[4\.75rem\]/,
  "home floating Generate must not hardcode bare 4.75rem (double-counts nav when home has none)"
);
assert.match(
  mobileBar,
  /bottom-\[var\(--mobile-nav-clearance\)\]/,
  "MobileGenerateBar must clear tab nav + home indicator"
);
assert.match(
  mobileBar,
  /z-\[var\(--floating-generate-z\)\]/,
  "MobileGenerateBar must use floating Generate z token"
);
assert.match(
  modulesCta,
  /bottom-\[var\(--mobile-nav-clearance\)\]/,
  "ModulesMobileCta must clear tab nav + home indicator"
);

// 6. AIT-131 — MobileGenerateBar mounted in AppShell on browse surfaces
const appShellSrc = read("components/AppShell.tsx");
assert.match(
  appShellSrc,
  /import\s+\{\s*MobileGenerateBar\s*\}\s+from\s+["']@\/components\/MobileGenerateBar["']/,
  "AppShell must import MobileGenerateBar"
);
assert.match(
  appShellSrc,
  /<MobileGenerateBar\s*\/>/,
  "AppShell must mount MobileGenerateBar so showBar paths render"
);
// Browse surfaces that keep AppShell tab nav must be in showBar
for (const route of [
  "/explore",
  "/library",
  "/pricing",
  "/models",
  "/flow",
]) {
  assert.match(
    mobileBar,
    new RegExp(
      route === "/explore"
        ? String.raw`path\.startsWith\(["']\/explore["']\)`
        : String.raw`path\s*===\s*["']${route}["']`
    ),
    `MobileGenerateBar showBar must include ${route}`
  );
}
assert.match(
  mobileBar,
  /createGenerate360Href\(["']mobile-bar["']\)/,
  "MobileGenerateBar Generate door must use createGenerate360Href(mobile-bar)"
);
assert.doesNotMatch(
  mobileBar,
  /href=\{["']\/create["']\}|href=["']\/create["']/,
  "MobileGenerateBar must not bare-link /create"
);
assert.match(
  mobileBar,
  /data-mobile-bar=["']generate-remix["']/,
  "MobileGenerateBar Generate link must keep data-mobile-bar marker"
);
assert.match(
  mobileBar,
  /data-floating-generate=["']mobile-bar["']/,
  "MobileGenerateBar root must carry floating-generate marker for clearance smoke"
);

// 7. AIT-137 — residual tool stickies on AppShell tab surfaces use shared clearance/z tokens
const createStudioSrc = read("components/CreateStudio.tsx");
const cinemaPageSrc = read("app/cinema/page.tsx");
const batchStudioSrc = read("components/BatchStudio.tsx");

const tabSurfaceStickies = [
  [
    "cinema sticky",
    cinemaPageSrc,
    /data-floating-generate=["']cinema["']/,
    null,
  ],
  [
    "ModulesMobileCta sticky",
    modulesCta,
    /data-floating-generate=["']modules["']/,
    null,
  ],
  [
    "BatchStudio sticky",
    batchStudioSrc,
    /data-floating-generate=["']batch-sticky["']/,
    /data-seller-pack-sticky=["']mobile["']/,
  ],
];

for (const [label, src, marker, secondary] of tabSurfaceStickies) {
  assert.match(src, marker, `${label} must carry data-floating-generate marker`);
  if (secondary) {
    assert.match(src, secondary, `${label} must keep surface sticky marker`);
  }
  assert.match(
    src,
    /bottom-\[var\(--mobile-nav-clearance\)\]/,
    `${label} must use --mobile-nav-clearance (tab nav + home indicator)`
  );
  assert.match(
    src,
    /z-\[var\(--floating-generate-z\)\]/,
    `${label} must use --floating-generate-z`
  );
  assert.doesNotMatch(
    src,
    /bottom-\[4\.75rem\]/,
    `${label} must not hardcode bare bottom-[4.75rem]`
  );
  assert.doesNotMatch(
    src,
    /bottom-\[calc\(4\.75rem/,
    `${label} must not hardcode calc(4.75rem…) bottom offset`
  );
}

// 7b. AIT-145 — BatchStudio sticky: nav-less Seller Pack vs tab-sharing batch
assert.match(
  batchStudioSrc,
  /isSellerPack\s*\?\s*["'][^"']*bottom-\[var\(--floating-cta-safe-bottom\)\]/,
  "nav-less Seller Pack sticky must use --floating-cta-safe-bottom (no ghost tab gap)"
);
assert.match(
  batchStudioSrc,
  /data-batch-sticky-clearance=\{\s*isSellerPack\s*\?\s*["']safe-bottom["']\s*:\s*["']mobile-nav["']\s*\}/,
  "BatchStudio sticky must expose clearance branch for smoke (safe-bottom | mobile-nav)"
);
assert.match(
  batchStudioSrc,
  /isSellerPack\s*\?[\s\S]{0,280}pb-\[var\(--create-content-pad-safe\)\]/,
  "nav-less Seller Pack content pad must use --create-content-pad-safe (sticky height only)"
);
assert.match(
  batchStudioSrc,
  /data-batch-content-pad=\{\s*isSellerPack\s*\?\s*["']safe-bottom["']\s*:\s*["']mobile-nav["']\s*\}/,
  "BatchStudio content pad branch must be smoke-visible (safe-bottom | mobile-nav)"
);
assert.match(
  batchStudioSrc,
  /:\s*["'][^"']*bottom-\[var\(--mobile-nav-clearance\)\]/,
  "non-seller-pack BatchStudio sticky must still clear tab nav via --mobile-nav-clearance"
);

// 8. AIT-141 — CreateStudio sticky: nav-less Moment vs tab-sharing generic Create
assert.match(
  createStudioSrc,
  /data-floating-generate=["']create-sticky["']/,
  "CreateStudio sticky must carry data-floating-generate marker"
);
assert.match(
  createStudioSrc,
  /data-create-sticky=["']mobile["']/,
  "CreateStudio sticky must keep data-create-sticky=mobile"
);
assert.match(
  createStudioSrc,
  /fixedMomentContract\s*\?\s*["'][^"']*bottom-\[var\(--floating-cta-safe-bottom\)\]/,
  "fixed Moment CreateStudio sticky must use --floating-cta-safe-bottom (no tab nav)"
);
assert.match(
  createStudioSrc,
  /:\s*["'][^"']*bottom-\[var\(--mobile-nav-clearance\)\]/,
  "non-moment CreateStudio sticky must still clear tab nav via --mobile-nav-clearance"
);
assert.match(
  createStudioSrc,
  /data-create-sticky-clearance=\{\s*fixedMomentContract\s*\?\s*["']safe-bottom["']\s*:\s*["']mobile-nav["']\s*\}/,
  "CreateStudio sticky must expose clearance branch for smoke (safe-bottom | mobile-nav)"
);
assert.match(
  createStudioSrc,
  /z-\[var\(--floating-generate-z\)\]/,
  "CreateStudio sticky must use --floating-generate-z"
);
assert.doesNotMatch(
  createStudioSrc,
  /bottom-\[4\.75rem\]/,
  "CreateStudio sticky must not hardcode bare bottom-[4.75rem]"
);

// 8b. AIT-144 — content bottom inset pairs with sticky clearance (no tab-ghost pad)
assert.match(
  globalsCss,
  /--create-content-pad-safe:\s*calc\(/,
  "globals must define --create-content-pad-safe = sticky chrome + floating-cta-safe-bottom"
);
assert.match(
  globalsCss,
  /--create-sticky-chrome-h:\s*5\.75rem/,
  "globals must size Create sticky chrome for content pad calc"
);
assert.match(
  createStudioSrc,
  /fixedMomentContract\s*\?[\s\S]{0,280}pb-\[var\(--create-content-pad-safe\)\]/,
  "fixed Moment CreateStudio content must use --create-content-pad-safe (sticky height only)"
);
assert.match(
  createStudioSrc,
  /:\s*[\s\S]{0,120}pb-36/,
  "non-moment CreateStudio content must keep legacy pb-36 under sticky + tab"
);
assert.match(
  createStudioSrc,
  /data-create-content-pad=\{\s*fixedMomentContract\s*\?\s*["']safe-bottom["']\s*:\s*["']mobile-nav["']\s*\}/,
  "CreateStudio content pad branch must be smoke-visible (safe-bottom | mobile-nav)"
);
const createPageSrc = read("app/create/page.tsx");
assert.match(
  createPageSrc,
  /data-create-shell=["']fixed-moment["']/,
  "fixed Moment Create page must mark shell for smoke"
);
assert.match(
  createPageSrc,
  /data-create-shell-pad=["']sticky-only["']/,
  "fixed Moment Create page shell pad must be sticky-only (no tab ghost)"
);
assert.doesNotMatch(
  createPageSrc,
  /className="[^"]*\bpb-24\b/,
  "fixed Moment Create page className must not carry tab-era pb-24 under sticky"
);

// AIT-152 + AIT-141: AppShell hide pairs with always-fixed-Moment Create sticky
assert.match(
  appShellSrc,
  /const fixedMomentEntry\s*=\s*create\s*&&\s*searchParams\.get\(["']mode["']\)\s*===\s*["']moment["']\s*&&\s*searchParams\.get\(["']effect["']\)\s*===\s*["']street-power-up["']/,
  "AppShell fixedMomentEntry must match real MOMENT_CREATE_HREF"
);
assert.match(
  appShellSrc,
  /const hideMobileNav\s*=\s*resultShell\s*\|\|\s*create/,
  "AppShell must hide tab nav on resultShell (home/?moment=) AND all /create (always-fixed-Moment sticky)"
);
// Residual gap lock: bare /create and non-entry Moment queries are create paths
assert.match(
  appShellSrc,
  /const create\s*=\s*path\.startsWith\(["']\/create["']\)/,
  "AppShell create path detection must cover bare /create and query variants"
);
assert.doesNotMatch(
  appShellSrc,
  /const hideMobileNav\s*=\s*resultShell\s*\|\|\s*fixedMomentEntry\s*\|\|\s*sellerPackCreate/,
  "hideMobileNav must not regress to entry-only hide (bare /create gap)"
);
assert.match(
  appShellSrc,
  /\{!hideMobileNav\s*\?\s*\(\s*\n\s*<nav/,
  "mobile tab nav must gate on hideMobileNav"
);
assert.match(
  appShellSrc,
  /data-mobile-nav=["']default["']/,
  "AppShell tab nav must keep data-mobile-nav=default marker"
);

// Repo ban: no bare 4.75rem sticky bottom left on tool / generate chrome surfaces
const residualHardcodedBottom = [
  ["components/CreateStudio.tsx", createStudioSrc],
  ["app/cinema/page.tsx", cinemaPageSrc],
  ["components/ModulesMobileCta.tsx", modulesCta],
  ["components/BatchStudio.tsx", batchStudioSrc],
  ["components/MobileGenerateBar.tsx", mobileBar],
  ["components/HomeBrowseCta.tsx", browseCta],
];
for (const [rel, src] of residualHardcodedBottom) {
  assert.doesNotMatch(
    src,
    /bottom-\[4\.75rem\]/,
    `${rel} must not use bare bottom-[4.75rem] after AIT-71/137 token collapse`
  );
}

console.log("generate-360-cta-smoke: ok");
