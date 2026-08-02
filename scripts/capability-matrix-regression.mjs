import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  evaluateAccountLiveCapability,
  evaluateHealthTruth,
  evaluatePrivateInputAdmissionReadiness,
  evaluatePrivatePreviewReadiness,
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

const privatePreviewReady = {
  authConfigured: true,
  durableAtomicReservationConfigured: true,
  durableReconciliationConfigured: true,
  providerConfigured: true,
  privateResultsBucketReady: true,
  privateResultsSchemaReady: true,
  privateResultsRpcReady: true,
  privateInputsBucketReady: true,
  privateInputsSchemaReady: true,
  privateInputsReserveRpcReady: true,
  privateInputsDiscoveryReady: true,
  providerOutputAllowlistConfigured: true,
  privateLiveEnabled: true,
  privateLiveAllowlistConfigured: true,
  privateLiveBudgetConfigured: true,
  providerValidationEnvironmentAllowed: true,
  providerValidationBudgetConfigured: true,
  durableProviderBudgetSchemaReady: true,
  durableProviderBudgetRpcReady: true,
};
assert.equal(
  evaluatePrivatePreviewReadiness(privatePreviewReady).ready,
  true,
  "private Preview opens only when every global prerequisite is ready"
);
for (const key of Object.keys(privatePreviewReady)) {
  const result = evaluatePrivatePreviewReadiness({
    ...privatePreviewReady,
    [key]: false,
  });
  assert.equal(result.ready, false, `${key}=false must close private Preview`);
  assert.deepEqual(result.missing, [key]);
}

const privateInputAdmissionReady = {
  authConfigured: true,
  privateInputsBucketReady: true,
  privateInputsSchemaReady: true,
  privateInputsAssetRpcReady: true,
  privateLiveEnabled: true,
  privateLiveAllowlistConfigured: true,
};
assert.equal(
  evaluatePrivateInputAdmissionReadiness(privateInputAdmissionReady).ready,
  true,
  "private input admission opens without Provider, credits, results, or Stripe"
);
for (const key of Object.keys(privateInputAdmissionReady)) {
  const result = evaluatePrivateInputAdmissionReadiness({
    ...privateInputAdmissionReady,
    [key]: false,
  });
  assert.equal(result.ready, false, `${key}=false must close input admission`);
  assert.deepEqual(result.missing, [key]);
}
assert.equal(
  evaluatePrivatePreviewReadiness({
    ...privatePreviewReady,
    providerConfigured: false,
    privateResultsBucketReady: false,
    privateLiveBudgetConfigured: false,
    providerValidationBudgetConfigured: false,
  }).ready,
  false,
  "input readiness must never open full generation readiness"
);

const liveAccount = {
  liveRouteReady: true,
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
    liveRouteReady: false,
  }).canLiveGenerate,
  false,
  "account UI must close when the generate route is not admitted"
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
  "invited private validation may use its explicit private delivery readiness"
);
assert.equal(
  evaluateHealthTruth({
    ...allReady,
    serverOwnedDeliverableConfigured: false,
  }).softLive,
  false,
  "public soft live remains closed without the server-owned derivative"
);
assert.equal(
  evaluateAccountLiveCapability({
    ...liveAccount,
    planId: "free",
    freeDeliveryReady: true,
    liveRouteReady: true,
  }).canLiveGenerate,
  true,
  "private invite and generate must agree on Live while public soft live is closed"
);

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const meRoute = read("app/api/me/route.ts");
const meClient = read("lib/meClient.ts");
const session = read("lib/session.ts");
const generateRoute = read("app/api/generate/route.ts");
const generationsRoute = read("app/api/generations/route.ts");
const landing = read("components/LandingToolPanel.tsx");
const create = read("components/CreateStudio.tsx");
const directorPlan = read("lib/directorPlan.ts");
const badge = read("components/CreditsBadge.tsx");
const freeCta = read("components/FreeTrialCta.tsx");
const healthRoute = read("app/api/health/route.ts");
const liveReadiness = read("lib/liveReadinessServer.ts");
const providerBudget = read("lib/durableProviderBudget.ts");
const privateResults = read("lib/privateGenerationResults.ts");

