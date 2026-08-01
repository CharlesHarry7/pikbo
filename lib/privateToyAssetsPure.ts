import { createHash } from "node:crypto";

export const PRIVATE_TOY_INPUT_BUCKET = "pikbo-private-inputs";
export const PRIVATE_TOY_INPUT_MAX_BYTES = 8 * 1024 * 1024;
export const PRIVATE_TOY_INPUT_MIN_BYTES = 32;
export const PRIVATE_TOY_INPUT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type PrivateToyInputMime =
  (typeof PRIVATE_TOY_INPUT_MIME_TYPES)[number];

const SHA256_RE = /^[0-9a-f]{64}$/;

export function normalizePrivateToyInputMime(
  value: unknown
): PrivateToyInputMime | null {
  if (typeof value !== "string") return null;
  const mime = value.trim().toLowerCase();
  return PRIVATE_TOY_INPUT_MIME_TYPES.includes(
    mime as PrivateToyInputMime
  )
    ? (mime as PrivateToyInputMime)
    : null;
}

export function normalizePrivateToyInputSha(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const sha = value.trim().toLowerCase();
  return SHA256_RE.test(sha) ? sha : null;
}

export function normalizePrivateToyClientAssetKey(
  value: unknown
): string | null {
  if (typeof value !== "string") return null;
  const key = value.trim();
  return key.length >= 8 && key.length <= 128 ? key : null;
}

export function privateToyInputExtension(mime: PrivateToyInputMime): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  return "webp";
}

export function detectPrivateToyInputMime(
  bytes: Uint8Array
): PrivateToyInputMime | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function sha256PrivateToyInput(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function readUint16BE(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 2 > bytes.length) return null;
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUint32BE(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 4 > bytes.length) return null;
  return (
    bytes[offset] * 0x1000000 +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  );
}

function readUint32LE(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 4 > bytes.length) return null;
  return (
    bytes[offset] +
    (bytes[offset + 1] << 8) +
    (bytes[offset + 2] << 16) +
    bytes[offset + 3] * 0x1000000
  );
}

export function privateToyInputDimensions(
  bytes: Uint8Array,
  mimeType: PrivateToyInputMime
): { width: number; height: number } | null {
  if (mimeType === "image/png") {
    if (
      bytes.length < 33 ||
      readUint32BE(bytes, 8) !== 13 ||
      String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR"
    ) {
      return null;
    }
    const width = readUint32BE(bytes, 16);
    const height = readUint32BE(bytes, 20);
    return width && height ? { width, height } : null;
  }

  if (mimeType === "image/jpeg") {
    let offset = 2;
    const sofMarkers = new Set([
      0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
      0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
    ]);
    while (offset + 4 <= bytes.length) {
      while (offset < bytes.length && bytes[offset] !== 0xff) offset += 1;
      while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
      if (offset >= bytes.length) return null;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) return null;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const length = readUint16BE(bytes, offset);
      if (!length || length < 2 || offset + length > bytes.length) return null;
      if (sofMarkers.has(marker)) {
        if (length < 7) return null;
        const height = readUint16BE(bytes, offset + 3);
        const width = readUint16BE(bytes, offset + 5);
        return width && height ? { width, height } : null;
      }
      offset += length;
    }
    return null;
  }

  const riffSize = readUint32LE(bytes, 4);
  if (
    bytes.length < 30 ||
    riffSize == null ||
    riffSize + 8 > bytes.length ||
    String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP"
  ) {
    return null;
  }
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunk = String.fromCharCode(...bytes.slice(offset, offset + 4));
    const size = readUint32LE(bytes, offset + 4);
    if (size == null) return null;
    const data = offset + 8;
    if (data + size > bytes.length) return null;
    if (chunk === "VP8X" && size >= 10) {
      const width =
        1 + bytes[data + 4] + (bytes[data + 5] << 8) + (bytes[data + 6] << 16);
      const height =
        1 + bytes[data + 7] + (bytes[data + 8] << 8) + (bytes[data + 9] << 16);
      return { width, height };
    }
    if (chunk === "VP8L" && size >= 5 && bytes[data] === 0x2f) {
      const width = 1 + (((bytes[data + 2] & 0x3f) << 8) | bytes[data + 1]);
      const height =
        1 +
        ((bytes[data + 4] & 0x0f) << 10) +
        (bytes[data + 3] << 2) +
        ((bytes[data + 2] & 0xc0) >> 6);
      return { width, height };
    }
    if (
      chunk === "VP8 " &&
      size >= 10 &&
      bytes[data + 3] === 0x9d &&
      bytes[data + 4] === 0x01 &&
      bytes[data + 5] === 0x2a
    ) {
      const width =
        (bytes[data + 6] | (bytes[data + 7] << 8)) & 0x3fff;
      const height =
        (bytes[data + 8] | (bytes[data + 9] << 8)) & 0x3fff;
      return width && height ? { width, height } : null;
    }
    offset = data + size + (size % 2);
  }
  return null;
}

