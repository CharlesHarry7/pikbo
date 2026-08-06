import { NextResponse } from "next/server";
import { ensureSession } from "@/lib/session";
import {
  cancelImageJob,
  getImageJob,
  toPublicImageJob,
} from "@/lib/imageJobs";
import { getPrivateLibraryJobForOwner } from "@/lib/privateGenerationResults";
import { getAuthUserFromRequest } from "@/lib/supabase/user";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

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
 *
 * AIT-207: durable owner stills (live reserve generation_jobs UUID) never use
 * process-memory Cancel. Local NOT_FOUND + owner durable UUID →
 * DURABLE_NO_CANCEL; missing/foreign stay uniform NOT_FOUND.
 */
export async function DELETE(req: Request, { params }: Props) {
  const { id } = await params;
  const session = await ensureSession();
  const result = cancelImageJob({ sessionId: session.id, id });
  if (!result.ok) {
    // Durable owner path — never invent a process-memory cancel success.
    if (result.code === "NOT_FOUND" && isUuid(id)) {
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
              id,
              message: open
                ? "This durable still is still rendering. Refresh — process-memory Cancel does not apply."
                : "This durable still cannot use process-memory Cancel. Refresh or start a new attempt.",
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
        id,
        message: result.message,
        mode: "local-memory",
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
