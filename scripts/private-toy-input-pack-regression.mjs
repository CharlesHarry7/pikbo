import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import {
  PRIVATE_TOY_INPUT_MAX_BYTES,
  sniffToyImageMime,
  validateToyAssetRequest,
} from "../lib/privateToyAssetsPure.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const functionSource = (source, name, nextName) => {
  const start = source.indexOf(`export async function ${name}`);
  const end = source.indexOf(`export async function ${nextName}`, start + 1);
  assert.ok(start >= 0 && end > start, `${name} function boundary missing`);
  return source.slice(start, end);
};
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

const validRequest = {
  mimeType: "image/png",
  sizeBytes: 512,
  sha256: "a".repeat(64),
  clientAssetKey: "input:stable-key",
  skuLabel: "SKU-01",
};

assert.equal(sniffToyImageMime(Uint8Array.from([0xff, 0xd8, 0xff, 0])), "image/jpeg");
assert.equal(sniffToyImageMime(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
assert.equal(sniffToyImageMime(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])), "image/webp");
assert.equal(sniffToyImageMime(Uint8Array.from([1, 2, 3, 4])), null);
assert.equal(validateToyAssetRequest(validRequest), null);
assert.equal(validateToyAssetRequest({ ...validRequest, mimeType: "image/gif" })?.code, "INVALID_IMAGE_TYPE");
assert.equal(validateToyAssetRequest({ ...validRequest, sizeBytes: 31 })?.code, "INVALID_IMAGE_SIZE");
assert.equal(validateToyAssetRequest({ ...validRequest, sizeBytes: PRIVATE_TOY_INPUT_MAX_BYTES + 1 })?.code, "IMAGE_TOO_LARGE");
assert.equal(validateToyAssetRequest({ ...validRequest, clientAssetKey: "short" })?.code, "INVALID_ASSET_KEY");
assert.equal(validateToyAssetRequest({ ...validRequest, skuLabel: "x".repeat(121) })?.code, "INVALID_SKU_LABEL");

const migration = read("supabase/migrations/20260802010000_private_toy_input_pack_binding.sql");
const admissionMigration = read(
  "supabase/migrations/20260802020000_private_toy_asset_admission_rpcs.sql"
);
const rpcAlignmentMigration = read(
  "supabase/migrations/20260803010000_align_private_pack_rpcs.sql"
);
assert.match(migration, /create table if not exists public\.toy_assets/);
assert.match(migration, /alter table public\.toy_assets enable row level security/);
assert.match(migration, /grant select \([\s\S]*verified_at[\s\S]*\) on public\.toy_assets to authenticated/);
assert.doesNotMatch(migration, /grant select[\s\S]{0,80}object_key/);
assert.match(migration, /'pikbo-toy-inputs'[\s\S]*false/);
assert.match(migration, /pikbo_reserve_seller_pack_with_asset_v1/);
assert.match(migration, /LEGACY_PACK_INPUT_UNBOUND/);
assert.match(migration, /v_existing\.input_asset_id is distinct from p_input_asset_id/);
assert.match(migration, /if v_bound_count <> 3/);
assert.match(migration, /pikbo_authorize_seller_pack_child_with_asset_v1/);
assert.match(migration, /j\.input_asset_id = p\.input_asset_id/);
assert.doesNotMatch(migration, /grant execute[\s\S]{0,120}authenticated/);
assert.match(admissionMigration, /add column if not exists client_asset_key text/);
assert.match(admissionMigration, /toy_assets_owner_client_key_uidx/);
assert.match(
  admissionMigration,
  /create or replace function public\.pikbo_create_toy_asset_v1/
);
assert.match(
  admissionMigration,
  /create or replace function public\.pikbo_complete_toy_asset_v1/
);
assert.match(
  admissionMigration,
  /on conflict \(owner_user_id, client_asset_key\) do nothing/
);
assert.match(admissionMigration, /where id = p_asset_id[\s\S]*owner_user_id = p_user_id/);
assert.match(
  admissionMigration,
  /p_actual_sha256 is null[\s\S]*p_actual_mime_type is null[\s\S]*p_actual_size_bytes is null[\s\S]*INPUT_ASSET_IDENTITY_CONFLICT/
);
assert.match(
  admissionMigration,
  /v_asset\.sha256 is distinct from p_actual_sha256[\s\S]*v_asset\.mime_type is distinct from p_actual_mime_type[\s\S]*v_asset\.size_bytes is distinct from p_actual_size_bytes/
);
assert.match(
  admissionMigration,
  /grant execute on function public\.pikbo_create_toy_asset_v1[\s\S]*to service_role/
);
assert.match(
  admissionMigration,
  /grant execute on function public\.pikbo_complete_toy_asset_v1[\s\S]*to service_role/
);
assert.doesNotMatch(
  admissionMigration,
  /grant execute[\s\S]{0,160}to (?:public|anon|authenticated)/
);
assert.match(
  rpcAlignmentMigration,
  /create or replace function public\.pikbo_reserve_seller_pack_v2/
);
assert.match(rpcAlignmentMigration, /pikbo_reserve_seller_pack_with_asset_v1/);
assert.match(
  rpcAlignmentMigration,
  /create or replace function public\.pikbo_get_seller_pack_status_v2/
);
assert.match(rpcAlignmentMigration, /pikbo_get_seller_pack_status_v1/);
assert.match(
  rpcAlignmentMigration,
  /create or replace function public\.pikbo_resolve_seller_pack_input_v1/
);
assert.match(rpcAlignmentMigration, /objectKey[\s\S]*v_asset\.object_key/);
assert.match(rpcAlignmentMigration, /grant execute[\s\S]*to service_role/);
assert.doesNotMatch(
  rpcAlignmentMigration,
  /grant execute[\s\S]{0,160}to (?:public|anon|authenticated)/
);

