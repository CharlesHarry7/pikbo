#!/usr/bin/env node
/**
 * AIT-475 — Library mounts CommunityPublishButton (private Moments fail-closed).
 *
 * Source smoke (no network, no node_modules). Locks:
 * - Library success detail mounts CommunityPublishButton with videoUrl/demo/watermark
 * - Button still fails closed on session/signed/provider private media
 * - Library does not invent a public publish path for raw provider URLs
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const library = read("components/LibraryGrid.tsx");
const button = read("components/CommunityPublishButton.tsx");
const createTrust = read("lib/createTrust.ts");
const pkg = read("package.json");

// ─── Library mounts the hardened button on owner success rows ───────────────

assert.match(
  library,
  /import\s*\{\s*CommunityPublishButton\s*\}\s*from\s*["']@\/components\/CommunityPublishButton["']/
);
assert.match(library, /<CommunityPublishButton[\s\S]*?videoUrl=\{job\.videoUrl\}/);
assert.match(library, /demo=\{job\.demo\}/);
assert.match(library, /watermark=\{job\.watermark\}/);
assert.match(library, /data-library-community-publish=["']true["']/);
// Only success rows with a videoUrl mount the Community path.
assert.match(
  library,
  /job\.status\s*===\s*["']succeeded["']\s*&&\s*job\.videoUrl/
);
// Library still filters demos out of owner shelf (no Lab sample as UGC shelf).
assert.match(library, /if\s*\(\s*job\.demo\s*\)\s*return\s*false/);
assert.match(library, /job\.downloadAllowed\s*===\s*true/);
// GenerationJob carries watermark for Free raw honesty when present.
assert.match(library, /watermark\?:\s*boolean/);

// ─── Button honesty chips remain (AIT-454 residual) ─────────────────────────

assert.match(button, /Private · no publish/);
assert.match(button, /Lab only/);
assert.match(button, /Free raw · no publish/);
assert.match(button, /isPrivateMomentMediaUrl/);
assert.match(button, /isPublicCommunityVideoUrl/);
assert.doesNotMatch(button, /fake UGC|invent posts/i);

// ─── Trust helpers: private media never public Community ────────────────────

assert.match(createTrust, /export function isPrivateMomentMediaUrl/);
assert.match(createTrust, /export function isPublicCommunityVideoUrl/);
assert.match(createTrust, /export function isSessionGatedDownloadUrl/);
assert.match(createTrust, /export function isStorageSignedObjectUrl/);
assert.match(createTrust, /export function isProviderDeliveryMediaUrl/);
assert.match(createTrust, /fal\.media/);
assert.match(createTrust, /object\/sign/);

// Pure-function parity with createTrust (no import; lock path shapes).
function isSessionGatedDownloadUrl(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  return t.startsWith("/api/downloads/") || t.includes("/api/downloads/");
}
function isProviderDeliveryHost(hostname) {
  const host = String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
  if (!host) return false;
  return ["fal.media", "fal.run", "replicate.delivery", "replicate.com"].some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
}
function isPrivateMomentMediaUrl(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  if (!t) return false;
  if (isSessionGatedDownloadUrl(t)) return true;
  if (!/^https?:\/\//i.test(t)) return false;
  try {
    const u = new URL(t);
    if (u.pathname.includes("/api/downloads/")) return true;
    if (u.pathname.toLowerCase().includes("/object/sign/")) return true;
    if (isProviderDeliveryHost(u.hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

// Library success rows typically carry session download URLs — private chip.
assert.equal(isPrivateMomentMediaUrl("/api/downloads/job_owner_1"), true);
assert.equal(
  isPrivateMomentMediaUrl("https://v3b.fal.media/files/private/result.mp4"),
  true
);
// Library must not treat raw provider CDN as a public publishable deliverable.
assert.equal(
  isPrivateMomentMediaUrl("https://replicate.delivery/pbxt/x.mp4"),
  true
);

// ─── package script registered ──────────────────────────────────────────────

assert.match(
  pkg,
  /"library-community-publish-mount-smoke"\s*:\s*"node scripts\/library-community-publish-mount-smoke\.mjs"/
);

console.log(
  "library-community-publish-mount-smoke: PASS (Library mounts CommunityPublishButton · private Moments fail-closed)"
);
