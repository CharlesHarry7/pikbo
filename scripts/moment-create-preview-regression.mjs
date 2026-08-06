import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const moments = read("lib/moments.ts");
const home = read("components/HomeMomentShowcase.tsx");
const stage = read("components/MomentStage.tsx");
const rail = read("components/MomentRail.tsx");
const createPage = read("app/create/page.tsx");
const studio = read("components/CreateStudio.tsx");
const createPreview = read("components/MomentCreatePreview.tsx");
const localDraft = read("lib/localToyDraft.ts");
const shell = read("components/AppShell.tsx");

const expectedMoments = [
  ["capsule-reveal", "Capsule Reveal"],
  ["hangar-ignition", "Hangar Ignition"],
  ["colorblock-pedestal", "Colorblock Pedestal"],
  ["softroom-morning", "Softroom Morning"],
  ["gallery-spotlight", "Gallery Spotlight"],
  ["alley-drop-flash", "Alley Drop Flash"],
];

for (const [id, name] of expectedMoments) {
  assert.match(moments, new RegExp(`"${id}"`));
  assert.match(moments, new RegExp(`name: "${name}"`));
  assert.match(moments, new RegExp(`/moments/${id}\\.jpg`));
}
assert.equal((moments.match(/evidence: "Official Concept",/g) || []).length, 6);
assert.doesNotMatch(moments, /provider|modelId|prompt|generated result/i);

assert.match(home, /One toy photo\. More ways to sell\./);
assert.match(home, /Start with a photo you own\. Preview a listing, reveal, or drop/);
assert.match(home, /Preview a Moment/);
assert.match(home, /Three directions · choose one/);
assert.match(home, /mailto:support@pikbo\.ai\?subject=Pikbo%20private%20beta%20request/);
assert.match(home, /<MomentStage moment=\{active\}/);
assert.match(home, /<MomentRail moments=\{MOMENTS\}/);
assert.match(stage, /Preview with my toy/);
assert.match(stage, /href=\{`\/create\?moment=\$\{moment\.id\}`\}/);
assert.match(rail, /role="tablist"/);

// Moment query is fail-closed and never falls through to Studio.
const momentBranch = createPage.indexOf("if (sp.moment !== undefined)");
const genericStudio = createPage.indexOf("<CreateStudio");
assert.ok(momentBranch > -1, "create page must branch on ?moment=");
assert.ok(
  genericStudio > -1 && momentBranch < genericStudio,
  "Moment preview must resolve before CreateStudio"
);
assert.match(createPage, /Array\.isArray\(sp\.moment\) \? null : parseMomentId/);
assert.match(createPage, /if \(!momentId\) return <InvalidMomentNotice/);
assert.match(createPage, /MomentCreatePreview/);
assert.match(createPage, /GuestMomentCreateGate/);
// Soft-launch: public Create is the fixed Moment contract (no alternate UIs).
assert.match(studio, /fixedMomentContract\?: boolean/);
assert.match(studio, /const FIXED_MOMENT_EFFECT = "street-power-up"/);
assert.match(studio, /fixedMomentContract \? FIXED_MOMENT_EFFECT/);
assert.match(studio, /if \(fixedMomentContract\) return "9:16"/);
assert.match(studio, /fixedMomentContract\n    \? "720p"/);
assert.match(studio, /Locked motion recipe/);
assert.match(studio, /Seedance Fast · fixed private validation contract/);
assert.match(studio, /One owned toy photo · FAL Seedance Fast · 9:16 · 5s · 720p/);

assert.match(localDraft, /8 \* 1024 \* 1024/);
assert.match(localDraft, /24 \* 60 \* 60 \* 1000/);
assert.match(localDraft, /0xff, 0xd8, 0xff/);
assert.match(localDraft, /0x89, 0x50, 0x4e, 0x47/);
assert.match(localDraft, /0x57, 0x45, 0x42, 0x50/);
assert.match(localDraft, /clearLocalToyDraft/);
assert.match(localDraft, /const validation = await validateLocalToyImage\(input\.imageBlob\)/);
assert.match(localDraft, /transaction\.oncomplete = \(\) => resolve\(requestResult\)/);
assert.match(localDraft, /Math\.min\(85, Math\.max\(15/);
assert.match(localDraft, /Math\.min\(1\.8, Math\.max\(0\.65/);

assert.match(createPreview, /Preview composition only\. This is not a generated result\./);
assert.match(createPreview, /Your photo stays on this device · no upload · no generation · 0 credits/);
assert.match(createPreview, /Saved in this browser for 24 hours/);
assert.match(createPreview, /Clear local photo/);
assert.match(createPreview, /canPreparePrivateInput/);
assert.match(createPreview, /canUsePrivateLaunch/);
assert.match(createPreview, /Sign in to continue/);
assert.match(createPreview, /Verify private photo/);
assert.match(createPreview, /Create my private Moment/);
assert.match(
  createPreview,
  /create\?mode=moment&effect=street-power-up&source=moment-/
);
assert.doesNotMatch(
  createPreview,
  /create\?mode=seller-pack&source=moment-/
);
assert.match(createPreview, /Request private access/);
assert.match(
  createPreview,
  /mailto:support@pikbo\.ai\?subject=Pikbo%20private%20beta%20request/
);
assert.match(createPreview, /Watch a finished reveal/);
assert.match(createPreview, /moon-box-reveal\.mp4/);
assert.match(createPreview, /Archived study · separate sample toy/);
assert.match(createPreview, /\/login\?next=\$\{encodeURIComponent/);
// AIT-199: finite session boot + honest timeout Retry (no infinite Checking…)
assert.match(createPreview, /STUDIO_SESSION_BOOT_MS/);
assert.match(
  createPreview,
  /fetchMe\(\{\s*timeoutMs:\s*STUDIO_SESSION_BOOT_MS\s*\}\)/
);
assert.match(createPreview, /isClientTimeoutError/);
assert.match(createPreview, /sessionBoot === "timeout"/);
assert.match(createPreview, /data-studio-open-state=\{sessionBoot\}/);
assert.match(createPreview, /data-studio-open-error="session-timeout"/);
assert.match(createPreview, /data-studio-open-retry/);
assert.match(createPreview, /Retry access check/);
assert.match(createPreview, /setBootNonce/);
assert.doesNotMatch(createPreview, /fetch\(["']\/api\/(?:generate|assets|seller-pack)/);
assert.doesNotMatch(createPreview, /settle|reserve.*credits|release.*credits/i);

assert.match(shell, /Toy moments/);
assert.match(shell, /const momentValues = searchParams\.getAll\("moment"\)/);
assert.match(shell, /momentValues\.length === 1/);
assert.match(shell, /Boolean\(parseMomentId\(momentValues\[0\]\)\)/);
assert.match(shell, /DEFAULT_MOMENT_CREATE_HREF/);
assert.match(shell, /Create a Moment/);
// Soft-launch primary nav: Create / Library / Pricing (no Projects shelf).
assert.match(shell, /label: "Create"/);
assert.match(shell, /label: "Library"/);
assert.match(shell, /href: "\/library"/);
assert.doesNotMatch(shell, /Motion archive/);
assert.doesNotMatch(shell, /label: "Projects"/);

console.log("moment create preview regression: ok");
