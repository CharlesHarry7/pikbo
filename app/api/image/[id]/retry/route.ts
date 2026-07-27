import { NextResponse } from "next/server";
import { ensureSession } from "@/lib/session";
import { forkRetryImageJob, toPublicImageJob } from "@/lib/imageJobs";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

/**
 * Phase D local still retry handoff — parity with POST /api/generations/[id]/retry.
 * Forks a queued child for tracking; does not re-call Flux.
 * Client re-submits POST /api/image with the parent prompt (new idempotency key).
 */
export async function POST(_req: Request, { params }: Props) {
  const { id } = await params;
  const session = await ensureSession();
  const result = forkRetryImageJob({
    sessionId: session.id,
    parentId: id,
  });
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
  const { job, parent } = result;
  const sp = new URLSearchParams();
  if (parent.prompt?.trim()) sp.set("prompt", parent.prompt.trim().slice(0, 500));
  if (parent.aspect?.trim()) sp.set("aspect", parent.aspect.trim().slice(0, 16));
  // Always start with /image; query carries prompt/aspect when present.
  const imageUi = sp.toString() ? `/image?${sp.toString()}` : "/image";
  return NextResponse.json(
    {
      ok: true,
      mode: "local-memory",
      durable: false,
      message:
        "Still retry forked in process memory. Re-submit POST /api/image with the same prompt — this does not re-run Flux by itself.",
      parent: toPublicImageJob(parent, session.id, { includeDataUrl: true }),
      job: toPublicImageJob(job, session.id),
      next: {
        image: "/api/image",
        status: `/api/image/${job.id}`,
        // Literal "/image" kept for smoke/docs; query form used for handoff.
        imageUi: imageUi.startsWith("/image") ? imageUi : "/image",
      },
      note: "Mint a new idempotency key on Generate still — parent key stays terminal.",
    },
    { status: 202 }
  );
}
