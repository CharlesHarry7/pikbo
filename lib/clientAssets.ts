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
 * Stable key for owner-bound recent reuse. Null when private capability is
 * closed or the session has no auth id — never load or keep recent state then.
 */
export function privateRecentOwnerKey(input: {
  privateUploadEnabled: boolean;
  ownerUserId?: string | null;
}): string | null {
  if (!input.privateUploadEnabled) return null;
  const id =
    typeof input.ownerUserId === "string" ? input.ownerUserId.trim() : "";
  return id.length > 0 ? id : null;
}

/** How the current Create still was chosen (privacy clear only touches recent). */
export type RecentSelectionSource = "recent" | "upload" | "lab" | "other";

/**
 * Plan state clear when the active owner key changes (A→B or capability off).
 * Only recent-reuse selection is cleared; local new uploads are left alone.
 */
export function planRecentOwnerTransition(input: {
  prevOwnerKey: string | null;
  nextOwnerKey: string | null;
  selectionSource: RecentSelectionSource | null;
}): {
  ownerChanged: boolean;
  clearRecentList: boolean;
  clearRecentThumbs: boolean;
  revokeThumbUrls: boolean;
  clearRecentSelection: boolean;
  bumpLoadGeneration: boolean;
  bumpSelectionToken: boolean;
} {
  const ownerChanged = input.prevOwnerKey !== input.nextOwnerKey;
  if (!ownerChanged) {
    return {
      ownerChanged: false,
      clearRecentList: false,
      clearRecentThumbs: false,
      revokeThumbUrls: false,
      clearRecentSelection: false,
      bumpLoadGeneration: false,
      bumpSelectionToken: false,
    };
  }
  return {
    ownerChanged: true,
    clearRecentList: true,
    clearRecentThumbs: true,
    revokeThumbUrls: true,
    clearRecentSelection: input.selectionSource === "recent",
    bumpLoadGeneration: true,
    bumpSelectionToken: true,
  };
}

/**
 * Render/interaction-time owner binding for recent reuse.
 * Fail-closed: when list/selection owner keys lag behind the current session
 * owner (e.g. A→B before deferred cleanup), no prior-owner assets are
 * visible, clickable, or usable as generate input.
 */
export function deriveRecentReuseUiState<T extends { id: string }>(input: {
  currentOwnerKey: string | null;
  listOwnerKey: string | null;
  assets: T[];
  thumbs: Record<string, string>;
  selectionSource: RecentSelectionSource | null;
  selectionOwnerKey: string | null;
  selectedAssetId: string | null;
  selectedImage: string | null;
  loading: boolean;
}): {
  listMatchesCurrentOwner: boolean;
  visibleAssets: T[];
  visibleThumbs: Record<string, string>;
  showRecentRail: boolean;
  /** Safe for display + generate; null when recent selection is from another owner. */
  effectiveSelectedAssetId: string | null;
  effectiveSelectedImage: string | null;
  canAdoptAssetId: (assetId: string) => boolean;
} {
  const listMatchesCurrentOwner =
    input.currentOwnerKey != null &&
    input.listOwnerKey === input.currentOwnerKey;
  const visibleAssets = listMatchesCurrentOwner ? input.assets : [];
  const visibleThumbs = listMatchesCurrentOwner ? input.thumbs : {};
  const showRecentRail =
    listMatchesCurrentOwner &&
    (input.loading || visibleAssets.length > 0);

  const recentSelectionMatches =
    input.selectionSource === "recent" &&
    input.selectionOwnerKey != null &&
    input.selectionOwnerKey === input.currentOwnerKey;

  // Local upload / Lab pass through. Recent reuse is blanked while owner-mismatched.
  let effectiveSelectedAssetId = input.selectedAssetId;
  let effectiveSelectedImage = input.selectedImage;
  if (input.selectionSource === "recent" && !recentSelectionMatches) {
    effectiveSelectedAssetId = null;
    effectiveSelectedImage = null;
  }

  const visibleIds = new Set(visibleAssets.map((a) => a.id));
  return {
    listMatchesCurrentOwner,
    visibleAssets,
    visibleThumbs,
    showRecentRail,
    effectiveSelectedAssetId,
    effectiveSelectedImage,
    canAdoptAssetId: (assetId: string) =>
      listMatchesCurrentOwner &&
      typeof assetId === "string" &&
      assetId.length > 0 &&
      visibleIds.has(assetId),
  };
}

/** Accept a recent-list async result only for the still-active owner + generation. */
export function shouldCommitRecentList(input: {
  requestOwnerKey: string;
  currentOwnerKey: string | null;
  requestGeneration: number;
  currentGeneration: number;
}): boolean {
  return (
    typeof input.requestOwnerKey === "string" &&
    input.requestOwnerKey.length > 0 &&
    input.currentOwnerKey === input.requestOwnerKey &&
    input.requestGeneration === input.currentGeneration
  );
}

/**
 * Accept a selected-asset preview only when owner + assetId + selection token
 * still match (blocks A→B out-of-order preview completion).
 */
export function shouldCommitRecentPreview(input: {
  requestOwnerKey: string;
  currentOwnerKey: string | null;
  requestAssetId: string;
  currentAssetId: string | null;
  requestSelectionToken: number;
  currentSelectionToken: number;
}): boolean {
  return (
    typeof input.requestOwnerKey === "string" &&
    input.requestOwnerKey.length > 0 &&
    input.currentOwnerKey === input.requestOwnerKey &&
    input.currentAssetId === input.requestAssetId &&
    input.requestSelectionToken === input.currentSelectionToken
  );
}

