import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const wall = source("components/HomeViralWall.tsx");
const landing = source("components/LandingToolPanel.tsx");
const sellerSteps = source("components/SellerPackSteps.tsx");
const batch = source("components/BatchStudio.tsx");
const createPage = source("app/create/page.tsx");
const video = source("components/AutoPlayVideo.tsx");
const zh = source("lib/i18n.ts");

assert.match(
  wall,
  /href=\{`\/create\?effect=\$\{recipeSlug\}`\}/,
  "home Recipe cards must open Create with the selected effect"
);
assert.match(
  wall,
  /data-recipe-card=\{recipeSlug\}[\s\S]*Use this recipe/,
  "home Recipe cards must expose the one-click Remix contract"
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

console.log("mobile proof regression: source contracts PASS");
