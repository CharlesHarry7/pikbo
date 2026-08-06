#!/usr/bin/env node
/**
 * MomentStage + MomentCreatePreview concept honesty (AIT-189).
 *
 * Locks:
 * - Concept doors stay `/create?moment=` with Cached Lab / concept labels
 * - Primary private Create uses MOMENT_CREATE_HREF with Live-gated chip
 * - data-live-gated / data-concept-preview markers present
 * - No Official-as-customer CTA wording; no "available now" private render
 * - No open-checkout language on private doors
 *
 * Run: node scripts/moment-stage-preview-honesty-smoke.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const softLaunch = read("lib/softLaunch.ts");
const stage = read("components/MomentStage.tsx");
const preview = read("components/MomentCreatePreview.tsx");

// --- Canonical private Moment href ---
assert.match(
  softLaunch,
  /export const MOMENT_CREATE_HREF\s*=\s*["']\/create\?mode=moment&effect=street-power-up["']/,
  "MOMENT_CREATE_HREF must be mode=moment + street-power-up"
);

// --- MomentStage ---
// Concept door keeps moment= path
assert.match(
  stage,
  /href=\{`\/create\?moment=\$\{moment\.id\}`\}/,
  "MomentStage concept door must use /create?moment="
);
assert.match(stage, /data-moment-primary-cta=\{moment\.id\}/);
assert.match(stage, /data-concept-preview=["']true["']/);
assert.match(stage, /Cached Lab · not Live|Concept · Cached Lab/);
assert.match(stage, /Preview with my toy/);

// Primary private Create uses MOMENT_CREATE_HREF + Live-gated
assert.match(stage, /MOMENT_CREATE_HREF/);
assert.match(
  stage,
  /\$\{MOMENT_CREATE_HREF\}&source=moment-stage/
);
assert.match(stage, /data-live-gated=["']true["']/);
assert.match(stage, /data-live-gated-chip/);
assert.match(stage, /Live-gated/);
assert.match(stage, /not open checkout/i);

// Honesty: no Official-as-customer CTA, no available-now private claim
assert.doesNotMatch(stage, /Preview an Official Concept/);
assert.doesNotMatch(stage, /available now/i);
assert.doesNotMatch(stage, /Private render available now/i);
assert.doesNotMatch(stage, /Subscribe now|Buy now|Start free trial/i);
assert.doesNotMatch(stage, /href=["']\/create["']/);
assert.doesNotMatch(stage, /["']\/create\?effect=street-power-up/);

// --- MomentCreatePreview ---
assert.match(preview, /MOMENT_CREATE_HREF/);
assert.match(preview, /data-concept-preview=["']true["']/);
assert.match(preview, /Concept · Cached Lab/);
assert.doesNotMatch(preview, /Official Concept/);

// Sign-in next keeps moment id only (concept Lab composition)
assert.match(
  preview,
  /const conceptLoginNext = `\/create\?moment=\$\{moment\.id\}`/
);
assert.match(
  preview,
  /\/login\?next=\$\{encodeURIComponent\(conceptLoginNext\)\}/
);

// Private doors via MOMENT_CREATE_HREF
assert.match(
  preview,
  /\$\{MOMENT_CREATE_HREF\}&source=moment-\$\{moment\.id\}/
);
assert.match(
  preview,
  /\$\{MOMENT_CREATE_HREF\}&source=moment-input-\$\{moment\.id\}/
);
assert.match(
  preview,
  /\$\{MOMENT_CREATE_HREF\}&source=moment-preview-door/
);
assert.match(preview, /data-live-gated=["']true["']/);
assert.match(preview, /Live-gated/);
assert.match(preview, /not open checkout/i);

// No dishonest private claims / open checkout
assert.doesNotMatch(preview, /available now/i);
assert.doesNotMatch(preview, /Private render available now/i);
assert.doesNotMatch(preview, /Subscribe now|Buy now|Start free trial/i);
assert.doesNotMatch(preview, /create\?mode=seller-pack/);
assert.doesNotMatch(preview, /href=["']\/create["']/);
assert.doesNotMatch(preview, /["']\/create\?effect=street-power-up/);

console.log("moment-stage-preview-honesty-smoke: ok");
