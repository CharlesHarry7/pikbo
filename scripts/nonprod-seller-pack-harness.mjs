#!/usr/bin/env node

/**
 * Non-production, zero-Provider private-input + Pack-reservation harness.
 *
 * This is deliberately a service-owned fixture tool, not an application
 * bypass. It creates two synthetic users in the dedicated Preview database,
 * uploads one repository-owned toy image, reserves one 30-credit Pack, proves
 * recovery/RLS/storage isolation, then removes every tracked row and object.
 * It never calls Pikbo generation, Provider, Stripe, or production endpoints.
 */

import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const TARGET_PROJECT_REF = "lpfvfybkggiugosugfcw";
const TARGET_ORIGIN = `https://${TARGET_PROJECT_REF}.supabase.co`;
const INPUT_BUCKET = "pikbo-toy-inputs";
const ALLOWED_RPC_PATHS = new Set([
  "/rest/v1/rpc/pikbo_reserve_seller_pack_with_asset_v1",
  "/rest/v1/rpc/pikbo_get_seller_pack_status_v2",
]);
const SENSITIVE_READ_ONLY_TABLE_PATHS = new Set([
  "/rest/v1/provider_validation_budgets",
  "/rest/v1/provider_spend_reservations",
  "/rest/v1/stripe_events",
  "/rest/v1/subscription_records",
  "/rest/v1/generation_reconciliations",
  "/rest/v1/seller_pack_reconciliations",
  "/rest/v1/generation_derivatives",
  "/rest/v1/seedance2_cost_audit",
  "/rest/v1/consumed_guest_sessions",
]);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function validateTargetUrl(rawUrl) {
  const url = new URL(rawUrl);
  assert.equal(url.origin, TARGET_ORIGIN, "Unexpected Supabase project; refusing to run");
  assert.equal(url.username, "", "Supabase URL credentials are forbidden");
  assert.equal(url.password, "", "Supabase URL credentials are forbidden");
  assert.equal(url.pathname, "/", "Supabase URL path is forbidden");
  assert.equal(url.search, "", "Supabase URL query is forbidden");
  assert.equal(url.hash, "", "Supabase URL hash is forbidden");
  return url.origin;
}

function failClosedPreflight() {
  assert.equal(
    process.env.E2E_ALLOW_NONPROD,
    "1",
    "E2E_ALLOW_NONPROD=1 is required"
  );
  assert.equal(
    required("E2E_EXPECTED_SUPABASE_PROJECT_REF"),
    TARGET_PROJECT_REF,
    `Only dedicated non-production project ${TARGET_PROJECT_REF} is allowed`
  );
  assert.notEqual(
    process.env.VERCEL_ENV,
    "production",
    "Vercel production is forbidden"
  );
  for (const secretName of [
    "FAL_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
  ]) {
    assert.ok(
      !process.env[secretName]?.trim(),
      `${secretName} must be absent for the zero-Provider harness`
    );
  }

  return validateTargetUrl(
    process.env.SUPABASE_URL || required("NEXT_PUBLIC_SUPABASE_URL")
  );
}

function assertOk(label, result) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data;
}

function payload(value, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), label);
  return value;
}

async function tableCount(client, table, filter) {
  let query = client.from(table).select("*", { count: "exact", head: true });
  if (filter) query = filter(query);
  const result = await query;
  if (result.error) throw new Error(`${table} count: ${result.error.message}`);
  return result.count || 0;
}

