/**
 * R0 Safety Net – reservation leak protection + generate/image route fail-closed.
 *
 * Verifies:
 * 1. Both /api/generate and /api/image route.ts contain the unexpected_exit
 *    safety-net finally block that releases leaked reservations.
 * 2. Both routes declare liveReservation / imageLiveReservation outside the try
 *    block so the finally can access it.
 * 3. liveGenerationAccess gate is imported and used in both routes.
 * 4. invokeReservedProvider is used in both routes.
 *
 * Run: npm run r0-safety-net
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function readRoute(relPath) {
  return readFileSync(join(root, relPath), "utf-8");
}

// ─── Generate route safety net ───

const genRoute = readRoute("app/api/generate/route.ts");

// 1. Safety net finally block exists
assert.ok(
  genRoute.includes("unexpected_exit_safety_net"),
  "generate route: missing unexpected_exit_safety_net release"
);

// 2. liveReservation declared outside try (before the try block that contains generation)
// Pattern: declaration is outside the outer try
const genLiveDeclOutside = /let liveReservation:\s*StrictLiveReservation\s*\|\s*null\s*=\s*null/;
assert.ok(
  genLiveDeclOutside.test(genRoute),
  "generate route: liveReservation must be declared (let ... = null) for finally access"
);

// 3. finally block releases reservation
assert.ok(
  genRoute.includes("finally") && genRoute.includes("if (liveReservation)"),
  "generate route: finally block must check and release liveReservation"
);

// 4. liveGenerationAccess is imported
assert.ok(
  genRoute.includes("import {\n  invokeReservedProvider,\n  liveGenerationAccess,"),
  "generate route: must import liveGenerationAccess"
);

// 5. invokeReservedProvider is used (provider calls are gated)
assert.ok(
  genRoute.includes("invokeReservedProvider("),
  "generate route: invokeReservedProvider must guard provider calls"
);

// ─── Image route safety net ───

const imgRoute = readRoute("app/api/image/route.ts");

// 1. Safety net finally block exists
assert.ok(
  imgRoute.includes("unexpected_exit_safety_net"),
  "image route: missing unexpected_exit_safety_net release"
);

// 2. imageLiveReservation declared outside try
const imgLiveDeclOutside = /let imageLiveReservation:\s*StrictLiveReservation\s*\|\s*null\s*=\s*null/;
assert.ok(
  imgLiveDeclOutside.test(imgRoute),
  "image route: imageLiveReservation must be declared outside the try block for finally access"
);

// 3. finally block releases reservation
assert.ok(
  imgRoute.includes("finally") && imgRoute.includes("if (imageLiveReservation)"),
  "image route: finally block must check and release imageLiveReservation"
);

// 4. liveGenerationAccess is imported
assert.ok(
  imgRoute.includes("liveGenerationAccess,"),
  "image route: must import liveGenerationAccess"
);

// 5. invokeReservedProvider is used (provider calls are gated)
assert.ok(
  imgRoute.includes("invokeReservedProvider("),
  "image route: invokeReservedProvider must guard provider calls"
);

// ─── Seller Pack R0 honesty ───

const spReserve = readRoute("app/api/seller-pack/reserve/route.ts");

// Seller Pack reserve explicitly states it defers to generate cost gate
const spHonesty = spReserve.includes("generate-route-cost-gate") ||
  spReserve.includes("generate gate");
assert.ok(
  spHonesty,
  "seller-pack reserve: must reference generate cost gate authority"
);

// Seller Pack does NOT call fal directly
assert.ok(
  !spReserve.includes("fal.") && !spReserve.includes("@fal-ai"),
  "seller-pack reserve: must never call fal provider directly"
);

// ─── Idempotency key enforcement ───

// Both routes require idempotencyKey for live generation
for (const [name, src] of [["generate", genRoute], ["image", imgRoute]]) {
  assert.ok(
    src.includes("idempotencyKey"),
    `${name} route: must check idempotencyKey for live generation`
  );
}

// ─── Refund paths exist ───

// Generate route has releaseReservation called in failure points
const genReleaseCalls = (genRoute.match(/releaseReservation\(/g) || []).length;
assert.ok(
  genReleaseCalls >= 8,
  `generate route: expected >= 8 releaseReservation calls for failure paths, found ${genReleaseCalls}`
);

// Image route has releaseReservation called in failure points
const imgReleaseCalls = (imgRoute.match(/releaseReservation\(/g) || []).length;
assert.ok(
  imgReleaseCalls >= 4,
  `image route: expected >= 4 releaseReservation calls for failure paths, found ${imgReleaseCalls}`
);

console.log("r0-safety-net: PASS (reservation leak safety net · generate/image fail-closed · Seller Pack honesty · idempotency · refund paths)");
