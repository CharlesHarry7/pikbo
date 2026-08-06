#!/usr/bin/env node
/**
 * AIT-294: Create / Landing / Batch download fallthrough residual.
 *
 * Source + pure-function smoke (no network, no provider). Locks client residual
 * after durable gate deny: never follow raw provider CDN; only Lab /demos/*
 * or controlled /api/downloads/* fallthrough.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const createStudio = read("components/CreateStudio.tsx");
const landing = read("components/LandingToolPanel.tsx");
const batch = read("components/BatchStudio.tsx");
const createTrust = read("lib/createTrust.ts");
const packExport = read("lib/sellerPackExport.ts");
const pkg = read("package.json");

// ─── Source: controlled client download helpers ─────────────────────────────

assert.match(createTrust, /export function isControlledClientDownloadUrl/);
assert.match(createTrust, /export function isDurableDownloadRequestId/);
assert.match(
  createTrust,
  /isControlledClientDownloadUrl[\s\S]{0,400}\/demos\//
);
assert.match(
  createTrust,
  /isControlledClientDownloadUrl[\s\S]{0,600}isSessionGatedDownloadUrl/
);
// Durable UUID regex (shared shape with downloads route).
assert.match(
  createTrust,
  /isDurableDownloadRequestId[\s\S]{0,200}0-9a-f\]\{8\}/
);

// ─── Source: Create / Landing — no isSafeDeliverableUrl fallthrough ─────────

for (const [name, src] of [
  ["CreateStudio", createStudio],
  ["LandingToolPanel", landing],
]) {
  assert.match(
    src,
    /isControlledClientDownloadUrl/,
    `${name} must use controlled client download allowlist`
  );
  assert.match(
    src,
    /isDurableDownloadRequestId/,
    `${name} must special-case durable UUID network miss`
  );
  // Direct blob path must require controlled allowlist, not broad https.
  assert.match(
    src,
    /isControlledClientDownloadUrl\(videoUrl\)/,
    `${name} fallthrough must gate on isControlledClientDownloadUrl(videoUrl)`
  );
  // Fallthrough only after controlled check wraps downloadVideoFile(videoUrl).
  assert.match(
    src,
    /if \(videoUrl && isControlledClientDownloadUrl\(videoUrl\)\)[\s\S]{0,400}downloadVideoFile\(videoUrl/,
    `${name} must only downloadVideoFile(videoUrl) inside controlled allowlist`
  );
  // Gate deny / unknown must return before raw CDN — controlled-only fallthrough.
  assert.match(
    src,
    /!\(videoUrl && isControlledClientDownloadUrl\(videoUrl\)\)[\s\S]{0,40}return;/,
    `${name} must return when gate miss and URL is not controlled`
  );
  assert.match(
    src,
    /downloads_api_blob/,
    `${name} must still blob-download via gate on HEAD allow`
  );
}

// Create must not keep the old broad fallthrough comment path.
assert.doesNotMatch(
  createStudio,
  /Fall through only when a safe demo\/paid URL exists/
);
assert.doesNotMatch(
  createStudio,
  /network — try direct below when safe/
);

// CTA visibility: requestId OR controlled URL (not raw https alone).
assert.match(
  createStudio,
  /activeVersion\?\.requestId[\s\S]{0,80}isControlledClientDownloadUrl\(videoUrl\)/
);
assert.match(
  landing,
  /requestId[\s\S]{0,80}isControlledClientDownloadUrl\(videoUrl\)/
);

// ─── Source: Batch — gate-only when requestId; controlled without ───────────

assert.match(batch, /isControlledClientDownloadUrl/);
assert.match(
  batch,
  /downloadVideoFile\(\s*gateUrl/,
  "Batch requestId path must use gate URL only"
);
// After requestId block, only controlled URLs — never isSafeDeliverableUrl.
assert.match(
  batch,
  /No requestId: only controlled|isControlledClientDownloadUrl\(j\.videoUrl\)/
);
// Ensure the no-requestId branch still exists and uses controlled allowlist.
assert.match(
  batch,
  /if \(j\.videoUrl && isControlledClientDownloadUrl\(j\.videoUrl\)\)[\s\S]{0,200}downloadVideoFile\(j\.videoUrl/
);
assert.match(
  batch,
  /j\.requestId[\s\S]{0,120}isControlledClientDownloadUrl\(j\.videoUrl\)/
);

// ─── Source: Seller Pack export prefers gate; direct = controlled only ──────

assert.match(packExport, /isControlledClientDownloadUrl/);
assert.match(
  packExport,
  /sellerPackDownloadHref[\s\S]{0,500}isControlledClientDownloadUrl/
);
assert.doesNotMatch(
  packExport,
  /sellerPackDownloadHref[\s\S]{0,500}isSafeDeliverableUrl\(item\.videoUrl\)/
);

// ─── Pure: controlled allowlist semantics ───────────────────────────────────

function isSafeDeliverableUrl(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  if (!t || t.length > 2000) return false;
  if (t.startsWith("/") && !t.startsWith("//")) {
    return !t.includes("\\") && !/^\/\//.test(t);
  }
  try {
    const u = new URL(t);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (!u.hostname || u.username || u.password) return false;
    return true;
  } catch {
    return false;
  }
}

function isSessionGatedDownloadUrl(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  return t.startsWith("/api/downloads/") || t.includes("/api/downloads/");
}

function isControlledClientDownloadUrl(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  if (!isSafeDeliverableUrl(t)) return false;
  if (t.startsWith("/demos/") && !t.includes("..") && !t.includes("\\")) {
    return true;
  }
  if (isSessionGatedDownloadUrl(t)) return true;
  return false;
}

function isDurableDownloadRequestId(id) {
  if (!id || typeof id !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id.trim()
  );
}

assert.equal(isControlledClientDownloadUrl("/demos/orbit-dance.mp4"), true);
assert.equal(
  isControlledClientDownloadUrl("/api/downloads/abc-123"),
  true
);
assert.equal(
  isControlledClientDownloadUrl("https://fal.media/files/private.mp4"),
  false,
  "raw provider CDN must not pass client fallthrough allowlist"
);
assert.equal(
  isControlledClientDownloadUrl("https://storage.googleapis.com/x/signed"),
  false
);
assert.equal(isControlledClientDownloadUrl("javascript:alert(1)"), false);
assert.equal(isControlledClientDownloadUrl("//evil.com/x"), false);
assert.equal(isControlledClientDownloadUrl("/demos/../etc/passwd"), false);
assert.equal(isControlledClientDownloadUrl("/static/x.mp4"), false);

assert.equal(
  isDurableDownloadRequestId("550e8400-e29b-41d4-a716-446655440000"),
  true
);
assert.equal(isDurableDownloadRequestId("job_abc123"), false);
assert.equal(isDurableDownloadRequestId("req_1"), false);
assert.equal(isDurableDownloadRequestId(""), false);

// Fallthrough policy: durable UUID + not_found + raw CDN → no download.
function mayClientFallthrough(opts) {
  const { requestId, gateKind, videoUrl } = opts;
  if (requestId) {
    if (gateKind === "allow") return { via: "gate" };
    if (gateKind === "block") return { via: "none" };
    // not_found | unknown | network
    if (isControlledClientDownloadUrl(videoUrl)) return { via: "controlled" };
    return { via: "none" };
  }
  if (isControlledClientDownloadUrl(videoUrl)) return { via: "controlled" };
  return { via: "none" };
}

assert.equal(
  mayClientFallthrough({
    requestId: "550e8400-e29b-41d4-a716-446655440000",
    gateKind: "not_found",
    videoUrl: "https://fal.media/files/x.mp4",
  }).via,
  "none",
  "durable deny must not open raw CDN"
);
assert.equal(
  mayClientFallthrough({
    requestId: "550e8400-e29b-41d4-a716-446655440000",
    gateKind: "not_found",
    videoUrl: "/demos/orbit-dance.mp4",
  }).via,
  "controlled"
);
assert.equal(
  mayClientFallthrough({
    requestId: "550e8400-e29b-41d4-a716-446655440000",
    gateKind: "allow",
    videoUrl: "https://fal.media/files/x.mp4",
  }).via,
  "gate"
);
assert.equal(
  mayClientFallthrough({
    requestId: null,
    gateKind: null,
    videoUrl: "https://fal.media/files/x.mp4",
  }).via,
  "none"
);
assert.equal(
  mayClientFallthrough({
    requestId: null,
    gateKind: null,
    videoUrl: "/demos/moon-glow.mp4",
  }).via,
  "controlled"
);

// ─── Package script registered ──────────────────────────────────────────────

assert.match(pkg, /"create-download-gate-residual-smoke"/);

console.log("create-download-gate-residual-smoke: ok");
