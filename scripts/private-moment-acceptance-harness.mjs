#!/usr/bin/env node

/**
 * Operator-safe one-SKU private Moment acceptance harness.
 *
 * Default mode (dry-run):
 *   - Validates the fixed toy-moment-v1 contract and operator gate shape.
 *   - Makes zero network / upload / provider / Stripe calls.
 *   - Emits only sanitized evidence.
 *
 * Real mode (operator-only):
 *   - Requires explicit spend confirmation, Preview gateway cookie,
 *     Supabase owner access token (Bearer), attempt id, and owned-image path.
 *   - Owner Pikbo API calls send Authorization: Bearer <access token>
 *     (matches getAuthUserFromRequest) plus the Preview gateway cookie.
 *   - Pikbo-anonymous download HEAD keeps the Preview gateway cookie (so Vercel
 *     Deployment Protection admits the request) but strips Authorization so
 *     the app returns 401 + X-Pikbo-Download-Code: AUTH_REQUIRED.
 *   - Private Storage signed PUT strips both cookie and Authorization.
 *   - Never logs cookies, tokens, attempt ids, idempotency keys, signed URLs,
 *     object keys, emails, or provider identifiers.
 *
 * Usage:
 *   node scripts/private-moment-acceptance-harness.mjs
 *   PIKBO_ACCEPTANCE_MODE=real \
 *     PIKBO_CONFIRM_PROVIDER_SPEND=I_UNDERSTAND_ONE_TOY_MOMENT_V1_SPEND \
 *     PIKBO_ACCEPTANCE_BASE_URL=https://… \
 *     PIKBO_ACCEPTANCE_ACCESS_TOKEN='…' \
 *     PIKBO_ACCEPTANCE_SESSION_COOKIE='…' \
 *     PIKBO_ACCEPTANCE_ATTEMPT_ID='…' \
 *     PIKBO_ACCEPTANCE_IMAGE_PATH=/path/to/owned-toy.jpg \
 *     node scripts/private-moment-acceptance-harness.mjs
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Explicit operator phrase required before any real generate. */
export const SPEND_CONFIRMATION_PHRASE =
  "I_UNDERSTAND_ONE_TOY_MOMENT_V1_SPEND";

/**
 * Only the documented protected Preview may receive the operator session cookie.
 * Matches docs/STATUS.md and docs/evidence/PRIVATE_VALIDATION_ACTIVATION_*.
 */
export const PROTECTED_PREVIEW_ORIGIN =
  "https://pikbo-git-codex-private-validation-pi-kbo.vercel.app";

/**
 * Exact non-production Supabase project used for private toy inputs.
 * Matches nonprod-seller-pack-harness and PRIVATE_INPUT_* evidence.
 */
export const PRIVATE_INPUT_STORAGE_ORIGIN =
  "https://lpfvfybkggiugosugfcw.supabase.co";
export const PRIVATE_INPUT_BUCKET = "pikbo-toy-inputs";
/** Strict pathname prefix for Supabase createSignedUploadUrl contract. */
export const PRIVATE_INPUT_SIGNED_UPLOAD_PATH_PREFIX =
  "/storage/v1/object/upload/sign/pikbo-toy-inputs/";

/** Fixed Founding Studio Moment contract — server re-verifies every field. */
export const FIXED_MOMENT_CONTRACT = Object.freeze({
  productContract: "toy-moment-v1",
  effect: "street-power-up",
  duration: 5,
  aspectRatio: "9:16",
  model: "seedance-fast",
  resolution: "720p",
  ownsRights: true,
  allowProviderSpend: true,
});

export const MAX_GENERATE_CALLS = 1;
export const MAX_UPLOAD_PREPARE_CALLS = 1;
export const MAX_UPLOAD_PUT_CALLS = 1;
export const MAX_UPLOAD_COMPLETE_CALLS = 1;
/** Before + after Generate durable-wallet snapshots via GET /api/me. */
export const MAX_ME_SNAPSHOT_CALLS = 2;
/** Fixed Founding Studio Moment settlement (matches CREDITS_PER_VIDEO). */
export const FIXED_MOMENT_CREDITS = 10;

/**
 * Version tag for the operator acceptance idempotency key scheme.
 * Changing this intentionally invalidates prior attempt keys (new spend risk).
 */
export const ACCEPTANCE_IDEMPOTENCY_KEY_VERSION = "v1";
/** Server normalizeIdempotencyKey truncates at 128 chars. */
export const MAX_IDEMPOTENCY_KEY_LEN = 128;
export const MIN_OPERATOR_ATTEMPT_ID_LEN = 8;
export const MAX_OPERATOR_ATTEMPT_ID_LEN = 80;

/** Keys that must never appear with real values in operator evidence. */
const SENSITIVE_KEY_RE =
  /^(?:cookie|cookies|authorization|auth|email|e-?mail|signedUrl|signed_url|uploadUrl|upload_url|objectKey|object_key|providerUrl|provider_url|providerModel|provider_model|providerId|provider_id|falKey|fal_key|token|accessToken|refreshToken|secret|password|sessionCookie|session_cookie|idempotencyKey|idempotency_key|attemptId|attempt_id|operatorAttemptId|accountId|account_id|userId|user_id|modelId)$/i;
const SENSITIVE_VALUE_RE =
  /(?:^|[\s"'=])(?:sb-[a-z0-9-]*-auth-token|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.|data:image\/|https?:\/\/[^\s"'<>]+(?:supabase|fal\.ai|storage)[^\s"'<>]*|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|sk_[a-zA-Z0-9]{16,}|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/(?:inputs|outputs)\/)/i;
const PROVIDER_URL_RE =
  /(?:fal\.ai|fal\.run|queue\.fal|storage\.googleapis\.com|supabase\.co\/storage)/i;

/**
 * Resolve acceptance mode without throwing. Invalid values return
 * `{ mode: "invalid", raw }` so CLI exception paths never re-parse env.
 */
export function parseMode(env = process.env) {
  const raw = String(env.PIKBO_ACCEPTANCE_MODE || "dry-run")
    .trim()
    .toLowerCase();
  if (raw === "" || raw === "dry-run" || raw === "default" || raw === "plan") {
    return { mode: "dry-run", raw: raw || "dry-run" };
  }
  if (raw === "real") return { mode: "real", raw };
  return { mode: "invalid", raw };
}

export function resolveMode(env = process.env) {
  const parsed = parseMode(env);
  if (parsed.mode === "invalid") {
    throw new Error(
      `PIKBO_ACCEPTANCE_MODE must be dry-run (default) or real; got ${parsed.raw}`
    );
  }
  return parsed.mode;
}

/** Exact protected Preview origin only — rejects production and hostile hosts. */
export function assertAllowedAcceptanceOrigin(rawUrl) {
  const url = new URL(rawUrl);
  assert.equal(url.protocol, "https:", "Real mode requires https base URL");
  assert.equal(url.username, "", "Base URL credentials are forbidden");
  assert.equal(url.password, "", "Base URL credentials are forbidden");
  assert.equal(
    url.origin,
    PROTECTED_PREVIEW_ORIGIN,
    `Real mode allows only the protected Preview origin ${PROTECTED_PREVIEW_ORIGIN}`
  );
  assert.ok(
    url.hostname !== "pikbo.ai" && url.hostname !== "www.pikbo.ai",
    "Production host is forbidden for real acceptance"
  );
  return url;
}

/**
 * Pending owned-photo PUT target must be the exact non-prod Pikbo private-input
 * Supabase signed-upload URL. Validates before any image bytes are sent.
 * Throws a sanitized Error (never embeds the raw URL/token).
 *
 * Contract:
 * - origin === https://lpfvfybkggiugosugfcw.supabase.co
 * - https, no credentials, default port only
 * - pathname starts with /storage/v1/object/upload/sign/pikbo-toy-inputs/
 * - remaining object-key segment present (no path traversal)
 */
export function assertTrustedPrivateInputSignedUploadUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    throw new Error("Private-input upload URL is missing");
  }
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Private-input upload URL is not a valid absolute URL");
  }
  if (url.protocol !== "https:") {
    throw new Error("Private-input upload URL must use https");
  }
  if (url.username || url.password) {
    throw new Error("Private-input upload URL must not embed credentials");
  }
  // Default HTTPS port only (empty or explicit 443).
  if (url.port && url.port !== "443") {
    throw new Error("Private-input upload URL must not use a non-default port");
  }
  if (url.origin !== PRIVATE_INPUT_STORAGE_ORIGIN) {
    throw new Error(
      "Private-input upload URL origin is not the trusted Pikbo storage project"
    );
  }
  const pathname = url.pathname || "";
  if (!pathname.startsWith(PRIVATE_INPUT_SIGNED_UPLOAD_PATH_PREFIX)) {
    throw new Error(
      "Private-input upload URL path is not the signed upload/sign contract for pikbo-toy-inputs"
    );
  }
  const segments = pathname.split("/").filter(Boolean);
  // storage / v1 / object / upload / sign / pikbo-toy-inputs / <objectKey...>
  if (segments.length < 7) {
    throw new Error("Private-input upload URL is missing the object key segment");
  }
  if (
    segments[0] !== "storage" ||
    segments[1] !== "v1" ||
    segments[2] !== "object" ||
    segments[3] !== "upload" ||
    segments[4] !== "sign" ||
    segments[5] !== PRIVATE_INPUT_BUCKET
  ) {
    throw new Error("Private-input upload URL path segments do not match the signed-upload contract");
  }
  const objectKeyParts = segments.slice(6);
  if (objectKeyParts.length === 0 || objectKeyParts.some((p) => p === ".." || p === ".")) {
    throw new Error("Private-input upload URL object key is invalid");
  }
  // Reject lookalike buckets smuggled via encoding tricks in remaining path.
  if (pathname.includes("..") || pathname.includes("//")) {
    throw new Error("Private-input upload URL path is malformed");
  }
  return {
    origin: PRIVATE_INPUT_STORAGE_ORIGIN,
    bucket: PRIVATE_INPUT_BUCKET,
    kind: "signed-upload",
  };
}

