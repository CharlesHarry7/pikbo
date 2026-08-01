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
const returnPath = await import(
  pathToFileURL(join(root, "lib/authReturnPath.ts")).href
);

const preview =
  "https://pikbo-git-agent-gptp0-live-owned-toy-review-pi-kbo.vercel.app";
const production = "https://pikbo.ai";

function request(url, origin) {
  return new Request(url, {
    method: "POST",
    headers: origin ? { origin } : undefined,
  });
}

assert.equal(
  redirect.resolveTrustedAuthOrigin(
    request(`${preview}/api/auth/magic-link`, preview),
    "production"
  ),
  preview
);
assert.equal(
  redirect.resolveTrustedAuthOrigin(
    request(`${production}/api/auth/magic-link`, production),
    "production"
  ),
  production
);
assert.equal(
  redirect.authCallbackUrl(preview),
  `${preview}/auth/callback`
);
assert.equal(
  redirect.authCallbackUrl(production),
  `${production}/auth/callback`
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
    request(
      "https://pikbo-git-untrusted-branch.example.vercel.app/api/auth/magic-link"
    ),
    "production"
  ),
  null
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

assert.equal(
  returnPath.authReturnPathFromLoginHref(
    `${production}/login?next=%2Fcreate%3Fmode%3Dseller-pack`
  ),
  "/create?mode=seller-pack"
);
for (const unsafeNext of [
  "https://evil.example/steal",
  "//evil.example/steal",
  "javascript:alert(1)",
  "/https://evil.example/steal",
  "/\\evil.example/steal",
  "/create\n?mode=seller-pack",
  "%2F%2Fevil.example%2Fsteal",
  "%2F%5Cevil.example%2Fsteal",
  "%252F%252Fevil.example%252Fsteal",
]) {
  assert.equal(
    returnPath.authReturnPathFromLoginHref(
      `${production}/login?next=${encodeURIComponent(unsafeNext)}`
    ),
    "/profile",
    `unsafe next must fail closed: ${JSON.stringify(unsafeNext)}`
  );
}

const sessionValues = new Map();
const fakeSessionStorage = {
  getItem(key) {
    return sessionValues.get(key) ?? null;
  },
  setItem(key, value) {
    sessionValues.set(key, value);
  },
  removeItem(key) {
    sessionValues.delete(key);
  },
};
returnPath.storeAuthReturnPath(
  fakeSessionStorage,
  `${production}/login?next=%2Fcreate%3Fmode%3Dseller-pack`
);
assert.equal(
  returnPath.consumeAuthReturnPath(fakeSessionStorage),
  "/create?mode=seller-pack"
);
assert.equal(
  returnPath.consumeAuthReturnPath(fakeSessionStorage),
  "/profile",
  "the callback return path must be consumed exactly once"
);
fakeSessionStorage.setItem(
  returnPath.AUTH_RETURN_PATH_STORAGE_KEY,
  "//evil.example/steal"
);
assert.equal(returnPath.consumeAuthReturnPath(fakeSessionStorage), "/profile");
assert.equal(
  fakeSessionStorage.getItem(returnPath.AUTH_RETURN_PATH_STORAGE_KEY),
  null,
  "an unsafe stored path must still be deleted"
);
assert.equal(
  returnPath.consumeAuthReturnPath({
    getItem() {
      return "/create?mode=seller-pack";
    },
    setItem() {},
    removeItem() {
      throw new Error("blocked");
    },
  }),
  "/profile",
  "a return path that cannot be consumed exactly once must fail closed"
);

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
assert.match(callbackSource, /consumeAuthReturnPath/);
assert.match(callbackSource, /router\.replace\(returnPath\)/);
assert.match(callbackSource, /Request a new magic link/);
assert.match(loginSource, /Check your inbox for a Pikbo sign-in link/);
assert.match(loginSource, /storeAuthReturnPath/);

console.log(
  "auth-magic-link-regression: PASS (trusted same-origin callback · safe one-time return path · invalid origin/path fail-closed · provider errors · missing-session honesty · successful exchange)"
);
