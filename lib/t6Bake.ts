/**
 * Legacy download-time bake adapter — intentionally fail-closed.
 *
 * T6 v1 must be a server-owned job/output pipeline, not an HTTP relay that
 * accepts a provider URL at download time. Keep this compatibility export so
 * older imports cannot accidentally re-enable a raw-provider fallback.
 */

export type BakeResult =
  | { ok: true; bakedUrl: string; via: "owned-derivative" }
  | {
      ok: false;
      error: string;
      code: "SERVER_WORKER_DISABLED" | "UNSAFE";
    };

export function watermarkWorkerUrl(): string | null {
  // External worker URLs are not a readiness signal and are never invoked.
  return null;
}

export async function bakeWatermarkedVideo(_input: {
  videoUrl: string;
  text?: string;
  jobId?: string;
}): Promise<BakeResult> {
  void _input;
  return {
    ok: false,
    code: "SERVER_WORKER_DISABLED",
    error:
      "Download-time watermark relaying is disabled. A verified server-owned T6 derivative is required.",
  };
}

export function t6BakePipelineConfigured(): boolean {
  return false;
}
