#!/usr/bin/env node

/**
 * Fail-closed + one-call bounds regression for the private Moment acceptance harness.
 * Uses only mocks / local process spawns — never contacts Provider, Stripe, or production.
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const harnessPath = join(root, "scripts/private-moment-acceptance-harness.mjs");
const source = readFileSync(harnessPath, "utf8");

const {
  SPEND_CONFIRMATION_PHRASE,
  PROTECTED_PREVIEW_ORIGIN,
  FIXED_MOMENT_CONTRACT,
  MAX_GENERATE_CALLS,
  parseMode,
  resolveMode,
  assertRealModeGates,
  assertAllowedAcceptanceOrigin,
  assertLiveGenerateSuccess,
  assertDurableOwnedLibraryRow,
  assertOwnerPrivateDownloadHead,
  assertAnonymousDownloadDenied,
  assertTrustedPrivateInputSignedUploadUrl,
  isTrustedPrivateInputSignedUploadUrl,
  isPrivateStorageSignedDeliveryUrl,
  PRIVATE_INPUT_STORAGE_ORIGIN,
  PRIVATE_INPUT_BUCKET,
  PRIVATE_INPUT_SIGNED_UPLOAD_PATH_PREFIX,
  buildFixedMomentPayload,
  sanitizeEvidence,
  createNetworkAudit,
  assertOneCallBounds,
  assertDryRunNoSpend,
  buildDryRunEvidence,
  classifyApiPath,
  classifyDownloadProbe,
  classifyNetworkRequest,
  runRealAcceptance,
  main,
} = await import(harnessPath);

/** Realistic short-lived private Storage signed delivery URL (generate body). */
const MOCK_SIGNED_DELIVERY_URL =
  "https://lpfvfybkggiugosugfcw.supabase.co/storage/v1/object/sign/pikbo-private-results/owner/job/result.mp4?token=mock-signed-token-do-not-log";

// ── Source contract ──

