/**
 * Process-memory still-job ledger (soft-launch).
 * Mirrors generate idempotency: one client key + session → no double Flux debit.
 * R1b parity with video: exact parent id, one-time retry bearer, fixed deadlineAt.
 * Not multi-node durable — Vercel multi-instance needs Redis/Supabase later.
 */

import {
  failedLedgerCreditsOutcome,
  isSafeDeliverableUrl,
} from "@/lib/createTrust";
import {
  deadlineExpired,
  deadlineRemainingMs,
  fixedDeadlineAt,
  mintRetryToken,
  retryTokenDigest,
  retryTokenMatches,
} from "@/lib/generationReliability.mjs";

export type ImageJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";

export type ImageJob = {
  id: string;
  sessionId: string;
  status: ImageJobStatus;
  prompt: string;
  aspect?: string;
  imageUrl?: string;
  demo?: boolean;
  demoReason?:
    | "no_provider_key"
    | "anonymous_cached_only"
    | "free_live_delivery_blocked"
    | "free_trial_video_only";
  model?: string;
  costCredits?: number;
  creditsOutcome?:
    | "0 cached"
    | "10 used"
    | "10 restored"
    | "refund unconfirmed";
  creditsRefunded?: boolean;
  error?: string;
  errorCode?: string;
  idempotencyKey?: string;
  /** Provider request id when available; else local id. */
  requestId?: string;
  /** Parent still id when this row is a process-memory ledger retry fork. */
  parentJobId?: string;
  /** Fixed at open. Reads/heartbeat never extend (R1b). */
  deadlineAt: string;
  /** Trusted worker liveness only; never written by GET/poll. */
  workerHeartbeatAt?: string;
  /** One-time retry bearer digest. Never in PublicImageJob. */
  retryTokenHash?: string;
  retryClaimedAt?: string;
  createdAt: string;
  updatedAt: string;
};

/** Soft-launch Image recovery page size (newest first) — generations parity. */
export const IMAGE_JOBS_LIST_LIMIT = 50;

/**
 * Session-safe still job for GET /api/image — never leaks another session,
 * never echoes unsafe URLs (and never dumps huge data: URLs into list JSON).
 */
export type PublicImageJob = {
  id: string;
  status: ImageJobStatus;
  prompt: string;
  aspect?: string;
  /** Safe http(s)/same-origin only; demo data: URLs omitted from list (size). */
  imageUrl?: string;
  hasImage?: boolean;
  demo?: boolean;
  demoReason?:
    | "no_provider_key"
    | "anonymous_cached_only"
    | "free_live_delivery_blocked"
    | "free_trial_video_only";
  model?: string;
  costCredits?: number;
  creditsOutcome?: ImageJob["creditsOutcome"];
  creditsRefunded?: boolean;
  error?: string;
  errorCode?: string;
  requestId?: string;
  parentJobId?: string;
  deadlineAt?: string;
  createdAt: string;
  updatedAt: string;
  owned: boolean;
};

const jobs = new Map<string, ImageJob>();
/** sessionId:idempotencyKey → job id */
const byIdempotency = new Map<string, string>();

const MAX_JOBS = 200;
const TTL_MS = 30 * 60 * 1000;
/**
 * Soft-launch still jobs: route maxDuration is 60s — default timeout slightly above.
 * Override with PIKBO_IMAGE_JOB_TIMEOUT_MS (min 30s).
 */
const DEFAULT_IMAGE_JOB_TIMEOUT_MS = 90_000;

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function imageJobTimeoutMs(): number {
  const raw = Number(process.env.PIKBO_IMAGE_JOB_TIMEOUT_MS || 0);
  if (Number.isFinite(raw) && raw >= 30_000) return Math.floor(raw);
  return DEFAULT_IMAGE_JOB_TIMEOUT_MS;
}

