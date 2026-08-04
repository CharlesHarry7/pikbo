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
 *   - Requires explicit spend confirmation plus operator-supplied session
 *     cookie and a local owned-image path.
 *   - Runs at most one fixed Street Power-Up upload → generate →
 *     Library-refresh → owner-only-download check against an operator host.
 *   - Never logs cookies, emails, signed URLs, object keys, raw provider URLs,
 *     or provider identifiers.
 *
 * Usage:
 *   node scripts/private-moment-acceptance-harness.mjs
 *   PIKBO_ACCEPTANCE_MODE=real \
 *     PIKBO_CONFIRM_PROVIDER_SPEND=I_UNDERSTAND_ONE_TOY_MOMENT_V1_SPEND \
 *     PIKBO_ACCEPTANCE_BASE_URL=https://… \
 *     PIKBO_ACCEPTANCE_SESSION_COOKIE='…' \
 *     PIKBO_ACCEPTANCE_IMAGE_PATH=/path/to/owned-toy.jpg \
 *     node scripts/private-moment-acceptance-harness.mjs
 */

import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, dirname, isAbsolute, resolve } from "node:path";
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

/** Keys that must never appear with real values in operator evidence. */
const SENSITIVE_KEY_RE =
  /^(?:cookie|cookies|authorization|auth|email|e-?mail|signedUrl|signed_url|uploadUrl|upload_url|objectKey|object_key|providerUrl|provider_url|providerModel|provider_model|providerId|provider_id|falKey|fal_key|token|accessToken|refreshToken|secret|password|sessionCookie|session_cookie)$/i;
const SENSITIVE_VALUE_RE =
  /(?:^|[\s"'=])(?:sb-[a-z0-9-]*-auth-token|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.|data:image\/|https?:\/\/[^\s"'<>]+(?:supabase|fal\.ai|storage)[^\s"'<>]*|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|sk_[a-zA-Z0-9]{16,}|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/(?:inputs|outputs)\/)/i;
const PROVIDER_URL_RE =
  /(?:fal\.ai|fal\.run|queue\.fal|storage\.googleapis\.com|supabase\.co\/storage)/i;
const STORAGE_HOST_RE =
  /(?:^|\.)supabase\.co$|(?:^|\.)fal\.ai$|(?:^|\.)fal\.run$|(?:^|\.)googleapis\.com$/i;

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

  const cookie = String(env.PIKBO_ACCEPTANCE_SESSION_COOKIE || "").trim();
  assert.ok(
    cookie.length >= 16,
    "PIKBO_ACCEPTANCE_SESSION_COOKIE (operator session) is required in real mode"
  );

  const imagePath = String(env.PIKBO_ACCEPTANCE_IMAGE_PATH || "").trim();
  assert.ok(
    imagePath,
    "PIKBO_ACCEPTANCE_IMAGE_PATH (owned toy image) is required in real mode"
  );

  return {
    baseUrl: url.origin,
    origin: url.origin,
    cookie,
    imagePath,
    skuLabel: String(env.PIKBO_ACCEPTANCE_SKU_LABEL || "operator-one-sku").slice(
      0,
      80
    ),
  };
}