/** Non-throwing predicate shared by fetch guards and tests. */
export function isTrustedPrivateInputSignedUploadUrl(rawUrl) {
  try {
    assertTrustedPrivateInputSignedUploadUrl(rawUrl);
    return true;
  } catch {
    return false;
  }
}

/**
 * Immediate live generate delivery is a short-lived absolute HTTPS signed URL
 * for Pikbo private Storage (`pikbo-private-results`), matching
 * app/api/generate/route.ts privateDeliveryUrl / GenerateSuccess.videoUrl.
 * Controlled `/api/downloads/{jobId}` is Library-only, not the generate body.
 * Never log or return the raw URL into evidence.
 */
export function isPrivateStorageSignedDeliveryUrl(videoUrl) {
  if (typeof videoUrl !== "string" || !videoUrl.trim()) return false;
  const t = videoUrl.trim();
  // Relative app paths are not the live generate contract.
  if (t.startsWith("/") || t.startsWith("//")) return false;
  if (t.startsWith("data:")) return false;
  try {
    const u = new URL(t);
    if (u.protocol !== "https:") return false;
    if (!u.hostname || u.username || u.password) return false;
    // Raw provider hosts never cross the generate boundary as delivery.
    if (
      /(?:^|\.)fal\.ai$/i.test(u.hostname) ||
      /(?:^|\.)fal\.run$/i.test(u.hostname) ||
      /^queue\.fal\./i.test(u.hostname) ||
      PROVIDER_URL_RE.test(u.hostname)
    ) {
      return false;
    }
    // Supabase signed object URL for the private results bucket.
    const path = u.pathname || "";
    const isSupabase = /\.supabase\.co$/i.test(u.hostname);
    const isSignedObject =
      path.includes("/storage/v1/object/sign/") ||
      path.includes("/storage/v1/object/authenticated/");
    const isPrivateResultsBucket = path.includes("pikbo-private-results");
    return isSupabase && isSignedObject && isPrivateResultsBucket;
  } catch {
    return false;
  }
}

/**
 * Live generate success must be non-demo, private, processed fixed-contract output
 * with a short-lived Pikbo private Storage signed HTTPS delivery URL.
 * Cached/demo responses must never become PASS_ONE_SKU_REAL.
 * Does not echo the raw videoUrl (sanitizer / evidence must never see it).
 */
export function assertLiveGenerateSuccess(generated, httpOk) {
  if (!httpOk) {
    return {
      ok: false,
      code:
        typeof generated?.code === "string" ? generated.code : "GENERATE_FAILED",
      reason: "http_not_ok",
    };
  }
  if (!generated || typeof generated !== "object") {
    return { ok: false, code: "GENERATE_EMPTY", reason: "empty_body" };
  }
  if (generated.demo === true) {
    return { ok: false, code: "DEMO_RESULT_REJECTED", reason: "demo_true" };
  }
  if (generated.processedUpload !== true) {
    return {
      ok: false,
      code: "UPLOAD_NOT_PROCESSED",
      reason: "processedUpload_not_true",
    };
  }
  if (generated.privateResult !== true) {
    return {
      ok: false,
      code: "PRIVATE_RESULT_REQUIRED",
      reason: "privateResult_not_true",
    };
  }
  if (generated.uploadIgnored === true) {
    return {
      ok: false,
      code: "UPLOAD_IGNORED",
      reason: "uploadIgnored_true",
    };
  }
  const videoUrl =
    typeof generated.videoUrl === "string" ? generated.videoUrl : "";
  // Reject demo catalog and Library-relative paths on the generate response.
  if (videoUrl.startsWith("/demos/") || /\/demos\//.test(videoUrl)) {
    return {
      ok: false,
      code: "DEMO_CATALOG_URL",
      reason: "demo_catalog_video",
    };
  }
  if (videoUrl.startsWith("/api/downloads/")) {
    return {
      ok: false,
      code: "LIBRARY_DOWNLOAD_PATH_NOT_GENERATE_CONTRACT",
      reason: "videoUrl_is_library_path_not_signed_storage",
    };
  }
  if (!isPrivateStorageSignedDeliveryUrl(videoUrl)) {
    // Classify common fail-closed cases without echoing the URL.
    let reason = "videoUrl_not_private_storage_signed";
    let code = "UNSAFE_OR_NON_PRIVATE_VIDEO_URL";
    if (!videoUrl) {
      reason = "videoUrl_missing";
      code = "VIDEO_URL_MISSING";
    } else if (/^https?:\/\//i.test(videoUrl)) {
      try {
        const u = new URL(videoUrl);
        if (u.protocol !== "https:") {
          reason = "videoUrl_not_https";
          code = "VIDEO_URL_NOT_HTTPS";
        } else if (
          /fal\.ai|fal\.run|queue\.fal/i.test(u.hostname) ||
          PROVIDER_URL_RE.test(u.hostname)
        ) {
          reason = "videoUrl_provider_host";
          code = "PROVIDER_URL_REJECTED";
        }
      } catch {
        reason = "videoUrl_unparseable";
      }
    } else if (videoUrl.startsWith("/")) {
      reason = "videoUrl_relative_not_signed";
      code = "RELATIVE_VIDEO_URL_REJECTED";
    }
    return { ok: false, code, reason };
  }
  const jobId =
    (typeof generated.jobId === "string" && generated.jobId) ||
    (typeof generated.requestId === "string" && generated.requestId) ||
    null;
  if (!jobId || jobId.length < 8) {
    return { ok: false, code: "JOB_ID_MISSING", reason: "job_id_missing" };
  }
  // Intentionally omit videoUrl — callers must not log or embed the signed URL.
  return { ok: true, jobId, hasPrivateSignedDeliveryUrl: true };
}

/**
 * Library row must be a durable owner result: succeeded, owned, downloadable,
 * non-demo, controlled download path.
 */
export function assertDurableOwnedLibraryRow(listed, jobId) {
  if (!listed || typeof listed !== "object") {
    return { ok: false, reason: "not_listed" };
  }
  if (listed.status !== "succeeded") {
    return { ok: false, reason: "status_not_succeeded" };
  }
  if (listed.owned !== true) {
    return { ok: false, reason: "owned_not_true" };
  }
  if (listed.downloadAllowed !== true) {
    return { ok: false, reason: "downloadAllowed_not_true" };
  }
  if (listed.demo === true) {
    return { ok: false, reason: "demo_true" };
  }
  const videoUrl = typeof listed.videoUrl === "string" ? listed.videoUrl : "";
  if (!videoUrl.startsWith("/api/downloads/")) {
    return { ok: false, reason: "videoUrl_not_controlled" };
  }
  const matchesJob =
    listed.id === jobId ||
    listed.requestId === jobId ||
    videoUrl.includes(encodeURIComponent(jobId)) ||
    videoUrl.includes(jobId);
  if (!matchesJob) {
    return { ok: false, reason: "job_mismatch" };
  }
  // Durable private listing signals (Library route sets durable mode when
  // private rows exist; row itself should not be process-memory-only demo).
  if (listed.durable === false) {
    return { ok: false, reason: "durable_false" };
  }
  return { ok: true, videoUrl };
}

/**
 * Operator-supplied attempt id for real mode. Reusing the same id with the
 * same image/SKU reuses the generate idempotency key (server replay-safe).
 * Minting a new id authorizes a new possible Provider spend.
 */
export function assertOperatorAttemptId(raw) {
  const attemptId = String(raw || "").trim();
  assert.ok(
    attemptId.length >= MIN_OPERATOR_ATTEMPT_ID_LEN,
    `PIKBO_ACCEPTANCE_ATTEMPT_ID must be at least ${MIN_OPERATOR_ATTEMPT_ID_LEN} characters`
  );
  assert.ok(
    attemptId.length <= MAX_OPERATOR_ATTEMPT_ID_LEN,
    `PIKBO_ACCEPTANCE_ATTEMPT_ID must be ≤ ${MAX_OPERATOR_ATTEMPT_ID_LEN} characters`
  );
  // Printable, non-whitespace-control identifiers only (no newlines/cookies).
  assert.match(
    attemptId,
    /^[A-Za-z0-9._:-]+$/,
    "PIKBO_ACCEPTANCE_ATTEMPT_ID may only contain A-Z a-z 0-9 . _ : -"
  );
  return attemptId;
}

/**
 * Supabase owner access token for Authorization: Bearer on Pikbo API routes.
 * Matches lib/supabase/user.ts getAuthUserFromRequest / bearerToken contract.
 * Never log the returned value.
 */
