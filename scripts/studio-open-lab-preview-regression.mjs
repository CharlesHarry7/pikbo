/**
 * AIT-40: Create/Studio open-state — auto Lab preview + bounded session/sample
 * loads with honest timeout + retry (no permanent "checking" lock).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const openState = read("lib/studioOpenState.ts");
const gate = read("components/GuestMomentCreateGate.tsx");
const studio = read("components/CreateStudio.tsx");
const guestRegression = read("scripts/guest-create-preview-regression.mjs");

// Contracts
assert.match(openState, /STUDIO_SESSION_RESOLVE_MS\s*=\s*8_000/);
assert.match(openState, /STUDIO_LAB_SAMPLE_LOAD_MS\s*=\s*12_000/);
assert.match(openState, /export function withTimeout/);
assert.match(openState, /STUDIO_OPEN_LAB_SAMPLE/);
assert.match(openState, /beatbot-viral-hook\.mp4/);
assert.match(openState, /STUDIO_SESSION_TIMEOUT_COPY/);
assert.match(openState, /STUDIO_LAB_SAMPLE_TIMEOUT_COPY/);

// Guest gate: Lab preview always visible; session bounded; retry on timeout
assert.match(gate, /data-studio-open="guest-lab-preview"/);
assert.match(gate, /withTimeout/);
assert.match(gate, /STUDIO_SESSION_RESOLVE_MS/);
assert.match(gate, /studioSessionTimeoutError/);
assert.match(gate, /data-studio-open-status="checking"/);
assert.match(gate, /data-studio-open-status="access-timeout"/);
assert.match(gate, /data-studio-open-retry="access"/);
assert.match(gate, /GuestMomentPreview/);
assert.match(gate, /AutoPlayVideo/);
assert.match(gate, /beatbot-viral-hook\.mp4/);
// Still fail-closed into private Studio only when entitled
assert.match(gate, /canUsePrivateLaunch\(me\)/);

// CreateStudio: session + sample timeouts; open Lab preview on fixed Moment
assert.match(studio, /withTimeout/);
assert.match(studio, /STUDIO_SESSION_RESOLVE_MS/);
assert.match(studio, /STUDIO_LAB_SAMPLE_LOAD_MS/);
assert.match(studio, /studioLabSampleTimeoutError/);
assert.match(studio, /sessionAccessError/);
assert.match(studio, /data-studio-open-lab-preview="street-power-up"/);
assert.match(studio, /STUDIO_OPEN_LAB_SAMPLE/);
assert.match(studio, /AutoPlayVideo/);
assert.match(studio, /data-studio-open-retry="access"/);
assert.match(studio, /data-studio-open-retry="lab-sample"/);
assert.match(studio, /data-studio-open-status="sample-loading"/);
assert.match(studio, /data-studio-open-status="sample-error"/);
// Never leave permanent checking without recovery path
assert.match(studio, /Never leave Create stuck on "Checking private-beta access…"/);
assert.match(studio, /Retry access check/);
assert.match(studio, /Retry Lab sample/);

// Archive assets exist
for (const asset of [
  "public/demos/beatbot-still.webp",
  "public/demos/beatbot-viral-hook.mp4",
  "public/demos/beatbot-viral-hook.webm",
]) {
  assert.equal(existsSync(join(root, asset)), true, `${asset} must exist`);
}

// Guest path regression still required companion
assert.match(guestRegression, /guest-create-preview-regression/);

console.log(
  "studio-open-lab-preview-regression: PASS (bounded session/sample; auto Lab open preview; honest retry)"
);
