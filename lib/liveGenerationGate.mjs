/**
 * Cost-safety boundary shared by the production route and its regression test.
 *
 * A configured provider is never enough to authorize spend. Anonymous and Free
 * sessions stay on cached prototype media. Any code that reaches a provider
 * must also present a committed durable reservation.
 */

/**
 * @typedef {
 *   | { kind: "cached"; reason: "no_provider_key" | "anonymous_cached_only" | "free_live_delivery_blocked" | "paid_plan_not_authorized" | "client_provider_spend_not_authorized" }
 *   | { kind: "live" }
 * } LiveGenerationAccess
 */

/**
 * @param {{
 *   providerConfigured: boolean;
 *   authenticated: boolean;
 *   planId: unknown;
 *   freeDeliveryReady: boolean;
 * }} input
 * @returns {LiveGenerationAccess}
 */
export function liveGenerationAccess(input) {
  if (!input.providerConfigured) {
    return { kind: "cached", reason: "no_provider_key" };
  }
  if (!input.authenticated) {
    return { kind: "cached", reason: "anonymous_cached_only" };
  }
  if (input.planId === "free" && !input.freeDeliveryReady) {
    return { kind: "cached", reason: "free_live_delivery_blocked" };
  }
  if (
    input.planId !== "founding_studio" &&
    !(input.planId === "free" && input.freeDeliveryReady)
  ) {
    return { kind: "cached", reason: "paid_plan_not_authorized" };
  }
  return { kind: "live" };
}

/**
 * Bind the server-computed capability to what the client explicitly presented.
 * A missing/false flag is cached-only, so capability loading races and failed
 * /api/me requests can never silently authorize provider spend.
 *
 * @param {LiveGenerationAccess} access
 * @param {boolean | null | undefined} allowProviderSpend
 * @returns {LiveGenerationAccess}
 */
export function bindProviderSpendIntent(access, allowProviderSpend) {
  if (access.kind === "live" && allowProviderSpend !== true) {
    return {
      kind: "cached",
      reason: "client_provider_spend_not_authorized",
    };
  }
  return access;
}

/**
 * Last defense immediately around each paid-provider operation.
 * The callback is never evaluated without a committed reservation.
 */
export async function invokeReservedProvider(reservation, call) {
  if (
    !reservation ||
    typeof reservation.reservationId !== "string" ||
    reservation.reservationId.length < 8 ||
    reservation.status !== "reserved" ||
    reservation.providerAuthorized !== true
  ) {
    throw new Error("LIVE_PROVIDER_REQUIRES_DURABLE_RESERVATION");
  }
  return call();
}
