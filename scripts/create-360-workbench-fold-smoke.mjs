#!/usr/bin/env node
/**
 * AIT-153: Create 360 workbench — upload + Generate above fold after home handoff.
 *
 * Source contract only (no browser):
 * - generate-workbench page header is compact (`data-create-header="workbench-compact"`)
 * - page + studio mark above-fold upload/generate path
 * - CreateStudio collapses task rail, exposes sticky Generate primary
 * - Lab honesty preserved (no fake UGC claims)
 *
 * Run: node scripts/create-360-workbench-fold-smoke.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const createPage = read("app/create/page.tsx");
const studio = read("components/CreateStudio.tsx");
const contractLib = read("lib/createRouteContract.ts");
const jobIntents = read("lib/jobIntents.ts");

// ── Page: workbench shell stays honest + compact ──────────────────────────
assert.match(
  createPage,
  /data-create-contract=["']generate-workbench["']/,
  "workbench contract marker required"
);
assert.match(
  createPage,
  /data-generate-360=\{is360 \? ["']true["'] : ["']false["']\}/,
  "360 deep-link marker required"
);
assert.match(
  createPage,
  /data-create-header=["']workbench-compact["']/,
  "workbench header must be compact for above-fold upload"
);
assert.match(
  createPage,
  /data-workbench-above-fold=["']upload-generate["']/,
  "page must declare upload+generate above-fold intent"
);
assert.match(
  createPage,
  /One photo → 360° listing spin/,
  "360 workbench H1 stays short/result-first"
);
assert.match(
  createPage,
  /text-\[1\.45rem\]/,
  "mobile workbench H1 uses compact type scale"
);

// Workbench CreateStudio still honest (no fixed Moment)
const workbenchStudio = createPage.match(
  /data-create-contract=["']generate-workbench["'][\s\S]*?<CreateStudio([\s\S]*?)\/>/
)?.[1];
assert.ok(workbenchStudio, "workbench CreateStudio mount required");
assert.doesNotMatch(
  workbenchStudio,
  /fixedMomentContract/,
  "workbench must not force fixed Moment"
);

// ── Studio: fold path + collapsed task rail ───────────────────────────────
assert.match(
  studio,
  /data-workbench-fold=\{workbenchDeepLink \? ["']upload-generate["'] : undefined\}/,
  "studio root marks upload-generate fold path"
);
assert.match(
  studio,
  /data-studio-contract=\{fixedMomentContract \? ["']fixed-moment["'] : ["']generate-workbench["']\}/,
  "studio contract mirrors create route"
);
assert.match(
  studio,
  /data-workbench-recipe=["']locked["']/,
  "deep-link recipe is locked (task grid collapsed)"
);
assert.match(
  studio,
  /data-workbench-change-task/,
  "Change control re-opens selling-task picker"
);
assert.match(
  studio,
  /showTaskPicker/,
  "task picker state gates JobIntentBar on workbench"
);
assert.match(
  studio,
  /data-workbench-controls=\{workbenchDeepLink \? ["']above-fold["'] : undefined\}/,
  "controls column marked for above-fold spacing"
);
assert.match(
  studio,
  /data-upload-zone=\{workbenchDeepLink \? ["']workbench["'] : ["']default["']\}/,
  "owned-photo upload zone marked on workbench"
);
assert.match(
  studio,
  /data-create-sticky=["']mobile["']/,
  "mobile sticky Generate bar remains"
);
assert.match(
  studio,
  /data-sticky-workbench=\{workbenchDeepLink \? ["']true["'] : undefined\}/,
  "sticky bar marked for workbench"
);
assert.match(
  studio,
  /data-sticky-360=\{isGenerate360 \? ["']true["'] : undefined\}/,
  "sticky bar marked for 360"
);
assert.match(
  studio,
  /data-sticky-primary=\{\s*isGenerate360\s*\?\s*["']360-generate["']/,
  "sticky primary generate action tagged for 360"
);
assert.match(
  studio,
  /data-sticky-primary=\{\s*isGenerate360 \? ["']360-upload["']/,
  "sticky upload action tagged for 360 private path"
);
assert.match(
  studio,
  /data-first-run-lab=["']samples["']/,
  "Lab samples stay available (honesty)"
);
assert.match(
  studio,
  /cached prototype|not a customer upload|not your photo/i,
  "Lab sample honesty copy retained"
);
assert.doesNotMatch(
  studio,
  /community made this|user generated|real customer result/i,
  "no fake UGC claims on workbench fold path"
);

// ── Contract + Generate door still 360 ────────────────────────────────────
assert.match(
  contractLib,
  /generate-workbench/,
  "route contract still resolves generate-workbench"
);
assert.match(
  jobIntents,
  /360-spin-showcase/,
  "Generate door still targets 360-spin-showcase"
);
assert.match(
  jobIntents,
  /export function createGenerate360Href/,
  "createGenerate360Href remains the home handoff"
);

console.log("create-360-workbench-fold-smoke: ok");
