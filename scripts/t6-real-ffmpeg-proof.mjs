#!/usr/bin/env node
/**
 * Real, non-production T6 media proof.
 *
 * Requires absolute PIKBO_FFMPEG_PATH and PIKBO_FFPROBE_PATH. It creates a
 * synthetic owned MP4, applies the exact T6 bake arguments, decodes both files
 * for a region-of-interest pixel comparison and writes only proof JSON plus
 * source/watermarked comparison frames to an optional artifact directory.
 */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { constants, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { tmpdir } from "node:os";
import {
  sha256,
  t6FfmpegArgs,
  verifyT6Derivative,
} from "../lib/t6Worker.ts";
import { parseT6FfprobeJson } from "../lib/t6Probe.mjs";
import {
  buildT6PixelProof,
  t6PixelDiffArgs,
  t6PixelRegions,
} from "../lib/t6PixelProof.mjs";
import {
  t6OwnedObjectKeyFromRouteParam,
} from "../lib/t6OwnedStorage.ts";

const ffmpeg = (process.env.PIKBO_FFMPEG_PATH || "").trim();
const ffprobe = (process.env.PIKBO_FFPROBE_PATH || "").trim();
for (const [name, value] of [
  ["PIKBO_FFMPEG_PATH", ffmpeg],
  ["PIKBO_FFPROBE_PATH", ffprobe],
]) {
  assert.ok(value && isAbsolute(value), `${name} must be an absolute path`);
  await access(value, constants.X_OK);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.once("error", reject);
    child.once("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `process failed (${code}): ${Buffer.concat(stderr)
              .toString("utf8")
              .slice(0, 4000)}`
          )
        );
        return;
      }
      resolve({
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr).toString("utf8"),
      });
    });
  });
}

async function probe(path) {
  const result = await run(ffprobe, [
    "-v",
    "error",
    "-show_format",
    "-show_streams",
    "-of",
    "json",
    path,
  ]);
  const parsed = parseT6FfprobeJson(
    JSON.parse(result.stdout.toString("utf8"))
  );
  assert.ok(parsed, `ffprobe must parse ${path}`);
  return parsed;
}

const work = await mkdtemp(join(tmpdir(), "pikbo-t6-real-proof-"));
const sourcePath = join(work, "source.mp4");
const derivativePath = join(work, "derivative.mp4");
const sourceFramePath = join(work, "source-frame.png");
const derivativeFramePath = join(work, "watermarked-frame.png");

try {
  await run(ffmpeg, [
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "color=c=0x3b4252:size=640x360:rate=24:duration=2",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:sample_rate=44100:duration=2",
    "-shortest",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    sourcePath,
  ]);
  await run(
    ffmpeg,
    t6FfmpegArgs({
      sourcePath,
      outputPath: derivativePath,
    })
  );

  const [sourceBytes, outputBytes, sourceProbe, outputProbe] =
    await Promise.all([
      readFile(sourcePath),
      readFile(derivativePath),
      probe(sourcePath),
      probe(derivativePath),
    ]);
  const regions = t6PixelRegions(sourceProbe.width, sourceProbe.height);
  assert.ok(regions, "pixel regions must be available");
  const [overlay, control] = await Promise.all([
    run(
      ffmpeg,
      t6PixelDiffArgs({
        sourcePath,
        outputPath: derivativePath,
        region: regions.overlay,
        sampleFrames: 4,
      })
    ),
    run(
      ffmpeg,
      t6PixelDiffArgs({
        sourcePath,
        outputPath: derivativePath,
        region: regions.control,
        sampleFrames: 4,
      })
    ),
  ]);
  const pixelsPerFrame = regions.overlay.width * regions.overlay.height;
  const sampledFrames = Math.min(
    Math.floor(overlay.stdout.byteLength / pixelsPerFrame),
    Math.floor(control.stdout.byteLength / pixelsPerFrame)
  );
  const pixelProof = buildT6PixelProof({
    overlayBytes: overlay.stdout,
    controlBytes: control.stdout,
    region: regions.overlay,
    sampledFrames,
  });
  assert.ok(pixelProof, "decoded pixel proof must exist");
  const verification = verifyT6Derivative({
    source: sourceBytes,
    output: outputBytes,
    sourceProbe,
    probe: outputProbe,
    pixelProof,
  });
  assert.equal(verification.ok, true, "real bake must pass delivery verifier");
  assert.equal(pixelProof.watermarkDetected, true);
  assert.notEqual(sha256(sourceBytes), sha256(outputBytes));

  const badPixelVerification = verifyT6Derivative({
    source: sourceBytes,
    output: outputBytes,
    sourceProbe,
    probe: outputProbe,
    pixelProof: {
      ...pixelProof,
      watermarkDetected: false,
      overlayMeanDelta: 0,
      overlayChangedRatio: 0,
    },
  });
  assert.deepEqual(badPixelVerification, {
    ok: false,
    code: "WATERMARK_PIXEL_PROOF_FAILED",
  });

  await Promise.all([
    run(ffmpeg, [
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      "1",
      "-i",
      sourcePath,
      "-frames:v",
      "1",
      sourceFramePath,
    ]),
    run(ffmpeg, [
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      "1",
      "-i",
      derivativePath,
      "-frames:v",
      "1",
      derivativeFramePath,
    ]),
  ]);

  const routeSource = readFileSync(
    join(process.cwd(), "app/api/t6-derivatives/[hash]/route.ts"),
    "utf8"
  );
  const downloadSource = readFileSync(
    join(process.cwd(), "app/api/downloads/[id]/route.ts"),
    "utf8"
  );
  const runnerSource = readFileSync(
    join(process.cwd(), "lib/t6FfmpegRunner.ts"),
    "utf8"
  );
  assert.doesNotMatch(
    routeSource,
    /providerOutputUrl|sourceRef|NextResponse\.redirect/
  );
  assert.match(downloadSource, /job\.bakedDerivative\?\.deliveryPath/);
  assert.match(runnerSource, /shell:\s*false/);
  assert.match(runnerSource, /proveWatermarkPixels/);
  assert.equal(
    t6OwnedObjectKeyFromRouteParam(`${"a".repeat(64)}.mp4`),
    `t6-baked/${"a".repeat(64)}.mp4`
  );

  const [ffmpegVersion, ffprobeVersion, sourceFrame, derivativeFrame] =
    await Promise.all([
      run(ffmpeg, ["-version"]),
      run(ffprobe, ["-version"]),
      readFile(sourceFramePath),
      readFile(derivativeFramePath),
    ]);
  const proof = {
    generatedAt: new Date().toISOString(),
    mode: "synthetic-non-production",
    realFfmpeg: true,
    realFfprobe: true,
    spawnShell: false,
    providerUrlUsed: false,
    providerUrlPubliclyExposed: false,
    ffmpegVersion: ffmpegVersion.stdout
      .toString("utf8")
      .split("\n", 1)[0],
    ffprobeVersion: ffprobeVersion.stdout
      .toString("utf8")
      .split("\n", 1)[0],
    source: {
      bytes: sourceBytes.byteLength,
      sha256: sha256(sourceBytes),
      probe: sourceProbe,
      frameSha256: createHash("sha256")
        .update(sourceFrame)
        .digest("hex"),
    },
    derivative: {
      bytes: outputBytes.byteLength,
      sha256: sha256(outputBytes),
      probe: outputProbe,
      pixelProof,
      frameSha256: createHash("sha256")
        .update(derivativeFrame)
        .digest("hex"),
    },
    negativeGate: badPixelVerification,
  };

  const artifactDir = (
    process.env.PIKBO_T6_PROOF_ARTIFACT_DIR || ""
  ).trim();
  if (artifactDir) {
    assert.ok(isAbsolute(artifactDir), "artifact directory must be absolute");
    await mkdir(artifactDir, { recursive: true });
    await Promise.all([
      writeFile(
        join(artifactDir, "proof.json"),
        `${JSON.stringify(proof, null, 2)}\n`
      ),
      writeFile(join(artifactDir, "source-frame.png"), sourceFrame),
      writeFile(
        join(artifactDir, "watermarked-frame.png"),
        derivativeFrame
      ),
    ]);
  }
  console.log(JSON.stringify(proof, null, 2));
  console.log(
    "t6-real-ffmpeg-proof: PASS (real encode/probe; decoded ROI pixel mark; metadata-only failure withheld)"
  );
} finally {
  await rm(work, { recursive: true, force: true });
}
