#!/usr/bin/env node
/**
 * AIT-464 / AIT-173 residual: Downloads owner gate fail-closed.
 *
 * Source + pure-function regression (no network, no provider, no Supabase).
 * Locks durable UUID deny uniformity (unauth/foreign/missing), process-memory
 * session bind that never wins over durable created_by, LibraryGrid controlled-
 * gate only, HEAD honesty codes (not blanket NOT_READY), and no signed/provider
 * leak on deny bodies.
 *
 * Completes Library recovery surface after list/retry/asset-bind (#434).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const downloadRoute = read("app/api/downloads/[id]/route.ts");
const library = read("components/LibraryGrid.tsx");
const results = read("lib/privateGenerationResults.ts");
const pure = read("lib/privateGenerationResultsPure.mjs");
const createTrust = read("lib/createTrust.ts");
const pkg = read("package.json");
const generationsList = read("app/api/generations/route.ts");
const jobStore = read("lib/generationJobs/store.ts");

// ─── Source: durable UUID path requires auth owner ──────────────────────────

assert.match(downloadRoute, /getAuthUserFromRequest/);
assert.match(downloadRoute, /getPrivateGenerationResult/);
assert.match(
  downloadRoute,
  /getPrivateGenerationResult\(\{\s*jobId:\s*id,\s*userId:\s*user\.id/
);
assert.match(results, /eq\("created_by",\s*input\.userId\)/);
assert.match(
  results,
  /getPrivateGenerationResult[\s\S]{0,400}\.eq\("id",\s*input\.jobId\)/
);
assert.match(
  results,
  /getPrivateGenerationResult[\s\S]{0,500}\.eq\("created_by",\s*input\.userId\)/,
  "durable download lookup must always bind created_by — never id-only"
);

// ─── Source: uniform fail-closed deny (no AUTH_REQUIRED split) ──────────────

assert.match(
  downloadRoute,
  /durableDownloadDenyBody|Download not found for this account/
);
assert.match(downloadRoute, /code:\s*"NOT_FOUND"/);
// Unauth durable UUID must not return a distinct AUTH_REQUIRED status/code.
assert.doesNotMatch(
  downloadRoute,
  /status:\s*401|code:\s*"AUTH_REQUIRED"|Sign in to download this private result/
);
// Deny body helper must stay metadata-free.
assert.match(downloadRoute, /function durableDownloadDenyBody/);
assert.doesNotMatch(
  downloadRoute,
  /function durableDownloadDenyBody[\s\S]{0,280}(signedUrl|objectKey|providerOutput|checksum|videoUrl)/
);

// GET/HEAD private errors share NOT_FOUND; private success only after ownership.
assert.match(
  downloadRoute,
  /privateResult\.kind === "error"[\s\S]{0,350}durableDownloadDenyBody|privateResult\.kind === "error"[\s\S]{0,250}NOT_FOUND/
);
assert.match(
  downloadRoute,
  /privateResult\.kind === "private"[\s\S]{0,200}signedPrivateResultUrl/
);
// Signed URL only via redirect — not JSON body for private success.
assert.match(downloadRoute, /NextResponse\.redirect\(signed/);
assert.doesNotMatch(
  downloadRoute,
  /signedUrl:\s*signed|url:\s*signed|objectKey:\s*privateResult/
);

// HEAD deny: blocked + NOT_FOUND only — no private markers / checksum.
assert.match(
  downloadRoute,
  /privateResult\.kind === "error"[\s\S]{0,400}X-Pikbo-Download-Code": "NOT_FOUND"/
);
assert.doesNotMatch(
  downloadRoute,
  /privateResult\.kind === "error"[\s\S]{0,500}X-Pikbo-Private-Result|privateResult\.kind === "error"[\s\S]{0,500}X-Pikbo-Result-Sha256/
);

// ─── Source: process-memory stays session-bound (non-UUID only) ─────────────

assert.match(
  downloadRoute,
  /if \(!isUuid\(id\)\) return \{ kind: "not-private"/
);
assert.match(downloadRoute, /findJobByRequestOrId/);
assert.match(downloadRoute, /job\.sessionId !== sessionId/);
assert.match(downloadRoute, /ensureSession/);
// UUID durable path must not fall through to process-memory after deny.
assert.match(
  downloadRoute,
  /privateResult\.kind === "error"[\s\S]{0,300}return NextResponse\.json/
);
// GET private success mints signed URL only after ownership; then returns
// (redirect) — process-memory path is a separate branch after private returns.
assert.match(
  downloadRoute,
  /privateResult\.kind === "private"[\s\S]{0,900}NextResponse\.redirect\(signed/
);
assert.match(
  downloadRoute,
  /NextResponse\.redirect\(signed[\s\S]{0,120}\/\/ Process-memory path: session-bound only/
);
// Process-memory job ids are non-UUID (`job_…`) so durable UUID never collides
// into the session gate for another account's Moment.
assert.match(
  jobStore,
  /function newId\(\)[\s\S]{0,80}return `job_\$\{/
);
assert.doesNotMatch(
  jobStore,
  /function newId\(\)[\s\S]{0,120}randomUUID/
);

// ─── Source: HEAD honesty codes (not blanket NOT_READY) ─────────────────────

assert.match(downloadRoute, /code:\s*"CANCELED"/);
assert.match(downloadRoute, /code:\s*"JOB_IN_FLIGHT"/);
assert.match(downloadRoute, /"TIMEOUT"/);
// Process-memory HEAD exposes gate body code (CANCELED / JOB_IN_FLIGHT / …).
assert.match(downloadRoute, /X-Pikbo-Download-Code": code/);
// Client classifier surfaces terminal fails before generic NOT_READY.
assert.match(
  createTrust,
  /Terminal fail codes must run BEFORE generic 409\/NOT_READY/
);
assert.match(createTrust, /code === "JOB_IN_FLIGHT"/);
assert.match(createTrust, /code === "CANCELED"/);

// ─── Source: LibraryGrid download never follows raw provider URLs ───────────

assert.match(
  library,
  /const gateUrl = `\/api\/downloads\/\$\{encodeURIComponent\(id\)\}`/
);
assert.match(library, /downloadVideoFile\(\s*gateUrl/);
// Must not pass job.videoUrl into downloadVideoFile.
assert.doesNotMatch(library, /downloadVideoFile\(\s*job\.videoUrl/);
assert.match(
  library,
  /never follow[\s\S]{0,120}raw provider|only the controlled owner\/session gate/i
);
// DTO videoUrl for durable success is controlled gate path (pure mapper).
assert.match(
  pure,
  /job\.videoUrl = `\/api\/downloads\/\$\{encodeURIComponent\(id\)\}`/
);
// List path rewrites local jobs to controlled download URLs.
assert.match(
  generationsList,
  /\/api\/downloads\/\$\{encodeURIComponent\(downloadId\)\}/
);

// ─── Source: createTrust maps durable deny uniformly for clients ────────────

assert.match(createTrust, /status === 401/);
assert.match(createTrust, /code === "AUTH_REQUIRED"/);
assert.match(createTrust, /Download not found for this account/);
assert.match(createTrust, /status === 404/);
assert.match(createTrust, /code === "NOT_FOUND"/);

// ─── Pure: local classifier mirror for deny uniformity ──────────────────────

/**
 * Mirrors createTrust.classifyDownloadHead deny branch for durable gate codes.
 * Kept local so this smoke stays zero-network and free of TS module loading.
 */
