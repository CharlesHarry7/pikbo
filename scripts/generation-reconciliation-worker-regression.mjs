import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const root = process.cwd();
const routePath = join(root, "app/api/internal/generation/reconcile/route.ts");
const routeSource = readFileSync(routePath, "utf8");
const requireModule = createRequire(import.meta.url);

assert.match(routeSource, /PIKBO_INTERNAL_WORKER_SECRET/);
assert.match(routeSource, /timingSafeEqual/);
assert.match(routeSource, /claimDurableReconciliation/);
assert.match(routeSource, /finishDurableReconciliation/);
assert.doesNotMatch(routeSource, /body\??\.(?:workerId|jobId|reservationId|userId|leaseToken)/);
assert.doesNotMatch(routeSource, /outputRef|videoUrl|providerUrl/i);

function loadRoute(dependencies) {
  const compiled = ts.transpileModule(routeSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "exports", "module", compiled)(
    (id) => {
      if (Object.hasOwn(dependencies, id)) return dependencies[id];
      if (id === "node:crypto") return requireModule(id);
      throw new Error(`unexpected import: ${id}`);
    },
    loaded.exports,
    loaded
  );
  return loaded.exports;
}

const secret = "s".repeat(32);
process.env.PIKBO_INTERNAL_WORKER_SECRET = secret;
process.env.VERCEL_REGION = "regression";

const state = {
  claims: [],
  claimCalls: [],
  finishCalls: [],
  finishResult: null,
};
const nextServer = {
  NextResponse: {
    json: (body, init) => Response.json(body, init),
  },
};
const route = loadRoute({
  "next/server": nextServer,
  "@/lib/durableCredits/reconciliation": {
    claimDurableReconciliation: async (input) => {
      state.claimCalls.push(input);
      return state.claims.shift() || {
        ok: false,
        code: "NO_CLAIMABLE_CASE",
        error: "No durable reconciliation case was claimed",
      };
    },
    finishDurableReconciliation: async (input) => {
      state.finishCalls.push(input);
      if (state.finishResult) return state.finishResult;
      return {
        ok: true,
        data: {
          jobId: input.jobId,
          reservationId: `reservation-for-${input.jobId}`,
          state: input.action === "capture" ? "captured" : "released",
          settlementCaptured: input.action === "capture",
          deliverable: false,
          refundConfirmed: input.action === "release",
          idempotent: false,
        },
      };
    },
  },
});

function request(body, authorization = `Bearer ${secret}`) {
  return new Request("https://preview.example/api/internal/generation/reconcile", {
    method: "POST",
    headers: {
      authorization,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

// Missing/invalid worker auth fails closed before any claim.
let response = await route.POST(request({}, ""));
assert.equal(response.status, 401);
assert.equal(state.claimCalls.length, 0);

// The bounded loop maps only claimed state to capture/release and ignores all
// caller-supplied identity fields.
state.claims = [
  {
    ok: true,
    data: {
      jobId: "job-capture",
      reservationId: "reservation-capture",
      userId: "owner-capture",
      state: "capture_pending",
      providerOutcome: "succeeded",
      providerRequestId: "provider-request",
      outputRef: "https://provider.example/raw.mp4",
      workerId: "claimed-worker",
      leaseToken: "lease-token-capture-12345678901234567890",
      leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      attemptCount: 1,
    },
  },
  {
    ok: true,
    data: {
      jobId: "job-release",
      reservationId: "reservation-release",
      userId: "owner-release",
      state: "release_pending",
      providerOutcome: "failed",
      workerId: "claimed-worker",
      leaseToken: "lease-token-release-12345678901234567890",
      leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      attemptCount: 1,
    },
  },
  { ok: false, code: "NO_CLAIMABLE_CASE", error: "empty" },
];
response = await route.POST(
  request({
    limit: 10,
    workerId: "attacker-worker",
    jobId: "attacker-job",
    reservationId: "attacker-reservation",
  })
);
assert.equal(response.status, 200);
const completed = await response.json();
assert.deepEqual(
  {
    ok: completed.ok,
    limit: completed.limit,
    claimed: completed.claimed,
    processed: completed.processed,
    captured: completed.captured,
    released: completed.released,
    failed: completed.failed,
  },
  {
    ok: true,
    limit: 10,
    claimed: 2,
    processed: 2,
    captured: 1,
    released: 1,
    failed: 0,
  }
);
assert.equal(state.finishCalls.length, 2);
assert.deepEqual(
  state.finishCalls.map(({ jobId, action }) => ({ jobId, action })),
  [
    { jobId: "job-capture", action: "capture" },
    { jobId: "job-release", action: "release" },
  ]
);
assert.match(state.claimCalls[0].workerId, /^generation-reconcile:/);
assert.notEqual(state.claimCalls[0].workerId, "attacker-worker");
assert.equal(state.claimCalls[0].workerId, state.finishCalls[0].workerId);

// A finish failure is a 503 and cannot echo the claimed provider reference.
state.claims = [
  {
    ok: true,
    data: {
      jobId: "job-failed-finish",
      reservationId: "reservation-failed-finish",
      userId: "owner-failed-finish",
      state: "capture_pending",
      providerOutcome: "succeeded",
      outputRef: "https://provider.example/should-never-echo.mp4",
      workerId: "claimed-worker",
      leaseToken: "lease-token-failed-12345678901234567890",
      leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      attemptCount: 1,
    },
  },
];
state.finishResult = {
  ok: false,
  code: "DURABLE_RECONCILIATION_UNAVAILABLE",
  error: "provider URL must not escape",
};
response = await route.POST(request({ limit: 1 }));
assert.equal(response.status, 503);
const failed = await response.json();
assert.equal(failed.ok, false);
assert.equal(failed.code, "DURABLE_RECONCILIATION_UNAVAILABLE");
assert.equal(Object.hasOwn(failed, "outputRef"), false);
assert.doesNotMatch(JSON.stringify(failed), /provider\.example|should-never-echo/);

console.log(
  "generation-reconciliation-worker-regression: PASS (auth; bounded claim loop; capture/release mapping; caller IDs ignored; provider refs withheld; fail-closed finish)"
);
