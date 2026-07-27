import { NextResponse } from "next/server";
import { ensureSession } from "@/lib/session";
import { forkRetryJob, toPublicJob } from "@/lib/generationJobs";
import { createRemixHref, remixOptsFromRecord } from "@/lib/remixIntent";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

/**
 * Phase D local retry handoff.
 * Forks a queued child job for tracking; does not re-call the provider
 * (still image is not stored server-side). Soft-launch clients re-submit
 * POST /api/generate with the same photo + effect. Seller Pack retries
 * only the failed child — siblings stay playable.
 */
export async function POST(_req: Request, { params }: Props) {
  const { id } = await params;
  const session = await ensureSession();
  const result = forkRetryJob({ sessionId: session.id, parentId: id });
  if (!result.ok) {
    const status =
      result.code === "NOT_FOUND"
        ? 404
        : result.code === "NOT_OWNED"
          ? 403
          : result.code === "JOB_IN_FLIGHT"
            ? 409
            : 422;
    return NextResponse.json(
      {
        ok: false,
        code: result.code,
        id,
        message: result.message,
        mode: "local-memory",
      },
      { status }
    );
  }
  const { job, parent, retryToken } = result;
  // Remix contract: carry parent job ratio/duration when recorded (not bare effect=).
  const baseCreateUi = createRemixHref(
    parent.effect,
    undefined,
    null,
    remixOptsFromRecord(parent)
  );
  const retryCreateUrl = new URL(baseCreateUi, "https://pikbo.local");
  const parentModel = parent.generationSpec.model || parent.model || "";
  retryCreateUrl.searchParams.set(
    "model",
    /mini/i.test(parentModel)
      ? "seedance-mini"
      : /fast/i.test(parentModel)
        ? "seedance-fast"
        : "seedance-2"
  );
  if (parent.generationSpec.resolution || parent.resolution) {
    retryCreateUrl.searchParams.set(
      "resolution",
      parent.generationSpec.resolution || parent.resolution!
    );
  }
  retryCreateUrl.searchParams.set("retryJobId", job.id);
  const createUi = `${retryCreateUrl.pathname}${retryCreateUrl.search}`;
  return NextResponse.json(
    {
      ok: true,
      mode: "local-memory",
      durable: false,
      message:
        "Retry child queued. Open Create and submit with this exact child id and one-time token; effect-only re-posts cannot claim it.",
      parent: toPublicJob(parent, session.id),
      job: toPublicJob(job, session.id),
      next: {
        generate: "/api/generate",
        status: `/api/generations/${job.id}`,
        createUi,
        retryJobId: job.id,
        retryToken,
      },
      note: "Seller Pack: only this child is re-quoted; successful siblings stay available.",
    },
    { status: 202 }
  );
}
