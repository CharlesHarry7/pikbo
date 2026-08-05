#!/usr/bin/env node
/**
 * AIT-128 · Pricing free-tier token + closed-intent contract (source smoke).
 *
 * Locks Lab Viewer cream shelf + Founding Studio featured card honesty:
 * - free tier markers (data-pricing-tier, .pricing-free-card, stickers)
 * - free CTA stays Explore (not fake free generation)
 * - paid CTA stays data-billing-cta="closed-intent" without Stripe keys
 * - 390px-safe layout markers (min-w-0 / overflow / compare table)
 *
 * Fail-closed pure checks; no network, no Provider, no secrets.
 * Run: node scripts/pricing-free-tier-smoke.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const pricing = read("app/pricing/page.tsx");
const css = read("app/globals.css");
const checkoutBtn = read("components/PricingCheckoutButton.tsx");
const plans = read("lib/pricing.ts");

// --- Free tier surface ---
assert.match(
  pricing,
  /data-pricing-tier=["']free["']/,
  "pricing free card must expose data-pricing-tier=free"
);
assert.match(
  pricing,
  /className="[^"]*pricing-free-card/,
  "pricing free card must use .pricing-free-card cream shelf class"
);
assert.match(
  pricing,
  /data-pricing-plan=["']lab-viewer["']/,
  "free plan marker must be lab-viewer"
);
assert.match(
  pricing,
  /toy-sticker toy-sticker-lime/,
  "free card must mount stickers (lime)"
);
assert.match(
  pricing,
  /toy-corner-mark toy-corner-mark-tl/,
  "free card must mount corner marks"
);
assert.match(
  pricing,
  /const LAB_VIEWER_EXPLORE_HREF\s*=\s*["']\/explore["']/,
  "free CTA target must be Explore"
);
assert.match(
  pricing,
  /href=\{LAB_VIEWER_EXPLORE_HREF\}/,
  "free card CTA must link to Explore"
);
assert.match(
  pricing,
  /data-pricing-cta=["']lab-viewer-explore["']/,
  "free CTA must carry lab-viewer-explore attribution"
);
assert.match(
  pricing,
  /your upload is not processed on the public demo\s+path/i,
  "free tier must stay honest about upload handling"
);
assert.doesNotMatch(
  pricing,
  /free generations? per day|unlimited free (live|generate)|generate free live/i,
  "pricing must not invent fake free live generation quotas"
);

// --- Founding Studio + closed billing ---
assert.match(
  pricing,
  /data-pricing-state=["']closed-beta["']/,
  "Founding Studio card must stay closed-beta"
);
assert.match(
  pricing,
  /data-pricing-plan=["']founding-studio["']/,
  "paid plan marker must be founding-studio"
);
assert.match(
  pricing,
  /pricing-card pricing-card--featured/,
  "paid card must use featured pricing-card chrome"
);
assert.match(
  pricing,
  /PricingCheckoutButton[\s\S]*planId=["']founding_studio["']/,
  "Founding Studio must mount PricingCheckoutButton"
);
assert.match(
  checkoutBtn,
  /data-billing-cta=["']closed-intent["']/,
  "closed paid path must expose data-billing-cta=closed-intent"
);
assert.match(
  checkoutBtn,
  /NEXT_PUBLIC_PAYMENTS_ENABLED\s*===\s*["']1["']/,
  "client payments flag must stay explicit"
);
assert.match(
  checkoutBtn,
  /if\s*\(\s*!live\s*&&\s*planId\s*!==\s*["']free["']\s*\)/,
  "non-live paid plans must take the closed-intent branch"
);
assert.match(
  checkoutBtn,
  /Preview one Moment/,
  "closed paid CTA must offer Moment preview, not a live charge"
);
assert.doesNotMatch(
  checkoutBtn,
  /window\.location\.assign\([^)]*checkout\.stripe\.com/,
  "closed path must not hardcode Stripe Checkout redirect"
);

// --- Plan data honesty ---
assert.match(plans, /id:\s*["']free["']/);
assert.match(plans, /priceMonthly:\s*0/);
assert.match(plans, /id:\s*PAID_PLAN_ID|id:\s*["']founding_studio["']/);
assert.match(plans, /priceMonthly:\s*49/);
assert.match(
  plans,
  /Your upload is not processed on the public demo path/,
  "free plan blurb must deny public upload processing"
);

// --- CSS tokens (scoped free shelf; login collection-card untouched) ---
assert.match(css, /\.pricing-free-card\s*\{/, "missing .pricing-free-card rules");
assert.match(css, /--toy-cream:\s*#fff8e7/, "missing cream shelf token");
assert.match(css, /--toy-neon:\s*#39ff14/, "missing neon featured token");
assert.match(css, /\.pricing-card--featured\s*\{/, "missing featured card chrome");
assert.match(css, /\.pricing-card__stripe\s*\{/, "missing Most Popular stripe");
assert.match(
  css,
  /@media\s*\(max-width:\s*419px\)/,
  "must lock 390px mobile overflow rules (max-width 419)"
);
assert.match(
  css,
  /\.pricing-compare__table\s*\{[\s\S]*table-layout:\s*fixed/,
  "compare table must use fixed layout for narrow viewports"
);
// Login vault must keep collection-card, not be rewritten to pricing-free-card
const login = read("app/login/page.tsx");
assert.match(login, /collection-card/, "login vault must keep collection-card");
assert.doesNotMatch(
  login,
  /pricing-free-card/,
  "login must not import pricing free-tier cream shelf"
);

// --- 390px safety markers on page ---
assert.match(
  pricing,
  /data-pricing-mobile=["']390-safe["']/,
  "both plan cards should mark 390-safe layout contract"
);
assert.match(
  pricing,
  /min-w-0[\s\S]*pricing-free-card|pricing-free-card[\s\S]*min-w-0/,
  "free card / grid must use min-w-0 to prevent 390px overflow"
);
assert.match(
  pricing,
  /pricing-compare__table/,
  "compare table must use pricing-compare__table class"
);

console.log(
  "pricing-free-tier-smoke: PASS (free shelf tokens · Explore CTA · closed-intent paid · 390-safe)"
);
