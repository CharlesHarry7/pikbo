/**
 * Shared /api/me response shape for Studio, badge, settings, batch.
 */

import type { PublicSession } from "@/lib/session";

export type GenerateMode = "live-generate" | "demo-cached";

export type MeDurableWallet = {
  accountId: string;
  availableCredits: number;
  reservedCredits: number;
  planId: string;
  backend?: "supabase" | "local-file";
  authority?: "shadow" | "authoritative";
};

/** Soft-launch free trial honesty from GET /api/me */
export type MeFreeTrial = {
  planId: string;
  isFreePlan: boolean;
  credits: number;
  clipsLeft: number;
  liveJobCredits: number;
  watermark: boolean;
  cachedDemoFree: boolean;
  /** Confirmed fails restore debit (boolean for ops gates). */
  failedLiveRefunds?: boolean;
  /** Ops honesty — not every fail is a confirmed restore. */
  failedLiveRefundPolicy?: "when_confirmed";
  /** Process kill / ledger TIMEOUT → check balance. */
  ledgerTimeoutRefund?: "unconfirmed";
  freeLive: {
    modelClass: "seedance-mini";
    durationSec: 5;
    resolution: "480p";
    onPlayerMark: true;
  } | null;
  exhausted: boolean;
  /** Free plan stills never debit — live Flux requires paid plan. */
  stillsOnFree?: "demo-only";
};

export type MeResponse = PublicSession & {
  mode?: GenerateMode | string;
  cachedDemoFree?: boolean;
  liveJobCredits?: number;
  freeTrial?: MeFreeTrial;
  signedIn?: boolean;
  authConfigured?: boolean;
  durableCreditsActive?: boolean;
  auth?: { id: string; email: string | null } | null;
  durable?: MeDurableWallet | null;
};

function liveJobCost(me: Pick<MeResponse, "freeTrial" | "liveJobCredits" | "creditsPerVideo">): number {
  const n =
    me.freeTrial?.liveJobCredits ??
    me.liveJobCredits ??
    me.creditsPerVideo ??
    10;
  return Number.isFinite(n) && n > 0 ? n : 10;
}

/**
 * Recompute freeTrial from authoritative cookie credits/plan.
 * Generate / image responses only return PublicSession — without this,
 * freeTrial.exhausted and clipsLeft lag after a live debit and the badge
 * can still claim "trial left" when credits are 0.
 */
export function rehydrateFreeTrial(me: MeResponse): MeResponse {
  const need = liveJobCost(me);
  const credits = typeof me.credits === "number" ? Math.max(0, me.credits) : 0;
  const clipsLeft = Math.floor(credits / need);

  if (me.plan !== "free") {
    if (!me.freeTrial) return me;
    const { stillsOnFree: _drop, ...restFt } = me.freeTrial;
    void _drop;
    return {
      ...me,
      freeTrial: {
        ...restFt,
        planId: me.plan,
        isFreePlan: false,
        credits,
        clipsLeft,
        liveJobCredits: need,
        freeLive: null,
        exhausted: false,
      },
    };
  }

  return {
    ...me,
    freeTrial: {
      planId: me.plan,
      isFreePlan: true,
      credits,
      clipsLeft,
      liveJobCredits: need,
      watermark: me.watermark ?? me.freeTrial?.watermark ?? true,
      cachedDemoFree: me.cachedDemoFree ?? me.freeTrial?.cachedDemoFree ?? true,
      freeLive: {
        modelClass: "seedance-mini",
        durationSec: 5,
        resolution: "480p",
        onPlayerMark: true,
      },
      exhausted: credits < need,
      stillsOnFree: "demo-only",
    },
  };
}

/**
 * Merge a PublicSession (or partial Me) patch into prior /api/me state and
 * rehydrate freeTrial so UI honesty tracks the latest debit/refund.
 */
export function mergeMeSession(
  prev: MeResponse | null | undefined,
  patch: Partial<MeResponse> | PublicSession | null | undefined
): MeResponse | null {
  if (!patch) return prev ?? null;
  const merged = (
    prev ? { ...prev, ...patch } : { ...(patch as MeResponse) }
  ) as MeResponse;
  return rehydrateFreeTrial(merged);
}

/**
 * True when Free plan has fewer than one live job of credits left.
 * Prefer live cookie credits over freeTrial.exhausted — generate success
 * merges PublicSession only and used to leave exhausted stuck at false.
 */
export function freeTrialExhausted(me: MeResponse | null | undefined): boolean {
  if (!me) return false;
  const isFree = me.plan === "free" || me.freeTrial?.isFreePlan === true;
  if (!isFree) return false;
  const need = liveJobCost(me);
  if (typeof me.credits === "number") {
    return me.credits < need;
  }
  return me.freeTrial?.exhausted === true;
}

export function isDemoMode(me: MeResponse | null | undefined): boolean {
  if (!me) return false;
  return me.mode === "demo-cached";
}

/** Prefer durable available when signed-in shadow wallet exists (display only). */
export function displayCredits(me: MeResponse | null | undefined): number {
  if (!me) return 0;
  if (
    me.signedIn &&
    me.durable &&
    typeof me.durable.availableCredits === "number"
  ) {
    return me.durable.availableCredits;
  }
  return me.credits;
}

async function authHeaders(): Promise<HeadersInit> {
  if (typeof window === "undefined") return {};
  try {
    const { getSupabaseBrowser } = await import("@/lib/supabase/browser");
    const supabase = getSupabaseBrowser();
    if (!supabase) return {};
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

export async function fetchMe(): Promise<MeResponse | null> {
  try {
    const headers = await authHeaders();
    const res = await fetch("/api/me", { headers });
    if (!res.ok) return null;
    const data = (await res.json()) as MeResponse;
    return rehydrateFreeTrial(data);
  } catch {
    return null;
  }
}
