#!/usr/bin/env node
/**
 * AIT-529 / AIT-392 / AIT-546 / AIT-568 / AIT-576 / AIT-558: Workbench +
 * AfterPath + WaitStage + residual CreateStudio chips + Image residual Library
 * chrome + BatchStudio/Seller Pack done → requestId deep-link (owner-safe).
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
 * - Image Studio residual Library chrome uses helper; Lab/missing fail-closed
 * - BatchStudio / Seller Pack post-pack Library CTAs reuse same helper
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
const batchStudio = read("components/BatchStudio.tsx");
const libraryGrid = read("components/LibraryGrid.tsx");
const imageStudio = read("app/image/page.tsx");
const imageRoute = read("app/api/image/route.ts");
const imageClient = read("lib/imageClient.ts");
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


// ── BatchStudio / Seller Pack Library handoff (AIT-558) ───────────────────
assert.match(
  batchStudio,
  /libraryWorkbenchHandoffHref/,
  "BatchStudio must import/use libraryWorkbenchHandoffHref"
);
assert.match(
  batchStudio,
  /from ["']@\/lib\/workbenchResultFold["']/,
  "BatchStudio must import workbenchResultFold"
);
assert.match(
  batchStudio,
  /function packLibraryHandoffHref/,
  "BatchStudio must keep packLibraryHandoffHref helper"
);
assert.match(
  batchStudio,
  /batchLibraryHref/,
  "BatchStudio must compute batchLibraryHref"
);
assert.match(
  batchStudio,
  /href=\{batchLibraryHref\}/,
  "Batch pack-done Library CTAs must bind batchLibraryHref"
);
assert.match(
  batchStudio,
  /data-library-handoff=/,
  "Batch Library CTAs must expose handoff kind marker"
);
assert.match(
  batchStudio,
  /data-seller-pack-action=["']library["']/,
  "seller-pack library action marker remains for first-run smoke"
);
assert.match(
  batchStudio,
  /privateResult:\s*data\.privateResult === true/,
  "BatchStudio must capture privateResult from generate response"
);
assert.match(
  batchStudio,
  /privateResult:\s*job\.status === ["']succeeded["'] && Boolean\(job\.requestId\)/,
  "BatchStudio recovery must mark privateResult on owner success"
);
assert.match(
  batchStudio,
  /router\.push\(packLibraryHandoffHref\(jobs\)\)/,
  "leave-wait keep-background must hand off owner-safe Library href"
);
// Fail-closed residual: never hardcode inventing private ?job= outside helper.
assert.doesNotMatch(
  batchStudio,
  /href=["']\/library\?job=/,
  "BatchStudio must never hardcode /library?job= (use helper)"
);
// Pack-done primary paths must not leave a bare plain href="/library" CTA.
assert.doesNotMatch(
  batchStudio,
  /href=["']\/library["']/,
  "BatchStudio pack Library CTAs must not hardcode plain /library"
);

// ── Image Studio residual Library handoff (AIT-576) ───────────────────────
assert.match(
  imageStudio,
  /libraryWorkbenchHandoffHref/,
  "Image Studio must import/use libraryWorkbenchHandoffHref"
);
assert.match(
  imageStudio,
  /from ["']@\/lib\/workbenchResultFold["']/,
  "Image Studio must import workbenchResultFold"
);
assert.match(
  imageStudio,
  /imageLibraryHref/,
  "Image Studio must compute imageLibraryHref"
);
assert.match(
  imageStudio,
  /href=\{imageLibraryHref\}/,
  "Image residual Library chrome must bind imageLibraryHref"
);
assert.match(
  imageStudio,
  /data-library-handoff=/,
  "Image Library chrome must expose handoff kind marker"
);
assert.match(
  imageStudio,
  /data-image-library-handoff=/,
  "Image Library chrome must expose image-specific handoff marker"
);
assert.match(
  imageStudio,
  /setLastPrivateResult\(\s*Boolean\(data\.demo\) \? false : data\.privateResult === true\s*\)/,
  "Image Studio must capture privateResult from still response (fail-closed)"
);
assert.match(
  imageStudio,
  /setLastPrivateResult\(false\)/,
  "Image Studio history/device path must not invent privateResult"
);
// Fail-closed residual: never hardcode inventing private ?job= outside helper.
assert.doesNotMatch(
  imageStudio,
  /href=["']\/library\?job=/,
  "Image Studio must never hardcode /library?job= (use helper)"
);
// Residual chrome must not leave a bare plain href="/library" CTA.
assert.doesNotMatch(
  imageStudio,
  /href=["']\/library["']/,
  "Image Studio residual Library must not hardcode plain /library"
);
// Live image settle must echo durable UUID + privateResult for owner deep-link.
assert.match(
  imageRoute,
  /privateResult:\s*true/,
  "Image API live success must emit privateResult for durable owner jobs"
);
assert.match(
  imageRoute,
  /reserved\.reservation\.jobId/,
  "Image API live success must use durable reservation jobId as request identity"
);
assert.match(
  imageClient,
  /privateResult\?:/,
  "imageClient ImageSuccess must surface privateResult"
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
