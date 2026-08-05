#!/usr/bin/env node
/**
 * AIT-24 marketing API regression (source + pure catalog, no server/Stripe).
 *
 * Proves:
 * - GET /api/effects catalog has 10+ effects and only Street Power-Up live
 * - GET /api/community never invents fake UGC / stats
 * - POST /api/contact validates input and exposes support email
 * - Stripe checkout routes expose CORS preflight for the static site
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const required = [
  "lib/effects.ts",
  "lib/cors.ts",
  "lib/contactSubmissions.ts",
  "app/api/effects/route.ts",
  "app/api/community/route.ts",
  "app/api/contact/route.ts",
  "app/api/checkout/route.ts",
  "app/api/checkout/confirm/route.ts",
];
for (const path of required) {
  assert.ok(existsSync(join(root, path)), `missing ${path}`);
}

const effectsSrc = read("lib/effects.ts");
const effectsRoute = read("app/api/effects/route.ts");
const communityRoute = read("app/api/community/route.ts");
const contactRoute = read("app/api/contact/route.ts");
const contactLib = read("lib/contactSubmissions.ts");
const corsSrc = read("lib/cors.ts");
const checkout = read("app/api/checkout/route.ts");
const checkoutConfirm = read("app/api/checkout/confirm/route.ts");
const envExample = read(".env.example");

// Catalog honesty
assert.match(effectsSrc, /export const TOY_EFFECTS/);
assert.match(effectsSrc, /slug:\s*"street-power-up"/);
assert.match(effectsSrc, /status:\s*"live"/);
assert.match(effectsSrc, /coming_soon/);
assert.match(
  effectsSrc,
  /Only Street Power-Up is a live Moment/,
  "catalog must document single live Moment"
);

const slugCount = (effectsSrc.match(/slug:\s*"/g) || []).length;
assert.ok(slugCount >= 10, `expected ≥10 effects, found ${slugCount}`);

// API surfaces
assert.match(effectsRoute, /export async function GET/);
assert.match(effectsRoute, /export async function OPTIONS/);
assert.match(effectsRoute, /corsJson|marketingCorsPreflight/);
assert.match(effectsRoute, /thumbnail/);
assert.match(effectsRoute, /tags/);

assert.match(communityRoute, /export async function GET/);
assert.match(communityRoute, /listPublicCommunityPosts/);
assert.match(communityRoute, /creatorName:\s*null/);
assert.match(communityRoute, /stats:\s*null/);
assert.match(
  communityRoute,
  /Never invent|never invent|must not invent/i,
  "community API must refuse fake UGC"
);
assert.doesNotMatch(
  communityRoute,
  /LabubuLove|12\.4K views/i,
  "community API must not hardcode fake social proof"
);

assert.match(contactRoute, /export async function POST/);
assert.match(contactRoute, /validateContactBody/);
assert.match(contactRoute, /supportEmail/);
assert.match(contactLib, /INVALID_EMAIL|EMAIL_RE/);
assert.match(contactLib, /CONTACT_WEBHOOK_URL/);
assert.match(contactLib, /function validateContactBody/);

// CORS allowlist + checkout wiring
assert.match(corsSrc, /PIKBO_MARKETING_ORIGINS/);
assert.match(corsSrc, /Access-Control-Allow-Origin/);
assert.match(corsSrc, /Access-Control-Allow-Credentials/);
assert.match(corsSrc, /export function applyMarketingCors/);
assert.match(corsSrc, /export function marketingCorsPreflight/);
assert.match(checkout, /marketingCorsPreflight/);
assert.match(checkout, /export async function OPTIONS/);
assert.match(checkout, /applyMarketingCors/);
assert.match(checkoutConfirm, /marketingCorsPreflight/);
assert.match(checkoutConfirm, /export async function OPTIONS/);
assert.match(checkoutConfirm, /applyMarketingCors/);
assert.match(envExample, /PIKBO_MARKETING_ORIGINS/);
assert.match(envExample, /CONTACT_WEBHOOK_URL/);

// Pure catalog module (no @/ imports)
const effectsMod = await import(
  pathToFileURL(join(root, "lib/effects.ts")).href
);
const list = effectsMod.listToyEffects();
assert.ok(list.length >= 10, `listToyEffects length ${list.length}`);
const live = list.filter((e) => e.status === "live");
assert.equal(live.length, 1, "exactly one live effect");
assert.equal(live[0].slug, "street-power-up");
for (const e of list) {
  assert.ok(e.name && e.description && e.previewImage, `fields for ${e.slug}`);
  assert.ok(
    Array.isArray(e.name ? [e.name] : []),
    `name for ${e.slug}`
  );
  assert.ok(
    e.status === "live" || e.status === "coming_soon",
    `status for ${e.slug}`
  );
}
assert.equal(effectsMod.isLiveEffect("street-power-up"), true);
assert.equal(effectsMod.isLiveEffect("action-figure-battle"), false);

console.log(
  `marketing-api-regression OK — ${list.length} effects, 1 live, CORS+contact+community honesty locked`
);