export function assertOwnerAccessToken(raw) {
  const token = String(raw || "").trim();
  assert.ok(
    token.length >= 32,
    "PIKBO_ACCEPTANCE_ACCESS_TOKEN is required (≥32 chars Supabase access token)"
  );
  assert.ok(
    !/\s/.test(token),
    "PIKBO_ACCEPTANCE_ACCESS_TOKEN must not contain whitespace"
  );
  assert.ok(
    !/^(null|undefined|cookie|session|bearer)$/i.test(token),
    "PIKBO_ACCEPTANCE_ACCESS_TOKEN is not a valid access token"
  );
  return token;
}

/**
 * Preview gateway cookie only — not a substitute for Bearer auth.
 * Optional rename alias: PIKBO_ACCEPTANCE_PREVIEW_COOKIE (preferred) falls
 * back to legacy PIKBO_ACCEPTANCE_SESSION_COOKIE.
 */
export function resolvePreviewGatewayCookie(env = process.env) {
  const preferred = String(env.PIKBO_ACCEPTANCE_PREVIEW_COOKIE || "").trim();
  if (preferred) return preferred;
  return String(env.PIKBO_ACCEPTANCE_SESSION_COOKIE || "").trim();
}

export function assertPreviewGatewayCookie(raw) {
  const cookie = String(raw || "").trim();
  assert.ok(
    cookie.length >= 16,
    "PIKBO_ACCEPTANCE_PREVIEW_COOKIE (or legacy PIKBO_ACCEPTANCE_SESSION_COOKIE) is required for the protected Preview gateway"
  );
  return cookie;
}

/**
 * Attach/strip dual credentials for a request kind.
 * - owner: Preview gateway cookie + Authorization Bearer
 * - anonymous (Pikbo-anonymous): Preview gateway cookie kept, Bearer stripped
 *   so Deployment Protection admits the request while the app sees no user
 * - uploadPut: neither (signed URL is the storage auth)
 */
export function applyRequestCredentials(headers, options) {
  const h =
    headers instanceof Headers ? headers : new Headers(headers || {});
  h.delete("cookie");
  h.delete("Cookie");
  h.delete("authorization");
  h.delete("Authorization");
  const mode = options?.mode || "owner";
  const cookie = String(options?.cookie || "").trim();
  const accessToken = String(options?.accessToken || "").trim();
  if (mode === "owner") {
    assert.ok(cookie, "owner requests require a Preview gateway cookie");
    assert.ok(accessToken, "owner requests require a Supabase access token");
    h.set("cookie", cookie);
    h.set("authorization", `Bearer ${accessToken}`);
    if (!h.has("accept")) h.set("accept", "application/json");
  } else if (mode === "anonymous") {
    // Pikbo-anonymous: still admitted through the protected Preview gateway.
    assert.ok(
      cookie,
      "Pikbo-anonymous probes require the Preview gateway cookie"
    );
    h.set("cookie", cookie);
    // Authorization intentionally absent — proves app-level AUTH_REQUIRED.
    if (!h.has("accept")) h.set("accept", "application/json");
  } else if (mode === "uploadPut") {
    // Signed upload URL is the only storage auth; never attach cookie/Bearer.
  }
  return h;
}

/**
 * Derive a stable, versioned generate idempotency key (≤128 chars).
 * Same attemptId + fixed contract + input sha256 + skuLabel → same key.
 * Changing attemptId (or input/SKU/contract) produces a different key.
 * Never log the returned key in evidence.
 */
export function deriveAcceptanceIdempotencyKey(input) {
  const attemptId = assertOperatorAttemptId(input?.attemptId);
  const inputSha256 = String(input?.inputSha256 || "")
    .trim()
    .toLowerCase();
  assert.match(
    inputSha256,
    /^[0-9a-f]{64}$/,
    "inputSha256 must be a 64-char lowercase hex digest"
  );
  const skuLabel = String(input?.skuLabel || "")
    .trim()
    .slice(0, 80);
  const contract = input?.contract || FIXED_MOMENT_CONTRACT;
  const material = JSON.stringify([
    ACCEPTANCE_IDEMPOTENCY_KEY_VERSION,
    attemptId,
    contract.productContract,
    contract.effect,
    contract.duration,
    contract.aspectRatio,
    contract.model,
    contract.resolution,
    inputSha256,
    skuLabel,
  ]);
  const digest = createHash("sha256").update(material).digest("hex");
  // Prefix keeps the scheme readable for ops; digest provides uniqueness.
  // Total length well under the server 128-char limit.
  const key = `accept-${ACCEPTANCE_IDEMPOTENCY_KEY_VERSION}-${digest}`;
  assert.ok(
    key.length >= 8 && key.length <= MAX_IDEMPOTENCY_KEY_LEN,
    `derived idempotency key length out of bounds: ${key.length}`
  );
  return key;
}

export function assertRealModeGates(env = process.env) {
  assert.equal(
    resolveMode(env),
    "real",
    "assertRealModeGates only applies in real mode"
  );
  assert.equal(
    String(env.PIKBO_CONFIRM_PROVIDER_SPEND || "").trim(),
    SPEND_CONFIRMATION_PHRASE,
    `Real mode requires PIKBO_CONFIRM_PROVIDER_SPEND=${SPEND_CONFIRMATION_PHRASE}`
  );
  assert.notEqual(
    String(env.VERCEL_ENV || "").trim(),
    "production",
    "Real mode refuses Vercel production"
  );

  const baseUrl = String(env.PIKBO_ACCEPTANCE_BASE_URL || "").trim();
  assert.ok(baseUrl, "PIKBO_ACCEPTANCE_BASE_URL is required in real mode");
  const url = assertAllowedAcceptanceOrigin(baseUrl);

  // Dual credentials: Bearer is the Pikbo auth contract; cookie is Preview gateway.
  const accessToken = assertOwnerAccessToken(env.PIKBO_ACCEPTANCE_ACCESS_TOKEN);
  const cookie = assertPreviewGatewayCookie(resolvePreviewGatewayCookie(env));

  const imagePath = String(env.PIKBO_ACCEPTANCE_IMAGE_PATH || "").trim();
  assert.ok(
    imagePath,
    "PIKBO_ACCEPTANCE_IMAGE_PATH (owned toy image) is required in real mode"
  );

  const attemptId = assertOperatorAttemptId(
    env.PIKBO_ACCEPTANCE_ATTEMPT_ID
  );

  return {
    baseUrl: url.origin,
    origin: url.origin,
    cookie,
    accessToken,
    imagePath,
    skuLabel: String(env.PIKBO_ACCEPTANCE_SKU_LABEL || "operator-one-sku").slice(
      0,
      80
    ),
    attemptId,
  };
}

export function buildFixedMomentPayload(inputAssetId, idempotencyKey) {
  assert.ok(
    typeof inputAssetId === "string" && inputAssetId.length >= 8,
    "inputAssetId required"
  );
  assert.ok(
    typeof idempotencyKey === "string" &&
      idempotencyKey.length >= 8 &&
      idempotencyKey.length <= MAX_IDEMPOTENCY_KEY_LEN,
    "idempotencyKey required (8–128 chars)"
  );
  return {
    ...FIXED_MOMENT_CONTRACT,
    assetId: inputAssetId,
    // Live path: never send inline image bytes; owner-scoped asset only.
    image: undefined,
    idempotencyKey,
  };
}

export function createNetworkAudit() {
  return {
    uploadPrepare: 0,
    uploadPut: 0,
    uploadComplete: 0,
    generate: 0,
    library: 0,
    /** Owner GET /api/me durable-wallet snapshots (before + after generate). */
    me: 0,
    /** Owner download HEAD (Preview cookie + Bearer). */
    downloadOwner: 0,
    /**
     * Pikbo-anonymous download HEAD (Preview cookie kept, Bearer stripped).
     * Named downloadAnonymous for audit continuity; not fully credential-less.
     */
    downloadAnonymous: 0,
    other: 0,
    total: 0,
  };
}

export function classifyApiPath(pathname) {
  if (pathname === "/api/assets/upload-url") return "uploadPrepare";
  if (pathname === "/api/assets/complete") return "uploadComplete";
  if (pathname.startsWith("/api/assets/") && pathname.includes("/content")) {
    return "uploadPut";
  }
  if (pathname === "/api/generate") return "generate";
  if (pathname === "/api/me") return "me";
  if (pathname === "/api/generations" || pathname.startsWith("/api/generations/")) {
    return "library";
  }
  // Generic download path; callers reclassify as downloadOwner/downloadAnonymous.
  if (pathname.startsWith("/api/downloads/")) return "download";
  // Storage PUTs are never classified from path alone — only after
  // assertTrustedPrivateInputSignedUploadUrl in the fetch guard.
  return "other";
}

/**
 * @param {"owner" | "anonymous"} authMode
 * @returns {"downloadOwner" | "downloadAnonymous" | string}
 */
export function classifyDownloadProbe(pathname, authMode) {
  if (!pathname.startsWith("/api/downloads/")) {
    return classifyApiPath(pathname);
  }
  return authMode === "anonymous" ? "downloadAnonymous" : "downloadOwner";
}

