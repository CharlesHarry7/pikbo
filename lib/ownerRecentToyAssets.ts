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

export function privateToyAssetPreviewPath(assetId: string): string {
  return `/api/assets/${encodeURIComponent(assetId)}/content`;
}

/**
 * List the owner's newest ready verified toy inputs.
 * Newest-first by created_at; only ready state.
 */
export async function listOwnerRecentReadyToyAssets(input: {
  ownerUserId: string;
  limit?: number;
}): Promise<RecentPrivateToyAssetDto[]> {
  if (!input.ownerUserId) return [];
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const limit = clampLimit(input.limit);
  const { data, error } = await admin
    .from("toy_assets")
    .select("id,sku_label,mime_type,size_bytes,created_at,verified_at,state")
    .eq("owner_user_id", input.ownerUserId)
    .eq("state", "ready")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  const items: RecentPrivateToyAssetDto[] = [];
  for (const row of data as Array<Record<string, unknown>>) {
    if (
      typeof row.id !== "string" ||
      !isUuid(row.id) ||
      row.state !== "ready" ||
      !ALLOWED_MIME.has(String(row.mime_type)) ||
      typeof row.size_bytes !== "number" ||
      typeof row.created_at !== "string"
    ) {
      continue;
    }
    items.push({
      id: row.id,
      skuLabel: typeof row.sku_label === "string" ? row.sku_label : null,
      mimeType: row.mime_type as RecentPrivateToyAssetDto["mimeType"],
      sizeBytes: row.size_bytes,
      createdAt: row.created_at,
      verifiedAt: typeof row.verified_at === "string" ? row.verified_at : null,
      previewPath: privateToyAssetPreviewPath(row.id),
    });
  }
  return items;
}
