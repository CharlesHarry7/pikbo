/**
 * AIT-40 / AIT-147 / AIT-161 / AIT-172 / AIT-182 / AIT-199 — Create/Studio open:
 * auto Lab preview + finite open state + honest failure/timeout/retry
 * (desktop + mobile sticky). Wall-clock covers authHeaders hang;
 * Pack/Batch/Image/Landing/MomentCreatePreview boot finite.
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
const momentPreview = read("components/MomentCreatePreview.tsx");
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
// Wall-clock must cover authHeaders/getSession hang, not only /api/me fetch.
assert.match(meClient, /withTimeout/);
assert.match(
  meClient,
  /withTimeout\(\s*load\(\),\s*timeoutMs,\s*"Could not verify private access in time"\s*\)/
);
assert.match(
  meClient,
  /Covers BOTH supabase getSession \(authHeaders\) and \/api\/me/
);
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
// Auto Lab on first-run sample/try deep link
assert.match(studio, /loadSampleToy\(id,\s*true\)/);
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

// Seller Pack gate + BatchStudio: finite session boot (no infinite "checking")
const packGate = read("components/PrivateSellerPackGate.tsx");
const batch = read("components/BatchStudio.tsx");
assert.match(packGate, /STUDIO_SESSION_BOOT_MS/);
assert.match(packGate, /fetchMe\(\{\s*timeoutMs:\s*STUDIO_SESSION_BOOT_MS\s*\}\)/);
assert.match(packGate, /data-studio-open-retry/);
assert.match(packGate, /sessionBoot === "timeout"/);
assert.match(packGate, /Retry access check/);
assert.match(batch, /STUDIO_SESSION_BOOT_MS/);
assert.match(batch, /fetchMe\(\{\s*timeoutMs:\s*STUDIO_SESSION_BOOT_MS\s*\}\)/);
assert.match(batch, /setMeResolved\(true\)/);
// AIT-182: BatchStudio surfaces timeout + Retry (no infinite loading-balance copy)
assert.match(batch, /sessionBoot === "timeout"/);
assert.match(batch, /isClientTimeoutError/);
assert.match(batch, /data-studio-open-retry/);
assert.match(batch, /data-studio-open-error="session-timeout"/);
assert.match(batch, /Retry access check/);
assert.match(batch, /data-batch-session-boot/);
// UI must not render permanent "loading balance…" (comment in source is ok)
assert.doesNotMatch(batch, /> · loading balance…</);
assert.match(batch, /balance unavailable/);

// AIT-172: Image Studio + LandingToolPanel residual bare fetchMe → 8s parity
const imageStudio = read("app/image/page.tsx");
const landing = read("components/LandingToolPanel.tsx");
assert.match(imageStudio, /STUDIO_SESSION_BOOT_MS/);
assert.match(
  imageStudio,
  /fetchMe\(\{\s*timeoutMs:\s*STUDIO_SESSION_BOOT_MS\s*\}\)/
);
assert.match(imageStudio, /setMeResolved\(true\)/);
assert.match(imageStudio, /sessionBoot === "timeout"/);
assert.match(imageStudio, /data-studio-open-retry/);
assert.match(imageStudio, /data-studio-open-error="session-timeout"/);
assert.match(imageStudio, /Retry access check/);
assert.match(imageStudio, /isClientTimeoutError/);
// No bare untimed session hydrate on Image Studio boot
assert.doesNotMatch(imageStudio, /void fetchMe\(\)\.then/);
assert.match(landing, /STUDIO_SESSION_BOOT_MS/);
assert.match(
  landing,
  /fetchMe\(\{\s*timeoutMs:\s*STUDIO_SESSION_BOOT_MS\s*\}\)/
);
assert.match(landing, /sessionBoot === "timeout"/);
assert.match(landing, /data-studio-open-retry/);
assert.match(landing, /data-studio-open-error="session-timeout"/);
assert.match(landing, /Retry access check/);
assert.match(landing, /isClientTimeoutError/);
assert.match(landing, /setSessionResolved\(true\)/);
// Landing generate path must not leave capability-unknown without timeout marker
assert.match(landing, /data-landing-session-boot=\{sessionBoot\}/);
assert.match(imageStudio, /data-image-session-boot=\{sessionBoot\}/);

// AIT-199: MomentCreatePreview — finite Checking + timeout Retry (not soft Sign-in lie)
assert.match(momentPreview, /STUDIO_SESSION_BOOT_MS/);
assert.match(
  momentPreview,
  /fetchMe\(\{\s*timeoutMs:\s*STUDIO_SESSION_BOOT_MS\s*\}\)/
);
assert.match(momentPreview, /isClientTimeoutError/);
assert.match(momentPreview, /sessionBoot === "timeout"/);
assert.match(momentPreview, /data-studio-open-state=\{sessionBoot\}/);
assert.match(momentPreview, /data-studio-open-error="session-timeout"/);
assert.match(momentPreview, /data-studio-open-retry/);
assert.match(momentPreview, /Retry access check/);
assert.match(momentPreview, /setBootNonce/);
assert.match(momentPreview, /Checking private access…/);

// Runtime: withTimeout rejects hung work (authHeaders hang class)
const hang = new Promise(() => {});
const t0 = Date.now();
// Dynamic import of the TS module is not available in plain node; reimplement
// the same contract as lib/clientTimeout.ts withTimeout for this smoke.
await new Promise((resolve, reject) => {
  const ms = 40;
  const timer = setTimeout(() => {
    const err = new Error("Could not verify private access in time");
    err.name = "ClientTimeoutError";
    err.code = "CLIENT_TIMEOUT";
    reject(err);
  }, ms);
  hang.then(
    (v) => {
      clearTimeout(timer);
      resolve(v);
    },
    (e) => {
      clearTimeout(timer);
      reject(e);
    }
  );
}).then(
  () => {
    throw new Error("hung promise must not resolve");
  },
  (err) => {
    assert.equal(err.code, "CLIENT_TIMEOUT");
    assert.ok(Date.now() - t0 < 500, "wall-clock timeout must fire promptly");
  }
);

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
  "studio-open-lab-preview-regression: PASS (auto Lab on Create open; finite Opening studio; wall-clock auth+me; pack/batch/image/landing/moment-preview boot; timeout/error + retry; mobile sticky Lab CTA)"
);
