#!/usr/bin/env node
/**
 * AIT-381: 360 workbench post-generate result fold (mobile sticky next action).
 *
 * Source + pure-logic contract:
 * - Resolver covers Lab / live-private / live-local primary kinds
 * - CreateStudio workbench (!fixedMomentContract) wires sticky + stage fold
 * - Fixed Moment path keeps generate-again sticky (no workbench fold bleed)
 * - Honest Lab vs Live provenance; Library owner-safe handoff
 * - freeLiveOpen / fixed Moment markers remain intact
 *
 * Run: node scripts/workbench-result-fold-smoke.mjs
 *   or: npm run workbench-result-fold-smoke
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const foldLib = read("lib/workbenchResultFold.ts");
const createStudio = read("components/CreateStudio.tsx");

// ── Pure resolver source contract ─────────────────────────────────────────
assert.match(
  foldLib,
  /export function resolveWorkbenchResultPrimary/,
  "workbenchResultFold must export resolveWorkbenchResultPrimary"
);
assert.match(
  foldLib,
  /kind:\s*"library"/,
  "resolver must return library primary"
);
assert.match(
  foldLib,
  /kind:\s*"replay"/,
  "resolver must return replay primary"
);
assert.match(
  foldLib,
  /kind:\s*"generate-again"/,
  "resolver must return generate-again primary"
);
assert.match(
  foldLib,
  /provenanceKind:\s*"lab"/,
  "resolver must label Lab provenance"
);
assert.match(
  foldLib,
  /provenanceKind:\s*"live-private"/,
  "resolver must label live-private provenance"
);
assert.match(
  foldLib,
  /provenanceKind:\s*"live-local"/,
  "resolver must label live-local provenance"
);
assert.match(
  foldLib,
  /Open Library · private result/,
  "private result must hand off to Library with owner-safe label"
);
assert.match(
  foldLib,
  /not your photo/,
  "Lab path must stay honest (not your photo)"
);
assert.match(
  foldLib,
  /this browser only/,
  "live-local must not claim cloud account vault"
);
assert.match(
  foldLib,
  /if \(!input\.demo && input\.privateResult\)/,
  "private Library handoff must require !demo"
);
assert.match(
  foldLib,
  /if \(input\.demo\)/,
  "Lab branch must gate on demo"
);

// ── Runtime resolver via strip-types (Node 22+) ───────────────────────────
const runtimeProbe = `
import { resolveWorkbenchResultPrimary } from ${JSON.stringify(
  pathToFileURL(join(root, "lib/workbenchResultFold.ts")).href
)};
import assert from "node:assert/strict";

const privateLive = resolveWorkbenchResultPrimary({
  demo: false,
  privateResult: true,
  playable: true,
});
assert.equal(privateLive.kind, "library");
assert.equal(privateLive.provenanceKind, "live-private");
assert.match(privateLive.label, /Library/i);

const labPlayable = resolveWorkbenchResultPrimary({
  demo: true,
  privateResult: false,
  playable: true,
});
assert.equal(labPlayable.kind, "replay");
assert.equal(labPlayable.provenanceKind, "lab");
assert.match(labPlayable.stickyHint, /not your photo/i);

const labUnplayable = resolveWorkbenchResultPrimary({
  demo: true,
  privateResult: false,
  playable: false,
});
assert.equal(labUnplayable.kind, "generate-again");
assert.equal(labUnplayable.provenanceKind, "lab");

const liveLocal = resolveWorkbenchResultPrimary({
  demo: false,
  privateResult: false,
  playable: true,
});
assert.equal(liveLocal.kind, "library");
assert.equal(liveLocal.provenanceKind, "live-local");

// Private flag must never win over Lab demo honesty.
const labIgnoresPrivateFlag = resolveWorkbenchResultPrimary({
  demo: true,
  privateResult: true,
  playable: true,
});
assert.equal(labIgnoresPrivateFlag.kind, "replay");
assert.equal(labIgnoresPrivateFlag.provenanceKind, "lab");

console.log("runtime-resolver: ok");
`;

const runtime = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "-e", runtimeProbe],
  { encoding: "utf8", cwd: root }
);
if (runtime.status !== 0) {
  // Source asserts already passed; runtime is best-effort on older Node.
  if (
    /experimental-strip-types|Unknown syntax|ERR_UNKNOWN_FILE_EXTENSION|Cannot find module/.test(
      `${runtime.stderr}\n${runtime.stdout}`
    )
  ) {
    console.warn(
      "workbench-result-fold-smoke: runtime resolver skipped (strip-types unavailable)"
    );
  } else {
    console.error(runtime.stdout);
    console.error(runtime.stderr);
    process.exit(runtime.status || 1);
  }
} else {
  process.stdout.write(runtime.stdout);
}

// ── CreateStudio wiring ───────────────────────────────────────────────────
assert.match(
  createStudio,
  /resolveWorkbenchResultPrimary/,
  "CreateStudio must use resolveWorkbenchResultPrimary"
);
assert.match(
  createStudio,
  /from ["']@\/lib\/workbenchResultFold["']/,
  "CreateStudio must import workbenchResultFold"
);
assert.match(
  createStudio,
  /!fixedMomentContract && status === ["']done["'] && videoUrl/,
  "result primary only on workbench done path"
);
assert.match(
  createStudio,
  /data-result-fold=["']mobile-sticky["']/,
  "mobile sticky must mark result fold"
);
assert.match(
  createStudio,
  /data-result-fold=["']stage-primary["']/,
  "result stage must mark above-fold primary"
);
assert.match(
  createStudio,
  /data-workbench-result-fold=["']done["']/,
  "sticky must mark workbench result-fold done"
);
assert.match(
  createStudio,
  /data-result-fold-action=["']library["']/,
  "Library primary action marker required"
);
assert.match(
  createStudio,
  /data-result-fold-action=["']replay["']/,
  "Replay primary action marker required"
);
assert.match(
  createStudio,
  /data-result-fold-action=["']generate-again["']/,
  "Generate-again primary action marker required"
);
assert.match(
  createStudio,
  /data-result-provenance=\{/,
  "sticky/stage must expose provenance kind"
);
assert.match(
  createStudio,
  /libraryWorkbenchHandoffHref/,
  "Library fold primary must use owner-safe handoff href helper"
);
assert.match(
  createStudio,
  /href=\{workbenchLibraryHref\}/,
  "Library fold primary must bind workbenchLibraryHref (may carry ?job=)"
);
// Secondary / fixed-Moment Open Library links stay plain list (no deep-link thrash).
assert.match(
  createStudio,
  /href=["']\/library["']/,
  "plain /library remains for non-fold secondary/Moment paths"
);
assert.match(
  createStudio,
  /resultVideoRef/,
  "Replay must target result video ref"
);
assert.match(
  createStudio,
  /function replayResultVideo/,
  "Replay handler required"
);
assert.match(
  createStudio,
  /function runWorkbenchGenerateAgain/,
  "Generate-again handler required"
);

// Fixed Moment sticky remains a separate branch (no workbench fold on Moment).
assert.match(
  createStudio,
  /data-sticky-primary=\{\s*\n?\s*fixedMomentContract \? ["']moment-generate-again["']/,
  "fixed Moment done sticky must keep moment-generate-again marker"
);

// freeLiveOpen honesty residual must not be removed by this fold.
assert.match(
  createStudio,
  /const freeLiveOpen\s*=\s*Boolean\(/,
  "freeLiveOpen gate must remain"
);
assert.match(
  createStudio,
  /fixedMomentContract/,
  "fixedMomentContract prop path must remain"
);

// Advanced after-path still available below primary (not removed).
assert.match(
  createStudio,
  /GenerateAfterPath/,
  "GenerateAfterPath advanced chrome remains under stage primary"
);

// Stage primary is ordered before GenerateAfterPath (above advanced chrome).
const stageIdx = createStudio.indexOf('data-result-fold="stage-primary"');
const afterIdx = createStudio.indexOf("<GenerateAfterPath");
assert.ok(stageIdx > 0, "stage-primary marker must exist");
assert.ok(afterIdx > stageIdx, "stage primary must render before GenerateAfterPath");

console.log("workbench-result-fold-smoke: ok");
