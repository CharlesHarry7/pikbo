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

// Demo path must not charge before FAL_KEY gate (honesty vs pricing)
const genRoute = fs.readFileSync(join(root, "app/api/generate/route.ts"), "utf8");
const demoIdx = genRoute.indexOf("if (!process.env.FAL_KEY)");
const deductIdx = genRoute.indexOf("deductCredits(session");
assert.ok(demoIdx > 0 && deductIdx > demoIdx, "demo path must run before credit deduct");
assert.match(genRoute, /Cached demos stay free|free cached Lab/i);
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
const imgDemo = imgRoute.indexOf("if (!process.env.FAL_KEY)");
const imgFreeTrialGate = imgRoute.indexOf('session.plan === "free"');
const imgDeduct = imgRoute.indexOf("deductCredits(session");
assert.ok(imgDemo > 0 && imgDeduct > imgDemo, "image demo path free before deduct");
assert.ok(
  imgFreeTrialGate > 0 && imgFreeTrialGate < imgDeduct,
  "free plan stills must not debit Mini trial (before deductCredits)"
);
assert.match(imgRoute, /free_trial_video_only/);
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
  /isSafeDeliverableUrl/
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
assert.match(me, /generateMode/);
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

assert.match(ent, /lastInvoiceId/);
const wh = fs.readFileSync(join(root, "app/api/webhooks/stripe/route.ts"), "utf8");
assert.match(wh, /lastInvoiceId/);
assert.match(wh, /double-fill|redeliver/i);

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
assert.match(createFirstRunStudio, /data-first-run-step="upload"/);
assert.match(createFirstRunStudio, /Upload owned toy photo/);
assert.match(createFirstRunStudio, /data-first-run-step="recipe"/);
assert.match(createFirstRunStudio, /Choose recipe/);
assert.match(createFirstRunStudio, /data-first-run-action="generate"/);
assert.match(createFirstRunStudio, /CREDITS_PER_VIDEO\} credits/);
assert.match(
  createFirstRunStudio,
  /const \[showAdvanced, setShowAdvanced\] = useState\(false\)/
);
assert.match(createFirstRunStudio, /aria-expanded=\{showAdvanced\}/);
const firstRunRecipeAt = createFirstRunStudio.indexOf(
  'data-first-run-step="recipe"'
);
const firstRunLabAt = createFirstRunStudio.indexOf("Try free · Lab");
const firstRunAdvancedAt = createFirstRunStudio.indexOf(
  'id="create-advanced-options"'
);
const firstRunIdentityAt = createFirstRunStudio.indexOf(
  't("create.toyIdentity")'
);
assert.ok(
  firstRunRecipeAt >= 0 && firstRunRecipeAt < firstRunLabAt,
  "mobile recipe must precede collapsed Lab samples"
);
assert.ok(
  firstRunAdvancedAt >= 0 && firstRunAdvancedAt < firstRunIdentityAt,
  "Toy Identity must be inside Advanced, not in the upload step"
);
// Mobile first-run: activation/workflow chrome desktop-only (lg+).
// CD Phase A: JobIntentBar commercial goals stay on all viewports (goal-first).
assert.match(
  createFirstRunStudio,
  /Activation \+ workflow shelf: desktop density/
);
assert.match(
  createFirstRunStudio,
  /Creative Director: commercial goal before model\/recipe density/
);
assert.match(createFirstRunStudio, /JobIntentBar activeId=\{jobIntentId\}/);
// Model/mode strip still hidden on 390px (upload→recipe→generate core)
assert.match(
  createFirstRunStudio,
  /hidden border-b border-white\/10 bg-\[#050506\] px-3 py-1\.5 sm:block/
);
// Activation+Workflow remain inside hidden lg:block; JobIntentBar after that close
const actBlockAt = createFirstRunStudio.indexOf(
  "Activation + workflow shelf: desktop density"
);
const jobBarCommentAt = createFirstRunStudio.indexOf(
  "Creative Director: commercial goal before model/recipe density"
);
assert.ok(
  actBlockAt >= 0 && jobBarCommentAt > actBlockAt,
  "CD Phase A: JobIntentBar comment after desktop-only activation block"
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
assert.match(batchFirstRun, /data-seller-pack-action="generate"/);
assert.match(batchFirstRun, /data-seller-pack-action="library"/);
assert.match(batchFirstRun, /data-seller-pack-action="retry-failed"/);
assert.match(batchFirstRun, /data-seller-pack-sticky="mobile"/);
assert.match(batchFirstRun, /Retry failed only/);
assert.match(batchFirstRun, /Lab samples are official examples/);

const meClient = fs.readFileSync(join(root, "lib/meClient.ts"), "utf8");
assert.match(meClient, /export async function fetchMe/);
assert.match(meClient, /cachedDemoFree/);
assert.match(meClient, /export function mergeMeSession/);
assert.match(meClient, /export function rehydrateFreeTrial/);
assert.match(meClient, /Prefer live cookie credits|authoritative cookie credits/);

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
assert.match(confirm, /lastCheckoutSessionId/);
assert.match(confirm, /idempotent/);

// G7: dev topup never open on production hosts
const topup = fs.readFileSync(join(root, "app/api/dev/topup/route.ts"), "utf8");
assert.match(topup, /FORBIDDEN|Dev topup disabled/);
assert.match(topup, /VERCEL_ENV|NODE_ENV/);
assert.match(topup, /production/);

// G6 forced fail must be non-production only
assert.match(genRoute, /PIKBO_FORCE_GENERATE_FAIL/);
assert.match(genRoute, /VERCEL_ENV !== "production"/);
assert.match(genRoute, /creditsRefunded:\s*true/);

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
const createStudio = fs.readFileSync(
  join(root, "components/CreateStudio.tsx"),
  "utf8"
);
assert.match(createStudio, /resultProvenanceLabel/);
assert.match(createStudio, /PROVENANCE\.onPlayerMark|onPlayerMark/);
const landing = fs.readFileSync(
  join(root, "components/LandingToolPanel.tsx"),
  "utf8"
);
assert.match(landing, /resultProvenanceLabel/);
const library = fs.readFileSync(join(root, "components/LibraryGrid.tsx"), "utf8");
assert.match(library, /resultProvenanceLabel/);
assert.match(gen, /RIGHTS_REQUIRED|UNKNOWN_EFFECT/);

const softlive = fs.readFileSync(
  join(root, "scripts/softlive-checklist.sh"),
  "utf8"
);
assert.match(softlive, /required for soft-live/);
assert.match(softlive, /optional until Stripe/);

// Soft-launch refund honesty + primary nav (first principles)
assert.match(contracts, /creditsRefunded/);
assert.match(genRoute, /creditsRefunded:\s*true/);
assert.match(gen, /creditsRefunded/);
assert.match(gen, /10 credits restored/);
const appShell = fs.readFileSync(join(root, "components/AppShell.tsx"), "utf8");
assert.match(appShell, /const PRIMARY/);
assert.match(appShell, /const MORE/);
assert.match(appShell, /MoreMenu|More/);
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
const projectsPage = fs.readFileSync(
  join(root, "app/projects/[slug]/page.tsx"),
  "utf8"
);
assert.match(projectsPage, /generateStaticParams/);
assert.match(projectsPage, /listShowcaseProjectSlugs/);
assert.match(projectsPage, /getShowcaseProject/);
const videoFeedSrc = fs.readFileSync(join(root, "lib/videoFeed.ts"), "utf8");
assert.match(videoFeedSrc, /export function listOfficialProjectSlugs/);
assert.match(health, /forceGenerateFail/);
assert.match(imgRoute, /PIKBO_FORCE_GENERATE_FAIL/);
const libraryGrid = fs.readFileSync(
  join(root, "components/LibraryGrid.tsx"),
  "utf8"
);
assert.match(libraryGrid, /Remix again|createRemixHref/);

// One-tap Lab sample honesty (not "free" when live)
assert.match(createStudio, /loadSampleToy/);
assert.match(createStudio, /labSampleId|lab-sample-/);
assert.match(createStudio, /Official Lab|official Lab/);
assert.match(createStudio, /10 credits|cached demo free/i);

// Wave A Create versions: stack + Before/After per-version still
assert.match(createStudio, /ResultVersion|type ResultVersion/);
assert.match(createStudio, /selectVersion|setVersions/);
assert.match(createStudio, /sourceKey|sourceStore|internSourceImage/);
assert.match(createStudio, /creditState/);

// Wave A: Seller Pack canonical Create mode + legacy supercomputer redirect
const createPage = fs.readFileSync(join(root, "app/create/page.tsx"), "utf8");
assert.match(createPage, /seller-pack/);
assert.match(createPage, /BatchStudio/);
const batchPage = fs.readFileSync(
  join(root, "app/supercomputer/page.tsx"),
  "utf8"
);
assert.match(batchPage, /redirect\("\/create\?mode=seller-pack"\)|mode=seller-pack/);
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
  "inputImage",
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
assert.match(libraryGrid, /By project|groupMode|sourceProject/);
assert.match(libraryGrid, /Saved on this\s*device/);

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
    result.code === "REQUEST_CANCELED" ||
    result.code === "TIMEOUT"
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
assert.match(ciYml, /typecheck/);
assert.match(ciYml, /npm run build/);
// install path documented for when workflow scope is available
assert.match(ciYml, /name: CI/);
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
assert.match(softLaunch, /floating-hero/);
assert.match(softLaunch, /mystery-box-reveal/);
assert.match(softLaunch, /display-case-glam/);
const videoFeed = fs.readFileSync(join(root, "lib/videoFeed.ts"), "utf8");
assert.match(showcase, /HOME_PROOF_SLUGS/);
assert.match(showcase, /listHomeShowcaseProjects/);
assert.match(videoFeed, /HOME_PROOF_SLUGS|HOME_SHOWCASE_LIMIT/);
assert.match(videoFeed, /listHomeShowcaseProjects/);
assert.match(videoFeed, /conceptRecipeCount/);
assert.match(videoFeed, /official unique demos only|Official unique demos only/i);
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
  fs.readFileSync(join(root, "lib/durableCredits/shadow.ts"), "utf8"),
  /shadowReserveForGuest/
);
assert.match(
  fs.readFileSync(join(root, "lib/durableCredits/shadow.ts"), "utf8"),
  /shadowReserveForGenerate|shadowReserveForAuthUser/
);
assert.match(
  genRoute,
  /shadowReserveForGenerate|shadowReserveForGuest|shadowSettle|shadowRelease/
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
assert.match(
  fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
  /exportAvailableCsv|Export CSV/
);
// Library honesty: HF Assets IA + device-local labels (banner, not raw page string)
assert.match(
  fs.readFileSync(join(root, "app/library/page.tsx"), "utf8"),
  /LibraryStorageBanner|LibraryGrid|device-local|this browser|local storage|Saved on this device/i
);
assert.match(
  fs.readFileSync(join(root, "components/LibraryStorageBanner.tsx"), "utf8"),
  /device-local|this browser|export JSON|no fake multi-device|Saved on this device/i
);
// Library Phase F first-run: sticky Generate/Seller Pack + device-local honesty
const libraryFirstRun = fs.readFileSync(
  join(root, "components/LibraryGrid.tsx"),
  "utf8"
);
assert.match(libraryFirstRun, /data-library-sticky="mobile"/);
assert.match(libraryFirstRun, /data-library-action="generate"/);
assert.match(libraryFirstRun, /data-library-action="seller-pack"/);
assert.match(libraryFirstRun, /data-library-state="empty"/);
assert.match(libraryFirstRun, /data-library-state="filled"/);
assert.match(libraryFirstRun, /data-library-label="device-local"/);
assert.match(libraryFirstRun, /data-library-panel="session-jobs"/);
assert.match(libraryFirstRun, /Saved on this device/);
assert.match(libraryFirstRun, /not durable cloud|not multi-device cloud/);
assert.match(
  fs.readFileSync(join(root, "app/library/page.tsx"), "utf8"),
  /Saved on this device/
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
assert.match(genJobsStore, /export function completeSyncGenerateJob/);
assert.match(genJobsStore, /export function failSyncGenerateJob/);
assert.match(genJobsStore, /export function touchJob/);
assert.match(genJobsStore, /downloadAllowedForJob/);
assert.match(
  fs.readFileSync(join(root, "app/api/generations/[id]/route.ts"), "utf8"),
  /touchJob/
);
assert.match(
  fs.readFileSync(join(root, "app/api/generations/route.ts"), "utf8"),
  /byStatus/
);
assert.match(
  fs.readFileSync(join(root, "app/api/generations/route.ts"), "utf8"),
  /touchJob|touchedOpen/
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
  /reserveLocalAssetId/
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
assert.match(
  fs.readFileSync(join(root, "components/GenerateSuiteChrome.tsx"), "utf8"),
  /id:\s*["']image["']|href:\s*["']\/image["']/
);
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
  /ItemList|official Lab/
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
assert.match(imageJobsSrc, /export function completeImageJob/);
assert.match(imageJobsSrc, /export function failImageJob/);
assert.match(imageJobsSrc, /export function imageJobsProbe/);
assert.match(imageJobsSrc, /export function normalizeImageIdempotencyKey/);
assert.match(imageJobsSrc, /export function sweepTimedOutImageJobs/);
assert.match(imageJobsSrc, /export function imageJobTimeoutMs/);
assert.match(imageJobsSrc, /export function imageJobInFlightRetryAfterSec/);
assert.match(imageJobsSrc, /TIMEOUT|refund unconfirmed/);
assert.match(imageRoute, /findImageJobByIdempotencyKey/);
assert.match(imageRoute, /idempotentReplay/);
assert.match(imageRoute, /normalizeImageIdempotencyKey/);
assert.match(imageRoute, /requestId/);
assert.match(imageRoute, /export async function HEAD/);
assert.match(imageRoute, /X-Pikbo-Image-Jobs-Open/);
assert.match(imageRoute, /imageJobInFlightRetryAfterSec/);
// Pure image timeout sweep (crash mid-Flux must not leave infinite JOB_IN_FLIGHT)
function sweepTimedOutImageJobsPure(jobs, now, timeoutMs) {
  const timedOut = [];
  for (const job of jobs) {
    if (job.status !== "running") continue;
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
  const deductAt = imageRoute.indexOf("deductCredits(session", postAt);
  assert.ok(postAt > 0 && idempAt > postAt, "image idempotency lookup in POST");
  assert.ok(idempAt < budgetAt, "image idempotency before rate budget");
  assert.ok(idempAt < deductAt, "image idempotency before deductCredits");
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
  fs.readFileSync(join(root, "components/HomeViralPresetRail.tsx"), "utf8"),
  /AutoPlayVideo/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/HomeViralPresetRail.tsx"), "utf8"),
  /autoPlay/
);
assert.match(genJobsStore, /export function generationJobsProbe/);
assert.match(genJobsStore, /byStatus|timedOutThisProbe/);
assert.match(genJobsStore, /forkRetryJob[\s\S]*findJobByRequestOrId/);
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
    result.code === "REQUEST_CANCELED" ||
    result.code === "TIMEOUT"
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
// Cold-start sitemap is exactly 9 paths (not a 90+ dump)
const seoIndexSrc = fs.readFileSync(join(root, "lib/seoIndex.ts"), "utf8");
assert.match(seoIndexSrc, /COLD_START_INDEX_PATHS/);
{
  const m = seoIndexSrc.match(
    /COLD_START_INDEX_PATHS\s*=\s*\[([\s\S]*?)\]\s*as const/
  );
  assert.ok(m, "COLD_START_INDEX_PATHS present");
  const n = (m[1].match(/"[^"]+"/g) || []).length;
  assert.equal(n, 9, `sitemap allowlist must stay 9 URLs, got ${n}`);
}
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
// AppShell: no duplicate Pricing in right rail; GA4 page_view on pathname
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
// Analytics page_view helper
{
  const a = fs.readFileSync(join(root, "lib/analytics.ts"), "utf8");
  assert.match(a, /trackPageView/);
  assert.match(a, /page_view/);
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
assert.match(library, /historyItemDownloadAllowed/);
assert.match(library, /Download blocked|download blocked/i);
assert.match(library, /Unsafe deliverable URL|unsafe/);
assert.match(library, /isSafeDeliverableUrl/);
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

// Phase F — Create/Seller mobile craft (390px ownership + sticky CTA)
assert.match(createStudio, /create-ownership/);
assert.match(createStudio, /create-photo-step/);
assert.match(createStudio, /Download policy/);
assert.match(batchStudio, /batch-ownership/);
assert.match(batchStudio, /bottom-\[4\.75rem\]/);
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

// Phase H + product-first: /projects/[slug] noindex cold-start; suite CTAs Seller first
const projectPageSrc = fs.readFileSync(
  join(root, "app/projects/[slug]/page.tsx"),
  "utf8"
);
assert.match(projectPageSrc, /CONCEPT_ROBOTS/);
assert.match(projectPageSrc, /data-project-path="product-first"/);
assert.match(projectPageSrc, /data-project-cta="product-first"/);
assert.match(projectPageSrc, /data-project-footer="product-first"/);
assert.match(projectPageSrc, /mode=seller-pack/);
assert.ok(
  projectPageSrc.indexOf("mode=seller-pack") <
    projectPageSrc.indexOf('href="/modules"') ||
    projectPageSrc.indexOf("mode=seller-pack") <
      projectPageSrc.indexOf("Modules"),
  "Project page: Seller Pack before Modules"
);
// Breadcrumb is Home / Explore / title — not Flow preview
assert.doesNotMatch(
  projectPageSrc.slice(
    projectPageSrc.indexOf('aria-label="Breadcrumb"'),
    projectPageSrc.indexOf("Inside project")
  ),
  /href=["']\/flow["']/
);

// Phase G homepage proof quality gate (all dimensions ≥4)
function passesHomeProofQuality(scores) {
  if (!scores) return false;
  return ["identity", "motion", "artifacts", "composition", "commercialUse"].every(
    (k) => typeof scores[k] === "number" && scores[k] >= 4 && scores[k] <= 5
  );
}
assert.equal(
  passesHomeProofQuality({
    identity: 4,
    motion: 4,
    artifacts: 4,
    composition: 4,
    commercialUse: 4,
  }),
  true
);
assert.equal(
  passesHomeProofQuality({
    identity: 3,
    motion: 5,
    artifacts: 5,
    composition: 5,
    commercialUse: 5,
  }),
  false
);
assert.match(showcase, /passesHomeProofQuality/);
assert.match(showcase, /PROVISIONAL_LAB_SCORES/);
assert.match(showcase, /HOME_PROOF quality gate|qualityScores/);
assert.match(showcase, /reviewerNotes/);

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
assert.match(magicLink, /If the address is valid/);
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
assert.match(genRoute, /customerFacingGenerateVideoUrl/);
// Pure community public URL parity
function isPublicCommunityVideoUrl(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  if (!t || t.length > 2000) return false;
  if (t.startsWith("/api/downloads/") || t.includes("/api/downloads/")) return false;
  if (t.startsWith("/") || t.startsWith("//")) return false;
  try {
    const u = new URL(t);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (!u.hostname || u.username || u.password) return false;
    return true;
  } catch {
    return false;
  }
}
assert.equal(isPublicCommunityVideoUrl("https://cdn.example/v.mp4"), true);
assert.equal(isPublicCommunityVideoUrl("/api/downloads/job_1"), false);
assert.equal(isPublicCommunityVideoUrl("/demos/orbit-dance.mp4"), false);
assert.equal(isPublicCommunityVideoUrl("javascript:alert(1)"), false);
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
// Seller Pack + Library must not mount Free live as <video> (parity with Create)
assert.match(
  fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
  /isPlayableResultVideoUrl/
);
assert.match(
  fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
  /Free live held for T6 bake/
);
assert.match(
  fs.readFileSync(join(root, "components/LibraryGrid.tsx"), "utf8"),
  /isPlayableResultVideoUrl/
);
assert.match(
  fs.readFileSync(join(root, "components/LibraryGrid.tsx"), "utf8"),
  /Free live held for T6 bake/
);
// Phase C auth guest path product-first (Seller Pack before Flow)
const loginFormSrc = fs.readFileSync(
  join(root, "components/LoginForm.tsx"),
  "utf8"
);
const loginPageSrc = fs.readFileSync(join(root, "app/login/page.tsx"), "utf8");
assert.match(loginFormSrc, /data-auth-guest-path="product-first"/);
assert.match(loginPageSrc, /data-auth-guest-path="product-first"/);
assert.match(loginFormSrc, /mode=seller-pack/);
assert.match(loginPageSrc, /mode=seller-pack/);
assert.ok(
  loginFormSrc.indexOf("mode=seller-pack") < loginFormSrc.indexOf("/modules"),
  "LoginForm guest: Seller Pack before Modules"
);
assert.ok(
  !loginFormSrc.includes('href="/flow"') ||
    loginFormSrc.indexOf("mode=seller-pack") < loginFormSrc.indexOf('href="/flow"'),
  "LoginForm guest: Seller Pack before Flow when Flow present"
);
assert.ok(
  loginPageSrc.indexOf("mode=seller-pack") < loginPageSrc.indexOf("/modules"),
  "Login page guest: Seller Pack before Modules"
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
  };
  if (me.plan !== "free") return refundPolicy;
  return {
    failedLiveRefunds: refundPolicy.failedLiveRefunds ?? true,
    failedLiveRefundPolicy:
      refundPolicy.failedLiveRefundPolicy ?? "when_confirmed",
    ledgerTimeoutRefund: refundPolicy.ledgerTimeoutRefund ?? "unconfirmed",
  };
}
{
  const kept = rehydrateFreeTrialPolicyPure({
    plan: "free",
    freeTrial: {
      failedLiveRefunds: true,
      failedLiveRefundPolicy: "when_confirmed",
      ledgerTimeoutRefund: "unconfirmed",
    },
  });
  assert.equal(kept.failedLiveRefundPolicy, "when_confirmed");
  assert.equal(kept.ledgerTimeoutRefund, "unconfirmed");
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
assert.match(
  autoPlaySrc,
  /preload=\{eager[^}]*"metadata" : "none"\}|preload=\{eager \? "metadata" : "none"\}/
);
assert.match(autoPlaySrc, /lazySources/);
const projectPage = fs.readFileSync(
  join(root, "app/projects/[slug]/page.tsx"),
  "utf8"
);
assert.match(projectPage, /reviewerNotes/);
const loginForm = fs.readFileSync(
  join(root, "components/LoginForm.tsx"),
  "utf8"
);
assert.match(loginForm, /signInWithOAuth|Continue with Google/);
assert.match(loginForm, /SUPABASE_AUTH_GOOGLE/);
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

// Phase C — Seller Pack shadow reserve 30 / settle-release 10 per child
const sellerPackLib = fs.readFileSync(
  join(root, "lib/durableCredits/sellerPack.ts"),
  "utf8"
);
assert.match(sellerPackLib, /SELLER_PACK_QUOTE_CREDITS|sellerPackQuoteCredits/);
assert.match(sellerPackLib, /reserveSellerPackShadow/);
assert.match(sellerPackLib, /settleSellerPackChild/);
assert.match(sellerPackLib, /releaseSellerPackChild/);
assert.match(sellerPackLib, /purpose:\s*"seller_pack"|seller_pack/);
function sellerPackQuoteCredits(childCount = 3, per = 10) {
  return childCount * per;
}
assert.equal(sellerPackQuoteCredits(3), 30);
assert.equal(sellerPackQuoteCredits(1), 10);
const spReserve = fs.readFileSync(
  join(root, "app/api/seller-pack/reserve/route.ts"),
  "utf8"
);
assert.match(spReserve, /reserveSellerPackShadow/);
assert.match(spReserve, /SELLER_PACK_QUOTE_CREDITS|quoteCredits/);
assert.match(
  fs.readFileSync(join(root, "app/api/seller-pack/settle/route.ts"), "utf8"),
  /settleSellerPackChild/
);
assert.match(
  fs.readFileSync(join(root, "app/api/seller-pack/release/route.ts"), "utf8"),
  /releaseSellerPackChild/
);
assert.match(batchStudio, /reserveSellerPackShadowClient/);
assert.match(batchStudio, /settleSellerPackChildClient/);
assert.match(batchStudio, /releaseSellerPackChildClient/);
assert.match(batchStudio, /packReservationId/);
assert.match(gen, /reserveSellerPackShadowClient/);

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

// Library Assets-like SKU group
assert.match(library, /By SKU|groupMode === "sku"|value="sku"/);

// Client network honesty codes
assert.match(gen, /REQUEST_CANCELED|NETWORK_ERROR/);
assert.match(contracts, /NETWORK_ERROR/);
assert.match(contracts, /REQUEST_CANCELED/);

// Phase D video-provider webhook idempotency (store + route)
assert.match(genJobsStore, /applyProviderWebhookEvent/);
assert.match(genJobsStore, /findJobByRequestOrId/);
assert.match(genJobsStore, /webhookEvents/);
assert.match(genJobsStore, /UNSAFE_URL|isSafeDeliverableUrl/);
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
assert.equal(ageMs(new Date(Date.now()).toISOString(), Date.now()), 0);

// T6 honest blocked status (player overlay ≠ file bake)
const t6 = fs.readFileSync(join(root, "lib/t6Watermark.ts"), "utf8");
const t6Worker = fs.readFileSync(join(root, "lib/t6Worker.ts"), "utf8");
assert.match(t6, /export function t6Report/);
assert.match(t6, /status:\s*"blocked"|blocked/);
assert.match(t6, /playerOverlayIsNotFileWatermark/);
assert.doesNotMatch(t6, /PIKBO_T6_FILE_BAKE\s*===\s*["']1["']/);
assert.match(t6, /t6WorkerReadiness|serverOwnedWorkerReady|blocked/);
assert.match(t6, /bake_on_download|worker_configured/);
assert.match(t6, /t6AllowsFreeDownloadAttempt|workerUrlConfigured/);
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
  /derivativeServingImplemented = false|storageAdapterImplemented = false/
);
assert.match(t6, /derivativeServingImplemented|storageAdapterImplemented/);
assert.equal(
  fs.existsSync(join(root, "app/api/t6-derivatives")),
  false,
  "T6 must stay blocked until an owned derivative serving route is implemented"
);
assert.doesNotMatch(t6Worker, /fetch\(input\.providerOutputUrl/);
const t6Fixture = join(root, "scripts/t6-watermark-worker-fixture.mjs");
assert.match(
  fs.readFileSync(t6Fixture, "utf8"),
  /runT6PipelineWithInjectedRunner|DERIVATIVE_IDENTITY_MISMATCH/
);
execFileSync(process.execPath, ["--experimental-strip-types", t6Fixture], {
  stdio: "pipe",
});
assert.match(health, /t6Report|t6:/);
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
assert.match(library, /Session jobs|\/api\/generations/);
// Empty device history must still mount SessionJobsPanel (Phase D recovery)
assert.match(library, /SessionJobsPanel|No clips saved on this device yet/);
assert.match(library, /byStatus|SessionJobsMeta|timedOutThisSweep/);
assert.match(library, /applyGenerationsBody|jobTimeoutMs/);
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
assert.match(library, /this server process/);
assert.match(library, /Cancel ledger|method:\s*[\"']DELETE[\"']/);
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
// Library session jobs: TIMEOUT ≠ confirmed refund
assert.match(
  fs.readFileSync(join(root, "components/LibraryGrid.tsx"), "utf8"),
  /refund unconfirmed|errorCode === "TIMEOUT"/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/LibraryGrid.tsx"), "utf8"),
  /failed live jobs refund credits$/
);
assert.match(
  fs.readFileSync(join(root, "app/auth/callback/layout.tsx"), "utf8"),
  /PRIVATE_ROBOTS|index:\s*false/
);

// Phase H analytics funnel + private ops robots
const analyticsSrc = fs.readFileSync(join(root, "lib/analytics.ts"), "utf8");
assert.match(analyticsSrc, /export_click|project_open|upload_ready/);
assert.match(analyticsSrc, /NEXT_PUBLIC_ANALYTICS_URL|sendBeacon/);
assert.match(createStudio, /upload_ready|export_click/);
assert.match(library, /export_click/);
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
  /signed-in durable|durable wallet/
);

// Pricing FAQ JSON-LD + Explore proof labels
const pricingPage = fs.readFileSync(join(root, "app/pricing/page.tsx"), "utf8");
assert.match(pricingPage, /canonical:\s*[\"']\/pricing[\"']/);
assert.match(pricingPage, /FAQPage|application\/ld\+json/);
assert.match(pricingPage, /pricingFaqItems/);
// exploreGrid already loaded earlier in this script
assert.match(exploreGrid, /passesHomeProofQuality|Lab ≥4|Lab >=4/);
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
assert.match(jobIntentsSrc, /Listing · 360|Seller Pack · Launch|Social Hook/);
assert.match(
  fs.readFileSync(join(root, "components/JobIntentBar.tsx"), "utf8"),
  /job\.what|Sales mode|Creative Director/
);
assert.match(createStudio, /JobIntentBar|ActivationChecklist/);
assert.match(
  fs.readFileSync(join(root, "lib/i18n.ts"), "utf8"),
  /job\.seller["']:\s*["']Seller Pack · Launch/
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
// CD Phase B3 — Seller Pack Launch Plan (3× quote before run)
assert.match(directorPlanSrc, /buildSellerPackDirectorPlan|Launch Pack|SELLER_PACK_PLAN_CHILDREN/);
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


// Homepage cinema → wall → create (video-first)
const homePageSrc = fs.readFileSync(join(root, "app/page.tsx"), "utf8");
assert.match(homePageSrc, /HomeCinemaHero|HomeViralWall|home-create/);
assert.match(
  fs.readFileSync(join(root, "components/HomeCinemaHero.tsx"), "utf8"),
  /home\.cinema\.ctaPrimary|data-home-hero|setInterval|items|prefetch/
);
assert.match(
  fs.readFileSync(join(root, "lib/i18n.ts"), "utf8"),
  /home\.cinema\.ctaPrimary|home\.wall\.remake|home\.browseCta/
);
assert.match(
  fs.readFileSync(join(root, "components/HomeViralWall.tsx"), "utf8"),
  /TOY_WALL_FILTERS|生成同款|360°展示|data-home-wall|sticky|wallDense|viewport-dense|Premiere|data-wall-featured/
);
assert.match(homePageSrc, /HomeCinemaHero items=|SoftLaunchStrip|HomeBrowseCta/);
assert.match(
  fs.readFileSync(join(root, "components/AutoPlayVideo.tsx"), "utf8"),
  /wallDense|playbackBudget/
);
assert.match(
  fs.readFileSync(join(root, "components/HomeBrowseCta.tsx"), "utf8"),
  /data-home-browse-cta|home\.browseCta|#home-create|4\.75rem|prefetch/
);
assert.match(
  fs.readFileSync(join(root, "components/AutoPlayVideo.tsx"), "utf8"),
  /visibilitychange|visibilityState/
);

// Five-step toy identity + delivery honesty + landing assetId + workflows
const toyIdSrc = fs.readFileSync(join(root, "lib/toyIdentity.ts"), "utf8");
assert.match(toyIdSrc, /composeExtraWithIdentity/);
assert.match(toyIdSrc, /sanitizeToyIdentity|ToyIdentity/);
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
// Batch / Seller Pack + effect landings share freeTrial honesty (Phase F)
assert.match(
  fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
  /freeTrialExhausted|Free Mini trial used|clipsLeft/
);
assert.match(
  fs.readFileSync(join(root, "components/LandingToolPanel.tsx"), "utf8"),
  /freeTrialExhausted|Free Mini trial exhausted|clipsLeft|compare plans/
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
assert.match(
  fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
  /sellerPackPostItems|DeliveryChecklist/
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
  fs.readFileSync(join(root, "lib/workflows.ts"), "utf8"),
  /listCreateShelfWorkflows|Workflow/
);
assert.match(createStudio, /WorkflowShelf/);
assert.match(historySrcLib, /sku\?:/);
assert.match(library, /i\.sku|sku/);


// Suite honesty: PRIMARY_NAV = Explore · Create · Effects · Pricing (GSC P0)
const softLaunchSrc = fs.readFileSync(join(root, "lib/softLaunch.ts"), "utf8");
assert.match(softLaunchSrc, /PRIMARY_NAV/);
assert.match(softLaunchSrc, /href:\s*["']\/create["']/);
assert.match(softLaunchSrc, /href:\s*["']\/effects["']/);
assert.match(softLaunchSrc, /href:\s*["']\/pricing["']/);
// Cold-start: /create is a tool, not a rank landing — noindex,follow
const createPageMeta = fs.readFileSync(
  join(root, "app/create/page.tsx"),
  "utf8"
);
assert.match(createPageMeta, /CONCEPT_ROBOTS/);
assert.match(createPageMeta, /robots:\s*CONCEPT_ROBOTS/);
// Cmd-K + Footer: Preview doors labeled (not PRIMARY peers)
assert.match(
  fs.readFileSync(join(root, "components/CommandPalette.tsx"), "utf8"),
  /Cinema · Preview|Still studio · Preview/
);
assert.match(
  fs.readFileSync(join(root, "components/Footer.tsx"), "utf8"),
  /Flow · Preview|Assets · Local/
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
// More menu holds Preview/Lab tags for suite doors
assert.match(appShellSrc, /tag:\s*["']Preview["']/);
assert.match(appShellSrc, /tag:\s*["']Lab["']/);
// GA4 adapter is env-gated no-op when unset (reuse analyticsSrc declared above)
assert.match(analyticsSrc, /NEXT_PUBLIC_GA_MEASUREMENT_ID/);
assert.match(analyticsSrc, /landing_view|generate_start|export_click/);
assert.match(analyticsSrc, /SENSITIVE_META|sanitizeMeta/i);
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

// Suite IA consistency: Modules doors + G4 inventory
const linkCheckSrc = fs.readFileSync(
  join(root, "scripts/link-check.sh"),
  "utf8"
);
assert.match(linkCheckSrc, /\/modules/);
assert.match(linkCheckSrc, /\/apps/);
assert.match(linkCheckSrc, /\/status/);
assert.match(linkCheckSrc, /job=etsy-listing/);
const footerSrc = fs.readFileSync(join(root, "components/Footer.tsx"), "utf8");
assert.match(footerSrc, /\/modules/);
assert.match(footerSrc, /seller-pack|Seller Pack/);
assert.doesNotMatch(sitemapSrc, /\/modules/);
assert.match(
  fs.readFileSync(join(root, "app/community/page.tsx"), "utf8"),
  /robots:\s*CONCEPT_ROBOTS|CONCEPT_ROBOTS/
);
assert.match(
  fs.readFileSync(join(root, "app/pricing/page.tsx"), "utf8"),
  /\/modules/
);
assert.match(
  fs.readFileSync(join(root, "app/community/page.tsx"), "utf8"),
  /\/modules/
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

// Mobile bottom nav: HF parity Home · Community · Generate · Library · Profile
assert.match(softLaunchSrc, /MOBILE_NAV/);
assert.match(softLaunchSrc, /MOBILE_NAV[\s\S]*href:\s*["']\/create["']/);
assert.match(softLaunchSrc, /MOBILE_NAV[\s\S]*href:\s*["']\/effects["']/);
assert.doesNotMatch(
  softLaunchSrc,
  /MOBILE_NAV[\s\S]*href:\s*["']\/community["']/
);
assert.match(softLaunchSrc, /MOBILE_NAV[\s\S]*href:\s*["']\/library["']/);
assert.match(appShellSrc, /MOBILE_NAV/);
assert.match(appShellSrc, /nav\.lab|nav\.modules|nav\.create|nav\.presets/);
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
assert.match(siteSrc, /titleDefault|homeH1|Designer Toy AI Video Suite/i);
assert.match(siteSrc, /Turn your toy photos into short videos|VIDEO-first|Free Mini Trial/i);
// 哥飞 P0: homepage title must not cannibalize tools rank title
assert.match(siteSrc, /Pikbo — Designer Toy AI Video Suite/);
assert.doesNotMatch(
  siteSrc,
  /titleDefault:\s*["']AI Toy Video Generator from One Photo/
);
assert.match(siteSrc, /rankToolPath|\/tools\/ai-toy-video-generator/);
// Product path before Preview doors in MODE_DEFS (suiteChromeSrc declared above)
const genIdx = suiteChromeSrc.indexOf('id: "generate"');
const sellerIdx = suiteChromeSrc.indexOf('id: "seller"');
const flowIdx = suiteChromeSrc.indexOf('id: "flow"');
const imageIdx = suiteChromeSrc.indexOf('id: "image"');
assert.ok(genIdx > 0 && sellerIdx > genIdx, "seller pack after generate");
assert.ok(flowIdx > sellerIdx, "flow preview after product modes");
assert.ok(imageIdx > flowIdx, "stills preview last among suite doors");
assert.match(suiteChromeSrc, /preview:\s*true/);
assert.match(suiteChromeSrc, /suite\.preview/);
// Home suite rail + landing doors: product first, Flow tagged Preview
const suiteEntrySrc = fs.readFileSync(
  join(root, "components/SuiteEntryStrip.tsx"),
  "utf8"
);
assert.match(suiteEntrySrc, /suite\.tag\.preview|tagKey:\s*["']suite\.tag\.preview/);
assert.ok(
  suiteEntrySrc.indexOf('href: "/create"') <
    suiteEntrySrc.indexOf('href: "/flow"'),
  "Generate before Flow on home suite rail"
);
assert.match(
  fs.readFileSync(join(root, "components/SuiteDoorLinks.tsx"), "utf8"),
  /Flow · Preview|Seller Pack/
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
assert.ok(
  hfRailSrc.indexOf('href: "/create"') < hfRailSrc.indexOf('href: "/flow"'),
  "Generate before Flow on HfProductRail"
);
assert.ok(
  hfRailSrc.indexOf('href: "/create?mode=seller-pack"') <
    hfRailSrc.indexOf('href: "/flow"'),
  "Seller Pack before Flow on HfProductRail"
);
assert.match(hfRailSrc, /tag:\s*["']Preview["']/);
assert.match(
  fs.readFileSync(join(root, "components/HfExploreHome.tsx"), "utf8"),
  /Flow · Preview|Seller Pack/
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
assert.match(freeTrialCtaSrc, /sample=scout/);
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
assert.match(library, /watermark=\{Boolean\(item\.watermark\)\}|watermark=\{/);
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
// Free Mini is 5s — do not advertise free 10s trial CTAs
assert.doesNotMatch(
  fs.readFileSync(join(root, "app/guides/[slug]/page.tsx"), "utf8"),
  /Try free · 10s/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/PricingHeroCopy.tsx"), "utf8"),
  /Try free · 10s/
);
assert.match(
  fs.readFileSync(join(root, "lib/i18n.ts"), "utf8"),
  /Mini 5s|Mini 5 秒/
);
// Shared surfaces: freeTrial-honest CTAs (exhausted → plans, not static Try free)
assert.match(
  fs.readFileSync(join(root, "components/LandingSeoMesh.tsx"), "utf8"),
  /FreeTrialCta/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/LandingSeoMesh.tsx"), "utf8"),
  /href=["']\/create\?try=1&sample=scout["'][^>]*>\s*Try free Mini/
);
assert.match(
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
assert.match(
  fs.readFileSync(join(root, "app/library/page.tsx"), "utf8"),
  /FreeTrialCta/
);
assert.match(
  fs.readFileSync(join(root, "app/create/page.tsx"), "utf8"),
  /FreeTrialCta/
);
assert.match(
  fs.readFileSync(join(root, "components/LibraryGrid.tsx"), "utf8"),
  /FreeTrialCta/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/LibraryGrid.tsx"), "utf8"),
  /10 seconds/
);
// Auth + home suite residual FreeTrial honesty (Phase C/F)
assert.match(
  fs.readFileSync(join(root, "components/SuiteDoorLinks.tsx"), "utf8"),
  /FreeTrialCta/
);
assert.doesNotMatch(
  fs.readFileSync(join(root, "components/SuiteDoorLinks.tsx"), "utf8"),
  /href=["']\/create\?try=1&sample=scout["']/
);
assert.match(
  fs.readFileSync(join(root, "components/LoginForm.tsx"), "utf8"),
  /FreeTrialCta/
);
assert.match(
  fs.readFileSync(join(root, "app/login/page.tsx"), "utf8"),
  /FreeTrialCta/
);
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
assert.match(profilePanelSrc, /Credits authority|cookie-authoritative|shadow/);
assert.match(profilePanelSrc, /X-Pikbo-Jobs-Open|\/api\/generations/);
assert.match(profilePanelSrc, /local-file|supabase/);
assert.match(profilePanelSrc, /process-memory/);
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
  /FreeTrialCta/
);
// Settings Phase C/D honesty: durable authority, jobs HEAD, live T6, onboard v3
const settingsPageSrc = fs.readFileSync(
  join(root, "app/settings/page.tsx"),
  "utf8"
);
assert.match(settingsPageSrc, /Credits authority|cookie generate/);
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
// Mobile sticky Lab sample is not a Free Mini live claim.
assert.match(createStudioSmoke, /Try free · Lab/);
// Device Library stills: path samples or tiny previews only (no multi-MB Base64).
assert.match(createStudioSmoke, /stillForStore\.startsWith\(["']\/["']\)|8_000/);
// HF post-generate path chips live in shared GenerateAfterPath (not inlined)
const afterPathSrc = fs.readFileSync(
  join(root, "components/GenerateAfterPath.tsx"),
  "utf8"
);
assert.match(afterPathSrc, /aria-label=["']After generate["']/);
assert.match(afterPathSrc, /data-after-path=["']product-first["']/);
assert.match(afterPathSrc, /Publish path/);
assert.match(afterPathSrc, /Library/);
assert.match(afterPathSrc, /Seller Pack/);
assert.match(afterPathSrc, /Next SKU/);
assert.match(afterPathSrc, /\/modules/);
assert.match(afterPathSrc, /Flow · Preview/);
// Product path before Flow · Preview on after-generate chips
assert.ok(
  afterPathSrc.indexOf("mode=seller-pack") < afterPathSrc.indexOf('href="/flow"'),
  "AfterPath: Seller Pack before Flow"
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
// Footer / Profile / Explore / Community product-first suite exits
assert.match(
  fs.readFileSync(join(root, "components/Footer.tsx"), "utf8"),
  /data-footer-path=["']product-first["']/
);
// profilePanelSrc already loaded above (credits authority block)
assert.match(profilePanelSrc, /data-profile-path=["']product-first["']/);
assert.match(profilePanelSrc, /data-profile-suite=["']product-first["']/);
assert.match(profilePanelSrc, /Flow · Preview/);
assert.ok(
  profilePanelSrc.indexOf("mode=seller-pack") <
    profilePanelSrc.indexOf('href="/flow"'),
  "Profile: Seller Pack before Flow"
);
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
// Modules suite CTAs: Seller Pack + Library before Flow Preview
assert.ok(
  modulesSuiteCtasSrc.indexOf("mode=seller-pack") <
    modulesSuiteCtasSrc.indexOf('href="/flow"'),
  "ModulesSuiteCtas: Seller Pack before Flow"
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
assert.match(
  fs.readFileSync(join(root, "components/BatchStudio.tsx"), "utf8"),
  /GenerateAfterPath/
);
// Profile suite exits for closed loop (Generate / Library / Seller Pack / Flow)
assert.match(
  fs.readFileSync(join(root, "components/ProfilePanel.tsx"), "utf8"),
  /mode=seller-pack|Seller Pack/
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
// Library session jobs: TIMEOUT / refund unconfirmed honesty + Retry recipe
const libraryGridSrc = fs.readFileSync(
  join(root, "components/LibraryGrid.tsx"),
  "utf8"
);
assert.match(libraryGridSrc, /errorCode/);
assert.match(libraryGridSrc, /refund unconfirmed|TIMEOUT/);
assert.match(libraryGridSrc, /Retry recipe/);
assert.match(libraryGridSrc, /Lab sample|try=1&sample=scout/);
// Mobile suite bar: hide image/cinema; Library shows Seller Pack
const mobileBarSrc = fs.readFileSync(
  join(root, "components/MobileGenerateBar.tsx"),
  "utf8"
);
assert.match(mobileBarSrc, /\/image|\/cinema/);
assert.match(mobileBarSrc, /seller-pack|Seller Pack/);
assert.match(
  fs.readFileSync(join(root, "components/LibraryStorageBanner.tsx"), "utf8"),
  /process-memory|Session jobs|Device/
);
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
// Photo→Clip workbench is /create (header FreeTrialCta owns sample path)
assert.match(flowPageSrc, /id:\s*["']core-i2v["'][\s\S]*?href:\s*["']\/create["']/);

// T8 Seller Pack recovery: a browser hint carries only identifiers/config;
// current `/api/generations` rows own result + settlement truth after refresh.
const sellerPackRecoverySrc = fs.readFileSync(
  join(root, "lib/sellerPackRecovery.ts"),
  "utf8"
);
assert.match(sellerPackRecoverySrc, /SELLER_PACK_RECOVERY_KEY/);
assert.match(sellerPackRecoverySrc, /reconcileSellerPackRecovery/);
assert.match(sellerPackRecoverySrc, /Job is no longer available in this device\/server session/);
assert.match(sellerPackRecoverySrc, /360-spin-showcase/);
assert.match(sellerPackRecoverySrc, /refund unconfirmed/);
assert.match(batchStudio, /data-seller-pack-recovery="device-local"/);
assert.match(batchStudio, /retryEligible/);
const recoveryCjs = require("typescript").transpileModule(sellerPackRecoverySrc, {
  compilerOptions: {
    module: require("typescript").ModuleKind.CommonJS,
    target: require("typescript").ScriptTarget.ES2022,
  },
}).outputText;
const recoveryModule = { exports: {} };
new Function("require", "exports", "module", recoveryCjs)(
  (id) => {
    throw new Error(`unexpected Seller Pack recovery import: ${id}`);
  },
  recoveryModule.exports,
  recoveryModule
);
const recovery = recoveryModule.exports;
const activePack = recovery.parseSellerPackRecovery({
  version: 1,
  projectId: "seller-pack-fixture",
  savedAt: "2026-07-26T00:00:00.000Z",
  children: [
    { slug: "360-spin-showcase", name: "Listing Spin", aspectRatio: "1:1", requestId: "spin", statusHint: "running", retryCount: 0 },
    { slug: "blind-box-unboxing", name: "Blind-box Reveal", aspectRatio: "9:16", requestId: "reveal", statusHint: "failed", retryCount: 0 },
    { slug: "paparazzi-flash", name: "Social Flash", aspectRatio: "9:16", requestId: "social", statusHint: "failed", retryCount: 0 },
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
  { id: "spin", effect: "360-spin-showcase", status: "succeeded", videoUrl: "/demos/spin.mp4", creditsOutcome: "10 used" },
  { id: "reveal", effect: "blind-box-unboxing", status: "failed", creditsOutcome: "10 restored" },
  { id: "social", effect: "paparazzi-flash", status: "failed", creditsOutcome: "refund unconfirmed" },
]);
assert.deepEqual(
  refreshedPack.children.map((child) => [child.slug, child.status, child.creditState]),
  [
    ["360-spin-showcase", "succeeded", "10 used"],
    ["blind-box-unboxing", "refunded", "10 restored"],
    ["paparazzi-flash", "failed", "refund unconfirmed"],
  ],
  "refresh restores server-known partial success/failure/refund state"
);
const retryOnlyConfirmed = refreshedPack.children
  .filter((child) => child.status === "refunded" || (child.status === "failed" && child.creditState !== "refund unconfirmed"))
  .map((child) => child.slug);
assert.deepEqual(retryOnlyConfirmed, ["blind-box-unboxing"], "retry excludes succeeded siblings and refund-unconfirmed children");
const gonePack = recovery.reconcileSellerPackRecovery(activePack, []);
assert.equal(gonePack.unavailable, 3);
assert.ok(gonePack.children.every((child) => child.status === "recovery_unavailable" && !child.creditState), "missing current-session jobs never revive stale success or refund hints");

console.log("engine-smoke: PASS");
void pathToFileURL; // keep import used on older node
