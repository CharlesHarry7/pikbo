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

export type PrivatePreviewReadinessInput = {
  authConfigured: boolean;
  durableAtomicReservationConfigured: boolean;
  durableReconciliationConfigured: boolean;
  providerConfigured: boolean;
  privateResultsBucketReady: boolean;
  privateResultsSchemaReady: boolean;
  privateResultsRpcReady: boolean;
  privateInputsBucketReady: boolean;
  privateInputsSchemaReady: boolean;
  privateInputsReserveRpcReady: boolean;
  privateInputsDiscoveryReady: boolean;
  providerOutputAllowlistConfigured: boolean;
  privateLiveEnabled: boolean;
  privateLiveAllowlistConfigured: boolean;
  privateLiveBudgetConfigured: boolean;
  providerValidationEnvironmentAllowed: boolean;
  providerValidationBudgetConfigured: boolean;
  durableProviderBudgetSchemaReady: boolean;
  durableProviderBudgetRpcReady: boolean;
};

export type PrivateInputAdmissionReadinessInput = {
  authConfigured: boolean;
  privateInputsBucketReady: boolean;
  privateInputsSchemaReady: boolean;
  privateInputsAssetRpcReady: boolean;
  privateLiveEnabled: boolean;
  privateLiveAllowlistConfigured: boolean;
};

/**
 * Readiness for the zero-Provider input-admission leg only. A true result may
 * authorize an invited seller to prepare and verify one private toy image; it
 * must never authorize Pack reserve, credits, generation, or delivery.
 */
export function evaluatePrivateInputAdmissionReadiness(
  input: PrivateInputAdmissionReadinessInput
) {
  const required: Array<keyof PrivateInputAdmissionReadinessInput> = [
    "authConfigured",
    "privateInputsBucketReady",
    "privateInputsSchemaReady",
    "privateInputsAssetRpcReady",
    "privateLiveEnabled",
    "privateLiveAllowlistConfigured",
  ];
  const missing: Array<keyof PrivateInputAdmissionReadinessInput> = [];
  for (const key of required) {
    if (!input[key]) missing.push(key);
  }
  return { ready: missing.length === 0, missing };
}

/**
 * Global readiness for the invited private Preview path. This deliberately
 * stays separate from public soft-live readiness: Preview may use an
 * owner-only delivery path, but every spend, storage, and environment gate
 * must still be true before account UI may advertise real generation.
 */
export function evaluatePrivatePreviewReadiness(
  input: PrivatePreviewReadinessInput
) {
  const required: Array<keyof PrivatePreviewReadinessInput> = [
    "authConfigured",
    "durableAtomicReservationConfigured",
    "durableReconciliationConfigured",
    "providerConfigured",
    "privateResultsBucketReady",
    "privateResultsSchemaReady",
    "privateResultsRpcReady",
    "privateInputsBucketReady",
    "privateInputsSchemaReady",
    "privateInputsReserveRpcReady",
    "privateInputsDiscoveryReady",
    "providerOutputAllowlistConfigured",
    "privateLiveEnabled",
    "privateLiveAllowlistConfigured",
    "privateLiveBudgetConfigured",
    "providerValidationEnvironmentAllowed",
    "providerValidationBudgetConfigured",
    "durableProviderBudgetSchemaReady",
    "durableProviderBudgetRpcReady",
  ];
  const missing: Array<keyof PrivatePreviewReadinessInput> = [];
  for (const key of required) {
    if (!input[key]) missing.push(key);
  }
  return {
    ready: missing.length === 0,
    missing,
  };
}

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
