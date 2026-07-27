/**
 * Phase D — generation job records (local memory adapter until Supabase).
 * Soft-launch still runs sync /api/generate; jobs are recorded for poll/recovery.
 */

import type { T6MediaProbe } from "@/lib/t6Worker";

export type GenerationJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";

/** A server-owned file, never a provider URL. Only succeeded+verified is serveable. */
export type BakedWatermarkDerivative = {
  status: "queued" | "running" | "succeeded" | "failed";
  idempotencyKey: string;
  objectKey: string;
  /** Local/owned delivery path. This must never equal the provider raw URL. */
  deliveryPath?: string;
  contentType?: "video/mp4";
  sourceChecksum?: string;
  outputChecksum?: string;
  sourceProbe?: T6MediaProbe;
  probe?: T6MediaProbe;
  errorCode?: string;
};

export type GenerationAttemptSpec = {
  effect: string;
  model?: string;
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
};

export type GenerationJob = {
  id: string;
  sessionId: string;
  status: GenerationJobStatus;
  effect: string;
  demo: boolean;
  watermark: boolean;
  /** Free live raw provider URL must not be downloadable (T6). */
  downloadAllowed: boolean;
  /** Attached only by a future server-owned T6 worker after verification. */
  bakedDerivative?: BakedWatermarkDerivative;
  videoUrl?: string;
  model?: string;
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
  costCredits?: number;
  creditsOutcome?: "0 cached" | "10 used" | "10 restored" | "refund unconfirmed";
  creditsRefunded?: boolean;
  requestId?: string;
  provider?: string;
  error?: string;
  errorCode?: string;
  /** Client-supplied idempotency key (optional). */
  idempotencyKey?: string;
  /** Prior job this was retried from (local adapter only). */
  parentJobId?: string;
  /** Immutable server-side attempt settings copied into retry children. */
  generationSpec: GenerationAttemptSpec;
  /** Fixed at job creation. Reads and worker heartbeat never extend it. */
  deadlineAt: string;
  /** Trusted worker liveness only; never written by GET/poll routes. */
  workerHeartbeatAt?: string;
  /** One-time retry bearer digest. Never included in PublicGenerationJob. */
  retryTokenHash?: string;
  retryClaimedAt?: string;
  createdAt: string;
  updatedAt: string;
};

/** Public view — never exposes private storage paths. */
export type PublicGenerationJob = Omit<
  GenerationJob,
  "sessionId" | "retryTokenHash"
> & {
  /** True when this session owns the job. */
  owned: boolean;
};
