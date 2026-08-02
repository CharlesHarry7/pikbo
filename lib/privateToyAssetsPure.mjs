export const PRIVATE_TOY_INPUT_MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export function sniffToyImageMime(bytes) {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) return "image/jpeg";
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (value, index) => bytes[index] === value
    )
  ) return "image/png";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) return "image/webp";
  return null;
}

export function validateToyAssetRequest(input) {
  if (!ALLOWED_MIME.has(input.mimeType)) {
    return { ok: false, code: "INVALID_IMAGE_TYPE", error: "Use JPG, PNG, or WebP" };
  }
  if (
    !Number.isInteger(input.sizeBytes) ||
    input.sizeBytes < 1 ||
    input.sizeBytes > PRIVATE_TOY_INPUT_MAX_BYTES
  ) {
    return {
      ok: false,
      code: "IMAGE_TOO_LARGE",
      error: `Image must be 1–${PRIVATE_TOY_INPUT_MAX_BYTES} bytes`,
    };
  }
  if (!/^[0-9a-f]{64}$/.test(input.sha256)) {
    return { ok: false, code: "INVALID_SHA256", error: "A lowercase SHA-256 is required" };
  }
  if ((input.skuLabel || "").trim().length > 64) {
    return { ok: false, code: "INVALID_SKU_LABEL", error: "SKU label is too long" };
  }
  return null;
}
