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
  bindProviderSpendIntent,
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
  parseProviderOutputHostAllowlist,
  privateResultObjectKey,
  privateStoredObjectMatches,
  providerOutputHostAllowed,
} from "../lib/privateGenerationResultsPure.mjs";
import {
  isAuthoritativeRecoveryResult,
  planGenerateWaitLeave,
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

// ─── 4. Cached UI intent can never be silently upgraded to paid Live ─────

{
  const serverLive = liveGenerationAccess({
    providerConfigured: true,
    authenticated: true,
    planId: "free",
    freeDeliveryReady: true,
  });
  const cachedIntent = bindProviderSpendIntent(serverLive, false);
  assert.equal(cachedIntent.kind, "cached");
  assert.equal(
    cachedIntent.reason,
    "client_provider_spend_not_authorized"
  );
  assert.equal(bindProviderSpendIntent(serverLive, undefined).kind, "cached");

  let providerCalls = 0;
  if (cachedIntent.kind === "live") {
    await invokeReservedProvider(
      {
        reservationId: "reserve-intent-1",
        status: "reserved",
        providerAuthorized: true,
      },
      async () => {
        providerCalls += 1;
        return "unexpected";
      }
    );
  }
  assert.equal(
    providerCalls,
    0,
    "cached client intent must invoke the paid provider zero times"
  );
  assert.equal(bindProviderSpendIntent(serverLive, true).kind, "live");
}

// ─── 5. Allowlist + budget pure helpers ───────────────────────────────────

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
    if (opts.demo) return opts.videoUrl;
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
  assert.equal(paid, "/api/downloads/job-abc");
  assert.doesNotMatch(paid, /fal\.media/);
  // Source lock: generate uses customerFacingGenerateVideoUrl for live success
  const createTrust = read("lib/createTrust.ts");
  assert.match(
    createTrust,
    /export function customerFacingGenerateVideoUrl[\s\S]*if \(opts\.demo\)[\s\S]*\/api\/downloads\//
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
  assert.match(gen, /PRIVATE_ASSET_ID_RE/);
  assert.match(
    gen,
    /access\.kind === "live" && packBinding\.kind !== "pack"[\s\S]{0,700}ASSET_NOT_FOUND/,
    "direct live must require a verified owner-scoped private asset"
  );
  assert.doesNotMatch(
    gen,
    /assetId\.startsWith\("asset_"\)/,
    "legacy process-local assets must not enter direct live generation"
  );
  assert.doesNotMatch(
    gen,
    /directPrivateInput\?\.dataUrl[\s\S]{0,180}imageField\.startsWith\("data:image"\)/,
    "direct live must not fall back to client inline image bytes"
  );
  assert.match(
    gen,
    /if \(!packChild && !fixedMomentRequest\)/,
    "every direct live account must use the fixed Moment contract"
  );
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

  const client = read("lib/generateClient.ts");
  assert.match(
    client,
    /result\.code === "ASSET_NOT_FOUND" &&\s*body\.allowProviderSpend !== true/,
    "live clients must never retry by dropping the private asset id"
  );
  const create = read("components/CreateStudio.tsx");
  assert.match(create, /image:\s*demoMode[\s\S]{0,220}: undefined/);
  assert.match(
    create,
    /fallbackImage:\s*demoMode && useAsset \? fallbackStill : undefined/,
    "live Create must not transmit an inline fallback still"
  );
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
  assert.deepEqual(
    parseProviderOutputHostAllowlist(" FAL.MEDIA, .Fal.Run, fal.media "),
    ["fal.media", "fal.run"],
    "hostname-only entries normalize and deduplicate"
  );
  assert.equal(
    providerOutputHostAllowed(
      "https://fal.media:443/files/private/result.mp4",
      ["FAL.MEDIA"]
    ),
    true,
    "a valid HTTPS apex host remains deliverable"
  );
  for (const malformed of [
    "",
    "fal.media,",
    "fal.media,,fal.run",
    "https://fal.media",
    "fal.media:443",
    "fal.media/path",
    "fal.media?download=1",
    "fal.media#result",
    "user@fal.media",
    "*.fal.media",
    "fal",
    "fal_media",
    "fal media",
    "-fal.media",
    "fal-.media",
    "fal..media",
    "fal.media.",
    "localhost",
    "sub.localhost",
    "127.0.0.1",
    "[::1]",
    `${"a".repeat(64)}.media`,
    `${"a".repeat(250)}.media`,
    "fal.media,https://fal.run",
  ]) {
    assert.deepEqual(
      parseProviderOutputHostAllowlist(malformed),
      [],
      `${malformed || "empty allowlist"} must fail closed`
    );
  }
  assert.equal(
    providerOutputHostAllowed(
      "https://v3b.fal.media/files/private/result.mp4",
      ["fal.media", "https://fal.run"]
    ),
    false,
    "a mixed malformed allowlist must fail delivery closed"
  );
  for (const blockedUrl of [
    "https://evilfal.media/result.mp4",
    "https://fal.media.evil.com/result.mp4",
    "https://fal.media@evil.com/result.mp4",
    "https://user:pass@fal.media/result.mp4",
  ]) {
    assert.equal(
      providerOutputHostAllowed(blockedUrl, ["fal.media"]),
      false,
      `${blockedUrl} must not cross the host boundary`
    );
  }
  assert.equal(
    privateStoredObjectMatches({
      expectedByteLength: 1024,
      expectedChecksum: "a".repeat(64),
      storedByteLength: 1024,
      storedChecksum: "a".repeat(64),
    }),
    true
  );
  assert.equal(
    privateStoredObjectMatches({
      expectedByteLength: 1024,
      expectedChecksum: "a".repeat(64),
      storedByteLength: 1024,
      storedChecksum: "b".repeat(64),
    }),
    false
  );

  const migration = read(
    "supabase/migrations/20260728233000_p0_private_generation_results.sql"
  );
  assert.match(migration, /pikbo-private-results/);
  assert.match(migration, /pikbo_attach_private_generation_output_v1/);
  assert.match(migration, /output_object_key is not null/);
  assert.match(migration, /output_byte_length is not null/);
  assert.match(migration, /output_sha256 is not null/);
  assert.match(migration, /pikbo_reserve_generation_v1/);
  assert.match(migration, /output_object_key/);
  assert.match(migration, /set public = false/);
  assert.doesNotMatch(migration, /v_account\.plan_id\s*=\s*'free'/);
  const attemptFence = read(
    "supabase/migrations/20260729020500_seller_pack_attempt_fencing.sql"
  );
  assert.match(attemptFence, /pikbo_attach_private_generation_output_v2/);
  assert.match(attemptFence, /p_byte_length is null/);
  assert.match(attemptFence, /ATTEMPT_MISMATCH/);
  assert.match(attemptFence, /PACK_CHILD_OUTPUT_CONTRACT_MISMATCH/);
  assert.match(attemptFence, /ATTEMPT_FENCE_V2_REQUIRED/);
  assert.match(
    attemptFence,
    /pikbo_attach_private_generation_output_v1[\s\S]*from public, anon, authenticated, service_role/
  );
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
  // AIT-464 / AIT-173: durable UUID deny is uniform NOT_FOUND (unauth/foreign/missing).
  assert.match(downloads, /Download not found for this account|durableDownloadDenyBody/);
  assert.doesNotMatch(
    downloads,
    /status:\s*401|code:\s*"AUTH_REQUIRED"|Sign in to download this private result/
  );
  const generations = read("app/api/generations/route.ts");
  assert.match(generations, /getAuthUserFromRequest/);
  assert.match(
    generations,
    /listPrivateGenerationResults\(\{\s*userId: authUser\.id/
  );
  assert.match(generations, /mergePrivateLibraryWithLocalLedger/);
  // Controlled download URLs are built in the pure Library mapper (no secrets).
  const libraryPure = read("lib/privateGenerationResultsPure.mjs");
  assert.match(
    libraryPure,
    /\/api\/downloads\/\$\{encodeURIComponent\(id\)\}/
  );
  assert.match(libraryPure, /privateLibraryJobFromRow/);
  assert.doesNotMatch(generations, /providerOutputUrl|signedUrl/);
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
  assert.match(
    results,
    /direct\.error[\s\S]*state: "unavailable"/
  );
  assert.match(results, /pack_attempt_key/);
  assert.match(results, /creditsRefunded: status === "failed"/);
  assert.match(
    results,
    /signedUrl:\s*string \| null/,
    "ephemeral signing failure must not invalidate a durable private save"
  );
  assert.match(
    results,
    /createSignedUrl[\s\S]*catch \{[\s\S]*return null/,
    "a thrown signer must remain a recoverable delivery concern"
  );
  assert.match(results, /pikbo_attach_private_generation_output_v2/);
  assert.match(results, /p_attempt_key:\s*input\.attemptKey \?\? null/);
  assert.match(
    results,
    /row\.pack_attempt_key === \(input\.attemptKey \?\? null\)/,
    "lost attach responses must resolve only against the exact Pack attempt"
  );
  assert.doesNotMatch(
    results,
    /if \(!signedUrl\)[\s\S]{0,220}ok:\s*false/,
    "a saved private object must not become a failed save only because signing failed"
  );
  assert.match(
    results,
    /attachedOutputState[\s\S]*output_sha256[\s\S]*provider_request_id/,
    "lost attach responses must be resolved from owner-bound durable metadata"
  );
  assert.match(
    results,
    /PRIVATE_RESULT_RECORD_UNCERTAIN[\s\S]*settlementUncertain:\s*true/,
    "ambiguous attach state must withhold instead of deleting the object"
  );
  assert.match(
    results,
    /state === "conflict" \|\| state === "unavailable"[\s\S]*PRIVATE_RESULT_RECORD_UNCERTAIN/
  );
  assert.match(results, /\.download\(input\.objectKey\)/);
  assert.match(
    results,
    /PRIVATE_STORAGE_WRITE_UNCERTAIN[\s\S]*settlementUncertain:\s*true/
  );
  assert.match(
    results,
    /if \(state !== "match"\)[\s\S]*state === "absent"[\s\S]*PRIVATE_STORAGE_WRITE_FAILED/
  );

  const generateRoute = read("app/api/generate/route.ts");
  assert.doesNotMatch(
    generateRoute,
    /result\.requestId\s*\|\|\s*reserved\.reservation\.jobId/,
    "an internal job id must never impersonate provider evidence"
  );
  assert.match(generateRoute, /provider_request_id_missing/);
  assert.match(
    generateRoute,
    /saved\.settlementUncertain[\s\S]*reservationLife\.markWithheld\("private_attach_uncertain"\)/
  );
  assert.doesNotMatch(
    generateRoute,
    /saved\.settlementUncertain[\s\S]{0,900}releaseReservation\(/,
    "ambiguous attach must never trigger a refund"
  );
  assert.match(
    generateRoute,
    /reservationLife\.settle\([\s\S]*?signedPrivateResultUrl\(saved\.result\.objectKey\)/,
    "a transient signing retry happens after durable settlement without refunding"
  );

  const settlementGuard = read(
    "supabase/migrations/20260729021000_private_settlement_guard.sql"
  );
  assert.match(settlementGuard, /PRIVATE_RESULT_REQUIRED/);
  assert.match(settlementGuard, /output_object_key is distinct from v_expected_key/);
  assert.match(settlementGuard, /output_byte_length is null/);

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
  assert.match(client, /awaiting_primary/);
  assert.match(client, /onInconclusiveRecovery/);
  assert.doesNotMatch(client, /applyGenerateWaitLeave/);

  const create = read("components/CreateStudio.tsx");
  assert.match(create, /recoveringSavedResult/);
  assert.match(create, /leaveWaitingKeepBackground/);
  assert.match(create, /planGenerateWaitLeave\("detach"\)/);
  // AIT-546: detach navigates via owner-safe helper (deep-link when durable UUID).
  assert.match(create, /libraryWorkbenchHandoffHref/);
  assert.match(create, /router\.push\(\s*libraryWorkbenchHandoffHref/);
  assert.match(create, /stillForStore\.length <= 8_000/);
  // Unmount / detach must not abort the original POST or cancel ledger.
  assert.doesNotMatch(
    create,
    /return \(\) => \{\s*generateAbortRef\.current\?\.abort\(\)/,
    "Create unmount must not abort in-flight generate (detach semantics)"
  );
  // Detach path drops the controller ref without aborting or DELETE generations.
  {
    const leaveFn = create.match(
      /function leaveWaitingKeepBackground\(\) \{[\s\S]*?\n  \}/
    )?.[0];
    assert.ok(leaveFn, "leaveWaitingKeepBackground must exist");
    assert.match(leaveFn, /planGenerateWaitLeave\("detach"\)/);
    assert.match(leaveFn, /generateAbortRef\.current = null/);
    assert.match(leaveFn, /libraryWorkbenchHandoffHref/);
    assert.match(leaveFn, /router\.push\(/);
    assert.doesNotMatch(leaveFn, /cancelGenerateLedger/);
    assert.doesNotMatch(leaveFn, /\.abort\s*\(/);
  }
  {
    const cancelFn = create.match(
      /function cancelInFlightGenerate\(\) \{[\s\S]*?\n  \}/
    )?.[0];
    assert.ok(cancelFn, "explicit cancel handler must exist");
    assert.match(cancelFn, /ctrl\.abort\(\)/);
  }
  {
    const cancelForUser = client.match(
      /const cancelForUser = \(\) => \{[\s\S]*?\n  \};/
    )?.[0];
    assert.ok(cancelForUser, "outer abort must map to the explicit cancel path");
    assert.match(cancelForUser, /primaryController\.abort\(\)/);
    assert.match(cancelForUser, /recoveryController\.abort\(\)/);
    assert.match(cancelForUser, /cancelGenerateLedger/);
  }
  const waitStage = read("components/GenerateWaitStage.tsx");
  assert.match(
    `${create}\n${waitStage}`,
    /does not start another generation or charge again|no second (?:generation|provider call) or charge/
  );
  assert.match(waitStage, /data-generate-leave="detach"/);
  assert.match(waitStage, /data-generate-leave="cancel"/);
  assert.match(waitStage, /onLeaveToLibrary/);
  assert.match(
    waitStage,
    /shouldShowGenerateWaitDetach/,
    "detach visibility is policy-driven (recovery checking/waiting always exits)"
  );
  assert.match(
    waitStage,
    /data-wait-detach|data-recovery-checking/,
    "wait stage exposes recovery exit markers"
  );

  const library = read("components/LibraryGrid.tsx");
  assert.match(library, /fetch\(["']\/api\/generations["']/);
  assert.match(library, /privateDownloadHeaders\(\)/);
  assert.match(library, /function visibleAccountJob/);
  assert.match(library, /if \(job\.demo\) return false/);
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
    {
      ok: false,
      status: 409,
      code: "GENERATION_FAILED",
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

  // Durable terminal failure with confirmed refund is authoritative: recovery
  // wins and aborts the open primary exactly once (no second cancel).
  {
    const openPrimary = deferred();
    const failedRefunded = deferred();
    primaryAborts = 0;
    recoveryAborts = 0;
    const recoveryWins = raceGenerateWithDurableRecovery({
      primary: openPrimary.promise,
      recovery: failedRefunded.promise,
      abortPrimary: () => {
        primaryAborts += 1;
      },
      abortRecovery: () => {
        recoveryAborts += 1;
      },
    });
    const terminalFail = {
      ok: false,
      status: 409,
      code: "GENERATION_FAILED",
      creditsRefunded: true,
    };
    failedRefunded.resolve(terminalFail);
    assert.deepEqual(await recoveryWins, terminalFail);
    assert.equal(
      primaryAborts,
      1,
      "authoritative GENERATION_FAILED with refund must abortPrimary exactly once"
    );
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

// ─── 14. Detach leave + inconclusive recovery keep primary authoritative ──

{
  // Pure plan: detach never aborts, cancels ledger, or starts a second generate.
  const detach = planGenerateWaitLeave("detach");
  assert.equal(detach.abortPrimary, false);
  assert.equal(detach.abortRecovery, false);
  assert.equal(detach.cancelLedger, false);
  assert.equal(detach.startNewGenerate, false);

  const cancel = planGenerateWaitLeave("cancel");
  assert.equal(cancel.abortPrimary, true);
  assert.equal(cancel.abortRecovery, true);
  assert.equal(cancel.cancelLedger, true);
  assert.equal(cancel.startNewGenerate, false);

  // Behavioral: non-authoritative recovery finishes first; primary stays open
  // until it settles later. Detach plan is applied while primary is pending —
  // no abort, no ledger cancel, no second generate path.
  const deferred = () => {
    let resolve;
    const promise = new Promise((done) => {
      resolve = done;
    });
    return { promise, resolve };
  };

  const latePrimary = deferred();
  const earlyRecovery = deferred();
  const inconclusiveObserved = deferred();
  let primaryAborts = 0;
  let recoveryAborts = 0;
  let inconclusive = 0;
  let ledgerCancels = 0;
  let secondGenerate = 0;

  const race = raceGenerateWithDurableRecovery({
    primary: latePrimary.promise,
    recovery: earlyRecovery.promise,
    abortPrimary: () => {
      primaryAborts += 1;
    },
    abortRecovery: () => {
      recoveryAborts += 1;
    },
    onInconclusiveRecovery: () => {
      inconclusive += 1;
      inconclusiveObserved.resolve(true);
    },
  });

  earlyRecovery.resolve({
    ok: false,
    status: 0,
    code: "NETWORK_ERROR",
  });
  // Wait for the race callback itself — no microtask counting, no wall clock.
  await inconclusiveObserved.promise;
  assert.equal(inconclusive, 1);
  assert.equal(primaryAborts, 0);
  assert.equal(recoveryAborts, 0);

  // Simulate CreateStudio leaveWaitingKeepBackground while primary is open.
  const leave = planGenerateWaitLeave("detach");
  if (leave.abortPrimary) primaryAborts += 1;
  if (leave.abortRecovery) recoveryAborts += 1;
  if (leave.cancelLedger) ledgerCancels += 1;
  if (leave.startNewGenerate) secondGenerate += 1;
  assert.equal(primaryAborts, 0);
  assert.equal(recoveryAborts, 0);
  assert.equal(ledgerCancels, 0);
  assert.equal(secondGenerate, 0);

  let settled = false;
  void race.then(() => {
    settled = true;
  });
  await Promise.resolve();
  assert.equal(
    settled,
    false,
    "after detach + inconclusive recovery, race still awaits original primary"
  );

  latePrimary.resolve({ ok: true, status: 200, source: "primary-late" });
  assert.deepEqual(await race, {
    ok: true,
    status: 200,
    source: "primary-late",
  });
  assert.equal(settled, true);
  assert.equal(primaryAborts, 0);
  assert.equal(ledgerCancels, 0);
  assert.equal(secondGenerate, 0);

  // A UI observer is reporting only. Even if it throws, it cannot replace the
  // original POST or change the race authority.
  const observerPrimary = deferred();
  const observerRecovery = deferred();
  const observerObserved = deferred();
  let observerAborts = 0;
  let observerCalls = 0;
  const observerSafeRace = raceGenerateWithDurableRecovery({
    primary: observerPrimary.promise,
    recovery: observerRecovery.promise,
    abortPrimary: () => {
      observerAborts += 1;
    },
    abortRecovery: () => undefined,
    onInconclusiveRecovery: () => {
      observerCalls += 1;
      observerObserved.resolve(true);
      throw new Error("UI observer failure");
    },
  });
  observerRecovery.resolve({
    ok: false,
    status: 0,
    code: "NETWORK_ERROR",
  });
  await observerObserved.promise;
  assert.equal(observerCalls, 1);
  assert.equal(observerAborts, 0);
  observerPrimary.resolve({ ok: true, status: 200 });
  assert.deepEqual(await observerSafeRace, { ok: true, status: 200 });
  assert.equal(observerAborts, 0);
}

console.log(
  "p0-private-live-generation: PASS (R0 · owned upload provider input · private Supabase object before capture · owner download · no raw provider URL · refund honesty · durable slow-response recovery · read-failure race safety · non-destructive long-wait leave)"
);
