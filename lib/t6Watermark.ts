/**
 * T6 — protected Free deliverables (file watermark bake).
 *
 * Honest status only. Player CSS overlay is NOT a file watermark.
 * Free live raw provider URLs stay undownloadable until a verified local,
 * server-owned derivative worker is proven end-to-end. Environment variables
 * are requests for operators, never evidence that a file was baked.
 */

import { t6WorkerReadiness } from "@/lib/t6Worker";

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
    ffprobeHint: boolean;
    /** Operator request only; never equivalent to worker readiness. */
    workerRequested: boolean;
    serverOwnedWorkerReady: boolean;
    /** Controlled derivative route source exists; readiness still gates it. */
    derivativeServingImplemented: boolean;
    /** True only when the owned storage adapter is configured. */
    storageAdapterImplemented: boolean;
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
    ffprobeHint: process.env.PIKBO_FFPROBE_PATH
      ? process.env.PIKBO_FFPROBE_PATH.length > 0
      : false,
    workerRequested:
      process.env.PIKBO_T6_BAKED_WATERMARK_WORKER === "1",
    serverOwnedWorkerReady: false,
    derivativeServingImplemented: false,
    storageAdapterImplemented: false,
  };
}

/**
 * Authoritative T6 readiness.
 * The unfinished v1 skeleton cannot be enabled by an env flag. The operator
 * must install ffmpeg+ffprobe, persistent job/storage wiring, and pass an
 * actual derivative fixture before this report can ever become ready.
 */
export function t6Report(): T6Report {
  const tooling = t6ToolingProbe();
  const worker = t6WorkerReadiness();
  return {
    status: "blocked",
    fileBake: false,
    playerOverlayIsNotFileWatermark: true,
    freeLiveRawDownload: "blocked",
    reason:
      "No verified server-owned baked derivative exists. Free-plan live raw provider URLs must not be exposed or downloaded; player overlay is not a file watermark.",
    tooling: {
      ...tooling,
      serverOwnedWorkerReady: worker.effective,
      derivativeServingImplemented: worker.derivativeServingImplemented,
      storageAdapterImplemented: worker.storageAdapterImplemented,
    },
  };
}

export function t6BlocksFreeLiveDownload(): boolean {
  return t6Report().freeLiveRawDownload === "blocked";
}

/** Hard false until the server-owned derivative pipeline has actual proof. */
export function t6AllowsFreeDownloadAttempt(): boolean {
  return false;
}
