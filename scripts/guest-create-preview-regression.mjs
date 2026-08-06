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

// AIT-305: GuestMomentCreateGate off residual competitor lime (board tokens)
assert.equal(
  /#c8ff3d|c8ff3d|200\s*,\s*255\s*,\s*61/.test(gate),
  false,
  "GuestMomentCreateGate must not hard-code competitor lime (#c8ff3d / rgba 200,255,61)"
);
assert.equal(
  gate.includes("var(--mint)") && gate.includes("var(--void)"),
  true,
  "GuestMomentCreateGate retry hover chrome uses var(--mint) / var(--void) board tokens"
);

// AIT-588: authenticated Create page chrome residual carnival pink → copper
// (gate wrap honesty unchanged; page.tsx color-only lock)
{
  const carnival =
    /#B14EFF|#FF4ECD|#00D9FF|255\s*,\s*78\s*,\s*205|177\s*,\s*78\s*,\s*255|0\s*,\s*217\s*,\s*255/i;
  const lime = /#c8ff3d|c8ff3d|200\s*,\s*255\s*,\s*61/i;
  assert.equal(
    carnival.test(createPage),
    false,
    "app/create/page.tsx must not hard-code carnival pink/cyan RGB"
  );
  assert.equal(
    lime.test(createPage),
    false,
    "app/create/page.tsx must not hard-code competitor lime (#c8ff3d / rgba 200,255,61)"
  );
  assert.equal(
    createPage.includes("var(--brand)") &&
      /rgba\(196\s*,\s*165\s*,\s*116/.test(createPage),
    true,
    "Create page radial wash + eyebrows use --brand + copper rgba(196,165,116)"
  );
}

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
