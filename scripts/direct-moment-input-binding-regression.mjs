/**
 * Direct Moment owner-photo binding (zero network).
 *
 * Proves:
 * 1. New service-role RPC reuses pikbo_reserve_generation_v1 then binds input_asset_id
 * 2. Owner/ready preflight, same-asset idempotency, different-asset conflict,
 *    legacy-unbound refusal, post-reserve rollback via raise exception
 * 3. Grants are service_role only; response never leaks object keys / hashes / URLs
 * 4. TS store + liveReservation validate the with-asset contract strictly
 * 5. /api/generate wires verified assetId + rightsConfirmed before provider
 * 6. Flux /api/image remains on the no-asset reserve path
 * 7. Soft-live readiness probes the new RPC; missing migration closes Preview
 *    readiness (not zero-Provider input admission)
 *
 * Run: npm run direct-moment-input-binding-regression
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import {
  evaluatePrivateInputAdmissionReadiness,
  evaluatePrivatePreviewReadiness,
} from "../lib/liveCapability.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const migration = read(
  "supabase/migrations/20260805010000_direct_moment_input_binding.sql"
);
const storeSrc = read("lib/durableCredits/supabaseStore.ts");
const liveSrc = read("lib/durableCredits/liveReservation.ts");
const genRoute = read("app/api/generate/route.ts");
const imgRoute = read("app/api/image/route.ts");
const privateToyAssetsSrc = read("lib/privateToyAssets.ts");
const liveCapabilitySrc = read("lib/liveCapability.ts");
const liveReadinessSrc = read("lib/liveReadinessServer.ts");

// ─── 1. Migration: service-role RPC contract ───────────────────────────────

assert.match(
  migration,
  /create or replace function public\.pikbo_reserve_generation_with_asset_v1/
);
assert.match(
  migration,
  /p_user_id uuid[\s\S]*p_idempotency_key text[\s\S]*p_effect_slug text[\s\S]*p_quoted_credits integer[\s\S]*p_input_asset_id uuid[\s\S]*p_rights_confirmed boolean/
);
assert.match(
  migration,
  /v_result := public\.pikbo_reserve_generation_v1\(/,
  "must reuse the canonical single-generation reserve"
);
assert.match(migration, /INPUT_ASSET_REQUIRED/);
assert.match(migration, /RIGHTS_CONFIRMATION_REQUIRED/);
assert.match(migration, /INPUT_ASSET_NOT_FOUND/);
assert.match(migration, /INPUT_ASSET_NOT_READY/);
assert.match(migration, /LEGACY_JOB_INPUT_UNBOUND/);
assert.match(migration, /IDEMPOTENCY_CONFLICT/);
assert.match(
  migration,
  /v_existing\.input_asset_id is null[\s\S]*LEGACY_JOB_INPUT_UNBOUND/
);
assert.match(
  migration,
  /v_existing\.input_asset_id is distinct from p_input_asset_id[\s\S]*IDEMPOTENCY_CONFLICT/
);
assert.match(
  migration,
  /set input_asset_id = p_input_asset_id/
);
assert.match(
  migration,
  /raise exception 'INPUT_ASSET_NOT_READY'/,
  "post-reserve asset failure must roll back the ledger"
);
assert.match(
  migration,
  /raise exception 'generation job input binding conflict'/
);
assert.match(
  migration,
  /'inputAssetId', p_input_asset_id[\s\S]*'rightsConfirmed', true/
);
assert.doesNotMatch(
  migration,
  /object_key|objectKey|signedUrl|sha256|sha256/i,
  "RPC return must not expose storage secrets or content hashes"
);
// Tighten: the function body must not return hash/object key fields.
const fnStart = migration.indexOf(
  "create or replace function public.pikbo_reserve_generation_with_asset_v1"
);
const fnEnd = migration.indexOf("$$;", fnStart);
assert.ok(fnStart >= 0 && fnEnd > fnStart);
const fnBody = migration.slice(fnStart, fnEnd);
assert.doesNotMatch(fnBody, /object_key|objectKey|signed_url|signedUrl|sha256/i);
assert.match(
  migration,
  /revoke all on function public\.pikbo_reserve_generation_with_asset_v1\([\s\S]*?\) from public, anon, authenticated/
);
assert.match(
  migration,
  /grant execute on function public\.pikbo_reserve_generation_with_asset_v1\([\s\S]*?\) to service_role/
);
assert.doesNotMatch(
  migration,
  /grant execute on function public\.pikbo_reserve_generation_with_asset_v1[\s\S]{0,160}to (?:public|anon|authenticated)/
);

// ─── 2. Route ordering: asset resolve → reserve with asset → provider ──────

const accessIdx = genRoute.indexOf("liveGenerationAccess({");
const directAssetIdx = genRoute.indexOf(
  "await resolveReadyPrivateToyAssetDataUrl({"
);
const cachedIdx = genRoute.indexOf('if (access.kind === "cached")');
const reserveIdx = genRoute.indexOf("reserveStrictLiveGenerationWithAsset({");
const providerIdx = genRoute.indexOf("invokeReservedProvider(");
assert.ok(accessIdx > 0, "access gate present");
assert.ok(directAssetIdx > accessIdx, "owner-ready asset resolve after access");
assert.ok(cachedIdx > directAssetIdx, "cached gate after asset resolve");
assert.ok(reserveIdx > cachedIdx, "asset-bound reserve after cached gate");
assert.ok(providerIdx > reserveIdx, "provider only after asset-bound reserve");
assert.match(
  genRoute,
  /reserveStrictLiveGenerationWithAsset\(\{[\s\S]*?inputAssetId:\s*assetId[\s\S]*?rightsConfirmed:\s*true/
);
assert.match(
  genRoute,
  /import \{[\s\S]*reserveStrictLiveGenerationWithAsset[\s\S]*\} from "@\/lib\/durableCredits\/liveReservation"/
);
assert.doesNotMatch(
  genRoute,
  /import \{[\s\S]*\breserveStrictLiveGeneration\b[\s\S]*\} from "@\/lib\/durableCredits\/liveReservation"/,
  "generate must not import the no-asset Flux reserve for Moments"
);

// Flux still path stays on no-asset contract
assert.match(
  imgRoute,
  /reserveStrictLiveGeneration\(\{[\s\S]*?userId:[\s\S]*?idempotencyKey:[\s\S]*?effectSlug:\s*"flux-toy-still"/
);
assert.doesNotMatch(imgRoute, /reserveStrictLiveGenerationWithAsset|inputAssetId/);
assert.match(liveSrc, /export async function reserveStrictLiveGeneration\(/);
assert.match(liveSrc, /export async function reserveStrictLiveGenerationWithAsset\(/);
assert.match(liveSrc, /supabaseReserveGenerationAtomic/);
assert.match(liveSrc, /supabaseReserveGenerationWithAssetAtomic/);
assert.match(
  liveSrc,
  /reserveStrictLiveGenerationWithAsset[\s\S]*rightsConfirmed:\s*true/
);

// ─── 3. Store wrapper: strict RPC response validation ──────────────────────

assert.match(storeSrc, /export async function supabaseReserveGenerationWithAssetAtomic/);
assert.match(storeSrc, /pikbo_reserve_generation_with_asset_v1/);
assert.match(
  storeSrc,
  /p_input_asset_id:\s*input\.inputAssetId[\s\S]*p_rights_confirmed:\s*input\.rightsConfirmed/
);
assert.match(
  storeSrc,
  /payload\.inputAssetId !== input\.inputAssetId/
);
assert.match(storeSrc, /payload\.rightsConfirmed !== true/);
assert.match(
  storeSrc,
  /payload\.objectKey != null|payload\.object_key != null/
);
assert.match(
  storeSrc,
  /must not return storage secrets/
);

// ─── 3b. Readiness: probe new RPC; Preview closed until migration applied ──

assert.match(
  privateToyAssetsSrc,
  /admin\.rpc\("pikbo_reserve_generation_with_asset_v1",\s*\{[\s\S]*?p_user_id:\s*null[\s\S]*?p_idempotency_key:\s*null[\s\S]*?p_input_asset_id:\s*null[\s\S]*?p_rights_confirmed:\s*false/
);
assert.match(
  privateToyAssetsSrc,
  /directMomentReserveRpcReady:\s*!directMomentReserveRpc\.error\s*&&\s*directMomentPayload\?\.code === "AUTH_REQUIRED"/
);
assert.match(
  liveCapabilitySrc,
  /directMomentReserveRpcReady/
);
assert.match(
  liveCapabilitySrc,
  /"directMomentReserveRpcReady"/
);
{
  const admissionTypeStart = liveCapabilitySrc.indexOf(
    "export type PrivateInputAdmissionReadinessInput"
  );
  const admissionTypeEnd = liveCapabilitySrc.indexOf(
    "export function evaluatePrivateInputAdmissionReadiness",
    admissionTypeStart
  );
  assert.ok(admissionTypeStart >= 0 && admissionTypeEnd > admissionTypeStart);
  const admissionType = liveCapabilitySrc.slice(
    admissionTypeStart,
    admissionTypeEnd
  );
  assert.doesNotMatch(
    admissionType,
    /directMomentReserveRpcReady/,
    "input admission must stay independent of the Moment reserve RPC"
  );
  const admissionRequiredStart = liveCapabilitySrc.indexOf(
    "const required: Array<keyof PrivateInputAdmissionReadinessInput>"
  );
  const admissionRequiredEnd = liveCapabilitySrc.indexOf(
    "];",
    admissionRequiredStart
  );
  const admissionRequired = liveCapabilitySrc.slice(
    admissionRequiredStart,
    admissionRequiredEnd
  );
  assert.doesNotMatch(admissionRequired, /directMomentReserveRpcReady/);
}
assert.match(
  liveReadinessSrc,
  /directMomentReserveRpcReady:\s*privateInputs\.directMomentReserveRpcReady/
);

{
  const privatePreviewReady = {
    authConfigured: true,
    durableAtomicReservationConfigured: true,
    durableReconciliationConfigured: true,
    providerConfigured: true,
    privateResultsBucketReady: true,
    privateResultsSchemaReady: true,
    privateResultsRpcReady: true,
    privateInputsBucketReady: true,
    privateInputsSchemaReady: true,
    privateInputsReserveRpcReady: true,
    directMomentReserveRpcReady: true,
    privateInputsDiscoveryReady: true,
    providerOutputAllowlistConfigured: true,
    privateLiveEnabled: true,
    privateLiveAllowlistConfigured: true,
    privateLiveBudgetConfigured: true,
    providerValidationEnvironmentAllowed: true,
    providerValidationBudgetConfigured: true,
    durableProviderBudgetSchemaReady: true,
    durableProviderBudgetRpcReady: true,
  };
  assert.equal(
    evaluatePrivatePreviewReadiness(privatePreviewReady).ready,
    true
  );
  const closed = evaluatePrivatePreviewReadiness({
    ...privatePreviewReady,
    directMomentReserveRpcReady: false,
  });
  assert.equal(closed.ready, false);
  assert.deepEqual(closed.missing, ["directMomentReserveRpcReady"]);

  const admissionReady = {
    authConfigured: true,
    privateInputsBucketReady: true,
    privateInputsSchemaReady: true,
    privateInputsAssetRpcReady: true,
    privateLiveEnabled: true,
    privateLiveAllowlistConfigured: true,
  };
  assert.equal(
    evaluatePrivateInputAdmissionReadiness(admissionReady).ready,
    true,
    "missing Moment reserve RPC must not block upload/complete admission"
  );
}

// ─── 4. Behavioral unit tests for liveReservation mapping (no network) ────

const loadTypeScriptModule = (relativePath, dependencies = {}) => {
  const compiled = ts.transpileModule(read(relativePath), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
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
};

const ASSET_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ASSET_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USER = "11111111-1111-4111-8111-111111111111";

let lastWithAssetArgs = null;
let withAssetImpl = async () => {
  throw new Error("withAssetImpl not configured");
};
let noAssetCalls = 0;

const live = loadTypeScriptModule("lib/durableCredits/liveReservation.ts", {
  "@/lib/contracts": { jobCostCredits: () => 10 },
  "@/lib/durableCredits/supabaseStore": {
    supabaseReserveGenerationAtomic: async () => {
      noAssetCalls += 1;
      return {
        ok: true,
        data: {
          reservationId: "res-no-asset",
          jobId: "job-no-asset",
          userId: USER,
          accountId: "acct-1",
          amount: 10,
          status: "reserved",
          idempotencyKey: "image:key",
          expiresAt: "2099-01-01T00:00:00.000Z",
          planId: "founding_studio",
          availableCredits: 90,
          reservedCredits: 10,
          idempotent: false,
          providerAuthorized: true,
        },
      };
    },
    supabaseReserveGenerationWithAssetAtomic: async (args) => {
      lastWithAssetArgs = args;
      return withAssetImpl(args);
    },
    supabaseCaptureGenerationAtomic: async () => ({ ok: true }),
    supabaseReleaseGenerationAtomic: async () => ({ ok: true }),
  },
});

// Same-asset success path (new reserve → provider authorized)
withAssetImpl = async () => ({
  ok: true,
  data: {
    reservationId: "res-1",
    jobId: "job-1",
    userId: USER,
    accountId: "acct-1",
    amount: 10,
    status: "reserved",
    idempotencyKey: "moment-key-1",
    expiresAt: "2099-01-01T00:00:00.000Z",
    planId: "founding_studio",
    availableCredits: 90,
    reservedCredits: 10,
    idempotent: false,
    providerAuthorized: true,
    inputAssetId: ASSET_A,
    rightsConfirmed: true,
  },
});
{
  const r = await live.reserveStrictLiveGenerationWithAsset({
    userId: USER,
    idempotencyKey: "moment-key-1",
    effectSlug: "street-power-up",
    inputAssetId: ASSET_A,
    rightsConfirmed: true,
  });
  assert.equal(r.ok, true);
  assert.equal(r.reservation.inputAssetId, ASSET_A);
  assert.equal(r.reservation.providerAuthorized, true);
  assert.equal(lastWithAssetArgs.inputAssetId, ASSET_A);
  assert.equal(lastWithAssetArgs.rightsConfirmed, true);
  assert.equal(lastWithAssetArgs.quotedCredits, 10);
}

// Same-asset idempotent reuse → JOB_IN_FLIGHT (provider not re-authorized)
withAssetImpl = async () => ({
  ok: true,
  data: {
    reservationId: "res-1",
    jobId: "job-1",
    userId: USER,
    accountId: "acct-1",
    amount: 10,
    status: "reserved",
    idempotencyKey: "moment-key-1",
    expiresAt: "2099-01-01T00:00:00.000Z",
    planId: "founding_studio",
    availableCredits: 90,
    reservedCredits: 10,
    idempotent: true,
    providerAuthorized: false,
    inputAssetId: ASSET_A,
    rightsConfirmed: true,
  },
});
{
  const r = await live.reserveStrictLiveGenerationWithAsset({
    userId: USER,
    idempotencyKey: "moment-key-1",
    effectSlug: "street-power-up",
    inputAssetId: ASSET_A,
    rightsConfirmed: true,
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, "JOB_IN_FLIGHT");
}

// Different-asset conflict
withAssetImpl = async () => ({
  ok: false,
  code: "IDEMPOTENCY_CONFLICT",
  error: "conflict",
});
{
  const r = await live.reserveStrictLiveGenerationWithAsset({
    userId: USER,
    idempotencyKey: "moment-key-1",
    effectSlug: "street-power-up",
    inputAssetId: ASSET_B,
    rightsConfirmed: true,
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, "IDEMPOTENCY_CONFLICT");
}

// Legacy unbound refusal
withAssetImpl = async () => ({
  ok: false,
  code: "LEGACY_JOB_INPUT_UNBOUND",
  error: "legacy",
});
{
  const r = await live.reserveStrictLiveGenerationWithAsset({
    userId: USER,
    idempotencyKey: "legacy-key",
    effectSlug: "street-power-up",
    inputAssetId: ASSET_A,
    rightsConfirmed: true,
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, "LEGACY_JOB_INPUT_UNBOUND");
}

// Owner/ready failures surface without inventing success
for (const code of [
  "INPUT_ASSET_NOT_FOUND",
  "INPUT_ASSET_NOT_READY",
  "INPUT_ASSET_REQUIRED",
  "RIGHTS_CONFIRMATION_REQUIRED",
]) {
  withAssetImpl = async () => ({ ok: false, code, error: code });
  const r = await live.reserveStrictLiveGenerationWithAsset({
    userId: USER,
    idempotencyKey: `k-${code}`,
    effectSlug: "street-power-up",
    inputAssetId: ASSET_A,
    rightsConfirmed: true,
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, code);
}

// Client-side rights gate
{
  const r = await live.reserveStrictLiveGenerationWithAsset({
    userId: USER,
    idempotencyKey: "no-rights",
    effectSlug: "street-power-up",
    inputAssetId: ASSET_A,
    rightsConfirmed: false,
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, "RIGHTS_CONFIRMATION_REQUIRED");
}

// Reject mismatched bound asset in success payload
withAssetImpl = async () => ({
  ok: true,
  data: {
    reservationId: "res-x",
    jobId: "job-x",
    userId: USER,
    accountId: "acct-1",
    amount: 10,
    status: "reserved",
    idempotencyKey: "mismatch",
    expiresAt: "2099-01-01T00:00:00.000Z",
    planId: "founding_studio",
    availableCredits: 90,
    reservedCredits: 10,
    idempotent: false,
    providerAuthorized: true,
    inputAssetId: ASSET_B,
    rightsConfirmed: true,
  },
});
{
  const r = await live.reserveStrictLiveGenerationWithAsset({
    userId: USER,
    idempotencyKey: "mismatch",
    effectSlug: "street-power-up",
    inputAssetId: ASSET_A,
    rightsConfirmed: true,
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, "RESERVATION_FAILED");
}

// Flux no-asset path still works and never calls with-asset RPC
noAssetCalls = 0;
lastWithAssetArgs = null;
{
  const r = await live.reserveStrictLiveGeneration({
    userId: USER,
    idempotencyKey: "image:key",
    effectSlug: "flux-toy-still",
  });
  assert.equal(r.ok, true);
  assert.equal(r.reservation.inputAssetId, undefined);
  assert.equal(noAssetCalls, 1);
  assert.equal(lastWithAssetArgs, null);
}

// ─── 5. Store payload validation rejects leakage ───────────────────────────

let rpcResponse = null;
const store = loadTypeScriptModule("lib/durableCredits/supabaseStore.ts", {
  "@/lib/supabase/server": {
    getSupabaseAdmin: () => ({
      rpc: async (name, args) => {
        assert.equal(name, "pikbo_reserve_generation_with_asset_v1");
        assert.equal(args.p_input_asset_id, ASSET_A);
        assert.equal(args.p_rights_confirmed, true);
        return { data: rpcResponse, error: null };
      },
    }),
  },
  "@/lib/supabase/env": {
    supabaseServiceRoleKey: () => "test-service-role",
    supabaseUrl: () => "https://example.supabase.co",
  },
  "@/lib/durableCredits/types": {},
});

const baseOk = {
  ok: true,
  reservationId: "res-ok",
  jobId: "job-ok",
  userId: USER,
  accountId: "acct-1",
  amount: 10,
  status: "reserved",
  idempotencyKey: "store-key",
  expiresAt: "2099-01-01T00:00:00.000Z",
  planId: "founding_studio",
  availableCredits: 90,
  reservedCredits: 10,
  idempotent: false,
  providerAuthorized: true,
  inputAssetId: ASSET_A,
  rightsConfirmed: true,
};

rpcResponse = baseOk;
{
  const r = await store.supabaseReserveGenerationWithAssetAtomic({
    userId: USER,
    idempotencyKey: "store-key",
    effectSlug: "street-power-up",
    quotedCredits: 10,
    inputAssetId: ASSET_A,
    rightsConfirmed: true,
  });
  assert.equal(r.ok, true);
  assert.equal(r.data.inputAssetId, ASSET_A);
}

for (const leak of [
  { objectKey: "private/foo" },
  { object_key: "private/foo" },
  { signedUrl: "https://example/x" },
  { inputSha256: "a".repeat(64) },
  { sha256: "b".repeat(64) },
]) {
  rpcResponse = { ...baseOk, ...leak };
  const r = await store.supabaseReserveGenerationWithAssetAtomic({
    userId: USER,
    idempotencyKey: "store-key",
    effectSlug: "street-power-up",
    quotedCredits: 10,
    inputAssetId: ASSET_A,
    rightsConfirmed: true,
  });
  assert.equal(r.ok, false, `must reject leak ${JSON.stringify(leak)}`);
  assert.equal(r.code, "ATOMIC_RPC_INVALID_RESPONSE");
}

rpcResponse = { ok: false, code: "LEGACY_JOB_INPUT_UNBOUND" };
{
  const r = await store.supabaseReserveGenerationWithAssetAtomic({
    userId: USER,
    idempotencyKey: "store-key",
    effectSlug: "street-power-up",
    quotedCredits: 10,
    inputAssetId: ASSET_A,
    rightsConfirmed: true,
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, "LEGACY_JOB_INPUT_UNBOUND");
}

console.log(
  "direct-moment-input-binding-regression: PASS (RPC bind · route order · same-asset idempotency · conflict · legacy unbound · service-role · no leakage · Flux no-asset · Preview readiness probe)"
);
