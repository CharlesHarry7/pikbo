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
  creditsOutcome?: "0 cached" | "10 used" | "10 restored";
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

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
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
  const key = idempotencyKey.trim();
  if (!key) return undefined;
  const id = byIdempotency.get(`${sessionId}:${key}`);
  if (!id) return undefined;
  const job = jobs.get(id);
  if (!job || job.sessionId !== sessionId) return undefined;
  return job;
}

export function beginImageJob(input: {
  sessionId: string;
  prompt: string;
  aspect?: string;
  idempotencyKey?: string;
}): ImageJob {
  trimStore();
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

/** Ops probe — counts only, never echoes URLs. */
export function imageJobsProbe(): {
  total: number;
  byStatus: Record<string, number>;
  open: number;
} {
  trimStore();
  const byStatus: Record<string, number> = {};
  let open = 0;
  for (const j of jobs.values()) {
    byStatus[j.status] = (byStatus[j.status] || 0) + 1;
    if (j.status === "running") open += 1;
  }
  return { total: jobs.size, byStatus, open };
}

export function __resetImageJobsForTests(): void {
  jobs.clear();
  byIdempotency.clear();
}