export function validateHarnessRequest(
  rawUrl,
  allowedOrigin = TARGET_ORIGIN,
  method = "GET"
) {
  const target = new URL(rawUrl);
  assert.equal(
    target.origin,
    allowedOrigin,
    `Third-party network request forbidden: ${target.hostname}`
  );
  if (target.pathname.startsWith("/rest/v1/rpc/")) {
    assert.ok(
      ALLOWED_RPC_PATHS.has(target.pathname),
      `Supabase RPC forbidden in zero-Provider harness: ${target.pathname}`
    );
  }
  if (target.pathname.startsWith("/storage/v1/")) {
    const segments = decodeURIComponent(target.pathname).split("/").filter(Boolean);
    const operation = segments[2];
    const bucket = ["list", "sign", "move", "copy"].includes(segments[3])
      ? segments[4]
      : segments[3];
    assert.equal(operation, "object", "Only Storage object operations are allowed");
    assert.equal(
      bucket,
      INPUT_BUCKET,
      `Storage bucket forbidden in zero-Provider harness: ${target.pathname}`
    );
  }
  if (SENSITIVE_READ_ONLY_TABLE_PATHS.has(target.pathname)) {
    assert.ok(
      ["GET", "HEAD"].includes(method.toUpperCase()),
      `Sensitive evidence table is read-only in harness: ${target.pathname}`
    );
  }
  return target;
}

function createGuardedFetch(allowedOrigin, networkAudit) {
  return async (input, init) => {
    const method = init?.method ||
      (typeof input === "object" && "method" in input ? input.method : "GET");
    validateHarnessRequest(
      typeof input === "string" || input instanceof URL ? input.toString() : input.url,
      allowedOrigin,
      method
    );
    networkAudit.supabaseRequests += 1;
    return fetch(input, init);
  };
}

async function createActor(
  admin,
  anonKey,
  supabaseUrl,
  guardedFetch,
  fixture,
  runId,
  suffix,
  credits
) {
  const password = `${randomBytes(24).toString("base64url")}Aa1!`;
  const email = `pikbo-e2e-${runId}-${suffix}@example.com`;
  const created = assertOk(
    `create synthetic user ${suffix}`,
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { pikbo_nonprod_run: runId, synthetic: true },
    })
  );
  const userId = created.user?.id;
  assert.ok(userId, `synthetic user ${suffix} id missing`);
  fixture.userIds.push(userId);

  const accountId = randomUUID();
  assertOk(
    `profile ${suffix}`,
    await admin.from("profiles").insert({ id: userId })
  );
  assertOk(
    `account ${suffix}`,
    await admin.from("accounts").insert({
      id: accountId,
      owner_user_id: userId,
      kind: "personal",
      plan_id: "free",
      status: "active",
      live_generation_allowed: true,
    })
  );
  fixture.accountIds.push(accountId);
  fixture.accountOwnerById[accountId] = userId;
  assertOk(
    `membership ${suffix}`,
    await admin.from("account_memberships").insert({
      account_id: accountId,
      user_id: userId,
      role: "owner",
    })
  );
  assertOk(
    `wallet ${suffix}`,
    await admin.from("credit_wallets").insert({
      account_id: accountId,
      available_credits: credits,
      reserved_credits: 0,
      lifetime_used_credits: 0,
    })
  );
  assertOk(
    `ledger grant ${suffix}`,
    await admin.from("credit_ledger").insert({
      account_id: accountId,
      kind: "grant",
      delta_available: credits,
      delta_reserved: 0,
      available_after: credits,
      reserved_after: 0,
      source_type: "nonprod_fixture",
      source_id: runId,
      idempotency_key: `nonprod:${runId}:${suffix}:grant`,
      metadata: { synthetic: true, zeroProvider: true },
    })
  );

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: guardedFetch },
  });
  const signedIn = assertOk(
    `sign in synthetic user ${suffix}`,
    await userClient.auth.signInWithPassword({ email, password })
  );
  assert.equal(signedIn.user?.id, userId, `synthetic user ${suffix} mismatch`);
  assert.ok(signedIn.session?.access_token, `synthetic user ${suffix} session missing`);
  return { suffix, userId, accountId, userClient };
}

