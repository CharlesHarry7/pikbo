/**
 * Live reservation lifecycle guard for generate / image routes.
 *
 * Guarantees (behavioral, unit-tested):
 * - at most one successful release attempt path is invoked
 * - after settle, release is a no-op (never calls the release backend)
 * - after intentional withhold (capture ambiguous), release is a no-op
 * - concurrent release callers: only the first invokes the backend
 * - safety-net finally only releases while still `reserved`
 */

import type { StrictLiveReservation } from "@/lib/durableCredits/liveReservation";

export type ReservationPhase =
  | "none"
  | "reserved"
  | "released"
  | "settled"
  | "withheld";

export type ReleaseBackendResult =
  | { ok: true; availableCredits?: number }
  | { ok: false; error?: string };

export type SettleBackendResult =
  | { ok: true; availableCredits?: number }
  | { ok: false; error?: string };

export type ReservationLifecycle = {
  /** Current phase (for tests + diagnostics). */
  phase: () => ReservationPhase;
  /** How many times the release backend was invoked. */
  releaseBackendCalls: () => number;
  /** How many times the settle backend was invoked. */
  settleBackendCalls: () => number;
  /** Active reservation or null. */
  get: () => StrictLiveReservation | null;
  /** Attach a freshly reserved reservation. */
  assign: (reservation: StrictLiveReservation) => void;
  /**
   * Release once while reserved. Concurrent callers share the same in-flight
   * promise; after first completion phase is `released` and further calls skip.
   */
  release: (reason: string) => Promise<{
    ok: boolean;
    skipped: boolean;
    reason: string;
    availableCredits?: number;
  }>;
  /**
   * Settle once while reserved. On success → `settled`.
   * On capture fail or throw → auto-`withheld` (never release).
   */
  settle: (providerRequestId: string) => Promise<{
    ok: boolean;
    skipped: boolean;
    availableCredits?: number;
    error?: string;
  }>;
  /**
   * Mark as withheld (capture ambiguous). Safety-net must not release.
   */
  markWithheld: (reason: string) => void;
  /**
   * Finally / unexpected-exit path — only releases if still `reserved`.
   */
  safetyNetRelease: () => Promise<{
    ok: boolean;
    skipped: boolean;
    reason: string;
  }>;
};

export function createReservationLifecycle(backends: {
  release: (
    reservation: StrictLiveReservation,
    reason: string
  ) => Promise<ReleaseBackendResult>;
  settle: (
    reservation: StrictLiveReservation,
    providerRequestId: string
  ) => Promise<SettleBackendResult>;
}): ReservationLifecycle {
  let phase: ReservationPhase = "none";
  let current: StrictLiveReservation | null = null;
  let releaseCalls = 0;
  let settleCalls = 0;
  let inFlightRelease: Promise<{
    ok: boolean;
    skipped: boolean;
    reason: string;
    availableCredits?: number;
  }> | null = null;

  return {
    phase: () => phase,
    releaseBackendCalls: () => releaseCalls,
    settleBackendCalls: () => settleCalls,
    get: () => current,
    assign(reservation) {
      current = reservation;
      phase = "reserved";
      inFlightRelease = null;
    },
    async release(reason) {
      if (phase === "settled" || phase === "withheld") {
        return { ok: true, skipped: true, reason: `skip_${phase}` };
      }
      if (phase === "released" || phase === "none" || !current) {
        return { ok: true, skipped: true, reason: "already_cleared" };
      }
      if (inFlightRelease) {
        return inFlightRelease;
      }

      const target = current;
      const run = (async () => {
        releaseCalls += 1;
        try {
          const result = await backends.release(target, reason);
          // Terminal after first attempt so finally cannot double-call backend.
          phase = "released";
          current = null;
          if (result.ok) {
            return {
              ok: true,
              skipped: false,
              reason,
              availableCredits: result.availableCredits,
            };
          }
          return { ok: false, skipped: false, reason };
        } catch {
          phase = "released";
          current = null;
          return { ok: false, skipped: false, reason };
        } finally {
          inFlightRelease = null;
        }
      })();

      inFlightRelease = run;
      return run;
    },
    async settle(providerRequestId) {
      if (phase === "settled") {
        return { ok: true, skipped: true };
      }
      if (phase === "withheld") {
        return { ok: false, skipped: true };
      }
      if (phase !== "reserved" || !current) {
        return { ok: false, skipped: true };
      }
      settleCalls += 1;
      const target = current;
      try {
        const result = await backends.settle(target, providerRequestId);
        if (result.ok) {
          phase = "settled";
          current = null;
          return {
            ok: true,
            skipped: false,
            availableCredits: result.availableCredits,
          };
        }
        // Capture returned failure: auto-withhold so finally cannot release
        // a paid provider output (free clip). Routes still record recon.
        phase = "withheld";
        current = null;
        return { ok: false, skipped: false };
      } catch (err) {
        // Capture RPC threw: same as fail — withhold, never release.
        phase = "withheld";
        current = null;
        return {
          ok: false,
          skipped: false,
          error:
            err instanceof Error
              ? err.message
              : "capture threw",
        };
      }
    },
    markWithheld(reason) {
      void reason;
      if (phase === "reserved" || phase === "withheld") {
        phase = "withheld";
        // Keep reservation id off the hot pointer so finally cannot release.
        current = null;
      }
    },
    async safetyNetRelease() {
      return this.release("unexpected_exit_safety_net");
    },
  };
}
