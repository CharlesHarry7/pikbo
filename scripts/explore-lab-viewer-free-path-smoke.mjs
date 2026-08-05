#!/usr/bin/env node
/**
 * AIT-136 · Explore Lab Viewer free-path honesty (source smoke).
 *
 * Guests arriving from pricing free CTA (AIT-128 → /explore) must see:
 * - Above-fold Lab Viewer free-path honesty (cached demos only)
 * - Upload not processed / no live provider without private beta
 * - Primary Generate doors via createGenerate360Href("explore")
 * - No fake free live generation claims
 * - 390-safe overflow markers (min-w-0 / overflow-x-clip)
 *
 * Soft-checks pricing free → Explore when AIT-128 surface is present.
 * Fail-closed pure checks; no network, no provider, no secrets.
 *
 * Run: node scripts/explore-lab-viewer-free-path-smoke.mjs
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const explore = read("app/explore/page.tsx");
const grid = read("components/ExploreProjectGrid.tsx");
const freeTrial = read("components/FreeTrialCta.tsx");
const jobIntents = read("lib/jobIntents.ts");

// --- Free-path surface markers ---
assert.match(
  explore,
  /data-explore-lab-viewer=["']free-path["']/,
  "Explore must mark Lab Viewer free-path for pricing guests"
);
assert.match(
  explore,
  /data-explore-honesty=["']cached-only["']/,
  "Explore must mark honesty=cached-only"
);
assert.match(
  explore,
  /data-explore-mobile=["']390-safe["']/,
  "Explore must mark 390-safe layout contract"
);
assert.match(
  explore,
  /data-explore-free-path=["']honesty-chips["']/,
  "Above-fold honesty chips must be present for free-path guests"
);
assert.match(
  explore,
  /Lab Viewer · free path · cached demos only/i,
  "Eyebrow must name Lab Viewer free path + cached demos only"
);

// --- Honesty copy (above fold + FAQ) ---
assert.match(
  explore,
  /Your upload is not processed/i,
  "Above-fold must deny upload processing"
);
assert.match(
  explore,
  /No live provider call without private beta|No live provider without private beta/i,
  "Above-fold must deny live provider without private beta"
);
assert.match(
  explore,
  /Cached demos only/i,
  "Honesty chips must include Cached demos only"
);
assert.match(
  explore,
  /Upload not processed/i,
  "Honesty chips must include Upload not processed"
);
assert.match(
  explore,
  /Is Lab Viewer free generation of my photo\?/i,
  "FAQ must address free-path vs free live generation"
);
assert.match(
  explore,
  /cached demos only[\s\S]{0,200}upload is not processed/i,
  "FAQ free-path answer must stay fail-closed"
);
assert.doesNotMatch(
  explore,
  /free generations? per day|unlimited free (live|generate)|generate free live|free live generation for all/i,
  "Explore must not invent fake free live generation quotas"
);

// --- Generate → 360 doors (not bare /create Generate) ---
assert.match(
  jobIntents,
  /export function createGenerate360Href\s*\(/,
  "createGenerate360Href helper must exist"
);
assert.match(
  explore,
  /createGenerate360Href\(\s*["']explore["']\s*\)/,
  "Explore Generate doors must use createGenerate360Href(\"explore\")"
);
assert.match(
  explore,
  /const EXPLORE_GENERATE_HREF\s*=\s*createGenerate360Href/,
  "Primary Generate href must alias createGenerate360Href"
);
assert.match(
  explore,
  /data-explore-generate=["']remix["']/,
  "Primary Generate CTA must carry data-explore-generate=remix"
);
assert.match(
  explore,
  /data-explore-path-generate=["']remix["']/,
  "Path Generate link must carry data-explore-path-generate=remix"
);
assert.match(
  explore,
  /href=\{EXPLORE_GENERATE_HREF\}/,
  "Generate CTAs must bind EXPLORE_GENERATE_HREF"
);
// Free trial CTA must not claim live free gen when blocked
assert.match(
  freeTrial,
  /never claims public generation when it is closed|Prefer the cached sample when public generation is blocked/i,
  "FreeTrialCta must stay soft-launch fail-closed"
);
assert.match(
  freeTrial,
  /createLabSampleTryHref|FREE_TRIAL_TRY_HREF/,
  "FreeTrialCta demo path must use cached lab sample helper"
);
assert.match(
  explore,
  /labelDemo=["']Try cached sample["']/,
  "Explore FreeTrialCta must prefer honest cached-sample label"
);

// --- Grid stays Lab prototypes (not fake UGC free gen) ---
assert.match(grid, /Evidence pending|showcaseProvenanceLabel/);
assert.match(grid, /showcaseRecipeHref/);
assert.doesNotMatch(
  grid,
  /generate free live|free generations? per day|customer uploads only/i,
  "Explore grid must not claim free live gen or customer UGC"
);

// --- 390px overflow safety markers ---
assert.match(
  explore,
  /min-w-0/,
  "Explore free-path layout must use min-w-0 for narrow viewports"
);
assert.match(
  explore,
  /overflow-x-clip|overflow-x-hidden/,
  "Explore root must clip horizontal overflow at 390px"
);

// --- Soft handoff: pricing free CTA → Explore (AIT-128 when present) ---
const pricingPath = join(root, "app/pricing/page.tsx");
if (existsSync(pricingPath)) {
  const pricing = read("app/pricing/page.tsx");
  if (
    /LAB_VIEWER_EXPLORE_HREF|data-pricing-cta=["']lab-viewer-explore["']/.test(
      pricing
    )
  ) {
    assert.match(
      pricing,
      /const LAB_VIEWER_EXPLORE_HREF\s*=\s*["']\/explore["']/,
      "Pricing free Lab Viewer CTA must land on /explore"
    );
    assert.match(
      pricing,
      /href=\{LAB_VIEWER_EXPLORE_HREF\}/,
      "Pricing free card CTA must link LAB_VIEWER_EXPLORE_HREF"
    );
    assert.match(
      pricing,
      /data-pricing-cta=["']lab-viewer-explore["']/,
      "Pricing free CTA must carry lab-viewer-explore attribution"
    );
    console.log(
      "  · pricing free CTA → /explore present (AIT-128 surface locked)"
    );
  } else {
    console.log(
      "  · pricing free Lab Viewer CTA not yet on branch (AIT-128 pending) — Explore honesty still locked"
    );
  }
}

console.log(
  "explore-lab-viewer-free-path-smoke: PASS (Lab Viewer free-path honesty · Generate→360 · no fake free live · 390-safe)"
);