async function discoverTrackedPack(admin, fixture) {
  if (!fixture.packRunId && fixture.ownerUserId && fixture.clientPackKey) {
    const rows = assertOk(
      "discover exact fixture Pack",
      await admin
        .from("seller_pack_runs")
        .select("id,reservation_id")
        .eq("created_by", fixture.ownerUserId)
        .eq("client_pack_key", fixture.clientPackKey)
        .limit(2)
    );
    assert.ok(rows.length <= 1, "multiple Packs found for exact fixture identity");
    if (rows[0]) {
      fixture.packRunId = rows[0].id;
      fixture.reservationId = rows[0].reservation_id;
    }
  }
  if (!fixture.packRunId) return;
  const jobs = assertOk(
    "discover exact fixture jobs",
    await admin.from("generation_jobs").select("id").eq("pack_run_id", fixture.packRunId)
  );
  fixture.jobIds = [...new Set([...fixture.jobIds, ...jobs.map((job) => job.id)])];
}

export function assertSafeRelatedCounts(relatedCounts) {
  const expected = Object.fromEntries(
    Object.keys(relatedCounts).map((key) => [key, 0])
  );
  assert.deepEqual(
    relatedCounts,
    expected,
    "unexpected Provider, Stripe, derivative, guest-session, or reconciliation rows; preserving fixture for investigation"
  );
}

export function assertBudgetSnapshotUnchanged(before, after) {
  assert.deepEqual(
    after,
    before,
    "provider validation budget changed during zero-Provider harness"
  );
}

export function assertTrackedAccountOwner(accountId, expectedOwner, actual) {
  assert.ok(expectedOwner, `account owner registry missing for ${accountId}`);
  assert.equal(actual?.id, accountId, `account identity mismatch for ${accountId}`);
  assert.equal(
    actual?.owner_user_id,
    expectedOwner,
    `account ownership mismatch for ${accountId}`
  );
}

async function relatedFixtureCounts(admin, fixture) {
  const hasAccounts = fixture.accountIds.length > 0;
  const hasUsers = fixture.userIds.length > 0;
  const hasJobs = fixture.jobIds.length > 0;
  return {
    providerSpend: hasAccounts
      ? await tableCount(admin, "provider_spend_reservations", (q) =>
          q.in("account_id", fixture.accountIds)
        )
      : 0,
    subscriptions: hasAccounts
      ? await tableCount(admin, "subscription_records", (q) =>
          q.in("account_id", fixture.accountIds)
        )
      : 0,
    stripeEvents: hasAccounts
      ? await tableCount(admin, "stripe_events", (q) =>
          q.in("account_id", fixture.accountIds)
        )
      : 0,
    generationReconciliations: hasJobs
      ? await tableCount(admin, "generation_reconciliations", (q) =>
          q.in("job_id", fixture.jobIds)
        )
      : 0,
    packReconciliations: hasJobs
      ? await tableCount(admin, "seller_pack_reconciliations", (q) =>
          q.in("job_id", fixture.jobIds)
        )
      : 0,
    derivatives: hasJobs
      ? await tableCount(admin, "generation_derivatives", (q) =>
          q.in("job_id", fixture.jobIds)
        )
      : 0,
    seedanceAuditByUser: hasUsers
      ? await tableCount(admin, "seedance2_cost_audit", (q) =>
          q.in("user_id", fixture.userIds)
        )
      : 0,
    seedanceAuditByJob: hasJobs
      ? await tableCount(admin, "seedance2_cost_audit", (q) =>
          q.in("job_id", fixture.jobIds)
        )
      : 0,
    consumedGuestByUser: hasUsers
      ? await tableCount(admin, "consumed_guest_sessions", (q) =>
          q.in("user_id", fixture.userIds)
        )
      : 0,
    consumedGuestByAccount: hasAccounts
      ? await tableCount(admin, "consumed_guest_sessions", (q) =>
          q.in("account_id", fixture.accountIds)
        )
      : 0,
  };
}

