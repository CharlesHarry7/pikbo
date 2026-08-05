import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const createPage = read("app/create/page.tsx");
const gate = read("components/GuestMomentCreateGate.tsx");

assert.match(createPage, /<GuestMomentCreateGate>/);
assert.match(createPage, /<CreateStudio[\s\S]*initialEffect="street-power-up"[\s\S]*fixedMomentContract/);
assert.match(createPage, /description:[\s\S]{0,180}cached Street Power-Up sample/);
// AIT-114: authenticated Create entry above-fold is result-first (drop clip), not only effect brand.
assert.match(createPage, /data-create-entry-h1=["']result-first["']/);
assert.match(createPage, /Turn one owned photo into your drop clip\./);
assert.match(createPage, /list\/post-ready clip from Library/);

assert.match(gate, /data-guest-create-first="street-power-up"/);
// AIT-114: guest Create above-fold frames owned photo → private drop/list/post clip.
assert.match(gate, /data-create-entry-h1=["']result-first["']/);
assert.match(gate, /Your drop[\s\S]*clip\./);
assert.match(gate, /Owned photo → private clip/);
assert.match(
  gate,
  /private 9:16 clip ready to list, post,\s*or drop/
);
assert.match(gate, /Street Power-Up is the fixed direction/);
assert.match(gate, /data-guest-create-sample/);
assert.match(gate, /AutoPlayVideo/);
assert.match(gate, /beatbot-still\.webp/);
assert.match(gate, /beatbot-viral-hook\.mp4/);
assert.match(gate, /beatbot-viral-hook\.webm/);
assert.match(gate, /9:16/);
assert.match(gate, /5s/);
assert.match(gate, /720p/);
assert.match(gate, /Archive · 6s/);
assert.match(gate, /One photo in\./);
assert.match(gate, /One private clip out\./);
assert.match(gate, /data-guest-create-sign-in/);
assert.match(gate, /!signedIn/);
assert.match(gate, /Sign in to make yours/);
assert.match(gate, /data-guest-create-private-beta/);
assert.match(gate, /Request private beta/);
assert.match(gate, /data-guest-create-not-your-toy/);
assert.match(gate, /not your toy/);
assert.match(gate, /canUsePrivateLaunch\(me\)/);
assert.match(gate, /sessionResolved && canUsePrivateLaunch\(me\)/);
assert.match(gate, /me\?\.signedIn === true/);
assert.match(gate, /STUDIO_SESSION_BOOT_MS/);
assert.match(gate, /fetchMe\(\{\s*timeoutMs:\s*STUDIO_SESSION_BOOT_MS\s*\}\)/);
assert.match(gate, /isClientTimeoutError/);
assert.match(gate, /sessionBoot === "timeout"|setSessionBoot\(isClientTimeoutError/);
assert.match(gate, /data-studio-open-state/);
assert.match(gate, /errorRetry/);
assert.match(gate, /data-lab-preview-retry|Retry Lab preview|errorRetry/);

// Guest-first copy must not expose the private workbench's price-bearing or
// submit language. The authenticated children remain unchanged in page.tsx.
assert.doesNotMatch(gate, /\bupload\b|\bcredits\b|\bGenerate\b/);

for (const asset of [
  "public/demos/beatbot-still.webp",
  "public/demos/beatbot-viral-hook.mp4",
  "public/demos/beatbot-viral-hook.webm",
]) {
  assert.equal(existsSync(join(root, asset)), true, `${asset} must exist`);
}

console.log(
  "guest-create-preview-regression: PASS (result-first create entry; guest 6s archive; 9:16/5s/720p private target; sign-in/request-beta; no upload/credits/Generate copy)"
);
