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
  FIXED_MOMENT_CONTRACT,
  MAX_GENERATE_CALLS,
  resolveMode,
  assertRealModeGates,
  buildFixedMomentPayload,
  sanitizeEvidence,
  createNetworkAudit,
  assertOneCallBounds,
  assertDryRunNoSpend,
  buildDryRunEvidence,
  classifyApiPath,
  runRealAcceptance,
  main,
} = await import(harnessPath);

// ── Source contract (no paid routes accidentally hardcoded as always-on) ──

assert.match(source, /PIKBO_ACCEPTANCE_MODE/);
assert.match(source, /I_UNDERSTAND_ONE_TOY_MOMENT_V1_SPEND/);
assert.match(source, /toy-moment-v1/);
assert.match(source, /street-power-up/);
assert.match(source, /allowProviderSpend:\s*true/);
assert.match(source, /MAX_GENERATE_CALLS\s*=\s*1/);
assert.match(source, /dry-run/);
assert.match(source, /sanitizeEvidence/);
assert.doesNotMatch(source, /@fal-ai\/client/);
assert.doesNotMatch(source, /checkout\/sessions/);
assert.doesNotMatch(source, /STRIPE_SECRET_KEY/);
assert.doesNotMatch(source, /FAL_KEY/);
assert.ok(
  source.includes("Production host is forbidden") ||
    source.includes("production host is forbidden"),
  "must refuse production host"
);

// ── Mode resolution ──

assert.equal(resolveMode({}), "dry-run");
assert.equal(resolveMode({ PIKBO_ACCEPTANCE_MODE: "" }), "dry-run");
assert.equal(resolveMode({ PIKBO_ACCEPTANCE_MODE: "dry-run" }), "dry-run");
assert.equal(resolveMode({ PIKBO_ACCEPTANCE_MODE: "REAL" }), "real");
assert.throws(() => resolveMode({ PIKBO_ACCEPTANCE_MODE: "semi-live" }));

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
      PIKBO_ACCEPTANCE_BASE_URL: "https://pikbo.ai",
      PIKBO_ACCEPTANCE_SESSION_COOKIE: "sb-auth-token=secret-value-here",
      PIKBO_ACCEPTANCE_IMAGE_PATH: "/tmp/toy.jpg",
    }),
  /Production host is forbidden|private Preview/
);

assert.throws(
  () =>
    assertRealModeGates({
      PIKBO_ACCEPTANCE_MODE: "real",
      PIKBO_CONFIRM_PROVIDER_SPEND: SPEND_CONFIRMATION_PHRASE,
      VERCEL_ENV: "production",
      PIKBO_ACCEPTANCE_BASE_URL:
        "https://pikbo-git-codex-private-validation-pi-kbo.vercel.app",
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
      PIKBO_ACCEPTANCE_BASE_URL:
        "https://pikbo-git-codex-private-validation-pi-kbo.vercel.app",
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
      PIKBO_ACCEPTANCE_BASE_URL:
        "https://pikbo-git-codex-private-validation-pi-kbo.vercel.app",
      PIKBO_ACCEPTANCE_SESSION_COOKIE: "sb-auth-token=secret-value-here",
      PIKBO_ACCEPTANCE_IMAGE_PATH: "",
    }),
  /IMAGE_PATH/
);

const allowedGates = assertRealModeGates({
  PIKBO_ACCEPTANCE_MODE: "real",
  PIKBO_CONFIRM_PROVIDER_SPEND: SPEND_CONFIRMATION_PHRASE,
  PIKBO_ACCEPTANCE_BASE_URL:
    "https://pikbo-git-codex-private-validation-pi-kbo.vercel.app/",
  PIKBO_ACCEPTANCE_SESSION_COOKIE: "sb-auth-token=secret-value-here",
  PIKBO_ACCEPTANCE_IMAGE_PATH: "/tmp/owned-toy.jpg",
  PIKBO_ACCEPTANCE_SKU_LABEL: "qa-sku-1",
});
assert.equal(
  allowedGates.origin,
  "https://pikbo-git-codex-private-validation-pi-kbo.vercel.app"
);
assert.equal(allowedGates.skuLabel, "qa-sku-1");
// Cookie is held in memory for the request path only; evidence must not echo it.
assert.equal(
  sanitizeEvidence({ cookie: allowedGates.cookie }).cookie,
  "[redacted]"
);

// ── Fixed payload ──

