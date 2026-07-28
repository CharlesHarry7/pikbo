/**
 * Private-beta live generation gate (pure, no secrets, no network).
 *
 * Invited owner path for Issue #54 — never enables anonymous provider spend.
 * Budget is a hard cap on live provider attempts (caller supplies spent count).
 */

/**
 * @param {string | null | undefined} raw
 * @returns {string[]}
 */
export function parsePrivateLiveAllowlist(raw) {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * @param {{
 *   enabled: boolean;
 *   allowlist: string[];
 *   email?: string | null;
 *   userId?: string | null;
 * }} input
 */
export function isPrivateLiveInvite(input) {
  if (!input.enabled) {
    return { invited: false, reason: "private_live_disabled" };
  }
  if (!input.allowlist.length) {
    return { invited: false, reason: "allowlist_empty" };
  }
  const email = (input.email || "").trim().toLowerCase();
  const userId = (input.userId || "").trim().toLowerCase();
  if (email && input.allowlist.includes(email)) {
    return { invited: true, match: "email" };
  }
  if (userId && input.allowlist.includes(userId)) {
    return { invited: true, match: "userId" };
  }
  return { invited: false, reason: "not_on_allowlist" };
}

/**
 * @param {{ spent: number; max: number }} input
 */
export function privateLiveBudget(input) {
  const max = Math.max(0, Math.floor(Number(input.max) || 0));
  const spent = Math.max(0, Math.floor(Number(input.spent) || 0));
  const remaining = Math.max(0, max - spent);
  return {
    max,
    spent,
    remaining,
    exhausted: remaining <= 0,
    ok: max > 0 && remaining > 0,
  };
}

/**
 * Free-plan live delivery readiness for access gate.
 * Public Free stays blocked until T6 server-owned free delivery is ready.
 * Private invite may open Free live only with remaining budget (still needs
 * auth + durable reserve + provider at the route layer).
 *
 * @param {{
 *   t6FreeLiveDeliveryReady: boolean;
 *   privateInvite: boolean;
 *   privateBudgetOk: boolean;
 * }} input
 */
export function freeDeliveryReadyForAccess(input) {
  if (input.t6FreeLiveDeliveryReady) return true;
  return Boolean(input.privateInvite && input.privateBudgetOk);
}

/**
 * Pass/fail checklist for private live (no secret values).
 * @param {Record<string, boolean>} flags
 */
export function evaluatePrivateLivePrereqs(flags) {
  const required = [
    ["privateLiveEnabled", flags.privateLiveEnabled === true],
    ["allowlistConfigured", flags.allowlistConfigured === true],
    ["authenticatedInvitedUser", flags.authenticatedInvitedUser === true],
    ["providerConfigured", flags.providerConfigured === true],
    ["sessionSecret", flags.sessionSecret === true],
    ["durableAtomicReservation", flags.durableAtomicReservation === true],
    ["durableReconciliation", flags.durableReconciliation === true],
    ["budgetRemaining", flags.budgetRemaining === true],
  ];
  const optionalUntilDownload = [
    ["serverOwnedDeliverable", flags.serverOwnedDeliverable === true],
  ];
  const missing = required.filter(([, ok]) => !ok).map(([k]) => k);
  const missingOptional = optionalUntilDownload
    .filter(([, ok]) => !ok)
    .map(([k]) => k);
  return {
    readyForPrivateLiveProviderCall: missing.length === 0,
    readyForPrivateLiveDownload: missing.length === 0 && missingOptional.length === 0,
    missing,
    missingOptionalUntilDownload: missingOptional,
    notes: [
      "Anonymous users never reach the provider (R0).",
      "Live requires durable atomic reservation — cookie is not spend authority.",
      "Raw provider URLs stay server-side; Free/watermark paths use /api/downloads.",
      "PIKBO_PRIVATE_LIVE_* never enables public uncapped spend.",
    ],
  };
}

/**
 * Honesty for cached responses when the client uploaded a still.
 * @param {{ accessKind: "cached" | "live"; hadUpload: boolean; reason?: string }} input
 */
export function cachedUploadHonesty(input) {
  if (input.accessKind !== "cached" || !input.hadUpload) {
    return { processedUpload: input.accessKind === "live" && input.hadUpload };
  }
  return {
    processedUpload: false,
    uploadIgnored: true,
    uploadIgnoredReason: input.reason || "cached_mode",
  };
}
