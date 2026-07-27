/**
 * Parse the subset of ffprobe JSON used by the T6 delivery verifier.
 * Invalid, missing or non-finite media facts fail closed.
 */
export function parseT6FfprobeJson(value) {
  if (!value || typeof value !== "object") return null;
  const video = value.streams?.find(
    (stream) => stream.codec_type === "video"
  );
  const durationSeconds = Number(value.format?.duration);
  const width = Number(video?.width);
  const height = Number(video?.height);
  const formatName =
    typeof value.format?.format_name === "string"
      ? value.format.format_name
      : "";
  const videoCodec =
    typeof video?.codec_name === "string" ? video.codec_name : "";
  const tags = {
    ...(value.format?.tags || {}),
    ...(video?.tags || {}),
  };
  const bakedMarkSignal = Object.values(tags).some(
    (entry) =>
      typeof entry === "string" &&
      /PIKBO baked watermark/i.test(entry)
  );
  if (
    !formatName ||
    !videoCodec ||
    !Number.isFinite(durationSeconds) ||
    !Number.isInteger(width) ||
    !Number.isInteger(height)
  ) {
    return null;
  }
  return {
    formatName,
    durationSeconds,
    width,
    height,
    videoCodec,
    bakedMarkSignal,
  };
}