function trimStore() {
  const t = Date.now();
  for (const [id, j] of jobs) {
    if (t - Date.parse(j.updatedAt) > TTL_MS) {
      jobs.delete(id);
      if (j.idempotencyKey) {
        byIdempotency.delete(`${j.sessionId}:${j.idempotencyKey}`);
      }
    }
  }
  if (jobs.size <= MAX_JOBS) return;
  const ordered = [...jobs.values()].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );
  for (const drop of ordered.slice(0, jobs.size - Math.floor(MAX_JOBS * 0.75))) {
    jobs.delete(drop.id);
    if (drop.idempotencyKey) {
      byIdempotency.delete(`${drop.sessionId}:${drop.idempotencyKey}`);
    }
  }
}

/**
 * Crash / hard-kill recovery: open still jobs past fixed deadline become TIMEOUT.
 * R1b: deadlineAt is immutable; GET poll must not extend it.
 */
export function sweepTimedOutImageJobs(opts?: {
  nowMs?: number;
  timeoutMs?: number;
}): ImageJob[] {
  const now = opts?.nowMs ?? Date.now();
  const timedOut: ImageJob[] = [];
  for (const job of jobs.values()) {
    // Open = queued (ledger retry fork) or running (Flux in flight).
    if (job.status !== "running" && job.status !== "queued") continue;
    const deadlineAt =
      job.deadlineAt ||
      fixedDeadlineAt(
        Date.parse(job.createdAt),
        opts?.timeoutMs ?? imageJobTimeoutMs()
      );
    if (!deadlineExpired(deadlineAt, now)) continue;
    const next: ImageJob = {
      ...job,
      status: "failed",
      error:
        job.status === "queued"
          ? "Still retry fork timed out waiting for re-POST — mint a new key and re-submit POST /api/image"
          : "Still job timed out (process may have been killed mid-Flux) — mint a new idempotency key to retry",
      errorCode: "TIMEOUT",
      // Soft-launch cookie debit may or may not have restored — never claim refund.
      creditsOutcome: "refund unconfirmed",
      creditsRefunded: undefined,
      imageUrl: undefined,
      updatedAt: nowIso(),
    };
    jobs.set(job.id, next);
    timedOut.push(next);
  }
  return timedOut;
}

export function normalizeImageIdempotencyKey(
  raw: unknown
): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim().slice(0, 128);
  if (t.length < 8) return undefined;
  return t;
}

export function findImageJobByIdempotencyKey(
  sessionId: string,
  idempotencyKey: string
): ImageJob | undefined {
  trimStore();
  sweepTimedOutImageJobs();
  const key = idempotencyKey.trim();
  if (!key) return undefined;
  const id = byIdempotency.get(`${sessionId}:${key}`);
  if (!id) return undefined;
  const job = jobs.get(id);
  if (!job || job.sessionId !== sessionId) return undefined;
  return job;
}

/**
 * Seconds until a running still job would TIMEOUT (for JOB_IN_FLIGHT Retry-After).
 * Prefer job age over inflight lock — lock can free after kill while ledger is open.
 */
export function imageJobInFlightRetryAfterSec(job: ImageJob): number {
  if (job.status !== "running" && job.status !== "queued") return 1;
  const remainingMs = deadlineRemainingMs(
    job.deadlineAt ||
      fixedDeadlineAt(Date.parse(job.createdAt), imageJobTimeoutMs())
  );
  if (remainingMs <= 0) return 1;
  return Math.max(1, Math.ceil(remainingMs / 1000));
}

/**
 * Soft-launch local still retry: fork a queued child from a failed|canceled parent.
 * Exact parent ledger id only + one-time bearer (video R1b parity).
 * Does not re-call Flux — client re-submits POST /api/image with claim.
 */
