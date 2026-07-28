/**
 * T5 + R0 critical-path integration (no network, no secrets).
 *
 * Covers DISPATCH Grok priorities:
 * 1) T5 durable engine refund/idempotency contracts
 * 2) R0 anonymous cost gate fail-closed (generate + image routes)
 * 3) Failure release / refundUnconfirmed honesty source locks
 * 4) Auth magic-link NOT_CONFIGURED without Supabase keys
 *
 * Run: npm run t5-r0-critical-path
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  invokeReservedProvider,
  liveGenerationAccess,
} from "../lib/liveGenerationGate.mjs";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

// ─── R0 pure gate ─────────────────────────────────────────────────────────

let providerCalls = 0;
const provider = async () => {
  providerCalls += 1;
  return "ok";
};

// Even with FAL configured, anonymous stays cached.
assert.deepEqual(
  liveGenerationAccess({
    providerConfigured: true,
    authenticated: false,
    planId: "free",
    freeDeliveryReady: false,
  }),
  { kind: "cached", reason: "anonymous_cached_only" }
);

// Free authenticated without T6 delivery stays cached.
assert.deepEqual(
  liveGenerationAccess({
    providerConfigured: true,
    authenticated: true,
    planId: "free",
    freeDeliveryReady: false,
  }),
  { kind: "cached", reason: "free_live_delivery_blocked" }
);

// Paid + authed + provider → live allowed at gate layer.
assert.deepEqual(
  liveGenerationAccess({
    providerConfigured: true,
    authenticated: true,
    planId: "creator",
    freeDeliveryReady: false,
  }),
  { kind: "live" }
);

await assert.rejects(
  () => invokeReservedProvider(null, provider),
  /LIVE_PROVIDER_REQUIRES_DURABLE_RESERVATION/
);
assert.equal(providerCalls, 0, "provider must not run without reservation");

await assert.rejects(
  () =>
    invokeReservedProvider(
      {
        reservationId: "res-ok-12345",
        status: "settled",
        providerAuthorized: true,
      },
      provider
    ),
  /LIVE_PROVIDER_REQUIRES_DURABLE_RESERVATION/
);
assert.equal(providerCalls, 0, "settled reservation cannot invoke provider");

const liveResult = await invokeReservedProvider(
  {
    reservationId: "res-ok-12345",
    status: "reserved",
    providerAuthorized: true,
  },
  provider
);
assert.equal(liveResult, "ok");
assert.equal(providerCalls, 1);

// ─── Generate route: R0 + refund + idempotency source locks ───────────────

const gen = read("app/api/generate/route.ts");

// Access decision before live reserve / fal
const accessIdx = gen.indexOf("liveGenerationAccess({");
const reserveIdx = gen.indexOf("reserveStrictLiveGeneration({");
const falIdx = gen.indexOf("fal.config({");
assert.ok(accessIdx > 0, "generate uses liveGenerationAccess");
assert.ok(reserveIdx > accessIdx, "access before reserve");
assert.ok(falIdx > reserveIdx, "fal.config only after reserve path");

// Cached path never charges
assert.match(gen, /access\.kind === "cached"/);
assert.match(gen, /creditsOutcome:\s*"0 cached"/);
assert.match(
  gen,
  /Cost gate: anonymous users and Free accounts always receive an official/
);

// Live requires auth + idempotency
assert.match(gen, /Live generation requires a stable idempotency key/);
assert.match(gen, /findJobByIdempotencyKey/);

// Failure paths release reservation and honest refund flags
assert.match(gen, /releaseStrictLiveGeneration/);
assert.match(gen, /creditsRefunded:\s*released/);
assert.match(gen, /refundUnconfirmed:\s*true/);
assert.match(gen, /releaseReservation\("invalid_image"\)/);
assert.match(gen, /releaseReservation\("empty_image"\)/);
assert.match(gen, /releaseReservation\("force_fail"\)/);
// Never invent "10 used" on capture/release failure
assert.doesNotMatch(
  gen,
  /if\s*\(\s*!captured\.ok\s*\)[\s\S]{0,500}creditsOutcome:\s*"10 used"/
);

// Idempotent success replay
assert.match(gen, /prior\.status === "succeeded"/);
assert.match(gen, /successFromJob\(prior/);

// ─── Image route: R0 parity ───────────────────────────────────────────────

const img = read("app/api/image/route.ts");
assert.match(img, /liveGenerationAccess\(/);
assert.match(img, /anonymous_cached_only|free_trial_video_only|cached/);
assert.match(img, /invokeReservedProvider\(/);
assert.doesNotMatch(img, /deductCredits\(\s*session/);
assert.match(img, /releaseStrictLiveGeneration|settleStrictLiveGeneration/);

// ─── Auth magic-link fail-closed without keys ─────────────────────────────

const magic = read("app/api/auth/magic-link/route.ts");
assert.match(magic, /isSupabaseConfigured\(\)/);
assert.match(magic, /NOT_CONFIGURED/);
assert.match(magic, /status:\s*503/);

const claim = read("app/api/auth/claim/route.ts");
assert.match(claim, /migrate|guest|display|balance/i);
// Claim must not assert cookie is live-spend authority
assert.doesNotMatch(claim, /cookie is generate authority|soft-launch generate-authority/i);

// ─── T5 pure engine: refund (release) + idempotent settle ─────────────────

const engineUrl = pathToFileURL(join(root, "lib/durableCredits/engine.ts")).href;
const {
  emptyState,
  createPersonalAccount,
  grantCredits,
  reserveCredits,
  settleReservationItem,
  releaseReservationItem,
} = await import(engineUrl);

let state = emptyState();
state = createPersonalAccount(state, {
  userId: "u-crit",
  accountId: "a-crit",
  initialAvailable: 0,
  planId: "creator",
}).state;
state = grantCredits(state, {
  accountId: "a-crit",
  credits: 20,
  sourceType: "smoke",
  sourceId: "g1",
  idempotencyKey: "crit-grant",
}).state;

// Fail path: reserve then release restores balance
const r1 = reserveCredits(state, {
  accountId: "a-crit",
  createdBy: "u-crit",
  purpose: "generation",
  quotedCredits: 10,
  idempotencyKey: "crit-res-fail",
});
assert.equal(r1.ok, true);
state = r1.state;
const rel = releaseReservationItem(state, {
  reservationId: r1.data.reservation.id,
  credits: 10,
  idempotencyKey: "crit-rel-fail",
  reason: "provider_failed",
});
assert.equal(rel.ok, true);
state = rel.state;
assert.equal(state.wallets["a-crit"].availableCredits, 20);
assert.equal(state.wallets["a-crit"].reservedCredits, 0);
assert.equal(state.wallets["a-crit"].lifetimeUsedCredits, 0);

// Success path + idempotent settle
const r2 = reserveCredits(state, {
  accountId: "a-crit",
  createdBy: "u-crit",
  purpose: "generation",
  quotedCredits: 10,
  idempotencyKey: "crit-res-ok",
});
assert.equal(r2.ok, true);
state = r2.state;
const s1 = settleReservationItem(state, {
  reservationId: r2.data.reservation.id,
  credits: 10,
  idempotencyKey: "crit-settle-ok",
});
assert.equal(s1.ok, true);
state = s1.state;
const s2 = settleReservationItem(state, {
  reservationId: r2.data.reservation.id,
  credits: 10,
  idempotencyKey: "crit-settle-ok",
});
assert.equal(s2.ok, true);
state = s2.state;
assert.equal(state.wallets["a-crit"].lifetimeUsedCredits, 10);
assert.equal(state.wallets["a-crit"].availableCredits, 10);

// ─── CI template must keep fail-closed critical-path ──────────────────────

const ci = read("docs/ci/github-actions-ci.yml");
assert.match(ci, /t5-auth-credits-smoke|t5-r0-critical-path/);
assert.match(ci, /recovery-qa/);
assert.match(ci, /npm run critical-path/);
assert.doesNotMatch(ci, /critical-path\s*\|\|\s*true/);

console.log(
  "t5-r0-critical-path: PASS (R0 gate · generate/image source locks · refund honesty · engine release/settle idempotency · magic-link NOT_CONFIGURED · CI fail-closed template)"
);