export function buildFixedMomentPayload(inputAssetId, idempotencyKey) {
  assert.ok(
    typeof inputAssetId === "string" && inputAssetId.length >= 8,
    "inputAssetId required"
  );
  assert.ok(
    typeof idempotencyKey === "string" && idempotencyKey.length >= 8,
    "idempotencyKey required"
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
    download: 0,
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
  if (pathname === "/api/generations" || pathname.startsWith("/api/generations/")) {
    return "library";
  }
  if (pathname.startsWith("/api/downloads/")) return "download";
  // Storage signed PUT targets are not Pikbo API paths; track as uploadPut.
  if (pathname.includes("/storage/v1/object/")) return "uploadPut";
  return "other";
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
  return true;
}

export function assertDryRunNoSpend(audit) {
  assert.equal(audit.uploadPrepare, 0, "dry-run must not prepare upload");
  assert.equal(audit.uploadPut, 0, "dry-run must not PUT upload bytes");
  assert.equal(audit.uploadComplete, 0, "dry-run must not complete upload");
  assert.equal(audit.generate, 0, "dry-run must not call /api/generate");
  assert.equal(audit.library, 0, "dry-run must not call Library");
  assert.equal(audit.download, 0, "dry-run must not call download");
  assert.equal(audit.other, 0, "dry-run must not make other network calls");
  assert.equal(audit.total, 0, "dry-run network total must be 0");
  return true;
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
    // Exact allowlisted Preview origin may appear as a gate constant (no cookie/path).
    if (value === PROTECTED_PREVIEW_ORIGIN || value === `${PROTECTED_PREVIEW_ORIGIN}/`) {
      return PROTECTED_PREVIEW_ORIGIN;
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

function createGuardedFetch(allowedOrigin, cookie, audit) {
  return async (input, init = {}) => {
    const rawUrl =
      typeof input === "string" || input instanceof URL
        ? input.toString()
        : input.url;
    const target = new URL(rawUrl);
    const method = String(
      init.method ||
        (typeof input === "object" && input && "method" in input
          ? input.method
          : "GET")
    ).toUpperCase();

    // Only the operator host and its storage signed-PUT origin are allowed.
    // Storage hosts must still be https; reject arbitrary third parties.
    const isOperatorApi = target.origin === allowedOrigin;
    const isStoragePut =
      method === "PUT" &&
      target.protocol === "https:" &&
      (STORAGE_HOST_RE.test(target.hostname) ||
        target.pathname.includes("/storage/v1/object/"));

    if (!isOperatorApi && !isStoragePut) {
      throw new Error(
        `Third-party network request forbidden: ${target.hostname}`
      );
    }
    if (
      isStoragePut &&
      !isOperatorApi &&
      !STORAGE_HOST_RE.test(target.hostname)
    ) {
      throw new Error(`Storage host not allowed: ${target.hostname}`);
    }

    const kind = isOperatorApi
      ? classifyApiPath(target.pathname)
      : "uploadPut";
    audit[kind] = (audit[kind] || 0) + 1;
    audit.total += 1;
    assertOneCallBounds(audit);

    // Never attach cookies to storage PUTs (signed URL is the auth).
    const headers = new Headers(init.headers || {});
    if (isOperatorApi) {
      headers.set("cookie", cookie);
      if (!headers.has("accept")) headers.set("accept", "application/json");
    }

    const response = await fetch(target, { ...init, headers, redirect: "manual" });
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
    imagePath,
    skuLabel,
    fetchImpl,
    now = () => new Date().toISOString(),
  } = options;

  // Defense in depth: never attach a cookie to a non-allowlisted origin even if
  // a caller constructs runRealAcceptance directly in tests or ops scripts.
  assertAllowedAcceptanceOrigin(origin || baseUrl);
  assert.equal(
    new URL(baseUrl).origin,
    PROTECTED_PREVIEW_ORIGIN,
    `Real acceptance baseUrl must be ${PROTECTED_PREVIEW_ORIGIN}`
  );

  const audit = createNetworkAudit();
  const guarded =
    fetchImpl ||
    createGuardedFetch(PROTECTED_PREVIEW_ORIGIN, cookie, audit);

  // If caller injects fetchImpl, still bound their counts when they use audit.
  const track = async (url, init) => {
    if (fetchImpl) {
      const target = new URL(url, PROTECTED_PREVIEW_ORIGIN);
      // Mocks may only target the protected Preview API or storage PUT hosts.
      const method = String(init?.method || "GET").toUpperCase();
      const isStoragePut =
        method === "PUT" &&
        (STORAGE_HOST_RE.test(target.hostname) ||
          target.pathname.includes("/storage/v1/object/"));
      if (target.origin !== PROTECTED_PREVIEW_ORIGIN && !isStoragePut) {
        throw new Error(
          `Third-party network request forbidden: ${target.hostname}`
        );
      }
      const kind = classifyApiPath(target.pathname);
      const finalKind =
        method === "PUT" && !target.pathname.startsWith("/api/")
          ? "uploadPut"
          : kind;
      audit[finalKind] = (audit[finalKind] || 0) + 1;
      audit.total += 1;
      assertOneCallBounds(audit);
      return fetchImpl(url, init);
    }
    return guarded(url, init);
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
  if (prep.state === "pending") {
    assert.ok(
      typeof prep.uploadUrl === "string" && prep.uploadUrl.startsWith("https:"),
      "uploadUrl missing for pending asset"
    );
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

  // 4) Exactly one generate for fixed toy-moment-v1.
  const idempotencyKey = randomUUID();
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

  const jobId = liveCheck.jobId;

  // 5) Library refresh — durable owner row only.
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

  // 6) Owner-only download check (HEAD preferred; fall back to GET without body log).
  let downloadOk = false;
  let downloadStatus = 0;
  if (libraryOk) {
    const downloadUrl = `${baseUrl}/api/downloads/${encodeURIComponent(jobId)}`;
    let downloadRes = await track(downloadUrl, { method: "HEAD" });
    if (downloadRes.status === 405 || downloadRes.status === 501) {
      downloadRes = await track(downloadUrl, {
        method: "GET",
        headers: { range: "bytes=0-0" },
      });
    }
    downloadStatus = downloadRes.status;
    downloadOk = downloadRes.status >= 200 && downloadRes.status < 400;
    // Drain body so sockets close; never log it.
    try {
      await downloadRes.arrayBuffer();
    } catch {
      /* ignore */
    }
  }

  const verdict =
    libraryOk && downloadOk ? "PASS_ONE_SKU_REAL" : "FAIL_POST_GENERATE_CHECKS";

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
      ok: downloadOk,
      httpStatus: downloadStatus,
      ownerOnlyRoute: true,
    },
    spend: {
      confirmed: true,
      generateCalls: audit.generate,
      uploadPrepareCalls: audit.uploadPrepare,
      uploadPutCalls: audit.uploadPut,
      uploadCompleteCalls: audit.uploadComplete,
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
