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
 * Free live results expose a provider raw URL until server watermark bake exists.
 * Download must not treat that URL as a deliverable.
 * Cached demos may still offer open/download (not the user's live output).
 * When PIKBO_T6_FILE_BAKE=1 (operator-proven bake), free live may download.
 */
export function canDownloadResult(opts: {
  demo: boolean;
  watermark: boolean;
}): boolean {
  if (opts.demo) return true;
  if (opts.watermark) {
    // Free live: only when force-ready or watermark worker can bake on download.
    if (process.env.PIKBO_T6_FILE_BAKE === "1") return true;
    if ((process.env.PIKBO_WATERMARK_WORKER_URL || "").startsWith("http")) {
      return true;
    }
    return false;
  }
  return true;
}

export function freeLiveDownloadBlockReason(): string {
  if ((process.env.PIKBO_WATERMARK_WORKER_URL || "").startsWith("http")) {
    return "Free Mini download goes through file watermark bake — if this fails, the worker is down. Upgrade for a clean file.";
  }
  return "Free Mini live clips cannot download the raw provider file yet — player mark is not a file watermark (T6 blocked). Set PIKBO_WATERMARK_WORKER_URL or upgrade for a clean file.";
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
