/**
 * AIT-247: Generate prefers durable assetId after Library→Create same-photo hydrate.
 *
 * Contracts (static + pure-unit):
 * 1. Live fixed Moment POST body is assetId-only (no dataUrl / Base64 re-upload).
 * 2. Same-photo handoff settled with assetId enables composer Generate without
 *    a local file re-pick (blob preview alone is not enough; assetId is).
 * 3. Fail-closed client preflight: missing / non-durable still → honest error,
 *    no provider payload shape.
 * 4. CreateStudio wires pure helpers; live path never dual-sends image+assetId.
 * 5. Library device history never invents fake UGC stills from blob previews.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");

const studio = read("components/CreateStudio.tsx");
const createTrust = read("lib/createTrust.ts");
const pureLib = read("lib/createGenerateStillPure.mjs");
const genRoute = read("app/api/generate/route.ts");
const handoffScript = read("scripts/create-same-photo-handoff-regression.mjs");

// --- Source wiring ---
assert.match(pureLib, /export function buildCreateGenerateStillFields/);
assert.match(pureLib, /export function composerHasUsableToyInput/);
assert.match(pureLib, /export function isComposerDataUrlStill/);
assert.match(pureLib, /export function resolveGenerateStill/);
assert.match(createTrust, /createGenerateStillPure\.mjs/);
assert.match(createTrust, /export function buildCreateGenerateStillFields/);
assert.match(createTrust, /export function composerHasUsableToyInput/);
assert.match(createTrust, /export function resolveGenerateStill/);

assert.match(studio, /buildCreateGenerateStillFields/);
assert.match(studio, /composerHasUsableToyInput/);
assert.match(studio, /isComposerDataUrlStill/);
assert.match(studio, /resolveGenerateStill/);
// Live body comes from pure still fields — not an inline dual-send branch.
assert.match(
  studio,
  /image:\s*stillFields\.image/
);
assert.match(
  studio,
  /assetId:\s*stillFields\.assetId/
);
assert.match(
  studio,
  /fallbackImage:\s*stillFields\.fallbackImage/
);
// Same-photo handoff still adopts proven assetId.
assert.match(studio, /setAssetId\(asset\.id\)/);
assert.match(studio, /planCreateQueryAssetHandoff/);
// CTA / canGenerate uses pure composer readiness (assetId without local file).
assert.match(
  studio,
  /composerHasUsableToyInput\(\{\s*image,\s*assetId\s*\}\)/
);
// Device Library history: no fake blob UGC stills.
assert.match(studio, /isComposerDataUrlStill/);
assert.doesNotMatch(
  studio,
  /inputImage:\s*image\b/
);

// Live API still requires owner-ready private asset before provider.
assert.match(genRoute, /resolveReadyPrivateToyAssetDataUrl/);
assert.match(genRoute, /code:\s*"ASSET_NOT_FOUND"/);
assert.match(genRoute, /reserveStrictLiveGenerationWithAsset/);
const providerIdx = genRoute.indexOf("invokeReservedProvider(");
const assetGateIdx = genRoute.indexOf('code: "ASSET_NOT_FOUND"');
assert.ok(assetGateIdx > 0 && providerIdx > assetGateIdx);

// Predecessor handoff regression remains the adopt gate.
assert.match(handoffScript, /planCreateQueryAssetHandoff/);

// --- Pure unit (no path-alias TS import) ---
const {
  buildCreateGenerateStillFields,
  composerHasUsableToyInput,
  isComposerDataUrlStill,
  resolveGenerateStill,
} = await import(
  pathToFileURL(join(root, "lib/createGenerateStillPure.mjs")).href
);

const durableId = "a1b2c3d4-e5f6-4789-a012-3456789abcde";
const dataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const blobPreview = "blob:https://pikbo.ai/preview-uuid";

// Composer readiness after same-photo hydrate
assert.equal(
  composerHasUsableToyInput({ assetId: durableId, image: null }),
  true,
  "assetId alone enables Generate (no local re-pick)"
);
assert.equal(
  composerHasUsableToyInput({ assetId: durableId, image: blobPreview }),
  true,
  "assetId + blob preview enables Generate"
);
assert.equal(
  composerHasUsableToyInput({ assetId: null, image: blobPreview }),
  false,
  "blob-only preview must not enable Generate"
);
assert.equal(
  composerHasUsableToyInput({ assetId: null, image: dataUrl }),
  true,
  "data-URL upload enables Generate"
);
assert.equal(isComposerDataUrlStill(blobPreview), false);
assert.equal(isComposerDataUrlStill(dataUrl), true);
assert.equal(isComposerDataUrlStill(null), false);

// Fresh compose after handoff adopt: mode asset
{
  const still = resolveGenerateStill({
    sourceStore: {},
    image: blobPreview,
    assetId: durableId,
  });
  assert.equal(still.mode, "asset");
  assert.equal(still.assetId, durableId);

  const live = buildCreateGenerateStillFields({
    mode: still.mode,
    assetId: still.assetId,
    image: still.image,
    ambientImage: blobPreview,
    demoMode: false,
  });
  assert.equal(live.canSubmit, true);
  assert.equal(live.assetId, durableId);
  assert.equal(live.image, undefined, "live must not re-post blob/Base64");
  assert.equal(live.fallbackImage, undefined);

  const cached = buildCreateGenerateStillFields({
    mode: still.mode,
    assetId: still.assetId,
    image: dataUrl,
    ambientImage: null,
    demoMode: true,
  });
  assert.equal(cached.canSubmit, true);
  assert.equal(cached.assetId, durableId);
  assert.equal(cached.image, dataUrl);
  assert.equal(cached.fallbackImage, dataUrl);
}

// Asset-only (preview fetch failed) still submits live with assetId
{
  const live = buildCreateGenerateStillFields({
    mode: "asset",
    assetId: durableId,
    image: null,
    ambientImage: null,
    demoMode: false,
  });
  assert.deepEqual(
    { canSubmit: live.canSubmit, assetId: live.assetId, image: live.image },
    { canSubmit: true, assetId: durableId, image: undefined }
  );
}

// Fail-closed: no still
{
  const none = buildCreateGenerateStillFields({
    mode: "none",
    demoMode: false,
  });
  assert.equal(none.canSubmit, false);
  assert.match(none.error || "", /Upload a reference image|photo/i);
  assert.equal(none.assetId, undefined);
  assert.equal(none.image, undefined);
}

// Fail-closed live without durable asset (inline bytes rejected client-side)
{
  const liveImageOnly = buildCreateGenerateStillFields({
    mode: "image",
    image: dataUrl,
    demoMode: false,
  });
  assert.equal(liveImageOnly.canSubmit, false);
  assert.match(liveImageOnly.error || "", /missing or not ready|Upload/i);
  assert.equal(liveImageOnly.image, undefined);
  assert.equal(liveImageOnly.assetId, undefined);
}

// Cached image path still works
{
  const cached = buildCreateGenerateStillFields({
    mode: "image",
    image: dataUrl,
    demoMode: true,
  });
  assert.equal(cached.canSubmit, true);
  assert.equal(cached.image, dataUrl);
  assert.equal(cached.assetId, undefined);
}

// Retry with frozen still + durable assetId prefers asset POST (not ambient re-upload)
{
  const store = { "src-a": dataUrl };
  const still = resolveGenerateStill({
    retry: {
      sourceKey: "src-a",
      assetId: durableId,
      effect: "street-power-up",
      extra: "",
      aspectRatio: "9:16",
      duration: 5,
      resolution: "720p",
      model: "seedance-fast",
    },
    sourceStore: store,
    image: "data:image/png;base64,BBB",
    assetId: "ambient-should-not-win",
  });
  assert.equal(still.mode, "retry-asset");
  assert.equal(still.assetId, durableId);
  assert.equal(still.image, dataUrl);

  const live = buildCreateGenerateStillFields({
    mode: still.mode,
    assetId: still.assetId,
    image: still.image,
    demoMode: false,
  });
  assert.equal(live.assetId, durableId);
  assert.equal(live.image, undefined);
}

// Fixed Moment productContract still wired for owner-ready generate
assert.match(
  studio,
  /productContract:\s*fixedMomentContract\s*\?\s*["']toy-moment-v1["']/
);

console.log(
  "create-generate-assetid-regression: PASS (live assetId-only body; composer ready after handoff; fail-closed missing still; no fake blob UGC)"
);
