import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  detectPrivateToyInputMime,
  privateToyInputDimensions,
  privateToyInputBytesMatch,
  sha256PrivateToyInput,
  validatePrivateToyInputMetadata,
} from "../lib/privateToyAssetsPure.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const png = new Uint8Array(64);
png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
png.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8);
png.set([0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x02, 0x00], 16);
const pngSha = sha256PrivateToyInput(png);
assert.equal(detectPrivateToyInputMime(png), "image/png");
assert.deepEqual(privateToyInputDimensions(png, "image/png"), {
  width: 512,
  height: 512,
});
assert.deepEqual(
  privateToyInputBytesMatch({
    bytes: png,
    expectedMimeType: "image/png",
    expectedSizeBytes: png.byteLength,
    expectedSha256: pngSha,
  }),
  { ok: true, mimeType: "image/png", sha256: pngSha }
);
assert.equal(
  privateToyInputBytesMatch({
    bytes: png,
    expectedMimeType: "image/webp",
    expectedSizeBytes: png.byteLength,
    expectedSha256: pngSha,
  }).ok,
  false
);
assert.equal(
  validatePrivateToyInputMetadata({
    mimeType: "image/gif",
    sizeBytes: 100,
    sha256: "a".repeat(64),
    clientAssetKey: "client-asset-key",
  }).ok,
  false
);
assert.equal(
  validatePrivateToyInputMetadata({
    mimeType: "image/png",
    sizeBytes: 100,
    sha256: "a".repeat(64),
    clientAssetKey: "client-asset-key",
  }).ok,
  true
);

const migration = read(
  "supabase/migrations/20260731010000_private_toy_assets_pack_binding.sql"
);
assert.match(migration, /create table if not exists public\.toy_assets/);
assert.match(migration, /'pikbo-private-inputs'[\s\S]*false[\s\S]*8388608/);
assert.match(
  migration,
  /allowed_mime_types[\s\S]*image\/jpeg[\s\S]*image\/png[\s\S]*image\/webp/
);
assert.match(migration, /seller_pack_runs[\s\S]*input_asset_id uuid/);
assert.match(migration, /generation_jobs[\s\S]*input_asset_id uuid/);
assert.match(migration, /seller_pack_runs_input_owner_fkey/);
assert.match(migration, /generation_jobs_input_owner_fkey/);
assert.match(migration, /seller_pack_runs_input_rights_check/);
assert.match(migration, /generation_jobs_pack_owner_input_fkey/);
assert.match(migration, /pikbo_create_toy_asset_v1/);
assert.match(migration, /pikbo_complete_toy_asset_v1/);
assert.match(migration, /pikbo_reserve_seller_pack_v2/);
assert.match(migration, /pikbo_get_seller_pack_status_v2/);
assert.match(migration, /pikbo_get_active_seller_pack_v1/);
assert.match(migration, /pikbo_resolve_seller_pack_input_v1/);
assert.match(
  migration,
  /v_result := public\.pikbo_reserve_seller_pack_v1[\s\S]*for update[\s\S]*INPUT_ASSET_CHANGED_DURING_PACK_RESERVE/
);
assert.match(
  migration,
  /update public\.seller_pack_runs[\s\S]*input_asset_id = p_input_asset_id/
);
assert.match(
  migration,
  /update public\.generation_jobs[\s\S]*input_asset_id = p_input_asset_id[\s\S]*v_job_count <> 3/
);
assert.match(
  migration,
  /v_existing\.input_asset_id <> p_input_asset_id[\s\S]*IDEMPOTENCY_CONFLICT/
);
assert.match(migration, /state = 'ready'/);
assert.match(migration, /owner_user_id = p_user_id/);
assert.match(
  migration,
  /old\.state in \('ready', 'rejected', 'deleted'\)[\s\S]*TOY_ASSET_STATE_TERMINAL/
);
assert.match(
  migration,
  /before update of[\s\S]*input_asset_id[\s\S]*created_by[\s\S]*pack_run_id/
);
assert.match(
  migration,
  /old\.pack_run_id is null and new\.pack_run_id is null[\s\S]*new\.pack_run_id is null[\s\S]*PACK_JOB_IDENTITY_IMMUTABLE/,
  "an existing Pack child must not detach from its Pack"
);
assert.match(
  migration,
  /v_pack\.rights_confirmed_at is null[\s\S]*PACK_INPUT_UNBOUND/
);
assert.match(
  migration,
  /revoke execute on function public\.pikbo_reserve_seller_pack_v1[\s\S]*from service_role/
);
assert.match(
  migration,
  /revoke execute on function public\.pikbo_get_seller_pack_status_v1\(uuid, uuid\)[\s\S]*from service_role/
);
assert.doesNotMatch(
  migration,
  /create or replace function public\.pikbo_(?:settle|release|retry)_seller_pack/
);

