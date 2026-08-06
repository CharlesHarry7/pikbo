import { NextResponse } from "next/server";
import { ensureSession, publicCachedSession } from "@/lib/session";
import {
  cancelJob,
  countJobsForSession,
  createJob,
  jobTimeoutMs,
  listJobsForSession,
  sweepTimedOutJobs,
  toPublicJob,
} from "@/lib/generationJobs";
import {
  getPrivateLibraryJobForOwner,
  listPrivateGenerationResults,
  mergePrivateLibraryWithLocalLedger,
} from "@/lib/privateGenerationResults";
import { getAuthUserFromRequest } from "@/lib/supabase/user";

export const runtime = "nodejs";

/** Soft-launch Library recovery page size (newest first). */
const SESSION_JOBS_LIST_LIMIT = 50;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

/**
 * Library listings never expose a provider URL or Supabase signed object URL.
 * The download route re-checks either durable owner identity (UUID) or the
 * current process session before issuing a deliverable.
 */
function controlledLocalJob(job: ReturnType<typeof toPublicJob>) {
  const open = job.status === "queued" || job.status === "running";
  const terminalFailure =
    job.status === "failed" || job.status === "canceled";
  const base = {
    ...job,
    // Process-memory ledger has no durable input_asset_id binding.
    inputBound: false as const,
    durable: false as const,
    adapter: "process-memory" as const,
    capabilities: {
      localRetry: terminalFailure,
      localCancel: open,
      newAttempt: terminalFailure,
      refreshOnly: open,
    },
  };
  if (job.demo || !job.videoUrl) return base;
  const downloadId = (job.requestId || job.id || "").trim();
  return {
    ...base,
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
 *
 * AIT-193: durable private Moments never use process-memory Cancel (item
 * DELETE parity). Owner durable UUID → DURABLE_NO_CANCEL; missing/foreign
 * stay uniform NOT_FOUND (no ownership leak).
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
    // Durable owner path — never invent a process-memory cancel success.
    if (result.code === "NOT_FOUND" && id && isUuid(id)) {
      const authUser = await getAuthUserFromRequest(req);
      if (authUser) {
        const privateJob = await getPrivateLibraryJobForOwner({
          jobId: id,
          userId: authUser.id,
        });
        if (privateJob) {
          const open =
            privateJob.status === "queued" || privateJob.status === "running";
          return NextResponse.json(
            {
              ok: false,
              code: "DURABLE_NO_CANCEL",
              jobId: id,
              message: open
                ? "This durable Moment is still rendering. Refresh Library — process-memory Cancel does not apply."
                : "This durable Moment cannot use process-memory Cancel. Refresh Library or start a new attempt from Create.",
              mode: "supabase-private",
              durable: true,
              status: privateJob.status,
            },
            { status: 422 }
          );
        }
      }
    }

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
        mode: "local-memory",
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
  // Owner-scoped durable rows across queued|running|succeeded|failed|canceled.
  // Anonymous / other accounts never receive these (authUser required).
  const privateJobs = authUser
    ? await listPrivateGenerationResults({
        userId: authUser.id,
        limit: SESSION_JOBS_LIST_LIMIT,
      })
    : [];
  // The local store is capped at 200 rows. Read all of it so a current-process
  // mirror of a durable result can be de-duplicated before counts and listing.
  const localJobs = listJobsForSession(session.id, 200).map((job) =>
    controlledLocalJob(toPublicJob(job, session.id))
  );
  const full = countJobsForSession(session.id);
  const merged = mergePrivateLibraryWithLocalLedger({
    durableJobs: privateJobs,
    localJobs,
    localCounts: {
      queued: full.queued,
      running: full.running,
      succeeded: full.succeeded,
      failed: full.failed,
      canceled: full.canceled,
      open: full.open,
      total: full.total,
    },
    listLimit: SESSION_JOBS_LIST_LIMIT,
  });
  // Fail-closed owner list: never ship owned:false stubs to the client body
  // (toPublicJob already redacts foreign sessions; this is a second gate).
  const ownerJobs = merged.jobs.filter((job) => job.owned !== false);

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
    listed: ownerJobs.length,
    /** Full session + durable-only job count (jobs[] may be a newest page). */
    total: merged.total,
    /** Full histogram including durable open/failed/canceled — HEAD parity. */
    byStatus: merged.byStatus,
    open: merged.open,
    note:
      privateJobs.length > 0
        ? "Owner-gated Supabase durable Moment statuses plus the current process ledger. Queued/running/failed/canceled/succeeded private jobs survive refresh and cross-device sign-in; process-memory Retry/Cancel apply only to local-adapter rows."
        : "In-process ledger for soft-launch recovery. Not multi-node durable. Use POST /api/generate for work. Queued/running jobs fail at fixed deadlineAt; GET is read-only. byStatus/open/total are full-session.",
    compatibility: {
      syncGenerate: "/api/generate",
      jobStatus: "/api/generations/[id]",
      download: "/api/downloads/[id]",
    },
    session: publicCachedSession(session),
    jobs: ownerJobs,
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
