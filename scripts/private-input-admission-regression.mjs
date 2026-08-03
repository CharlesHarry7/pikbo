import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

function loadRoute(relativePath, dependencies) {
  const compiled = ts.transpileModule(read(relativePath), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "exports", "module", compiled)(
    (id) => {
      if (Object.hasOwn(dependencies, id)) return dependencies[id];
      throw new Error(`unexpected ${relativePath} import: ${id}`);
    },
    loaded.exports,
    loaded
  );
  return loaded.exports;
}

const state = {
  auth: null,
  invited: false,
  inputReady: false,
  rateAllowed: true,
  createCalls: 0,
  completeCalls: 0,
};
const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "seller@example.com",
};
const assetId = "22222222-2222-4222-8222-222222222222";
const common = {
  "next/server": {
    NextResponse: { json: (body, init) => Response.json(body, init) },
  },
  "@/lib/supabase/user": {
    getAuthUserFromRequest: async () => state.auth,
  },
  "@/lib/privateLiveAccessServer": {
    resolvePrivateLiveAccess: () => ({
      invite: { invited: state.invited },
      // The input route must not consult the provider-spend fuse.
      budget: { ok: false },
    }),
  },
  "@/lib/liveReadinessServer": {
    probeSoftLiveReadiness: async () => ({
      privateInputAdmission: { ready: state.inputReady, missing: [] },
      privatePreview: { ready: false, missing: ["providerConfigured"] },
    }),
  },
  "@/lib/rateLimit": {
    takeToken: () =>
      state.rateAllowed
        ? { ok: true, remaining: 1 }
        : { ok: false, retryAfterSec: 9 },
  },
};

const upload = loadRoute("app/api/assets/upload-url/route.ts", {
  ...common,
  "@/lib/privateToyAssets": {
    PRIVATE_TOY_INPUT_MAX_BYTES: 8 * 1024 * 1024,
    createPrivateToyAssetUpload: async () => {
      state.createCalls += 1;
      return {
        ok: true,
        assetId,
        uploadUrl: "https://storage.example/signed-upload",
        expiresAt: "2026-08-02T00:00:00.000Z",
        maxBytes: 8 * 1024 * 1024,
        state: "pending",
        idempotent: false,
      };
    },
  },
});
const complete = loadRoute("app/api/assets/complete/route.ts", {
  ...common,
  "@/lib/privateToyAssets": {
    completePrivateToyAsset: async () => {
      state.completeCalls += 1;
      return {
        ok: true,
        idempotent: false,
        asset: {
          id: assetId,
          state: "ready",
          mimeType: "image/png",
          sizeBytes: 128,
          skuLabel: "SKU-01",
          verifiedAt: "2026-08-02T00:00:00.000Z",
        },
      };
    },
  },
});

const uploadRequest = () =>
  new Request("https://preview.example/api/assets/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mimeType: "image/png",
      sizeBytes: 128,
      sha256: "a".repeat(64),
      clientAssetKey: `input:${"b".repeat(64)}`,
      skuLabel: "SKU-01",
    }),
  });
const completeRequest = () =>
  new Request("https://preview.example/api/assets/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId }),
  });

let response = await upload.POST(uploadRequest());
assert.equal(response.status, 401, "anonymous upload must fail closed");
response = await complete.POST(completeRequest());
assert.equal(response.status, 401, "anonymous complete must fail closed");

state.auth = user;
response = await upload.POST(uploadRequest());
assert.equal(response.status, 403, "non-invited upload must fail closed");
response = await complete.POST(completeRequest());
assert.equal(
  response.status,
  200,
  "an owner must be able to finish an already-admitted PUT after invite changes"
);

state.invited = true;
response = await upload.POST(uploadRequest());
assert.equal(response.status, 503, "missing input infrastructure must close upload");
response = await complete.POST(completeRequest());
assert.equal(
  response.status,
  200,
  "an owner must be able to finish an already-admitted PUT during readiness drift"
);

state.inputReady = true;
state.rateAllowed = false;
response = await upload.POST(uploadRequest());
assert.equal(response.status, 429, "upload admission must be rate limited");
assert.equal(response.headers.get("retry-after"), "9");
response = await complete.POST(completeRequest());
assert.equal(response.status, 429, "complete admission must be rate limited");

state.rateAllowed = true;
response = await upload.POST(uploadRequest());
assert.equal(response.status, 201);
assert.equal(state.createCalls, 1);
const prepared = await response.json();
assert.equal(prepared.private, true);
assert.equal(prepared.durable, true);
assert.equal(Object.hasOwn(prepared, "objectKey"), false);

response = await complete.POST(completeRequest());
assert.equal(response.status, 200);
assert.equal(state.completeCalls, 3);
const verified = await response.json();
assert.equal(verified.asset.state, "ready");
assert.equal(Object.hasOwn(verified, "objectKey"), false);

const reserveRoute = read("app/api/seller-pack/reserve/route.ts");
const meRoute = read("app/api/me/route.ts");
const studio = read("components/BatchStudio.tsx");
assert.match(reserveRoute, /privateLive\.budget\.ok/);
assert.match(reserveRoute, /readiness\.privatePreview\.ready/);
assert.match(meRoute, /canPreparePrivateInput/);
assert.match(meRoute, /liveReadiness\.privatePreview\.ready/);
assert.match(studio, /data-private-input-only="true"/);
assert.match(studio, /0 credits reserved · 0 video jobs created/);
assert.match(studio, /data-private-input-action=\{[\s\S]*"verify-private-input"/);

console.log(
  "private-input-admission-regression: PASS (auth + invite + input readiness + rate limit; privatePreview false; zero Pack/Provider/credits/Stripe authority)"
);
