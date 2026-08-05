import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const wall = source("components/HomeViralWall.tsx");
const landing = source("components/LandingToolPanel.tsx");
const batch = source("components/BatchStudio.tsx");
const createPage = source("app/create/page.tsx");
const shell = source("components/AppShell.tsx");
const video = source("components/AutoPlayVideo.tsx");
const zh = source("lib/i18n.ts");

assert.match(
  wall,
  /href=\{item\.projectHref \|\| item\.href\}/,
  "home Recipe cards must open the registered Inside Project proof"
);
assert.match(
  wall,
  /href=\{item\.href\}[\s\S]*Try this recipe/,
  "home Recipe cards must expose a separate one-click Remix contract"
);
assert.match(
  wall,
  /event:\s*item\.projectHref \? "project_open" : "recipe_use"[\s\S]*source:\s*"home_recipe_card"/,
  "home Recipe proof clicks must preserve project or fallback conversion analytics"
);
assert.match(
  wall,
  /event:\s*"recipe_use"[\s\S]*source:\s*"home_recipe_remake"/,
  "home Recipe CTA clicks must preserve remix conversion analytics"
);

assert.match(
  landing,
  /const demoMode = !canLiveGenerate\(session\)/,
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
  batch,
  /const demoMode = !privateLaunchEnabled \|\| labStill/,
  "Launch Workspace must keep the authoritative fail-closed public mode"
);
assert.match(
  createPage,
  /<CreateStudio[\s\S]*initialEffect=["']street-power-up["'][\s\S]*fixedMomentContract/,
  "Create must mount the fixed Street Power-Up Moment contract"
);
assert.doesNotMatch(
  createPage,
  /BatchStudio|PrivateSellerPackGate|initialRecoverPackRunId|recoverPackRunId/,
  "Create must not expose the retired Seller Pack workspace"
);
assert.match(batch, /Public Lab preview · no product photo is accepted or processed · 0\s*credits/);
assert.doesNotMatch(
  batch,
  /SellerPackSteps/,
  "Launch Workspace must not restore the rejected mobile SaaS stepper"
);
assert.match(
  shell,
  /const fixedMomentEntry\s*=\s*create\s*&&\s*searchParams\.get\(["']mode["']\)\s*===\s*["']moment["']\s*&&\s*searchParams\.get\(["']effect["']\)\s*===\s*["']street-power-up["']/,
  "fixed Moment entry must match real MOMENT_CREATE_HREF (mode=moment&effect=street-power-up)"
);
assert.match(
  shell,
  /const hideMobileNav\s*=\s*fixedMomentEntry\s*\|\|\s*momentCreate\s*\|\|\s*sellerPackCreate/,
  "mobile nav must hide on fixed Moment entry, ?moment= Create, and Seller Pack"
);
assert.match(
  shell,
  /\{!hideMobileNav \? \(/,
  "fixed Moment and Seller Pack Create must not stack the five-item mobile nav under their primary action"
);
assert.match(
  shell,
  /data-mobile-nav=\{home \? "home-moment" : "default"\}/,
  "Home must keep a Moment-styled mobile bottom nav"
);
assert.match(
  shell,
  /home\s*\?\s*"relative border-white\/10 bg-\[#08080A\]\/96"/,
  "Home mobile bottom nav must use dark Moment chrome, not light legacy chrome"
);
assert.doesNotMatch(
  shell,
  /home[\s\S]{0,80}border-\[#D4D8E0\] bg-\[#F7F8FA\]/,
  "Home mobile bottom nav must not keep the light gray chrome residual"
);
assert.doesNotMatch(
  shell,
  /home[\s\S]{0,120}text-\[#2457E6\]/,
  "Home mobile bottom nav must not keep the blue active residual"
);
assert.doesNotMatch(
  shell,
  /\{!momentCreate && !sellerPackCreate/,
  "mobile nav hide condition must not omit fixedMomentEntry (real MOMENT_CREATE_HREF)"
);
assert.doesNotMatch(
  zh,
  /job\.seller\.blurb":\s*"[^"]*实时生成 30 积分/,
  "localized first-run card must not advertise a Live pack unconditionally"
);

assert.match(
  createPage,
  /<h1\b[\s\S]*Turn one toy photo into Street Power-Up\./,
  "single Create needs an accessible Moment page heading"
);
assert.match(
  video,
  /matchMedia\("\(max-width: 768px\)"\)\.matches \? 1 : 2/,
  "autoplay budget must remain one mobile / two desktop"
);

console.log("mobile proof regression: source contracts PASS");
