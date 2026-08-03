import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const home = read("app/page.tsx");
const homeHero = read("components/HomeCinemaHero.tsx");
const publicSample = read("components/PublicLaunchPackSample.tsx");
const moments = read("lib/moments.ts");
const homeWall = read("components/HomeViralWall.tsx");
const create = read("app/create/page.tsx");
const privateSellerPackGate = read("components/PrivateSellerPackGate.tsx");
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
const createSample = publicSample.slice(
  publicSample.indexOf("function CreateSampleBrowser")
);
const homeSample = publicSample.slice(
  publicSample.indexOf("function HomeDropArchive"),
  publicSample.indexOf("function CreateSampleBrowser")
);

// North star: 潮玩版 Higgsfield Explore suite on /.
// Archive sample component may remain in repo; homepage ships HF hero + Generate.
assert.match(home, /HfExploreHome/);
assert.match(hfExploreHome, /data-hf-hero="premiere"/);
assert.match(hfExploreHome, /HomeViralWall/);
assert.match(publicSample, /See how toys become launches\./);
assert.match(publicSample, /Archive motion sample/);
assert.match(publicSample, /effect: "360-spin-showcase"/);
assert.match(publicSample, /effect: "mystery-box-reveal"/);
assert.match(publicSample, /effect: "street-power-up"/);
assert.match(publicSample, /import \{ MOMENTS \} from "@\/lib\/moments"/);
assert.match(homeSample, /data-home-official-moments/);
assert.match(homeSample, /Preview an Official Concept/);
assert.match(homeSample, /href=\{momentPreviewHref\(moment\.id\)\}/);
assert.match(homeSample, /No upload or\s+generation starts here/);
assert.match(homeSample, /Private render available now · Street Power-Up only/);
assert.match(moments, /evidence: "Official Concept"/);
for (const momentId of [
  "capsule-reveal",
  "hangar-ignition",
  "colorblock-pedestal",
  "softroom-morning",
  "gallery-spotlight",
  "alley-drop-flash",
]) {
  assert.match(moments, new RegExp(`id: "${momentId}"`));
}
assert.match(createSample, /Three separate archived format prototypes/);
assert.match(read("components/MomentCreatePreview.tsx"), /no upload · no generation · 0 credits/i);
assert.doesNotMatch(home, /One toy photo\. Three launch-ready videos\./);
assert.match(createSample, /data-public-pack-preview="instant-archived-samples"/);
assert.match(createSample, /Pikbo Lab archive/);
assert.match(createSample, /No sign-in · no upload/);
assert.match(createSample, /No product upload in this public preview/);
assert.match(createSample, /Request seller beta/);
assert.match(createSample, /Sign in for Street Power-Up/);
assert.equal((createSample.match(/<AutoPlayVideo/g) || []).length, 1);
for (const formatContract of [
  /sample: "Scout"[\s\S]*actual: "Archive media · 16:9 · 6 sec"[\s\S]*target: "Target format · 1:1 · 5 sec"/,
  /sample: "Moon"[\s\S]*actual: "Archive media · 16:9 · 6 sec"[\s\S]*target: "Target format · 9:16 · 5 sec"/,
  /sample: "Beatbot"[\s\S]*actual: "Archive media · 9:16 · 6 sec"[\s\S]*target: "Target format · 9:16 · 5 sec"/,
]) {
  assert.match(publicSample, formatContract);
}
for (const media of [
  "/demos/scout-packshot-spin.mp4",
  "/demos/moon-box-reveal.mp4",
  "/demos/beatbot-viral-hook.mp4",
]) {
  assert.match(publicSample, new RegExp(media.replaceAll("/", "\\/")));
}
assert.doesNotMatch(create, /<PublicLaunchPackSample surface="create" \/>/);
assert.match(create, /<PrivateSellerPackGate>/);
assert.match(privateSellerPackGate, /canUsePrivateLaunch\(me\)/);
assert.match(privateSellerPackGate, /router\.replace\(PUBLIC_MOMENT_HREF\)/);
assert.match(privateSellerPackGate, /Create one Moment/);
assert.match(privateSellerPackGate, /Request private beta/);
assert.doesNotMatch(publicSample, /HeroUpload|fetchMe|canUsePrivateLaunch|credits/);
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
assert.match(homeWall, /Generate/);
assert.match(homeWall, /href=\{item\.projectHref \|\| item\.href\}/);
assert.match(homeWall, /href=\{item\.href\}/);
assert.match(homeWall, /event:\s*"recipe_use"/);
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
assert.match(shell, /label: "Projects"/);
assert.doesNotMatch(shell, /Motion archive/);
assert.match(softLaunchStrip, /create\?effect=street-power-up&source=soft-launch/);
assert.match(hfExploreHome, /create\?effect=street-power-up/);
assert.match(freeTrialCta, /onHome\s*\? "\/create\?effect=360-spin-showcase&source=free-trial"/);
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
assert.match(pricingCards, /data-pricing-state="founding-intent"/);
assert.match(pricingCards, /\$49|Price pending|founding/i);
assert.match(pricingCards, /Reserve Founding|No public subscription|checkout pending Stripe|card checkout pending/i);
assert.doesNotMatch(pricingCards, /PricingCheckoutButton|PLANS\.map|FreeTrialCta/);
assert.match(paywall, /Founding Studio · coming soon/);
assert.match(paywall, /No public price, monthly allowance, subscription, or checkout/);
assert.doesNotMatch(paywall, /PLANS|priceMonthly|\$49|\/mo/);
assert.match(libraryGrid, /Your Launch Packs/);
assert.match(libraryGrid, /data-library-action="moment"/);
assert.doesNotMatch(
  libraryGrid,
  /FreeTrialCta|Generate · upload toy photo|Compare plans|data-library-action="generate"/
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

// The commercial contract is exactly three children, not a vague future pack.
assert.match(contract, /SELLER_PACK_CHILD_COUNT = 3/);
for (const slug of [
  "360-spin-showcase",
  "blind-box-unboxing",
  "paparazzi-flash",
]) {
  assert.match(contract, new RegExp(`"${slug}"`));
}
assert.match(create, /Prepare a private Launch Pack/);
assert.match(create, /Public creation uses one selected Moment instead/);
assert.match(create, /Access is confirmed before any private asset or credit action/);
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
