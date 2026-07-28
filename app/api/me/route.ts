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
 * Optional Bearer token enriches with Supabase auth + durable wallet.
 * R0: cookie is never live-spend authority — live requires auth + durable
 * reserve; anonymous/Free stay on labeled cached demos.
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
     * R0 spend authority — never cookie for provider calls.
     * cached-only: anonymous / Free / no durable path
     * durable-reserve: paid signed-in path after R1a SQL apply
     */
    liveSpendAuthority: "durable-reserve-or-cached-demo" as const,
    cookieIsLiveSpendAuthority: false as const,
    /**
     * Soft-launch free trial honesty.
     * Free plan: labeled cached demos + Mini product caps (live Free blocked
     * until T6 delivery + durable access). Cookie balance is display-only.
     */
    freeTrial: {
      planId: session.plan,
      isFreePlan: session.plan === "free",
      credits: session.credits,
      clipsLeft,
      liveJobCredits: CREDITS_PER_VIDEO,
      watermark: plan.watermark,
      cachedDemoFree: true,
      /** Free live generation is blocked until protected delivery (T6). */
      freeLiveProvider: "blocked-until-t6" as const,
      /** Confirmed provider/validation fails restore debit; TIMEOUT stays unconfirmed. */
      failedLiveRefunds: true as const,
      failedLiveRefundPolicy: "when_confirmed" as const,
      ledgerTimeoutRefund: "unconfirmed" as const,
      /** Soft-launch cancel (client abort / DELETE ledger) never invents restore. */
      ledgerCancelRefund: "unconfirmed" as const,
      freeLive:
        session.plan === "free"
          ? {
              modelClass: "seedance-mini" as const,
              durationSec: 5,
              resolution: "480p" as const,
              onPlayerMark: true,
              /** Product intent only — R0/T6 keep Free live closed today. */
              liveEnabled: false as const,
            }
          : null,
      exhausted: session.plan === "free" && session.credits < CREDITS_PER_VIDEO,
      /**
       * Free Mini trial is video Create only — /api/image returns labeled demo
       * (0 credits) so stills never burn the 10-credit trial.
       * Omitted on paid plans (live Flux stills allowed when durable is ready).
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
          /**
           * Shadow/audit wallet only until R1a atomic reserve is applied.
           * Live provider path still requires reserveStrictLiveGeneration.
           */
          authority: "durable-wallet-audit" as const,
          liveSpendRequires: "atomic-reserve" as const,
        }
      : null,
  });
}
