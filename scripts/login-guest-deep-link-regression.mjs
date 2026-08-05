#!/usr/bin/env node
/**
 * Login guest deep-link regression (source-only, no network).
 *
 * Product contract (Phase C / Moment-first):
 * - LoginForm + /login page primary guest CTA → fixed Moment
 *   (`MOMENT_CREATE_HREF` + `source=login-guest`)
 * - Marker: `data-login-guest="moment-preview"`
 * - Must NOT reintroduce legacy `data-login-guest="generate-remix"` or
 *   bare `/create` Generate doors on the login guest path.
 *
 * Adjacent 360 generate-remix deep links (createRemixHref("360-spin-showcase"))
 * stay covered on chrome that still uses them — including MobileGenerateBar,
 * which remains visible on `/login` so guests can still reach the 360 remix
 * studio without using the LoginForm guest CTA.
 *
 * AIT-68 originally named the pre-Phase-C generate-remix LoginForm marker;
 * this script locks the post-funnel-collapse truth + residual 360 doors.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const loginForm = read("components/LoginForm.tsx");
const loginPage = read("app/login/page.tsx");
const softLaunch = read("lib/softLaunch.ts");
const mobileBar = read("components/MobileGenerateBar.tsx");
const header = read("components/Header.tsx");
const remixIntent = read("lib/remixIntent.ts");

const EXPECTED_GUEST_HREF =
  "/create?mode=moment&effect=street-power-up&source=login-guest";

// --- softLaunch Moment base ---
assert.match(
  softLaunch,
  /MOMENT_CREATE_HREF\s*=\s*["'`]\/create\?mode=moment&effect=street-power-up["'`]/,
  "MOMENT_CREATE_HREF must stay the fixed first-dollar Moment base"
);

// --- LoginForm guest path ---
assert.match(
  loginForm,
  /import\s*\{\s*MOMENT_CREATE_HREF\s*\}\s*from\s*["']@\/lib\/softLaunch["']/,
  "LoginForm must import MOMENT_CREATE_HREF"
);
assert.match(
  loginForm,
  /const LOGIN_GUEST_MOMENT_HREF\s*=\s*`\$\{MOMENT_CREATE_HREF\}&source=login-guest`/,
  "LoginForm guest href must append source=login-guest"
);
assert.match(
  loginForm,
  /data-auth-guest-path=["']product-first["']/,
  "LoginForm must mark product-first guest path"
);
assert.match(
  loginForm,
  /data-login-guest=["']moment-preview["']/,
  "LoginForm guest CTA marker must be moment-preview"
);
assert.match(
  loginForm,
  /href=\{LOGIN_GUEST_MOMENT_HREF\}/,
  "LoginForm guest CTA must bind LOGIN_GUEST_MOMENT_HREF"
);
assert.match(
  loginForm,
  /Preview Street Power-Up/,
  "LoginForm guest CTA copy must name Street Power-Up preview"
);

// --- login page guest path (footer, always visible) ---
assert.match(
  loginPage,
  /import\s*\{\s*MOMENT_CREATE_HREF\s*\}\s*from\s*["']@\/lib\/softLaunch["']/,
  "login page must import MOMENT_CREATE_HREF"
);
assert.match(
  loginPage,
  /const LOGIN_GUEST_MOMENT_HREF\s*=\s*`\$\{MOMENT_CREATE_HREF\}&source=login-guest`/,
  "login page guest href must append source=login-guest"
);
assert.match(
  loginPage,
  /data-auth-guest-path=["']product-first["']/,
  "login page must mark product-first guest path"
);
assert.match(
  loginPage,
  /data-login-guest=["']moment-preview["']/,
  "login page guest CTA marker must be moment-preview"
);
assert.match(
  loginPage,
  /href=\{LOGIN_GUEST_MOMENT_HREF\}/,
  "login page guest CTA must bind LOGIN_GUEST_MOMENT_HREF"
);

// Resolved deep-link shape (source-level expansion of the template).
const resolvedGuestHref =
  "/create?mode=moment&effect=street-power-up" + "&source=login-guest";
assert.equal(
  resolvedGuestHref,
  EXPECTED_GUEST_HREF,
  "login guest deep link must resolve to fixed Moment + source=login-guest"
);

// --- Forbidden legacy guest doors on login surfaces ---
for (const [label, src] of [
  ["LoginForm", loginForm],
  ["login page", loginPage],
]) {
  assert.doesNotMatch(
    src,
    /createRemixHref/,
    `${label} must not use createRemixHref for guest CTA (Moment path only)`
  );
  assert.doesNotMatch(
    src,
    /360-spin-showcase/,
    `${label} must not hardcode 360-spin-showcase guest CTA`
  );
  assert.doesNotMatch(
    src,
    /data-login-guest=["']generate-remix["']/,
    `${label} must not reintroduce data-login-guest=generate-remix`
  );
  assert.doesNotMatch(
    src,
    /\/create\?effect=street-power-up&source=login-guest/,
    `${label} must not use pre-Moment effect= deep link without mode=moment`
  );
  assert.doesNotMatch(
    src,
    /\/modules/,
    `${label} guest path must not fall back to Modules`
  );
  assert.doesNotMatch(
    src,
    /\b(?:Continue as guest\s*→\s*)?Generate\b/,
    `${label} must not use bare Generate guest CTA copy`
  );
}

// --- Residual 360 generate-remix deep links (not LoginForm, still product doors) ---
assert.match(
  remixIntent,
  /export function createRemixHref\s*\(/,
  "createRemixHref helper must remain the 360 remix deep-link builder"
);
assert.match(
  mobileBar,
  /createRemixHref\(["']360-spin-showcase["']\)/,
  "MobileGenerateBar must deep-link via createRemixHref(360-spin-showcase)"
);
assert.match(
  mobileBar,
  /data-mobile-bar=["']generate-remix["']/,
  "MobileGenerateBar must keep data-mobile-bar=generate-remix"
);
assert.match(
  mobileBar,
  /path === ["']\/login["']/,
  "MobileGenerateBar must remain visible on /login so guests can reach 360 remix"
);
assert.match(
  header,
  /createRemixHref\(["']360-spin-showcase["']\)/,
  "Header primary CTA must deep-link via createRemixHref(360-spin-showcase)"
);
assert.match(
  header,
  /data-header-cta=["']generate-remix["']/,
  "Header must keep data-header-cta=generate-remix"
);

console.log(
  "login-guest-deep-link-regression: PASS (" +
    `guest CTA → ${EXPECTED_GUEST_HREF}; ` +
    "data-login-guest=moment-preview; no login generate-remix; " +
    "360 createRemixHref still on MobileGenerateBar(/login)+Header)"
);
