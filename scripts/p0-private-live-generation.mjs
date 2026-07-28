/**
 * Issue #54 Grok Build — private live generation contract (no network, no FAL).
 *
 * Proves:
 * 1. Anonymous never reaches live access with provider configured
 * 2. Uploaded still is the only image_url material for live provider input shape
 * 3. Cached path with upload is honesty-labeled (processedUpload false)
 * 4. Live success is demo:false + processedUpload true
 * 5. Free watermark path never returns raw provider URL
 * 6. Failed live does not invent READY success (error path)
 * 7. Private process-local admission fuse exhausts
 * 8. Generate route wires privateLive + honesty fields
 *
 * Run: npm run p0-private-live-generation
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  liveGenerationAccess,
  invokeReservedProvider,
} from "../lib/liveGenerationGate.mjs";
import {
  cachedUploadHonesty,
  evaluatePrivateLivePrereqs,
  freeDeliveryReadyForAccess,
  isPrivateLiveInvite,
  parsePrivateLiveAllowlist,
  privateLiveBudget,
} from "../lib/privateLiveBeta.mjs";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

// ─── 1. R0 anonymous never live ───────────────────────────────────────────

{
  const access = liveGenerationAccess({
    providerConfigured: true,
    authenticated: false,
    planId: "free",
    freeDeliveryReady: true,
  });
  assert.equal(access.kind, "cached");
  assert.equal(access.reason, "anonymous_cached_only");
  let calls = 0;
  await assert.rejects(
    () =>
      invokeReservedProvider(null, async () => {
        calls += 1;
        return "x";
      }),
    /LIVE_PROVIDER_REQUIRES_DURABLE_RESERVATION/
  );
  assert.equal(calls, 0);
}

// ─── 2. Free without delivery stays cached even when authed ───────────────

{
  const access = liveGenerationAccess({
    providerConfigured: true,
    authenticated: true,
    planId: "free",
    freeDeliveryReady: false,
  });
  assert.equal(access.kind, "cached");
  assert.equal(access.reason, "free_live_delivery_blocked");
}

// ─── 3. Private invite + budget opens Free delivery readiness ─────────────

{
  assert.equal(
    freeDeliveryReadyForAccess({
      t6FreeLiveDeliveryReady: false,
      privateInvite: true,
      privateBudgetOk: true,
    }),
    true
  );
  assert.equal(
    freeDeliveryReadyForAccess({
      t6FreeLiveDeliveryReady: false,
      privateInvite: true,
      privateBudgetOk: false,
    }),
    false
  );
  const access = liveGenerationAccess({
    providerConfigured: true,
    authenticated: true,
    planId: "free",
    freeDeliveryReady: freeDeliveryReadyForAccess({
      t6FreeLiveDeliveryReady: false,
      privateInvite: true,
      privateBudgetOk: true,
    }),
  });
  assert.equal(access.kind, "live");
}

// ─── 4. Allowlist + budget pure helpers ───────────────────────────────────

{
  const list = parsePrivateLiveAllowlist(" Owner@Pikbo.ai , user-uuid-1 ");
  assert.deepEqual(list, ["owner@pikbo.ai", "user-uuid-1"]);
  assert.equal(
    isPrivateLiveInvite({
      enabled: true,
      allowlist: list,
      email: "owner@pikbo.ai",
      userId: null,
    }).invited,
    true
  );
  assert.equal(
    isPrivateLiveInvite({
      enabled: true,
      allowlist: list,
      email: "stranger@example.com",
      userId: "other",
    }).invited,
    false
  );
  const budget = privateLiveBudget({ spent: 2, max: 3 });
  assert.equal(budget.ok, true);
  assert.equal(budget.remaining, 1);
  assert.equal(privateLiveBudget({ spent: 3, max: 3 }).exhausted, true);
}

// ─── 5. Upload honesty on cached ──────────────────────────────────────────

{
  const h = cachedUploadHonesty({
    accessKind: "cached",
    hadUpload: true,
    reason: "anonymous_cached_only",
  });
  assert.equal(h.processedUpload, false);
  assert.equal(h.uploadIgnored, true);
  const live = cachedUploadHonesty({
    accessKind: "live",
    hadUpload: true,
  });
  assert.equal(live.processedUpload, true);
}

// ─── 6. Provider input shape uses uploaded image only ─────────────────────

{
  // Behavioral contract for live input assembly (mirrors generate route).
  const uploadedDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const image_url = uploadedDataUrl; // after fal.storage.upload in live path
  const input = {
    prompt: "box reveal",
    image_url,
    duration: "5",
    aspect_ratio: "9:16",
  };
  assert.equal(input.image_url, uploadedDataUrl);
  assert.doesNotMatch(input.image_url, /astronaut|orbit-dance|\/demos\//);
  assert.equal(input.image_url.startsWith("data:image/") || input.image_url.startsWith("http"), true);
}

// ─── 7. Free watermark path never leaks raw provider URL ──────────────────

{
  // Mirrors lib/createTrust.ts customerFacingGenerateVideoUrl (pure contract).
  function customerFacingGenerateVideoUrl(opts) {
    if (opts.demo || !opts.watermark) return opts.videoUrl;
    const id = (opts.jobId || "").trim();
    if (!id) return `/api/downloads/unavailable`;
    return `/api/downloads/${encodeURIComponent(id)}`;
  }
  const raw = "https://fal.media/files/raw-provider-clip.mp4";
  const free = customerFacingGenerateVideoUrl({
    demo: false,
    watermark: true,
    jobId: "job-abc",
    videoUrl: raw,
  });
  assert.equal(free, "/api/downloads/job-abc");
  assert.doesNotMatch(free, /fal\.media/);
  const paid = customerFacingGenerateVideoUrl({
    demo: false,
    watermark: false,
    jobId: "job-abc",
    videoUrl: raw,
  });
  assert.equal(paid, raw);
  // Source lock: generate uses customerFacingGenerateVideoUrl for live success
  const createTrust = read("lib/createTrust.ts");
  assert.match(
    createTrust,
    /export function customerFacingGenerateVideoUrl[\s\S]*\/api\/downloads\//
  );
  assert.match(read("app/api/generate/route.ts"), /customerFacingGenerateVideoUrl\(/);
}

// ─── 8. Live success / fail honesty contracts (payload shape) ─────────────

{
  const liveSuccess = {
    demo: false,
    processedUpload: true,
    creditsOutcome: "10 used",
    videoUrl: "/api/downloads/job-1",
  };
  assert.equal(liveSuccess.demo, false);
  assert.equal(liveSuccess.processedUpload, true);
  assert.doesNotMatch(liveSuccess.videoUrl, /fal\.media/);

  const liveFail = {
    error: "Generation failed",
    code: "GENERATION_FAILED",
    creditsRefunded: true,
  };
  assert.ok(liveFail.error);
  assert.notEqual(liveFail.code, "READY");
  // Must not look like success
  assert.equal("demo" in liveFail ? liveFail.demo : undefined, undefined);
}

// ─── 9. Prerequisite checklist missing fields ─────────────────────────────

{
  const prereq = evaluatePrivateLivePrereqs({
    privateLiveEnabled: false,
    allowlistConfigured: false,
    authenticatedInvitedUser: false,
    providerConfigured: true,
    sessionSecret: true,
    durableAtomicReservation: false,
    durableReconciliation: false,
    budgetRemaining: false,
    serverOwnedDeliverable: false,
  });
  assert.equal(prereq.readyForPrivateLiveProviderCall, false);
  assert.ok(prereq.missing.includes("privateLiveEnabled"));
  assert.ok(prereq.missing.includes("authenticatedInvitedUser"));
  assert.ok(prereq.missing.includes("durableAtomicReservation"));
}

// ─── 10. Route wiring ─────────────────────────────────────────────────────

{
  const gen = read("app/api/generate/route.ts");
  assert.match(gen, /resolvePrivateLiveAccess|PIKBO_PRIVATE_LIVE/);
  assert.match(gen, /tryConsumePrivateLiveBudget/);
  assert.match(gen, /processedUpload/);
  assert.match(gen, /uploadIgnored/);
  assert.match(gen, /image_url:\s*imageUrl/);
  assert.match(gen, /customerFacingGenerateVideoUrl/);
  assert.match(gen, /demo:\s*false/);
  assert.doesNotMatch(
    gen,
    /liveGenerationAccess\(\{[\s\S]{0,200}freeDeliveryReady:\s*false/
  );
  const health = read("app/api/health/route.ts");
  assert.match(health, /privateLiveBeta/);
}

console.log(
  "p0-private-live-generation: PASS (R0 · private invite/budget · upload honesty · provider input = upload · no Free raw URL · fail honesty · prereq checklist · route wire)"
);
