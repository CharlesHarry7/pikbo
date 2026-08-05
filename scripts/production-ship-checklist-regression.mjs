/**
 * Offline regression: production ship checklist wiring + softLive honesty hooks.
 * No network, no Vercel, no secrets.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const requiredFiles = [
  "docs/PRODUCTION_SHIP_CHECKLIST.md",
  "scripts/production-ship-checklist.sh",
  "scripts/vercel-budget-gate.sh",
  "scripts/health-truth-contract.mjs",
  "AGENTS.md",
  "package.json",
];

for (const rel of requiredFiles) {
  assert.ok(existsSync(join(root, rel)), `missing ${rel}`);
}

const pkg = JSON.parse(read("package.json"));
assert.equal(
  typeof pkg.scripts["production-ship-checklist"],
  "string",
  "package.json must expose production-ship-checklist"
);
assert.equal(
  typeof pkg.scripts["vercel-budget"],
  "string",
  "package.json must expose vercel-budget"
);
assert.equal(
  typeof pkg.scripts["health-truth-contract"],
  "string",
  "package.json must expose health-truth-contract"
);
assert.match(
  pkg.scripts["production-ship-checklist"],
  /production-ship-checklist\.sh/
);
assert.match(pkg.scripts["vercel-budget"], /vercel-budget-gate\.sh/);

const agents = read("AGENTS.md");
assert.match(agents, /vercel-budget/i, "AGENTS.md must require vercel-budget");
assert.match(
  agents,
  /production-ship-checklist|PRODUCTION_SHIP_CHECKLIST/,
  "AGENTS.md must point at the production ship checklist"
);
assert.match(
  agents,
  /one (git )?push|batch commits/i,
  "AGENTS.md must require batching git pushes"
);

const checklistDoc = read("docs/PRODUCTION_SHIP_CHECKLIST.md");
assert.match(checklistDoc, /softLive/);
assert.match(checklistDoc, /vercel-budget/);
assert.match(checklistDoc, /serverOwnedDeliverableConfigured|all five|five gate/i);
assert.match(checklistDoc, /no fake UGC|fake UGC/i);
assert.doesNotMatch(
  checklistDoc,
  /force production deploy without budget/i
);

const shipSh = read("scripts/production-ship-checklist.sh");
assert.match(shipSh, /vercel-budget-gate\.sh/);
assert.match(shipSh, /health-truth-contract\.mjs/);
assert.match(shipSh, /ready\.softLive|softLive/);
assert.match(shipSh, /billing\.freeTrial\.available/);
assert.doesNotMatch(shipSh, /\bvercel\s+deploy\b/);
assert.doesNotMatch(shipSh, /\bvercel\s+--prod\b/);

const gateSh = read("scripts/vercel-budget-gate.sh");
assert.match(gateSh, /vercel-deploy-count\.day/);
assert.match(gateSh, /VERCEL_DAILY_MAX|max=/);
assert.match(gateSh, /BLOCKED/);

// Health route still binds freeTrial to softLive (public truth).
const health = read("app/api/health/route.ts");
assert.match(health, /clipsPerPeriod:\s*ready\.softLive\s*\?\s*1\s*:\s*0/);
assert.match(
  health,
  /scope:\s*ready\.softLive\s*\?\s*"video-create-only"\s*:\s*"cached-demo-only"/
);
assert.match(health, /available:\s*ready\.softLive/);
assert.match(health, /probeSoftLiveReadiness/);

// Soft-live checklist script stays informational; five required gates.
const softlive = read("scripts/softlive-checklist.sh");
assert.match(
  softlive,
  /all five live requirements|five live|five required/i,
  "softlive-checklist must say five live requirements (not stale four)"
);

console.log("production-ship-checklist regression: PASS");
