#!/usr/bin/env node
/**
 * AIT-142: /create route honors Generate→360 deep links (source + runtime).
 *
 * - effect=360-spin-showcase → generate-workbench (no fixedMomentContract)
 * - mode=moment / street-power-up / default → fixed-moment
 * - No silent force of street-power-up for 360
 *
 * Run: node --experimental-strip-types scripts/create-route-360-smoke.mjs
 *   or: npm run create-route-360-smoke
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const createPage = read("app/create/page.tsx");
const contractLib = read("lib/createRouteContract.ts");
const jobIntents = read("lib/jobIntents.ts");

// ── Source markers: dual contract on create page ──────────────────────────
assert.match(
  createPage,
  /data-create-contract=["']generate-workbench["']/,
  "Create page must mark Generate workbench path"
);
assert.match(
  createPage,
  /data-create-contract=["']fixed-moment["']/,
  "Create page must mark fixed Moment path"
);
assert.match(
  createPage,
  /data-generate-360=\{is360 \? ["']true["'] : ["']false["']\}/,
  "Create page must expose data-generate-360 for 360 deep links"
);
assert.match(
  createPage,
  /resolveCreateRouteContract/,
  "Create page must route via resolveCreateRouteContract"
);
assert.match(
  createPage,
  /fixedMomentContract/,
  "Moment path must still set fixedMomentContract"
);

// Workbench CreateStudio: no fixed Moment prop, effect from query
const workbenchStudio = createPage.match(
  /data-create-contract=["']generate-workbench["'][\s\S]*?<CreateStudio([\s\S]*?)\/>/
)?.[1];
assert.ok(workbenchStudio, "generate-workbench CreateStudio must exist");
assert.match(
  workbenchStudio,
  /initialEffect=\{effectSlug\}/,
  "workbench must pass remix effect through"
);
assert.match(
  workbenchStudio,
  /initialRatio=\{sp\.ratio\}/,
  "workbench must pass ratio through"
);
assert.match(
  workbenchStudio,
  /initialDuration=\{sp\.duration\}/,
  "workbench must pass duration through"
);
assert.match(
  workbenchStudio,
  /initialChannel=\{sp\.channel\}/,
  "workbench must pass channel through"
);
assert.doesNotMatch(
  workbenchStudio,
  /fixedMomentContract/,
  "workbench CreateStudio must NOT set fixedMomentContract"
);
assert.doesNotMatch(
  workbenchStudio,
  /initialEffect=["']street-power-up["']/,
  "workbench must not hard-code street-power-up"
);
// GuestMomentCreateGate only wraps fixed-moment, never the workbench shell
const workbenchShell = createPage.match(
  /data-create-contract=["']generate-workbench["'][\s\S]*?<CreateSeoFooter/
)?.[0];
assert.ok(workbenchShell, "workbench shell with SEO footer must exist");
assert.doesNotMatch(
  workbenchShell,
  /GuestMomentCreateGate/,
  "workbench must not use Street Power-Up guest gate"
);

// Fixed Moment branch still forces street-power-up contract
const momentBlock = createPage.match(
  /data-create-contract=["']fixed-moment["'][\s\S]*?<\/GuestMomentCreateGate>/
)?.[0];
assert.ok(momentBlock, "fixed-moment branch must exist");
assert.match(
  momentBlock,
  /fixedMomentContract/,
  "fixed Moment path must pass fixedMomentContract"
);
assert.match(
  momentBlock,
  /initialEffect=["']street-power-up["']/,
  "fixed Moment path must lock street-power-up"
);
assert.match(
  createPage,
  /Turn one toy photo into Street Power-Up\./,
  "Moment path heading preserved"
);

// Helper module markers
assert.match(
  contractLib,
  /export function resolveCreateRouteContract/,
  "resolveCreateRouteContract must be exported"
);
assert.match(
  contractLib,
  /export function isGenerateWorkbenchEffect/,
  "isGenerateWorkbenchEffect must be exported"
);
assert.match(
  contractLib,
  /GENERATE_360_EFFECT/,
  "contract lib must reference GENERATE_360_EFFECT"
);
assert.match(
  jobIntents,
  /export const GENERATE_360_EFFECT\s*=\s*["']360-spin-showcase["']/,
  "GENERATE_360_EFFECT must remain 360-spin-showcase"
);

// ── Runtime: pure resolveCreateRouteContract ──────────────────────────────
const libPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "lib",
  "createRouteContract.ts"
);
const {
  resolveCreateRouteContract,
  isGenerateWorkbenchEffect,
  isGenerate360Effect,
  FIXED_MOMENT_EFFECT,
  GENERATE_360_EFFECT,
  WORKBENCH_EFFECT_SLUGS,
} = await import(pathToFileURL(libPath).href);

assert.equal(GENERATE_360_EFFECT, "360-spin-showcase");
assert.equal(FIXED_MOMENT_EFFECT, "street-power-up");

assert.equal(
  resolveCreateRouteContract({}),
  "fixed-moment",
  "bare /create → fixed Moment"
);
assert.equal(
  resolveCreateRouteContract({ mode: "moment" }),
  "fixed-moment",
  "mode=moment → fixed Moment"
);
assert.equal(
  resolveCreateRouteContract({
    mode: "moment",
    effect: "street-power-up",
  }),
  "fixed-moment",
  "mode=moment&effect=street-power-up → fixed Moment"
);
assert.equal(
  resolveCreateRouteContract({ effect: "street-power-up" }),
  "fixed-moment",
  "bare street-power-up → fixed Moment"
);
assert.equal(
  resolveCreateRouteContract({ effect: "360-spin-showcase" }),
  "generate-workbench",
  "effect=360-spin-showcase → Generate workbench"
);
assert.equal(
  resolveCreateRouteContract({
    effect: "360-spin-showcase",
    source: "hf-explore",
    ratio: "1:1",
    duration: "5",
    channel: "etsy",
  }),
  "generate-workbench",
  "createGenerate360Href-shaped query → workbench"
);
assert.equal(
  resolveCreateRouteContract({
    mode: "moment",
    effect: "360-spin-showcase",
  }),
  "fixed-moment",
  "mode=moment wins over 360 effect"
);
assert.equal(
  resolveCreateRouteContract({ effect: "floating-hero" }),
  "generate-workbench",
  "other registered remix → workbench"
);
assert.equal(
  resolveCreateRouteContract({ effect: "not-a-real-recipe" }),
  "fixed-moment",
  "unknown effect → fixed Moment (fail closed)"
);

assert.equal(isGenerate360Effect("360-spin-showcase"), true);
assert.equal(isGenerate360Effect("street-power-up"), false);
assert.equal(isGenerateWorkbenchEffect("360-spin-showcase"), true);
assert.equal(isGenerateWorkbenchEffect("street-power-up"), false);
assert.equal(isGenerateWorkbenchEffect(undefined), false);

// WORKBENCH_EFFECT_SLUGS must mirror PRESETS minus street-power-up
const presetsMod = await import(
  pathToFileURL(join(root, "lib", "presets.ts")).href
);
const presetWorkbench = presetsMod.PRESETS.map((p) => p.slug).filter(
  (s) => s !== "street-power-up"
);
assert.deepEqual(
  [...WORKBENCH_EFFECT_SLUGS].sort(),
  [...presetWorkbench].sort(),
  "WORKBENCH_EFFECT_SLUGS must match PRESETS minus street-power-up"
);
assert.ok(
  !WORKBENCH_EFFECT_SLUGS.includes("street-power-up"),
  "workbench registry must never include fixed Moment effect"
);

// AIT-588: Create page residual carnival pink chrome → gallery-calm copper
// (color only; route contract markers above stay authoritative)
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
  assert.match(
    createPage,
    /var\(--brand\)/,
    "Create page eyebrows/border accents use --brand copper"
  );
  assert.match(
    createPage,
    /rgba\(196\s*,\s*165\s*,\s*116/,
    "Create page radial wash uses copper board rgba(196,165,116)"
  );
}

console.log("create-route-360-smoke: ok");
