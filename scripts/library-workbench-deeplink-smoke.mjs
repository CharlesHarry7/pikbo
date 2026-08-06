#!/usr/bin/env node
/**
 * AIT-392: Workbench done → Library requestId deep-link (owner-safe exact clip).
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
  "LibraryGrid must match deep-link via shared helper"
);
assert.match(
  libraryGrid,
  /parseDeepLinkJobId/,
  "LibraryGrid keeps UUID parseDeepLinkJobId fail-closed gate"
);
assert.match(
  libraryGrid,
  /data-library-state="not-your-toy"/,
  "missing/foreign deep-link stays not-your-toy"
);
assert.match(
  libraryGrid,
  /libraryNotYourToyCopy/,
  "not-your-toy uses honest fail-closed copy"
);
// Demo rows never enter owner Library list.
assert.match(
  libraryGrid,
  /if \(job\.demo\) return false/,
  "Library list still drops demo rows"
);

assert.match(pkg, /"library-workbench-deeplink-smoke"/);

// ── Runtime pure helpers via strip-types ───────────────────────────────────
const runtimeProbe = `
import {
  libraryWorkbenchHandoffHref,
  libraryJobMatchesDeepLink,
  resolveWorkbenchResultPrimary,
} from ${JSON.stringify(pathToFileURL(join(root, "lib/workbenchResultFold.ts")).href)};
import assert from "node:assert/strict";

const ownerId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const foreignId = "ffffffff-1111-4222-8333-444444444444";

// Private owned + UUID → exact clip deep-link
assert.equal(
  libraryWorkbenchHandoffHref({
    demo: false,
    privateResult: true,
    requestId: ownerId,
  }),
  "/library?job=" + encodeURIComponent(ownerId)
);

// Lab demo never deep-links even if privateResult/requestId are polluted
assert.equal(
  libraryWorkbenchHandoffHref({
    demo: true,
    privateResult: true,
    requestId: ownerId,
  }),
  "/library"
);

// live-local (no private object) → list only
assert.equal(
  libraryWorkbenchHandoffHref({
    demo: false,
    privateResult: false,
    requestId: ownerId,
  }),
  "/library"
);

// private but missing/invalid requestId → list, no fake open
assert.equal(
  libraryWorkbenchHandoffHref({
    demo: false,
    privateResult: true,
    requestId: null,
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
    requestId: "  ",
  }),
  "/library"
);

// Library match: id or requestId mirror
assert.equal(
  libraryJobMatchesDeepLink({ id: ownerId, requestId: ownerId }, ownerId),
  true
);
assert.equal(
  libraryJobMatchesDeepLink(
    { id: "local-1", requestId: ownerId },
    ownerId
  ),
  true
);
assert.equal(
  libraryJobMatchesDeepLink(
    { id: ownerId, requestId: ownerId },
    foreignId
  ),
  false
);
assert.equal(
  libraryJobMatchesDeepLink({ id: ownerId }, foreignId),
  false
);

// Lab primary stays non-library when demo
const labPrimary = resolveWorkbenchResultPrimary({
  demo: true,
  privateResult: false,
  playable: true,
});
assert.equal(labPrimary.kind, "replay");
assert.notEqual(labPrimary.kind, "library");

const privatePrimary = resolveWorkbenchResultPrimary({
  demo: false,
  privateResult: true,
  playable: true,
});
assert.equal(privatePrimary.kind, "library");
assert.equal(privatePrimary.provenanceKind, "live-private");

console.log("library-workbench-deeplink-runtime: ok");
`;

const runtime = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "-e", runtimeProbe],
  { cwd: root, encoding: "utf8" }
);
if (runtime.status !== 0) {
  console.error(runtime.stdout || "");
  console.error(runtime.stderr || "");
  process.exit(runtime.status || 1);
}
assert.match(runtime.stdout || "", /library-workbench-deeplink-runtime: ok/);

console.log("library-workbench-deeplink-smoke: ok");