function classifyDownloadDeny(opts) {
  const code = (opts.code || "").trim();
  const status = opts.status;
  if (
    status === 404 ||
    code === "NOT_FOUND" ||
    status === 401 ||
    code === "AUTH_REQUIRED"
  ) {
    return { kind: "not_found" };
  }
  if (status >= 200 && status < 300) return { kind: "allow" };
  return { kind: "other" };
}

const unauth = classifyDownloadDeny({ status: 404, code: "NOT_FOUND" });
const foreign = classifyDownloadDeny({ status: 404, code: "NOT_FOUND" });
const missing = classifyDownloadDeny({ status: 404, code: "NOT_FOUND" });
const legacyAuth = classifyDownloadDeny({
  status: 401,
  code: "AUTH_REQUIRED",
});
assert.equal(unauth.kind, "not_found");
assert.equal(foreign.kind, unauth.kind);
assert.equal(missing.kind, unauth.kind);
assert.equal(
  legacyAuth.kind,
  "not_found",
  "legacy AUTH_REQUIRED must not surface as a distinct existence path"
);
assert.equal(
  classifyDownloadDeny({ status: 200, code: "" }).kind,
  "allow"
);

// ─── Package script registered ──────────────────────────────────────────────

assert.match(pkg, /"download-owner-safe-regression"/);

console.log("download-owner-safe-regression: ok");