const payload = buildFixedMomentPayload(
  "asset-aaaaaaaa",
  "idem-bbbbbbbb"
);
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
assert.deepEqual(
  {
    productContract: FIXED_MOMENT_CONTRACT.productContract,
    effect: FIXED_MOMENT_CONTRACT.effect,
  },
  { productContract: "toy-moment-v1", effect: "street-power-up" }
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
assert.equal(classifyApiPath("/api/generate"), "generate");
assert.equal(classifyApiPath("/api/assets/upload-url"), "uploadPrepare");
assert.equal(classifyApiPath("/api/assets/complete"), "uploadComplete");
assert.equal(classifyApiPath("/api/generations"), "library");
assert.equal(classifyApiPath("/api/downloads/abc"), "download");
assert.equal(MAX_GENERATE_CALLS, 1);

// ── Sanitizer: no cookie / email / signed URL / object key / provider leakage ──

const dirty = {
  cookie: "sb-xxxx-auth-token=eyJhbGciOiJIUzI1NiJ9.abc.def",
  email: "owner@example.com",
  signedUrl:
    "https://lpfvfybkggiugosugfcw.supabase.co/storage/v1/object/sign/pikbo-toy-inputs/user/abc?token=secret",
  objectKey: "user/owner-id/inputs/file.webp",
  providerUrl: "https://queue.fal.run/fal-ai/seedance/result/xyz",
  providerModel: "fal-ai/bytedance/seedance/v1/pro",
  videoUrl: "/api/downloads/11111111-1111-4111-8111-111111111111",
  safeCount: 1,
  nested: {
    authorization: "Bearer secret",
    note: "ok",
  },
};
const clean = sanitizeEvidence(dirty);
assert.equal(clean.cookie, "[redacted]");
assert.equal(clean.email, "[redacted]");
assert.equal(clean.signedUrl, "[redacted]");
assert.equal(clean.objectKey, "[redacted]");
assert.equal(clean.providerUrl, "[redacted]");
assert.equal(clean.providerModel, "[redacted]");
assert.equal(clean.videoUrl, "/api/downloads/[job]");
assert.equal(clean.safeCount, 1);
assert.equal(clean.nested.authorization, "[redacted]");
assert.equal(clean.nested.note, "ok");

const dryEvidence = buildDryRunEvidence();
assert.equal(dryEvidence.mode, "dry-run");
assert.equal(dryEvidence.spend.providerCalls, 0);
assert.equal(dryEvidence.spend.generateCalls, 0);
assert.equal(dryEvidence.verdict, "PASS_DRY_RUN_NO_SPEND");
assertDryRunNoSpend(dryEvidence.network);
assert.doesNotMatch(JSON.stringify(dryEvidence), /@|fal\.ai|eyJ|cookie=/i);

// ── Mocked real path: exactly one generate, sanitized PASS evidence ──

const tmp = mkdtempSync(join(tmpdir(), "pikbo-moment-accept-"));
const imagePath = join(tmp, "owned-toy.png");
// Minimal valid-ish PNG header bytes (size gate is 32+).
const png = Buffer.alloc(64, 0);
png[0] = 0x89;
png[1] = 0x50;
png[2] = 0x4e;
png[3] = 0x47;
writeFileSync(imagePath, png);

const jobId = "22222222-2222-4222-8222-222222222222";
const assetId = "33333333-3333-4333-8333-333333333333";
let generateHits = 0;
let uploadPrepareHits = 0;

const mockFetch = async (url, init = {}) => {
  const target = new URL(String(url), "https://preview.example");
  const method = String(init.method || "GET").toUpperCase();
  const json = (status, body) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

  if (target.pathname === "/api/assets/upload-url" && method === "POST") {
    uploadPrepareHits += 1;
    assert.equal(uploadPrepareHits, 1, "upload-url must run once");
    return json(201, {
      ok: true,
      assetId,
      inputAssetId: assetId,
      state: "ready",
      uploadUrl: null,
      idempotent: false,
    });
  }
  if (target.pathname === "/api/assets/complete") {
    return json(200, {
      ok: true,
      inputAssetId: assetId,
      asset: { id: assetId, state: "ready" },
    });
  }
  if (target.pathname === "/api/generate" && method === "POST") {
    generateHits += 1;
    assert.equal(generateHits, 1, "generate must run once");
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
    return json(200, {
      ok: true,
      jobId,
      requestId: jobId,
      videoUrl: `/api/downloads/${jobId}`,
      demo: false,
      processedUpload: true,
      // Poison fields that must never appear in evidence.
      cookie: "should-not-leak",
      email: "owner@example.com",
      providerUrl: "https://queue.fal.run/secret",
      objectKey: "user/secret/out.mp4",
    });
  }
  if (target.pathname === "/api/generations" && method === "GET") {
    return json(200, {
      ok: true,
      jobs: [
        {
          id: jobId,
          requestId: jobId,
          status: "succeeded",
          videoUrl: `/api/downloads/${jobId}`,
          downloadAllowed: true,
        },
      ],
    });
  }
  if (target.pathname === `/api/downloads/${jobId}`) {
    return new Response(null, { status: 200 });
  }
  throw new Error(`unexpected mock URL ${target.pathname}`);
};

const realEvidence = await runRealAcceptance({
  baseUrl: "https://preview.example",
  origin: "https://preview.example",
  cookie: "sb-auth-token=super-secret-session",
  imagePath,
  skuLabel: "mock-sku",
  fetchImpl: mockFetch,
  now: () => "2026-08-05T00:00:00.000Z",
});

assert.equal(realEvidence.verdict, "PASS_ONE_SKU_REAL");
assert.equal(realEvidence.mode, "real");
assert.equal(realEvidence.spend.generateCalls, 1);
assert.equal(realEvidence.spend.uploadPrepareCalls, 1);
assert.equal(generateHits, 1);
assert.equal(uploadPrepareHits, 1);
const realJson = JSON.stringify(realEvidence);
assert.doesNotMatch(realJson, /super-secret-session/);
assert.doesNotMatch(realJson, /owner@example\.com/);
assert.doesNotMatch(realJson, /queue\.fal\.run/);
assert.doesNotMatch(realJson, /user\/secret/);
assert.doesNotMatch(realJson, /should-not-leak/);
assert.doesNotMatch(realJson, /sb-auth-token/);

// Second generate must fail the bound when audit is forced.
assert.throws(() =>
  assertOneCallBounds({
    ...createNetworkAudit(),
    generate: 2,
    total: 2,
  })
);

// ── CLI dry-run spawn: exit 0, zero spend, no secrets ──

function runCli(env) {
  return spawnSync(process.execPath, [harnessPath], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

const dryCli = runCli({
  PIKBO_ACCEPTANCE_MODE: "dry-run",
  // Even if an operator exports a cookie, dry-run must not spend or print it.
  PIKBO_ACCEPTANCE_SESSION_COOKIE: "sb-auth-token=must-not-print",
  PIKBO_CONFIRM_PROVIDER_SPEND: SPEND_CONFIRMATION_PHRASE,
  FAL_KEY: "should-be-ignored",
});
assert.equal(dryCli.status, 0, dryCli.stderr || dryCli.stdout);
assert.match(dryCli.stdout, /PASS_DRY_RUN_NO_SPEND/);
assert.match(dryCli.stdout, /zero network|zero spend/i);
assert.doesNotMatch(dryCli.stdout, /must-not-print/);
assert.doesNotMatch(dryCli.stderr || "", /must-not-print/);

const realClosed = runCli({
  PIKBO_ACCEPTANCE_MODE: "real",
  PIKBO_CONFIRM_PROVIDER_SPEND: "",
  PIKBO_ACCEPTANCE_BASE_URL:
    "https://pikbo-git-codex-private-validation-pi-kbo.vercel.app",
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

const realNoImage = runCli({
  PIKBO_ACCEPTANCE_MODE: "real",
  PIKBO_CONFIRM_PROVIDER_SPEND: SPEND_CONFIRMATION_PHRASE,
  PIKBO_ACCEPTANCE_BASE_URL:
    "https://pikbo-git-codex-private-validation-pi-kbo.vercel.app",
  PIKBO_ACCEPTANCE_SESSION_COOKIE: "sb-auth-token=must-not-print",
  PIKBO_ACCEPTANCE_IMAGE_PATH: "",
});
assert.notEqual(realNoImage.status, 0);
assert.match(
  `${realNoImage.stdout}\n${realNoImage.stderr}`,
  /IMAGE_PATH|FAIL_EXCEPTION/
);

// main() dry-run helper
const mainResult = await main({ PIKBO_ACCEPTANCE_MODE: "dry-run" });
assert.equal(mainResult.mode, "dry-run");
assert.equal(mainResult.evidence.verdict, "PASS_DRY_RUN_NO_SPEND");

rmSync(tmp, { recursive: true, force: true });

console.log(
  "private-moment-acceptance-harness-regression: PASS (dry-run no-spend · real fail-closed · one-call bound · sanitized evidence)"
);
