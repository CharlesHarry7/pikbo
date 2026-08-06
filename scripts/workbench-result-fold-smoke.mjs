#!/usr/bin/env node
/**
 * AIT-541 / AIT-529 / AIT-469 / AIT-381: post-generate result fold.
 *
 * Source + pure-logic contract:
 * - Resolver covers download / library / Lab replay / generate-again (re-spin)
 * - CreateStudio workbench (!fixedMomentContract) wires sticky + stage fold
 * - LandingToolPanel done stage wires the same one-primary fold (AIT-541)
 * - Fixed Moment path keeps generate-again sticky (no workbench fold bleed)
 * - Library primary owner-safe deep-link helper; Lab never claims private job
 * - Honest Lab vs Live provenance; freeLiveOpen / fixed Moment markers intact
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
const landingTool = read("components/LandingToolPanel.tsx");

// ── Pure resolver source contract ─────────────────────────────────────────
assert.match(
  foldLib,
  /export function resolveWorkbenchResultPrimary/,
  "workbenchResultFold must export resolveWorkbenchResultPrimary"
);
assert.match(
  foldLib,
  /export function libraryWorkbenchHandoffHref/,
  "must export libraryWorkbenchHandoffHref"
);
assert.match(
  foldLib,
  /export function libraryJobMatchesDeepLink/,
  "must export libraryJobMatchesDeepLink"
);
assert.match(
  foldLib,
  /kind:\s*"download"/,
  "resolver must return download primary"
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
  /Re-spin/,
  "listing 360 residual must use Re-spin labels"
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
assert.match(
  foldLib,
  /if \(input\.demo\) return ["']\/library["']/,
  "Lab demo must never deep-link as private owned clip"
);
assert.match(
  foldLib,
  /\/library\?job=\$\{encodeURIComponent\(id\)\}/,
  "private + UUID must produce /library?job="
);

// ── Runtime resolver via strip-types (Node 22+) ───────────────────────────
const runtimeProbe = `
import {
  resolveWorkbenchResultPrimary,
  libraryWorkbenchHandoffHref,
  libraryJobMatchesDeepLink,
} from ${JSON.stringify(
  pathToFileURL(join(root, "lib/workbenchResultFold.ts")).href
)};
import assert from "node:assert/strict";

const uuid = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

// Live private + download ready → Download (listing residual).
const privateDownload = resolveWorkbenchResultPrimary({
  demo: false,
  privateResult: true,
  playable: true,
  downloadAllowed: true,
  downloadReady: true,
  listing360: true,
});
assert.equal(privateDownload.kind, "download");
assert.equal(privateDownload.provenanceKind, "live-private");
assert.match(privateDownload.label, /Download/i);
assert.match(privateDownload.label, /360/);

// Live private without download → Library.
const privateLive = resolveWorkbenchResultPrimary({
  demo: false,
  privateResult: true,
  playable: true,
  downloadAllowed: false,
  downloadReady: false,
});
assert.equal(privateLive.kind, "library");
assert.equal(privateLive.provenanceKind, "live-private");
assert.match(privateLive.label, /Library/i);

const labPlayable = resolveWorkbenchResultPrimary({
  demo: true,
  privateResult: false,
  playable: true,
  downloadAllowed: true,
  downloadReady: true,
  listing360: true,
});
assert.equal(labPlayable.kind, "replay");
assert.equal(labPlayable.provenanceKind, "lab");
assert.match(labPlayable.stickyHint, /not your photo/i);

const labUnplayable = resolveWorkbenchResultPrimary({
  demo: true,
  privateResult: false,
  playable: false,
  listing360: true,
});
assert.equal(labUnplayable.kind, "generate-again");
assert.equal(labUnplayable.provenanceKind, "lab");
assert.match(labUnplayable.label, /Re-spin/i);

const liveLocal = resolveWorkbenchResultPrimary({
  demo: false,
  privateResult: false,
  playable: true,
  downloadAllowed: false,
});
assert.equal(liveLocal.kind, "library");
assert.equal(liveLocal.provenanceKind, "live-local");

// Lab never wins as Download even when downloadAllowed.
const labIgnoresDownload = resolveWorkbenchResultPrimary({
  demo: true,
  privateResult: true,
  playable: true,
  downloadAllowed: true,
  downloadReady: true,
});
assert.equal(labIgnoresDownload.kind, "replay");
assert.equal(labIgnoresDownload.provenanceKind, "lab");

// Library handoff href fail-closed.
assert.equal(
  libraryWorkbenchHandoffHref({
    demo: true,
    privateResult: true,
    requestId: uuid,
  }),
  "/library"
);
assert.equal(
  libraryWorkbenchHandoffHref({
    demo: false,
    privateResult: false,
    requestId: uuid,
  }),
  "/library"
);
assert.equal(
  libraryWorkbenchHandoffHref({
    demo: false,
    privateResult: true,
    requestId: "not-a-uuid",
  }),
  "/library"
);
assert.equal(
  libraryWorkbenchHandoffHref({
    demo: false,
    privateResult: true,
    requestId: uuid,
  }),
  "/library?job=" + encodeURIComponent(uuid)
);

assert.equal(
  libraryJobMatchesDeepLink({ id: uuid, requestId: "other" }, uuid),
  true
);
assert.equal(
  libraryJobMatchesDeepLink(
    { id: "job_local", requestId: uuid },
    uuid
  ),
  true
);
assert.equal(
  libraryJobMatchesDeepLink({ id: "a", requestId: "b" }, uuid),
  false
);

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
  /libraryWorkbenchHandoffHref/,
  "CreateStudio must use libraryWorkbenchHandoffHref"
);
assert.match(
  createStudio,
  /from ["']@\/lib\/workbenchResultFold["']/,
  "CreateStudio must import workbenchResultFold"
);
assert.match(
  createStudio,
  /isGenerate360Effect/,
  "CreateStudio must detect listing 360 for Re-spin labels"
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
  /data-result-fold-action=["']download["']/,
  "Download primary action marker required"
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
  /data-library-handoff=/,
  "Library primary must expose handoff kind marker"
);
assert.match(
  createStudio,
  /href=\{workbenchLibraryHref\}/,
  "Library fold primary must bind workbenchLibraryHref"
);
assert.match(
  createStudio,
  /data-result-provenance=\{/,
  "sticky/stage must expose provenance kind"
);
assert.match(
  createStudio,
  /downloadActiveResult/,
  "Download primary must call downloadActiveResult"
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

// AIT-546: residual Library chips/leave use workbenchLibraryHref / waitLibraryHref
// (owner deep-link when private UUID exists; fail-closed plain list otherwise).
assert.match(
  createStudio,
  /href=\{workbenchLibraryHref\}/,
  "CreateStudio residual Library paths bind workbenchLibraryHref"
);
assert.match(
  createStudio,
  /waitLibraryHref/,
  "CreateStudio must compute waitLibraryHref for mid-generate leave"
);
assert.match(
  createStudio,
  /libraryHref=\{waitLibraryHref\}/,
  "GenerateWaitStage must receive waitLibraryHref"
);

// ── LandingToolPanel wiring (AIT-541 parity) ──────────────────────────────
assert.match(
  landingTool,
  /resolveWorkbenchResultPrimary/,
  "LandingToolPanel must use resolveWorkbenchResultPrimary"
);
assert.match(
  landingTool,
  /libraryWorkbenchHandoffHref/,
  "LandingToolPanel must use libraryWorkbenchHandoffHref"
);
assert.match(
  landingTool,
  /from ["']@\/lib\/workbenchResultFold["']/,
  "LandingToolPanel must import workbenchResultFold"
);
assert.match(
  landingTool,
  /isGenerate360Effect/,
  "LandingToolPanel must detect listing 360 for Re-spin labels"
);
assert.match(
  landingTool,
  /status === ["']done["'] && videoUrl/,
  "landing result primary only on done path with video"
);
assert.match(
  landingTool,
  /data-result-fold=["']stage-primary["']/,
  "landing result stage must mark above-fold primary"
);
assert.match(
  landingTool,
  /data-landing-result-fold=["']done["']/,
  "landing must mark result-fold done"
);
assert.match(
  landingTool,
  /data-workbench-result-fold=["']done["']/,
  "landing must share workbench result-fold marker"
);
assert.match(
  landingTool,
  /data-result-fold-action=["']download["']/,
  "Landing Download primary action marker required"
);
assert.match(
  landingTool,
  /data-result-fold-action=["']library["']/,
  "Landing Library primary action marker required"
);
assert.match(
  landingTool,
  /data-result-fold-action=["']replay["']/,
  "Landing Replay primary action marker required"
);
assert.match(
  landingTool,
  /data-result-fold-action=["']generate-again["']/,
  "Landing Generate-again primary action marker required"
);
assert.match(
  landingTool,
  /data-library-handoff=/,
  "Landing Library primary must expose handoff kind marker"
);
assert.match(
  landingTool,
  /href=\{landingLibraryHref\}/,
  "Landing Library fold primary must bind landingLibraryHref"
);
assert.match(
  landingTool,
  /data-result-provenance=\{/,
  "landing stage must expose provenance kind"
);
assert.match(
  landingTool,
  /privateResult:\s*data\.privateResult === true|setPrivateResult\(data\.privateResult === true\)/,
  "Landing must capture privateResult from generate response"
);
assert.match(
  landingTool,
  /downloadLandingResult/,
  "Download primary must call downloadLandingResult"
);
assert.match(
  landingTool,
  /resultVideoRef/,
  "Landing Replay must target result video ref"
);
assert.match(
  landingTool,
  /function replayResultVideo/,
  "Landing Replay handler required"
);
assert.match(
  landingTool,
  /function runLandingGenerateAgain/,
  "Landing Generate-again handler required"
);
assert.match(
  landingTool,
  /const freeLiveOpen\s*=\s*Boolean\(/,
  "Landing freeLiveOpen gate must remain"
);
assert.match(
  landingTool,
  /GenerateAfterPath/,
  "Landing GenerateAfterPath advanced chrome remains under stage primary"
);

// Stage primary is ordered before GenerateAfterPath on landing.
const landingStageIdx = landingTool.indexOf('data-result-fold="stage-primary"');
const landingAfterIdx = landingTool.indexOf("<GenerateAfterPath");
assert.ok(landingStageIdx > 0, "landing stage-primary marker must exist");
assert.ok(
  landingAfterIdx > landingStageIdx,
  "landing stage primary must render before GenerateAfterPath"
);

// Fold primary skips twin Download when download is already the primary.
assert.match(
  landingTool,
  /landingResultPrimary\?\.kind !== ["']download["']/,
  "landing must skip twin Download CTA when fold primary is download"
);

console.log("workbench-result-fold-smoke: ok");
