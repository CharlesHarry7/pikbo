import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const wall = source("components/HomeViralWall.tsx");
const projects = source("components/HomeProjectsExplore.tsx");
const shell = source("components/AppShell.tsx");
const libraryPage = source("app/library/page.tsx");
const libraryGrid = source("components/LibraryGrid.tsx");
const css = source("app/globals.css");
const landing = source("components/LandingToolPanel.tsx");
const sellerSteps = source("components/SellerPackSteps.tsx");
const batch = source("components/BatchStudio.tsx");
const createPage = source("app/create/page.tsx");
const video = source("components/AutoPlayVideo.tsx");
const zh = source("lib/i18n.ts");

assert.match(
  wall,
  /href=\{item\.detailHref \|\|/,
  "home Recipe cards must open the reusable Recipe detail"
);
assert.ok(wall.includes("`/effects/${recipeSlug}`"));
assert.match(
  wall,
  /data-home-card-destination="recipe"/,
  "home Recipe cards must declare Recipe semantics"
);
assert.match(
  wall,
  /href=\{item\.href\}[\s\S]*Use this recipe/,
  "home Recipe cards must expose a separate one-click Create contract"
);
assert.match(
  wall,
  /event:\s*"recipe_open"[\s\S]*source:\s*"home_recipe_card"/,
  "home Recipe detail clicks must preserve Recipe-open analytics"
);
assert.match(
  wall,
  /event:\s*"recipe_use"[\s\S]*source:\s*"home_recipe_remake"/,
  "home Recipe CTA clicks must preserve remix conversion analytics"
);
assert.match(
  projects,
  /href=\{p\.detailHref\}[\s\S]*data-home-project-destination="project"/,
  "home Project cards must open input/output/evidence details"
);
assert.match(
  projects,
  /href=\{p\.remakeHref\}[\s\S]*data-home-project-destination="create"/,
  "home Projects must keep a separate Create path"
);

assert.match(
  landing,
  /const demoMode = !session \|\| isDemoMode\(session\)/,
  "landing tools must fail closed while capability is unknown"
);
assert.match(
  landing,
  /0 credits · your upload is not processed in this preview/,
  "cached landing path must state cost and upload handling"
);
assert.doesNotMatch(
  landing,
  /Upload a toy photo → Generate\. Live Mini often/,
  "cached landing empty state must not promise an unconditional Live job"
);

assert.match(
  sellerSteps,
  /demoMode\s*\?\s*"3 cached prototype previews · 0 credits"/,
  "Seller Pack steps must render the cached quote from demoMode"
);
assert.match(
  batch,
  /<SellerPackSteps step=\{sellerStep\} demoMode=\{demoMode\} \/>/,
  "Seller Pack must pass the authoritative fail-closed mode into its steps"
);
assert.doesNotMatch(
  zh,
  /job\.seller\.blurb":\s*"[^"]*实时生成 30 积分/,
  "localized first-run card must not advertise a Live pack unconditionally"
);

assert.match(
  createPage,
  /<h1 className="sr-only">Generate toy video from one owned photo<\/h1>/,
  "single Create needs an accessible page heading"
);
assert.match(
  video,
  /matchMedia\("\(max-width: 768px\)"\)\.matches \? 1 : 2/,
  "autoplay budget must remain one mobile / two desktop"
);
assert.match(
  video,
  /prefers-reduced-motion: reduce[\s\S]*addEventListener\("change", sync\)/,
  "reduced-motion changes must reactively stop autoplay"
);
assert.match(
  video,
  /function prefersReducedMotion\(\)[\s\S]*reducedMotion \|\| prefersReducedMotion\(\)/,
  "first hydration pass must synchronously honor reduced motion"
);
assert.match(shell, /grid-cols-5/);
assert.match(shell, /const central = item\.id === "generate"/);
assert.match([libraryPage, libraryGrid].join("\n"), /Local to this device/);
assert.match(css, /html\s*\{[\s\S]*overflow-x:\s*clip/);
assert.match(css, /body\s*\{[\s\S]*overflow-x:\s*clip/);

console.log("mobile proof regression: source contracts PASS");
