import { NextResponse } from "next/server";
import { CREDITS_PER_VIDEO, getPlan } from "@/lib/pricing";
import { generateMode } from "@/lib/requestMeta";
import { ensureSession, publicSession } from "@/lib/session";
import {
  durableCreditsActive,
  getPersonalWallet,
} from "@/lib/durableCredits";
import { getAuthUserFromRequest } from "@/lib/supabase/user";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

/**
 * Cheap session probe (ops / badge) — presence headers only, no durable wallet.
 * Full freeTrial + auth lives on GET.
 */
export async function HEAD() {
  const session = await ensureSession();
  const mode = generateMode();
  const clipsLeft = Math.floor(session.credits / CREDITS_PER_VIDEO);
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "X-Pikbo-Plan": session.plan,
      "X-Pikbo-Credits": String(session.credits),
      "X-Pikbo-Clips-Left": String(clipsLeft),
      "X-Pikbo-Mode": mode,
      "X-Pikbo-Free-Trial-Exhausted":
        session.plan === "free" && session.credits < CREDITS_PER_VIDEO
          ? "1"
          : "0",
    },
  });
}

/**
 * Session + generate mode for Studio honesty.
 * Optional Bearer token enriches response with Supabase auth + durable wallet
 * (shadow ledger). Cookie credits remain the soft-launch generate authority.
 */
export async function GET(req: Request) {
  const session = await ensureSession();
  const mode = generateMode();
  const plan = getPlan(session.plan);
  const clipsLeft = Math.floor(session.credits / CREDITS_PER_VIDEO);
  const base = {
    ...publicSession(session),
    mode,
    /** Cached demos never charge; live jobs use flat CREDITS_PER_VIDEO */
    cachedDemoFree: true,
    liveJobCredits: CREDITS_PER_VIDEO,
    /**
     * Soft-launch free trial honesty (Free plan = 1 Mini live job / period).
     * Server-enforced on /api/generate: free → Mini 480p 5s + watermark.
     */
    freeTrial: {
      planId: session.plan,
      isFreePlan: session.plan === "free",
      credits: session.credits,
      clipsLeft,
      liveJobCredits: CREDITS_PER_VIDEO,
      watermark: plan.watermark,
      cachedDemoFree: true,
      /** Confirmed provider/validation fails restore debit; TIMEOUT stays unconfirmed. */
      failedLiveRefunds: true as const,
      failedLiveRefundPolicy: "when_confirmed" as const,
      ledgerTimeoutRefund: "unconfirmed" as const,
      freeLive:
        session.plan === "free"
          ? {
              modelClass: "seedance-mini" as const,
              durationSec: 5,
              resolution: "480p" as const,
              onPlayerMark: true,
            }
          : null,
      exhausted: session.plan === "free" && session.credits < CREDITS_PER_VIDEO,
      /**
       * Free Mini trial is video Create only — /api/image returns labeled demo
       * (0 credits) so stills never burn the 10-credit trial.
       * Omitted on paid plans (live Flux stills allowed).
       */
      ...(session.plan === "free"
        ? { stillsOnFree: "demo-only" as const }
        : {}),
    },
    authConfigured: isSupabaseConfigured(),
    durableCreditsActive: durableCreditsActive(),
  };

  const user = await getAuthUserFromRequest(req);
  if (!user) {
    return NextResponse.json({
      ...base,
      signedIn: false,
      auth: null,
      durable: null,
    });
  }

  let durable: {
    accountId: string;
    availableCredits: number;
    reservedCredits: number;
    planId: string;
    backend?: "supabase" | "local-file";
  } | null = null;
  try {
    durable = await getPersonalWallet(user.id);
  } catch {
    durable = null;
  }

  return NextResponse.json({
    ...base,
    signedIn: true,
    auth: {
      id: user.id,
      email: user.email,
    },
    durable: durable
      ? {
          accountId: durable.accountId,
          availableCredits: durable.availableCredits,
          reservedCredits: durable.reservedCredits,
          planId: durable.planId,
          backend: durable.backend ?? "local-file",
          /** Display hint — cookie still debit authority for soft-launch live jobs */
          authority: "shadow" as const,
        }
      : null,
  });
}
