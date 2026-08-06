/**
 * AIT-454 — Community publish refuse private/signed Moments (fail closed).
 *
 * Source + pure-function smoke (no network, no node_modules). Locks:
 * - isPublicCommunityVideoUrl allowlist: Lab /demos/* only
 * - session /api/downloads, signed storage, provider CDN fail closed
 * - CommunityPublishButton honest private chip + server communityPosts parity
 * - list filter never surfaces private media as UGC
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// ─── Pure parity with lib/createTrust.ts (keep in lockstep) ─────────────────

function isSessionGatedDownloadUrl(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  return t.startsWith("/api/downloads/") || t.includes("/api/downloads/");
}

function isStorageSignedObjectUrl(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  if (!t || t.length > 2000) return false;
  if (!/^https?:\/\//i.test(t)) return false;
  try {
    const u = new URL(t);
    const path = u.pathname.toLowerCase();
    if (path.includes("/storage/v1/object/sign/")) return true;
    if (path.includes("/object/sign/")) return true;
    if (
      u.searchParams.has("token") &&
      (path.includes("/storage/") || path.includes("/object/"))
    ) {
      return true;
    }
    if (
      u.searchParams.has("X-Amz-Signature") ||
      u.searchParams.has("X-Amz-Credential") ||
      (u.searchParams.has("Signature") && u.searchParams.has("Expires"))
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

const PROVIDER_DELIVERY_HOST_SUFFIXES = [
  "fal.media",
  "fal.run",
  "replicate.delivery",
  "replicate.com",
];

function isProviderDeliveryHost(hostname) {
  const host = String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
  if (!host) return false;
  return PROVIDER_DELIVERY_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
}

function isProviderDeliveryMediaUrl(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  if (!t || t.length > 2000) return false;
  if (!/^https?:\/\//i.test(t)) return false;
  try {
    const u = new URL(t);
    if (!u.hostname) return false;
    return isProviderDeliveryHost(u.hostname);
  } catch {
    return false;
  }
}

function isPathSafeLabDemoUrl(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  if (!t || t.length > 2000) return false;
  if (!t.startsWith("/demos/") || t.startsWith("//")) return false;
  if (t.includes("..") || t.includes("\\") || t.includes("//")) return false;
  const path = t.split(/[?#]/)[0] || "";
  return /^\/demos\/[A-Za-z0-9._/-]+$/.test(path);
}

function isPrivateMomentMediaUrl(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  if (!t) return false;
  if (isSessionGatedDownloadUrl(t)) return true;
  if (isStorageSignedObjectUrl(t)) return true;
  if (isProviderDeliveryMediaUrl(t)) return true;
  return false;
}

function isPublicCommunityVideoUrl(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  if (!t || t.length > 2000) return false;
  if (isPrivateMomentMediaUrl(t)) return false;
  if (isPathSafeLabDemoUrl(t)) return true;
  if (!/^https?:\/\//i.test(t)) return false;
  try {
    const u = new URL(t);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (!u.hostname || u.username || u.password) return false;
    if (isProviderDeliveryHost(u.hostname)) return false;
    if (isStorageSignedObjectUrl(t)) return false;
    if (u.pathname.includes("/api/downloads/")) return false;
    const path = u.pathname;
    if (path.includes("..") || path.includes("\\")) return false;
    return /^\/demos\/[A-Za-z0-9._/-]+$/.test(path);
  } catch {
    return false;
  }
}

// ─── Lab demos allowed ──────────────────────────────────────────────────────
assert.equal(isPathSafeLabDemoUrl("/demos/orbit-dance.mp4"), true);
assert.equal(isPublicCommunityVideoUrl("/demos/orbit-dance.mp4"), true);
assert.equal(
  isPublicCommunityVideoUrl("https://pikbo.ai/demos/orbit-dance.mp4"),
  true
);
assert.equal(
  isPublicCommunityVideoUrl("https://www.pikbo.ai/demos/moon-glow.mp4"),
  true
);

// ─── Session downloads fail closed ──────────────────────────────────────────
assert.equal(isSessionGatedDownloadUrl("/api/downloads/job_1"), true);
assert.equal(isPrivateMomentMediaUrl("/api/downloads/job_1"), true);
assert.equal(isPublicCommunityVideoUrl("/api/downloads/job_1"), false);
assert.equal(
  isPublicCommunityVideoUrl("https://pikbo.ai/api/downloads/uuid-here"),
  false
);

// ─── Provider CDN fail closed ───────────────────────────────────────────────
const falUrl = "https://v3b.fal.media/files/private/result.mp4";
assert.equal(isProviderDeliveryMediaUrl(falUrl), true);
assert.equal(isPrivateMomentMediaUrl(falUrl), true);
assert.equal(isPublicCommunityVideoUrl(falUrl), false);
assert.equal(isPublicCommunityVideoUrl("https://fal.run/files/x.mp4"), false);
assert.equal(
  isPublicCommunityVideoUrl("https://replicate.delivery/pbxt/x.mp4"),
  false
);

// ─── Signed storage fail closed ─────────────────────────────────────────────
const signedSupabase =
  "https://abcdefgh.supabase.co/storage/v1/object/sign/pikbo-private-results/u/j.mp4?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
assert.equal(isStorageSignedObjectUrl(signedSupabase), true);
assert.equal(isPrivateMomentMediaUrl(signedSupabase), true);
assert.equal(isPublicCommunityVideoUrl(signedSupabase), false);

const signedS3 =
  "https://bucket.s3.amazonaws.com/private/x.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIA&X-Amz-Signature=deadbeef";
assert.equal(isStorageSignedObjectUrl(signedS3), true);
assert.equal(isPublicCommunityVideoUrl(signedS3), false);

// ─── Arbitrary absolute https is not a public Community deliverable ─────────
assert.equal(isPublicCommunityVideoUrl("https://cdn.example/v.mp4"), false);
assert.equal(isPublicCommunityVideoUrl("javascript:alert(1)"), false);
assert.equal(isPublicCommunityVideoUrl("/api/other/x"), false);
assert.equal(isPathSafeLabDemoUrl("/demos/../etc/passwd"), false);
assert.equal(isPublicCommunityVideoUrl("/demos/../secret.mp4"), false);

// ─── Source locks: createTrust exports + denylist strings ───────────────────
const createTrust = fs.readFileSync(join(root, "lib/createTrust.ts"), "utf8");
assert.match(createTrust, /export function isPublicCommunityVideoUrl/);
assert.match(createTrust, /export function isStorageSignedObjectUrl/);
assert.match(createTrust, /export function isProviderDeliveryMediaUrl/);
assert.match(createTrust, /export function isPrivateMomentMediaUrl/);
assert.match(createTrust, /export function isPathSafeLabDemoUrl/);
assert.match(createTrust, /fal\.media/);
assert.match(createTrust, /object\/sign/);
assert.match(createTrust, /X-Amz-Signature/);
// Soft-launch allowlist comment locked in helper.
assert.match(
  createTrust,
  /Lab `\/demos\/\*`|only Lab \/demos|path-safe Lab demo/i
);

// ─── Client: honest private chip ────────────────────────────────────────────
const button = fs.readFileSync(
  join(root, "components/CommunityPublishButton.tsx"),
  "utf8"
);
assert.match(button, /isPrivateMomentMediaUrl/);
assert.match(button, /isPublicCommunityVideoUrl/);
assert.match(button, /Private · no publish/);
assert.match(button, /use Download or open a Lab demo/i);
assert.match(button, /signed storage|provider CDN|session download/i);
assert.doesNotMatch(button, /fake UGC|invent posts/i);

// ─── Server: publish + list fail closed ─────────────────────────────────────
const posts = fs.readFileSync(join(root, "lib/communityPosts.ts"), "utf8");
assert.match(posts, /isPublicCommunityVideoUrl/);
assert.match(
  posts,
  /session download, signed storage, or provider CDN|Lab \/demos/
);
assert.match(
  posts,
  /\.filter\(\(p\) => isPublicCommunityVideoUrl\(p\.videoUrl\)\)/
);

const route = fs.readFileSync(
  join(root, "app/api/community/posts/route.ts"),
  "utf8"
);
assert.match(route, /publishCommunityPost/);
assert.match(route, /UNSAFE_URL/);

console.log(
  "community-publish-private-refuse-smoke: PASS (Lab demos only · session/signed/provider fail closed)"
);
