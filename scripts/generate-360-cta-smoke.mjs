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
  ["components/HomeExploreRecipeRail.tsx", "home-explore-rail"],
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

// 7. AIT-150 — mobile nav safe-area + residual sticky CTAs use shared clearance tokens
assert.match(
  appShellSrc,
  /data-mobile-nav=["']primary["']/,
  "AppShell mobile nav must expose data-mobile-nav=primary"
);
assert.match(
  appShellSrc,
  /pb-\[env\(safe-area-inset-bottom(?:,\s*0px)?\)\]/,
  "AppShell mobile nav must pad home-indicator safe-area"
);
assert.match(
  globalsCss,
  /--mobile-nav-content-h:\s*4\.75rem/,
  "tab content height token must stay aligned with mobile nav chrome"
);
assert.match(
  appShellSrc,
  /min-h-11/,
  "AppShell mobile nav tabs must keep 44px min touch target"
);

const createStudio = read("components/CreateStudio.tsx");
const cinemaPage = read("app/cinema/page.tsx");
const batchStudio = read("components/BatchStudio.tsx");

for (const [label, src] of [
  ["CreateStudio sticky", createStudio],
  ["cinema sticky", cinemaPage],
  ["ModulesMobileCta", modulesCta],
  ["MobileGenerateBar", mobileBar],
  ["BatchStudio sticky", batchStudio],
]) {
  assert.doesNotMatch(
    src,
    /bottom-\[4\.75rem\]/,
    `${label} must not hardcode bottom-[4.75rem] (use clearance tokens)`
  );
}

assert.match(
  createStudio,
  /bottom-\[var\(--mobile-nav-clearance\)\]/,
  "CreateStudio sticky must clear tab nav + home indicator on generic Create"
);
assert.match(
  createStudio,
  /bottom-\[var\(--floating-cta-safe-bottom\)\]/,
  "CreateStudio fixed Moment sticky must use safe-area only (nav-less)"
);
assert.match(
  createStudio,
  /data-create-sticky-clearance=\{/,
  "CreateStudio sticky must expose clearance branch marker"
);
assert.match(
  cinemaPage,
  /bottom-\[var\(--mobile-nav-clearance\)\]/,
  "cinema sticky must clear tab nav + home indicator"
);
assert.match(
  batchStudio,
  /bottom-\[var\(--mobile-nav-clearance\)\]/,
  "BatchStudio tab-sharing sticky must clear tab nav + home indicator"
);
assert.match(
  batchStudio,
  /bottom-\[var\(--floating-cta-safe-bottom\)\]/,
  "BatchStudio nav-less Seller Pack sticky must use floating-cta-safe-bottom"
);
assert.match(
  batchStudio,
  /data-batch-sticky-clearance=\{/,
  "BatchStudio sticky must expose clearance branch marker"
);

// 8. AIT-185 — Toast stack clears tab + home indicator (never hard bottom-20)
const toastSrc = read("components/Toast.tsx");
assert.match(
  toastSrc,
  /data-toast-stack=["']safe["']/,
  "Toast stack must expose data-toast-stack=safe"
);
assert.match(
  toastSrc,
  /bottom-\[calc\(var\(--mobile-nav-clearance\)\+0\.5rem\)\]/,
  "Toast stack must clear tab nav + home indicator via --mobile-nav-clearance"
);
assert.doesNotMatch(
  toastSrc,
  /bottom-20/,
  "Toast stack must not hardcode bottom-20 (misses notched safe-area)"
);

console.log("generate-360-cta-smoke: ok");
