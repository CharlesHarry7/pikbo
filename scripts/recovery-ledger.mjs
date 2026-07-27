import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { invokeReservedProvider } from "../lib/liveGenerationGate.mjs";

const root = process.cwd();
const migration = readFileSync(
  join(
    root,
    "supabase/migrations/20260727213000_r1_atomic_generation_credits.sql"
  ),
  "utf8"
);
const store = readFileSync(
  join(root, "lib/durableCredits/supabaseStore.ts"),
  "utf8"
);
const live = readFileSync(
  join(root, "lib/durableCredits/liveReservation.ts"),
  "utf8"
);
const route = readFileSync(join(root, "app/api/generate/route.ts"), "utf8");

assert.match(migration, /live_generation_allowed boolean not null default false/);
assert.match(
  migration,
  /RECOVERY_LEDGER_DUPLICATE_PERSONAL_ACCOUNTS[\s\S]*RECOVERY_LEDGER_DUPLICATE_GENERATION_KEYS/
);
assert.match(
  migration,
  /unique index[\s\S]*generation_jobs_user_idempotency_uidx[\s\S]*created_by,\s*idempotency_key/i
);
assert.match(
  migration,
  /pikbo_reserve_generation_v1[\s\S]*for update of a, w[\s\S]*plan_id = 'free'[\s\S]*live_generation_allowed[\s\S]*update public\.credit_wallets[\s\S]*insert into public\.credit_reservations[\s\S]*insert into public\.generation_jobs[\s\S]*insert into public\.credit_ledger/i
);
assert.match(
  migration,
  /pikbo_capture_generation_v1[\s\S]*for update[\s\S]*status = 'settled'[\s\S]*kind,[\s\S]*'settle'/i
);
assert.match(
  migration,
  /pikbo_release_generation_v1[\s\S]*for update[\s\S]*status = 'released'[\s\S]*kind,[\s\S]*'release'/i
);
assert.match(
  migration,
  /revoke all on function public\.pikbo_reserve_generation_v1[\s\S]*from public, anon, authenticated/i
);
assert.match(store, /\.rpc\("pikbo_reserve_generation_v1"/);
assert.match(store, /"pikbo_capture_generation_v1"/);
assert.match(store, /"pikbo_release_generation_v1"/);
assert.match(live, /supabaseReserveGenerationAtomic/);
assert.match(live, /supabaseCaptureGenerationAtomic/);
assert.match(live, /supabaseReleaseGenerationAtomic/);
assert.match(live, /providerAuthorized: true/);
assert.doesNotMatch(
  live,
  /supabaseEnsurePersonalAccount|supabaseReserve\(|supabaseSettle\(|supabaseRelease\(/
);
assert.match(
  route,
  /if \(!captured\.ok\)[\s\S]*credits could not be finalized[\s\S]*return err\(failBody, 503\)/
);
assert.doesNotMatch(
  route,
  /if \(!captured\.ok\)[\s\S]{0,600}creditsOutcome:\s*"10 used"/
);

/**
 * Executable contract model for the source-only migration. It intentionally
 * models the SQL row lock and unique key; the migration still requires a
 * separate non-production Postgres integration run before deployment.
 */
class AtomicLedgerFixture {
  constructor(available) {
    this.available = available;
    this.reserved = 0;
    this.used = 0;
    this.reservations = new Map();
    this.jobs = new Map();
    this.ledger = [];
    this.serial = Promise.resolve();
  }

  async tx(fn) {
    const before = this.serial;
    let unlock;
    this.serial = new Promise((resolve) => {
      unlock = resolve;
    });
    await before;
    try {
      return fn();
    } finally {
      unlock();
    }
  }

  reserve(userId, key, amount = 10) {
    return this.tx(() => {
      const compound = `${userId}:${key}`;
      const prior = this.reservations.get(compound);
      if (prior) {
        return {
          ok: true,
          ...prior,
          idempotent: true,
          providerAuthorized: false,
        };
      }
      if (this.available < amount) return { ok: false, code: "INSUFFICIENT_CREDITS" };
      this.available -= amount;
      this.reserved += amount;
      const row = {
        reservationId: `reservation-${this.reservations.size + 1}`,
        jobId: `job-${this.jobs.size + 1}`,
        amount,
        status: "reserved",
      };
      this.reservations.set(compound, row);
      this.jobs.set(row.jobId, row);
      this.ledger.push({ kind: "reserve", amount });
      return {
        ok: true,
        ...row,
        idempotent: false,
        providerAuthorized: true,
      };
    });
  }

  capture(userId, key) {
    return this.tx(() => {
      const row = this.reservations.get(`${userId}:${key}`);
      if (!row) return { ok: false };
      if (row.status === "captured") return { ok: true, idempotent: true };
      assert.equal(row.status, "reserved");
      this.reserved -= row.amount;
      this.used += row.amount;
      row.status = "captured";
      this.ledger.push({ kind: "capture", amount: row.amount });
      return { ok: true, idempotent: false };
    });
  }

  release(userId, key) {
    return this.tx(() => {
      const row = this.reservations.get(`${userId}:${key}`);
      if (!row) return { ok: false };
      if (row.status === "released") return { ok: true, idempotent: true };
      assert.equal(row.status, "reserved");
      this.reserved -= row.amount;
      this.available += row.amount;
      row.status = "released";
      this.ledger.push({ kind: "release", amount: row.amount });
      return { ok: true, idempotent: false };
    });
  }
}

const fixture = new AtomicLedgerFixture(100);
const twenty = await Promise.all(
  Array.from({ length: 20 }, () => fixture.reserve("user-1", "same-key"))
);
assert.ok(twenty.every((row) => row.ok));
assert.equal(new Set(twenty.map((row) => row.reservationId)).size, 1);
assert.equal(new Set(twenty.map((row) => row.jobId)).size, 1);
assert.equal(fixture.reservations.size, 1);
assert.equal(fixture.jobs.size, 1);
assert.equal(fixture.available, 90);
assert.equal(fixture.reserved, 10);
assert.equal(fixture.ledger.filter((row) => row.kind === "reserve").length, 1);
assert.equal(
  twenty.filter((row) => row.providerAuthorized).length,
  1,
  "only the transaction winner may invoke the provider"
);

await Promise.all(
  Array.from({ length: 20 }, () => fixture.capture("user-1", "same-key"))
);
assert.equal(fixture.reserved, 0);
assert.equal(fixture.used, 10);
assert.equal(fixture.ledger.filter((row) => row.kind === "capture").length, 1);

const releaseFixture = new AtomicLedgerFixture(10);
await releaseFixture.reserve("user-2", "release-key");
await Promise.all(
  Array.from({ length: 20 }, () =>
    releaseFixture.release("user-2", "release-key")
  )
);
assert.equal(releaseFixture.available, 10);
assert.equal(releaseFixture.reserved, 0);
assert.equal(
  releaseFixture.ledger.filter((row) => row.kind === "release").length,
  1
);

const empty = new AtomicLedgerFixture(0);
let providerCalls = 0;
const insufficient = await empty.reserve("user-3", "insufficient");
await assert.rejects(
  invokeReservedProvider(
    insufficient.ok
      ? { reservationId: insufficient.reservationId, status: "reserved" }
      : null,
    async () => {
      providerCalls += 1;
    }
  ),
  /LIVE_PROVIDER_REQUIRES_DURABLE_RESERVATION/
);
assert.equal(providerCalls, 0);
assert.equal(empty.reservations.size, 0);
assert.equal(empty.jobs.size, 0);
assert.equal(empty.ledger.length, 0);

console.log(
  "recovery-ledger: PASS (20-way idempotency, capture/release idempotency, insufficient=0 provider calls)"
);
