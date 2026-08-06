/**
 * AIT-40 — Create/Studio open: auto Lab preview + finite open state +
 * honest failure/timeout/retry (desktop + mobile sticky path).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const timeout = read("lib/clientTimeout.ts");
const meClient = read("lib/meClient.ts");
const samples = read("lib/samples.ts");
const video = read("components/AutoPlayVideo.tsx");
const gate = read("components/GuestMomentCreateGate.tsx");
const studio = read("components/CreateStudio.tsx");
const hero = read("components/HeroUpload.tsx");
const createPage = read("app/create/page.tsx");
const packageJson = read("package.json");

// Bounded client helpers
assert.match(timeout, /STUDIO_SESSION_BOOT_MS\s*=\s*8_000/);
assert.match(timeout, /LAB_SAMPLE_LOAD_MS\s*=\s*12_000/);
assert.match(timeout, /LAB_VIDEO_READY_MS\s*=\s*12_000/);
assert.match(timeout, /STUDIO_NAV_OPEN_MS\s*=\s*12_000/);
assert.match(timeout, /class ClientTimeoutError/);
assert.match(timeout, /export function withTimeout/);

// Session + sample load must accept timeouts (explicit ClientTimeoutError on abort)
assert.match(meClient, /timeoutMs\?: number/);
assert.match(meClient, /AbortController/);
assert.match(meClient, /controller\.abort\(\)/);
assert.match(meClient, /ClientTimeoutError/);
assert.match(meClient, /isClientTimeoutError/);
assert.match(meClient, /throw new ClientTimeoutError/);
assert.match(samples, /LAB_SAMPLE_LOAD_MS/);
assert.match(samples, /withTimeout\(load\(\), timeoutMs/);

// Auto Lab video surfaces failure + retry
assert.match(video, /errorRetry\s*=\s*false/);
assert.match(video, /data-lab-preview-error/);
assert.match(video, /data-lab-preview-retry/);
assert.match(video, /Retry Lab preview/);
assert.match(video, /Lab preview timed out/);
assert.match(video, /LAB_VIDEO_READY_MS/);

// Guest Create auto-shows Lab sample while access resolves (no blank open)
assert.match(createPage, /<GuestMomentCreateGate>/);
assert.match(gate, /data-guest-create-sample/);
assert.match(gate, /errorRetry/);
assert.match(gate, /data-studio-open-state/);
assert.match(gate, /data-studio-open-error="session-timeout"/);
assert.match(gate, /data-studio-open-retry/);
assert.match(gate, /STUDIO_SESSION_BOOT_MS/);
assert.match(gate, /fetchMe\(\{\s*timeoutMs:\s*STUDIO_SESSION_BOOT_MS\s*\}\)/);
assert.match(gate, /isClientTimeoutError/);
assert.match(gate, /sessionBoot === "timeout"/);
assert.match(gate, /Could not verify private access in time/);
// Must not permanently trap users: timeout state always offers retry
assert.match(gate, /Retry access check/);
// Auto Lab assets still present
assert.match(gate, /beatbot-viral-hook\.mp4/);
assert.match(gate, /AutoPlayVideo/);

// CreateStudio: finite "Opening studio…" + timeout retry; sample timeout retry
assert.match(studio, /Opening studio…/);
assert.match(studio, /data-studio-open-state=\{sessionBoot\}/);
assert.match(studio, /sessionBoot === "timeout"/);
assert.match(studio, /data-studio-open-retry/);
assert.match(studio, /Retry access check/);
assert.match(studio, /Lab sample timed out/);
assert.match(studio, /data-lab-sample-error/);
assert.match(studio, /data-lab-sample-retry/);
assert.match(studio, /Retry Lab sample/);
assert.match(studio, /isClientTimeoutError\(err\)/);
assert.match(studio, /STUDIO_SESSION_BOOT_MS/);
assert.match(studio, /fetchMe\(\{\s*timeoutMs:\s*STUDIO_SESSION_BOOT_MS\s*\}\)/);
// No fragile wall-clock heuristic for session timeout detection
assert.doesNotMatch(studio, /elapsed\s*>=\s*STUDIO_SESSION_BOOT_MS/);
assert.doesNotMatch(gate, /elapsed\s*>=\s*STUDIO_SESSION_BOOT_MS/);
// Auto Lab on first-run sample/try deep link (AIT-325 preferDeepLinkEffect
// keeps workbench remix recipe; still auto-generates on open)
assert.match(
  studio,
  /loadSampleToy\(\s*id,\s*true(?:,\s*\{[\s\S]*?preferDeepLinkEffect[\s\S]*?\})?\)/
);
assert.match(studio, /preferDeepLinkEffect:\s*!fixedMomentContract/);
assert.match(studio, /initialSample/);

// Mobile sticky Lab CTA retained
assert.match(studio, /data-create-sticky="mobile"/);
assert.match(studio, /data-first-run-action="lab-preview"/);
assert.match(studio, /Preview a Lab sample · 0 credits/);

// Hero handoff cannot stick on Opening forever
assert.match(hero, /Opening your private Moment…/);
assert.match(hero, /STUDIO_NAV_OPEN_MS/);
assert.match(hero, /Opening Create timed out/);
assert.match(hero, /data-studio-open-error/);
assert.match(hero, /data-studio-open-retry/);
assert.match(hero, /data-studio-open-state=\{busy \? "opening" : "idle"\}/);

// Package + CI script wiring
assert.match(
  packageJson,
  /"studio-open-lab-preview-regression":\s*"node scripts\/studio-open-lab-preview-regression\.mjs"/
);

for (const asset of [
  "public/demos/beatbot-still.webp",
  "public/demos/beatbot-viral-hook.mp4",
  "public/demos/beatbot-viral-hook.webm",
  "public/demos/scout-still.webp",
]) {
  assert.equal(existsSync(join(root, asset)), true, `${asset} must exist`);
}

console.log(
  "studio-open-lab-preview-regression: PASS (auto Lab on Create open; finite Opening studio; timeout/error + retry; mobile sticky Lab CTA)"
);
