/**
 * Profile account UX regression — page stays a server component; ProfilePanel
 * default-visible home is plain language; engineering probes stay in
 * default-collapsed Account diagnostics.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pageSrc = readFileSync(join(root, "app/profile/page.tsx"), "utf8");
const panelSrc = readFileSync(
  join(root, "components/ProfilePanel.tsx"),
  "utf8"
);

// --- page.tsx: server component only, static chrome + 3 CTAs ---
assert.match(pageSrc, /export const metadata:\s*Metadata/);
assert.match(pageSrc, /PRIVATE_ROBOTS/);
assert.match(pageSrc, /publicAuthStatus/);
assert.match(pageSrc, /robots:\s*PRIVATE_ROBOTS/);
assert.doesNotMatch(pageSrc, /["']use client["']/);
assert.doesNotMatch(pageSrc, /useEffect|useState/);
assert.doesNotMatch(pageSrc, /getSupabaseBrowser/);
assert.doesNotMatch(pageSrc, /fetchMe/);
assert.doesNotMatch(pageSrc, /\/api\/auth\/claim/);
assert.doesNotMatch(pageSrc, /signOut|Signing out/);
assert.match(pageSrc, /Create a video/);
assert.match(pageSrc, /Open Library/);
assert.match(pageSrc, /View plans/);
assert.match(pageSrc, /data-profile-page-path=["']product-first["']/);
assert.match(pageSrc, /data-profile-page-generate=["']remix["']/);
assert.match(pageSrc, /data-profile-primary-ctas=["']create-library-plans["']/);
// 390-wide CTAs: full-width grid, not free-wrapping chips that overflow
assert.match(
  pageSrc,
  /grid w-full grid-cols-1[\s\S]*Create a video[\s\S]*Open Library[\s\S]*View plans/
);
assert.match(
  pageSrc,
  /className="[^"]*w-full[^"]*"[\s\S]*Create a video|Create a video[\s\S]*w-full/
);
assert.match(pageSrc, /ProfilePanel/);
assert.match(pageSrc, /signed-in durable|durable wallet/);

// Do not render engineering auth.message; plain configured branch only
assert.doesNotMatch(pageSrc, /\{auth\.message\}/);
assert.match(pageSrc, /auth\.configured/);
assert.match(pageSrc, /Sign-in is available\./);
assert.match(pageSrc, /Sign-in is not available yet\./);
assert.match(pageSrc, /Sign-in status/);
assert.doesNotMatch(pageSrc, /Supabase/);
assert.doesNotMatch(pageSrc, /durable credits/);
assert.doesNotMatch(pageSrc, /guest cookie/i);

// --- ProfilePanel: split default-visible vs diagnostics ---
const homeMarker = 'data-profile-account-home="user-facing"';
const homeIdx = panelSrc.indexOf(homeMarker);
assert.ok(homeIdx > 0, "ProfilePanel must mark user-facing home");

const diagnosticsMarker = "Account diagnostics";
const diagnosticsIdx = panelSrc.indexOf(diagnosticsMarker);
assert.ok(diagnosticsIdx > homeIdx, "diagnostics after user-facing home");

// Default-visible slice: from account-home start until diagnostics summary text
const defaultVisible = panelSrc.slice(homeIdx, diagnosticsIdx);
const diagnosticsAndBelow = panelSrc.slice(diagnosticsIdx);

assert.match(defaultVisible, /Email/);
assert.match(defaultVisible, /Free plan/);
assert.match(defaultVisible, /Account credits/);
assert.match(defaultVisible, /Device credits/);
assert.match(
  defaultVisible,
  /auth\.signedIn \? ["']Account credits["'] : ["']Device credits["']/
);
assert.match(defaultVisible, /One-time trial status/);
assert.match(defaultVisible, /\bAvailable\b/);
assert.match(defaultVisible, /\bUsed\b/);
assert.match(defaultVisible, /separate from your account credits/i);
assert.match(defaultVisible, /Sign out/);
assert.match(defaultVisible, /data-profile-sign-out/);

// Page already owns Create / Open Library — no duplicate in default home
assert.doesNotMatch(defaultVisible, /Create a video/);
assert.doesNotMatch(defaultVisible, /Open Library/);
assert.doesNotMatch(defaultVisible, /data-profile-path/);

// No engineering jargon or live-quota marketing on default-visible surface
const forbiddenVisible = [
  /\bR0\b/,
  /T5 SQL/,
  /cookie authority|not live-spend authority|live-spend authority/i,
  /Postgres/i,
  /durable wallet/i,
  /atomic reserve/i,
  /process-memory/i,
  /live clip left|live clips left/i,
  /about \d+ live/i,
  /~\{clipsLeft/,
  /live clip[s]? left this period/i,
];
for (const pattern of forbiddenVisible) {
  assert.doesNotMatch(
    defaultVisible,
    pattern,
    `default-visible must not include ${pattern}`
  );
}

// Diagnostics default collapsed + holds technical probes + product-first residual
assert.match(
  panelSrc,
  /data-profile-account-diagnostics=["']collapsed-default["']/
);
assert.match(panelSrc, /<details[\s\S]*Account diagnostics/);
assert.doesNotMatch(
  panelSrc,
  /<details[^>]*\bopen\b/,
  "Account diagnostics must not force open"
);
assert.match(diagnosticsAndBelow, /not live-spend authority|\bR0\b/);
assert.match(
  diagnosticsAndBelow,
  /T5 SQL|durable wallet|atomic reserve|process-memory/
);
assert.match(diagnosticsAndBelow, /data-profile-jobs=["']video["']/);
assert.match(diagnosticsAndBelow, /data-profile-jobs=["']image["']/);
assert.match(
  diagnosticsAndBelow,
  /live clips left|Free Mini trial used|clipsLeft/
);
assert.match(diagnosticsAndBelow, /data-profile-path=["']product-first["']/);
assert.match(diagnosticsAndBelow, /Create a video/);
assert.match(diagnosticsAndBelow, /Open Library/);

// Existing product-first / auth residual contracts still present in panel
assert.match(panelSrc, /\/api\/auth\/claim/);
assert.match(panelSrc, /signOut|Sign out/);
assert.match(panelSrc, /data-profile-path=["']product-first["']/);
assert.match(panelSrc, /data-profile-suite=["']product-first["']/);
assert.match(panelSrc, /Flow · Preview/);
assert.match(panelSrc, /mode=seller-pack/);
assert.match(
  panelSrc,
  /PROFILE_GENERATE_HREF|data-profile-generate=["']remix["']/
);
assert.ok(
  panelSrc.indexOf("mode=seller-pack") < panelSrc.indexOf('href="/flow"'),
  "Profile: Seller Pack before Flow"
);

// 390-wide CTA residual: primary CTAs use w-full / grid
assert.match(
  panelSrc,
  /grid w-full|w-full[\s\S]*Create a video|btn-primary w-full/
);

console.log("profile-account-ux-regression: PASS");
