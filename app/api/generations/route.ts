import { NextResponse } from "next/server";
import { ensureSession, publicSession } from "@/lib/session";
import {
  cancelJob,
  countJobsForSession,
  createJob,
  jobTimeoutMs,
  listJobsForSession,
  sweepTimedOutJobs,
  toPublicJob,
} from "@/lib/generationJobs";
import { listPrivateGenerationResults } from "@/lib/privateGenerationResults";
import { getAuthUserFromRequest } from "@/lib/supabase/user";

export const runtime = "nodejs";

/** Soft-launch Library recovery page size (newest first). */
const SESSION_JOBS_LIST_LIMIT = 50;

/**
 * Library listings never expose a provider URL or Supabase signed object URL.
 * The download route re-checks either durable owner identity (UUID) or the
 * current process session before issuing a deliverable.
 */
function controlledLocalJob(job: ReturnType<typeof toPublicJob>) {
  if (job.demo || !job.videoUrl) return job;
  const downloadId = (job.requestId || job.id || "").trim();
  return {
    ...job,
    videoUrl: downloadId
      ? `/api/downloads/${encodeURIComponent(downloadId)}`
      : undefined,
  };
}

/**
 * Cheap open-job probe for Library / ops — counts only (no job bodies).
 * Sweeps timeouts so HEAD stays honest about mid-flight work.
 * Counts the full session ledger (not the list page size) — image HEAD parity.
 */
export async function HEAD() {
  const session = await ensureSession();
  const counts = countJobsForSession(session.id);
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "X-Pikbo-Jobs": String(counts.total),
      "X-Pikbo-Jobs-Open": String(counts.open),
      "X-Pikbo-Jobs-Succeeded": String(counts.succeeded),
      "X-Pikbo-Jobs-Failed": String(counts.failed),
      "X-Pikbo-Jobs-Canceled": String(counts.canceled),
      "X-Pikbo-Job-Timeout-Ms": String(jobTimeoutMs()),
      "X-Pikbo-Jobs-List-Limit": String(SESSION_JOBS_LIST_LIMIT),
    },
  });
}

/**
 * Cancel by jobId / requestId / idempotencyKey (body or query).
 * Parity with DELETE /api/image — used when client aborts mid-POST before
 * a jobId is known. Does not interrupt soft-launch fal mid-flight.
 */
export async function DELETE(req: Request) {
  const session = await ensureSession();
  const url = new URL(req.url);
  let body: {
    jobId?: string;
    requestId?: string;
    id?: string;
    idempotencyKey?: string;
  } = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text) as typeof body;
  } catch {
    /* query-only ok */
  }
  const id =
    (typeof body.jobId === "string" && body.jobId.trim()) ||
    (typeof body.requestId === "string" && body.requestId.trim()) ||
    (typeof body.id === "string" && body.id.trim()) ||
    url.searchParams.get("jobId")?.trim() ||
    url.searchParams.get("requestId")?.trim() ||
    url.searchParams.get("id")?.trim() ||
    undefined;
  const idempotencyKey =
    (typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()) ||
    url.searchParams.get("idempotencyKey")?.trim() ||
    undefined;

  const result = cancelJob({
    sessionId: session.id,
    id,
    idempotencyKey,
  });
  if (!result.ok) {
    const status =
      result.code === "NOT_FOUND"
        ? 404
        : result.code === "NOT_OWNED"
          ? 403
          : result.code === "INVALID"
            ? 400
            : 409;
    return NextResponse.json(
      {
        ok: false,
        code: result.code,
        message: result.message,
        jobId: result.job?.id,
      },
      { status }
    );
  }
  return NextResponse.json({
    ok: true,
    mode: "local-memory",
    durable: false,
    jobId: result.job.id,
    status: result.job.status,
    errorCode: result.job.errorCode,
    creditsOutcome: result.job.creditsOutcome,
    // Soft-launch cancel never invents restore (downloads HEAD parity).
    ...(result.job.creditsOutcome === "refund unconfirmed"
      ? { refundUnconfirmed: true }
      : {}),
    note: "Ledger marked canceled. Soft-launch sync fal may still complete server-side.",
  });
}

/**
 * Phase D — list recent jobs for this session (local memory adapter).
 * Durable async queue still requires Supabase; soft-launch sync path is
 * POST /api/generate, which records jobs into this ledger.
 * GET also sweeps queued/running jobs past their fixed deadline. Polling is
 * read-only and never extends deadlineAt or worker liveness.
 */