const upload = read("app/api/assets/upload-url/route.ts");
const complete = read("app/api/assets/complete/route.ts");
const recentRoute = read("app/api/assets/recent/route.ts");
const contentRoute = read("app/api/assets/[id]/content/route.ts");
const ownerRecent = read("lib/ownerRecentToyAssets.ts");
const assets = read("lib/privateToyAssets.ts");
const clientAssets = read("lib/clientAssets.ts");
const createStudio = read("components/CreateStudio.tsx");
const supabaseStore = read("lib/durableCredits/supabaseStore.ts");
const reserve = read("app/api/seller-pack/reserve/route.ts");
const status = read("app/api/seller-pack/status/route.ts");
const generate = read("app/api/generate/route.ts");
const batch = read("components/BatchStudio.tsx");
const library = read("components/LibraryGrid.tsx");
const createPage = read("app/create/page.tsx");

assert.match(upload, /AUTH_REQUIRED/);
assert.match(upload, /PRIVATE_INPUT_ACCESS_REQUIRED/);
assert.match(upload, /privateInputAdmission\.ready/);
assert.doesNotMatch(upload, /access\.budget\.ok|privatePreview\.ready/);
assert.match(upload, /private-input-prepare/);
assert.match(upload, /createPrivateToyAssetUpload/);
assert.match(upload, /clientAssetKey/);
assert.match(upload, /inputAssetId: prepared\.assetId/);
assert.match(upload, /state: prepared\.state/);
assert.match(upload, /idempotent: prepared\.idempotent/);
assert.match(upload, /IDEMPOTENCY_CONFLICT[\s\S]{0,40}409/);
assert.match(upload, /PRIVATE_INPUT_INVALID_RESPONSE[\s\S]{0,40}503/);
assert.doesNotMatch(upload, /objectKey|providerRequestId/);
assert.match(complete, /completePrivateToyAsset/);
assert.match(complete, /AUTH_REQUIRED/);
assert.match(complete, /ownerUserId: auth\.id/);
assert.doesNotMatch(complete, /PRIVATE_INPUT_ACCESS_REQUIRED/);
assert.doesNotMatch(complete, /privateInputAdmission\.ready/);
assert.match(complete, /private-input-complete/);
assert.match(complete, /inputAssetId: completed\.asset\.id/);
assert.doesNotMatch(complete, /objectKey|providerRequestId/);
assert.match(assets, /pikbo_create_toy_asset_v1/);
assert.match(assets, /pikbo_complete_toy_asset_v1/);
assert.match(assets, /pikbo_resolve_seller_pack_input_v1/);
assert.match(assets, /resolved\.packRunId !== input\.packRunId/);
assert.match(assets, /resolved\.jobId !== input\.jobId/);
assert.match(assets, /source\.\$\{extension\}/);
assert.doesNotMatch(assets, /\.insert\s*\(/);
assert.doesNotMatch(assets, /\/input\.(?:jpg|png|webp)|\/input\.\$\{/);
assert.match(clientAssets, /new FormData\(\)/);
assert.match(clientAssets, /uploadBody\.append\("cacheControl", "3600"\)/);
assert.match(clientAssets, /headers: \{ "x-upsert": "false" \}/);
assert.match(clientAssets, /lost upload response is ambiguous/);
assert.doesNotMatch(clientAssets, /if \(!uploaded\.ok\) return null/);
assert.doesNotMatch(clientAssets, /headers:\s*\{\s*"Content-Type": blob\.type/);

// --- AIT-13: owner recent ready private photos + Create reuse ---
assert.match(recentRoute, /getAuthUserFromRequest/);
assert.match(recentRoute, /AUTH_REQUIRED/);
assert.match(recentRoute, /PRIVATE_INPUT_ACCESS_REQUIRED/);
assert.match(recentRoute, /listOwnerRecentReadyToyAssets/);
assert.match(recentRoute, /Cache-Control": "private, no-store"/);
assert.match(recentRoute, /private-input-recent/);
// Response body must only expose the safe assets list (no storage secrets).
assert.match(recentRoute, /ok: true,\s*assets,\s*limit,/);
assert.doesNotMatch(recentRoute, /\bobjectKey\b|\bobject_key\b|\bsignedUrl\b|\bsha256\b/);
assert.match(ownerRecent, /\.eq\("state", "ready"\)/);
assert.match(ownerRecent, /order\("created_at", \{ ascending: false \}/);
assert.match(ownerRecent, /previewPath/);
assert.match(ownerRecent, /\/api\/assets\/\$\{encodeURIComponent\(assetId\)\}\/content/);
assert.doesNotMatch(ownerRecent, /createSignedUrl|\bsignedUrl\b/);
// DTO construction never spreads raw DB rows (would leak object_key/sha).
assert.doesNotMatch(ownerRecent, /\.\.\.row|object_key:|sha256:/);
// UUID content: re-auth owner + ready → short-lived signed redirect; asset_* preserved.
assert.match(contentRoute, /isUuidAssetId|UUID_RE/);
assert.match(contentRoute, /signedPrivateToyAssetPreview/);
assert.match(contentRoute, /getAuthUserFromRequest/);
assert.match(contentRoute, /status: 302/);
assert.match(contentRoute, /Location: preview\.url/);
assert.match(contentRoute, /Cache-Control": "private, no-store"/);
assert.match(contentRoute, /code: "NOT_FOUND"/);
assert.match(contentRoute, /getLocalAsset/);
assert.match(contentRoute, /id\.startsWith\("asset_"\)/);
assert.match(contentRoute, /mode: "local-memory"/);
assert.match(contentRoute, /dataUrl: asset\.dataUrl/);
// Client: list + preview helpers; generate reuses assetId without re-upload Base64.
assert.match(clientAssets, /fetchRecentPrivateToyAssets/);
assert.match(clientAssets, /\/api\/assets\/recent/);
assert.match(clientAssets, /resolvePrivateToyAssetPreviewUrl/);
assert.match(clientAssets, /previewPath\.startsWith\("\/api\/assets\/"\)/);
// CreateStudio: owner-key bound recent load; public guests never request recent API.
assert.match(createStudio, /fetchRecentPrivateToyAssets/);
assert.match(createStudio, /adoptRecentPrivateAsset/);
assert.match(createStudio, /privateRecentOwnerKey/);
assert.match(createStudio, /planRecentOwnerTransition/);
assert.match(createStudio, /deriveRecentReuseUiState/);
assert.match(createStudio, /applyRecentListLoad/);
assert.match(createStudio, /applyRecentPreviewResolution/);
assert.match(createStudio, /session\?\.auth\?\.id/);
assert.match(createStudio, /recentOwnerKey/);
assert.match(createStudio, /recentListBoundOwnerKey/);
assert.match(createStudio, /composerImage|composerAssetId/);
assert.match(createStudio, /composerHasInput/);
assert.match(createStudio, /canAdoptAssetId/);
assert.match(createStudio, /setAssetId\(asset\.id\)/);
assert.match(createStudio, /Use a recent verified photo/);
assert.match(createStudio, /data-recent-private-assets/);
assert.match(createStudio, /no re-upload/);
assert.match(createStudio, /recentReuseUi\.showRecentRail/);
assert.match(createStudio, /recentReuseUi\.visibleAssets/);
// Residual composer sinks must not re-bind raw `image` (A→B mid-transition leak).
assert.match(createStudio, /GenerateWaitStage[\s\S]{0,220}image=\{composerImage\}/);
assert.match(createStudio, /\|\| composerImage/);
assert.doesNotMatch(createStudio, /\|\| image\s*;/);
assert.match(createStudio, /showLabSample=\{lastUploadIgnored \|\| !composerHasInput\}/);
assert.match(
  createStudio,
  /disabled=\{busy \|\| !ownsRights \|\| \(mode === "i2v" && !composerHasInput\)\}/
);
assert.match(createStudio, /composerHasInput \? \([\s\S]{0,80}<DirectorPlanPanel/);
assert.match(createStudio, /composerHasInput && assetBrief\.ready/);
// generate payload still uses fail-closed composer still
assert.match(createStudio, /image: composerImage/);
assert.match(createStudio, /assetId: composerAssetId/);
// Selecting recent must not call registerLocalAsset / re-upload path.
const adoptRecentSlice = createStudio.slice(
  createStudio.indexOf("adoptRecentPrivateAsset"),
  createStudio.indexOf("adoptRecentPrivateAsset") + 2200
);
assert.match(adoptRecentSlice, /setAssetId\(asset\.id\)/);
assert.match(adoptRecentSlice, /applyRecentPreviewResolution/);
assert.doesNotMatch(adoptRecentSlice, /registerLocalAsset|registerPrivateToyAsset/);
assert.doesNotMatch(adoptRecentSlice, /upload-url|\/api\/assets\/complete/);
// Public path still Lab-only (no recent selector outside privateUploadEnabled).
assert.match(createStudio, /privateUploadEnabled \? \(/);
assert.match(createStudio, /data-public-single-preview="lab-only"/);
// Owner-switch clears recent selection only; local upload source preserved by plan.
assert.match(createStudio, /selectionSource: recentSelectionSourceRef\.current/);
assert.match(createStudio, /clearRecentSelection/);

const reserveAdapter = functionSource(
  supabaseStore,
  "supabaseReserveSellerPackAtomic",
  "supabaseAuthorizeSellerPackChildAtomic"
);
const statusAdapter = functionSource(
  supabaseStore,
  "supabaseGetSellerPackStatusAtomic",
  "supabaseExpireQueuedSellerPackChildren"
);
assert.match(reserveAdapter, /pikbo_reserve_seller_pack_v2/);
assert.doesNotMatch(reserveAdapter, /pikbo_reserve_seller_pack_with_asset_v1/);
assert.match(statusAdapter, /pikbo_get_seller_pack_status_v2/);
assert.doesNotMatch(statusAdapter, /pikbo_get_seller_pack_status_v1/);
assert.match(statusAdapter, /inputSha256/);
assert.match(statusAdapter, /inputCreatedAt/);
assert.match(reserve, /inputAssetId/);
assert.match(reserve, /rightsConfirmed/);
assert.match(reserve, /PRIVATE_PREVIEW_REQUIRED/);
assert.match(generate, /resolveBoundToyAssetDataUrl/);
assert.match(generate, /packBinding\.kind === "pack"[\s\S]{0,100}boundPackInput/);
assert.match(batch, /registerPrivateToyAsset[\s\S]*reserveSellerPackClient/);
assert.match(batch, /canPreparePrivateInput/);
assert.match(batch, /Verify private photo/);
assert.match(batch, /0 credits reserved · 0 video jobs created/);
assert.match(batch, /privateInputOnly[\s\S]*void verifyPrivateInput\(\)/);
assert.match(batch, /Retry photo verification/);
assert.match(batch, /Private photo verification needs attention/);
assert.match(batch, /data-seller-pack-eligibility="closed"/);
assert.match(batch, /Request private beta/);
assert.match(batch, /Try cached sample Pack/);
assert.match(batch, /Validation · generation closed/);
assert.match(status, /mine === "active"/);
assert.match(status, /mine === "recent"/);
assert.doesNotMatch(status, /\bobjectKey\s*:|\bproviderRequestId\s*:/);
// Library MVP: account-owned generations only. The retired Seller Pack,
// device-history, and stills-shelf UI must not reappear here.
assert.match(library, /fetchMe\(\)/);
assert.match(library, /if \(!me\?\.signedIn\)/);
assert.match(library, /href=["']\/login\?next=\/library["']/);
assert.match(library, /fetch\(["']\/api\/generations["']/);
assert.match(library, /body\.jobs\.filter\(visibleAccountJob\)/);
assert.match(library, /if \(job\.demo\) return false/);
assert.doesNotMatch(
  library,
  /data-library-seller-packs|Seller Pack|getSellerPackDiscoveryClient|Create new Pack|Try cached sample Pack|LibraryStorageBanner|Saved on this device|device-local|session-stills|\/api\/image/
);
// Downloads stay owner-gated: probe HEAD first, then fetch the approved video.
assert.match(library, /privateDownloadHeaders/);
assert.match(library, /\/api\/downloads\//);
assert.match(library, /method:\s*["']HEAD["']/);
assert.match(library, /interpretDownloadHead/);
assert.match(library, /downloadVideoFile/);
assert.match(library, /<video[\s\S]{0,500}controls[\s\S]{0,500}playsInline/);
// Failed/canceled jobs retry through the ledger; queued/running jobs can cancel.
assert.match(library, /isRetryable\(job\.status\)[\s\S]{0,350}void retry\(job\)/);
assert.match(library, /\/api\/generations\/\$\{encodeURIComponent\(job\.id\)\}\/retry/);
assert.match(library, /method:\s*["']POST["']/);
assert.match(library, /function isOpen\(status[\s\S]{0,180}queued[\s\S]{0,80}running/);
assert.match(library, /isOpen\(job\.status\)[\s\S]{0,350}void cancel\(job\)/);
assert.match(library, /\/api\/generations\/\$\{encodeURIComponent\(job\.id\)\}/);
assert.match(library, /method:\s*["']DELETE["']/);
// Create ignores legacy Seller Pack/general route UI and always mounts the
// fixed Street Power-Up Moment contract (apart from explicit local previews).
assert.match(createPage, /<CreateStudio/);
assert.match(createPage, /initialEffect=["']street-power-up["']/);
assert.match(createPage, /fixedMomentContract/);
assert.doesNotMatch(
  createPage,
  /BatchStudio|PrivateSellerPackGate|initialRecoverPackRunId|recoverPackRunId|sp\.mode\s*===/
);
assert.match(batch, /initialRecoverPackRunId[\s\S]*getSellerPackStatusClient\(initialRecoverPackRunId\)/);
assert.match(batch, /sessionStorage\.removeItem\(SELLER_PACK_RECOVERY_KEY\)[\s\S]*getSellerPackDiscoveryClient\("active"\)/);

const clientModule = loadTypeScriptModule("lib/clientAssets.ts", {
  "@/lib/history": {
    privateDownloadHeaders: async () => ({ Authorization: "Bearer test" }),
  },
});
const originalFetch = globalThis.fetch;
const inputAssetId = "11111111-1111-4111-8111-111111111111";
const pngBytes = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, 1),
]);
const dataUrl = `data:image/png;base64,${pngBytes.toString("base64")}`;
const clientKeys = [];
const uploadModes = ["success", "conflict", "throw", "ready"];
let activeUploadMode = "success";
let uploadAttempts = 0;
let completeAttempts = 0;

globalThis.fetch = async (url, init = {}) => {
  const target = String(url);
  if (target.startsWith("data:image/")) return originalFetch(url, init);
  if (target === "/api/assets/upload-url") {
    const body = JSON.parse(String(init.body));
    clientKeys.push(body.clientAssetKey);
    const ready = activeUploadMode === "ready";
    return new Response(JSON.stringify({
      ok: true,
      assetId: inputAssetId,
      inputAssetId,
      state: ready ? "ready" : "pending",
      uploadUrl: ready ? null : "https://storage.example/signed-upload",
      idempotent: ready,
    }), {
      status: ready ? 200 : 201,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (target === "https://storage.example/signed-upload") {
    uploadAttempts += 1;
    assert.equal(init.method, "PUT");
    assert.equal(init.headers["x-upsert"], "false");
    assert.ok(init.body instanceof FormData);
    if (activeUploadMode === "throw") throw new Error("lost response");
    return new Response("", {
      status: activeUploadMode === "conflict" ? 409 : 201,
    });
  }
  if (target === "/api/assets/complete") {
    completeAttempts += 1;
    return new Response(JSON.stringify({
      ok: true,
      inputAssetId,
      asset: { id: inputAssetId, state: "ready" },
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  throw new Error(`unexpected client fetch: ${target}`);
};

try {
  for (const mode of uploadModes) {
    activeUploadMode = mode;
    assert.deepEqual(
      await clientModule.registerPrivateToyAsset(dataUrl, "SKU-01"),
      { assetId: inputAssetId },
      `${mode} upload must still reach owner completion`
    );
  }
} finally {
  globalThis.fetch = originalFetch;
}

assert.equal(uploadAttempts, 3);
assert.equal(completeAttempts, 4);
assert.equal(new Set(clientKeys).size, 1, "same image + SKU must replay one clientAssetKey");
assert.match(clientKeys[0], /^input:[0-9a-f]{64}$/);

// --- Executable privacy race contracts (not keyword-only) ---
const {
  privateRecentOwnerKey: ownerKeyOf,
  planRecentOwnerTransition: planOwnerTransition,
  deriveRecentReuseUiState,
  shouldCommitRecentList,
  shouldCommitRecentPreview,
  applyRecentListLoad,
  applyRecentPreviewResolution,
} = clientModule;

assert.equal(
  ownerKeyOf({ privateUploadEnabled: false, ownerUserId: "owner-a" }),
  null,
  "public / capability-off never yields an owner key"
);
assert.equal(
  ownerKeyOf({ privateUploadEnabled: true, ownerUserId: null }),
  null
);
assert.equal(
  ownerKeyOf({ privateUploadEnabled: true, ownerUserId: "owner-a" }),
  "owner-a"
);

const staySame = planOwnerTransition({
  prevOwnerKey: "owner-a",
  nextOwnerKey: "owner-a",
  selectionSource: "recent",
});
assert.equal(staySame.ownerChanged, false);
assert.equal(staySame.clearRecentList, false);
assert.equal(staySame.clearRecentSelection, false);

const aToBRecent = planOwnerTransition({
  prevOwnerKey: "owner-a",
  nextOwnerKey: "owner-b",
  selectionSource: "recent",
});
assert.equal(aToBRecent.ownerChanged, true);
assert.equal(aToBRecent.clearRecentList, true);
assert.equal(aToBRecent.clearRecentThumbs, true);
assert.equal(aToBRecent.revokeThumbUrls, true);
assert.equal(aToBRecent.clearRecentSelection, true);
assert.equal(aToBRecent.bumpLoadGeneration, true);
assert.equal(aToBRecent.bumpSelectionToken, true);

const aToBUpload = planOwnerTransition({
  prevOwnerKey: "owner-a",
  nextOwnerKey: "owner-b",
  selectionSource: "upload",
});
assert.equal(
  aToBUpload.clearRecentSelection,
  false,
  "owner switch must not wipe local new-upload selection"
);
assert.equal(aToBUpload.clearRecentList, true);

const capabilityOff = planOwnerTransition({
  prevOwnerKey: "owner-a",
  nextOwnerKey: null,
  selectionSource: "recent",
});
assert.equal(capabilityOff.clearRecentSelection, true);
assert.equal(capabilityOff.clearRecentList, true);

// Owner A→B: stale list response from A must not commit over B.
{
  let currentOwner = "owner-a";
  let generation = 1;
  let committed = null;
  let resolveA;
  const loadA = new Promise((resolve) => {
    resolveA = resolve;
  });
  const stalePromise = applyRecentListLoad({
    requestOwnerKey: "owner-a",
    requestGeneration: 1,
    getCurrent: () => ({ ownerKey: currentOwner, generation }),
    load: () => loadA,
    onCommit: (assets) => {
      committed = assets;
    },
  });
  // Switch to B and bump generation before A resolves.
  currentOwner = "owner-b";
  generation = 2;
  let committedB = null;
  const bPromise = applyRecentListLoad({
    requestOwnerKey: "owner-b",
    requestGeneration: 2,
    getCurrent: () => ({ ownerKey: currentOwner, generation }),
    load: async () => [{ id: "asset-b" }],
    onCommit: (assets) => {
      committedB = assets;
    },
  });
  resolveA([{ id: "asset-a-stale" }]);
  assert.equal(await stalePromise, "stale");
  assert.equal(committed, null, "owner A stale list must not write after A→B");
  assert.equal(await bPromise, "committed");
  assert.deepEqual(committedB, [{ id: "asset-b" }]);
}

assert.equal(
  shouldCommitRecentList({
    requestOwnerKey: "owner-a",
    currentOwnerKey: "owner-b",
    requestGeneration: 1,
    currentGeneration: 1,
  }),
  false
);
assert.equal(
  shouldCommitRecentList({
    requestOwnerKey: "owner-b",
    currentOwnerKey: "owner-b",
    requestGeneration: 2,
    currentGeneration: 2,
  }),
  true
);

// Fast select A then B: out-of-order preview completion must keep B only.
{
  let currentOwner = "owner-b";
  let currentAssetId = null;
  let selectionToken = 0;
  let previewImage = null;
  let resolvePreviewA;
  const previewA = new Promise((resolve) => {
    resolvePreviewA = resolve;
  });

  // Click A
  selectionToken = 1;
  currentAssetId = "asset-a";
  const aPreviewJob = applyRecentPreviewResolution({
    requestOwnerKey: "owner-b",
    requestAssetId: "asset-a",
    requestSelectionToken: 1,
    getCurrent: () => ({
      ownerKey: currentOwner,
      assetId: currentAssetId,
      selectionToken,
    }),
    resolvePreview: () => previewA,
    onCommit: (url) => {
      previewImage = url;
    },
  });

  // Click B before A resolves
  selectionToken = 2;
  currentAssetId = "asset-b";
  const bPreviewJob = applyRecentPreviewResolution({
    requestOwnerKey: "owner-b",
    requestAssetId: "asset-b",
    requestSelectionToken: 2,
    getCurrent: () => ({
      ownerKey: currentOwner,
      assetId: currentAssetId,
      selectionToken,
    }),
    resolvePreview: async () => "preview-b",
    onCommit: (url) => {
      previewImage = url;
    },
  });

  assert.equal(await bPreviewJob, "committed");
  assert.equal(previewImage, "preview-b");
  assert.equal(currentAssetId, "asset-b");

  resolvePreviewA("preview-a-late");
  assert.equal(await aPreviewJob, "stale");
  assert.equal(
    previewImage,
    "preview-b",
    "late A preview must not overwrite B"
  );
  assert.equal(currentAssetId, "asset-b");
}

assert.equal(
  shouldCommitRecentPreview({
    requestOwnerKey: "owner-b",
    currentOwnerKey: "owner-b",
    requestAssetId: "asset-a",
    currentAssetId: "asset-b",
    requestSelectionToken: 1,
    currentSelectionToken: 2,
  }),
  false
);
assert.equal(
  shouldCommitRecentPreview({
    requestOwnerKey: "owner-b",
    currentOwnerKey: "owner-b",
    requestAssetId: "asset-b",
    currentAssetId: "asset-b",
    requestSelectionToken: 2,
    currentSelectionToken: 2,
  }),
  true
);

// Render-time fail-closed: A→B before deferred cleanup — visible/clickable empty now.
{
  const midTransition = deriveRecentReuseUiState({
    currentOwnerKey: "owner-b",
    // Deferred cleanup has not run yet — list still tagged as A.
    listOwnerKey: "owner-a",
    assets: [
      { id: "asset-a1", previewPath: "/api/assets/asset-a1/content" },
      { id: "asset-a2", previewPath: "/api/assets/asset-a2/content" },
    ],
    thumbs: {
      "asset-a1": "https://signed.example/a1",
      "asset-a2": "https://signed.example/a2",
    },
    selectionSource: "recent",
    selectionOwnerKey: "owner-a",
    selectedAssetId: "asset-a1",
    selectedImage: "https://signed.example/a1-preview",
    loading: false,
  });
  assert.equal(midTransition.listMatchesCurrentOwner, false);
  assert.deepEqual(midTransition.visibleAssets, []);
  assert.deepEqual(midTransition.visibleThumbs, {});
  assert.equal(midTransition.showRecentRail, false);
  assert.equal(
    midTransition.effectiveSelectedAssetId,
    null,
    "stale recent assetId must blank immediately at A→B"
  );
  assert.equal(
    midTransition.effectiveSelectedImage,
    null,
    "stale recent preview must blank immediately at A→B"
  );
  assert.equal(
    midTransition.canAdoptAssetId("asset-a1"),
    false,
    "B must not adopt A's rendered row before cleanup"
  );
  assert.equal(midTransition.canAdoptAssetId("asset-a2"), false);
}

// Same owner: list and recent selection remain visible.
{
  const sameOwner = deriveRecentReuseUiState({
    currentOwnerKey: "owner-a",
    listOwnerKey: "owner-a",
    assets: [{ id: "asset-a1" }],
    thumbs: { "asset-a1": "thumb-a1" },
    selectionSource: "recent",
    selectionOwnerKey: "owner-a",
    selectedAssetId: "asset-a1",
    selectedImage: "preview-a1",
    loading: false,
  });
  assert.equal(sameOwner.showRecentRail, true);
  assert.equal(sameOwner.visibleAssets.length, 1);
  assert.equal(sameOwner.effectiveSelectedAssetId, "asset-a1");
  assert.equal(sameOwner.effectiveSelectedImage, "preview-a1");
  assert.equal(sameOwner.canAdoptAssetId("asset-a1"), true);
}

// Local upload under owner switch: do not blank non-recent selection.
{
  const uploadKept = deriveRecentReuseUiState({
    currentOwnerKey: "owner-b",
    listOwnerKey: "owner-a",
    assets: [{ id: "asset-a1" }],
    thumbs: { "asset-a1": "thumb-a1" },
    selectionSource: "upload",
    selectionOwnerKey: null,
    selectedAssetId: "upload-asset",
    selectedImage: "data:image/png;base64,AAA",
    loading: false,
  });
  assert.deepEqual(uploadKept.visibleAssets, []);
  assert.equal(uploadKept.showRecentRail, false);
  assert.equal(uploadKept.effectiveSelectedAssetId, "upload-asset");
  assert.equal(uploadKept.effectiveSelectedImage, "data:image/png;base64,AAA");
}

console.log(
  "private-toy-input-pack-regression: PASS (v2 private input adapters · signed multipart upload · immutable 3-child binding · owner recovery · owner-switch + selection race · render-time fail-closed)"
);
