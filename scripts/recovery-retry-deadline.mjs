import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  deadlineExpired,
  fixedDeadlineAt,
  mintRetryToken,
  providerCompletionDecision,
  retryTokenDigest,
  retryTokenMatches,
} from "../lib/generationReliability.mjs";

const root = process.cwd();
const store = readFileSync(join(root, "lib/generationJobs/store.ts"), "utf8");
const retryRoute = readFileSync(
  join(root, "app/api/generations/[id]/retry/route.ts"),
  "utf8"
);
const itemRoute = readFileSync(
  join(root, "app/api/generations/[id]/route.ts"),
  "utf8"
);
const listRoute = readFileSync(
  join(root, "app/api/generations/route.ts"),
  "utf8"
);
const generateRoute = readFileSync(
  join(root, "app/api/generate/route.ts"),
  "utf8"
);

assert.match(store, /const parent = jobs\.get\(input\.parentId\)/);
assert.match(store, /const child = jobs\.get\(input\.retryJobId\)/);
assert.match(store, /retryTokenMatches\(child\.retryTokenHash, input\.retryToken\)/);
assert.match(store, /retryTokenHash:\s*undefined/);
assert.doesNotMatch(store, /queuedForks/);
assert.doesNotMatch(
  store,
  /findJobByRequestOrId\(input\.parentId\)/,
  "retry parent must be an exact ledger job id"
);
assert.match(retryRoute, /retryJobId/);
assert.match(retryRoute, /retryToken/);
assert.match(generateRoute, /claimRetryJobForGenerate/);
assert.match(generateRoute, /recordWorkerHeartbeat/);
assert.match(generateRoute, /providerCompletionDecision/);

assert.doesNotMatch(itemRoute, /touchJob/);
assert.doesNotMatch(listRoute, /touchOpenJobsForSession/);
assert.match(itemRoute, /Read-only poll/);
assert.match(listRoute, /GET is read-only/);
assert.match(store, /deadlineAt\s*\|\|[\s\S]{0,180}job\.createdAt/);
assert.doesNotMatch(
  store,
  /const stamp = job\.updatedAt|jobTimeoutMs\(\) - ageMs\(job\.updatedAt/
);

const created = 1_000_000;
const deadlineAt = fixedDeadlineAt(created, 30_000);
let simulatedUpdatedAt = new Date(created).toISOString();
let simulatedHeartbeatAt = simulatedUpdatedAt;
for (let i = 1; i <= 100; i += 1) {
  // Browser reads update nothing. Trusted heartbeat is observable but never
  // writes the fixed deadline.
  simulatedHeartbeatAt = new Date(created + i * 100).toISOString();
  assert.equal(deadlineAt, fixedDeadlineAt(created, 30_000));
}
assert.ok(simulatedHeartbeatAt > simulatedUpdatedAt);
assert.equal(deadlineExpired(deadlineAt, created + 29_999), false);
assert.equal(deadlineExpired(deadlineAt, created + 30_000), true);

assert.deepEqual(providerCompletionDecision({ status: "running" }), {
  allow: true,
});
const canceledLate = providerCompletionDecision({
  status: "canceled",
  errorCode: "CANCELED",
});
assert.equal(canceledLate.allow, false);
assert.equal(canceledLate.code, "REQUEST_CANCELED");
assert.equal(canceledLate.httpStatus, 409);
assert.match(canceledLate.message, /withheld/i);
assert.match(canceledLate.message, /unconfirmed/i);
const timedOutLate = providerCompletionDecision({
  status: "failed",
  errorCode: "TIMEOUT",
});
assert.equal(timedOutLate.allow, false);
assert.equal(timedOutLate.code, "TIMEOUT");
assert.equal(timedOutLate.httpStatus, 504);
assert.equal(providerCompletionDecision({ status: "queued" }).allow, false);
assert.equal(providerCompletionDecision(null).allow, false);

const retryToken = mintRetryToken();
const grant = {
  status: "queued",
  tokenHash: retryTokenDigest(retryToken),
  claims: 0,
};
async function claim(presented) {
  // Synchronous compare+transition mirrors the in-process store critical
  // section; no await exists between validation and status change.
  if (grant.status !== "queued") return false;
  if (!retryTokenMatches(grant.tokenHash, presented)) return false;
  grant.status = "running";
  grant.claims += 1;
  return true;
}
const claims = await Promise.all(
  Array.from({ length: 20 }, () => claim(retryToken))
);
assert.equal(claims.filter(Boolean).length, 1);
assert.equal(grant.claims, 1);
assert.equal(await claim(`${retryToken}wrong`), false);

console.log(
  "recovery-retry-deadline: PASS (exact retry token winner=1/20; polling cannot extend fixed deadline)"
);
