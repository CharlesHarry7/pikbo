import { NextResponse } from "next/server";
import { ensureSession, publicSession } from "@/lib/session";
import { getAuthUserFromRequest } from "@/lib/supabase/user";
import {
  durableCreditsActive,
  getPersonalWallet,
} from "@/lib/durableCredits";
import {
  reserveSellerPackAtomic,
  reserveSellerPackShadow,
  SELLER_PACK_CHILD_COUNT,
  SELLER_PACK_QUOTE_CREDITS,
} from "@/lib/durableCredits/sellerPack";

export const runtime = "nodejs";

/**
 * Seller Pack / Launch Pack reserve.
 *
 * Preferred (authenticated + clientPackKey): one atomic 30-credit reservation,
 * one pack run, exactly three fixed child job IDs. Live children then authorize
 * against the parent pack reservation via /api/generate (packRunId + packJobId)
 * and never open a second R1a per-generation reserve.
 *
 * Legacy shadow reserve remains when atomic binding is unavailable; cookie is
 * never live-spend authority (generate-route-cost-gate).
 */
export async function POST(req: Request) {
  let body: {
    childCount?: number;
    idempotencyKey?: string;
    clientPackKey?: string;
  } = {};
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

  const clientPackKey =
    typeof body.clientPackKey === "string"
      ? body.clientPackKey.trim().slice(0, 128)
      : typeof body.idempotencyKey === "string"
        ? body.idempotencyKey.trim().slice(0, 128)
        : "";

  // Atomic path: authenticated owner + stable client pack key.
  if (auth?.id && clientPackKey.length >= 8) {
    const atomic = await reserveSellerPackAtomic({
      ownerUserId: auth.id,
      clientPackKey,
    });
    if (!atomic.ok) {
      const status =
        atomic.code === "INSUFFICIENT_CREDITS"
          ? 402
          : atomic.code === "IDEMPOTENCY_CONFLICT"
            ? 409
            : atomic.code === "LIVE_ACCESS_REQUIRED" ||
                atomic.code === "AUTH_REQUIRED"
              ? 403
              : 400;
      return NextResponse.json(
        {
          ok: false,
          code: atomic.code,
          error: atomic.error,
          need: atomic.need,
          have: atomic.have,
          quoteCredits: SELLER_PACK_QUOTE_CREDITS,
          session: publicSession(session),
          durable: await getPersonalWallet(auth.id),
        },
        { status }
      );
    }
    return NextResponse.json({
      ok: true,
      mode: "atomic",
      authority: "durable-atomic-pack-plus-generate-gate",
      pack: atomic.data,
      packRunId: atomic.data.packRunId,
      reservationId: atomic.data.reservationId,
      jobs: atomic.data.jobs,
      quoteCredits: atomic.data.quotedCredits,
      childCredits: atomic.data.childCredits,
      childCount: atomic.data.jobs.length,
      idempotent: atomic.data.idempotent,
      session: publicSession(session),
      durable: await getPersonalWallet(auth.id),
    });
  }

  // Legacy shadow path (name-stable for offline smokes + guest audit).
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