export function forkRetryImageJob(input: {
  sessionId: string;
  parentId: string;
}):
  | { ok: true; job: ImageJob; parent: ImageJob; retryToken: string }
  | {
      ok: false;
      code: "NOT_FOUND" | "NOT_OWNED" | "JOB_IN_FLIGHT" | "NOT_RETRYABLE";
      message: string;
    } {
  trimStore();
  sweepTimedOutImageJobs();
  // Exact immutable ledger job id only — never requestId / prompt guess.
  const parent = jobs.get(input.parentId);
  if (!parent) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Parent still not in this process ledger",
    };
  }
  if (parent.sessionId !== input.sessionId) {
    return {
      ok: false,
      code: "NOT_OWNED",
      message: "Still job belongs to another session",
    };
  }
  if (parent.status === "queued" || parent.status === "running") {
    return {
      ok: false,
      code: "JOB_IN_FLIGHT",
      message:
        "Parent still open — wait for success/failure or cancel ledger first",
    };
  }
  if (parent.status === "succeeded") {
    return {
      ok: false,
      code: "NOT_RETRYABLE",
      message:
        "Parent already succeeded — open Still studio for a new prompt attempt",
    };
  }
  if (parent.status !== "failed" && parent.status !== "canceled") {
    return {
      ok: false,
      code: "NOT_RETRYABLE",
      message: `Parent status “${parent.status}” is not retryable on this ledger`,
    };
  }
  const existingChild = [...jobs.values()].find(
    (j) =>
      j.sessionId === input.sessionId &&
      j.parentJobId === parent.id &&
      (j.status === "queued" || j.status === "running")
  );
  if (existingChild) {
    return {
      ok: false,
      code: "JOB_IN_FLIGHT",
      message: `Retry child ${existingChild.id} is already ${existingChild.status}`,
    };
  }
  const t = nowIso();
  const retryToken = mintRetryToken();
  const job: ImageJob = {
    id: newId(),
    sessionId: input.sessionId,
    status: "queued",
    prompt: parent.prompt,
    aspect: parent.aspect,
    parentJobId: parent.id,
    idempotencyKey: `retry:${parent.id}:${retryTokenDigest(retryToken).slice(0, 24)}`,
    retryTokenHash: retryTokenDigest(retryToken),
    deadlineAt: fixedDeadlineAt(Date.now(), imageJobTimeoutMs()),
    createdAt: t,
    updatedAt: t,
  };
  jobs.set(job.id, job);
  if (job.idempotencyKey) {
    byIdempotency.set(`${input.sessionId}:${job.idempotencyKey}`, job.id);
  }
  return { ok: true, job, parent, retryToken };
}

/**
 * Claim a queued still retry fork with exact job id + one-time bearer.
 * Never promotes by prompt/list order.
 */
export function claimRetryImageJob(input: {
  sessionId: string;
  retryJobId: string;
  retryToken: string;
  prompt: string;
  aspect?: string;
  idempotencyKey?: string;
}):
  | { ok: true; job: ImageJob }
  | {
      ok: false;
      code:
        | "RETRY_TOKEN_INVALID"
        | "RETRY_JOB_NOT_READY"
        | "RETRY_SPEC_MISMATCH"
        | "IDEMPOTENCY_CONFLICT";
      message: string;
    } {
  trimStore();
  sweepTimedOutImageJobs();
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
      message: "Retry still or one-time token is invalid for this session",
    };
  }
  if (child.status !== "queued" || child.retryClaimedAt) {
    return {
      ok: false,
      code: "RETRY_JOB_NOT_READY",
      message: `Retry child is ${child.status}; mint a retry from the selected terminal still`,
    };
  }
  const prompt = input.prompt.slice(0, 2000);
  if (child.prompt && child.prompt !== prompt) {
    return {
      ok: false,
      code: "RETRY_SPEC_MISMATCH",
      message: "Retry prompt does not match the selected parent still",
    };
  }
  if (
    child.aspect &&
    input.aspect &&
    child.aspect !== input.aspect
  ) {
    return {
      ok: false,
      code: "RETRY_SPEC_MISMATCH",
      message: "Retry aspect does not match the selected parent still",
    };
  }
  if (input.idempotencyKey) {
    const bound = byIdempotency.get(
      `${input.sessionId}:${input.idempotencyKey}`
    );
    if (bound && bound !== child.id) {
      return {
        ok: false,
        code: "IDEMPOTENCY_CONFLICT",
        message: "Idempotency key is already bound to another still attempt",
      };
    }
  }
  if (child.idempotencyKey) {
    byIdempotency.delete(`${input.sessionId}:${child.idempotencyKey}`);
  }
  if (input.idempotencyKey) {
    byIdempotency.set(`${input.sessionId}:${input.idempotencyKey}`, child.id);
  }
  const t = nowIso();
  const claimed: ImageJob = {
    ...child,
    status: "running",
    prompt,
    aspect: input.aspect ?? child.aspect,
    idempotencyKey: input.idempotencyKey,
    workerHeartbeatAt: t,
    retryTokenHash: undefined,
    retryClaimedAt: t,
    error: undefined,
    errorCode: undefined,
    imageUrl: undefined,
    creditsOutcome: undefined,
    creditsRefunded: undefined,
    demo: undefined,
    demoReason: undefined,
    updatedAt: t,
  };
  jobs.set(child.id, claimed);
  return { ok: true, job: claimed };
}

