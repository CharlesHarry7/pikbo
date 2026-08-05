#!/usr/bin/env node
/**
 * Chrome Generate doors → guestCreateIntent login next (AIT-122).
 *
 * Contract:
 * 1. Header / MobileGenerateBar / Home secondary 360 deep-link `/create` only
 *    (no bare `/login` on the Generate CTA itself).
 * 2. Frozen source tags match createGenerate360Href call sites.
 * 3. createGenerate360Href(360) shape → loginHrefForGuestCreate preserves
 *    effect + source (+ ratio/duration/channel) in `next=`.
 * 4. No second intent store — only lib/guestCreateIntent.
 *
 * Run: npm run chrome-generate-guest-intent-regression
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const intent = await import(
  pathToFileURL(join(root, "lib/guestCreateIntent.ts")).href
);

const tags = intent.CHROME_GENERATE_SOURCE_TAGS;
assert.ok(Array.isArray(tags) && tags.length >= 4, "chrome tags exported");
assert.ok(tags.includes("header"), "header source frozen");
assert.ok(tags.includes("mobile-bar"), "mobile-bar source frozen");
assert.ok(tags.includes("home-proof-wall"), "home-proof-wall source frozen");
assert.ok(tags.includes("home-tool-shelf"), "home-tool-shelf source frozen");

// --- pure: 360 create path → login next keeps effect/source ---
function chrome360CreateHref(source, extra = {}) {
  const q = new URLSearchParams({
    effect: "360-spin-showcase",
    source,
    ratio: "1:1",
    duration: "5",
    channel: "etsy",
    ...extra,
  });
  return `/create?${q.toString()}`;
}

for (const source of tags) {
  const createHref = chrome360CreateHref(source);
  const next = intent.buildGuestCreateNextPath(createHref, {
    fallbackSource: source,
  });
  assert.match(next, /^\/create\?/, `${source}: next must be create path`);
  assert.match(next, /effect=360-spin-showcase/, `${source}: effect preserved`);
  assert.match(
    next,
    new RegExp(`source=${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
    `${source}: source preserved`
  );
  assert.match(next, /ratio=1%3A1|ratio=1:1/, `${source}: ratio preserved`);
  assert.match(next, /duration=5/, `${source}: duration preserved`);
  assert.match(next, /channel=etsy/, `${source}: channel preserved`);
  assert.doesNotMatch(next, /mode=moment/, `${source}: not forced to moment`);

  const login = intent.loginHrefForGuestCreate(createHref, {
    fallbackSource: source,
  });
  assert.equal(login.startsWith("/login?next="), true, `${source}: login next=`);
  const decoded = decodeURIComponent(login.slice("/login?next=".length));
  assert.match(decoded, /effect=360-spin-showcase/);
  assert.match(
    decoded,
    new RegExp(`source=${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`)
  );
}

// Home proof wall also carries entry= for analytics (must survive login).
const proofCreate = chrome360CreateHref("home-proof-wall", {
  entry: "home-proof-wall",
});
const proofLogin = intent.loginHrefForGuestCreate(proofCreate, {
  fallbackSource: "home-proof-wall",
});
const proofNext = decodeURIComponent(
  proofLogin.slice("/login?next=".length)
);
assert.match(proofNext, /entry=home-proof-wall/);
assert.match(proofNext, /source=home-proof-wall/);
assert.match(proofNext, /effect=360-spin-showcase/);

// --- source wiring: chrome doors deep-link create only ---
const chromeDoors = [
  {
    file: "components/Header.tsx",
    source: "header",
    chromeKey: "header",
    ctaAttr: 'data-header-cta="generate-remix"',
  },
  {
    file: "components/MobileGenerateBar.tsx",
    source: "mobile-bar",
    chromeKey: "mobileBar",
    ctaAttr: 'data-mobile-bar="generate-remix"',
  },
  {
    file: "components/HomeViralWall.tsx",
    source: "home-proof-wall",
    chromeKey: "homeProofWall",
    ctaAttr: null,
  },
  {
    file: "components/HomeToolShelf.tsx",
    source: "home-tool-shelf",
    chromeKey: "homeToolShelf",
    ctaAttr: null,
  },
  {
    file: "components/HomeBrowseCta.tsx",
    source: "home-browse",
    chromeKey: "homeBrowse",
    ctaAttr: null,
  },
  {
    file: "components/HfProductRail.tsx",
    source: "hf-product-rail",
    chromeKey: "hfProductRail",
    ctaAttr: null,
  },
];

for (const door of chromeDoors) {
  const src = read(door.file);
  assert.match(
    src,
    /createGenerate360Href/,
    `${door.file} must use createGenerate360Href`
  );
  assert.match(
    src,
    new RegExp(
      `createGenerate360Href\\(\\s*CHROME_GENERATE_SOURCE\\.${door.chromeKey}\\s*\\)`
    ),
    `${door.file} must freeze via CHROME_GENERATE_SOURCE.${door.chromeKey}`
  );
  // Generate CTA itself must not force bare /login (deep-link create only).
  assert.doesNotMatch(
    src,
    /href=\{?["'`]\/login["'`]\}?/,
    `${door.file} Generate door must not bare-link /login`
  );
  assert.doesNotMatch(
    src,
    /href=\{?["'`]\/login\?/,
    `${door.file} must not open login from chrome Generate CTA`
  );
  if (door.ctaAttr) {
    assert.match(src, new RegExp(door.ctaAttr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
}

// jobIntents freeze map parity with guestCreateIntent tags.
const jobIntents = read("lib/jobIntents.ts");
assert.match(jobIntents, /export const CHROME_GENERATE_SOURCE\s*=/);
for (const source of tags) {
  assert.match(
    jobIntents,
    new RegExp(`["']${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`),
    `jobIntents CHROME_GENERATE_SOURCE must include ${source}`
  );
}

// guestCreateIntent remains the only intent store for this handoff.
assert.match(
  read("lib/guestCreateIntent.ts"),
  /export function loginHrefForGuestCreate/
);
assert.match(
  read("components/GuestMomentCreateGate.tsx"),
  /loginHrefForGuestCreate/
);

console.log(
  "chrome-generate-guest-intent-regression: PASS (" +
    `tags=${tags.join(",")}; create→login next preserves effect/source; ` +
    "Header+Mobile+Home secondary deep-link create only)"
);
