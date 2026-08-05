/**
 * AIT-75/88/100 — Generate→360 single href helper audit.
 *
 * Locks:
 * 1. createWorkbenchHref / DEFAULT_GENERATE_EFFECT are the only product-shell
 *    Generate door constructors (full remix: effect/ratio/duration/channel).
 * 2. Residual Generate CTAs (data-*-generate / Open Generate / shell doors)
 *    resolve through createWorkbenchHref or createRemixHref(recipe) — not bare
 *    /create or /create?effect=street-power-up labeled as Generate.
 * 3. Soft-launch live Generate primary uses generate-remix, not single-moment.
 *
 * Moment doors (Create one Moment / MOMENT_CREATE_HREF) stay separate.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(join(root, rel), "utf8");

const jobIntents = read("lib/jobIntents.ts");
const remixIntent = read("lib/remixIntent.ts");

assert.match(
  jobIntents,
  /export const DEFAULT_GENERATE_EFFECT\s*=\s*["']360-spin-showcase["']/,
  "DEFAULT_GENERATE_EFFECT must be 360-spin-showcase"
);
assert.match(
  jobIntents,
  /export function createWorkbenchHref/,
  "createWorkbenchHref is the single Generate→360 helper"
);
assert.match(
  jobIntents,
  /createRemixHref\(\s*DEFAULT_GENERATE_EFFECT/,
  "createWorkbenchHref must call createRemixHref(DEFAULT_GENERATE_EFFECT)"
);
assert.match(
  remixIntent,
  /export function createRemixHref/,
  "createRemixHref remains the low-level remix builder"
);

/** Product-shell Generate doors that must use the single helper. */
const GENERATE_DOORS = [
  ["components/Header.tsx", /HEADER_GENERATE_HREF\s*=\s*createWorkbenchHref\(\)/],
  ["components/MobileGenerateBar.tsx", /MOBILE_GENERATE_HREF\s*=\s*createWorkbenchHref\(\)/],
  ["components/HomeToolShelf.tsx", /SHELF_GENERATE_HREF\s*=\s*createWorkbenchHref\(\)/],
  ["components/CommandPalette.tsx", /CMD_GENERATE_HREF\s*=\s*createWorkbenchHref\(\)/],
  ["components/GenerateSuiteChrome.tsx", /createWorkbenchHref\(\)/],
  ["components/SuiteEntryStrip.tsx", /SUITE_GENERATE_HREF\s*=\s*createWorkbenchHref\(\)/],
  ["components/HowItWorks.tsx", /HOW_IT_WORKS_GENERATE_HREF\s*=\s*createWorkbenchHref\(\)/],
  ["components/LandingSeoMesh.tsx", /SEO_MESH_GENERATE_HREF\s*=\s*createWorkbenchHref\(\)/],
  ["components/HfProductRail.tsx", /GENERATE_REMIX_HREF\s*=\s*createWorkbenchHref\(\)/],
  ["components/SoftLaunchStrip.tsx", /SOFT_LAUNCH_GENERATE_HREF\s*=\s*createWorkbenchHref\(/],
  ["components/SoftLaunchStrip.tsx", /data-soft-launch-try=\{[\s\S]*generate-remix/],
  ["components/SoftLaunchStrip.tsx", /data-soft-launch=["']generate-remix["']/],
  ["components/FreeTrialCta.tsx", /FREE_TRIAL_GENERATE_HREF\s*=\s*createWorkbenchHref\(/],
  ["components/ModulesSuiteCtas.tsx", /MODULES_PHOTO_CLIP_HREF\s*=\s*createWorkbenchHref\(\)/],
  ["components/ProfilePanel.tsx", /PROFILE_GENERATE_HREF\s*=\s*createWorkbenchHref\(\)/],
  ["components/SuiteDoorLinks.tsx", /createWorkbenchHref\(\)/],
  ["components/GenerateAfterPath.tsx", /createWorkbenchHref\(/],
  ["app/generate/page.tsx", /redirect\(createWorkbenchHref\(\)\)/],
  ["app/explore/page.tsx", /EXPLORE_GENERATE_HREF\s*=\s*createWorkbenchHref\(\)/],
  ["app/profile/page.tsx", /PROFILE_PAGE_GENERATE_HREF\s*=\s*createWorkbenchHref\(\)/],
  ["app/settings/page.tsx", /SETTINGS_GENERATE_HREF\s*=\s*createWorkbenchHref\(\)/],
  ["app/community/page.tsx", /createWorkbenchHref\(\)/],
  ["app/apps/page.tsx", /APPS_GENERATE_HREF\s*=\s*createWorkbenchHref\(\)/],
  ["app/effects/page.tsx", /EFFECTS_GENERATE_HREF\s*=\s*createWorkbenchHref\(\)/],
  ["app/flow/page.tsx", /FLOW_GENERATE_HREF\s*=\s*createWorkbenchHref\(\)/],
  ["app/modules/page.tsx", /MODULES_PATH_GENERATE_HREF\s*=\s*createWorkbenchHref\(\)/],
  ["app/models/page.tsx", /MODELS_GENERATE_HREF\s*=\s*createWorkbenchHref\(\)/],
  ["app/tools/page.tsx", /TOOLS_GENERATE_HREF\s*=\s*createWorkbenchHref\(\)/],
  ["app/status/page.tsx", /STATUS_GENERATE_HREF\s*=\s*createWorkbenchHref\(\)/],
  ["app/guides/page.tsx", /GUIDES_GENERATE_HREF\s*=\s*createWorkbenchHref\(\)/],
  ["app/cinema/page.tsx", /CINEMA_GENERATE_HREF\s*=\s*createWorkbenchHref\(\)/],
  ["app/supercomputer/page.tsx", /BATCH_GENERATE_HREF\s*=\s*createWorkbenchHref\(\)/],
];

for (const [rel, re] of GENERATE_DOORS) {
  assert.match(
    read(rel),
    re,
    `${rel} Generate door must use createWorkbenchHref (single 360 helper)`
  );
}

// Soft-launch live Generate must not point primary CTA at bare street-power Moment.
const softLaunch = read("components/SoftLaunchStrip.tsx");
assert.doesNotMatch(
  softLaunch,
  /primaryHref[\s\S]{0,200}\/create\?effect=street-power-up&source=soft-launch/,
  "SoftLaunchStrip live primary must not be bare street-power-up"
);
assert.doesNotMatch(
  softLaunch,
  /data-soft-launch-try=\{[\s\S]{0,80}single-moment/,
  "SoftLaunchStrip live try marker is generate-remix, not single-moment"
);

// FreeTrialCta home live path uses workbench helper, not bare street-power.
const freeTrial = read("components/FreeTrialCta.tsx");
assert.doesNotMatch(
  freeTrial,
  /\/create\?effect=street-power-up&source=free-trial/,
  "FreeTrialCta must not hardcode bare free-trial street-power-up"
);

// No residual hardcoded createRemixHref("360-spin-showcase") in product shell —
// those doors go through createWorkbenchHref so the default effect has one owner.
const shellGlobs = [
  "components/Header.tsx",
  "components/MobileGenerateBar.tsx",
  "components/HomeToolShelf.tsx",
  "components/SoftLaunchStrip.tsx",
  "components/SuiteEntryStrip.tsx",
  "components/HowItWorks.tsx",
  "components/LandingSeoMesh.tsx",
  "components/HfProductRail.tsx",
  "components/ProfilePanel.tsx",
  "components/ModulesSuiteCtas.tsx",
  "app/generate/page.tsx",
  "app/explore/page.tsx",
  "app/profile/page.tsx",
  "app/settings/page.tsx",
];
for (const rel of shellGlobs) {
  assert.doesNotMatch(
    read(rel),
    /createRemixHref\(\s*["']360-spin-showcase["']\s*\)/,
    `${rel}: use createWorkbenchHref() instead of createRemixHref("360-spin-showcase")`
  );
}

// data-*-generate="remix" markers should live next to createWorkbenchHref /
// createRemixHref — not bare street-power strings on the same Link.
const remixMarkers = [
  ["app/explore/page.tsx", /data-explore-generate=["']remix["']/],
  ["app/profile/page.tsx", /data-profile-page-generate=["']remix["']/],
  ["app/settings/page.tsx", /data-settings-generate=["']remix["']/],
  ["app/community/page.tsx", /data-community-generate=["']remix["']/],
  ["app/apps/page.tsx", /data-apps-generate=["']remix["']/],
  ["app/effects/page.tsx", /data-effects-generate=["']remix["']/],
  ["components/Header.tsx", /data-header-cta=["']generate-remix["']/],
  ["components/MobileGenerateBar.tsx", /data-mobile-bar=["']generate-remix["']/],
];
for (const [rel, re] of remixMarkers) {
  const src = read(rel);
  assert.match(src, re, `${rel} keeps remix Generate marker`);
  // When the marker is present, the file must import createWorkbenchHref or createRemixHref
  assert.match(
    src,
    /createWorkbenchHref|createRemixHref/,
    `${rel} with remix marker must use remix helper`
  );
}

console.log("generate-360-href-audit-smoke: ok");
