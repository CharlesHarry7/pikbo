/**
 * Process-memory still-job ledger (soft-launch).
 * Mirrors generate idempotency: one client key + session → no double Flux debit.
 * Not multi-node durable — Vercel multi-instance needs Redis/Supabase later.
 */

export type ImageJobStatus = "running" | "succeeded" | "failed";

export type ImageJob = {
  id: string;
  sessionId: string;
  status: ImageJobStatus;
  prompt: string;
  aspect?: string;
  imageUrl?: string;
  demo?: boolean;
  demoReason?: "no_provider_key" | "free_trial_video_only";
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
  createdAt: string;
  updatedAt: string;
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
 * Crash / hard-kill recovery: open still jobs past timeout become failed TIMEOUT.
 * Same key then replays as fail (mint a new key to retry) — never infinite JOB_IN_FLIGHT.
 */
export function sweepTimedOutImageJobs(opts?: {
  nowMs?: number;
  timeoutMs?: number;
}): ImageJob[] {
  const now = opts?.nowMs ?? Date.now();
  const limit = opts?.timeoutMs ?? imageJobTimeoutMs();
  const timedOut: ImageJob[] = [];
  for (const job of jobs.values()) {
    if (job.status !== "running") continue;
    const stamp = job.updatedAt || job.createdAt;
    const age = now - Date.parse(stamp);
    if (!Number.isFinite(age) || age < limit) continue;
    const next: ImageJob = {
      ...job,
      status: "failed",
      error:
        "Still job timed out (process may have been killed mid-Flux) — mint a new idempotency key to retry",
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
  if (job.status !== "running") return 1;
  const stamp = job.updatedAt || job.createdAt;
  const age = Date.now() - Date.parse(stamp);
  if (!Number.isFinite(age)) return 1;
  const remainingMs = imageJobTimeoutMs() - age;
  if (remainingMs <= 0) return 1;
  return Math.max(1, Math.ceil(remainingMs / 1000));
}

export function beginImageJob(input: {
  sessionId: string;
  prompt: string;
  aspect?: string;
  idempotencyKey?: string;
}): ImageJob {
  trimStore();
  sweepTimedOutImageJobs();
  const t = nowIso();
  const job: ImageJob = {
    id: newId(),
    sessionId: input.sessionId,
    status: "running",
    prompt: input.prompt.slice(0, 2000),
    aspect: input.aspect,
    idempotencyKey: input.idempotencyKey,
    createdAt: t,
    updatedAt: t,
  };
  jobs.set(job.id, job);
  if (input.idempotencyKey) {
    byIdempotency.set(`${input.sessionId}:${input.idempotencyKey}`, job.id);
  }
  return job;
}

export function completeImageJob(input: {
  jobId?: string;
  sessionId: string;
  prompt: string;
  aspect?: string;
  imageUrl: string;
  demo: boolean;
  demoReason?: "no_provider_key" | "free_trial_video_only";
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

  const creditsOutcome: ImageJob["creditsOutcome"] = input.creditsRefunded
    ? "10 restored"
    : input.refundUnconfirmed
      ? "refund unconfirmed"
      : undefined;

  if (existing && existing.sessionId === input.sessionId) {
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
  const byStatus: Record<string, number> = {};
  let open = 0;
  for (const j of jobs.values()) {
    byStatus[j.status] = (byStatus[j.status] || 0) + 1;
    if (j.status === "running") open += 1;
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
} {
  trimStore();
  sweepTimedOutImageJobs();
  let total = 0;
  let open = 0;
  let succeeded = 0;
  let failed = 0;
  for (const j of jobs.values()) {
    if (j.sessionId !== sessionId) continue;
    total += 1;
    if (j.status === "running") open += 1;
    else if (j.status === "succeeded") succeeded += 1;
    else if (j.status === "failed") failed += 1;
  }
  return { total, open, succeeded, failed };
}

export function __resetImageJobsForTests(): void {
  jobs.clear();
  byIdempotency.clear();
}
