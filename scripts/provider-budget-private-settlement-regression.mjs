#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

const source = read("lib/durableProviderBudget.ts");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;
const loaded = { exports: {} };
new Function("require", "exports", "module", compiled)(
  (id) => {
    if (id === "@/lib/supabase/server") {
      return { getSupabaseAdmin: () => null };
    }
    if (id === "@/lib/liveGenerationCostGuard") {
      return {
        estimateSeedance2JobUsd: () => ({
          amountUsd: 1.517,
          kind: "estimated",
          label: "estimated",
        }),
        buildSeedance2CostAudit: (input) => ({
          modelId: input.modelId,
          durationSec: input.durationSec,
          resolution: input.resolution,
          estimated: {
            amountUsd: 1.517,
            kind: "estimated",
            label: "estimated",
          },
          ceiling: {
            amountUsd: input.remainingAfterReserveUsd,
            kind: "ceiling",
            label: "ceiling",
          },
          actual: null,
          note: "fixture",
        }),
      };
    }
    if (id === "@/lib/models") {
      return {
        SEEDANCE_FAST: "bytedance/seedance-2.0/fast/image-to-video",
        SEEDANCE_FULL: "bytedance/seedance-2.0/image-to-video",
      };
    }
    throw new Error(`unexpected import: ${id}`);
  },
  loaded.exports,
  loaded
);

const {
  providerValidationBudgetUsd,
  providerValidationEnvironmentGate,
} = loaded.exports;
assert.equal(providerValidationBudgetUsd({}), 0);
assert.equal(
  providerValidationBudgetUsd({
    PIKBO_PROVIDER_VALIDATION_MODE: "1",
    NODE_ENV: "production",
    VERCEL_ENV: "preview",
  }),
  0
);
assert.equal(
  providerValidationBudgetUsd({
    PIKBO_PROVIDER_VALIDATION_MODE: "1",
    PIKBO_PREVIEW_PROVIDER_VALIDATION_ENABLED: "1",
    NODE_ENV: "production",
    VERCEL_ENV: "preview",
  }),
  20
);
assert.equal(
  providerValidationBudgetUsd({
    PIKBO_PROVIDER_VALIDATION_MODE: "1",
    PIKBO_PREVIEW_PROVIDER_VALIDATION_ENABLED: "1",
    NODE_ENV: "test",
    VERCEL_ENV: "production",
  }),
  0
);
assert.equal(
  providerValidationBudgetUsd({
    PIKBO_PROVIDER_VALIDATION_MODE: "1",
    NODE_ENV: "test",
    VERCEL_ENV: "preview",
  }),
  0
);
assert.equal(
  providerValidationBudgetUsd({
    PIKBO_PROVIDER_VALIDATION_MODE: "1",
    PIKBO_PREVIEW_PROVIDER_VALIDATION_ENABLED: "1",
    NODE_ENV: "test",
    VERCEL_ENV: "preview",
  }),
  20
);
assert.equal(
  providerValidationBudgetUsd({
    PIKBO_PROVIDER_VALIDATION_MODE: "1",
    PIKBO_PROVIDER_VALIDATION_BUDGET_USD: "5.75",
  }),
  5.75
);
assert.equal(
  providerValidationBudgetUsd({
    PIKBO_PROVIDER_VALIDATION_MODE: "1",
    PIKBO_PROVIDER_VALIDATION_BUDGET_USD: "999",
  }),
  20
);
assert.deepEqual(
  providerValidationEnvironmentGate({
    NODE_ENV: "production",
    VERCEL_ENV: "production",
    PIKBO_PREVIEW_PROVIDER_VALIDATION_ENABLED: "1",
  }),
  {
    environment: "vercel-production",
    previewOverride: false,
    environmentAllowed: false,
    productionHardClosed: true,
  }
);
assert.deepEqual(
  providerValidationEnvironmentGate({
    NODE_ENV: "test",
    VERCEL_ENV: "preview",
  }),
  {
    environment: "vercel-preview",
    previewOverride: false,
    environmentAllowed: false,
    productionHardClosed: false,
  }
);
assert.deepEqual(
  providerValidationEnvironmentGate({
    NODE_ENV: "production",
    VERCEL_ENV: "preview",
    PIKBO_PREVIEW_PROVIDER_VALIDATION_ENABLED: "1",
  }),
  {
    environment: "vercel-preview",
    previewOverride: true,
    environmentAllowed: true,
    productionHardClosed: false,
  }
);
assert.deepEqual(
  providerValidationEnvironmentGate({
    NODE_ENV: "production",
  }),
  {
    environment: "closed",
    previewOverride: false,
    environmentAllowed: false,
    productionHardClosed: true,
  }
);

const budgetMigration = read(
  "supabase/migrations/20260729022000_provider_validation_budget.sql"
);
const pgcryptoMigration = read(
  "supabase/migrations/20260723121000_pgcrypto_extensions.sql"
);
assert.match(pgcryptoMigration, /alter extension pgcrypto set schema extensions/);
assert.match(pgcryptoMigration, /extensions\.digest\(text,text\)/);
assert.match(pgcryptoMigration, /PGCRYPTO_EXTENSIONS_SCHEMA_REQUIRED/);

