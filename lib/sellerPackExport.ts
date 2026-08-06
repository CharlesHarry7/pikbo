/**
 * Seller Pack export helpers — only include actually available deliverables.
 * No fake ZIP of failed/missing children (Phase F).
 * Multi-download uses per-clip /api/downloads or videoUrl — no server ZIP yet.
 */

import { isControlledClientDownloadUrl } from "@/lib/createTrust";

export type SellerPackExportItem = {
  key: string;
  slug: string;
  label: string;
  status: string;
  videoUrl?: string;
  demo?: boolean;
  watermark?: boolean;
  creditState?: string;
  /** Session ledger / provider request id for controlled download. */
  requestId?: string;
  /** When false, Download is blocked (free live raw). */
  downloadable: boolean;
};

export type SellerPackDownloadTarget = {
  key: string;
  slug: string;
  label: string;
  href: string;
  filename: string;
  via: "downloads_api" | "direct_url";
};

export function filterAvailableDeliverables(
  items: SellerPackExportItem[]
): SellerPackExportItem[] {
  return items.filter(
    (i) =>
      i.status === "succeeded" &&
      i.downloadable &&
      // Gate id alone is enough (DTO videoUrl may be absent/raw).
      // Without requestId, only controlled client URLs (Lab demos / gate path).
      ((typeof i.requestId === "string" && i.requestId.trim().length > 0) ||
        (typeof i.videoUrl === "string" &&
          i.videoUrl.length > 0 &&
          isControlledClientDownloadUrl(i.videoUrl)))
  );
}

/**
 * Prefer session-gated /api/downloads when requestId is known (T6 gate).
 * Without requestId, only Lab demos / controlled gate paths — never raw
 * provider CDN (AIT-294 client fallthrough lock).
 */
export function sellerPackDownloadHref(
  item: Pick<SellerPackExportItem, "requestId" | "videoUrl" | "downloadable" | "status">
): string | null {
  if (item.status !== "succeeded" || !item.downloadable) return null;
  if (typeof item.requestId === "string" && item.requestId.trim()) {
    return `/api/downloads/${encodeURIComponent(item.requestId.trim())}`;
  }
  if (
    typeof item.videoUrl === "string" &&
    item.videoUrl.length > 0 &&
    isControlledClientDownloadUrl(item.videoUrl)
  ) {
    return item.videoUrl;
  }
  return null;
}

/** Available clips with stable filenames for sequential multi-download (no ZIP). */
export function sellerPackAvailableDownloads(
  items: SellerPackExportItem[]
): SellerPackDownloadTarget[] {
  const out: SellerPackDownloadTarget[] = [];
  for (const item of filterAvailableDeliverables(items)) {
    const href = sellerPackDownloadHref(item);
    if (!href) continue;
    const via: SellerPackDownloadTarget["via"] =
      typeof item.requestId === "string" && item.requestId.trim()
        ? "downloads_api"
        : "direct_url";
    const safeKey = (item.key || item.slug || "clip")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .slice(0, 48);
    out.push({
      key: item.key,
      slug: item.slug,
      label: item.label,
      href,
      filename: `pikbo-${safeKey}.mp4`,
      via,
    });
  }
  return out;
}

/** CSV of available clips only. Empty string if none. */
export function sellerPackCsv(items: SellerPackExportItem[]): string {
  const rows = filterAvailableDeliverables(items);
  if (rows.length === 0) return "";
  const header = [
    "key",
    "slug",
    "label",
    "demo",
    "downloadHref",
    "videoUrl",
    "requestId",
    "creditState",
  ].join(",");
  const body = rows.map((r) =>
    [
      r.key,
      r.slug,
      JSON.stringify(r.label),
      r.demo ? "cached" : "live",
      sellerPackDownloadHref(r) || "",
      r.videoUrl,
      r.requestId || "",
      r.creditState || "",
    ].join(",")
  );
  return [header, ...body].join("\n");
}

/** Manifest JSON for support / sequential multi-download (ZIP still needs object storage). */
export function sellerPackManifest(items: SellerPackExportItem[]): {
  version: 1;
  exportedAt: string;
  availableCount: number;
  skippedCount: number;
  downloads: SellerPackDownloadTarget[];
  items: SellerPackExportItem[];
  note: string;
} {
  const available = filterAvailableDeliverables(items);
  const downloads = sellerPackAvailableDownloads(items);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    availableCount: available.length,
    skippedCount: items.length - available.length,
    downloads,
    items: available,
    note:
      "Launch Pack lists only succeeded, downloadable clips. Failed siblings and Free raw URLs are omitted. Use downloads[] for multi-file save; no server ZIP until object storage.",
  };
}

export function canExportSellerPack(items: SellerPackExportItem[]): boolean {
  return filterAvailableDeliverables(items).length > 0;
}
