/**
 * AIT-446 — Shell session finite boot:
 * CreditsBadge + ProfilePanel + Settings no permanent hang on bare fetchMe().
 * Mirror Studio open honesty: 8s wall-clock, checking/timeout, Retry, Lab fail-closed.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const timeout = read("lib/clientTimeout.ts");
const badge = read("components/CreditsBadge.tsx");
const profile = read("components/ProfilePanel.tsx");
const settings = read("app/settings/page.tsx");
const packageJson = read("package.json");

// Shared 8s contract
assert.match(timeout, /STUDIO_SESSION_BOOT_MS\s*=\s*8_000/);
assert.match(timeout, /class ClientTimeoutError/);
assert.match(timeout, /export function isClientTimeoutError/);

// CreditsBadge — wall-clock boot + finite states + Retry, no permanent "…"
assert.match(badge, /STUDIO_SESSION_BOOT_MS/);
assert.match(badge, /isClientTimeoutError/);
assert.match(badge, /fetchMe\(\{\s*timeoutMs:\s*STUDIO_SESSION_BOOT_MS\s*\}\)/);
assert.match(badge, /sessionBoot/);
assert.match(badge, /"checking"\s*\|\s*"ready"\s*\|\s*"timeout"/);
assert.match(badge, /data-credits-boot="checking"/);
assert.match(badge, /data-credits-boot=\{timeout \? "timeout" : "unknown"\}/);
assert.match(badge, /data-credits-boot-retry/);
assert.match(badge, /Retry/);
// Fail closed Lab/unknown — never leave hang without timeout path
assert.match(badge, /sessionBoot === "timeout"/);
assert.doesNotMatch(badge, /void fetchMe\(\)/);

// ProfilePanel — same 8s honesty
assert.match(profile, /STUDIO_SESSION_BOOT_MS/);
assert.match(profile, /isClientTimeoutError/);
assert.match(profile, /fetchMe\(\{\s*timeoutMs:\s*STUDIO_SESSION_BOOT_MS\s*\}\)/);
assert.match(profile, /data-profile-boot=\{sessionBoot\}/);
assert.match(profile, /data-profile-boot-error="session-timeout"/);
assert.match(profile, /data-profile-boot-retry/);
assert.match(profile, /Retry access check/);
assert.match(profile, /sessionBoot === "timeout"/);
assert.match(profile, /credits unknown/);
assert.doesNotMatch(profile, /void fetchMe\(\)/);
assert.doesNotMatch(profile, /fetchMe\(\)\.then/);

// Settings — same 8s honesty on access/balance rows
assert.match(settings, /STUDIO_SESSION_BOOT_MS/);
assert.match(settings, /isClientTimeoutError/);
assert.match(settings, /fetchMe\(\{\s*timeoutMs:\s*STUDIO_SESSION_BOOT_MS\s*\}\)/);
assert.match(settings, /data-settings-boot=\{sessionBoot\}/);
assert.match(settings, /data-settings-boot-error="session-timeout"/);
assert.match(settings, /data-settings-boot-retry/);
assert.match(settings, /Retry access check/);
assert.match(settings, /sessionBoot === "timeout"/);
assert.match(settings, /timed out · unknown/);
assert.doesNotMatch(settings, /void fetchMe\(\)/);
assert.doesNotMatch(settings, /fetchMe\(\)\.then/);

// npm script wired
assert.match(
  packageJson,
  /"shell-session-boot-regression"\s*:\s*"node scripts\/shell-session-boot-regression\.mjs"/
);

console.log("shell-session-boot-regression: ok");
