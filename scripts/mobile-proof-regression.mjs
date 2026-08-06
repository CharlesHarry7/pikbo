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
// AIT-145: BatchStudio nav-less Seller Pack sticky/content pad (AIT-141/144 parity)
assert.match(
  batch,
  /isSellerPack\s*\?\s*["'][^"']*bottom-\[var\(--floating-cta-safe-bottom\)\]/,
  "nav-less Seller Pack sticky must sit on --floating-cta-safe-bottom (no ghost tab gap)"
);
assert.match(
  batch,
  /data-batch-sticky-clearance=\{\s*isSellerPack\s*\?\s*["']safe-bottom["']\s*:\s*["']mobile-nav["']\s*\}/,
  "Batch sticky clearance branch must be smoke-visible"
);
assert.match(
  batch,
  /isSellerPack\s*\?[\s\S]{0,280}pb-\[var\(--create-content-pad-safe\)\]/,
  "nav-less Seller Pack content pad must use --create-content-pad-safe"
);
assert.match(
  batch,
  /data-batch-content-pad=\{\s*isSellerPack\s*\?\s*["']safe-bottom["']\s*:\s*["']mobile-nav["']\s*\}/,
  "Batch content pad branch must be smoke-visible"
);
// AIT-152: pair hideMobileNav with always-fixed-Moment Create sticky (AIT-141)
assert.match(
  shell,
  /const hideMobileNav\s*=\s*resultShell\s*\|\|\s*create/,
  "mobile nav must hide on resultShell (home/?moment=) and all /create (fixed Moment sticky)"
);
assert.match(
  shell,
  /const create\s*=\s*path\.startsWith\(["']\/create["']\)/,
  "create path must cover bare /create and non-entry Moment query URLs"
);
assert.doesNotMatch(
  shell,
  /const hideMobileNav\s*=\s*resultShell\s*\|\|\s*fixedMomentEntry\s*\|\|\s*sellerPackCreate/,
  "hideMobileNav must not regress to entry-only hide under sticky"
);
assert.match(
  shell,
  /\{!hideMobileNav\s*\?\s*\(\s*\n\s*<nav/,
  "always-fixed-Moment Create must not stack the five-item mobile nav under sticky"
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

// AIT-40: Studio open Lab path remains mobile-safe (sticky CTA + finite open)
const studio = source("components/CreateStudio.tsx");
const gate = source("components/GuestMomentCreateGate.tsx");
assert.match(
  studio,
  /fixedMomentContract\s*\?\s*["'][^"']*bottom-\[var\(--floating-cta-safe-bottom\)\]/,
  "fixed Moment Create sticky must sit on --floating-cta-safe-bottom (no ghost tab gap)"
);
assert.match(
  studio,
  /data-create-sticky-clearance=\{\s*fixedMomentContract\s*\?\s*["']safe-bottom["']\s*:\s*["']mobile-nav["']\s*\}/,
  "Create sticky clearance branch must be smoke-visible"
);
assert.match(
  studio,
  /data-create-sticky="mobile"/,
  "Create mobile sticky bar must remain for open/Lab CTA"
);
// AIT-144: content inset clears sticky only on nav-less Moment (no tab-ghost pad)
assert.match(
  studio,
  /fixedMomentContract\s*\?[\s\S]{0,280}pb-\[var\(--create-content-pad-safe\)\]/,
  "fixed Moment Create content pad must use --create-content-pad-safe"
);
assert.match(
  studio,
  /data-create-content-pad=\{\s*fixedMomentContract\s*\?\s*["']safe-bottom["']\s*:\s*["']mobile-nav["']\s*\}/,
  "Create content pad branch must be smoke-visible"
);
assert.match(
  createPage,
  /data-create-shell-pad=["']sticky-only["']/,
  "fixed Moment Create page shell must drop tab-era bottom pad"
);
assert.doesNotMatch(
  createPage,
  /className="[^"]*\bpb-24\b/,
  "fixed Moment Create page className must not keep pb-24 tab-ghost under sticky"
);
// AIT-159: re-measure guest fold + sticky after full tab hide (AIT-152)
assert.match(
  gate,
  /data-guest-create-compact="mobile"/,
  "guest Create must keep AIT-134 compact chrome for ~390px first screen"
);
assert.match(
  gate,
  /data-guest-create-fold="navless"/,
  "guest Create fold must mark navless clearance after AIT-152 tab hide"
);
assert.match(
  studio,
  /data-create-sticky-fold=\{\s*fixedMomentContract\s*\?\s*["']navless["']\s*:\s*["']with-tab["']\s*\}/,
  "Create sticky fold marker must expose navless vs with-tab branch"
);
assert.match(
  createPage,
  /data-create-header=["']compact-mobile["']/,
  "fixed Moment Create header must stay compact on mobile for sticky primary above fold"
);
// AIT-171: private CreateStudio first-run — upload + sticky primary above fold
assert.match(
  createPage,
  /data-private-create-fold=["']upload-sticky["']/,
  "private Create page must declare upload+sticky above-fold intent"
);
assert.match(
  studio,
  /data-private-create-fold=\{\s*fixedMomentContract\s*\?\s*["']upload-sticky["']\s*:\s*undefined\s*\}/,
  "CreateStudio must mark private first-run fold path"
);
assert.match(
  studio,
  /data-first-run-path=\{fixedMomentContract\s*\?\s*["']compact["']\s*:\s*["']full["']\}/,
  "fixed Moment path chrome must be compact (no CD label stack)"
);
assert.match(
  studio,
  /data-mode-banner=\{fixedMomentContract\s*\?\s*["']moment-compact["']\s*:\s*["']default["']\}/,
  "fixed Moment mode banner must stay single-row compact on mobile"
);
assert.match(
  studio,
  /data-private-controls=\{[\s\S]*?fixedMomentContract\s*\?\s*["']above-fold["']/,
  "private controls column marked for above-fold spacing"
);
assert.match(
  studio,
  /data-upload-zone=\{\s*fixedMomentContract\s*\?\s*["']private-moment["']\s*:\s*["']default["']\s*\}/,
  "owned-photo upload zone marked for private Moment fold"
);
assert.match(
  studio,
  /min-h-\[118px\]/,
  "private Moment empty upload zone must be shorter than generic min-h-160"
);
assert.match(
  studio,
  /data-fixed-moment-format=["']compact["']/,
  "fixed validation format strip must be compact on first-run"
);
assert.match(
  studio,
  /data-private-create-sticky=\{\s*fixedMomentContract\s*\?\s*["']first-run["']\s*:\s*undefined\s*\}/,
  "sticky primary marked for private first-run fold"
);
assert.match(
  studio,
  /data-first-run-action=["']upload["']/,
  "private sticky must expose upload primary when no photo yet"
);
assert.match(
  studio,
  /pb-\[var\(--create-content-pad-safe\)\]/,
  "AIT-171 must keep sticky clearance via --create-content-pad-safe (no tab ghost)"
);
{
  const globals = source("app/globals.css");
  assert.match(
    globals,
    /--create-sticky-chrome-h:\s*5\.5rem/,
    "AIT-159 sticky chrome token must stay re-measured (no tab residual pad)"
  );
  assert.match(
    globals,
    /--create-content-pad-safe:\s*calc\(\s*var\(--create-sticky-chrome-h\)\s*\+\s*var\(--floating-cta-safe-bottom\)\s*\)/,
    "content pad must clear sticky chrome + floating-cta-safe-bottom only"
  );
}
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
