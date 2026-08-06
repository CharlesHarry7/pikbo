/**
 * Shared /api/me response shape for Studio, badge, settings, batch.
 */

import {
  ClientTimeoutError,
  isClientTimeoutError,
  withTimeout,
} from "@/lib/clientTimeout";
import type { PublicSession } from "@/lib/session";

export type GenerateMode = "live-generate" | "demo-cached";

export type MeDurableWallet = {
  accountId: string;
  availableCredits: number;
  reservedCredits: number;
  planId: string;
  backend?: "supabase" | "local-file";
  /** R0: never "cookie" — audit wallet only until atomic reserve. */
  authority?: "shadow" | "authoritative" | "durable-wallet-audit";
  liveSpendRequires?: "atomic-reserve";
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
  freeLiveProvider?: "blocked-until-t6" | "private-preview";
  /** Confirmed fails restore debit (boolean for ops gates). */
  failedLiveRefunds?: boolean;
  /** Ops honesty — not every fail is a confirmed restore. */
  failedLiveRefundPolicy?: "when_confirmed";
  /** Process kill / ledger TIMEOUT → check balance. */
  ledgerTimeoutRefund?: "unconfirmed";
  /** Soft-launch cancel / abort ledger → never invent restore. */
  ledgerCancelRefund?: "unconfirmed";
  freeLive: {
    modelClass: "seedance-mini" | "seedance-fast";
    durationSec: 5;
    resolution: "480p" | "720p";
    onPlayerMark: true;
    /** Product intent — false while Free live stays R0/T6-blocked. */
    liveEnabled?: boolean;
  } | null;
  exhausted: boolean;
  /** Free plan stills never debit — live Flux requires paid plan. */
  stillsOnFree?: "demo-only";
};

