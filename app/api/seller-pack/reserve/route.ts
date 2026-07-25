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
        "Durable shadow off — Seller Pack will debit cookie credits per child only.",
      quoteCredits: SELLER_PACK_QUOTE_CREDITS,
      childCount: SELLER_PACK_CHILD_COUNT,
      childCredits: 10,
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

  const { durableIsAuthoritative } = await import("@/lib/durableCredits");
  const authz =
    Boolean(auth?.id) && (await durableIsAuthoritative());
  return NextResponse.json({
    ok: true,
    mode: authz ? "authoritative-wallet" : "shadow",
    authority: authz
      ? "supabase-wallet-for-signed-in"
      : "cookie-generate-still-authoritative",
    pack: result.data,
    quoteCredits: result.data.quotedCredits,
    childCredits: result.data.childCredits,
    session: publicSession(session),
    durable: auth?.id ? await getPersonalWallet(auth.id) : null,
  });
}
