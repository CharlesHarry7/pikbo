/**
 * Owner-only recent ready private toy inputs for Create reuse.
 * Safe list DTOs only — never returns object keys, SHA, signed URLs, or owner identity.
 */

import { getSupabaseAdmin } from "@/lib/supabase/server";

export const RECENT_PRIVATE_TOY_ASSETS_DEFAULT_LIMIT = 8;
export const RECENT_PRIVATE_TOY_ASSETS_MAX_LIMIT = 12;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Browser-safe recent asset row (relative preview path only). */
export type RecentPrivateToyAssetDto = {
  id: string;
  skuLabel: string | null;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  createdAt: string;
  verifiedAt: string | null;
  /** Owner-auth content route — never a signed storage URL. */
  previewPath: string;
};

function clampLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return RECENT_PRIVATE_TOY_ASSETS_DEFAULT_LIMIT;
  }
  return Math.min(
    RECENT_PRIVATE_TOY_ASSETS_MAX_LIMIT,
    Math.max(1, Math.floor(limit))
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

/**
 * Parse an optional recent-list pin id (`?include=`).
 * Malformed values are ignored — never used as existence probes.
 */
export function parseRecentIncludeAssetId(
  raw: string | null | undefined
): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value || !isUuid(value)) return null;
  return value;
}

export function privateToyAssetPreviewPath(assetId: string): string {
  return `/api/assets/${encodeURIComponent(assetId)}/content`;
}

/**
 * Map a toy_assets row to the safe recent DTO.
 * Returns null when the row fails ready/MIME/shape checks (no partial leak).
 */
export function mapToyAssetRowToRecentDto(
  row: Record<string, unknown> | null | undefined
): RecentPrivateToyAssetDto | null {
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
    mimeType: row.mime_type as RecentPrivateToyAssetDto["mimeType"],
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    verifiedAt: typeof row.verified_at === "string" ? row.verified_at : null,
    previewPath: privateToyAssetPreviewPath(row.id),
  };
}

/**
 * Merge a proven owner-ready pin into the newest-first recent window.
 * - Normal recent rows stay newest-first and bounded by the caller.
 * - Pin is appended once when outside the window (not reordered into "newest").
 * - Already-present ids are deduplicated (pin ignored).
 * - Null pin is a no-op (cross-owner / missing / not-ready collapse here).
 */
export function mergeRecentAssetsWithOptionalPin(input: {
  recent: ReadonlyArray<RecentPrivateToyAssetDto>;
  pinned: RecentPrivateToyAssetDto | null;
}): RecentPrivateToyAssetDto[] {
  const recent = Array.isArray(input.recent) ? [...input.recent] : [];
  if (!input.pinned) return recent;
  const pinId = input.pinned.id.toLowerCase();
  if (recent.some((row) => row.id.toLowerCase() === pinId)) {
    return recent;
  }
  return [...recent, input.pinned];
}

const RECENT_SELECT =
  "id,sku_label,mime_type,size_bytes,created_at,verified_at,state";

/**
 * Exact owner + ready proof for one durable asset id.
 * Missing, cross-owner, not-ready, and malformed map to null (no existence leak).
 */
export async function getOwnerReadyToyAssetById(input: {
  ownerUserId: string;
  assetId: string;
}): Promise<RecentPrivateToyAssetDto | null> {
  if (!input.ownerUserId) return null;
  const assetId = parseRecentIncludeAssetId(input.assetId);
  if (!assetId) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin
    .from("toy_assets")
    .select(RECENT_SELECT)
    .eq("id", assetId)
    .eq("owner_user_id", input.ownerUserId)
    .eq("state", "ready")
    .maybeSingle();
  if (error || !data) return null;
  return mapToyAssetRowToRecentDto(data as Record<string, unknown>);
}

/**
 * List the owner's newest ready verified toy inputs.
 * Newest-first by created_at; only ready state.
 * Optional includeAssetId is proven with the same owner+ready filters and
 * pinned once when outside the recent window (deduped if already present).
 */
export async function listOwnerRecentReadyToyAssets(input: {
  ownerUserId: string;
  limit?: number;
  includeAssetId?: string | null;
}): Promise<RecentPrivateToyAssetDto[]> {
  if (!input.ownerUserId) return [];
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const limit = clampLimit(input.limit);
  const { data, error } = await admin
    .from("toy_assets")
    .select(RECENT_SELECT)
    .eq("owner_user_id", input.ownerUserId)
    .eq("state", "ready")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  const recent: RecentPrivateToyAssetDto[] = [];
  for (const row of data as Array<Record<string, unknown>>) {
    const dto = mapToyAssetRowToRecentDto(row);
    if (dto) recent.push(dto);
  }

  const includeId = parseRecentIncludeAssetId(input.includeAssetId);
  if (!includeId) return recent;

  // Already in the newest window — no second query, no duplicate.
  if (recent.some((row) => row.id.toLowerCase() === includeId.toLowerCase())) {
    return recent;
  }

  const pinned = await getOwnerReadyToyAssetById({
    ownerUserId: input.ownerUserId,
    assetId: includeId,
  });
  return mergeRecentAssetsWithOptionalPin({ recent, pinned });
}
