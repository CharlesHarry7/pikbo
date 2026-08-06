#!/usr/bin/env node
/**
 * AIT-223: Library result delivery honesty.
 *
 * Controlled download only; fail-closed owner gate; missing private result
 * surfaces with explicit status + Retry/new-attempt only when server allows;
 * no signed storage URL persistence in client history.
 *
 * Source + pure-function regression (no network, no provider, no Supabase).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  libraryMissingPrivateResultCopy,
  libraryResultMissingDeliverable,
  privateLibraryJobFromRow,
} from "../lib/privateGenerationResultsPure.mjs";
import { canRetryGenerateFailure } from "../lib/generateRecoveryPolicy.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const library = read("components/LibraryGrid.tsx");
const downloads = read("app/api/downloads/[id]/route.ts");
const pure = read("lib/privateGenerationResultsPure.mjs");
const policy = read("lib/generateRecoveryPolicy.ts");
const history = read("lib/history.ts");
const createTrust = read("lib/createTrust.ts");
const pkg = read("package.json");

// ─── Source contracts: controlled download ─────────────────────────────────

assert.match(library, /canDownloadResultCard/);
assert.match(library, /downloadAllowed === true/);
assert.match(library, /data-library-action="download"/);
assert.match(library, /Always download via gateUrl/);
assert.match(library, /\/api\/downloads\/\$\{encodeURIComponent\(id\)\}/);
// Never download raw job.videoUrl (provider / signed).
assert.doesNotMatch(library, /downloadVideoFile\(\s*job\.videoUrl/);
assert.doesNotMatch(library, /window\.open\(\s*job\.videoUrl/);

// ─── Source contracts: owner gate fail-closed ──────────────────────────────

assert.match(downloads, /durableDownloadDenyBody/);
assert.match(downloads, /code:\s*"NOT_FOUND"/);
// Unauth durable UUID must not split on AUTH_REQUIRED existence.
assert.doesNotMatch(
  downloads,
  /status:\s*401[\s\S]{0,80}AUTH_REQUIRED/
);
assert.match(
  downloads,
  /Redirect only|never put the signed URL/
);
assert.match(createTrust, /AUTH_REQUIRED/);
assert.match(createTrust, /Download not found for this account/);
assert.match(createTrust, /PRIVATE_RESULT_MISSING/);

// ─── Source contracts: missing private result + Retry gate ─────────────────

assert.match(pure, /PRIVATE_RESULT_MISSING/);
assert.match(pure, /libraryMissingPrivateResultCopy/);
assert.match(pure, /libraryResultMissingDeliverable/);
assert.match(library, /libraryResultMissingDeliverable/);
assert.match(library, /libraryMissingPrivateResultCopy/);
assert.match(library, /Result missing/);
assert.match(library, /data-library-result=\{/);
assert.match(library, /data-library-failure=/);
assert.match(library, /canRetryGenerateFailure/);
assert.match(policy, /export function canRetryGenerateFailure/);
assert.match(pkg, /"library-result-delivery-regression"/);

// ─── Source contracts: no signed URL persistence ───────────────────────────

assert.match(createTrust, /export function isStorageSignedObjectUrl/);
assert.match(createTrust, /export function durableClientVideoUrl/);
assert.match(history, /durableClientVideoUrl/);
assert.match(
  history,
  /Signed storage URLs rewrite|never re-enter localStorage|never persist tokens/i
);

// ─── Pure: canRetryGenerateFailure ─────────────────────────────────────────

assert.equal(canRetryGenerateFailure({}), true);
assert.equal(canRetryGenerateFailure({ code: "TIMEOUT" }), true);
assert.equal(canRetryGenerateFailure({ code: "PROVIDER_NETWORK" }), true);
assert.equal(canRetryGenerateFailure({ code: "AUTH_REQUIRED" }), false);
assert.equal(canRetryGenerateFailure({ code: "INSUFFICIENT_CREDITS" }), false);
assert.equal(canRetryGenerateFailure({ code: "PROVIDER_BALANCE" }), false);
assert.equal(canRetryGenerateFailure({ code: "RIGHTS_REQUIRED" }), false);
assert.equal(
  canRetryGenerateFailure({ code: "DURABLE_CREDITS_UNAVAILABLE" }),
  false
);
assert.equal(canRetryGenerateFailure({ paywall: true }), false);
assert.equal(canRetryGenerateFailure({ fatal: true }), false);
assert.equal(canRetryGenerateFailure({ busy: true }), false);
assert.equal(canRetryGenerateFailure({ hasInput: false }), false);
assert.equal(
  canRetryGenerateFailure({ code: "TIMEOUT", hasInput: true }),
  true
);

// ─── Pure: missing private result DTO ──────────────────────────────────────

const ownerId = "11111111-1111-4111-8111-111111111111";
const jobId = "22222222-2222-4222-8222-222222222222";
const assetId = "44444444-4444-4444-8444-444444444444";

const missing = privateLibraryJobFromRow({
  id: jobId,
  effect_slug: "street-power-up",
  status: "succeeded",
  created_at: "2026-08-06T00:00:00.000Z",
  created_by: ownerId,
  input_asset_id: assetId,
  output_object_key: null,
  output_content_type: null,
});
assert.ok(missing);
assert.equal(missing.downloadAllowed, false);
assert.equal(missing.videoUrl, undefined);
assert.equal(missing.errorCode, "PRIVATE_RESULT_MISSING");
assert.equal(missing.creditsOutcome, "refund unconfirmed");
assert.equal(missing.capabilities.localRetry, false);
assert.equal(missing.capabilities.newAttempt, true);
assert.ok(missing.newAttemptUrl?.includes(assetId));
assert.equal(libraryResultMissingDeliverable(missing), true);
assert.match(
  libraryMissingPrivateResultCopy({ samePhotoHandoff: true }),
  /same verified photo/
);
assert.match(
  libraryMissingPrivateResultCopy({ samePhotoHandoff: false }),
  /unconfirmed/
);

const ready = privateLibraryJobFromRow({
  id: jobId,
  effect_slug: "street-power-up",
  status: "succeeded",
  created_at: "2026-08-06T00:00:00.000Z",
  created_by: ownerId,
  input_asset_id: assetId,
  output_object_key: `private-results/${ownerId}/${jobId}.mp4`,
  output_content_type: "video/mp4",
});
assert.ok(ready);
assert.equal(ready.downloadAllowed, true);
assert.equal(ready.videoUrl, `/api/downloads/${encodeURIComponent(jobId)}`);
assert.equal(libraryResultMissingDeliverable(ready), false);
assert.equal(ready.capabilities.newAttempt, false);

// durableClientVideoUrl shape locked in createTrust source
assert.match(
  createTrust,
  /isStorageSignedObjectUrl\(t\)[\s\S]{0,200}\/api\/downloads\/\$\{encodeURIComponent\(id\)\}/
);
assert.match(
  createTrust,
  /path\.includes\("\/storage\/v1\/object\/sign\/"\)/
);

console.log("library-result-delivery-regression: PASS");
