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

const upload = read("app/api/assets/upload-url/route.ts");
const complete = read("app/api/assets/complete/route.ts");
const assets = read("lib/privateToyAssets.ts");
const clientAssets = read("lib/clientAssets.ts");
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
assert.match(status, /mine === "active"/);
assert.match(status, /mine === "recent"/);
assert.doesNotMatch(status, /\bobjectKey\s*:|\bproviderRequestId\s*:/);
assert.match(library, /data-library-seller-packs="owner-scoped"/);
assert.match(library, /getSellerPackDiscoveryClient\("recent"\)/);
assert.match(library, /downloadVideoFile\(job\.resultUrl/);
assert.match(library, /min-h-11/);
assert.match(createPage, /initialRecoverPackRunId=\{recoverPackRunId\}/);
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

console.log("private-toy-input-pack-regression: PASS (v2 private input adapters · signed multipart upload · immutable 3-child binding · owner recovery)");
