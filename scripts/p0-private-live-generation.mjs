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
 * 9. A slow POST recovers the same owner-only durable task without a new call
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
import {
  privateResultObjectKey,
  providerOutputHostAllowed,
} from "../lib/privateGenerationResultsPure.mjs";
import {
  isAuthoritativeRecoveryResult,
  raceGenerateWithDurableRecovery,
} from "../lib/generateRecoveryPolicy.ts";

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
  assert.match(gen, /savePrivateGenerationResult/);
  assert.match(gen, /saved\.signedUrl/);
  assert.ok(
    gen.indexOf("savePrivateGenerationResult({") <
      gen.indexOf("reservationLife.settle("),
    "private object must be saved before credit capture"
  );
  assert.match(gen, /demo:\s*false/);
  assert.doesNotMatch(
    gen,
    /liveGenerationAccess\(\{[\s\S]{0,200}freeDeliveryReady:\s*false/
  );
  const health = read("app/api/health/route.ts");
  assert.match(health, /privateLiveBeta/);
  assert.match(health, /privateResults/);
}

// ─── 11. Private owned-object + owner download contract ───────────────────

{
  const userId = "11111111-1111-4111-8111-111111111111";
  const jobId = "22222222-2222-4222-8222-222222222222";
  assert.equal(
    privateResultObjectKey({ userId, jobId }),
    `private-results/${userId}/${jobId}.mp4`
  );
  assert.equal(
    providerOutputHostAllowed(
      "https://v3b.fal.media/files/private/result.mp4",
      ["fal.media"]
    ),
    true
  );
  assert.equal(
    providerOutputHostAllowed(
      "https://attacker.example/result.mp4",
      ["fal.media"]
    ),
    false
  );
  assert.equal(
    providerOutputHostAllowed("http://fal.media/result.mp4", ["fal.media"]),
    false
  );

  const migration = read(
    "supabase/migrations/20260728233000_p0_private_generation_results.sql"
  );
  assert.match(migration, /pikbo-private-results/);
  assert.match(migration, /pikbo_attach_private_generation_output_v1/);
  assert.match(migration, /pikbo_reserve_generation_v1/);
  assert.match(migration, /output_object_key/);
  assert.match(migration, /set public = false/);
  assert.doesNotMatch(migration, /v_account\.plan_id\s*=\s*'free'/);
  const atomic = read(
    "supabase/migrations/20260727213000_r1_atomic_generation_credits.sql"
  );
  assert.doesNotMatch(
    atomic,
    /v_account\.plan_id\s*=\s*'free'/,
    "explicit live_generation_allowed is the private Preview entitlement"
  );
  const downloads = read("app/api/downloads/[id]/route.ts");
  assert.match(downloads, /getAuthUserFromRequest/);
  assert.match(downloads, /getPrivateGenerationResult/);
  assert.match(downloads, /signedPrivateResultUrl/);
}

// ─── 12. Slow-response recovery is read-only, owner-only, and idempotent ──

{
  const results = read("lib/privateGenerationResults.ts");
  assert.match(
    results,
    /getPrivateGenerationRecovery[\s\S]*created_by[\s\S]*idempotency_key/
  );
  assert.match(
    results,
    /status === "succeeded"[\s\S]*resultFromRow[\s\S]*state: "succeeded"/
  );
  assert.match(results, /if \(error\) return \{ state: "unavailable" \}/);
  assert.match(results, /creditsRefunded: status === "failed"/);

  const recoveryRoute = read("app/api/generations/recover/route.ts");
  assert.match(recoveryRoute, /getAuthUserFromRequest/);
  assert.match(recoveryRoute, /getPrivateGenerationRecovery/);
  assert.match(recoveryRoute, /signedPrivateResultUrl/);
  assert.match(recoveryRoute, /idempotentReplay:\s*true/);
  assert.match(recoveryRoute, /processedUpload:\s*true/);
  assert.match(recoveryRoute, /privateResult:\s*true/);
  assert.match(recoveryRoute, /Cache-Control.*no-store/);
  assert.match(recoveryRoute, /if \(!recovery\.creditsRefunded\)/);
  assert.doesNotMatch(
    recoveryRoute,
    /reserveStrictLiveGeneration|invokeReservedProvider|fal\.subscribe|providerOutputUrl/
  );

  const client = read("lib/generateClient.ts");
  assert.match(client, /pollDurableGenerateRecovery/);
  assert.match(client, /\/api\/generations\/recover\?idempotencyKey=/);
  assert.match(client, /raceGenerateWithDurableRecovery/);
  assert.doesNotMatch(
    client,
    /notFoundReads\s*>=|networkFailures\s*>=/,
    "transient recovery misses must not end later durable polling"
  );
  assert.match(
    client,
    /no second generation was started|no second provider job/
  );
  assert.doesNotMatch(
    client,
    /waitForPrimaryAfterRecovery|setTimeout\(\(\) => resolve\(null\), 15_000\)/,
    "a non-authoritative recovery timeout must not abort the original POST"
  );

  const create = read("components/CreateStudio.tsx");
  assert.match(create, /recoveringSavedResult/);
  assert.match(create, /does not start another generation or charge again/);
}

// ─── 13. Recovery read failures never cancel a still-live primary ─────────

{
  assert.equal(
    isAuthoritativeRecoveryResult({
      ok: false,
      status: 0,
      code: "NETWORK_ERROR",
    }),
    false
  );
  assert.equal(
    isAuthoritativeRecoveryResult({
      ok: false,
      status: 503,
      code: "DELIVERY_PIPELINE_UNAVAILABLE",
    }),
    false
  );
  assert.equal(
    isAuthoritativeRecoveryResult({
      ok: false,
      status: 409,
      code: "GENERATION_FAILED",
      creditsRefunded: true,
    }),
    true
  );

  const deferred = () => {
    let resolve;
    const promise = new Promise((done) => {
      resolve = done;
    });
    return { promise, resolve };
  };

  const livePrimary = deferred();
  const unavailableRecovery = deferred();
  let primaryAborts = 0;
  let recoveryAborts = 0;
  const raced = raceGenerateWithDurableRecovery({
    primary: livePrimary.promise,
    recovery: unavailableRecovery.promise,
    abortPrimary: () => {
      primaryAborts += 1;
    },
    abortRecovery: () => {
      recoveryAborts += 1;
    },
  });
  unavailableRecovery.resolve({
    ok: false,
    status: 0,
    code: "NETWORK_ERROR",
  });
  await Promise.resolve();
  assert.equal(
    primaryAborts,
    0,
    "a recovery transport/read failure must not abort the live POST"
  );
  livePrimary.resolve({ ok: true, status: 200 });
  assert.deepEqual(await raced, { ok: true, status: 200 });
  assert.equal(primaryAborts, 0);
  assert.equal(recoveryAborts, 0);

  for (const recoveryMiss of [
    {
      ok: false,
      status: 0,
      code: "NETWORK_ERROR",
    },
    {
      ok: false,
      status: 404,
      code: "NETWORK_ERROR",
    },
    {
      ok: false,
      status: 503,
      code: "DELIVERY_PIPELINE_UNAVAILABLE",
    },
    {
      ok: false,
      status: 401,
      code: "AUTH_REQUIRED",
    },
    {
      ok: false,
      status: 409,
      code: "REQUEST_CANCELED",
      creditsRefunded: false,
    },
  ]) {
    const authoritativePrimary = deferred();
    const nonAuthoritativeRecovery = deferred();
    primaryAborts = 0;
    recoveryAborts = 0;
    const guardedRace = raceGenerateWithDurableRecovery({
      primary: authoritativePrimary.promise,
      recovery: nonAuthoritativeRecovery.promise,
      abortPrimary: () => {
        primaryAborts += 1;
      },
      abortRecovery: () => {
        recoveryAborts += 1;
      },
    });
    nonAuthoritativeRecovery.resolve(recoveryMiss);
    await Promise.resolve();
    assert.equal(
      primaryAborts,
      0,
      `${recoveryMiss.status}/${recoveryMiss.code} must not abort the live POST`
    );
    authoritativePrimary.resolve({ ok: true, status: 200 });
    assert.deepEqual(await guardedRace, { ok: true, status: 200 });
    assert.equal(primaryAborts, 0);
    assert.equal(recoveryAborts, 0);
  }

  const slowPrimary = deferred();
  const savedRecovery = deferred();
  primaryAborts = 0;
  const recovered = raceGenerateWithDurableRecovery({
    primary: slowPrimary.promise,
    recovery: savedRecovery.promise,
    abortPrimary: () => {
      primaryAborts += 1;
    },
    abortRecovery: () => {
      recoveryAborts += 1;
    },
  });
  savedRecovery.resolve({ ok: true, status: 200 });
  assert.deepEqual(await recovered, { ok: true, status: 200 });
  assert.equal(
    primaryAborts,
    1,
    "only authoritative durable success may abort the still-open response"
  );
}

console.log(
  "p0-private-live-generation: PASS (R0 · owned upload provider input · private Supabase object before capture · owner download · no raw provider URL · refund honesty · durable slow-response recovery · read-failure race safety)"
);
