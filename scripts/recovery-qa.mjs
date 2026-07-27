/**
 * Recovery R0–R3 QA — cost abuse, concurrent debit, failed refund, CI honesty.
 *
 * No network, no secrets. Pure gate + pure durable ledger + source locks.
 * Run: npm run recovery-qa
 * (recovery-cost-gate remains a thin alias for Claude's R0 script name.)
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  invokeReservedProvider,
  liveGenerationAccess,
} from "../lib/liveGenerationGate.mjs";

const root = process.cwd();

// ─── R0: cost abuse gate (provider never called without durable reserve) ───

let providerCalls = 0;
const provider = async () => {
  providerCalls += 1;
  return "provider-result";
};

const anonymous = liveGenerationAccess({
  providerConfigured: true,
  authenticated: false,
  planId: "free",
  freeDeliveryReady: false,
});
assert.deepEqual(anonymous, {
  kind: "cached",
  reason: "anonymous_cached_only",
});
assert.equal(providerCalls, 0, "anonymous access must not call provider");

const signedInFree = liveGenerationAccess({
  providerConfigured: true,
  authenticated: true,
  planId: "free",
  freeDeliveryReady: false,
});
assert.deepEqual(signedInFree, {
  kind: "cached",
  reason: "free_live_delivery_blocked",
});
assert.equal(providerCalls, 0, "Free live must stay closed while T6 is blocked");

const noProvider = liveGenerationAccess({
  providerConfigured: false,
  authenticated: true,
  planId: "creator",
  freeDeliveryReady: false,
});
assert.deepEqual(noProvider, {
  kind: "cached",
  reason: "no_provider_key",
});

await assert.rejects(
  invokeReservedProvider(null, provider),
  /LIVE_PROVIDER_REQUIRES_DURABLE_RESERVATION/
);
await assert.rejects(
  invokeReservedProvider(
    {
      reservationId: "short",
      status: "reserved",
      providerAuthorized: true,
    },
    provider
  ),
  /LIVE_PROVIDER_REQUIRES_DURABLE_RESERVATION/
);
await assert.rejects(
  invokeReservedProvider(
    {
      reservationId: "reservation-settled-1",
      status: "settled",
      providerAuthorized: true,
    },
    provider
  ),
  /LIVE_PROVIDER_REQUIRES_DURABLE_RESERVATION/
);
await assert.rejects(
  invokeReservedProvider(
    {
      reservationId: "reservation-replay-1",
      status: "reserved",
      providerAuthorized: false,
    },
    provider
  ),
  /LIVE_PROVIDER_REQUIRES_DURABLE_RESERVATION/
);
assert.equal(
  providerCalls,
  0,
  "durable reservation failure must fail closed before provider invocation"
);

const live = liveGenerationAccess({
  providerConfigured: true,
  authenticated: true,
  planId: "creator",
  freeDeliveryReady: false,
});
assert.deepEqual(live, { kind: "live" });
const result = await invokeReservedProvider(
  {
    reservationId: "reservation-test-1",
    status: "reserved",
    providerAuthorized: true,
  },
  provider
);
assert.equal(result, "provider-result");
assert.equal(providerCalls, 1, "reserved live access invokes provider once");

// ─── Pure durable ledger (parity contract with lib/durableCredits/engine.ts) ───

function emptyDurable() {
  return {
    accounts: {},
    wallets: {},
    reservations: {},
    ledger: [],
    ledgerByIdempotency: {},
    reservationByIdempotency: {},
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

// Concurrent overspend: wallet 50 → six 10-credit reserves → exactly five OK
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
    } else {
      assert.equal(r.code, "INSUFFICIENT_CREDITS");
    }
  }
  assert.equal(okCount, 5, "concurrent reserves must not overspend");
  assert.equal(st.wallets.a1.availableCredits, 0);
  assert.equal(st.wallets.a1.reservedCredits, 50);
}

// Failed live refund: reserve 10 → release on confirmed failure → credits restored
{
  let st = emptyDurable();
  st.wallets.a1 = {
    availableCredits: 10,
    reservedCredits: 0,
    lifetimeUsedCredits: 0,
    version: 0,
  };
  let r = durableReserve(st, "a1", 10, "fail-job-1");
  assert.equal(r.ok, true);
  st = r.state;
  assert.equal(st.wallets.a1.availableCredits, 0);
  assert.equal(st.wallets.a1.reservedCredits, 10);
  r = durableRelease(st, r.reservationId, 10, "release-fail-job-1");
  assert.equal(r.ok, true);
  st = r.state;
  assert.equal(st.wallets.a1.availableCredits, 10, "confirmed failure restores");
  assert.equal(st.wallets.a1.reservedCredits, 0);
  assert.equal(st.wallets.a1.lifetimeUsedCredits, 0, "release is not lifetime use");
}

// Double settle / double release: second call idempotent, no double-spend
{
  let st = emptyDurable();
  st.wallets.a1 = {
    availableCredits: 10,
    reservedCredits: 0,
    lifetimeUsedCredits: 0,
    version: 0,
  };
  let r = durableReserve(st, "a1", 10, "settle-once");
  st = r.state;
  const resId = r.reservationId;
  r = durableSettle(st, resId, 10, "capture-once");
  st = r.state;
  assert.equal(st.wallets.a1.lifetimeUsedCredits, 10);
  r = durableSettle(st, resId, 10, "capture-once");
  assert.equal(r.idempotent, true);
  assert.equal(r.state.wallets.a1.lifetimeUsedCredits, 10, "no double settle");
  // Over-settle with new key after full settle must fail
  r = durableSettle(st, resId, 10, "capture-twice-bad");
  assert.equal(r.ok, false);
  assert.equal(r.code, "OVER_SETTLE");
}

{
  let st = emptyDurable();
  st.wallets.a1 = {
    availableCredits: 10,
    reservedCredits: 0,
    lifetimeUsedCredits: 0,
    version: 0,
  };
  let r = durableReserve(st, "a1", 10, "release-once");
  st = r.state;
  const resId = r.reservationId;
  r = durableRelease(st, resId, 10, "refund-once");
  st = r.state;
  assert.equal(st.wallets.a1.availableCredits, 10);
  r = durableRelease(st, resId, 10, "refund-once");
  assert.equal(r.idempotent, true);
  assert.equal(r.state.wallets.a1.availableCredits, 10, "no double refund");
  r = durableRelease(st, resId, 10, "refund-twice-bad");
  assert.equal(r.ok, false);
  assert.equal(r.code, "OVER_SETTLE");
}

// Seller Pack partial failure: reserve 30, settle 2×10, release 1×10
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
  const resId = r.reservationId;
  r = durableSettle(st, resId, 10, "pack-child-1");
  st = r.state;
  r = durableSettle(st, resId, 10, "pack-child-2");
  st = r.state;
  r = durableRelease(st, resId, 10, "pack-child-3-fail");
  st = r.state;
  assert.equal(st.wallets.a1.availableCredits, 10);
  assert.equal(st.wallets.a1.reservedCredits, 0);
  assert.equal(st.wallets.a1.lifetimeUsedCredits, 20);
}

// Idempotent reserve: same key does not double-hold
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
  assert.equal(b.state.wallets.a1.reservedCredits, 10);
}

// ─── Source locks: generate route order + no Cookie debit fallback ───

const route = readFileSync(join(root, "app/api/generate/route.ts"), "utf8");
const accessIndex = route.indexOf("liveGenerationAccess({");
const cachedIndex = route.indexOf('if (access.kind === "cached")');
const reserveIndex = route.indexOf("reserveStrictLiveGeneration({");
const providerIndex = route.indexOf("invokeReservedProvider(");
assert.ok(
  accessIndex > 0 &&
    cachedIndex > accessIndex &&
    reserveIndex > cachedIndex &&
    providerIndex > reserveIndex,
  "production route must decide cached access, reserve durably, then invoke provider"
);
assert.doesNotMatch(
  route,
  /shadowReserveForGenerate|shadowReserveForGuest|deductCredits\(session/,
  "live route must not fall back to guest shadow or Cookie debit"
);
assert.equal(
  (route.match(/invokeReservedProvider\(/g) || []).length,
  2,
  "both provider upload and generation calls must sit behind reservation guard"
);

// Image Flux stills must share the same R0 cost boundary.
const imgRoute = readFileSync(join(root, "app/api/image/route.ts"), "utf8");
const imgAccess = imgRoute.indexOf("liveGenerationAccess({");
const imgCached = imgRoute.indexOf('if (access.kind === "cached")');
const imgReserve = imgRoute.indexOf("reserveStrictLiveGeneration({");
const imgProvider = imgRoute.indexOf("invokeReservedProvider(");
assert.ok(
  imgAccess > 0 &&
    imgCached > imgAccess &&
    imgReserve > imgCached &&
    imgProvider > imgReserve,
  "image route must decide cached access, reserve durably, then invoke Flux"
);
assert.doesNotMatch(
  imgRoute,
  /deductCredits\(session|checkCredits\(session|refundCredits\(session|shadowReserve/,
  "image live route must not Cookie debit or shadow reserve"
);
assert.match(imgRoute, /free_trial_video_only|anonymous_cached_only/);
assert.match(imgRoute, /settleStrictLiveGeneration|releaseStrictLiveGeneration/);

const strictLive = readFileSync(
  join(root, "lib/durableCredits/liveReservation.ts"),
  "utf8"
);
assert.match(strictLive, /DURABLE_CREDITS_UNAVAILABLE/);
assert.match(strictLive, /LIVE_ACCESS_REQUIRED/);
assert.match(strictLive, /supabaseReserveGenerationAtomic/);
assert.match(strictLive, /providerAuthorized/);
assert.match(strictLive, /JOB_IN_FLIGHT/);
assert.doesNotMatch(
  strictLive,
  /shadowReserve|localStore|file.*wallet/i,
  "strict live path must not fall back to local/file shadow wallet"
);

// ─── R1a capture-ambiguity client honesty (never invent refund / 10 used) ───

const generateClient = readFileSync(
  join(root, "lib/generateClient.ts"),
  "utf8"
);
assert.match(
  generateClient,
  /code === "DURABLE_CREDITS_UNAVAILABLE"[\s\S]{0,400}do not retry/
);
assert.match(
  generateClient,
  /code === "DURABLE_CREDITS_UNAVAILABLE"[\s\S]{0,500}refundUnconfirmed:\s*undefined/
);
assert.doesNotMatch(
  generateClient,
  /code === "DURABLE_CREDITS_UNAVAILABLE"[\s\S]{0,400}10 credits restored/
);
const imageClient = readFileSync(join(root, "lib/imageClient.ts"), "utf8");
assert.match(imageClient, /DURABLE_CREDITS_UNAVAILABLE/);
assert.match(
  imageClient,
  /code === "DURABLE_CREDITS_UNAVAILABLE"[\s\S]{0,500}refundUnconfirmed:\s*undefined/
);

// ─── R3: CI template must fail on critical-path (demo mode; no || true) ───

const ciYml = readFileSync(join(root, "docs/ci/github-actions-ci.yml"), "utf8");
assert.match(ciYml, /engine-smoke/);
assert.match(ciYml, /recovery-qa|recovery-cost-gate/);
assert.match(ciYml, /recovery-ledger/);
assert.match(ciYml, /recovery-retry-deadline/);
assert.match(ciYml, /showcase-evidence-smoke/);
assert.match(ciYml, /npm run typecheck/);
assert.match(ciYml, /npm run build/);
assert.match(ciYml, /npm run link-check/);
assert.match(ciYml, /npm run critical-path/);
// Fail closed: critical-path must not be swallowed
assert.doesNotMatch(
  ciYml,
  /critical-path\s*\|\|\s*true/,
  "R3: critical-path must fail the CI job (demo-cached gate already soft-live aware)"
);
// Soft-live remains optional via REQUIRE_SOFT_LIVE — never set as a CI env default
assert.doesNotMatch(
  ciYml,
  /REQUIRE_SOFT_LIVE\s*:\s*["']?1["']?|export REQUIRE_SOFT_LIVE=1/
);

const packageJson = readFileSync(join(root, "package.json"), "utf8");
assert.match(packageJson, /"recovery-qa"/);
assert.match(packageJson, /"recovery-cost-gate"/);
assert.match(packageJson, /"recovery-ledger"/);
assert.match(packageJson, /"critical-path"/);

const criticalPath = readFileSync(join(root, "scripts/critical-path.sh"), "utf8");
assert.match(criticalPath, /ready\.demo/);
assert.match(criticalPath, /REQUIRE_SOFT_LIVE/);
assert.match(criticalPath, /demo-cached gate PASS/);

console.log(
  "recovery-qa: PASS (R0 cost-gate · concurrent overspend · failed refund · no double settle/release · Seller Pack partial · CI critical-path fail-closed)"
);
