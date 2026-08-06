#!/usr/bin/env node
/**
 * Supabase schema probe — 回答一个问题：代码依赖的数据库对象真的部署了吗？
 *
 * 版本 2：修复 v1 的两个缺陷
 *   1. 静态名单过时（表名 generations/wallets/seller_packs 是旧模型名，
 *      实际 schema 是 generation_jobs/credit_wallets/seller_pack_runs）。
 *   2. PGRST202 误判：POST {} 因缺必填参数返回 PGRST202，v1 当成"缺失"。
 *      正确做法：从 /rest/v1/ OpenAPI spec 判定对象存在性。
 *
 * 用法：node --env-file=.env.local scripts/supabase-schema-probe.mjs
 * 退出码：0 = 全部存在；1 = 有缺失（供门禁使用）
 */

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("缺少 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY —— 无法探测。");
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

// 代码中实际调用的 RPC（来源：grep 'rpc("pikbo_...")' lib/ app/）
const RPCS = [
  "pikbo_attach_private_generation_output_v2",
  "pikbo_complete_toy_asset_v1",
  "pikbo_create_toy_asset_v1",
  "pikbo_get_seller_pack_status_v2",
  "pikbo_release_seller_pack_child_v2",
  "pikbo_reserve_generation_v1",
  "pikbo_reserve_generation_with_asset_v1",
  "pikbo_reserve_provider_spend_v1",
  "pikbo_reserve_seller_pack_v2",
  "pikbo_resolve_seller_pack_input_v1",
  "pikbo_retry_seller_pack_child_v1",
  "pikbo_settle_seller_pack_child_v2",
];

// 代码中实际引用的表（来源：grep '.from("...")' lib/ app/）
const TABLES = [
  "account_memberships",
  "accounts",
  "community_posts",
  "consumed_guest_sessions",
  "credit_ledger",
  "credit_reservations",
  "credit_wallets",
  "generation_derivatives",
  "generation_jobs",
  "generation_reconciliations",
  "profiles",
  "provider_spend_reservations",
  "provider_validation_budgets",
  "seller_pack_runs",
  "stripe_events",
  "toy_assets",
];

const BUCKETS = ["pikbo-private-results", "pikbo-toy-inputs"];

async function fetchOpenApi() {
  const res = await fetch(`${url}/rest/v1/`, { headers });
  if (res.status !== 200) {
    console.error(`凭据或地址无效（/rest/v1/ → HTTP ${res.status}）。中止。`);
    process.exit(1);
  }
  return res.json();
}

function report(label, results) {
  const missing = results.filter((r) => !r.ok);
  console.log(`\n=== ${label} (${results.length - missing.length}/${results.length}) ===`);
  for (const r of results) {
    console.log(`  ${r.ok ? "存在" : "缺失"}  ${r.name}`);
  }
  return missing.map((r) => r.name);
}

const spec = await fetchOpenApi();
const paths = spec.paths ?? {};
const rpcSet = new Set(
  Object.keys(paths)
    .filter((p) => p.startsWith("/rpc/"))
    .map((p) => p.slice("/rpc/".length)),
);
const tableSet = new Set(
  Object.keys(paths)
    .filter((p) => !p.startsWith("/rpc/") && p !== "/")
    .map((p) => p.slice(1)),
);
console.log(`探测目标：${url}`);
console.log(`实例暴露 RPC ${rpcSet.size} 个、表 ${tableSet.size} 张（OpenAPI spec 事实）。`);

const rpcResults = RPCS.map((name) => ({ name, ok: rpcSet.has(name) }));
const tableResults = TABLES.map((name) => ({ name, ok: tableSet.has(name) }));

const bucketsRes = await fetch(`${url}/storage/v1/bucket`, { headers });
const buckets = bucketsRes.status === 200 ? await bucketsRes.json() : [];
const bucketNames = new Set((buckets ?? []).map((b) => b.name));
const bucketResults = BUCKETS.map((name) => ({ name, ok: bucketNames.has(name) }));

const missingRpcs = report("RPC 函数", rpcResults);
const missingTables = report("表", tableResults);
const missingBuckets = report("Storage 桶", bucketResults);

if (buckets) {
  const publicBuckets = buckets.filter((b) => b.public).map((b) => b.name);
  if (publicBuckets.length) {
    console.log(`\n注意：以下桶为 public —— 私有结果契约要求非公开：${publicBuckets.join(", ")}`);
  }
}

const totalMissing = missingRpcs.length + missingTables.length + missingBuckets.length;

if (totalMissing === 0) {
  console.log("\n结论：代码依赖的数据库对象全部就位。");
  process.exit(0);
}

console.log(
  `\n结论：${totalMissing} 个对象缺失。` +
    `在补齐之前，任何"付费/私有交付"端到端流程都无法真实跑通。`,
);
process.exit(1);
