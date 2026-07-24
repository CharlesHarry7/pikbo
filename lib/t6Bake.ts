/**
 * T6 file watermark bake — call external worker or skip.
 * Worker contract (POST JSON):
 *   { videoUrl: string, text: string, jobId?: string }
 * Response JSON:
 *   { ok: true, bakedUrl: string } | { ok: false, error: string }
 *
 * Worker must return https baked file; do not return raw free provider URLs.
 */

import { isSafeDeliverableUrl } from "@/lib/createTrust";

export type BakeResult =
  | { ok: true; bakedUrl: string; via: "worker" }
  | { ok: false; error: string; code: "NO_WORKER" | "WORKER_FAIL" | "UNSAFE" };

export function watermarkWorkerUrl(): string | null {
  const u = (process.env.PIKBO_WATERMARK_WORKER_URL || "").trim();
  return u.startsWith("http") ? u : null;
}

export async function bakeWatermarkedVideo(input: {
  videoUrl: string;
  text?: string;
  jobId?: string;
}): Promise<BakeResult> {
  const worker = watermarkWorkerUrl();
  if (!worker) {
    return {
      ok: false,
      code: "NO_WORKER",
      error:
        "PIKBO_WATERMARK_WORKER_URL not set — Free live file bake unavailable",
    };
  }
  if (!isSafeDeliverableUrl(input.videoUrl)) {
    return { ok: false, code: "UNSAFE", error: "Source video URL is unsafe" };
  }

  const text =
    input.text?.trim() ||
    process.env.PIKBO_WATERMARK_TEXT?.trim() ||
    "Pikbo Free Mini · pikbo.ai";

  try {
    const res = await fetch(worker, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.PIKBO_WATERMARK_WORKER_SECRET
          ? {
              Authorization: `Bearer ${process.env.PIKBO_WATERMARK_WORKER_SECRET}`,
            }
          : {}),
      },
      body: JSON.stringify({
        videoUrl: input.videoUrl,
        text,
        jobId: input.jobId,
      }),
      signal: AbortSignal.timeout(
        Number(process.env.PIKBO_WATERMARK_TIMEOUT_MS || 120_000)
      ),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      bakedUrl?: string;
      error?: string;
    };
    if (!res.ok || !data.ok || typeof data.bakedUrl !== "string") {
      return {
        ok: false,
        code: "WORKER_FAIL",
        error: data.error || `Worker HTTP ${res.status}`,
      };
    }
    if (!isSafeDeliverableUrl(data.bakedUrl)) {
      return {
        ok: false,
        code: "UNSAFE",
        error: "Worker returned unsafe bakedUrl",
      };
    }
    return { ok: true, bakedUrl: data.bakedUrl, via: "worker" };
  } catch (e) {
    return {
      ok: false,
      code: "WORKER_FAIL",
      error: e instanceof Error ? e.message : "Worker request failed",
    };
  }
}

/** health: bake is ready when worker configured OR operator forced flag */
export function t6BakePipelineConfigured(): boolean {
  return (
    Boolean(watermarkWorkerUrl()) || process.env.PIKBO_T6_FILE_BAKE === "1"
  );
}