export function validatePrivateToyInputMetadata(input: {
  mimeType: unknown;
  sizeBytes: unknown;
  sha256: unknown;
  clientAssetKey: unknown;
}):
  | {
      ok: true;
      mimeType: PrivateToyInputMime;
      sizeBytes: number;
      sha256: string;
      clientAssetKey: string;
    }
  | { ok: false; code: string; error: string } {
  const mimeType = normalizePrivateToyInputMime(input.mimeType);
  if (!mimeType) {
    return {
      ok: false,
      code: "INVALID_IMAGE_TYPE",
      error: "Use a JPG, PNG, or WebP toy photo",
    };
  }
  const sizeBytes =
    typeof input.sizeBytes === "number" &&
    Number.isInteger(input.sizeBytes)
      ? input.sizeBytes
      : NaN;
  if (
    !Number.isFinite(sizeBytes) ||
    sizeBytes < PRIVATE_TOY_INPUT_MIN_BYTES ||
    sizeBytes > PRIVATE_TOY_INPUT_MAX_BYTES
  ) {
    return {
      ok: false,
      code:
        sizeBytes > PRIVATE_TOY_INPUT_MAX_BYTES
          ? "IMAGE_TOO_LARGE"
          : "INVALID_IMAGE_SIZE",
      error: `Toy photo must be ${PRIVATE_TOY_INPUT_MIN_BYTES}–${PRIVATE_TOY_INPUT_MAX_BYTES} bytes`,
    };
  }
  const sha256 = normalizePrivateToyInputSha(input.sha256);
  if (!sha256) {
    return {
      ok: false,
      code: "INVALID_IMAGE_HASH",
      error: "A valid SHA-256 fingerprint is required",
    };
  }
  const clientAssetKey = normalizePrivateToyClientAssetKey(
    input.clientAssetKey
  );
  if (!clientAssetKey) {
    return {
      ok: false,
      code: "INVALID_ASSET_KEY",
      error: "A stable clientAssetKey is required",
    };
  }
  return {
    ok: true,
    mimeType,
    sizeBytes,
    sha256,
    clientAssetKey,
  };
}

export function privateToyInputBytesMatch(input: {
  bytes: Uint8Array;
  expectedMimeType: PrivateToyInputMime;
  expectedSizeBytes: number;
  expectedSha256: string;
}):
  | { ok: true; mimeType: PrivateToyInputMime; sha256: string }
  | { ok: false; code: string; error: string } {
  if (
    input.bytes.byteLength < PRIVATE_TOY_INPUT_MIN_BYTES ||
    input.bytes.byteLength > PRIVATE_TOY_INPUT_MAX_BYTES
  ) {
    return {
      ok: false,
      code:
        input.bytes.byteLength > PRIVATE_TOY_INPUT_MAX_BYTES
          ? "IMAGE_TOO_LARGE"
          : "INVALID_IMAGE_SIZE",
      error: "Uploaded object size does not match an accepted toy photo",
    };
  }
  if (input.bytes.byteLength !== input.expectedSizeBytes) {
    return {
      ok: false,
      code: "IMAGE_SIZE_MISMATCH",
      error: "Uploaded object size changed after reservation",
    };
  }
  const mimeType = detectPrivateToyInputMime(input.bytes);
  if (!mimeType || mimeType !== input.expectedMimeType) {
    return {
      ok: false,
      code: "IMAGE_MIME_MISMATCH",
      error: "Uploaded bytes do not match the declared image type",
    };
  }
  const dimensions = privateToyInputDimensions(input.bytes, mimeType);
  if (
    !dimensions ||
    dimensions.width < 32 ||
    dimensions.height < 32 ||
    dimensions.width > 12_000 ||
    dimensions.height > 12_000 ||
    dimensions.width * dimensions.height > 50_000_000
  ) {
    return {
      ok: false,
      code: "INVALID_IMAGE_DIMENSIONS",
      error: "Uploaded bytes are not a usable product image",
    };
  }
  const sha256 = sha256PrivateToyInput(input.bytes);
  if (sha256 !== input.expectedSha256) {
    return {
      ok: false,
      code: "IMAGE_HASH_MISMATCH",
      error: "Uploaded bytes do not match the reserved image fingerprint",
    };
  }
  return { ok: true, mimeType, sha256 };
}
