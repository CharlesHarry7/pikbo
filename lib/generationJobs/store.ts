/**
 * In-process generation job ledger (Phase D local adapter).
 * Survives the soft-launch process for recovery/poll; not multi-node durable.
 * Supabase job table remains the production target (AUTH_CREDITS / Phase D PRD).
 */

import { canDownloadResult, isSafeDeliverableUrl } from "@/lib/createTrust";
import type {
  GenerationJob,
  GenerationJobStatus,
  PublicGenerationJob,
} from "@/lib/generationJobs/types";

const MAX_JOBS = 200;
/**
 * Phase D timeout recovery — soft-launch sync generate usually finishes in
 * <3m; async/orphan jobs stuck queued|running beyond this become failed.
 * Override with PIKBO_JOB_TIMEOUT_MS (min 30s).
 */
export function jobTimeoutMs(): number {
  const raw = Number(process.env.PIKBO_JOB_TIMEOUT_MS || 0);
  if (Number.isFinite(raw) && raw >= 30_000) return Math.floor(raw);
  return 10 * 60_000; // 10 minutes
}

const jobs = new Map<string, GenerationJob>();
/** idempotencyKey → job id (session-scoped via key prefix) */
const byIdempotency = new Map<string, string>();
/** Provider webhook event id → last apply result (no duplicate side effects) */
const webhookEvents = new Map<
  string,
  { jobId: string; status: GenerationJobStatus; appliedAt: string }
>();

function nowIso(): string {
  return new Date().toISOString();
}

function ageMs(iso: string, now = Date.now()): number {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, now - t);
}

function newId(): string {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function trimStore() {
  if (jobs.size <= MAX_JOBS) return;
  const ordered = [...jobs.values()].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );
  const drop = ordered.slice(0, jobs.size - MAX_JOBS);
  for (const j of drop) {
    jobs.delete(j.id);
    if (j.idempotencyKey) {
      byIdempotency.delete(`${j.sessionId}:${j.idempotencyKey}`);
    }
  }
}

export function downloadAllowedForJob(opts: {
  demo: boolean;
  watermark: boolean;
  status: GenerationJobStatus;
}): boolean {
  if (opts.status !== "succeeded") return false;
  return canDownloadResult({ demo: opts.demo, watermark: opts.watermark });
}

/** Lookup by client idempotency key (session-scoped). */
export function findJobByIdempotencyKey(
  sessionId: string,
  idempotencyKey: string
): GenerationJob | null {
  const key = idempotencyKey.trim();
  if (!sessionId || !key) return null;
  const id = byIdempotency.get(`${sessionId}:${key}`);
  if (!id) return null;
  return jobs.get(id) ?? null;
}

export function createJob(input: {
  sessionId: string;
  effect: string;
  status?: GenerationJobStatus;
  idempotencyKey?: string;
  parentJobId?: string;
}): GenerationJob {
  if (input.idempotencyKey) {
    const existingId = byIdempotency.get(
      `${input.sessionId}:${input.idempotencyKey}`
    );
    if (existingId) {
      const existing = jobs.get(existingId);
      if (existing) return existing;
    }
  }
  const t = nowIso();
  const job: GenerationJob = {
    id: newId(),
    sessionId: input.sessionId,
    status: input.status ?? "queued",
    effect: input.effect,
    demo: false,
    watermark: true,
    downloadAllowed: false,
    idempotencyKey: input.idempotencyKey,
    parentJobId: input.parentJobId,
    createdAt: t,
    updatedAt: t,
  };
  jobs.set(job.id, job);
  if (input.idempotencyKey) {
    byIdempotency.set(`${input.sessionId}:${input.idempotencyKey}`, job.id);
  }
  trimStore();
  return job;
}

/**
 * Soft-launch local retry: fork a new queued job from a prior attempt.
 * Does not re-run the provider (no stored still). Client must POST /api/generate
 * with the original image + effect; Seller Pack keeps sibling successes.
 */
