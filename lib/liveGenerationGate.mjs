/**
 * Cost-safety boundary shared by the production route and its regression test.
 *
 * A configured provider is never enough to authorize spend. Anonymous and Free
 * sessions stay on cached official media. Any code that reaches a provider
 * must also present a committed durable reservation.
 */

/**
 * @param {{
 *   providerConfigured: boolean;
 *   authenticated: boolean;
 *   planId: "free" | "creator" | "shop";
 *   freeDeliveryReady: boolean;
 * }} input
 * @returns {
 *   | { kind: "cached"; reason: "no_provider_key" | "anonymous_cached_only" | "free_live_delivery_blocked" }
 *   | { kind: "live" }
 * }
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
  return { kind: "live" };
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
    reservation.status !== "reserved"
  ) {
    throw new Error("LIVE_PROVIDER_REQUIRES_DURABLE_RESERVATION");
  }
  return call();
}