/**
 * Load recent assets, then commit only if the owner/generation is still current.
 * Used by Create and by executable race regressions.
 */
export async function applyRecentListLoad<T>(input: {
  requestOwnerKey: string;
  requestGeneration: number;
  getCurrent: () => { ownerKey: string | null; generation: number };
  load: () => Promise<T>;
  onCommit: (assets: T) => void;
}): Promise<"committed" | "stale"> {
  const assets = await input.load();
  const cur = input.getCurrent();
  if (
    !shouldCommitRecentList({
      requestOwnerKey: input.requestOwnerKey,
      currentOwnerKey: cur.ownerKey,
      requestGeneration: input.requestGeneration,
      currentGeneration: cur.generation,
    })
  ) {
    return "stale";
  }
  input.onCommit(assets);
  return "committed";
}

/**
 * Resolve a recent-asset preview, then commit only if selection is still current.
 */
export async function applyRecentPreviewResolution(input: {
  requestOwnerKey: string;
  requestAssetId: string;
  requestSelectionToken: number;
  getCurrent: () => {
    ownerKey: string | null;
    assetId: string | null;
    selectionToken: number;
  };
  resolvePreview: () => Promise<string | null>;
  onCommit: (previewUrl: string) => void;
}): Promise<"committed" | "stale" | "empty"> {
  const previewUrl = await input.resolvePreview();
  const cur = input.getCurrent();
  if (
    !shouldCommitRecentPreview({
      requestOwnerKey: input.requestOwnerKey,
      currentOwnerKey: cur.ownerKey,
      requestAssetId: input.requestAssetId,
      currentAssetId: cur.assetId,
      requestSelectionToken: input.requestSelectionToken,
      currentSelectionToken: cur.selectionToken,
    })
  ) {
    return "stale";
  }
  if (!previewUrl) return "empty";
  input.onCommit(previewUrl);
  return "committed";
}

/**
 * Stable Create query parameter for a failed job's durable `input_asset_id`.
 * Handoff is owner-safe: Create auto-selects only after this id appears in the
 * current owner's ready recent-assets list — never from the query string alone.
 */
export const CREATE_RETRY_ASSET_ID_QUERY = "assetId";

const DURABLE_TOY_ASSET_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Parse Create `?assetId=` for durable retry handoff.
 * Accepts only UUID-shaped durable ids; rejects empty, local `asset_*`, or junk.
 */
export function parseCreateRetryAssetIdQuery(
  raw: string | null | undefined
): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value || !DURABLE_TOY_ASSET_ID_RE.test(value)) return null;
  return value;
}

export type CreateQueryAssetHandoffPlan =
  | { action: "wait" }
  | { action: "adopt"; assetId: string }
  | {
      action: "drop";
      reason:
        | "invalid"
        | "no-owner"
        | "not-in-ready-list"
        | "user-override"
        | "already-settled"
        | "already-selected";
    };

/**
 * Decide whether Create may auto-select a durable query `assetId`.
 *
 * Fail-closed rules:
 * - Never adopt a query id that is absent from the current owner's ready list.
 * - Explicit upload / Lab / manual recent selection wins over deferred handoff.
 * - Wait while the owner-bound recent list is still loading or mid owner-switch.
 */
export function planCreateQueryAssetHandoff(input: {
  queryAssetId: string | null;
  handoffSettled: boolean;
  /** True once the user explicitly uploaded, chose Lab, or picked recent manually. */
  userOverride: boolean;
  currentOwnerKey: string | null;
  listOwnerKey: string | null;
  readyAssets: ReadonlyArray<{ id: string }>;
  listLoading: boolean;
  selectionSource: RecentSelectionSource | null;
  selectedAssetId: string | null;
}): CreateQueryAssetHandoffPlan {
  if (input.handoffSettled) {
    return { action: "drop", reason: "already-settled" };
  }
  if (!input.queryAssetId) {
    return { action: "drop", reason: "invalid" };
  }
  if (input.userOverride) {
    return { action: "drop", reason: "user-override" };
  }
  // Non-recent selection always outranks deferred query auto-select.
  if (
    input.selectionSource === "upload" ||
    input.selectionSource === "lab" ||
    input.selectionSource === "other"
  ) {
    return { action: "drop", reason: "user-override" };
  }
  if (
    input.selectionSource === "recent" &&
    typeof input.selectedAssetId === "string" &&
    input.selectedAssetId.length > 0
  ) {
    if (
      input.selectedAssetId.toLowerCase() === input.queryAssetId.toLowerCase()
    ) {
      return { action: "drop", reason: "already-selected" };
    }
    // Manual recent pick of a different asset wins.
    return { action: "drop", reason: "user-override" };
  }
  if (!input.currentOwnerKey) {
    return { action: "drop", reason: "no-owner" };
  }
  if (input.listLoading) {
    return { action: "wait" };
  }
  // List not yet bound to this owner: wait while a transition may still load;
  // if list is idle and unbound after load cycle, treat as not ready.
  if (input.listOwnerKey !== input.currentOwnerKey) {
    if (input.listOwnerKey == null) {
      return { action: "drop", reason: "not-in-ready-list" };
    }
    return { action: "wait" };
  }
  const target = input.queryAssetId.toLowerCase();
  const match = input.readyAssets.find(
    (row) =>
      typeof row?.id === "string" && row.id.toLowerCase() === target
  );
  if (!match) {
    return { action: "drop", reason: "not-in-ready-list" };
  }
  return { action: "adopt", assetId: match.id };
}

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
