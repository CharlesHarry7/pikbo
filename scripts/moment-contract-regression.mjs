#!/usr/bin/env node
/**
 * Moment contract regression (source-only, no Provider/Stripe calls).
 *
 * This is intentionally a small boundary test.  The UI may grow around the
 * Moment, but it must keep one explicit product contract all the way to the
 * server.  The server remains the authority for the fixed generation shape;
 * this test only proves the reviewed markers are present and that the payment
 * gate has not been weakened.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`moment contract regression failed: ${message}`);
  }
}

function assertMatch(source, pattern, message) {
  assert(pattern.test(source), message);
}

function assertNoMomentSellerPackHref(source, label) {
  // Do not ban legacy Seller Pack copy elsewhere.  Only Moment-owned links
  // are forbidden from silently changing the user's product path.
  assertNoMatch(
    source,
    /href\s*=\s*\{[\s\S]{0,220}seller-pack/i,
    `${label} contains a Moment CTA that jumps to seller-pack`
  );
}

function assertNoMatch(source, pattern, message) {
  assert(!pattern.test(source), message);
}

const studio = read("components/CreateStudio.tsx");
const contracts = read("lib/contracts.ts");
const generate = read("app/api/generate/route.ts");
const models = read("lib/models.ts");
const costGuard = read("lib/durableProviderBudget.ts");
const momentStage = read("components/MomentStage.tsx");
const momentPreview = read("components/MomentCreatePreview.tsx");
const stripe = read("lib/stripe.ts");
const checkout = read("app/api/checkout/route.ts");
const pricing = read("app/pricing/page.tsx");
const pricingButton = read("components/PricingCheckoutButton.tsx");
const softLaunch = read("lib/softLaunch.ts");
const homePage = read("app/page.tsx");
const homeHero = read("components/HomeCinemaHero.tsx");
const libraryPage = read("app/library/page.tsx");
const libraryGrid = read("components/LibraryGrid.tsx");

// 1. Moment CTA is a Moment path, never the legacy Seller Pack path.
assertMatch(
  momentStage,
  /href\s*=\s*\{`\/create\?moment=\$\{moment\.id\}`\}/,
  "MomentStage must route its primary CTA through /create?moment=..."
);
assertNoMomentSellerPackHref(momentStage, "MomentStage");
assertNoMomentSellerPackHref(momentPreview, "MomentCreatePreview");
assertMatch(
  softLaunch,
  /MOMENT_CREATE_HREF\s*=\s*[\s\S]{0,100}\/create\?mode=moment&effect=street-power-up/,
  "primary Create navigation must use the fixed first-dollar Moment"
);
assertMatch(
  homeHero,
  /href=\{MOMENT_CREATE_HREF\}/,
  "homepage create CTA must enter the fixed Moment, not generic Studio"
);
assertNoMatch(
  homePage,
  /PublicLaunchPackSample/,
  "homepage must not restore the archived three-video Pack"
);
assertMatch(
  studio,
  /const fixedMomentNextPath\s*=\s*[\s\S]{0,220}MOMENT_CREATE_HREF/,
  "fixed Moment gate must derive its sign-in return path from the shared Moment href"
);
assertMatch(
  studio,
  /const privateMomentLoginHref\s*=\s*`\/login\?next=\$\{encodeURIComponent\([\s\S]{0,120}fixedMomentNextPath[\s\S]{0,40}\)\}`/,
  "fixed Moment gate must preserve the exact Moment path through login"
);
assertMatch(
  studio,
  /fixedMomentContract\s*&&\s*!session\?\.signedIn\s*\?\s*\([\s\S]{0,600}data-public-single-preview-sign-in[\s\S]{0,120}Sign in to create with your toy/,
  "only anonymous fixed Moment visitors may receive the exact-path sign-in action"
);
assertMatch(
  libraryPage,
  /href=\{`\$\{MOMENT_CREATE_HREF\}&source=library-empty`\}/,
  "Library create CTA must return to the fixed Moment"
);
assertMatch(
  libraryGrid,
  /async function download\(job: GenerationJob\)[\s\S]{0,500}const headers = await privateDownloadHeaders\(\)[\s\S]{0,240}fetch\(gateUrl,\s*\{[\s\S]{0,100}method:\s*[\"']HEAD[\"'][\s\S]{0,100}headers/,
  "Library account downloads must authenticate the private result HEAD gate"
);

// 2. The client carries an explicit, typed contract rather than relying on
// effect/model/aspect fields inferred from UI state.
assertMatch(
  contracts,
  /productContract\??\s*:/,
  "GenerateRequestBody must declare productContract"
);
assertMatch(
  studio,
  /productContract\s*:\s*(?:fixedMomentContract\s*\?\s*)?["']toy-moment-v1["']/,
  "CreateStudio must send productContract=toy-moment-v1"
);
assertMatch(
  studio,
  /!fixedMomentContract\s*\?\s*\([\s\S]{0,1800}create-advanced-options/,
  "fixed Moment must hide model and prompt decisions"
);
assertMatch(
  studio,
  /data-fixed-moment-upgrade[\s\S]{0,180}9 Moments\/month · \$49/,
  "fixed Moment result must expose the single Founding Studio upgrade"
);

// 3. Server receives and validates the same contract.  Keep these checks
// source-level so this regression never needs credentials or provider spend.
assertMatch(
  generate,
  /productContract/,
  "generate route must read productContract"
);
assertMatch(
  generate,
  /toy-moment-v1/,
  "generate route must recognize toy-moment-v1"
);
for (const [label, pattern] of [
  ["Street Power-Up effect", /street-power-up/],
  ["vertical aspect", /9:16/],
  ["five-second duration", /\b5\b/],
  ["720p resolution", /720p/],
  ["Seedance Fast model", /seedance-fast/],
]) {
  assertMatch(
    generate,
    pattern,
    `generate route must retain the fixed Moment ${label} contract`
  );
}
for (const [label, pattern] of [
  ["Street Power-Up effect", /FIXED_MOMENT_EFFECT\s*=\s*["']street-power-up["']/],
  ["vertical aspect", /fixedMomentContract\s*\?\s*["']9:16["']/],
  ["five-second duration", /fixedMomentContract\s*\?\s*5/],
  ["720p resolution", /fixedMomentContract\s*\?\s*["']720p["']/],
  ["Seedance Fast model", /fixedMomentContract\s*\?\s*["']seedance-fast["']/],
]) {
  assertMatch(
    studio,
    pattern,
    `CreateStudio must lock the fixed Moment ${label} field`
  );
}
assertMatch(
  models,
  /modelForPrivateLive[\s\S]{0,260}SEEDANCE_FAST|return\s+SEEDANCE_FAST/,
  "private-live model selection must stay pinned to Seedance Fast"
);
assertMatch(
  costGuard,
  /function\s+modelAdmitted[\s\S]{0,180}SEEDANCE_FAST/,
  "provider budget must admit only the reviewed private-live model"
);

// Every direct live account, including a private validation invite, may use a
// single clip only through the explicit Moment contract. Any arbitrary single
// request must still hit the fail-closed rejection branch; Seller Pack
// children remain the other private compatibility path.
assertMatch(
  generate,
  /if\s*\(\s*!packChild\s*&&\s*!fixedMomentRequest\s*\)[\s\S]{0,320}LIVE_ACCESS_REQUIRED/,
  "Every direct live generation must be gated by the fixed Moment contract"
);

// 4. Production Stripe must remain fail-closed.  Live keys require both the
// explicit launch switch and the rehearsed refund/dispute guard; the Checkout
// route must invoke that function before creating a session.
assertMatch(
  stripe,
  /process\.env\.PAYMENTS_LIVE\s*===\s*["']1["']/,
  "Stripe live Checkout must require PAYMENTS_LIVE=1"
);
assertMatch(
  stripe,
  /process\.env\.STRIPE_REFUND_DISPUTE_GUARD_READY\s*===\s*["']1["']/,
  "Stripe live Checkout must require the refund/dispute guard"
);
assertMatch(
  checkout,
  /stripeLiveCheckoutAllowed\(\)/,
  "Checkout route must enforce the Stripe live gate"
);
assertMatch(
  checkout,
  /success_url[\s\S]{0,180}\/create\?mode=moment&effect=street-power-up&checkout=return/,
  "successful Checkout must return to the fixed Moment workflow"
);
assertMatch(
  pricing,
  /public(?: live)? payment remains locked|public live checkout remains gated|public pricing and checkout are closed/i,
  "public pricing page must keep payment locked until validation gates pass"
);
assertMatch(
  pricingButton,
  /process\.env\.NEXT_PUBLIC_PAYMENTS_ENABLED\s*===\s*["']1["']/,
  "client Checkout must remain disabled unless the explicit payments flag is enabled"
);
assertMatch(
  pricingButton,
  /acceptance\?\.privatePreview\s*===\s*true[\s\S]{0,180}readyForTestCheckout\s*===\s*true/,
  "test Checkout must require private Preview and server test-billing readiness"
);

console.log(
  "moment contract regression: PASS (Moment CTA path · explicit toy-moment-v1 · fixed 9:16/5s/720p Seedance Fast · arbitrary single fail-closed · Stripe production gate)"
);
