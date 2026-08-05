#!/usr/bin/env node
/**
 * AIT-115: Library guest → login deep-link restore.
 *
 * Source + pure regression (no network). Locks:
 * - guest-without-job static `/login?next=/library`
 * - guest-with-job restores `/library?job=<uuid>` via next=
 * - invalid job ids never enter next (no freeform leak)
 * - next carries only job UUID — never title/media/owner metadata
 * - auth sanitize + magic-link callback embed library?job=
 * - post-login fail-closed not-your-toy surface still present
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const deepLink = await import(
  pathToFileURL(join(root, "lib/libraryLoginDeepLink.ts")).href
);
const redirect = await import(
  pathToFileURL(join(root, "lib/authRedirect.ts")).href
);

const library = read("components/LibraryGrid.tsx");
const helper = read("lib/libraryLoginDeepLink.ts");
const loginPage = read("app/login/page.tsx");
const callback = read("app/auth/callback/page.tsx");
const magicLink = read("app/api/auth/magic-link/route.ts");
const pkg = read("package.json");

const jobId = "22222222-2222-4222-8222-222222222222";
const foreignJobId = "33333333-3333-4333-8333-333333333333";

// ─── Source contracts: Library guest login wiring ──────────────────────────

assert.match(library, /libraryLoginHref/);
assert.match(library, /parseLibraryJobId/);
assert.match(library, /from ["']@\/lib\/libraryLoginDeepLink["']/);
assert.match(library, /data-library-login="guest"/);
// Static guest-without-job contract remains visible for engine-smoke.
assert.match(library, /href=["']\/login\?next=\/library["']/);
assert.match(library, /data-library-state="guest"/);
assert.match(library, /data-library-state="not-your-toy"/);
assert.match(library, /data-library-not-your-toy="true"/);
assert.match(library, /libraryNotYourToyCopy/);
// Guest sign-in must not invent media for foreign/missing deep links.
assert.doesNotMatch(
  library,
  /data-library-state="guest"[\s\S]{0,1200}<video/,
  "guest Library must not render <video>"
);
assert.doesNotMatch(
  library,
  /data-library-state="not-your-toy"[\s\S]{0,1200}<video/,
  "not-your-toy must not render <video>"
);
// Helper must not assign media/owner fields into redirect construction.
assert.doesNotMatch(helper, /videoUrl\s*[:=]|effectName\s*[:=]|created_by\s*[:=]|signedUrl\s*[:=]/);
assert.doesNotMatch(helper, /return `[^`]*\$\{[^}]*(effect|video|title|email)/);
assert.match(pkg, /"library-login-deeplink-regression"/);

// Login page + magic-link + callback honor sanitizeInternalNextPath(next).
assert.match(loginPage, /sanitizeInternalNextPath/);
assert.match(loginPage, /LoginForm[\s\S]{0,40}next=\{next\}/);
assert.match(magicLink, /sanitizeInternalNextPath\(body\.next\)/);
assert.match(magicLink, /authCallbackUrl\([\s\S]{0,80}next\)/);
assert.match(callback, /sanitizeInternalNextPath/);
assert.match(callback, /window\.location\.replace\(next\)/);

// ─── Pure: parse + return path + login href ────────────────────────────────

assert.equal(deepLink.parseLibraryJobId(jobId), jobId);
assert.equal(deepLink.parseLibraryJobId(jobId.toUpperCase()), jobId.toUpperCase());
assert.equal(deepLink.parseLibraryJobId(null), null);
assert.equal(deepLink.parseLibraryJobId(""), null);
assert.equal(deepLink.parseLibraryJobId("not-a-uuid"), null);
assert.equal(deepLink.parseLibraryJobId("../etc/passwd"), null);
assert.equal(deepLink.parseLibraryJobId("https://evil.example/x"), null);
assert.equal(
  deepLink.parseLibraryJobId("00000000-0000-0000-0000-000000000000"),
  null,
  "nil UUID version nibble is not RFC variant 1-5"
);

assert.equal(deepLink.libraryReturnPath(null), "/library");
assert.equal(deepLink.libraryReturnPath("bad"), "/library");
assert.equal(
  deepLink.libraryReturnPath(jobId),
  `/library?job=${encodeURIComponent(jobId)}`
);
assert.equal(deepLink.libraryLoginHref(null), "/login?next=/library");
assert.equal(deepLink.libraryLoginHref(""), "/login?next=/library");
assert.equal(deepLink.libraryLoginHref("not-uuid"), "/login?next=/library");
assert.equal(
  deepLink.libraryLoginHref(jobId),
  `/login?next=${encodeURIComponent(`/library?job=${encodeURIComponent(jobId)}`)}`
);

// next payload is path-only + job UUID — no metadata leak.
const restored = deepLink.libraryReturnPath(jobId);
assert.equal(restored.startsWith("/library"), true);
assert.doesNotMatch(restored, /https?:\/\//i);
assert.doesNotMatch(restored, /video|mp4|signed|effect|title|email|owner/i);
assert.doesNotMatch(restored, new RegExp(foreignJobId));
assert.ok(deepLink.isLibraryReturnPath("/library"));
assert.ok(deepLink.isLibraryReturnPath(restored));
assert.equal(deepLink.isLibraryReturnPath("/library?job=not-uuid"), false);
assert.equal(deepLink.isLibraryReturnPath("/library?job=x&effect=spin"), false);
assert.equal(deepLink.isLibraryReturnPath("/create?mode=moment"), false);
assert.equal(deepLink.isLibraryReturnPath("//evil.example"), false);

// ─── Auth redirect: sanitize + magic-link callback embed ───────────────────

assert.equal(redirect.sanitizeInternalNextPath(restored), restored);
assert.equal(
  redirect.sanitizeInternalNextPath("/library"),
  "/library"
);
assert.equal(
  redirect.sanitizeInternalNextPath("//evil.example/steal"),
  "/profile"
);
assert.equal(
  redirect.authCallbackUrl(
    "https://pikbo.ai",
    "production",
    restored
  ),
  `https://pikbo.ai/auth/callback?next=${encodeURIComponent(restored)}`
);
assert.equal(
  redirect.authCallbackUrl(
    "https://pikbo.ai",
    "production",
    "/library"
  ),
  "https://pikbo.ai/auth/callback?next=%2Flibrary"
);

// Round-trip: guest login href → login next param → sanitized return path.
const guestHref = deepLink.libraryLoginHref(jobId);
const nextParam = new URL(guestHref, "https://pikbo.invalid").searchParams.get(
  "next"
);
assert.equal(redirect.sanitizeInternalNextPath(nextParam), restored);
assert.ok(deepLink.isLibraryReturnPath(nextParam));

console.log("library-login-deeplink-regression: ok");
