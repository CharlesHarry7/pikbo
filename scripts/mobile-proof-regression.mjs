import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";

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
const home = source("app/page.tsx");
const hero = source("components/HomeCinemaHero.tsx");
const demos = source("lib/demoVideos.ts");

const firstEightPosterPaths = [
  ...demos.matchAll(/poster:\s*"([^"]+)"/g),
]
  .slice(0, 8)
  .map((match) => match[1]);

assert.equal(
  firstEightPosterPaths.length,
  8,
  "homepage proof registry must expose eight poster paths"
);
assert.equal(
  new Set(firstEightPosterPaths).size,
  8,
  "homepage proof cards must use eight unique poster files"
);
assert.ok(
  firstEightPosterPaths.every((poster) =>
    poster.startsWith("/demos/posters/")
  ),
  "homepage proof posters must come from the per-demo poster directory"
);

const posterHashes = firstEightPosterPaths.map((poster) => {
  const diskPath = new URL(`../public${poster}`, import.meta.url);
  assert.equal(existsSync(diskPath), true, `${poster} must exist`);
  assert.ok(statSync(diskPath).size <= 200_000, `${poster} must stay <= 200KB`);
  return createHash("sha256").update(readFileSync(diskPath)).digest("hex");
});

assert.equal(
  new Set(posterHashes).size,
  8,
  "homepage proof posters must have eight unique file hashes"
);
assert.match(
  demos,
  /HOME_HERO_DEMO_ID = "beatbot-unboxed"/,
  "homepage hero must use the reviewed landscape Beatbot demo"
);
assert.match(
  hero,
  /relative aspect-video w-full[\s\S]*lg:absolute lg:inset-0/,
  "mobile and tablet hero media must stay in normal flow until the desktop breakpoint"
);
assert.match(
  hero,
  /pb-\[calc\(5\.5rem\+env\(safe-area-inset-bottom\)\)\][\s\S]*lg:min-h-/,
  "mobile hero content must reserve bottom-navigation space without full-screen bottom alignment"
);
assert.match(
  home,
  /data-launch-pack-proof="cached-format-trio"/,
  "Launch Pack must expose the honest cached-format proof contract"
);
assert.match(
  home,
  /different cached Pikbo Lab[\s\S]*not one customer Launch Pack/,
  "Launch Pack proof must disclose that the three examples are different toys"
);
assert.doesNotMatch(
  [home, hero].join("\n"),
  /One toy photo → three launch assets|one toy workflow/,
  "different cached demos must not be presented as one real SKU output"
);

assert.match(
  wall,
  /href=\{item\.projectHref \|\| item\.href\}/,
  "home Recipe cards must open the registered Inside Project proof"
);
assert.match(
  wall,
  /href=\{item\.href\}[\s\S]*Use this recipe/,
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
