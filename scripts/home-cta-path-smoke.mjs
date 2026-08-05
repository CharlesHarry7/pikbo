/**
 * AIT-39: Home/Explore CTA convergence — one primary Generate→Studio/360 path.
 * Static contract smoke (no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const home = read("app/page.tsx");
const homeHero = read("components/HomeCinemaHero.tsx");
const homeFloat = read("components/HomeFloatGenerate.tsx");
const shell = read("components/AppShell.tsx");
const explore = read("app/explore/page.tsx");
const login = read("app/login/page.tsx");
const guestGate = read("components/GuestMomentCreateGate.tsx");
const softLaunch = read("lib/softLaunch.ts");
const hfHome = read("components/HfExploreHome.tsx");

// Live Home mounts cinema hero + float Generate (not multi-CTA explore wall).
assert.match(home, /<HomeCinemaHero \/>/);
assert.match(home, /<HomeFloatGenerate \/>/);
assert.doesNotMatch(home, /HfExploreHome|HomeViralWall/);

// Hero: exactly one primary marker; secondary at most sign-in with next.
assert.match(homeHero, /data-home-primary-cta=["']generate["']/);
assert.match(homeHero, /data-home-moment-cta/);
assert.match(homeHero, /data-home-secondary-cta=["']sign-in["']/);
assert.match(homeHero, /href=\{MOMENT_CREATE_HREF\}/);
assert.match(homeHero, /Use this motion/);
assert.equal(
  (homeHero.match(/data-home-primary-cta=/g) || []).length,
  1,
  "exactly one home primary CTA marker"
);
assert.equal(
  (homeHero.match(/data-home-moment-cta/g) || []).length,
  1,
  "single data-home-moment-cta (no competing peer primary)"
);
assert.match(
  homeHero,
  /\/login\?next=\$\{encodeURIComponent\(\s*`\$\{MOMENT_CREATE_HREF\}&source=home-hero-signin`\s*\)\}/
);

// Float Generate reuses the same Moment Studio path.
assert.match(homeFloat, /MOMENT_CREATE_HREF/);
assert.match(homeFloat, /data-home-float-cta=["']generate["']/);
assert.match(homeFloat, /source=home-float/);

// Shell home: one Generate primary; Sign in keeps next intent.
assert.match(shell, /HOME_GENERATE_HREF/);
assert.match(shell, /HOME_SIGN_IN_HREF/);
assert.match(shell, /data-shell-primary-generate/);
assert.match(
  shell,
  /\/login\?next=\$\{encodeURIComponent\(\s*`\$\{MOMENT_CREATE_HREF\}&source=home-nav-signin`\s*\)\}/
);
assert.match(shell, /label: "Sign in"/);
assert.doesNotMatch(
  shell,
  /motionChrome[\s\S]{0,200}\{ href: DEFAULT_MOMENT_CREATE_HREF, label: "Create" \}/
);

// Explore: 1 primary Generate→360 + 1 secondary Library.
assert.match(explore, /data-explore-primary-cta=["']generate-360["']/);
assert.match(explore, /data-explore-secondary-cta=["']library["']/);
assert.match(explore, /createRemixHref\(["']360-spin-showcase["']\)/);
assert.doesNotMatch(explore, /FreeTrialCta/);
assert.doesNotMatch(explore, /Modules|Recipes|Flow · Preview|Create one Moment/);

// Login default next falls back to Moment Studio (not bare /profile).
assert.match(login, /LOGIN_GUEST_MOMENT_HREF/);
assert.match(
  login,
  /sanitizeInternalNextPath\(\s*typeof params\?\.next === "string" \? params\.next : null,\s*LOGIN_GUEST_MOMENT_HREF\s*\)/
);

// Guest create gate still encodes next for sign-in.
assert.match(guestGate, /guestSignInHref|source=guest-create/);
assert.match(guestGate, /\/login\?next=\$\{encodeURIComponent/);

// Soft-launch product door remains the fixed Moment contract.
assert.match(
  softLaunch,
  /MOMENT_CREATE_HREF\s*=\s*["']\/create\?mode=moment&effect=street-power-up["']/
);

// Shared HF explore surface also 1+1 (not four peer buttons).
assert.match(hfHome, /data-hf-hero-primary=["']generate-360["']/);
assert.match(hfHome, /data-hf-hero-secondary=["']studio["']/);
assert.match(hfHome, /Generate this clip/);
assert.match(hfHome, /MOMENT_CREATE_HREF/);

console.log("home-cta-path-smoke: ok");
