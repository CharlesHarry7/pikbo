import { NextResponse } from "next/server";
import { releaseSellerPackChild } from "@/lib/durableCredits/sellerPack";
import { durableCreditsActive } from "@/lib/durableCredits";
import { getAuthUserFromRequest } from "@/lib/supabase/user";

export const runtime = "nodejs";

/** Release 10 credits on a Seller Pack shadow reservation after a failed child. */
export async function POST(req: Request) {
  let body: {
    reservationId?: string;
    jobId?: string;
    childKey?: string;
    reason?: string;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  if (!body.reservationId || typeof body.reservationId !== "string") {
    return NextResponse.json(
      { ok: false, code: "INVALID_REQUEST", error: "reservationId required" },
      { status: 400 }
    );
  }
  const auth = await getAuthUserFromRequest(req);
  if (!auth) {
    return NextResponse.json(
      {
        ok: false,
        code: "UNAUTHORIZED",
        error: "Signed-in account required to release Seller Pack credits",
      },
      { status: 401 }
    );
  }
  if (!body.childKey || typeof body.childKey !== "string") {
    return NextResponse.json(
      { ok: false, code: "INVALID_REQUEST", error: "childKey required" },
      { status: 400 }
    );
  }
  if (!durableCreditsActive()) {
    return NextResponse.json({ ok: true, skipped: true, code: "DURABLE_OFF" });
  }
  const result = await releaseSellerPackChild({
    reservationId: body.reservationId,
    actorUserId: auth.id,
    jobId: body.jobId,
    childKey: body.childKey,
    reason: body.reason,
  });
  if (!result.ok) {
    const status =
      result.code === "UNAUTHORIZED"
        ? 403
        : result.code === "DURABLE_BACKEND_UNAVAILABLE"
          ? 503
          : 400;
    return NextResponse.json(
      { ok: false, code: result.code, error: result.error },
      { status }
    );
  }
  return NextResponse.json({ ok: true });
}
