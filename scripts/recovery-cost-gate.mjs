import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  invokeReservedProvider,
  liveGenerationAccess,
} from "../lib/liveGenerationGate.mjs";

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

await assert.rejects(
  invokeReservedProvider(null, provider),
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
  },
  provider
);
assert.equal(result, "provider-result");
assert.equal(providerCalls, 1, "reserved live access invokes provider once");

const route = readFileSync(
  join(process.cwd(), "app/api/generate/route.ts"),
  "utf8"
);
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

console.log(
  "recovery-cost-gate: PASS (anonymous=0, free=0, reserve-failure=0 provider calls)"
);
