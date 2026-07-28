import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const home = read("app/page.tsx");
const homeWall = read("components/HomeViralWall.tsx");
const create = read("app/create/page.tsx");
const batch = read("components/BatchStudio.tsx");
const steps = read("components/SellerPackSteps.tsx");
const contract = read("lib/sellerPackContract.ts");
const packExport = read("lib/sellerPackExport.ts");
const shell = read("components/AppShell.tsx");

// Homepage V1 leads with Recipe remix; Launch Pack remains a later upgrade.
assert.match(home, /data-home-upgrade="launch-pack"/);
assert.match(home, /href="\/create\?mode=seller-pack"/);
assert.match(homeWall, /Use this recipe/);
assert.match(homeWall, /href=\{item\.projectHref \|\| item\.href\}/);
assert.match(homeWall, /href=\{item\.href\}/);
assert.match(homeWall, /event:\s*"recipe_use"/);
assert.doesNotMatch(shell, /create\?mode=seller-pack/);
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
assert.match(create, /Launch Pack — 3 assets · quote shown before Live/);
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
