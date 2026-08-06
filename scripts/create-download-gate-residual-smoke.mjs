#!/usr/bin/env node
/**
 * AIT-294 + AIT-308: client download / open residual after durable gate.
 *
 * Source + pure-function smoke (no network, no provider). Locks:
 * - Create / Landing / Batch: no raw CDN fallthrough after gate deny
 * - downloadVideoFile: controlled allowlist only (no raw https window.open)
 * - publicShareableVideoUrl: Lab demos only (no private signed / provider CDN)
 * - historyFieldsFromSuccess: non-demo raw → gate path when durable id known
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
const library = read("components/LibraryGrid.tsx");
const createTrust = read("lib/createTrust.ts");
const packExport = read("lib/sellerPackExport.ts");
const historyLib = read("lib/history.ts");
const genClient = read("lib/generateClient.ts");
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

// ─── AIT-308: downloadVideoFile residual — controlled open only ─────────────

assert.match(historyLib, /isControlledClientDownloadUrl/);
// Entry + catch path both require controlled allowlist (not bare isSafe only).
assert.match(
  historyLib,
  /if \(!isControlledClientDownloadUrl\(url\)\) return "unsafe"/
);
// Must not open raw https on the non-gate fallback without controlled check.
// After controlled entry, non-gate open is Lab demos only.
assert.match(
  historyLib,
  /isControlledClientDownloadUrl\(url\)[\s\S]{0,800}window\.open\(url/
);
// Ensure entry no longer trusts broad isSafeDeliverableUrl alone.
assert.doesNotMatch(
  historyLib,
  /export async function downloadVideoFile[\s\S]{0,200}if \(!isSafeDeliverableUrl\(url\)\) return "unsafe"/
);

// ─── AIT-308: publicShareableVideoUrl — demos only, never absolute https ────

assert.match(
  createTrust,
  /export function publicShareableVideoUrl[\s\S]{0,500}\/demos\//
);
assert.match(
  createTrust,
  /publicShareableVideoUrl[\s\S]{0,800}startsWith\("\/demos\/"\)/
);
// Pure mirror of production publicShareableVideoUrl.
function publicShareableVideoUrl(url, origin) {
  if (!url || typeof url !== "string") return null;
  const t = url.trim();
  if (!isSafeDeliverableUrl(t)) return null;
  if (isSessionGatedDownloadUrl(t)) return null;
  if (!(t.startsWith("/demos/") && !t.includes("..") && !t.includes("\\"))) {
    return null;
  }
  const o = (origin || "").replace(/\/$/, "");
  if (!o || !/^https?:\/\//i.test(o)) return null;
  return `${o}${t}`;
}
assert.equal(
  publicShareableVideoUrl("/demos/orbit-dance.mp4", "https://pikbo.ai"),
  "https://pikbo.ai/demos/orbit-dance.mp4"
);
assert.equal(
  publicShareableVideoUrl("/api/downloads/550e8400-e29b-41d4-a716-446655440000", "https://pikbo.ai"),
  null,
  "session gate is never a public share link"
);
assert.equal(
  publicShareableVideoUrl("https://fal.media/files/private.mp4", "https://pikbo.ai"),
  null,
  "raw provider CDN must not be shareable"
);
assert.equal(
  publicShareableVideoUrl(
    "https://storage.googleapis.com/bucket/signed?token=x",
    "https://pikbo.ai"
  ),
  null,
  "private signed storage must not be shareable"
);
assert.equal(publicShareableVideoUrl("/demos/x.mp4"), null, "origin required");

// Create share handoff: durable private honesty toast path.
assert.match(
  createStudio,
  /Private Moment — use Download \(not a public share link\)/
);
assert.match(createStudio, /isDurableDownloadRequestId\(activeVersion\?\.requestId\)/);

// ─── AIT-308: history restore — non-demo raw → gate when jobKey present ─────

assert.match(genClient, /export function historyFieldsFromSuccess/);
// Rewrite must not require watermark (paid private residual).
assert.match(
  genClient,
  /!Boolean\(data\.demo\)[\s\S]{0,200}jobKey[\s\S]{0,300}\/api\/downloads\//
);
// Must not still gate rewrite on watermark alone.
assert.doesNotMatch(
  genClient,
  /Boolean\(data\.watermark\)\s*&&\s*\n?\s*!Boolean\(data\.demo\)/
);

// ─── Library: download is gate-only (no raw videoUrl fallthrough) ───────────

assert.match(library, /downloadVideoFile\(\s*gateUrl/);
assert.doesNotMatch(
  library,
  /downloadVideoFile\(\s*(job\.videoUrl|videoUrl)/
);

// ─── Package script registered ──────────────────────────────────────────────

assert.match(pkg, /"create-download-gate-residual-smoke"/);

console.log("create-download-gate-residual-smoke: ok");
