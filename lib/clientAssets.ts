/** Browser helper for the authenticated private toy-input flow. */

import { privateDownloadHeaders } from "@/lib/history";

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

/** Safe recent-asset list row from GET /api/assets/recent. */
export type RecentPrivateToyAsset = {
  id: string;
  skuLabel: string | null;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  verifiedAt: string | null;
  previewPath: string;
};

/**
 * Load the signed-in owner's newest ready private toy photos.
 * Call only when private upload capability is already open on the client.
 */
export async function fetchRecentPrivateToyAssets(opts?: {
  limit?: number;
  signal?: AbortSignal;
}): Promise<RecentPrivateToyAsset[]> {
  try {
    const auth = await privateDownloadHeaders();
    if (!auth.Authorization) return [];
    const limit =
      typeof opts?.limit === "number" && Number.isFinite(opts.limit)
        ? Math.min(12, Math.max(1, Math.floor(opts.limit)))
        : 8;
    const res = await fetch(`/api/assets/recent?limit=${limit}`, {
      method: "GET",
      headers: { ...auth },
      cache: "no-store",
      signal: opts?.signal,
    });
    if (!res.ok) return [];
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      assets?: RecentPrivateToyAsset[];
    };
    if (!body.ok || !Array.isArray(body.assets)) return [];
    return body.assets.filter(
      (row) =>
        typeof row?.id === "string" &&
        typeof row?.previewPath === "string" &&
        row.previewPath.startsWith("/api/assets/") &&
        !row.previewPath.includes("://")
    );
  } catch {
    return [];
  }
}

/**
 * Resolve a controlled relative preview path into a short-lived display URL.
 * Uses owner Bearer auth; does not re-upload or invent Base64 for generate.
 * Caller should revokeObjectURL when replacing the still.
 */
export async function resolvePrivateToyAssetPreviewUrl(
  previewPath: string,
  opts?: { signal?: AbortSignal }
): Promise<string | null> {
  if (
    typeof previewPath !== "string" ||
    !previewPath.startsWith("/api/assets/") ||
    previewPath.includes("://")
  ) {
    return null;
  }
  try {
    const auth = await privateDownloadHeaders();
    if (!auth.Authorization) return null;
    const res = await fetch(previewPath, {
      method: "GET",
      headers: { ...auth },
      redirect: "follow",
      cache: "no-store",
      signal: opts?.signal,
    });
    if (!res.ok) return null;
    // Prefer the final signed Location after redirect; fall back to blob.
    if (res.url && res.url.startsWith("https://") && res.url !== previewPath) {
      return res.url;
    }
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function registerPrivateToyAsset(
  dataUrl: string,
  skuLabel?: string
): Promise<{ assetId: string } | null> {
  if (!dataUrl.startsWith("data:image")) return null;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const bytes = await blob.arrayBuffer();
    const sha256 = hex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
    const normalizedSkuLabel = skuLabel?.trim() || "";
    const clientKeyBytes = new TextEncoder().encode(
      JSON.stringify([sha256, blob.type.toLowerCase(), blob.size, normalizedSkuLabel])
    );
    const clientAssetKey = `input:${hex(
      new Uint8Array(await crypto.subtle.digest("SHA-256", clientKeyBytes))
    )}`;
    const auth = await privateDownloadHeaders();
    const prep = await fetch("/api/assets/upload-url", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "toy-input",
        mimeType: blob.type,
        sizeBytes: blob.size,
        sha256,
        clientAssetKey,
        skuLabel: normalizedSkuLabel || undefined,
      }),
    });
    const prepared = (await prep.json().catch(() => ({}))) as {
      ok?: boolean;
      assetId?: string;
      inputAssetId?: string;
      uploadUrl?: string | null;
      state?: "pending" | "ready";
      idempotent?: boolean;
    };
    const assetId = prepared.inputAssetId || prepared.assetId;
    if (
      !prep.ok ||
      !prepared.ok ||
      !assetId ||
      (prepared.state !== "pending" && prepared.state !== "ready")
    ) return null;
    if (prepared.state === "pending") {
      if (!prepared.uploadUrl) return null;
      const uploadBody = new FormData();
      uploadBody.append("cacheControl", "3600");
      uploadBody.append("", blob);
      try {
        await fetch(prepared.uploadUrl, {
          method: "PUT",
          headers: { "x-upsert": "false" },
          body: uploadBody,
        });
      } catch {
        // A lost upload response is ambiguous: Storage may already have
        // committed the object. The owner-scoped completion endpoint is the
        // byte/hash/MIME authority and safely distinguishes that from absence.
      }
    }
    const complete = await fetch("/api/assets/complete", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ assetId }),
    });
    const completed = (await complete.json().catch(() => ({}))) as {
      ok?: boolean;
      inputAssetId?: string;
      asset?: { id?: string; state?: string };
    };
    if (
      !complete.ok ||
      !completed.ok ||
      (completed.inputAssetId || completed.asset?.id) !== assetId ||
      completed.asset?.state !== "ready"
    ) {
      return null;
    }
    return { assetId };
  } catch {
    return null;
  }
}

/** Compatibility name used by current Create surfaces. It is durable now. */
export async function registerLocalAsset(
  dataUrl: string
): Promise<{ assetId: string } | null> {
  return registerPrivateToyAsset(dataUrl);
}
