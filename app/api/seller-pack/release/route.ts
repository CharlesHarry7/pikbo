import { NextResponse } from "next/server";
import { releaseSellerPackChild } from "@/lib/durableCredits/sellerPack";
import { durableCreditsActive } from "@/lib/durableCredits";
import { getAuthUserFromRequest } from "@/lib/supabase/user";

export const runtime = "nodejs";

/**
 * Release exactly 10 credits on a confirmed Seller Pack child failure.
 * Prefer packRunId + packJobId + authenticated owner. Ambiguous failures must
 * not claim a refund (generate route fail-closed path).
 */
export async function POST(req: Request) {
  let body: {
    reservationId?: string;
    jobId?: string;
    packJobId?: string;
    packRunId?: string;
    childKey?: string;
    childCredits?: number;
    reason?: string;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const auth = await getAuthUserFromRequest(req);
  const packRunId =
    typeof body.packRunId === "string" ? body.packRunId.trim() : "";
  const packJobId =
    typeof body.packJobId === "string"
      ? body.packJobId.trim()
      : typeof body.jobId === "string"
        ? body.jobId.trim()
        : "";

  if (!durableCreditsActive()) {
    return NextResponse.json({ ok: true, skipped: true, code: "DURABLE_OFF" });
  }

  if (auth?.id && packRunId && packJobId) {
    const result = await releaseSellerPackChild({
      userId: auth.id,
      packRunId,
      packJobId,
      jobId: packJobId,
      reason: body.reason,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, code: result.code, error: result.error },
        { status: 400 }
      );
    }
    return NextResponse.json({
      ok: true,
      mode: "atomic",
      creditsRefunded: true,
    });
  }

  if (body.reservationId && typeof body.reservationId === "string") {
    const result = await releaseSellerPackChild({
      reservationId: body.reservationId,
      jobId: body.jobId,
      childKey: body.childKey,
      childCredits: body.childCredits,
      reason: body.reason,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, code: result.code, error: result.error },
        { status: 400 }
      );
    }
    return NextResponse.json({
      ok: true,
      skipped: result.skipped === true,
      code: result.code || "PACK_RELEASE_SERVER_OWNED",
    });
  }

  return NextResponse.json(
    {
      ok: false,
      code: "INVALID_REQUEST",
      error: "packRunId and packJobId required (or legacy reservationId)",
    },
    { status: 400 }
  );
}
