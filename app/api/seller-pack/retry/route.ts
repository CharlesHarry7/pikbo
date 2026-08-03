import { NextResponse } from "next/server";
import { ensureSession, publicSession } from "@/lib/session";
import { getAuthUserFromRequest } from "@/lib/supabase/user";
import { durableCreditsActive } from "@/lib/durableCredits";
import { retrySellerPackChildAtomic } from "@/lib/durableCredits/sellerPack";
import { resolvePrivateLiveAccess } from "@/lib/privateLiveAccessServer";

export const runtime = "nodejs";

/**
 * Reopen the same failed pack child: re-reserve only its released 10 credits.
 * Requires a new attempt idempotency key. Never creates a fourth logical child
 * or re-runs a successful child.
 */
export async function POST(req: Request) {
  let body: {
    packRunId?: string;
    packJobId?: string;
    jobId?: string;
    attemptKey?: string;
    idempotencyKey?: string;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const session = await ensureSession();
  const auth = await getAuthUserFromRequest(req);
  if (!auth?.id) {
    return NextResponse.json(
      {
        ok: false,
        code: "AUTH_REQUIRED",
        error: "Sign in to retry a Launch Pack child",
        session: publicSession(session),
      },
      { status: 401 }
    );
  }
  if (!durableCreditsActive()) {
    return NextResponse.json(
      {
        ok: false,
        code: "DURABLE_OFF",
        error: "Durable credits unavailable",
        session: publicSession(session),
      },
      { status: 503 }
    );
  }

  // Retrying a failed child re-reserves 10 durable credits. Keep the same
  // invite boundary as the initial Pack reserve so an invite revocation can
  // never turn a stale owner link into a new credit hold/provider attempt.
  const privateLive = resolvePrivateLiveAccess(auth);
  if (!privateLive.invite.invited) {
    return NextResponse.json(
      {
        ok: false,
        code: "PRIVATE_PREVIEW_REQUIRED",
        error: "Private seller Preview access is required to retry this Pack",
        session: publicSession(session),
      },
      { status: 403 }
    );
  }

  const packRunId =
    typeof body.packRunId === "string" ? body.packRunId.trim() : "";
  const packJobId =
    typeof body.packJobId === "string"
      ? body.packJobId.trim()
      : typeof body.jobId === "string"
        ? body.jobId.trim()
        : "";
  const attemptKey =
    typeof body.attemptKey === "string"
      ? body.attemptKey.trim().slice(0, 128)
      : typeof body.idempotencyKey === "string"
        ? body.idempotencyKey.trim().slice(0, 128)
        : "";

  if (packRunId.length < 8 || packJobId.length < 8 || attemptKey.length < 8) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_REQUEST",
        error: "packRunId, packJobId, and a new attemptKey are required",
        session: publicSession(session),
      },
      { status: 400 }
    );
  }

  const result = await retrySellerPackChildAtomic({
    userId: auth.id,
    packRunId,
    jobId: packJobId,
    attemptKey,
  });

  if (!result.ok) {
    const status =
      result.code === "INSUFFICIENT_CREDITS"
        ? 402
        : result.code === "PACK_NOT_FOUND" ||
            result.code === "JOB_BINDING_MISMATCH"
          ? 404
          : result.code === "CHILD_ALREADY_SUCCEEDED"
            ? 409
            : 400;
    return NextResponse.json(
      {
        ok: false,
        code: result.code,
        error: result.error,
        need: result.need,
        have: result.have,
        session: publicSession(session),
      },
      { status }
    );
  }

  return NextResponse.json({
    ok: true,
    packRunId: result.data.packRunId,
    packJobId: result.data.jobId,
    jobId: result.data.jobId,
    reservationId: result.data.reservationId,
    childKey: result.data.childKey,
    status: result.data.status,
    attemptKey: result.data.attemptKey,
    availableCredits: result.data.availableCredits,
    reservedCredits: result.data.reservedCredits,
    packSettledCredits: result.data.packSettledCredits,
    packReleasedCredits: result.data.packReleasedCredits,
    idempotent: result.data.idempotent,
    session: publicSession(session),
  });
}
