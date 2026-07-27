#!/usr/bin/env node
/**
 * Running-server Seller Pack cached golden path.
 *
 * Preconditions:
 * - Start a local production build without FAL_KEY.
 * - Run with PIKBO_BASE=http://127.0.0.1:3107 (default shown below).
 *
 * This sends one bundled Pikbo Lab still through the fixed three-child API
 * contract. It fails unless the server is cached-only and every child returns
 * a zero-credit, demo-cached result in the expected format.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base =
  process.env.PIKBO_BASE ||
  process.argv[2] ||
  "http://127.0.0.1:3107";

const contractSource = readFileSync(
  join(root, "lib/sellerPackContract.ts"),
  "utf8"
);
const contractCompiled = ts.transpileModule(contractSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const contractModule = { exports: {} };
new Function("exports", "module", contractCompiled)(
  contractModule.exports,
  contractModule
);
const fixedChildren = contractModule.exports.SELLER_PACK_ITEMS.map((item) => ({
  key: item.key,
  effect: item.slug,
  aspectRatio: item.aspectRatio,
  duration: item.durationSec,
}));

function responseCookies(response, current = "") {
  const setCookie = response.headers.getSetCookie?.() || [];
  const rawCookie = response.headers.get("set-cookie");
  if (setCookie.length) {
    return setCookie.map((value) => value.split(";")[0]).join("; ");
  }
  if (rawCookie) {
    return rawCookie
      .split(",")
      .map((value) => value.split(";")[0].trim())
      .join("; ");
  }
  return current;
}

async function jsonResponse(response, label) {
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(`${label}: invalid JSON (HTTP ${response.status})`);
  }
  return body;
}

async function main() {
  const healthResponse = await fetch(`${base}/api/health`, {
    cache: "no-store",
  });
  assert.equal(healthResponse.status, 200, "health endpoint must respond");
  const health = await jsonResponse(healthResponse, "health");
  assert.equal(health.mode, "cached-only");
  assert.equal(health.fal, false, "FAL/provider must be absent for this smoke");
  assert.equal(health.ready?.provider, false);
  assert.equal(health.ready?.softLive, false);

  const meResponse = await fetch(`${base}/api/me`, { cache: "no-store" });
  assert.equal(meResponse.status, 200, "session endpoint must respond");
  let cookie = responseCookies(meResponse);
  const before = await jsonResponse(meResponse, "session");
  assert.equal(before.mode, "demo-cached");
  assert.equal(typeof before.credits, "number");

  const image = `data:image/webp;base64,${readFileSync(
    join(root, "public/demos/scout-still.webp")
  ).toString("base64")}`;

  const results = [];
  for (const [index, child] of fixedChildren.entries()) {
    const response = await fetch(`${base}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify({
        effect: child.effect,
        image,
        ownsRights: true,
        duration: child.duration,
        aspectRatio: child.aspectRatio,
        resolution: "480p",
        model: "seedance-mini",
        idempotencyKey: `seller-pack-api-golden-${Date.now()}-${index}`,
      }),
    });
    cookie = responseCookies(response, cookie);
    const payload = await jsonResponse(response, child.effect);
    assert.ok(
      response.status >= 200 && response.status < 300,
      `${child.effect}: HTTP ${response.status} ${JSON.stringify(payload)}`
    );
    assert.equal(payload.effect, child.effect);
    assert.equal(payload.aspectRatio, child.aspectRatio);
    assert.equal(payload.duration, child.duration);
    assert.equal(payload.demo, true);
    if (payload.provider !== undefined) {
      assert.equal(payload.provider, "demo-cached");
    }
    assert.equal(payload.model, "demo-cached");
    assert.equal(payload.costCredits, 0);
    assert.equal(payload.creditsOutcome, "0 cached");
    assert.equal(payload.session?.credits, before.credits);
    assert.equal(typeof payload.videoUrl, "string");
    assert.ok(payload.videoUrl.length > 0);
    assert.equal(typeof payload.requestId, "string");
    results.push(payload);
  }

  const jobsResponse = await fetch(`${base}/api/generations`, {
    headers: cookie ? { Cookie: cookie } : {},
    cache: "no-store",
  });
  assert.equal(jobsResponse.status, 200, "generation ledger must respond");
  const jobsBody = await jsonResponse(jobsResponse, "generation ledger");
  const jobs = Array.isArray(jobsBody.jobs) ? jobsBody.jobs : [];
  const resultIds = new Set(
    results.flatMap((result) => [result.requestId, result.jobId].filter(Boolean))
  );
  const packJobs = jobs.filter(
    (job) =>
      resultIds.has(job.id) ||
      (typeof job.requestId === "string" && resultIds.has(job.requestId))
  );
  assert.equal(packJobs.length, 3);
  assert.deepEqual(
    packJobs.map((job) => job.effect).sort(),
    fixedChildren.map((child) => child.effect).sort()
  );
  assert.ok(packJobs.every((job) => job.status === "succeeded"));
  assert.ok(packJobs.every((job) => job.demo === true));
  assert.ok(packJobs.every((job) => job.creditsOutcome === "0 cached"));

  console.log(
    "seller-pack-api-golden: PASS (1 Lab still · fixed 3 children · cached-only · 0 credits · provider unavailable)"
  );
}

main().catch((error) => {
  console.error("seller-pack-api-golden: FAIL", error);
  process.exit(1);
});
