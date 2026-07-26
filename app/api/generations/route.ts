import { NextResponse } from "next/server";
import { ensureSession, publicSession } from "@/lib/session";
import {
  cancelJob,
  createJob,
  jobTimeoutMs,
  listJobsForSession,
  sweepTimedOutJobs,
  touchJob,
  toPublicJob,
} from "@/lib/generationJobs";

export const runtime = "nodejs";

/**
 * Cheap open-job probe for Library / ops — counts only (no job bodies).
 * Sweeps timeouts so HEAD stays honest about mid-flight work.
 */
export async function HEAD() {
  const session = await ensureSession();
  sweepTimedOutJobs();
  const listed = listJobsForSession(session.id, 30);
  let open = 0;
  let succeeded = 0;
  let failed = 0;
  let canceled = 0;
  for (const j of listed) {
    if (j.status === "queued" || j.status === "running") open += 1;
    else if (j.status === "succeeded") succeeded += 1;
    else if (j.status === "failed") failed += 1;
    else if (j.status === "canceled") canceled += 1;
  }
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "X-Pikbo-Jobs": String(listed.length),
      "X-Pikbo-Jobs-Open": String(open),
      "X-Pikbo-Jobs-Succeeded": String(succeeded),
      "X-Pikbo-Jobs-Failed": String(failed),
      "X-Pikbo-Jobs-Canceled": String(canceled),
      "X-Pikbo-Job-Timeout-Ms": String(jobTimeoutMs()),
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
    note: "Ledger marked canceled. Soft-launch sync fal may still complete server-side.",
  });
}

/**
 * Phase D — list recent jobs for this session (local memory adapter).
 * Durable async queue still requires Supabase; soft-launch sync path is
 * POST /api/generate, which records jobs into this ledger.
 * GET also sweeps timed-out queued/running jobs (timeout recovery) and
 * touches open jobs so Library poll does not false-TIMEOUT mid-generate.
 */
export async function GET() {
  const session = await ensureSession();
  const timedOut = sweepTimedOutJobs();
  const listed = listJobsForSession(session.id, 30);
  // Library polls this list (not always /[id]) — slide TTL on every open job.
  let touchedOpen = 0;
  const raw = listed.map((j) => {
    if (j.status !== "queued" && j.status !== "running") return j;
    const next = touchJob(j.id);
    if (next) {
      touchedOpen += 1;
      return next;
    }
    return j;
  });
  const jobs = raw.map((j) => toPublicJob(j, session.id));
  const byStatus = {
    queued: 0,
    running: 0,
    succeeded: 0,
    failed: 0,
    canceled: 0,
  };
  for (const j of raw) {
    byStatus[j.status] = (byStatus[j.status] ?? 0) + 1;
  }
  return NextResponse.json({
    ok: true,
    mode: "local-memory",
    adapter: "process-memory",
    durable: false,
    jobTimeoutMs: jobTimeoutMs(),
    timedOutThisSweep: timedOut.filter((j) => j.sessionId === session.id)
      .length,
    /** How many open jobs had updatedAt slid this poll. */
    touchedOpen,
    /** Session-scoped histogram (Library recovery UI). */
    byStatus,
    open: byStatus.queued + byStatus.running,
    note:
      "In-process ledger for soft-launch recovery. Not multi-node durable. Use POST /api/generate for work. Queued/running jobs past jobTimeoutMs fail with TIMEOUT. List + detail GET touch open jobs.",
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
