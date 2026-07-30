/**
 * Classify fal / provider failures so the UI can stay honest
 * (balance empty vs hard crash vs rate limit vs content policy).
 */

export type ProviderFailKind =
  | "balance"
  | "rate"
  | "timeout"
  | "network"
  | "content"
  | "other";

export type ProviderFailureSettlementPlan =
  | {
      action: "release";
      reason:
        | "provider_error_before_submit"
        | "provider_rejected_before_execution";
    }
  | {
      action: "withhold";
      reason: `provider_outcome_unknown:${ProviderFailKind}`;
      code: "DURABLE_CREDITS_UNAVAILABLE";
      status: 503;
      error: string;
      refundUnconfirmed: true;
    };

/**
 * A thrown subscribe() call does not prove that the provider rejected the job.
 * It can also mean the queue accepted it and polling/result delivery failed.
 * In that ambiguous state credits stay reserved until reconciliation proves a
 * terminal provider outcome.
 */
export function providerFailureSettlementPlan(input: {
  kind: ProviderFailKind;
  providerRequestStarted: boolean;
  /** Only structured provider evidence may set this; error-copy matching may not. */
  providerConfirmedNoExecution?: boolean;
}): ProviderFailureSettlementPlan {
  if (!input.providerRequestStarted) {
    return {
      action: "release",
      reason: "provider_error_before_submit",
    };
  }
  if (input.providerConfirmedNoExecution === true) {
    return {
      action: "release",
      reason: "provider_rejected_before_execution",
    };
  }
  return {
    action: "withhold",
    reason: `provider_outcome_unknown:${input.kind}`,
    code: "DURABLE_CREDITS_UNAVAILABLE",
    status: 503,
    error:
      "The provider response was interrupted after generation may have started. Credits remain reserved while Pikbo verifies the provider result; do not retry this attempt yet.",
    refundUnconfirmed: true,
  };
}

/**
 * Close the release path before any fallible I/O, then best-effort persist the
 * unknown provider outcome. Neither a provider-budget RPC failure nor a
 * reconciliation recorder failure may reopen the reservation in `finally`.
 */
export async function recordAmbiguousSettlementStateSafely(input: {
  reason: string;
  markWithheld: (reason: string) => void;
  commitProviderSpend: () => Promise<boolean>;
  recordReconciliation: () => Promise<{
    ok: boolean;
    code?: string;
  }>;
}): Promise<{
  providerSpendCommitted: boolean;
  reconciliationRecorded: boolean;
  reconciliationCode?: string;
}> {
  // ReservationLifecycle.markWithheld is synchronous and non-throwing. This
  // call must remain before the first await in this helper.
  input.markWithheld(input.reason);

  let providerSpendCommitted = false;
  try {
    providerSpendCommitted = await input.commitProviderSpend();
  } catch {
    // The durable budget keeps its reservation for later reconciliation.
  }

  try {
    const recorded = await input.recordReconciliation();
    return {
      providerSpendCommitted,
      reconciliationRecorded: recorded.ok,
      ...(recorded.ok || !recorded.code
        ? {}
        : { reconciliationCode: recorded.code }),
    };
  } catch {
    return {
      providerSpendCommitted,
      reconciliationRecorded: false,
      reconciliationCode: "RECONCILIATION_RECORD_THROW",
    };
  }
}

export function classifyProviderError(raw: string): ProviderFailKind {
  if (!raw) return "other";
  if (/Exhausted balance|locked|top up|insufficient.*credit/i.test(raw)) {
    return "balance";
  }
  if (/Forbidden/i.test(raw) && /balance|billing|quota/i.test(raw)) {
    return "balance";
  }
  if (/rate.?limit|too many|429|throttl/i.test(raw)) {
    return "rate";
  }
  if (
    /timeout|timed?\s*out|deadline exceeded|ETIMEDOUT|Gateway Time-out|504/i.test(
      raw
    )
  ) {
    return "timeout";
  }
  // Upstream blips distinct from model timeout — client should Retry soon.
  if (
    /ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH|socket hang up|fetch failed|network error|Bad Gateway|Service Unavailable|\b502\b|\b503\b|connection reset|temporarily unavailable/i.test(
      raw
    )
  ) {
    return "network";
  }
  if (
    /content.?policy|nsfw|safety|moderation|blocked.?content|violat/i.test(raw)
  ) {
    return "content";
  }
  return "other";
}

export function providerErrorMessage(
  kind: ProviderFailKind,
  fallback: string
): string {
  if (kind === "balance") {
    return "Provider balance empty or account locked — top up at fal.ai/dashboard/billing (credits refunded).";
  }
  if (kind === "rate") {
    return "Provider rate limited — try again in a moment (credits refunded).";
  }
  if (kind === "timeout") {
    return "Provider timed out — try again; credits restored when the debit was confirmed.";
  }
  if (kind === "network") {
    return "Provider network blip — Retry in a few seconds; credits restored when the debit was confirmed.";
  }
  if (kind === "content") {
    return "Provider rejected the still or prompt under content policy — try a clearer product photo (credits restored).";
  }
  return fallback;
}

/**
 * Map classified provider fail → API code + HTTP status (+ optional Retry-After).
 * Shared by /api/generate and /api/image so codes never drift.
 */
export function providerFailHttp(kind: ProviderFailKind): {
  code:
    | "PROVIDER_BALANCE"
    | "PROVIDER_RATE_LIMIT"
    | "PROVIDER_TIMEOUT"
    | "PROVIDER_NETWORK"
    | "CONTENT_POLICY"
    | "GENERATION_FAILED";
  status: number;
  retryAfterSec?: number;
} {
  if (kind === "balance") {
    return { code: "PROVIDER_BALANCE", status: 402 };
  }
  if (kind === "rate") {
    return { code: "PROVIDER_RATE_LIMIT", status: 429, retryAfterSec: 8 };
  }
  if (kind === "timeout") {
    return { code: "PROVIDER_TIMEOUT", status: 504, retryAfterSec: 5 };
  }
  if (kind === "network") {
    return { code: "PROVIDER_NETWORK", status: 503, retryAfterSec: 8 };
  }
  if (kind === "content") {
    return { code: "CONTENT_POLICY", status: 422 };
  }
  return { code: "GENERATION_FAILED", status: 500 };
}

/** data:image/*;base64,... only — rejects non-image or missing payload. */
export function isValidImageDataUrl(image: string): boolean {
  if (!image || image.length < 32) return false;
  return /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(image);
}
