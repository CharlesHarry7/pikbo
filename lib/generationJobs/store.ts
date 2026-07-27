/**
 * In-process generation job ledger (Phase D local adapter).
 * Survives the soft-launch process for recovery/poll; not multi-node durable.
 * Supabase job table remains the production target (AUTH_CREDITS / Phase D PRD).
 */

import {
  canDownloadResult,
  failedLedgerCreditsOutcome,
  isSafeDeliverableUrl,
} from "@/lib/createTrust";
import { canServeVerifiedT6Derivative } from "@/lib/t6Worker";
import {
  deadlineExpired,
  deadlineRemainingMs,
  fixedDeadlineAt,
  mintRetryToken,
  providerCompletionDecision,
  retryTokenDigest,
  retryTokenMatches,
} from "@/lib/generationReliability.mjs";
import type {
  BakedWatermarkDerivative,
  GenerationAttemptSpec,
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

function nowIso(now = Date.now()): string {
  return new Date(now).toISOString();
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
  jobId?: string;
  providerRequestId?: string;
  bakedDerivative?: BakedWatermarkDerivative;
}): boolean {
  if (opts.status !== "succeeded") return false;
  // Free live only unlocks when the derivative is bound to this exact job
  // identity AND the owned delivery stack is actually ready.
  const bakedDerivativeVerified =
    Boolean(opts.jobId) &&
    canServeVerifiedT6Derivative({
      jobId: opts.jobId!,
      providerRequestId: opts.providerRequestId,
      derivative: opts.bakedDerivative,
    });
  return canDownloadResult({
    demo: opts.demo,
    watermark: opts.watermark,
    bakedDerivativeVerified,
  });
}

