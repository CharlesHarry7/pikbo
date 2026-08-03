#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const harnessPath = join(root, "scripts/nonprod-seller-pack-harness.mjs");
const source = readFileSync(harnessPath, "utf8");
const {
  assertBudgetSnapshotUnchanged,
  assertSafeRelatedCounts,
  assertTrackedAccountOwner,
  validateHarnessRequest,
  validateTargetUrl,
} = await import(harnessPath);

assert.doesNotMatch(source, /\/api\/generate|@fal-ai\/client|checkout\/sessions/);
assert.match(source, /E2E_ALLOW_NONPROD/);
assert.match(source, /lpfvfybkggiugosugfcw/);
assert.match(source, /finally\s*\{/);
assert.match(source, /verifyZeroResidue/);
assert.match(source, /assertCleanupIsSafe/);
assert.match(source, /Third-party network request forbidden/);
assert.match(source, /providerCalls:\s*0/);
assert.match(source, /stripeCalls:\s*0/);
assert.match(source, /aiGeneratedMedia:\s*false/);
assert.ok(
  source.indexOf("await assertCleanupIsSafe(admin, fixture)") <
    source.indexOf("await cleanupFixture(admin, fixture)"),
  "cleanup safety check must run before destructive cleanup"
);

const exactOrigin = "https://lpfvfybkggiugosugfcw.supabase.co";
assert.equal(validateTargetUrl(exactOrigin), exactOrigin);
for (const invalid of [
  "https://lpfvfybkggiugosugfcw.supabase.co:444",
  "https://lpfvfybkggiugosugfcw.supabase.co/rest/v1",
  "https://lpfvfybkggiugosugfcw.supabase.co/?unsafe=1",
  "https://production-project.supabase.co",
]) {
  assert.throws(() => validateTargetUrl(invalid));
}
assert.doesNotThrow(() =>
  validateHarnessRequest(
    `${exactOrigin}/rest/v1/rpc/pikbo_create_toy_asset_v1`
  )
);
assert.doesNotThrow(() =>
  validateHarnessRequest(`${exactOrigin}/rest/v1/rpc/pikbo_complete_toy_asset_v1`)
);
assert.doesNotThrow(() =>
  validateHarnessRequest(`${exactOrigin}/rest/v1/rpc/pikbo_reserve_seller_pack_v2`)
);
assert.doesNotThrow(() =>
  validateHarnessRequest(`${exactOrigin}/rest/v1/rpc/pikbo_get_seller_pack_status_v2`)
);
assert.doesNotThrow(() =>
  validateHarnessRequest(`${exactOrigin}/rest/v1/rpc/pikbo_resolve_seller_pack_input_v1`)
);
for (const forbidden of [
  "https://api.stripe.com/v1/checkout/sessions",
  `${exactOrigin}/rest/v1/rpc/pikbo_reserve_provider_spend_v1`,
  `${exactOrigin}/rest/v1/rpc/pikbo_apply_stripe_billing_event_v1`,
  `${exactOrigin}/storage/v1/object/another-bucket/file.webp`,
  `${exactOrigin}/storage/v1/object/pikbo-toy-inputs-shadow/file.webp`,
]) {
  assert.throws(() => validateHarnessRequest(forbidden));
}
assert.doesNotThrow(() =>
  validateHarnessRequest(`${exactOrigin}/rest/v1/stripe_events`, exactOrigin, "GET")
);
assert.throws(() =>
  validateHarnessRequest(`${exactOrigin}/rest/v1/stripe_events`, exactOrigin, "POST")
);
assert.throws(() =>
  validateHarnessRequest(
    `${exactOrigin}/rest/v1/provider_spend_reservations`,
    exactOrigin,
    "DELETE"
  )
);

const cleanRelatedCounts = {
  providerSpend: 0,
  subscriptions: 0,
  stripeEvents: 0,
  generationReconciliations: 0,
  packReconciliations: 0,
  derivatives: 0,
  seedanceAuditByUser: 0,
  seedanceAuditByJob: 0,
  consumedGuestByUser: 0,
  consumedGuestByAccount: 0,
};
assert.doesNotThrow(() => assertSafeRelatedCounts(cleanRelatedCounts));
assert.throws(() =>
  assertSafeRelatedCounts({ ...cleanRelatedCounts, stripeEvents: 1 })
);
assert.doesNotThrow(() =>
  assertBudgetSnapshotUnchanged([{ scope: "project", spent: 0 }], [
    { scope: "project", spent: 0 },
  ])
);
assert.throws(() =>
  assertBudgetSnapshotUnchanged([{ scope: "project", spent: 0 }], [
    { scope: "project", spent: 1 },
  ])
);
assert.doesNotThrow(() =>
  assertTrackedAccountOwner("account-a", "user-a", {
    id: "account-a",
    owner_user_id: "user-a",
  })
);
assert.throws(() =>
  assertTrackedAccountOwner("account-a", "user-a", {
    id: "account-a",
    owner_user_id: "user-b",
  })
);

function run(env) {
  return spawnSync(process.execPath, [harnessPath], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

const closed = run({
  E2E_ALLOW_NONPROD: "",
  FAL_KEY: "",
  STRIPE_SECRET_KEY: "",
  STRIPE_WEBHOOK_SECRET: "",
});
assert.notEqual(closed.status, 0);
assert.match(closed.stderr, /E2E_ALLOW_NONPROD=1 is required/);

const wrongProject = run({
  E2E_ALLOW_NONPROD: "1",
  E2E_EXPECTED_SUPABASE_PROJECT_REF: "production-project",
  FAL_KEY: "",
  STRIPE_SECRET_KEY: "",
  STRIPE_WEBHOOK_SECRET: "",
});
assert.notEqual(wrongProject.status, 0);
assert.match(wrongProject.stderr, /Only dedicated non-production project/);

const wrongHost = run({
  E2E_ALLOW_NONPROD: "1",
  E2E_EXPECTED_SUPABASE_PROJECT_REF: "lpfvfybkggiugosugfcw",
  SUPABASE_URL: "https://example.com",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.com",
  SUPABASE_ANON_KEY: "fixture-anon",
  SUPABASE_SERVICE_ROLE_KEY: "fixture-service",
  FAL_KEY: "",
  STRIPE_SECRET_KEY: "",
  STRIPE_WEBHOOK_SECRET: "",
});
assert.notEqual(wrongHost.status, 0);
assert.match(wrongHost.stderr, /Unexpected Supabase project/);

console.log(
  "nonprod-seller-pack-harness-regression: PASS (exact project/origin · RPC/bucket allowlist · ownership-safe cleanup · evidence preservation · no Provider/Stripe route)"
);
