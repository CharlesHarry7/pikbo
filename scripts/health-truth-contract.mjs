/**
 * /api/health public-truth contract.
 *
 * Evaluates the exact pure function exported by route.ts without importing the
 * Route Handler or touching network, credentials, Supabase, Vercel, or provider.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import ts from "typescript";

const routePath = join(process.cwd(), "app/api/health/route.ts");
const route = readFileSync(routePath, "utf8");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} must exist in /api/health`);
  const bodyStart = source.indexOf("{", start);
  assert.ok(bodyStart > start, `${name} body must exist`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} body did not close`);
}

const functionSource = extractFunction(route, "evaluateHealthTruth");
const javascript = ts.transpileModule(functionSource, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.None,
  },
}).outputText;
const sandbox = {};
vm.runInNewContext(
  `${javascript}\nthis.evaluateHealthTruth = evaluateHealthTruth;`,
  sandbox
);
const evaluateHealthTruth = sandbox.evaluateHealthTruth;
assert.equal(typeof evaluateHealthTruth, "function");

const keys = [
  "authConfigured",
  "durableAtomicReservationConfigured",
  "providerConfigured",
  "serverOwnedDeliverableConfigured",
];

for (let mask = 0; mask < 16; mask += 1) {
  const input = Object.fromEntries(
    keys.map((key, index) => [key, Boolean(mask & (1 << index))])
  );
  const result = evaluateHealthTruth(input);
  const allReady = keys.every((key) => input[key]);

  assert.equal(
    result.softLive,
    allReady,
    `softLive must be all-four AND for mask ${mask}`
  );
  assert.equal(
    result.mode,
    allReady
      ? "live-generate"
      : input.providerConfigured
        ? "validation"
        : "cached-only"
  );
  assert.deepEqual(
    [...result.missing],
    keys.filter((key) => !input[key])
  );
}

assert.doesNotMatch(route, /import\s+\{\s*generateMode\s*\}/);
assert.match(route, /durableCredits\.backend\s*===\s*"supabase"/);
assert.match(route, /durableCredits\.schemaReady\s*===\s*true/);
assert.match(route, /process\.env\.REQUIRE_DURABLE_CREDITS\s*===\s*"1"/);
assert.match(
  route,
  /process\.env\.PIKBO_R1_ATOMIC_RESERVATION_READY\s*===\s*"1"/
);
assert.match(route, /t6\.tooling\.serverOwnedWorkerReady/);
assert.match(route, /t6\.tooling\.derivativeServingImplemented/);
assert.match(route, /t6\.tooling\.storageAdapterImplemented/);
assert.match(route, /clipsPerPeriod:\s*ready\.softLive\s*\?\s*1\s*:\s*0/);
assert.match(
  route,
  /scope:\s*ready\.softLive\s*\?\s*"video-create-only"\s*:\s*"cached-demo-only"/
);
assert.match(route, /cached Pikbo Lab prototypes only/);
assert.doesNotMatch(route, /cached official media only/i);

console.log("health truth contract: 16/16 prerequisite combinations passed");