export function assertOneCallBounds(audit) {
  assert.ok(audit && typeof audit === "object", "network audit required");
  assert.ok(
    audit.generate <= MAX_GENERATE_CALLS,
    `generate calls must be ≤ ${MAX_GENERATE_CALLS}, got ${audit.generate}`
  );
  assert.ok(
    audit.uploadPrepare <= MAX_UPLOAD_PREPARE_CALLS,
    `upload-url calls must be ≤ ${MAX_UPLOAD_PREPARE_CALLS}, got ${audit.uploadPrepare}`
  );
  assert.ok(
    audit.uploadPut <= MAX_UPLOAD_PUT_CALLS,
    `upload PUT calls must be ≤ ${MAX_UPLOAD_PUT_CALLS}, got ${audit.uploadPut}`
  );
  assert.ok(
    audit.uploadComplete <= MAX_UPLOAD_COMPLETE_CALLS,
    `upload complete calls must be ≤ ${MAX_UPLOAD_COMPLETE_CALLS}, got ${audit.uploadComplete}`
  );
  assert.ok(
    (audit.downloadOwner || 0) <= 1,
    `owner download probes must be ≤ 1, got ${audit.downloadOwner}`
  );
  assert.ok(
    (audit.downloadAnonymous || 0) <= 1,
    `anonymous download probes must be ≤ 1, got ${audit.downloadAnonymous}`
  );
  assert.ok(
    (audit.me || 0) <= MAX_ME_SNAPSHOT_CALLS,
    `/api/me snapshots must be ≤ ${MAX_ME_SNAPSHOT_CALLS}, got ${audit.me}`
  );
  return true;
}

export function assertDryRunNoSpend(audit) {
  assert.equal(audit.uploadPrepare, 0, "dry-run must not prepare upload");
  assert.equal(audit.uploadPut, 0, "dry-run must not PUT upload bytes");
  assert.equal(audit.uploadComplete, 0, "dry-run must not complete upload");
  assert.equal(audit.generate, 0, "dry-run must not call /api/generate");
  assert.equal(audit.library, 0, "dry-run must not call Library");
  assert.equal(audit.me || 0, 0, "dry-run must not call /api/me");
  assert.equal(audit.downloadOwner || 0, 0, "dry-run must not probe owner download");
  assert.equal(
    audit.downloadAnonymous || 0,
    0,
    "dry-run must not probe Pikbo-anonymous download"
  );
  assert.equal(audit.other, 0, "dry-run must not make other network calls");
  assert.equal(audit.total, 0, "dry-run network total must be 0");
  return true;
}

/**
 * Accept only a real JSON number that is finite, non-negative, and a safe integer.
 * Rejects null, "", numeric strings, booleans — Number(null)===0 must not pass.
 */
export function parseCreditField(value) {
  if (typeof value !== "number") {
    return { ok: false, reason: "not_json_number" };
  }
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return { ok: false, reason: "not_finite" };
  }
  if (value < 0) {
    return { ok: false, reason: "negative" };
  }
  if (!Number.isSafeInteger(value)) {
    return { ok: false, reason: "not_safe_integer" };
  }
  return { ok: true, value };
}

/**
 * Parse GET /api/me into a safe durable-wallet snapshot.
 * Never returns email, accountId, tokens, or raw response bodies.
 */
export function parseDurableWalletSnapshot(meBody, httpOk) {
  if (!httpOk) {
    return { ok: false, reason: "me_http_not_ok" };
  }
  if (!meBody || typeof meBody !== "object") {
    return { ok: false, reason: "me_body_missing" };
  }
  if (meBody.signedIn !== true) {
    return { ok: false, reason: "not_signed_in" };
  }
  const durable = meBody.durable;
  if (!durable || typeof durable !== "object") {
    return { ok: false, reason: "durable_wallet_missing" };
  }
  const available = parseCreditField(durable.availableCredits);
  if (!available.ok) {
    return { ok: false, reason: "available_credits_invalid" };
  }
  const reserved = parseCreditField(durable.reservedCredits);
  if (!reserved.ok) {
    return { ok: false, reason: "reserved_credits_invalid" };
  }
  return {
    ok: true,
    signedIn: true,
    durableWallet: true,
    availableCredits: available.value,
    reservedCredits: reserved.value,
  };
}

/**
 * Server-reported replay marker only — true solely when body.idempotentReplay === true.
 * Missing / false / other types are treated as fresh (not replay).
 */
export function serverIdempotentReplayMarker(generated) {
  return generated != null && generated.idempotentReplay === true;
}

/**
 * Generate success must show fixed 10-credit settlement fields.
 * costAudit:
 * - fresh (non-replay): require labeled estimatedUsd + ceilingRemainingUsd
 *   (non-negative finite); actual may be null/unknown
 * - replay: costAudit may be absent (route may omit); record unknown/null
 * Never treat estimate as actual.
 */
export function assertGenerateSettlement(generated) {
  if (!generated || typeof generated !== "object") {
    return { ok: false, reason: "generate_body_missing" };
  }
  if (generated.costCredits !== FIXED_MOMENT_CREDITS) {
    return {
      ok: false,
      reason: "cost_credits_not_fixed_10",
      costCredits:
        typeof generated.costCredits === "number" ? generated.costCredits : null,
    };
  }
  if (generated.creditsOutcome !== "10 used") {
    return {
      ok: false,
      reason: "credits_outcome_not_10_used",
      creditsOutcome:
        typeof generated.creditsOutcome === "string"
          ? generated.creditsOutcome
          : null,
    };
  }
  const serverReplay = serverIdempotentReplayMarker(generated);
  const costAudit = extractSafeCostAudit(generated.costAudit, {
    requireLabeledEstimates: !serverReplay,
  });
  if (!costAudit.ok) {
    return { ok: false, reason: costAudit.reason || "cost_audit_invalid" };
  }
  return {
    ok: true,
    costCredits: FIXED_MOMENT_CREDITS,
    creditsOutcome: "10 used",
    serverIdempotentReplay: serverReplay,
    costAudit: costAudit.safe,
  };
}

/**
 * Safe provider cost audit fragment for evidence — no model/provider IDs.
 * @param {object|null|undefined} costAudit
 * @param {{ requireLabeledEstimates?: boolean }} [opts]
 *   When requireLabeledEstimates is true (fresh path), estimatedUsd and
 *   ceilingRemainingUsd must both be present with labeled non-negative amounts.
 *   When false (legal replay), missing costAudit records unknown/null.
 */
export function extractSafeCostAudit(costAudit, opts = {}) {
  const requireLabeledEstimates = opts.requireLabeledEstimates === true;
  if (costAudit == null) {
    if (requireLabeledEstimates) {
      return { ok: false, reason: "fresh_cost_audit_missing" };
    }
    return {
      ok: true,
      safe: {
        estimatedUsd: null,
        ceilingRemainingUsd: null,
        actualUsd: null,
        actualKnown: false,
        actualLabel: "unknown",
      },
    };
  }
  if (typeof costAudit !== "object") {
    return { ok: false, reason: "cost_audit_not_object" };
  }
  const est = costAudit.estimatedUsd;
  const ceil = costAudit.ceilingRemainingUsd;
  const actual = costAudit.actualUsd;
  let estimatedUsd = null;
  if (est && typeof est === "object") {
    if (est.kind !== "estimated" || est.label !== "estimated") {
      return { ok: false, reason: "estimated_label_invalid" };
    }
    if (
      typeof est.amountUsd !== "number" ||
      !Number.isFinite(est.amountUsd) ||
      est.amountUsd < 0
    ) {
      return { ok: false, reason: "estimated_amount_invalid" };
    }
    estimatedUsd = {
      amountUsd: est.amountUsd,
      kind: "estimated",
      label: "estimated",
    };
  }
  let ceilingRemainingUsd = null;
  if (ceil && typeof ceil === "object") {
    if (ceil.kind !== "ceiling" || ceil.label !== "ceiling") {
      return { ok: false, reason: "ceiling_label_invalid" };
    }
    if (
      typeof ceil.amountUsd !== "number" ||
      !Number.isFinite(ceil.amountUsd) ||
      ceil.amountUsd < 0
    ) {
      return { ok: false, reason: "ceiling_amount_invalid" };
    }
    ceilingRemainingUsd = {
      amountUsd: ceil.amountUsd,
      kind: "ceiling",
      label: "ceiling",
    };
  }
  if (requireLabeledEstimates) {
    if (!estimatedUsd) {
      return { ok: false, reason: "fresh_estimated_usd_missing" };
    }
    if (!ceilingRemainingUsd) {
      return { ok: false, reason: "fresh_ceiling_usd_missing" };
    }
  }
  // actual must be null/absent OR explicitly labeled actual — never estimated.
  if (actual != null) {
    if (typeof actual !== "object") {
      return { ok: false, reason: "actual_not_object" };
    }
    if (actual.kind !== "actual" || actual.label !== "actual") {
      return { ok: false, reason: "actual_label_invalid" };
    }
    if (
      typeof actual.amountUsd !== "number" ||
      !Number.isFinite(actual.amountUsd) ||
      actual.amountUsd < 0
    ) {
      return { ok: false, reason: "actual_amount_invalid" };
    }
    return {
      ok: true,
      safe: {
        estimatedUsd,
        ceilingRemainingUsd,
        actualUsd: {
          amountUsd: actual.amountUsd,
          kind: "actual",
          label: "actual",
        },
        actualKnown: true,
        actualLabel: "actual",
      },
    };
  }
  return {
    ok: true,
    safe: {
      estimatedUsd,
      ceilingRemainingUsd,
      actualUsd: null,
      actualKnown: false,
      actualLabel: "unknown",
    },
  };
}

