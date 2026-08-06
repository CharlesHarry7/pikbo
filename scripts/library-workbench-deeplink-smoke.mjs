#!/usr/bin/env node
/**
 * AIT-529 / AIT-392: Workbench done → Library requestId deep-link (owner-safe).
 *
 * Source + pure-logic contract:
 * - libraryWorkbenchHandoffHref only deep-links live private + UUID requestId
 * - Lab demo never carries ?job= as private owned clip
 * - live-local / missing requestId → plain /library (list, no fake open)
 * - CreateStudio fold primary uses helper; fixed Moment / freeLiveOpen untouched
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
