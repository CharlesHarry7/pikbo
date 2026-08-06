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
 * Error codes that imply debit ambiguity after a live attempt.
 * Shared by client FailPanel + process-memory job ledgers (generate/image).
 * Confirmed restore always wins via creditsRefunded.
 */
export function isAmbiguousDebitFailureCode(code?: string | null): boolean {
  if (!code) return false;
  return (
    code === "NETWORK_ERROR" ||
    code === "PROVIDER_NETWORK" ||
    code === "REQUEST_CANCELED" ||
    code === "CANCELED" ||
    code === "TIMEOUT" ||
    code === "PROVIDER_TIMEOUT" ||
    code === "UNSAFE_URL" ||
    code === "CONTENT_POLICY" ||
    code === "MODEL_EMPTY"
  );
}

/**
 * Process-memory fail ledger settlement (generate + image parity).
 * Confirmed restore → "10 restored"; ambiguous debit → "refund unconfirmed";
 * validation/pre-debit fails leave outcome undefined (do not invent refund).
 */
export function failedLedgerCreditsOutcome(opts: {
  creditsRefunded?: boolean;
  refundUnconfirmed?: boolean;
  errorCode?: string | null;
}): "10 restored" | "refund unconfirmed" | undefined {
  if (opts.creditsRefunded === true) return "10 restored";
  if (
    opts.refundUnconfirmed === true ||
    isAmbiguousDebitFailureCode(opts.errorCode)
  ) {
    return "refund unconfirmed";
  }
  return undefined;
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
    isAmbiguousDebitFailureCode(result.code)
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
 * Classify HEAD /api/downloads/{id} for honest client toasts.
 * Pure — shared by Create / Landing / Library / history (Phase D gate honesty).
 */
export type DownloadHeadGate =
  | { kind: "allow" }
  | { kind: "block"; message: string }
  | { kind: "not_found"; message: string }
  | { kind: "unknown" };

export function classifyDownloadHead(opts: {
  status: number;
  code?: string | null;
  t6Mode?: string | null;
}): DownloadHeadGate {
  const code = (opts.code || "").trim();
  const status = opts.status;
  if (status === 403 || code === "DOWNLOAD_BLOCKED") {
    return {
      kind: "block",
      message:
        opts.t6Mode === "bake_on_download"
          ? "Free Mini needs watermark bake — worker may be down. Upgrade for a clean file."
          : freeLiveDownloadBlockReason(),
    };
  }
  // Durable UUID deny is uniform 404 NOT_FOUND (unauth/foreign/missing).
  // Legacy AUTH_REQUIRED / 401 on the same gate maps to the same client path.
  if (
    status === 404 ||
    code === "NOT_FOUND" ||
    status === 401 ||
    code === "AUTH_REQUIRED"
  ) {
    return {
      kind: "not_found",
      message:
        "Download not found for this account — try remake or open Library recovery",
    };
  }
  if (code === "CANCELED" || code === "REQUEST_CANCELED") {
    return {
      kind: "block",
      message:
        "Job canceled — no file. Check balance if live debit is unconfirmed.",
    };
  }
  if (code === "JOB_IN_FLIGHT") {
    return {
      kind: "block",
      message: "Still generating — download unlocks after success",
    };
  }
  if (code === "TIMEOUT" || code === "PROVIDER_TIMEOUT" || status === 504) {
    return {
      kind: "block",
      message:
        "Job timed out — no file. Check balance (refund may be unconfirmed).",
    };
  }
  // Terminal fail codes must run BEFORE generic 409/NOT_READY — downloads gate
  // returns 409 for most failed jobs, which used to toast "not ready" dishonestly.
  if (code === "PROVIDER_NETWORK") {
    return {
      kind: "block",
      message:
        "Provider network failed — no file. Check balance (refund may be unconfirmed).",
    };
  }
  if (code === "CONTENT_POLICY") {
    return {
      kind: "block",
      message:
        "Provider rejected content — no file. Check balance if debit is unconfirmed.",
    };
  }
  if (code === "MODEL_EMPTY") {
    return {
      kind: "block",
      message:
        "Provider returned empty media — no file. Check balance if debit is unconfirmed.",
    };
  }
  if (code === "PROVIDER_RATE_LIMIT" || code === "RATE_LIMITED") {
    return {
      kind: "block",
      message:
        "Rate limited mid-job — no file yet. Wait and Retry; check balance if debit is unconfirmed.",
    };
  }
  if (code === "PROVIDER_BALANCE") {
    return {
      kind: "block",
      message:
        "Upstream provider balance empty — no file. Credits restore when the debit was confirmed.",
    };
  }
  if (status === 422 || code === "UNSAFE_URL") {
    return {
      kind: "block",
      message: "Unsafe deliverable URL — download blocked",
    };
  }
  if (
    code === "GENERATION_FAILED" ||
    isAmbiguousDebitFailureCode(code)
  ) {
    return {
      kind: "block",
      message:
        "Job failed — no deliverable. Check balance if refund is unconfirmed.",
    };
  }
  if (status === 409 || code === "NOT_READY") {
    return {
      kind: "block",
      message: "Deliverable not ready yet — refresh or remake",
    };
  }
  if (status >= 200 && status < 300) {
    return { kind: "allow" };
  }
  return { kind: "unknown" };
}

/**
 * Action-oriented view of classifyDownloadHead for Library / Create / Landing.
 * allow | block | fallthrough (404 / process-memory miss).
 */
export type DownloadHeadDecision =
  | { action: "allow" }
  | { action: "block"; code: string; toast: string }
  | { action: "fallthrough"; code: string; toast?: string };

export function interpretDownloadHead(input: {
  status: number;
  code?: string | null;
  t6Mode?: string | null;
}): DownloadHeadDecision {
  const code = (input.code || "").trim();
  const gate = classifyDownloadHead({
    status: input.status,
    code,
    t6Mode: input.t6Mode,
  });
  if (gate.kind === "allow") return { action: "allow" };
  if (gate.kind === "not_found") {
    return {
      action: "fallthrough",
      code: code || "NOT_FOUND",
      toast: gate.message,
    };
  }
  if (gate.kind === "block") {
    return {
      action: "block",
      code: code || "BLOCKED",
      toast: gate.message,
    };
  }
  return {
    action: "block",
    code: code || `HTTP_${input.status}`,
    toast: "Download gate refused — try again or remake",
  };
}

/**
 * Customer-facing video URL for generate success / idempotent replay.
 * Live never echoes a provider raw URL — every plan uses a controlled,
 * owner-scoped download path. Only immutable on-site demos keep their URL.
 */
export function customerFacingGenerateVideoUrl(opts: {
  demo: boolean;
  watermark: boolean;
  jobId: string;
  /** Server-held provider or demo URL (never trust client). */
  videoUrl: string;
}): string {
  if (opts.demo) return opts.videoUrl;
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
 * Session-owned /api/downloads gate — cookie-bound, not a public share link.
 * Copy/Share must not present these as portable media URLs.
 */
export function isSessionGatedDownloadUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  return t.startsWith("/api/downloads/") || t.includes("/api/downloads/");
}

/**
 * Absolute URL safe for clipboard / X share.
 * Soft-launch honesty (AIT-308): only Lab demos are portable public links.
 * Never mint a share URL from session gates, private signed storage, or
 * raw provider CDN (durable UUID Moments use Download, not Copy/Share).
 */
export function publicShareableVideoUrl(
  url: string,
  origin?: string
): string | null {
  if (!url || typeof url !== "string") return null;
  const t = url.trim();
  if (!isSafeDeliverableUrl(t)) return null;
  if (isSessionGatedDownloadUrl(t)) return null;
  // Lab demos only — no path traversal; never absolute https (signed/CDN).
  if (
    !(t.startsWith("/demos/") && !t.includes("..") && !t.includes("\\"))
  ) {
    return null;
  }
  const o = (origin || "").replace(/\/$/, "");
  if (!o || !/^https?:\/\//i.test(o)) return null;
  return `${o}${t}`;
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
  if (isSessionGatedDownloadUrl(t)) {
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

/**
 * Durable private job ids (UUID) use the owner-scoped /api/downloads gate.
 * Process-memory jobs use non-UUID ids (`job_…`).
 */
export function isDurableDownloadRequestId(id: string | null | undefined): boolean {
  if (!id || typeof id !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id.trim()
  );
}

/**
 * Client blob / open download allowlist after gate deny or without a gate id.
 * Never follow raw provider CDN / storage signed HTTPS — only:
 * - same-origin Lab demos (`/demos/*`)
 * - controlled session gate (`/api/downloads/*`)
 *
 * `isSafeDeliverableUrl` stays broader for server redirect targets and play
 * mounts; client fallthrough must use this stricter gate.
 */
export function isControlledClientDownloadUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  if (!isSafeDeliverableUrl(t)) return false;
  // Lab demos only — no path traversal / backslash tricks.
  if (t.startsWith("/demos/") && !t.includes("..") && !t.includes("\\")) {
    return true;
  }
  // Controlled owner/session gate path (relative or absolute same app).
  if (isSessionGatedDownloadUrl(t)) return true;
  return false;
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