assert.match(source, /PIKBO_ACCEPTANCE_MODE/);
assert.match(source, /I_UNDERSTAND_ONE_TOY_MOMENT_V1_SPEND/);
assert.match(source, /toy-moment-v1/);
assert.match(source, /street-power-up/);
assert.match(source, /allowProviderSpend:\s*true/);
assert.match(source, /MAX_GENERATE_CALLS\s*=\s*1/);
assert.match(source, /PROTECTED_PREVIEW_ORIGIN/);
assert.match(source, /pikbo-git-codex-private-validation-pi-kbo\.vercel\.app/);
assert.match(source, /assertLiveGenerateSuccess/);
assert.match(source, /assertDurableOwnedLibraryRow/);
assert.match(source, /isPrivateStorageSignedDeliveryUrl/);
assert.match(source, /pikbo-private-results/);
assert.match(source, /LIBRARY_DOWNLOAD_PATH_NOT_GENERATE_CONTRACT/);
assert.match(source, /assertOwnerPrivateDownloadHead/);
assert.match(source, /assertAnonymousDownloadDenied/);
assert.match(source, /assertTrustedPrivateInputSignedUploadUrl/);
assert.match(source, /PRIVATE_INPUT_STORAGE_ORIGIN/);
assert.match(source, /lpfvfybkggiugosugfcw/);
assert.match(source, /upload\/sign\/pikbo-toy-inputs/);
assert.match(source, /UNTRUSTED_UPLOAD_URL/);
assert.match(source, /X-Pikbo-Private-Result|x-pikbo-private-result/);
assert.match(source, /AUTH_REQUIRED/);
assert.match(source, /downloadOwner/);
assert.match(source, /downloadAnonymous/);
assert.match(source, /authMode/);
assert.match(source, /parseMode/);
assert.match(source, /dry-run/);
assert.match(source, /sanitizeEvidence/);
assert.doesNotMatch(source, /STORAGE_HOST_RE/);
assert.doesNotMatch(source, /@fal-ai\/client/);
assert.doesNotMatch(source, /checkout\/sessions/);
assert.doesNotMatch(source, /STRIPE_SECRET_KEY/);
assert.doesNotMatch(source, /FAL_KEY/);
assert.ok(
  source.includes("Production host is forbidden") ||
    source.includes("protected Preview origin"),
  "must document production / hostile host refusal"
);
// CLI catch must not re-call resolveMode (throws again on invalid mode).
const cliTail = source.slice(source.lastIndexOf("if (isCliEntry())"));
assert.match(cliTail, /parseMode\s*\(/);
assert.doesNotMatch(cliTail, /resolveMode\s*\(/);

// ── Mode resolution ──

assert.deepEqual(parseMode({}), { mode: "dry-run", raw: "dry-run" });
assert.equal(resolveMode({}), "dry-run");
assert.equal(resolveMode({ PIKBO_ACCEPTANCE_MODE: "" }), "dry-run");
assert.equal(resolveMode({ PIKBO_ACCEPTANCE_MODE: "dry-run" }), "dry-run");
assert.equal(resolveMode({ PIKBO_ACCEPTANCE_MODE: "REAL" }), "real");
assert.deepEqual(parseMode({ PIKBO_ACCEPTANCE_MODE: "semi-live" }), {
  mode: "invalid",
  raw: "semi-live",
});
assert.throws(() => resolveMode({ PIKBO_ACCEPTANCE_MODE: "semi-live" }));

// ── Origin allowlist (hostile host fail-closed) ──

assert.equal(
  assertAllowedAcceptanceOrigin(PROTECTED_PREVIEW_ORIGIN).origin,
  PROTECTED_PREVIEW_ORIGIN
);
assert.equal(
  assertAllowedAcceptanceOrigin(`${PROTECTED_PREVIEW_ORIGIN}/`).origin,
  PROTECTED_PREVIEW_ORIGIN
);
for (const hostile of [
  "https://untrusted.example",
  "https://evil.vercel.app",
  "https://pikbo.ai",
  "https://www.pikbo.ai",
  "https://pikbo-git-other-branch-pi-kbo.vercel.app",
  "http://pikbo-git-codex-private-validation-pi-kbo.vercel.app",
  "https://user:pass@pikbo-git-codex-private-validation-pi-kbo.vercel.app",
]) {
  assert.throws(
    () => assertAllowedAcceptanceOrigin(hostile),
    /protected Preview origin|https|credentials|Production host/
  );
}

// ── Real-mode gates fail closed ──

assert.throws(
  () => assertRealModeGates({ PIKBO_ACCEPTANCE_MODE: "dry-run" }),
  /only applies in real mode/
);

assert.throws(
  () =>
    assertRealModeGates({
      PIKBO_ACCEPTANCE_MODE: "real",
      PIKBO_CONFIRM_PROVIDER_SPEND: "",
    }),
  /PIKBO_CONFIRM_PROVIDER_SPEND/
);

assert.throws(
  () =>
    assertRealModeGates({
      PIKBO_ACCEPTANCE_MODE: "real",
      PIKBO_CONFIRM_PROVIDER_SPEND: SPEND_CONFIRMATION_PHRASE,
      PIKBO_ACCEPTANCE_BASE_URL: "https://untrusted.example",
      PIKBO_ACCEPTANCE_SESSION_COOKIE: "sb-auth-token=secret-value-here",
      PIKBO_ACCEPTANCE_IMAGE_PATH: "/tmp/toy.jpg",
    }),
  /protected Preview origin/
);

assert.throws(
  () =>
    assertRealModeGates({
      PIKBO_ACCEPTANCE_MODE: "real",
      PIKBO_CONFIRM_PROVIDER_SPEND: SPEND_CONFIRMATION_PHRASE,
      PIKBO_ACCEPTANCE_BASE_URL: "https://pikbo.ai",
      PIKBO_ACCEPTANCE_SESSION_COOKIE: "sb-auth-token=secret-value-here",
      PIKBO_ACCEPTANCE_IMAGE_PATH: "/tmp/toy.jpg",
    }),
  /protected Preview origin|Production host/
);

assert.throws(
  () =>
    assertRealModeGates({
      PIKBO_ACCEPTANCE_MODE: "real",
      PIKBO_CONFIRM_PROVIDER_SPEND: SPEND_CONFIRMATION_PHRASE,
      VERCEL_ENV: "production",
      PIKBO_ACCEPTANCE_BASE_URL: PROTECTED_PREVIEW_ORIGIN,
      PIKBO_ACCEPTANCE_SESSION_COOKIE: "sb-auth-token=secret-value-here",
      PIKBO_ACCEPTANCE_IMAGE_PATH: "/tmp/toy.jpg",
    }),
  /production/
);

assert.throws(
  () =>
    assertRealModeGates({
      PIKBO_ACCEPTANCE_MODE: "real",
      PIKBO_CONFIRM_PROVIDER_SPEND: SPEND_CONFIRMATION_PHRASE,
      PIKBO_ACCEPTANCE_BASE_URL: PROTECTED_PREVIEW_ORIGIN,
      PIKBO_ACCEPTANCE_SESSION_COOKIE: "",
      PIKBO_ACCEPTANCE_IMAGE_PATH: "/tmp/toy.jpg",
    }),
  /SESSION_COOKIE/
);

assert.throws(
  () =>
    assertRealModeGates({
      PIKBO_ACCEPTANCE_MODE: "real",
      PIKBO_CONFIRM_PROVIDER_SPEND: SPEND_CONFIRMATION_PHRASE,
      PIKBO_ACCEPTANCE_BASE_URL: PROTECTED_PREVIEW_ORIGIN,
      PIKBO_ACCEPTANCE_SESSION_COOKIE: "sb-auth-token=secret-value-here",
      PIKBO_ACCEPTANCE_IMAGE_PATH: "",
    }),
  /IMAGE_PATH/
);

const allowedGates = assertRealModeGates({
  PIKBO_ACCEPTANCE_MODE: "real",
  PIKBO_CONFIRM_PROVIDER_SPEND: SPEND_CONFIRMATION_PHRASE,
  PIKBO_ACCEPTANCE_BASE_URL: `${PROTECTED_PREVIEW_ORIGIN}/`,
  PIKBO_ACCEPTANCE_SESSION_COOKIE: "sb-auth-token=secret-value-here",
  PIKBO_ACCEPTANCE_IMAGE_PATH: "/tmp/owned-toy.jpg",
  PIKBO_ACCEPTANCE_SKU_LABEL: "qa-sku-1",
});
assert.equal(allowedGates.origin, PROTECTED_PREVIEW_ORIGIN);
assert.equal(allowedGates.baseUrl, PROTECTED_PREVIEW_ORIGIN);
assert.equal(allowedGates.skuLabel, "qa-sku-1");
assert.equal(
  sanitizeEvidence({ cookie: allowedGates.cookie }).cookie,
  "[redacted]"
);

// ── Fixed payload ──

const payload = buildFixedMomentPayload("asset-aaaaaaaa", "idem-bbbbbbbb");
assert.equal(payload.productContract, "toy-moment-v1");
assert.equal(payload.effect, "street-power-up");
assert.equal(payload.duration, 5);
assert.equal(payload.aspectRatio, "9:16");
assert.equal(payload.model, "seedance-fast");
assert.equal(payload.resolution, "720p");
assert.equal(payload.ownsRights, true);
assert.equal(payload.allowProviderSpend, true);
assert.equal(payload.assetId, "asset-aaaaaaaa");
assert.equal(payload.image, undefined);
assert.equal(FIXED_MOMENT_CONTRACT.productContract, "toy-moment-v1");

// ── Live generate / Library row validators (two-phase URL contract) ──

const jobId = "22222222-2222-4222-8222-222222222222";

assert.equal(isPrivateStorageSignedDeliveryUrl(MOCK_SIGNED_DELIVERY_URL), true);
assert.equal(
  isPrivateStorageSignedDeliveryUrl(`/api/downloads/${jobId}`),
  false
);
assert.equal(
  isPrivateStorageSignedDeliveryUrl("https://queue.fal.run/fal-ai/seedance/x"),
  false
);
assert.equal(
  isPrivateStorageSignedDeliveryUrl("http://lpfvfybkggiugosugfcw.supabase.co/storage/v1/object/sign/pikbo-private-results/x"),
  false
);

// Demo / incomplete flags fail closed.
assert.equal(
  assertLiveGenerateSuccess(
    {
      demo: true,
      processedUpload: false,
      privateResult: false,
      videoUrl: MOCK_SIGNED_DELIVERY_URL,
      jobId,
    },
    true
  ).ok,
  false
);
assert.equal(
  assertLiveGenerateSuccess(
    {
      demo: false,
      processedUpload: false,
      privateResult: true,
      videoUrl: MOCK_SIGNED_DELIVERY_URL,
      jobId,
    },
    true
  ).code,
  "UPLOAD_NOT_PROCESSED"
);
assert.equal(
  assertLiveGenerateSuccess(
    {
      demo: false,
      processedUpload: true,
      privateResult: false,
      videoUrl: MOCK_SIGNED_DELIVERY_URL,
      jobId,
    },
    true
  ).code,
  "PRIVATE_RESULT_REQUIRED"
);
assert.equal(
  assertLiveGenerateSuccess(
    {
      demo: false,
      processedUpload: true,
      privateResult: true,
      videoUrl: "/demos/orbit-dance.mp4",
      jobId,
    },
    true
  ).ok,
  false
);

// Old Library-relative path is NOT the generate contract.
assert.equal(
  assertLiveGenerateSuccess(
    {
      demo: false,
      processedUpload: true,
      privateResult: true,
      videoUrl: `/api/downloads/${jobId}`,
      jobId,
    },
    true
  ).code,
  "LIBRARY_DOWNLOAD_PATH_NOT_GENERATE_CONTRACT"
);

// Provider host and non-HTTPS fail closed.
assert.equal(
  assertLiveGenerateSuccess(
    {
      demo: false,
      processedUpload: true,
      privateResult: true,
      videoUrl: "https://queue.fal.run/fal-ai/seedance/result/xyz",
      jobId,
    },
    true
  ).code,
  "PROVIDER_URL_REJECTED"
);
assert.equal(
  assertLiveGenerateSuccess(
    {
      demo: false,
      processedUpload: true,
      privateResult: true,
      videoUrl:
        "http://lpfvfybkggiugosugfcw.supabase.co/storage/v1/object/sign/pikbo-private-results/x.mp4?token=t",
      jobId,
    },
    true
  ).code,
  "VIDEO_URL_NOT_HTTPS"
);

// Real signed private Storage URL passes; raw URL is not echoed.
const liveOk = assertLiveGenerateSuccess(
  {
    demo: false,
    processedUpload: true,
    privateResult: true,
    uploadIgnored: false,
    videoUrl: MOCK_SIGNED_DELIVERY_URL,
    jobId,
  },
  true
);
assert.equal(liveOk.ok, true);
assert.equal(liveOk.jobId, jobId);
assert.equal(liveOk.hasPrivateSignedDeliveryUrl, true);
assert.equal(Object.hasOwn(liveOk, "videoUrl"), false);

// Library row still requires controlled /api/downloads path.
assert.equal(
  assertDurableOwnedLibraryRow(
    {
      id: jobId,
      status: "succeeded",
      owned: false,
      downloadAllowed: true,
      demo: false,
      videoUrl: `/api/downloads/${jobId}`,
    },
    jobId
  ).reason,
  "owned_not_true"
);
assert.equal(
  assertDurableOwnedLibraryRow(
    {
      id: jobId,
      status: "succeeded",
      owned: true,
      downloadAllowed: true,
      demo: false,
      videoUrl: `/api/downloads/${jobId}`,
    },
    jobId
  ).ok,
  true
);
assert.equal(
  assertDurableOwnedLibraryRow(
    {
      id: jobId,
      status: "succeeded",
      owned: true,
      downloadAllowed: true,
      demo: false,
      videoUrl: MOCK_SIGNED_DELIVERY_URL,
    },
    jobId
  ).reason,
  "videoUrl_not_controlled"
);

// ── Call bounds ──

const audit = createNetworkAudit();
assertDryRunNoSpend(audit);
audit.generate = 1;
assertOneCallBounds(audit);
assert.throws(() => assertOneCallBounds({ ...audit, generate: 2 }));
assert.throws(() =>
  assertOneCallBounds({ ...createNetworkAudit(), uploadPrepare: 2 })
);
assert.throws(() =>
  assertOneCallBounds({ ...createNetworkAudit(), uploadPut: 2 })
);
assert.throws(() =>
  assertOneCallBounds({ ...createNetworkAudit(), uploadComplete: 2 })
);
assert.equal(classifyApiPath("/api/generate"), "generate");
assert.equal(classifyApiPath("/api/assets/upload-url"), "uploadPrepare");
assert.equal(classifyApiPath("/api/assets/complete"), "uploadComplete");
assert.equal(classifyApiPath("/api/generations"), "library");
assert.equal(classifyApiPath("/api/downloads/abc"), "download");
assert.equal(classifyDownloadProbe("/api/downloads/abc", "owner"), "downloadOwner");
assert.equal(
  classifyDownloadProbe("/api/downloads/abc", "anonymous"),
  "downloadAnonymous"
);
assert.equal(MAX_GENERATE_CALLS, 1);

// ── Owner private HEAD + anonymous denial validators ──

function mockHeadResponse(status, headers) {
  return {
    status,
    headers: {
      get(name) {
        const key = Object.keys(headers).find(
          (k) => k.toLowerCase() === name.toLowerCase()
        );
        return key ? headers[key] : null;
      },
    },
  };
}

assert.equal(
  assertOwnerPrivateDownloadHead(
    mockHeadResponse(200, {
      "X-Pikbo-Download": "allowed",
      "X-Pikbo-Private-Result": "1",
    })
  ).ok,
  true
);
assert.equal(
  assertOwnerPrivateDownloadHead(
    mockHeadResponse(200, { "X-Pikbo-Download": "allowed" })
  ).reason,
  "owner_private_result_marker_missing"
);
assert.equal(
  assertOwnerPrivateDownloadHead(mockHeadResponse(302, {})).reason,
  "owner_redirect_not_allowed"
);
assert.equal(
  assertOwnerPrivateDownloadHead(
    mockHeadResponse(200, { "X-Pikbo-Download": "blocked" })
  ).reason,
  "owner_download_not_allowed"
);

assert.equal(
  assertAnonymousDownloadDenied(
    mockHeadResponse(401, { "X-Pikbo-Download-Code": "AUTH_REQUIRED" })
  ).ok,
  true
);
assert.equal(
  assertAnonymousDownloadDenied(mockHeadResponse(200, {})).reason,
  "anonymous_public_access"
);
assert.equal(
  assertAnonymousDownloadDenied(mockHeadResponse(302, {})).reason,
  "anonymous_public_access"
);
assert.equal(
  assertAnonymousDownloadDenied(
    mockHeadResponse(401, { "X-Pikbo-Download-Code": "NOT_FOUND" })
  ).reason,
  "anonymous_code_not_auth_required"
);

// ── Trusted private-input signed upload URL gate ──

assert.equal(
  PRIVATE_INPUT_STORAGE_ORIGIN,
  "https://lpfvfybkggiugosugfcw.supabase.co"
);
assert.equal(PRIVATE_INPUT_BUCKET, "pikbo-toy-inputs");
assert.equal(
  PRIVATE_INPUT_SIGNED_UPLOAD_PATH_PREFIX,
  "/storage/v1/object/upload/sign/pikbo-toy-inputs/"
);
const trustedUploadUrl = `${PRIVATE_INPUT_STORAGE_ORIGIN}${PRIVATE_INPUT_SIGNED_UPLOAD_PATH_PREFIX}owner/key.webp`;
assert.equal(
  assertTrustedPrivateInputSignedUploadUrl(trustedUploadUrl).bucket,
  "pikbo-toy-inputs"
);
assert.equal(isTrustedPrivateInputSignedUploadUrl(trustedUploadUrl), true);
assert.equal(classifyNetworkRequest(trustedUploadUrl, "PUT"), "uploadPut");

const rejectedUploadUrls = [
  "https://otherproject.supabase.co/storage/v1/object/upload/sign/pikbo-toy-inputs/x",
  "https://queue.fal.run/storage/v1/object/upload/sign/pikbo-toy-inputs/x",
  "https://storage.googleapis.com/storage/v1/object/upload/sign/pikbo-toy-inputs/x",
  "https://lpfvfybkggiugosugfcw.supabase.co/storage/v1/object/sign/pikbo-toy-inputs/x",
  "https://lpfvfybkggiugosugfcw.supabase.co/storage/v1/object/upload/sign/pikbo-private-results/x",
  "https://lpfvfybkggiugosugfcw.supabase.co/storage/v1/object/pikbo-toy-inputs/x",
  "https://lpfvfybkggiugosugfcw.supabase.co/storage/v1/object/upload/sign/pikbo-toy-inputs-shadow/x",
  "http://lpfvfybkggiugosugfcw.supabase.co/storage/v1/object/upload/sign/pikbo-toy-inputs/x",
  "https://user:pass@lpfvfybkggiugosugfcw.supabase.co/storage/v1/object/upload/sign/pikbo-toy-inputs/x",
  "https://lpfvfybkggiugosugfcw.supabase.co:444/storage/v1/object/upload/sign/pikbo-toy-inputs/x",
  "https://lpfvfybkggiugosugfcw.supabase.co/storage/v1/object/upload/sign/pikbo-toy-inputs/../evil",
];
for (const bad of rejectedUploadUrls) {
  assert.equal(
    isTrustedPrivateInputSignedUploadUrl(bad),
    false,
    `must reject untrusted upload URL`
  );
  assert.throws(() => assertTrustedPrivateInputSignedUploadUrl(bad));
  assert.throws(() => classifyNetworkRequest(bad, "PUT"));
}

// ── Sanitizer ──

const dirty = {
  cookie: "sb-xxxx-auth-token=eyJhbGciOiJIUzI1NiJ9.abc.def",
  email: "owner@example.com",
  signedUrl:
    "https://lpfvfybkggiugosugfcw.supabase.co/storage/v1/object/sign/pikbo-toy-inputs/user/abc?token=secret",
  objectKey: "user/owner-id/inputs/file.webp",
  providerUrl: "https://queue.fal.run/fal-ai/seedance/result/xyz",
  providerModel: "fal-ai/bytedance/seedance/v1/pro",
  videoUrl: `/api/downloads/${jobId}`,
  generateVideoUrl: MOCK_SIGNED_DELIVERY_URL,
  safeCount: 1,
  nested: { authorization: "Bearer secret", note: "ok" },
};
const clean = sanitizeEvidence(dirty);
assert.equal(clean.cookie, "[redacted]");
assert.equal(clean.email, "[redacted]");
assert.equal(clean.signedUrl, "[redacted]");
assert.equal(clean.objectKey, "[redacted]");
assert.equal(clean.providerUrl, "[redacted]");
assert.equal(clean.providerModel, "[redacted]");
assert.equal(clean.videoUrl, "/api/downloads/[job]");
// Short-lived signed delivery URL must never appear verbatim in evidence.
assert.notEqual(clean.generateVideoUrl, MOCK_SIGNED_DELIVERY_URL);
assert.doesNotMatch(JSON.stringify(clean), /mock-signed-token-do-not-log/);
assert.doesNotMatch(JSON.stringify(clean), /token=mock/);
assert.equal(clean.safeCount, 1);
assert.equal(clean.nested.authorization, "[redacted]");
assert.equal(clean.nested.note, "ok");

const dryEvidence = buildDryRunEvidence();
assert.equal(dryEvidence.mode, "dry-run");
assert.equal(dryEvidence.spend.providerCalls, 0);
assert.equal(dryEvidence.verdict, "PASS_DRY_RUN_NO_SPEND");
assert.equal(dryEvidence.gates.allowedOrigin, PROTECTED_PREVIEW_ORIGIN);
assert.equal(
  dryEvidence.gates.privateInputStorageOrigin,
  PRIVATE_INPUT_STORAGE_ORIGIN
);
assert.equal(dryEvidence.gates.privateInputBucket, PRIVATE_INPUT_BUCKET);
assertDryRunNoSpend(dryEvidence.network);

// ── Mock helpers ──

const tmp = mkdtempSync(join(tmpdir(), "pikbo-moment-accept-"));
const imagePath = join(tmp, "owned-toy.png");
const png = Buffer.alloc(64, 0);
png[0] = 0x89;
png[1] = 0x50;
png[2] = 0x4e;
png[3] = 0x47;
writeFileSync(imagePath, png);

const assetId = "33333333-3333-4333-8333-333333333333";
const MOCK_TRUSTED_UPLOAD_URL = `${PRIVATE_INPUT_STORAGE_ORIGIN}${PRIVATE_INPUT_SIGNED_UPLOAD_PATH_PREFIX}${assetId}/input.webp`;

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function requestHasCookie(init) {
  const headers = init?.headers;
  if (!headers) return false;
  if (typeof headers.get === "function") {
    return Boolean(headers.get("cookie") || headers.get("Cookie"));
  }
  return Boolean(headers.cookie || headers.Cookie || headers.authorization);
}

function makePassingMock({
  pendingUpload = false,
  ownerHead = "ok",
  anonymousHead = "deny",
  pendingUploadUrl = MOCK_TRUSTED_UPLOAD_URL,
} = {}) {
  const counts = {
    uploadPrepare: 0,
    uploadPut: 0,
    uploadComplete: 0,
    generate: 0,
    library: 0,
    downloadOwner: 0,
    downloadAnonymous: 0,
    anonymousHadCookie: false,
    uploadPutHadCookie: false,
  };
  const mockFetch = async (url, init = {}) => {
    const target = new URL(String(url), PROTECTED_PREVIEW_ORIGIN);
    const method = String(init.method || "GET").toUpperCase();
    const authMode = init.authMode === "anonymous" ? "anonymous" : "owner";

    if (target.pathname === "/api/assets/upload-url" && method === "POST") {
      counts.uploadPrepare += 1;
      assert.ok(counts.uploadPrepare <= 1, "upload-url bound");
      if (pendingUpload) {
        return jsonResponse(201, {
          ok: true,
          assetId,
          inputAssetId: assetId,
          state: "pending",
          uploadUrl: pendingUploadUrl,
          idempotent: false,
        });
      }
      return jsonResponse(201, {
        ok: true,
        assetId,
        inputAssetId: assetId,
        state: "ready",
        uploadUrl: null,
        idempotent: false,
      });
    }
    if (method === "PUT") {
      // Only trusted signed-upload URLs should reach here (gate runs first).
      assert.equal(
        isTrustedPrivateInputSignedUploadUrl(String(url)),
        true,
        "PUT must only reach mock with trusted upload URL"
      );
      counts.uploadPut += 1;
      if (requestHasCookie(init)) counts.uploadPutHadCookie = true;
      assert.equal(
        requestHasCookie(init),
        false,
        "storage PUT must never carry cookie/authorization"
      );
      assert.ok(counts.uploadPut <= 1, "upload PUT bound");
      return new Response(null, { status: 200 });
    }
    if (target.pathname === "/api/assets/complete") {
      counts.uploadComplete += 1;
      assert.ok(counts.uploadComplete <= 1, "upload complete bound");
      return jsonResponse(200, {
        ok: true,
        inputAssetId: assetId,
        asset: { id: assetId, state: "ready" },
      });
    }
    if (target.pathname === "/api/generate" && method === "POST") {
      counts.generate += 1;
      assert.ok(counts.generate <= 1, "generate bound");
      const body = JSON.parse(String(init.body || "{}"));
      assert.equal(body.productContract, "toy-moment-v1");
      assert.equal(body.effect, "street-power-up");
      assert.equal(body.duration, 5);
      assert.equal(body.aspectRatio, "9:16");
      assert.equal(body.model, "seedance-fast");
      assert.equal(body.resolution, "720p");
      assert.equal(body.ownsRights, true);
      assert.equal(body.allowProviderSpend, true);
      assert.equal(body.assetId, assetId);
      assert.equal(body.image, undefined);
      return jsonResponse(200, {
        ok: true,
        jobId,
        requestId: jobId,
        // Real generate contract: short-lived private Storage signed HTTPS URL.
        videoUrl: MOCK_SIGNED_DELIVERY_URL,
        demo: false,
        processedUpload: true,
        privateResult: true,
        cookie: "should-not-leak",
        email: "owner@example.com",
        providerUrl: "https://queue.fal.run/secret",
        objectKey: "user/secret/out.mp4",
      });
    }
    if (target.pathname === "/api/generations" && method === "GET") {
      counts.library += 1;
      return jsonResponse(200, {
        ok: true,
        durable: true,
        mode: "supabase-private+process-memory",
        jobs: [
          {
            id: jobId,
            requestId: jobId,
            status: "succeeded",
            owned: true,
            downloadAllowed: true,
            demo: false,
            videoUrl: `/api/downloads/${jobId}`,
          },
        ],
      });
    }
    if (target.pathname === `/api/downloads/${jobId}` && method === "HEAD") {
      if (authMode === "anonymous") {
        counts.downloadAnonymous += 1;
        if (requestHasCookie(init)) counts.anonymousHadCookie = true;
        assert.equal(
          requestHasCookie(init),
          false,
          "anonymous download probe must not carry cookie"
        );
        if (anonymousHead === "public200") {
          return new Response(null, {
            status: 200,
            headers: {
              "X-Pikbo-Download": "allowed",
              "X-Pikbo-Private-Result": "1",
            },
          });
        }
        if (anonymousHead === "public302") {
          return new Response(null, {
            status: 302,
            headers: {
              Location: MOCK_SIGNED_DELIVERY_URL,
            },
          });
        }
        return new Response(null, {
          status: 401,
          headers: {
            "X-Pikbo-Download": "blocked",
            "X-Pikbo-Download-Code": "AUTH_REQUIRED",
            "Cache-Control": "private, no-store",
          },
        });
      }
      counts.downloadOwner += 1;
      assert.equal(requestHasCookie(init), true, "owner HEAD needs cookie");
      if (ownerHead === "missingMarker") {
        return new Response(null, {
          status: 200,
          headers: {
            "X-Pikbo-Download": "allowed",
            // Missing X-Pikbo-Private-Result
            "X-Pikbo-Demo": "0",
          },
        });
      }
      if (ownerHead === "redirect") {
        return new Response(null, {
          status: 302,
          headers: { Location: MOCK_SIGNED_DELIVERY_URL },
        });
      }
      return new Response(null, {
        status: 200,
        headers: {
          "X-Pikbo-Download": "allowed",
          "X-Pikbo-Demo": "0",
          "X-Pikbo-Watermark": "0",
          "X-Pikbo-Private-Result": "1",
          "Cache-Control": "private, no-store",
        },
      });
    }
    throw new Error(`unexpected mock URL ${target.pathname} ${method}`);
  };
  return { mockFetch, counts };
}

// ── Mocked real path: exact non-demo private PASS ──

{
  const { mockFetch, counts } = makePassingMock({ pendingUpload: false });
  const realEvidence = await runRealAcceptance({
    baseUrl: PROTECTED_PREVIEW_ORIGIN,
    origin: PROTECTED_PREVIEW_ORIGIN,
    cookie: "sb-auth-token=super-secret-session",
    imagePath,
    skuLabel: "mock-sku",
    fetchImpl: mockFetch,
    now: () => "2026-08-05T00:00:00.000Z",
  });
  assert.equal(realEvidence.verdict, "PASS_ONE_SKU_REAL");
  assert.equal(realEvidence.mode, "real");
  assert.equal(realEvidence.generate.hasPrivateSignedDeliveryUrl, true);
  assert.equal(realEvidence.library.downloadPathControlled, true);
  assert.equal(realEvidence.download.ownerOnlyProven, true);
  assert.equal(realEvidence.download.owner.ok, true);
  assert.equal(realEvidence.download.owner.httpStatus, 200);
  assert.equal(realEvidence.download.owner.privateResultMarker, true);
  assert.equal(realEvidence.download.anonymous.ok, true);
  assert.equal(realEvidence.download.anonymous.httpStatus, 401);
  assert.equal(realEvidence.download.anonymous.downloadCode, "AUTH_REQUIRED");
  assert.equal(realEvidence.spend.generateCalls, 1);
  assert.equal(realEvidence.spend.uploadPrepareCalls, 1);
  assert.equal(realEvidence.spend.uploadPutCalls, 0);
  assert.equal(realEvidence.spend.uploadCompleteCalls, 1);
  assert.equal(realEvidence.network.downloadOwner, 1);
  assert.equal(realEvidence.network.downloadAnonymous, 1);
  assert.equal(counts.generate, 1);
  assert.equal(counts.uploadPrepare, 1);
  assert.equal(counts.uploadPut, 0);
  assert.equal(counts.uploadComplete, 1);
  assert.equal(counts.downloadOwner, 1);
  assert.equal(counts.downloadAnonymous, 1);
  assert.equal(counts.anonymousHadCookie, false);
  const realJson = JSON.stringify(realEvidence);
  assert.doesNotMatch(realJson, /super-secret-session/);
  assert.doesNotMatch(realJson, /owner@example\.com/);
  assert.doesNotMatch(realJson, /queue\.fal\.run/);
  assert.doesNotMatch(realJson, /user\/secret/);
  assert.doesNotMatch(realJson, /should-not-leak/);
  assert.doesNotMatch(realJson, /mock-signed-token-do-not-log/);
  assert.doesNotMatch(realJson, /token=mock/);
  assert.doesNotMatch(realJson, /pikbo-private-results\/owner/);
}

// ── Pending upload path: prepare + PUT + complete each once ──

{
  const { mockFetch, counts } = makePassingMock({ pendingUpload: true });
  const pendingEvidence = await runRealAcceptance({
    baseUrl: PROTECTED_PREVIEW_ORIGIN,
    origin: PROTECTED_PREVIEW_ORIGIN,
    cookie: "sb-auth-token=super-secret-session",
    imagePath,
    skuLabel: "mock-sku-pending",
    fetchImpl: mockFetch,
    now: () => "2026-08-05T00:00:00.000Z",
  });
  assert.equal(pendingEvidence.verdict, "PASS_ONE_SKU_REAL");
  assert.equal(pendingEvidence.download.ownerOnlyProven, true);
  assert.equal(pendingEvidence.spend.uploadPrepareCalls, 1);
  assert.equal(pendingEvidence.spend.uploadPutCalls, 1);
  assert.equal(pendingEvidence.spend.uploadCompleteCalls, 1);
  assert.equal(pendingEvidence.spend.generateCalls, 1);
  assert.equal(counts.uploadPrepare, 1);
  assert.equal(counts.uploadPut, 1);
  assert.equal(counts.uploadComplete, 1);
  assert.equal(counts.generate, 1);
  assert.equal(counts.downloadOwner, 1);
  assert.equal(counts.downloadAnonymous, 1);
  assert.equal(counts.anonymousHadCookie, false);
  assert.equal(counts.uploadPutHadCookie, false);
}

// ── Untrusted pending upload URL rejected before PUT/generate ──

for (const [label, badUrl] of [
  [
    "other-supabase-project",
    "https://otherproject.supabase.co/storage/v1/object/upload/sign/pikbo-toy-inputs/x",
  ],
  [
    "fal-host",
    "https://queue.fal.run/storage/v1/object/upload/sign/pikbo-toy-inputs/x",
  ],
  [
    "googleapis-host",
    "https://storage.googleapis.com/storage/v1/object/upload/sign/pikbo-toy-inputs/x",
  ],
  [
    "lookalike-sign-path",
    "https://lpfvfybkggiugosugfcw.supabase.co/storage/v1/object/sign/pikbo-toy-inputs/x",
  ],
  [
    "wrong-bucket",
    "https://lpfvfybkggiugosugfcw.supabase.co/storage/v1/object/upload/sign/pikbo-private-results/x",
  ],
  [
    "http-scheme",
    "http://lpfvfybkggiugosugfcw.supabase.co/storage/v1/object/upload/sign/pikbo-toy-inputs/x",
  ],
  [
    "credential-url",
    "https://user:pass@lpfvfybkggiugosugfcw.supabase.co/storage/v1/object/upload/sign/pikbo-toy-inputs/x",
  ],
]) {
  const { mockFetch, counts } = makePassingMock({
    pendingUpload: true,
    pendingUploadUrl: badUrl,
  });
  const rejected = await runRealAcceptance({
    baseUrl: PROTECTED_PREVIEW_ORIGIN,
    origin: PROTECTED_PREVIEW_ORIGIN,
    cookie: "sb-auth-token=super-secret-session",
    imagePath,
    skuLabel: `untrusted-${label}`,
    fetchImpl: mockFetch,
    now: () => "2026-08-05T00:00:00.000Z",
  });
  assert.equal(rejected.verdict, "FAIL", label);
  assert.equal(rejected.stage, "upload-put-url-gate", label);
  assert.equal(rejected.code, "UNTRUSTED_UPLOAD_URL", label);
  assert.equal(rejected.spend.generateCalls, 0, label);
  assert.equal(rejected.spend.uploadPutCalls, 0, label);
  assert.equal(counts.uploadPut, 0, label);
  assert.equal(counts.generate, 0, label);
  assert.doesNotMatch(JSON.stringify(rejected), /token=|user:pass|queue\.fal/);
}

// ── Anonymous public 200 fails owner-only proof ──

{
  const { mockFetch, counts } = makePassingMock({ anonymousHead: "public200" });
  const open = await runRealAcceptance({
    baseUrl: PROTECTED_PREVIEW_ORIGIN,
    origin: PROTECTED_PREVIEW_ORIGIN,
    cookie: "sb-auth-token=super-secret-session",
    imagePath,
    skuLabel: "anon-open-200",
    fetchImpl: mockFetch,
    now: () => "2026-08-05T00:00:00.000Z",
  });
  assert.equal(open.verdict, "FAIL_POST_GENERATE_CHECKS");
  assert.equal(open.download.owner.ok, true);
  assert.equal(open.download.anonymous.ok, false);
  assert.equal(open.download.anonymous.reason, "anonymous_public_access");
  assert.equal(open.download.ownerOnlyProven, false);
  assert.equal(counts.anonymousHadCookie, false);
  assert.equal(counts.generate, 1);
}

// ── Anonymous public 302 fails owner-only proof ──

{
  const { mockFetch } = makePassingMock({ anonymousHead: "public302" });
  const open = await runRealAcceptance({
    baseUrl: PROTECTED_PREVIEW_ORIGIN,
    origin: PROTECTED_PREVIEW_ORIGIN,
    cookie: "sb-auth-token=super-secret-session",
    imagePath,
    skuLabel: "anon-open-302",
    fetchImpl: mockFetch,
    now: () => "2026-08-05T00:00:00.000Z",
  });
  assert.equal(open.verdict, "FAIL_POST_GENERATE_CHECKS");
  assert.equal(open.download.anonymous.ok, false);
  assert.equal(open.download.anonymous.reason, "anonymous_public_access");
  assert.doesNotMatch(JSON.stringify(open), /mock-signed-token/);
}

// ── Owner HEAD missing private marker fails ──

{
  const { mockFetch } = makePassingMock({ ownerHead: "missingMarker" });
  const missing = await runRealAcceptance({
    baseUrl: PROTECTED_PREVIEW_ORIGIN,
    origin: PROTECTED_PREVIEW_ORIGIN,
    cookie: "sb-auth-token=super-secret-session",
    imagePath,
    skuLabel: "owner-marker-missing",
    fetchImpl: mockFetch,
    now: () => "2026-08-05T00:00:00.000Z",
  });
  assert.equal(missing.verdict, "FAIL_POST_GENERATE_CHECKS");
  assert.equal(missing.download.owner.ok, false);
  assert.equal(
    missing.download.owner.reason,
    "owner_private_result_marker_missing"
  );
  assert.equal(missing.download.ownerOnlyProven, false);
}

// ── Cached/demo false-positive must NOT PASS ──

{
  const mockFetch = async (url, init = {}) => {
    const target = new URL(String(url), PROTECTED_PREVIEW_ORIGIN);
    const method = String(init.method || "GET").toUpperCase();
    if (target.pathname === "/api/assets/upload-url") {
      return jsonResponse(201, {
        ok: true,
        assetId,
        inputAssetId: assetId,
        state: "ready",
        uploadUrl: null,
      });
    }
    if (target.pathname === "/api/assets/complete") {
      return jsonResponse(200, {
        ok: true,
        inputAssetId: assetId,
        asset: { id: assetId, state: "ready" },
      });
    }
    if (target.pathname === "/api/generate" && method === "POST") {
      return jsonResponse(200, {
        ok: true,
        jobId,
        requestId: jobId,
        videoUrl: MOCK_SIGNED_DELIVERY_URL,
        demo: true,
        processedUpload: false,
        privateResult: false,
        owned: false,
      });
    }
    throw new Error(`unexpected path in demo mock: ${target.pathname}`);
  };
  const demoEvidence = await runRealAcceptance({
    baseUrl: PROTECTED_PREVIEW_ORIGIN,
    origin: PROTECTED_PREVIEW_ORIGIN,
    cookie: "sb-auth-token=super-secret-session",
    imagePath,
    skuLabel: "demo-reject",
    fetchImpl: mockFetch,
    now: () => "2026-08-05T00:00:00.000Z",
  });
  assert.notEqual(demoEvidence.verdict, "PASS_ONE_SKU_REAL");
  assert.equal(demoEvidence.verdict, "FAIL");
  assert.equal(demoEvidence.stage, "generate");
  assert.equal(demoEvidence.code, "DEMO_RESULT_REJECTED");
}

// ── Old /api/downloads generate body is NOT the live contract ──

{
  const mockFetch = async (url, init = {}) => {
    const target = new URL(String(url), PROTECTED_PREVIEW_ORIGIN);
    const method = String(init.method || "GET").toUpperCase();
    if (target.pathname === "/api/assets/upload-url") {
      return jsonResponse(201, {
        ok: true,
        assetId,
        inputAssetId: assetId,
        state: "ready",
      });
    }
    if (target.pathname === "/api/assets/complete") {
      return jsonResponse(200, {
        ok: true,
        inputAssetId: assetId,
        asset: { id: assetId, state: "ready" },
      });
    }
    if (target.pathname === "/api/generate" && method === "POST") {
      return jsonResponse(200, {
        ok: true,
        jobId,
        requestId: jobId,
        // Legacy false immediate contract — must fail generate gate.
        videoUrl: `/api/downloads/${jobId}`,
        demo: false,
        processedUpload: true,
        privateResult: true,
      });
    }
    throw new Error(`unexpected path in library-path generate mock: ${target.pathname}`);
  };
  const legacy = await runRealAcceptance({
    baseUrl: PROTECTED_PREVIEW_ORIGIN,
    origin: PROTECTED_PREVIEW_ORIGIN,
    cookie: "sb-auth-token=super-secret-session",
    imagePath,
    skuLabel: "legacy-path-reject",
    fetchImpl: mockFetch,
    now: () => "2026-08-05T00:00:00.000Z",
  });
  assert.equal(legacy.verdict, "FAIL");
  assert.equal(legacy.stage, "generate");
  assert.equal(legacy.code, "LIBRARY_DOWNLOAD_PATH_NOT_GENERATE_CONTRACT");
}

// ── Provider host on generate videoUrl must NOT PASS ──

{
  const mockFetch = async (url, init = {}) => {
    const target = new URL(String(url), PROTECTED_PREVIEW_ORIGIN);
    const method = String(init.method || "GET").toUpperCase();
    if (target.pathname === "/api/assets/upload-url") {
      return jsonResponse(201, {
        ok: true,
        assetId,
        inputAssetId: assetId,
        state: "ready",
      });
    }
    if (target.pathname === "/api/assets/complete") {
      return jsonResponse(200, {
        ok: true,
        inputAssetId: assetId,
        asset: { id: assetId, state: "ready" },
      });
    }
    if (target.pathname === "/api/generate" && method === "POST") {
      return jsonResponse(200, {
        ok: true,
        jobId,
        requestId: jobId,
        videoUrl: "https://queue.fal.run/fal-ai/seedance/result/xyz",
        demo: false,
        processedUpload: true,
        privateResult: true,
      });
    }
    throw new Error(`unexpected path in provider-url mock: ${target.pathname}`);
  };
  const providerLeak = await runRealAcceptance({
    baseUrl: PROTECTED_PREVIEW_ORIGIN,
    origin: PROTECTED_PREVIEW_ORIGIN,
    cookie: "sb-auth-token=super-secret-session",
    imagePath,
    skuLabel: "provider-url-reject",
    fetchImpl: mockFetch,
    now: () => "2026-08-05T00:00:00.000Z",
  });
  assert.equal(providerLeak.verdict, "FAIL");
  assert.equal(providerLeak.stage, "generate");
  assert.equal(providerLeak.code, "PROVIDER_URL_REJECTED");
  assert.doesNotMatch(JSON.stringify(providerLeak), /queue\.fal\.run/);
}

// ── Non-owned Library row must NOT PASS ──

{
  const mockFetch = async (url, init = {}) => {
    const target = new URL(String(url), PROTECTED_PREVIEW_ORIGIN);
    const method = String(init.method || "GET").toUpperCase();
    if (target.pathname === "/api/assets/upload-url") {
      return jsonResponse(201, {
        ok: true,
        assetId,
        inputAssetId: assetId,
        state: "ready",
      });
    }
    if (target.pathname === "/api/assets/complete") {
      return jsonResponse(200, {
        ok: true,
        inputAssetId: assetId,
        asset: { id: assetId, state: "ready" },
      });
    }
    if (target.pathname === "/api/generate" && method === "POST") {
      return jsonResponse(200, {
        ok: true,
        jobId,
        requestId: jobId,
        videoUrl: MOCK_SIGNED_DELIVERY_URL,
        demo: false,
        processedUpload: true,
        privateResult: true,
      });
    }
    if (target.pathname === "/api/generations") {
      return jsonResponse(200, {
        ok: true,
        durable: true,
        mode: "supabase-private+process-memory",
        jobs: [
          {
            id: jobId,
            status: "succeeded",
            owned: false,
            downloadAllowed: true,
            demo: false,
            videoUrl: `/api/downloads/${jobId}`,
          },
        ],
      });
    }
    throw new Error(`unexpected path in owned-false mock: ${target.pathname}`);
  };
  const unowned = await runRealAcceptance({
    baseUrl: PROTECTED_PREVIEW_ORIGIN,
    origin: PROTECTED_PREVIEW_ORIGIN,
    cookie: "sb-auth-token=super-secret-session",
    imagePath,
    skuLabel: "unowned-reject",
    fetchImpl: mockFetch,
    now: () => "2026-08-05T00:00:00.000Z",
  });
  assert.equal(unowned.verdict, "FAIL_POST_GENERATE_CHECKS");
  assert.equal(unowned.library.owned, false);
}

// ── Hostile origin rejected even when calling runRealAcceptance directly ──

await assert.rejects(
  () =>
    runRealAcceptance({
      baseUrl: "https://untrusted.example",
      origin: "https://untrusted.example",
      cookie: "sb-auth-token=super-secret-session",
      imagePath,
      skuLabel: "hostile",
      fetchImpl: async () => {
        throw new Error("fetch must not run for hostile host");
      },
    }),
  /protected Preview origin/
);

// ── CLI dry-run / fail-closed ──

function runCli(env) {
  return spawnSync(process.execPath, [harnessPath], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

const dryCli = runCli({
  PIKBO_ACCEPTANCE_MODE: "dry-run",
  PIKBO_ACCEPTANCE_SESSION_COOKIE: "sb-auth-token=must-not-print",
  PIKBO_CONFIRM_PROVIDER_SPEND: SPEND_CONFIRMATION_PHRASE,
  FAL_KEY: "should-be-ignored",
});
assert.equal(dryCli.status, 0, dryCli.stderr || dryCli.stdout);
assert.match(dryCli.stdout, /PASS_DRY_RUN_NO_SPEND/);
assert.doesNotMatch(dryCli.stdout, /must-not-print/);

const realClosed = runCli({
  PIKBO_ACCEPTANCE_MODE: "real",
  PIKBO_CONFIRM_PROVIDER_SPEND: "",
  PIKBO_ACCEPTANCE_BASE_URL: PROTECTED_PREVIEW_ORIGIN,
  PIKBO_ACCEPTANCE_SESSION_COOKIE: "sb-auth-token=must-not-print",
  PIKBO_ACCEPTANCE_IMAGE_PATH: imagePath,
});
assert.notEqual(realClosed.status, 0);
assert.match(
  `${realClosed.stdout}\n${realClosed.stderr}`,
  /PIKBO_CONFIRM_PROVIDER_SPEND|FAIL_EXCEPTION/
);
assert.doesNotMatch(
  `${realClosed.stdout}\n${realClosed.stderr}`,
  /must-not-print/
);

const hostileCli = runCli({
  PIKBO_ACCEPTANCE_MODE: "real",
  PIKBO_CONFIRM_PROVIDER_SPEND: SPEND_CONFIRMATION_PHRASE,
  PIKBO_ACCEPTANCE_BASE_URL: "https://untrusted.example",
  PIKBO_ACCEPTANCE_SESSION_COOKIE: "sb-auth-token=must-not-print",
  PIKBO_ACCEPTANCE_IMAGE_PATH: imagePath,
});
assert.notEqual(hostileCli.status, 0);
assert.match(
  `${hostileCli.stdout}\n${hostileCli.stderr}`,
  /protected Preview origin|FAIL_EXCEPTION/
);
assert.doesNotMatch(
  `${hostileCli.stdout}\n${hostileCli.stderr}`,
  /must-not-print/
);

// Invalid mode: sanitized FAIL without double-throw / cookie leak.
const invalidModeCli = runCli({
  PIKBO_ACCEPTANCE_MODE: "semi-live",
  PIKBO_ACCEPTANCE_SESSION_COOKIE: "sb-auth-token=must-not-print",
});
assert.notEqual(invalidModeCli.status, 0);
assert.match(
  `${invalidModeCli.stdout}\n${invalidModeCli.stderr}`,
  /FAIL_INVALID_MODE|must be dry-run/
);
assert.doesNotMatch(
  `${invalidModeCli.stdout}\n${invalidModeCli.stderr}`,
  /must-not-print/
);
// Single structured failure — not an uncaught second parser throw.
assert.doesNotMatch(
  `${invalidModeCli.stdout}\n${invalidModeCli.stderr}`,
  /Unhandled|ERR_UNHANDLED/
);

const mainResult = await main({ PIKBO_ACCEPTANCE_MODE: "dry-run" });
assert.equal(mainResult.mode, "dry-run");
assert.equal(mainResult.evidence.verdict, "PASS_DRY_RUN_NO_SPEND");

const invalidMain = await main({ PIKBO_ACCEPTANCE_MODE: "semi-live" });
assert.equal(invalidMain.mode, "invalid");
assert.equal(invalidMain.evidence.verdict, "FAIL_INVALID_MODE");

rmSync(tmp, { recursive: true, force: true });

console.log(
  "private-moment-acceptance-harness-regression: PASS (trusted upload URL · dual download probe · anonymous denial · demo/provider reject · one-call bounds · sanitized evidence)"
);
