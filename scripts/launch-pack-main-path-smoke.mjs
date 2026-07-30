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
const batch = read("components/BatchStudio.tsx");
const steps = read("components/SellerPackSteps.tsx");
const contract = read("lib/sellerPackContract.ts");
const packExport = read("lib/sellerPackExport.ts");
const shell = read("components/AppShell.tsx");
const pricingCheckout = read("components/PricingCheckoutButton.tsx");

// Homepage V2 leads with the fixed Launch Pack; Recipes remain a proof layer.
assert.match(home, /data-home-upgrade="launch-pack"/);
assert.match(home, /href="\/create\?mode=seller-pack"/);
assert.match(homeHero, /<HeroUpload \/>/);
assert.match(homeHero, /id="home-create"/);
assert.match(heroUpload, /mode=seller-pack&source=home-launch-pack/);
assert.match(heroUpload, /pikbo_pending_still/);
assert.match(heroUpload, /file\.size > 2_000_000/);
assert.match(heroUpload, /className="sr-only"/);
assert.match(batch, /const privateInputPayload = demoMode\s*\?\s*\{\}/);
assert.match(batch, /if \(!demoMode && image && image\.startsWith/);
assert.match(
  batch,
  /!demoMode && image && image\.length <= 300_000 \? image : undefined/
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
assert.match(create, /Launch Pack — 3 private videos · 30 credits/);
assert.match(create, /One photo → your Launch Pack/);
assert.doesNotMatch(create, /Launch Pack — 12 recipes/);

// Launch Pack submission still keeps the existing rights and generate actions.
assert.match(batch, /data-launch-pack-primary-action="2"/);
assert.match(
  batch,
  /data-launch-pack-primary-action=\{image \? "3" : "1"\}/
);

// Export stays fail-closed: only succeeded/downloadable children are offered.
assert.match(steps, /Export Launch Pack/);
assert.match(batch, /data-launch-pack-export="downloadable-only"/);
assert.match(batch, /Export Launch Pack/);
assert.match(batch, /Free raw files stay out|Free raw \/ failures omitted/);
assert.match(packExport, /status === "succeeded"/);
assert.match(packExport, /i\.downloadable/);
assert.match(packExport, /Failed siblings and Free raw URLs are omitted/);

console.log(
  "launch-pack-main-path-smoke: PASS (home upgrade → fixed trio → downloadable-only export)"
);
