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
const generateClient = readFileSync(join(root, "lib/generateClient.ts"), "utf8");
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
const generateClientModule = loadTypeScriptModule("lib/generateClient.ts", {
  "@/lib/createTrust": {
    isSafeDeliverableUrl: () => true,
  },
  "@/lib/generateRecoveryPolicy": {
    isAuthoritativeRecoveryResult: () => false,
    raceGenerateWithDurableRecovery: async () => ({ kind: "timeout" }),
  },
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
assert.match(contract, /export function parseExactSellerPackServerJobs/);
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

// Reserve/status are untrusted network boundaries. The exact fixed child
// contract must be executable (not a TypeScript-only assertion).
const exactServerJobs = () =>
  contractModule.SELLER_PACK_ITEMS.map((item, index) => ({
    jobId: `pack-job-contract-000${index + 1}`,
    childKey: item.key,
    effectSlug: item.slug,
    aspectRatio: item.aspectRatio,
    durationSec: 5,
    status: "queued",
    quotedCredits: 10,
    settledCredits: 0,
    attemptKey: null,
  }));
assert.deepEqual(
  contractModule
    .parseExactSellerPackServerJobs(exactServerJobs())
    ?.map((job) => job.childKey),
  ["listing_spin", "blind_box_reveal", "social_flash"]
);

function malformedJobs(mutator) {
  const jobs = structuredClone(exactServerJobs());
  mutator(jobs);
  return jobs;
}

assert.equal(
  contractModule.parseExactSellerPackServerJobs(
    malformedJobs((jobs) => jobs.reverse())
  ),
  null,
  "server order is contractual"
);
assert.equal(
  contractModule.parseExactSellerPackServerJobs(
    malformedJobs((jobs) => {
      jobs[1].jobId = jobs[0].jobId;
    })
  ),
  null,
  "job ids must be unique"
);
for (const mutate of [
  (jobs) => {
    jobs[0].childKey = "social_flash";
  },
  (jobs) => {
    jobs[0].effectSlug = "paparazzi-flash";
  },
  (jobs) => {
    jobs[0].aspectRatio = "9:16";
  },
  (jobs) => {
    jobs[0].durationSec = 10;
  },
  (jobs) => {
    jobs[0].quotedCredits = 9;
  },
]) {
  assert.equal(
    contractModule.parseExactSellerPackServerJobs(malformedJobs(mutate)),
    null
  );
}

let fetchPayload;
const priorFetch = globalThis.fetch;
globalThis.fetch = async () => ({
  status: 200,
  json: async () => structuredClone(fetchPayload),
});
try {
  fetchPayload = {
    ok: true,
    mode: "atomic",
    packRunId: "pack-run-contract-0001",
    reservationId: "reservation-contract-0001",
    quoteCredits: 30,
    jobs: exactServerJobs(),
    idempotent: false,
  };
  const validReserve = await generateClientModule.reserveSellerPackClient({
    clientPackKey: "client-pack-contract-0001",
  });
  assert.equal(validReserve.ok, true);
  assert.deepEqual(
    validReserve.jobs.map((job) => job.childKey),
    ["listing_spin", "blind_box_reveal", "social_flash"]
  );

  fetchPayload.jobs = malformedJobs((jobs) => jobs.reverse());
  const malformedReserve = await generateClientModule.reserveSellerPackClient({
    clientPackKey: "client-pack-contract-0002",
  });
  assert.equal(malformedReserve.ok, false);
  assert.equal(malformedReserve.code, "INVALID_SERVER_CONTRACT");

  fetchPayload = {
    ok: true,
    packRunId: "pack-run-contract-0001",
    status: "running",
    settledCredits: 0,
    releasedCredits: 0,
    jobs: exactServerJobs(),
  };
  const validStatus = await generateClientModule.getSellerPackStatusClient(
    "pack-run-contract-0001"
  );
  assert.equal(validStatus.ok, true);

  fetchPayload.jobs = malformedJobs((jobs) => {
    jobs[2].quotedCredits = 20;
  });
  const malformedStatus = await generateClientModule.getSellerPackStatusClient(
    "pack-run-contract-0001"
  );
  assert.equal(malformedStatus.ok, false);
  assert.equal(malformedStatus.code, "INVALID_SERVER_CONTRACT");
} finally {
  globalThis.fetch = priorFetch;
}

assert.match(generateClient, /parseExactSellerPackServerJobs\(raw\.jobs\)/);
assert.match(generateClient, /INVALID_SERVER_CONTRACT/);

// Partial recovery is authoritative: success stays playable; only the failed
// child is retryable; no sibling result or credit state is overwritten.
const recoveredRun = {
  version: 2,
  projectId: "seller-pack-smoke",
  packRunId: "pack-run-smoke-0001",
  savedAt: "2026-07-28T00:00:00.000Z",
  children: contractModule.SELLER_PACK_ITEMS.map((item, index) => ({
    packJobId: `pack-job-smoke-000${index + 1}`,
    childKey: item.key,
    slug: item.slug,
    name: item.label,
    aspectRatio: item.aspectRatio,
    statusHint: index === 1 ? "failed" : "succeeded",
    retryCount: 0,
  })),
};
const recoveredPartial = recoveryModule.reconcileSellerPackRecovery(
  recoveredRun,
  contractModule.SELLER_PACK_ITEMS.map((item, index) => ({
    jobId: `pack-job-smoke-000${index + 1}`,
    childKey: item.key,
    effectSlug: item.slug,
    aspectRatio: item.aspectRatio,
    status: index === 1 ? "failed" : "succeeded",
    quotedCredits: 10,
    settledCredits: index === 1 ? 0 : 10,
    hasPrivateResult: index !== 1,
    resultUrl:
      index === 1 ? null : `https://private.example.test/${item.slug}.mp4`,
    errorCode: index === 1 ? "provider_error" : undefined,
  }))
);
assert.deepEqual(
  recoveredPartial.children.map((child) => child.status),
  ["succeeded", "refunded", "succeeded"]
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
  "https://private.example.test/360-spin-showcase.mp4"
);
assert.equal(
  recoveredPartial.children[2].videoUrl,
  "https://private.example.test/paparazzi-flash.mp4"
);

// Free Mini full pack block
assert.match(quote, /sellerPackLiveStartAllowed/);
assert.match(quote, /FREE_MINI_FULL_PACK/);
assert.match(batch, /sellerPackLiveStartAllowed/);
assert.match(batch, /data-seller-pack-free-mini=["']single-child["']/);
assert.doesNotMatch(batch, /cookie generate remains authoritative/);
assert.match(
  batch,
  /if \(sellerPackActive && !demoMode\)[\s\S]{0,500}reserveSellerPackClient/
);
assert.match(batch, /no shadow\/per-child fallback/);
assert.match(
  batch,
  /if \(reservedPack && !verifiedReservedJobs\)[\s\S]{0,500}No generation started[\s\S]{0,300}return;/
);
assert.doesNotMatch(
  batch,
  /throw new Error\("Server returned an invalid Launch Pack contract"\)/
);

// Export honesty
assert.match(packExport, /filterAvailableDeliverables/);
assert.match(packExport, /canExportSellerPack/);
assert.match(packExport, /no server ZIP|No server ZIP/i);
assert.match(packExport, /Failed siblings|failed siblings/i);

// Recovery honesty
assert.match(recovery, /parseSellerPackRecovery/);
assert.match(recovery, /reconcileSellerPackRecovery/);
  assert.match(recovery, /never restore a[\s\S]{0,20}success/i);
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
assert.match(batch, /completed formats kept|finished formats stay available/i);

// Package + CI
assert.match(packageJson, /"seller-pack-cached-smoke"/);
assert.match(ciYml, /seller-pack-cached-smoke/);

console.log(
  "seller-pack-cached-smoke: PASS (contract trio · cached golden 0 provider · Free Mini block · partial export · recovery honesty · R0)"
);
