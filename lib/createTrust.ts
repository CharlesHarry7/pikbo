/**
 * Wave B — pure helpers for Create credit settlement, retry specs, free download gate.
 * Kept free of React so engine-smoke can assert honesty without a browser.
 */

import { CREDITS_PER_VIDEO } from "@/lib/pricing";

/** Settlement of the most recent generate attempt (not a historical version). */
export type RequestCreditState =
  | "0 cached"
  | "10 used"
  | "10 restored"
  | "refund unconfirmed"
  | null;

/** Immutable params that produced a successful version (Retry must reuse these). */
export type GenerationSpec = {
  /**
   * Session source-store key (preferred). Resolves to the still without
   * duplicating multi-MB Base64 across every version.
   */
  sourceKey: string;
  /**
   * Phase D local asset id for the still that produced this success.
   * Retry may use it only when the interned still is missing from memory —
   * never substitute the composer's *current* asset after a re-upload.
   */
  assetId?: string;
  /**
   * @deprecated Prefer sourceKey + session source store. Kept optional only so
   * older in-memory stacks from a long session still typecheck.
   */
  image?: string;
  effect: string;
  extra: string;
  aspectRatio: "9:16" | "16:9" | "1:1" | string;
  duration: number;
  resolution: string;
  model: string;
  seed?: number;
  /** Server requestId when the live job returned one. */
  requestId?: string;
};

/**
 * Decide which still to POST for a generate attempt.
 * Retry freezes the version's still — never the composer's latest re-upload.
 *
 * `image` may still be present in `asset` mode so the client can intern the
 * still / write Library history without re-downloading the asset.
 * POST body should send assetId only when mode is asset|retry-asset.
 */
export function resolveGenerateStill(input: {
  retry?: GenerationSpec | null;
  sourceStore: Record<string, string>;
  imageOverride?: string | null;
  /** Current composer still (data URL). */
  image?: string | null;
  /** Current composer Phase D asset id. */
  assetId?: string | null;
}): {
  /** Local still for interning / history (may be set even when POSTing assetId). */
  image?: string;
  assetId?: string;
  /** What the generate POST should prefer. */
  mode: "retry-still" | "retry-asset" | "asset" | "image" | "none";
} {
  const retry = input.retry ?? null;
  if (retry) {
    const frozen = resolveSpecImage(retry, input.sourceStore);
    if (frozen) {
      // Always post the frozen still — never ambient composer assetId.
      return { image: frozen, mode: "retry-still" };
    }
    if (retry.assetId) {
      return { assetId: retry.assetId, mode: "retry-asset" };
    }
    return { mode: "none" };
  }
  if (input.imageOverride) {
    return { image: input.imageOverride, mode: "image" };
  }
  if (input.assetId) {
    return {
      assetId: input.assetId,
      image: input.image || undefined,
      mode: "asset",
    };
  }
  if (input.image) {
    return { image: input.image, mode: "image" };
  }
  return { mode: "none" };
}

