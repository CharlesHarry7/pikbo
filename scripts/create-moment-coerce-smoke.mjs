#!/usr/bin/env node
/**
 * Create route: bare street-power-up → mode=moment coerce (source + runtime).
 *
 * Defense-in-depth for legacy/external deep links. Generate→360 remixes must
 * stay untouched. Source markers prove the create page soft-redirects; pure
 * helper cases prove preserve keys and non-Moment effects.
 *
 * Run: node --experimental-strip-types scripts/create-moment-coerce-smoke.mjs
 *   or: npm run create-moment-coerce-smoke
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");

const createPage = read("app/create/page.tsx");
const coerceLib = read("lib/createMomentCoerce.ts");
const softLaunch = read("lib/softLaunch.ts");

// ── Source markers ──────────────────────────────────────────────────────────

assert.match(
  softLaunch,
  /export const MOMENT_CREATE_HREF\s*=\s*["']\/create\?mode=moment&effect=street-power-up["']/,
  "MOMENT_CREATE_HREF must remain the fixed Moment contract"
);

assert.match(
  coerceLib,
  /export function coerceBareStreetPowerUpToMomentHref/,
  "coerce helper must be exported"
);
assert.match(
  coerceLib,
  /FIXED_MOMENT_EFFECT\s*=\s*["']street-power-up["']/,
  "coerce helper pins street-power-up"
);
assert.match(
  coerceLib,
  /FIXED_MOMENT_MODE\s*=\s*["']moment["']/,
  "coerce helper pins mode=moment"
);
assert.match(
  coerceLib,
  /360-spin-showcase|Generate→360|never rewritten/i,
  "coerce module documents that Generate→360 is left alone"
);
for (const key of ["source", "sku", "try", "sample"]) {
  assert.match(
    coerceLib,
    new RegExp(`["']${key}["']`),
    `coerce helper must preserve ${key}`
  );
}

assert.match(
  createPage,
  /coerceBareStreetPowerUpToMomentHref/,
  "create page must import/call the coerce helper"
);
assert.match(
  createPage,
  /redirect\(\s*coercedMomentHref\s*\)/,
  "create page must soft-redirect bare street-power-up into mode=moment"
);
assert.match(
  createPage,
  /fixedMomentContract/,
  "create page must still render the fixed Moment contract UI"
);
// 360 remix path must not be forced into mode=moment by this defense layer.
assert.doesNotMatch(
  createPage,
  /360-spin-showcase[\s\S]{0,80}redirect|redirect[\s\S]{0,80}360-spin-showcase/,
  "create page must not redirect Generate→360 into Moment"
);

// ── Runtime pure cases ──────────────────────────────────────────────────────

const { coerceBareStreetPowerUpToMomentHref, FIXED_MOMENT_EFFECT } =
  await import(
    pathToFileURL(join(root, "lib/createMomentCoerce.ts")).href
  );

function q(href) {
  const i = href.indexOf("?");
  return new URLSearchParams(i >= 0 ? href.slice(i + 1) : "");
}

// Bare legacy deep link → fixed Moment
{
  const href = coerceBareStreetPowerUpToMomentHref({
    effect: "street-power-up",
  });
  assert.equal(
    href,
    "/create?mode=moment&effect=street-power-up",
    "bare effect=street-power-up must coerce to mode=moment"
  );
}

// Invalid mode also coerces
{
  const href = coerceBareStreetPowerUpToMomentHref({
    effect: "street-power-up",
    mode: "seller-pack",
    source: "legacy-email",
  });
  assert.ok(href, "invalid mode must coerce");
  const params = q(href);
  assert.equal(params.get("mode"), "moment");
  assert.equal(params.get("effect"), FIXED_MOMENT_EFFECT);
  assert.equal(params.get("source"), "legacy-email");
}

// Preserve source / sku / try / sample
{
  const href = coerceBareStreetPowerUpToMomentHref({
    effect: "street-power-up",
    source: "bookmark",
    sku: "POP-001",
    try: "1",
    sample: "beatbot",
  });
  assert.ok(href);
  const params = q(href);
  assert.equal(params.get("mode"), "moment");
  assert.equal(params.get("effect"), "street-power-up");
  assert.equal(params.get("source"), "bookmark");
  assert.equal(params.get("sku"), "POP-001");
  assert.equal(params.get("try"), "1");
  assert.equal(params.get("sample"), "beatbot");
}

// Already honest → no redirect
assert.equal(
  coerceBareStreetPowerUpToMomentHref({
    mode: "moment",
    effect: "street-power-up",
    source: "primary-nav",
  }),
  null,
  "honest mode=moment deep link must not redirect"
);

// Generate→360 unchanged
assert.equal(
  coerceBareStreetPowerUpToMomentHref({
    effect: "360-spin-showcase",
    source: "home-proof-wall",
    ratio: "1:1",
    duration: "5",
    channel: "etsy",
  }),
  null,
  "Generate→360 remix must not be rewritten to Moment"
);

// Other effects unchanged
assert.equal(
  coerceBareStreetPowerUpToMomentHref({ effect: "floating-hero" }),
  null,
  "non-Moment effects must not be rewritten"
);

// Bare /create (no effect) unchanged — out of this defense layer
assert.equal(
  coerceBareStreetPowerUpToMomentHref({}),
  null,
  "empty create query is not a bare street-power-up deep link"
);

console.log(
  "create-moment-coerce-smoke: PASS (bare street-power-up → mode=moment · preserve source/sku/try/sample · 360 untouched)"
);