export type MeResponse = PublicSession & {
  mode?: GenerateMode | string;
  cachedDemoFree?: boolean;
  liveJobCredits?: number;
  /** R0: cookie is never live-spend authority. */
  liveSpendAuthority?: "durable-reserve-or-cached-demo";
  cookieIsLiveSpendAuthority?: boolean;
  freeTrial?: MeFreeTrial;
  signedIn?: boolean;
  authConfigured?: boolean;
  durableCreditsActive?: boolean;
  /** Same global prerequisite result exposed by /api/health.ready.softLive. */
  softLiveReady?: boolean;
  /** Server-authored account capability; cookie credits never make this true. */
  canLiveGenerate?: boolean;
  /** Invite-only, zero-Provider capability to verify one private toy photo. */
  canPreparePrivateInput?: boolean;
  auth?: { id: string; email: string | null } | null;
  durable?: MeDurableWallet | null;
  billing?: null | {
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
  };
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
 * Recompute freeTrial display fields from session credits/plan.
 * Generate / image responses only return PublicSession — without this,
 * freeTrial.exhausted and clipsLeft lag after a live debit and the badge
 * can still claim "trial left" when credits are 0.
 * Cookie balance is display-only (R0: not live-spend authority).
 */
export function rehydrateFreeTrial(me: MeResponse): MeResponse {
  const need = liveJobCost(me);
  const sessionCredits =
    typeof me.credits === "number" ? Math.max(0, me.credits) : 0;
  const credits =
    me.canLiveGenerate === true
      ? me.signedIn && typeof me.durable?.availableCredits === "number"
        ? Math.max(0, me.durable.availableCredits)
        : sessionCredits
      : 0;
  const clipsLeft = Math.floor(credits / need);

  // Preserve refund-policy honesty from /api/me across PublicSession merges.
  const refundPolicy = {
    failedLiveRefunds: me.freeTrial?.failedLiveRefunds,
    failedLiveRefundPolicy: me.freeTrial?.failedLiveRefundPolicy,
    ledgerTimeoutRefund: me.freeTrial?.ledgerTimeoutRefund,
    ledgerCancelRefund: me.freeTrial?.ledgerCancelRefund,
  };

  if (me.plan !== "free") {
    if (!me.freeTrial) return me;
    const { stillsOnFree: _drop, ...restFt } = me.freeTrial;
    void _drop;
    return {
      ...me,
      freeTrial: {
        ...restFt,
        ...refundPolicy,
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
      freeLiveProvider:
        me.canLiveGenerate === true
          ? me.freeTrial?.freeLiveProvider ?? "private-preview"
          : "blocked-until-t6",
      freeLive: {
        modelClass:
          me.canLiveGenerate === true
            ? me.freeTrial?.freeLive?.modelClass ?? "seedance-fast"
            : "seedance-mini",
        durationSec: 5,
        resolution:
          me.canLiveGenerate === true
            ? me.freeTrial?.freeLive?.resolution ?? "720p"
            : "480p",
        onPlayerMark: true,
        liveEnabled:
          me.canLiveGenerate === true &&
          me.freeTrial?.freeLive?.liveEnabled !== false,
      },
      // Trial usage is separate from live availability. Cookie/session balance
      // can record whether the one-time eligibility was used, but cannot grant
      // provider access or appear as account credits.
      exhausted:
        typeof me.freeTrial?.exhausted === "boolean"
          ? me.freeTrial.exhausted
          : sessionCredits < need,
      stillsOnFree: "demo-only",
      // Keep /api/me refund honesty after generate success merges PublicSession only.
      ...refundPolicy,
      failedLiveRefunds: refundPolicy.failedLiveRefunds ?? true,
      failedLiveRefundPolicy:
        refundPolicy.failedLiveRefundPolicy ?? "when_confirmed",
      ledgerTimeoutRefund: refundPolicy.ledgerTimeoutRefund ?? "unconfirmed",
      ledgerCancelRefund: refundPolicy.ledgerCancelRefund ?? "unconfirmed",
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
  if (
    prev?.canLiveGenerate === true &&
    (prev.plan === "free" || prev.freeTrial?.isFreePlan === true) &&
    typeof patch.credits === "number" &&
    prev.freeTrial
  ) {
    merged.freeTrial = {
      ...prev.freeTrial,
      exhausted: patch.credits < liveJobCost(merged),
    };
  }
  return rehydrateFreeTrial(merged);
}

/**
 * True when Free plan has fewer than one live job of credits left.
 * Prefer live session credits over freeTrial.exhausted — generate success
 * merges PublicSession only and used to leave exhausted stuck at false.
 * Display balance only; live still requires durable reserve when enabled.
 */
export function freeTrialExhausted(me: MeResponse | null | undefined): boolean {
  if (!me) return false;
  const isFree = me.plan === "free" || me.freeTrial?.isFreePlan === true;
  if (!isFree) return false;
  const need = liveJobCost(me);
  if (typeof me.freeTrial?.exhausted === "boolean") {
    return me.freeTrial.exhausted;
  }
  if (typeof me.credits === "number") {
    return me.credits < need;
  }
  return me.freeTrial?.exhausted === true;
}

export function isDemoMode(me: MeResponse | null | undefined): boolean {
  if (!me) return false;
  return me.canLiveGenerate !== true;
}

export function canLiveGenerate(
  me: MeResponse | null | undefined
): boolean {
  return me?.canLiveGenerate === true;
}

export function canPreparePrivateInput(
  me: MeResponse | null | undefined
): boolean {
  return me?.signedIn === true && me.canPreparePrivateInput === true;
}

/**
 * Client display boundary for the invited private-generation workbench.
 * This is never spend authority: reserve/generate still re-check auth,
 * durable credits, invite, delivery, and provider-budget gates server-side.
 */
export function canUsePrivateLaunch(
  me: MeResponse | null | undefined
): boolean {
  return (
    me?.signedIn === true &&
    me.canPreparePrivateInput === true &&
    me.canLiveGenerate === true &&
    me.durableCreditsActive === true &&
    me.mode === "live-generate"
  );
}

/** Account balance for signed-in users; anonymous cookie credits never display. */
export function displayCredits(me: MeResponse | null | undefined): number {
  if (!me) return 0;
  if (
    me.signedIn &&
    me.durable &&
    typeof me.durable.availableCredits === "number"
  ) {
    return me.durable.availableCredits;
  }
  return me.canLiveGenerate === true ? me.credits : 0;
}

/** Price-bearing tool UI shows zero whenever it is serving cached prototypes. */
export function generationDisplayCredits(
  me: MeResponse | null | undefined
): number {
  return canLiveGenerate(me) ? displayCredits(me) : 0;
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

export async function fetchMe(opts?: {
  /**
   * Wall-clock bound for Studio / Library open so we never stay on "Opening…"
   * or permanent "Loading your Library…" forever.
   * Covers BOTH supabase getSession (authHeaders) and /api/me — a hanging
   * session lookup used to leave chrome stuck even when fetch had AbortController.
   * On timeout, rejects with ClientTimeoutError (honest retry path).
   * Other network/auth failures still resolve null (soft public Lab fallback).
   */
  timeoutMs?: number;
}): Promise<MeResponse | null> {
  const timeoutMs =
    typeof opts?.timeoutMs === "number" && opts.timeoutMs > 0
      ? opts.timeoutMs
      : undefined;

  const load = async (): Promise<MeResponse | null> => {
    const controller =
      typeof timeoutMs === "number" && typeof AbortController !== "undefined"
        ? new AbortController()
        : null;
    const timer =
      controller && timeoutMs
        ? setTimeout(() => controller.abort(), timeoutMs)
        : null;
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/me", {
        headers,
        signal: controller?.signal,
      });
      if (!res.ok) return null;
      const data = (await res.json()) as MeResponse;
      return rehydrateFreeTrial(data);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  try {
    // Outer withTimeout covers authHeaders hang; inner AbortController aborts fetch.
    if (timeoutMs) {
      return await withTimeout(
        load(),
        timeoutMs,
        "Could not verify private access in time"
      );
    }
    return await load();
  } catch (err) {
    // Explicit Studio / Library open contract: surface timeout, never swallow into null.
    if (isClientTimeoutError(err)) throw err;
    const aborted =
      (err instanceof Error && err.name === "AbortError") ||
      (typeof err === "object" &&
        err !== null &&
        (err as { name?: string }).name === "AbortError");
    if (aborted && timeoutMs) {
      throw new ClientTimeoutError(
        "Could not verify private access in time"
      );
    }
    return null;
  }
}
