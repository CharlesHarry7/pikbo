import { NextResponse } from "next/server";
import { ensureSession } from "@/lib/session";
import {
  cancelImageJob,
  getImageJob,
  toPublicImageJob,
} from "@/lib/imageJobs";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

/**
 * Single still poll — parity with GET /api/generations/[id].
 * R1b: read-only — never extends fixed deadlineAt.
 * includeDataUrl: owned demo stills can recover data: bodies (list omits them).
 */
export async function GET(_req: Request, { params }: Props) {
  const { id } = await params;
  const session = await ensureSession();
  // Read-only poll: getImageJob may sweep TIMEOUT but does not slide deadline.
  const job = getImageJob(id);
  if (!job || job.sessionId !== session.id) {
    return NextResponse.json(
      {
        ok: false,
        code: "NOT_FOUND",
        id,
        message:
          "No still job in this session's local ledger. Soft-launch records jobs after POST /api/image.",
      },
      { status: 404 }
    );
  }
  return NextResponse.json({
    ok: true,
    mode: "local-memory",
    durable: false,
    job: toPublicImageJob(job, session.id, { includeDataUrl: true }),
    /** R1b: polls never extend deadlineAt. */
    touched: false,
    note: "Read-only poll — fixed deadlineAt; worker heartbeat is separate.",
  });
}

/**
 * Cancel one still by path id — parity with DELETE /api/generations/[id].
 * Ledger only; does not interrupt in-flight Flux.
 */
export async function DELETE(_req: Request, { params }: Props) {
  const { id } = await params;
  const session = await ensureSession();
  const result = cancelImageJob({ sessionId: session.id, id });
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
          ? toPublicImageJob(result.job, session.id, { includeDataUrl: true })
          : undefined,
      },
      { status }
    );
  }
  return NextResponse.json({
    ok: true,
    mode: "local-memory",
    durable: false,
    job: toPublicImageJob(result.job, session.id, { includeDataUrl: true }),
    jobId: result.job.id,
    status: result.job.status,
    errorCode: result.job.errorCode,
    creditsOutcome: result.job.creditsOutcome,
    ...(result.job.creditsOutcome === "refund unconfirmed"
      ? { refundUnconfirmed: true }
      : {}),
    note: "Still ledger marked canceled. Soft-launch Flux may still complete server-side.",
  });
}
