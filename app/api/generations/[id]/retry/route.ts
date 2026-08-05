import { NextResponse } from "next/server";
import { ensureSession } from "@/lib/session";
import { forkRetryJob, toPublicJob } from "@/lib/generationJobs";
import { createRemixHref, remixOptsFromRecord } from "@/lib/remixIntent";
import { getPrivateLibraryJobForOwner } from "@/lib/privateGenerationResults";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";
import { getAuthUserFromRequest } from "@/lib/supabase/user";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

const GENERIC_LIBRARY_CREATE = `${MOMENT_CREATE_HREF}&source=library` as const;

/**
 * Phase D local retry handoff.
 * Forks a queued child job for tracking; does not re-call the provider
 * (still image is not stored server-side). Soft-launch clients re-submit
 * POST /api/generate with the same photo + effect. Seller Pack retries
 * only the failed child — siblings stay playable.
 *
 * AIT-148: durable private Moments never fork process-memory Retry. Owner
 * terminal rows return DURABLE_USE_NEW_ATTEMPT with a Create handoff;
 * missing/foreign ids stay uniform NOT_FOUND (no ownership leak).
 */
export async function POST(req: Request, { params }: Props) {
  const { id } = await params;
  const session = await ensureSession();
  const result = forkRetryJob({ sessionId: session.id, parentId: id });
  if (!result.ok) {
    // Durable owner path — never invent a process-memory retry fork.
    if (result.code === "NOT_FOUND" && isUuid(id)) {
      const authUser = await getAuthUserFromRequest(req);
      if (authUser) {
        const privateJob = await getPrivateLibraryJobForOwner({
          jobId: id,
          userId: authUser.id,
        });
        if (privateJob) {
          if (
            privateJob.status === "queued" ||
            privateJob.status === "running"
          ) {
            return NextResponse.json(
              {
                ok: false,
                code: "DURABLE_IN_FLIGHT",
                id,
                message:
                  "This Moment is still rendering. Refresh Library — process-memory Retry does not apply to durable jobs.",
                mode: "supabase-private",
                durable: true,
              },
              { status: 409 }
            );
          }
          if (privateJob.status === "succeeded") {
            return NextResponse.json(
              {
                ok: false,
                code: "DURABLE_ALREADY_SUCCEEDED",
                id,
                message:
                  "This Moment already succeeded. Open Create for a new attempt — process-memory Retry does not apply.",
                mode: "supabase-private",
                durable: true,
              },
              { status: 422 }
            );
          }
          // failed | canceled — honest Create handoff (same-photo when gated).
          const createUi =
            typeof privateJob.newAttemptUrl === "string" &&
            privateJob.newAttemptUrl.startsWith("/create?")
              ? privateJob.newAttemptUrl
              : GENERIC_LIBRARY_CREATE;
          return NextResponse.json(
            {
              ok: false,
              code: "DURABLE_USE_NEW_ATTEMPT",
              id,
              message:
                "This durable Moment cannot use process-memory Retry. Start a new attempt from Create.",
              mode: "supabase-private",
              durable: true,
              next: {
                createUi,
                newAttempt: true,
              },
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