export function forkRetryJob(input: {
  sessionId: string;
  parentId: string;
}):
  | { ok: true; job: GenerationJob; parent: GenerationJob }
  | { ok: false; code: "NOT_FOUND" | "NOT_OWNED"; message: string } {
  // Accept job id or provider requestId (Library / downloads may store either).
  const parent = findJobByRequestOrId(input.parentId);
  if (!parent) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Parent job not in this process ledger",
    };
  }
  if (parent.sessionId !== input.sessionId) {
    return {
      ok: false,
      code: "NOT_OWNED",
      message: "Job belongs to another session",
    };
  }
  const job = createJob({
    sessionId: input.sessionId,
    effect: parent.effect,
    status: "queued",
    parentJobId: parent.id,
    idempotencyKey: `retry:${parent.id}:${Math.floor(Date.now() / 5000)}`,
  });
  return { ok: true, job, parent };
}

/**
 * Mark queued/running jobs past timeout as failed (timeout recovery).
 * Does not invent refunds — soft-launch cookie path already settled inline
 * for sync generate; async orphans get honest failed + TIMEOUT code.
 */
export function sweepTimedOutJobs(opts?: {
  nowMs?: number;
  timeoutMs?: number;
}): GenerationJob[] {
  const now = opts?.nowMs ?? Date.now();
  const limit = opts?.timeoutMs ?? jobTimeoutMs();
  const timedOut: GenerationJob[] = [];
  for (const job of jobs.values()) {
    if (job.status !== "queued" && job.status !== "running") continue;
    // Prefer updatedAt so re-touched running jobs get a full window.
    const stamp = job.updatedAt || job.createdAt;
    if (ageMs(stamp, now) < limit) continue;
    const next = updateJob(job.id, {
      status: "failed",
      error:
        "Job timed out waiting for provider/result — if credits were debited, check balance or retry; ambiguous timeouts stay unconfirmed on the client",
      errorCode: "TIMEOUT",
      creditsOutcome: "refund unconfirmed",
    });
    if (next) timedOut.push(next);
  }
  return timedOut;
}

export function getJob(id: string): GenerationJob | null {
  sweepTimedOutJobs();
  // Accept job id or provider requestId (Create/Library may store either).
  return findJobByRequestOrId(id);
}

/**
 * Slide updatedAt on open jobs while a client is polling.
 * Prevents false TIMEOUT when soft-launch sync fal is still working and the
 * operator set a short PIKBO_JOB_TIMEOUT_MS. Terminal jobs are unchanged.
 */
export function touchJob(id: string): GenerationJob | null {
  const job = findJobByRequestOrId(id);
  if (!job) return null;
  if (job.status !== "queued" && job.status !== "running") return job;
  return updateJob(job.id, {}) ?? job;
}

/**
 * Cancel a queued/running local job. Terminal states are left unchanged.
 * Soft-launch sync generate cannot interrupt fal mid-flight; this marks the
 * ledger honestly for clients that abandon a poll.
 */
export function cancelJob(input: {
  sessionId: string;
  id: string;
}):
  | { ok: true; job: GenerationJob }
  | {
      ok: false;
      code: "NOT_FOUND" | "NOT_OWNED" | "NOT_CANCELABLE";
      message: string;
      job?: GenerationJob;
    } {
  // Resolve job id or provider requestId (getJob sweeps timeouts).
  const job = getJob(input.id);
  if (!job) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Job not in this process ledger",
    };
  }
  if (job.sessionId !== input.sessionId) {
    return {
      ok: false,
      code: "NOT_OWNED",
      message: "Job belongs to another session",
    };
  }
  if (job.status === "canceled") {
    return { ok: true, job };
  }
  if (job.status === "succeeded" || job.status === "failed") {
    return {
      ok: false,
      code: "NOT_CANCELABLE",
      message: `Job already ${job.status}`,
      job,
    };
  }
  const next = updateJob(job.id, {
    status: "canceled",
    error: "Canceled by client",
    errorCode: "CANCELED",
  });
  if (!next) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Job disappeared during cancel",
    };
  }
  return { ok: true, job: next };
}

