import { NextResponse } from "next/server";
import { ensureSession } from "@/lib/session";
import { forkRetryImageJob, toPublicImageJob } from "@/lib/imageJobs";
import { getPrivateLibraryJobForOwner } from "@/lib/privateGenerationResults";
import { acceptControlledLibraryNewAttemptUrl } from "@/lib/privateGenerationResultsPure.mjs";
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
/** Honest Image studio new-attempt when no controlled Create handoff applies. */
const GENERIC_IMAGE_NEW_ATTEMPT = "/image" as const;

/**
 * Phase D local still retry handoff — parity with POST /api/generations/[id]/retry.
 * Forks a queued child for tracking; does not re-call Flux.
 * Client re-submits POST /api/image with exact child id + one-time bearer.
 *
 * AIT-477 / AIT-211 residual: durable owner stills/Moments never fork
 * process-memory Retry. Local NOT_FOUND + UUID + auth owner durable row →
 * DURABLE_USE_NEW_ATTEMPT / DURABLE_IN_FLIGHT / DURABLE_ALREADY_SUCCEEDED
 * (or DURABLE_DETAIL_UNAVAILABLE when storage is down). Missing/foreign stay
 * uniform NOT_FOUND (no ownership leak). Same-photo Create handoff only after
 * owner-ready toy asset membership (gated in getPrivateLibraryJobForOwner).
 */
export async function POST(req: Request, { params }: Props) {
  const { id } = await params;
  const session = await ensureSession();
  const result = forkRetryImageJob({
    sessionId: session.id,
    parentId: id,
  });
  if (!result.ok) {
    // Durable owner path — never invent a process-memory retry fork.
    if (result.code === "NOT_FOUND" && isUuid(id)) {
      const authUser = await getAuthUserFromRequest(req);
      if (authUser) {
        const privateLookup = await getPrivateLibraryJobForOwner({
          jobId: id,
          userId: authUser.id,
        });
        // Storage down → 503, not local 404 (never fork, never claim missing).
        if (!privateLookup.ok) {
          return NextResponse.json(
            {
              ok: false,
              code: "DURABLE_DETAIL_UNAVAILABLE",
              id,
              message:
                "Private Library could not verify this still for Retry. Retry when storage is ready — process-memory fork was not created.",
              mode: "supabase-private",
              durable: true,
            },
            { status: 503 }
          );
        }
        const privateJob = privateLookup.job;
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
                  "This durable still is still rendering. Refresh — process-memory Retry does not apply to durable jobs.",
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
                  "This durable still already succeeded. Open Create or Image for a new attempt — process-memory Retry does not apply.",
                mode: "supabase-private",
                durable: true,
              },
              { status: 422 }
            );
          }
          // failed | canceled — same-photo Create only when the controlled
          // accept gate passes (owner-ready asset already applied in
          // getPrivateLibraryJobForOwner). Loose startsWith is not enough.
          const createUi =
            acceptControlledLibraryNewAttemptUrl(privateJob.newAttemptUrl) ??
            GENERIC_LIBRARY_CREATE;
          return NextResponse.json(
            {
              ok: false,
              code: "DURABLE_USE_NEW_ATTEMPT",
              id,
              message:
                "This durable still cannot use process-memory Retry. Start a new attempt from Create or Image.",
              mode: "supabase-private",
              durable: true,
              next: {
                createUi,
                imageUi: GENERIC_IMAGE_NEW_ATTEMPT,
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
  const sp = new URLSearchParams();
  if (parent.prompt?.trim()) sp.set("prompt", parent.prompt.trim().slice(0, 500));
  if (parent.aspect?.trim()) sp.set("aspect", parent.aspect.trim().slice(0, 16));
  // R1b: exact child id in URL; one-time bearer lives in sessionStorage (not query).
  sp.set("retryJobId", job.id);
  const imageUi = sp.toString() ? `/image?${sp.toString()}` : "/image";
  return NextResponse.json(
    {
      ok: true,
      mode: "local-memory",
      durable: false,
      message:
        "Still retry child queued. Re-submit POST /api/image with this exact child id and one-time token; prompt-only re-posts cannot claim it.",
      parent: toPublicImageJob(parent, session.id, { includeDataUrl: true }),
      job: toPublicImageJob(job, session.id),
      next: {
        image: "/api/image",
        status: `/api/image/${job.id}`,
        retryJobId: job.id,
        retryToken,
        // Literal "/image" kept for smoke/docs; query form used for handoff.
        imageUi: imageUi.startsWith("/image") ? imageUi : "/image",
        prompt: parent.prompt,
        aspect: parent.aspect,
      },
      note: "Mint a new idempotency key on Generate still — parent key stays terminal. Pass retryJobId + retryToken once.",
    },
    { status: 202 }
  );
}
