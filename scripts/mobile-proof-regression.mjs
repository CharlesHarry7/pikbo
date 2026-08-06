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
}
// AIT-371: Home proof-wall / rail content pad under HomeBrowseCta
{
  const globals = source("app/globals.css");
  const home = source("app/page.tsx");
  const browseCta = source("components/HomeBrowseCta.tsx");
  assert.match(
    globals,
    /--home-browse-cta-pad:\s*calc\(/,
    "globals must define --home-browse-cta-pad for Home last-fold clearance"
  );
  assert.match(
    globals,
    /var\(--home-browse-cta-h\)\s*\+\s*var\(--floating-cta-safe-bottom\)/,
    "--home-browse-cta-pad must stack on --floating-cta-safe-bottom"
  );
  assert.match(
    home,
    /data-home-content-pad=["']home-browse-cta["']/,
    "Home shell must mark content pad under HomeBrowseCta"
  );
  assert.match(
    home,
    /pb-\[var\(--home-browse-cta-pad\)\]/,
    "Home wall/rail must use --home-browse-cta-pad (not bare pb-28)"
  );
  assert.doesNotMatch(
    home,
    /\bpb-28\b/,
    "Home must not residual bare pb-28 under floating Generate"
  );
  assert.match(
    browseCta,
    /bottom-\[var\(--floating-cta-safe-bottom\)\]/,
    "HomeBrowseCta still parks on --floating-cta-safe-bottom"
  );
  assert.match(
    browseCta,
    /createGenerate360Href\(["']home-browse["']\)/,
    "HomeBrowseCta Generate→360 deep-link honesty preserved"
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

console.log("mobile proof regression: source contracts PASS");