/**
 * Trusted worker liveness for mid-Flux stills. Never moves deadlineAt.
 */
export function recordImageWorkerHeartbeat(id: string): ImageJob | null {
  trimStore();
  sweepTimedOutImageJobs();
  const job = jobs.get(id);
  if (!job) return null;
  if (job.status !== "queued" && job.status !== "running") return job;
  const next = { ...job, workerHeartbeatAt: nowIso(), updatedAt: nowIso() };
  jobs.set(job.id, next);
  return next;
}

/**
 * Open a running still for POST /api/image (new attempt, not a retry claim).
 * Retry forks must use claimRetryImageJob with job id + one-time bearer.
 */
export function beginImageJob(input: {
  sessionId: string;
  prompt: string;
  aspect?: string;
  idempotencyKey?: string;
}): ImageJob {
  trimStore();
  sweepTimedOutImageJobs();
  const t = nowIso();
  const prompt = input.prompt.slice(0, 2000);

  // Idempotency bind first.
  if (input.idempotencyKey) {
    const existingId = byIdempotency.get(
      `${input.sessionId}:${input.idempotencyKey}`
    );
    if (existingId) {
      const existing = jobs.get(existingId);
      if (existing && existing.sessionId === input.sessionId) {
        if (existing.status === "running" || existing.status === "queued") {
          const next: ImageJob = {
            ...existing,
            status: "running",
            prompt,
            aspect: input.aspect ?? existing.aspect,
            workerHeartbeatAt: t,
            updatedAt: t,
          };
          jobs.set(existing.id, next);
          return next;
        }
        return existing;
      }
    }
  }

  const job: ImageJob = {
    id: newId(),
    sessionId: input.sessionId,
    status: "running",
    prompt,
    aspect: input.aspect,
    idempotencyKey: input.idempotencyKey,
    deadlineAt: fixedDeadlineAt(Date.now(), imageJobTimeoutMs()),
    workerHeartbeatAt: t,
    createdAt: t,
    updatedAt: t,
  };
  jobs.set(job.id, job);
  if (input.idempotencyKey) {
    byIdempotency.set(`${input.sessionId}:${input.idempotencyKey}`, job.id);
  }
  return job;
}


/**
 * Resolve still job by local id or provider requestId (session-scoped).
 * Used by cancel DELETE and Library-style recovery.
 */
export function findImageJobByRequestOrId(
  sessionId: string,
  idOrRequestId: string
): ImageJob | undefined {
  trimStore();
  sweepTimedOutImageJobs();
  const key = idOrRequestId.trim();
  if (!sessionId || !key) return undefined;
  const byId = jobs.get(key);
  if (byId && byId.sessionId === sessionId) return byId;
  for (const j of jobs.values()) {
    if (j.sessionId !== sessionId) continue;
    if (j.requestId === key || j.id === key) return j;
  }
  return undefined;
}

/**
 * Resolve still job by local id or provider requestId (any session).
 * Caller must gate on sessionId — parity with getJob for video ledger.
 */
export function getImageJob(idOrRequestId: string): ImageJob | null {
  trimStore();
  sweepTimedOutImageJobs();
  const key = idOrRequestId.trim();
  if (!key) return null;
  const byId = jobs.get(key);
  if (byId) return byId;
  for (const j of jobs.values()) {
    if (j.requestId === key || j.id === key) return j;
  }
  return null;
}