const uploadRoute = read("app/api/assets/upload-url/route.ts");
const completeRoute = read("app/api/assets/complete/route.ts");
assert.match(uploadRoute, /getAuthUserFromRequest/);
assert.match(uploadRoute, /privateAccess\.invite\.invited/);
assert.match(uploadRoute, /createPrivateToyAssetUpload/);
assert.match(uploadRoute, /private-input-prepare/);
assert.match(completeRoute, /completePrivateToyAsset/);
assert.match(completeRoute, /private-input-complete/);
assert.match(completeRoute, /AUTH_REQUIRED/);
assert.doesNotMatch(uploadRoute, /objectKey/);
assert.doesNotMatch(completeRoute, /objectKey/);

const reserveRoute = read("app/api/seller-pack/reserve/route.ts");
const statusRoute = read("app/api/seller-pack/status/route.ts");
const activeRoute = read("app/api/seller-pack/active/route.ts");
assert.match(reserveRoute, /inputAssetId/);
assert.match(reserveRoute, /rightsConfirmed/);
assert.match(
  reserveRoute,
  /const privateAccess = resolvePrivateLiveAccess\(auth\);/
);
assert.match(
  reserveRoute,
  /const liveReadiness = await probeSoftLiveReadiness\(\);/
);
assert.ok(
  reserveRoute.indexOf("const privateAccess = resolvePrivateLiveAccess(auth);") <
    reserveRoute.indexOf("if (!durableCreditsActive())"),
  "current private invite must fail before any durable accounting check"
);
assert.ok(
  reserveRoute.indexOf("const liveReadiness = await probeSoftLiveReadiness();") <
    reserveRoute.indexOf("reserveSellerPackAtomic({"),
  "private Preview readiness must fail before the atomic 30-credit reserve"
);
assert.match(activeRoute, /getActiveSellerPackAtomic/);
assert.match(activeRoute, /getAuthUserFromRequest/);
assert.doesNotMatch(reserveRoute, /objectKey/);
assert.doesNotMatch(statusRoute, /["']objectKey["']\s*:/);
assert.doesNotMatch(activeRoute, /["']objectKey["']\s*:/);
for (const route of [statusRoute, activeRoute]) {
  for (const internalField of [
    "attemptKey",
    "reservationId",
    "contractFingerprint",
    "clientPackKey",
    "availableCredits",
    "reservedCredits",
    "wallet",
    "modelId",
    "providerId",
    "providerRequestId",
    "providerJobId",
    "inputAssetId",
    "sha256",
    "mimeType",
    "sizeBytes",
  ]) {
    assert.doesNotMatch(
      route,
      new RegExp(`["']?${internalField}["']?\\s*:`),
      `${internalField} must not cross the owner recovery DTO`
    );
  }
}

const privateAssets = read("lib/privateToyAssets.ts");
assert.match(privateAssets, /createSignedUploadUrl/);
assert.match(privateAssets, /privateToyInputBytesMatch/);
assert.match(privateAssets, /pikbo_complete_toy_asset_v1/);
assert.match(privateAssets, /pikbo_resolve_seller_pack_input_v1/);
assert.match(privateAssets, /privateToyAssetsProbe/);

const generate = read("app/api/generate/route.ts");
assert.match(generate, /resolvePrivateToyAssetForPack/);
assert.match(
  generate,
  /packChild[\s\S]*inline image and local assetId[\s\S]*ignored/
);
assert.ok(
  generate.indexOf("resolvePrivateToyAssetForPack({") <
    generate.indexOf("reserveDurableProviderSpend({"),
  "private input integrity must fail before provider budget reserve"
);
assert.ok(
  generate.indexOf("resolvePrivateToyAssetForPack({") <
    generate.indexOf("authorizeSellerPackChildLive({"),
  "private input integrity must fail before Pack child authorization"
);
assert.ok(
  generate.indexOf("resolvePrivateToyAssetForPack({") <
    generate.indexOf("fal.storage.upload(file)"),
  "private input integrity must fail before provider upload"
);
assert.match(
  generate,
  /durablePrior\.jobId !== packChild\.packJobId/
);
const privatePackOnlyFence = generate.indexOf(
  "Private Preview live generation starts from the fixed Launch Pack"
);
assert.ok(privatePackOnlyFence > 0, "private Preview needs a Pack-only fence");
assert.ok(
  privatePackOnlyFence < generate.indexOf("reserveDurableProviderSpend({"),
  "non-Pack private live requests must fail before provider budget reserve"
);
assert.match(
  generate,
  /access\.kind === "live" && !packChild/
);

const clientAssets = read("lib/clientAssets.ts");
const batch = read("components/BatchStudio.tsx");
assert.match(clientAssets, /registerPrivateToyAsset/);
assert.match(clientAssets, /crypto\.subtle\.digest\("SHA-256"/);
assert.match(clientAssets, /new FormData\(\)/);
assert.match(clientAssets, /append\("cacheControl", "3600"\)/);
assert.match(clientAssets, /append\("", blob\)/);
assert.ok(
  batch.indexOf("registerPrivateToyAsset(") <
    batch.indexOf("reserveSellerPackClient({"),
  "private input must be ready before the 30-credit reserve"
);
assert.match(
  batch,
  /startIntent\.inputAssetId = registeredInput\.inputAssetId/
);
assert.match(batch, /getActiveSellerPackClient/);
assert.match(batch, /const boundPrivateChild = Boolean\(packRunId && job\.packJobId\)/);
assert.match(batch, /const jobDemoMode = boundPrivateChild \? false : demoMode/);
assert.match(batch, /allowProviderSpend: !jobDemoMode/);
assert.match(batch, /canRetryBoundPrivatePack \|\| \(image && ownsRights\)/);
assert.match(
  batch,
  /type PrivatePackStartIntent[\s\S]*clientPackKey: string[\s\S]*inputAssetId: string \| null/
);
assert.match(
  batch,
  /function privatePackStartIntentFor[\s\S]*current\?\.image === currentImage[\s\S]*clientPackKey: `ui-pack:\$\{mintGenerateIdempotencyKey\(\)\}`/
);
assert.match(
  batch,
  /if \(!startIntent\.inputAssetId\)[\s\S]*startIntent\.inputAssetId = registeredInput\.inputAssetId[\s\S]*clientPackKey: startIntent\.clientPackKey[\s\S]*inputAssetId: startIntent\.inputAssetId/
);
assert.match(
  batch,
  /reservedPack\?\.idempotent[\s\S]*recoverSellerPackFromServer\([\s\S]*Existing Launch Pack reservation restored[\s\S]*return;/
);
assert.match(
  batch,
  /clearPrivatePackStartIntent\(\);[\s\S]*reader = new FileReader/,
  "a deliberate replacement must mint a new upload intent"
);
assert.match(
  batch,
  /accept="\.jpg,\.jpeg,\.png,\.webp,image\/jpeg,image\/png,image\/webp"/
);
assert.match(batch, /const demoMode = !privateUploadEnabled \|\| labStill/);
assert.match(
  batch,
  /verifiedPackRunId === activePackRunId[\s\S]*jobs\.some\(\(job\) => Boolean\(job\.packJobId\)\)/
);
assert.doesNotMatch(batch, /parseSellerPackRecovery/);

const accountRecoveryStart = batch.indexOf(
  "Re-open only the newest actionable Pack"
);
const accountRecoveryEnd = batch.indexOf(
  "A recovered in-flight child may finish",
  accountRecoveryStart
);
const accountRecovery = batch.slice(accountRecoveryStart, accountRecoveryEnd);
assert.match(accountRecovery, /getActiveSellerPackClient\(\)/);
assert.doesNotMatch(accountRecovery, /getSellerPackStatusClient/);
assert.match(accountRecovery, /sessionStorage\.removeItem/);

assert.match(
  batch,
  /if \(isSellerPack && !sellerPackRecoveryHydrated\)[\s\S]*Checking your account for an active Launch Pack/
);
assert.match(
  batch,
  /const canRun =[\s\S]*\(!isSellerPack \|\| sellerPackRecoveryHydrated\)/
);
assert.match(
  batch,
  /function beginPackOperation\(\)[\s\S]*if \(packAbortRef\.current\) return null/
);
assert.match(
  batch,
  /function finishPackOperation\(controller: AbortController\)[\s\S]*if \(packAbortRef\.current !== controller\) return/
);
const cancelStart = batch.indexOf("function cancelInFlightPack()");
const cancelEnd = batch.indexOf("const isFree", cancelStart);
assert.doesNotMatch(
  batch.slice(cancelStart, cancelEnd),
  /packAbortRef\.current = null/
);

assert.match(
  batch,
  /job\.status === "running"[\s\S]*job\.status === "recovery_unavailable"[\s\S]*job\.creditState === "refund unconfirmed"/
);
assert.match(
  batch,
  /Recursive scheduling is single-flight[\s\S]*timer = window\.setTimeout\(\(\) => void poll\(\), 5_000\)/
);

const runBatchStart = batch.indexOf("async function runBatch()");
const runBatchEnd = batch.indexOf("async function retryJob", runBatchStart);
const runBatchSource = batch.slice(runBatchStart, runBatchEnd);
assert.doesNotMatch(
  runBatchSource,
  /clientPackKey:\s*`ui-pack:\$\{projectId\}`/,
  "a reserve retry must not mint its idempotency key from a new run timestamp"
);
assert.ok(
  runBatchSource.indexOf("parseExactSellerPackServerJobs") <
    runBatchSource.indexOf("setActivePackRunId(runPackId)"),
  "Pack identity must commit only after validating the three reserved jobs"
);
assert.match(
  runBatchSource,
  /reservedPack\?\.idempotent[\s\S]*return;[\s\S]*for \(let i = 0; i < queue\.length; i\+\+\)/,
  "an idempotent reserve replay must stop before provider generation"
);
const idempotentReplayStart = runBatchSource.indexOf(
  "if (reservedPack?.idempotent"
);
const idempotentReplayEnd = runBatchSource.indexOf(
  "// Phase D: register still once",
  idempotentReplayStart
);
assert.doesNotMatch(
  runBatchSource.slice(idempotentReplayStart, idempotentReplayEnd),
  /executeJob|postGenerateWithRetry/,
  "an idempotent reserve replay is recovery-only"
);

const failPanelStart = batch.indexOf("<GenerateFailPanel");
const failPanelEnd = batch.indexOf("/>", failPanelStart);
assert.match(
  batch.slice(failPanelStart, failPanelEnd),
  /!hasBoundPrivatePack/,
  "a bound/recovered Pack error must not expose runBatch as a new-Pack retry"
);

const retryAllStart = batch.indexOf("async function retryAllFailed()");
const retryAllEnd = batch.indexOf(
  "async function continueQueuedPack()",
  retryAllStart
);
assert.match(
  batch.slice(retryAllStart, retryAllEnd),
  /outcome\.stopQueue \|\| abortCtrl\.signal\.aborted[\s\S]*break;/,
  "retry-all must stop after an ambiguous/fatal child outcome"
);
assert.ok(
  runBatchSource.indexOf("setVerifiedPackRunId(runPackId)") <
    runBatchSource.indexOf("setJobs(queue)"),
  "verified Pack identity and its validated children must commit together"
);

const continueStart = batch.indexOf("async function continueQueuedPack()");
const continueEnd = batch.indexOf("const doneCount", continueStart);
const continueSource = batch.slice(continueStart, continueEnd);
assert.ok(
  continueSource.indexOf("getSellerPackStatusClient(boundPackRunId)") <
    continueSource.indexOf('job.status === "queued"'),
  "Continue must fetch owner-scoped status before choosing queued children"
);
assert.ok(
  continueSource.indexOf("executeJob(") <
    continueSource.indexOf("refreshVerifiedPackFromServer("),
  "Continue must refetch server truth after every generate response"
);
assert.doesNotMatch(
  continueSource,
  /status:\s*"failed"/,
  "Continue must never manufacture a local failed state from an ambiguous response"
);

const readiness = read("lib/liveReadinessServer.ts");
const capability = read("lib/liveCapability.ts");
const ci = read(".github/workflows/ci.yml");
assert.match(readiness, /privateToyAssetsProbe/);
assert.match(readiness, /privateInputsBucketReady/);
assert.match(capability, /privateInputsSchemaReady/);
assert.match(capability, /privateInputsRpcReady/);
assert.match(
  ci,
  /npm run seller-pack-atomic-regression[\s\S]*npm run private-input-binding-regression/,
  "CI must execute the private-input Pack binding gate"
);

console.log("private input Pack binding regression: PASS");
