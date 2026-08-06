import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const home = read("app/page.tsx");
const homeHero = read("components/HomeCinemaHero.tsx");
const homeWall = read("components/HomeViralWall.tsx");
const create = read("app/create/page.tsx");
const createStudio = read("components/CreateStudio.tsx");
const batch = read("components/BatchStudio.tsx");
const steps = read("components/SellerPackSteps.tsx");
const contract = read("lib/sellerPackContract.ts");
const packExport = read("lib/sellerPackExport.ts");
const shell = read("components/AppShell.tsx");
const softLaunchStrip = read("components/SoftLaunchStrip.tsx");
const hfExploreHome = read("components/HfExploreHome.tsx");
const freeTrialCta = read("components/FreeTrialCta.tsx");
const pricingCheckout = read("components/PricingCheckoutButton.tsx");
const pricing = read("app/pricing/page.tsx");
const pricingCards = read("components/PricingPlanCards.tsx");
const paywall = read("components/PaywallCard.tsx");
const libraryGrid = read("components/LibraryGrid.tsx");
const meClient = read("lib/meClient.ts");

// Public homepage: honest Street Power-Up Moment hero + capped Lab proof wall.
// Media is cached Lab sample only (not customer results / Pack archive).
assert.match(home, /<HomeCinemaHero \/>/);
assert.match(home, /<HomeViralWall/);
assert.match(home, /<HomeExploreRecipeRail/);
assert.match(home, /<HfProductRail/);
assert.match(home, /buildHomeShowcaseFeed/);
assert.doesNotMatch(home, /PublicLaunchPackSample/);
assert.match(homeHero, /data-home-hero=["']street-power-up["']/);
assert.match(homeWall, /data-home-wall=["']lab-proof["']/);
assert.match(homeWall, /HOME_PROOF_BADGE|home-proof-wall/);
assert.match(homeWall, /360-spin-showcase|data-home-proof-360/);
const homeExploreRail = read("components/HomeExploreRecipeRail.tsx");
assert.match(homeExploreRail, /data-home-explore-rail/);
assert.match(homeExploreRail, /createGenerate360Href/);
assert.match(homeExploreRail, /HOME_PROOF_BADGE|Lab · cached/);
assert.doesNotMatch(homeExploreRail, /data-home-moment-cta|Create my drop clip/);
assert.match(
  homeHero,
  /import\s*\{\s*MOMENT_CREATE_HREF\s*\}\s*from\s*["']@\/lib\/softLaunch["']/
);
assert.match(homeHero, /href=\{MOMENT_CREATE_HREF\}/);
assert.match(homeHero, /Create my drop clip/);
assert.match(homeHero, /data-home-moment-cta/);
assert.equal(
  (homeHero.match(/data-home-moment-cta/g) || []).length,
  1,
  "home hero must expose exactly one primary Moment CTA"
);
assert.doesNotMatch(homeHero, /Use this motion/);
assert.match(homeHero, /Sample · Beatbot/);
assert.match(homeHero, /Archive sample · 6s/);
assert.match(homeHero, /Cached sample · 0 credits · no upload/);
assert.match(homeHero, /not your toy/);
assert.match(homeHero, /not a completed customer deliverable/);
assert.match(homeHero, /showControls/);
assert.doesNotMatch(homeHero, /Launch Pack|three launch formats|PublicLaunchPackSample/);
assert.doesNotMatch(create, /<PublicLaunchPackSample surface="create" \/>/);
assert.match(create, /<CreateStudio/);
assert.match(create, /initialEffect=["']street-power-up["']/);
assert.match(create, /fixedMomentContract/);
assert.doesNotMatch(
  create,
  /BatchStudio|PrivateSellerPackGate|initialRecoverPackRunId|recoverPackRunId|sp\.mode\s*===/
);
assert.match(meClient, /export function canUsePrivateLaunch/);
assert.match(
  meClient,
  /canUsePrivateLaunch\([\s\S]*?me\.canPreparePrivateInput === true/
);
assert.match(meClient, /me\.canLiveGenerate === true/);
assert.match(batch, /const privateInputEnabled = canPreparePrivateInput\(me\)/);
assert.match(batch, /const privateLaunchEnabled = canUsePrivateLaunch\(me\)/);
assert.match(batch, /const demoMode = !privateLaunchEnabled \|\| labStill/);
assert.match(batch, /data-public-pack-preview="lab-only"/);
assert.match(batch, /No product-photo input is accepted or processed here/);
assert.match(batch, /setOwnsRights\(false\)/);
assert.match(batch, /const privateInputPayload = demoMode\s*\?\s*\{\}/);
assert.match(batch, /if \(!demoMode && image && image\.startsWith/);
assert.match(
  batch,
  /!demoMode && image && image\.length <= 300_000 \? image : undefined/
);
assert.match(createStudio, /const privateUploadEnabled = canUsePrivateLaunch\(session\)/);

const retryRoute = read("app/api/seller-pack/retry/route.ts");
const retryInviteGuard = retryRoute.indexOf("privateLive.invite.invited");
const retryAtomicCall = retryRoute.indexOf("retrySellerPackChildAtomic({");
assert.ok(
  retryInviteGuard > -1 && retryAtomicCall > retryInviteGuard,
  "Seller Pack retry must check the current private invite before re-reserving credits"
);
const generateRoute = read("app/api/generate/route.ts");
const packBindingGuard = generateRoute.indexOf(
  'packBinding.kind === "pack" && !privateLive.invite.invited'
);
const providerBudgetCall = generateRoute.indexOf(
  "reserveDurableProviderSpend({"
);
assert.ok(
  packBindingGuard > -1 && providerBudgetCall > packBindingGuard,
  "Seller Pack child generation must check the current private invite before provider spend"
);
assert.match(createStudio, /data-public-single-preview="lab-only"/);
assert.match(createStudio, /Public preview does not accept or process product photos/);
assert.match(createStudio, /if \(!opts\?\.labSample && !privateUploadEnabled\)/);
assert.match(createStudio, /if \(!requestUsesLabSample && !privateUploadEnabled\)/);
assert.match(
  createStudio,
  /allowProviderSpend: !demoMode && !requestUsesLabSample/
);
assert.match(
  createStudio,
  /onSecondaryStill=\{\s*privateUploadEnabled \? setSecondaryStill : undefined\s*\}/
);
assert.match(
  createStudio,
  /privateUploadEnabled \? \(\s*<div id="create-photo-step" data-first-run-step="upload">/
);
assert.match(homeWall, /Try this recipe/);
assert.match(homeWall, /href=\{cardHref\}|projectHref \|\| remakeHref/);
assert.match(homeWall, /href=\{remakeHref\}|withProofEntry\(item\.href\)/);
assert.match(homeWall, /event:\s*"recipe_use"/);
assert.match(homeWall, /home-proof-wall/);
assert.doesNotMatch(shell, /create\?mode=seller-pack/);
assert.match(shell, /DEFAULT_MOMENT_CREATE_HREF/);
assert.match(
  shell,
  /import\s*\{[\s\S]*MOMENT_CREATE_HREF[\s\S]*\}\s*from\s*["']@\/lib\/softLaunch["']/
);
assert.match(
  shell,
  /const DEFAULT_MOMENT_CREATE_HREF\s*=\s*`\$\{MOMENT_CREATE_HREF\}&source=moment-shell`/
);
assert.match(
  shell,
  /const PRIMARY_NAV_CREATE_HREF\s*=\s*`\$\{MOMENT_CREATE_HREF\}&source=primary-nav`/
);
assert.doesNotMatch(shell, /\/create\?effect=street-power-up&source=primary-nav/);
assert.match(shell, /Create a Moment/);
assert.match(shell, /label: "Library"/);
assert.match(shell, /label: "Sign in"/);
assert.doesNotMatch(shell, /Motion archive/);
assert.match(
  softLaunchStrip,
  /SOFT_LAUNCH_MOMENT_HREF|MOMENT_CREATE_HREF.*source=soft-launch|`\$\{MOMENT_CREATE_HREF\}&source=soft-launch`/
);
assert.match(
  softLaunchStrip,
  /createGenerate360Href\(\s*["']soft-launch["']\)|data-soft-launch=["']generate-remix["']/
);
assert.match(hfExploreHome, /create\?effect=street-power-up|MOMENT_CREATE_HREF|street-power-up/);
assert.match(
  freeTrialCta,
  /createGenerate360Href\(\s*["']free-trial["']\)|onHome\s*\?\s*createGenerate360Href/
);
assert.doesNotMatch(
  [shell, softLaunchStrip, hfExploreHome, freeTrialCta].join("\n"),
  /create\?mode=seller-pack/
);
assert.doesNotMatch(
  [softLaunchStrip, hfExploreHome, freeTrialCta].join("\n"),
  /href=.{0,40}#home-create|\? "\/#home-create"/
);
assert.match(
  pricingCheckout,
  /import\s*\{\s*MOMENT_CREATE_HREF\s*\}\s*from\s*["']@\/lib\/softLaunch["']/
);
assert.match(
  pricingCheckout,
  /const PRICING_FOUNDING_HREF\s*=\s*`\$\{MOMENT_CREATE_HREF\}&source=pricing-founding`/
);
assert.match(pricingCheckout, /href=\{PRICING_FOUNDING_HREF\}/);
assert.doesNotMatch(
  pricingCheckout,
  /href="\/create\?(?:mode=moment&)?effect=street-power-up&source=pricing-founding"/
);
assert.match(pricingCheckout, /Preview one Moment/);
assert.match(pricingCheckout, /fetch\("\/api\/checkout"/);
assert.match(pricingCheckout, /data\.acceptance\?\.paid === true/);
assert.match(pricingCards, /data-pricing-state="coming-soon"/);
assert.match(pricingCards, /\$49 founding rate/);
assert.match(pricingCards, /No public subscription or checkout/);
assert.match(pricingCards, /checkout closed/);
assert.doesNotMatch(pricingCards, /PricingCheckoutButton|PLANS\.map|FreeTrialCta/);
assert.match(paywall, /Founding Studio · checkout closed/);
assert.match(paywall, /Founding rate is \$49\/month for nine directed Moments/);
assert.match(paywall, /Public subscription purchase and live checkout stay closed/);
assert.doesNotMatch(paywall, /PLANS|priceMonthly/);
// Library is an authenticated generations ledger, not a public Pack/demo grid.
assert.match(libraryGrid, /fetchMe\(\)/);
assert.match(libraryGrid, /if \(!me\?\.signedIn\)/);
assert.match(libraryGrid, /href=["']\/login\?next=\/library["']/);
assert.match(libraryGrid, /fetch\(["']\/api\/generations["']/);
assert.match(libraryGrid, /body\.jobs\.filter\(visibleAccountJob\)/);
assert.match(libraryGrid, /if \(job\.demo\) return false/);
assert.match(libraryGrid, /MOMENT_CREATE_HREF/);
assert.match(libraryGrid, /privateDownloadHeaders/);
assert.match(libraryGrid, /\/api\/downloads\//);
assert.match(libraryGrid, /method:\s*["']HEAD["']/);
assert.match(libraryGrid, /interpretDownloadHead/);
assert.match(libraryGrid, /downloadVideoFile/);
assert.match(libraryGrid, /<video[\s\S]{0,500}controls[\s\S]{0,500}playsInline/);
assert.match(libraryGrid, /isRetryable\(job\.status\)[\s\S]{0,350}void retry\(job\)/);
assert.match(libraryGrid, /\/api\/generations\/\$\{encodeURIComponent\(job\.id\)\}\/retry/);
assert.match(libraryGrid, /function isOpen\(status[\s\S]{0,180}queued[\s\S]{0,80}running/);
assert.match(libraryGrid, /isOpen\(job\.status\)[\s\S]{0,350}void cancel\(job\)/);
assert.match(libraryGrid, /\/api\/generations\/\$\{encodeURIComponent\(job\.id\)\}/);
assert.doesNotMatch(
  libraryGrid,
  /FreeTrialCta|Generate · upload toy photo|Compare plans|data-library-action="generate"|data-library-seller-packs|Your Launch Packs|Create new Pack|Try cached sample Pack|getSellerPackDiscoveryClient|Saved on this device|device-local|session-stills|\/api\/image/
);
assert.match(
  pricing,
  /Public\s+payment remains locked until every private-delivery and billing/
);
assert.match(pricing, /PricingCheckoutButton/);
assert.match(pricing, /\$49/);
assert.match(pricing, /nine directed/);
assert.doesNotMatch(
  [home, homeHero, pricing, pricingCards].join("\n"),
  /Choose the volume|unlimited credits/i
);
assert.doesNotMatch(
  [home, homeWall, shell].join("\n"),
  /#home-tool/
);

// The archived commercial contract still has exactly three children; keep its
// backend/atomic/export assertions even though it is no longer a public door.
assert.match(contract, /SELLER_PACK_CHILD_COUNT = 3/);
for (const slug of [
  "360-spin-showcase",
  "blind-box-unboxing",
  "paparazzi-flash",
]) {
  assert.match(contract, new RegExp(`"${slug}"`));
}
assert.match(create, /initialEffect=["']street-power-up["']/);
assert.match(create, /fixedMomentContract/);
assert.doesNotMatch(create, /Prepare a private Launch Pack|Public creation uses one selected Moment instead|Access is confirmed before any private asset or credit action/);
assert.match(batch, /no product photo is accepted or processed/i);
assert.match(batch, /data-private-input-review="original-only"/);
assert.match(batch, /0 Pack jobs · 0 Library results · 0 credits reserved/);
assert.match(batch, /Direction frames are not completed customer videos/);
assert.match(batch, /selected toy stays visible across three static format\s+directions/);
assert.match(batch, /separate sample toys/);
assert.doesNotMatch(create, /Launch Pack — 3 private videos · 30 credits/);
assert.doesNotMatch(create, /Launch Pack — 12 recipes/);

// Launch Pack submission still keeps the existing rights and generate actions.
assert.match(batch, /data-launch-pack-primary-action="2"/);
assert.match(
  batch,
  /data-launch-pack-primary-action=\{image \? "3" : "1"\}/
);
// A post-reservation/download error must not expose a whole-Pack 30-credit rerun.
assert.match(batch, /const canRetryUnreservedPack =/);
assert.match(batch, /jobs\.length === 0/);
assert.match(batch, /activePackRunId === null/);
assert.match(batch, /runProjectId === null/);
assert.match(batch, /sellerPackRecoveryHydrated/);
assert.match(batch, /this notice will\s+not rerun the whole Pack/);
assert.match(batch, /Retry this format · reserve 10 credits/);
// Starting a fresh seller Pack must fail closed once any run identity or job exists.
assert.match(batch, /const canStartFreshSellerPack =/);
assert.match(
  batch,
  /canRun &&\s*jobs\.length === 0 &&\s*activePackRunId === null &&\s*runProjectId === null &&\s*sellerPackRecoveryHydrated/
);
assert.match(
  batch,
  /This Launch Pack already has a run record[\s\S]*Pikbo will not reserve another 30 credits/
);
assert.match(
  batch,
  /privateLaunchEnabled\s*\? !canStartFreshSellerPack\s*: Boolean\(verifiedInputAssetId\)/
);
assert.match(
  batch,
  /!ownsRights \|\| verifyingInput \|\| Boolean\(verifiedInputAssetId\)/
);
assert.match(
  batch,
  /!labStill && !privateLaunchEnabled[\s\S]*\? !ownsRights \|\| verifyingInput \|\| Boolean\(verifiedInputAssetId\)[\s\S]*: !canStartFreshSellerPack/
);
assert.match(batch, /\) : jobs\.length > 0 \? \(/);

// Export stays fail-closed: only succeeded/downloadable children are offered.
assert.match(steps, /Owner-only Library and download/);
assert.match(steps, /Pikbo Lab only · no product upload/);
assert.match(batch, /data-launch-pack-export="downloadable-only"/);
assert.match(batch, /Download available videos/);
assert.match(batch, /Only completed, downloadable clips are included/);
assert.doesNotMatch(batch, /Export CSV|Manifest JSON|Post pack · fidelity QC/);
assert.match(packExport, /status === "succeeded"/);
assert.match(packExport, /i\.downloadable/);
assert.match(packExport, /Failed siblings and Free raw URLs are omitted/);

console.log(
  "launch-pack-main-path-smoke: PASS (public Moment entry + private fixed trio + downloadable-only seller handoff)"
);
