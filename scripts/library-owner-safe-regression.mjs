#!/usr/bin/env node
/**
 * AIT-41: Library owner-safe recovery — list, retry, input bind, not-your-toy.
 *
 * Source + pure-function regression (no network, no provider, no Supabase).
 * Covers owner-scoped list/detail, non-owner deny (no metadata leak),
 * retry / new-attempt paths, honest inputBound placeholder, and deep-link
 * fail-closed copy.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  libraryInputBindingCopy,
  libraryInputBoundFromAssetId,
  libraryNotYourToyCopy,
  privateLibraryJobFromRow,
  mergePrivateLibraryWithLocalLedger,
} from "../lib/privateGenerationResultsPure.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const pure = read("lib/privateGenerationResultsPure.mjs");
const results = read("lib/privateGenerationResults.ts");
const generationsList = read("app/api/generations/route.ts");
const generationsDetail = read("app/api/generations/[id]/route.ts");
const library = read("components/LibraryGrid.tsx");
const retryRoute = read("app/api/generations/[id]/retry/route.ts");
const pkg = read("package.json");

// ─── Source contracts: owner list ──────────────────────────────────────────

assert.match(results, /listPrivateGenerationResults/);
assert.match(results, /getPrivateLibraryJobForOwner/);
assert.match(results, /eq\("created_by",\s*input\.userId\)/);
assert.match(
  results,
  /getPrivateLibraryJobForOwner[\s\S]{0,800}\.eq\("id",\s*jobId\)/
);
assert.match(
  results,
  /getPrivateLibraryJobForOwner[\s\S]{0,900}\.eq\("created_by",\s*userId\)/,
  "detail lookup must always bind created_by — never id-only"
);
assert.match(generationsList, /listPrivateGenerationResults\(\{\s*userId: authUser\.id/);
assert.doesNotMatch(
  generationsList,
  /searchParams\.get\(["']userId["']\)|body\.userId/,
  "list must not accept a cross-user userId query/body"
);
assert.match(generationsList, /inputBound:\s*false/);

// ─── Source contracts: detail fail-closed ──────────────────────────────────

assert.match(generationsDetail, /getPrivateLibraryJobForOwner/);
assert.match(generationsDetail, /getAuthUserFromRequest/);
assert.match(generationsDetail, /sessionId === session\.id/);
assert.match(generationsDetail, /code:\s*"NOT_FOUND"/);
// Detail response must not invent foreign-owner metadata fields.
assert.doesNotMatch(generationsDetail, /created_by\s*:/);
// No provider / signed URL leakage on detail.
assert.doesNotMatch(generationsDetail, /providerOutputUrl|signedUrl|output_object_key/);

// ─── Source contracts: retry path ──────────────────────────────────────────

assert.match(retryRoute, /forkRetryJob/);
assert.match(retryRoute, /NOT_OWNED/);
assert.match(retryRoute, /createUi/);
assert.match(retryRoute, /retryToken/);
assert.match(library, /\/api\/generations\/\$\{encodeURIComponent\(job\.id\)\}\/retry/);
assert.match(library, /void retry\(job\)/);
assert.match(library, /isRetryable\(job\.status\)[\s\S]{0,350}void retry\(job\)/);
assert.match(library, /isOpen\(job\.status\)[\s\S]{0,350}void cancel\(job\)/);
assert.match(library, /href=["']\/login\?next=\/library["']/);
assert.match(library, /data-library-action="retry"/);
assert.match(library, /data-library-action="new-attempt"/);
assert.match(library, /canLocalRetry\(job\)/);
assert.match(library, /canNewAttempt\(job\)/);
// No fake progress bars / simulated percent.
assert.doesNotMatch(library, /progress-bar|fakeProgress|percentComplete|Math\.random\(\)/i);

// ─── Source contracts: input bind + not-your-toy ───────────────────────────

assert.match(pure, /libraryInputBoundFromAssetId/);
assert.match(pure, /libraryInputBindingCopy/);
assert.match(pure, /libraryNotYourToyCopy/);
assert.match(pure, /inputBound/);
assert.match(results, /inputBound:\s*boolean/);
assert.match(library, /libraryInputBindingCopy/);
assert.match(library, /libraryNotYourToyCopy/);
assert.match(library, /data-library-input-bound=/);
assert.match(library, /data-library-state="not-your-toy"/);
assert.match(library, /data-library-not-your-toy="true"/);
assert.match(library, /data-library-detail="true"/);
assert.match(library, /parseLibraryJobId|deepLinkJobId|parseDeepLinkJobId/);
assert.match(library, /libraryLoginHref|login\?next=\/library/);
assert.match(library, /useSearchParams/);
assert.match(library, /job\.owned === false/);
assert.doesNotMatch(
  library,
  /input_asset_id|inputAssetId/,
  "LibraryGrid must not read raw input asset ids"
);
assert.match(pkg, /"library-owner-safe-regression"/);

// Secret fields must not be assigned onto Library DTO.
for (const secret of [
  "output_object_key",
  "output_sha256",
  "provider_request_id",
  "idempotency_key",
  "created_by",
  "userId",
  "email",
  "signedUrl",
  "objectKey",
  "prompt",
  "input_asset_id",
  "inputAssetId",
]) {
  assert.doesNotMatch(
    pure,
    new RegExp(`job\\.${secret}\\s*=`),
    `must not assign secret field ${secret} onto Library DTO`
  );
  assert.doesNotMatch(
    pure,
    new RegExp(`${secret}\\s*:\\s*row\\.`),
    `must not pass through secret field ${secret}`
  );
}

// ─── Pure: inputBound boolean (never raw id) ────────────────────────────────

const ownerId = "11111111-1111-4111-8111-111111111111";
const jobId = "22222222-2222-4222-8222-222222222222";
const foreignJobId = "33333333-3333-4333-8333-333333333333";
const inputAssetId = "44444444-4444-4444-8444-444444444444";

assert.equal(libraryInputBoundFromAssetId(inputAssetId), true);
assert.equal(libraryInputBoundFromAssetId(inputAssetId.toUpperCase()), true);
assert.equal(libraryInputBoundFromAssetId(null), false);
assert.equal(libraryInputBoundFromAssetId(""), false);
assert.equal(libraryInputBoundFromAssetId("not-a-uuid"), false);
assert.equal(
  libraryInputBoundFromAssetId("00000000-0000-0000-0000-000000000000"),
  false
);

const baseRow = {
  id: jobId,
  effect_slug: "street-power-up",
  created_at: "2026-08-04T12:00:00.000Z",
  started_at: "2026-08-04T12:00:01.000Z",
  model_id: "seedance-fast",
  duration_seconds: 5,
  aspect_ratio: "9:16",
  resolution: "720p",
  created_by: ownerId,
  input_asset_id: inputAssetId,
  output_object_key: `private-results/${ownerId}/${jobId}.mp4`,
  output_sha256: "a".repeat(64),
  provider_request_id: "prov_secret_should_not_leak",
  idempotency_key: "idem_secret_should_not_leak",
};

const boundSucceeded = privateLibraryJobFromRow({
  ...baseRow,
  status: "succeeded",
  output_content_type: "video/mp4",
  completed_at: "2026-08-04T12:01:00.000Z",
});
assert.ok(boundSucceeded);
assert.equal(boundSucceeded.inputBound, true);
assert.equal(boundSucceeded.owned, true);
assert.equal("input_asset_id" in boundSucceeded, false);
assert.equal("inputAssetId" in boundSucceeded, false);
assert.doesNotMatch(JSON.stringify(boundSucceeded), new RegExp(inputAssetId));
assert.doesNotMatch(JSON.stringify(boundSucceeded), /private-results\//);
assert.doesNotMatch(JSON.stringify(boundSucceeded), new RegExp(ownerId));

const unboundFailed = privateLibraryJobFromRow({
  ...baseRow,
  status: "failed",
  error_code: "TIMEOUT",
  input_asset_id: null,
  completed_at: "2026-08-04T12:02:00.000Z",
});
assert.ok(unboundFailed);
assert.equal(unboundFailed.inputBound, false);
assert.equal(unboundFailed.capabilities.newAttempt, true);
assert.equal(unboundFailed.newAttemptUrl, undefined);

const boundFailed = privateLibraryJobFromRow({
  ...baseRow,
  status: "failed",
  error_code: "TIMEOUT",
  completed_at: "2026-08-04T12:02:00.000Z",
});
assert.ok(boundFailed);
assert.equal(boundFailed.inputBound, true);
assert.ok(boundFailed.newAttemptUrl?.includes(inputAssetId));

// ─── Pure: honest binding + not-your-toy copy ──────────────────────────────

const boundCopy = libraryInputBindingCopy(true);
const unboundCopy = libraryInputBindingCopy(false);
assert.match(boundCopy, /private source photo/i);
assert.match(boundCopy, /not shown as a public URL/i);
assert.doesNotMatch(boundCopy, /https?:\/\//i);
assert.match(unboundCopy, /no private source photo/i);
assert.doesNotMatch(boundCopy, /input_asset_id|inputAssetId/);

const notYours = libraryNotYourToyCopy();
assert.match(notYours, /not available on your account/i);
assert.doesNotMatch(notYours, /https?:\/\//i);
assert.doesNotMatch(notYours, /videoUrl|provider|signed/i);
// Must not embed a foreign job id or invent media claims.
assert.doesNotMatch(notYours, new RegExp(foreignJobId));
assert.doesNotMatch(notYours, /preview|thumbnail|stream/i);

// ─── Pure: owner list merge never mixes foreign owned:false stubs ──────────

const localForeignStub = {
  id: foreignJobId,
  status: "failed",
  effect: "street-power-up",
  owned: false,
  downloadAllowed: false,
  demo: false,
  createdAt: "2026-08-04T11:00:00.000Z",
};

const merged = mergePrivateLibraryWithLocalLedger({
  durableJobs: [boundSucceeded],
  localJobs: [localForeignStub],
  localCounts: {
    queued: 0,
    running: 0,
    succeeded: 0,
    failed: 1,
    canceled: 0,
    open: 0,
    total: 1,
  },
  listLimit: 50,
});
// Merge keeps local rows for counts but owner UI filters owned===false.
assert.ok(Array.isArray(merged.jobs));
const ownerOnlyVisible = merged.jobs.filter(
  (j) => j.owned !== false && j.demo !== true
);
assert.ok(ownerOnlyVisible.some((j) => j.id === jobId));
// Durable owner job must carry inputBound truth.
const listed = ownerOnlyVisible.find((j) => j.id === jobId);
assert.equal(listed.inputBound, true);

console.log("library-owner-safe-regression: ok");
