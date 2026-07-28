/**
 * US$49 Launch Pack commercial-intake regression (source + pure helpers).
 * Locks: offer honesty, brief fields, payment-closed states, analytics hygiene,
 * fixed trio mapping, responsive markers. No checkout / provider / DB.
 *
 * Run: node scripts/launch-pack-commercial-regression.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const create = read("app/create/page.tsx");
const batch = read("components/BatchStudio.tsx");
const steps = read("components/SellerPackSteps.tsx");
const intentUi = read("components/LaunchPackOrderIntent.tsx");
const intentLib = read("lib/launchPackOrderIntent.ts");
const analytics = read("lib/analytics.ts");
const contract = read("lib/sellerPackContract.ts");

function loadTypeScriptModule(relativePath, dependencies = {}) {
  const source = readFileSync(join(root, relativePath), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "exports", "module", compiled)(
    (id) => {
      if (Object.hasOwn(dependencies, id)) return dependencies[id];
      // Relative imports inside pure modules
      if (id.startsWith("./") || id.startsWith("../")) {
        const resolved = join(relativePath, "..", id).replace(/\\/g, "/");
        const norm = resolved.endsWith(".ts") ? resolved : `${resolved}.ts`;
        // From scripts context: resolve relative to repo root file path
        const fromRoot = join(root, relativePath, "..", id.replace(/^\.\//, ""));
        const candidates = [
          fromRoot.endsWith(".ts") ? fromRoot : `${fromRoot}.ts`,
          join(root, "lib", id.replace("./", "") + (id.endsWith(".ts") ? "" : ".ts")),
        ];
        for (const candidate of candidates) {
          try {
            const depSource = readFileSync(candidate, "utf8");
            const depCompiled = ts.transpileModule(depSource, {
              compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES2022,
              },
            }).outputText;
            const depLoaded = { exports: {} };
            new Function("require", "exports", "module", depCompiled)(
              () => {
                throw new Error(`nested unexpected import from ${candidate}`);
              },
              depLoaded.exports,
              depLoaded
            );
            return depLoaded.exports;
          } catch (err) {
            if (err && err.code === "ENOENT") continue;
            if (err && String(err.message || err).includes("nested unexpected")) {
              throw err;
            }
            // try next
          }
        }
        void norm;
        throw new Error(`unresolved relative import ${id} from ${relativePath}`);
      }
      throw new Error(`unexpected ${relativePath} import: ${id}`);
    },
    loaded.exports,
    loaded
  );
  return loaded.exports;
}

// Prefer explicit dependency injection for the pure contract pair.
const contractModule = loadTypeScriptModule("lib/sellerPackContract.ts");
const intentModule = loadTypeScriptModule("lib/launchPackOrderIntent.ts", {
  "./sellerPackContract": contractModule,
  "./sellerPackContract.ts": contractModule,
});

// ─── Offer surface ───
assert.match(create, /US\$49 one-time/);
assert.match(create, /Payment is not open yet/);
assert.match(create, /LaunchPackOrderIntent/);
assert.match(create, /Product showcase/);
assert.match(create, /Reveal or\s*unboxing-style draft/);
assert.match(create, /Social Hook/);
assert.match(create, /24-hour\s*delivery target/);
assert.match(create, /one revision/i);
assert.match(create, /Launch Pack — 3 assets · quote shown before Live/);
assert.match(create, /One photo → your Launch Pack/);
assert.match(create, /overflow-x-hidden/);
assert.match(create, /pb-\[calc\(7\.5rem\+env\(safe-area-inset-bottom\)\)\]/);

assert.match(intentUi, /data-launch-pack-order-intent="us49"/);
assert.match(intentUi, /data-launch-pack-payment="not-open"/);
assert.match(intentUi, /data-launch-pack-price="49"/);
assert.match(intentUi, /data-launch-pack-delivery-hours="24"/);
assert.match(intentUi, /data-launch-pack-revisions="1"/);
assert.match(intentUi, /data-launch-pack-payment-beside-cta="not-open"/);
assert.match(intentUi, /data-launch-pack-field="contactMethod"/);
assert.match(intentUi, /data-launch-pack-field="localImage"/);
assert.match(intentUi, /data-launch-pack-field="materialRights"/);
assert.match(intentUi, /data-launch-pack-field="intendedChannel"/);
assert.match(intentUi, /data-launch-pack-field="expectedStyle"/);
assert.match(intentUi, /data-launch-pack-field="deliveryNotes"/);
assert.match(intentUi, /data-launch-pack-export="copy-brief"/);
assert.match(intentUi, /data-launch-pack-export="download-brief"/);
assert.match(intentUi, /data-launch-pack-next-step="intake-unconfigured"/);
assert.match(intentUi, /Payment is not open yet/);
assert.match(intentUi, /no owner intake endpoint is configured/i);
assert.match(intentUi, /selected once in the Create studio above/i);
assert.doesNotMatch(intentUi, /type="file"|readAsDataURL|launch-pack-order-image/);
assert.equal(
  (batch.match(/id="seller-pack-photo-input"/g) || []).length,
  1,
  "Launch Pack must have one owned-photo picker, in Create studio"
);
assert.doesNotMatch(intentUi, /localStorage/);
assert.doesNotMatch(intentUi, /sessionStorage/);
// Honest closed-payment copy may mention Stripe; forbid real checkout wiring.
assert.doesNotMatch(intentUi, /checkout\.sessions|loadStripe|stripe\.com|markPaid/i);
assert.match(intentUi, /does not charge a card, open\s*Stripe/i);
assert.doesNotMatch(intentUi, /fetch\s*\(\s*['"`]\/api\//);

// ─── BatchStudio preserves generation honesty + commercial note ───
assert.match(batch, /data-launch-pack-commercial-note="us49-payment-closed"/);
assert.match(batch, /Payment is not open yet/);
assert.match(batch, /data-launch-pack-primary-action="2"/);
assert.match(
  batch,
  /data-launch-pack-primary-action=\{image \? "3" : "1"\}/
);
assert.match(batch, /data-launch-pack-export="downloadable-only"/);
assert.match(batch, /<SellerPackSteps step=\{sellerStep\} demoMode=\{demoMode\} \/>/);
assert.doesNotMatch(batch, /stripe\.com|createCheckout|markOrderPaid/i);

// ─── Seller Pack steps keep cached quote truth ───
assert.match(
  steps,
  /demoMode\s*\?\s*"3 cached prototype previews · 0 credits"/
);
assert.match(steps, /Export Launch Pack/);
assert.match(steps, /payment not open/);

// ─── Frozen trio still authoritative ───
for (const slug of [
  "360-spin-showcase",
  "blind-box-unboxing",
  "paparazzi-flash",
]) {
  assert.match(contract, new RegExp(`"${slug}"`));
  assert.match(intentLib, new RegExp(slug));
}
assert.match(intentLib, /priceUsd: 49/);
assert.match(intentLib, /paymentOpen: false/);
assert.match(intentLib, /deliveryTargetHours: 24/);
assert.match(intentLib, /revisionsIncluded: 1/);
assert.match(intentLib, /ready_for_manual_review/);
assert.match(intentLib, /payment_not_open/);
assert.match(intentLib, /"draft"/);
assert.doesNotMatch(
  intentLib,
  /status:\s*"(paid|accepted|in_production|delivered|submitted)"/
);

// ─── Analytics: conversion events, sensitive exclusion ───
assert.match(analytics, /"launch_pack_offer_view"/);
assert.match(analytics, /"launch_pack_brief_start"/);
assert.match(analytics, /"launch_pack_brief_ready"/);
assert.match(analytics, /contact|note|notes|filename/i);
assert.match(intentUi, /launch_pack_offer_view/);
assert.match(intentUi, /launch_pack_brief_start/);
assert.match(intentUi, /launch_pack_brief_ready/);
// Analytics calls only pass pure meta helpers — never free-text brief fields.
assert.match(
  intentUi,
  /meta:\s*launchPackOfferAnalyticsMeta\(\)|meta:\s*launchPackBriefAnalyticsMeta\(/
);
assert.doesNotMatch(
  intentUi,
  /track\(\{[\s\S]{0,200}contactMethod|track\(\{[\s\S]{0,200}deliveryNotes|track\(\{[\s\S]{0,200}localImageName/
);
const trackBlocks = intentUi.match(/track\(\{[\s\S]*?\}\);/g) || [];
assert.ok(trackBlocks.length >= 3, "expected offer/start/ready track calls");
for (const block of trackBlocks) {
  assert.doesNotMatch(block, /contactMethod|deliveryNotes|localImageName|contact/);
}

// ─── Pure helper behavior ───
const {
  evaluateLaunchPackOrderBrief,
  launchPackPaymentDisclosure,
  formatLaunchPackBriefForExport,
  launchPackOfferAnalyticsMeta,
  launchPackBriefAnalyticsMeta,
  isForbiddenLaunchPackStatus,
  isLaunchPackIntakeConfigured,
  LAUNCH_PACK_OFFER,
  LAUNCH_PACK_DELIVERABLES,
  LAUNCH_PACK_FORBIDDEN_STATUSES,
} = intentModule;

assert.equal(LAUNCH_PACK_OFFER.priceUsd, 49);
assert.equal(LAUNCH_PACK_OFFER.paymentOpen, false);
assert.equal(LAUNCH_PACK_OFFER.deliveryTargetHours, 24);
assert.equal(LAUNCH_PACK_OFFER.revisionsIncluded, 1);
assert.equal(LAUNCH_PACK_DELIVERABLES.length, 3);
assert.deepEqual(
  LAUNCH_PACK_DELIVERABLES.map((d) => d.recipeSlug),
  ["360-spin-showcase", "blind-box-unboxing", "paparazzi-flash"]
);
assert.equal(isLaunchPackIntakeConfigured(), false);

const draft = evaluateLaunchPackOrderBrief({
  contactMethod: "",
  hasLocalImage: false,
  materialRightsConfirmed: false,
  intendedChannel: "",
  expectedStyle: "",
  deliveryNotes: "",
});
assert.equal(draft.status, "draft");
assert.equal(draft.complete, false);
assert.equal(draft.paymentOpen, false);
assert.equal(draft.intakeConfigured, false);
assert.ok(draft.missing.includes("contactMethod"));
assert.ok(draft.missing.includes("localImage"));
assert.ok(draft.missing.includes("materialRights"));
assert.ok(draft.missing.includes("intendedChannel"));
assert.ok(draft.missing.includes("expectedStyle"));
assert.ok(draft.missing.includes("deliveryNotes"));
assert.match(draft.nextStepMessage, /Payment stays closed|payment/i);

const ready = evaluateLaunchPackOrderBrief({
  contactMethod: "seller@example.test",
  hasLocalImage: true,
  materialRightsConfirmed: true,
  intendedChannel: "etsy",
  expectedStyle: "sales_fidelity",
  deliveryNotes: "Keep paint apps exact; drop Friday.",
});
assert.equal(ready.status, "ready_for_manual_review");
assert.equal(ready.complete, true);
assert.equal(ready.paymentOpen, false);
assert.equal(ready.missing.length, 0);
assert.match(ready.nextStepMessage, /no owner intake endpoint is configured/i);
assert.match(ready.nextStepMessage, /no checkout/i);
assert.doesNotMatch(
  ready.nextStepMessage,
  /order (is |was )?(paid|submitted|accepted)|payment (succeeded|complete)/i
);

const pay = launchPackPaymentDisclosure();
assert.equal(pay.status, "payment_not_open");
assert.match(pay.label, /Payment is not open yet/i);

for (const bad of LAUNCH_PACK_FORBIDDEN_STATUSES) {
  assert.equal(isForbiddenLaunchPackStatus(bad), true);
}
assert.equal(isForbiddenLaunchPackStatus("draft"), false);
assert.equal(isForbiddenLaunchPackStatus("ready_for_manual_review"), false);
assert.equal(isForbiddenLaunchPackStatus("payment_not_open"), false);

const exportText = formatLaunchPackBriefForExport({
  contactMethod: "seller@example.test",
  intendedChannel: "tiktok",
  expectedStyle: "social_energy",
  deliveryNotes: "Hook in first second",
  materialRightsConfirmed: true,
  hasLocalImage: true,
  localImageName: "my-toy.png",
  evaluatedAt: "2026-07-28T00:00:00.000Z",
});
assert.match(exportText, /US\$49/);
assert.match(exportText, /Payment open: no/);
assert.match(exportText, /ready_for_manual_review/);
assert.match(exportText, /360-spin-showcase/);
assert.match(exportText, /blind-box-unboxing/);
assert.match(exportText, /paparazzi-flash/);
assert.match(exportText, /seller@example\.test/);
assert.doesNotMatch(exportText, /data:image|base64,/i);

const offerMeta = launchPackOfferAnalyticsMeta();
assert.equal(offerMeta.price_usd, 49);
assert.equal(offerMeta.payment_open, false);
assert.equal(Object.keys(offerMeta).some((k) => /contact|note|image|email/i.test(k)), false);

const briefMeta = launchPackBriefAnalyticsMeta(ready);
assert.equal(briefMeta.brief_complete, true);
assert.equal(briefMeta.brief_status, "ready_for_manual_review");
assert.equal(briefMeta.payment_open, false);
assert.equal(briefMeta.intake_configured, false);
assert.equal(
  Object.keys(briefMeta).some((k) => /contact|note|image|email|url/i.test(k)),
  false
);

// Sensitive values must not appear as analytics meta values either
const metaBlob = JSON.stringify({ offerMeta, briefMeta });
assert.doesNotMatch(metaBlob, /seller@example|my-toy\.png|Hook in first/);

// ─── Layout contract markers for 390px / 1440px review ───
assert.match(intentUi, /min-w-0/);
assert.match(intentUi, /overflow-x-hidden/);
assert.match(intentUi, /sm:grid-cols-3/);
assert.match(intentUi, /min-h-11/);
assert.match(batch, /data-launch-pack-payment-beside-generate="not-open"/);
assert.match(batch, /data-launch-pack-payment-beside-generate="not-open-mobile"/);

console.log(
  "launch-pack-commercial-regression: PASS (US$49 offer · payment closed · six brief fields · pure states · analytics hygiene · fixed trio · layout markers)"
);
