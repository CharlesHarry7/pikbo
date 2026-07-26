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
 * Soft-launch still debits Cookie on each /api/generate child.
 * When durable is off, returns ok:false with DURABLE_OFF (batch continues on cookie).
 */
export async function POST(req: Request) {
  let body: { idempotencyKey?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const session = await ensureSession();
  const auth = await getAuthUserFromRequest(req);

  if (!durableCreditsActive()) {
    return NextResponse.json({
      ok: false,
      code: "DURABLE_OFF",
      message:
        "Durable shadow off — Seller Pack will debit cookie credits per child only.",
      quoteCredits: SELLER_PACK_QUOTE_CREDITS,
      childCount: SELLER_PACK_CHILD_COUNT,
      childCredits: 10,
      session: publicSession(session),
    });
  }
  if (!auth) {
    return NextResponse.json(
      {
        ok: false,
        code: "UNAUTHORIZED",
        error:
          "Sign in to reserve a durable Seller Pack; guest children continue on the Cookie trial path",
        session: publicSession(session),
      },
      { status: 401 }
    );
  }

  const result = await reserveSellerPackShadow({
    ownerUserId: auth.id,
    kind: "auth",
    idempotencyKey:
      typeof body.idempotencyKey === "string"
        ? body.idempotencyKey.slice(0, 160)
        : undefined,
  });

  if (!result.ok) {
    const status =
      result.code === "INSUFFICIENT_CREDITS"
        ? 402
        : result.code === "UNAUTHORIZED"
          ? 403
          : result.code === "DURABLE_BACKEND_UNAVAILABLE"
            ? 503
            : 400;
    return NextResponse.json(
      {
        ok: false,
        code: result.code,
        error: result.error,
        quoteCredits: SELLER_PACK_QUOTE_CREDITS,
        session: publicSession(session),
        durable: await getPersonalWallet(auth.id),
      },
      { status }
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "shadow",
    authority: "cookie-generate-still-authoritative",
    pack: result.data,
    quoteCredits: result.data.quotedCredits,
    childCredits: result.data.childCredits,
    session: publicSession(session),
    durable: await getPersonalWallet(auth.id),
  });
}
