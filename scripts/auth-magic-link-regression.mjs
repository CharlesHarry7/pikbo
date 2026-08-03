import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const redirect = await import(
  pathToFileURL(join(root, "lib/authRedirect.ts")).href
);
const callback = await import(
  pathToFileURL(join(root, "lib/authCallback.ts")).href
);

const preview =
  "https://pikbo-git-codex-private-input-pack-binding-pi-kbo.vercel.app";
const privateValidationPreview =
  "https://pikbo-git-codex-private-validation-pi-kbo.vercel.app";
const legacyPreview =
  "https://pikbo-git-agent-gptp0-live-owned-toy-review-pi-kbo.vercel.app";
const maliciousPreview =
  "https://pikbo-git-untrusted-branch-pi-kbo.vercel.app";
const production = "https://pikbo.ai";

function request(url, origin, extraHeaders = {}) {
  return new Request(url, {
    method: "POST",
    headers: origin ? { ...extraHeaders, origin } : extraHeaders,
  });
}

assert.equal(
  redirect.resolveTrustedAuthOrigin(
    request(
      `${privateValidationPreview}/api/auth/magic-link`,
      privateValidationPreview
    ),
    "production"
  ),
  privateValidationPreview
);
assert.equal(
  redirect.resolveTrustedAuthOrigin(
    request(`${preview}/api/auth/magic-link`, preview),
    "production"
  ),
  preview
);
assert.equal(
  redirect.resolveTrustedAuthOrigin(
    request(`${legacyPreview}/api/auth/magic-link`, legacyPreview),
    "production"
  ),
  legacyPreview
);
assert.equal(
  redirect.resolveTrustedAuthOrigin(
    request(`${production}/api/auth/magic-link`, production),
    "production"
  ),
  production
);
assert.equal(
  redirect.authCallbackUrl(privateValidationPreview),
  `${privateValidationPreview}/auth/callback`
);
assert.equal(
  redirect.authCallbackUrl(preview),
  `${preview}/auth/callback`
);
assert.equal(
  redirect.authCallbackUrl(legacyPreview),
  `${legacyPreview}/auth/callback`
);
assert.equal(
  redirect.authCallbackUrl(production),
  `${production}/auth/callback`
);
assert.equal(
  redirect.authCallbackUrl(production, "production", "/create?mode=seller-pack"),
  `${production}/auth/callback?next=%2Fcreate%3Fmode%3Dseller-pack`
);
const momentNext = "/create?mode=moment&effect=street-power-up";
assert.equal(redirect.sanitizeInternalNextPath(momentNext), momentNext);
assert.equal(
  redirect.authCallbackUrl(privateValidationPreview, "production", momentNext),
  `${privateValidationPreview}/auth/callback?next=%2Fcreate%3Fmode%3Dmoment%26effect%3Dstreet-power-up`
);
assert.equal(
  redirect.sanitizeInternalNextPath("//evil.example/steal"),
  "/profile"
);
assert.equal(
  redirect.sanitizeInternalNextPath("/create?mode=seller-pack"),
  "/create?mode=seller-pack"
);
assert.equal(
  redirect.resolveTrustedAuthOrigin(
    request(`${preview}/api/auth/magic-link`, "https://evil.example"),
    "production"
  ),
  null,
  "an invalid explicit Origin must not fall back to a valid request URL"
);
assert.equal(
  redirect.resolveTrustedAuthOrigin(
    request(`${maliciousPreview}/api/auth/magic-link`, maliciousPreview),
    "production"
  ),
  null
);
for (const hostileOrigin of [
  privateValidationPreview.replace("https://", "http://"),
  `${privateValidationPreview}:444`,
  privateValidationPreview.replace("https://", "https://user@"),
  `${privateValidationPreview}.evil.example`,
  `${privateValidationPreview}, https://evil.example`,
]) {
  assert.equal(
    redirect.resolveTrustedAuthOrigin(
      request(`${privateValidationPreview}/api/auth/magic-link`, hostileOrigin),
      "production"
    ),
    null,
    `hostile Origin must fail closed: ${hostileOrigin}`
  );
}
assert.equal(
  redirect.resolveTrustedAuthOrigin(
    request(
      `${maliciousPreview}/api/auth/magic-link`,
      undefined,
      {
        host: new URL(privateValidationPreview).host,
        "x-forwarded-host": new URL(privateValidationPreview).host,
        "x-forwarded-proto": "https",
      }
    ),
    "production"
  ),
  null,
  "Host and forwarded headers must not turn an untrusted request URL into a trusted origin"
);
assert.equal(
  redirect.resolveTrustedAuthOrigin(
    request(
      `${privateValidationPreview}/api/auth/magic-link`,
      "HTTPS://PIKBO-GIT-CODEX-PRIVATE-VALIDATION-PI-KBO.VERCEL.APP:443"
    ),
    "production"
  ),
  privateValidationPreview,
  "URL canonicalization may accept the exact HTTPS origin with case/default-port differences"
);
assert.equal(
  redirect.resolveTrustedAuthOrigin(
    request("http://localhost:3000/api/auth/magic-link"),
    "development"
  ),
  "http://localhost:3000"
);
assert.equal(
  redirect.authCallbackUrl("http://localhost:3000", "development"),
  "http://localhost:3000/auth/callback"
);
assert.equal(
  redirect.resolveTrustedAuthOrigin(
    request("http://localhost:3000/api/auth/magic-link"),
    "production"
  ),
  null
);