export async function GET(req: Request) {
  const session = await ensureSession();
  const authUser = await getAuthUserFromRequest(req);
  const timedOut = sweepTimedOutJobs();
  const privateResults = authUser
    ? await listPrivateGenerationResults({
        userId: authUser.id,
        limit: SESSION_JOBS_LIST_LIMIT,
      })
    : [];
  const privateJobs = privateResults.map((result) => ({
    id: result.jobId,
    status: "succeeded",
    effect: result.effect,
    demo: false,
    watermark: false,
    downloadAllowed: true,
    // Never return a storage object key or signed URL in a Library listing.
    videoUrl: `/api/downloads/${encodeURIComponent(result.jobId)}`,
    creditsOutcome: "10 used",
    requestId: result.jobId,
    model: result.model,
    duration: result.duration,
    aspectRatio: result.aspectRatio,
    resolution: result.resolution,
    createdAt: result.createdAt,
    updatedAt: result.createdAt,
    owned: true,
  }));
  const privateIds = new Set(privateJobs.map((job) => job.id));
  // The local store is capped at 200 rows. Read all of it so a current-process
  // mirror of a durable result can be de-duplicated before counts and listing.
  const localJobs = listJobsForSession(session.id, 200).map((job) =>
    controlledLocalJob(toPublicJob(job, session.id))
  );
  const mirroredPrivateIds = new Set(
    localJobs
      .flatMap((job) => [job.id, job.requestId])
      .filter((id): id is string => Boolean(id && privateIds.has(id)))
  );
  const allLocalJobs = localJobs.filter(
    (job) =>
      !privateIds.has(job.id) &&
      !(job.requestId && privateIds.has(job.requestId))
  );
  const jobs = [...privateJobs, ...allLocalJobs]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, SESSION_JOBS_LIST_LIMIT);
  // Full-session histogram (HEAD parity) — not only the newest list page.
  const full = countJobsForSession(session.id);
  const durableSucceeded = privateJobs.filter(
    (job) => !mirroredPrivateIds.has(job.id)
  ).length;
  const byStatus = {
    queued: full.queued,
    running: full.running,
    succeeded: full.succeeded + durableSucceeded,
    failed: full.failed,
    canceled: full.canceled,
  };
  return NextResponse.json({
    ok: true,
    mode:
      privateJobs.length > 0
        ? "supabase-private+process-memory"
        : "local-memory",
    adapter:
      privateJobs.length > 0
        ? "supabase-private+process-memory"
        : "process-memory",
    durable: privateJobs.length > 0,
    jobTimeoutMs: jobTimeoutMs(),
    timedOutThisSweep: timedOut.filter((j) => j.sessionId === session.id)
      .length,
    touchedOpen: 0,
    /** Newest-first page size for `jobs` (histogram may count more). */
    listLimit: SESSION_JOBS_LIST_LIMIT,
    listed: jobs.length,
    /** Full session job count (jobs[] may be a newest page only). */
    total: full.total + durableSucceeded,
    /** Full session-scoped histogram (Library recovery UI) — HEAD parity. */
    byStatus,
    open: full.open,
    note:
      privateJobs.length > 0
        ? "Owner-gated Supabase private results plus the current process ledger. Private results survive refresh and cross-device sign-in; open local jobs remain process-scoped."
        : "In-process ledger for soft-launch recovery. Not multi-node durable. Use POST /api/generate for work. Queued/running jobs fail at fixed deadlineAt; GET is read-only. byStatus/open/total are full-session.",
    compatibility: {
      syncGenerate: "/api/generate",
      jobStatus: "/api/generations/[id]",
      download: "/api/downloads/[id]",
    },
    session: publicSession(session),
    jobs,
  });
}

/**
 * Create a queued job shell for clients that want a job id before calling
 * sync generate. Does not run the provider — soft-launch still uses
 * POST /api/generate for actual work.
 */
export async function POST(req: Request) {
  let body: { effect?: string; idempotencyKey?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const effect =
    typeof body.effect === "string" && body.effect.trim()
      ? body.effect.trim()
      : "unknown";
  const session = await ensureSession();
  const job = createJob({
    sessionId: session.id,
    effect,
    status: "queued",
    idempotencyKey:
      typeof body.idempotencyKey === "string"
        ? body.idempotencyKey.slice(0, 128)
        : undefined,
  });
  return NextResponse.json(
    {
      ok: true,
      mode: "local-memory",
      durable: false,
      message:
        "Job queued in process memory. Run work via POST /api/generate (sync soft-launch). Poll GET /api/generations/{id} after generate records success.",
      job: toPublicJob(job, session.id),
      next: {
        generate: "/api/generate",
        status: `/api/generations/${job.id}`,
      },
    },
    { status: 202 }
  );
}
