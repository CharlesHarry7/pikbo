#!/usr/bin/env node
/**
 * T6 source-only worker fixture. It uses an injected runner so CI does not
 * require ffmpeg, provider network access, or object storage. The production
 * worker must pass the same checks with real ffmpeg/ffprobe before its hard
 * readiness flag may change.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const source = Buffer.from("fixture:unmarked-mp4-payload");
const idempotencyKey = "t6-bake:fixture-job:provider-request";
const objectKey = `t6-baked/${createHash("sha256").update(idempotencyKey).digest("hex")}.mp4`;
const ownedDeliveryPath = `/api/t6-derivatives/${objectKey.split("/")[1]}`;
const ffmpegArgs = [
  "-y",
  "-i",
  "server-owned-source.mp4",
  "-vf",
  "drawtext=text='PIKBO':x=w-tw-36:y=h-th-28",
  "-metadata",
  "comment=PIKBO baked watermark",
  `${objectKey}.tmp.mp4`,
];

// Injected runner simulates ffmpeg + ffprobe. Its output is intentionally
// different from the provider source and exposes the probe's baked-mark signal.
const fakeRunner = {
  async fetchServerOwnedOutput() {
    return {
      contentType: "video/mp4",
      contentLength: source.byteLength,
      bytes: source,
      elapsedMs: 12,
      resolvedAddresses: ["203.0.113.8"],
    };
  },
  async runFfmpeg({ args, source: input }) {
    assert.ok(args.some((arg) => arg.includes("drawtext=text='PIKBO'")));
    assert.ok(args.includes("comment=PIKBO baked watermark"));
    return Buffer.concat([Buffer.from("fixture:mp4:PIKBO_BAKED_MARK:"), input]);
  },
  async probeMp4(output) {
    return {
      formatName: "mov,mp4,m4a,3gp,3g2,mj2",
      bakedMarkSignal: output.includes(Buffer.from("PIKBO_BAKED_MARK")),
    };
  },
};

const fetched = await fakeRunner.fetchServerOwnedOutput();
assert.equal(fetched.contentType, "video/mp4");
assert.ok(fetched.contentLength <= 50 * 1024 * 1024);
assert.ok(fetched.elapsedMs <= 30_000);
assert.deepEqual(fetched.resolvedAddresses, ["203.0.113.8"]);
const derivative = await fakeRunner.runFfmpeg({ args: ffmpegArgs, source: fetched.bytes });
const probe = await fakeRunner.probeMp4(derivative);
assert.notDeepEqual(derivative, source, "baked derivative must differ from raw source");
assert.equal(probe.bakedMarkSignal, true, "frame/probe fixture must observe baked mark signal");
assert.match(probe.formatName, /mp4/);
assert.match(objectKey, /^t6-baked\/[a-f0-9]{64}\.mp4$/);
assert.match(ownedDeliveryPath, /^\/api\/t6-derivatives\/[a-f0-9]{64}\.mp4$/);

const states = new Map();
function transition(key, next) {
  const previous = states.get(key);
  if (previous?.status === "succeeded" || previous?.status === "failed") return previous;
  const record = { status: next, key };
  states.set(key, record);
  return record;
}
assert.equal(transition(idempotencyKey, "queued").status, "queued");
assert.equal(transition(idempotencyKey, "running").status, "running");
const succeeded = transition(idempotencyKey, "succeeded");
assert.equal(transition(idempotencyKey, "succeeded"), succeeded, "same terminal replay is idempotent");
assert.equal(transition(idempotencyKey, "failed"), succeeded, "terminal conflict fails closed");
assert.equal(transition("failed-fixture", "failed").status, "failed");

console.log("t6-watermark-worker-fixture: PASS");
