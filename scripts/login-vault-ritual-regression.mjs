#!/usr/bin/env node
/**
 * AIT-36b: Login vault ritual contract — sign-in gate for private shelf.
 * Fail-closed pure checks; no network, no Provider, no secrets.
 * Does not rewrite frozen TDH (lib/site.ts).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "app/globals.css"), "utf8");
const loginPage = readFileSync(join(root, "app/login/page.tsx"), "utf8");
const loginForm = readFileSync(join(root, "components/LoginForm.tsx"), "utf8");
const site = readFileSync(join(root, "lib/site.ts"), "utf8");

const errors = [];

function must(cond, msg) {
  if (!cond) errors.push(msg);
}

// Pop Mart 8-color board (main@#167)
const palette = [
  "--electric-purple",
  "--neon-pink",
  "--tide-blue",
  "--lemon",
  "--tide-green",
  "--ember",
  "--void",
  "--cream",
];
for (const token of palette) {
  must(css.includes(token), `missing palette token ${token}`);
}

// dual type roles
must(css.includes("--font-display"), "missing --font-display");
must(css.includes("--font-sans"), "missing --font-sans");

// four card types
for (const card of [
  ".collection-card",
  ".result-card",
  ".pricing-card",
  ".status-card",
]) {
  must(css.includes(card), `missing card type ${card}`);
}

// micro-interactions
for (const motion of [
  "sticker-pop",
  "capsule-float",
  "foil-shimmer",
  "status-pulse",
]) {
  must(css.includes(motion), `missing motion token ${motion}`);
}

// login ritual surface
must(css.includes(".login-ritual"), "missing .login-ritual");
must(css.includes(".login-vault-card"), "missing .login-vault-card");
must(css.includes(".login-email-field"), "missing .login-email-field");
must(css.includes(".btn-electric"), "missing .btn-electric");
must(css.includes(".toy-sticker"), "missing .toy-sticker");
must(css.includes(".create-ritual"), "missing .create-ritual atmosphere");

// Login page structure
must(loginPage.includes('data-login-ritual="vault"'), "Login missing vault marker");
must(loginPage.includes("login-ritual"), "Login missing login-ritual class");
must(loginPage.includes("create-ritual"), "Login missing create-ritual class");
must(loginPage.includes("collection-card"), "Login missing collection-card vault");
must(loginPage.includes("status-card"), "Login missing status-card honesty steps");
must(loginPage.includes("toy-sticker"), "Login missing stickers");
must(loginPage.includes("text-grad"), "Login missing gradient H1 treatment");
must(
  loginPage.includes("data-login-auth-status"),
  "Login missing auth status marker"
);
must(
  loginPage.includes('data-auth-guest-path="product-first"'),
  "Login missing product-first guest path"
);
must(
  loginPage.includes('data-login-guest="moment-preview"'),
  "Login missing guest moment preview CTA"
);
must(
  loginPage.includes("not-your-toy") ||
    loginPage.includes("not your toy") ||
    loginPage.includes("Cached Lab"),
  "Login must keep honesty about guest / not-your-toy previews"
);

// LoginForm: magic-link + guest fail-closed path preserved
must(loginForm.includes("/api/auth/magic-link"), "LoginForm must post magic-link");
must(
  loginForm.includes('data-login-form="magic-link"') ||
    loginForm.includes('data-login-form="unavailable"'),
  "LoginForm missing form markers"
);
must(
  loginForm.includes('data-login-submit="magic-link"') ||
    loginForm.includes('data-login-guest="moment-preview"'),
  "LoginForm missing primary submit or guest CTA"
);
must(
  loginForm.includes("signInWithOAuth") || loginForm.includes("google"),
  "LoginForm must keep Google path when configured"
);
must(
  loginForm.includes('data-auth-guest-path="product-first"'),
  "LoginForm unavailable state must keep product-first guest path"
);
// No SaaS sky-blue leftovers in form chrome
must(!loginForm.includes("text-sky-"), "LoginForm must not use SaaS sky utility");
must(!loginForm.includes("bg-sky-"), "LoginForm must not use SaaS sky utility");

// Frozen TDH — do not rewrite homeH1 in this PR
must(
  site.includes('homeH1: "One toy photo. More ways to sell."'),
  "Frozen homeH1 must remain One toy photo. More ways to sell."
);
must(
  !loginPage.includes("site.homeH1"),
  "Login page must not pull frozen homeH1 for vault H1"
);

if (errors.length) {
  console.error("login-vault-ritual-regression FAIL");
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}

console.log("login-vault-ritual-regression PASS");
console.log("  login: vault-ritual");
console.log("  cards: collection/result/pricing/status");
console.log("  frozen TDH: homeH1 untouched");
