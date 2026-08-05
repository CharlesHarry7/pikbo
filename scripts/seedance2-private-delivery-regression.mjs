#!/usr/bin/env node
/**
 * Deprecated Seedance-specific budget regression (source-only).
 *
 * The old full-model, model-specific USD ceiling is historical audit data,
 * not a live provider admission path. This test proves it is fail-closed and
 * that runtime generation uses the preview-only, project-global provider
 * validation budget instead.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (relativePath) =>
  readFileSync(join(root, relativePath), "utf8");

const historical = read(
  "supabase/migrations/20260729010000_seedance2_cost_audit.sql"
);
const deprecated = read(
  "supabase/migrations/20260729023000_deprecate_seedance2_budget.sql"
);
const projectBudget = read(
  "supabase/migrations/20260729022000_provider_validation_budget.sql"
);
const generate = read("app/api/generate/route.ts");
const models = read("lib/models.ts");

// The original migration remains readable only for historical audit context.
assert.match(historical, /HISTORICAL PIKBO Seedance 2\.0/);
assert.match(historical, /Superseded by the project-wide US\$20 provider validation budget/);
assert.match(historical, /20260729023000_deprecate_seedance2_budget\.sql/);

// Applying the follow-up removes every cent of old headroom without deleting
// historical rows, and replaces the old RPC with an explicit failure.
assert.match(deprecated, /set ceiling_usd = spent_usd/);
assert.match(
  deprecated,
  /Deprecated: no remaining headroom; use provider_validation_budgets/
);
assert.match(
  deprecated,
  /create or replace function public\.pikbo_reserve_seedance2_cost_v1/
);
assert.match(deprecated, /'code', 'PROVIDER_BUDGET_V1_DEPRECATED'/);
assert.match(deprecated, /Use the project-wide provider validation budget/);
assert.match(
  deprecated,
  /revoke all on function public\.pikbo_reserve_seedance2_cost_v1\([\s\S]*?\) from public, anon, authenticated, service_role/
);
assert.doesNotMatch(
  deprecated,
  /grant execute on function public\.pikbo_reserve_seedance2_cost_v1/
);

// The only current paid-provider budget is one serialized project-wide cap.
assert.match(projectBudget, /provider_validation_budgets/);
assert.match(projectBudget, /scope text primary key/);
assert.match(projectBudget, /check \(scope = 'project'\)/);
assert.match(projectBudget, /20000000/);
assert.match(projectBudget, /pikbo_reserve_provider_spend_v1/);
assert.match(projectBudget, /pikbo_commit_provider_spend_v1/);
assert.match(projectBudget, /pikbo_release_provider_spend_v1/);
assert.match(projectBudget, /where scope = 'project'\s+for update/);
assert.match(
  projectBudget,
  /from public, anon, authenticated[\s\S]*to service_role/
);

// Runtime generation no longer imports, calls, or configures the retired
// model-specific ceiling. It reserves the global cap before credit admission.
assert.match(generate, /reserveDurableProviderSpend/);
assert.match(generate, /commitDurableProviderSpend/);
assert.match(generate, /releaseDurableProviderSpend/);
assert.doesNotMatch(generate, /tryReservePaidCeilingUsd/);
assert.doesNotMatch(generate, /pikbo_reserve_seedance2_cost_v1/);
assert.doesNotMatch(generate, /PIKBO_SEEDANCE2_PAID_CEILING_USD/);
assert.ok(
  generate.indexOf("reserveDurableProviderSpend({") <
    generate.indexOf("reserveStrictLiveGenerationWithAsset({"),
  "project-wide provider spend must reserve before per-account credits"
);

// Product generation is pinned to the measured Fast endpoint; the historical
// full-model ceiling cannot select or authorize a model.
assert.match(models, /modelForPrivateLive[\s\S]*return SEEDANCE_FAST/);
assert.match(models, /sellerPackLiveModelEndpoint/);
assert.match(generate, /sellerPackLiveModelEndpoint/);

console.log(
  "seedance2-private-delivery-regression: PASS (legacy model-specific budget deprecated · zero old headroom · old RPC revoked/fail-closed · runtime uses project-global preview cap)"
);
