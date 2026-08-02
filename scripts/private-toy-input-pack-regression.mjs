import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PRIVATE_TOY_INPUT_MAX_BYTES,
  sniffToyImageMime,
  validateToyAssetRequest,
} from "../lib/privateToyAssetsPure.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

assert.equal(sniffToyImageMime(Uint8Array.from([0xff, 0xd8, 0xff, 0])), "image/jpeg");
assert.equal(sniffToyImageMime(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
assert.equal(sniffToyImageMime(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])), "image/webp");
assert.equal(sniffToyImageMime(Uint8Array.from([1, 2, 3, 4])), null);
assert.equal(validateToyAssetRequest({ mimeType: "image/png", sizeBytes: 512, sha256: "a".repeat(64), skuLabel: "SKU-01" }), null);
assert.equal(validateToyAssetRequest({ mimeType: "image/gif", sizeBytes: 512, sha256: "a".repeat(64) })?.code, "INVALID_IMAGE_TYPE");
assert.equal(validateToyAssetRequest({ mimeType: "image/png", sizeBytes: PRIVATE_TOY_INPUT_MAX_BYTES + 1, sha256: "a".repeat(64) })?.code, "IMAGE_TOO_LARGE");

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
const reserve = read("app/api/seller-pack/reserve/route.ts");
const status = read("app/api/seller-pack/status/route.ts");
const generate = read("app/api/generate/route.ts");
const batch = read("components/BatchStudio.tsx");
const library = read("components/LibraryGrid.tsx");
const createPage = read("app/create/page.tsx");

assert.match(upload, /AUTH_REQUIRED/);
assert.match(upload, /PRIVATE_PREVIEW_REQUIRED/);
assert.match(upload, /createPrivateToyAssetUpload/);
assert.match(complete, /completePrivateToyAsset/);
assert.match(reserve, /inputAssetId/);
assert.match(reserve, /rightsConfirmed/);
assert.match(reserve, /PRIVATE_PREVIEW_REQUIRED/);
assert.match(generate, /resolveBoundToyAssetDataUrl/);
assert.match(generate, /packBinding\.kind === "pack"[\s\S]{0,100}boundPackInput/);
assert.match(batch, /registerPrivateToyAsset[\s\S]*reserveSellerPackClient/);
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

console.log("private-toy-input-pack-regression: PASS (magic bytes · private durable input · immutable 3-child binding · owner discovery · Library recovery)");
