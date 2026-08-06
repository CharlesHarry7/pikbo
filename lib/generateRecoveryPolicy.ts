/**
 * Decision policy for racing the original generate response against durable
 * owner-only recovery. Recovery is allowed to win only when it proves a
 * terminal durable outcome; a read/network failure must not cancel a live
 * provider request.
 *
 * Also owns Studio generate-wait exit honesty:
 * - recovery checking/waiting always has a user-visible leave path
 * - fail Retry is server-gated (no fake retriable path)
 */

export type GenerateRaceResultLike = {
  ok: boolean;
  status: number;
  code?: string;
  creditsRefunded?: boolean;
};

/**
 * How the Create wait surface leaves a still-open generation.
 * - cancel: user explicitly kills this attempt (abort + best-effort ledger cancel)
 * - detach: stop waiting in the page / open Library — background POST keeps running
 */
export type GenerateWaitLeaveMode = "cancel" | "detach";

export type GenerateWaitLeavePlan = {
  abortPrimary: boolean;
  abortRecovery: boolean;
  cancelLedger: boolean;
  /** Detach/cancel never mint a second /api/generate call. */
  startNewGenerate: boolean;
};

/**
 * Pure leave planner. Non-destructive leave must not abort the original POST,
 * cancel the ledger, or start another provider job.
 */
export function planGenerateWaitLeave(
  mode: GenerateWaitLeaveMode
): GenerateWaitLeavePlan {
  if (mode === "cancel") {
    return {
      abortPrimary: true,
      abortRecovery: true,
      cancelLedger: true,
      startNewGenerate: false,
    };
  }
  return {
    abortPrimary: false,
    abortRecovery: false,
    cancelLedger: false,
    startNewGenerate: false,
  };
}

/**
 * When the wait surface may offer non-destructive "Open Library · keep generating".
 *
 * Recovery checking/waiting is already following a durable owner task — Library
 * is a safe exit and must not wait for the 90s long-wait gate. Without recovery
 * signal, only long wall-clock (or awaiting_primary) unlocks detach.
 *
 * Demo mode never detaches (cached Lab has no private Library job).
 */
export function shouldShowGenerateWaitDetach(opts: {
  demoMode?: boolean;
  elapsedSec: number;
  /** Durable poll in checking/waiting — same private task, no second charge. */
  recoveryChecking?: boolean;
  /** Recovery exhausted without authority; original POST still open. */
  awaitingPrimary?: boolean;
  /** Long-wait floor when no recovery signal (seconds). */
  longWaitSec?: number;
}): boolean {
  if (opts.demoMode) return false;
  if (opts.recoveryChecking || opts.awaitingPrimary) return true;
  const longWait = Math.max(30, opts.longWaitSec ?? 90);
  return opts.elapsedSec >= longWait;
}

/**
 * Codes where Retry would only re-hit the same closed gate. User must change
 * context (sign-in, rights, balance, wait for reconciliation) first.
 * Transient rate/in-flight codes stay retriable after Retry-After countdown.
 */
const NON_RETRYABLE_GENERATE_CODES = new Set([
  "AUTH_REQUIRED",
  "LIVE_ACCESS_REQUIRED",
  "INSUFFICIENT_CREDITS",
  "PROVIDER_BALANCE",
  "RIGHTS_REQUIRED",
  /** Hold/reconcile open — hammering re-POST risks double settlement. */
  "DURABLE_CREDITS_UNAVAILABLE",
]);

/**
 * Fail-panel Retry gate — pure, server-honest.
 * - Never invent retry while paywall/fatal/auth blocks apply
 * - refund unconfirmed still allows Retry (copy warns to check balance first)
 * - busy or missing input never shows Retry
 */
export function canRetryGenerateFailure(opts: {
  code?: string | null;
  fatal?: boolean;
  paywall?: boolean;
  busy?: boolean;
  /** Still / photo present for a re-POST. */
  hasInput?: boolean;
}): boolean {
  if (opts.busy) return false;
  if (opts.hasInput === false) return false;
  if (opts.paywall === true) return false;
  if (opts.fatal === true) return false;
  const code = (opts.code || "").trim();
  if (code && NON_RETRYABLE_GENERATE_CODES.has(code)) return false;
  return true;
}

export function isAuthoritativePrimaryResult(
  result: GenerateRaceResultLike
): boolean {
  return result.ok || result.code !== "NETWORK_ERROR";
}

export function isAuthoritativeRecoveryResult(
  result: GenerateRaceResultLike
): boolean {
  return (
    result.ok ||
    (result.code === "GENERATION_FAILED" &&
      result.creditsRefunded === true)
  );
}

export async function raceGenerateWithDurableRecovery<
  T extends GenerateRaceResultLike,
>(input: {
  primary: Promise<T>;
  recovery: Promise<T>;
  abortPrimary: () => void;
  abortRecovery: () => void;
  /**
   * Fired when recovery finished first without durable authority and the
   * original POST remains the only in-flight path (no abort, no second generate).
   */
  onInconclusiveRecovery?: (result: T) => void;
}): Promise<T> {
  const first = await Promise.race([
    input.primary.then((result) => ({
      source: "primary" as const,
      result,
    })),
    input.recovery.then((result) => ({
      source: "recovery" as const,
      result,
    })),
  ]);

  if (first.source === "primary") {
    if (isAuthoritativePrimaryResult(first.result)) {
      input.abortRecovery();
      return first.result;
    }
    // The browser never received a typed response. Durable owner truth can
    // still prove that the same request completed without starting a retry.
    return input.recovery;
  }

  if (isAuthoritativeRecoveryResult(first.result)) {
    input.abortPrimary();
    return first.result;
  }

  // A missing/unavailable recovery read says nothing about the live POST.
  // Only an explicit caller abort or authoritative durable terminal state may
  // end it. Waiting longer is safer than converting a healthy provider job
  // into an ambiguous cancel/refund state.
  try {
    input.onInconclusiveRecovery?.(first.result);
  } catch {
    // Observability must never change which request is authoritative.
  }
  return input.primary;
}
