import { NextResponse } from "next/server";
import { ensureSession } from "@/lib/session";
import {
  cancelJob,
  getJob,
  touchJob,
  toPublicJob,
} from "@/lib/generationJobs";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Props) {
  const { id } = await params;
  const session = await ensureSession();
  // getJob sweeps timeouts first; touch slides open-job TTL while clients poll.
  let job = getJob(id);
  if (job && job.sessionId === session.id) {
    const touched = touchJob(job.id);
    if (touched) job = touched;
  }
  if (!job || job.sessionId !== session.id) {
    return NextResponse.json(
      {
        ok: false,
        code: "NOT_FOUND",
        id,
        message:
          "No job in this session's local ledger. Soft-launch records jobs after POST /api/generate.",
      },
      { status: 404 }
    );
  }
  return NextResponse.json({
    ok: true,
    mode: "local-memory",
    durable: false,
    job: toPublicJob(job, session.id),
    /** True when this GET extended the open-job timeout window. */
    touched: job.status === "queued" || job.status === "running",
  });
}

/**
 * Phase D — cancel a queued/running local job (ledger only).
 * Does not interrupt an in-flight soft-launch fal request.
 */
export async function DELETE(_req: Request, { params }: Props) {
  const { id } = await params;
  const session = await ensureSession();
  const result = cancelJob({ sessionId: session.id, id });
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
        id,
        message: result.message,
        job: result.job
          ? toPublicJob(result.job, session.id)
          : undefined,
      },
      { status }
    );
  }
  return NextResponse.json({
    ok: true,
    mode: "local-memory",
    durable: false,
    job: toPublicJob(result.job, session.id),
    note: "Ledger marked canceled. Soft-launch sync fal jobs may still complete server-side.",
  });
}
