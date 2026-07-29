/**
 * Video backends for Pikbo.
 * Default: ByteDance Seedance via fal.ai
 *
 * Free / wool path → Mini (cheapest, ~$0.07/s @ 480p)
 * Paid validation  → Fast, 5s, 720p
 *
 * There is no unlimited free i2v API. "Wool" = fal signup credits + Mini.
 */

export const SEEDANCE_MINI =
  "bytedance/seedance-2.0/mini/image-to-video";
export const SEEDANCE_FAST =
  "bytedance/seedance-2.0/fast/image-to-video";
export const SEEDANCE_FULL =
  "bytedance/seedance-2.0/image-to-video";

/** Customer-facing label for either a Pikbo preference id or provider endpoint. */
export function seedanceModelLabel(model?: string | null): string {
  const normalized = model?.trim().toLowerCase() ?? "";
  if (normalized.includes("seedance-2.0/fast") || normalized === "seedance-fast") {
    return "Seedance Fast";
  }
  if (normalized.includes("seedance-2.0/mini") || normalized === "seedance-mini") {
    return "Seedance Mini";
  }
  if (normalized.includes("seedance-2.0") || normalized === "seedance-2") {
    return "Seedance 2.0";
  }
  return model?.trim() || "Seedance";
}

export type ModelPreference =
  | "seedance-2"
  | "seedance-fast"
  | "seedance-mini";

export function modelForTier(opts: {
  freeTier: boolean;
  prefer?: ModelPreference | string | null;
}): string {
  // Free plan: Mini by default (wool / unit economics)
  if (opts.freeTier) {
    return process.env.FAL_MODEL_FREE || SEEDANCE_MINI;
  }
  if (opts.prefer === "seedance-mini") {
    return process.env.FAL_MODEL_FREE || SEEDANCE_MINI;
  }
  if (opts.prefer === "seedance-fast") {
    return process.env.FAL_MODEL_FAST || SEEDANCE_FAST;
  }
  return process.env.FAL_MODEL || SEEDANCE_FULL;
}

/**
 * Authenticated private-live launch path.
 * Pinned to Fast so the P0 single clip and all Launch Pack children share one
 * measured 5s/720p cost envelope. Client preference never selects another
 * paid endpoint.
 */
export function modelForPrivateLive(
  _prefer?: ModelPreference | string | null
): typeof SEEDANCE_FAST {
  void _prefer;
  return SEEDANCE_FAST;
}

export type SeedanceResolution = "480p" | "720p";

/** Live Seller Pack / Launch Pack is pinned to Seedance Fast 720p. */
export const SELLER_PACK_LIVE_MODEL_PREFERENCE: ModelPreference =
  "seedance-fast";
export const SELLER_PACK_LIVE_RESOLUTION: SeedanceResolution = "720p";
export const SELLER_PACK_LIVE_MODEL_ID = "seedance-fast" as const;

export function resolutionForTier(
  freeTier: boolean,
  prefer?: SeedanceResolution | string | null
): SeedanceResolution {
  if (freeTier) return "480p";
  if (prefer === "480p" || prefer === "720p") return prefer;
  return "720p";
}

/** Server-enforced model endpoint for live Seller Pack children. */
export function sellerPackLiveModelEndpoint(): typeof SEEDANCE_FAST {
  return SEEDANCE_FAST;
}

/** fal text-to-image for Image Studio (cheap/fast default). */
export const IMAGE_MODEL =
  process.env.FAL_IMAGE_MODEL || "fal-ai/flux/schnell";

export type AspectRatio = "9:16" | "16:9" | "1:1" | "auto";

export function seedanceDuration(
  seconds: number
): "4" | "5" | "6" | "7" | "8" | "9" | "10" | "auto" {
  if (seconds <= 4) return "4";
  if (seconds <= 5) return "5";
  if (seconds <= 6) return "6";
  if (seconds <= 8) return "8";
  if (seconds <= 10) return "10";
  return "auto";
}

export function clampDuration(n: unknown, fallback = 5): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(10, Math.max(4, Math.round(v)));
}

export function normalizeAspect(
  a: unknown,
  fallback: AspectRatio = "9:16"
): AspectRatio {
  if (a === "9:16" || a === "16:9" || a === "1:1" || a === "auto") return a;
  return fallback;
}
