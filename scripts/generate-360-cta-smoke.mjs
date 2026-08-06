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

// 5. AIT-413 / gallery-calm — home→360 one primary Generate (not floating browse)
const globalsCss = read("app/globals.css");
const layoutSrc = read("app/layout.tsx");
const homePage = read("app/page.tsx");
const homeHero = read("components/HomeCinemaHero.tsx");
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
// Gallery-calm home: hero dual doors + designer gallery (no HomeBrowseCta remount)
assert.match(
  homePage,
  /<HomeCinemaHero \/>/,
  "gallery-calm home must mount HomeCinemaHero"
);
assert.doesNotMatch(
  homePage,
  /HomeBrowseCta/,
  "gallery-calm home must not remount floating HomeBrowseCta"
);
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
  /data-home-hero-still-generate=["']360["']/,
  "home hero still must be a Generate 360 door (reduce home→360 clicks)"
);
const homeTrust = read("components/HomeTrustFooter.tsx");
assert.match(
  homeTrust,
  /createGenerate360Href\(\s*["']home-trust["']\s*\)/,
  "home trust footer must deep-link Generate 360"
);
assert.match(
  homeTrust,
  /data-home-trust-generate=["']360["']/,
  "home trust footer must mark last-fold Generate 360 CTA"
);
const galleryLib = read("lib/designerToyGallery.ts");
assert.match(
  galleryLib,
  /createGenerate360Href\(\s*["']home-gallery-pedestal["']\s*\)/,
  "gallery pedestal must deep-link Generate 360 (skip /effects hop)"
);
assert.doesNotMatch(
  galleryLib,
  /href:\s*["']\/effects\/360-spin-showcase["']/,
  "gallery must not send listing pedestal through /effects first"
);
assert.match(
  homeHero,
  /Generate 360° listing spin/,
  "home hero 360 CTA must be result-first (listing spin)"
);
assert.match(
  homeHero,
  /data-home-moment-cta/,
  "home hero Moment product CTA remains"
);
assert.equal(
  (homeHero.match(/data-home-moment-cta/g) || []).length,
  1,
  "home hero must keep exactly one Moment CTA"
);
assert.equal(
  (homeHero.match(/data-home-hero-360-cta/g) || []).length,
  1,
  "home hero must keep exactly one Generate 360 primary CTA"
);
assert.match(
  homeHero,
  /data-home-hero-doors=["']fold["']/,
  "home hero must mark the dual-door fold column"
);
assert.match(
  homeHero,
  /data-home-hero-doors=["']fold["'][\s\S]*data-home-hero-360-cta[\s\S]*data-home-moment-cta/,
  "Generate 360 primary + Moment secondary must sit together in the fold column"
);
assert.match(
  homeHero,
  /data-home-primary-generate=["']360["']/,
  "home hero must mark primary Generate as 360"
);
// HomeBrowseCta module still honest off-home (Explore/Lab reuse)
assert.match(
  browseCta,
  /createGenerate360Href\(["']home-browse["']\)/,
  "HomeBrowseCta module must deep-link Generate→360 via home-browse source"
);
assert.match(
  browseCta,
  /bottom-\[var\(--floating-cta-safe-bottom\)\]/,
  "HomeBrowseCta must use safe-area bottom token when mounted"
);

assert.match(
  browseCta,
  /z-\[var\(--floating-generate-z\)\]/,
  "HomeBrowseCta floating Generate must use --floating-generate-z"
);
assert.doesNotMatch(
  browseCta,
  /bottom-\[4\.75rem\]/,
  "HomeBrowseCta must not hardcode bare 4.75rem (double-counts nav when home has none)"
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
// AIT-413 / AIT-462: shell on Home is one primary Generate→360 (nav + sticky)
assert.match(
  appShellSrc,
  /createGenerate360Href\(\s*["']app-shell-home["']\s*\)/,
  "AppShell home sticky CTA must use createGenerate360Href(app-shell-home)"
);
assert.match(
  appShellSrc,
  /data-app-shell-home-generate=\{home \? ["']360["']/,
  "AppShell must mark home sticky Generate as 360"
);
assert.match(
  appShellSrc,
  /home \? HOME_SHELL_GENERATE_HREF/,
  "AppShell home filled CTA must deep-link Generate workbench"
);
assert.match(
  appShellSrc,
  /data-home-primary-nav=\{motionChrome \? ["']generate-360["']/,
  "AppShell home primary nav must mark generate-360 money door"
);
assert.match(
  appShellSrc,
  /href:\s*HOME_SHELL_GENERATE_HREF[\s\S]*label:\s*["']Generate["']/,
  "AppShell home primary nav Create slot must be Generate→360"
);
assert.match(
  appShellSrc,
  /data-primary-create-href=\{\s*motionChrome\s*\?\s*HOME_SHELL_GENERATE_HREF\s*:\s*PRIMARY_NAV_CREATE_HREF\s*\}/,
  "AppShell home data-primary-create-href must point at Generate→360"
);
assert.doesNotMatch(
  appShellSrc,
  /motionChrome\s*\?\s*DEFAULT_MOMENT_CREATE_HREF\s*:\s*PRIMARY_NAV_CREATE_HREF/,
  "AppShell home must not keep Moment as primary-create-href"
);
assert.doesNotMatch(
  appShellSrc,
  /home \? ["']Try Street Power-Up["']|home \? ["']Create my drop clip["']/,
  "AppShell home sticky must not remain Moment-only copy"
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

// AIT-517: AppShell residual carnival neon → gallery-calm copper board tokens
assert.doesNotMatch(
  appShellSrc,
  /#B14EFF|#FF4ECD|255\s*,\s*78\s*,\s*205|177\s*,\s*78\s*,\s*255/i,
  "AppShell must not hard-code carnival neon (#B14EFF / #FF4ECD)"
);
assert.match(
  appShellSrc,
  /var\(--grad-cta\)/,
  "AppShell primary CTAs use --grad-cta copper board gradient"
);
assert.match(
  appShellSrc,
  /var\(--brand\)/,
  "AppShell active rails + mobile nav use --brand copper accent"
);
assert.match(
  appShellSrc,
  /rgba\(196\s*,\s*165\s*,\s*116/,
  "AppShell chrome glows use copper board rgba(196,165,116)"
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
// AIT-374: Toast residual competitor lime → neon-pink / void board tokens
assert.doesNotMatch(
  toastSrc,
  /#c8ff3d|c8ff3d|200\s*,\s*255\s*,\s*61/,
  "Toast must not hard-code competitor lime (#c8ff3d / rgba 200,255,61)"
);
assert.match(
  toastSrc,
  /var\(--neon-pink\)/,
  "Toast chrome uses neon-pink board token"
);
assert.match(
  toastSrc,
  /var\(--void\)/,
  "Toast surface uses void board token"
);
assert.match(
  toastSrc,
  /rgba\(255,\s*78,\s*205/,
  "Toast glow uses neon-pink board rgba"
);

// 9. AIT-383 — sticky Generate content pads (Create/Modules/cinema/Batch) + browse bar pads
{
  const globals = read("app/globals.css");
  assert.match(
    globals,
    /--sticky-generate-pad:\s*calc\(/,
    "globals must define --sticky-generate-pad (chrome + mobile-nav-clearance)"
  );
  assert.match(
    globals,
    /--sticky-generate-pad-safe:\s*calc\(/,
    "globals must define --sticky-generate-pad-safe (chrome + floating-cta-safe-bottom)"
  );
  assert.match(
    globals,
    /--mobile-generate-bar-pad:\s*calc\(/,
    "globals must define --mobile-generate-bar-pad for browse last-row clearance"
  );
  assert.match(
    globals,
    /--mobile-nav-clearance:\s*calc\(/,
    "globals must define --mobile-nav-clearance (bar pad stacks tab + safe-area)"
  );

  assert.match(
    createStudio,
    /pb-\[var\(--sticky-generate-pad-safe\)\]/,
    "CreateStudio fixed Moment content pad must use --sticky-generate-pad-safe"
  );
  assert.match(
    createStudio,
    /pb-\[var\(--sticky-generate-pad\)\]/,
    "CreateStudio tab-sharing content pad must use --sticky-generate-pad"
  );
  assert.match(
    createStudio,
    /data-create-content-pad=\{/,
    "CreateStudio content pad branch must be smoke-visible"
  );
  assert.doesNotMatch(
    createStudio,
    /\bpb-36\b|\bpb-32\b/,
    "CreateStudio must not bare pb-32/pb-36 under sticky Generate"
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

  assert.match(
    batchStudio,
    /isSellerPack\s*\?[\s\S]{0,320}pb-\[var\(--sticky-generate-pad-safe\)\]/,
    "nav-less Seller Pack content pad must use --sticky-generate-pad-safe"
  );
  assert.match(
    batchStudio,
    /data-batch-content-pad=\{\s*isSellerPack\s*\?\s*["']safe-bottom["']\s*:\s*["']mobile-nav["']\s*\}/,
    "BatchStudio content pad branch must be smoke-visible"
  );
  assert.doesNotMatch(
    batchStudio,
    /className=\{\s*[\s\S]{0,80}\bpb-32\b|\bpb-36\b/,
    "BatchStudio content pad must not hardcode bare pb-32 / pb-36"
  );

  const libraryPage = read("app/library/page.tsx");
  const modulesPage = read("app/modules/page.tsx");
  assert.match(
    libraryPage,
    /pb-\[var\(--mobile-generate-bar-pad\)\]/,
    "Library content must clear MobileGenerateBar + tab via --mobile-generate-bar-pad"
  );
  assert.match(
    libraryPage,
    /data-library-content-pad=["']mobile-generate-bar["']/,
    "Library content pad must expose smoke marker"
  );
  assert.match(
    modulesPage,
    /pb-\[var\(--sticky-generate-pad\)\]/,
    "Modules shelf content must clear ModulesMobileCta sticky via --sticky-generate-pad"
  );
  assert.match(
    modulesPage,
    /data-modules-content-pad=["']sticky-generate["']/,
    "Modules content pad must expose smoke marker"
  );

  assert.match(
    cinemaPage,
    /pb-\[var\(--sticky-generate-pad\)\]/,
    "cinema content must clear sticky Generate via --sticky-generate-pad"
  );
  assert.match(
    cinemaPage,
    /data-cinema-content-pad=["']sticky-generate["']/,
    "cinema content pad must expose smoke marker"
  );
  assert.doesNotMatch(
    cinemaPage,
    /className="[^"]*\bpb-28\b/,
    "cinema shell must not use bare pb-28 under sticky chrome"
  );

  const browseBarPadRoutes = [
    ["app/explore/page.tsx", "explore"],
    ["app/flow/page.tsx", "flow"],
    ["app/effects/page.tsx", "effects"],
    ["app/community/page.tsx", "community"],
    ["app/library/page.tsx", "library"],
    ["app/apps/page.tsx", "apps"],
    ["app/models/page.tsx", "models"],
    ["app/pricing/page.tsx", "pricing"],
    ["app/profile/page.tsx", "profile"],
    ["app/status/page.tsx", "status"],
    ["app/login/page.tsx", "login"],
  ];
  for (const [file, key] of browseBarPadRoutes) {
    const src = read(file);
    assert.match(
      src,
      /pb-\[var\(--mobile-generate-bar-pad\)\]/,
      `${file} must clear MobileGenerateBar + tab via --mobile-generate-bar-pad`
    );
    assert.match(
      src,
      new RegExp(`data-${key}-content-pad=["']mobile-generate-bar["']`),
      `${file} content pad must expose smoke marker data-${key}-content-pad`
    );
    assert.doesNotMatch(
      src,
      /className="[^"]*\bpb-(?:24|28)\b/,
      `${file} shell must not use bare pb-24 / pb-28 under MobileGenerateBar`
    );
    assert.doesNotMatch(
      src,
      /className=\{\s*`[^`]*\bpb-(?:24|28)\b/,
      `${file} shell template must not bare pb-24 / pb-28 under MobileGenerateBar`
    );
  }
}

// 10. AIT-394 / AIT-417 — MobileGenerateBar floating Generate primary CTA off residual lime
assert.doesNotMatch(
  mobileBar,
  /#c8ff3d|c8ff3d|200\s*,\s*255\s*,\s*61/,
  "MobileGenerateBar must not hard-code competitor lime (#c8ff3d / rgba 200,255,61)"
);
assert.match(
  mobileBar,
  /rgba\(255,\s*78,\s*205/,
  "MobileGenerateBar Generate CTA glow uses neon-pink board rgba"
);
assert.match(
  mobileBar,
  /btn-primary/,
  "MobileGenerateBar Generate keeps btn-primary (board fill)"
);

// AIT-517: shared ui/button residual carnival neon → gallery-calm copper
const buttonSrc = read("components/ui/button.tsx");
assert.doesNotMatch(
  buttonSrc,
  /#B14EFF|#FF4ECD|255\s*,\s*78\s*,\s*205|177\s*,\s*78\s*,\s*255/i,
  "ui/button must not hard-code carnival neon (#B14EFF / #FF4ECD)"
);
assert.match(
  buttonSrc,
  /var\(--grad-cta\)/,
  "ui/button default variant uses --grad-cta copper board gradient"
);
assert.match(
  buttonSrc,
  /rgba\(196\s*,\s*165\s*,\s*116/,
  "ui/button default glow uses copper board rgba(196,165,116)"
);
assert.match(
  buttonSrc,
  /var\(--primary-foreground\)/,
  "ui/button primary text uses --primary-foreground on copper CTAs"
);

// AIT-517: SoftLaunchStrip residual competitor lime → gallery-calm copper
const softLaunchSrc = read("components/SoftLaunchStrip.tsx");
assert.doesNotMatch(
  softLaunchSrc,
  /#c8ff3d|c8ff3d|200\s*,\s*255\s*,\s*61/i,
  "SoftLaunchStrip must not hard-code competitor lime (#c8ff3d / rgba 200,255,61)"
);
assert.match(
  softLaunchSrc,
  /var\(--brand\)/,
  "SoftLaunchStrip chips/CTAs use --brand copper accent"
);
assert.match(
  softLaunchSrc,
  /rgba\(196\s*,\s*165\s*,\s*116/,
  "SoftLaunchStrip CTA glow uses copper board rgba(196,165,116)"
);

// AIT-572: LoginForm residual carnival pink email focus → gallery-calm copper board
{
  const loginForm = read("components/LoginForm.tsx");
  assert.doesNotMatch(
    loginForm,
    /#c8ff3d|c8ff3d|200\s*,\s*255\s*,\s*61/i,
    "LoginForm must not hard-code competitor lime (#c8ff3d / rgba 200,255,61)"
  );
  assert.doesNotMatch(
    loginForm,
    /#B14EFF|#FF4ECD|255\s*,\s*78\s*,\s*205|177\s*,\s*78\s*,\s*255/i,
    "LoginForm must not hard-code carnival pink RGB (#FF4ECD / rgba 255,78,205)"
  );
  assert.doesNotMatch(
    loginForm,
    /var\(--neon-pink\)/,
    "LoginForm email focus must prefer --brand over --neon-pink naming"
  );
  assert.match(
    loginForm,
    /var\(--brand\)/,
    "LoginForm email focus border uses --brand copper accent"
  );
  assert.match(
    loginForm,
    /rgba\(196\s*,\s*165\s*,\s*116/,
    "LoginForm email focus glow uses copper board rgba(196,165,116)"
  );
}

console.log("generate-360-cta-smoke: ok");
