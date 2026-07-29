import { NextResponse } from "next/server";
import { CREDITS_PER_VIDEO, getPlan } from "@/lib/pricing";
import { ensureSession, publicSession } from "@/lib/session";
import {
  durableCreditsActive,
  getPersonalWallet,
} from "@/lib/durableCredits";
import { getAuthUserFromRequest } from "@/lib/supabase/user";
import {
  getStripeBillingSnapshot,
  stripeBillingRpcEnabled,
} from "@/lib/stripeBilling";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { evaluateAccountLiveCapability } from "@/lib/liveCapability";
import { probeSoftLiveReadiness } from "@/lib/liveReadinessServer";

export const runtime = "nodejs";

/**
 * Cheap session probe (ops / badge) — presence headers only, no durable wallet.
 * Full freeTrial + auth lives on GET.
 */
export async function HEAD() {
  const session = await ensureSession();
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "X-Pikbo-Plan": session.plan,
      "X-Pikbo-Credits": "0",
      "X-Pikbo-Clips-Left": "0",
      "X-Pikbo-Mode": "demo-cached",
      "X-Pikbo-Can-Live-Generate": "0",
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
  const plan = getPlan(session.plan);
  const [user, liveReadiness] = await Promise.all([
    getAuthUserFromRequest(req),
    probeSoftLiveReadiness(),
  ]);
  const softLiveReady = liveReadiness.truth.softLive;
  const base = {
    ...publicSession(session),
    // Root credits are account/display credits. Anonymous cookie allowance is
    // represented only by freeTrial.exhausted and never looks spendable.
    credits: 0,
    mode: "demo-cached" as const,
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
      // Cookie credits are not provider authority. Account capability below
      // replaces these only when a signed-in durable wallet may generate.
      credits: 0,
      clipsLeft: 0,
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
      // Eligibility usage is separate from current live availability.
      exhausted:
        session.plan === "free" && session.credits < CREDITS_PER_VIDEO,
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
    softLiveReady,
  };

  if (!user) {
    return NextResponse.json({
      ...base,
      canLiveGenerate: false,
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
  const durablePlan =
    durable?.planId === "founding_studio"
      ? getPlan(durable.planId)
      : getPlan("free");
  let billing: null | {
    plan: "founding_studio";
    status:
      | "trialing"
      | "active"
      | "past_due"
      | "canceled"
      | "unpaid"
      | "incomplete"
      | "paused";
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    lastInvoiceApplied: boolean;
  } = null;
  if (durable && stripeBillingRpcEnabled()) {
    try {
      const snapshot = await getStripeBillingSnapshot({
        accountId: durable.accountId,
        userId: user.id,
      });
      if (snapshot?.subscription) {
        billing = {
          plan: snapshot.subscription.plan,
          status: snapshot.subscription.status,
          currentPeriodEnd: snapshot.subscription.currentPeriodEnd,
          cancelAtPeriodEnd: snapshot.subscription.cancelAtPeriodEnd,
          lastInvoiceApplied: Boolean(
            snapshot.subscription.lastPaidInvoiceId
          ),
        };
      }
    } catch {
      // Account plan remains fail-closed; billing detail is optional display.
    }
  }
  // /api/generate currently keeps Free provider delivery closed until the
  // protected server-owned derivative is verified. Keep account UI identical.
  const freeDeliveryReady = false;
  const capability = evaluateAccountLiveCapability({
    softLiveReady,
    signedIn: true,
    durableCreditsActive: base.durableCreditsActive,
    planId: durable?.planId ?? session.plan,
    availableCredits: durable?.availableCredits ?? null,
    liveJobCredits: CREDITS_PER_VIDEO,
    freeDeliveryReady,
  });
  const liveCredits = capability.canLiveGenerate
    ? Math.max(0, durable?.availableCredits ?? 0)
    : 0;

  return NextResponse.json({
    ...base,
    // Signed-in account plan is authoritative after a Stripe webhook updates
    // accounts.plan_id. The legacy browser cookie cannot grant a paid plan.
    plan: durablePlan.id,
    planName: durablePlan.name,
    watermark: durablePlan.watermark,
    credits: Math.max(0, durable?.availableCredits ?? 0),
    clipsLeft: Math.floor(
      Math.max(0, durable?.availableCredits ?? 0) / CREDITS_PER_VIDEO
    ),
    mode: capability.canLiveGenerate
      ? ("live-generate" as const)
      : ("demo-cached" as const),
    canLiveGenerate: capability.canLiveGenerate,
    freeTrial: {
      ...base.freeTrial,
      planId: durablePlan.id,
      isFreePlan: durablePlan.id === "free",
      watermark: durablePlan.watermark,
      credits: liveCredits,
      clipsLeft: Math.floor(liveCredits / CREDITS_PER_VIDEO),
      freeLive:
        durablePlan.id === "free"
          ? {
              modelClass: "seedance-mini" as const,
              durationSec: 5,
              resolution: "480p" as const,
              onPlayerMark: true,
              liveEnabled: capability.canLiveGenerate,
            }
          : null,
      exhausted:
        durablePlan.id === "free" &&
        Math.max(0, durable?.availableCredits ?? 0) < CREDITS_PER_VIDEO,
    },
    signedIn: true,
    billing,
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
