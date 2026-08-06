/**
 * Video provider seam.
 *
 * The generate route talks to this interface only. Provider SDKs stay behind an
 * implementation so a swap (fal → kie.ai) or a mock cannot reach into the
 * route's reservation, settlement, or privacy logic.
 *
 * Implementations must not settle credits, release reservations, or write
 * Storage. They upload an input image, run one image-to-video job, and return a
 * provider URL plus a request id for reconciliation.
 */

export type VideoProviderId = "fal" | "mock";

/** Server-verified generation input. Never built from client freeform text. */
export type VideoJobInput = {
  /** Provider model endpoint, e.g. bytedance/seedance-2.0/fast/image-to-video */
  model: string;
  prompt: string;
  /** Provider-hosted URL returned by uploadImage. */
  imageUrl: string;
  duration: "4" | "5" | "6" | "7" | "8" | "9" | "10" | "auto";
  aspectRatio: "9:16" | "16:9" | "1:1" | "auto";
  resolution: "480p" | "720p";
  generateAudio: boolean;
  seed?: number;
};

export type VideoJobResult = {
  /**
   * Provider-hosted deliverable URL. The caller is responsible for copying it
   * into private Storage and for rejecting unsafe URLs — a provider URL is
   * never handed to a browser.
   */
  videoUrl: string | null;
  /** Provider request id, truncated to 256 chars for the jobs table. */
  requestId: string | null;
};

export interface VideoProvider {
  readonly id: VideoProviderId;

  /** True when credentials are present. Gates softLive; never implies live. */
  isConfigured(): boolean;

  /** Upload the owner's photo, returning a provider-hosted URL. */
  uploadImage(file: File): Promise<string>;

  /** Run one image-to-video job and wait for the deliverable. */
  runJob(input: VideoJobInput): Promise<VideoJobResult>;
}

/** Shared truncation so every implementation stores the same shape. */
export function normalizeRequestId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed ? trimmed.slice(0, 256) : null;
}