/**
 * Compare before/after durable wallet against the **server** replay marker.
 * - serverIdempotentReplay === true → only availableDelta 0 (no second debit)
 * - serverIdempotentReplay !== true (false/missing) → only availableDelta -10
 * Reserved credits must return to the pre-generate baseline (no drift).
 * Evidence idempotentReplay is always the verified server marker, never inferred
 * from balance alone.
 *
 * @param {object} before
 * @param {object} after
 * @param {boolean} serverIdempotentReplay  true only when generate body says so
 */
export function assertWalletSettlementDelta(
  before,
  after,
  serverIdempotentReplay
) {
  if (!before?.ok || !after?.ok) {
    return { ok: false, reason: "wallet_snapshot_incomplete" };
  }
  const serverReplay = serverIdempotentReplay === true;
  const availableDelta = after.availableCredits - before.availableCredits;
  const reservedDelta = after.reservedCredits - before.reservedCredits;
  const base = {
    availableDelta,
    reservedDelta,
    availableBefore: before.availableCredits,
    availableAfter: after.availableCredits,
    reservedBefore: before.reservedCredits,
    reservedAfter: after.reservedCredits,
    // Always echo the server marker (never reverse-inferred from delta).
    serverIdempotentReplay: serverReplay,
  };
  if (reservedDelta !== 0) {
    return {
      ok: false,
      reason: "reserved_credits_drift",
      ...base,
    };
  }
  if (serverReplay) {
    // Marker true: only zero delta is legal (no second charge).
    if (availableDelta !== 0) {
      return {
        ok: false,
        reason: "replay_marker_delta_not_zero",
        idempotentReplay: true,
        ...base,
      };
    }
    return {
      ok: true,
      idempotentReplay: true,
      availableDelta: 0,
      reservedDelta: 0,
      availableBefore: before.availableCredits,
      availableAfter: after.availableCredits,
      reservedBefore: before.reservedCredits,
      reservedAfter: after.reservedCredits,
      serverIdempotentReplay: true,
      fixedTenCreditSettlement: true,
    };
  }
  // Fresh (marker false or missing): must debit exactly 10.
  if (availableDelta === -FIXED_MOMENT_CREDITS) {
    return {
      ok: true,
      idempotentReplay: false,
      availableDelta: -FIXED_MOMENT_CREDITS,
      reservedDelta: 0,
      availableBefore: before.availableCredits,
      availableAfter: after.availableCredits,
      reservedBefore: before.reservedCredits,
      reservedAfter: after.reservedCredits,
      serverIdempotentReplay: false,
      fixedTenCreditSettlement: true,
    };
  }
  if (availableDelta === 0) {
    // Wallet looks like replay but server did not mark replay → fail-closed.
    return {
      ok: false,
      reason: "fresh_marker_zero_delta",
      idempotentReplay: false,
      ...base,
    };
  }
  return {
    ok: false,
    reason: "available_delta_invalid",
    idempotentReplay: false,
    ...base,
  };
}

function headerGet(response, name) {
  if (!response || !response.headers) return "";
  if (typeof response.headers.get === "function") {
    return String(response.headers.get(name) || "");
  }
  const key = Object.keys(response.headers).find(
    (k) => k.toLowerCase() === name.toLowerCase()
  );
  return key ? String(response.headers[key] || "") : "";
}

/**
 * Owner HEAD for private UUID result must match downloads route contract:
 * 200 + X-Pikbo-Download: allowed + X-Pikbo-Private-Result: 1.
 * 3xx is not owner-only PASS (would leak signed Location if followed).
 */
export function assertOwnerPrivateDownloadHead(response) {
  const status = Number(response?.status || 0);
  const download = headerGet(response, "x-pikbo-download");
  const privateResult = headerGet(response, "x-pikbo-private-result");
  if (status !== 200) {
    return {
      ok: false,
      reason: status >= 300 && status < 400
        ? "owner_redirect_not_allowed"
        : "owner_status_not_200",
      status,
      downloadHeader: download || null,
      privateResultMarker: privateResult === "1",
    };
  }
  if (download !== "allowed") {
    return {
      ok: false,
      reason: "owner_download_not_allowed",
      status,
      downloadHeader: download || null,
      privateResultMarker: privateResult === "1",
    };
  }
  if (privateResult !== "1") {
    return {
      ok: false,
      reason: "owner_private_result_marker_missing",
      status,
      downloadHeader: download,
      privateResultMarker: false,
    };
  }
  return {
    ok: true,
    status: 200,
    downloadHeader: "allowed",
    privateResultMarker: true,
  };
}

/**
 * Pikbo-anonymous download HEAD (Preview gateway cookie present, no Bearer)
 * for a private UUID must return application-level 401 + AUTH_REQUIRED.
 * Any 2xx/3xx means the route is publicly reachable without Pikbo auth —
 * fail closed. Missing X-Pikbo-Download-Code after a 401 may indicate the
 * request never reached the app (gateway rejection) — also fail closed.
 */
export function assertAnonymousDownloadDenied(response) {
  const status = Number(response?.status || 0);
  const code = headerGet(response, "x-pikbo-download-code");
  if (status >= 200 && status < 400) {
    return {
      ok: false,
      reason: "anonymous_public_access",
      status,
      downloadCode: code || null,
    };
  }
  if (status !== 401) {
    return {
      ok: false,
      reason: "anonymous_status_not_401",
      status,
      downloadCode: code || null,
    };
  }
  if (code !== "AUTH_REQUIRED") {
    return {
      ok: false,
      reason:
        code
          ? "anonymous_code_not_auth_required"
          : "anonymous_gateway_or_non_app_response",
      status,
      downloadCode: code || null,
    };
  }
  return {
    ok: true,
    status: 401,
    downloadCode: "AUTH_REQUIRED",
    // Shape markers only — never raw credentials.
    previewGatewayAdmitted: true,
    pikboBearerAbsent: true,
  };
}

/**
 * Redact secrets and provider identifiers from operator evidence.
 * Never emit cookies, emails, signed URLs, object keys, raw provider URLs,
 * or provider model identifiers.
 */
export function sanitizeEvidence(value, keyHint = "") {
  if (value == null) return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    if (SENSITIVE_KEY_RE.test(keyHint)) return "[redacted]";
    // Exact allowlisted origins may appear as gate constants (no cookie/path/token).
    // Must run before generic supabase/https redaction rules.
    if (value === PROTECTED_PREVIEW_ORIGIN || value === `${PROTECTED_PREVIEW_ORIGIN}/`) {
      return PROTECTED_PREVIEW_ORIGIN;
    }
    if (
      value === PRIVATE_INPUT_STORAGE_ORIGIN ||
      value === `${PRIVATE_INPUT_STORAGE_ORIGIN}/`
    ) {
      return PRIVATE_INPUT_STORAGE_ORIGIN;
    }
    if (value === PRIVATE_INPUT_BUCKET) {
      return PRIVATE_INPUT_BUCKET;
    }
    if (SENSITIVE_VALUE_RE.test(value) || PROVIDER_URL_RE.test(value)) {
      return "[redacted]";
    }
    // Controlled local download path is safe as a shape marker; strip job ids.
    if (
      value.startsWith("/api/downloads/") ||
      /^https?:\/\/[^/]+\/api\/downloads\//i.test(value)
    ) {
      return "/api/downloads/[job]";
    }
    // Absolute / data URLs are redacted to host-only markers (no signed query).
    if (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("data:")
    ) {
      try {
        const u = new URL(value);
        return `[${u.protocol}//${u.hostname}/…]`;
      } catch {
        return "[redacted-url]";
      }
    }
    if (value.includes("@") && /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(value)) {
      return "[redacted-email]";
    }
    // Truncate opaque tokens / long blobs.
    if (value.length > 240) return `${value.slice(0, 32)}…[truncated]`;
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, i) => sanitizeEvidence(item, `${keyHint}[${i}]`));
  }
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEY_RE.test(k)) {
        out[k] = "[redacted]";
        continue;
      }
      out[k] = sanitizeEvidence(v, k);
    }
    return out;
  }
  return String(value);
}

