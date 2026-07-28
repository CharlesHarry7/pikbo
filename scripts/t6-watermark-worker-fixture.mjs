#!/usr/bin/env node
/**
 * Executes the production T6 worker core with an injected runner. No provider
 * request, ffmpeg binary, or object-storage write occurs in this fixture.
 */
import assert from "node:assert/strict";
import {
  createServerOwnedT6Input,
  canServeVerifiedT6Derivative,
  hasOnlyPublicResolvedAddresses,
  isVerifiedT6DerivativeForJob,
  runT6PipelineWithInjectedRunner,
  t6DerivativeObjectKey,
  t6DeliveryReadiness,
  t6OwnedDeliveryPath,
  transitionT6Derivative,
} from "../lib/t6Worker.ts";

const source = Buffer.from("fixture:unmarked-mp4-payload");
const job = createServerOwnedT6Input({
  id: "fixture-job",
  requestId: "provider-request",
  provider: "fixture-provider",
  videoUrl: "https://cdn.example.com/output.mp4",
  demo: false,
  watermark: true,
});
assert.ok(job, "fixture must construct server-owned worker input");
const objectKey = t6DerivativeObjectKey(job);
const ownedDeliveryPath = t6OwnedDeliveryPath(objectKey);
assert.ok(ownedDeliveryPath);

const pixelProof = {
  algorithm: "decoded-roi-diff-v1",
  watermarkDetected: true,
  sampledFrames: 4,
  sampledPixels: 92160,
  region: { x: 480, y: 1184, width: 240, height: 96 },
  overlayMeanDelta: 24,
  controlMeanDelta: 1,
  overlayChangedRatio: 0.2,
  controlChangedRatio: 0.01,
  overlayPeakDelta: 255,
};

function runner(overrides = {}) {
  return {
    async fetchServerOwnedOutput() {
      return {
        contentType: "video/mp4",
        contentLength: source.byteLength,
        bytes: source,
        elapsedMs: 12,
        resolvedAddresses: ["8.8.8.8"],
      };
    },
    async runFfmpeg({ args, source: input }) {
      assert.ok(args.some((arg) => arg.includes("drawtext=text='PIKBO'")));
      assert.ok(args.includes("comment=PIKBO baked watermark"));
      return Buffer.concat([Buffer.from("fixture:mp4:PIKBO_BAKED_MARK:"), input]);
    },
    async probeMp4(output, kind) {
      return {
        formatName: "mov,mp4,m4a,3gp,3g2,mj2",
        durationSeconds: 5,
        width: 720,
        height: 1280,
        videoCodec: "h264",
        bakedMarkSignal:
          kind === "derivative" &&
          output.includes(Buffer.from("PIKBO_BAKED_MARK")),
      };
    },
    async proveWatermarkPixels() {
      return pixelProof;
    },
    async writeOwnedDerivative({ objectKey: key }) {
      return { deliveryPath: t6OwnedDeliveryPath(key) };
    },
    ...overrides,
  };
}

const succeeded = await runT6PipelineWithInjectedRunner({ job, runner: runner() });
assert.equal(succeeded.status, "succeeded");
assert.equal(succeeded.objectKey, objectKey);
assert.equal(succeeded.deliveryPath, ownedDeliveryPath);
assert.notEqual(succeeded.sourceChecksum, succeeded.outputChecksum, "derivative differs from source");
assert.equal(succeeded.probe?.bakedMarkSignal, true, "runner probe observes baked mark signal");
assert.equal(succeeded.sourceProbe?.bakedMarkSignal, false);
assert.equal(
  succeeded.pixelProof?.watermarkDetected,
  true,
  "decoded-pixel comparison observes the baked mark region"
);
assert.equal(
  isVerifiedT6DerivativeForJob({
    jobId: job.jobId,
    providerRequestId: job.providerRequestId,
    derivative: succeeded,
  }),
  true,
  "delivery gate accepts only the exact verified derivative for this job"
);
assert.equal(t6DeliveryReadiness().effective, false, "T6 delivery stack remains hard-disabled");
assert.equal(
  canServeVerifiedT6Derivative({
    jobId: job.jobId,
    providerRequestId: job.providerRequestId,
    derivative: succeeded,
  }),
  false,
  "verified metadata cannot unlock delivery before worker, storage, and route are implemented"
);

const replay = await runT6PipelineWithInjectedRunner({
  current: succeeded,
  job,
  runner: runner({
    async fetchServerOwnedOutput() {
      throw new Error("idempotent replay must not fetch again");
    },
  }),
});
assert.deepEqual(replay, succeeded, "same terminal replay is idempotent");

