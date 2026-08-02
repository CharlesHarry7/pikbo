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
  /Access is confirmed inside the workspace[\s\S]*no credits until generation starts/i,
  "Launch Workspace header must remain truthful before account capability resolves"
);
assert.match(batch, /Public Lab preview · no product photo is accepted or processed · 0\s*credits/);
assert.doesNotMatch(
  batch,
  /SellerPackSteps/,
  "Launch Workspace must not restore the rejected mobile SaaS stepper"
);
assert.match(
  shell,
  /\{!sellerPackCreate \? <nav/,
  "Seller Pack Create must not stack the five-item mobile nav under its fixed primary action"
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