export function buildDryRunEvidence() {
  return sanitizeEvidence({
    schemaVersion: 1,
    mode: "dry-run",
    productContract: FIXED_MOMENT_CONTRACT.productContract,
    fixedMoment: {
      effect: FIXED_MOMENT_CONTRACT.effect,
      duration: FIXED_MOMENT_CONTRACT.duration,
      aspectRatio: FIXED_MOMENT_CONTRACT.aspectRatio,
      resolution: FIXED_MOMENT_CONTRACT.resolution,
      // Intentionally omit model string labels that could leak provider identity
      // into shared logs; contract name is enough for dry-run.
      modelFamily: "fixed-founding-studio",
    },
    spend: {
      confirmed: false,
      providerCalls: 0,
      uploadCalls: 0,
      generateCalls: 0,
      stripeCalls: 0,
    },
    network: createNetworkAudit(),
    gates: {
      requiresExplicitSpendConfirmation: true,
      requiresOperatorSession: true,
      requiresOwnedImagePath: true,
      maxGenerateCalls: MAX_GENERATE_CALLS,
      productionHostForbidden: true,
      allowedOrigin: PROTECTED_PREVIEW_ORIGIN,
      requiresNonDemoPrivateProcessed: true,
      requiresOwnedDurableLibraryRow: true,
      requiresOwnerPrivateDownloadHead: true,
      requiresAnonymousDownloadDenied: true,
      privateInputStorageOrigin: PRIVATE_INPUT_STORAGE_ORIGIN,
      privateInputBucket: PRIVATE_INPUT_BUCKET,
      requiresTrustedSignedUploadUrl: true,
      requiresOperatorAttemptId: true,
      requiresOwnerAccessToken: true,
      requiresPreviewGatewayCookie: true,
      ownerApiUsesBearer: true,
      pikboAnonymousKeepsPreviewCookie: true,
      pikboAnonymousStripsBearer: true,
      storagePutStripsCookieAndAuthorization: true,
      requiresDurableWalletSnapshots: true,
      requiresFixedTenCreditSettlement: true,
      requiresWalletDeltaFreshOrReplay: true,
      fixedMomentCredits: FIXED_MOMENT_CREDITS,
      maxMeSnapshots: MAX_ME_SNAPSHOT_CALLS,
      idempotencyKeyVersion: ACCEPTANCE_IDEMPOTENCY_KEY_VERSION,
      idempotencyKeyMaxLen: MAX_IDEMPOTENCY_KEY_LEN,
    },
    verdict: "PASS_DRY_RUN_NO_SPEND",
    note:
      "No upload, Library, download, Provider, or Stripe call was made. Real mode remains operator-gated.",
  });
}

function mimeFromPath(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  throw new Error("Owned image must be .jpg, .jpeg, .png, or .webp");
}

function resolveImagePath(rawPath) {
  const absolute = isAbsolute(rawPath) ? rawPath : resolve(process.cwd(), rawPath);
  return absolute;
}

/**
 * Classify a network target for audit. PUT is uploadPut only after the
 * shared trusted signed-upload validator passes (never loose host regex).
 */
export function classifyNetworkRequest(rawUrl, method, authMode = "owner") {
  const m = String(method || "GET").toUpperCase();
  if (m === "PUT") {
    // Validate before classifying — untrusted targets never become uploadPut.
    assertTrustedPrivateInputSignedUploadUrl(rawUrl);
    return "uploadPut";
  }
  const target = new URL(rawUrl, PROTECTED_PREVIEW_ORIGIN);
  if (target.origin !== PROTECTED_PREVIEW_ORIGIN) {
    throw new Error(`Third-party network request forbidden: ${target.hostname}`);
  }
  const baseKind = classifyApiPath(target.pathname);
  if (baseKind === "download") {
    return classifyDownloadProbe(target.pathname, authMode);
  }
  return baseKind;
}

function createGuardedFetch(allowedOrigin, credentials, audit) {
  const cookie = credentials.cookie;
  const accessToken = credentials.accessToken;
  return async (input, init = {}) => {
    const authMode = init.authMode === "anonymous" ? "anonymous" : "owner";
    const restInit = { ...init };
    delete restInit.authMode;
    const rawUrl =
      typeof input === "string" || input instanceof URL
        ? input.toString()
        : input.url;
    const method = String(
      restInit.method ||
        (typeof input === "object" && input && "method" in input
          ? input.method
          : "GET")
    ).toUpperCase();

    // Shared validator: operator API host OR exact trusted signed-upload PUT.
    // Never allow fal / googleapis / other Supabase projects / loose paths.
    let kind;
    try {
      kind = classifyNetworkRequest(rawUrl, method, authMode);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Network target rejected";
      throw new Error(message);
    }
    // Double-check operator API origin for non-PUT (classify already does this).
    if (kind !== "uploadPut") {
      const target = new URL(rawUrl);
      if (target.origin !== allowedOrigin) {
        throw new Error(
          `Third-party network request forbidden: ${target.hostname}`
        );
      }
    }

    audit[kind] = (audit[kind] || 0) + 1;
    audit.total += 1;
    assertOneCallBounds(audit);

    // Owner: Preview cookie + Bearer.
    // Pikbo-anonymous same-origin: Preview cookie kept, Bearer stripped.
    // Storage PUT: strip both (signed URL is storage auth).
    const credMode =
      kind === "uploadPut"
        ? "uploadPut"
        : authMode === "anonymous"
          ? "anonymous"
          : "owner";
    const headers = applyRequestCredentials(restInit.headers || {}, {
      mode: credMode,
      cookie,
      accessToken,
    });

    const response = await fetch(rawUrl, {
      ...restInit,
      headers,
      redirect: "manual",
    });
    return response;
  };
}

async function readJsonSafe(response) {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { parseError: true, status: response.status };
  }
}

/**
 * Real one-SKU path. Injectable fetch for tests; production path uses global fetch.
 */
