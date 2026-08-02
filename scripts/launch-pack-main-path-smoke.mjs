import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const home = read("app/page.tsx");
const homeHero = read("components/HomeCinemaHero.tsx");
const heroUpload = read("components/HeroUpload.tsx");
const homeWall = read("components/HomeViralWall.tsx");
const create = read("app/create/page.tsx");
const createStudio = read("components/CreateStudio.tsx");
const batch = read("components/BatchStudio.tsx");
const steps = read("components/SellerPackSteps.tsx");
const contract = read("lib/sellerPackContract.ts");
const packExport = read("lib/sellerPackExport.ts");
const shell = read("components/AppShell.tsx");
const pricingCheckout = read("components/PricingCheckoutButton.tsx");
const pricing = read("app/pricing/page.tsx");
const pricingCards = read("components/PricingPlanCards.tsx");
const paywall = read("components/PaywallCard.tsx");
const libraryGrid = read("components/LibraryGrid.tsx");
const meClient = read("lib/meClient.ts");

// Homepage V3 separates public Lab preview from invited private upload.
assert.match(homeHero, /data-home-upgrade="launch-pack"/);
assert.match(homeHero, /id="pack-formats"/);
assert.match(
  homeHero,
  /<HeroUpload access=\{launchAccess\} credits=\{credits\} \/>/
);
assert.match(homeHero, /id="home-create"/);
assert.match(homeHero, /fetchMe\(\)/);
assert.match(homeHero, /canUsePrivateLaunch\(me\)/);
assert.match(homeHero, /Public format preview · no upload/);
assert.match(homeHero, /Founding Studio · coming soon/);
assert.doesNotMatch(homeHero, /\$49 candidate/);
assert.match(heroUpload, /mode=seller-pack&source=home-launch-pack/);
assert.match(
  heroUpload,
  /mode=seller-pack&source=home-preview&try=1&sample=scout/
);
assert.match(heroUpload, /pikbo_pending_still/);
assert.match(heroUpload, /file\.size > 2_000_000/);
assert.match(heroUpload, /className="sr-only"/);
assert.match(heroUpload, /if \(!privateAccess\)/);
assert.match(heroUpload, /data-home-launch-pack="public-preview"/);
assert.match(heroUpload, /No photo upload · choose a Pikbo Lab sample/);
assert.match(
  heroUpload,
  /Public preview · 0 credits · your image is not processed/
);
assert.match(meClient, /export function canUsePrivateLaunch/);
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
assert.match(homeWall, /href=\{item\.projectHref \|\| item\.href\}/);
assert.match(homeWall, /href=\{item\.href\}/);
assert.match(homeWall, /event:\s*"recipe_use"/);
assert.match(shell, /create\?mode=seller-pack/);
assert.match(
  pricingCheckout,
  /href="\/create\?mode=seller-pack&source=pricing-founding"/
);
assert.match(pricingCheckout, /Preview the Founding Pack/);
assert.match(pricingCheckout, /fetch\("\/api\/checkout"/);
assert.match(pricingCheckout, /data\.acceptance\?\.paid === true/);
assert.match(pricingCards, /data-pricing-state="coming-soon"/);
assert.match(pricingCards, /Price pending/);
assert.match(pricingCards, /No public subscription or checkout/);
assert.doesNotMatch(pricingCards, /PricingCheckoutButton|PLANS\.map|FreeTrialCta/);
assert.match(paywall, /Founding Studio · coming soon/);
assert.match(paywall, /No public price, Pack count, subscription, or checkout/);
assert.doesNotMatch(paywall, /PLANS|priceMonthly|\$49|\/mo/);
assert.match(libraryGrid, /Create your first Pack/);
assert.match(libraryGrid, /data-library-action="seller-pack"/);
assert.doesNotMatch(
  libraryGrid,
  /FreeTrialCta|Generate · upload toy photo|Compare plans|data-library-action="generate"/
);
assert.match(pricing, /There is no Free plan comparison/);
assert.doesNotMatch(
  [home, homeHero, pricing, pricingCards].join("\n"),
  /\$49|\/mo|Choose the volume/
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
assert.match(create, /Launch Pack · 3 fixed formats/);
assert.match(create, /Public preview or\s+invited private generation/);
assert.match(create, /Access is confirmed inside the workspace/);
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
  "launch-pack-main-path-smoke: PASS (home upgrade → fixed trio → downloadable-only seller handoff)"
);
