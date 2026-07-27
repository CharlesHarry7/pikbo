import { NextResponse } from "next/server";
import { ensureSession, publicSession } from "@/lib/session";
import { getAuthUserFromRequest } from "@/lib/supabase/user";
import {
  durableCreditsActive,
  getPersonalWallet,
} from "@/lib/durableCredits";
import {
  reserveSellerPackShadow,
  SELLER_PACK_CHILD_COUNT,
  SELLER_PACK_QUOTE_CREDITS,
} from "@/lib/durableCredits/sellerPack";

export const runtime = "nodejs";

/**
 * Phase C — Seller Pack shadow reserve (30 credits for 3 children).
 * R0/R1 honesty: live /api/generate children require durable auth reserve;
 * cookie is no longer live-spend authority. When durable is off, pack shadow
 * is best-effort only — each child still hits generate cost gate (demo if free).
 */
export async function POST(req: Request) {
  let body: { childCount?: number; idempotencyKey?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const session = await ensureSession();
  const auth = await getAuthUserFromRequest(req);
  const ownerUserId = auth?.id || session.id;
  const kind = auth?.id ? "auth" : "guest";

  if (!durableCreditsActive()) {
    return NextResponse.json({
      ok: false,
      code: "DURABLE_OFF",
      message:
        "Durable credits off — Seller Pack shadow not opened. Live children need signed-in durable reserve; anonymous/Free stay on labeled demos.",
      quoteCredits: SELLER_PACK_QUOTE_CREDITS,
      childCount: SELLER_PACK_CHILD_COUNT,
      childCredits: 10,
      authority: "generate-route-cost-gate",
      session: publicSession(session),
    });
  }

  const childCount =
    typeof body.childCount === "number" &&
    body.childCount >= 1 &&
    body.childCount <= 8
      ? Math.floor(body.childCount)
      : SELLER_PACK_CHILD_COUNT;

  const result = await reserveSellerPackShadow({
    ownerUserId,
    kind,
    childCount,
    idempotencyKey:
      typeof body.idempotencyKey === "string"
        ? body.idempotencyKey.slice(0, 160)
        : undefined,
  });

  if (!result.ok) {
    const status = result.code === "INSUFFICIENT_CREDITS" ? 402 : 400;
    return NextResponse.json(
      {
        ok: false,
        code: result.code,
        error: result.error,
        quoteCredits: childCount * 10,
        session: publicSession(session),
        durable: auth?.id ? await getPersonalWallet(auth.id) : null,
      },
      { status }
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "shadow",
    /** Live child spend is enforced by /api/generate durable reserve — not cookie. */
    authority: "durable-shadow-audit-plus-generate-gate",
    pack: result.data,
    quoteCredits: result.data.quotedCredits,
    childCredits: result.data.childCredits,
    session: publicSession(session),
    durable: auth?.id ? await getPersonalWallet(auth.id) : null,
  });
}