/**
 * Slide updatedAt on an open still while a client polls GET /api/image/[id].
 * Prevents false TIMEOUT mid-Flux when PIKBO_IMAGE_JOB_TIMEOUT_MS is short.
 * Terminal jobs are returned unchanged (generations touchJob parity).
 */
export function touchImageJob(idOrRequestId: string): ImageJob | null {
  const job = getImageJob(idOrRequestId);
  if (!job) return null;
  if (job.status !== "running" && job.status !== "queued") return job;
  const next: ImageJob = { ...job, updatedAt: nowIso() };
  jobs.set(job.id, next);
  return next;
}

/**
 * Mark a running|queued still canceled (ledger only — does not kill Flux mid-flight).
 * Provider complete still wins after cancel (parity with generate completeSync).
 */
export function cancelImageJob(input: {
  sessionId: string;
  id?: string;
  idempotencyKey?: string;
}):
  | { ok: true; job: ImageJob }
  | {
      ok: false;
      code: "NOT_FOUND" | "NOT_OWNED" | "NOT_CANCELABLE" | "INVALID";
      message: string;
      job?: ImageJob;
    } {
  trimStore();
  sweepTimedOutImageJobs();
  let job: ImageJob | undefined;
  if (input.id) {
    job = findImageJobByRequestOrId(input.sessionId, input.id);
  } else if (input.idempotencyKey) {
    job = findImageJobByIdempotencyKey(
      input.sessionId,
      input.idempotencyKey
    );
  } else {
    return {
      ok: false,
      code: "INVALID",
      message: "Provide jobId or idempotencyKey to cancel a still job",
    };
  }
  if (!job) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Still job not in this process ledger",
    };
  }
  if (job.sessionId !== input.sessionId) {
    return {
      ok: false,
      code: "NOT_OWNED",
      message: "Still job belongs to another session",
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
      message: `Still job already ${job.status}`,
      job,
    };
  }
  // running | queued (ledger retry fork) are cancelable.
  const next: ImageJob = {
    ...job,
    status: "canceled",
    error: "Canceled by client",
    errorCode: "CANCELED",
    creditsOutcome: "refund unconfirmed",
    creditsRefunded: undefined,
    imageUrl: undefined,
    updatedAt: nowIso(),
  };
  jobs.set(job.id, next);
  return { ok: true, job: next };
}

export function completeImageJob(input: {
  jobId?: string;
  sessionId: string;
  prompt: string;
  aspect?: string;
  imageUrl: string;
  demo: boolean;
  demoReason?:
    | "no_provider_key"
    | "anonymous_cached_only"
    | "free_live_delivery_blocked"
    | "free_trial_video_only";
  model?: string;
  costCredits?: number;
  creditsOutcome?: "0 cached" | "10 used";
  requestId?: string;
  idempotencyKey?: string;
}): ImageJob {
  trimStore();
  const t = nowIso();
  const existing =
    (input.jobId && jobs.get(input.jobId)) ||
    (input.idempotencyKey
      ? findImageJobByIdempotencyKey(input.sessionId, input.idempotencyKey)
      : undefined);

  if (existing && existing.sessionId === input.sessionId) {
    // Provider finished wins: cancel is ledger abandon only (not Flux kill).
    const next: ImageJob = {
      ...existing,
      status: "succeeded",
      prompt: input.prompt.slice(0, 2000),
      aspect: input.aspect ?? existing.aspect,
      imageUrl: input.imageUrl,
      demo: input.demo,
      demoReason: input.demoReason,
      model: input.model,
      costCredits: input.costCredits,
      creditsOutcome: input.creditsOutcome,
      requestId: input.requestId || existing.id,
      error: undefined,
      errorCode: undefined,
      creditsRefunded: undefined,
      updatedAt: t,
    };
    jobs.set(existing.id, next);
    return next;
  }

  const id = newId();
  const job: ImageJob = {
    id,
    sessionId: input.sessionId,
    status: "succeeded",
    prompt: input.prompt.slice(0, 2000),
    aspect: input.aspect,
    imageUrl: input.imageUrl,
    demo: input.demo,
    demoReason: input.demoReason,
    model: input.model,
    costCredits: input.costCredits,
    creditsOutcome: input.creditsOutcome,
    requestId: input.requestId || id,
    idempotencyKey: input.idempotencyKey,
    deadlineAt: fixedDeadlineAt(Date.parse(t), imageJobTimeoutMs()),
    createdAt: t,
    updatedAt: t,
  };
  jobs.set(id, job);
  if (input.idempotencyKey) {
    byIdempotency.set(`${input.sessionId}:${input.idempotencyKey}`, id);
  }
  return job;
}