export function listJobsForSession(
  sessionId: string,
  limit = 20
): GenerationJob[] {
  sweepTimedOutJobs();
  return [...jobs.values()]
    .filter((j) => j.sessionId === sessionId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function updateJob(
  id: string,
  patch: Partial<
    Omit<GenerationJob, "id" | "sessionId" | "createdAt" | "idempotencyKey">
  >
): GenerationJob | null {
  const cur = jobs.get(id);
  if (!cur) return null;
  const next: GenerationJob = {
    ...cur,
    ...patch,
    id: cur.id,
    sessionId: cur.sessionId,
    createdAt: cur.createdAt,
    updatedAt: nowIso(),
  };
  // Recompute download gate whenever status/demo/watermark change.
  if (
    patch.status !== undefined ||
    patch.demo !== undefined ||
    patch.watermark !== undefined
  ) {
    next.downloadAllowed = downloadAllowedForJob({
      demo: next.demo,
      watermark: next.watermark,
      status: next.status,
    });
  }
  jobs.set(id, next);
  return next;
}

/**
 * Soft-launch sync live generate: open a `running` ledger row *before* fal.
 * Library session jobs + cancel + timeout sweep only work when this exists.
 * Demo path stays recordSucceededGenerate (instant, no mid-flight).
 */
export function beginSyncGenerateJob(input: {
  sessionId: string;
  effect: string;
  model?: string;
  watermark?: boolean;
  provider?: string;
  idempotencyKey?: string;
}): GenerationJob {
  const job = createJob({
    sessionId: input.sessionId,
    effect: input.effect,
    status: "running",
    idempotencyKey: input.idempotencyKey,
  });
  // Existing terminal row from same key is returned as-is by createJob —
  // callers must short-circuit via findJobByIdempotencyKey first.
  if (job.status !== "running" && job.status !== "queued") {
    return job;
  }
  return (
    updateJob(job.id, {
      status: "running",
      model: input.model,
      watermark: input.watermark ?? true,
      provider: input.provider,
      demo: false,
      downloadAllowed: false,
    }) ?? job
  );
}

/**
 * Finalize a beginSyncGenerateJob row on success (or insert if mid-flight lost).
 */
export function completeSyncGenerateJob(input: {
  jobId?: string;
  sessionId: string;
  effect: string;
  videoUrl: string;
  demo: boolean;
  watermark: boolean;
  model?: string;
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
  costCredits?: number;
  creditsOutcome?: GenerationJob["creditsOutcome"];
  requestId?: string;
  provider?: string;
}): GenerationJob {
  if (input.jobId) {
    const cur = jobs.get(input.jobId);
    if (cur && cur.sessionId === input.sessionId) {
      // Provider finished wins: cancel is ledger abandon only (not fal kill).
      // Still stamp success so Library can recover the deliverable.
      const next = updateJob(input.jobId, {
        status: "succeeded",
        videoUrl: input.videoUrl,
        demo: input.demo,
        watermark: input.watermark,
        model: input.model ?? cur.model,
        duration: input.duration,
        aspectRatio: input.aspectRatio,
        resolution: input.resolution,
        costCredits: input.costCredits,
        creditsOutcome: input.creditsOutcome,
        requestId: input.requestId ?? cur.requestId,
        provider: input.provider ?? cur.provider,
        error: undefined,
        errorCode: undefined,
        creditsRefunded: undefined,
      });
      if (next) return next;
    }
  }
  return recordSucceededGenerate({
    sessionId: input.sessionId,
    effect: input.effect,
    videoUrl: input.videoUrl,
    demo: input.demo,
    watermark: input.watermark,
    model: input.model,
    duration: input.duration,
    aspectRatio: input.aspectRatio,
    resolution: input.resolution,
    costCredits: input.costCredits,
    creditsOutcome: input.creditsOutcome,
    requestId: input.requestId,
    provider: input.provider,
    preferredId: input.requestId,
  });
}

/**
 * Finalize beginSyncGenerateJob on failure (refund path). Falls back to insert.
 * Respects ledger cancel — does not overwrite canceled with failed.
 */
export function failSyncGenerateJob(input: {
  jobId?: string;
  sessionId: string;
  effect: string;
  error: string;
  errorCode?: string;
  model?: string;
  creditsRefunded?: boolean;
}): GenerationJob {
  if (input.jobId) {
    const cur = jobs.get(input.jobId);
    if (cur && cur.sessionId === input.sessionId) {
      if (cur.status === "canceled") {
        return cur;
      }
      if (cur.status === "succeeded") {
        // Race: provider finished after client canceled path — leave success.
        return cur;
      }
      const next = updateJob(input.jobId, {
        status: "failed",
        error: input.error,
        errorCode: input.errorCode,
        model: input.model ?? cur.model,
        creditsRefunded: input.creditsRefunded,
        creditsOutcome: input.creditsRefunded ? "10 restored" : undefined,
        downloadAllowed: false,
        videoUrl: undefined,
      });
      if (next) return next;
    }
  }
  return recordFailedGenerate({
    sessionId: input.sessionId,
    effect: input.effect,
    error: input.error,
    errorCode: input.errorCode,
    model: input.model,
    creditsRefunded: input.creditsRefunded,
  });
}

/** Record a finished sync generate (success path). */
export function recordSucceededGenerate(input: {
  sessionId: string;
  effect: string;
  videoUrl: string;
  demo: boolean;
  watermark: boolean;
  model?: string;
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
  costCredits?: number;
  creditsOutcome?: GenerationJob["creditsOutcome"];
  requestId?: string;
  provider?: string;
  /** Prefer provider requestId as job id when unique. */
  preferredId?: string;
  idempotencyKey?: string;
}): GenerationJob {
  const t = nowIso();
  const id =
    input.preferredId && !jobs.has(input.preferredId)
      ? input.preferredId
      : newId();
  const job: GenerationJob = {
    id,
    sessionId: input.sessionId,
    status: "succeeded",
    effect: input.effect,
    demo: input.demo,
    watermark: input.watermark,
    downloadAllowed: downloadAllowedForJob({
      demo: input.demo,
      watermark: input.watermark,
      status: "succeeded",
    }),
    videoUrl: input.videoUrl,
    model: input.model,
    duration: input.duration,
    aspectRatio: input.aspectRatio,
    resolution: input.resolution,
    costCredits: input.costCredits,
    idempotencyKey: input.idempotencyKey,
    creditsOutcome: input.creditsOutcome,
    requestId: input.requestId,
    provider: input.provider,
    createdAt: t,
    updatedAt: t,
  };
  jobs.set(id, job);
  if (input.idempotencyKey) {
    byIdempotency.set(`${input.sessionId}:${input.idempotencyKey}`, id);
  }
  trimStore();
  return job;
}

/** Record a failed generate attempt (after debit path when known). */
export function recordFailedGenerate(input: {
  sessionId: string;
  effect: string;
  error: string;
  errorCode?: string;
  model?: string;
  creditsRefunded?: boolean;
  preferredId?: string;
  idempotencyKey?: string;
}): GenerationJob {
  const t = nowIso();
  const id =
    input.preferredId && !jobs.has(input.preferredId)
      ? input.preferredId
      : newId();
  const creditsOutcome: GenerationJob["creditsOutcome"] = input.creditsRefunded
    ? "10 restored"
    : undefined;
  const job: GenerationJob = {
    id,
    sessionId: input.sessionId,
    status: "failed",
    effect: input.effect,
    demo: false,
    watermark: true,
    downloadAllowed: false,
    model: input.model,
    error: input.error,
    errorCode: input.errorCode,
    creditsRefunded: input.creditsRefunded,
    creditsOutcome,
    idempotencyKey: input.idempotencyKey,
    createdAt: t,
    updatedAt: t,
  };
  jobs.set(id, job);
  if (input.idempotencyKey) {
    byIdempotency.set(`${input.sessionId}:${input.idempotencyKey}`, id);
  }
  trimStore();
  return job;
}

export function toPublicJob(
  job: GenerationJob,
  sessionId: string
): PublicGenerationJob {
  const owned = job.sessionId === sessionId;
  // Never leak another session's video URL.
  if (!owned) {
    return {
      id: job.id,
      status: "failed",
      effect: job.effect,
      demo: false,
      watermark: true,
      downloadAllowed: false,
      error: "Not found",
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      owned: false,
    };
  }
  const { sessionId: _s, downloadAllowed: _frozen, ...rest } = job;
  void _s;
  void _frozen;
  // Recompute T6 download gate at read time — env (worker URL / force bake)
  // can change after the job row was frozen at success.
  return {
    ...rest,
    downloadAllowed: downloadAllowedForJob({
      demo: job.demo,
      watermark: job.watermark,
      status: job.status,
    }),
    owned: true,
  };
}

/** Find job by provider request id or job id. */
export function findJobByRequestOrId(
  requestIdOrJobId: string
): GenerationJob | null {
  const direct = jobs.get(requestIdOrJobId);
  if (direct) return direct;
  for (const j of jobs.values()) {
    if (j.requestId === requestIdOrJobId) return j;
  }
  return null;
}

/**
 * Idempotent provider webhook apply (Phase D).
 * Soft-launch generate still settles inline; this path is for async completions
 * and duplicate webhook retries without double-writing terminal state.
 */
export function applyProviderWebhookEvent(input: {
  eventId: string;
  requestId: string;
  status: "succeeded" | "failed" | "canceled";
  videoUrl?: string;
  error?: string;
  errorCode?: string;
  demo?: boolean;
  watermark?: boolean;
  model?: string;
  provider?: string;
}):
  | {
      ok: true;
      duplicate: boolean;
      job: GenerationJob | null;
      message: string;
    }
  | { ok: false; code: string; message: string } {
  const eventId = input.eventId.trim().slice(0, 128);
  const requestId = input.requestId.trim().slice(0, 128);
  if (!eventId || !requestId) {
    return {
      ok: false,
      code: "INVALID_PAYLOAD",
      message: "eventId and requestId are required",
    };
  }

  const prior = webhookEvents.get(eventId);
  if (prior) {
    const job = jobs.get(prior.jobId) ?? findJobByRequestOrId(requestId);
    return {
      ok: true,
      duplicate: true,
      job,
      message: "Webhook event already applied (idempotent)",
    };
  }

  let job = findJobByRequestOrId(requestId);
  const t = nowIso();

  if (!job) {
    // Unknown request: create a shell so retries still idempotent.
    if (input.status === "succeeded" && input.videoUrl) {
      if (!isSafeDeliverableUrl(input.videoUrl)) {
        return {
          ok: false,
          code: "UNSAFE_URL",
          message: "succeeded webhook videoUrl is not a safe http(s) or /path URL",
        };
      }
      job = recordSucceededGenerate({
        sessionId: "webhook-orphan",
        effect: "unknown",
        videoUrl: input.videoUrl,
        demo: Boolean(input.demo),
        watermark: input.watermark !== false,
        model: input.model,
        requestId,
        provider: input.provider || "webhook",
        preferredId: requestId,
        creditsOutcome: input.demo ? "0 cached" : "10 used",
      });
    } else if (input.status === "failed" || input.status === "canceled") {
      job = recordFailedGenerate({
        sessionId: "webhook-orphan",
        effect: "unknown",
        error: input.error || `Provider ${input.status}`,
        errorCode: input.errorCode || input.status.toUpperCase(),
        preferredId: requestId,
      });
      if (input.status === "canceled") {
        job = updateJob(job.id, {
          status: "canceled",
          error: input.error || "Canceled by provider",
          errorCode: "CANCELED",
        })!;
      }
    } else {
      return {
        ok: false,
        code: "JOB_NOT_FOUND",
        message:
          "No job for requestId and success payload missing videoUrl",
      };
    }
    webhookEvents.set(eventId, {
      jobId: job.id,
      status: job.status,
      appliedAt: t,
    });
    return {
      ok: true,
      duplicate: false,
      job,
      message: "Created job from webhook (orphan / late event)",
    };
  }

  // Already terminal with same outcome → record event and no-op.
  if (job.status === "succeeded" || job.status === "failed" || job.status === "canceled") {
    webhookEvents.set(eventId, {
      jobId: job.id,
      status: job.status,
      appliedAt: t,
    });
    return {
      ok: true,
      duplicate: false,
      job,
      message: `Job already terminal (${job.status}); webhook recorded without overwrite`,
    };
  }

  if (input.status === "succeeded") {
    if (!input.videoUrl) {
      return {
        ok: false,
        code: "MISSING_VIDEO",
        message: "succeeded webhook requires videoUrl",
      };
    }
    if (!isSafeDeliverableUrl(input.videoUrl)) {
      return {
        ok: false,
        code: "UNSAFE_URL",
        message: "succeeded webhook videoUrl is not a safe http(s) or /path URL",
      };
    }
    // Never store raw provider URL as permanent customer storage claim —
    // soft-launch still uses provider URL for playback; download gate applies.
    const next = updateJob(job.id, {
      status: "succeeded",
      videoUrl: input.videoUrl,
      demo: Boolean(input.demo),
      watermark: input.watermark !== false,
      model: input.model ?? job.model,
      provider: input.provider || job.provider || "webhook",
      requestId: job.requestId || requestId,
      creditsOutcome: input.demo ? "0 cached" : job.creditsOutcome || "10 used",
      error: undefined,
      errorCode: undefined,
    });
    if (!next) {
      return { ok: false, code: "UPDATE_FAILED", message: "Could not update job" };
    }
    webhookEvents.set(eventId, {
      jobId: next.id,
      status: next.status,
      appliedAt: t,
    });
    return {
      ok: true,
      duplicate: false,
      job: next,
      message: "Job marked succeeded from webhook",
    };
  }

  const next = updateJob(job.id, {
    status: input.status === "canceled" ? "canceled" : "failed",
    error: input.error || `Provider ${input.status}`,
    errorCode: input.errorCode || input.status.toUpperCase(),
    videoUrl: undefined,
  });
  if (!next) {
    return { ok: false, code: "UPDATE_FAILED", message: "Could not update job" };
  }
  webhookEvents.set(eventId, {
    jobId: next.id,
    status: next.status,
    appliedAt: t,
  });
  return {
    ok: true,
    duplicate: false,
    job: next,
    message: `Job marked ${next.status} from webhook`,
  };
}

/** Ops probe — presence counts only, never video URLs or session ids. */
export function generationJobsProbe(): {
  mode: "local-memory";
  durable: false;
  count: number;
  /** Status histogram for Mode A ops (running > 0 means mid-flight live job). */
  byStatus: Record<GenerationJobStatus, number>;
  /** queued + running — cancel/timeout targets */
  open: number;
  webhookEvents: number;
  jobTimeoutMs: number;
  timedOutThisProbe: number;
  note: string;
} {
  const timedOut = sweepTimedOutJobs();
  const byStatus: Record<GenerationJobStatus, number> = {
    queued: 0,
    running: 0,
    succeeded: 0,
    failed: 0,
    canceled: 0,
  };
  for (const j of jobs.values()) {
    byStatus[j.status] = (byStatus[j.status] ?? 0) + 1;
  }
  const open = byStatus.queued + byStatus.running;
  return {
    mode: "local-memory",
    durable: false,
    count: jobs.size,
    byStatus,
    open,
    webhookEvents: webhookEvents.size,
    jobTimeoutMs: jobTimeoutMs(),
    timedOutThisProbe: timedOut.length,
    note:
      timedOut.length > 0
        ? `Process-memory ledger; swept ${timedOut.length} timed-out job(s) this probe`
        : open > 0
          ? `Process-memory ledger; ${open} open (queued/running) job(s)`
          : "Process-memory ledger; not multi-node durable",
  };
}

/** Test helper — clear process memory. */
export function __resetGenerationJobsForTests() {
  jobs.clear();
  byIdempotency.clear();
  webhookEvents.clear();
}
