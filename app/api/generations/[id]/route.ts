import { NextResponse } from "next/server";
import { ensureSession } from "@/lib/session";
import {
  cancelJob,
  getJob,
  toPublicJob,
} from "@/lib/generationJobs";
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
 * Library / poll detail. Process-memory jobs stay session-bound.
 * Durable private jobs require auth ownership (created_by = user) and never
 * return another account's metadata — missing and foreign ids share 404.
 */
export async function GET(req: Request, { params }: Props) {
  const { id } = await params;
  const session = await ensureSession();
  // Read-only poll: getJob may sweep a fixed deadline, but never extends it.
  const localJob = getJob(id);
  if (localJob && localJob.sessionId === session.id) {
    const publicJob = toPublicJob(localJob, session.id);
    const open =
      publicJob.status === "queued" || publicJob.status === "running";
    const terminalFailure =
      publicJob.status === "failed" || publicJob.status === "canceled";
    return NextResponse.json({
      ok: true,
      mode: "local-memory",
      durable: false,
      job: {
        ...publicJob,
        // Local ledger has no durable input_asset_id column.
        inputBound: false,
        durable: false as const,
        adapter: "process-memory" as const,
        capabilities: {
          localRetry: terminalFailure,
          localCancel: open,
          newAttempt: terminalFailure,
          refreshOnly: open,
        },
      },
      touched: false,
      note: "Read-only poll; deadlineAt is fixed at job creation.",
    });
  }

  // Owner-scoped durable detail only — never probe by id without created_by.
  const authUser = await getAuthUserFromRequest(req);
  if (authUser && isUuid(id)) {
    const privateJob = await getPrivateLibraryJobForOwner({
      jobId: id,
      userId: authUser.id,
    });
    if (privateJob) {
      return NextResponse.json({
        ok: true,
        mode: "supabase-private",
        durable: true,
        job: privateJob,
        touched: false,
        note: "Owner-gated durable Library detail. No process-memory Retry/Cancel.",
      });
    }
  }

  // Fail-closed for missing, foreign, unauthenticated durable, or non-UUID.
  // Same body shape — no existence leak, no effect/status/media metadata.
  return NextResponse.json(
    {
      ok: false,
      code: "NOT_FOUND",
      id,
      message:
        "No job available for this account. Soft-launch records jobs after POST /api/generate.",
    },
    { status: 404 }
  );
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
    creditsOutcome: result.job.creditsOutcome,
    // Soft-launch cancel never invents restore (list DELETE + downloads parity).
    ...(result.job.creditsOutcome === "refund unconfirmed"
      ? { refundUnconfirmed: true }
      : {}),
    note: "Ledger marked canceled. Soft-launch sync fal jobs may still complete server-side.",
  });
}
