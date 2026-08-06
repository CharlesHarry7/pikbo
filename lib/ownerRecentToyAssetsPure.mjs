/**
 * Pure helpers for owner recent / same-photo Create handoff DTOs.
 * No server imports — safe for Node regression scripts.
 */

export const RECENT_PRIVATE_TOY_ASSETS_DEFAULT_LIMIT = 8;
export const RECENT_PRIVATE_TOY_ASSETS_MAX_LIMIT = 12;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

/**
 * Parse an optional recent-list pin id (`?include=`).
 * Malformed values are ignored — never used as existence probes.
 */
export function parseRecentIncludeAssetId(raw) {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value || !isUuid(value)) return null;
  return value;
}

export function privateToyAssetPreviewPath(assetId) {
  return `/api/assets/${encodeURIComponent(assetId)}/content`;
}

/**
 * Map a toy_assets row to the safe recent DTO.
 * Returns null when the row fails ready/MIME/shape checks (no partial leak).
 */
export function mapToyAssetRowToRecentDto(row) {
  if (!row || typeof row !== "object") return null;
  if (
    typeof row.id !== "string" ||
    !isUuid(row.id) ||
    row.state !== "ready" ||
    !ALLOWED_MIME.has(String(row.mime_type)) ||
    typeof row.size_bytes !== "number" ||
    typeof row.created_at !== "string"
  ) {
    return null;
  }
  return {
    id: row.id,
    skuLabel: typeof row.sku_label === "string" ? row.sku_label : null,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    verifiedAt: typeof row.verified_at === "string" ? row.verified_at : null,
    previewPath: privateToyAssetPreviewPath(row.id),
  };
}

/**
 * Merge a proven owner-ready pin into the newest-first recent window.
 * Pin is appended once when outside the window; already-present ids are
 * deduplicated. Null pin is a no-op (cross-owner / missing / not-ready).
 */
export function mergeRecentAssetsWithOptionalPin(input) {
  const recent = Array.isArray(input.recent) ? [...input.recent] : [];
  if (!input.pinned) return recent;
  const pinId = input.pinned.id.toLowerCase();
  if (recent.some((row) => row.id.toLowerCase() === pinId)) {
    return recent;
  }
  return [...recent, input.pinned];
}

export function clampRecentLimit(limit) {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return RECENT_PRIVATE_TOY_ASSETS_DEFAULT_LIMIT;
  }
  return Math.min(
    RECENT_PRIVATE_TOY_ASSETS_MAX_LIMIT,
    Math.max(1, Math.floor(limit))
  );
}
