/**
 * R0 reservation safety-net — **behavioral** tests (not source regex).
 *
 * Proves:
 * 1. release backend invoked at most once
 * 2. after settle, release never calls backend
 * 3. concurrent release: single backend call
 * 4. exception in release backend still terminal (no second call)
 * 5. timeout-style: second release after slow first still shares once
 * 6. finally safety-net only fires while reserved
 * 7. withheld (capture ambiguous) never releases
 * 8. route wiring still present (minimal presence checks)
 *
 * Run: npm run r0-safety-net
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

// Load TS module with strip-types (same pattern as t5 smokes).
const lifecycleUrl = pathToFileURL(
  join(root, "lib/reservationLifecycle.ts")
).href;
const { createReservationLifecycle } = await import(lifecycleUrl);

function fakeReservation(id = "res-test-001") {
  return {
    reservationId: id,
    jobId: `job-${id}`,
    accountId: "acct-1",
    userId: "user-1",
    credits: 10,
    status: "reserved",
    providerAuthorized: true,
    planId: "founding_studio",
    idempotencyKey: `idem-${id}`,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
}

// ─── 1. Release at most once ──────────────────────────────────────────────

{
  let calls = 0;
  const lc = createReservationLifecycle({
    async release() {
      calls += 1;
      return { ok: true, availableCredits: 10 };
    },
    async settle() {
      return { ok: true };
    },
  });
  lc.assign(fakeReservation("once"));
  const a = await lc.release("provider_error");
  const b = await lc.release("provider_error");
  const c = await lc.safetyNetRelease();
  assert.equal(a.ok, true);
  assert.equal(a.skipped, false);
  assert.equal(b.skipped, true);
  assert.equal(c.skipped, true);
  assert.equal(calls, 1, "release backend must run once");
  assert.equal(lc.releaseBackendCalls(), 1);
  assert.equal(lc.phase(), "released");
}

// ─── 2. Settled never releases ────────────────────────────────────────────

{
  let releaseCalls = 0;
  let settleCalls = 0;
  const lc = createReservationLifecycle({
    async release() {
      releaseCalls += 1;
      return { ok: true };
    },
    async settle() {
      settleCalls += 1;
      return { ok: true, availableCredits: 0 };
    },
  });
  lc.assign(fakeReservation("settled"));
  const s = await lc.settle("prov-1");
  assert.equal(s.ok, true);
  assert.equal(lc.phase(), "settled");
  const r = await lc.release("provider_error");
  const n = await lc.safetyNetRelease();
  assert.equal(r.skipped, true);
  assert.equal(n.skipped, true);
  assert.equal(releaseCalls, 0, "settled must not call release backend");
  assert.equal(settleCalls, 1);
}

// ─── 3. 20-way concurrent release/finally → one backend call ──────────────

{
  let calls = 0;
  let resolveBackend;
  const backendGate = new Promise((r) => {
    resolveBackend = r;
  });
  const lc = createReservationLifecycle({
    async release() {
      calls += 1;
      await backendGate;
      return { ok: true, availableCredits: 5 };
    },
    async settle() {
      return { ok: true };
    },
  });
  lc.assign(fakeReservation("concurrent"));
  const releases = Array.from({ length: 20 }, (_, index) =>
    index === 19
      ? lc.safetyNetRelease()
      : lc.release(`duplicate_failure_${index}`)
  );
  // Let microtasks schedule
  await Promise.resolve();
  assert.equal(calls, 1, "only one backend in flight");
  resolveBackend();
  const results = await Promise.all(releases);
  assert.equal(results[0].skipped, false);
  // Siblings share the same in-flight result; the backend still ran once.
  assert.equal(calls, 1);
  assert.equal(lc.releaseBackendCalls(), 1);
  assert.ok(results.every((result) => result.ok));
}

// ─── 4. Exception in release still terminal (no second call) ──────────────

{
  let calls = 0;
  const lc = createReservationLifecycle({
    async release() {
      calls += 1;
      throw new Error("backend down");
    },
    async settle() {
      return { ok: true };
    },
  });
  lc.assign(fakeReservation("throw"));
  const a = await lc.release("provider_error");
  assert.equal(a.ok, false);
  assert.equal(lc.phase(), "release_pending");
  const b = await lc.safetyNetRelease();
  assert.equal(b.skipped, true);
  assert.equal(calls, 1);
}

// ─── 5. Timeout-style slow release then finally ───────────────────────────

{
  let calls = 0;
  const lc = createReservationLifecycle({
    async release(_res, reason) {
      calls += 1;
      await new Promise((r) => setTimeout(r, 30));
      return { ok: true, availableCredits: 1, reason };
    },
    async settle() {
      return { ok: true };
    },
  });
  lc.assign(fakeReservation("slow"));
  const slow = lc.release("deadline_before_generation");
  // finally races while in flight
  const fin = lc.safetyNetRelease();
  const [a, b] = await Promise.all([slow, fin]);
  assert.equal(calls, 1);
  assert.equal(a.skipped, false);
  // fin shares in-flight
  assert.equal(lc.releaseBackendCalls(), 1);
  assert.ok(a.ok && b.ok);
}

// ─── 6. Safety-net only while reserved ────────────────────────────────────

{
  let calls = 0;
  const lc = createReservationLifecycle({
    async release() {
      calls += 1;
      return { ok: true };
    },
    async settle() {
      return { ok: true };
    },
  });
  // none → skip
  let r = await lc.safetyNetRelease();
  assert.equal(r.skipped, true);
  assert.equal(calls, 0);
  lc.assign(fakeReservation("net"));
  r = await lc.safetyNetRelease();
  assert.equal(r.skipped, false);
  assert.equal(calls, 1);
  r = await lc.safetyNetRelease();
  assert.equal(r.skipped, true);
  assert.equal(calls, 1);
}

// ─── 7. Withheld (capture fail) never releases ────────────────────────────

{
  let calls = 0;
  const lc = createReservationLifecycle({
    async release() {
      calls += 1;
      return { ok: true };
    },
    async settle() {
      return { ok: false, error: "capture failed" };
    },
  });
  lc.assign(fakeReservation("withhold"));
  const s = await lc.settle("prov-x");
  assert.equal(s.ok, false);
  assert.equal(lc.phase(), "withheld");
  lc.markWithheld("capture_failed");
  assert.equal(lc.phase(), "withheld");
  const r = await lc.safetyNetRelease();
  assert.equal(r.skipped, true);
  assert.equal(calls, 0, "withheld must not release");
}

// ─── 8. Capture throw is withheld for both route adapters ─────────────────

for (const routeName of ["generate", "image"]) {
  let releaseCalls = 0;
  let settleCalls = 0;
  const lc = createReservationLifecycle({
    async release() {
      releaseCalls += 1;
      return { ok: true };
    },
    async settle() {
      settleCalls += 1;
      throw new Error(`${routeName} capture RPC unavailable`);
    },
  });
  lc.assign(fakeReservation(`capture-throw-${routeName}`));
  const captured = await lc.settle(`provider-${routeName}`);
  assert.equal(captured.ok, false);
  assert.equal(captured.skipped, false);
  assert.equal(lc.phase(), "withheld");
  const explicit = await lc.release("provider_error");
  const safety = await lc.safetyNetRelease();
  assert.equal(explicit.skipped, true);
  assert.equal(safety.skipped, true);
  assert.equal(settleCalls, 1);
  assert.equal(
    releaseCalls,
    0,
    `${routeName}: capture ambiguity must never release provider spend`
  );
}

// ─── 9. Failed release backend remains reconciliation-pending ─────────────

{
  let calls = 0;
  const lc = createReservationLifecycle({
    async release() {
      calls += 1;
      return { ok: false, error: "rpc fail" };
    },
    async settle() {
      return { ok: true };
    },
  });
  lc.assign(fakeReservation("fail-rel"));
  const a = await lc.release("provider_error");
  assert.equal(a.ok, false);
  assert.equal(lc.phase(), "release_pending");
  await lc.safetyNetRelease();
  assert.equal(calls, 1);
}

// ─── 10. Minimal route wiring (not the primary proof) ─────────────────────

const gen = readFileSync(join(root, "app/api/generate/route.ts"), "utf8");
const img = readFileSync(join(root, "app/api/image/route.ts"), "utf8");
assert.match(gen, /createReservationLifecycle|reservationLifecycle/);
assert.match(img, /createReservationLifecycle|reservationLifecycle/);
assert.match(gen, /safetyNetRelease|unexpected_exit_safety_net/);
assert.match(img, /safetyNetRelease|unexpected_exit_safety_net/);
assert.match(gen, /markWithheld/);
assert.match(img, /markWithheld/);

console.log(
  "r0-safety-net: PASS (release≤1 · settle-blocks-release · 20-way concurrent · capture-throw withheld x2 · timeout race · finally · release-pending truth · route wire)"
);