assert.match(meRoute, /probeSoftLiveReadiness/);
assert.match(meRoute, /resolvePrivateLiveAccess/);
assert.match(
  meRoute,
  /from\s+"@\/lib\/privateLiveAccessServer"/
);
assert.match(meRoute, /liveGenerationAccess/);
assert.match(meRoute, /routeAccess\.kind === "live"/);
assert.match(meRoute, /liveReadiness\.privatePreview\.ready/);
assert.match(meRoute, /liveReadiness\.privateInputAdmission\.ready/);
assert.match(meRoute, /canPreparePrivateInput/);
assert.match(meRoute, /"private-preview"/);
assert.match(meRoute, /credits:\s*0,[\s\S]{0,120}mode:\s*"demo-cached"/);
assert.match(meRoute, /canLiveGenerate:\s*false/);
assert.match(meRoute, /canLiveGenerate:\s*capability\.canLiveGenerate/);
assert.match(meRoute, /"X-Pikbo-Credits":\s*"0"/);
assert.match(meRoute, /"X-Pikbo-Can-Live-Generate":\s*"0"/);
assert.match(meClient, /me\.canLiveGenerate === true/);
assert.match(meClient, /"private-preview"/);
assert.match(meClient, /liveEnabled:[\s\S]{0,120}me\.canLiveGenerate === true/);
assert.match(
  session,
  /function publicCachedSession[\s\S]*credits:\s*0,[\s\S]*clipsLeft:\s*0/
);
assert.match(
  generateRoute,
  /session:\s*demo\s*\?\s*publicCachedSession\(session\)\s*:\s*publicSession\(session\)/
);
assert.match(generateRoute, /resolvePrivateLiveAccess/);
assert.match(
  generateRoute,
  /from\s+"@\/lib\/privateLiveAccessServer"/
);
assert.match(
  generateRoute,
  /const payload:\s*GenerateSuccess[\s\S]{0,400}demo:\s*true,[\s\S]{0,400}session:\s*publicCachedSession\(session\)/
);
assert.match(generationsRoute, /session:\s*publicCachedSession\(session\)/);
assert.match(landing, /const demoMode = !canLiveGenerate\(session\)/);
assert.match(landing, /generationDisplayCredits\(session\)/);
assert.match(directorPlan, /input\.modelClass === "seedance-fast"/);
assert.match(directorPlan, /Private Fast validation/);
assert.match(create, /modelClass:\s*effectiveModel/);
assert.doesNotMatch(landing, /\{session\.credits\} credits/);
assert.match(
  create,
  /const privateUploadEnabled = canUsePrivateLaunch\(session\)/
);
assert.match(create, /generationDisplayCredits\(session\)/);
assert.match(badge, /canLiveGenerate\(session\)/);
assert.match(badge, /cached previews · 0 credits/);
assert.match(freeCta, /canLiveGenerate\(me\)/);
assert.match(liveReadiness, /evaluatePrivatePreviewReadiness/);
assert.match(liveReadiness, /evaluatePrivateInputAdmissionReadiness/);
assert.match(liveReadiness, /privateInputsAssetRpcReady/);
assert.match(liveReadiness, /providerValidationEnvironmentGate/);
assert.match(
  liveReadiness,
  /providerValidationDeployment\.environmentAllowed/
);
assert.match(liveReadiness, /providerValidationBudgetUsd\(\)\s*>\s*0/);
assert.match(liveReadiness, /probeDurableProviderBudgetStore/);
assert.match(liveReadiness, /privateResultsProbe/);
assert.match(liveReadiness, /privateProviderOutputAllowlistConfigured/);
assert.match(liveReadiness, /parsePrivateLiveAllowlist/);
assert.match(liveReadiness, /Math\.floor\(/);
assert.match(providerBudget, /p_user_id:\s*null/);
assert.match(providerBudget, /rpcResult\.code === "AUTH_REQUIRED"/);
assert.match(privateResults, /p_user_id:\s*null/);
assert.match(privateResults, /rpcPayload\.code === "INVALID_IDENTITY"/);
assert.match(privateResults, /parseProviderOutputHostAllowlist/);
assert.match(healthRoute, /privatePreview:\s*privatePreview\.ready/);
assert.match(healthRoute, /missingPrivatePreviewRequirements/);
assert.match(healthRoute, /privateInputAdmission:\s*privateInputAdmission\.ready/);
assert.match(healthRoute, /missingPrivateInputAdmissionRequirements/);

console.log(
  "capability matrix regression: public and private readiness, anonymous, zero-wallet, delivery, spend, storage, and fully-ready states passed"
);
