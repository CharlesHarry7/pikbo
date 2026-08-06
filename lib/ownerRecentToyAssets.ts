/**
 * Owner-only ready private toy inputs for Create same-photo handoff / reuse.
 * Safe list DTOs only — never returns object keys, SHA, signed URLs, or owner identity.
 */

import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  clampRecentLimit,
  mapToyAssetRowToRecentDto,
  mergeRecentAssetsWithOptionalPin,
  parseRecentIncludeAssetId,
  privateToyAssetPreviewPath,
  RECENT_PRIVATE_TOY_ASSETS_DEFAULT_LIMIT,
  RECENT_PRIVATE_TOY_ASSETS_MAX_LIMIT,
} from "@/lib/ownerRecentToyAssetsPure.mjs";

export {
  mapToyAssetRowToRecentDto,
  mergeRecentAssetsWithOptionalPin,
  parseRecentIncludeAssetId,
  privateToyAssetPreviewPath,
  RECENT_PRIVATE_TOY_ASSETS_DEFAULT_LIMIT,
  RECENT_PRIVATE_TOY_ASSETS_MAX_LIMIT,
} from "@/lib/ownerRecentToyAssetsPure.mjs";

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
  return mapToyAssetRowToRecentDto(
    data as Record<string, unknown>
  ) as RecentPrivateToyAssetDto | null;
}

/**
 * List the owner's newest ready verified toy inputs.
 * Optional includeAssetId is proven with the same owner+ready filters and
 * pinned once when outside the recent window.
 */
export async function listOwnerRecentReadyToyAssets(input: {
  ownerUserId: string;
  limit?: number;
  includeAssetId?: string | null;
}): Promise<RecentPrivateToyAssetDto[]> {
  if (!input.ownerUserId) return [];
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const limit = clampRecentLimit(input.limit);
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
    const dto = mapToyAssetRowToRecentDto(row) as RecentPrivateToyAssetDto | null;
    if (dto) recent.push(dto);
  }

  const includeId = parseRecentIncludeAssetId(input.includeAssetId);
  if (!includeId) return recent;

  if (recent.some((row) => row.id.toLowerCase() === includeId.toLowerCase())) {
    return recent;
  }

  const pinned = await getOwnerReadyToyAssetById({
    ownerUserId: input.ownerUserId,
    assetId: includeId,
  });
  return mergeRecentAssetsWithOptionalPin({
    recent,
    pinned,
  }) as RecentPrivateToyAssetDto[];
}
