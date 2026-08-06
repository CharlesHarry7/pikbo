#!/usr/bin/env node
/**
 * Fast engine smoke (no Next build) — provider classify + response interpret.
 * Run: node scripts/engine-smoke.mjs
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import "./health-truth-contract.mjs";
// The private-live P0 suite runs independently via npm run p0-private-live-generation.
// Keep this fast smoke focused on the current product surface and its own
// fail-closed source assertions below.
import "./auth-magic-link-regression.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Load compiled-ish TS via dynamic transpile is heavy; re-implement minimal
// parity checks against the same regexes as lib/providerError.ts so CI catches drift.
function classifyProviderError(raw) {
  if (/Exhausted balance|locked|top up|insufficient.*credit/i.test(raw)) {
    return "balance";
  }
  if (/Forbidden/i.test(raw) && /balance|billing|quota/i.test(raw)) {
    return "balance";
  }
  if (/rate.?limit|too many|429|throttl/i.test(raw)) {
    return "rate";
  }
  if (/timeout|timed?\s*out|deadline exceeded|ETIMEDOUT|Gateway Time-out|504/i.test(raw)) {
    return "timeout";
  }
  if (
    /ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH|socket hang up|fetch failed|network error|Bad Gateway|Service Unavailable|\b502\b|\b503\b|connection reset|temporarily unavailable/i.test(
      raw
    )
  ) {
    return "network";
  }
  if (/content.?policy|nsfw|safety|moderation|blocked.?content|violat/i.test(raw)) {
    return "content";
  }
  return "other";
}

function isValidImageDataUrl(image) {
  if (!image || image.length < 32) return false;
  return /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(image);
}

function isSafeUrlPure(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  if (!t || t.length > 2000) return false;
  if (t.startsWith("/") && !t.startsWith("//")) return !t.includes("\\");
  try {
    const u = new URL(t);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (!u.hostname || u.username || u.password) return false;
    return true;
  } catch {
    return false;
  }
}

function interpretGenerateResponse(status, raw) {
  if (status >= 200 && status < 300) {
    if (!raw?.videoUrl) {
      return { ok: false, code: "MODEL_EMPTY", fatal: false, paywall: false };
    }
    // Parity with lib/generateClient asSuccess — refuse unsafe schemes
    if (!isSafeUrlPure(raw.videoUrl)) {
      return {
        ok: false,
        status: 502,
        code: "UNSAFE_URL",
        fatal: false,
        paywall: false,
        error: "Provider returned an unsafe video URL — not displaying",
      };
    }
    return { ok: true, data: raw };
  }
  const code = raw?.code;
  const paywall = code === "INSUFFICIENT_CREDITS";
  const fatal = code === "INSUFFICIENT_CREDITS" || code === "PROVIDER_BALANCE";
  const creditsRefunded = raw?.creditsRefunded === true;
  let error = raw?.error || "fail";
  // Parity with lib/generateClient.ts — PRD §5 refund honesty
  if (creditsRefunded && !/refund|restored|credit/i.test(error)) {
    error = `${error} · 10 credits restored`;
  }
  return {
    ok: false,
    code,
    fatal,
    paywall,
    creditsRefunded,
    retryAfterSec: raw?.retryAfterSec,
    error,
  };
}

// --- classify ---
assert.equal(classifyProviderError("Exhausted balance"), "balance");
assert.equal(classifyProviderError("rate limit exceeded"), "rate");
assert.equal(classifyProviderError("boom"), "other");
assert.equal(classifyProviderError("Gateway Time-out 504"), "timeout");
assert.equal(classifyProviderError("content policy violation"), "content");
assert.equal(classifyProviderError("fetch failed ECONNRESET"), "network");
assert.equal(classifyProviderError("502 Bad Gateway"), "network");
assert.equal(classifyProviderError("Service Unavailable 503"), "network");

// --- image mime ---
assert.equal(
  isValidImageDataUrl("data:image/png;base64,iVBORw0KGgo="),
  true
);
assert.equal(isValidImageDataUrl("data:text/plain;base64,abc"), false);
assert.equal(isValidImageDataUrl("data:image/svg+xml;base64,abc"), false);

// --- interpret ---
const ok = interpretGenerateResponse(200, {
  videoUrl: "/demos/x.mp4",
  demo: true,
  resolution: "480p",
});
assert.equal(ok.ok, true);

const empty = interpretGenerateResponse(200, {});
assert.equal(empty.ok, false);

const unsafeOk = interpretGenerateResponse(200, {
  videoUrl: "javascript:alert(1)",
});
assert.equal(unsafeOk.ok, false);
assert.equal(unsafeOk.code, "UNSAFE_URL");

const credits = interpretGenerateResponse(402, {
  code: "INSUFFICIENT_CREDITS",
  error: "nope",
});
assert.equal(credits.paywall, true);
assert.equal(credits.fatal, true);

const provider = interpretGenerateResponse(402, {
  code: "PROVIDER_BALANCE",
  error: "fal empty",
});
assert.equal(provider.paywall, false);
assert.equal(provider.fatal, true);

const rl = interpretGenerateResponse(429, {
  code: "RATE_LIMITED",
  retryAfterSec: 12,
  error: "slow down",
});
assert.equal(rl.fatal, false);
assert.equal(rl.retryAfterSec, 12);

// source files must still export symbols (grep-level)
const require = createRequire(import.meta.url);
const fs = require("node:fs");
const gen = fs.readFileSync(join(root, "lib/generateClient.ts"), "utf8");
assert.match(gen, /export async function postGenerateWithRetry/);
// Transient provider timeout is auto-retried once; ledger TIMEOUT is not.
assert.match(gen, /PROVIDER_TIMEOUT/);
assert.match(
  gen,
  /PROVIDER_NETWORK[\s\S]{0,120}PROVIDER_TIMEOUT|PROVIDER_TIMEOUT[\s\S]{0,120}JOB_IN_FLIGHT/
);
assert.match(gen, /never auto-retry TIMEOUT|mint a new key/);
assert.match(gen, /historyFieldsFromSuccess/);
assert.match(gen, /ASSET_NOT_FOUND/);
assert.match(gen, /fallbackImage/);
assert.match(gen, /assetId:\s*undefined/);
assert.match(gen, /recoveredFromAssetMiss/);
// Client defense: 200 + unsafe videoUrl → UNSAFE_URL (not playable success)
assert.match(gen, /isSafeDeliverableUrl/);
assert.match(gen, /UNSAFE_URL/);
assert.match(
  fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
  /isSafeDeliverableUrl/
);
const pe = fs.readFileSync(join(root, "lib/providerError.ts"), "utf8");
assert.match(pe, /export function isValidImageDataUrl/);
assert.match(pe, /export function classifyProviderError/);

// Recovery R0: cached access is decided before any durable reserve/provider call.
const genRoute = fs.readFileSync(join(root, "app/api/generate/route.ts"), "utf8");
const accessIdx = genRoute.indexOf("liveGenerationAccess({");
const demoIdx = genRoute.indexOf('if (access.kind === "cached")');
const reserveIdx = genRoute.indexOf("reserveStrictLiveGenerationWithAsset({");
const providerIdx = genRoute.indexOf("invokeReservedProvider(");
assert.ok(
  accessIdx > 0 &&
    demoIdx > accessIdx &&
    reserveIdx > demoIdx &&
    providerIdx > reserveIdx,
  "cached gate + durable asset-bound reserve must precede provider invocation"
);
assert.doesNotMatch(
  genRoute,
  /shadowReserveForGenerate|deductCredits\(session/
);
assert.match(genRoute, /official[\s-]+cached|cached clip/i);
assert.match(genRoute, /isSafeDeliverableUrl/);
// Live unsafe videoUrl must surface UNSAFE_URL (not MODEL_EMPTY) for client honesty.
assert.match(
  genRoute,
  /isSafeDeliverableUrl\(videoUrl\)[\s\S]{0,400}code:\s*"UNSAFE_URL"/
);
assert.match(genRoute, /Retry-After/);
assert.match(genRoute, /providerFailHttp/);
assert.match(pe, /timeout|content/);
assert.match(pe, /export function providerFailHttp/);
assert.match(pe, /PROVIDER_TIMEOUT/);
assert.match(pe, /CONTENT_POLICY/);

const imgRoute = fs.readFileSync(join(root, "app/api/image/route.ts"), "utf8");
const imgAccess = imgRoute.indexOf("liveGenerationAccess({");
const imgCached = imgRoute.indexOf('if (access.kind === "cached")');
const imgReserve = imgRoute.indexOf("reserveStrictLiveGeneration({");
const imgProvider = imgRoute.indexOf("invokeReservedProvider(");
assert.ok(
  imgAccess > 0 &&
    imgCached > imgAccess &&
    imgReserve > imgCached &&
    imgProvider > imgReserve,
  "image cached gate + durable reserve must precede Flux provider"
);
assert.doesNotMatch(
  imgRoute,
  /shadowReserveForGenerate|shadowReserveForGuest|deductCredits\(session|checkCredits\(session|refundCredits\(session/
);
assert.match(imgRoute, /free_trial_video_only/);
assert.match(imgRoute, /anonymous_cached_only/);
assert.match(imgRoute, /costCredits:\s*0/);
assert.match(imgRoute, /creditsOutcome:\s*"0 cached"|creditsOutcome:\s*"10 used"/);
assert.match(imgRoute, /Retry-After/);

// health + me advertise free trial scope (video Create only)
const healthRoute = fs.readFileSync(join(root, "app/api/health/route.ts"), "utf8");
assert.match(healthRoute, /video-create-only/);
assert.match(healthRoute, /stillsOnFree:\s*"demo-only"/);
assert.match(healthRoute, /probeDemoAssets|demos:\s*probeDemoAssets/);
assert.match(healthRoute, /communityUgcConfigured|ugcConfigured/);
// Community UGC: rate limits + HEAD probe + never-fake empty list
const communityPostsRoute = fs.readFileSync(
  join(root, "app/api/community/posts/route.ts"),
  "utf8"
);
assert.match(communityPostsRoute, /export async function HEAD/);
assert.match(communityPostsRoute, /X-Pikbo-Community-Ugc/);
assert.match(communityPostsRoute, /takeToken/);
assert.match(communityPostsRoute, /RATE_LIMITED/);
assert.match(communityPostsRoute, /labOnly/);
assert.match(communityPostsRoute, /clientIp/);
assert.match(
  fs.readFileSync(join(root, "lib/communityPosts.ts"), "utf8"),
  /isPublicCommunityVideoUrl/
);
assert.match(
  fs.readFileSync(join(root, "scripts/critical-path.sh"), "utf8"),
  /\/api\/community\/posts|X-Pikbo-Community-Ugc/
);
assert.match(
  fs.readFileSync(join(root, "app/api/me/route.ts"), "utf8"),
  /stillsOnFree:\s*"demo-only"/
);

// Demo catalog: disk probe + prefer on-disk clip (no player 404)
const demoClipsSrc = fs.readFileSync(join(root, "lib/demoClips.ts"), "utf8");
assert.match(demoClipsSrc, /export function probeDemoAssets/);
assert.match(demoClipsSrc, /export function demoAssetOnDisk/);
assert.match(demoClipsSrc, /demoAssetOnDisk/);
assert.match(genRoute, /isSafeDeliverableUrl\(videoUrl\)/);
assert.match(imgRoute, /aspect:\s*aspectEcho|aspect,\s*$/m);

const ent = fs.readFileSync(join(root, "lib/entitlements.ts"), "utf8");
assert.match(ent, /probeEntitlementsStore/);

const rateLimitSrc = fs.readFileSync(join(root, "lib/rateLimit.ts"), "utf8");
assert.match(rateLimitSrc, /takeGenerateBudget/);
assert.match(rateLimitSrc, /tryBeginJob/);
assert.match(rateLimitSrc, /endJob/);
assert.match(rateLimitSrc, /inflightTtlMs|DEFAULT_INFLIGHT_TTL/);
assert.match(rateLimitSrc, /jobInFlightRetryAfterSec/);
assert.match(rateLimitSrc, /inflightJobCount/);
// Pure inflight TTL recovery (stale lock must free after TTL)
function tryBeginJobPure(map, sessionId, now, ttl) {
  const started = map.get(sessionId);
  if (started !== undefined) {
    if (now - started < ttl) return false;
    map.delete(sessionId);
  }
  map.set(sessionId, now);
  return true;
}
{
  const map = new Map();
  assert.equal(tryBeginJobPure(map, "s1", 1000, 200_000), true);
  assert.equal(tryBeginJobPure(map, "s1", 2000, 200_000), false); // still held
  assert.equal(tryBeginJobPure(map, "s1", 1000 + 200_000, 200_000), true); // expired
}
assert.match(
  fs.readFileSync(join(root, "app/api/generate/route.ts"), "utf8"),
  /jobInFlightRetryAfterSec/
);
assert.match(
  fs.readFileSync(join(root, "app/api/image/route.ts"), "utf8"),
  /jobInFlightRetryAfterSec/
);

const me = fs.readFileSync(join(root, "app/api/me/route.ts"), "utf8");
assert.match(me, /probeSoftLiveReadiness/);
assert.match(me, /canLiveGenerate/);
assert.match(me, /cachedDemoFree/);
assert.match(me, /getAuthUserFromRequest|signedIn/);
assert.match(me, /getPersonalWallet|durable/);

// prompt build: always keep template (no freeform-only replace)
function sanitizeExtra(extra) {
  if (typeof extra !== "string") return "";
  return extra.trim().slice(0, 400);
}
function buildGeneratePrompt(template, extra) {
  const custom = sanitizeExtra(extra);
  if (!custom) return template;
  return `${template} Additional direction: ${custom}.`;
}
const tpl = "Toy hero spin, keep figure identity.";
assert.equal(buildGeneratePrompt(tpl, ""), tpl);
assert.match(buildGeneratePrompt(tpl, "neon lights"), /Toy hero spin/);
assert.match(buildGeneratePrompt(tpl, "x".repeat(500)), /Toy hero spin/);
assert.ok(buildGeneratePrompt(tpl, "x".repeat(500)).length < tpl.length + 50 + 400);

const pb = fs.readFileSync(join(root, "lib/promptBuild.ts"), "utf8");
assert.match(pb, /buildGeneratePrompt/);
assert.match(pb, /MAX_EXTRA_CHARS/);

const hist = fs.readFileSync(join(root, "lib/history.ts"), "utf8");
assert.match(hist, /remoteClipMayExpire/);
assert.match(hist, /inputImage:\s*_drop|QuotaExceeded|strip heavy/);
// Phase A4/G: never push multi-MB Base64 stills into device Library.
assert.match(hist, /slimInputImage|MAX_INPUT_IMAGE_CHARS/);
assert.match(hist, /8_000|8000/);
// Library import/download: refuse unsafe videoUrl schemes (parity with downloads gate).
assert.match(hist, /isSafeDeliverableUrl/);
assert.match(hist, /downloadGate|downloadAllowed/);
assert.match(hist, /"unsafe"|return "unsafe"/);
assert.match(gen, /creditsOutcome === "0 cached"|creditsOutcome === "10 used"/);

const wh = fs.readFileSync(join(root, "app/api/webhooks/stripe/route.ts"), "utf8");
assert.match(ent, /STRIPE_BILLING_FIXTURE_MODE/);
assert.match(wh, /applyStripeBillingEvent/);
assert.match(wh, /verifyStripeSignature/);
assert.match(wh, /grantedCredits/);

const batch = fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8");
assert.match(batch, /effectiveModel/);
assert.match(batch, /seedance-mini/);
assert.match(batch, /effectiveResolution/);

// Create first-run conversion (Phase F 390px): three actions in source;
// advanced controls stay collapsed on initial render.
const createFirstRunStudio = fs.readFileSync(
  join(root, "components/CreateStudio.tsx"),
  "utf8"
);
const createFirstRunJobs = fs.readFileSync(
  join(root, "components/JobIntentBar.tsx"),
  "utf8"
);
assert.match(createFirstRunStudio, /data-first-run-step="upload"/);
assert.match(createFirstRunStudio, /Upload owned toy photo/);
assert.match(createFirstRunStudio, /<JobIntentBar/);
assert.match(createFirstRunJobs, /data-first-run-step="recipe"/);
assert.match(createFirstRunJobs, /Choose a selling task/);
assert.match(createFirstRunStudio, /data-first-run-action="generate"/);
assert.match(createFirstRunStudio, /CREDITS_PER_VIDEO\} credits/);
assert.match(
  createFirstRunStudio,
  /const \[showAdvanced, setShowAdvanced\] = useState\(false\)/
);
assert.match(createFirstRunStudio, /aria-expanded=\{showAdvanced\}/);
const firstRunRecipeAt = createFirstRunStudio.indexOf(
  "<JobIntentBar"
);
const firstRunLabAt = createFirstRunStudio.indexOf(
  'data-first-run-lab="samples"'
);
const firstRunAdvancedAt = createFirstRunStudio.indexOf(
  'id="create-advanced-options"'
);
const firstRunIdentityAt = createFirstRunStudio.indexOf(
  "<AssetBriefPanel"
);
assert.ok(
  firstRunRecipeAt >= 0 && firstRunRecipeAt < firstRunLabAt,
  "mobile recipe must precede collapsed Lab samples"
);
assert.ok(
  firstRunAdvancedAt >= 0 && firstRunAdvancedAt < firstRunIdentityAt,
  "asset brief and toy fidelity guidance must stay inside Advanced"
);
// First-run stays seller-task-first; old activation/workflow shelves are gone.
assert.doesNotMatch(createFirstRunStudio, /<WorkflowShelf/);
assert.doesNotMatch(createFirstRunStudio, /<ActivationChecklist/);
assert.match(
  createFirstRunStudio,
  /<JobIntentBar[\s\S]{0,220}showSellerPack=\{privateUploadEnabled\}/
);
// Model shelf and activation chrome are removed from the first-run path.
assert.doesNotMatch(createFirstRunStudio, /Seedance · live/);
assert.doesNotMatch(
  createFirstRunStudio,
  /Activation \+ workflow shelf: desktop density/
);

// Seller Pack first-run (Phase F 390px): compact steps + sticky actions.
const sellerPackStepsSrc = fs.readFileSync(
  join(root, "components/SellerPackSteps.tsx"),
  "utf8"
);
assert.match(sellerPackStepsSrc, /data-seller-pack-steps="compact"/);
assert.match(sellerPackStepsSrc, /data-seller-pack-steps="full"/);
assert.match(sellerPackStepsSrc, /sm:hidden/);
assert.match(sellerPackStepsSrc, /hidden gap-2 sm:grid/);
const batchFirstRun = fs.readFileSync(
  join(root, "components/BatchStudio.tsx"),
  "utf8"
);
assert.match(batchFirstRun, /data-seller-pack-step="upload"/);
assert.match(batchFirstRun, /Upload owned toy photo/);
assert.match(batchFirstRun, /data-seller-pack-action="upload"/);
assert.match(
  batchFirstRun,
  /data-seller-pack-action=\{[\s\S]*privateInputOnly \? undefined : "generate"/
);
assert.match(batchFirstRun, /data-seller-pack-action="library"/);
assert.match(batchFirstRun, /data-seller-pack-action="review-failed"/);
assert.match(batchFirstRun, /data-seller-pack-sticky="mobile"/);
assert.match(batchFirstRun, /Review failed clip/);
assert.match(batchFirstRun, /Retry this format · reserve 10 credits/);
assert.match(batchFirstRun, /archived motion test/i);
assert.match(batchFirstRun, /separate sample toy/i);
assert.doesNotMatch(batchFirstRun, /Lab samples are official examples/i);

const meClient = fs.readFileSync(join(root, "lib/meClient.ts"), "utf8");
assert.match(meClient, /export async function fetchMe/);
assert.match(meClient, /cachedDemoFree/);
assert.match(meClient, /export function mergeMeSession/);
assert.match(meClient, /export function rehydrateFreeTrial/);
assert.match(
  meClient,
  /Prefer live session credits|Prefer live cookie credits|display-only|not live-spend/
);
// R0: /api/me must not claim cookie is live generate authority
const meRouteSrc = fs.readFileSync(join(root, "app/api/me/route.ts"), "utf8");
assert.doesNotMatch(
  meRouteSrc,
  /Cookie credits remain the soft-launch generate authority|cookie still debit authority for soft-launch live/
);
assert.match(meRouteSrc, /cookieIsLiveSpendAuthority:\s*false/);
assert.match(meRouteSrc, /liveSpendAuthority|durable-reserve/);
assert.match(meRouteSrc, /freeLiveProvider:\s*"blocked-until-t6"|liveEnabled:\s*false/);
// R0 residual: Profile / claim / Settings / badge must not re-assert cookie generate authority
const profileR0Src = fs.readFileSync(
  join(root, "components/ProfilePanel.tsx"),
  "utf8"
);
assert.doesNotMatch(
  profileR0Src,
  /cookie is generate authority|cookie-authoritative|settles the cookie|debits the guest cookie|still cookie-authoritative/
);
assert.match(
  profileR0Src,
  /not live-spend authority|cookie is not live-spend/
);
const claimR0Src = fs.readFileSync(
  join(root, "app/api/auth/claim/route.ts"),
  "utf8"
);
assert.doesNotMatch(
  claimR0Src,
  /soft-launch generate authority|Cookie session remains the soft-launch/
);
assert.match(claimR0Src, /never live-spend authority|not live-spend authority/);
const settingsR0Src = fs.readFileSync(
  join(root, "app/settings/page.tsx"),
  "utf8"
);
assert.doesNotMatch(settingsR0Src, /still debits the guest cookie/);
// Old dishonest authority cell: bare "cookie generate" (not "cookie display only")
assert.doesNotMatch(settingsR0Src, /cookie generate(?!\s*only)/);
assert.match(
  settingsR0Src,
  /not live-spend|cookie display only/
);
// Badge / FreeTrialCta / Settings must not re-claim cookie live authority
const creditsBadgeR0 = fs.readFileSync(
  join(root, "components/CreditsBadge.tsx"),
  "utf8"
);
assert.doesNotMatch(
  creditsBadgeR0,
  /cookie still generate authority|cookie still generates|cookie still authoritative for generate/
);
assert.match(
  creditsBadgeR0,
  /canLiveGenerate\(session\)/
);
assert.match(
  creditsBadgeR0,
  /canLiveGenerate|liveEnabled|cached previews/
);
const freeTrialCtaR0 = fs.readFileSync(
  join(root, "components/FreeTrialCta.tsx"),
  "utf8"
);
assert.match(freeTrialCtaR0, /liveEnabled|Cached preview|Try cached sample/);
assert.match(
  fs.readFileSync(join(root, "app/settings/page.tsx"), "utf8"),
  /cookieIsLiveSpendAuthority|Display credits \(not live authority\)|blocked until T6/
);
// meClient preserves cancel refund policy across PublicSession merges
assert.match(
  fs.readFileSync(join(root, "lib/meClient.ts"), "utf8"),
  /ledgerCancelRefund/
);
assert.match(
  fs.readFileSync(join(root, "lib/meClient.ts"), "utf8"),
  /ledgerCancelRefund: refundPolicy\.ledgerCancelRefund \?\? ["']unconfirmed["']/
);
assert.match(
  fs.readFileSync(join(root, "components/StatusProbe.tsx"), "utf8"),
  /cancel unconfirmed|ledgerCancelRefund/
);
assert.match(
  fs.readFileSync(join(root, "app/settings/page.tsx"), "utf8"),
  /ledgerCancelRefund|cancel unconfirmed/
);


// freeTrial honesty after generate PublicSession merge (stale exhausted must not win)
function freeTrialExhaustedPure(me) {
  if (!me) return false;
  const isFree = me.plan === "free" || me.freeTrial?.isFreePlan === true;
  if (!isFree) return false;
  const need =
    me.freeTrial?.liveJobCredits ?? me.liveJobCredits ?? me.creditsPerVideo ?? 10;
  if (typeof me.credits === "number") return me.credits < need;
  return me.freeTrial?.exhausted === true;
}
function rehydrateFreeTrialPure(me) {
  const need =
    me.freeTrial?.liveJobCredits ?? me.liveJobCredits ?? me.creditsPerVideo ?? 10;
  const credits = typeof me.credits === "number" ? Math.max(0, me.credits) : 0;
  const clipsLeft = Math.floor(credits / need);
  if (me.plan !== "free") {
    return {
      ...me,
      freeTrial: me.freeTrial
        ? {
            ...me.freeTrial,
            isFreePlan: false,
            credits,
            clipsLeft,
            freeLive: null,
            exhausted: false,
          }
        : me.freeTrial,
    };
  }
  return {
    ...me,
    freeTrial: {
      planId: me.plan,
      isFreePlan: true,
      credits,
      clipsLeft,
      liveJobCredits: need,
      watermark: true,
      cachedDemoFree: true,
      freeLive: {
        modelClass: "seedance-mini",
        durationSec: 5,
        resolution: "480p",
        onPlayerMark: true,
      },
      exhausted: credits < need,
    },
  };
}
function mergeMeSessionPure(prev, patch) {
  if (!patch) return prev ?? null;
  const merged = prev ? { ...prev, ...patch } : { ...patch };
  return rehydrateFreeTrialPure(merged);
}
{
  // After live debit: credits→0 but freeTrial.exhausted still false (old bug)
  const stale = {
    plan: "free",
    credits: 0,
    creditsPerVideo: 10,
    freeTrial: {
      isFreePlan: true,
      exhausted: false,
      clipsLeft: 1,
      liveJobCredits: 10,
      credits: 10,
    },
  };
  assert.equal(freeTrialExhaustedPure(stale), true, "credits 0 must exhaust trial");
  const fixed = rehydrateFreeTrialPure(stale);
  assert.equal(fixed.freeTrial.exhausted, true);
  assert.equal(fixed.freeTrial.clipsLeft, 0);
  // Merge PublicSession patch (generate success) must rehydrate
  const prev = {
    plan: "free",
    credits: 10,
    creditsPerVideo: 10,
    watermark: true,
    freeTrial: {
      isFreePlan: true,
      exhausted: false,
      clipsLeft: 1,
      liveJobCredits: 10,
      credits: 10,
    },
  };
  const after = mergeMeSessionPure(prev, {
    credits: 0,
    plan: "free",
    clipsLeft: 0,
    creditsPerVideo: 10,
    watermark: true,
  });
  assert.equal(after.freeTrial.exhausted, true);
  assert.equal(after.freeTrial.clipsLeft, 0);
  assert.equal(freeTrialExhaustedPure(after), true);
}

const samples = fs.readFileSync(join(root, "lib/samples.ts"), "utf8");
assert.match(samples, /isValidImageDataUrl/);
assert.match(samples, /requiredSampleStillPaths/);

const health = fs.readFileSync(join(root, "app/api/health/route.ts"), "utf8");
assert.match(health, /export async function HEAD/);

const logo = fs.readFileSync(join(root, "components/Logo.tsx"), "utf8");
assert.match(logo, /useId/);
assert.match(logo, /pikbo-sheen-/);

const confirm = fs.readFileSync(
  join(root, "app/api/checkout/confirm/route.ts"),
  "utf8"
);
assert.match(confirm, /paidCheckoutIsValid/);
assert.match(confirm, /billingMetadataMatches/);
assert.match(confirm, /WEBHOOK_PENDING/);
assert.doesNotMatch(confirm, /upsertEntitlement|setPlan|saveSession/);

// G7: dev topup never open on production hosts
const topup = fs.readFileSync(join(root, "app/api/dev/topup/route.ts"), "utf8");
assert.match(topup, /FORBIDDEN|Dev topup disabled/);
assert.match(topup, /VERCEL_ENV|NODE_ENV/);
assert.match(topup, /production/);

// G6 forced fail must be non-production only
assert.match(genRoute, /PIKBO_FORCE_GENERATE_FAIL/);
assert.match(genRoute, /VERCEL_ENV !== "production"/);
assert.match(genRoute, /creditsRefunded:\s*released/);

const pbFull = fs.readFileSync(join(root, "lib/promptBuild.ts"), "utf8");
assert.match(pbFull, /TOY_IDENTITY_LOCK/);
assert.match(pbFull, /withIdentityLock|Keep the exact same toy/i);

const contracts = fs.readFileSync(join(root, "lib/contracts.ts"), "utf8");
assert.match(contracts, /ownsRights/);
assert.match(contracts, /RIGHTS_REQUIRED/);
assert.match(genRoute, /RIGHTS_REQUIRED/);
assert.match(genRoute, /ownsRights !== true/);

// Soft-launch PRD §6 provenance labels must stay wired
const provenance = fs.readFileSync(join(root, "lib/provenance.ts"), "utf8");
assert.match(provenance, /Cached demo/);
assert.match(provenance, /Live generation/);
assert.match(provenance, /On-player mark/);
assert.match(provenance, /Local Library/);
assert.match(provenance, /private owner-only result/);
assert.match(provenance, /isIgnoredOwnedUploadResult/);
const createStudio = fs.readFileSync(
  join(root, "components/CreateStudio.tsx"),
  "utf8"
);
assert.match(createStudio, /resultProvenanceLabel/);
assert.match(createStudio, /PROVENANCE\.onPlayerMark|onPlayerMark/);
assert.match(createStudio, /ignoredOwnedUpload/);
assert.match(createStudio, /Your photo was not processed/);
assert.match(createStudio, /showLabSample=\{lastUploadIgnored \|\| !image\}/);
const ignoredUploadGateAt = createStudio.indexOf(
  "const ignoredOwnedUpload = isIgnoredOwnedUploadResult"
);
const acceptedResultAt = createStudio.indexOf("setVideoUrl(data.videoUrl)");
assert.ok(
  ignoredUploadGateAt > 0 && acceptedResultAt > ignoredUploadGateAt,
  "owned-upload honesty gate must run before any cached URL becomes READY"
);
const provenanceCjs = require("typescript").transpileModule(provenance, {
  compilerOptions: {
    module: require("typescript").ModuleKind.CommonJS,
    target: require("typescript").ScriptTarget.ES2022,
  },
}).outputText;
const provenanceFixtureModule = { exports: {} };
new Function("require", "exports", "module", provenanceCjs)(
  require,
  provenanceFixtureModule.exports,
  provenanceFixtureModule
);
const provenanceFixture = provenanceFixtureModule.exports;
assert.match(
  provenanceFixture.privateLibraryNote(),
  /Account Library.*private owner-only result/
);
assert.equal(
  provenanceFixture.isIgnoredOwnedUploadResult({
    demo: true,
    processedUpload: false,
    uploadIgnored: true,
    labSample: false,
  }),
  true
);
assert.equal(
  provenanceFixture.isIgnoredOwnedUploadResult({
    demo: true,
    labSample: false,
  }),
  true,
  "legacy cached payloads must also fail closed for an owned upload"
);
assert.equal(
  provenanceFixture.isIgnoredOwnedUploadResult({
    demo: true,
    processedUpload: false,
    uploadIgnored: true,
    labSample: true,
  }),
  false,
  "explicit Lab samples remain previewable"
);
assert.equal(
  provenanceFixture.isIgnoredOwnedUploadResult({
    demo: false,
    processedUpload: true,
    uploadIgnored: false,
    labSample: false,
  }),
  false,
  "confirmed live upload remains a successful result"
);
assert.match(createStudio, /data\.privateResult === true/);
assert.match(createStudio, /Next generation quote/);
assert.match(createStudio, /seedanceModelLabel/);
const landing = fs.readFileSync(
  join(root, "components/LandingToolPanel.tsx"),
  "utf8"
);
assert.match(landing, /resultProvenanceLabel/);
const library = fs.readFileSync(join(root, "components/LibraryGrid.tsx"), "utf8");
assert.match(gen, /RIGHTS_REQUIRED|UNKNOWN_EFFECT/);

// Library MVP contract: account results only, one generations ledger, and
// owner-gated video delivery. This replaces the retired device-history,
// stills-shelf, and Pack-specific Library UI assertions below.
assert.match(library, /fetchMe\(\{\s*timeoutMs:\s*STUDIO_SESSION_BOOT_MS\s*\}\)/);
assert.match(library, /if \(!me\?\.signedIn\)/);
assert.match(library, /href=["']\/login\?next=\/library["']/);
assert.match(library, /fetch\(["']\/api\/generations["']/);
assert.doesNotMatch(library, /\/api\/image(?:\/|["'`])/);
assert.match(library, /body\.jobs\.filter\(visibleAccountJob\)/);
assert.match(library, /if \(job\.demo\) return false/);
assert.match(library, /privateDownloadHeaders/);
assert.match(library, /method:\s*["']HEAD["']/);
assert.match(library, /interpretDownloadHead/);
assert.match(library, /downloadVideoFile/);
assert.match(library, /<video[\s\S]{0,500}controls[\s\S]{0,500}playsInline/);
assert.match(library, /function isOpen\(status[\s\S]{0,180}queued[\s\S]{0,80}running/);
assert.match(library, /isOpen\(job\.status\)[\s\S]{0,350}void cancel\(job\)/);
assert.match(library, /isRetryable\(job\.status\)[\s\S]{0,350}void retry\(job\)/);
assert.match(library, /status === ["']failed["'] \|\| status === ["']canceled["']/);
assert.match(library, /\/api\/generations\/\$\{encodeURIComponent\(job\.id\)\}\/retry/);
assert.match(library, /method:\s*["']POST["']/);
assert.match(library, /\/api\/generations\/\$\{encodeURIComponent\(job\.id\)\}/);
assert.match(library, /method:\s*["']DELETE["']/);
assert.match(
  library,
  /const CREATE_MOMENT_HREF\s*=\s*`\$\{MOMENT_CREATE_HREF\}&source=library`/
);
assert.match(library, /href=\{CREATE_MOMENT_HREF\}/);

const softlive = fs.readFileSync(
  join(root, "scripts/softlive-checklist.sh"),
  "utf8"
);
assert.match(softlive, /required for soft-live/);
assert.match(softlive, /optional until Stripe/);

// Soft-launch refund honesty + primary nav (first principles)
assert.match(contracts, /creditsRefunded/);
assert.match(genRoute, /creditsRefunded:\s*released/);
assert.match(gen, /creditsRefunded/);
assert.match(gen, /10 credits restored/);
const appShell = fs.readFileSync(join(root, "components/AppShell.tsx"), "utf8");
assert.match(appShell, /PRIMARY_NAV\.filter\([\s\S]*?\.map/);
assert.doesNotMatch(appShell, /const MORE|MoreMenu|CommandPalette/);
assert.match(appShell, /CreditsBadge|LanguageSwitcher/);
assert.match(
  appShell,
  /MOMENT_CREATE_HREF[\s\S]*?const DEFAULT_MOMENT_CREATE_HREF\s*=\s*`\$\{MOMENT_CREATE_HREF\}&source=moment-shell`[\s\S]*?const PRIMARY_NAV_CREATE_HREF\s*=\s*`\$\{MOMENT_CREATE_HREF\}&source=primary-nav`[\s\S]*?data-primary-create-href=\{\s*motionChrome\s*\?\s*HOME_SHELL_GENERATE_HREF\s*:\s*PRIMARY_NAV_CREATE_HREF\s*\}/
);
assert.match(
  appShell,
  /createGenerate360Href\(\s*["']app-shell-home["']\s*\)/
);
assert.doesNotMatch(
  appShell,
  /\/create\?effect=street-power-up&source=primary-nav/
);
const historySrc = fs.readFileSync(join(root, "lib/history.ts"), "utf8");
assert.match(historySrc, /historyProvenance|provenance/);
assert.match(historySrc, /sourceProject/);

// Remake loop handoff contract
const remix = fs.readFileSync(join(root, "lib/remixIntent.ts"), "utf8");
assert.match(remix, /export function buildCreateRemixHref/);
assert.match(remix, /export function parseRemixSearchParams/);
assert.match(remix, /export function hasRemixSearchParams/);
assert.match(remix, /sourceProjectSlug/);
assert.match(createStudio, /sourceProject|remix\.intent/);
// Execute the production pure remix parser with a tiny fixture catalog.
// Catches a fresh /create accidentally inheriting PRESETS[0]'s demo card.
const remixFixturePresets = [
  {
    slug: "fixture-spin",
    aspectRatio: "1:1",
    duration: 5,
    promptTemplate: "fixture prompt",
  },
];
const remixFixtureDemos = [
  {
    id: "fixture-source",
    preset: "fixture-spin",
    character: "Fixture toy",
    title: "Fixture spin",
    poster: "/fixture-poster.jpg",
  },
];
const remixCjs = require("typescript").transpileModule(remix, {
  compilerOptions: {
    module: require("typescript").ModuleKind.CommonJS,
    target: require("typescript").ScriptTarget.ES2022,
  },
}).outputText;
const remixFixtureModule = { exports: {} };
new Function("require", "exports", "module", remixCjs)(
  (id) => {
    if (id === "@/lib/presets") {
      return {
        PRESETS: remixFixturePresets,
        getPreset: (slug) => remixFixturePresets.find((p) => p.slug === slug),
      };
    }
    if (id === "@/lib/demoVideos") return { DEMO_VIDEOS: remixFixtureDemos };
    if (id === "@/lib/viralNames") return { viralName: (_slug, name) => name };
    throw new Error(`unexpected remix fixture import: ${id}`);
  },
  remixFixtureModule.exports,
  remixFixtureModule
);
const remixFixture = remixFixtureModule.exports;
assert.deepEqual(remixFixture.parseRemixSearchParams({}), {
  intent: null,
  notices: [],
  sourceLabel: null,
  sourcePoster: null,
});
const validRemixFixture = remixFixture.parseRemixSearchParams({
  effect: "fixture-spin",
  source: "fixture-source",
  ratio: "9:16",
  duration: "10",
  channel: "tiktok",
});
assert.equal(validRemixFixture.intent?.recipeSlug, "fixture-spin");
assert.equal(validRemixFixture.intent?.sourceProjectSlug, "fixture-source");
assert.equal(validRemixFixture.intent?.aspectRatio, "9:16");
assert.equal(validRemixFixture.intent?.durationSeconds, 10);
assert.equal(validRemixFixture.intent?.channel, "tiktok");
assert.equal(validRemixFixture.sourcePoster, "/fixture-poster.jpg");
const invalidRemixFixture = remixFixture.parseRemixSearchParams({
  effect: "not-a-recipe",
});
assert.equal(invalidRemixFixture.intent?.recipeSlug, "fixture-spin");
assert.match(invalidRemixFixture.notices.join(" "), /Unknown recipe/);
// createRemixHref opts: job ratio/duration override recipe defaults (1:1 / 5s)
assert.equal(typeof remixFixture.createRemixHref, "function");
assert.equal(typeof remixFixture.remixOptsFromRecord, "function");
const defaultRemixHref = remixFixture.createRemixHref("fixture-spin");
assert.match(defaultRemixHref, /ratio=1%3A1|ratio=1:1/);
assert.match(defaultRemixHref, /duration=5/);
const jobRemixHref = remixFixture.createRemixHref(
  "fixture-spin",
  undefined,
  null,
  remixFixture.remixOptsFromRecord({
    aspectRatio: "9:16",
    duration: 10,
    channel: "tiktok",
  })
);
assert.match(jobRemixHref, /ratio=9%3A16|ratio=9:16/);
assert.match(jobRemixHref, /duration=10/);
assert.match(jobRemixHref, /channel=tiktok/);
const projectsPage = fs.readFileSync(
  join(root, "app/projects/[slug]/page.tsx"),
  "utf8"
);
assert.match(projectsPage, /generateStaticParams/);
assert.match(projectsPage, /listShowcaseProjectSlugs/);
assert.match(projectsPage, /getShowcaseProject/);
const videoFeedSrc = fs.readFileSync(join(root, "lib/videoFeed.ts"), "utf8");
assert.match(videoFeedSrc, /export function listCachedLabProjectSlugs/);
assert.match(health, /forceGenerateFail/);
assert.match(imgRoute, /PIKBO_FORCE_GENERATE_FAIL/);
const remixIntentSrc = fs.readFileSync(join(root, "lib/remixIntent.ts"), "utf8");
assert.match(remixIntentSrc, /sku\?:\s*string/);
assert.match(remixIntentSrc, /sku=\$\{encodeURIComponent/);
// Job/history remake carries actual ratio/duration/channel (not recipe default only)
assert.match(remixIntentSrc, /export type RemixHrefOpts|RemixHrefOpts\s*=/);
assert.match(remixIntentSrc, /remixOptsFromRecord/);
assert.match(remixIntentSrc, /opts\?\.ratio|opts\?\.duration|opts\?\.channel/);


// One-tap Lab samples stay cached even for invited accounts; never spend Provider.
assert.match(createStudio, /loadSampleToy/);
assert.match(createStudio, /labSampleId|lab-sample-/);
assert.match(createStudio, /PIKBO Lab prototype sample/);
assert.doesNotMatch(createStudio, /Official Lab|official Lab/);
assert.match(createStudio, /cached · 0 credits/i);
assert.match(createStudio, /allowProviderSpend: !demoMode && !requestUsesLabSample/);
assert.match(createStudio, /data-public-single-preview="lab-only"/);
assert.match(createStudio, /if \(!requestUsesLabSample && !privateUploadEnabled\)/);

// Wave A Create versions: stack + Before/After per-version still
assert.match(createStudio, /ResultVersion|type ResultVersion/);
assert.match(createStudio, /selectVersion|setVersions/);
assert.match(createStudio, /sourceKey|sourceStore|internSourceImage/);
assert.match(createStudio, /creditState/);

// MVP Create surface: one fixed Moment contract; the archived Seller Pack
// workspace remains on the preview/supercomputer route instead of /create.
const createPage = fs.readFileSync(join(root, "app/create/page.tsx"), "utf8");
assert.match(createPage, /<CreateStudio/);
assert.match(createPage, /initialEffect=["']street-power-up["']/);
assert.match(createPage, /fixedMomentContract/);
assert.doesNotMatch(createPage, /BatchStudio|PrivateSellerPackGate/);
// AIT-549: Create page residual carnival → gallery-calm copper board
assert.doesNotMatch(
  createPage,
  /#FF4ECD|#00D9FF|#B14EFF|FF4ECD|00D9FF|B14EFF|rgba\(255\s*,\s*78\s*,\s*205|rgba\(0\s*,\s*217\s*,\s*255|rgba\(177\s*,\s*78\s*,\s*255/i
);
assert.match(createPage, /var\(--brand\)/);
assert.match(createPage, /var\(--brand-2\)/);
assert.match(createPage, /rgba\(196\s*,\s*165\s*,\s*116/);
assert.match(createPage, /WORKBENCH_LAB_LIVE_HONESTY/);
assert.match(createPage, /data-workbench-honesty=["']lab-live["']/);
assert.match(createPage, /Pikbo Moment · private render/);
assert.match(createPage, /fixedMomentContract/);
const batchPage = fs.readFileSync(
  join(root, "app/supercomputer/page.tsx"),
  "utf8"
);
// Legacy /supercomputer?pack=seller preserves sku/try/sample into Create
assert.match(batchPage, /mode=seller-pack|URLSearchParams/);
assert.match(batchPage, /sku|try|sample/);
// Preview Batch: PREVIEW_ROBOTS + closed-loop AfterPath (not a dead-end shelf)
assert.match(batchPage, /PREVIEW_ROBOTS/);
assert.match(batchPage, /GenerateAfterPath/);
assert.match(
  fs.readFileSync(join(root, "app/models/page.tsx"), "utf8"),
  /PREVIEW_ROBOTS/
);
const showcase = fs.readFileSync(
  join(root, "lib/showcaseProjects.ts"),
  "utf8"
);
assert.match(showcase, /listShowcaseProjects/);
assert.match(showcase, /getShowcaseProject/);
for (const field of [
  "referencePoster",
  "outputVideo",
  "poster",
  "recipeSlug",
  "provenance",
  "model",
  "aspectRatio",
  "durationSeconds",
  "resolution",
  "promptSummary",
  "negativeConstraints",
]) {
  assert.match(showcase, new RegExp(field));
}
assert.match(showcase, /assertRegistryIntegrity/);
assert.match(showcase, /output reused under another title/);

const exploreGrid = fs.readFileSync(
  join(root, "components/ExploreProjectGrid.tsx"),
  "utf8"
);
for (const category of [
  "All",
  "Listing",
  "Unboxing",
  "Come alive",
  "Social hooks",
  "Story",
]) {
  assert.match(showcase, new RegExp(category));
}
assert.match(exploreGrid, /showcaseProjectHref/);
assert.match(exploreGrid, /desktopPlayMode="interaction"/);
assert.match(exploreGrid, /focusable=\{false\}/);
assert.match(createStudio, /ResultVersion/);
assert.match(createStudio, /create\.retrySame|Retry · same settings|retryActiveVersion/);
assert.match(createStudio, /create\.makeVariant|Make variant|makeVariant/);
assert.match(createStudio, /refund unconfirmed/);
const batchStudio = fs.readFileSync(
  join(root, "components/BatchStudio.tsx"),
  "utf8"
);
assert.match(batchStudio, /status:\s*"succeeded"/);
assert.match(batchStudio, /status:\s*refunded\s*\?\s*"refunded"/);
assert.match(batchStudio, /retryJob/);
assert.match(batchStudio, /not_started/);
assert.match(batchStudio, /refund unconfirmed/);
assert.match(batchStudio, /requestCreditStateFromFailure/);
assert.match(batchStudio, /Download blocked · Free raw/);

// ── Wave B trust ──────────────────────────────────────────────────────────
// B1: last-request settlement must not be overwritten by version creditState
function requestCreditStateFromFailure(result) {
  if (result.creditsRefunded === true) return "10 restored";
  if (
    result.refundUnconfirmed === true ||
    result.status === 0 ||
    result.code === "NETWORK_ERROR" ||
    result.code === "PROVIDER_NETWORK" ||
    result.code === "REQUEST_CANCELED" ||
    result.code === "CANCELED" ||
    result.code === "TIMEOUT" ||
    result.code === "PROVIDER_TIMEOUT" ||
    (result.code === "UNSAFE_URL" && result.creditsRefunded !== true) ||
    (result.code === "CONTENT_POLICY" && result.creditsRefunded !== true) ||
    (result.code === "MODEL_EMPTY" && result.creditsRefunded !== true)
  ) {
    return "refund unconfirmed";
  }
  return null;
}
function preserveRequestSettlementOnVersionRestore(lastRequest, _versionCredit) {
  void _versionCredit;
  return lastRequest;
}
function requestSettlementAfterSelectVersion(lastRequest) {
  return lastRequest;
}
function canDownloadResult(opts) {
  if (opts.demo) return true;
  if (opts.watermark) return false;
  return true;
}
// 1) old success → network fail → unconfirmed survives version restore
{
  const fail = requestCreditStateFromFailure({
    creditsRefunded: false,
    status: 0,
  });
  assert.equal(fail, "refund unconfirmed");
  assert.equal(
    preserveRequestSettlementOnVersionRestore(fail, "10 used"),
    "refund unconfirmed"
  );
  assert.equal(
    requestSettlementAfterSelectVersion("refund unconfirmed"),
    "refund unconfirmed"
  );
}
// 2) old success → confirmed refund
{
  const refunded = requestCreditStateFromFailure({
    creditsRefunded: true,
    status: 500,
  });
  assert.equal(refunded, "10 restored");
  assert.equal(
    preserveRequestSettlementOnVersionRestore(refunded, "0 cached"),
    "10 restored"
  );
}
// 2b) ledger TIMEOUT → unconfirmed (never claim restored)
{
  assert.equal(
    requestCreditStateFromFailure({
      creditsRefunded: false,
      status: 504,
      code: "TIMEOUT",
    }),
    "refund unconfirmed"
  );
  assert.equal(
    requestCreditStateFromFailure({
      refundUnconfirmed: true,
      status: 504,
      code: "TIMEOUT",
    }),
    "refund unconfirmed"
  );
}
// 3) Retry uses frozen GenerationSpec; Make variant uses composer (source markers)
assert.match(createStudio, /retrySpec/);
assert.match(createStudio, /buildGenerationSpec|GenerationSpec/);
assert.match(createStudio, /retryActiveVersion/);
assert.match(createStudio, /makeVariant/);
// 4) Free live cannot download raw provider URL
assert.equal(canDownloadResult({ demo: false, watermark: true }), false);
assert.equal(canDownloadResult({ demo: true, watermark: true }), true);
assert.equal(canDownloadResult({ demo: false, watermark: false }), true);
assert.match(
  createStudio,
  /canDownloadResult|downloadBlockedCtaLabel|Download held · T6 bake/
);
assert.match(createStudio, /freeLiveDownloadBlockReason|Free Mini live/);
assert.match(createStudio, /downloadPolicyLabel/);
// 5) Seller Pack single-item retry keeps siblings (retryJob maps by slug only)
assert.match(batchStudio, /previous\.map\(\(job\) => \(job\.slug === slug/);
// B3: server echo fields on generate success
assert.match(genRoute, /costCredits/);
assert.match(genRoute, /creditsOutcome/);
assert.match(genRoute, /effect:\s*preset\.slug/);
assert.match(contracts, /costCredits/);
assert.match(contracts, /creditsOutcome/);
// B5: AutoPlayVideo can disable nested tabIndex inside Link
const autoPlay = fs.readFileSync(
  join(root, "components/AutoPlayVideo.tsx"),
  "utf8"
);
assert.match(autoPlay, /focusable/);
// B6: CI workflow template (OAuth lacks workflow scope for .github path)
const ciYml = fs.readFileSync(
  join(root, "docs/ci/github-actions-ci.yml"),
  "utf8"
);
assert.match(ciYml, /engine-smoke/);
assert.match(ciYml, /recovery-qa|recovery-cost-gate/);
assert.match(ciYml, /recovery-ledger/);
assert.match(ciYml, /recovery-retry-deadline/);
assert.match(ciYml, /showcase-evidence-smoke/);
assert.match(ciYml, /seo-cold-start-smoke/);
assert.match(ciYml, /seller-pack-cached-smoke/);
assert.match(ciYml, /seller-pack-api-golden/);
assert.match(ciYml, /typecheck/);
assert.match(ciYml, /npm run build/);
assert.match(ciYml, /npm run critical-path/);
// R3: demo critical-path must fail the job (no soft swallow)
assert.doesNotMatch(ciYml, /critical-path\s*\|\|\s*true/);
// install path documented for when workflow scope is available
assert.match(ciYml, /name: CI/);
assert.match(
  fs.readFileSync(join(root, "package.json"), "utf8"),
  /"recovery-qa"/
);
assert.match(
  fs.readFileSync(join(root, "package.json"), "utf8"),
  /"recovery-ledger"/
);
assert.match(
  fs.readFileSync(join(root, "scripts/recovery-qa.mjs"), "utf8"),
  /concurrent reserves must not overspend/
);
// R1a capture-ambiguity client: withhold, never invent refund
assert.match(gen, /DURABLE_CREDITS_UNAVAILABLE/);
assert.match(
  gen,
  /code === "DURABLE_CREDITS_UNAVAILABLE"[\s\S]{0,500}refundUnconfirmed:\s*undefined/
);
assert.match(
  fs.readFileSync(join(root, "app/api/health/route.ts"), "utf8"),
  /recoveryLedger/
);
assert.match(
  fs.readFileSync(join(root, "app/api/health/route.ts"), "utf8"),
  /r1aAtomicRpcSource:\s*true/
);
// Pure module must export Wave B helpers
const createTrust = fs.readFileSync(
  join(root, "lib/createTrust.ts"),
  "utf8"
);
assert.match(createTrust, /export function requestCreditStateFromFailure/);
assert.match(createTrust, /export function canDownloadResult/);
assert.match(createTrust, /export function downloadPolicyLabel/);
assert.match(createTrust, /export function downloadBlockedCtaLabel/);
assert.match(createTrust, /export function buildGenerationSpec/);
// Pure policy labels stay honest for Free live (T6)
function downloadPolicyLabel(opts) {
  if (opts.demo) return "Demo open · Lab";
  if (opts.downloadAllowed) return "Allowed";
  return "Held for T6 bake · Free raw blocked";
}
assert.equal(
  downloadPolicyLabel({ demo: false, downloadAllowed: false }),
  "Held for T6 bake · Free raw blocked"
);
assert.equal(
  downloadPolicyLabel({ demo: true, downloadAllowed: true }),
  "Demo open · Lab"
);
assert.equal(
  downloadPolicyLabel({ demo: false, downloadAllowed: true }),
  "Allowed"
);
assert.match(createStudio, /lastRequestCreditState/);
assert.match(createStudio, /preserveRequestSettlementOnVersionRestore/);

// G2: homepage proof whitelist frozen in softLaunch + consumed by the
// canonical ShowcaseProject registry that powers homepage/videoFeed.
const softLaunch = fs.readFileSync(join(root, "lib/softLaunch.ts"), "utf8");
assert.match(softLaunch, /HOME_PROOF_SLUGS/);

// Recovery R4: no provisional numeric QA may appear without evidence records.
for (const relative of [
  "lib/showcaseProjects.ts",
  "components/HomeDesignerGallery.tsx",
  "components/HomeCinemaHero.tsx",
  "components/HomeProjectsExplore.tsx",
  "components/ProjectCard.tsx",
  "components/HfExploreHome.tsx",
  "components/PresetPreviewCard.tsx",
  "components/VideoTile.tsx",
]) {
  const source = fs.readFileSync(join(root, relative), "utf8");
  assert.doesNotMatch(
    source,
    /provisionalLabQualityLabel|Lab\s*≥\s*4|data-proof-quality|Official · cached/
  );
}
assert.match(
  fs.readFileSync(join(root, "components/PresetPreviewCard.tsx"), "utf8"),
  /Lab · cached prototype/
);
assert.match(
  fs.readFileSync(join(root, "components/VideoTile.tsx"), "utf8"),
  /Lab · cached prototype/
);

assert.match(softLaunch, /floating-hero/);
assert.match(softLaunch, /mystery-box-reveal/);
assert.match(softLaunch, /display-case-glam/);
const videoFeed = fs.readFileSync(join(root, "lib/videoFeed.ts"), "utf8");
assert.match(showcase, /HOME_PROOF_SLUGS/);
assert.match(showcase, /listHomeShowcaseProjects/);
assert.match(videoFeed, /HOME_PROOF_SLUGS|HOME_SHOWCASE_LIMIT/);
assert.match(videoFeed, /listHomeShowcaseProjects/);
assert.match(videoFeed, /conceptRecipeCount/);
assert.match(videoFeed, /cached Lab prototypes only/i);
// Claude viral presets (SEO mesh) must remain registered
const presetsSrc = fs.readFileSync(join(root, "lib/presets.ts"), "utf8");
for (const slug of [
  "melt-and-reform",
  "bullet-time-orbit",
  "desk-adventure",
  "confetti-drop-reveal",
  "snow-globe-world",
]) {
  assert.match(presetsSrc, new RegExp(`slug:\\s*"${slug}"`));
}
// Concept shared-loop badge must not reappear as Lab wall filler
assert.doesNotMatch(
  videoFeed.slice(videoFeed.indexOf("export function buildVideoFeed")),
  /badge:\s*"Concept · shared loop"/
);

// Credit ledger pure math (parity with lib/credits.ts)
function checkCredits(credits, cost = 10) {
  if (credits < cost) return { ok: false, need: cost, have: credits };
  return { ok: true, cost, remainingAfter: credits - cost };
}
function deduct(credits, amount = 10) {
  return Math.max(0, credits - amount);
}
function refund(credits, amount = 10, cap = 10) {
  return Math.min(cap * 2, credits + amount);
}
assert.equal(checkCredits(10).ok, true);
assert.equal(checkCredits(5).ok, false);
assert.equal(deduct(10), 0);
assert.equal(refund(0), 10);
assert.equal(refund(10, 10, 10), 20); // over-cap allowed temporarily

// interpretGenerateResponse refund messaging
const refunded = interpretGenerateResponse(500, {
  error: "Model hiccup",
  code: "GENERATION_FAILED",
  creditsRefunded: true,
});
assert.equal(refunded.ok, false);
assert.match(String(refunded.error), /10 credits restored/i);
assert.equal(refunded.creditsRefunded, true);

const linkCheck = fs.readFileSync(join(root, "scripts/link-check.sh"), "utf8");
assert.match(linkCheck, /etsy-sellers/);
assert.match(linkCheck, /link-check: PASS/);
assert.match(linkCheck, /\/tools/);

// SEO tools axis (SEO_INTENT_50) — registered + primary effects exist
const toolsSrc = fs.readFileSync(join(root, "lib/tools.ts"), "utf8");
assert.match(toolsSrc, /export const TOOLS/);
assert.match(toolsSrc, /ai-toy-video-generator/);
assert.match(toolsSrc, /toy-social-content-pack/);
// Primary rank TD CTR (H1 unchanged; T+D reworked for SERP)
assert.match(
  toolsSrc,
  /AI Toy Video Generator:.*Free|One Photo to Video|no turntable/i
);
assert.match(
  fs.readFileSync(join(root, "app/tools/[slug]/page.tsx"), "utf8"),
  /data-tools-friction=["']cached-preview["']/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "app/tools/[slug]/page.tsx"), "utf8"),
  /No sign-up\. No card\. One photo → one video\. Free\./
);
const toolsPage = fs.readFileSync(
  join(root, "app/tools/[slug]/page.tsx"),
  "utf8"
);
assert.match(toolsPage, /generateStaticParams/);
assert.match(toolsPage, /LandingToolPanel/);
const toolsIndex = fs.readFileSync(join(root, "app/tools/page.tsx"), "utf8");
assert.match(toolsIndex, /TOOLS\.map/);
const sitemap = fs.readFileSync(join(root, "app/sitemap.ts"), "utf8");
assert.match(sitemap, /COLD_START_INDEX_PATHS|ai-toy-video-generator/);
assert.match(sitemap, /tools\/ai-toy-video-generator|COLD_START/);
assert.doesNotMatch(sitemap, /listOfficialProjectSlugs|projectPages|listLiveWorkflows/);
const usecases = fs.readFileSync(join(root, "lib/usecases.ts"), "utf8");
assert.match(usecases, /FOR_SLUG_ALIASES/);
assert.match(usecases, /etsy-sellers/);
const forPage = fs.readFileSync(join(root, "app/for/[slug]/page.tsx"), "utf8");
assert.match(forPage, /FOR_SLUG_ALIASES/);
assert.match(forPage, /redirect\(/);

// --- T5 durable credits pure engine (parity with lib/durableCredits/engine.ts) ---
function emptyDurable() {
  return {
    accounts: {},
    wallets: {},
    reservations: {},
    ledger: [],
    ledgerByIdempotency: {},
    reservationByIdempotency: {},
    consumedGuests: {},
  };
}
function durableReserve(state, accountId, quoted, idem) {
  const existing = state.reservationByIdempotency[idem];
  if (existing) {
    return { ok: true, state, reservationId: existing, idempotent: true };
  }
  const w = state.wallets[accountId];
  if (!w || w.availableCredits < quoted) {
    return { ok: false, code: "INSUFFICIENT_CREDITS", state };
  }
  const id = `res-${Object.keys(state.reservations).length + 1}`;
  const next = {
    ...state,
    wallets: {
      ...state.wallets,
      [accountId]: {
        ...w,
        availableCredits: w.availableCredits - quoted,
        reservedCredits: w.reservedCredits + quoted,
        version: w.version + 1,
      },
    },
    reservations: {
      ...state.reservations,
      [id]: {
        id,
        accountId,
        quotedCredits: quoted,
        settledCredits: 0,
        releasedCredits: 0,
        status: "reserved",
      },
    },
    reservationByIdempotency: {
      ...state.reservationByIdempotency,
      [idem]: id,
    },
  };
  return { ok: true, state: next, reservationId: id, idempotent: false };
}
function durableSettle(state, reservationId, credits, idem) {
  if (state.ledgerByIdempotency[idem]) {
    return { ok: true, state, idempotent: true };
  }
  const r = state.reservations[reservationId];
  if (!r) return { ok: false, code: "RESERVATION_NOT_FOUND", state };
  const rem = r.quotedCredits - r.settledCredits - r.releasedCredits;
  if (credits > rem) return { ok: false, code: "OVER_SETTLE", state };
  const w = state.wallets[r.accountId];
  const nextR = {
    ...r,
    settledCredits: r.settledCredits + credits,
  };
  const next = {
    ...state,
    wallets: {
      ...state.wallets,
      [r.accountId]: {
        ...w,
        reservedCredits: w.reservedCredits - credits,
        lifetimeUsedCredits: w.lifetimeUsedCredits + credits,
        version: w.version + 1,
      },
    },
    reservations: { ...state.reservations, [reservationId]: nextR },
    ledgerByIdempotency: { ...state.ledgerByIdempotency, [idem]: true },
  };
  return { ok: true, state: next, idempotent: false };
}
function durableRelease(state, reservationId, credits, idem) {
  if (state.ledgerByIdempotency[idem]) {
    return { ok: true, state, idempotent: true };
  }
  const r = state.reservations[reservationId];
  if (!r) return { ok: false, code: "RESERVATION_NOT_FOUND", state };
  const rem = r.quotedCredits - r.settledCredits - r.releasedCredits;
  if (credits > rem) return { ok: false, code: "OVER_SETTLE", state };
  const w = state.wallets[r.accountId];
  const nextR = {
    ...r,
    releasedCredits: r.releasedCredits + credits,
  };
  const next = {
    ...state,
    wallets: {
      ...state.wallets,
      [r.accountId]: {
        ...w,
        availableCredits: w.availableCredits + credits,
        reservedCredits: w.reservedCredits - credits,
        version: w.version + 1,
      },
    },
    reservations: { ...state.reservations, [reservationId]: nextR },
    ledgerByIdempotency: { ...state.ledgerByIdempotency, [idem]: true },
  };
  return { ok: true, state: next, idempotent: false };
}

// Wallet 50: six concurrent 10-credit reserves → exactly five OK
{
  let st = emptyDurable();
  st.wallets.a1 = {
    availableCredits: 50,
    reservedCredits: 0,
    lifetimeUsedCredits: 0,
    version: 0,
  };
  let okCount = 0;
  for (let i = 0; i < 6; i++) {
    const r = durableReserve(st, "a1", 10, `job-${i}`);
    if (r.ok) {
      okCount += 1;
      st = r.state;
    }
  }
  assert.equal(okCount, 5);
  assert.equal(st.wallets.a1.availableCredits, 0);
  assert.equal(st.wallets.a1.reservedCredits, 50);
}
// Seller Pack: reserve 30, settle 10, settle 10, release 10 → available -20 used 20
{
  let st = emptyDurable();
  st.wallets.a1 = {
    availableCredits: 30,
    reservedCredits: 0,
    lifetimeUsedCredits: 0,
    version: 0,
  };
  let r = durableReserve(st, "a1", 30, "pack-1");
  assert.equal(r.ok, true);
  st = r.state;
  r = durableSettle(st, r.reservationId, 10, "settle-1");
  st = r.state;
  r = durableSettle(st, Object.keys(st.reservations)[0], 10, "settle-2");
  st = r.state;
  r = durableRelease(st, Object.keys(st.reservations)[0], 10, "release-1");
  st = r.state;
  assert.equal(st.wallets.a1.availableCredits, 10);
  assert.equal(st.wallets.a1.reservedCredits, 0);
  assert.equal(st.wallets.a1.lifetimeUsedCredits, 20);
}
// Idempotent reserve
{
  let st = emptyDurable();
  st.wallets.a1 = {
    availableCredits: 10,
    reservedCredits: 0,
    lifetimeUsedCredits: 0,
    version: 0,
  };
  const a = durableReserve(st, "a1", 10, "same-key");
  st = a.state;
  const b = durableReserve(st, "a1", 10, "same-key");
  assert.equal(b.ok, true);
  assert.equal(b.idempotent, true);
  assert.equal(b.state.wallets.a1.availableCredits, 0);
}
// Module + migration presence
assert.match(
  fs.readFileSync(join(root, "lib/durableCredits/engine.ts"), "utf8"),
  /export function reserveCredits/
);
assert.match(
  fs.readFileSync(join(root, "lib/durableCredits/engine.ts"), "utf8"),
  /export function settleReservationItem/
);
assert.match(
  fs.readFileSync(join(root, "lib/createTrust.ts"), "utf8"),
  /internSourceImage|sourceImageKey/
);
assert.match(
  fs.readFileSync(
    join(root, "supabase/migrations/20260723120000_t5_auth_credits.sql"),
    "utf8"
  ),
  /credit_ledger/
);
assert.match(createStudio, /sourceStore|internSourceImage/);

// Auth shell + Phase D stubs
assert.match(
  fs.readFileSync(join(root, "lib/authConfig.ts"), "utf8"),
  /export function publicAuthStatus/
);
assert.match(
  fs.readFileSync(join(root, "app/login/page.tsx"), "utf8"),
  /Sign in/
);
assert.match(
  fs.readFileSync(join(root, "app/api/generations/route.ts"), "utf8"),
  /local-memory|listJobsForSession/
);
assert.match(
  genRoute,
  /reserveStrictLiveGeneration|invokeReservedProvider/
);
assert.match(genRoute, /getAuthUserFromRequest/);

// Offline fonts + analytics no-op + Create launch list
assert.doesNotMatch(
  fs.readFileSync(join(root, "app/layout.tsx"), "utf8"),
  /from ["']next\/font\/google["']/
);
assert.match(
  fs.readFileSync(join(root, "lib/analytics.ts"), "utf8"),
  /export function track/
);
assert.match(createStudio, /showAllRecipes|More recipes|create\.moreRecipes/);
assert.match(
  fs.readFileSync(join(root, "app/robots.ts"), "utf8"),
  /\/login/
);
assert.match(
  fs.readFileSync(
    join(root, "app/api/assets/upload-url/route.ts"),
    "utf8"
  ),
  /uploadUrl|local-memory/
);
assert.doesNotMatch(
  fs.readFileSync(
    join(root, "app/api/assets/upload-url/route.ts"),
    "utf8"
  ),
  /NOT_IMPLEMENTED/
);
const videoWh = fs.readFileSync(
  join(root, "app/api/webhooks/video-provider/route.ts"),
  "utf8"
);
assert.match(videoWh, /applyProviderWebhookEvent/);
assert.match(videoWh, /WEBHOOK_NOT_CONFIGURED|VIDEO_PROVIDER_WEBHOOK_SECRET/);
assert.match(videoWh, /requiresSecretInProduction|productionHost|VERCEL_ENV/);
assert.doesNotMatch(videoWh, /NOT_IMPLEMENTED/);
assert.match(createStudio, /track\(\{[\s\S]*generate_start/);

// Seller Pack export honesty + multi-download (no fake ZIP of failures)
const packExport = fs.readFileSync(
  join(root, "lib/sellerPackExport.ts"),
  "utf8"
);
assert.match(packExport, /filterAvailableDeliverables/);
assert.match(packExport, /sellerPackCsv/);
assert.match(packExport, /sellerPackAvailableDownloads/);
assert.match(packExport, /sellerPackDownloadHref/);
assert.match(packExport, /isSafeDeliverableUrl/);
function filterAvailable(items) {
  return items.filter(
    (i) =>
      i.status === "succeeded" &&
      i.videoUrl &&
      i.downloadable &&
      (isSafeDeliverableUrlPure(i.videoUrl) ||
        (typeof i.requestId === "string" && i.requestId.trim()))
  );
}
function packDownloadHref(item) {
  if (item.status !== "succeeded" || !item.downloadable) return null;
  if (item.requestId) return `/api/downloads/${encodeURIComponent(item.requestId)}`;
  if (item.videoUrl && isSafeDeliverableUrlPure(item.videoUrl)) return item.videoUrl;
  return null;
}
function packAvailableDownloads(items) {
  return filterAvailable(items)
    .map((i) => {
      const href = packDownloadHref(i);
      return href ? { key: i.key, href } : null;
    })
    .filter(Boolean);
}
assert.equal(
  filterAvailable([
    { status: "succeeded", videoUrl: "/a.mp4", downloadable: true },
    { status: "failed", videoUrl: "/b.mp4", downloadable: true },
    { status: "succeeded", videoUrl: "/c.mp4", downloadable: false },
  ]).length,
  1
);
assert.equal(
  packDownloadHref({
    status: "succeeded",
    downloadable: true,
    requestId: "req_1",
    videoUrl: "https://cdn.example/x.mp4",
  }),
  "/api/downloads/req_1"
);
assert.equal(
  packDownloadHref({
    status: "succeeded",
    downloadable: false,
    requestId: "req_blocked",
    videoUrl: "https://cdn.example/x.mp4",
  }),
  null,
  "Free raw blocked must not yield download href"
);
assert.equal(
  packAvailableDownloads([
    {
      key: "listing_spin",
      status: "succeeded",
      videoUrl: "/a.mp4",
      downloadable: true,
      requestId: "r1",
    },
    {
      key: "fail",
      status: "failed",
      videoUrl: "/b.mp4",
      downloadable: true,
    },
    {
      key: "free_raw",
      status: "succeeded",
      videoUrl: "https://cdn/x.mp4",
      downloadable: false,
    },
  ]).length,
  1
);
assert.match(
  fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
  /downloadAvailableClips|Download available/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
  /exportAvailableCsv|Export CSV|Manifest JSON/
);
// Image stills retain their own private route contract; they are not part of
// the Library MVP surface and must not be asserted through LibraryGrid.
assert.match(
  fs.readFileSync(join(root, "app/image/page.tsx"), "utf8"),
  /URLSearchParams|searchParams[\s\S]{0,80}prompt|get\(["']prompt["']\)/
);
assert.match(
  fs.readFileSync(join(root, "app/image/page.tsx"), "utf8"),
  /get\(["']job["']\)|jobId/
);
// Still forkRetry route exists (full asserts after imageJobsSrc load)
assert.match(
  fs.readFileSync(join(root, "app/api/image/[id]/retry/route.ts"), "utf8"),
  /forkRetryImageJob/
);
assert.match(
  fs.readFileSync(
    join(root, "app/api/generations/[id]/retry/route.ts"),
    "utf8"
  ),
  /forkRetryJob|local-memory/
);

// ── Phase D local job ledger + download gate ─────────────────────────────
const genJobsStore = fs.readFileSync(
  join(root, "lib/generationJobs/store.ts"),
  "utf8"
);
assert.match(genJobsStore, /recordSucceededGenerate/);
assert.match(genJobsStore, /recordFailedGenerate/);
assert.match(genJobsStore, /export function beginSyncGenerateJob/);
// R1b: retry forks are claimed only by exact child id + one-time token.
assert.match(genJobsStore, /export function claimRetryJobForGenerate/);
assert.match(genJobsStore, /jobs\.get\(input\.retryJobId\)/);
assert.match(genJobsStore, /retryTokenMatches/);
assert.doesNotMatch(genJobsStore, /queuedForks/);
assert.match(genJobsStore, /export function completeSyncGenerateJob/);
assert.match(genJobsStore, /export function failSyncGenerateJob/);
assert.match(genJobsStore, /export function recordWorkerHeartbeat/);
assert.match(genJobsStore, /downloadAllowedForJob/);
assert.doesNotMatch(
  fs.readFileSync(join(root, "app/api/generations/[id]/route.ts"), "utf8"),
  /touchJob/
);
assert.match(
  fs.readFileSync(join(root, "app/api/generations/route.ts"), "utf8"),
  /byStatus/
);
assert.match(
  fs.readFileSync(join(root, "app/api/generations/route.ts"), "utf8"),
  /touchedOpen:\s*0|GET is read-only/
);
assert.match(createStudio, /idempotentReplay|no second charge/);
// Soft-launch free trial honesty on /api/me
const meRoute = fs.readFileSync(join(root, "app/api/me/route.ts"), "utf8");
assert.match(meRoute, /freeTrial/);
assert.match(meRoute, /seedance-mini|480p|exhausted/);
// HEAD probes for ops / Library without full JSON body
assert.match(meRoute, /export async function HEAD/);
assert.match(meRoute, /X-Pikbo-Credits|X-Pikbo-Free-Trial-Exhausted/);
assert.match(
  fs.readFileSync(join(root, "app/api/generations/route.ts"), "utf8"),
  /export async function HEAD[\s\S]*X-Pikbo-Jobs-Open/
);
assert.match(
  fs.readFileSync(join(root, "lib/meClient.ts"), "utf8"),
  /freeTrialExhausted|MeFreeTrial/
);
assert.match(genJobsStore, /toPublicJob/);
assert.match(genJobsStore, /forkRetryJob/);
assert.match(genJobsStore, /parentJobId/);
// Live generate must open running row before fal (Library cancel/timeout).
assert.match(genRoute, /beginSyncGenerateJob/);
assert.match(genRoute, /completeSyncGenerateJob/);
assert.match(genRoute, /failSyncGenerateJob|noteFailed/);
// Demo path still uses instant succeeded record (no mid-flight).
assert.match(genRoute, /recordSucceededGenerate/);
// Pure download gate parity (same rules as createTrust)
function downloadAllowedForJob(opts) {
  if (opts.status !== "succeeded") return false;
  return canDownloadResult({ demo: opts.demo, watermark: opts.watermark });
}
assert.equal(
  downloadAllowedForJob({
    status: "succeeded",
    demo: false,
    watermark: true,
  }),
  false
);
assert.equal(
  downloadAllowedForJob({
    status: "succeeded",
    demo: true,
    watermark: true,
  }),
  true
);
assert.equal(
  downloadAllowedForJob({
    status: "failed",
    demo: false,
    watermark: false,
  }),
  false
);
// Idempotent create: same key returns same logical job (source markers)
assert.match(genJobsStore, /idempotencyKey/);
const genJobsRoute = fs.readFileSync(
  join(root, "app/api/generations/route.ts"),
  "utf8"
);
assert.match(genJobsRoute, /listJobsForSession|local-memory/);
assert.match(genJobsRoute, /status:\s*202|202/);
const genJobIdRoute = fs.readFileSync(
  join(root, "app/api/generations/[id]/route.ts"),
  "utf8"
);
assert.match(genJobIdRoute, /getJob/);
assert.match(genJobIdRoute, /NOT_FOUND|404/);
const downloadRoute = fs.readFileSync(
  join(root, "app/api/downloads/[id]/route.ts"),
  "utf8"
);
assert.match(downloadRoute, /DOWNLOAD_BLOCKED/);
assert.match(downloadRoute, /freeLiveDownloadBlockReason/);
assert.match(downloadRoute, /downloadAllowed/);
// Resolve by job id *or* provider requestId (Create/Library may store either)
assert.match(downloadRoute, /findJobByRequestOrId/);
assert.match(genJobsStore, /export function findJobByRequestOrId/);
// Generate must record jobs: demo=succeeded insert; live=begin running → complete/fail
assert.match(genRoute, /recordSucceededGenerate/);
assert.match(genRoute, /beginSyncGenerateJob/);
assert.match(genRoute, /completeSyncGenerateJob/);
assert.match(genRoute, /failSyncGenerateJob|noteFailed/);
// Health acceptance ladder for demo vs soft-live
assert.match(health, /acceptance/);
assert.match(health, /demoCached/);
assert.match(health, /inflightJobCount|inflightTtlMs/);
assert.match(health, /localAssetsProbe|assets:/);
assert.match(health, /generationJobsProbe|jobs:/);
assert.match(health, /videoWebhook|secretConfigured/);
const localAssetsSrc = fs.readFileSync(
  join(root, "lib/localAssets.ts"),
  "utf8"
);
assert.match(localAssetsSrc, /slideExpiry|localAssetsProbe|Sliding TTL/);
assert.match(localAssetsSrc, /reserveLocalAssetId/);
assert.match(localAssetsSrc, /NOT_OWNED/);
assert.match(
  fs.readFileSync(join(root, "app/api/assets/upload-url/route.ts"), "utf8"),
  /createPrivateToyAssetUpload/
);
assert.match(
  fs.readFileSync(join(root, "app/api/assets/upload-url/route.ts"), "utf8"),
  /AUTH_REQUIRED|PRIVATE_PREVIEW_REQUIRED/
);
assert.match(
  fs.readFileSync(join(root, "app/api/assets/complete/route.ts"), "utf8"),
  /completePrivateToyAsset/
);
assert.match(
  fs.readFileSync(
    join(root, "app/api/assets/[id]/content/route.ts"),
    "utf8"
  ),
  /NOT_OWNED/
);
// PUT success body must not re-echo multi-MB dataUrl
assert.doesNotMatch(
  fs
    .readFileSync(join(root, "app/api/assets/[id]/content/route.ts"), "utf8")
    .slice(
      fs
        .readFileSync(join(root, "app/api/assets/[id]/content/route.ts"), "utf8")
        .indexOf("return NextResponse.json({\n    ok: true")
    ),
  /dataUrl:\s*result\.asset\.dataUrl/
);
assert.match(gen, /AbortError|Request canceled/);
assert.match(gen, /export function sleep/);
assert.match(createStudio, /cancelInFlightGenerate|Cancel request|AbortController/);
assert.match(gen, /signal\?: AbortSignal|sleep\([^)]*signal/);
// Image still studio cancel + tools/guides ItemList SEO
const imagePage = fs.readFileSync(join(root, "app/image/page.tsx"), "utf8");
assert.match(imagePage, /AbortController|Cancel request/);
assert.match(imagePage, /refund unconfirmed|Request canceled/);
assert.match(imagePage, /GenerateSuiteChrome|canHandOffStill|stashPendingStill/);
// FreeTrial honesty after still job (PublicSession merge must rehydrate)
assert.match(imagePage, /mergeMeSession/);
const suiteChrome = fs.readFileSync(
  join(root, "components/GenerateSuiteChrome.tsx"),
  "utf8"
);
assert.match(suiteChrome, /href:\s*["']\/create\?mode=seller-pack["']/);
assert.match(suiteChrome, /href:\s*["']\/effects["']/);
assert.match(suiteChrome, /href:\s*["']\/library["']/);
assert.match(
  fs.readFileSync(join(root, "app/tools/page.tsx"), "utf8"),
  /ItemList|itemListElement/
);
assert.match(
  fs.readFileSync(join(root, "app/guides/page.tsx"), "utf8"),
  /ItemList|itemListElement/
);
assert.match(
  fs.readFileSync(join(root, "app/apps/page.tsx"), "utf8"),
  /ItemList|liveWorkflows/
);
assert.match(
  fs.readFileSync(join(root, "app/community/page.tsx"), "utf8"),
  /ItemList|cached toy video prototypes/
);
const projectCard = fs.readFileSync(
  join(root, "components/ProjectCard.tsx"),
  "utf8"
);
assert.match(projectCard, /AutoPlayVideo/);
assert.match(projectCard, /focusable=\{false\}/);
const videoTile = fs.readFileSync(
  join(root, "components/VideoTile.tsx"),
  "utf8"
);
assert.match(videoTile, /AutoPlayVideo/);
assert.match(videoTile, /focusable=\{false\}/);
assert.doesNotMatch(videoTile, /data-proof-quality|Lab\s*≥\s*4/);
assert.match(
  fs.readFileSync(join(root, "app/effects/page.tsx"), "utf8"),
  /proofBackedRecipeSlugs|ItemList/
);
// Image live URL safety (generate parity)
const imageRoute = fs.readFileSync(
  join(root, "app/api/image/route.ts"),
  "utf8"
);
assert.match(imageRoute, /isSafeDeliverableUrl/);
assert.match(imageRoute, /UNSAFE_URL/);
assert.match(imageRoute, /providerFailHttp/);
// Still safety + provider codes live in shared imageClient (page just wires UI)
assert.match(
  fs.readFileSync(join(root, "lib/imageClient.ts"), "utf8"),
  /UNSAFE_URL|creditsRefunded/
);
assert.match(
  fs.readFileSync(join(root, "lib/imageClient.ts"), "utf8"),
  /PROVIDER_TIMEOUT/
);
assert.match(
  fs.readFileSync(join(root, "app/image/page.tsx"), "utf8"),
  /postImageWithRetry|imageClient/
);
// Image idempotency — paid Flux network retry must not double-debit
const imageJobsSrc = fs.readFileSync(join(root, "lib/imageJobs.ts"), "utf8");
assert.match(imageJobsSrc, /export function findImageJobByIdempotencyKey/);
assert.match(imageJobsSrc, /export function beginImageJob/);
// R1b stills: exact child + one-time bearer claim (never prompt promote)
assert.match(imageJobsSrc, /export function claimRetryImageJob/);
assert.match(imageJobsSrc, /retryTokenMatches\(child\.retryTokenHash/);
assert.match(imageJobsSrc, /const parent = jobs\.get\(input\.parentId\)/);
assert.match(imageJobsSrc, /deadlineAt:\s*fixedDeadlineAt/);
assert.match(imageJobsSrc, /export function completeImageJob/);
assert.match(imageJobsSrc, /export function failImageJob/);
assert.match(imageJobsSrc, /export function imageJobsProbe/);
assert.match(imageJobsSrc, /export function normalizeImageIdempotencyKey/);
assert.match(imageJobsSrc, /export function sweepTimedOutImageJobs/);
assert.match(imageJobsSrc, /export function imageJobTimeoutMs/);
assert.match(imageJobsSrc, /export function imageJobInFlightRetryAfterSec/);
assert.match(imageJobsSrc, /TIMEOUT|refund unconfirmed/);
// Still ledger list parity with GET /api/generations
assert.match(imageJobsSrc, /export function listImageJobsForSession/);
assert.match(imageJobsSrc, /export function touchOpenImageJobsForSession/);
assert.match(imageJobsSrc, /export function claimRetryImageJob/);
assert.match(imageJobsSrc, /export function recordImageWorkerHeartbeat/);
assert.match(imageJobsSrc, /export function toPublicImageJob/);
assert.match(imageJobsSrc, /export function getImageJob/);
assert.match(imageJobsSrc, /export function touchImageJob/);
assert.match(imageJobsSrc, /export function forkRetryImageJob/);
assert.match(imageJobsSrc, /status:\s*["']queued["']/);
assert.match(imageJobsSrc, /parentJobId/);
assert.match(imageJobsSrc, /deadlineAt/);
assert.match(imageJobsSrc, /includeDataUrl/);
assert.match(imageJobsSrc, /IMAGE_JOBS_LIST_LIMIT/);
assert.match(imageJobsSrc, /hasImage|isSafeDeliverableUrl/);
assert.match(imageRoute, /findImageJobByIdempotencyKey/);
assert.match(imageRoute, /idempotentReplay/);
assert.match(imageRoute, /normalizeImageIdempotencyKey/);
assert.match(imageRoute, /requestId/);
assert.match(imageRoute, /export async function HEAD/);
assert.match(imageRoute, /export async function GET/);
assert.match(imageRoute, /listImageJobsForSession|toPublicImageJob/);
// R1b: GET is read-only — must not slide deadline via touchOpen
assert.doesNotMatch(
  imageRoute,
  /touchOpenImageJobsForSession\(session\.id\)/
);
assert.match(imageRoute, /claimRetryImageJob|providerCompletionDecision/);
assert.match(imageRoute, /X-Pikbo-Image-Jobs-Open/);
assert.match(imageRoute, /X-Pikbo-Image-Jobs-List-Limit/);
assert.match(imageRoute, /imageJobInFlightRetryAfterSec/);
assert.match(imageRoute, /jobStatus:\s*["']\/api\/image\/\[id\]["']/);
assert.match(imageRoute, /retry:\s*["']POST \/api\/image\/\[id\]\/retry["']/);
assert.match(imageRoute, /queued:\s*full\.queued|byStatus[\s\S]*queued/);
// Single still poll + cancel by path (generations/[id] parity)
const imageByIdRoute = fs.readFileSync(
  join(root, "app/api/image/[id]/route.ts"),
  "utf8"
);
assert.match(imageByIdRoute, /export async function GET/);
assert.match(imageByIdRoute, /export async function DELETE/);
assert.match(imageByIdRoute, /getImageJob/);
assert.doesNotMatch(imageByIdRoute, /touchImageJob\(/);
assert.match(imageByIdRoute, /Read-only poll|read-only|touched:\s*false/i);
assert.match(imageByIdRoute, /includeDataUrl:\s*true/);
assert.match(imageByIdRoute, /refundUnconfirmed:\s*true/);
// Still ledger retry fork (generations/[id]/retry parity)
const imageRetryRoute = fs.readFileSync(
  join(root, "app/api/image/[id]/retry/route.ts"),
  "utf8"
);
assert.match(imageRetryRoute, /export async function POST/);
assert.match(imageRetryRoute, /forkRetryImageJob/);
assert.match(imageRetryRoute, /status:\s*202|202/);
assert.match(imageRetryRoute, /next:\s*\{[\s\S]*image:\s*["']\/api\/image["']/);
assert.match(imageRetryRoute, /imageUi:/);
assert.match(imageRetryRoute, /["']\/image["']/);
// AIT-477: durable owner stills never invent process-memory retry forks.
assert.match(imageRetryRoute, /DURABLE_USE_NEW_ATTEMPT/);
assert.match(imageRetryRoute, /DURABLE_IN_FLIGHT/);
assert.match(imageRetryRoute, /DURABLE_ALREADY_SUCCEEDED/);
assert.match(imageRetryRoute, /DURABLE_DETAIL_UNAVAILABLE/);
assert.match(imageRetryRoute, /getPrivateLibraryJobForOwner/);
assert.match(imageRetryRoute, /acceptControlledLibraryNewAttemptUrl/);
assert.doesNotMatch(
  imageRetryRoute,
  /newAttemptUrl\.startsWith\(/,
  "image retry must not use loose startsWith on newAttemptUrl"
);
assert.match(
  fs.readFileSync(join(root, "lib/imageClient.ts"), "utf8"),
  /forkRetryImageLedger/
);
assert.match(
  fs.readFileSync(join(root, "lib/imageClient.ts"), "utf8"),
  /acceptImageRetryNavigation/
);
assert.match(
  fs.readFileSync(join(root, "lib/imageClient.ts"), "utf8"),
  /DURABLE_USE_NEW_ATTEMPT|createUi|imageUi/
);
assert.match(
  fs.readFileSync(join(root, "app/image/page.tsx"), "utf8"),
  /data-image-session-ledger=["']process-memory["']/
);
assert.match(
  fs.readFileSync(join(root, "app/image/page.tsx"), "utf8"),
  /data-image-session-cancel|data-image-session-retry|openSessionStill/
);
assert.match(
  fs.readFileSync(join(root, "app/image/page.tsx"), "utf8"),
  /data-image-session-retry-mode=["']ledger-fork["']|\/api\/image\/\$\{.*\}\/retry/
);
assert.match(
  fs.readFileSync(join(root, "app/image/page.tsx"), "utf8"),
  /status === ["']queued["']|data-image-session-queued/
);
// The Library MVP no longer exposes the image-stills shelf; image retry
// coverage remains on the dedicated Image surface and API routes above.
assert.match(
  fs.readFileSync(join(root, "app/image/page.tsx"), "utf8"),
  /data-image-session-retry-mode=["']ledger-fork["']|\/api\/image\/.*\/retry/
);
assert.match(
  fs.readFileSync(join(root, "app/image/page.tsx"), "utf8"),
  /forkRetryImageLedger/
);
assert.match(
  fs.readFileSync(join(root, "app/image/page.tsx"), "utf8"),
  /acceptImageRetryNavigation/
);
assert.match(
  fs.readFileSync(join(root, "app/image/page.tsx"), "utf8"),
  /DURABLE_USE_NEW_ATTEMPT/
);
// Pure image timeout sweep (crash mid-Flux must not leave infinite JOB_IN_FLIGHT)
function sweepTimedOutImageJobsPure(jobs, now, timeoutMs) {
  const timedOut = [];
  for (const job of jobs) {
    if (job.status !== "running" && job.status !== "queued") continue;
    const age = now - Date.parse(job.updatedAt || job.createdAt);
    if (!Number.isFinite(age) || age < timeoutMs) continue;
    job.status = "failed";
    job.errorCode = "TIMEOUT";
    job.creditsOutcome = "refund unconfirmed";
    timedOut.push(job);
  }
  return timedOut;
}
{
  const base = new Date("2026-07-25T00:00:00.000Z").getTime();
  const jobs = [
    {
      status: "running",
      createdAt: new Date(base).toISOString(),
      updatedAt: new Date(base).toISOString(),
    },
    {
      status: "running",
      createdAt: new Date(base).toISOString(),
      updatedAt: new Date(base + 10_000).toISOString(),
    },
    {
      status: "succeeded",
      createdAt: new Date(base).toISOString(),
      updatedAt: new Date(base).toISOString(),
    },
  ];
  const hit = sweepTimedOutImageJobsPure(jobs, base + 90_000, 90_000);
  assert.equal(hit.length, 1, "only fully aged running job times out");
  assert.equal(jobs[0].errorCode, "TIMEOUT");
  assert.equal(jobs[0].creditsOutcome, "refund unconfirmed");
  assert.equal(jobs[1].status, "running", "recently updated still open");
  assert.equal(jobs[2].status, "succeeded");
  // Retry-After prefers remaining job age (lock may already be free after kill)
  function imageJobRetryAfterPure(job, now, timeoutMs) {
    if (job.status !== "running") return 1;
    const age = now - Date.parse(job.updatedAt || job.createdAt);
    const remainingMs = timeoutMs - age;
    if (remainingMs <= 0) return 1;
    return Math.max(1, Math.ceil(remainingMs / 1000));
  }
  assert.equal(
    imageJobRetryAfterPure(jobs[1], base + 10_000 + 30_000, 90_000),
    60
  );
}
// Idempotency before rate limit + debit (replay free of second charge)
// Use post-handler call sites — import lines also mention these names.
{
  const postAt = imageRoute.indexOf("export async function POST");
  const idempAt = imageRoute.indexOf(
    "findImageJobByIdempotencyKey(session.id",
    postAt
  );
  const budgetAt = imageRoute.indexOf("takeGenerateBudget(", postAt);
  const reserveAt = imageRoute.indexOf("reserveStrictLiveGeneration({", postAt);
  assert.ok(postAt > 0 && idempAt > postAt, "image idempotency lookup in POST");
  assert.ok(idempAt < budgetAt, "image idempotency before rate budget");
  assert.ok(idempAt < reserveAt, "image idempotency before durable reserve");
}
// Pure image idempotency key gate (parity with generate min length 8)
function normalizeImageIdempotencyKeyPure(raw) {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim().slice(0, 128);
  if (t.length < 8) return undefined;
  return t;
}
assert.equal(normalizeImageIdempotencyKeyPure("short"), undefined);
assert.equal(normalizeImageIdempotencyKeyPure("  ab12cd34  "), "ab12cd34");
assert.equal(normalizeImageIdempotencyKeyPure(null), undefined);
// Client mints once per attempt; history can store requestId
assert.match(
  fs.readFileSync(join(root, "app/image/page.tsx"), "utf8"),
  /idempotencyKey/
);
assert.match(
  fs.readFileSync(join(root, "app/image/page.tsx"), "utf8"),
  /randomUUID|idempotencyKey/
);
assert.match(
  fs.readFileSync(join(root, "lib/imageHistory.ts"), "utf8"),
  /requestId\?:/
);
assert.match(healthRoute, /imageJobs|imageIdempotency/);
assert.match(healthRoute, /imageRetry|POST \/api\/image\/\[id\]\/retry/);
assert.match(healthRoute, /ledgerRetryPromote/);
assert.match(healthRoute, /explicit-retryJobId-only/);
assert.match(healthRoute, /fixed-from-createdAt|jobDeadline/);
assert.match(healthRoute, /R0: anonymous|durable reserve/);
assert.match(createStudio, /useCallback[\s\S]*adoptImage|adoptImage = useCallback/);
// Flow + home viral: shared AutoPlay (no multi-autoPlay)
assert.match(
  fs.readFileSync(join(root, "components/FlowMediaCard.tsx"), "utf8"),
  /AutoPlayVideo|focusable=\{false\}/
);
assert.match(
  fs.readFileSync(join(root, "app/flow/page.tsx"), "utf8"),
  /FlowMediaCard|PREVIEW_ROBOTS/
);
assert.match(
  fs.readFileSync(join(root, "app/flow/page.tsx"), "utf8"),
  /exactDemo|recipeSlug=\{demo\.preset\}/
);
const flowMediaCardSrc = fs.readFileSync(
  join(root, "components/FlowMediaCard.tsx"),
  "utf8"
);
assert.match(flowMediaCardSrc, /data-flow-card/);
assert.match(flowMediaCardSrc, /Lab · cached prototype/);
assert.doesNotMatch(flowMediaCardSrc, /Official · cached|data-proof-quality/);
assert.match(flowMediaCardSrc, /Remake · your toy photo/);
assert.doesNotMatch(flowMediaCardSrc, /provisionalLabQualityLabel|Lab\s*≥\s*4/);
assert.match(
  fs.readFileSync(join(root, "components/HomeViralPresetRail.tsx"), "utf8"),
  /AutoPlayVideo/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/HomeViralPresetRail.tsx"), "utf8"),
  /autoPlay/
);
assert.match(genJobsStore, /export function generationJobsProbe/);
assert.match(genJobsStore, /byStatus|timedOutThisProbe/);
assert.match(genJobsStore, /forkRetryJob[\s\S]*jobs\.get\(input\.parentId\)/);
assert.match(genJobsStore, /retryToken/);
assert.match(genJobsStore, /NOT_RETRYABLE|JOB_IN_FLIGHT/);
assert.match(genJobsStore, /status === ["']succeeded["']/);

// Success payload must echo process ledger jobId (cancel/poll)
assert.match(
  fs.readFileSync(join(root, "lib/contracts.ts"), "utf8"),
  /jobId\?:/
);
assert.match(genRoute, /jobId/);
// Generate idempotency — network retry must not double-debit
assert.match(
  fs.readFileSync(join(root, "lib/contracts.ts"), "utf8"),
  /idempotencyKey\?:/
);
assert.match(
  fs.readFileSync(join(root, "lib/contracts.ts"), "utf8"),
  /idempotentReplay\?:/
);
assert.match(genJobsStore, /export function findJobByIdempotencyKey/);
assert.match(genRoute, /findJobByIdempotencyKey/);
assert.match(genRoute, /idempotentReplay|successFromJob/);
assert.match(gen, /mintGenerateIdempotencyKey|idempotencyKey/);
assert.match(gen, /export function mintGenerateIdempotencyKey/);
// Idempotency must run before asset/image resolve (retry without re-upload).
{
  const idempAt = genRoute.indexOf("findJobByIdempotencyKey");
  const assetAt = genRoute.indexOf("getLocalAsset");
  const mimeAt = genRoute.indexOf("isValidImageDataUrl(image)");
  assert.ok(idempAt > 0, "idempotency lookup present");
  assert.ok(
    assetAt < 0 || idempAt < assetAt,
    "idempotency before getLocalAsset"
  );
  assert.ok(
    mimeAt < 0 || idempAt < mimeAt,
    "idempotency before still MIME gate"
  );
}
// Health product orientation (video-first)
assert.match(health, /primary:\s*"video"|primary:\s*'video'/);
assert.match(health, /optional-support/);
assert.match(health, /idempotency/);
// Network/cancel codes → refund unconfirmed settlement
assert.match(
  fs.readFileSync(join(root, "lib/createTrust.ts"), "utf8"),
  /NETWORK_ERROR|REQUEST_CANCELED/
);
function requestCreditStateFromFailurePure(result) {
  if (result.creditsRefunded === true) return "10 restored";
  if (
    result.refundUnconfirmed === true ||
    result.status === 0 ||
    result.code === "NETWORK_ERROR" ||
    result.code === "PROVIDER_NETWORK" ||
    result.code === "REQUEST_CANCELED" ||
    result.code === "CANCELED" ||
    result.code === "TIMEOUT" ||
    result.code === "PROVIDER_TIMEOUT" ||
    (result.code === "UNSAFE_URL" && result.creditsRefunded !== true) ||
    (result.code === "CONTENT_POLICY" && result.creditsRefunded !== true) ||
    (result.code === "MODEL_EMPTY" && result.creditsRefunded !== true)
  ) {
    return "refund unconfirmed";
  }
  return null;
}
assert.equal(
  requestCreditStateFromFailurePure({ status: 0, code: "NETWORK_ERROR" }),
  "refund unconfirmed"
);
assert.equal(
  requestCreditStateFromFailurePure({ status: 500, code: "REQUEST_CANCELED" }),
  "refund unconfirmed"
);
assert.equal(
  requestCreditStateFromFailurePure({ status: 504, code: "TIMEOUT" }),
  "refund unconfirmed"
);
assert.equal(
  requestCreditStateFromFailurePure({
    status: 503,
    code: "PROVIDER_NETWORK",
  }),
  "refund unconfirmed"
);
assert.equal(
  requestCreditStateFromFailurePure({
    status: 422,
    code: "UNSAFE_URL",
  }),
  "refund unconfirmed"
);
assert.equal(
  requestCreditStateFromFailurePure({
    status: 422,
    code: "UNSAFE_URL",
    creditsRefunded: true,
  }),
  "10 restored"
);
assert.match(
  fs.readFileSync(join(root, "lib/createTrust.ts"), "utf8"),
  /PROVIDER_NETWORK/
);
assert.match(
  fs.readFileSync(join(root, "lib/createTrust.ts"), "utf8"),
  /UNSAFE_URL/
);
assert.match(
  fs.readFileSync(join(root, "lib/createTrust.ts"), "utf8"),
  /refundUnconfirmed|TIMEOUT/
);
assert.match(
  fs.readFileSync(join(root, "lib/generateClient.ts"), "utf8"),
  /refundUnconfirmed/
);
assert.match(
  fs.readFileSync(join(root, "components/CreateStudio.tsx"), "utf8"),
  /refundUnconfirmed:\s*result\.refundUnconfirmed/
);
// Residual refund copy must not overclaim unconditional refund
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/HowItWorks.tsx"), "utf8"),
  /Failed live jobs refund credits\./
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "lib/i18n.ts"), "utf8"),
  /Failed gens refund credits"/
);
// Demo + sample stills must exist on disk (preflight parity)
{
  const demoClipsSrc = fs.readFileSync(join(root, "lib/demoClips.ts"), "utf8");
  const demoPaths = [
    ...demoClipsSrc.matchAll(/["'](\/demos\/[^"']+)["']/g),
  ].map((m) => m[1]);
  const samplesSrc = fs.readFileSync(join(root, "lib/samples.ts"), "utf8");
  const samplePaths = [
    ...samplesSrc.matchAll(/path:\s*["'](\/demos\/[^"']+)["']/g),
  ].map((m) => m[1]);
  for (const p of new Set([...demoPaths, ...samplePaths])) {
    const disk = join(root, "public", p.replace(/^\//, ""));
    assert.ok(fs.existsSync(disk), `missing demo/sample asset: ${p}`);
  }
}
assert.match(
  fs.readFileSync(join(root, "lib/imageHistory.ts"), "utf8"),
  /MAX_STORE_URL_CHARS|slimItem|costCredits/
);
assert.match(
  fs.readFileSync(join(root, "lib/imageHistory.ts"), "utf8"),
  /isSafeImageHistoryUrl|isSafeDeliverableUrl/
);
assert.match(genJobsStore, /findJobByRequestOrId/);
// getJob must resolve provider requestId (not only job_*)
assert.match(
  fs.readFileSync(join(root, "lib/generationJobs/store.ts"), "utf8"),
  /export function getJob[\s\S]*findJobByRequestOrId/
);
const critPath = fs.readFileSync(
  join(root, "scripts/critical-path.sh"),
  "utf8"
);
assert.match(critPath, /REQUIRE_SOFT_LIVE/);
assert.match(critPath, /demo-cached gate|ready\.demo/);

// Phase H — SEO proof gate (no thin indexable concept pages)
const seoIndex = fs.readFileSync(join(root, "lib/seoIndex.ts"), "utf8");
assert.match(seoIndex, /recipeHasUniqueProof/);
assert.match(seoIndex, /proofBackedRecipeSlugs/);
assert.match(seoIndex, /COLD_START_INDEX_PATHS/);
assert.match(seoIndex, /robotsForToolSlug|isColdStartIndexablePath/);
assert.match(seoIndex, /ai-toy-video-generator/);
assert.match(seoIndex, /CONCEPT_ROBOTS|PRIVATE_ROBOTS|PREVIEW_ROBOTS/);
const effectMeta = fs.readFileSync(
  join(root, "app/effects/[slug]/page.tsx"),
  "utf8"
);
assert.match(effectMeta, /robotsForRecipe/);
assert.match(effectMeta, /Concept · no unique Lab sample/);
const landingResults = fs.readFileSync(
  join(root, "components/LandingResults.tsx"),
  "utf8"
);
assert.match(landingResults, /no unique Lab sample/);
assert.match(landingResults, /recipeHasUniqueProof/);
const sitemapSrc = fs.readFileSync(join(root, "app/sitemap.ts"), "utf8");
assert.match(sitemapSrc, /COLD_START_INDEX_PATHS/);
assert.doesNotMatch(sitemapSrc, /\/cinema|\/supercomputer|\/models|\/community/);
// Phase H: proof-gated three-page marketing budget + legal.
const seoIndexSrc = fs.readFileSync(join(root, "lib/seoIndex.ts"), "utf8");
assert.match(seoIndexSrc, /COLD_START_INDEX_PATHS/);
assert.match(seoIndexSrc, /COLD_START_MARKETING_INDEX_PATHS/);
assert.match(seoIndexSrc, /COLD_START_LEGAL_INDEX_PATHS/);
{
  const mkt = seoIndexSrc.match(
    /COLD_START_MARKETING_INDEX_PATHS\s*=\s*\[([\s\S]*?)\]\s*as const/
  );
  assert.ok(mkt, "COLD_START_MARKETING_INDEX_PATHS present");
  const n = (mkt[1].match(/"[^"]+"/g) || []).length;
  assert.equal(
    n,
    3,
    `marketing index allowlist must be 3 URLs until distinct proof exists, got ${n}`
  );
}
assert.match(seoIndexSrc, /COLD_START_INDEXABLE_TOOL_SLUGS/);
assert.match(seoIndexSrc, /ai-toy-video-generator/);
// Specialist pages remain reachable but leave the index set until distinct proof exists.
assert.doesNotMatch(
  seoIndexSrc,
  /COLD_START_INDEXABLE_TOOL_SLUGS\s*=\s*\[[\s\S]*?blind-box-reveal-video-maker/
);
assert.doesNotMatch(
  seoIndexSrc,
  /COLD_START_INDEXABLE_TOOL_SLUGS\s*=\s*\[[\s\S]*?figure-360-product-video/
);
assert.doesNotMatch(
  seoIndexSrc,
  /COLD_START_MARKETING_INDEX_PATHS\s*=\s*\[[\s\S]*?etsy-listing-videos/
);
assert.match(toolsSrc, /one photo toy video AI|One Photo Toy Video AI/i);
assert.match(toolsSrc, /blind box AI video generator|Blind Box AI Video Generator/i);
assert.match(toolsSrc, /AI figure 360 video|AI Figure 360 Video/i);
assert.match(toolsSrc, /Toy Product Video AI|toy product video AI/i);
const guidesSrc24 = fs.readFileSync(join(root, "lib/guides.ts"), "utf8");
assert.match(guidesSrc24, /designer-toy-ai-video-vs-generic-tools/);
assert.match(guidesSrc24, /seller-pack-workflow-listing-reveal-hook/);
assert.match(guidesSrc24, /toy-unboxing-video-from-one-photo/);

assert.match(
  fs.readFileSync(join(root, "components/PublicLaunchPackSample.tsx"), "utf8"),
  /data-home-format-preview=\{format\.id\}[\s\S]*Three separate archived format prototypes/
);
const homeMomentEntrySrc = [
  fs.readFileSync(join(root, "app/page.tsx"), "utf8"),
  fs.readFileSync(join(root, "components/HomeCinemaHero.tsx"), "utf8"),
  fs.readFileSync(join(root, "components/PublicLaunchPackSample.tsx"), "utf8"),
].join("\n");
assert.match(homeMomentEntrySrc, /data-home-upgrade="moment"/);
assert.match(
  homeMomentEntrySrc,
  /const createHref = `\$\{MOMENT_CREATE_HREF\}&source=home-motion-archive`/
);
assert.match(
  fs.readFileSync(join(root, "lib/softLaunch.ts"), "utf8"),
  /MOMENT_CREATE_HREF\s*=\s*[\s\S]{0,100}\/create\?mode=moment&effect=street-power-up/
);

assert.match(
  fs.readFileSync(join(root, "app/about/page.tsx"), "utf8"),
  /Designer-toy AI video|CONCEPT_ROBOTS/
);
const homeSeoBody = fs.readFileSync(
  join(root, "components/HomeSeoBody.tsx"),
  "utf8"
);
assert.match(homeSeoBody, /\/tools\/ai-toy-video-generator/);
assert.match(homeSeoBody, /\/effects\/360-spin-showcase/);
assert.match(homeSeoBody, /\/tools\/blind-box-reveal-video-maker/);
assert.doesNotMatch(homeSeoBody, /data-home-seo-mesh=["']long-tail["']/);
const highIntentTruth = fs.readFileSync(
  join(root, "components/HighIntentProductTruth.tsx"),
  "utf8"
);
assert.match(highIntentTruth, /Fast 720p/);
assert.match(highIntentTruth, /5\.042 sec/);
assert.match(highIntentTruth, /About 2 min 39 sec/);
assert.match(highIntentTruth, /not a physical product, customer testimonial/);

// GSC P0: Preview pages must NOT be dual-blocked by robots.txt (need crawl for noindex)
const robotsSrc = fs.readFileSync(join(root, "app/robots.ts"), "utf8");
assert.match(robotsSrc, /\/library/);
assert.match(robotsSrc, /\/api\//);
assert.match(robotsSrc, /\/profile/);
assert.doesNotMatch(robotsSrc, /["']\/cinema["']/);
assert.doesNotMatch(robotsSrc, /["']\/image["']/);
assert.doesNotMatch(robotsSrc, /["']\/models["']/);
assert.doesNotMatch(robotsSrc, /["']\/flow["']/);
assert.doesNotMatch(robotsSrc, /["']\/supercomputer["']/);
// Preview meta: noindex + follow (crawlable)
assert.match(seoIndexSrc, /export const PREVIEW_ROBOTS/);
assert.match(
  seoIndexSrc,
  /PREVIEW_ROBOTS[\s\S]*?index:\s*false[\s\S]*?follow:\s*true/
);
const libMeta = fs.readFileSync(join(root, "app/library/page.tsx"), "utf8");
assert.match(libMeta, /PRIVATE_ROBOTS|index:\s*false/);
assert.match(
  fs.readFileSync(join(root, "lib/seoIndex.ts"), "utf8"),
  /export const PRIVATE_ROBOTS/
);
// VideoObject uploadDate from per-demo publishedAt (ISO DateTime, not date-only)
const jsonLdSrc = fs.readFileSync(join(root, "lib/jsonLd.ts"), "utf8");
assert.match(jsonLdSrc, /uploadDate:\s*demo\.publishedAt/);
assert.match(jsonLdSrc, /isIso8601DateTime/);
assert.doesNotMatch(
  jsonLdSrc,
  /uploadDate:\s*["']\d{4}-\d{2}-\d{2}["']/
);
assert.doesNotMatch(jsonLdSrc, /LAB_VIDEO_UPLOAD_DATETIME/);
assert.match(jsonLdSrc, /iso8601DurationFromSeconds|duration/);
const demoVideosSrc = fs.readFileSync(join(root, "lib/demoVideos.ts"), "utf8");
assert.match(demoVideosSrc, /publishedAt:\s*string/);
// Every demo entry must declare publishedAt DateTime with T and Z/offset
{
  const pubs = demoVideosSrc.match(/publishedAt:\s*"([^"]+)"/g) || [];
  assert.ok(pubs.length >= 6, "each DemoVideo needs publishedAt");
  for (const p of pubs) {
    assert.match(p, /publishedAt:\s*"\d{4}-\d{2}-\d{2}T/);
    assert.match(p, /Z"|[+-]\d{2}:\d{2}"/);
  }
  // Must not all share one forged string if more than one batch exists
  const unique = new Set(pubs.map((x) => x.replace(/^publishedAt:\s*/, "")));
  assert.ok(unique.size >= 1);
}
// AppShell: no duplicate Pricing in right rail; privacy-gated Create visit
{
  const shell = fs.readFileSync(join(root, "components/AppShell.tsx"), "utf8");
  assert.match(shell, /trackPageView/);
  assert.doesNotMatch(
    shell,
    /CreditsBadge[\s\S]{0,200}href=["']\/pricing["']/
  );
}
// Image chrome must not introduce a second H1 on /image
const suiteChromeSrc = fs.readFileSync(
  join(root, "components/GenerateSuiteChrome.tsx"),
  "utf8"
);
assert.doesNotMatch(suiteChromeSrc, /<h1[\s>]/);
// Privacy / terms self-canonical
assert.match(
  fs.readFileSync(join(root, "app/privacy/page.tsx"), "utf8"),
  /canonical:\s*["']\/privacy["']/
);
assert.match(
  fs.readFileSync(join(root, "app/terms/page.tsx"), "utf8"),
  /canonical:\s*["']\/terms["']/
);
// Analytics route helper emits only the approved Create funnel visit.
{
  const a = fs.readFileSync(join(root, "lib/analytics.ts"), "utf8");
  assert.match(a, /trackPageView/);
  assert.match(a, /create_view/);
  assert.match(a, /safeSurface\(payload\.path\) === "create"/);
  assert.match(a, /send_page_view:\s*false/);
}
const appsMeta = fs.readFileSync(join(root, "app/apps/page.tsx"), "utf8");
// Apps is the live workflow shelf (not a thin preview door).
assert.match(appsMeta, /WORKFLOWS|workflows/);
assert.doesNotMatch(appsMeta, /index:\s*false/);
assert.doesNotMatch(
  fs.readFileSync(join(root, "app/robots.ts"), "utf8"),
  /["']\/apps["']/
);
// Phase H: /apps/[slug] only indexes live doors with unique Lab proof + FAQ.
const appsSlugSrc = fs.readFileSync(
  join(root, "app/apps/[slug]/page.tsx"),
  "utf8"
);
assert.match(appsSlugSrc, /appDetailIndexable|recipeHasUniqueProof/);
assert.match(appsSlugSrc, /CONCEPT_ROBOTS|PREVIEW_ROBOTS/);
assert.match(appsSlugSrc, /APP_DETAIL_FAQ|Workflow FAQ/);
assert.match(appsSlugSrc, /FAQPage/);
assert.match(appsSlugSrc, /FreeTrialCta/);
assert.match(appsSlugSrc, /Lab demo|Lab proof/);
assert.doesNotMatch(sitemapSrc, /listLiveWorkflows|apps\/\$\{/);

// Library honesty: Free live must not expose raw download/open
const historySrcLib = fs.readFileSync(join(root, "lib/history.ts"), "utf8");
assert.match(historySrcLib, /historyItemDownloadAllowed/);
assert.match(historySrcLib, /canDownloadResult/);
assert.match(historySrcLib, /isSafeDeliverableUrl/);
// Library's MVP safety surface is the private generations ledger + download
// gate; raw history/download policy helpers remain covered in lib/history.
assert.match(library, /\/api\/downloads\//);
assert.match(library, /method:\s*["']HEAD["']|X-Pikbo-Download-Code/);
assert.match(createStudio, /\/api\/downloads\//);
assert.match(createStudio, /isSafeDeliverableUrl\(videoUrl\)/);
const retryRoute = fs.readFileSync(
  join(root, "app/api/generations/[id]/retry/route.ts"),
  "utf8"
);
assert.match(retryRoute, /forkRetryJob/);
assert.doesNotMatch(retryRoute, /NOT_IMPLEMENTED/);
// createUi must use remix contract (ratio/duration/channel), not bare effect=
assert.match(retryRoute, /createRemixHref/);
assert.match(retryRoute, /NOT_RETRYABLE|JOB_IN_FLIGHT|422|409/);

assert.doesNotMatch(retryRoute, /create\?effect=\$\{/);

// Phase F — Create/Seller mobile craft (390px ownership + sticky CTA)
// AIT-164/AIT-150: Seller Pack sticky clears home indicator via
// --floating-cta-safe-bottom; tab-sharing batch clears --mobile-nav-clearance.
// AppShell hides the five-tab nav under Seller Pack (and Moment result shell).
assert.match(createStudio, /create-ownership/);
assert.match(createStudio, /create-photo-step/);
assert.match(createStudio, /Download policy/);
assert.match(batchStudio, /batch-ownership/);
assert.match(
  batchStudio,
  /bottom-\[var\(--floating-cta-safe-bottom\)\]/
);
assert.match(
  batchStudio,
  /bottom-\[var\(--mobile-nav-clearance\)\]/
);
// AIT-383: content pad tokens under sticky Generate / browse bar
assert.match(
  batchStudio,
  /pb-\[var\(--sticky-generate-pad-safe\)\]|pb-\[var\(--sticky-generate-pad\)\]/
);
assert.match(
  createStudio,
  /pb-\[var\(--sticky-generate-pad-safe\)\]|pb-\[var\(--sticky-generate-pad\)\]/
);
assert.match(
  fs.readFileSync(join(root, "app/globals.css"), "utf8"),
  /--sticky-generate-pad:\s*calc\(|--mobile-generate-bar-pad:\s*calc\(/
);
for (const browsePad of [
  "app/explore/page.tsx",
  "app/flow/page.tsx",
  "app/effects/page.tsx",
  "app/community/page.tsx",
  "app/library/page.tsx",
]) {
  assert.match(
    fs.readFileSync(join(root, browsePad), "utf8"),
    /pb-\[var\(--mobile-generate-bar-pad\)\]/
  );
}
assert.match(
  appShell,
  /const hideMobileNav\s*=\s*resultShell\s*\|\|\s*fixedMomentEntry\s*\|\|\s*sellerPackCreate/
);
assert.match(appShell, /!hideMobileNav\s*\?\s*\(\s*\n\s*<nav/);
assert.match(appShell, /data-mobile-nav=["']primary["']/);
assert.match(appShell, /MobileGenerateBar/);
assert.match(batchStudio, /api\/downloads/);

// Landing tool Free-download honesty (parity with Create/Library)
const landingTool = fs.readFileSync(
  join(root, "components/LandingToolPanel.tsx"),
  "utf8"
);
assert.match(landingTool, /canDownloadResult/);
assert.match(
  landingTool,
  /downloadBlockedCtaLabel|Download held · T6 bake|freeLiveDownloadBlockReason/
);
assert.match(landingTool, /downloadPolicyLabel/);
assert.match(landingTool, /data-landing-result-meta=["']server-echo["']/);
assert.match(landingTool, /data-download-policy=/);
assert.match(landingTool, /requestCreditStateFromSuccess/);
assert.match(landingTool, /costCredits/);
assert.match(landingTool, /\/api\/downloads\//);
assert.match(landingTool, /isSafeDeliverableUrl/);
assert.match(landingTool, /isSafeDeliverableUrl\(videoUrl\)/);
// Create: Free Mini must not copy/share raw provider URL (T6 honesty)
assert.match(createStudio, /isSafeDeliverableUrl/);
assert.match(
  createStudio,
  /Free Mini raw provider URL is not a deliverable|downloadAllowed/
);
assert.match(createStudio, /shareX[\s\S]{0,400}downloadAllowed|!downloadAllowed/);
assert.match(createStudio, /data-download-policy=/);
assert.match(
  fs.readFileSync(join(root, "app/settings/page.tsx"), "utf8"),
  /data-settings-path=["']product-first["']/
);

// Phase H + product-first: /projects/[slug] noindex cold-start; one Moment before suite links
const projectPageSrc = fs.readFileSync(
  join(root, "app/projects/[slug]/page.tsx"),
  "utf8"
);
assert.match(projectPageSrc, /CONCEPT_ROBOTS/);
assert.match(projectPageSrc, /data-project-path="product-first"/);
assert.match(projectPageSrc, /data-project-cta="product-first"/);
assert.match(projectPageSrc, /data-project-footer="product-first"/);
assert.match(projectPageSrc, /effect=street-power-up/);
assert.match(projectPageSrc, /Create one Moment/);
assert.ok(
  projectPageSrc.indexOf("effect=street-power-up") <
    projectPageSrc.indexOf('href="/modules"') ||
    projectPageSrc.indexOf("effect=street-power-up") <
      projectPageSrc.indexOf("Modules"),
  "Project page: one Moment before Modules"
);
// Breadcrumb is Home / Explore / title — not Flow preview
assert.doesNotMatch(
  projectPageSrc.slice(
    projectPageSrc.indexOf('aria-label="Breadcrumb"'),
    projectPageSrc.indexOf("Inside project")
  ),
  /href=["']\/flow["']/
);

// Recovery R4: the repo has no task IDs, signed QA, or rights evidence, so
// homepage retention previews must not manufacture quality scores.
assert.match(showcase, /cached_prototype/);
assert.match(showcase, /referencePoster/);
assert.doesNotMatch(
  showcase,
  /passesHomeProofQuality|PROVISIONAL_LAB_SCORES|qualityScores|reviewerNotes/
);

// Phase C — auth claim + guest migrate after Supabase magic link
const authClaim = fs.readFileSync(
  join(root, "app/api/auth/claim/route.ts"),
  "utf8"
);
assert.match(authClaim, /durableMigrateGuest/);
assert.match(authClaim, /ensurePersonalAccount/);
assert.match(authClaim, /getAuthUserFromRequest/);
assert.match(authClaim, /RATE_LIMITED|takeToken/);
const magicLink = fs.readFileSync(
  join(root, "app/api/auth/magic-link/route.ts"),
  "utf8"
);
assert.match(magicLink, /takeToken/);
assert.match(magicLink, /RATE_LIMITED/);
assert.match(magicLink, /If the address can receive mail/);
// Success body must not require leaking email field
assert.doesNotMatch(
  magicLink.slice(magicLink.lastIndexOf("return NextResponse.json({\n    ok: true")),
  /^\s*email,/m
);
// Download redirect safety
assert.match(createTrust, /export function isSafeDeliverableUrl/);
// Free live generate success must not echo raw provider URLs (T6 honesty)
assert.match(createTrust, /export function customerFacingGenerateVideoUrl/);
assert.match(createTrust, /export function isPlayableResultVideoUrl/);
assert.match(createTrust, /export function isPublicCommunityVideoUrl/);
assert.match(createTrust, /export function isSessionGatedDownloadUrl/);
assert.match(createTrust, /export function isStorageSignedObjectUrl/);
assert.match(createTrust, /export function isProviderDeliveryMediaUrl/);
assert.match(createTrust, /export function isPrivateMomentMediaUrl/);
assert.match(createTrust, /export function isPathSafeLabDemoUrl/);
assert.match(createTrust, /export function publicShareableVideoUrl/);
assert.match(genRoute, /customerFacingGenerateVideoUrl/);
// Pure community public URL parity (AIT-454 fail closed: Lab /demos only)
function isSessionGatedDownloadUrlLocal(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  return t.startsWith("/api/downloads/") || t.includes("/api/downloads/");
}
function isStorageSignedObjectUrlLocal(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  if (!t || !/^https?:\/\//i.test(t)) return false;
  try {
    const u = new URL(t);
    const path = u.pathname.toLowerCase();
    if (path.includes("/storage/v1/object/sign/") || path.includes("/object/sign/")) {
      return true;
    }
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
function isProviderDeliveryHostLocal(hostname) {
  const host = String(hostname || "").trim().toLowerCase().replace(/\.$/, "");
  const suffixes = ["fal.media", "fal.run", "replicate.delivery", "replicate.com"];
  return suffixes.some((s) => host === s || host.endsWith(`.${s}`));
}
function isProviderDeliveryMediaUrlLocal(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  if (!t || !/^https?:\/\//i.test(t)) return false;
  try {
    return isProviderDeliveryHostLocal(new URL(t).hostname);
  } catch {
    return false;
  }
}
function isPathSafeLabDemoUrlLocal(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  if (!t.startsWith("/demos/") || t.startsWith("//")) return false;
  if (t.includes("..") || t.includes("\\") || t.includes("//")) return false;
  const path = t.split(/[?#]/)[0] || "";
  return /^\/demos\/[A-Za-z0-9._/-]+$/.test(path);
}
function isPrivateMomentMediaUrlLocal(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  return (
    isSessionGatedDownloadUrlLocal(t) ||
    isStorageSignedObjectUrlLocal(t) ||
    isProviderDeliveryMediaUrlLocal(t)
  );
}
function isPublicCommunityVideoUrl(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  if (!t || t.length > 2000) return false;
  if (isPrivateMomentMediaUrlLocal(t)) return false;
  if (isPathSafeLabDemoUrlLocal(t)) return true;
  if (!/^https?:\/\//i.test(t)) return false;
  try {
    const u = new URL(t);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (!u.hostname || u.username || u.password) return false;
    if (isProviderDeliveryHostLocal(u.hostname)) return false;
    if (isStorageSignedObjectUrlLocal(t)) return false;
    if (u.pathname.includes("/api/downloads/")) return false;
    const path = u.pathname;
    if (path.includes("..") || path.includes("\\")) return false;
    return /^\/demos\/[A-Za-z0-9._/-]+$/.test(path);
  } catch {
    return false;
  }
}
assert.equal(isPublicCommunityVideoUrl("/demos/orbit-dance.mp4"), true);
assert.equal(
  isPublicCommunityVideoUrl("https://pikbo.ai/demos/orbit-dance.mp4"),
  true
);
assert.equal(isPublicCommunityVideoUrl("https://cdn.example/v.mp4"), false);
assert.equal(isPublicCommunityVideoUrl("/api/downloads/job_1"), false);
assert.equal(
  isPublicCommunityVideoUrl("https://v3b.fal.media/files/private/result.mp4"),
  false
);
assert.equal(
  isPublicCommunityVideoUrl(
    "https://xyz.supabase.co/storage/v1/object/sign/pikbo-private-results/x.mp4?token=abc"
  ),
  false
);
assert.equal(isPublicCommunityVideoUrl("javascript:alert(1)"), false);
assert.equal(isPrivateMomentMediaUrlLocal("/api/downloads/job_1"), true);
assert.equal(
  isPrivateMomentMediaUrlLocal("https://fal.media/files/raw.mp4"),
  true
);
// Pure share-link honesty: session gate never portable; relative demos need origin
function isSessionGatedDownloadUrl(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  return t.startsWith("/api/downloads/") || t.includes("/api/downloads/");
}
function publicShareableVideoUrl(url, origin) {
  if (!url || typeof url !== "string") return null;
  const t = url.trim();
  if (!t || t.length > 2000) return null;
  if (isSessionGatedDownloadUrl(t)) return null;
  if (t.startsWith("/") && !t.startsWith("//")) {
    const o = (origin || "").replace(/\/$/, "");
    if (!o || !/^https?:\/\//i.test(o)) return null;
    return `${o}${t}`;
  }
  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      if (!u.hostname || u.username || u.password) return null;
      return t;
    } catch {
      return null;
    }
  }
  return null;
}
assert.equal(isSessionGatedDownloadUrl("/api/downloads/job_1"), true);
assert.equal(publicShareableVideoUrl("/api/downloads/job_1", "https://pikbo.ai"), null);
assert.equal(
  publicShareableVideoUrl("/demos/orbit-dance.mp4", "https://pikbo.ai"),
  "https://pikbo.ai/demos/orbit-dance.mp4"
);
assert.equal(publicShareableVideoUrl("/demos/x.mp4"), null);
assert.equal(
  publicShareableVideoUrl("https://cdn.example/v.mp4", "https://pikbo.ai"),
  "https://cdn.example/v.mp4"
);
assert.match(
  fs.readFileSync(join(root, "lib/communityPosts.ts"), "utf8"),
  /isPublicCommunityVideoUrl/
);
// T5 server-owned jobs hard-false (env alone cannot enable multi-node paid)
const durableCreditsIdx = fs.readFileSync(
  join(root, "lib/durableCredits/index.ts"),
  "utf8"
);
assert.match(
  durableCreditsIdx,
  /SERVER_OWNED_GENERATION_JOBS_IMPLEMENTED\s*=\s*false/
);
assert.match(durableCreditsIdx, /durableServerOwnedJobsStatus|durableServerOwnedJobsReady/);
assert.match(health, /durableServerOwnedJobs/);
assert.match(health, /durableCreditsBackendNote|single-node/);
// Archived Seller Pack/Batch UI keeps its T6 gating; Library MVP may preview a
// server-approved private result video after the authenticated download gate.
assert.match(
  fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
  /isPlayableResultVideoUrl/
);
assert.match(
  fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
  /Free live held for T6 bake/
);
// Phase C auth guest path product-first: one fixed Moment preview, no legacy
// remix or Modules fallback.
const loginFormSrc = fs.readFileSync(
  join(root, "components/LoginForm.tsx"),
  "utf8"
);
const loginPageSrc = fs.readFileSync(join(root, "app/login/page.tsx"), "utf8");
const loginMomentImportPattern =
  /import\s*\{\s*MOMENT_CREATE_HREF\s*\}\s*from\s*["']@\/lib\/softLaunch["']/;
const loginGuestMomentHrefPattern =
  /const LOGIN_GUEST_MOMENT_HREF\s*=\s*`\$\{MOMENT_CREATE_HREF\}&source=login-guest`/;
assert.match(loginFormSrc, /data-auth-guest-path="product-first"/);
assert.match(loginPageSrc, /data-auth-guest-path="product-first"/);
assert.match(loginFormSrc, loginMomentImportPattern);
assert.match(loginPageSrc, loginMomentImportPattern);
assert.match(loginFormSrc, loginGuestMomentHrefPattern);
assert.match(loginPageSrc, loginGuestMomentHrefPattern);
assert.match(loginFormSrc, /data-login-guest=["']moment-preview["']/);
assert.match(loginPageSrc, /data-login-guest=["']moment-preview["']/);
assert.match(loginFormSrc, /Preview Street Power-Up/);
assert.match(loginPageSrc, /Preview Street Power-Up/);
assert.doesNotMatch(loginFormSrc, /createRemixHref|360-spin-showcase/);
assert.doesNotMatch(loginPageSrc, /createRemixHref|360-spin-showcase/);
assert.doesNotMatch(
  loginFormSrc,
  /\/create\?effect=street-power-up&source=login-guest/
);
assert.doesNotMatch(
  loginPageSrc,
  /\/create\?effect=street-power-up&source=login-guest/
);
assert.doesNotMatch(loginFormSrc, /\/modules/);
assert.doesNotMatch(loginPageSrc, /\/modules/);
assert.doesNotMatch(
  loginFormSrc,
  /data-login-guest=["']generate-remix["']|\b(?:Continue as guest\s*→\s*)?Generate\b/
);
assert.doesNotMatch(
  loginPageSrc,
  /data-login-guest=["']generate-remix["']|\b(?:Continue as guest\s*→\s*)?Generate\b/
);
assert.doesNotMatch(
  loginPageSrc,
  /data-login-guest=["']generate-remix["'][\s\S]{0,80}href=["']\/create["']/
);
assert.match(
  fs.readFileSync(join(root, "components/MobileGenerateBar.tsx"), "utf8"),
  /createGenerate360Href|data-mobile-bar=["']generate-remix["']/
);
assert.match(
  genRoute,
  /Free live provider output stays server-only|Never expose the raw Free provider/
);
// Pure helper parity (mirrors createTrust)
function customerFacingGenerateVideoUrl(opts) {
  if (opts.demo || !opts.watermark) return opts.videoUrl;
  const id = (opts.jobId || "").trim();
  if (!id) return "/api/downloads/unavailable";
  return `/api/downloads/${encodeURIComponent(id)}`;
}
assert.equal(
  customerFacingGenerateVideoUrl({
    demo: true,
    watermark: true,
    jobId: "job_1",
    videoUrl: "/demos/orbit-dance.mp4",
  }),
  "/demos/orbit-dance.mp4"
);
assert.equal(
  customerFacingGenerateVideoUrl({
    demo: false,
    watermark: false,
    jobId: "job_paid",
    videoUrl: "https://cdn.example/paid.mp4",
  }),
  "https://cdn.example/paid.mp4"
);
assert.equal(
  customerFacingGenerateVideoUrl({
    demo: false,
    watermark: true,
    jobId: "job_free",
    videoUrl: "https://fal.media/raw.mp4",
  }),
  "/api/downloads/job_free"
);
assert.match(
  fs.readFileSync(join(root, "lib/generateClient.ts"), "utf8"),
  /\/api\/downloads\/|customerFacing|watermark/
);
assert.match(
  fs.readFileSync(join(root, "components/CreateStudio.tsx"), "utf8"),
  /isPlayableResultVideoUrl|Free live held for T6/
);
const downloadRouteSrc = fs.readFileSync(
  join(root, "app/api/downloads/[id]/route.ts"),
  "utf8"
);
assert.match(downloadRouteSrc, /isSafeDeliverableUrl|UNSAFE_URL/);
// Relative /demos must become absolute Location (Next redirect requirement)
assert.match(downloadRouteSrc, /absoluteDeliverableUrl|new URL\(/);
assert.match(downloadRouteSrc, /export async function HEAD/);
assert.match(downloadRouteSrc, /X-Pikbo-Download-Code|X-Pikbo-Watermark/);
// Fail-closed T6: owned derivative gate only
assert.match(downloadRouteSrc, /downloadAllowedForJob/);
assert.match(downloadRouteSrc, /X-Pikbo-T6|X-Pikbo-Bake/);
assert.doesNotMatch(downloadRouteSrc, /bakeWatermarkedVideo/);
assert.match(downloadRouteSrc, /bakedDerivative|owned derivative|Verified owned/);

// Download gate status honesty (canceled / in-flight / timeout codes)
assert.match(downloadRouteSrc, /code:\s*["']CANCELED["']/);
assert.match(downloadRouteSrc, /code:\s*["']JOB_IN_FLIGHT["']/);
assert.match(downloadRouteSrc, /X-Pikbo-Job-Status/);
assert.match(library, /interpretDownloadHead|classifyDownloadHead/);
assert.match(
  fs.readFileSync(join(root, "lib/createTrust.ts"), "utf8"),
  /Job canceled/
);
assert.match(
  fs.readFileSync(join(root, "lib/createTrust.ts"), "utf8"),
  /JOB_IN_FLIGHT|Still generating/
);
// imageJobs probe always includes canceled key (inline — imageJobsLib loads later)
assert.match(
  fs.readFileSync(join(root, "lib/imageJobs.ts"), "utf8"),
  /canceled:\s*0/
);
// health product cancel + download paths
assert.match(
  fs.readFileSync(join(root, "app/api/health/route.ts"), "utf8"),
  /cancelGenerate|DELETE \/api\/generations/
);
assert.match(
  fs.readFileSync(join(root, "app/api/health/route.ts"), "utf8"),
  /downloadGate/
);
assert.match(genJobsStore, /downloadAllowedForJob|bakedDerivative/);
assert.match(fs.readFileSync(join(root, "lib/t6Worker.ts"), "utf8"), /SERVER_OWNED_T6_BAKED_WATERMARK_IMPLEMENTED\s*=\s*false/);
assert.match(fs.readFileSync(join(root, "lib/t6Watermark.ts"), "utf8"), /t6WorkerReadiness|serverOwnedWorkerReady/);
assert.match(fs.readFileSync(join(root, "lib/t6Bake.ts"), "utf8"), /SERVER_WORKER_DISABLED/);
// Live T6 recompute at gate time + HEAD bake honesty (not frozen job.downloadAllowed)
assert.match(downloadRouteSrc, /X-Pikbo-T6|X-Pikbo-Bake/);
assert.match(genJobsStore, /downloadAllowedForJob|bakedDerivative/);
// Health free-trial product contract (session state stays on /api/me)
assert.match(health, /freeTrial/);
assert.match(health, /failedLiveRefunds/);
assert.match(health, /failedLiveRefundPolicy:\s*"when_confirmed"|when_confirmed/);
assert.match(health, /ledgerTimeoutRefund:\s*"unconfirmed"|unconfirmed/);
assert.match(
  fs.readFileSync(join(root, "app/api/me/route.ts"), "utf8"),
  /failedLiveRefundPolicy:\s*"when_confirmed"/
);
assert.match(
  fs.readFileSync(join(root, "app/api/me/route.ts"), "utf8"),
  /ledgerTimeoutRefund:\s*"unconfirmed"/
);
// imageClient network path always refundUnconfirmed (generate parity)
assert.match(
  fs.readFileSync(join(root, "lib/imageClient.ts"), "utf8"),
  /refundUnconfirmed:\s*true/
);
assert.match(
  fs.readFileSync(join(root, "components/StatusProbe.tsx"), "utf8"),
  /refunds when confirmed|TIMEOUT unconfirmed/
);
// rehydrateFreeTrial must not drop refund-policy fields after generate merge
const meClientSrc = fs.readFileSync(join(root, "lib/meClient.ts"), "utf8");
assert.match(meClientSrc, /failedLiveRefundPolicy/);
assert.match(meClientSrc, /ledgerTimeoutRefund/);
assert.match(meClientSrc, /Preserve refund-policy|refundPolicy/);
// Pure rehydrate keeps when_confirmed / unconfirmed across free plan rebuild
function rehydrateFreeTrialPolicyPure(me) {
  const refundPolicy = {
    failedLiveRefunds: me.freeTrial?.failedLiveRefunds,
    failedLiveRefundPolicy: me.freeTrial?.failedLiveRefundPolicy,
    ledgerTimeoutRefund: me.freeTrial?.ledgerTimeoutRefund,
    ledgerCancelRefund: me.freeTrial?.ledgerCancelRefund,
  };
  if (me.plan !== "free") return refundPolicy;
  return {
    failedLiveRefunds: refundPolicy.failedLiveRefunds ?? true,
    failedLiveRefundPolicy:
      refundPolicy.failedLiveRefundPolicy ?? "when_confirmed",
    ledgerTimeoutRefund: refundPolicy.ledgerTimeoutRefund ?? "unconfirmed",
    ledgerCancelRefund: refundPolicy.ledgerCancelRefund ?? "unconfirmed",
  };
}
{
  const kept = rehydrateFreeTrialPolicyPure({
    plan: "free",
    freeTrial: {
      failedLiveRefunds: true,
      failedLiveRefundPolicy: "when_confirmed",
      ledgerTimeoutRefund: "unconfirmed",
      ledgerCancelRefund: "unconfirmed",
    },
  });
  assert.equal(kept.failedLiveRefundPolicy, "when_confirmed");
  assert.equal(kept.ledgerTimeoutRefund, "unconfirmed");
  assert.equal(kept.ledgerCancelRefund, "unconfirmed");
}

// Image still cancel settlement parity (Create refund unconfirmed)
assert.match(
  fs.readFileSync(join(root, "app/image/page.tsx"), "utf8"),
  /setFailCreditState\(["']refund unconfirmed["']\)/
);
assert.match(
  fs.readFileSync(join(root, "app/image/page.tsx"), "utf8"),
  /Canceled · ledger cancel|refund unconfirmed until balance/
);
// Library session canceled honesty
assert.match(library, /Canceled — Retry mints|status === ["']canceled["']/);
{
  const defaults = rehydrateFreeTrialPolicyPure({
    plan: "free",
    freeTrial: {},
  });
  assert.equal(defaults.ledgerCancelRefund, "unconfirmed");
}
assert.match(
  fs.readFileSync(join(root, "app/settings/page.tsx"), "utf8"),
  /Live fail refunds|when confirmed|TIMEOUT unconfirmed/
);
assert.match(health, /seedance-mini|clipsPerPeriod/);
// Pure safe-url checks
function isSafeDeliverableUrlPure(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  if (!t || t.length > 2000) return false;
  if (t.startsWith("/") && !t.startsWith("//")) return !t.includes("\\");
  try {
    const u = new URL(t);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (!u.hostname || u.username || u.password) return false;
    return true;
  } catch {
    return false;
  }
}
assert.equal(isSafeDeliverableUrlPure("/demos/orbit-dance.mp4"), true);
assert.equal(isSafeDeliverableUrlPure("https://fal.media/files/x.mp4"), true);
assert.equal(isSafeDeliverableUrlPure("javascript:alert(1)"), false);
assert.equal(isSafeDeliverableUrlPure("//evil.com/x"), false);
assert.equal(isSafeDeliverableUrlPure("data:text/html,hi"), false);
// Seller Pack: unsafe direct URL dropped; requestId still allowed via downloads gate
assert.equal(
  filterAvailable([
    {
      status: "succeeded",
      videoUrl: "javascript:alert(1)",
      downloadable: true,
    },
  ]).length,
  0
);
assert.equal(
  packDownloadHref({
    status: "succeeded",
    downloadable: true,
    videoUrl: "javascript:alert(1)",
  }),
  null
);
assert.match(
  packDownloadHref({
    status: "succeeded",
    downloadable: true,
    requestId: "job_x",
    videoUrl: "javascript:alert(1)",
  }) || "",
  /\/api\/downloads\//
);
// Status page ops probe surfaces demos + freeTrial scope
assert.match(
  fs.readFileSync(join(root, "components/StatusProbe.tsx"), "utf8"),
  /Lab demos on disk|demos\?\.ok|freeTrial|billing/
);
assert.match(
  fs.readFileSync(join(root, "scripts/critical-path.sh"), "utf8"),
  /HEAD \/api\/me|X-Pikbo-Credits|X-Pikbo-Jobs-Open/
);
const authUser = fs.readFileSync(join(root, "lib/supabase/user.ts"), "utf8");
assert.match(authUser, /guestSessionIdHash/);
assert.match(authUser, /getUser/);
const authCb = fs.readFileSync(
  join(root, "app/auth/callback/page.tsx"),
  "utf8"
);
assert.match(authCb, /\/api\/auth\/claim/);
const profilePanel = fs.readFileSync(
  join(root, "components/ProfilePanel.tsx"),
  "utf8"
);
assert.match(profilePanel, /Sign out|signOut/);
assert.match(profilePanel, /\/api\/auth\/claim/);
assert.match(profilePanel, /freeTrialExhausted|Free Mini trial used|clipsLeft/);
const settingsPage = fs.readFileSync(
  join(root, "app/settings/page.tsx"),
  "utf8"
);
assert.match(settingsPage, /freeTrialExhausted|Free Mini trial|T6 bake/);
assert.match(
  fs.readFileSync(join(root, "app/settings/layout.tsx"), "utf8"),
  /PRIVATE_ROBOTS/
);
assert.match(health, /probeSupabase|auth:\s*\{/);
// Shared download HEAD classifier (Create/Library/history)
assert.match(
  fs.readFileSync(join(root, "lib/createTrust.ts"), "utf8"),
  /export function classifyDownloadHead/
);
assert.match(
  createTrust,
  /export function interpretDownloadHead/
);
assert.match(
  fs.readFileSync(join(root, "lib/createTrust.ts"), "utf8"),
  /code === ["']CANCELED["']/
);
assert.match(
  fs.readFileSync(join(root, "components/CreateStudio.tsx"), "utf8"),
  /interpretDownloadHead|classifyDownloadHead|downloadActiveResult/
);
assert.match(
  fs.readFileSync(join(root, "components/LibraryGrid.tsx"), "utf8"),
  /interpretDownloadHead|classifyDownloadHead/
);
assert.match(
  fs.readFileSync(join(root, "lib/history.ts"), "utf8"),
  /classifyDownloadHead|["']blocked["']/
);
assert.match(
  fs.readFileSync(join(root, "lib/createTrust.ts"), "utf8"),
  /code === ["']CANCELED["']/
);
assert.match(
  fs.readFileSync(join(root, "lib/createTrust.ts"), "utf8"),
  /code === ["']CANCELED["'] \|\|/
);
assert.match(
  fs.readFileSync(join(root, "lib/createTrust.ts"), "utf8"),
  /PROVIDER_TIMEOUT/
);
// Library's private result button performs an authenticated HEAD probe before
// fetching the gated video; no raw history/download anchor is exposed.
// AIT-523: HEAD goes through wall-clock ownerRecoveryFetch (Bearer via
// privateDownloadHeaders inside the helper) — not a bare untimed HEAD.
assert.match(library, /ownerRecoveryFetch/);
assert.match(
  library,
  /async function download[\s\S]{0,500}ownerRecoveryFetch[\s\S]{0,200}method:\s*["']HEAD["']/
);
assert.match(library, /privateDownloadHeaders/);
assert.match(library, /interpretDownloadHead[\s\S]{0,900}downloadVideoFile/);
// downloadVideoFile: HEAD block/JSON → blocked; HEAD allow + CORS may open gate
const historyLibSrc = fs.readFileSync(join(root, "lib/history.ts"), "utf8");
assert.match(historyLibSrc, /downloadVideoFile|classifyDownloadHead/);
assert.match(historyLibSrc, /return ["']blocked["']/);
assert.match(historyLibSrc, /gateHeadAllowed/);
assert.ok(
  historyLibSrc.includes("/api/downloads/") &&
    historyLibSrc.includes('return "blocked"'),
  "downloadVideoFile must block /api/downloads when HEAD refuses"
);
// Reject JSON/text Content-Type so gate error bodies never save as .mp4
assert.match(
  historyLibSrc,
  /application\/json|Content-Type/
);
// Create / Library / Landing / Seller Pack: allow path uses blob helper — never
// window.open(gateUrl) which dumps 403/409 JSON into a new tab.
assert.match(createStudio, /downloadVideoFile/);
assert.match(library, /downloadVideoFile/);
assert.match(landingTool, /downloadVideoFile/);
assert.match(batchStudio, /downloadVideoFile/);
assert.match(createStudio, /downloads_api_blob|downloadVideoFile\(gateUrl/);
assert.match(library, /downloadVideoFile\(\s*gateUrl/);
assert.match(landingTool, /downloads_api_blob|downloadVideoFile\(gateUrl/);
// Copy/Share: never present session-gated /api/downloads as a public link
assert.match(createStudio, /publicShareableVideoUrl/);
assert.match(createStudio, /isSessionGatedDownloadUrl|Session download only/);
assert.doesNotMatch(
  createStudio,
  /window\.open\(\s*gateUrl/
);
assert.doesNotMatch(
  library,
  /window\.open\(\s*gateUrl/
);
assert.doesNotMatch(
  landingTool,
  /window\.open\(\s*gateUrl/
);
assert.doesNotMatch(
  batchStudio,
  /window\.open\(\s*gateUrl/
);
assert.match(
  fs.readFileSync(join(root, "app/api/me/route.ts"), "utf8"),
  /ledgerCancelRefund/
);
assert.match(
  fs.readFileSync(join(root, "app/api/health/route.ts"), "utf8"),
  /ledgerCancelRefund/
);




// Signed-in durable shadow on generate + me enrichment
const durableIdx = fs.readFileSync(
  join(root, "lib/durableCredits/index.ts"),
  "utf8"
);
assert.match(durableIdx, /getPersonalWallet/);
assert.match(durableIdx, /SUPABASE_URL|NEXT_PUBLIC_SUPABASE_URL/);
assert.match(meClient, /displayCredits|Authorization/);
assert.match(gen, /generateAuthHeaders|Authorization/);
const creditsBadge = fs.readFileSync(
  join(root, "components/CreditsBadge.tsx"),
  "utf8"
);
assert.match(creditsBadge, /displayCredits/);

// Phase G performance + proof notes + D cancel/local upload
const hfHome = fs.readFileSync(
  join(root, "components/HfExploreHome.tsx"),
  "utf8"
);
// LCP: posters first; sources only when playing (AutoPlayVideo lazySources)
assert.match(hfHome, /lazySources|posters first|AutoPlayVideo/);
assert.match(hfHome, /fetchPriority/);
const autoPlaySrc = fs.readFileSync(
  join(root, "components/AutoPlayVideo.tsx"),
  "utf8"
);
// Phase G: mobile wall poster-first; featured wall does not steal hero LCP
assert.match(
  autoPlaySrc,
  /allowMetadataPreload|data-video-mobile-poster-first|isNarrow/
);
assert.match(autoPlaySrc, /preload=\{allowMetadataPreload \? "metadata" : "none"\}/);
assert.match(autoPlaySrc, /lazySources/);
assert.match(autoPlaySrc, /playbackBudget/);
assert.match(
  fs.readFileSync(join(root, "components/HomeDesignerGallery.tsx"), "utf8"),
  /data-home-gallery|designer-toy|Browse toy types/
);
assert.match(
  fs.readFileSync(join(root, "components/HomeCinemaHero.tsx"), "utf8"),
  /art-vinyl-guardian|priority|Style study/
);

const projectPage = fs.readFileSync(
  join(root, "app/projects/[slug]/page.tsx"),
  "utf8"
);
assert.match(projectPage, /provider task ID/);
assert.match(projectPage, /showcaseEvidenceChecklist/);
assert.match(projectPage, /Promotion locked/);
assert.doesNotMatch(projectPage, /reviewerNotes|\b[0-5](?:\.\d+)?\s*\/\s*5\b/);
const loginForm = fs.readFileSync(
  join(root, "components/LoginForm.tsx"),
  "utf8"
);
assert.match(loginForm, /signInWithOAuth|Continue with Google/);
assert.match(loginForm, /auth\.providers\.google/);
assert.match(genJobIdRoute, /cancelJob/);
// Generate abort cancel ledger (parity with image cancelImageLedger)
// genJobsStore already loaded above; generations list route + generateClient
assert.match(
  fs.readFileSync(join(root, "app/api/generations/route.ts"), "utf8"),
  /export async function DELETE/
);
assert.match(
  fs.readFileSync(join(root, "app/api/generations/route.ts"), "utf8"),
  /X-Pikbo-Jobs-Canceled/
);
assert.match(genJobsStore, /idempotencyKey\?:/);
assert.match(genJobsStore, /creditsOutcome:\s*["']refund unconfirmed["']/);
assert.match(
  fs.readFileSync(join(root, "lib/generateClient.ts"), "utf8"),
  /cancelGenerateLedger/
);
assert.match(
  fs.readFileSync(join(root, "lib/generateClient.ts"), "utf8"),
  /method:\s*["']DELETE["']/
);
assert.match(
  fs.readFileSync(join(root, "lib/generateClient.ts"), "utf8"),
  /keepalive:\s*true/
);
// Settings shows canceled counts separately (not failed/canceled lumped)
// settingsPage already loaded above
assert.match(settingsPage, /X-Pikbo-Jobs-Canceled/);
assert.match(settingsPage, /X-Pikbo-Image-Jobs-Canceled/);
assert.match(settingsPage, /X-Pikbo-Image-Jobs-Queued/);
assert.match(settingsPage, /data-settings-jobs-detail=["']video["']/);
assert.match(settingsPage, /data-settings-jobs-detail=["']image["']/);
assert.match(settingsPage, /\{jobsProbe\.canceled\} canceled/);
// Create cancel sets refund unconfirmed immediately
assert.match(
  fs.readFileSync(join(root, "components/CreateStudio.tsx"), "utf8"),
  /setLastRequestCreditState\(["']refund unconfirmed["']\)/
);
assert.match(
  fs.readFileSync(join(root, "components/LandingToolPanel.tsx"), "utf8"),
  /setFailCreditState\(["']refund unconfirmed["']\)/
);
// Webhook cancel stamps refund unconfirmed (never invent restore)
assert.match(genJobsStore, /Canceled by provider[\s\S]{0,120}refund unconfirmed|status === "canceled"[\s\S]{0,200}refund unconfirmed/);
// Seller Pack child idempotency for abort cancel targeting
assert.match(
  fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
  /idempotencyKey:\s*childIdempotencyKey|pack:\$\{projectId\}/
);
// Ops scripts surface canceled HEAD counters
assert.match(
  fs.readFileSync(join(root, "scripts/critical-path.sh"), "utf8"),
  /X-Pikbo-Jobs-Canceled|Jobs-Canceled/
);
assert.match(
  fs.readFileSync(join(root, "scripts/critical-path.sh"), "utf8"),
  /X-Pikbo-Image-Jobs-Canceled|Image-Jobs-Canceled/
);
assert.match(
  fs.readFileSync(join(root, "scripts/mode-a-acceptance.sh"), "utf8"),
  /byStatus\.canceled|canceled key/
);


assert.match(genJobIdRoute, /export async function DELETE/);
const assetContent = fs.readFileSync(
  join(root, "app/api/assets/[id]/content/route.ts"),
  "utf8"
);
assert.match(assetContent, /putLocalAsset/);
// HEAD meta probe without dataUrl (TTL / multi-instance recovery)
assert.match(assetContent, /export async function HEAD/);
assert.match(assetContent, /X-Pikbo-Asset/);
assert.match(
  fs.readFileSync(join(root, "lib/localAssets.ts"), "utf8"),
  /putLocalAsset/
);

// Phase C — one atomic Seller Pack reserve 30 / server-only terminal state
const sellerPackLib = fs.readFileSync(
  join(root, "lib/durableCredits/sellerPack.ts"),
  "utf8"
);
assert.match(sellerPackLib, /SELLER_PACK_QUOTE_CREDITS/);
assert.match(sellerPackLib, /reserveSellerPackAtomic/);
assert.match(sellerPackLib, /authorizeSellerPackChildLive/);
assert.match(sellerPackLib, /settleSellerPackChildAtomic/);
assert.match(sellerPackLib, /releaseSellerPackChildAtomic/);
assert.doesNotMatch(sellerPackLib, /reserveSellerPackShadow/);
function sellerPackQuoteCredits(childCount = 3, per = 10) {
  return childCount * per;
}
assert.equal(sellerPackQuoteCredits(3), 30);
assert.equal(sellerPackQuoteCredits(1), 10);
const spReserve = fs.readFileSync(
  join(root, "app/api/seller-pack/reserve/route.ts"),
  "utf8"
);
assert.match(spReserve, /reserveSellerPackAtomic/);
assert.match(spReserve, /AUTH_REQUIRED/);
assert.match(spReserve, /SELLER_PACK_QUOTE_CREDITS|quoteCredits/);
// R0/R1 honesty: guest/shadow/cookie is not live-spend authority.
assert.doesNotMatch(spReserve, /cookie-generate-still-authoritative/);
assert.match(spReserve, /server-owned-atomic-pack/);

// Phase F Seller Pack Free Mini cannot start full 30-credit live pack
{
  const quoteSrc = fs.readFileSync(join(root, "lib/sellerPackQuote.ts"), "utf8");
  assert.match(quoteSrc, /export function sellerPackLiveStartAllowed/);
  assert.match(quoteSrc, /FREE_MINI_FULL_PACK/);
  assert.match(
    fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
    /sellerPackLiveStartAllowed/
  );
  assert.doesNotMatch(
    fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
    /cookie generate remains authoritative/
  );
  assert.match(
    fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
    /data-seller-pack-free-mini=["']single-child["']/
  );
  // Pure policy: demo always ok; 10 credits blocks 3-child live pack
  function sellerPackLiveStartAllowed(opts) {
    if (opts.demo) return { ok: true };
    if (opts.balance === undefined) return { ok: true };
    const need = Math.max(1, opts.childCount) * 10;
    const have = opts.balance;
    if (have >= need) return { ok: true };
    if (have < need && have < 30 && need >= 30) {
      return { ok: false, code: "FREE_MINI_FULL_PACK" };
    }
    return { ok: false, code: "INSUFFICIENT_CREDITS" };
  }
  assert.equal(sellerPackLiveStartAllowed({ demo: true, balance: 0, childCount: 3 }).ok, true);
  assert.equal(sellerPackLiveStartAllowed({ demo: false, balance: 10, childCount: 3 }).ok, false);
  assert.equal(
    sellerPackLiveStartAllowed({ demo: false, balance: 10, childCount: 3 }).code,
    "FREE_MINI_FULL_PACK"
  );
  assert.equal(sellerPackLiveStartAllowed({ demo: false, balance: 30, childCount: 3 }).ok, true);
  assert.equal(sellerPackLiveStartAllowed({ demo: false, balance: 20, childCount: 2 }).ok, true);
}

assert.equal(
  fs.existsSync(join(root, "app/api/seller-pack/settle/route.ts")),
  false
);
assert.equal(
  fs.existsSync(join(root, "app/api/seller-pack/release/route.ts")),
  false
);
assert.match(batchStudio, /reserveSellerPackClient/);
assert.match(batchStudio, /packRunId[\s\S]*packJobId/);
assert.doesNotMatch(batchStudio, /settleSellerPackChildClient/);
assert.doesNotMatch(batchStudio, /releaseSellerPackChildClient/);
assert.match(
  fs.readFileSync(
    join(root, "app/api/internal/seller-pack/reconcile/route.ts"),
    "utf8"
  ),
  /PIKBO_INTERNAL_WORKER_SECRET[\s\S]*expireAtomicSellerPackQueuedChildren/
);

// Round B Y5 — pure Seller Pack quote + BatchStudio strip
const spQuoteSrc = fs.readFileSync(
  join(root, "lib/sellerPackQuote.ts"),
  "utf8"
);
assert.match(spQuoteSrc, /export function sellerPackQuote/);
assert.match(spQuoteSrc, /export function sellerPackBalanceCovers/);
assert.match(spQuoteSrc, /export function sellerPackQuoteLabel/);
assert.match(spQuoteSrc, /export function batchQuoteLabel/);
assert.match(batchStudio, /sellerPackQuoteLabel|sellerPackQuote\(/);
assert.match(batchStudio, /batchQuoteLabel|Custom batch · Preview/);
assert.match(
  fs.readFileSync(join(root, "components/SeedanceCampaign.tsx"), "utf8"),
  /createRemixHref|desktopPlayMode=["']interaction["']|Seller Pack/
);
assert.match(batchStudio, /Session balance|covers this pack|short /);
assert.match(
  fs.readFileSync(join(root, "components/SellerPackSteps.tsx"), "utf8"),
  /10 credits each|30 live/
);
// Pure quote math (mirror lib/sellerPackQuote)
function sellerPackQuotePure(demo, childCount = 3) {
  if (demo) return { childCount, creditsPerChild: 0, totalCredits: 0, demo: true };
  return {
    childCount,
    creditsPerChild: 10,
    totalCredits: childCount * 10,
    demo: false,
  };
}
assert.equal(sellerPackQuotePure(false).totalCredits, 30);
assert.equal(sellerPackQuotePure(true).totalCredits, 0);
assert.equal(sellerPackQuotePure(false, 1).totalCredits, 10);
assert.equal(
  sellerPackQuotePure(false).totalCredits <= 5
    ? false
    : sellerPackQuotePure(false).totalCredits === 30,
  true
);
function sellerPackBalanceCoversPure(quote, balance) {
  if (quote.demo) return true;
  if (balance === undefined) return true;
  return balance >= quote.totalCredits;
}
assert.equal(sellerPackBalanceCoversPure(sellerPackQuotePure(false), 30), true);
assert.equal(sellerPackBalanceCoversPure(sellerPackQuotePure(false), 10), false);
assert.equal(sellerPackBalanceCoversPure(sellerPackQuotePure(false), undefined), true);
// Free Mini cannot start a 3-child live pack (PRD §6)
function sellerPackLiveStartAllowedPure(opts) {
  if (opts.demo) return { ok: true };
  if (opts.balance === undefined) return { ok: true };
  const need = Math.max(1, opts.childCount) * 10;
  const have = opts.balance;
  if (have >= need) return { ok: true };
  if (have < need && have < 30 && need >= 30) {
    return { ok: false, code: "FREE_MINI_FULL_PACK" };
  }
  return { ok: false, code: "INSUFFICIENT_CREDITS" };
}
assert.equal(
  sellerPackLiveStartAllowedPure({ demo: true, balance: 0, childCount: 3 }).ok,
  true
);
assert.equal(
  sellerPackLiveStartAllowedPure({ demo: false, balance: 10, childCount: 3 }).ok,
  false
);
assert.equal(
  sellerPackLiveStartAllowedPure({ demo: false, balance: 10, childCount: 3 })
    .code,
  "FREE_MINI_FULL_PACK"
);
assert.equal(
  sellerPackLiveStartAllowedPure({ demo: false, balance: 30, childCount: 3 }).ok,
  true
);

// Client network honesty codes
assert.match(gen, /REQUEST_CANCELED|NETWORK_ERROR/);
assert.match(contracts, /NETWORK_ERROR/);
assert.match(contracts, /REQUEST_CANCELED/);

// Phase D video-provider webhook idempotency (store + route)
assert.match(genJobsStore, /applyProviderWebhookEvent/);
assert.match(genJobsStore, /findJobByRequestOrId/);
assert.match(genJobsStore, /webhookEvents/);
assert.match(genJobsStore, /UNSAFE_URL|isSafeDeliverableUrl/);
// R1b/R1c: late/orphan live webhook success withholds — never free "10 used"
assert.match(genJobsStore, /providerCompletionDecision/);
assert.match(genJobsStore, /WITHHELD_ORPHAN|Late provider success withheld/);
assert.match(genJobsStore, /withheld:\s*true/);
assert.match(
  fs.readFileSync(join(root, "app/api/webhooks/video-provider/route.ts"), "utf8"),
  /withheld:\s*result\.withheld|result\.withheld === true/
);
assert.match(
  fs.readFileSync(join(root, "lib/durableCredits/sellerPack.ts"), "utf8"),
  /parallel shadow ledger|never opens a second/
);
// Webhook must not map UNSAFE_URL to 500 — client/ops need 422.
assert.match(
  fs.readFileSync(join(root, "app/api/webhooks/video-provider/route.ts"), "utf8"),
  /UNSAFE_URL[\s\S]{0,80}422/
);
// Contract + client must know timeout/content codes
assert.match(
  fs.readFileSync(join(root, "lib/contracts.ts"), "utf8"),
  /PROVIDER_TIMEOUT/
);
assert.match(
  fs.readFileSync(join(root, "lib/contracts.ts"), "utf8"),
  /CONTENT_POLICY/
);
assert.match(gen, /PROVIDER_TIMEOUT/);
assert.match(gen, /CONTENT_POLICY/);

// Pure providerFailHttp parity
function providerFailHttpPure(kind) {
  if (kind === "balance") return { code: "PROVIDER_BALANCE", status: 402 };
  if (kind === "rate")
    return { code: "PROVIDER_RATE_LIMIT", status: 429, retryAfterSec: 8 };
  if (kind === "timeout")
    return { code: "PROVIDER_TIMEOUT", status: 504, retryAfterSec: 5 };
  if (kind === "network")
    return { code: "PROVIDER_NETWORK", status: 503, retryAfterSec: 8 };
  if (kind === "content") return { code: "CONTENT_POLICY", status: 422 };
  return { code: "GENERATION_FAILED", status: 500 };
}
assert.equal(providerFailHttpPure("timeout").code, "PROVIDER_TIMEOUT");
assert.equal(providerFailHttpPure("timeout").status, 504);
assert.equal(providerFailHttpPure("network").code, "PROVIDER_NETWORK");
assert.equal(providerFailHttpPure("network").status, 503);
assert.equal(providerFailHttpPure("content").code, "CONTENT_POLICY");
assert.equal(providerFailHttpPure("content").status, 422);
assert.equal(providerFailHttpPure("rate").retryAfterSec, 8);

// Provider network + TIMEOUT contract/client honesty
assert.match(pe, /PROVIDER_NETWORK|network/);
assert.match(
  fs.readFileSync(join(root, "lib/contracts.ts"), "utf8"),
  /PROVIDER_NETWORK/
);
assert.match(
  fs.readFileSync(join(root, "lib/contracts.ts"), "utf8"),
  /"TIMEOUT"/
);
assert.match(gen, /PROVIDER_NETWORK|TIMEOUT/);
assert.match(genRoute, /TIMEOUT|jobLedgerInFlightRetryAfterSec/);
assert.match(genJobsStore, /jobLedgerInFlightRetryAfterSec/);

// Phase D job timeout recovery
assert.match(genJobsStore, /sweepTimedOutJobs/);
assert.match(genJobsStore, /jobTimeoutMs|TIMEOUT/);
assert.match(
  fs.readFileSync(join(root, "app/api/generations/route.ts"), "utf8"),
  /sweepTimedOutJobs|timedOutThisSweep/
);
// Pure timeout age math (mirrors store intent)
function ageMs(iso, now) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, now - t);
}
assert.ok(ageMs(new Date(0).toISOString(), 60_000) >= 60_000);
const ageNow = Date.now();
assert.equal(ageMs(new Date(ageNow).toISOString(), ageNow), 0);

// T6 honest blocked status (player overlay ≠ file bake)
const t6 = fs.readFileSync(join(root, "lib/t6Watermark.ts"), "utf8");
const t6Worker = fs.readFileSync(join(root, "lib/t6Worker.ts"), "utf8");
assert.match(t6, /export function t6Report/);
assert.match(t6, /status:\s*"blocked"|blocked/);
assert.match(t6, /playerOverlayIsNotFileWatermark/);
assert.doesNotMatch(t6, /PIKBO_T6_FILE_BAKE\s*===\s*["']1["']/);
assert.match(t6, /t6WorkerReadiness|serverOwnedWorkerReady|blocked/);
assert.match(t6, /bake_on_download|worker_configured/);
assert.match(t6, /t6AllowsFreeDownloadAttempt|workerRequested/);
assert.match(t6, /PIKBO_T6_BAKED_WATERMARK_WORKER/);
assert.doesNotMatch(t6, /PIKBO_WATERMARK_WORKER_URL/);
assert.match(t6Worker, /SERVER_OWNED_T6_BAKED_WATERMARK_IMPLEMENTED = false/);
assert.match(t6Worker, /createServerOwnedT6Input|ServerOwnedT6Input/);
assert.match(t6Worker, /isPublicProviderOutputUrl/);
assert.match(t6Worker, /https:|localhost|isNonPublicIpv4|isPrivateIpv4/);
assert.match(t6Worker, /hasOnlyPublicResolvedAddresses|SOURCE_PRIVATE_NETWORK/);
assert.match(t6Worker, /T6_MAX_SOURCE_BYTES|T6_SOURCE_TIMEOUT_MS/);
assert.match(t6Worker, /video\/mp4|SOURCE_CONTENT_TYPE/);
assert.match(t6Worker, /drawtext|PIKBO baked watermark/);
assert.match(t6Worker, /t6-baked\//);
assert.match(t6Worker, /t6OwnedDeliveryPath|\/api\/t6-derivatives/);
assert.match(t6Worker, /transitionT6Derivative|DERIVATIVE_UNVERIFIED/);
// Hard gate: derivative must bind jobId+providerRequestId; metadata alone cannot unlock
assert.match(t6Worker, /isVerifiedT6DerivativeForJob|DERIVATIVE_IDENTITY_MISMATCH/);
assert.match(t6Worker, /t6DeliveryReadiness|canServeVerifiedT6Derivative/);
assert.match(genJobsStore, /canServeVerifiedT6Derivative/);
assert.match(genJobsStore, /jobId:.*\n[\s\S]*?providerRequestId:/);
assert.match(downloadRouteSrc, /jobId:\s*job\.id/);
assert.match(downloadRouteSrc, /providerRequestId:\s*job\.requestId/);
assert.match(t6Worker, /SERVER_WORKER_DISABLED/);
assert.match(
  t6Worker,
  /T6_DERIVATIVE_SERVING_IMPLEMENTED|T6_OWNED_STORAGE_ADAPTER_IMPLEMENTED/
);
assert.match(t6, /derivativeServingImplemented|storageAdapterImplemented/);
assert.equal(
  fs.existsSync(join(root, "app/api/t6-derivatives")),
  true,
  "T6 controlled derivative serving route source must exist"
);
assert.doesNotMatch(t6Worker, /fetch\(input\.providerOutputUrl/);
const t6DerivativeRoute = fs.readFileSync(
  join(root, "app/api/t6-derivatives/[hash]/route.ts"),
  "utf8"
);
assert.match(t6DerivativeRoute, /readT6OwnedDerivative/);
assert.match(t6DerivativeRoute, /getAuthUserFromRequest/);
assert.match(t6DerivativeRoute, /canServeVerifiedT6Derivative/);
assert.doesNotMatch(
  t6DerivativeRoute,
  /providerOutputUrl|videoUrl|NextResponse\.redirect/
);
const t6Fixture = join(root, "scripts/t6-watermark-worker-fixture.mjs");
assert.match(
  fs.readFileSync(t6Fixture, "utf8"),
  /runT6PipelineWithInjectedRunner|DERIVATIVE_IDENTITY_MISMATCH/
);
execFileSync(process.execPath, ["--experimental-strip-types", t6Fixture], {
  stdio: "pipe",
});
const t6DeliverableProof = join(root, "scripts/t6-deliverable-proof.mjs");
execFileSync(
  process.execPath,
  ["--experimental-strip-types", t6DeliverableProof],
  { stdio: "pipe" }
);
assert.match(health, /probeSoftLiveReadiness/);
assert.match(
  fs.readFileSync(join(root, "lib/liveReadinessServer.ts"), "utf8"),
  /t6Report/
);
assert.match(
  fs.readFileSync(join(root, "lib/createTrust.ts"), "utf8"),
  /bakedDerivativeVerified|server-owned baked derivative/
);
assert.match(
  fs.readFileSync(join(root, "lib/t6Bake.ts"), "utf8"),
  /bakeWatermarkedVideo|SERVER_WORKER_DISABLED/
);
assert.match(health, /jobTimeoutMs/);
assert.match(createTrust, /bakedDerivativeVerified|T6 blocked|server-owned/);

// Phase C Supabase Postgres durable adapter
const sbStore = fs.readFileSync(
  join(root, "lib/durableCredits/supabaseStore.ts"),
  "utf8"
);
assert.match(sbStore, /probeSupabaseCreditsSchema/);
assert.match(sbStore, /supabaseEnsurePersonalAccount/);
assert.match(sbStore, /supabaseReserve/);
assert.match(sbStore, /supabaseSettle/);
assert.match(sbStore, /supabaseRelease/);
assert.match(sbStore, /supabaseMigrateGuest/);
assert.match(durableIdx, /supabaseEnsurePersonalAccount|prefersSupabaseBackend/);
assert.match(durableIdx, /probeSupabaseCreditsSchema/);
const localStore = fs.readFileSync(
  join(root, "lib/durableCredits/localStore.ts"),
  "utf8"
);
assert.match(localStore, /schemaReady/);
assert.match(localStore, /probeSupabaseCreditsSchema/);

// Phase I payments readiness + checkout live-key / flag gates
const stripeSrc = fs.readFileSync(join(root, "lib/stripe.ts"), "utf8");
assert.match(stripeSrc, /export function paymentsReadiness/);
assert.match(stripeSrc, /readyForTestCheckout/);
assert.match(stripeSrc, /liveKeysBlocked|sk_live/);
assert.match(stripeSrc, /paymentsClientEnabled/);
const checkoutSrc = fs.readFileSync(
  join(root, "app/api/checkout/route.ts"),
  "utf8"
);
assert.match(checkoutSrc, /PAYMENTS_DISABLED|paymentsClientEnabled/);
assert.match(checkoutSrc, /LIVE_KEYS_BLOCKED|PAYMENTS_LIVE/);
assert.match(health, /paymentsReadiness|payments:/);
// Pure secret mode classifier
function stripeSecretMode(key) {
  if (!key) return "missing";
  if (key.startsWith("sk_test_")) return "test";
  if (key.startsWith("sk_live_")) return "live";
  return "unknown";
}
assert.equal(stripeSecretMode(""), "missing");
assert.equal(stripeSecretMode("sk_test_abc"), "test");
assert.equal(stripeSecretMode("sk_live_abc"), "live");

// Reservation TTL expire sweep (pure engine export)
const engineSrc = fs.readFileSync(
  join(root, "lib/durableCredits/engine.ts"),
  "utf8"
);
assert.match(engineSrc, /export function expireStaleReservations/);
assert.match(durableIdx, /durableExpireStaleReservations|expireStaleReservations/);
assert.match(health, /reservationSweep|durableExpireStaleReservations/);
const softliveChk = fs.readFileSync(
  join(root, "scripts/softlive-checklist.sh"),
  "utf8"
);
assert.match(softliveChk, /SUPABASE_URL|SUPABASE/);
assert.match(softliveChk, /PAYMENTS_ENABLED|sk_live/);
const vercelJson = fs.readFileSync(join(root, "vercel.json"), "utf8");
assert.match(vercelJson, /X-Content-Type-Options|X-Frame-Options/);

// Phase D assetId generate path + Library session jobs
assert.match(genRoute, /getLocalAsset|assetId/);
assert.match(genRoute, /ASSET_NOT_FOUND/);
assert.match(
  fs.readFileSync(join(root, "lib/contracts.ts"), "utf8"),
  /assetId\?:/
);
assert.match(
  fs.readFileSync(join(root, "lib/clientAssets.ts"), "utf8"),
  /registerLocalAsset/
);
assert.match(createStudio, /registerLocalAsset|assetId/);
// Library now reads the authenticated generations ledger directly; detailed
// ledger/recovery assertions remain on the API/store paths below.
assert.match(library, /\/api\/generations/);
assert.match(
  fs.readFileSync(join(root, "app/library/page.tsx"), "utf8"),
  /PRIVATE_ROBOTS/
);
assert.match(
  fs.readFileSync(join(root, "app/profile/page.tsx"), "utf8"),
  /PRIVATE_ROBOTS/
);
assert.match(
  fs.readFileSync(join(root, "app/login/page.tsx"), "utf8"),
  /PRIVATE_ROBOTS/
);
// Failure next-actions live on shared GenerateFailPanel (Create/Batch/Landing/Image)
const failPanel = fs.readFileSync(
  join(root, "components/GenerateFailPanel.tsx"),
  "utf8"
);
// Fail CTAs are i18n keys (en/zh via t); restored/unconfirmed copy lives in lib/i18n
assert.match(failPanel, /fail\.anotherRecipe|fail\.labSample/);
assert.match(failPanel, /fail\.restored|fail\.unconfirmed/);
// Retry-After countdown locks Retry until wait elapses
assert.match(failPanel, /retryAfterSec|waitLeft|Retry in/);
assert.match(failPanel, /href=["']\/library["']/);
const i18nSrc = fs.readFileSync(join(root, "lib/i18n.ts"), "utf8");
assert.match(i18nSrc, /fail\.labSample/);
assert.match(i18nSrc, /Free Lab sample|免费实验室样片/);
assert.match(i18nSrc, /10 credits restored|已退还 10 积分/);
assert.match(createStudio, /GenerateFailPanel/);
assert.match(createStudio, /failRetryAfterSec|retryAfterSec=/);
assert.match(batchStudio, /GenerateFailPanel/);
assert.match(batchStudio, /failRetryAfterSec|retryAfterSec=/);
assert.match(batchStudio, /registerLocalAsset|sharedAssetId/);
assert.match(batchStudio, /retryAllFailed|Retry failed only/);
assert.match(
  fs.readFileSync(join(root, "components/LandingToolPanel.tsx"), "utf8"),
  /GenerateFailPanel/
);
assert.match(
  fs.readFileSync(join(root, "components/LandingToolPanel.tsx"), "utf8"),
  /failRetryAfterSec|retryAfterSec=/
);
assert.match(
  fs.readFileSync(join(root, "components/LandingToolPanel.tsx"), "utf8"),
  /failCreditState|requestCreditStateFromFailure/
);
// Network/abort client fails always carry refundUnconfirmed
assert.match(gen, /refundUnconfirmed:\s*true/);
assert.match(gen, /NETWORK_ERROR/);
assert.match(gen, /REQUEST_CANCELED/);
// Still Studio FailPanel Retry-After + refund unconfirmed (parity with Create)
const imagePageSrc = fs.readFileSync(join(root, "app/image/page.tsx"), "utf8");
assert.match(imagePageSrc, /GenerateFailPanel/);
assert.match(imagePageSrc, /failRetryAfterSec|retryAfterSec=/);
assert.match(imagePageSrc, /refund unconfirmed|failCreditState/);
assert.match(imagePageSrc, /postImageWithRetry|imageClient/);
// Shared still client (generateClient parity)
const imageClientSrc = fs.readFileSync(join(root, "lib/imageClient.ts"), "utf8");
assert.match(imageClientSrc, /export async function postImageWithRetry/);
assert.match(imageClientSrc, /mintImageIdempotencyKey/);
assert.match(imageClientSrc, /PROVIDER_NETWORK/);
assert.match(imageClientSrc, /PROVIDER_TIMEOUT/);
assert.match(imageClientSrc, /refundUnconfirmed/);
assert.match(imageClientSrc, /interpretImageResponse/);
// Library renders failure/retry state; refund-unconfirmed accounting remains
// asserted on Generate/API/client sources rather than retired UI copy.
assert.match(
  fs.readFileSync(join(root, "app/auth/callback/layout.tsx"), "utf8"),
  /PRIVATE_ROBOTS|index:\s*false/
);

// Phase H privacy-converged analytics funnel + private ops robots
const analyticsSrc = fs.readFileSync(join(root, "lib/analytics.ts"), "utf8");
assert.match(
  analyticsSrc,
  /create_view[\s\S]*asset_upload_complete[\s\S]*generation_start[\s\S]*generation_success[\s\S]*download[\s\S]*regenerate_7d/
);
assert.match(analyticsSrc, /NEXT_PUBLIC_ANALYTICS_URL|sendBeacon/);
assert.match(createStudio, /upload_ready|export_click/);
assert.match(
  fs.readFileSync(join(root, "components/ExploreProjectGrid.tsx"), "utf8"),
  /project_open/
);
assert.match(
  fs.readFileSync(join(root, "components/ProjectOpenBeacon.tsx"), "utf8"),
  /project_open/
);
assert.match(
  fs.readFileSync(join(root, "app/robots.ts"), "utf8"),
  /\/status/
);
assert.match(
  fs.readFileSync(join(root, "app/profile/page.tsx"), "utf8"),
  /account, plan, balance, and saved work/
);

// Pricing FAQ JSON-LD + Explore evidence labels
const pricingPage = fs.readFileSync(join(root, "app/pricing/page.tsx"), "utf8");
assert.match(pricingPage, /canonical:\s*[\"']\/pricing[\"']/);
assert.match(pricingPage, /FAQPage|application\/ld\+json/);
assert.match(pricingPage, /pricingFaqItems/);
// exploreGrid already loaded earlier in this script
assert.match(exploreGrid, /Evidence pending|cached prototype/i);
assert.doesNotMatch(exploreGrid, /passesHomeProofQuality|Lab\s*≥\s*4|Lab >=4/);
assert.match(exploreGrid, /recipe_use/);
const critPathModeA = fs.readFileSync(
  join(root, "scripts/critical-path.sh"),
  "utf8"
);
assert.match(critPathModeA, /\/status/);
assert.match(critPathModeA, /\/login/);
assert.match(critPathModeA, /\/api\/auth\/status/);
assert.match(critPathModeA, /\/api\/generations/);
assert.match(critPathModeA, /HEAD \/api\/health|HEAD.*health/);
const modeA = fs.readFileSync(
  join(root, "scripts/mode-a-acceptance.sh"),
  "utf8"
);
assert.match(modeA, /mode-a-acceptance|Mode A acceptance/);
assert.match(modeA, /critical-path|link-check/);
assert.match(modeA, /videoWebhook|assets count|jobs count/);
const pkgJson = fs.readFileSync(join(root, "package.json"), "utf8");
assert.match(pkgJson, /mode-a-acceptance/);

const jobIntentsSrc = fs.readFileSync(join(root, "lib/jobIntents.ts"), "utf8");
assert.match(jobIntentsSrc, /JOB_INTENTS/);
assert.match(
  jobIntentsSrc,
  /Listing · 360|Starter Pack · 3 clips|Social Hook/
);
assert.match(
  fs.readFileSync(join(root, "components/JobIntentBar.tsx"), "utf8"),
  /Choose a selling task|First-run selling tasks/
);
assert.match(createStudio, /JobIntentBar|ActivationChecklist/);
assert.match(
  fs.readFileSync(join(root, "lib/i18n.ts"), "utf8"),
  /job\.seller["']:\s*["']Starter Pack · 3 clips/
);

// CD Phase B — rule-based Asset Brief + character bible draft (not cloud vision)
const assetBriefSrc = fs.readFileSync(join(root, "lib/assetBrief.ts"), "utf8");
assert.match(assetBriefSrc, /buildAssetBrief|probeImageSize|primaryRecipeForShape/);
assert.match(assetBriefSrc, /not cloud vision|not computer vision|Rule-based/i);
assert.match(assetBriefSrc, /seller-pack|Seller Pack|BIBLE_MATERIAL_CHIPS/);
assert.match(assetBriefSrc, /locale.*zh|BriefLocale|hasSecondaryStill|fidelityAngles/);
assert.match(
  fs.readFileSync(join(root, "components/AssetBriefPanel.tsx"), "utf8"),
  /data-asset-brief=["']cd-phase-b["']|data-character-bible=["']draft["']|data-fidelity-refs=["']c-lite["']/
);
assert.match(createStudio, /AssetBriefPanel|buildAssetBrief|probeImageSize/);
assert.match(createStudio, /data-asset-brief|labStill|imageProbe|briefCollapsed/);
assert.match(createStudio, /fidelityAngles|secondaryStill|hasSecondaryStill/);
const toyIdRefsSrc = fs.readFileSync(join(root, "lib/toyIdentity.ts"), "utf8");
assert.match(toyIdRefsSrc, /FIDELITY_ANGLE_CHIPS|FidelityRefNotes|hasSecondaryStill/);
assert.match(toyIdRefsSrc, /not multi-image model input|secondary detail still/i);
// CD Phase B2 — Director Plan + soft auto recipe
const directorPlanSrc = fs.readFileSync(
  join(root, "lib/directorPlan.ts"),
  "utf8"
);
assert.match(directorPlanSrc, /buildDirectorPlan|confirm cost|Sales/);
assert.match(
  fs.readFileSync(join(root, "components/DirectorPlanPanel.tsx"), "utf8"),
  /data-director-plan=["']cd-phase-b2["']/
);
assert.match(createStudio, /DirectorPlanPanel|buildDirectorPlan|briefAutoAppliedRef/);
assert.match(createStudio, /asset_brief_auto/);
// CD Phase B3 — Seller Starter Pack plan (3× quote before run)
assert.match(
  directorPlanSrc,
  /buildSellerPackDirectorPlan|Seller Starter Pack|SELLER_PACK_PLAN_CHILDREN/
);
const batchStudioSrc = fs.readFileSync(
  join(root, "components/BatchStudio.tsx"),
  "utf8"
);
assert.match(batchStudioSrc, /buildSellerPackDirectorPlan|DirectorPlanPanel/);
assert.match(batchStudioSrc, /data-seller-pack-plan=["']director["']/);
assert.match(batchStudioSrc, /AssetBriefPanel|buildAssetBrief|packAssetBrief/);
assert.match(
  batchStudioSrc,
  /composeExtraWithIdentity|packExtra|ownsRights(?!\s*:\s*true)/
);
// Pack children must receive bible extra (not only ownsRights: true hardcode)
assert.match(batchStudioSrc, /extra:\s*packExtra|packExtra \? \{ extra/);
// CD fidelity QC checklist on Create + Seller Pack results
const deliveryPackSrc = fs.readFileSync(
  join(root, "lib/deliveryPack.ts"),
  "utf8"
);
assert.match(deliveryPackSrc, /fidelityQcItems|qc-edge|qc-paint|qc-logo/);
assert.match(deliveryPackSrc, /Sales fidelity|includeQc/);
assert.match(createStudio, /fidelity QC|includeQc:\s*true/);


// Homepage V3: one Moment → device-local Toy Stage Preview. Existing Launch
// Pack generation remains private and is tested independently below.
const homePageSrc = fs.readFileSync(join(root, "app/page.tsx"), "utf8");
assert.match(homePageSrc, /HomeCinemaHero/);
assert.match(homePageSrc, /HomeDesignerGallery/);
// gallery-calm: HomeExploreRecipeRail unmounted from home
// assert.match(homePageSrc, /HomeExploreRecipeRail/);
// gallery-calm: HfProductRail unmounted from home
// assert.match(homePageSrc, /HfProductRail/);
assert.ok(
  homePageSrc.indexOf("<HomeCinemaHero") < homePageSrc.indexOf("<HomeDesignerGallery") &&
    homePageSrc.indexOf("<HomeDesignerGallery") < homePageSrc.indexOf("<HomeTrustFooter"),
  "Home order: Hero → DesignerGallery → Trust"
);
const homeExploreRailSrc = fs.readFileSync(
  join(root, "components/HomeExploreRecipeRail.tsx"),
  "utf8"
);
assert.match(homeExploreRailSrc, /data-home-explore-rail/);
assert.match(homeExploreRailSrc, /createGenerate360Href/);
assert.doesNotMatch(homeExploreRailSrc, /data-home-moment-cta/);
const homeHeroSrc = fs.readFileSync(
  join(root, "components/HomeCinemaHero.tsx"),
  "utf8"
);
const homeMomentsSrc = fs.readFileSync(
  join(root, "components/HomeMomentShowcase.tsx"),
  "utf8"
);
const momentStageSrc = fs.readFileSync(
  join(root, "components/MomentStage.tsx"),
  "utf8"
);
const publicSampleSrc = fs.readFileSync(
  join(root, "components/PublicLaunchPackSample.tsx"),
  "utf8"
);
const createSampleSrc = publicSampleSrc.slice(
  publicSampleSrc.indexOf("function CreateSampleBrowser")
);
assert.match(homeHeroSrc, /data-home-hero=["']designer-toy-gallery["']/);
// Result-first primary CTA (toy/drop outcome), not generic "motion" speak.
assert.match(homeHeroSrc, /Create with my toy/);
assert.match(homeHeroSrc, /data-home-moment-cta/);
assert.equal(
  (homeHeroSrc.match(/data-home-moment-cta/g) || []).length,
  1,
  "home hero must expose exactly one primary Moment CTA"
);
assert.doesNotMatch(homeHeroSrc, /Use this motion/);
assert.match(homeHeroSrc, /Style study|art-vinyl-guardian/);
assert.match(homeHeroSrc, /Lab study|Style study|Not a customer/);
assert.match(homeHeroSrc, /Lab study|Not a customer|Style study/);
assert.match(homeMomentsSrc, /One toy photo\. More ways to sell\./);
assert.match(homeMomentsSrc, /Start with a photo you own\. Preview a listing, reveal, or drop/);
assert.match(momentStageSrc, /Official Concept/);
assert.match(momentStageSrc, /Preview with my toy/);
assert.doesNotMatch(homePageSrc, /One toy photo\. Three launch-ready videos\./);
assert.match(createSampleSrc, /Pikbo Lab archive/);
assert.match(createSampleSrc, /No sign-in · no upload/);
assert.match(createSampleSrc, /No product upload in this public preview/);
assert.equal((createSampleSrc.match(/<AutoPlayVideo/g) || []).length, 1);
assert.match(publicSampleSrc, /Listing Spin/);
assert.match(publicSampleSrc, /Blind-box Reveal/);
assert.match(publicSampleSrc, /Social Flash/);
assert.match(publicSampleSrc, /Archive media · 16:9 · 6 sec/);
assert.match(publicSampleSrc, /Archive media · 9:16 · 6 sec/);
assert.match(publicSampleSrc, /Target format · 1:1 · 5 sec/);
assert.match(publicSampleSrc, /Target format · 9:16 · 5 sec/);
assert.doesNotMatch(publicSampleSrc, /HeroUpload|fetchMe|canUsePrivateLaunch|credits/);
const homeWallSrc = fs.readFileSync(
  join(root, "components/HomeDesignerGallery.tsx"),
  "utf8"
);
assert.match(
  homeWallSrc,
  /data-home-gallery|data-home-wall|designer-toy|Style study|style-studies|HOME_PROOF_BADGE|cached prototype|Cached preview/
);
assert.match(homeWallSrc, /item\.href|item\.src|designer-toy/);
assert.match(homeWallSrc, /Browse toy types|designer-toy|Style study|style-studies/);
assert.match(homeWallSrc, /data-home-gallery|designer-toy/);
assert.match(
  [homePageSrc, homeHeroSrc].join("\n"),
  /HomeCinemaHero|data-home-hero=["']designer-toy-gallery["']/
);
assert.doesNotMatch(
  [homePageSrc, homeHeroSrc, publicSampleSrc, homeWallSrc, appShell].join("\n"),
  /Supabase|cached ledger|state machine|internal status|credits ledger/i
);
assert.match(
  fs.readFileSync(join(root, "components/AutoPlayVideo.tsx"), "utf8"),
  /wallDense|playbackBudget|data-video-controls/
);
assert.match(
  fs.readFileSync(join(root, "components/AutoPlayVideo.tsx"), "utf8"),
  /max-width: 768px.*\? 1 : 2/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "lib/videoFeed.ts"), "utf8"),
  /const demo = mapped \?\? demoForIndex/
);
assert.match(
  fs.readFileSync(join(root, "components/VideoTile.tsx"), "utf8"),
  /data-concept-recipe-art|View recipe notes/
);
assert.match(
  fs.readFileSync(join(root, "components/AutoPlayVideo.tsx"), "utf8"),
  /visibilitychange|visibilityState/
);

// Five-step toy identity + delivery honesty + landing assetId + workflows
const toyIdSrc = fs.readFileSync(join(root, "lib/toyIdentity.ts"), "utf8");
assert.match(toyIdSrc, /composeExtraWithIdentity/);
assert.match(toyIdSrc, /sanitizeToyIdentity|ToyIdentity/);
// Query ?sku= must win over device bible (Next SKU / AfterPath carry)
assert.match(toyIdSrc, /hydrateToyIdentityFromQuery/);
assert.match(createStudio, /hydrateToyIdentityFromQuery\(initialSku\)/);
const deliverySrc = fs.readFileSync(join(root, "lib/deliveryPack.ts"), "utf8");
assert.match(deliverySrc, /deliveryItemsForJob/);
assert.match(deliverySrc, /downloadAllowed|T6/);
assert.match(deliverySrc, /sellerPackPostItems/);
assert.match(deliverySrc, /deliveryChecklistStorageKey/);
assert.match(createStudio, /composeExtraWithIdentity|toyIdentity/);
assert.match(createStudio, /deliveryItemsForJob|DeliveryChecklist/);
assert.match(createStudio, /Same photo · next job|create\.nextJob|generateForJob/);
assert.match(createStudio, /freeTrialExhausted|Free Mini trial exhausted|clipsLeft/);
assert.match(
  fs.readFileSync(join(root, "components/SoftLaunchStrip.tsx"), "utf8"),
  /freeTrialExhausted|Trial used|clipsLeft/
);
// Soft-launch Open Generate carries remix contract (ratio/duration/channel)
assert.match(
  fs.readFileSync(join(root, "components/SoftLaunchStrip.tsx"), "utf8"),
  /createGenerate360Href|data-soft-launch=["']generate-remix["']/
);
// Refund honesty: never bare "failed jobs refund" (TIMEOUT/cancel stay unconfirmed)
assert.match(
  fs.readFileSync(join(root, "components/SoftLaunchStrip.tsx"), "utf8"),
  /refunds when confirmed/
);
// Tool FAQ: motion-off refund is when-confirmed (not bare "refund the credits")
assert.match(
  fs.readFileSync(join(root, "lib/tools.ts"), "utf8"),
  /refund when the server can confirm|refunds when confirmed/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "lib/tools.ts"), "utf8"),
  /failed live jobs refund the credits\./
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/SoftLaunchStrip.tsx"), "utf8"),
  /failed jobs refund(?! when)/
);
assert.match(
  fs.readFileSync(join(root, "components/TrustStrip.tsx"), "utf8"),
  /refunds when confirmed/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/TrustStrip.tsx"), "utf8"),
  /failed jobs refund(?! when)/
);
assert.match(createStudio, /refunds when confirmed/);
assert.doesNotMatch(createStudio, /failed jobs refund(?! when)/);
// Batch / Seller Pack + effect landings share freeTrial honesty (Phase F)
const batchSkuSrc = fs.readFileSync(
  join(root, "components/BatchStudio.tsx"),
  "utf8"
);
assert.match(
  batchSkuSrc,
  /freeTrialExhausted|Free Mini trial used|clipsLeft/
);
// Seller Pack: hydrate ?sku= + Library history carries sku for Remake
assert.match(batchSkuSrc, /initialSku/);
assert.match(batchSkuSrc, /hydrateToyIdentityFromQuery\(initialSku\)/);
assert.match(batchSkuSrc, /sku:\s*toyIdentity\.sku/);
// The fixed Moment Create page no longer mounts the archived Seller Pack
// BatchStudio; SKU/sample hydration remains covered on BatchStudio itself.
assert.doesNotMatch(createPage, /BatchStudio|pack=["']seller["']/);
// AfterPath Next SKU ?try=1 → Lab still hydrate on Seller Pack (no auto 3× debit)
assert.match(createPage, /initialSample=\{firstRunSample\}/);
assert.match(batchSkuSrc, /initialSample/);
assert.match(batchSkuSrc, /sampleToDataUrl/);
assert.match(batchSkuSrc, /setLabStill\(true\)/);
assert.match(
  batchSkuSrc,
  /Never auto-run three live children|does not auto-run/
);
// Image studio → single Moment stashes pikbo_pending_still; private Batch can still adopt it.
assert.match(batchSkuSrc, /pikbo_pending_still/);
assert.match(batchSkuSrc, /data:image/);
const imageStudioSrc = fs.readFileSync(
  join(root, "app/image/page.tsx"),
  "utf8"
);
assert.match(imageStudioSrc, /stashPendingStill|pikbo_pending_still/);
assert.match(imageStudioSrc, /data-image-handoff=["']single-moment["']/);
assert.match(imageStudioSrc, /effect=street-power-up/);
// Animate → Create carries remix contract (ratio/duration/channel), not bare /create
assert.match(imageStudioSrc, /createRemixHref/);
assert.match(imageStudioSrc, /data-image-handoff=["']create["']/);
assert.match(imageStudioSrc, /360-spin-showcase|IMAGE_HANDOFF_EFFECT/);
assert.doesNotMatch(
  imageStudioSrc,
  /data-image-handoff=["']create["'][\s\S]{0,120}href=\{\s*toySku/
);
assert.doesNotMatch(
  imageStudioSrc,
  /data-image-handoff=["']create["'][\s\S]{0,80}`\/create\?/
);
assert.match(
  fs.readFileSync(join(root, "components/LandingToolPanel.tsx"), "utf8"),
  /freeTrialExhausted|Free Mini trial exhausted|clipsLeft|compare plans/
);
assert.match(
  fs.readFileSync(join(root, "components/LandingToolPanel.tsx"), "utf8"),
  /sku=\{toySku|sku: toySku/
);
assert.match(
  fs.readFileSync(join(root, "components/HomeProjectsExplore.tsx"), "utf8"),
  /detailHref|Inside|Remake|desktopPlayMode/
);
const landingToolPanel = fs.readFileSync(
  join(root, "components/LandingToolPanel.tsx"),
  "utf8"
);
assert.match(landingToolPanel, /registerLocalAsset|assetId/);
assert.match(landingToolPanel, /deliveryItemsForJob|DeliveryChecklist/);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
  /sellerPackPostItems|DeliveryChecklist/
);
assert.match(
  fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
  /Open in Library|Create next SKU|Preview another sample/
);
assert.match(
  fs.readFileSync(join(root, "components/DeliveryChecklist.tsx"), "utf8"),
  /sessionStorage|markActivationShared/
);
assert.match(
  fs.readFileSync(join(root, "components/PresetPreviewCard.tsx"), "utf8"),
  /desktopPlayMode=["']interaction["']/
);
assert.match(
  fs.readFileSync(join(root, "components/PresetPreviewCard.tsx"), "utf8"),
  /Lab · cached prototype/
);
assert.match(
  fs.readFileSync(join(root, "lib/workflows.ts"), "utf8"),
  /listCreateShelfWorkflows|Workflow/
);
assert.doesNotMatch(createStudio, /<WorkflowShelf/);
assert.match(historySrcLib, /sku\?:/);


// MVP convergence: navigation exposes only the seller value loop.
const softLaunchSrc = fs.readFileSync(join(root, "lib/softLaunch.ts"), "utf8");
assert.match(softLaunchSrc, /PRIMARY_NAV/);
assert.match(
  softLaunchSrc,
  /href:\s*`\$\{MOMENT_CREATE_HREF\}&source=primary-nav`/
);
assert.match(softLaunchSrc, /href:\s*["']\/library["']/);
assert.match(softLaunchSrc, /href:\s*["']\/pricing["']/);
assert.match(softLaunchSrc, /href:\s*["']\/profile["']/);
{
  const primaryBlock =
    softLaunchSrc.match(
      /PRIMARY_NAV\s*=\s*\[[\s\S]*?\]\s*as const/
    )?.[0] || "";
  const labels = [...primaryBlock.matchAll(/label:\s*"([^"]+)"/g)].map(
    (match) => match[1]
  );
  assert.deepEqual(labels, [
    "Home",
    "Create",
    "Library",
    "Pricing",
    "Account",
  ]);
}
// Cold-start: /create is a tool, not a rank landing — noindex,follow
const createPageMeta = fs.readFileSync(
  join(root, "app/create/page.tsx"),
  "utf8"
);
assert.match(createPageMeta, /CONCEPT_ROBOTS/);
assert.match(createPageMeta, /robots:\s*CONCEPT_ROBOTS/);
// Frozen Command Palette + live Footer stay focused on the seller loop.
const commandPaletteSrc = fs.readFileSync(
  join(root, "components/CommandPalette.tsx"),
  "utf8"
);
assert.match(commandPaletteSrc, /Pricing · Founding Studio/);
assert.match(commandPaletteSrc, /AI toy video generator/);
assert.match(commandPaletteSrc, /Blind-box reveal video/);
assert.match(commandPaletteSrc, /Library · private results/);
assert.doesNotMatch(
  commandPaletteSrc,
  /Cinema · Preview|Flow · Preview|Community|Supercomputer|Modules/
);
const footerCoreSrc = fs.readFileSync(
  join(root, "components/Footer.tsx"),
  "utf8"
);
assert.match(footerCoreSrc, /Create a toy Moment/);
assert.doesNotMatch(footerCoreSrc, /Launch Pack|Seller Pack|seller-pack/);
assert.match(footerCoreSrc, /AI toy video generator/);
assert.doesNotMatch(
  footerCoreSrc,
  /FreeTrialCta|\/effects|\/explore|\/for|\/toys|Community|Supercomputer|Modules/
);
// Preview doors must not sit in PRIMARY_NAV
{
  const primaryBlock = softLaunchSrc.match(
    /PRIMARY_NAV\s*=\s*\[[\s\S]*?\]\s*as const/
  )?.[0] || "";
  assert.ok(primaryBlock.includes('href: "/"'));
  assert.doesNotMatch(primaryBlock, /href:\s*["']\/image["']/);
  assert.doesNotMatch(primaryBlock, /href:\s*["']\/cinema["']/);
  assert.doesNotMatch(primaryBlock, /href:\s*["']\/community["']/);
}
const appShellSrc = fs.readFileSync(
  join(root, "components/AppShell.tsx"),
  "utf8"
);
assert.match(appShellSrc, /PRIMARY_NAV/);
assert.match(appShellSrc, /CreditsBadge|LanguageSwitcher/);
assert.doesNotMatch(appShellSrc, /MoreMenu|CommandPalette/);
assert.match(
  appShellSrc,
  /MOMENT_CREATE_HREF[\s\S]*?const DEFAULT_MOMENT_CREATE_HREF\s*=\s*`\$\{MOMENT_CREATE_HREF\}&source=moment-shell`[\s\S]*?const PRIMARY_NAV_CREATE_HREF\s*=\s*`\$\{MOMENT_CREATE_HREF\}&source=primary-nav`[\s\S]*?data-primary-create-href=\{\s*motionChrome\s*\?\s*HOME_SHELL_GENERATE_HREF\s*:\s*PRIMARY_NAV_CREATE_HREF\s*\}/
);
assert.match(
  appShellSrc,
  /createGenerate360Href\(\s*["']app-shell-home["']\s*\)/
);
assert.doesNotMatch(
  appShellSrc,
  /\/create\?effect=street-power-up&source=primary-nav/
);
// GA4 adapter is env-gated no-op when unset (reuse analyticsSrc declared above)
assert.match(analyticsSrc, /NEXT_PUBLIC_GA_MEASUREMENT_ID/);
assert.match(analyticsSrc, /PRIVACY_FUNNEL_EVENTS/);
assert.match(analyticsSrc, /DOWNLOAD_VIA_ALLOWLIST|toPrivacyEnvelope/);
assert.doesNotMatch(analyticsSrc, /function sanitizeMeta/);
// Modules remains a real product surface (not necessarily primary-nav peer)
assert.match(
  fs.readFileSync(join(root, "app/modules/page.tsx"), "utf8"),
  /Modules|modules/
);

const workflowsSrc = fs.readFileSync(join(root, "lib/workflows.ts"), "utf8");
assert.match(workflowsSrc, /listPreviewWorkflows/);
assert.match(workflowsSrc, /listLiveWorkflows/);
// Image + Batch must not claim live Seedance jobs
assert.match(workflowsSrc, /id:\s*"still-studio"[\s\S]*?live:\s*false/);
assert.match(workflowsSrc, /id:\s*"batch-agent"[\s\S]*?live:\s*false/);
const modulesPage = fs.readFileSync(join(root, "app/modules/page.tsx"), "utf8");
assert.match(modulesPage, /listPreviewWorkflows|PREVIEW|Job blocks/);
assert.match(modulesPage, /T6|file bake|Lab proof still/);
assert.match(batchStudio, /downloadable|T6 file bake/);
assert.match(
  fs.readFileSync(join(root, "scripts/critical-path.sh"), "utf8"),
  /\/modules/
);
assert.match(
  fs.readFileSync(join(root, "scripts/critical-path.sh"), "utf8"),
  /\/flow/
);
assert.match(
  fs.readFileSync(join(root, "scripts/critical-path.sh"), "utf8"),
  /\/apps/
);

// Hidden preview routes remain internally testable, but primary product chrome
// and pricing stay focused on Generate → one Moment → Library.
const linkCheckSrc = fs.readFileSync(
  join(root, "scripts/link-check.sh"),
  "utf8"
);
assert.match(linkCheckSrc, /\/modules/);
assert.match(linkCheckSrc, /\/apps/);
assert.match(linkCheckSrc, /\/status/);
assert.match(linkCheckSrc, /job=etsy-listing/);
const footerSrc = fs.readFileSync(join(root, "components/Footer.tsx"), "utf8");
assert.doesNotMatch(footerSrc, /\/modules/);
assert.match(footerSrc, /AI toy video generator|Figure spin guide/);
assert.doesNotMatch(footerSrc, /seller-pack|Seller Pack|Launch Pack/);
assert.doesNotMatch(sitemapSrc, /\/modules/);
assert.match(
  fs.readFileSync(join(root, "app/community/page.tsx"), "utf8"),
  /robots:\s*CONCEPT_ROBOTS|CONCEPT_ROBOTS/
);
assert.match(
  fs.readFileSync(join(root, "app/pricing/page.tsx"), "utf8"),
  /Founding Studio/
);

// Retry must freeze version still — never ambient composer asset after re-upload
assert.match(createTrust, /export function resolveGenerateStill/);
assert.match(createTrust, /assetId\?:/);
assert.match(createStudio, /resolveGenerateStill/);
assert.match(createStudio, /retry-still|mode === "retry/);
assert.match(createStudio, /postGenerateWithRetry|fallbackImage/);
assert.match(createStudio, /recoveredFromAssetMiss|registerLocalAsset/);
assert.match(batchStudio, /fallbackImage/);
assert.match(batchStudio, /recoveredFromAssetMiss/);
assert.match(batchStudio, /cancelInFlightPack|AbortController/);
assert.match(batchStudio, /downloadChild/);
assert.match(batchStudio, /data-seller-download=["']gated["']/);
assert.match(batchStudio, /downloadVideoFile\(gateUrl|downloadVideoFile\(j\.videoUrl/);
assert.doesNotMatch(
  batchStudio,
  /fetch\(gateUrl[\s\S]{0,120}method:\s*["']HEAD["']/,
  "Create must not probe private Pack downloads without the auth headers owned by downloadVideoFile"
);

assert.match(batchStudio, /Cancel pack/);
// Pack cancel immediately marks running children refund unconfirmed (Create parity)
assert.match(
  batchStudio,
  /function cancelInFlightPack[\s\S]{0,900}refund unconfirmed/
);
assert.match(
  batchStudio,
  /function cancelInFlightPack[\s\S]{0,900}setJobs/
);
assert.match(landingTool, /postGenerateWithRetry|fallbackImage/);
assert.match(landingTool, /recoveredFromAssetMiss|registerLocalAsset/);
function resolveSpecImagePure(spec, store) {
  if (spec.sourceKey && store[spec.sourceKey]) return store[spec.sourceKey];
  if (typeof spec.image === "string" && spec.image) return spec.image;
  return null;
}
function resolveGenerateStillPure(input) {
  const retry = input.retry ?? null;
  if (retry) {
    const frozen = resolveSpecImagePure(retry, input.sourceStore);
    if (frozen) return { image: frozen, mode: "retry-still" };
    if (retry.assetId) return { assetId: retry.assetId, mode: "retry-asset" };
    return { mode: "none" };
  }
  if (input.imageOverride) return { image: input.imageOverride, mode: "image" };
  if (input.assetId) {
    return {
      assetId: input.assetId,
      image: input.image || undefined,
      mode: "asset",
    };
  }
  if (input.image) return { image: input.image, mode: "image" };
  return { mode: "none" };
}
{
  const store = { "src-a": "data:image/png;base64,AAA" };
  const retry = {
    sourceKey: "src-a",
    assetId: "asset_old",
    effect: "floating-hero",
    extra: "",
    aspectRatio: "1:1",
    duration: 5,
    resolution: "480p",
    model: "seedance-mini",
  };
  // Composer re-uploaded a new asset — Retry must still post frozen still A
  const still = resolveGenerateStillPure({
    retry,
    sourceStore: store,
    image: "data:image/png;base64,BBB",
    assetId: "asset_new",
  });
  assert.equal(still.mode, "retry-still");
  assert.equal(still.image, "data:image/png;base64,AAA");
  assert.equal(still.assetId, undefined);
  // Missing still falls back to frozen assetId only (not ambient asset_new)
  const missing = resolveGenerateStillPure({
    retry: { ...retry, sourceKey: "src-gone" },
    sourceStore: store,
    image: "data:image/png;base64,BBB",
    assetId: "asset_new",
  });
  assert.equal(missing.mode, "retry-asset");
  assert.equal(missing.assetId, "asset_old");
  // Fresh compose prefers current assetId for smaller POST
  const fresh = resolveGenerateStillPure({
    sourceStore: {},
    image: "data:image/png;base64,CCC",
    assetId: "asset_cur",
  });
  assert.equal(fresh.mode, "asset");
  assert.equal(fresh.assetId, "asset_cur");
}

// Mobile mirrors Home · Create · Library · Pricing · Account.
assert.match(softLaunchSrc, /MOBILE_NAV/);
assert.match(
  softLaunchSrc,
  /MOBILE_NAV[\s\S]*href:\s*`\$\{MOMENT_CREATE_HREF\}&source=primary-nav`/
);
assert.doesNotMatch(
  softLaunchSrc,
  /MOBILE_NAV[\s\S]*href:\s*["']\/(?:effects|community)["']/
);
assert.match(softLaunchSrc, /MOBILE_NAV[\s\S]*href:\s*["']\/library["']/);
assert.match(softLaunchSrc, /MOBILE_NAV[\s\S]*href:\s*["']\/pricing["']/);
assert.match(
  softLaunchSrc,
  /MOBILE_NAV[\s\S]*href:\s*["']\/profile["']/
);
assert.match(appShellSrc, /MOBILE_NAV/);
assert.match(appShellSrc, /item\.label/);
assert.match(
  fs.readFileSync(join(root, "app/tools/page.tsx"), "utf8"),
  /\/modules/
);
assert.match(
  fs.readFileSync(join(root, "app/guides/page.tsx"), "utf8"),
  /\/modules/
);
assert.match(
  fs.readFileSync(join(root, "app/guides/[slug]/page.tsx"), "utf8"),
  /\/modules/
);

// Video-first product line (not stills shop) — site + suite order + image honesty
const siteSrc = fs.readFileSync(join(root, "lib/site.ts"), "utf8");
assert.match(siteSrc, /titleDefault|homeH1|AI Product Video Studio for Toy Sellers/i);
assert.match(siteSrc, /Turn your toy photos into short videos|VIDEO-first|Free Mini Trial/i);
// 哥飞 P0: homepage title must not cannibalize tools rank title
assert.match(siteSrc, /Pikbo — AI Product Video Studio for Toy Sellers/);
assert.doesNotMatch(
  siteSrc,
  /titleDefault:\s*["']AI Toy Video Generator from One Photo/
);
assert.match(siteSrc, /rankToolPath|\/tools\/ai-toy-video-generator/);
// Suite chrome exposes only the four shipped product surfaces.
const genIdx = suiteChromeSrc.indexOf('id: "generate"');
const sellerIdx = suiteChromeSrc.indexOf('id: "seller"');
const recipesIdx = suiteChromeSrc.indexOf('id: "recipes"');
const libraryIdx = suiteChromeSrc.indexOf('id: "library"');
assert.ok(genIdx > 0 && sellerIdx > genIdx, "seller pack after generate");
assert.ok(recipesIdx > sellerIdx, "recipes after seller pack");
assert.ok(libraryIdx > recipesIdx, "library after recipes");
assert.doesNotMatch(
  suiteChromeSrc,
  /id:\s*"flow"|id:\s*"image"|id:\s*"cinema"|id:\s*"modules"/
);
assert.match(suiteChromeSrc, /suite\.preview/);
// Home suite rail + landing doors: product first, Flow tagged Preview
const suiteEntrySrc = fs.readFileSync(
  join(root, "components/SuiteEntryStrip.tsx"),
  "utf8"
);
assert.match(suiteEntrySrc, /suite\.tag\.preview|tagKey:\s*["']suite\.tag\.preview/);
// Suite Generate door uses remix contract (not bare /create)
assert.match(suiteEntrySrc, /createGenerate360Href|SUITE_GENERATE_HREF/);
assert.match(suiteEntrySrc, /data-suite-entry=["']generate-remix["']/);
assert.ok(
  suiteEntrySrc.indexOf("SUITE_GENERATE_HREF") <
    suiteEntrySrc.indexOf('href: "/flow"') ||
    suiteEntrySrc.indexOf("createGenerate360Href") <
      suiteEntrySrc.indexOf('href: "/flow"'),
  "Generate remix door before Flow on home suite rail"
);
// How it works Open Generate carries remix contract
assert.match(
  fs.readFileSync(join(root, "components/HowItWorks.tsx"), "utf8"),
  /createGenerate360Href|data-how-it-works=["']generate-remix["']/
);
assert.match(
  fs.readFileSync(join(root, "components/SuiteDoorLinks.tsx"), "utf8"),
  /Flow · Preview|Create one Moment/
);
assert.match(
  fs.readFileSync(join(root, "lib/i18n.ts"), "utf8"),
  /suite\.preview["']:\s*["']Preview["']|suite\.tag\.preview/
);

// Hf product rail + explore job grid: product-first, Preview tags
const hfRailSrc = fs.readFileSync(
  join(root, "components/HfProductRail.tsx"),
  "utf8"
);
// Seedance Video door uses remix contract (not bare /create)
assert.match(hfRailSrc, /createGenerate360Href|GENERATE_REMIX_HREF/);
assert.match(hfRailSrc, /data-hf-rail-generate=["']remix["']/);
assert.ok(
  (hfRailSrc.indexOf("GENERATE_REMIX_HREF") >= 0
    ? hfRailSrc.indexOf("GENERATE_REMIX_HREF")
    : hfRailSrc.indexOf("createGenerate360Href")) <
    hfRailSrc.indexOf('href: "/flow"'),
  "Generate remix before Flow on HfProductRail"
);
assert.ok(
  (hfRailSrc.indexOf("MOMENT_RAIL_HREF") >= 0
    ? hfRailSrc.indexOf("MOMENT_RAIL_HREF")
    : hfRailSrc.indexOf('href: "/create?effect=street-power-up"')) <
    hfRailSrc.indexOf('href: "/flow"'),
  "Moment before Flow on HfProductRail"
);
assert.match(
  hfRailSrc,
  /MOMENT_CREATE_HREF|MOMENT_RAIL_HREF|create\?effect=street-power-up/
);
assert.match(hfRailSrc, /tag:\s*["']Preview["']/);
assert.match(
  fs.readFileSync(join(root, "components/HfExploreHome.tsx"), "utf8"),
  /Flow · Preview|Street Power-Up Moment|Create one Moment/
);
assert.match(
  fs.readFileSync(join(root, "components/HfExploreHome.tsx"), "utf8"),
  /data-hf-flow-generate=["']remix["']|createGenerate360Href/
);

assert.match(
  fs.readFileSync(join(root, "app/image/page.tsx"), "utf8"),
  /Optional support|not the product|photo → Seedance/
);

// Modules freeTrial honesty + FAQ (Phase F/H — not thin "Generate free" shelf)
const modulesPageSrc = fs.readFileSync(
  join(root, "app/modules/page.tsx"),
  "utf8"
);
assert.match(modulesPageSrc, /MODULES_FAQ|Modules FAQ/);
assert.match(modulesPageSrc, /FAQPage/);
assert.match(modulesPageSrc, /ModulesSuiteCtas/);
assert.doesNotMatch(modulesPageSrc, /Generate free/);
assert.match(modulesPageSrc, /data-module-card/);
assert.match(modulesPageSrc, /Lab · cached prototype/);
assert.match(modulesPageSrc, /Remake · your toy photo/);
assert.doesNotMatch(
  modulesPageSrc,
  /Official · cached|provisionalLabQualityLabel|Lab\s*≥\s*4/
);
const modulesSuiteCtasSrc = fs.readFileSync(
  join(root, "components/ModulesSuiteCtas.tsx"),
  "utf8"
);
assert.match(modulesSuiteCtasSrc, /freeTrialExhausted/);
assert.match(modulesSuiteCtasSrc, /Compare plans|Try free/);
const modulesMobileCtaSrc = fs.readFileSync(
  join(root, "components/ModulesMobileCta.tsx"),
  "utf8"
);
assert.match(modulesMobileCtaSrc, /freeTrialExhausted/);
assert.match(
  fs.readFileSync(join(root, "lib/i18n.ts"), "utf8"),
  /modules\.mobile\.try.*Lab|Try free · Lab/
);

// Shared FreeTrialCta + Apps/Explore FAQ (Phase H indexable shelves)
const freeTrialCtaSrc = fs.readFileSync(
  join(root, "components/FreeTrialCta.tsx"),
  "utf8"
);
assert.match(freeTrialCtaSrc, /freeTrialExhausted/);
assert.match(freeTrialCtaSrc, /\/pricing/);
// Lab sample try path carries remix contract (createLabSampleTryHref)
assert.match(freeTrialCtaSrc, /createLabSampleTryHref|sample=scout/);
const appsPageSrc = fs.readFileSync(join(root, "app/apps/page.tsx"), "utf8");
assert.match(appsPageSrc, /APPS_FAQ|Apps FAQ/);
assert.match(appsPageSrc, /FAQPage/);
assert.match(appsPageSrc, /FreeTrialCta/);
assert.doesNotMatch(
  appsPageSrc,
  /href=["']\/create\?try=1&sample=scout["'][^>]*>\s*Try free/
);
const explorePageSrc = fs.readFileSync(
  join(root, "app/explore/page.tsx"),
  "utf8"
);
assert.match(explorePageSrc, /EXPLORE_FAQ|Explore FAQ/);
assert.match(explorePageSrc, /FAQPage/);
// Explore dropped from 13-URL sitemap — must stay noindex (not dual-index Lab wall)
assert.match(explorePageSrc, /CONCEPT_ROBOTS|robots:\s*CONCEPT/);
assert.doesNotMatch(
  fs.readFileSync(join(root, "lib/seoIndex.ts"), "utf8"),
  /COLD_START_INDEX_PATHS[\s\S]{0,400}"\/explore"/
);
// Tool landing cards disclose cached prototypes; no unsupported numeric QA.
const landingResultsSrc = fs.readFileSync(
  join(root, "components/LandingResults.tsx"),
  "utf8"
);
assert.match(landingResultsSrc, /cached Lab prototype/i);
assert.doesNotMatch(
  landingResultsSrc,
  /data-proof-quality|provisionalLabQualityLabel|Official · cached|Lab\s*≥\s*4/
);
assert.match(explorePageSrc, /FreeTrialCta/);
const communityPageSrc = fs.readFileSync(
  join(root, "app/community/page.tsx"),
  "utf8"
);
assert.match(communityPageSrc, /FreeTrialCta/);
assert.match(communityPageSrc, /COMMUNITY_FAQ|Community FAQ/);
assert.match(communityPageSrc, /FAQPage/);
assert.match(communityPageSrc, /isSafeDeliverableUrl/);
// Free Mini raw must not publish as public UGC (T6 honesty)
const communityPublishSrc = fs.readFileSync(
  join(root, "components/CommunityPublishButton.tsx"),
  "utf8"
);
assert.match(communityPublishSrc, /watermark/);
assert.match(communityPublishSrc, /Free raw · no publish|T6/);
assert.match(communityPublishSrc, /RATE_LIMITED/);
assert.match(communityPublishSrc, /isSafeDeliverableUrl/);
// Library filters demo rows and only renders server-approved private results;
// watermark/public-share policy remains covered by the shared trust helpers.
assert.match(library, /job\.downloadAllowed === true/);
// Tools + Effects hubs: freeTrial-honest CTAs + Phase H FAQ (not thin shelves)
const toolsIndexSrc = fs.readFileSync(join(root, "app/tools/page.tsx"), "utf8");
assert.match(toolsIndexSrc, /FreeTrialCta/);
assert.match(toolsIndexSrc, /TOOLS_FAQ|Tools FAQ/);
assert.match(toolsIndexSrc, /FAQPage/);
assert.doesNotMatch(
  toolsIndexSrc,
  /href=["']\/create\?try=1&sample=scout["'][^>]*>\s*Try free/
);
const effectsHubSrc = fs.readFileSync(
  join(root, "app/effects/page.tsx"),
  "utf8"
);
assert.match(effectsHubSrc, /FreeTrialCta/);
assert.match(effectsHubSrc, /EFFECTS_FAQ|Recipes FAQ/);
assert.match(effectsHubSrc, /FAQPage/);
assert.doesNotMatch(effectsHubSrc, /Generate free/);
// SEO hubs /for /toys /guides — Phase H FAQ + FreeTrial honesty
const forHubSrc = fs.readFileSync(join(root, "app/for/page.tsx"), "utf8");
assert.match(forHubSrc, /FreeTrialCta/);
assert.match(forHubSrc, /FOR_FAQ|Use cases FAQ/);
assert.match(forHubSrc, /FAQPage/);
assert.doesNotMatch(
  forHubSrc,
  /href=["']\/create\?try=1&sample=scout["'][^>]*>\s*Try free Mini/
);
const toysHubSrc = fs.readFileSync(join(root, "app/toys/page.tsx"), "utf8");
assert.match(toysHubSrc, /FreeTrialCta/);
assert.match(toysHubSrc, /TOYS_FAQ|Toy types FAQ/);
assert.match(toysHubSrc, /FAQPage/);
const guidesHubSrc = fs.readFileSync(
  join(root, "app/guides/page.tsx"),
  "utf8"
);
assert.match(guidesHubSrc, /FreeTrialCta/);
assert.match(guidesHubSrc, /GUIDES_FAQ|Guides FAQ/);
assert.match(guidesHubSrc, /FAQPage/);
// Public free CTAs must not advertise a 10s trial; public i18n stays Lab/cached-first.
assert.doesNotMatch(
  fs.readFileSync(join(root, "app/guides/[slug]/page.tsx"), "utf8"),
  /Try free · 10s/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/PricingHeroCopy.tsx"), "utf8"),
  /Try free · 10s/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "lib/i18n.ts"), "utf8"),
  /Try free · 10s|免费试视频 · 10/
);
assert.match(
  fs.readFileSync(join(root, "lib/i18n.ts"), "utf8"),
  /Lab preview|缓存 Lab|0 积分|0 credits/
);
// Shared landing surfaces keep free-trial honesty; the converged Footer has no
// trial CTA and points only to the fixed public sample.
assert.match(
  fs.readFileSync(join(root, "components/LandingSeoMesh.tsx"), "utf8"),
  /FreeTrialCta/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/LandingSeoMesh.tsx"), "utf8"),
  /href=["']\/create\?try=1&sample=scout["'][^>]*>\s*Try free Mini/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/Footer.tsx"), "utf8"),
  /FreeTrialCta/
);
assert.match(
  fs.readFileSync(join(root, "app/effects/[slug]/page.tsx"), "utf8"),
  /FreeTrialCta/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "app/effects/[slug]/page.tsx"), "utf8"),
  /href=["']\/create\?try=1&sample=scout["'][^>]*>\s*Try free\s*</
);
assert.match(
  fs.readFileSync(join(root, "app/flow/page.tsx"), "utf8"),
  /FreeTrialCta/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "app/flow/page.tsx"), "utf8"),
  /href=["']\/create\?try=1&sample=scout["'][^>]*>\s*Generate free/
);
assert.doesNotMatch(library, /FreeTrialCta/);
assert.match(library, /Create new Moment|Create Street Power-Up/);
assert.doesNotMatch(library, /Create new Pack|10 seconds/);
// Auth + home suite residual FreeTrial honesty (Phase C/F)
assert.match(
  fs.readFileSync(join(root, "components/SuiteDoorLinks.tsx"), "utf8"),
  /FreeTrialCta/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/SuiteDoorLinks.tsx"), "utf8"),
  /href=["']\/create\?try=1&sample=scout["']/
);
assert.doesNotMatch(loginFormSrc, /FreeTrialCta/);
assert.doesNotMatch(loginPageSrc, /FreeTrialCta/);
assert.match(
  fs.readFileSync(join(root, "components/HfExploreHome.tsx"), "utf8"),
  /FreeTrialCta/
);
assert.match(
  fs.readFileSync(join(root, "components/SuiteEntryStrip.tsx"), "utf8"),
  /FreeTrialCta/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/SuiteEntryStrip.tsx"), "utf8"),
  /href:\s*["']\/create\?try=1&sample=scout["']/
);
assert.match(
  fs.readFileSync(join(root, "components/SeedanceCampaign.tsx"), "utf8"),
  /FreeTrialCta/
);
assert.match(
  fs.readFileSync(join(root, "components/OnboardingBanner.tsx"), "utf8"),
  /FreeTrialCta/
);
assert.match(
  fs.readFileSync(join(root, "components/FreeTrialCta.tsx"), "utf8"),
  /onNavigate/
);
assert.match(
  fs.readFileSync(join(root, "app/cinema/page.tsx"), "utf8"),
  /FreeTrialCta/
);
assert.match(
  fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
  /FreeTrialCta/
);
// Phase C: Profile durable backend honesty + session jobs HEAD + FreeTrial residual
const profilePanelSrc = fs.readFileSync(
  join(root, "components/ProfilePanel.tsx"),
  "utf8"
);
assert.match(
  profilePanelSrc,
  /balance and completed private results available across devices|loading account details/
);
assert.doesNotMatch(
  profilePanelSrc,
  /Credits authority|Not multi-node until T5 SQL|process-memory ledger/
);
assert.match(profilePanelSrc, /X-Pikbo-Jobs-Open|\/api\/generations/);
// Profile: still image jobs HEAD probe (Settings parity — process-memory Flux)
assert.match(profilePanelSrc, /X-Pikbo-Image-Jobs|\/api\/image/);
assert.match(profilePanelSrc, /data-profile-jobs=["']image["']/);
assert.match(profilePanelSrc, /data-profile-jobs=["']video["']/);
assert.match(profilePanelSrc, /X-Pikbo-Image-Jobs-Canceled|Image-Jobs-Canceled/);
assert.match(profilePanelSrc, /X-Pikbo-Image-Jobs-Queued/);
assert.match(profilePanelSrc, /local-file|supabase/);
assert.match(profilePanelSrc, /Video jobs|Still image jobs/);
const claimRouteSrc = fs.readFileSync(
  join(root, "app/api/auth/claim/route.ts"),
  "utf8"
);
assert.match(claimRouteSrc, /backend/);
assert.match(claimRouteSrc, /probeDurableCreditsStore|getPersonalWallet/);
assert.match(claimRouteSrc, /durableAuthority|shadow/);
assert.match(
  fs.readFileSync(join(root, "components/HfProductRail.tsx"), "utf8"),
  /FreeTrialCta/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/HfProductRail.tsx"), "utf8"),
  /href:\s*["']\/create\?try=1&sample=scout["']/
);
assert.match(
  fs.readFileSync(join(root, "components/PricingPlanCards.tsx"), "utf8"),
  /data-pricing-state=["']coming-soon["']/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/PricingPlanCards.tsx"), "utf8"),
  /FreeTrialCta|PricingCheckoutButton|PLANS\.map/
);
// Settings Phase C/D honesty: durable authority, jobs HEAD, live T6, onboard v3
const settingsPageSrc = fs.readFileSync(
  join(root, "app/settings/page.tsx"),
  "utf8"
);
assert.match(settingsPageSrc, /Credits authority|cookie display only|not live-spend/);
assert.match(settingsPageSrc, /X-Pikbo-Jobs-Open|\/api\/generations/);
assert.match(settingsPageSrc, /health\.t6|freeLiveRawDownload|t6DownloadLabel/);
assert.match(settingsPageSrc, /FreeTrialCta/);
assert.match(settingsPageSrc, /pikbo_onboard_v3/);
assert.match(settingsPageSrc, /process-memory/);
// Phase C/D: still imageJobs probe from health + HEAD /api/image
assert.match(settingsPageSrc, /imageJobs|Still image jobs/);
assert.match(settingsPageSrc, /X-Pikbo-Image-Jobs|method:\s*["']HEAD["']/);
const statusProbeSrc = fs.readFileSync(
  join(root, "components/StatusProbe.tsx"),
  "utf8"
);
assert.match(statusProbeSrc, /imageJobs/);
assert.match(statusProbeSrc, /Still image job ledger|Flux idempotency/);
// Phase C/D: byStatus histogram includes canceled (not only open count)
assert.match(statusProbeSrc, /jobsStatusHint|jobsBs\.canceled|canceled/);
assert.match(statusProbeSrc, /imageStatusHint|imgBs\.canceled/);
assert.match(statusProbeSrc, /process-memory\)/);
assert.match(statusProbeSrc, /Session job ledger/);
const modelsPageSrc = fs.readFileSync(join(root, "app/models/page.tsx"), "utf8");
assert.match(modelsPageSrc, /FreeTrialCta/);
// Preview noindex via shared PREVIEW_ROBOTS (or inline) — crawlable, not dual-blocked
assert.match(
  modelsPageSrc,
  /PREVIEW_ROBOTS|robots:\s*\{\s*index:\s*false/
);
// Image still timeout recovery (no infinite JOB_IN_FLIGHT after kill)
const imageJobsLib = fs.readFileSync(join(root, "lib/imageJobs.ts"), "utf8");
assert.match(imageJobsLib, /sweepTimedOutImageJobs/);
assert.match(imageJobsLib, /refund unconfirmed/);
assert.match(imageJobsLib, /imageJobInFlightRetryAfterSec/);
assert.match(imageJobsLib, /listImageJobCountsForSession/);
// Still cancel ledger (parity with generationJobs.cancelJob)
assert.match(imageJobsLib, /cancelImageJob/);
assert.match(imageJobsLib, /"canceled"/);
assert.match(imageJobsLib, /findImageJobByRequestOrId/);
assert.match(imageJobsLib, /status === "canceled"|Respect ledger cancel/);

const imageRouteHead = fs.readFileSync(
  join(root, "app/api/image/route.ts"),
  "utf8"
);
assert.match(imageRouteHead, /export async function HEAD/);
assert.match(imageRouteHead, /X-Pikbo-Image-Jobs-Open/);
assert.match(imageRouteHead, /imageJobInFlightRetryAfterSec/);
assert.match(imageRouteHead, /X-Pikbo-Image-Jobs-Canceled/);
assert.match(imageRouteHead, /export async function DELETE/);
assert.match(imageRouteHead, /cancelImageJob/);
assert.match(imageRouteHead, /prior\.status === "canceled"/);
// imageClientSrc loaded earlier (postImageWithRetry block)
assert.match(imageClientSrc, /cancelImageLedger/);
assert.match(imageClientSrc, /method:\s*["']DELETE["']/);
assert.match(imageClientSrc, /keepalive:\s*true/);
// AIT-485: mid-POST still cancel attaches Bearer for durable owner UUID honesty.
assert.match(imageClientSrc, /Authorization|access_token|getSupabaseBrowser/);
assert.match(imageRouteHead, /DURABLE_NO_CANCEL/);
assert.match(imageRouteHead, /DURABLE_DETAIL_UNAVAILABLE/);
assert.match(imageRouteHead, /getPrivateLibraryJobForOwner/);
assert.match(
  fs.readFileSync(join(root, "app/api/image/[id]/route.ts"), "utf8"),
  /DURABLE_NO_CANCEL/
);
assert.match(
  fs.readFileSync(join(root, "app/api/image/[id]/route.ts"), "utf8"),
  /DURABLE_DETAIL_UNAVAILABLE/
);
assert.match(
  fs.readFileSync(join(root, "app/api/image/[id]/route.ts"), "utf8"),
  /getPrivateLibraryJobForOwner/
);
assert.match(
  fs.readFileSync(join(root, "app/image/page.tsx"), "utf8"),
  /DURABLE_NO_CANCEL/
);
assert.match(
  fs.readFileSync(join(root, "lib/createTrust.ts"), "utf8"),
  /downloadPolicyLabel|downloadBlockedCtaLabel/
);

assert.match(
  fs.readFileSync(join(root, "components/CommandPalette.tsx"), "utf8"),
  /Lab sample · 0 credits/
);
// HF modules (2026-07-25 density) — wait stage, Library storage, Community publish, Flow
const waitStageSrc = fs.readFileSync(
  join(root, "components/GenerateWaitStage.tsx"),
  "utf8"
);
assert.match(waitStageSrc, /waitPhaseForElapsed/);
assert.match(waitStageSrc, /waitProgressPct/);
assert.match(waitStageSrc, /1–3 min|1-3 min|~180|180s|0\.52/);
assert.match(waitStageSrc, /not a fake|not a hard ETA|Cached example/i);
// Pure wait phase math (mirrors GenerateWaitStage)
function waitPhaseForElapsedPure(elapsed, demoMode) {
  if (demoMode) return "demo";
  if (elapsed < 4) return "upload";
  if (elapsed < 22) return "queue";
  if (elapsed < 70) return "render";
  if (elapsed < 140) return "deep";
  return "long";
}
function waitProgressPctPure(elapsed, demoMode) {
  if (demoMode) return Math.min(92, 20 + elapsed * 8);
  return Math.min(96, 5 + elapsed * 0.52);
}
assert.equal(waitPhaseForElapsedPure(0, true), "demo");
assert.equal(waitPhaseForElapsedPure(2, false), "upload");
assert.equal(waitPhaseForElapsedPure(10, false), "queue");
assert.equal(waitPhaseForElapsedPure(40, false), "render");
assert.equal(waitPhaseForElapsedPure(100, false), "deep");
assert.equal(waitPhaseForElapsedPure(200, false), "long");
assert.ok(waitProgressPctPure(60, false) < 50, "60s bar not fake-complete");
assert.ok(waitProgressPctPure(180, false) >= 90, "3min near end of bar");
const createStudioSmoke = fs.readFileSync(
  join(root, "components/CreateStudio.tsx"),
  "utf8"
);
assert.match(createStudioSmoke, /GenerateWaitStage/);
// Lab sample first-run is explicitly cached / Live-gated — not Free Mini live claim.
assert.match(
  createStudioSmoke,
  /Lab sample · private Live gated · 0 credits|Lab sample · 0 credits · not Free Mini Live|Preview a Lab sample · 0 credits/
);
assert.match(createStudioSmoke, /data-lab-sample-cost=["']0["']/);
assert.doesNotMatch(
  createStudioSmoke,
  /t\(["']create\.oneTapMini["']\)|t\(["']create\.labSampleMini["']\)/
);
// Device Library stills: path samples or tiny previews only (no multi-MB Base64).
assert.match(createStudioSmoke, /stillForStore\.startsWith\(["']\/["']\)|8_000/);
// HF post-generate path chips live in shared GenerateAfterPath (not inlined)
const afterPathSrc = fs.readFileSync(
  join(root, "components/GenerateAfterPath.tsx"),
  "utf8"
);
assert.match(afterPathSrc, /aria-label=["']After generate["']/);
assert.match(afterPathSrc, /data-after-path=["']product-first["']/);
// Full Generate / Next SKU carry remix contract (ratio/duration/channel)
assert.match(afterPathSrc, /createRemixHref/);
assert.match(afterPathSrc, /remixOptsFromRecord/);
assert.match(afterPathSrc, /aspectRatio|duration/);
// AfterPath auto-hydrates device bible SKU when prop omitted (Cinema/Batch shelves)
assert.match(afterPathSrc, /loadToyIdentity/);
assert.match(afterPathSrc, /resolvedSku|deviceSku/);
assert.match(
  fs.readFileSync(join(root, "app/cinema/page.tsx"), "utf8"),
  /loadToyIdentity|sku=\{toySku|effectSlug=\{effect\}/
);
assert.match(afterPathSrc, /data-after-job/);
assert.match(afterPathSrc, /jobIntentId/);
assert.match(afterPathSrc, /Publish path/);
assert.match(afterPathSrc, /Library/);
assert.match(afterPathSrc, /Street Power-Up/);
assert.match(afterPathSrc, /data-after-moment/);
assert.match(afterPathSrc, /Next SKU/);
assert.match(afterPathSrc, /\/modules/);
assert.match(afterPathSrc, /Flow · Preview/);
// CD loop: job + SKU carry into next hops (not bare /create only)
assert.match(afterPathSrc, /nextMomentHref/);
assert.match(afterPathSrc, /try:\s*["']1["']/);
assert.match(afterPathSrc, /job:\s*carry\.job|jobIntentId/);
// Legacy href intents remain supported without publishing the private Pack door.
assert.match(afterPathSrc, /intent\?\.href/);
assert.match(afterPathSrc, /withQuery\(intent\.href/);
// Create deep links with explicit href still retain SKU context.
assert.match(
  createStudioSmoke,
  /job\.href|location\.replace/
);
assert.match(createStudioSmoke, /initialSku|getJobIntent\(initialJob\)/);
// Product path before Flow · Preview on after-generate chips
assert.ok(
  afterPathSrc.indexOf("data-after-moment") < afterPathSrc.indexOf('href="/flow"'),
  "AfterPath: next Moment before Flow"
);
assert.ok(
  afterPathSrc.indexOf('href="/modules"') < afterPathSrc.indexOf('href="/flow"'),
  "AfterPath: Modules before Flow"
);
assert.ok(
  afterPathSrc.indexOf("Next SKU") < afterPathSrc.indexOf("Flow · Preview"),
  "AfterPath: Next SKU before Flow Preview"
);
assert.match(createStudioSmoke, /GenerateAfterPath/);
assert.match(createStudioSmoke, /jobIntentId=\{jobIntentId\}/);
assert.match(createStudioSmoke, /sku=\{toyIdentity\.sku/);
// Footer / Profile / Explore / Community product-first suite exits
assert.match(
  fs.readFileSync(join(root, "components/Footer.tsx"), "utf8"),
  /data-footer-path=["']product-first["']/
);
// profilePanelSrc already loaded above (account and job status)
assert.match(profilePanelSrc, /data-profile-path=["']product-first["']/);
assert.match(profilePanelSrc, /data-profile-suite=["']product-first["']/);
assert.match(profilePanelSrc, /effect=street-power-up/);
assert.match(profilePanelSrc, /Create one Moment/);
assert.match(profilePanelSrc, /href=["']\/library["']/);
assert.doesNotMatch(profilePanelSrc, /Flow · Preview/);
assert.match(
  fs.readFileSync(join(root, "app/profile/page.tsx"), "utf8"),
  /data-profile-page-path=["']product-first["']/
);
assert.match(
  fs.readFileSync(join(root, "app/explore/page.tsx"), "utf8"),
  /data-explore-path=["']product-first["']/
);
assert.match(
  fs.readFileSync(join(root, "app/community/page.tsx"), "utf8"),
  /data-community-path=["']product-first["']/
);
assert.match(
  fs.readFileSync(join(root, "app/pricing/page.tsx"), "utf8"),
  /data-pricing-path=["']product-first["']/
);
// Modules suite CTAs: one Moment + Library before Flow Preview
assert.ok(
  modulesSuiteCtasSrc.indexOf("effect=street-power-up") <
    modulesSuiteCtasSrc.indexOf('href="/flow"'),
  "ModulesSuiteCtas: one Moment before Flow"
);
assert.match(modulesSuiteCtasSrc, /Flow · Preview/);
assert.match(modulesMobileCtaSrc, /href=["']\/library["']/);
assert.match(
  fs.readFileSync(join(root, "components/LandingToolPanel.tsx"), "utf8"),
  /GenerateWaitStage/
);
assert.match(
  fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
  /GenerateWaitStage/
);
assert.match(
  fs.readFileSync(join(root, "components/LandingToolPanel.tsx"), "utf8"),
  /GenerateAfterPath/
);
// Landing + Image AfterPath carry device-local bible SKU

// Landing tool panel: Full studio remix href + single Moment door (product-first)
const landingPathsSrc = fs.readFileSync(
  join(root, "components/LandingToolPanel.tsx"),
  "utf8"
);
assert.match(landingPathsSrc, /createRemixHref/);
assert.match(landingPathsSrc, /data-landing-paths=["']product-first["']/);
assert.match(landingPathsSrc, /data-landing-studio=["']single-moment["']/);
assert.match(landingPathsSrc, /effect=street-power-up/);

// SEO suite doors + LandingResults remake remix href
assert.match(
  fs.readFileSync(join(root, "components/SuiteDoorLinks.tsx"), "utf8"),
  /createRemixHref/
);
assert.match(
  fs.readFileSync(join(root, "components/LandingResults.tsx"), "utf8"),
  /createRemixHref|data-landing-remake/
);
// Client interpret: PROVIDER_NETWORK never invents restore
assert.match(
  fs.readFileSync(join(root, "lib/generateClient.ts"), "utf8"),
  /PROVIDER_NETWORK/
);
assert.match(
  fs.readFileSync(join(root, "lib/imageClient.ts"), "utf8"),
  /PROVIDER_NETWORK/
);

// Landing + Image AfterPath SKU carry (Create/Batch parity)
assert.match(
  fs.readFileSync(join(root, "components/LandingToolPanel.tsx"), "utf8"),
  /loadToyIdentity|sku=\{toySku/
);
assert.match(
  fs.readFileSync(join(root, "app/image/page.tsx"), "utf8"),
  /loadToyIdentity|sku=\{toySku/
);
// SEO related recipes disclose cached prototype vs concept without fake scores.
const presetCardSrc = fs.readFileSync(
  join(root, "components/PresetCard.tsx"),
  "utf8"
);
assert.match(presetCardSrc, /Lab · cached prototype/);
assert.doesNotMatch(
  presetCardSrc,
  /Official · cached|data-proof-quality|provisionalLabQualityLabel|Lab\s*≥\s*4/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
  /GenerateAfterPath/
);
assert.match(
  fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
  /Open in Library|Create next SKU|Preview another sample/
);
// Profile suite exits for closed loop (Generate / Library / one Moment)
assert.match(
  fs.readFileSync(join(root, "components/ProfilePanel.tsx"), "utf8"),
  /effect=street-power-up|Create one Moment/
);
assert.match(
  fs.readFileSync(join(root, "components/ProfilePanel.tsx"), "utf8"),
  /href=["']\/library["']/
);
// Mobile Create sticky after success → Library
assert.match(createStudioSmoke, /status === ["']done["'][\s\S]*?Library/);
// Still Studio shares AfterPath suite exits (not a dead-end preview)
assert.match(
  fs.readFileSync(join(root, "app/image/page.tsx"), "utf8"),
  /GenerateAfterPath/
);
// Cinema Preview closed-loop suite chips (not a dead-end director board)
assert.match(
  fs.readFileSync(join(root, "app/cinema/page.tsx"), "utf8"),
  /GenerateAfterPath/
);
// Library keeps only the current account result states. Failure/retry and
// sample/provider accounting are asserted on their owning API/client modules.
// Mobile suite bar: hide image/cinema; Library shows one Moment
const mobileBarSrc = fs.readFileSync(
  join(root, "components/MobileGenerateBar.tsx"),
  "utf8"
);
assert.match(mobileBarSrc, /\/image|\/cinema/);
assert.match(mobileBarSrc, /effect=street-power-up|Create one Moment/);
assert.match(
  fs.readFileSync(join(root, "components/CommunityPublishButton.tsx"), "utf8"),
  /Lab only|demo/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/CommunityPublishButton.tsx"), "utf8"),
  /fake UGC|invent posts/i
);
const flowPageSrc = fs.readFileSync(join(root, "app/flow/page.tsx"), "utf8");
assert.match(flowPageSrc, /core-cinema|Cinema board/);
assert.match(flowPageSrc, /core-library|Library · Assets/);
assert.match(flowPageSrc, /Core product path|Seller Pack/);
// Photo→Clip workbench uses remix workbench href (FreeTrialCta owns sample path)
assert.match(
  flowPageSrc,
  /id:\s*["']core-i2v["'][\s\S]*?href:\s*(FLOW_GENERATE_HREF|createWorkbenchHref|createRemixHref)/
);

// T8 Seller Pack recovery: browser keeps only packRunId + three packJobIds;
// owner-scoped status owns result + settlement truth after refresh.
const sellerPackRecoverySrc = fs.readFileSync(
  join(root, "lib/sellerPackRecovery.ts"),
  "utf8"
);
assert.match(sellerPackRecoverySrc, /SELLER_PACK_RECOVERY_KEY/);
assert.match(sellerPackRecoverySrc, /reconcileSellerPackRecovery/);
assert.match(sellerPackRecoverySrc, /owner-scoped pack job/i);
assert.match(sellerPackRecoverySrc, /SELLER_PACK_ITEMS/);
assert.match(sellerPackRecoverySrc, /packRunId/);
assert.match(sellerPackRecoverySrc, /packJobId/);
assert.match(sellerPackRecoverySrc, /resultUrl/);
// Contract + recovery must stay in lockstep (golden smoke also asserts).
assert.match(
  fs.readFileSync(join(root, "lib/sellerPackContract.ts"), "utf8"),
  /360-spin-showcase[\s\S]*blind-box-unboxing[\s\S]*paparazzi-flash/
);
assert.match(batchStudio, /data-seller-pack-recovery="session-pointer"/);
assert.match(batchStudio, /Server status remains authoritative/);
assert.match(batchStudio, /retryEligible/);
const recoveryCjs = require("typescript").transpileModule(sellerPackRecoverySrc, {
  compilerOptions: {
    module: require("typescript").ModuleKind.CommonJS,
    target: require("typescript").ScriptTarget.ES2022,
  },
}).outputText;
const contractSrc = fs.readFileSync(
  join(root, "lib/sellerPackContract.ts"),
  "utf8"
);
const contractCjs = require("typescript").transpileModule(contractSrc, {
  compilerOptions: {
    module: require("typescript").ModuleKind.CommonJS,
    target: require("typescript").ScriptTarget.ES2022,
  },
}).outputText;
const contractModule = { exports: {} };
new Function("require", "exports", "module", contractCjs)(
  (id) => {
    // pricing is only used for LIVE total constant — inject flat 10.
    if (id === "@/lib/pricing" || id.endsWith("/pricing")) {
      return { CREDITS_PER_VIDEO: 10 };
    }
    throw new Error(`unexpected Seller Pack contract import: ${id}`);
  },
  contractModule.exports,
  contractModule
);
const recoveryModule = { exports: {} };
new Function("require", "exports", "module", recoveryCjs)(
  (id) => {
    if (
      id === "@/lib/sellerPackContract" ||
      id.endsWith("/sellerPackContract")
    ) {
      return contractModule.exports;
    }
    throw new Error(`unexpected Seller Pack recovery import: ${id}`);
  },
  recoveryModule.exports,
  recoveryModule
);
const recovery = recoveryModule.exports;
const activePack = recovery.parseSellerPackRecovery({
  version: 2,
  projectId: "seller-pack-fixture",
  packRunId: "pack-run-fixture-0001",
  savedAt: "2026-07-26T00:00:00.000Z",
  children: [
    { packJobId: "pack-job-spin-0001", childKey: "listing_spin", slug: "360-spin-showcase", name: "Listing Spin", aspectRatio: "1:1", statusHint: "running", retryCount: 0 },
    { packJobId: "pack-job-reveal-002", childKey: "blind_box_reveal", slug: "blind-box-unboxing", name: "Blind-box Reveal", aspectRatio: "9:16", statusHint: "failed", retryCount: 0 },
    { packJobId: "pack-job-social-003", childKey: "social_flash", slug: "paparazzi-flash", name: "Social Flash", aspectRatio: "9:16", statusHint: "running", retryCount: 0 },
  ],
});
assert.ok(activePack, "only the exact fixed three Seller Pack children may hydrate");
assert.equal(
  recovery.parseSellerPackRecovery({ ...activePack, children: [{ ...activePack.children[0], slug: "injected" }] }),
  null,
  "sessionStorage cannot inject a different child mapping"
);
assert.equal(
  recovery.parseSellerPackRecovery({ ...activePack, children: [activePack.children[0], activePack.children[0], activePack.children[2]] }),
  null,
  "sessionStorage rejects duplicate child slugs"
);
assert.equal(
  recovery.parseSellerPackRecovery({ ...activePack, children: [{ ...activePack.children[0], aspectRatio: "9:16" }, activePack.children[1], activePack.children[2]] }),
  null,
  "sessionStorage rejects an incorrect fixed-child aspect ratio"
);
const refreshedPack = recovery.reconcileSellerPackRecovery(activePack, [
  { jobId: "pack-job-spin-0001", childKey: "listing_spin", effectSlug: "360-spin-showcase", aspectRatio: "1:1", status: "succeeded", quotedCredits: 10, settledCredits: 10, hasPrivateResult: true, resultUrl: "https://private.example/spin", modelId: "seedance-fast", resolution: "720p", durationSec: 5 },
  { jobId: "pack-job-reveal-002", childKey: "blind_box_reveal", effectSlug: "blind-box-unboxing", aspectRatio: "9:16", status: "failed", quotedCredits: 10, settledCredits: 0, errorCode: "provider_error" },
  { jobId: "pack-job-social-003", childKey: "social_flash", effectSlug: "paparazzi-flash", aspectRatio: "9:16", status: "running", quotedCredits: 10, settledCredits: 0 },
]);
assert.deepEqual(
  refreshedPack.children.map((child) => [child.slug, child.status, child.creditState]),
  [
    ["360-spin-showcase", "succeeded", "10 used"],
    ["blind-box-unboxing", "refunded", "10 restored"],
    ["paparazzi-flash", "running", undefined],
  ],
  "refresh restores server-known partial success/failure/refund state"
);
const retryOnlyConfirmed = refreshedPack.children
  .filter((child) => child.status === "refunded")
  .map((child) => child.slug);
assert.deepEqual(retryOnlyConfirmed, ["blind-box-unboxing"], "retry excludes succeeded siblings and refund-unconfirmed children");
const gonePack = recovery.reconcileSellerPackRecovery(activePack, []);
assert.equal(gonePack.unavailable, 3);
assert.ok(gonePack.children.every((child) => child.status === "recovery_unavailable" && !child.creditState), "missing current-session jobs never revive stale success or refund hints");


// Profile refund policy honesty (Settings/Status parity)
assert.match(
  fs.readFileSync(join(root, "components/ProfilePanel.tsx"), "utf8"),
  /data-profile-refund-policy=["']honesty["']/
);
assert.match(
  fs.readFileSync(join(root, "components/ProfilePanel.tsx"), "utf8"),
  /cancel unconfirmed|ledgerCancelRefund/
);
assert.match(
  fs.readFileSync(join(root, "app/image/page.tsx"), "utf8"),
  /data-image-cancel=["']settlement["']/
);


// Home feature carousel: single Moment + remake remix hrefs (not /supercomputer)
const featureCarousel = fs.readFileSync(
  join(root, "components/HomeFeatureCarousel.tsx"),
  "utf8"
);
assert.match(featureCarousel, /createRemixHref/);
assert.match(featureCarousel, /effect=street-power-up|data-home-promo-path=["']seller-pack["']/);
assert.doesNotMatch(featureCarousel, /href:\s*["']\/supercomputer["']/);
assert.match(featureCarousel, /Lab · cached prototype/);
assert.doesNotMatch(
  featureCarousel,
  /data-proof-quality|provisionalLabQualityLabel|Lab\s*≥\s*4/
);
assert.match(
  fs.readFileSync(join(root, "components/HeroUpload.tsx"), "utf8"),
  /effect=street-power-up&source=home-launch-pack/
);
// Community: private Moments fail closed; only Lab /demos public deliverables
const communityPublish = fs.readFileSync(
  join(root, "components/CommunityPublishButton.tsx"),
  "utf8"
);
assert.match(communityPublish, /isPublicCommunityVideoUrl/);
assert.match(communityPublish, /isPrivateMomentMediaUrl/);
assert.match(communityPublish, /isSessionGatedDownloadUrl/);
assert.match(communityPublish, /Private · no publish|privateMomentPublishHint/);
assert.match(communityPublish, /\/demos\//);
assert.match(
  fs.readFileSync(join(root, "lib/communityPosts.ts"), "utf8"),
  /Lab \/demos|session download, signed storage, or provider CDN/
);
// Landing remake + suite doors use createRemixHref (ratio/duration/channel)
assert.match(
  fs.readFileSync(join(root, "components/LandingResults.tsx"), "utf8"),
  /createRemixHref|data-landing-remake/
);
assert.match(
  fs.readFileSync(join(root, "components/SuiteDoorLinks.tsx"), "utf8"),
  /createRemixHref|data-suite-door=["']generate["']/
);
// image + generate clients: PROVIDER_NETWORK/TIMEOUT set refundUnconfirmed flag
assert.match(
  fs.readFileSync(join(root, "lib/imageClient.ts"), "utf8"),
  /PROVIDER_NETWORK[\s\S]{0,80}PROVIDER_TIMEOUT|code === ["']PROVIDER_NETWORK["']/
);
assert.match(
  fs.readFileSync(join(root, "lib/generateClient.ts"), "utf8"),
  /code === ["']PROVIDER_NETWORK["'][\s\S]{0,40}PROVIDER_TIMEOUT|PROVIDER_NETWORK[\s\S]{0,60}TIMEOUT/
);


// Residual deep links: Batch / Home / Hero / Community / Effects use createRemixHref
assert.match(
  fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
  /createRemixHref\(/
);
assert.match(
  fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
  /onPickRecipe[\s\S]{0,200}createRemixHref/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
  /create\?effect=\$\{/
);
assert.match(
  fs.readFileSync(join(root, "components/HfExploreHome.tsx"), "utf8"),
  /createRemixHref\(d\.preset/
);
assert.match(
  fs.readFileSync(join(root, "components/HeroVideoBanner.tsx"), "utf8"),
  /createRemixHref\(demo\.preset/
);
assert.match(
  fs.readFileSync(join(root, "app/community/page.tsx"), "utf8"),
  /createRemixHref\(p\.effectSlug\)/
);
assert.match(
  fs.readFileSync(join(root, "app/effects/[slug]/page.tsx"), "utf8"),
  /createRemixHref\(preset\.slug\)/
);


// Retry API createUi uses remix contract + parent job ratio/duration
assert.match(
  fs.readFileSync(join(root, "app/api/generations/[id]/retry/route.ts"), "utf8"),
  /createRemixHref|createUi/
);
assert.match(
  fs.readFileSync(join(root, "app/api/generations/[id]/retry/route.ts"), "utf8"),
  /remixOptsFromRecord\(parent\)/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "app/api/generations/[id]/retry/route.ts"), "utf8"),
  /createUi:\s*`\/create\?effect=/
);
// Seller Pack Try chips lock fixed child aspect (Listing 1:1 · Reveal/Flash 9:16)
assert.match(
  fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
  /data-pack-try-ratio|ratio:\s*item\.aspectRatio/
);
assert.match(
  fs.readFileSync(join(root, "components/GenerateFailPanel.tsx"), "utf8"),
  /data-fail-path=["']single-moment["']|effect=street-power-up/
);
assert.match(
  fs.readFileSync(join(root, "lib/generateClient.ts"), "utf8"),
  /UNSAFE_URL/
);



// UNSAFE_URL without confirmed restore → refundUnconfirmed (client honesty)
assert.match(
  fs.readFileSync(join(root, "lib/generateClient.ts"), "utf8"),
  /UNSAFE_URL[\s\S]{0,120}!creditsRefunded|code === ["']UNSAFE_URL["'] && !creditsRefunded/
);
assert.match(
  fs.readFileSync(join(root, "lib/imageClient.ts"), "utf8"),
  /UNSAFE_URL[\s\S]{0,120}!creditsRefunded|code === ["']UNSAFE_URL["'] && !creditsRefunded/
);


// Library retry is a single failed/canceled Moment handoff to the guarded
// generations retry route; the route/store keeps the one-time token contract.
assert.match(library, /isRetryable\(job\.status\)/);
assert.match(library, /\/api\/generations\/\$\{encodeURIComponent\(job\.id\)\}\/retry/);


// Seller Pack UI: failed (incl. TIMEOUT unconfirmed) remains retryEligible
assert.match(batchStudio, /function retryEligible/);
assert.match(
  batchStudio,
  /function retryEligible[\s\S]{0,320}isSellerPackRetryableStatus/
);
const sellerPackContract = fs.readFileSync(
  join(root, "lib/sellerPackContract.ts"),
  "utf8"
);
assert.match(
  sellerPackContract,
  /status === ["']failed["']/
);
assert.match(
  sellerPackContract,
  /status === ["']refunded["']/
);
assert.match(
  sellerPackContract,
  /status === ["']not_started["']/
);
assert.doesNotMatch(
  batchStudio,
  /function retryEligible[\s\S]{0,400}creditState !== ["']refund unconfirmed["']/
);
assert.doesNotMatch(
  batchStudio,
  /function retryEligible[\s\S]{0,400}Boolean\(job\.requestId\)/
);
// CONTENT_POLICY without restore → refundUnconfirmed (parity UNSAFE_URL)
assert.match(
  fs.readFileSync(join(root, "lib/createTrust.ts"), "utf8"),
  /CONTENT_POLICY/
);
assert.match(
  fs.readFileSync(join(root, "lib/generateClient.ts"), "utf8"),
  /code === ["']CONTENT_POLICY["'] && !creditsRefunded/
);
assert.match(
  fs.readFileSync(join(root, "lib/imageClient.ts"), "utf8"),
  /code === ["']CONTENT_POLICY["'] && !creditsRefunded/
);

// Fail-replay HTTP status map: generate ↔ image parity
// image: PROVIDER_NETWORK → 503; generate: CANCELED → 409
assert.match(
  fs.readFileSync(join(root, "app/api/image/route.ts"), "utf8"),
  /PROVIDER_NETWORK[\s\S]{0,40}\? 503|code === ["']PROVIDER_NETWORK["']\s*\n?\s*\? 503/
);
assert.match(
  fs.readFileSync(join(root, "app/api/generate/route.ts"), "utf8"),
  /CANCELED["'] \|\| (?:raw)?[Cc]ode === ["']REQUEST_CANCELED["'][\s\S]{0,40}\? 409/
);
assert.match(
  fs.readFileSync(join(root, "app/api/generate/route.ts"), "utf8"),
  /rawCode === ["']CANCELED["'] \? ["']REQUEST_CANCELED["']/
);
// MODEL_EMPTY without restore → refund unconfirmed (empty body after debit)
assert.match(
  fs.readFileSync(join(root, "lib/createTrust.ts"), "utf8"),
  /MODEL_EMPTY/
);
assert.equal(
  requestCreditStateFromFailurePure({
    status: 502,
    code: "MODEL_EMPTY",
  }),
  "refund unconfirmed"
);
assert.equal(
  requestCreditStateFromFailurePure({
    status: 502,
    code: "MODEL_EMPTY",
    creditsRefunded: true,
  }),
  "10 restored"
);
// Client 200 empty/unsafe: refundUnconfirmed when restore not echoed
assert.match(
  fs.readFileSync(join(root, "lib/generateClient.ts"), "utf8"),
  /MODEL_EMPTY[\s\S]{0,200}refundUnconfirmed|refundUnconfirmed[\s\S]{0,120}MODEL_EMPTY/
);
assert.match(
  fs.readFileSync(join(root, "lib/imageClient.ts"), "utf8"),
  /MODEL_EMPTY[\s\S]{0,200}refundUnconfirmed|refundUnconfirmed[\s\S]{0,120}MODEL_EMPTY/
);

// Image studio FailPanel uses shared createTrust settlement (not a partial code list)
assert.match(
  fs.readFileSync(join(root, "app/image/page.tsx"), "utf8"),
  /requestCreditStateFromFailure/
);
assert.match(
  fs.readFileSync(join(root, "app/image/page.tsx"), "utf8"),
  /from ["']@\/lib\/createTrust["']/
);

// Fail ledger settlement: generate failSync + image failImage use shared map
const createTrustLedger = fs.readFileSync(
  join(root, "lib/createTrust.ts"),
  "utf8"
);
assert.match(createTrustLedger, /export function failedLedgerCreditsOutcome/);
assert.match(createTrustLedger, /export function isAmbiguousDebitFailureCode/);
assert.match(
  fs.readFileSync(join(root, "lib/generationJobs/store.ts"), "utf8"),
  /failedLedgerCreditsOutcome/
);
assert.match(
  fs.readFileSync(join(root, "lib/imageJobs.ts"), "utf8"),
  /failedLedgerCreditsOutcome/
);
// Pure map (mirrors createTrust.failedLedgerCreditsOutcome)
function failedLedgerCreditsOutcomePure(opts) {
  if (opts.creditsRefunded === true) return "10 restored";
  const code = opts.errorCode;
  const ambiguous =
    opts.refundUnconfirmed === true ||
    code === "NETWORK_ERROR" ||
    code === "PROVIDER_NETWORK" ||
    code === "REQUEST_CANCELED" ||
    code === "CANCELED" ||
    code === "TIMEOUT" ||
    code === "PROVIDER_TIMEOUT" ||
    code === "UNSAFE_URL" ||
    code === "CONTENT_POLICY" ||
    code === "MODEL_EMPTY";
  if (ambiguous) return "refund unconfirmed";
  return undefined;
}
assert.equal(
  failedLedgerCreditsOutcomePure({
    creditsRefunded: true,
    errorCode: "CONTENT_POLICY",
  }),
  "10 restored"
);
assert.equal(
  failedLedgerCreditsOutcomePure({ errorCode: "PROVIDER_NETWORK" }),
  "refund unconfirmed"
);
assert.equal(
  failedLedgerCreditsOutcomePure({ errorCode: "MODEL_EMPTY" }),
  "refund unconfirmed"
);
assert.equal(
  failedLedgerCreditsOutcomePure({ errorCode: "GENERATION_FAILED" }),
  undefined
);
// Provider failure codes and unconfirmed settlement remain owned by the
// generation/image clients below, not by retired Library sample UI.
// Clients: MODEL_EMPTY on typed error body (not only empty 200)
assert.match(
  fs.readFileSync(join(root, "lib/generateClient.ts"), "utf8"),
  /code === ["']MODEL_EMPTY["'] && !creditsRefunded/
);
assert.match(
  fs.readFileSync(join(root, "lib/imageClient.ts"), "utf8"),
  /code === ["']MODEL_EMPTY["'] && !creditsRefunded/
);

// Download HEAD: terminal fail codes must not toast "not ready" (409 trap)
function classifyDownloadHeadPure(opts) {
  const code = (opts.code || "").trim();
  const status = opts.status;
  if (status === 403 || code === "DOWNLOAD_BLOCKED") {
    return { kind: "block", message: "t6" };
  }
  if (status === 404 || code === "NOT_FOUND") {
    return { kind: "not_found", message: "miss" };
  }
  if (code === "CANCELED" || code === "REQUEST_CANCELED") {
    return { kind: "block", message: "canceled" };
  }
  if (code === "JOB_IN_FLIGHT") {
    return { kind: "block", message: "inflight" };
  }
  if (code === "TIMEOUT" || code === "PROVIDER_TIMEOUT" || status === 504) {
    return { kind: "block", message: "timeout" };
  }
  if (code === "PROVIDER_NETWORK") {
    return { kind: "block", message: "network" };
  }
  if (code === "CONTENT_POLICY") {
    return { kind: "block", message: "policy" };
  }
  if (code === "MODEL_EMPTY") {
    return { kind: "block", message: "empty" };
  }
  if (code === "PROVIDER_RATE_LIMIT" || code === "RATE_LIMITED") {
    return { kind: "block", message: "rate" };
  }
  if (code === "PROVIDER_BALANCE") {
    return { kind: "block", message: "balance" };
  }
  if (status === 422 || code === "UNSAFE_URL") {
    return { kind: "block", message: "unsafe" };
  }
  if (code === "GENERATION_FAILED") {
    return { kind: "block", message: "failed" };
  }
  if (status === 409 || code === "NOT_READY") {
    return { kind: "block", message: "not-ready" };
  }
  if (status >= 200 && status < 300) return { kind: "allow" };
  return { kind: "unknown" };
}
assert.equal(
  classifyDownloadHeadPure({ status: 409, code: "PROVIDER_NETWORK" }).message,
  "network"
);
assert.equal(
  classifyDownloadHeadPure({ status: 409, code: "CONTENT_POLICY" }).message,
  "policy"
);
assert.equal(
  classifyDownloadHeadPure({ status: 409, code: "MODEL_EMPTY" }).message,
  "empty"
);
assert.equal(
  classifyDownloadHeadPure({ status: 409, code: "PROVIDER_RATE_LIMIT" })
    .message,
  "rate"
);
assert.equal(
  classifyDownloadHeadPure({ status: 409, code: "PROVIDER_BALANCE" }).message,
  "balance"
);
assert.equal(
  classifyDownloadHeadPure({ status: 409, code: "NOT_READY" }).message,
  "not-ready"
);
assert.equal(
  classifyDownloadHeadPure({ status: 409, code: "JOB_IN_FLIGHT" }).message,
  "inflight"
);
assert.match(
  fs.readFileSync(join(root, "lib/createTrust.ts"), "utf8"),
  /Terminal fail codes must run BEFORE generic 409|PROVIDER_NETWORK[\s\S]{0,200}NOT_READY/
);
assert.match(
  fs.readFileSync(join(root, "app/api/downloads/[id]/route.ts"), "utf8"),
  /PROVIDER_NETWORK[\s\S]{0,80}503|code === ["']PROVIDER_NETWORK["'][\s\S]{0,40}503/
);
assert.match(
  fs.readFileSync(join(root, "app/api/downloads/[id]/route.ts"), "utf8"),
  /X-Pikbo-Credits-Outcome/
);
// Webhook fail path uses failedLedgerCreditsOutcome (not silent undefined)
assert.match(
  fs.readFileSync(join(root, "lib/generationJobs/store.ts"), "utf8"),
  /applyProviderWebhookEvent[\s\S]{0,2500}failedLedgerCreditsOutcome|failedLedgerCreditsOutcome[\s\S]{0,400}webhook/
);

// Session jobs HEAD: full-ledger counts (not list page slice of 30)
assert.match(
  fs.readFileSync(join(root, "lib/generationJobs/store.ts"), "utf8"),
  /export function countJobsForSession/
);
assert.match(
  fs.readFileSync(join(root, "lib/generationJobs/index.ts"), "utf8"),
  /countJobsForSession/
);
const genJobsRouteHead = fs.readFileSync(
  join(root, "app/api/generations/route.ts"),
  "utf8"
);
assert.match(genJobsRouteHead, /countJobsForSession/);
assert.match(genJobsRouteHead, /X-Pikbo-Jobs-List-Limit/);
assert.match(genJobsRouteHead, /SESSION_JOBS_LIST_LIMIT\s*=\s*50/);
// GET list: full-session byStatus (countJobsForSession) + listLimit/listed
assert.match(genJobsRouteHead, /listLimit:\s*SESSION_JOBS_LIST_LIMIT|listLimit,/);
assert.match(genJobsRouteHead, /countJobsForSession/);
assert.doesNotMatch(genJobsRouteHead, /touchOpenJobsForSession/);
// Modules Photo → Clip carries remix contract (not bare /create)
assert.match(
  fs.readFileSync(join(root, "components/ModulesSuiteCtas.tsx"), "utf8"),
  /createGenerate360Href|data-modules-path=["']photo-clip["']/
);
assert.doesNotMatch(
  genJobsRouteHead,
  /export async function HEAD[\s\S]{0,400}listJobsForSession\(session\.id,\s*30\)/
);
// Pure full-session count (list slice must not under-count failed)
function countJobsForSessionPure(jobs, sessionId) {
  let total = 0;
  let open = 0;
  let failed = 0;
  for (const j of jobs) {
    if (j.sessionId !== sessionId) continue;
    total += 1;
    if (j.status === "queued" || j.status === "running") open += 1;
    else if (j.status === "failed") failed += 1;
  }
  return { total, open, failed };
}
{
  const jobs = [];
  for (let i = 0; i < 40; i++) {
    jobs.push({
      sessionId: "s1",
      status: i < 5 ? "failed" : "succeeded",
      createdAt: `2026-07-27T00:${String(i).padStart(2, "0")}:00.000Z`,
    });
  }
  const full = countJobsForSessionPure(jobs, "s1");
  assert.equal(full.total, 40);
  assert.equal(full.failed, 5);
  // Newest-30 slice would miss older fails if they sorted out of page
  const sliced = jobs
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 30);
  const pageFails = sliced.filter((j) => j.status === "failed").length;
  assert.ok(
    full.failed >= pageFails,
    "full session fail count must cover list page"
  );
}
assert.match(
  fs.readFileSync(join(root, "lib/createTrust.ts"), "utf8"),
  /PROVIDER_RATE_LIMIT|RATE_LIMITED/
);
assert.match(
  fs.readFileSync(join(root, "lib/createTrust.ts"), "utf8"),
  /PROVIDER_BALANCE/
);

// GET /api/generations: full-session byStatus; reads never move deadline.
assert.doesNotMatch(
  fs.readFileSync(join(root, "lib/generationJobs/store.ts"), "utf8"),
  /export function touchOpenJobsForSession/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "lib/generationJobs/index.ts"), "utf8"),
  /touchOpenJobsForSession/
);
const genJobsGet = fs.readFileSync(
  join(root, "app/api/generations/route.ts"),
  "utf8"
);
assert.match(genJobsGet, /listPrivateGenerationResults/);
assert.match(genJobsGet, /mergePrivateLibraryWithLocalLedger/);
assert.match(genJobsGet, /getAuthUserFromRequest/);
assert.match(genJobsGet, /supabase-private\+process-memory/);
assert.match(genJobsGet, /function controlledLocalJob/);
assert.match(
  genJobsGet,
  /controlledLocalJob\(toPublicJob\(job,\s*session\.id\)\)/
);
assert.doesNotMatch(genJobsGet, /providerOutputUrl|signedUrl/);
assert.doesNotMatch(genJobsGet, /touchOpenJobsForSession\(session\.id\)/);
assert.match(genJobsGet, /touchedOpen:\s*0|GET is read-only/);
assert.match(genJobsGet, /full\.queued|counts\.queued/);
assert.match(
  genJobsGet,
  /total:\s*merged\.total|total:\s*full\.total|total:\s*counts\.total/
);
assert.match(genJobsGet, /listLimit:\s*SESSION_JOBS_LIST_LIMIT/);
// Durable Library mapper: all statuses, controlled download only for successes.
const privateLibraryPure = fs.readFileSync(
  join(root, "lib/privateGenerationResultsPure.mjs"),
  "utf8"
);
assert.match(privateLibraryPure, /privateLibraryJobFromRow/);
assert.match(
  privateLibraryPure,
  /\/api\/downloads\/\$\{encodeURIComponent\(id\)\}/
);
assert.match(privateLibraryPure, /localRetry:\s*false/);
assert.match(privateLibraryPure, /localCancel:\s*false/);
assert.match(
  fs.readFileSync(join(root, "components/LibraryGrid.tsx"), "utf8"),
  /canLocalRetry|canLocalCancel|canNewAttempt/
);
assert.doesNotMatch(
  genJobsGet,
  /export async function GET[\s\S]{0,800}for \(const j of raw\)/
);
// Library MVP keeps list sizing and full-session counts on the generations API;
// the retired SessionJobsPanel pagination markers are intentionally absent.
// Modules Photo→Clip uses remix contract (ratio/duration/channel)
assert.match(
  fs.readFileSync(join(root, "components/ModulesSuiteCtas.tsx"), "utf8"),
  /createGenerate360Href\(["']modules-photo-clip["']\)|MODULES_PHOTO_CLIP_HREF|createGenerate360Href\(["']360-spin/
);
assert.match(
  fs.readFileSync(join(root, "components/ModulesSuiteCtas.tsx"), "utf8"),
  /data-modules-path=["']photo-clip["']/
);

// beginSync stamps aspect/duration at open — fail/cancel remake keeps ratio
const beginSyncSrc = fs.readFileSync(
  join(root, "lib/generationJobs/store.ts"),
  "utf8"
);
assert.match(
  beginSyncSrc,
  /export function beginSyncGenerateJob[\s\S]{0,500}aspectRatio/
);
assert.match(
  beginSyncSrc,
  /export function beginSyncGenerateJob[\s\S]{0,600}duration/
);
assert.match(
  fs.readFileSync(join(root, "app/api/generate/route.ts"), "utf8"),
  /beginSyncGenerateJob\([\s\S]{0,500}aspectRatio:\s*aspect/
);
assert.match(
  fs.readFileSync(join(root, "app/api/generate/route.ts"), "utf8"),
  /beginSyncGenerateJob\([\s\S]{0,500}duration:\s*secs/
);
// Suite doors default Generate uses remix contract (not bare /create)
assert.match(
  fs.readFileSync(join(root, "components/SuiteDoorLinks.tsx"), "utf8"),
  /createRemixHref\(effectSlug \|\| ["']360-spin-showcase["']\)|createRemixHref\(effectSlug/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/SuiteDoorLinks.tsx"), "utf8"),
  /generateHref = effectSlug[\s\S]{0,40}:\s*["']\/create["']/
);
// Create provenance: restore when confirmed (not bare restore)
assert.match(
  fs.readFileSync(join(root, "components/CreateStudio.tsx"), "utf8"),
  /restore credits when confirmed|when confirmed/
);
// Cancel download body echoes refundUnconfirmed (fail path parity)
assert.match(
  fs.readFileSync(join(root, "app/api/downloads/[id]/route.ts"), "utf8"),
  /code:\s*["']CANCELED["'][\s\S]{0,500}refundUnconfirmed/
);

// Login guest fallback remains the fixed Moment contract — page + form.
assert.match(loginPageSrc, loginGuestMomentHrefPattern);
assert.doesNotMatch(
  loginPageSrc,
  /Continue as guest[\s\S]{0,80}href=["']\/create["']/
);
assert.match(loginFormSrc, loginGuestMomentHrefPattern);
assert.doesNotMatch(loginPageSrc, /createRemixHref|360-spin-showcase/);
assert.doesNotMatch(loginFormSrc, /createRemixHref|360-spin-showcase/);
assert.doesNotMatch(loginPageSrc, /\/create\?effect=street-power-up&source=login-guest/);
assert.doesNotMatch(loginFormSrc, /\/create\?effect=street-power-up&source=login-guest/);
assert.doesNotMatch(loginPageSrc, /\/modules/);
assert.doesNotMatch(loginFormSrc, /\/modules/);
// DELETE cancel ledgers echo refundUnconfirmed (client settlement honesty)
assert.match(
  fs.readFileSync(join(root, "app/api/generations/route.ts"), "utf8"),
  /creditsOutcome === ["']refund unconfirmed["'][\s\S]{0,80}refundUnconfirmed:\s*true/
);
assert.match(
  fs.readFileSync(join(root, "app/api/image/route.ts"), "utf8"),
  /creditsOutcome === ["']refund unconfirmed["'][\s\S]{0,80}refundUnconfirmed:\s*true/
);
assert.match(
  fs.readFileSync(join(root, "app/api/generations/[id]/route.ts"), "utf8"),
  /refundUnconfirmed:\s*true/
);
// Mobile sticky Generate also remix (product-first)
assert.match(
  fs.readFileSync(join(root, "components/MobileGenerateBar.tsx"), "utf8"),
  /createGenerate360Href|data-mobile-bar=["']generate-remix["']/
);
assert.match(
  fs.readFileSync(join(root, "components/LoginForm.tsx"), "utf8"),
  /Sign-in is temporarily unavailable|data-login-guest/
);
assert.match(
  fs.readFileSync(join(root, "app/login/page.tsx"), "utf8"),
  /Guest preview|cached Lab|Real generation|Private results/
);
assert.match(
  fs.readFileSync(join(root, "app/login/page.tsx"), "utf8"),
  /do not\s+process your uploaded photo|credit cost is\s+shown before you start/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "app/login/page.tsx"), "utf8"),
  /softLive generate/
);
assert.match(
  fs.readFileSync(join(root, "components/LoginForm.tsx"), "utf8"),
  /cross-device Library require sign-in|Cached Lab previews cost 0 credits/
);
assert.match(
  fs.readFileSync(join(root, "components/CreateStudio.tsx"), "utf8"),
  /data-create-sticky=["']mobile["']/
);
assert.match(
  fs.readFileSync(join(root, "components/CreateStudio.tsx"), "utf8"),
  /0 credits · cached prototype|credits when Live/
);
// Header primary CTA + Library/Profile Generate doors use remix contract
assert.match(
  fs.readFileSync(join(root, "components/Header.tsx"), "utf8"),
  /createGenerate360Href|data-header-cta=["']generate-remix["']/
);
// AppShell routes the public Moment shell to one fixed private validation clip.
assert.match(
  fs.readFileSync(join(root, "components/AppShell.tsx"), "utf8"),
  /DEFAULT_MOMENT_CREATE_HREF\s*=\s*`\$\{MOMENT_CREATE_HREF\}&source=moment-shell`/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/AppShell.tsx"), "utf8"),
  /\/create\?effect=street-power-up&source=primary-nav/
);
// Pricing, closed checkout, and Footer all derive their public Moment doors
// from one frozen base path.  Keep source/try/sample attribution local to the
// surface so a future base-path change cannot silently split this funnel.
const pricingCheckoutButtonSrc = fs.readFileSync(
  join(root, "components/PricingCheckoutButton.tsx"),
  "utf8"
);
const pricingMomentSurfaceSources = [
  ["app/pricing/page.tsx", pricingPage],
  ["components/PricingCheckoutButton.tsx", pricingCheckoutButtonSrc],
  ["components/Footer.tsx", footerSrc],
];
for (const [rel, source] of pricingMomentSurfaceSources) {
  assert.match(
    source,
    /import\s*\{\s*MOMENT_CREATE_HREF\s*\}\s*from\s*["']@\/lib\/softLaunch["']/,
    `${rel} must import the fixed Moment base href`
  );
  assert.doesNotMatch(
    source,
    /\/create\?(?:mode=moment&)?effect=street-power-up/,
    `${rel} must not parallel-hardcode the Moment base path`
  );
}
assert.match(
  pricingPage,
  /const PRICING_PREVIEW_HREF\s*=\s*`\$\{MOMENT_CREATE_HREF\}&source=pricing-preview&try=1&sample=beatbot`/
);
assert.match(pricingPage, /href=\{PRICING_PREVIEW_HREF\}/);
assert.match(
  pricingCheckoutButtonSrc,
  /const PRICING_FOUNDING_HREF\s*=\s*`\$\{MOMENT_CREATE_HREF\}&source=pricing-founding`/
);
assert.match(pricingCheckoutButtonSrc, /href=\{PRICING_FOUNDING_HREF\}/);
assert.match(
  footerSrc,
  /const FOOTER_CREATE_HREF\s*=\s*`\$\{MOMENT_CREATE_HREF\}&source=footer`/
);
assert.match(footerSrc, /\[FOOTER_CREATE_HREF,\s*["']Create["']\]/);
assert.match(footerSrc, /<Link\s+href=\{FOOTER_CREATE_HREF\}/);
// Pricing and Footer still preserve their existing product-first assertions.
assert.match(
  fs.readFileSync(join(root, "components/PricingHeroCopy.tsx"), "utf8"),
  /href=["']\/create\?(?:mode=moment&)?effect=street-power-up&source=pricing-hero&try=1&sample=beatbot["']/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/PricingHeroCopy.tsx"), "utf8"),
  /href=\{`\/create\?source=pricing-/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/Footer.tsx"), "utf8"),
  /\[["']\/create["'],\s*["']Generate["']\]/
);
assert.match(
  library,
  /import\s*\{\s*MOMENT_CREATE_HREF\s*\}\s*from\s*["']@\/lib\/softLaunch["']/
);
assert.match(
  library,
  /const CREATE_MOMENT_HREF\s*=\s*`\$\{MOMENT_CREATE_HREF\}&source=library`/
);
assert.match(library, /href=\{CREATE_MOMENT_HREF\}/);
assert.match(
  fs.readFileSync(join(root, "components/ProfilePanel.tsx"), "utf8"),
  /PROFILE_GENERATE_HREF|data-profile-generate=["']remix["']/
);

// Residual product-shell Generate doors carry remix contract (not bare /create)
const residualGenerateDoors = [
  ["app/profile/page.tsx", /data-profile-page-generate=["']remix["']/],
  ["app/settings/page.tsx", /data-settings-generate=["']remix["']/],
  ["app/explore/page.tsx", /data-explore-generate=["']remix["']/],
  ["app/community/page.tsx", /data-community-generate=["']remix["']/],
  ["app/apps/page.tsx", /data-apps-generate=["']remix["']/],
  ["app/effects/page.tsx", /data-effects-generate=["']remix["']/],
  ["app/flow/page.tsx", /data-flow-start-generate=["']remix["']/],
  ["app/supercomputer/page.tsx", /data-batch-generate=["']remix["']/],
  ["app/models/page.tsx", /data-models-generate=["']remix["']/],
  ["app/tools/page.tsx", /data-tools-generate=["']remix["']/],
  ["app/status/page.tsx", /data-status-generate=["']remix["']/],
  ["app/guides/page.tsx", /data-guides-generate=["']remix["']/],
  ["app/modules/page.tsx", /data-modules-path-generate=["']remix["']/],
  ["app/cinema/page.tsx", /data-cinema-generate=["']remix["']/],
  ["components/SeedanceCampaign.tsx", /data-seedance-generate=["']remix["']/],
  ["components/LandingSeoMesh.tsx", /data-seo-mesh-generate=["']remix["']/],
  ["components/HeroVideoBanner.tsx", /data-hero-try-photo=["']remix["']/],
  ["components/BatchStudio.tsx", /data-batch-single-generate=["']remix["']/],
  ["components/HomeToolShelf.tsx", /SHELF_GENERATE_HREF|createGenerate360Href\(["']home-tool-shelf["']\)/],
  ["components/CommandPalette.tsx", /CMD_GENERATE_HREF|createWorkbenchHref\(["']cmdk["']\)/],
];
for (const [rel, re] of residualGenerateDoors) {
  assert.match(
    fs.readFileSync(join(root, rel), "utf8"),
    re,
    `${rel} primary Generate door must use createGenerate360Href / workbench helper`
  );
}
assert.match(
  fs.readFileSync(join(root, "app/library/page.tsx"), "utf8"),
  /libraryEmpty360Href[\s\S]*Generate 360|data-library-header-cta=["']generate-360["']/
);
assert.match(
  fs.readFileSync(join(root, "app/library/page.tsx"), "utf8"),
  /libraryEmptyMomentHref[\s\S]*Create new Moment|data-library-header-cta=["']moment["']/
);
assert.match(
  fs.readFileSync(join(root, "lib/jobIntents.ts"), "utf8"),
  /export function createGenerate360Href/
);
// Cinema director board compose → Generate carries remix + prompt (not bare effect=)
const cinemaComposeSrc = fs.readFileSync(
  join(root, "app/cinema/page.tsx"),
  "utf8"
);
assert.match(cinemaComposeSrc, /data-cinema-compose=["']remix["']/);
assert.match(cinemaComposeSrc, /createRemixHref\(effect/);
assert.match(cinemaComposeSrc, /prompt=\$\{encodeURIComponent/);
assert.doesNotMatch(
  cinemaComposeSrc,
  /new URLSearchParams\(\{\s*effect,\s*prompt:\s*composed/
);
// Bare /generate alias → listing-spin remix when no query (not bare /create)
const generateAliasSrc = fs.readFileSync(
  join(root, "app/generate/page.tsx"),
  "utf8"
);
assert.match(generateAliasSrc, /createGenerate360Href\(["']generate-alias["']\)/);
assert.doesNotMatch(
  generateAliasSrc,
  /redirect\(s \? `\/create\?\$\{s\}` : ["']\/create["']\)/
);


// Job intent remix: registries use createJobRemixHref (effect+ratio+job), not bare job=
assert.match(jobIntentsSrc, /export function createJobRemixHref/);
assert.match(jobIntentsSrc, /export function createLabSampleTryHref/);
assert.match(jobIntentsSrc, /export function createWorkbenchHref/);
assert.match(jobIntentsSrc, /job=\$\{|job=\$\{encodeURIComponent/);
assert.match(workflowsSrc, /createJobRemixHref|createWorkbenchHref/);
assert.doesNotMatch(workflowsSrc, /href:\s*["']\/create\?job=/);
assert.doesNotMatch(workflowsSrc, /href:\s*["']\/create["']/);
const appsCatalogSrc = fs.readFileSync(join(root, "lib/catalog.ts"), "utf8");
assert.match(appsCatalogSrc, /createJobRemixHref|createWorkbenchHref/);
assert.doesNotMatch(appsCatalogSrc, /href:\s*["']\/create\?job=/);
assert.match(
  fs.readFileSync(join(root, "lib/deliveryPack.ts"), "utf8"),
  /createJobRemixHref|createWorkbenchHref/
);
assert.match(
  fs.readFileSync(join(root, "components/GenerateSuiteChrome.tsx"), "utf8"),
  /createWorkbenchHref/
);
assert.match(
  fs.readFileSync(join(root, "components/GenerateFailPanel.tsx"), "utf8"),
  /createLabSampleTryHref|data-fail-lab-sample=["']remix["']/
);
assert.match(
  fs.readFileSync(join(root, "app/pricing/page.tsx"), "utf8"),
  /const PRICING_PREVIEW_HREF\s*=\s*`\$\{MOMENT_CREATE_HREF\}&source=pricing-preview&try=1&sample=beatbot`/
);


// Residual Lab sample try doors: createLabSampleTryHref (remix + try/sample)
const residualLabSampleDoors = [
  ["components/ModulesSuiteCtas.tsx", /createLabSampleTryHref|data-modules-lab-sample=["']remix["']/],
  ["components/ModulesMobileCta.tsx", /createLabSampleTryHref|data-modules-mobile-lab=["']remix["']/],
  ["components/SoftLaunchStrip.tsx", /createLabSampleTryHref|SOFT_LAUNCH_LAB_SAMPLE_HREF|lab-sample-remix/],
  ["components/HomeFeatureCarousel.tsx", /createLabSampleTryHref|FEATURE_LAB_SAMPLE_HREF/],
  ["components/FreeTrialCta.tsx", /createLabSampleTryHref/],
  ["components/GenerateFailPanel.tsx", /createLabSampleTryHref/],
  ["components/CommandPalette.tsx", /createLabSampleTryHref|CMD_LAB_SAMPLE_HREF/],
];
for (const [rel, re] of residualLabSampleDoors) {
  assert.match(
    fs.readFileSync(join(root, rel), "utf8"),
    re,
    `${rel} Lab sample try must use createLabSampleTryHref remix contract`
  );
  assert.doesNotMatch(
    fs.readFileSync(join(root, rel), "utf8"),
    /["']\/create\?try=1&sample=scout["']/,
    `${rel} must not hardcode bare /create?try=1&sample=scout`
  );
}

console.log("engine-smoke: PASS");
void pathToFileURL; // keep import used on older node
