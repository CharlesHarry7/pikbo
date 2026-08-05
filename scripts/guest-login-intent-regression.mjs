#!/usr/bin/env node
/**
 * Guest → login → Create intent handoff regression (AIT-49 / AIT-90 / AIT-102 / AIT-107).
 *
 * Pure helper + source wiring. No network.
 *
 * Contract:
 * 1. Moment create path survives login `next=` (+ optional source).
 * 2. 360/remix create query (effect/source/ratio/duration/channel) survives.
 * 3. sessionStorage stash is a same-browser backup when callback drops `next`.
 * 4. Expired / hostile stash values are discarded; fail closed to /profile.
 * 5. GuestMomentCreateGate + CreateStudio + auth callback wire the helper.
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

const MOMENT = intent.GUEST_MOMENT_CREATE_HREF;
assert.equal(
  MOMENT,
  "/create?mode=moment&effect=street-power-up",
  "guest moment base must match softLaunch MOMENT_CREATE_HREF"
);
// Soft-launch lock: helper base must stay identical to softLaunch export.
const softLaunch = read("lib/softLaunch.ts");
assert.match(
  softLaunch,
  /MOMENT_CREATE_HREF\s*=\s*["'`]\/create\?mode=moment&effect=street-power-up["'`]/
);
assert.match(
  read("lib/guestCreateIntent.ts"),
  /GUEST_MOMENT_CREATE_HREF\s*=\s*["'`]\/create\?mode=moment&effect=street-power-up["'`]/
);

// --- pure helpers: Moment default ---
assert.equal(
  intent.buildGuestCreateNextPath(null, { fallbackSource: "guest-create" }),
  `${MOMENT}&source=guest-create`
);
assert.equal(
  intent.buildGuestCreateNextPath({ mode: "moment", effect: "street-power-up" }),
  `${MOMENT}&source=guest-create`
);
assert.equal(
  intent.buildGuestCreateNextPath({
    mode: "moment",
    effect: "street-power-up",
    source: "home-proof-wall",
  }),
  `${MOMENT}&source=home-proof-wall`
);
assert.equal(
  intent.loginHrefForGuestCreate({
    mode: "moment",
    effect: "street-power-up",
    source: "guest-create",
  }),
  `/login?next=${encodeURIComponent(`${MOMENT}&source=guest-create`)}`
);

// --- pure helpers: 360 / remix intent preserved ---
const remixNext = intent.buildGuestCreateNextPath({
  effect: "360-spin-showcase",
  source: "header-generate",
  ratio: "1:1",
  duration: "5",
  channel: "etsy",
});
assert.match(remixNext, /^\/create\?/);
assert.match(remixNext, /effect=360-spin-showcase/);
assert.match(remixNext, /source=header-generate/);
assert.match(remixNext, /ratio=1%3A1|ratio=1:1/);
assert.match(remixNext, /duration=5/);
assert.match(remixNext, /channel=etsy/);
assert.doesNotMatch(remixNext, /mode=moment/);

const remixLogin = intent.loginHrefForGuestCreate({
  effect: "360-spin-showcase",
  source: "home-proof-wall",
  entry: "home-proof-wall",
});
assert.equal(
  remixLogin.startsWith("/login?next="),
  true,
  "login href must use next="
);
const decoded = decodeURIComponent(remixLogin.slice("/login?next=".length));
assert.match(decoded, /effect=360-spin-showcase/);
assert.match(decoded, /source=home-proof-wall/);
assert.match(decoded, /entry=home-proof-wall/);

// Hostile / non-create paths never leak through sanitize.
assert.equal(
  intent.isCreateIntentPath("//evil.example"),
  false
);
assert.equal(
  intent.resolvePostAuthNext("//evil.example", null),
  "/profile"
);

// --- sessionStorage stash backup ---
function memoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(k, String(v));
    },
    removeItem(k) {
      map.delete(k);
    },
    _map: map,
  };
}

const store = memoryStorage();
const stashed = intent.stashGuestCreateIntent(
  `${MOMENT}&source=guest-create`,
  store
);
assert.equal(stashed, `${MOMENT}&source=guest-create`);
assert.ok(store._map.has(intent.GUEST_CREATE_INTENT_STORAGE_KEY));

// Explicit create next wins; stash is consumed so it cannot replay later.
const resolvedFromQuery = intent.resolvePostAuthNext(
  `${MOMENT}&source=home-proof-wall`,
  store
);
assert.equal(resolvedFromQuery, `${MOMENT}&source=home-proof-wall`);
assert.equal(
  intent.consumeGuestCreateIntent(store),
  null,
  "stash must be cleared after successful create next"
);

// Missing next falls back to stash.
const store2 = memoryStorage();
intent.stashGuestCreateIntent(remixNext, store2);
assert.equal(intent.resolvePostAuthNext(null, store2), remixNext);
assert.equal(intent.consumeGuestCreateIntent(store2), null);

// Expired stash discarded.
const store3 = memoryStorage();
const past = Date.now() - intent.GUEST_CREATE_INTENT_TTL_MS - 1;
store3.setItem(
  intent.GUEST_CREATE_INTENT_STORAGE_KEY,
  JSON.stringify({ path: remixNext, savedAt: past })
);
assert.equal(intent.consumeGuestCreateIntent(store3, Date.now()), null);
assert.equal(intent.resolvePostAuthNext(null, store3), "/profile");

// Default profile next without stash stays profile.
assert.equal(intent.resolvePostAuthNext("/profile", null), "/profile");
assert.equal(intent.resolvePostAuthNext(null, null), "/profile");

// --- source wiring ---
const gate = read("components/GuestMomentCreateGate.tsx");
const createPage = read("app/create/page.tsx");
const studio = read("components/CreateStudio.tsx");
const callback = read("app/auth/callback/page.tsx");
const helper = read("lib/guestCreateIntent.ts");

assert.match(helper, /export function buildGuestCreateNextPath/);
assert.match(helper, /export function loginHrefForGuestCreate/);
assert.match(helper, /export function stashGuestCreateIntent/);
assert.match(helper, /export function resolvePostAuthNext/);
assert.match(helper, /GUEST_CREATE_INTENT_TTL_MS\s*=\s*2\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);

assert.match(gate, /loginHrefForGuestCreate/);
assert.match(gate, /stashGuestCreateIntent/);
assert.match(gate, /buildGuestCreateNextPath/);
assert.match(gate, /data-guest-create-sign-in/);
assert.match(gate, /data-studio-open-state/);
assert.match(gate, /sessionBoot/);
assert.match(gate, /intent\?:/);

assert.match(createPage, /GuestMomentCreateGate intent=\{guestCreateIntent\}/);
assert.match(createPage, /guestCreateIntent/);
// Intent fields use a small coerce helper so launch-pack smokes that ban
// product-mode branching do not false-positive on typeof checks.
assert.match(createPage, /effect:\s*q\(sp\.effect\)/);
assert.match(createPage, /mode:\s*q\(sp\.mode\)/);
assert.match(createPage, /source:\s*q\(sp\.source\)/);
assert.doesNotMatch(
  createPage,
  /BatchStudio|PrivateSellerPackGate|initialRecoverPackRunId|recoverPackRunId|sp\.mode\s*===/
);

assert.match(studio, /loginHrefForGuestCreate/);
assert.match(studio, /buildGuestCreateNextPath/);
assert.match(studio, /stashGuestCreateIntent/);
assert.match(studio, /onPrivateMomentLogin/);
assert.match(studio, /privateMomentLoginHref/);

assert.match(callback, /resolvePostAuthNext/);
assert.match(callback, /window\.location\.replace\(next\)/);
assert.doesNotMatch(
  callback,
  /sanitizeInternalNextPath\(\s*new URL\(window\.location\.href\)\.searchParams\.get\(["']next["']\)/
);

// Guest create still does not expose Generate/credits language.
assert.doesNotMatch(gate, /\bupload\b|\bcredits\b|\bGenerate\b/);

console.log(
  "guest-login-intent-regression: PASS (" +
    "Moment next+source; 360 remix query; stash backup/TTL; " +
    "gate+create+studio+callback wired)"
);