/** Never disclose a raw Free provider URL in public job representations. */
export function publicVideoUrlForJob(job: GenerationJob): string | undefined {
  if (job.demo || !job.watermark) return job.videoUrl;
  const derivative = job.bakedDerivative;
  if (
    canServeVerifiedT6Derivative({
      jobId: job.id,
      providerRequestId: job.requestId,
      derivative,
    }) &&
    derivative?.deliveryPath &&
    isSafeDeliverableUrl(derivative.deliveryPath)
  ) {
    return derivative.deliveryPath;
  }
  return undefined;
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
  generationSpec?: GenerationAttemptSpec;
  retryTokenHash?: string;
  /** Test-only clock injection; production callers omit. */
  nowMs?: number;
  deadlineMs?: number;
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
  const now = input.nowMs ?? Date.now();
  const t = nowIso(now);
  const generationSpec: GenerationAttemptSpec = {
    effect: input.generationSpec?.effect || input.effect,
    model: input.generationSpec?.model,
    duration: input.generationSpec?.duration,
    aspectRatio: input.generationSpec?.aspectRatio,
    resolution: input.generationSpec?.resolution,
  };
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
    generationSpec,
    deadlineAt: fixedDeadlineAt(
      now,
      input.deadlineMs ?? jobTimeoutMs()
    ),
    workerHeartbeatAt:
      (input.status ?? "queued") === "running" ? t : undefined,
    retryTokenHash: input.retryTokenHash,
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
  | {
      ok: true;
      job: GenerationJob;
      parent: GenerationJob;
      retryToken: string;
    }
  | {
      ok: false;
      code: "NOT_FOUND" | "NOT_OWNED" | "JOB_IN_FLIGHT" | "NOT_RETRYABLE";
      message: string;
    } {
  sweepTimedOutJobs();
  // Retry authorization is bound to an exact immutable ledger job id.
  // Provider request ids, effect names and prompt guesses are not accepted.
  const parent = jobs.get(input.parentId);
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
  // Seller Pack / Library retry only failed terminals — never fork success or mid-flight.
  if (parent.status === "queued" || parent.status === "running") {
    return {
      ok: false,
      code: "JOB_IN_FLIGHT",
      message:
        "Parent job still open — wait for success/failure or cancel ledger first",
    };
  }
  if (parent.status === "succeeded") {
    return {
      ok: false,
      code: "NOT_RETRYABLE",
      message:
        "Parent already succeeded — open Create for a new attempt or variant",
    };
  }
  // failed | canceled only (soft-launch terminal failures).
  if (parent.status !== "failed" && parent.status !== "canceled") {
    return {
      ok: false,
      code: "NOT_RETRYABLE",
      message: `Parent status “${parent.status}” is not retryable on this ledger`,
    };
  }

  const existingChild = [...jobs.values()].find(
    (job) =>
      job.sessionId === input.sessionId &&
      job.parentJobId === parent.id &&
      (job.status === "queued" || job.status === "running")
  );
  if (existingChild) {
    return {
      ok: false,
      code: "JOB_IN_FLIGHT",
      message: `Retry child ${existingChild.id} is already ${existingChild.status}`,
    };
  }

  const retryToken = mintRetryToken();
  const job = createJob({
    sessionId: input.sessionId,
    effect: parent.effect,
    status: "queued",
    parentJobId: parent.id,
    idempotencyKey: `retry:${parent.id}:${retryTokenDigest(retryToken).slice(0, 24)}`,
    retryTokenHash: retryTokenDigest(retryToken),
    generationSpec: parent.generationSpec,
  });
  return { ok: true, job, parent, retryToken };
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
  const timedOut: GenerationJob[] = [];
  for (const job of jobs.values()) {
    if (job.status !== "queued" && job.status !== "running") continue;
    // Legacy rows without deadlineAt use a derived fixed deadline. No read or
    // heartbeat timestamp participates in timeout decisions.
    const deadlineAt =
      job.deadlineAt ||
      fixedDeadlineAt(
        Date.parse(job.createdAt),
        opts?.timeoutMs ?? jobTimeoutMs()
      );
    if (!deadlineExpired(deadlineAt, now)) continue;
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
 * Trusted worker liveness signal. It is intentionally separate from reads and
 * never changes deadlineAt.
 */
export function recordWorkerHeartbeat(id: string): GenerationJob | null {
  sweepTimedOutJobs();
  const job = findJobByRequestOrId(id);
  if (!job) return null;
  if (job.status !== "queued" && job.status !== "running") return job;
  return updateJob(job.id, { workerHeartbeatAt: nowIso() }) ?? job;
}

/**
 * Seconds until an open ledger job would TIMEOUT (JOB_IN_FLIGHT Retry-After).
 * Prefer this over the inflight lock alone — lock frees after process kill
 * while the process-memory row can stay open until sweep.
 */
export function jobLedgerInFlightRetryAfterSec(job: GenerationJob): number {
  if (job.status !== "queued" && job.status !== "running") return 1;
  const remainingMs = deadlineRemainingMs(job.deadlineAt);
  if (remainingMs <= 0) return 1;
  return Math.max(1, Math.ceil(remainingMs / 1000));
}

/**
 * Cancel a queued/running local job. Terminal states are left unchanged.
 * Soft-launch sync generate cannot interrupt fal mid-flight; this marks the
 * ledger honestly for clients that abandon a poll.
 */
export function cancelJob(input: {
  sessionId: string;
  /** Job id or provider requestId */
  id?: string;
  /** Client-minted key when abort races before jobId is known */
  idempotencyKey?: string;
}):
  | { ok: true; job: GenerationJob }
  | {
      ok: false;
      code: "NOT_FOUND" | "NOT_OWNED" | "NOT_CANCELABLE" | "INVALID";
      message: string;
      job?: GenerationJob;
    } {
  let job: GenerationJob | null = null;
  if (input.id && input.id.trim()) {
    // Resolve job id or provider requestId (getJob sweeps timeouts).
    job = getJob(input.id.trim());
  } else if (input.idempotencyKey && input.idempotencyKey.trim()) {
    sweepTimedOutJobs();
    job = findJobByIdempotencyKey(
      input.sessionId,
      input.idempotencyKey.trim()
    );
  } else {
    return {
      ok: false,
      code: "INVALID",
      message: "Provide job id or idempotencyKey to cancel",
    };
  }
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
      job,
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
    // Soft-launch: abort may leave debit ambiguous until provider settles.
    creditsOutcome: "refund unconfirmed",
    creditsRefunded: undefined,
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

/**
 * Full session histogram for HEAD/GET probes (Profile / Settings / Library).
 * Unlike listJobsForSession, this is not capped — a page slice under-counted
 * failed/canceled and could hide open jobs older than the newest page.
 * Image listImageJobCountsForSession parity.
 */
export function countJobsForSession(sessionId: string): {
  total: number;
  open: number;
  queued: number;
  running: number;
  succeeded: number;
  failed: number;
  canceled: number;
} {
  sweepTimedOutJobs();
  let total = 0;
  let queued = 0;
  let running = 0;
  let succeeded = 0;
  let failed = 0;
  let canceled = 0;
  for (const j of jobs.values()) {
    if (j.sessionId !== sessionId) continue;
    total += 1;
    if (j.status === "queued") queued += 1;
    else if (j.status === "running") running += 1;
    else if (j.status === "succeeded") succeeded += 1;
    else if (j.status === "failed") failed += 1;
    else if (j.status === "canceled") canceled += 1;
  }
  return {
    total,
    open: queued + running,
    queued,
    running,
    succeeded,
    failed,
    canceled,
  };
}

export function updateJob(
  id: string,
  patch: Partial<
    Omit<
      GenerationJob,
      | "id"
      | "sessionId"
      | "createdAt"
      | "idempotencyKey"
      | "parentJobId"
      | "generationSpec"
      | "deadlineAt"
      | "retryTokenHash"
      | "retryClaimedAt"
    >
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
  // Recompute download gate when status/demo/watermark OR owned derivative changes.
  if (
    patch.status !== undefined ||
    patch.demo !== undefined ||
    patch.watermark !== undefined ||
    patch.bakedDerivative !== undefined ||
    patch.requestId !== undefined
  ) {
    next.downloadAllowed = downloadAllowedForJob({
      demo: next.demo,
      watermark: next.watermark,
      status: next.status,
      jobId: next.id,
      providerRequestId: next.requestId,
      bakedDerivative: next.bakedDerivative,
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
  /** Stamp request params at open so fail/cancel remake still carries ratio. */
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
}): GenerationJob {
  // Network replay may reopen only the exact idempotency-bound attempt.
  // Retry forks are claimed separately with their job id + one-time token.
  if (input.idempotencyKey) {
    const existingId = byIdempotency.get(
      `${input.sessionId}:${input.idempotencyKey}`
    );
    if (existingId) {
      const existing = jobs.get(existingId);
      if (existing) {
        if (existing.status !== "running" && existing.status !== "queued") {
          return existing;
        }
        return (
          updateJob(existing.id, {
            status: "running",
            workerHeartbeatAt: nowIso(),
            model: input.model,
            watermark: input.watermark ?? true,
            provider: input.provider,
            demo: false,
            downloadAllowed: false,
            duration: input.duration,
            aspectRatio: input.aspectRatio,
            resolution: input.resolution,
          }) ?? existing
        );
      }
    }
  }

  const job = createJob({
    sessionId: input.sessionId,
    effect: input.effect,
    status: "running",
    idempotencyKey: input.idempotencyKey,
    generationSpec: {
      effect: input.effect,
      model: input.model,
      duration: input.duration,
      aspectRatio: input.aspectRatio,
      resolution: input.resolution,
    },
  });
  // Existing terminal row from same key is returned as-is by createJob —
  // callers must short-circuit via findJobByIdempotencyKey first.
  if (job.status !== "running" && job.status !== "queued") {
    return job;
  }
  return (
    updateJob(job.id, {
      status: "running",
      workerHeartbeatAt: nowIso(),
      model: input.model,
      watermark: input.watermark ?? true,
      provider: input.provider,
      demo: false,
      downloadAllowed: false,
      // Keep remixOptsFromRecord honest on mid-flight fail/cancel (complete may overwrite).
      duration: input.duration,
      aspectRatio: input.aspectRatio,
      resolution: input.resolution,
    }) ?? job
  );
}

export function claimRetryJobForGenerate(input: {
  sessionId: string;
  retryJobId: string;
  retryToken: string;
  idempotencyKey: string;
  effect: string;
  model?: string;
  watermark?: boolean;
  provider?: string;
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
}):
  | { ok: true; job: GenerationJob }
  | {
      ok: false;
      code:
        | "RETRY_TOKEN_INVALID"
        | "RETRY_JOB_NOT_READY"
        | "RETRY_SPEC_MISMATCH"
        | "IDEMPOTENCY_CONFLICT";
      message: string;
    } {
  sweepTimedOutJobs();
  // Exact job id only. Never resolve provider request id, effect or list order.
  const child = jobs.get(input.retryJobId);
  if (
    !child ||
    child.sessionId !== input.sessionId ||
    !child.parentJobId ||
    !retryTokenMatches(child.retryTokenHash, input.retryToken)
  ) {
    return {
      ok: false,
      code: "RETRY_TOKEN_INVALID",
      message: "Retry job or one-time token is invalid for this session",
    };
  }
  if (child.status !== "queued" || child.retryClaimedAt) {
    return {
      ok: false,
      code: "RETRY_JOB_NOT_READY",
      message: `Retry child is ${child.status}; mint a retry from the selected terminal job`,
    };
  }

  const expected = child.generationSpec;
  const mismatch =
    expected.effect !== input.effect ||
    (expected.model != null && expected.model !== input.model) ||
    (expected.duration != null && expected.duration !== input.duration) ||
    (expected.aspectRatio != null &&
      expected.aspectRatio !== input.aspectRatio) ||
    (expected.resolution != null && expected.resolution !== input.resolution);
  if (mismatch) {
    return {
      ok: false,
      code: "RETRY_SPEC_MISMATCH",
      message: "Retry settings do not match the selected parent attempt",
    };
  }

  const bound = byIdempotency.get(
    `${input.sessionId}:${input.idempotencyKey}`
  );
  if (bound && bound !== child.id) {
    return {
      ok: false,
      code: "IDEMPOTENCY_CONFLICT",
      message: "Idempotency key is already bound to another generation attempt",
    };
  }
  if (child.idempotencyKey) {
    byIdempotency.delete(`${input.sessionId}:${child.idempotencyKey}`);
  }
  byIdempotency.set(`${input.sessionId}:${input.idempotencyKey}`, child.id);
  const t = nowIso();
  const claimed: GenerationJob = {
    ...child,
    status: "running",
    model: input.model,
    watermark: input.watermark ?? true,
    provider: input.provider,
    demo: false,
    downloadAllowed: false,
    idempotencyKey: input.idempotencyKey,
    duration: input.duration,
    aspectRatio: input.aspectRatio,
    resolution: input.resolution,
    workerHeartbeatAt: t,
    retryTokenHash: undefined,
    retryClaimedAt: t,
    error: undefined,
    errorCode: undefined,
    videoUrl: undefined,
    creditsOutcome: undefined,
    creditsRefunded: undefined,
    updatedAt: t,
  };
  jobs.set(child.id, claimed);
  return { ok: true, job: claimed };
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
  sweepTimedOutJobs();
  if (input.jobId) {
    const cur = jobs.get(input.jobId);
    if (cur && cur.sessionId === input.sessionId) {
      if (cur.status === "failed" || cur.status === "canceled") {
        // A fixed deadline/cancel is terminal. A late provider response is
        // reconciled separately; it must not reopen or expose this attempt.
        return cur;
      }
      // Open attempts may transition to success; terminal attempts never reopen.
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
  /** When true and not restored — kill/timeout/cancel honesty (image fail parity). */
  refundUnconfirmed?: boolean;
}): GenerationJob {
  const creditsOutcome = failedLedgerCreditsOutcome({
    creditsRefunded: input.creditsRefunded,
    refundUnconfirmed: input.refundUnconfirmed,
    errorCode: input.errorCode,
  });
  if (input.jobId) {
    const cur = jobs.get(input.jobId);
    if (cur && cur.sessionId === input.sessionId) {
      if (cur.status === "canceled") {
        return cur;
      }
      if (cur.status === "failed") {
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
        // Restored when confirmed; ambiguous debit codes → refund unconfirmed.
        creditsOutcome,
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
    refundUnconfirmed: input.refundUnconfirmed,
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
      jobId: id,
      providerRequestId: input.requestId,
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
    generationSpec: {
      effect: input.effect,
      model: input.model,
      duration: input.duration,
      aspectRatio: input.aspectRatio,
      resolution: input.resolution,
    },
    createdAt: t,
    updatedAt: t,
    deadlineAt: fixedDeadlineAt(Date.parse(t), jobTimeoutMs()),
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
  refundUnconfirmed?: boolean;
  preferredId?: string;
  idempotencyKey?: string;
}): GenerationJob {
  const t = nowIso();
  const id =
    input.preferredId && !jobs.has(input.preferredId)
      ? input.preferredId
      : newId();
  const creditsOutcome = failedLedgerCreditsOutcome({
    creditsRefunded: input.creditsRefunded,
    refundUnconfirmed: input.refundUnconfirmed,
    errorCode: input.errorCode,
  });
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
    generationSpec: {
      effect: input.effect,
      model: input.model,
    },
    createdAt: t,
    updatedAt: t,
    deadlineAt: fixedDeadlineAt(Date.parse(t), jobTimeoutMs()),
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
      generationSpec: { effect: job.effect },
      deadlineAt: job.deadlineAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      owned: false,
    };
  }
  const {
    sessionId: _s,
    downloadAllowed: _frozen,
    retryTokenHash: _retrySecret,
    ...rest
  } = job;
  void _s;
  void _frozen;
  void _retrySecret;
  // Recompute from verified derivative metadata, never an operator env flag.
  return {
    ...rest,
    videoUrl: publicVideoUrlForJob(job),
    downloadAllowed: downloadAllowedForJob({
      demo: job.demo,
      watermark: job.watermark,
      status: job.status,
      jobId: job.id,
      providerRequestId: job.requestId,
      bakedDerivative: job.bakedDerivative,
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
 * Idempotent provider webhook apply (Phase D + R1b/R1c honesty).
 * Soft-launch generate still settles inline; this path is for async completions
 * and duplicate webhook retries without double-writing terminal state.
 *
 * R1b: success only while the exact attempt is still `running` and before
 * fixed deadline. Cancel/timeout/orphan success is withheld — never invents
 * free deliverable "10 used" creditsOutcome for unmatched provider events.
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
      /** True when provider media was withheld (late/orphan/canceled). */
      withheld?: boolean;
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
    // R1c: orphan live success is withheld — never claim "10 used" free media.
    if (input.status === "succeeded" && input.videoUrl) {
      if (!isSafeDeliverableUrl(input.videoUrl)) {
        return {
          ok: false,
          code: "UNSAFE_URL",
          message: "succeeded webhook videoUrl is not a safe http(s) or /path URL",
        };
      }
      if (input.demo === true) {
        job = recordSucceededGenerate({
          sessionId: "webhook-orphan",
          effect: "unknown",
          videoUrl: input.videoUrl,
          demo: true,
          watermark: input.watermark !== false,
          model: input.model,
          requestId,
          provider: input.provider || "webhook",
          preferredId: requestId,
          creditsOutcome: "0 cached",
        });
      } else {
        job = recordFailedGenerate({
          sessionId: "webhook-orphan",
          effect: "unknown",
          error:
            "Orphan provider success withheld — no matching process-memory job; durable R1c reconciliation required before any delivery claim",
          errorCode: "WITHHELD_ORPHAN",
          preferredId: requestId,
          refundUnconfirmed: true,
        });
        job = updateJob(job.id, {
          requestId,
          provider: input.provider || "webhook",
          model: input.model,
          // Never store deliverable URL on orphan live success.
          videoUrl: undefined,
          downloadAllowed: false,
        })!;
      }
    } else if (input.status === "failed" || input.status === "canceled") {
      job = recordFailedGenerate({
        sessionId: "webhook-orphan",
        effect: "unknown",
        error: input.error || `Provider ${input.status}`,
        errorCode: input.errorCode || input.status.toUpperCase(),
        preferredId: requestId,
        refundUnconfirmed: true,
      });
      if (input.status === "canceled") {
        job = updateJob(job.id, {
          status: "canceled",
          error: input.error || "Canceled by provider",
          errorCode: "CANCELED",
          creditsOutcome: "refund unconfirmed",
          creditsRefunded: undefined,
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
      withheld: job.status !== "succeeded" || Boolean(job.demo),
      message:
        job.status === "succeeded"
          ? "Created demo job from webhook (orphan)"
          : "Orphan provider event recorded withheld (no free live delivery)",
    };
  }

  // Already terminal → record event and no-op (never reopen canceled/timeout).
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
      withheld: input.status === "succeeded" && job.status !== "succeeded",
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

    // R1b: sweep deadline first, then only complete while still running.
    sweepTimedOutJobs();
    job = findJobByRequestOrId(requestId) || job;
    const decision = providerCompletionDecision(job);
    if (!decision.allow) {
      // Late success after cancel/timeout — withhold media, stamp unconfirmed.
      const withheld = updateJob(job.id, {
        status: job.status === "canceled" ? "canceled" : "failed",
        error: decision.message,
        errorCode: decision.code,
        videoUrl: undefined,
        downloadAllowed: false,
        creditsOutcome: "refund unconfirmed",
        creditsRefunded: undefined,
        requestId: job.requestId || requestId,
        provider: input.provider || job.provider || "webhook",
        model: input.model ?? job.model,
      });
      if (!withheld) {
        return {
          ok: false,
          code: "UPDATE_FAILED",
          message: "Could not stamp late webhook withhold",
        };
      }
      webhookEvents.set(eventId, {
        jobId: withheld.id,
        status: withheld.status,
        appliedAt: t,
      });
      return {
        ok: true,
        duplicate: false,
        job: withheld,
        withheld: true,
        message:
          "Late provider success withheld — attempt no longer running; R1c recon for durable settlement",
      };
    }

    // Running within deadline — soft-launch may attach provider URL; download gate still applies.
    const next = updateJob(job.id, {
      status: "succeeded",
      videoUrl: input.videoUrl,
      demo: Boolean(input.demo),
      watermark: input.watermark !== false,
      model: input.model ?? job.model,
      provider: input.provider || job.provider || "webhook",
      requestId: job.requestId || requestId,
      creditsOutcome: input.demo ? "0 cached" : job.creditsOutcome || "10 used",
      downloadAllowed: downloadAllowedForJob({
        demo: Boolean(input.demo),
        watermark: input.watermark !== false,
        status: "succeeded",
        jobId: job.id,
        providerRequestId: job.requestId || requestId,
      }),
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

  const failCode = input.errorCode || input.status.toUpperCase();
  const next = updateJob(job.id, {
    status: input.status === "canceled" ? "canceled" : "failed",
    error: input.error || `Provider ${input.status}`,
    errorCode: failCode,
    videoUrl: undefined,
    // Provider cancel/fail via webhook never invents a confirmed refund.
    // Ambiguous debit codes stamp refund unconfirmed (failSync parity).
    creditsOutcome:
      input.status === "canceled"
        ? "refund unconfirmed"
        : failedLedgerCreditsOutcome({
            creditsRefunded: job.creditsRefunded,
            errorCode: failCode,
          }) ?? job.creditsOutcome,
    creditsRefunded:
      input.status === "canceled" ? undefined : job.creditsRefunded,
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
  /** R1b/R1c withheld terminal failures (orphan/late provider success). */
  withheld: number;
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
  let withheld = 0;
  for (const j of jobs.values()) {
    byStatus[j.status] = (byStatus[j.status] ?? 0) + 1;
    if (
      j.errorCode === "WITHHELD_ORPHAN" ||
      (j.errorCode === "REQUEST_CANCELED" &&
        /withheld/i.test(j.error || "")) ||
      (j.errorCode === "TIMEOUT" && /withheld/i.test(j.error || ""))
    ) {
      withheld += 1;
    }
  }
  const open = byStatus.queued + byStatus.running;
  return {
    mode: "local-memory",
    durable: false,
    count: jobs.size,
    byStatus,
    open,
    withheld,
    webhookEvents: webhookEvents.size,
    jobTimeoutMs: jobTimeoutMs(),
    timedOutThisProbe: timedOut.length,
    note:
      timedOut.length > 0
        ? `Process-memory ledger; swept ${timedOut.length} timed-out job(s) this probe`
        : open > 0
          ? `Process-memory ledger; ${open} open (queued/running) job(s)`
          : withheld > 0
            ? `Process-memory ledger; ${withheld} withheld late/orphan event(s)`
            : "Process-memory ledger; not multi-node durable",
  };
}

/** Test helper — clear process memory. */
export function __resetGenerationJobsForTests() {
  jobs.clear();
  byIdempotency.clear();
  webhookEvents.clear();
}