/** FNV-1a style key for interning large stills in a session Map. */
export function sourceImageKey(image: string): string {
  let hash = 2166136261;
  const sample = image.length > 8192 ? image.slice(0, 4096) + image.slice(-4096) : image;
  for (let i = 0; i < sample.length; i += 1) {
    hash ^= sample.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `src-${image.length.toString(36)}-${(hash >>> 0).toString(36)}`;
}

/**
 * Intern a still into a session store so 8 versions of the same photo share
 * one Base64 string in memory.
 */
export function internSourceImage(
  store: Record<string, string>,
  image: string
): { key: string; store: Record<string, string> } {
  const key = sourceImageKey(image);
  if (store[key] === image) return { key, store };
  if (store[key]) return { key, store };
  return { key, store: { ...store, [key]: image } };
}

export function resolveSpecImage(
  spec: GenerationSpec,
  store: Record<string, string>
): string | null {
  if (spec.sourceKey && store[spec.sourceKey]) return store[spec.sourceKey];
  if (typeof spec.image === "string" && spec.image) return spec.image;
  return null;
}

/**
 * Map a failed generate result to the request settlement chip.
 * Confirmed refund → restored; kill/network/ledger timeout → unconfirmed;
 * validation / 402 before debit → null (do not claim refund).
 */
export function requestCreditStateFromFailure(result: {
  creditsRefunded?: boolean;
  /** Server ledger timeout / kill mid-flight — never claim restored. */
  refundUnconfirmed?: boolean;
  status: number;
  /** Client/server error codes (NETWORK_ERROR · REQUEST_CANCELED · TIMEOUT · …) */
  code?: string;
}): Exclude<RequestCreditState, "0 cached" | "10 used"> {
  if (result.creditsRefunded === true) return "10 restored";
  if (
    result.refundUnconfirmed === true ||
    result.status === 0 ||
    result.code === "NETWORK_ERROR" ||
    result.code === "REQUEST_CANCELED" ||
    // Process-memory ledger TIMEOUT (kill mid-flight) — never claim restored.
    result.code === "TIMEOUT"
  ) {
    return "refund unconfirmed";
  }
  return null;
}

/** Success path settlement for the last request. */
export function requestCreditStateFromSuccess(demo: boolean): "0 cached" | "10 used" {
  return demo ? "0 cached" : "10 used";
}

/**
 * After a failure, keep showing prior versions — but never let a version's
 * used/cached chip overwrite the last request settlement.
 */
export function preserveRequestSettlementOnVersionRestore(
  lastRequest: RequestCreditState,
  _versionCredit: "0 cached" | "10 used"
): RequestCreditState {
  void _versionCredit;
  return lastRequest;
}

/**
 * Selecting a historical version must not wipe the last failed settlement.
 */
export function requestSettlementAfterSelectVersion(
  lastRequest: RequestCreditState
): RequestCreditState {
  return lastRequest;
}

/**
 * Free live provider raw URLs must never be customer-facing deliverables.
 * Cached demos may still offer open/download (not the user's live output).
 * A Free live file may download only after its own verified, locally owned
 * baked derivative is attached by the server worker. No env flag can bypass it.
 */
export function canDownloadResult(opts: {
  demo: boolean;
  watermark: boolean;
  bakedDerivativeVerified?: boolean;
}): boolean {
  if (opts.demo) return true;
  if (opts.watermark) {
    return opts.bakedDerivativeVerified === true;
  }
  return true;
}

export function freeLiveDownloadBlockReason(): string {
  return "Free Mini live clips cannot expose or download the raw provider file. A verified server-owned baked derivative is required (T6 blocked).";
}

/**
 * Phase F result metadata — honest download policy label (Create + Landing).
 * Never say "allowed" for Free live raw; never claim bake ready without canDownload.
 */
export function downloadPolicyLabel(opts: {
  demo: boolean;
  downloadAllowed: boolean;
}): string {
  if (opts.demo) return "Demo open · Lab";
  if (opts.downloadAllowed) return "Allowed";
  return "Held for T6 bake · Free raw blocked";
}

/** Primary download CTA label when the action is blocked. */
export function downloadBlockedCtaLabel(opts: {
  downloadAllowed: boolean;
  unsafeUrl?: boolean;
}): string {
  if (opts.downloadAllowed && opts.unsafeUrl) {
    return "Download blocked · unsafe URL";
  }
  return "Download held · T6 bake";
}

/**
 * Customer-facing video URL for generate success / idempotent replay.
 * Free live never echoes the provider raw URL — only a controlled downloads
 * path that re-checks T6 ownership. Demos and paid raw keep their URL.
 */
export function customerFacingGenerateVideoUrl(opts: {
  demo: boolean;
  watermark: boolean;
  jobId: string;
  /** Server-held provider or demo URL (never trust client). */
  videoUrl: string;
}): string {
  if (opts.demo || !opts.watermark) return opts.videoUrl;
  const id = (opts.jobId || "").trim();
  if (!id) return `/api/downloads/unavailable`;
  return `/api/downloads/${encodeURIComponent(id)}`;
}

/**
 * Whether a result URL is safe to mount in a <video> element.
 * Free live controlled download paths return 403 JSON until T6 bake unlocks —
 * do not treat them as playable media.
 */
export function isPlayableResultVideoUrl(opts: {
  videoUrl: string | null | undefined;
  demo: boolean;
  watermark: boolean;
}): boolean {
  if (!opts.videoUrl || !isSafeDeliverableUrl(opts.videoUrl)) return false;
  if (opts.demo || !opts.watermark) return true;
  if (opts.videoUrl.startsWith("/api/downloads/")) return false;
  // Defense: never mount free live absolute provider URLs as durable media.
  return false;
}

/**
 * Community UGC must be a public absolute http(s) media URL.
 * Controlled Free download endpoints and app-relative paths are not public.
 */
export function isPublicCommunityVideoUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  if (!t || t.length > 2000) return false;
  // Free T6 gate path is session-owned, not a public Community deliverable.
  if (t.startsWith("/api/downloads/") || t.includes("/api/downloads/")) {
    return false;
  }
  // Relative paths (including /demos Lab clips) stay off Community UGC.
  if (t.startsWith("/") || t.startsWith("//")) return false;
  try {
    const u = new URL(t);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (!u.hostname || u.username || u.password) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe redirect targets for /api/downloads — relative same-origin paths or http(s).
 * Rejects javascript:/data:/protocol-relative //open-redirect tricks.
 */
export function isSafeDeliverableUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  if (!t || t.length > 2000) return false;
  // Same-origin demo / static paths only (no //evil.com protocol-relative).
  if (t.startsWith("/") && !t.startsWith("//")) {
    return !t.includes("\\") && !/^\/\//.test(t);
  }
  try {
    const u = new URL(t);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    // Block credentials-in-url oddities and empty hosts.
    if (!u.hostname || u.username || u.password) return false;
    return true;
  } catch {
    return false;
  }
}

/** Build immutable spec snapshot at success time. */
export function buildGenerationSpec(input: {
  sourceKey: string;
  assetId?: string;
  effect: string;
  extra: string;
  aspectRatio: string;
  duration: number;
  resolution: string;
  model: string;
  seed?: number;
  requestId?: string;
}): GenerationSpec {
  return {
    sourceKey: input.sourceKey,
    assetId: input.assetId,
    effect: input.effect,
    extra: input.extra,
    aspectRatio: input.aspectRatio,
    duration: input.duration,
    resolution: input.resolution,
    model: input.model,
    seed: input.seed,
    requestId: input.requestId,
  };
}

/** Server-echoed credit cost for honesty metadata. */
export function serverCostCredits(demo: boolean): number {
  return demo ? 0 : CREDITS_PER_VIDEO;
}
