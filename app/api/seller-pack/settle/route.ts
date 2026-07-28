import { NextResponse } from "next/server";
import { settleSellerPackChild } from "@/lib/durableCredits/sellerPack";
import { durableCreditsActive } from "@/lib/durableCredits";
import { getAuthUserFromRequest } from "@/lib/supabase/user";

export const runtime = "nodejs";

/**
 * Settle exactly 10 credits on a bound Seller Pack child.
 * Prefer packRunId + packJobId + authenticated owner. Client-supplied credit
 * amounts and bare reservation IDs are never spend authority.
 */
export async function POST(req: Request) {
  let body: {
    reservationId?: string;
    jobId?: string;
    packJobId?: string;
    packRunId?: string;
    childKey?: string;
    childCredits?: number;
    providerRequestId?: string;
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

  // Atomic pack settle (owner-bound). Client credit amounts are ignored.
  if (auth?.id && packRunId && packJobId) {
    const result = await settleSellerPackChild({
      userId: auth.id,
      packRunId,
      packJobId,
      jobId: packJobId,
      providerRequestId: body.providerRequestId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, code: result.code, error: result.error },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true, mode: "atomic" });
  }

  // Legacy client shadow settle: no-op so generate-owned terminal settlement
  // cannot be double-captured via reservationId + childCredits.
  if (body.reservationId && typeof body.reservationId === "string") {
    const result = await settleSellerPackChild({
      reservationId: body.reservationId,
      jobId: body.jobId,
      childKey: body.childKey,
      childCredits: body.childCredits,
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
      code: result.code || "PACK_SETTLE_SERVER_OWNED",
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