async function assertFixtureOwnership(admin, fixture) {
  for (const userId of fixture.userIds) {
    const result = assertOk(
      `synthetic auth ownership ${userId}`,
      await admin.auth.admin.getUserById(userId)
    );
    assert.equal(result.user?.user_metadata?.pikbo_nonprod_run, fixture.runId);
    assert.equal(result.user?.user_metadata?.synthetic, true);
  }
  for (const accountId of fixture.accountIds) {
    const expectedOwner = fixture.accountOwnerById[accountId];
    const account = assertOk(
      `fixture account ownership ${accountId}`,
      await admin
        .from("accounts")
        .select("id,owner_user_id")
        .eq("id", accountId)
        .single()
    );
    assertTrackedAccountOwner(accountId, expectedOwner, account);
  }
  if (fixture.assetId) {
    const asset = assertOk(
      "fixture asset ownership",
      await admin
        .from("toy_assets")
        .select("id,owner_user_id,object_key")
        .eq("id", fixture.assetId)
        .maybeSingle()
    );
    if (asset) {
      assert.equal(asset.owner_user_id, fixture.ownerUserId);
      assert.equal(asset.object_key, fixture.objectKey);
    }
  }
  if (fixture.packRunId) {
    const pack = assertOk(
      "fixture Pack ownership",
      await admin
        .from("seller_pack_runs")
        .select("id,created_by,account_id,client_pack_key,reservation_id")
        .eq("id", fixture.packRunId)
        .single()
    );
    assert.equal(pack.created_by, fixture.ownerUserId);
    assert.equal(pack.account_id, fixture.ownerAccountId);
    assert.equal(pack.client_pack_key, fixture.clientPackKey);
    assert.equal(pack.reservation_id, fixture.reservationId);
    const jobs = assertOk(
      "fixture job ownership",
      await admin
        .from("generation_jobs")
        .select("id,created_by,account_id,pack_run_id,provider,provider_request_id,output_object_key,settled_credits")
        .eq("pack_run_id", fixture.packRunId)
    );
    assert.deepEqual(
      jobs.map((job) => job.id).sort(),
      [...fixture.jobIds].sort(),
      "job registry differs from exact Pack children"
    );
    assert.ok(
      jobs.every(
        (job) =>
          job.created_by === fixture.ownerUserId &&
          job.account_id === fixture.ownerAccountId &&
          job.pack_run_id === fixture.packRunId &&
          !job.provider &&
          !job.provider_request_id &&
          !job.output_object_key &&
          job.settled_credits === 0
      ),
      "fixture jobs contain provider, delivery, settlement, or ownership evidence"
    );
  }
}

async function assertCleanupIsSafe(admin, fixture) {
  await assertFixtureOwnership(admin, fixture);
  assertSafeRelatedCounts(await relatedFixtureCounts(admin, fixture));
  assert.ok(
    fixture.providerBudgetBefore,
    "provider budget baseline missing; preserving fixture for investigation"
  );
  const budgetNow = assertOk(
    "provider budget cleanup safety snapshot",
    await admin.from("provider_validation_budgets").select("*").order("scope")
  );
  assertBudgetSnapshotUnchanged(fixture.providerBudgetBefore, budgetNow);
}

