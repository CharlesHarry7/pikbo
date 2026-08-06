#!/usr/bin/env node
/**
 * Provider seam regression.
 *
 * Guards the boundary that lets the video provider be swapped (fal → kie.ai)
 * or mocked without touching reservation, settlement, or privacy logic:
 *
 *   1. app/api/generate/route.ts must not import or call a provider SDK.
 *   2. The route reaches the provider only through lib/providers.
 *   3. Provider calls stay wrapped by invokeReservedProvider (budget guard).
 *   4. The mock provider is fail-closed: flag AND non-production.
 *   5. Health/access reports real credential truth, not the mock's.
 *
 * Offline and dependency-free, like the other gate scripts.
 */

import { readFileSync } from "node:fs";

const failures = [];
const checks = [];

function read(path) {
  try {
    return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  } catch (error) {
    failures.push(`cannot read ${path}: ${error.message}`);
    return "";
  }
}

function expect(label, condition, detail) {
  if (condition) checks.push(label);
  else failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
}

const route = read("app/api/generate/route.ts");
const factory = read("lib/providers/index.ts");
const mock = read("lib/providers/mockVideoProvider.ts");
const seam = read("lib/providers/videoProvider.ts");

// 1) No provider SDK inside the route.
expect(
  "route: no provider SDK import",
  !/from\s+["']@fal-ai\/client["']/.test(route),
  "app/api/generate/route.ts imports @fal-ai/client directly"
);
expect(
  "route: no direct fal.* calls",
  !/\bfal\.(config|subscribe|storage|run|queue)\b/.test(route),
  "found a direct fal.* call in the generate route"
);

// 2) Provider reached only through the seam.
expect(
  "route: uses getVideoProvider from lib/providers",
  /getVideoProvider\s*\(/.test(route) &&
    /from\s+["']@\/lib\/providers["']/.test(route),
  "route does not obtain its provider from lib/providers"
);
expect(
  "route: uses provider.uploadImage + provider.runJob",
  /provider\.uploadImage\s*\(/.test(route) &&
    /provider\.runJob\s*\(/.test(route),
  "route does not call the seam's uploadImage/runJob"
);

// 3) Budget guard still wraps both provider calls.
for (const method of ["uploadImage", "runJob"]) {
  const wrapped = new RegExp(
    `invokeReservedProvider\\([\\s\\S]{0,240}provider\\.${method}\\s*\\(`
  ).test(route);
  expect(
    `route: provider.${method} wrapped by invokeReservedProvider`,
    wrapped,
    `provider.${method} is not inside invokeReservedProvider`
  );
}

// 4) Mock is fail-closed.
expect(
  "mock: requires PIKBO_PROVIDER_MOCK_SUCCESS=1",
  /PIKBO_PROVIDER_MOCK_SUCCESS\s*!==\s*["']1["']/.test(mock),
  "mock does not require the explicit opt-in flag"
);
expect(
  "mock: refuses production runtime",
  /VERCEL_ENV\s*===\s*["']production["']/.test(mock) &&
    /NODE_ENV\s*===\s*["']production["']/.test(mock),
  "mock does not block production (VERCEL_ENV / NODE_ENV)"
);
expect(
  "factory: mock selected only via isMockProviderEnabled",
  /if\s*\(\s*isMockProviderEnabled\s*\(\s*\)\s*\)\s*return\s+new\s+MockVideoProvider/.test(
    factory
  ),
  "factory does not gate the mock behind isMockProviderEnabled()"
);

// 5) Credential truth is independent of the mock.
expect(
  "route: providerConfigured uses isRealProviderConfigured",
  /providerConfigured:\s*isRealProviderConfigured\(\)/.test(route),
  "access gate does not report real provider credential truth"
);
expect(
  "factory: isRealProviderConfigured checks the real provider",
  /isRealProviderConfigured[\s\S]{0,160}FalVideoProvider/.test(factory),
  "isRealProviderConfigured does not consult the real provider"
);

// Seam hygiene: the interface itself must not carry credit/storage concerns.
// Strip block comments first — the header legitimately *describes* the boundary.
const seamCode = seam.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
expect(
  "seam: no credit/storage concerns in the interface declarations",
  !/reservation|settleCredits|refund|supabase|storage\.from/i.test(seamCode),
  "provider interface leaks reservation/settlement/storage concerns"
);

if (failures.length) {
  console.error("provider-seam-regression: FAIL");
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}

console.log(
  `provider-seam-regression: PASS (${checks.length} checks · no SDK in route · seam-only access · budget guard intact · mock fail-closed · real credential truth)`
);
