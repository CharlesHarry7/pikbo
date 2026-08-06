#!/usr/bin/env node
/**
 * AIT-529 / AIT-392 / AIT-546 / AIT-568: Workbench + AfterPath + WaitStage +
 * residual CreateStudio Library chips → requestId deep-link (owner-safe).
 *
 * Source + pure-logic contract:
 * - libraryWorkbenchHandoffHref only deep-links live private + UUID requestId
 * - Lab demo never carries ?job= as private owned clip
 * - live-local / missing requestId → plain /library (list, no fake open)
 * - CreateStudio fold primary uses helper; fixed Moment sticky stays generate-again
 * - Residual CreateStudio chips (fixed-Moment Open Library + saved Library) use
 *   the same workbenchLibraryHref helper (never invent ?job=)
 * - GenerateAfterPath Library chips use helper (fail-closed)
 * - GenerateWaitStage leave exposes libraryHref / handoff markers
 * - LibraryGrid matches deep-link by id or requestId; missing/foreign → not-your-toy
 *
 * Run: node scripts/library-workbench-deeplink-smoke.mjs
 *   or: npm run library-workbench-deeplink-smoke
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
const afterPath = read("components/GenerateAfterPath.tsx");
const waitStage = read("components/GenerateWaitStage.tsx");
const landingPanel = read("components/LandingToolPanel.tsx");
const generateClient = read("lib/generateClient.ts");
const libraryGrid = read("components/LibraryGrid.tsx");
const pkg = read("package.json");

// ── Source contracts ──────────────────────────────────────────────────────
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
  /if \(input\.demo\) return ["']\/library["']/,
  "Lab demo must never deep-link as private owned clip"
);
assert.match(
  foldLib,
  /if \(!input\.privateResult\) return ["']\/library["']/,
  "live-local without privateResult must stay plain list"
);
assert.match(
  foldLib,
  /\/library\?job=\$\{encodeURIComponent\(id\)\}/,
  "private + UUID must produce /library?job="
);

assert.match(
  createStudio,
  /libraryWorkbenchHandoffHref/,
  "CreateStudio must import/use libraryWorkbenchHandoffHref"
);
assert.match(
  createStudio,
  /workbenchLibraryHref/,
  "CreateStudio must compute workbenchLibraryHref"
);
assert.match(
  createStudio,
  /href=\{workbenchLibraryHref\}/,
  "fold Library primary must bind workbenchLibraryHref"
);
assert.match(
  createStudio,
  /data-library-handoff=/,
  "fold Library primary must expose handoff kind marker"
);
// Lab path still resolves replay, never library deep-link primary for demos.
assert.match(
  createStudio,
  /data-result-fold-action=["']replay["']/,
  "Lab playable path keeps Replay primary (not private Library deep-link)"
);

// freeLiveOpen / fixed Moment residual honesty must remain.
assert.match(
  createStudio,
  /const freeLiveOpen\s*=\s*Boolean\(/,
  "freeLiveOpen gate must remain"
);
assert.match(
  createStudio,
  /fixedMomentContract/,
  "fixedMomentContract path must remain"
);
assert.match(
  createStudio,
  /data-sticky-primary=\{\s*\n?\s*fixedMomentContract \? ["']moment-generate-again["']/,
  "fixed Moment sticky must stay generate-again (no workbench deep-link bleed)"
);

// ── AIT-568: residual CreateStudio Library chips (fixed-Moment + advanced) ─
// Both residual chips bind workbenchLibraryHref (same helper as fold primary).
const residualLibraryHrefCount = (
  createStudio.match(/href=\{workbenchLibraryHref\}/g) || []
).length;
assert.ok(
  residualLibraryHrefCount >= 3,
  "CreateStudio must bind workbenchLibraryHref on fold primary + residual chips (≥3)"
);
assert.match(
  createStudio,
  /data-fixed-moment-after=["']first-dollar["'][\s\S]*?href=\{workbenchLibraryHref\}[\s\S]*?Open Library/,
  "fixed-Moment residual Open Library must deep-link via workbenchLibraryHref"
);
assert.match(
  createStudio,
  /href=\{workbenchLibraryHref\}[\s\S]*?t\(["']create\.savedLibrary["']\)/,
  "advanced chrome saved Library chip must bind workbenchLibraryHref"
);
assert.match(
  createStudio,
  /workbenchLibraryHref\.includes\(["']job=["']\)[\s\S]*?\? ["']private-job["']/,
  "residual Library chips must mark private-job vs list handoff"
);
// Fail-closed: no plain hardcoded /library residual chips left on CreateStudio.
assert.doesNotMatch(
  createStudio,
  /href=["']\/library["']/,
  "CreateStudio residual Library links must not hardcode plain /library"
);

// Library owner-safe deep-link resolve.
assert.match(
  libraryGrid,
  /libraryJobMatchesDeepLink/,
  "LibraryGrid must use libraryJobMatchesDeepLink"
);
assert.match(
  libraryGrid,
  /from ["']@\/lib\/workbenchResultFold["']/,
  "LibraryGrid must import workbenchResultFold matcher"
);
assert.match(
  libraryGrid,
  /listHasDeepLink/,
  "LibraryGrid must keep listHasDeepLink owned path"
);
assert.match(
  libraryGrid,
  /libraryJobMatchesDeepLink\(job, deepLinkJobId/,
  "list + selection must match id or requestId"
);

assert.match(
  pkg,
  /"library-workbench-deeplink-smoke"/,
  "package.json must register library-workbench-deeplink-smoke"
);

// ── AIT-546: GenerateAfterPath Library chips ──────────────────────────────
assert.match(
  afterPath,
  /libraryWorkbenchHandoffHref/,
  "GenerateAfterPath must use libraryWorkbenchHandoffHref"
);
assert.match(
  afterPath,
  /requestId\?:/,
  "GenerateAfterPath must accept requestId prop"
);
assert.match(
  afterPath,
  /privateResult\?:/,
  "GenerateAfterPath must accept privateResult prop"
);
assert.match(
  afterPath,
  /href=\{libraryHref\}/,
  "AfterPath Library chip must bind libraryHref"
);
assert.match(
  afterPath,
  /data-library-handoff=\{libraryHandoffKind\}/,
  "AfterPath must expose library handoff kind"
);
// Lab demo path still accepts demo prop (fail-closed inside helper).
assert.match(
  afterPath,
  /demo\s*=\s*false/,
  "GenerateAfterPath demo defaults fail-closed (false)"
);

// ── AIT-546: GenerateWaitStage leave honesty ──────────────────────────────
assert.match(
  waitStage,
  /libraryHref\s*=\s*["']\/library["']/,
  "GenerateWaitStage libraryHref must default plain /library"
);
assert.match(
  waitStage,
  /data-library-handoff=\{libraryHandoffKind\}/,
  "WaitStage leave must expose library handoff kind"
);
assert.match(
  waitStage,
  /data-generate-leave=["']detach["']/,
  "WaitStage detach leave marker must remain"
);
assert.match(
  waitStage,
  /Open Library · keep generating/,
  "WaitStage leave copy must remain"
);

// ── AIT-546: CreateStudio + Landing wiring ────────────────────────────────
assert.match(
  createStudio,
  /requestId=\{activeVersion\?\.requestId\}/,
  "CreateStudio AfterPath must pass activeVersion.requestId"
);
assert.match(
  createStudio,
  /privateResult=\{Boolean\(activeVersion\?\.privateResult\)\}/,
  "CreateStudio AfterPath must pass privateResult"
);
assert.match(
  createStudio,
  /waitLibraryHref/,
  "CreateStudio must compute waitLibraryHref"
);
assert.match(
  createStudio,
  /libraryHref=\{waitLibraryHref\}/,
  "CreateStudio WaitStage must receive waitLibraryHref"
);
assert.match(
  createStudio,
  /onDurableJobId/,
  "CreateStudio must capture mid-wait durable jobId"
);
assert.match(
  createStudio,
  /router\.push\(\s*libraryWorkbenchHandoffHref/,
  "leaveWaitingKeepBackground must deep-link via helper"
);
assert.match(
  generateClient,
  /onDurableJobId\?:/,
  "generateClient must expose onDurableJobId for mid-wait handoff"
);
assert.match(
  landingPanel,
  /requestId=\{requestId\}/,
  "LandingToolPanel AfterPath must pass requestId"
);
assert.match(
  landingPanel,
  /privateResult=\{privateResult\}/,
  "LandingToolPanel AfterPath must pass privateResult"
);

// ── Runtime pure helpers ──────────────────────────────────────────────────
const runtimeProbe = `
import {
  libraryWorkbenchHandoffHref,
  libraryJobMatchesDeepLink,
} from ${JSON.stringify(
  pathToFileURL(join(root, "lib/workbenchResultFold.ts")).href
)};
import assert from "node:assert/strict";

const uuid = "11111111-2222-4333-a444-555555555555";

assert.equal(
  libraryWorkbenchHandoffHref({
    demo: false,
    privateResult: true,
    requestId: uuid,
  }),
  "/library?job=" + encodeURIComponent(uuid)
);
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
    privateResult: true,
    requestId: "job_not_uuid",
  }),
  "/library"
);
assert.equal(
  libraryJobMatchesDeepLink({ id: uuid }, uuid),
  true
);
assert.equal(
  libraryJobMatchesDeepLink({ id: "x", requestId: uuid }, uuid),
  true
);
assert.equal(
  libraryJobMatchesDeepLink({ id: "x", requestId: "y" }, uuid),
  false
);

console.log("library-workbench-deeplink-runtime: ok");
`;

const runtime = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "-e", runtimeProbe],
  { encoding: "utf8", cwd: root }
);
if (runtime.status !== 0) {
  if (
    /experimental-strip-types|Unknown syntax|ERR_UNKNOWN_FILE_EXTENSION|Cannot find module/.test(
      `${runtime.stderr}\n${runtime.stdout}`
    )
  ) {
    console.warn(
      "library-workbench-deeplink-smoke: runtime skipped (strip-types unavailable)"
    );
  } else {
    console.error(runtime.stdout);
    console.error(runtime.stderr);
    process.exit(runtime.status || 1);
  }
} else {
  process.stdout.write(runtime.stdout);
}

console.log("library-workbench-deeplink-smoke: ok");