async function cleanupFixture(admin, fixture) {
  const errors = [];
  async function remove(label, operation) {
    try {
      const result = await operation();
      if (result?.error) errors.push(`${label}: ${result.error.message}`);
    } catch (error) {
      errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (fixture.objectKey) {
    await remove("storage object", () =>
      admin.storage.from(INPUT_BUCKET).remove([fixture.objectKey])
    );
  }
  if (fixture.jobIds.length) {
    await remove("generation jobs", () =>
      admin
        .from("generation_jobs")
        .delete()
        .in("id", fixture.jobIds)
        .eq("created_by", fixture.ownerUserId)
        .eq("pack_run_id", fixture.packRunId)
    );
  }
  if (fixture.packRunId) {
    await remove("seller Pack", () =>
      admin
        .from("seller_pack_runs")
        .delete()
        .eq("id", fixture.packRunId)
        .eq("created_by", fixture.ownerUserId)
        .eq("client_pack_key", fixture.clientPackKey)
    );
  }
  for (const accountId of fixture.accountIds) {
    await remove(`ledger ${accountId}`, () =>
      admin.from("credit_ledger").delete().eq("account_id", accountId)
    );
  }
  if (fixture.reservationId) {
    await remove("reservation", () =>
      admin
        .from("credit_reservations")
        .delete()
        .eq("id", fixture.reservationId)
        .eq("account_id", fixture.ownerAccountId)
    );
  }
  if (fixture.assetId) {
    await remove("toy asset", () =>
      admin
        .from("toy_assets")
        .delete()
        .eq("id", fixture.assetId)
        .eq("owner_user_id", fixture.ownerUserId)
    );
  }
  for (const accountId of fixture.accountIds) {
    await remove(`membership ${accountId}`, () =>
      admin.from("account_memberships").delete().eq("account_id", accountId)
    );
    await remove(`wallet ${accountId}`, () =>
      admin.from("credit_wallets").delete().eq("account_id", accountId)
    );
    await remove(`account ${accountId}`, () =>
      admin
        .from("accounts")
        .delete()
        .eq("id", accountId)
        .eq("owner_user_id", fixture.accountOwnerById[accountId])
    );
  }
  for (const userId of fixture.userIds) {
    await remove(`profile ${userId}`, () =>
      admin.from("profiles").delete().eq("id", userId)
    );
    await remove(`auth user ${userId}`, () => admin.auth.admin.deleteUser(userId));
  }
  if (errors.length) throw new Error(`cleanup failed: ${errors.join(" | ")}`);
}

async function verifyZeroResidue(admin, fixture) {
  const checks = [];
  if (fixture.assetId) {
    checks.push(
      tableCount(admin, "toy_assets", (q) => q.eq("id", fixture.assetId))
    );
  }
  if (fixture.packRunId) {
    checks.push(
      tableCount(admin, "seller_pack_runs", (q) => q.eq("id", fixture.packRunId)),
      tableCount(admin, "generation_jobs", (q) => q.eq("pack_run_id", fixture.packRunId))
    );
  }
  for (const accountId of fixture.accountIds) {
    checks.push(
      tableCount(admin, "accounts", (q) => q.eq("id", accountId)),
      tableCount(admin, "account_memberships", (q) => q.eq("account_id", accountId)),
      tableCount(admin, "credit_wallets", (q) => q.eq("account_id", accountId)),
      tableCount(admin, "credit_ledger", (q) => q.eq("account_id", accountId)),
      tableCount(admin, "credit_reservations", (q) => q.eq("account_id", accountId))
    );
  }
  for (const userId of fixture.userIds) {
    checks.push(tableCount(admin, "profiles", (q) => q.eq("id", userId)));
  }
  const counts = await Promise.all(checks);
  assert.ok(counts.every((count) => count === 0), "tracked database residue remains");
  assertSafeRelatedCounts(await relatedFixtureCounts(admin, fixture));
  const budgetAfter = assertOk(
    "provider budget zero-residue snapshot",
    await admin.from("provider_validation_budgets").select("*").order("scope")
  );
  if (fixture.providerBudgetBefore) {
    assertBudgetSnapshotUnchanged(fixture.providerBudgetBefore, budgetAfter);
  }
  for (const userId of fixture.userIds) {
    const result = await admin.auth.admin.getUserById(userId);
    assert.ok(!result.data.user, `tracked auth user ${userId} remains`);
  }
  if (fixture.objectKey) {
    const listed = assertOk(
      "storage cleanup probe",
      await admin.storage
        .from(INPUT_BUCKET)
        .list(dirname(fixture.objectKey), { search: fixture.objectKey.split("/").at(-1) })
    );
    assert.equal(listed.length, 0, "tracked Storage object remains");
  }
}

async function main() {
  const supabaseUrl = failClosedPreflight();
  const anonKey =
    process.env.SUPABASE_ANON_KEY || required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
  assert.notEqual(serviceRoleKey, "<redacted>", "redacted service role key rejected");

  const networkAudit = { supabaseRequests: 0 };
  const guardedFetch = createGuardedFetch(supabaseUrl, networkAudit);
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: guardedFetch },
  });
  const runId = randomUUID().replaceAll("-", "").slice(0, 16);
  const fixture = {
    runId,
    userIds: [],
    accountIds: [],
    accountOwnerById: {},
    jobIds: [],
    assetId: null,
    objectKey: null,
    packRunId: null,
    reservationId: null,
    ownerUserId: null,
    ownerAccountId: null,
    clientPackKey: null,
    providerBudgetBefore: null,
  };
  let primaryError = null;
  let report = null;

  try {
    const projectProbe = await admin.from("toy_assets").select("id").limit(1);
    assertOk("non-production schema preflight", projectProbe);
    const providerBefore = await tableCount(admin, "provider_spend_reservations");
    const stripeBefore = await tableCount(admin, "stripe_events");
    fixture.providerBudgetBefore = assertOk(
      "provider budget baseline",
      await admin.from("provider_validation_budgets").select("*").order("scope")
    );

    const owner = await createActor(
      admin,
      anonKey,
      supabaseUrl,
      guardedFetch,
      fixture,
      runId,
      "a",
      40
    );
    fixture.ownerUserId = owner.userId;
    fixture.ownerAccountId = owner.accountId;
    const outsider = await createActor(
      admin,
      anonKey,
      supabaseUrl,
      guardedFetch,
      fixture,
      runId,
      "b",
      10
    );

    const bytes = await readFile(join(root, "public/demos/scout-still.webp"));
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    fixture.assetId = randomUUID();
    fixture.objectKey = `${owner.userId}/${fixture.assetId}/source.webp`;
    const clientAssetKey = `qa-zero-provider:${runId}`;
    assertOk(
      "upload synthetic input fixture",
      await admin.storage.from(INPUT_BUCKET).upload(fixture.objectKey, bytes, {
        contentType: "image/webp",
        upsert: false,
      })
    );
    assertOk(
      "insert ready toy asset fixture",
      await admin.from("toy_assets").insert({
        id: fixture.assetId,
        owner_user_id: owner.userId,
        client_asset_key: clientAssetKey,
        object_key: fixture.objectKey,
        sha256,
        mime_type: "image/webp",
        size_bytes: bytes.byteLength,
        sku_label: "PIKBO QA SYNTHETIC INPUT",
        state: "ready",
        verified_at: new Date().toISOString(),
      })
    );

    const clientPackKey = `qa-zero-provider:${runId}`;
    fixture.clientPackKey = clientPackKey;
    const reserved = payload(
      assertOk(
        "asset-bound Pack reserve",
        await admin.rpc("pikbo_reserve_seller_pack_with_asset_v1", {
          p_user_id: owner.userId,
          p_client_pack_key: clientPackKey,
          p_input_asset_id: fixture.assetId,
          p_rights_confirmed: true,
        })
      ),
      "reserve payload missing"
    );
    assert.equal(reserved.ok, true);
    assert.equal(reserved.quotedCredits, 30);
    assert.equal(reserved.inputAssetId, fixture.assetId);
    assert.ok(Array.isArray(reserved.jobs));
    assert.equal(reserved.jobs.length, 3);
    fixture.packRunId = reserved.packRunId;
    fixture.reservationId = reserved.reservationId;
    fixture.jobIds.push(...reserved.jobs.map((job) => job.jobId));

    const replay = payload(
      assertOk(
        "idempotent Pack replay",
        await admin.rpc("pikbo_reserve_seller_pack_with_asset_v1", {
          p_user_id: owner.userId,
          p_client_pack_key: clientPackKey,
          p_input_asset_id: fixture.assetId,
          p_rights_confirmed: true,
        })
      ),
      "replay payload missing"
    );
    assert.equal(replay.ok, true);
    assert.equal(replay.idempotent, true);
    assert.equal(replay.packRunId, fixture.packRunId);

    const jobs = assertOk(
      "bound child rows",
      await admin
        .from("generation_jobs")
        .select("id,pack_child_key,effect_slug,aspect_ratio,duration_seconds,status,quoted_credits,input_asset_id,provider,provider_request_id")
        .eq("pack_run_id", fixture.packRunId)
        .order("created_at")
    );
    assert.equal(jobs.length, 3);
    assert.ok(jobs.every((job) => job.input_asset_id === fixture.assetId));
    assert.ok(jobs.every((job) => job.status === "queued"));
    assert.ok(jobs.every((job) => !job.provider && !job.provider_request_id));
    assert.deepEqual(
      jobs.map((job) => [job.pack_child_key, job.aspect_ratio, job.duration_seconds]),
      [
        ["listing_spin", "1:1", 5],
        ["blind_box_reveal", "9:16", 5],
        ["social_flash", "9:16", 5],
      ]
    );

    const wallet = assertOk(
      "wallet after reserve",
      await admin
        .from("credit_wallets")
        .select("available_credits,reserved_credits,lifetime_used_credits")
        .eq("account_id", owner.accountId)
        .single()
    );
    assert.deepEqual(wallet, {
      available_credits: 10,
      reserved_credits: 30,
      lifetime_used_credits: 0,
    });

    const recovered = payload(
      assertOk(
        "owner Pack recovery",
        await admin.rpc("pikbo_get_seller_pack_status_v2", {
          p_user_id: owner.userId,
          p_pack_run_id: fixture.packRunId,
        })
      ),
      "recovery payload missing"
    );
    assert.equal(recovered.ok, true);
    assert.equal(recovered.packRunId, fixture.packRunId);
    assert.equal(recovered.jobs.length, 3);

    const safeColumns = "id,sha256,mime_type,size_bytes,sku_label,state,created_at,verified_at";
    const ownerAssets = assertOk(
      "owner asset RLS",
      await owner.userClient.from("toy_assets").select(safeColumns).eq("id", fixture.assetId)
    );
    const outsiderAssets = assertOk(
      "outsider asset RLS",
      await outsider.userClient.from("toy_assets").select(safeColumns).eq("id", fixture.assetId)
    );
    assert.equal(ownerAssets.length, 1);
    assert.equal(outsiderAssets.length, 0);
    const objectKeyAttempt = await owner.userClient
      .from("toy_assets")
      .select("object_key")
      .eq("id", fixture.assetId);
    assert.ok(objectKeyAttempt.error, "authenticated owner must not read object_key");

    const ownerPacks = assertOk(
      "owner Pack RLS",
      await owner.userClient
        .from("seller_pack_runs")
        .select("id,input_asset_id,status,quoted_credits")
        .eq("id", fixture.packRunId)
    );
    const outsiderPacks = assertOk(
      "outsider Pack RLS",
      await outsider.userClient
        .from("seller_pack_runs")
        .select("id,input_asset_id,status,quoted_credits")
        .eq("id", fixture.packRunId)
    );
    assert.equal(ownerPacks.length, 1);
    assert.equal(outsiderPacks.length, 0);
    const ownerJobs = assertOk(
      "owner jobs RLS",
      await owner.userClient.from("generation_jobs").select("id").eq("pack_run_id", fixture.packRunId)
    );
    const outsiderJobs = assertOk(
      "outsider jobs RLS",
      await outsider.userClient.from("generation_jobs").select("id").eq("pack_run_id", fixture.packRunId)
    );
    assert.equal(ownerJobs.length, 3);
    assert.equal(outsiderJobs.length, 0);

    const ownerDirectObject = await owner.userClient.storage
      .from(INPUT_BUCKET)
      .download(fixture.objectKey);
    const outsiderDirectObject = await outsider.userClient.storage
      .from(INPUT_BUCKET)
      .download(fixture.objectKey);
    assert.ok(ownerDirectObject.error, "owner must use a server-signed URL, not direct Storage read");
    assert.ok(outsiderDirectObject.error, "outsider direct Storage read must fail");
    const serviceObject = assertOk(
      "service-owned input fetch",
      await admin.storage.from(INPUT_BUCKET).download(fixture.objectKey)
    );
    const downloaded = Buffer.from(await serviceObject.arrayBuffer());
    assert.equal(downloaded.byteLength, bytes.byteLength);
    assert.equal(createHash("sha256").update(downloaded).digest("hex"), sha256);

    assert.equal(await tableCount(admin, "provider_spend_reservations"), providerBefore);
    assert.equal(await tableCount(admin, "stripe_events"), stripeBefore);
    assert.equal(
      await tableCount(admin, "subscription_records", (q) =>
        q.in("account_id", fixture.accountIds)
      ),
      0
    );

    report = {
      schemaVersion: 1,
      testKind: "nonprod-private-input-pack-reservation",
      verdict: "PASS_WITH_SCHEMA_DRIFT",
      environment: { production: false, projectRef: TARGET_PROJECT_REF },
      truthBoundary: {
        providerCalls: 0,
        stripeCalls: 0,
        aiGeneratedMedia: false,
        fixtureLabel: "PIKBO QA SYNTHETIC INPUT",
      },
      input: { ready: true, ownerVisible: true, outsiderVisible: false, checksumVerified: true },
      pack: { count: 1, quotedCredits: 30, jobs: 3, sameInputAsset: true, idempotentReserve: true },
      recovery: { owner: true, outsiderVisible: false },
      accounting: { available: 10, reserved: 30, settled: 0, providerAuthorizations: 0 },
      delivery: { tested: false, reason: "No fake generated result or settlement was created" },
      network: { allowedOrigin: supabaseUrl, thirdPartyRequests: 0 },
      schemaCompatibility: {
        remoteStatusRpc: "pikbo_get_seller_pack_status_v2",
        canonicalApplicationStatusRpc: "pikbo_get_seller_pack_status_v1",
        driftDetected: true,
        canonicalRuntimeGo: false,
      },
    };
  } catch (error) {
    primaryError = error;
  } finally {
    let cleanupError = null;
    try {
      await discoverTrackedPack(admin, fixture);
      await assertCleanupIsSafe(admin, fixture);
      await cleanupFixture(admin, fixture);
      await verifyZeroResidue(admin, fixture);
    } catch (error) {
      cleanupError = error;
    }
    if (cleanupError) {
      const tracked = {
        runId: fixture.runId,
        userIds: fixture.userIds,
        accountIds: fixture.accountIds,
        assetId: fixture.assetId,
        packRunId: fixture.packRunId,
        reservationId: fixture.reservationId,
        jobIds: fixture.jobIds,
        clientPackKey: fixture.clientPackKey,
      };
      throw new Error(
        `${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}; tracked=${JSON.stringify(tracked)}`,
        { cause: primaryError || undefined }
      );
    }
  }

  if (primaryError) throw primaryError;
  report.network.supabaseRequests = networkAudit.supabaseRequests;
  report.cleanup = { passed: true, residue: 0 };
  console.log(JSON.stringify(report, null, 2));
  console.log(
    "NON-PRODUCTION PRIVATE INPUT + PACK RESERVATION HARNESS: PASS (delivery, HTTP UI, Provider, AI quality, settlement, retry, and Stripe not tested)"
  );
}

const invokedAsScript =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedAsScript) {
  main().catch((error) => {
    console.error(
      "NON-PRODUCTION PRIVATE INPUT + PACK RESERVATION HARNESS: FAIL",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  });
}
