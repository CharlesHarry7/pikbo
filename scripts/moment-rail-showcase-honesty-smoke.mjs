#!/usr/bin/env node
/**
 * MomentRail + HomeMomentShowcase residual concept honesty (AIT-197).
 *
 * Locks residual chrome outside MomentStage (AIT-189):
 * - Rail cards: Cached Lab / concept labels + data markers (not Official customer UGC)
 * - Showcase header dual doors: concept preview (`/create?moment=`) + Live-gated MOMENT_CREATE_HREF
 * - No bare untagged capsule-reveal create; no Official-as-customer CTA wording
 *
 * Complements home-moment-doors-smoke (AIT-176) and moment-stage-preview-honesty-smoke (AIT-189).
 *
 * Run: node scripts/moment-rail-showcase-honesty-smoke.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const softLaunch = read("lib/softLaunch.ts");
const rail = read("components/MomentRail.tsx");
const showcase = read("components/HomeMomentShowcase.tsx");

// --- Canonical private Moment href ---
assert.match(
  softLaunch,
  /export const MOMENT_CREATE_HREF\s*=\s*["']\/create\?mode=moment&effect=street-power-up["']/,
  "MOMENT_CREATE_HREF must be mode=moment + street-power-up"
);

// --- MomentRail: concept selection honesty ---
assert.match(rail, /data-moment-rail/);
assert.match(rail, /data-concept-rail=["']true["']/);
assert.match(rail, /data-concept-rail-item=\{moment\.id\}/);
assert.match(rail, /data-concept-preview=["']true["']/);
assert.match(rail, /data-concept-lab-chip/);
assert.match(rail, /Concept · Cached Lab/);
assert.match(rail, /Cached Lab/);
assert.match(rail, /aria-label=["']Concept toy moments · Cached Lab["']/);
assert.match(
  rail,
  /aria-label=\{`\$\{moment\.name\} concept · Cached Lab`\}/
);
// Rail is picker only — no Create/Generate product doors, no Official customer CTA
assert.doesNotMatch(rail, /href=["']\/create/);
assert.doesNotMatch(rail, /Official Concept|customer UGC|available now/i);
assert.doesNotMatch(rail, /Subscribe now|Buy now|Start free trial/i);
assert.doesNotMatch(rail, /MOMENT_CREATE_HREF/);

// --- HomeMomentShowcase: dual doors + rail chrome ---
assert.match(showcase, /MOMENT_CREATE_HREF/);
assert.match(
  showcase,
  /\$\{MOMENT_CREATE_HREF\}&source=home-moment-showcase/
);
assert.match(
  showcase,
  /\/create\?moment=capsule-reveal&source=home-moment-showcase/
);
assert.match(showcase, /data-concept-preview=["']true["']/);
assert.match(showcase, /data-live-gated=["']true["']/);
assert.match(showcase, /data-live-gated-chip/);
assert.match(showcase, /Live-gated/);
assert.match(showcase, /Cached Lab · not Live/);
assert.match(showcase, /Preview a concept/);
assert.match(showcase, /Create Street Power-Up/);
assert.match(showcase, /data-concept-rail-caption/);
assert.match(showcase, /Six concept directions · Cached Lab/);
assert.match(showcase, /<MomentRail/);

// No bare untagged concept href; no Official-as-customer CTA
assert.ok(
  !/href=["']\/create\?moment=capsule-reveal["']/.test(showcase),
  "showcase must not use untagged capsule-reveal href"
);
assert.doesNotMatch(showcase, /Preview an Official Concept/);
assert.doesNotMatch(showcase, /available now/i);
assert.doesNotMatch(showcase, /Private render available now/i);
assert.doesNotMatch(showcase, /Subscribe now|Buy now|Start free trial/i);
assert.doesNotMatch(showcase, /href=["']\/create["']/);
assert.doesNotMatch(showcase, /["']\/create\?effect=street-power-up/);

console.log("moment-rail-showcase-honesty-smoke: ok");