export function failImageJob(input: {
  jobId?: string;
  sessionId: string;
  prompt: string;
  error: string;
  errorCode?: string;
  model?: string;
  creditsRefunded?: boolean;
  /** When true and not refunded — crash/timeout honesty. */
  refundUnconfirmed?: boolean;
  idempotencyKey?: string;
}): ImageJob {
  trimStore();
  const t = nowIso();
  const existing =
    (input.jobId && jobs.get(input.jobId)) ||
    (input.idempotencyKey
      ? findImageJobByIdempotencyKey(input.sessionId, input.idempotencyKey)
      : undefined);

  // Shared with generate failSync — restored vs refund unconfirmed by code.
  const creditsOutcome = failedLedgerCreditsOutcome({
    creditsRefunded: input.creditsRefunded,
    refundUnconfirmed: input.refundUnconfirmed,
    errorCode: input.errorCode,
  });

  if (existing && existing.sessionId === input.sessionId) {
    // Respect ledger cancel — do not overwrite canceled with failed.
    if (existing.status === "canceled") {
      return existing;
    }
    if (existing.status === "succeeded") {
      return existing;
    }
    const next: ImageJob = {
      ...existing,
      status: "failed",
      error: input.error,
      errorCode: input.errorCode,
      model: input.model ?? existing.model,
      creditsRefunded: input.creditsRefunded,
      creditsOutcome,
      imageUrl: undefined,
      updatedAt: t,
    };
    jobs.set(existing.id, next);
    return next;
  }

  const id = newId();
  const job: ImageJob = {
    id,
    sessionId: input.sessionId,
    status: "failed",
    prompt: input.prompt.slice(0, 2000),
    error: input.error,
    errorCode: input.errorCode,
    model: input.model,
    creditsRefunded: input.creditsRefunded,
    creditsOutcome,
    idempotencyKey: input.idempotencyKey,
    deadlineAt: fixedDeadlineAt(Date.parse(t), imageJobTimeoutMs()),
    createdAt: t,
    updatedAt: t,
  };
  jobs.set(id, job);
  if (input.idempotencyKey) {
    byIdempotency.set(`${input.sessionId}:${input.idempotencyKey}`, id);
  }
  return job;
}

/** Ops probe — counts only, never echoes URLs. Sweeps timeouts first. */
export function imageJobsProbe(): {
  total: number;
  byStatus: Record<string, number>;
  open: number;
  jobTimeoutMs: number;
  timedOutThisProbe: number;
  note: string;
} {
  trimStore();
  const timedOut = sweepTimedOutImageJobs();
  // Always expose full histogram (incl. queued/canceled=0) for Mode A honesty.
  const byStatus: Record<string, number> = {
    queued: 0,
    running: 0,
    succeeded: 0,
    failed: 0,
    canceled: 0,
  };
  let open = 0;
  for (const j of jobs.values()) {
    byStatus[j.status] = (byStatus[j.status] || 0) + 1;
    if (j.status === "running" || j.status === "queued") open += 1;
  }
  return {
    total: jobs.size,
    byStatus,
    open,
    jobTimeoutMs: imageJobTimeoutMs(),
    timedOutThisProbe: timedOut.length,
    note:
      timedOut.length > 0
        ? `Process-memory still ledger; swept ${timedOut.length} timed-out job(s) this probe`
        : open > 0
          ? "Process-memory still ledger; open Flux jobs on this instance"
          : "Process-memory still ledger; idle",
  };
}