const expired = callback.parseAuthCallbackUrl(
  `${preview}/auth/callback?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`
);
assert.equal(expired.kind, "error");
assert.match(expired.detail, /expired|already used/i);

let exchangeCalls = 0;
const success = await callback.completeAuthCallback(
  {
    async exchangeCodeForSession(code) {
      exchangeCalls += 1;
      assert.equal(code, "valid-code");
      return { error: null };
    },
    async getSession() {
      return {
        data: { session: { access_token: "access-token" } },
        error: null,
      };
    },
  },
  callback.parseAuthCallbackUrl(
    `${preview}/auth/callback?code=valid-code`
  )
);
assert.equal(exchangeCalls, 1);
assert.deepEqual(success, { ok: true, accessToken: "access-token" });

const missing = await callback.completeAuthCallback(
  {
    async exchangeCodeForSession() {
      throw new Error("must not exchange without code");
    },
    async getSession() {
      return { data: { session: null }, error: null };
    },
  },
  callback.parseAuthCallbackUrl(`${preview}/auth/callback`)
);
assert.equal(missing.ok, false);
assert.equal(missing.reason, "missing_session");
assert.match(missing.detail, /No valid sign-in code or session/i);

const noSessionAfterExchange = await callback.completeAuthCallback(
  {
    async exchangeCodeForSession() {
      return { error: null };
    },
    async getSession() {
      return { data: { session: null }, error: null };
    },
  },
  callback.parseAuthCallbackUrl(`${preview}/auth/callback?code=unused`)
);
assert.equal(noSessionAfterExchange.ok, false);
assert.equal(noSessionAfterExchange.reason, "missing_session");

const routeSource = readFileSync(
  join(root, "app/api/auth/magic-link/route.ts"),
  "utf8"
);
const callbackSource = readFileSync(
  join(root, "app/auth/callback/page.tsx"),
  "utf8"
);
const loginSource = readFileSync(
  join(root, "components/LoginForm.tsx"),
  "utf8"
);

assert.match(routeSource, /resolveTrustedAuthOrigin/);
assert.match(routeSource, /UNTRUSTED_ORIGIN/);
assert.doesNotMatch(
  routeSource,
  /NEXT_PUBLIC_SITE_URL|SITE_URL|VERCEL_URL/,
  "magic-link callback must not be chosen from env-first site URLs"
);
assert.match(callbackSource, /parseAuthCallbackUrl/);
assert.match(callbackSource, /completeAuthCallback/);
assert.match(callbackSource, /Request a new magic link/);
assert.match(callbackSource, /window\.location\.replace\(next\)/);
assert.match(routeSource, /sanitizeInternalNextPath/);
assert.match(loginSource, /JSON\.stringify\(\{ email: email\.trim\(\), next \}\)/);
assert.match(loginSource, /Check your inbox for a Pikbo sign-in link/);

console.log(
  "auth-magic-link-regression: PASS (trusted same-origin callback · invalid origin fail-closed · provider errors · missing-session honesty · successful exchange)"
);
