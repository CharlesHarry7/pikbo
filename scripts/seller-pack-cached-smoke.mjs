/**
 * Seller Pack cached golden path — zero provider spend contract.
 *
 * Pure + source locks (no @/ path imports). Canonical: lib/sellerPackContract.ts
 * Run: npm run seller-pack-cached-smoke
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const root = process.cwd();
const batch = readFileSync(join(root, "components/BatchStudio.tsx"), "utf8");
const quote = readFileSync(join(root, "lib/sellerPackQuote.ts"), "utf8");
const packExport = readFileSync(join(root, "lib/sellerPackExport.ts"), "utf8");
const recovery = readFileSync(join(root, "lib/sellerPackRecovery.ts"), "utf8");
const contract = readFileSync(join(root, "lib/sellerPackContract.ts"), "utf8");
const genRoute = readFileSync(join(root, "app/api/generate/route.ts"), "utf8");
const liveGate = readFileSync(join(root, "lib/liveGenerationGate.mjs"), "utf8");
const packageJson = readFileSync(join(root, "package.json"), "utf8");
const ciYml = readFileSync(join(root, "docs/ci/github-actions-ci.yml"), "utf8");

function loadTypeScriptModule(relativePath, dependencies = {}) {
  const source = readFileSync(join(root, relativePath), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "exports", "module", compiled)(
    (id) => {
      if (Object.hasOwn(dependencies, id)) return dependencies[id];
      throw new Error(`unexpected ${relativePath} import: ${id}`);
    },
    loaded.exports,
    loaded
  );
  return loaded.exports;
}

const contractModule = loadTypeScriptModule("lib/sellerPackContract.ts");
const recoveryModule = loadTypeScriptModule("lib/sellerPackRecovery.ts", {
  "@/lib/sellerPackContract": contractModule,
});

// ─── Fixed trio in contract (PRD §4) ───
const EXPECTED_SLUGS = [
  "360-spin-showcase",
  "blind-box-unboxing",
  "paparazzi-flash",
];
assert.match(contract, /export const SELLER_PACK_ITEMS/);
assert.match(contract, /export function sellerPackCachedGoldenSettlement/);
assert.match(contract, /export function isExactSellerPackSelection/);
assert.match(contract, /export function isSellerPackRetryableStatus/);
assert.match(contract, /SELLER_PACK_CHILD_COUNT = 3/);
assert.match(contract, /providerCalls: 0/);
assert.match(contract, /totalCredits: 0/);
assert.match(contract, /creditsCharged: 0/);
assert.match(contract, /creditsRefunded: 0/);
for (const slug of EXPECTED_SLUGS) {
  assert.match(contract, new RegExp(`"${slug}"`));
}
assert.match(contract, /aspectRatio: "1:1"/);
assert.match(contract, /aspectRatio: "9:16"/);
assert.match(batch, /sellerPackContract/);
assert.match(recovery, /SELLER_PACK_ITEMS/);
assert.doesNotMatch(recovery, /const FIXED_CHILDREN = \[\s*\{/);

// Execute the real contract rather than a hand-written mirror.
const full = contractModule.sellerPackCachedGoldenSettlement();
assert.equal(full.providerCalls, 0);
assert.equal(full.totalCredits, 0);
assert.equal(full.creditsCharged, 0);
assert.equal(full.creditsRefunded, 0);
assert.ok(full.children.every((c) => c.demo && c.credits === 0 && c.refund === "n/a"));
assert.deepEqual(
  full.children.map((child) => child.slug),
  EXPECTED_SLUGS
);
const partial = contractModule.sellerPackCachedGoldenSettlement({
  failedIndexes: [1],
});
assert.equal(partial.children[1].status, "failed");
assert.equal(partial.children[1].refund, "n/a");
assert.equal(partial.creditsRefunded, 0);
assert.equal(partial.providerCalls, 0);
assert.equal(
  contractModule.isSellerPackRetryableStatus(partial.children[0].status),
  false
);
assert.equal(
  contractModule.isSellerPackRetryableStatus(partial.children[1].status),
  true
);
assert.equal(contractModule.isSellerPackRetryableStatus("not_started"), true);
assert.equal(
  contractModule.isSellerPackRetryableStatus("recovery_unavailable"),
  false
);

// Partial recovery is authoritative: success stays playable; only the failed
// child is retryable; no sibling result or credit state is overwritten.
const recoveredRun = {
  version: 1,
  projectId: "seller-pack-smoke",
  savedAt: "2026-07-28T00:00:00.000Z",
  children: contractModule.SELLER_PACK_ITEMS.map((item, index) => ({
    slug: item.slug,
    name: item.label,
    aspectRatio: item.aspectRatio,
    requestId: `job-${index + 1}`,
    statusHint: index === 1 ? "failed" : "succeeded",
    retryCount: 0,
  })),
};
const recoveredPartial = recoveryModule.reconcileSellerPackRecovery(
  recoveredRun,
  contractModule.SELLER_PACK_ITEMS.map((item, index) => ({
    id: `job-${index + 1}`,
    effect: item.slug,
    status: index === 1 ? "failed" : "succeeded",
    videoUrl:
      index === 1 ? undefined : `https://cdn.example.test/${item.slug}.mp4`,
    demo: true,
    creditsOutcome: index === 1 ? "0 cached" : "0 cached",
    error: index === 1 ? "Injected cached failure" : undefined,
  }))
);
assert.deepEqual(
  recoveredPartial.children.map((child) => child.status),
  ["succeeded", "failed", "succeeded"]
);
assert.deepEqual(
  recoveredPartial.children
    .filter((child) =>
      contractModule.isSellerPackRetryableStatus(child.status)
    )
    .map((child) => child.slug),
  ["blind-box-unboxing"]
);
assert.equal(
  recoveredPartial.children[0].videoUrl,
  "https://cdn.example.test/360-spin-showcase.mp4"
);
assert.equal(
  recoveredPartial.children[2].videoUrl,
  "https://cdn.example.test/paparazzi-flash.mp4"
);

// Free Mini full pack block
assert.match(quote, /sellerPackLiveStartAllowed/);
assert.match(quote, /FREE_MINI_FULL_PACK/);
assert.match(batch, /sellerPackLiveStartAllowed/);
assert.match(batch, /data-seller-pack-free-mini=["']single-child["']/);
assert.doesNotMatch(batch, /cookie generate remains authoritative/);
assert.match(
  batch,
  /cookie is never live-spend authority|not live-spend authority/
);
assert.match(
  batch,
  /if \(sellerPackActive && !demoMode\)[\s\S]{0,240}reserveSellerPackShadowClient/
);

// Export honesty
assert.match(packExport, /filterAvailableDeliverables/);
assert.match(packExport, /canExportSellerPack/);
assert.match(packExport, /no server ZIP|No server ZIP/i);
assert.match(packExport, /Failed siblings|failed siblings/i);

// Recovery honesty
assert.match(recovery, /parseSellerPackRecovery/);
assert.match(recovery, /reconcileSellerPackRecovery/);
assert.match(recovery, /restore an old success/i);
assert.match(recovery, /recovery_unavailable/);
assert.match(recovery, /refund unconfirmed/);

// R0 still owns live children
assert.match(genRoute, /liveGenerationAccess/);
assert.match(genRoute, /invokeReservedProvider/);
assert.match(liveGate, /anonymous_cached_only/);
assert.match(liveGate, /LIVE_PROVIDER_REQUIRES_DURABLE_RESERVATION/);

// Partial failure UI
assert.match(batch, /retryEligible|Retry this item/);
assert.match(batch, /retryAllFailed|Retry failed only|failed kept/i);
assert.match(batch, /siblings kept|finished children kept/i);

// Package + CI
assert.match(packageJson, /"seller-pack-cached-smoke"/);
assert.match(ciYml, /seller-pack-cached-smoke/);

console.log(
  "seller-pack-cached-smoke: PASS (contract trio · cached golden 0 provider · Free Mini block · partial export · recovery honesty · R0)"
);
