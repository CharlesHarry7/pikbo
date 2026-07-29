import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  evaluateAccountLiveCapability,
  evaluateHealthTruth,
} from "../lib/liveCapability.ts";

const allReady = {
  authConfigured: true,
  durableAtomicReservationConfigured: true,
  durableReconciliationConfigured: true,
  providerConfigured: true,
  serverOwnedDeliverableConfigured: true,
};
assert.equal(evaluateHealthTruth(allReady).softLive, true);
for (const key of Object.keys(allReady)) {
  assert.equal(
    evaluateHealthTruth({ ...allReady, [key]: false }).softLive,
    false,
    `${key}=false must close soft live`
  );
}

const liveAccount = {
  softLiveReady: true,
  signedIn: true,
  durableCreditsActive: true,
  planId: "founding_studio",
  availableCredits: 10,
  liveJobCredits: 10,
  freeDeliveryReady: false,
};
assert.equal(
  evaluateAccountLiveCapability({
    ...liveAccount,
    signedIn: false,
    availableCredits: null,
  }).canLiveGenerate,
  false,
  "anonymous cookie credits must never authorize live"
);
assert.equal(
  evaluateAccountLiveCapability({
    ...liveAccount,
    softLiveReady: false,
  }).canLiveGenerate,
  false,
  "account UI must close when health softLive is false"
);
assert.equal(
  evaluateAccountLiveCapability({
    ...liveAccount,
    availableCredits: 0,
  }).canLiveGenerate,
  false,
  "zero durable credits must close live"
);
assert.equal(
  evaluateAccountLiveCapability({
    ...liveAccount,
    planId: "free",
  }).canLiveGenerate,
  false,
  "Free delivery stays closed without protected deliverables"
);
assert.equal(
  evaluateAccountLiveCapability(liveAccount).canLiveGenerate,
  true,
  "fully ready signed-in durable Founding Studio account may generate"
);
for (const retiredPlan of ["creator", "shop", "enterprise", ""]) {
  assert.equal(
    evaluateAccountLiveCapability({
      ...liveAccount,
      planId: retiredPlan,
    }).canLiveGenerate,
    false,
    `${retiredPlan || "empty"} plan must fail closed`
  );
}
assert.equal(
  evaluateAccountLiveCapability({
    ...liveAccount,
    planId: "free",
    freeDeliveryReady: true,
  }).canLiveGenerate,
  true,
  "future Free live still requires explicit protected delivery readiness"
);

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const meRoute = read("app/api/me/route.ts");
const meClient = read("lib/meClient.ts");
const session = read("lib/session.ts");
const generateRoute = read("app/api/generate/route.ts");
const generationsRoute = read("app/api/generations/route.ts");
const landing = read("components/LandingToolPanel.tsx");
const create = read("components/CreateStudio.tsx");
const badge = read("components/CreditsBadge.tsx");
const freeCta = read("components/FreeTrialCta.tsx");

assert.match(meRoute, /probeSoftLiveReadiness/);
assert.match(meRoute, /credits:\s*0,[\s\S]{0,120}mode:\s*"demo-cached"/);
assert.match(meRoute, /canLiveGenerate:\s*false/);
assert.match(meRoute, /canLiveGenerate:\s*capability\.canLiveGenerate/);
assert.match(meRoute, /"X-Pikbo-Credits":\s*"0"/);
assert.match(meRoute, /"X-Pikbo-Can-Live-Generate":\s*"0"/);
assert.match(meClient, /me\.canLiveGenerate === true/);
assert.match(meClient, /liveEnabled:[\s\S]{0,120}me\.canLiveGenerate === true/);
assert.match(
  session,
  /function publicCachedSession[\s\S]*credits:\s*0,[\s\S]*clipsLeft:\s*0/
);
assert.match(
  generateRoute,
  /session:\s*demo\s*\?\s*publicCachedSession\(session\)\s*:\s*publicSession\(session\)/
);
assert.match(
  generateRoute,
  /const payload:\s*GenerateSuccess[\s\S]{0,400}demo:\s*true,[\s\S]{0,400}session:\s*publicCachedSession\(session\)/
);
assert.match(generationsRoute, /session:\s*publicCachedSession\(session\)/);
assert.match(landing, /const demoMode = !canLiveGenerate\(session\)/);
assert.match(landing, /generationDisplayCredits\(session\)/);
assert.doesNotMatch(landing, /\{session\.credits\} credits/);
assert.match(create, /const liveEntitled = canLiveGenerate\(session\)/);
assert.match(create, /generationDisplayCredits\(session\)/);
assert.match(badge, /canLiveGenerate\(session\)/);
assert.match(badge, /cached previews · 0 credits/);
assert.match(freeCta, /canLiveGenerate\(me\)/);

console.log(
  "capability matrix regression: anonymous, closed-health, zero-wallet, Free delivery, and fully-ready states passed"
);
