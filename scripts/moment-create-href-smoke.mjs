#!/usr/bin/env node
/**
 * Moment CTA → MOMENT_CREATE_HREF smoke (source-only).
 *
 * Residual "Create one Moment" / "Preview one toy Moment" doors must enter
 * the fixed Moment contract (mode=moment&effect=street-power-up) via the
 * shared helper. Bare `/create?effect=street-power-up` without mode=moment
 * is forbidden on product surfaces.
 *
 * Intentional allowlist: create page defaults, API routes, presets data,
 * generate route contract checks, and this smoke itself.
 *
 * Run: node scripts/moment-create-href-smoke.mjs
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const softLaunch = read("lib/softLaunch.ts");

// 1. Canonical helper
assert.match(
  softLaunch,
  /export const MOMENT_CREATE_HREF\s*=\s*["']\/create\?mode=moment&effect=street-power-up["']/,
  "MOMENT_CREATE_HREF must be /create?mode=moment&effect=street-power-up"
);

// 2. Key Moment surfaces import / use the helper
const momentSurfaces = [
  ["components/HomeCinemaHero.tsx", null],
  ["components/HomeToolShelf.tsx", "home-tool-shelf"],
  ["components/MobileGenerateBar.tsx", "mobile-bar"],
  ["components/ModulesSuiteCtas.tsx", "modules-suite"],
  ["components/SuiteEntryStrip.tsx", "suite-entry"],
  ["components/SuiteDoorLinks.tsx", "suite-doors"],
  ["components/GenerateFailPanel.tsx", "fail-panel"],
  ["components/OnboardingBanner.tsx", "onboarding"],
  ["components/HfProductRail.tsx", "hf-product-rail"],
  ["components/HfExploreHome.tsx", "hf-explore"],
  ["components/PricingPlanCards.tsx", "pricing-preview"],
  ["components/PricingHeroCopy.tsx", "pricing-hero"],
  ["components/PricingCheckoutButton.tsx", "pricing-founding"],
  ["components/PrivateSellerPackGate.tsx", "seller-pack-gate"],
  ["components/ProfilePanel.tsx", "profile-panel"],
  ["components/ModulesMobileCta.tsx", "modules-mobile"],
  ["components/HighIntentProductTruth.tsx", "high-intent"],
  ["components/SeedanceCampaign.tsx", "seedance-campaign"],
  ["components/HeroUpload.tsx", null],
  ["lib/libraryEmpty.ts", null],
  ["lib/deliveryPack.ts", "delivery-pack"],
  ["app/explore/page.tsx", "explore"],
  ["app/community/page.tsx", "community"],
  ["app/modules/page.tsx", "modules"],
  ["app/flow/page.tsx", "flow"],
  ["app/status/page.tsx", "status"],
  ["app/models/page.tsx", "models"],
  ["app/settings/page.tsx", "settings"],
  ["app/apps/page.tsx", "apps"],
  ["app/tools/page.tsx", "tools"],
  ["app/tools/[slug]/page.tsx", "tool-page"],
  ["app/effects/page.tsx", "effects"],
  ["app/effects/[slug]/page.tsx", "effects-detail"],
  ["app/guides/page.tsx", "guides"],
  ["app/guides/[slug]/page.tsx", "guide"],
  ["app/profile/page.tsx", "profile"],
  ["app/projects/[slug]/page.tsx", "projects"],
  ["app/supercomputer/page.tsx", "supercomputer"],
  ["app/image/page.tsx", "image-page"],
  ["app/pricing/page.tsx", "pricing-preview"],
  ["app/login/page.tsx", "login-guest"],
];

for (const [file, source] of momentSurfaces) {
  const src = read(file);
  assert.match(
    src,
    /MOMENT_CREATE_HREF/,
    `${file} must use MOMENT_CREATE_HREF`
  );
  assert.doesNotMatch(
    src,
    /["'`]\/create\?effect=street-power-up/,
    `${file} must not hardcode bare /create?effect=street-power-up`
  );
  if (source) {
    assert.match(
      src,
      new RegExp(
        `MOMENT_CREATE_HREF[^\\n]{0,80}source=${source.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}`
      ),
      `${file} must tag source=${source}`
    );
  }
}

// 3. No residual bare Moment create hrefs in app/components/lib
//    (allow create page, API, presets, generate route contract, softLaunch helper definition)
const ALLOW_BARE = new Set([
  "lib/softLaunch.ts", // defines the helper
  "app/create/page.tsx", // page defaults / metadata
  "app/api/generate/route.ts", // server contract effect check
  "app/api/checkout/route.ts", // already has mode=moment in return URL
  "lib/presets.ts", // effect slug catalog
  "lib/workflows.ts", // workflow effect ids
  "lib/jobIntents.ts", // intent catalog effect field
  "scripts/moment-create-href-smoke.mjs",
]);

const residual = [];
for (const dir of ["app", "components", "lib"]) {
  const stack = [join(root, dir)];
  while (stack.length) {
    const d = stack.pop();
    for (const name of readdirSync(d)) {
      if (name === "node_modules" || name === ".next") continue;
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) stack.push(p);
      else if (/\.(tsx|ts)$/.test(name)) {
        const rel = p.slice(root.length + 1);
        if (ALLOW_BARE.has(rel)) continue;
        const body = readFileSync(p, "utf8");
        // Bare product href: /create?effect=street-power-up without mode=moment
        // Match string/template literals that open with that path.
        const re =
          /["'`]\/create\?effect=street-power-up(?:&[^"'`]*)?["'`]/g;
        let m;
        while ((m = re.exec(body))) {
          // Skip comments on the same line
          const lineStart = body.lastIndexOf("\n", m.index) + 1;
          const line = body.slice(lineStart, m.index);
          if (/^\s*\/\//.test(line) || line.includes("*")) continue;
          residual.push(`${rel}: ${m[0]}`);
        }
      }
    }
  }
}

assert.equal(
  residual.length,
  0,
  `residual bare /create?effect=street-power-up (missing mode=moment):\n${residual.join("\n")}`
);

// 4. Helper shape sanity
assert.equal(
  "/create?mode=moment&effect=street-power-up",
  softLaunch.match(
    /export const MOMENT_CREATE_HREF\s*=\s*["']([^"']+)["']/
  )?.[1]
);

console.log("moment-create-href-smoke: ok");
