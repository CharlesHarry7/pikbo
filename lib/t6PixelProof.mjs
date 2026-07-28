/**
 * Decoded-pixel proof for the T6 baked watermark.
 *
 * ffprobe metadata alone is not proof that a visible mark entered the video
 * pixels. The real runner decodes source/output pairs, computes a luma
 * difference in the expected bottom-right mark region and compares it with an
 * equally sized top-left control region.
 */

export const T6_PIXEL_PROOF_ALGORITHM = "decoded-roi-diff-v1";
export const T6_PIXEL_DELTA_THRESHOLD = 12;

export function t6PixelRegions(width, height) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 16 ||
    height < 16
  ) {
    return null;
  }
  const regionWidth = Math.min(240, width);
  const regionHeight = Math.min(96, height);
  return {
    overlay: {
      x: width - regionWidth,
      y: height - regionHeight,
      width: regionWidth,
      height: regionHeight,
    },
    control: {
      x: 0,
      y: 0,
      width: regionWidth,
      height: regionHeight,
    },
  };
}

export function t6PixelDiffArgs(input) {
  const { sourcePath, outputPath, region, sampleFrames = 4 } = input;
  if (
    !sourcePath ||
    !outputPath ||
    !region ||
    !Number.isInteger(sampleFrames) ||
    sampleFrames < 1 ||
    sampleFrames > 12
  ) {
    throw new Error("T6_PIXEL_DIFF_INPUT_INVALID");
  }
  const { x, y, width, height } = region;
  for (const value of [x, y, width, height]) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error("T6_PIXEL_REGION_INVALID");
    }
  }
  if (width < 1 || height < 1) {
    throw new Error("T6_PIXEL_REGION_INVALID");
  }
  return [
    "-v",
    "error",
    "-i",
    sourcePath,
    "-i",
    outputPath,
    "-filter_complex",
    `[0:v][1:v]blend=all_mode=difference,crop=${width}:${height}:${x}:${y},fps=2,format=gray`,
    "-frames:v",
    String(sampleFrames),
    "-f",
    "rawvideo",
    "-",
  ];
}

function deltaStats(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    return null;
  }
  let total = 0;
  let changed = 0;
  let peak = 0;
  for (const value of bytes) {
    total += value;
    if (value >= T6_PIXEL_DELTA_THRESHOLD) changed += 1;
    if (value > peak) peak = value;
  }
  return {
    meanDelta: total / bytes.byteLength,
    changedRatio: changed / bytes.byteLength,
    peakDelta: peak,
    sampledPixels: bytes.byteLength,
  };
}

export function buildT6PixelProof(input) {
  const overlay = deltaStats(input.overlayBytes);
  const control = deltaStats(input.controlBytes);
  if (!overlay || !control || !input.region) return null;
  const sampledFrames = Number(input.sampledFrames);
  if (!Number.isInteger(sampledFrames) || sampledFrames < 1) return null;
  const watermarkDetected =
    overlay.sampledPixels === control.sampledPixels &&
    overlay.sampledPixels >= 1024 &&
    overlay.meanDelta >= 3 &&
    overlay.changedRatio >= 0.01 &&
    overlay.meanDelta >= control.meanDelta + 1.5 &&
    overlay.changedRatio >= control.changedRatio + 0.005;
  return {
    algorithm: T6_PIXEL_PROOF_ALGORITHM,
    watermarkDetected,
    sampledFrames,
    sampledPixels: overlay.sampledPixels,
    region: input.region,
    overlayMeanDelta: Number(overlay.meanDelta.toFixed(6)),
    controlMeanDelta: Number(control.meanDelta.toFixed(6)),
    overlayChangedRatio: Number(overlay.changedRatio.toFixed(6)),
    controlChangedRatio: Number(control.changedRatio.toFixed(6)),
    overlayPeakDelta: overlay.peakDelta,
  };
}
