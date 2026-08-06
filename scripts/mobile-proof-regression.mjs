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
  /cardHref|projectHref|item\.projectHref/,
  "home Recipe cards must open the registered Inside Project proof"
);
assert.match(
  wall,
  /remakeHref|item\.href[\s\S]*Try this recipe|Try this recipe[\s\S]*remakeHref/,
  "home Recipe cards must expose a separate one-click Remix contract"
);
assert.match(
  wall,
  /home-proof-wall/,
  "home Recipe remake links must carry home-proof-wall entry attribution"
);
assert.match(
  wall,
  /data-home-proof-360/,
  "home proof wall must mark the 360 listing spin card for mobile visibility"
);
{
  const softLaunch = source("lib/softLaunch.ts");
  const proofList =
    softLaunch.match(/HOME_PROOF_SLUGS\s*=\s*\[([\s\S]*?)\]\s*as const/)?.[1] ??
    "";
  const proofSlugs = [...proofList.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  assert.equal(proofSlugs.length, 8, "home proof wall stays capped at 8 Lab clips");
  assert.ok(
    proofSlugs.slice(0, 4).includes("360-spin-showcase"),
    "360-spin-showcase must be in the first 4 mobile wall slots"
  );
}
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
  /const hideMobileNav\s*=\s*resultShell\s*\|\|\s*fixedMomentEntry\s*\|\|\s*sellerPackCreate/,
  "Home / fixed Moment / Seller Pack hide the five-item mobile nav under sticky primaries"
);
assert.match(
  shell,
  /!hideMobileNav\s*\?\s*(?:\(|\s*<nav)/,
  "Mobile nav gate must use hideMobileNav (not a partial sellerPack-only check)"
);
assert.match(
  shell,
  /data-mobile-nav=["']primary["']/,
  "Primary mobile nav marker remains for safe-area / clearance smoke"
);
// AIT-517: AppShell residual carnival neon → gallery-calm copper
assert.doesNotMatch(
  shell,
  /#B14EFF|#FF4ECD|255\s*,\s*78\s*,\s*205|177\s*,\s*78\s*,\s*255/i,
  "AppShell must not hard-code carnival neon (#B14EFF / #FF4ECD)"
);
assert.match(
  shell,
  /var\(--brand\)/,
  "AppShell mobile active state uses copper --brand token"
);
assert.match(
  shell,
  /var\(--grad-cta\)/,
  "AppShell filled CTAs use copper --grad-cta token"
);
// AIT-537: LanguageSwitcher residual competitor lime → gallery-calm copper
{
  const languageSwitcher = source("components/LanguageSwitcher.tsx");
  assert.doesNotMatch(
    languageSwitcher,
    /#c8ff3d|c8ff3d|200\s*,\s*255\s*,\s*61/i,
    "LanguageSwitcher must not hard-code competitor lime (#c8ff3d / rgba 200,255,61)"
  );
  assert.match(
    languageSwitcher,
    /var\(--brand\)/,
    "LanguageSwitcher active locale uses copper --brand token"
  );
}
{
  const toast = source("components/Toast.tsx");
  assert.match(
    toast,
    /bottom-\[calc\(var\(--mobile-nav-clearance\)\+0\.5rem\)\]/,
    "Toast stack clears mobile nav + safe-area (AIT-185)"
  );
  assert.doesNotMatch(
    toast,
    /bottom-20/,
    "Toast must not hardcode bottom-20 under notched home indicator"
  );
  // AIT-374: residual competitor lime → neon-pink / void board
  assert.doesNotMatch(
    toast,
    /#c8ff3d|c8ff3d|200\s*,\s*255\s*,\s*61/,
    "Toast must not hard-code competitor lime (#c8ff3d / rgba 200,255,61)"
  );
  assert.match(
    toast,
    /var\(--neon-pink\)/,
    "Toast chrome uses neon-pink board token"
  );
  assert.match(
    toast,
    /rgba\(255,\s*78,\s*205/,
    "Toast glow uses neon-pink board rgba"
  );
}
{
  // AIT-394: MobileGenerateBar floating Generate primary CTA off residual lime
  const mobileBar = source("components/MobileGenerateBar.tsx");
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
}
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

// AIT-40: Studio open Lab path remains mobile-safe (sticky CTA + finite open)
const studio = source("components/CreateStudio.tsx");
const gate = source("components/GuestMomentCreateGate.tsx");
assert.match(
  studio,
  /data-create-sticky="mobile"/,
  "Create mobile sticky bar must remain for open/Lab CTA"
);
assert.match(
  studio,
  /data-lab-sample-retry|data-studio-open-retry/,
  "Create must expose retry after Lab/open failure on mobile-capable UI"
);
assert.match(
  gate,
  /errorRetry/,
  "Guest Create Lab video must enable errorRetry for honest mobile recovery"
);


// AIT-383: content under sticky Generate + MobileGenerateBar uses shared pad tokens
{
  const globals = source("app/globals.css");
  assert.match(
    globals,
    /--sticky-generate-pad:\s*calc\(/,
    "globals content pad stacks sticky chrome + mobile-nav-clearance"
  );
  assert.match(
    globals,
    /--sticky-generate-pad-safe:\s*calc\(/,
    "globals nav-less content pad stacks sticky chrome + floating-cta-safe-bottom"
  );
  assert.match(
    globals,
    /--mobile-generate-bar-pad:\s*calc\(/,
    "Library/browse last rows clear MobileGenerateBar via pad token"
  );
  const studioSrc = source("components/CreateStudio.tsx");
  assert.match(
    studioSrc,
    /pb-\[var\(--sticky-generate-pad-safe\)\]|pb-\[var\(--sticky-generate-pad\)\]/,
    "CreateStudio content pad must use sticky-generate pad tokens"
  );
  assert.doesNotMatch(
    studioSrc,
    /\bpb-36\b|\bpb-32\b/,
    "CreateStudio must not bare pb-32/pb-36 under sticky Generate"
  );
  const cinemaSrc = source("app/cinema/page.tsx");
  assert.match(
    cinemaSrc,
    /pb-\[var\(--sticky-generate-pad\)\]/,
    "cinema content pad must use sticky-generate pad token"
  );
  assert.doesNotMatch(
    cinemaSrc,
    /className="[^"]*\bpb-28\b/,
    "cinema must not bare pb-28 under sticky Generate"
  );
  const modulesSrc = source("app/modules/page.tsx");
  assert.match(
    modulesSrc,
    /pb-\[var\(--sticky-generate-pad\)\]/,
    "Modules content pad must use sticky-generate pad token"
  );
  for (const [file, markerName] of [
    ["app/explore/page.tsx", "data-explore-content-pad"],
    ["app/flow/page.tsx", "data-flow-content-pad"],
    ["app/effects/page.tsx", "data-effects-content-pad"],
    ["app/community/page.tsx", "data-community-content-pad"],
    ["app/library/page.tsx", "data-library-content-pad"],
  ]) {
    const page = source(file);
    assert.match(
      page,
      /pb-\[var\(--mobile-generate-bar-pad\)\]/,
      `${file} must use --mobile-generate-bar-pad (not bare pb-24/28)`
    );
    assert.match(
      page,
      new RegExp(`${markerName}=["']mobile-generate-bar["']`),
      `${file} must expose ${markerName} smoke marker`
    );
    assert.doesNotMatch(
      page,
      /className="[^"]*\bpb-(?:24|28)\b/,
      `${file} must not bare pb-24/pb-28 under MobileGenerateBar`
    );
  }
}

console.log("mobile proof regression: source contracts PASS");
