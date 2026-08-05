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

assert.match(gate, /data-guest-create-first="street-power-up"/);
assert.match(gate, /Street[\s\S]*Power-Up\./);
assert.match(gate, /A neon, drop-day direction built for designer-toy reveals/);
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
assert.match(gate, /withTimeout|\.catch\(\(\) =>/);
assert.match(gate, /STUDIO_SESSION_RESOLVE_MS|sessionResolved/);

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
  "guest-create-preview-regression: PASS (guest-first 6s archive study; honest 9:16/5s/720p private target; sign-in/request-beta CTAs; no upload/credits/Generate copy)"
);