assert.match(budgetMigration, /provider_validation_budgets/);
assert.match(budgetMigration, /scope text primary key/);
assert.match(budgetMigration, /check \(scope = 'project'\)/);
assert.match(budgetMigration, /provider_spend_reservations/);
assert.match(budgetMigration, /20000000/);
assert.match(budgetMigration, /pikbo_reserve_provider_spend_v1/);
assert.match(budgetMigration, /pikbo_commit_provider_spend_v1/);
assert.match(budgetMigration, /pikbo_release_provider_spend_v1/);
assert.match(budgetMigration, /pikbo_expire_provider_spend_v1/);
assert.match(budgetMigration, /expires_at <= now\(\)/);
assert.match(budgetMigration, /for update skip locked/);
assert.match(
  budgetMigration,
  /where scope = 'project'\s+for update/,
  "every account must serialize through one project-wide budget row"
);
assert.doesNotMatch(
  budgetMigration,
  /provider_validation_budgets[\s\S]{0,240}account_id uuid/,
  "the validation budget must not be scoped per account"
);
assert.match(budgetMigration, /enable row level security/);
assert.match(budgetMigration, /from public, anon, authenticated/);
assert.match(budgetMigration, /to service_role/);

const deprecatedBudgetMigration = read(
  "supabase/migrations/20260729023000_deprecate_seedance2_budget.sql"
);
assert.match(
  deprecatedBudgetMigration,
  /set ceiling_usd = spent_usd/,
  "the obsolete budget must retain zero remaining headroom"
);
assert.match(
  deprecatedBudgetMigration,
  /PROVIDER_BUDGET_V1_DEPRECATED/,
  "the obsolete RPC must fail closed"
);
assert.match(
  deprecatedBudgetMigration,
  /from public, anon, authenticated, service_role/,
  "no runtime role may execute the obsolete admission path"
);

const providerWorker = read(
  "app/api/internal/provider-budget/reconcile/route.ts"
);
assert.match(providerWorker, /PIKBO_INTERNAL_WORKER_SECRET/);
assert.match(providerWorker, /timingSafeEqual/);
assert.match(providerWorker, /suppliedBuffer\.byteLength/);
assert.match(providerWorker, /secretBuffer\.byteLength/);
assert.match(providerWorker, /expireDurableProviderSpendReservations/);
assert.doesNotMatch(
  providerWorker,
  /body\.(userId|accountId|reservationId|amount|expiredBefore)/,
  "worker input must not choose an owner, reservation, amount, or cutoff"
);
const health = read("app/api/health/route.ts");
assert.match(health, /providerValidationBudgetUsd/);
assert.match(health, /providerValidationEnvironmentGate/);
assert.match(health, /productionHardClosed/);
assert.match(health, /SELLER_PACK_LIVE_MODEL_ID/);
assert.match(health, /SELLER_PACK_LIVE_RESOLUTION/);

const models = read("lib/models.ts");
assert.match(
  models,
  /SELLER_PACK_LIVE_RESOLUTION:\s*SeedanceResolution\s*=\s*"720p"/
);
assert.match(
  models,
  /SELLER_PACK_LIVE_MODEL_ID\s*=\s*"seedance-fast"/
);
const meRoute = read("app/api/me/route.ts");
assert.match(meRoute, /capability\.canLiveGenerate[\s\S]*SELLER_PACK_LIVE_MODEL_ID/);
assert.match(
  meRoute,
  /capability\.canLiveGenerate[\s\S]*SELLER_PACK_LIVE_RESOLUTION/
);

const settlementGuard = read(
  "supabase/migrations/20260729021000_private_settlement_guard.sql"
);
assert.match(settlementGuard, /PRIVATE_RESULT_REQUIRED/);
assert.match(settlementGuard, /output_object_key is distinct from v_expected_key/);
assert.match(settlementGuard, /output_content_type is distinct from 'video\/mp4'/);
assert.match(settlementGuard, /output_sha256 !~ '\^\[a-f0-9\]\{64\}\$'/);
assert.match(settlementGuard, /pack_run_id is null/);

const generate = read("app/api/generate/route.ts");
assert.match(generate, /reserveDurableProviderSpend/);
assert.match(generate, /commitDurableProviderSpend/);
assert.match(generate, /releaseDurableProviderSpend/);
assert.match(generate, /providerRequestStarted = true/);
assert.match(generate, /bindProviderSpendIntent\(serverAccess,\s*allowProviderSpend\)/);
assert.ok(
  generate.indexOf("bindProviderSpendIntent(serverAccess") <
    generate.indexOf("reserveDurableProviderSpend({"),
  "client cached intent must fence provider spend before any USD reservation"
);
assert.match(
  generate,
  /const resolution = access\.kind === "live"\s*\?\s*SELLER_PACK_LIVE_RESOLUTION/,
  "every admitted private live validation must use the fixed 720p contract"
);
assert.ok(
  generate.indexOf("reserveDurableProviderSpend({") <
    generate.indexOf("reserveStrictLiveGeneration({"),
  "provider USD reservation must precede credit reserve"
);
assert.ok(
  generate.indexOf("savePrivateGenerationResult({") <
    generate.indexOf("reservationLife.settle("),
  "private object must precede credit settlement"
);
assert.doesNotMatch(generate, /tryReservePaidCeilingUsd/);
for (const clientPath of [
  "components/CreateStudio.tsx",
  "components/BatchStudio.tsx",
  "components/LandingToolPanel.tsx",
]) {
  assert.match(
    read(clientPath),
    /allowProviderSpend:\s*!demoMode/,
    `${clientPath} must bind the displayed mode to provider-spend consent`
  );
}

console.log(
  "provider-budget-private-settlement-regression: PASS (preview-only project-global US$20 cap · idempotent transition/expiry · private-object capture guard)"
);
