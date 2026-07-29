export type HealthTruthInput = {
  authConfigured: boolean;
  durableAtomicReservationConfigured: boolean;
  durableReconciliationConfigured: boolean;
  providerConfigured: boolean;
  serverOwnedDeliverableConfigured: boolean;
};

/**
 * Public live-readiness contract. Every prerequisite is mandatory; environment
 * presence or a provider key alone must never advertise live generation.
 */
export function evaluateHealthTruth(input: HealthTruthInput) {
  const missing: Array<keyof HealthTruthInput> = [];
  if (!input.authConfigured) missing.push("authConfigured");
  if (!input.durableAtomicReservationConfigured) {
    missing.push("durableAtomicReservationConfigured");
  }
  if (!input.durableReconciliationConfigured) {
    missing.push("durableReconciliationConfigured");
  }
  if (!input.providerConfigured) missing.push("providerConfigured");
  if (!input.serverOwnedDeliverableConfigured) {
    missing.push("serverOwnedDeliverableConfigured");
  }
  const softLive = missing.length === 0;
  return {
    softLive,
    mode: softLive
      ? ("live-generate" as const)
      : input.providerConfigured
        ? ("validation" as const)
        : ("cached-only" as const),
    missing,
  };
}

export type AccountLiveCapabilityInput = {
  /** Same provider-admission decision used by /api/generate for this account. */
  liveRouteReady: boolean;
  signedIn: boolean;
  durableCreditsActive: boolean;
  planId: string;
  availableCredits: number | null;
  liveJobCredits: number;
  freeDeliveryReady: boolean;
};

/**
 * One account-level answer for every live-looking credit label and CTA.
 * Cookie credits are deliberately absent: only an authenticated durable wallet
 * may authorize a provider-backed job.
 */
export function evaluateAccountLiveCapability(
  input: AccountLiveCapabilityInput
) {
  const enoughCredits =
    typeof input.availableCredits === "number" &&
    input.availableCredits >= input.liveJobCredits;
  const deliveryAllowed =
    input.planId === "founding_studio" ||
    (input.planId === "free" && input.freeDeliveryReady);
  const canLiveGenerate =
    input.liveRouteReady &&
    input.signedIn &&
    input.durableCreditsActive &&
    enoughCredits &&
    deliveryAllowed;

  return {
    canLiveGenerate,
    displayMode: canLiveGenerate
      ? ("live" as const)
      : ("cached" as const),
    cachedCredits: 0 as const,
  };
}
