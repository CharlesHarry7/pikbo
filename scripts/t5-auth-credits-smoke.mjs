/**
 * T5 Auth + durable credits — pure engine + source locks (no network, no secrets).
 *
 * DISPATCH (Grok under Codex command): T5 Auth & Credits code-side finish.
 * Multi-node SQL/keys remain boss-gated (see docs/BLOCKERS_REQUEST.md).
 *
 * Run: npm run t5-auth-credits-smoke
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

async function loadEngine() {
  const url = pathToFileURL(join(root, "lib/durableCredits/engine.ts")).href;
  return import(url);
}

const {
  emptyState,
  createPersonalAccount,
  grantCredits,
  reserveCredits,
  settleReservationItem,
  releaseReservationItem,
  migrateGuestCredits,
  expireStaleReservations,
} = await loadEngine();

// ─── Pure engine: account + grant ───────────────────────────────────────────

let state = emptyState();
const created = createPersonalAccount(state, {
  userId: "user-t5-1",
  planId: "free",
  initialAvailable: 0,
  accountId: "acct-t5-1",
});
assert.equal(created.ok, true, "create personal account");
state = created.state;
assert.equal(state.wallets["acct-t5-1"].availableCredits, 0);

const granted = grantCredits(state, {
  accountId: "acct-t5-1",
  credits: 30,
  sourceType: "t5-smoke",
  sourceId: "grant-1",
  idempotencyKey: "grant-t5-1",
});
assert.equal(granted.ok, true);
state = granted.state;
assert.equal(state.wallets["acct-t5-1"].availableCredits, 30);

// ─── Reserve / settle (10-credit live clip) ────────────────────────────────

const reserved = reserveCredits(state, {
  accountId: "acct-t5-1",
  createdBy: "user-t5-1",
  purpose: "generation",
  quotedCredits: 10,
  idempotencyKey: "reserve-t5-live-1",
});
assert.equal(reserved.ok, true, "reserve 10");
state = reserved.state;
const reservationId = reserved.data.reservation.id;
assert.equal(state.wallets["acct-t5-1"].availableCredits, 20);
assert.equal(state.wallets["acct-t5-1"].reservedCredits, 10);

const settled = settleReservationItem(state, {
  reservationId,
  credits: 10,
  idempotencyKey: "settle-t5-live-1",
});
assert.equal(settled.ok, true, "settle 10");
state = settled.state;
assert.equal(state.wallets["acct-t5-1"].availableCredits, 20);
assert.equal(state.wallets["acct-t5-1"].reservedCredits, 0);
assert.equal(state.wallets["acct-t5-1"].lifetimeUsedCredits, 10);

// ─── Idempotent settle (no double charge) ─────────────────────────────────

const settleAgain = settleReservationItem(state, {
  reservationId,
  credits: 10,
  idempotencyKey: "settle-t5-live-1",
});
assert.equal(settleAgain.ok, true);
state = settleAgain.state;
assert.equal(
  state.wallets["acct-t5-1"].lifetimeUsedCredits,
  10,
  "idempotent settle must not double lifetime used"
);

// ─── Reserve / release (failed job refund path) ───────────────────────────

const reserved2 = reserveCredits(state, {
  accountId: "acct-t5-1",
  createdBy: "user-t5-1",
  purpose: "generation",
  quotedCredits: 10,
  idempotencyKey: "reserve-t5-fail-1",
});
assert.equal(reserved2.ok, true);
state = reserved2.state;
const res2 = reserved2.data.reservation.id;

const released = releaseReservationItem(state, {
  reservationId: res2,
  credits: 10,
  idempotencyKey: "release-t5-fail-1",
  reason: "provider_failed",
});
assert.equal(released.ok, true, "release restores available");
state = released.state;
assert.equal(state.wallets["acct-t5-1"].availableCredits, 20);
assert.equal(state.wallets["acct-t5-1"].reservedCredits, 0);

// ─── Insufficient funds fail-closed ───────────────────────────────────────

const tooMuch = reserveCredits(state, {
  accountId: "acct-t5-1",
  createdBy: "user-t5-1",
  purpose: "generation",
  quotedCredits: 999,
  idempotencyKey: "reserve-t5-over",
});
assert.equal(tooMuch.ok, false, "over-reserve must fail");
assert.equal(state.wallets["acct-t5-1"].availableCredits, 20);

// ─── Guest migrate: only when durable wallet is empty ─────────────────────

const emptyAcct = createPersonalAccount(state, {
  userId: "user-t5-guest",
  planId: "free",
  initialAvailable: 0,
  accountId: "acct-t5-guest",
});
assert.equal(emptyAcct.ok, true);
state = emptyAcct.state;

const migrated = migrateGuestCredits(state, {
  guestSessionIdHash: "guest-cookie-abc",
  userId: "user-t5-guest",
  accountId: "acct-t5-guest",
  cookieCredits: 10,
  idempotencyKey: "migrate-guest-1",
});
assert.equal(migrated.ok, true);
state = migrated.state;
assert.equal(migrated.data.migrated, 10);
assert.equal(state.wallets["acct-t5-guest"].availableCredits, 10);

const migrateTwice = migrateGuestCredits(state, {
  guestSessionIdHash: "guest-cookie-abc",
  userId: "user-t5-guest",
  accountId: "acct-t5-guest",
  cookieCredits: 10,
  idempotencyKey: "migrate-guest-2",
});
assert.equal(migrateTwice.ok, true);
assert.equal(
  migrateTwice.data.migrated,
  0,
  "same guest hash must not migrate credits twice"
);
assert.equal(state.wallets["acct-t5-guest"].availableCredits, 10);

// Non-empty durable wallet discards cookie credits
const discardCookie = migrateGuestCredits(state, {
  guestSessionIdHash: "guest-cookie-other",
  userId: "user-t5-1",
  accountId: "acct-t5-1",
  cookieCredits: 10,
  idempotencyKey: "migrate-discard-1",
});
assert.equal(discardCookie.ok, true);
assert.equal(
  discardCookie.data.migrated,
  0,
  "non-empty durable wallet must discard cookie migrate"
);

// ─── Expire stale reservations ────────────────────────────────────────────

const reservedStale = reserveCredits(state, {
  accountId: "acct-t5-1",
  createdBy: "user-t5-1",
  purpose: "generation",
  quotedCredits: 10,
  idempotencyKey: "reserve-t5-stale",
});
assert.equal(reservedStale.ok, true);
state = reservedStale.state;
const staleId = reservedStale.data.reservation.id;
state = {
  ...state,
  reservations: {
    ...state.reservations,
    [staleId]: {
      ...state.reservations[staleId],
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    },
  },
};
const expired = expireStaleReservations(state, Date.now());
assert.equal(expired.ok, true);
state = expired.state;
assert.ok(expired.data.expired >= 1, "at least one reservation expired");
assert.equal(state.reservations[staleId].status, "expired");
assert.equal(state.wallets["acct-t5-1"].reservedCredits, 0);

// ─── Auth fail-closed without secrets (source lock) ───────────────────────

const authConfigSrc = readFileSync(join(root, "lib/authConfig.ts"), "utf8");
assert.match(
  authConfigSrc,
  /mode: "disabled" \| "supabase" \| "local-durable-only"/
);
assert.match(authConfigSrc, /Sign-in is not configured yet/);
assert.match(authConfigSrc, /configured = supabaseUrl && supabaseAnon/);

// ─── Migration files present + T5 / R1 markers ────────────────────────────

const t5Path = join(
  root,
  "supabase/migrations/20260723120000_t5_auth_credits.sql"
);
const r1Path = join(
  root,
  "supabase/migrations/20260727213000_r1_atomic_generation_credits.sql"
);
assert.equal(existsSync(t5Path), true, "T5 SQL migration present");
assert.equal(existsSync(r1Path), true, "R1 atomic SQL migration present");

const t5Sql = readFileSync(t5Path, "utf8");
assert.match(t5Sql, /credit_wallets|credit_reservations|credit_ledger/i);

const r1Sql = readFileSync(r1Path, "utf8");
assert.match(r1Sql, /pikbo_reserve_generation_v1/);
assert.match(r1Sql, /pikbo_capture_generation_v1/);
assert.match(r1Sql, /pikbo_release_generation_v1/);

// ─── Live reservation: atomic path, not cookie debit ──────────────────────

const live = readFileSync(
  join(root, "lib/durableCredits/liveReservation.ts"),
  "utf8"
);
assert.match(
  live,
  /reserveStrictLiveGeneration|supabaseReserveGenerationAtomic/
);
assert.doesNotMatch(live, /deductCredits\(\s*session/);

// ─── Generate route honesty on capture failure ────────────────────────────

const route = readFileSync(join(root, "app/api/generate/route.ts"), "utf8");
assert.match(
  route,
  /reserveStrictLiveGeneration|liveGenerationAccess|anonymous_cached_only|cached/
);
assert.doesNotMatch(
  route,
  /if\s*\(\s*!captured\.ok\s*\)[\s\S]{0,400}creditsOutcome:\s*"10 used"/
);

console.log(
  "t5-auth-credits-smoke: PASS (pure engine reserve/settle/release/migrate/expire · auth disabled default · T5/R1 migrations · live reservation source locks)"
);