export async function runRealAcceptance(options) {
  const {
    baseUrl,
    origin,
    cookie,
    accessToken,
    imagePath,
    skuLabel,
    attemptId,
    fetchImpl,
    now = () => new Date().toISOString(),
    /** Injectable monotonic ms clock for time-to-downloadable (tests). */
    clockMs = () => Date.now(),
  } = options;
  const operatorAttemptId = assertOperatorAttemptId(attemptId);
  const previewCookie = assertPreviewGatewayCookie(cookie);
  const ownerAccessToken = assertOwnerAccessToken(accessToken);

  // Defense in depth: never attach credentials to a non-allowlisted origin even
  // if a caller constructs runRealAcceptance directly in tests or ops scripts.
  assertAllowedAcceptanceOrigin(origin || baseUrl);
  assert.equal(
    new URL(baseUrl).origin,
    PROTECTED_PREVIEW_ORIGIN,
    `Real acceptance baseUrl must be ${PROTECTED_PREVIEW_ORIGIN}`
  );

  const audit = createNetworkAudit();
  const credentials = {
    cookie: previewCookie,
    accessToken: ownerAccessToken,
  };
  const guarded =
    fetchImpl ||
    createGuardedFetch(PROTECTED_PREVIEW_ORIGIN, credentials, audit);

  // If caller injects fetchImpl, still apply the same credential attach/strip
  // rules as global fetch (owner: cookie+Bearer; pikbo-anonymous: cookie only).
  // PUT targets share assertTrustedPrivateInputSignedUploadUrl with real fetch.
  const track = async (url, init = {}) => {
    const authMode = init.authMode === "anonymous" ? "anonymous" : "owner";
    const restInit = { ...init };
    delete restInit.authMode;
    if (fetchImpl) {
      const method = String(restInit.method || "GET").toUpperCase();
      const finalKind = classifyNetworkRequest(String(url), method, authMode);
      audit[finalKind] = (audit[finalKind] || 0) + 1;
      audit.total += 1;
      assertOneCallBounds(audit);

      const credMode =
        finalKind === "uploadPut"
          ? "uploadPut"
          : authMode === "anonymous"
            ? "anonymous"
            : "owner";
      const headers = applyRequestCredentials(restInit.headers || {}, {
        mode: credMode,
        cookie: previewCookie,
        accessToken: ownerAccessToken,
      });
      return fetchImpl(url, {
        ...restInit,
        headers,
        authMode,
        redirect: "manual",
      });
    }
    return guarded(url, { ...restInit, authMode });
  };

  const absoluteImage = resolveImagePath(imagePath);
  const bytes = readFileSync(absoluteImage);
  assert.ok(bytes.byteLength >= 32, "Owned image is too small");
  assert.ok(bytes.byteLength <= 12 * 1024 * 1024, "Owned image exceeds 12MB");
  const mimeType = mimeFromPath(absoluteImage);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const clientKeyMaterial = JSON.stringify([
    sha256,
    mimeType,
    bytes.byteLength,
    skuLabel,
  ]);
  const clientAssetKey = `input:${createHash("sha256")
    .update(clientKeyMaterial)
    .digest("hex")}`;

  // 1) Prepare private upload (at most once).
  const prepRes = await track(`${baseUrl}/api/assets/upload-url`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: basename(absoluteImage).slice(0, 80) || "toy-input",
      mimeType,
      sizeBytes: bytes.byteLength,
      sha256,
      clientAssetKey,
      skuLabel,
    }),
  });
  const prep = await readJsonSafe(prepRes);
  if (!prepRes.ok || prep.ok !== true) {
    return sanitizeEvidence({
      schemaVersion: 1,
      mode: "real",
      stage: "upload-prepare",
      verdict: "FAIL",
      httpStatus: prepRes.status,
      code: typeof prep.code === "string" ? prep.code : "UPLOAD_PREPARE_FAILED",
      spend: {
        confirmed: true,
        providerCalls: 0,
        generateCalls: audit.generate,
      },
      network: audit,
      finishedAt: now(),
    });
  }
  const assetId = prep.inputAssetId || prep.assetId;
  assert.ok(typeof assetId === "string" && assetId.length >= 8, "assetId missing");

  // 2) PUT bytes when state is pending (at most once).
  // Validate the signed upload URL BEFORE constructing or sending image bytes.
  if (prep.state === "pending") {
    if (typeof prep.uploadUrl !== "string" || !prep.uploadUrl.trim()) {
      return sanitizeEvidence({
        schemaVersion: 1,
        mode: "real",
        stage: "upload-put-url-gate",
        verdict: "FAIL",
        code: "UPLOAD_URL_MISSING",
        spend: {
          confirmed: true,
          providerCalls: 0,
          generateCalls: audit.generate,
          uploadPutCalls: audit.uploadPut,
        },
        network: audit,
        finishedAt: now(),
      });
    }
    try {
      assertTrustedPrivateInputSignedUploadUrl(prep.uploadUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Untrusted upload URL";
      return sanitizeEvidence({
        schemaVersion: 1,
        mode: "real",
        stage: "upload-put-url-gate",
        verdict: "FAIL",
        code: "UNTRUSTED_UPLOAD_URL",
        error: message.slice(0, 200),
        spend: {
          confirmed: true,
          providerCalls: 0,
          generateCalls: 0,
          uploadPutCalls: audit.uploadPut,
        },
        network: audit,
        finishedAt: now(),
      });
    }
    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append(
      "",
      new Blob([bytes], { type: mimeType }),
      basename(absoluteImage) || "toy-input"
    );
    const putRes = await track(prep.uploadUrl, {
      method: "PUT",
      headers: { "x-upsert": "false" },
      body: form,
    });
    if (!putRes.ok && putRes.status !== 200 && putRes.status !== 201) {
      return sanitizeEvidence({
        schemaVersion: 1,
        mode: "real",
        stage: "upload-put",
        verdict: "FAIL",
        httpStatus: putRes.status,
        code: "UPLOAD_PUT_FAILED",
        spend: {
          confirmed: true,
          providerCalls: 0,
          generateCalls: audit.generate,
        },
        network: audit,
        finishedAt: now(),
      });
    }
  }

  // 3) Complete asset (at most once).
  const completeRes = await track(`${baseUrl}/api/assets/complete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetId }),
  });
  const completed = await readJsonSafe(completeRes);
  if (
    !completeRes.ok ||
    completed.ok !== true ||
    (completed.inputAssetId || completed.asset?.id) !== assetId ||
    completed.asset?.state !== "ready"
  ) {
    return sanitizeEvidence({
      schemaVersion: 1,
      mode: "real",
      stage: "upload-complete",
      verdict: "FAIL",
      httpStatus: completeRes.status,
      code:
        typeof completed.code === "string"
          ? completed.code
          : "UPLOAD_COMPLETE_FAILED",
      spend: {
        confirmed: true,
        providerCalls: 0,
        generateCalls: audit.generate,
      },
      network: audit,
      finishedAt: now(),
    });
  }

  // 4) Durable wallet snapshot before generate (owner Bearer + Preview cookie).
  // Timing starts here; elapsedMs is finalized only after Library + dual download
  // probes (time-to-downloadable), not at generate return.
  const startedAtMs = clockMs();
  const meBeforeRes = await track(`${baseUrl}/api/me`, {
    method: "GET",
    authMode: "owner",
  });
  const meBeforeBody = await readJsonSafe(meBeforeRes);
  const walletBefore = parseDurableWalletSnapshot(meBeforeBody, meBeforeRes.ok);
  if (!walletBefore.ok) {
    return sanitizeEvidence({
      schemaVersion: 1,
      mode: "real",
      stage: "wallet-before",
      verdict: "FAIL",
      code: "WALLET_SNAPSHOT_FAILED",
      reason: walletBefore.reason,
      spend: {
        confirmed: true,
        generateCalls: 0,
        providerCalls: 0,
      },
      network: audit,
      finishedAt: now(),
    });
  }
  // Fresh Moment requires ≥10 available; low balance may only legally end as replay.
  const preAllowsFresh = walletBefore.availableCredits >= FIXED_MOMENT_CREDITS;

  // 5) Exactly one generate for fixed toy-moment-v1.
  // Stable operator attempt id + input/SKU/contract digest → replay-safe key.
  // Never put attemptId or the full key into evidence.
  const idempotencyKey = deriveAcceptanceIdempotencyKey({
    attemptId: operatorAttemptId,
    inputSha256: sha256,
    skuLabel,
    contract: FIXED_MOMENT_CONTRACT,
  });
  const payload = buildFixedMomentPayload(assetId, idempotencyKey);
  const generateRes = await track(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const generated = await readJsonSafe(generateRes);
  const liveCheck = assertLiveGenerateSuccess(generated, generateRes.ok);

  if (!liveCheck.ok) {
    return sanitizeEvidence({
      schemaVersion: 1,
      mode: "real",
      stage: "generate",
      verdict: "FAIL",
      httpStatus: generateRes.status,
      code: liveCheck.code,
      reason: liveCheck.reason,
      productContract: FIXED_MOMENT_CONTRACT.productContract,
      generate: {
        ok: false,
        demo: generated.demo === true,
        processedUpload: generated.processedUpload === true,
        privateResult: generated.privateResult === true,
      },
      accounting: {
        availableBefore: walletBefore.availableCredits,
        reservedBefore: walletBefore.reservedCredits,
      },
      spend: {
        confirmed: true,
        // One generate attempt may or may not have reached the provider;
        // report the call bound, not a fake provider identifier.
        generateCalls: audit.generate,
        providerCallAttempted: audit.generate === 1,
      },
      network: audit,
      finishedAt: now(),
    });
  }

  const settlement = assertGenerateSettlement(generated);
  if (!settlement.ok) {
    return sanitizeEvidence({
      schemaVersion: 1,
      mode: "real",
      stage: "generate-settlement",
      verdict: "FAIL",
      code: "SETTLEMENT_FIELDS_INVALID",
      reason: settlement.reason,
      productContract: FIXED_MOMENT_CONTRACT.productContract,
      accounting: {
        availableBefore: walletBefore.availableCredits,
        reservedBefore: walletBefore.reservedCredits,
        costCredits:
          typeof settlement.costCredits === "number"
            ? settlement.costCredits
            : null,
        creditsOutcome: settlement.creditsOutcome ?? null,
      },
      spend: {
        confirmed: true,
        generateCalls: audit.generate,
        providerCallAttempted: audit.generate === 1,
      },
      network: audit,
      finishedAt: now(),
    });
  }

  // 6) Durable wallet snapshot after generate.
  const meAfterRes = await track(`${baseUrl}/api/me`, {
    method: "GET",
    authMode: "owner",
  });
  const meAfterBody = await readJsonSafe(meAfterRes);
  const walletAfter = parseDurableWalletSnapshot(meAfterBody, meAfterRes.ok);
  if (!walletAfter.ok) {
    return sanitizeEvidence({
      schemaVersion: 1,
      mode: "real",
      stage: "wallet-after",
      verdict: "FAIL",
      code: "WALLET_SNAPSHOT_FAILED",
      reason: walletAfter.reason,
      accounting: {
        availableBefore: walletBefore.availableCredits,
        reservedBefore: walletBefore.reservedCredits,
        costCredits: FIXED_MOMENT_CREDITS,
        creditsOutcome: "10 used",
      },
      spend: {
        confirmed: true,
        generateCalls: audit.generate,
        providerCallAttempted: true,
      },
      network: audit,
      finishedAt: now(),
    });
  }

  // Bind wallet delta to server-reported idempotentReplay (not balance inference).
  const walletDelta = assertWalletSettlementDelta(
    walletBefore,
    walletAfter,
    settlement.serverIdempotentReplay === true
  );
  if (!walletDelta.ok) {
    return sanitizeEvidence({
      schemaVersion: 1,
      mode: "real",
      stage: "wallet-settlement",
      verdict: "FAIL",
      code: "WALLET_DELTA_INVALID",
      reason: walletDelta.reason,
      accounting: {
        availableBefore: walletDelta.availableBefore,
        availableAfter: walletDelta.availableAfter,
        availableDelta: walletDelta.availableDelta,
        reservedBefore: walletDelta.reservedBefore,
        reservedAfter: walletDelta.reservedAfter,
        reservedDelta: walletDelta.reservedDelta,
        // Server marker even on failure (not inferred from delta).
        idempotentReplay: settlement.serverIdempotentReplay === true,
        costCredits: FIXED_MOMENT_CREDITS,
        creditsOutcome: "10 used",
        costAudit: settlement.costAudit,
      },
      spend: {
        confirmed: true,
        generateCalls: audit.generate,
        providerCallAttempted: true,
      },
      network: audit,
      finishedAt: now(),
    });
  }
  if (!preAllowsFresh && walletDelta.idempotentReplay !== true) {
    return sanitizeEvidence({
      schemaVersion: 1,
      mode: "real",
      stage: "wallet-settlement",
      verdict: "FAIL",
      code: "INSUFFICIENT_CREDITS_FOR_FRESH",
      reason: "available_below_10_and_not_replay",
      accounting: {
        availableBefore: walletBefore.availableCredits,
        availableAfter: walletAfter.availableCredits,
        availableDelta: walletDelta.availableDelta,
        reservedBefore: walletBefore.reservedCredits,
        reservedAfter: walletAfter.reservedCredits,
        idempotentReplay: false,
        costCredits: FIXED_MOMENT_CREDITS,
        creditsOutcome: "10 used",
        costAudit: settlement.costAudit,
      },
      network: audit,
      finishedAt: now(),
    });
  }

  const jobId = liveCheck.jobId;

  // 7) Library refresh — durable owner row only.
  const libraryRes = await track(`${baseUrl}/api/generations`, {
    method: "GET",
    headers: { "content-type": "application/json" },
  });
  const library = await readJsonSafe(libraryRes);
  const jobs = Array.isArray(library.jobs) ? library.jobs : [];
  const listed = jobs.find(
    (job) =>
      job &&
      (job.id === jobId ||
        job.requestId === jobId ||
        (typeof job.videoUrl === "string" &&
          (job.videoUrl.includes(encodeURIComponent(jobId)) ||
            job.videoUrl.includes(jobId))))
  );
  const libraryRow = assertDurableOwnedLibraryRow(listed, jobId);
  const libraryModeOk =
    library.durable === true ||
    (typeof library.mode === "string" &&
      library.mode.includes("supabase-private"));
  const libraryOk =
    libraryRes.ok &&
    library.ok === true &&
    libraryRow.ok &&
    libraryModeOk;

  // 8) Dual download HEAD probes:
  //    owner (cookie+Bearer) private markers + Pikbo-anonymous (cookie, no Bearer)
  //    application AUTH_REQUIRED. HEAD only — never follow redirects / Location.
  let ownerProbe = {
    ok: false,
    reason: "library_failed",
    status: 0,
    downloadHeader: null,
    privateResultMarker: false,
  };
  let pikboAnonymousProbe = {
    ok: false,
    reason: "library_failed",
    status: 0,
    downloadCode: null,
  };
  if (libraryOk) {
    const downloadUrl = `${baseUrl}/api/downloads/${encodeURIComponent(jobId)}`;
    const ownerRes = await track(downloadUrl, {
      method: "HEAD",
      authMode: "owner",
    });
    ownerProbe = assertOwnerPrivateDownloadHead(ownerRes);
    // Drain without reading Location or body contents into evidence.
    try {
      await ownerRes.arrayBuffer();
    } catch {
      /* ignore */
    }

    const anonRes = await track(downloadUrl, {
      method: "HEAD",
      authMode: "anonymous",
    });
    pikboAnonymousProbe = assertAnonymousDownloadDenied(anonRes);
    try {
      await anonRes.arrayBuffer();
    } catch {
      /* ignore */
    }
  }

  const ownerOnlyProven =
    ownerProbe.ok === true && pikboAnonymousProbe.ok === true;
  const accountingOk = walletDelta.ok === true && settlement.ok === true;
  const verdict =
    libraryOk && ownerOnlyProven && accountingOk
      ? "PASS_ONE_SKU_REAL"
      : "FAIL_POST_GENERATE_CHECKS";

  // Time-to-downloadable: after Library + dual download probes complete.
  const elapsedMs = Math.max(0, clockMs() - startedAtMs);

  return sanitizeEvidence({
    schemaVersion: 1,
    mode: "real",
    stage: "complete",
    verdict,
    productContract: FIXED_MOMENT_CONTRACT.productContract,
    fixedMoment: {
      effect: FIXED_MOMENT_CONTRACT.effect,
      duration: FIXED_MOMENT_CONTRACT.duration,
      aspectRatio: FIXED_MOMENT_CONTRACT.aspectRatio,
      resolution: FIXED_MOMENT_CONTRACT.resolution,
      modelFamily: "fixed-founding-studio",
    },
    input: {
      ready: true,
      mimeType,
      sizeBytes: bytes.byteLength,
      sha256Prefix: sha256.slice(0, 12),
      skuLabel,
    },
    generate: {
      ok: true,
      httpStatus: generateRes.status,
      demo: false,
      processedUpload: true,
      privateResult: true,
      // Shape marker only — never the raw short-lived signed delivery URL.
      hasPrivateSignedDeliveryUrl: liveCheck.hasPrivateSignedDeliveryUrl === true,
      // Idempotency: stable derivation used; never emit attempt id or key.
      idempotencyKeyDerived: true,
      idempotencyKeyVersion: ACCEPTANCE_IDEMPOTENCY_KEY_VERSION,
      idempotencyKeyLen: idempotencyKey.length,
      costCredits: FIXED_MOMENT_CREDITS,
      creditsOutcome: "10 used",
      // Server marker (verified against wallet delta above).
      idempotentReplay: settlement.serverIdempotentReplay === true,
    },
    accounting: {
      availableBefore: walletDelta.availableBefore,
      availableAfter: walletDelta.availableAfter,
      availableDelta: walletDelta.availableDelta,
      reservedBefore: walletDelta.reservedBefore,
      reservedAfter: walletDelta.reservedAfter,
      reservedDelta: walletDelta.reservedDelta,
      fixedTenCreditSettlement: true,
      // From verified server marker — not reverse-inferred from balance.
      idempotentReplay: settlement.serverIdempotentReplay === true,
      costCredits: FIXED_MOMENT_CREDITS,
      creditsOutcome: "10 used",
      costAudit: settlement.costAudit,
      // Wall/clock ms from pre-generate wallet snapshot through dual download probes.
      elapsedMs,
      elapsedMeaning: "time-to-downloadable",
    },
    library: {
      ok: libraryOk,
      listed: Boolean(listed),
      owned: listed?.owned === true,
      downloadAllowed: listed?.downloadAllowed === true,
      statusSucceeded: listed?.status === "succeeded",
      durableListing: libraryModeOk,
      downloadPathControlled: libraryRow.ok === true,
      httpStatus: libraryRes.status,
      reason: libraryRow.ok ? undefined : libraryRow.reason,
    },
    download: {
      ownerOnlyProven,
      owner: {
        ok: ownerProbe.ok === true,
        httpStatus: ownerProbe.status || 0,
        downloadHeader: ownerProbe.downloadHeader || null,
        privateResultMarker: ownerProbe.privateResultMarker === true,
        reason: ownerProbe.ok ? undefined : ownerProbe.reason,
      },
      // Pikbo-anonymous: admitted via Preview gateway cookie, no Bearer.
      // (Kept as `anonymous` key for continuity; see pikboAnonymous markers.)
      anonymous: {
        ok: pikboAnonymousProbe.ok === true,
        httpStatus: pikboAnonymousProbe.status || 0,
        downloadCode: pikboAnonymousProbe.downloadCode || null,
        previewGatewayAdmitted:
          pikboAnonymousProbe.previewGatewayAdmitted === true ||
          pikboAnonymousProbe.ok === true,
        pikboBearerAbsent: true,
        meaning: "pikbo-anonymous-via-preview-gateway",
        reason: pikboAnonymousProbe.ok
          ? undefined
          : pikboAnonymousProbe.reason,
      },
    },
    spend: {
      confirmed: true,
      generateCalls: audit.generate,
      uploadPrepareCalls: audit.uploadPrepare,
      uploadPutCalls: audit.uploadPut,
      uploadCompleteCalls: audit.uploadComplete,
      meSnapshots: audit.me,
      providerCallAttempted: audit.generate === 1,
      stripeCalls: 0,
    },
    network: audit,
    finishedAt: now(),
  });
}

/**
 * @returns {Promise<{ mode: string, evidence: object, ok: boolean }>}
 * Does not set process.exitCode when imported (regression-safe).
 */
export async function main(env = process.env) {
  const parsed = parseMode(env);
  if (parsed.mode === "invalid") {
    const evidence = sanitizeEvidence({
      schemaVersion: 1,
      mode: "invalid",
      verdict: "FAIL_INVALID_MODE",
      error: "PIKBO_ACCEPTANCE_MODE must be dry-run (default) or real",
    });
    console.error(JSON.stringify(evidence, null, 2));
    return { mode: "invalid", evidence, ok: false };
  }
  const mode = parsed.mode;
  if (mode === "dry-run") {
    const evidence = buildDryRunEvidence();
    assertDryRunNoSpend(evidence.network);
    console.log(JSON.stringify(evidence, null, 2));
    console.log(
      "private-moment-acceptance-harness: PASS (dry-run · zero network · zero spend)"
    );
    return { mode, evidence, ok: true };
  }

  const gates = assertRealModeGates(env);
  const evidence = await runRealAcceptance(gates);
  console.log(JSON.stringify(evidence, null, 2));
  if (String(evidence.verdict || "").startsWith("PASS")) {
    console.log(
      "private-moment-acceptance-harness: PASS (real · one toy-moment-v1 · sanitized evidence)"
    );
    return { mode, evidence, ok: true };
  }
  console.error(
    `private-moment-acceptance-harness: FAIL (${evidence.stage || "unknown"} · ${evidence.verdict})`
  );
  return { mode, evidence, ok: false };
}

function isCliEntry() {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return entry === fileURLToPath(import.meta.url);
}

if (isCliEntry()) {
  main()
    .then((result) => {
      if (!result.ok) process.exitCode = 1;
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      // Never re-invoke resolveMode here — invalid mode is handled in main(),
      // and re-parsing can throw a second time and leak un-sanitized stacks.
      const parsed = parseMode(process.env);
      console.error(
        JSON.stringify(
          sanitizeEvidence({
            schemaVersion: 1,
            mode: parsed.mode === "invalid" ? "invalid" : parsed.mode,
            verdict: "FAIL_EXCEPTION",
            error: message.slice(0, 200),
          }),
          null,
          2
        )
      );
      process.exitCode = 1;
    });
}