/**
 * Session-scoped open still count (HEAD /api/image).
 * Sweeps timeouts so ops never see infinite open after crash.
 */
export function listImageJobCountsForSession(sessionId: string): {
  total: number;
  open: number;
  succeeded: number;
  failed: number;
  canceled: number;
  running: number;
  queued: number;
} {
  trimStore();
  sweepTimedOutImageJobs();
  let total = 0;
  let open = 0;
  let succeeded = 0;
  let failed = 0;
  let canceled = 0;
  let running = 0;
  let queued = 0;
  for (const j of jobs.values()) {
    if (j.sessionId !== sessionId) continue;
    total += 1;
    if (j.status === "running") {
      open += 1;
      running += 1;
    } else if (j.status === "queued") {
      open += 1;
      queued += 1;
    } else if (j.status === "succeeded") succeeded += 1;
    else if (j.status === "failed") failed += 1;
    else if (j.status === "canceled") canceled += 1;
  }
  return { total, open, succeeded, failed, canceled, running, queued };
}

/**
 * Newest-first still jobs for this session (Library/Image recovery).
 * Full histogram uses listImageJobCountsForSession — not this page slice.
 */
export function listImageJobsForSession(
  sessionId: string,
  limit = IMAGE_JOBS_LIST_LIMIT
): ImageJob[] {
  trimStore();
  sweepTimedOutImageJobs();
  return [...jobs.values()]
    .filter((j) => j.sessionId === sessionId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, Math.max(1, Math.min(limit, 100)));
}

/**
 * @deprecated R1b: GET poll is read-only. Kept for ops probes that still call
 * it; does **not** extend deadlineAt (only last-seen updatedAt).
 */
export function touchOpenImageJobsForSession(sessionId: string): number {
  trimStore();
  sweepTimedOutImageJobs();
  let n = 0;
  const t = nowIso();
  for (const j of jobs.values()) {
    if (j.sessionId !== sessionId) continue;
    if (j.status !== "running" && j.status !== "queued") continue;
    // Last-seen only — deadlineAt stays fixed.
    jobs.set(j.id, { ...j, updatedAt: t });
    n += 1;
  }
  return n;
}

/**
 * Public still job for GET /api/image — session-gated, URL-safe.
 * List responses omit multi-KB data: bodies (hasImage only).
 * Single-job GET may pass includeDataUrl for session recovery of demo stills.
 */
export function toPublicImageJob(
  job: ImageJob,
  sessionId: string,
  opts?: { includeDataUrl?: boolean }
): PublicImageJob {
  if (job.sessionId !== sessionId) {
    return {
      id: job.id,
      status: "failed",
      prompt: "",
      error: "Not found",
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      owned: false,
    };
  }
  const raw = job.imageUrl;
  const isData = Boolean(raw && raw.startsWith("data:image/"));
  const safeHttp = Boolean(raw && isSafeDeliverableUrl(raw));
  let publicUrl: string | undefined;
  if (job.status === "succeeded" && raw) {
    if (safeHttp && !isData) publicUrl = raw;
    else if (opts?.includeDataUrl && isData) publicUrl = raw;
  }
  return {
    id: job.id,
    status: job.status,
    prompt: job.prompt.slice(0, 240),
    aspect: job.aspect,
    ...(publicUrl ? { imageUrl: publicUrl } : {}),
    hasImage: Boolean(
      job.status === "succeeded" && raw && (safeHttp || isData)
    ),
    demo: job.demo,
    ...(job.demoReason ? { demoReason: job.demoReason } : {}),
    model: job.model,
    costCredits: job.costCredits,
    creditsOutcome: job.creditsOutcome,
    creditsRefunded: job.creditsRefunded,
    error: job.error,
    errorCode: job.errorCode,
    requestId: job.requestId || job.id,
    ...(job.parentJobId ? { parentJobId: job.parentJobId } : {}),
    deadlineAt: job.deadlineAt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    owned: true,
  };
}

export function __resetImageJobsForTests(): void {
  jobs.clear();
  byIdempotency.clear();
}
