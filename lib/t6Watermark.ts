/**
 * T6 — protected Free deliverables (file watermark bake).
 *
 * Honest status only. Player CSS overlay is NOT a file watermark.
 * Free live raw provider URLs stay undownloadable unless:
 *   - PIKBO_WATERMARK_WORKER_URL bake succeeds on download, or
 *   - PIKBO_T6_FILE_BAKE=1 after operator proves pipeline (force).
 */

export type T6Status = "blocked" | "ready" | "worker_configured";

export type T6Report = {
  status: T6Status;
  /** Never claim done without a verified baked file pipeline. */
  fileBake: false | true;
  playerOverlayIsNotFileWatermark: true;
  freeLiveRawDownload: "blocked" | "allowed" | "bake_on_download";
  reason: string;
  /** Env / tooling presence only — not a green light alone. */
  tooling: {
    ffmpegHint: boolean;
    workerUrlConfigured: boolean;
  };
};

/**
 * Detect optional tooling without requiring it. Presence of FFmpeg on PATH
 * does not flip T6 ready until a bake endpoint is verified in production.
 */
export function t6ToolingProbe(): T6Report["tooling"] {
  return {
    ffmpegHint: process.env.PIKBO_FFMPEG_PATH
      ? process.env.PIKBO_FFMPEG_PATH.length > 0
      : false,
    workerUrlConfigured: Boolean(
      (process.env.PIKBO_WATERMARK_WORKER_URL || "").startsWith("http")
    ),
  };
}

/**
 * Authoritative T6 readiness.
 * - force flag = full ready (operator proved)
 * - worker URL = bake_on_download (raw still blocked; download path bakes)
 */
export function t6Report(): T6Report {
  const tooling = t6ToolingProbe();
  const forcedReady = process.env.PIKBO_T6_FILE_BAKE === "1";
  if (forcedReady) {
    return {
      status: "ready",
      fileBake: true,
      playerOverlayIsNotFileWatermark: true,
      freeLiveRawDownload: "allowed",
      reason:
        "PIKBO_T6_FILE_BAKE=1 — operator asserts baked Free derivative pipeline is live",
      tooling,
    };
  }
  if (tooling.workerUrlConfigured) {
    return {
      status: "worker_configured",
      fileBake: false,
      playerOverlayIsNotFileWatermark: true,
      freeLiveRawDownload: "bake_on_download",
      reason:
        "Watermark worker configured — Free downloads bake via PIKBO_WATERMARK_WORKER_URL; raw provider URLs stay blocked",
      tooling,
    };
  }
  return {
    status: "blocked",
    fileBake: false,
    playerOverlayIsNotFileWatermark: true,
    freeLiveRawDownload: "blocked",
    reason:
      "No server-side baked watermark pipeline yet. Free Mini live raw provider URLs must not download; on-player mark is not a file watermark. Set PIKBO_WATERMARK_WORKER_URL.",
    tooling,
  };
}

export function t6BlocksFreeLiveDownload(): boolean {
  return t6Report().freeLiveRawDownload === "blocked";
}

/** Free live may attempt download when worker can bake or force-ready. */
export function t6AllowsFreeDownloadAttempt(): boolean {
  const mode = t6Report().freeLiveRawDownload;
  return mode === "allowed" || mode === "bake_on_download";
}
