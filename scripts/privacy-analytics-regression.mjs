import assert from "node:assert/strict";

import {
  PRIVACY_FUNNEL_EVENTS,
  __privacyAnalyticsTest,
  track,
  trackPageView,
} from "../lib/analytics.ts";

const { toPrivacyEnvelope, retentionDecision, sevenDaysMs } =
  __privacyAnalyticsTest;

assert.deepEqual(PRIVACY_FUNNEL_EVENTS, [
  "create_view",
  "asset_upload_complete",
  "generation_start",
  "generation_success",
  "download",
  "regenerate_7d",
]);

const sensitivePayload = {
  event: "pack_start",
  path: "/create?email=owner@example.com#prompt=secret",
  recipe: "owner@example.com/provider/private-object-key",
  demo: false,
  meta: {
    outputs: 3,
    image: "data:image/png;base64,PRIVATE_IMAGE",
    email: "owner@example.com",
    prompt: "private prompt",
    asset_url: "https://provider.example/private-asset",
    provider_url: "https://provider.example/result",
    object_key: "user/private/output.mp4",
    token: "secret-token",
  },
};

assert.deepEqual(toPrivacyEnvelope(sensitivePayload, 123), {
  event: "generation_start",
  surface: "create",
  mode: "live",
  output_count: 3,
  ts: 123,
});

assert.deepEqual(
  toPrivacyEnvelope(
    {
      event: "generate_result",
      path: "/create",
      demo: false,
      meta: { costCredits: 10 },
    },
    456
  ),
  {
    event: "generation_success",
    surface: "create",
    mode: "live",
    ts: 456,
  }
);

assert.equal(
  toPrivacyEnvelope({
    event: "generate_result",
    path: "/create",
    meta: { processedUpload: false, uploadIgnored: true },
  }),
  null,
  "an ignored upload must not be reported as a generation success"
);
assert.equal(
  toPrivacyEnvelope({
    event: "export_click",
    path: "/library",
    meta: { via: "community_publish" },
  }),
  null,
  "community publishing is not a download"
);
assert.equal(
  toPrivacyEnvelope({
    event: "generation_quote_view",
    path: "/create",
  }),
  null,
  "legacy quote events are outside the approved funnel"
);
assert.equal(
  toPrivacyEnvelope({
    event: "regenerate_7d",
    path: "/create",
    demo: false,
  }),
  null,
  "callers cannot self-declare seven-day retention"
);
assert.equal(
  toPrivacyEnvelope({ event: "create_view", path: "/pricing" }),
  null,
  "only /create is an approved route visit"
);
assert.deepEqual(
  toPrivacyEnvelope(
    {
      event: "export_click",
      path: "/effects/private-customer-slug",
      recipe: "private-customer-slug",
      demo: true,
      meta: { via: "downloads_api_blob", head: "allowed" },
    },
    789
  ),
  {
    event: "download",
    surface: "tool",
    mode: "demo",
    ts: 789,
  },
  "a tool download is classified without exporting the effect slug"
);

assert.equal(retentionDecision(null, false, 100), "initialize");
assert.equal(retentionDecision(200, false, 100), "reset");
assert.equal(retentionDecision(100, true, 100 + sevenDaysMs), "none");
assert.equal(
  retentionDecision(100, false, 100 + sevenDaysMs - 1),
  "none"
);
assert.equal(retentionDecision(100, false, 100 + sevenDaysMs), "emit");

const beaconCalls = [];
const localValues = new Map();
const memoryStorage = {
  getItem(key) {
    return localValues.has(key) ? localValues.get(key) : null;
  },
  setItem(key, value) {
    localValues.set(key, String(value));
  },
  removeItem(key) {
    localValues.delete(key);
  },
};

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    location: { origin: "https://pikbo.example" },
    localStorage: memoryStorage,
  },
});
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    sendBeacon(url, body) {
      beaconCalls.push({ url, body });
      return true;
    },
  },
});

process.env.NEXT_PUBLIC_ANALYTICS_URL =
  "https://analytics.example.test/collect";
delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

trackPageView("/pricing?email=owner@example.com");
trackPageView("/create?email=owner@example.com#private");
track(sensitivePayload);
track({
  event: "asset_upload_complete",
  path: "/create?token=secret",
  recipe: "private-prompt",
  demo: false,
  meta: {
    email: "owner@example.com",
    prompt: "secret prompt",
    image: "data:image/png;base64,PRIVATE_IMAGE",
    asset_url: "https://provider.example/private-asset",
    object_key: "user/private/output.mp4",
  },
});

assert.equal(
  beaconCalls.length,
  3,
  "pricing is ignored; create, generation start, and upload are emitted"
);

const firstBodies = await Promise.all(
  beaconCalls.map(async ({ body }) => JSON.parse(await body.text()))
);
assert.deepEqual(
  firstBodies.map((body) => body.event),
  ["create_view", "generation_start", "asset_upload_complete"]
);

for (const body of firstBodies) {
  assert.ok(
    Object.keys(body).every((key) =>
      ["event", "surface", "mode", "output_count", "ts"].includes(key)
    ),
    `unexpected external field: ${JSON.stringify(body)}`
  );
}

const serialized = JSON.stringify(firstBodies);
for (const forbidden of [
  "owner@example.com",
  "private prompt",
  "private-prompt",
  "PRIVATE_IMAGE",
  "provider.example",
  "private/output.mp4",
  "secret-token",
  "asset_url",
  "object_key",
  "recipe",
  "path",
  "meta",
]) {
  assert.equal(
    serialized.includes(forbidden),
    false,
    `external payload leaked forbidden value/key: ${forbidden}`
  );
}

beaconCalls.length = 0;
track({
  event: "generation_success",
  path: "/create",
  demo: false,
  meta: { prompt: "never export me" },
});
const firstSuccessKey = [...localValues.keys()].find((key) =>
  key.includes("first-live-success")
);
assert.ok(firstSuccessKey, "first real success initializes local retention");
localValues.set(firstSuccessKey, String(Date.now() - sevenDaysMs - 1_000));

beaconCalls.length = 0;
track({
  event: "generation_success",
  path: "/create",
  demo: false,
  meta: {
    email: "owner@example.com",
    provider_url: "https://provider.example/result",
  },
});
const retentionBodies = await Promise.all(
  beaconCalls.map(async ({ body }) => JSON.parse(await body.text()))
);
assert.deepEqual(
  retentionBodies.map((body) => body.event),
  ["generation_success", "regenerate_7d"],
  "a second live success after seven days emits retention exactly once"
);

beaconCalls.length = 0;
track({
  event: "generation_success",
  path: "/create",
  demo: false,
});
assert.deepEqual(
  (
    await Promise.all(
      beaconCalls.map(async ({ body }) => JSON.parse(await body.text()))
    )
  ).map((body) => body.event),
  ["generation_success"],
  "seven-day retention is not emitted twice"
);

console.log(
  "privacy analytics regression: six-event allowlist, field minimization, route gate, and 7-day retention passed"
);