const foreignCurrent = {
  ...succeeded,
  idempotencyKey: "t6-bake:foreign",
  objectKey: "t6-baked/" + "a".repeat(64) + ".mp4",
};
const identityMismatch = await runT6PipelineWithInjectedRunner({
  current: foreignCurrent,
  job,
  runner: runner(),
});
assert.equal(identityMismatch.status, "failed");
assert.equal(identityMismatch.errorCode, "DERIVATIVE_IDENTITY_MISMATCH");
assert.equal(identityMismatch.idempotencyKey, job.idempotencyKey);
assert.equal(identityMismatch.objectKey, objectKey);
assert.equal(
  isVerifiedT6DerivativeForJob({
    jobId: job.jobId,
    providerRequestId: job.providerRequestId,
    derivative: foreignCurrent,
  }),
  false,
  "delivery gate rejects a foreign job derivative"
);
assert.equal(
  transitionT6Derivative(foreignCurrent, "succeeded", {
    idempotencyKey: job.idempotencyKey,
    objectKey,
  }).errorCode,
  "DERIVATIVE_IDENTITY_MISMATCH"
);

const wrongPath = await runT6PipelineWithInjectedRunner({
  job,
  runner: runner({
    async writeOwnedDerivative() {
      return { deliveryPath: "/api/t6-derivatives/not-the-owned-object.mp4" };
    },
  }),
});
assert.equal(wrongPath.status, "failed");
assert.equal(wrongPath.errorCode, "OWNED_PATH_UNVERIFIED");

const sameChecksum = await runT6PipelineWithInjectedRunner({
  job,
  runner: runner({
    async runFfmpeg({ source: input }) {
      return input;
    },
  }),
});
assert.equal(sameChecksum.status, "failed");
assert.equal(sameChecksum.errorCode, "DERIVATIVE_UNVERIFIED");
assert.equal(
  isVerifiedT6DerivativeForJob({
    jobId: job.jobId,
    providerRequestId: job.providerRequestId,
    derivative: { ...succeeded, sourceChecksum: succeeded.outputChecksum },
  }),
  false,
  "delivery gate rejects equal source/output checksums"
);

const missingPixelMark = await runT6PipelineWithInjectedRunner({
  job,
  runner: runner({
    async proveWatermarkPixels() {
      return {
        ...pixelProof,
        watermarkDetected: false,
        overlayMeanDelta: 1,
        overlayChangedRatio: 0.001,
      };
    },
  }),
});
assert.equal(missingPixelMark.status, "failed");
assert.equal(
  missingPixelMark.errorCode,
  "WATERMARK_PIXEL_PROOF_FAILED",
  "metadata without a decoded pixel delta never unlocks delivery"
);

const durationMismatch = await runT6PipelineWithInjectedRunner({
  job,
  runner: runner({
    async probeMp4(output, kind) {
      return {
        formatName: "mov,mp4,m4a,3gp,3g2,mj2",
        durationSeconds: kind === "source" ? 5 : 8,
        width: 720,
        height: 1280,
        videoCodec: "h264",
        bakedMarkSignal:
          kind === "derivative" &&
          output.includes(Buffer.from("PIKBO_BAKED_MARK")),
      };
    },
  }),
});
assert.equal(durationMismatch.status, "failed");
assert.equal(durationMismatch.errorCode, "MEDIA_SHAPE_MISMATCH");

const resolutionMismatch = await runT6PipelineWithInjectedRunner({
  job,
  runner: runner({
    async probeMp4(output, kind) {
      return {
        formatName: "mov,mp4,m4a,3gp,3g2,mj2",
        durationSeconds: 5,
        width: kind === "source" ? 720 : 1080,
        height: kind === "source" ? 1280 : 1920,
        videoCodec: "h264",
        bakedMarkSignal:
          kind === "derivative" &&
          output.includes(Buffer.from("PIKBO_BAKED_MARK")),
      };
    },
  }),
});
assert.equal(resolutionMismatch.status, "failed");
assert.equal(resolutionMismatch.errorCode, "MEDIA_SHAPE_MISMATCH");

const badSource = await runT6PipelineWithInjectedRunner({
  job,
  runner: runner({
    async fetchServerOwnedOutput() {
      return {
        contentType: "text/html",
        contentLength: source.byteLength,
        bytes: source,
        elapsedMs: 12,
        resolvedAddresses: ["8.8.8.8"],
      };
    },
  }),
});
assert.equal(badSource.status, "failed");
assert.equal(badSource.errorCode, "SOURCE_CONTENT_TYPE");

assert.equal(hasOnlyPublicResolvedAddresses(["8.8.8.8"]), true);
for (const nonPublic of [
  "203.0.113.8",
  "224.0.0.1",
  "240.0.0.1",
  "255.255.255.255",
  "::",
  "ff02::1",
  "fc00::1",
]) {
  assert.equal(hasOnlyPublicResolvedAddresses([nonPublic]), false, `${nonPublic} must be blocked`);
}

console.log("t6-watermark-worker-fixture: PASS");
