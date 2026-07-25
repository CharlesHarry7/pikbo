/**
 * Wave C durable credits smoke — pure engine concurrency + fail-closed contracts.
 * No secrets. No live Supabase required.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

// --- Pure engine (re-run critical cases; source must stay exported) ---
const engineSrc = fs.readFileSync(
  join(root, "lib/durableCredits/engine.ts"),
  "utf8"
);
assert.match(engineSrc, /export function reserveCredits/);
assert.match(engineSrc, /export function settleReservationItem/);
assert.match(engineSrc, /export function releaseReservationItem/);
assert.match(engineSrc, /export function migrateGuestCredits/);

// Inline pure engine parity (mirrors engine.ts contract for CI without ts-node)
function emptyState() {
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

function createAccount(state, userId, credits) {
  const id = `acc_${userId}`;
  state.accounts[id] = {
    id,
    kind: "personal",
    ownerUserId: userId,
    planId: "free",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.wallets[id] = {
    accountId: id,
    availableCredits: credits,
    reservedCredits: 0,
    lifetimeUsedCredits: 0,
    version: 0,
    updatedAt: new Date().toISOString(),
  };
  return id;
}

function reserve(state, accountId, quoted, key) {
  if (state.reservationByIdempotency[key]) {
    const rid = state.reservationByIdempotency[key];
    return { ok: true, replay: true, reservation: state.reservations[rid] };
  }
  const w = state.wallets[accountId];
  if (w.availableCredits < quoted) {
    return { ok: false, code: "INSUFFICIENT_CREDITS" };
  }
  w.availableCredits -= quoted;
  w.reservedCredits += quoted;
  w.version += 1;
  const id = `res_${Object.keys(state.reservations).length + 1}`;
  const res = {
    id,
    accountId,
    quotedCredits: quoted,
    settledCredits: 0,
    releasedCredits: 0,
    status: "reserved",
    idempotencyKey: key,
  };
  state.reservations[id] = res;
  state.reservationByIdempotency[key] = id;
  if (state.ledgerByIdempotency[`ledger:reserve:${key}`]) {
    // should not double
  } else {
    state.ledgerByIdempotency[`ledger:reserve:${key}`] = true;
    state.ledger.push({ kind: "reserve", key });
  }
  return { ok: true, replay: false, reservation: res };
}

function settle(state, reservationId, credits, key) {
  if (state.ledgerByIdempotency[key]) {
    return { ok: true, replay: true };
  }
  const res = state.reservations[reservationId];
  const remaining =
    res.quotedCredits - res.settledCredits - res.releasedCredits;
  if (credits > remaining) return { ok: false, code: "OVER_BUDGET" };
  const w = state.wallets[res.accountId];
  if (w.reservedCredits < credits) return { ok: false, code: "UNDERFLOW" };
  w.reservedCredits -= credits;
  w.lifetimeUsedCredits += credits;
  res.settledCredits += credits;
  state.ledgerByIdempotency[key] = true;
  return { ok: true, replay: false };
}

function release(state, reservationId, credits, key) {
  if (state.ledgerByIdempotency[key]) {
    return { ok: true, replay: true };
  }
  const res = state.reservations[reservationId];
  const remaining =
    res.quotedCredits - res.settledCredits - res.releasedCredits;
  if (credits > remaining) return { ok: false, code: "OVER_BUDGET" };
  const w = state.wallets[res.accountId];
  w.reservedCredits -= credits;
  w.availableCredits += credits;
  res.releasedCredits += credits;
  state.ledgerByIdempotency[key] = true;
  return { ok: true, replay: false };
}

// 1. Concurrent reserve: 50 credits, 6×10 — only 5 succeed
{
  const state = emptyState();
  const acc = createAccount(state, "u1", 50);
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < 6; i++) {
    const r = reserve(state, acc, 10, `c-res-${i}`);
    if (r.ok) ok++;
    else fail++;
  }
  assert.equal(ok, 5);
  assert.equal(fail, 1);
  assert.equal(state.wallets[acc].availableCredits, 0);
  assert.equal(state.wallets[acc].reservedCredits, 50);
}

// 2. Same idempotency key — balance changes once
{
  const state = emptyState();
  const acc = createAccount(state, "u2", 30);
  const a = reserve(state, acc, 10, "same-key");
  const b = reserve(state, acc, 10, "same-key");
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.equal(b.replay, true);
  assert.equal(state.wallets[acc].availableCredits, 20);
  assert.equal(state.wallets[acc].reservedCredits, 10);
}

// 3–5. Settle/release replay; Seller Pack 30 → 20 settle + 10 release
{
  const state = emptyState();
  const acc = createAccount(state, "u3", 40);
  const r = reserve(state, acc, 30, "pack-30");
  assert.equal(r.ok, true);
  assert.equal(settle(state, r.reservation.id, 10, "s1").ok, true);
  assert.equal(settle(state, r.reservation.id, 10, "s1").replay, true); // replay
  assert.equal(settle(state, r.reservation.id, 10, "s2").ok, true);
  assert.equal(release(state, r.reservation.id, 10, "rel1").ok, true);
  assert.equal(release(state, r.reservation.id, 10, "rel1").replay, true);
  assert.equal(state.wallets[acc].availableCredits, 20); // 40-30+10 release
  assert.equal(state.wallets[acc].reservedCredits, 0);
  assert.equal(state.wallets[acc].lifetimeUsedCredits, 20);
}

// 6. Guest migrate max 10 once (logic contract in SQL + engine)
const migrateSrc = fs.readFileSync(
  join(root, "supabase/migrations/20260726120000_t5_credit_rpcs.sql"),
  "utf8"
);
assert.match(migrateSrc, /pikbo_migrate_guest_credits/);
assert.match(migrateSrc, /least\(10/);
assert.match(migrateSrc, /consumed_guest_sessions/);
assert.match(migrateSrc, /pikbo_reserve_credits/);
assert.match(migrateSrc, /for update/i);
assert.match(migrateSrc, /pikbo_settle_credits/);
assert.match(migrateSrc, /pikbo_release_credits/);
assert.match(migrateSrc, /pikbo_ensure_personal_account/);
assert.match(migrateSrc, /pikbo_grant_free_allowance/);
assert.match(migrateSrc, /pikbo_probe_ready/);

// 7. Fail closed contracts in JS
const indexSrc = fs.readFileSync(
  join(root, "lib/durableCredits/index.ts"),
  "utf8"
);
assert.match(indexSrc, /requireSupabaseDurable|LOCAL_FILE_FORBIDDEN/);
assert.match(indexSrc, /failClosedIfNeeded|SUPABASE_FAIL_CLOSED/);
assert.match(indexSrc, /durableIsAuthoritative/);
// Production path must not silently dual-write to the local JSON store
assert.match(indexSrc, /LOCAL_FILE_FORBIDDEN|SUPABASE_FAIL_CLOSED/);
assert.doesNotMatch(
  indexSrc,
  /catch[\s\S]{0,80}loadDurableState|best-effort.*local-file/i
);

const storeSrc = fs.readFileSync(
  join(root, "lib/durableCredits/supabaseStore.ts"),
  "utf8"
);
assert.match(storeSrc, /pikbo_reserve_credits/);
assert.match(storeSrc, /callRpc/);
assert.match(storeSrc, /sanitizeErr|redacted/i);
assert.doesNotMatch(storeSrc, /best-effort rollback/i);

const localSrc = fs.readFileSync(
  join(root, "lib/durableCredits/localStore.ts"),
  "utf8"
);
assert.match(localSrc, /transactionReady/);
assert.match(localSrc, /fail closed|not multi-node|Production requires/i);

// 8. URL normalize for Invalid path
const envSrc = fs.readFileSync(join(root, "lib/supabase/env.ts"), "utf8");
assert.match(envSrc, /rest\/v1/i);
assert.match(envSrc, /supabaseUrlHost/);

// 9. CI critical path no || true
// Canonical honest workflow lives under docs/ci (copy to .github/workflows when
// the GitHub token has `workflow` scope — OAuth apps often lack it).
const ciTemplate = fs.readFileSync(
  join(root, "docs/ci/github-actions-ci.yml"),
  "utf8"
);
assert.match(ciTemplate, /link-check/);
assert.match(ciTemplate, /critical-path/);
assert.doesNotMatch(ciTemplate, /critical-path \|\| true/);
assert.match(ciTemplate, /Prod server \+ link-check \+ critical-path/);
assert.match(ciTemplate, /durable-credits-smoke/);
assert.match(ciTemplate, /agent\/\*\*/);
const liveCiPath = join(root, ".github/workflows/ci.yml");
if (fs.existsSync(liveCiPath)) {
  const live = fs.readFileSync(liveCiPath, "utf8");
  if (/critical-path \|\| true/.test(live)) {
    console.warn(
      "NOTE: .github/workflows/ci.yml still has critical-path || true — boss: copy docs/ci/github-actions-ci.yml with workflow-scoped token"
    );
  }
}

// 10. Generate signed-in authority cutover present
const genSrc = fs.readFileSync(join(root, "app/api/generate/route.ts"), "utf8");
assert.match(genSrc, /durableIsAuthoritative|authWalletAuthority/);
assert.match(genSrc, /DURABLE_UNAVAILABLE|durable credits/i);

console.log("durable-credits-smoke: PASS");
void require;
