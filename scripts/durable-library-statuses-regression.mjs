#!/usr/bin/env node
/**
 * AIT-12: durable Moment statuses in Library.
 *
 * Source + pure-function regression (no network, no provider, no Supabase).
 * Covers owner-scoped mapping, all durable statuses, dedupe/counts, secret
 * field exclusion, controlled download URLs, and no local Retry/Cancel on
 * durable rows.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  mergePrivateLibraryWithLocalLedger,
  privateLibraryJobFromRow,
  safeLibraryErrorCode,
  PRIVATE_LIBRARY_STATUSES,
} from "../lib/privateGenerationResultsPure.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const pure = read("lib/privateGenerationResultsPure.mjs");
const results = read("lib/privateGenerationResults.ts");
const generations = read("app/api/generations/route.ts");
const library = read("components/LibraryGrid.tsx");
const pkg = read("package.json");

// ─── Source contracts ──────────────────────────────────────────────────────

assert.match(results, /listPrivateGenerationResults/);
assert.match(results, /\.in\("status",\s*\[\.\.\.PRIVATE_LIBRARY_STATUSES\]\)/);
assert.match(results, /privateLibraryJobFromRow/);
assert.match(results, /eq\("created_by",\s*input\.userId\)/);
assert.doesNotMatch(
  results,
  /listPrivateGenerationResults[\s\S]{0,900}\.eq\("status",\s*"succeeded"\)/,
  "Library list must not filter to succeeded-only"
);

assert.match(generations, /getAuthUserFromRequest/);
assert.match(
  generations,
  /listPrivateGenerationResults\(\{\s*userId: authUser\.id/
);
assert.match(generations, /mergePrivateLibraryWithLocalLedger/);
assert.match(generations, /adapter:\s*"process-memory"/);
assert.match(generations, /localRetry:\s*terminalFailure/);
assert.match(generations, /localCancel:\s*open/);
assert.doesNotMatch(generations, /providerOutputUrl/);
assert.doesNotMatch(
  generations,
  /videoUrl:\s*[`"'].*supabase|videoUrl:\s*[`"']https?:\/\//i
);

assert.match(library, /function canLocalRetry/);
assert.match(library, /function canLocalCancel/);
assert.match(library, /function canNewAttempt/);
assert.match(library, /isRetryable\(job\.status\) && canLocalRetry\(job\)/);
assert.match(library, /isOpen\(job\.status\) && canLocalCancel\(job\)/);
assert.match(library, /canNewAttempt\(job\)/);
assert.match(library, /data-library-action="new-attempt"/);
assert.match(library, /void retry\(job\)/);
assert.match(library, /void cancel\(job\)/);
assert.match(
  library,
  /durable === true \|\| job\.adapter === "supabase-private"/
);

assert.match(pkg, /"durable-library-statuses-regression"/);

// Pure module must never serialize secret field names into the client DTO.
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
]) {
  // Mapping may *read* output_object_key / content type for deliverable checks;
  // it must not assign them onto the returned job.
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

// ─── Pure status mapping ───────────────────────────────────────────────────

assert.deepEqual(
  [...PRIVATE_LIBRARY_STATUSES],
  ["queued", "running", "succeeded", "failed", "canceled"]
);

const ownerId = "11111111-1111-4111-8111-111111111111";
const jobId = "22222222-2222-4222-8222-222222222222";
const otherJob = "33333333-3333-4333-8333-333333333333";

const baseRow = {
  id: jobId,
  effect_slug: "street-power-up",
  created_at: "2026-08-04T12:00:00.000Z",
  started_at: "2026-08-04T12:00:01.000Z",
  model_id: "seedance-fast",
  duration_seconds: 5,
  aspect_ratio: "9:16",
  resolution: "720p",
  // Secret / non-client fields present on the row — must not leak.
  created_by: ownerId,
  output_object_key: `private-results/${ownerId}/${jobId}.mp4`,
  output_sha256: "a".repeat(64),
  provider_request_id: "prov_secret_should_not_leak",
  idempotency_key: "idem_secret_should_not_leak",
};

const statuses = {
  queued: privateLibraryJobFromRow({ ...baseRow, status: "queued" }),
  running: privateLibraryJobFromRow({ ...baseRow, status: "running" }),
  succeeded: privateLibraryJobFromRow({
    ...baseRow,
    status: "succeeded",
    output_content_type: "video/mp4",
    completed_at: "2026-08-04T12:01:00.000Z",
  }),
  failed: privateLibraryJobFromRow({
    ...baseRow,
    status: "failed",
    error_code: "TIMEOUT",
    completed_at: "2026-08-04T12:02:00.000Z",
  }),
  canceled: privateLibraryJobFromRow({
    ...baseRow,
    status: "canceled",
    error_code: "CANCELED",
    completed_at: "2026-08-04T12:03:00.000Z",
  }),
};

for (const [status, job] of Object.entries(statuses)) {
  assert.ok(job, `maps ${status}`);
  assert.equal(job.status, status);
  assert.equal(job.id, jobId);
  assert.equal(job.requestId, jobId);
  assert.equal(job.effect, "street-power-up");
  assert.equal(job.durable, true);
  assert.equal(job.adapter, "supabase-private");
  assert.equal(job.owned, true);
  assert.equal(job.capabilities.localRetry, false);
  assert.equal(job.capabilities.localCancel, false);
  assert.equal(job.demo, false);
  // Never leak secrets on the DTO.
  assert.equal("output_object_key" in job, false);
  assert.equal("objectKey" in job, false);
  assert.equal("provider_request_id" in job, false);
  assert.equal("providerRequestId" in job, false);
  assert.equal("idempotency_key" in job, false);
  assert.equal("created_by" in job, false);
  assert.equal("userId" in job, false);
  assert.equal("output_sha256" in job, false);
  assert.equal("checksum" in job, false);
  assert.equal("signedUrl" in job, false);
  assert.equal("prompt" in job, false);
  const serialized = JSON.stringify(job);
  assert.doesNotMatch(serialized, /private-results\//);
  assert.doesNotMatch(serialized, /prov_secret/);
  assert.doesNotMatch(serialized, /idem_secret/);
  assert.doesNotMatch(serialized, /aaaaaaaaaa/);
  assert.ok(
    !serialized.includes(ownerId),
    "must not leak created_by/user id"
  );
}

assert.equal(statuses.queued.capabilities.refreshOnly, true);
assert.equal(statuses.queued.capabilities.newAttempt, false);
assert.equal(statuses.queued.downloadAllowed, false);
assert.equal(statuses.queued.videoUrl, undefined);

assert.equal(statuses.running.capabilities.refreshOnly, true);
assert.equal(statuses.running.downloadAllowed, false);
assert.equal(statuses.running.videoUrl, undefined);

assert.equal(statuses.succeeded.downloadAllowed, true);
assert.equal(
  statuses.succeeded.videoUrl,
  `/api/downloads/${encodeURIComponent(jobId)}`
);
assert.equal(statuses.succeeded.capabilities.newAttempt, false);
assert.equal(statuses.succeeded.capabilities.refreshOnly, false);
assert.equal(statuses.succeeded.creditsOutcome, "10 used");

assert.equal(statuses.failed.capabilities.newAttempt, true);
assert.equal(statuses.failed.errorCode, "TIMEOUT");
assert.equal(statuses.failed.downloadAllowed, false);
assert.equal(statuses.failed.videoUrl, undefined);
assert.equal(statuses.failed.creditsOutcome, "10 restored");

assert.equal(statuses.canceled.capabilities.newAttempt, true);
assert.equal(statuses.canceled.errorCode, "CANCELED");
assert.equal(statuses.canceled.creditsOutcome, "refund unconfirmed");

// Succeeded without a private object is not a deliverable download.
const incompleteSuccess = privateLibraryJobFromRow({
  ...baseRow,
  status: "succeeded",
  output_object_key: null,
  output_content_type: null,
});
assert.ok(incompleteSuccess);
assert.equal(incompleteSuccess.downloadAllowed, false);
assert.equal(incompleteSuccess.videoUrl, undefined);

// Unknown / invalid rows are dropped (not owner-filterable client-side).
assert.equal(
  privateLibraryJobFromRow({ ...baseRow, status: "unknown" }),
  null
);
assert.equal(privateLibraryJobFromRow({ ...baseRow, id: "" }), null);
assert.equal(
  privateLibraryJobFromRow({ ...baseRow, effect_slug: "" }),
  null
);

// Safe error codes only — freeform / secret-looking values collapse.
assert.equal(safeLibraryErrorCode("TIMEOUT"), "TIMEOUT");
assert.equal(safeLibraryErrorCode("content_policy"), "CONTENT_POLICY");
assert.equal(
  safeLibraryErrorCode("s3://bucket/secret-key"),
  undefined
);
assert.equal(
  safeLibraryErrorCode("SELECT * FROM generation_jobs"),
  undefined
);
assert.equal(
  safeLibraryErrorCode("NOT_A_REAL_SAFE_CODE"),
  "GENERATION_FAILED"
);
assert.equal(
  privateLibraryJobFromRow({
    ...baseRow,
    status: "failed",
    error_code: "https://provider.example/leak",
  })?.errorCode,
  "GENERATION_FAILED"
);

// ─── Merge / dedupe / counts ───────────────────────────────────────────────

const durableQueued = privateLibraryJobFromRow({
  ...baseRow,
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  status: "queued",
  created_at: "2026-08-04T12:05:00.000Z",
});
const durableSucceeded = statuses.succeeded;
const durableFailed = privateLibraryJobFromRow({
  ...baseRow,
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  status: "failed",
  error_code: "TIMEOUT",
  created_at: "2026-08-04T12:04:00.000Z",
});
const durableRunning = privateLibraryJobFromRow({
  ...baseRow,
  id: otherJob,
  status: "running",
  created_at: "2026-08-04T11:00:00.000Z",
});
const durable = [
  durableQueued,
  durableSucceeded,
  durableFailed,
  durableRunning,
].filter(Boolean);

const localMirror = {
  id: jobId,
  requestId: jobId,
  status: "succeeded",
  effect: "street-power-up",
  createdAt: "2026-08-04T12:00:00.000Z",
  durable: false,
  adapter: "process-memory",
};
const localOnly = {
  id: "local-only-1",
  status: "failed",
  effect: "street-power-up",
  createdAt: "2026-08-04T10:00:00.000Z",
  durable: false,
  adapter: "process-memory",
  capabilities: {
    localRetry: true,
    localCancel: false,
    newAttempt: true,
    refreshOnly: false,
  },
};

const merged = mergePrivateLibraryWithLocalLedger({
  durableJobs: durable,
  localJobs: [localMirror, localOnly],
  localCounts: {
    queued: 0,
    running: 0,
    succeeded: 1, // mirror of durable succeeded
    failed: 1, // local-only
    canceled: 0,
    open: 0,
    total: 2,
  },
  listLimit: 50,
});

// Mirror is de-duplicated from the local side; durable truth remains.
assert.equal(
  merged.jobs.filter((j) => j.id === jobId).length,
  1,
  "dedupe mirrors by id"
);
assert.equal(
  merged.jobs.find((j) => j.id === jobId)?.durable,
  true,
  "durable truth wins over process-memory mirror"
);
assert.ok(merged.jobs.some((j) => j.id === "local-only-1"));
assert.ok(merged.jobs.some((j) => j.id === otherJob && j.status === "running"));
assert.equal(merged.mirroredCount, 1);
assert.equal(merged.durableOnlyCount, 3); // queued + failed + other running

// Counts include durable-only open/failed beyond local histogram.
assert.equal(merged.byStatus.queued, 1);
assert.equal(merged.byStatus.running, 1);
assert.equal(merged.byStatus.succeeded, 1); // local already counted the mirror
assert.equal(merged.byStatus.failed, 2); // local failed + durable failed
assert.equal(merged.open, 2);
assert.equal(merged.total, 5); // 2 local + 3 durable-only

// Anonymous / empty durable list: pure local ledger.
const anon = mergePrivateLibraryWithLocalLedger({
  durableJobs: [],
  localJobs: [localOnly],
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
assert.equal(anon.jobs.length, 1);
assert.equal(anon.total, 1);
assert.equal(anon.byStatus.failed, 1);

// Owner filter is enforced at query time (created_by = userId) — assert source.
assert.match(
  results,
  /\.eq\("created_by",\s*input\.userId\)[\s\S]{0,120}\.in\("status"/
);

// Controlled download only for deliverable success.
assert.match(
  pure,
  /videoUrl\s*=\s*`\/api\/downloads\/\$\{encodeURIComponent\(id\)\}`/
);
assert.doesNotMatch(pure, /createSignedUrl/);

console.log("durable-library-statuses-regression: PASS");
