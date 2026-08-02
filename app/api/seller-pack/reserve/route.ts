import { NextResponse } from "next/server";
import { ensureSession, publicSession } from "@/lib/session";
import { getAuthUserFromRequest } from "@/lib/supabase/user";
import {
  durableCreditsActive,
  getPersonalWallet,
} from "@/lib/durableCredits";
import {
  reserveSellerPackAtomic,
  SELLER_PACK_CHILD_COUNT,
  SELLER_PACK_QUOTE_CREDITS,
} from "@/lib/durableCredits/sellerPack";
import { resolvePrivateLiveAccess } from "@/lib/privateLiveAccessServer";
import { probeSoftLiveReadiness } from "@/lib/liveReadinessServer";

export const runtime = "nodejs";

/**
 * Launch Pack reserve: authenticated owner + stable client key → one atomic
 * 30-credit hold and exactly three fixed child ids. There is deliberately no
 * guest/shadow fallback on this endpoint.
 */
export async function POST(req: Request) {
  let body: {
    clientPackKey?: string;
    inputAssetId?: string;
    rightsConfirmed?: boolean;
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
        error: "Sign in before starting a live Launch Pack",
        quoteCredits: SELLER_PACK_QUOTE_CREDITS,
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
        error: "Durable credits are unavailable",
        quoteCredits: SELLER_PACK_QUOTE_CREDITS,
        session: publicSession(session),
      },
      { status: 503 }
    );
  }
  const privateLive = resolvePrivateLiveAccess(auth);
  const readiness = await probeSoftLiveReadiness();
  if (
    !privateLive.invite.invited ||
    !privateLive.budget.ok ||
    !readiness.privatePreview.ready
  ) {
    return NextResponse.json(
      {
        ok: false,
        code: "PRIVATE_PREVIEW_REQUIRED",
        error: "Private seller Preview is not ready for provider spend",
        quoteCredits: SELLER_PACK_QUOTE_CREDITS,
        session: publicSession(session),
      },
      { status: privateLive.invite.invited ? 503 : 403 }
    );
  }

  const clientPackKey =
    typeof body.clientPackKey === "string"
      ? body.clientPackKey.trim().slice(0, 128)
      : "";
  if (clientPackKey.length < 8) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_PACK_KEY",
        error: "A stable clientPackKey is required",
        quoteCredits: SELLER_PACK_QUOTE_CREDITS,
        session: publicSession(session),
      },
      { status: 400 }
    );
  }
  const inputAssetId =
    typeof body.inputAssetId === "string" ? body.inputAssetId.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(inputAssetId) || body.rightsConfirmed !== true) {
    return NextResponse.json(
      {
        ok: false,
        code:
          body.rightsConfirmed === true
            ? "INPUT_ASSET_REQUIRED"
            : "RIGHTS_CONFIRMATION_REQUIRED",
        error: "A verified private toy input and rights confirmation are required",
        quoteCredits: SELLER_PACK_QUOTE_CREDITS,
        session: publicSession(session),
      },
      { status: 400 }
    );
  }

  const atomic = await reserveSellerPackAtomic({
    ownerUserId: auth.id,
    clientPackKey,
    inputAssetId,
    rightsConfirmed: true,
  });
  if (!atomic.ok) {
    const status =
      atomic.code === "INSUFFICIENT_CREDITS"
        ? 402
        : atomic.code === "IDEMPOTENCY_CONFLICT"
          ? 409
          : atomic.code === "LIVE_ACCESS_REQUIRED"
            ? 403
            : atomic.code === "DURABLE_OFF" ||
                atomic.code === "DURABLE_CREDITS_UNAVAILABLE"
              ? 503
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
    authority: "server-owned-atomic-pack",
    packRunId: atomic.data.packRunId,
    inputAssetId: atomic.data.inputAssetId,
    skuLabel: atomic.data.skuLabel,
    reservationId: atomic.data.reservationId,
    jobs: atomic.data.jobs,
    quoteCredits: atomic.data.quotedCredits,
    childCredits: atomic.data.childCredits,
    childCount: SELLER_PACK_CHILD_COUNT,
    idempotent: atomic.data.idempotent,
    session: publicSession(session),
    durable: await getPersonalWallet(auth.id),
  });
}
