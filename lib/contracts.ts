/**
 * Foundation contracts — single shapes for generate / session surfaces.
 * UI and API must not invent parallel field names.
 */

import type { PublicSession } from "@/lib/session";
import type { ModelPreference, SeedanceResolution } from "@/lib/models";
import { CREDITS_PER_VIDEO } from "@/lib/pricing";

export type GenerateRequestBody = {
  effect?: string;
  /**
   * Server-validated commercial product contract. This is not spend authority:
   * the API still verifies the exact effect, format, model, private input,
   * durable balance, and Provider budget before accepting a paid request.
   */
  productContract?: "toy-moment-v1";
  /** data:image… URL (soft-launch default). Optional when assetId is set. */
  image?: string;
  /**
   * Phase D local asset id from POST /api/assets/upload-url + PUT content.
   * Server resolves the image for this session — avoids re-posting large Base64.
   */
  assetId?: string;
  extra?: string;
  duration?: number;
  aspectRatio?: string;
  model?: ModelPreference | string;
  resolution?: SeedanceResolution | string;
  seed?: number;
  /**
   * Soft-launch PRD §3/§5 — client must confirm ownership before submit.
   * Server rejects live jobs without this flag (demo path also requires it).
   */
  ownsRights?: boolean;
  /**
   * Explicit client consent for this request to reserve credits and call the
   * paid provider. Missing/false is cached-only; the server must never upgrade
   * a UI that displayed "0 credits / upload not processed" into Live.
   */
  allowProviderSpend?: boolean;
  /**
   * Client-minted key for one logical generate attempt (UUID).
   * Same key + session: success/fail replay without double-debit; running → JOB_IN_FLIGHT.
   * User Retry must mint a new key. Soft-launch process-memory only.
   */
  idempotencyKey?: string;
  /** Exact queued retry child created by POST /api/generations/{parent}/retry. */
  retryJobId?: string;
  /** One-time bearer paired with retryJobId; never inferred from effect/prompt. */
  retryToken?: string;
  /**
   * Server-owned Seller Pack run id from POST /api/seller-pack/reserve.
   * When present with packJobId, live generate authorizes against the parent
   * 30-credit pack reservation and never opens a second R1a reserve.
   */
  packRunId?: string;
  /**
   * Bound fixed child job id from the same pack reserve response.
   * Client-supplied reservation IDs, credit amounts, or free-form job IDs
   * are never trusted as spend authority.
   */
  packJobId?: string;
};

export type GenerateSuccess = {
  videoUrl: string;
  /** true when no live fal call was made (cached product demos) */
  demo: boolean;
  watermark: boolean;
  model: string;
  duration: number;
  aspectRatio: string;
  /** Server-enforced resolution (480p free / 720p paid default) */
  resolution: string;
  session: PublicSession;
  /** present on live fal jobs (provider id); may equal jobId on demo */
  requestId?: string;
  /** Upstream request evidence. Never use this value as a download address. */
  providerRequestId?: string;
  /**
   * Process-memory ledger id (Phase D). Prefer for cancel/poll/download when
   * distinct from provider requestId.
   */
  jobId?: string;
  provider?: string;
  /** why demo was returned — only when demo:true */
  demoReason?:
    | "no_provider_key"
    | "anonymous_cached_only"
    | "free_live_delivery_blocked"
    | "paid_plan_not_authorized"
    | "client_provider_spend_not_authorized"
    | "private_live_budget_exhausted"
    | "private_live_not_invited";
  /**
   * Wave B — server-validated recipe slug actually used for this job.
   * Client must only label "server returned" when this field is present.
   */
  effect?: string;
  /** Credits charged for this success (0 cached demo · CREDITS_PER_VIDEO live). */
  costCredits?: number;
  /** Human credit outcome for the result strip. */
  creditsOutcome?: "0 cached" | "10 used";
  /**
   * True when this body reuses a prior success for the same idempotencyKey
   * (no second debit / no second fal call).
   */
  idempotentReplay?: boolean;
  /**
   * Honesty: whether the uploaded still was sent to the provider.
   * false + demo:true means Lab cache — not a successful processing of the upload.
   */
  processedUpload?: boolean;
  /** Present when a client upload was ignored because access stayed cached. */
  uploadIgnored?: boolean;
  uploadIgnoredReason?: string;
  /** True only for an authenticated Preview result saved in Pikbo-owned storage. */
  privateResult?: boolean;
  /**
   * Honest USD cost audit for private Seedance 2.0 live jobs.
   * estimated/ceiling are planning labels; actual is null unless provider-reported.
   */
  costAudit?: {
    modelId: string;
    estimatedUsd: {
      amountUsd: number;
      kind: "estimated";
      label: "estimated";
    };
    ceilingRemainingUsd: {
      amountUsd: number;
      kind: "ceiling";
      label: "ceiling";
    };
    actualUsd: {
      amountUsd: number;
      kind: "actual";
      label: "actual";
    } | null;
    note: string;
  };
};

export type GenerateErrorBody = {
  error: string;
  code?:
    | "INSUFFICIENT_CREDITS"
    | "AUTH_REQUIRED"
    | "LIVE_ACCESS_REQUIRED"
    | "PAID_CEILING_ZERO"
    | "PAID_CEILING_EXHAUSTED"
    | "PAID_CEILING_UNAVAILABLE"
    | "DURABLE_CREDITS_UNAVAILABLE"
    | "RESERVATION_FAILED"
    | "DELIVERY_PIPELINE_UNAVAILABLE"
    | "PROVIDER_UNAVAILABLE"
    | "INVALID_REQUEST"
    | "IMAGE_TOO_LARGE"
    | "ASSET_NOT_FOUND"
    | "UNKNOWN_EFFECT"
    | "MODEL_EMPTY"
    | "GENERATION_FAILED"
    | "PROVIDER_BALANCE"
    | "PROVIDER_RATE_LIMIT"
    | "PROVIDER_TIMEOUT"
    /** Upstream network blip (502/503/ECONNRESET) — Retry; usually refunded. */
    | "PROVIDER_NETWORK"
    | "CONTENT_POLICY"
    | "RATE_LIMITED"
    | "JOB_IN_FLIGHT"
    | "RETRY_TOKEN_INVALID"
    | "RETRY_JOB_NOT_READY"
    | "RETRY_SPEC_MISMATCH"
    | "IDEMPOTENCY_CONFLICT"
    | "RIGHTS_REQUIRED"
    | "UNSAFE_URL"
    /**
     * Process-memory ledger timeout (sweep) — mint a new idempotency key.
     * Distinct from PROVIDER_TIMEOUT (live fal deadline).
     */
    | "TIMEOUT"
    /** Client-side only — fetch never reached a typed server body. */
    | "NETWORK_ERROR"
    | "REQUEST_CANCELED";
  need?: number;
  have?: number;
  model?: string;
  /** Existing local generation-ledger id when a submitted request fails. */
  jobId?: string;
  session?: PublicSession;
  /** seconds to wait on rate limits */
  retryAfterSec?: number;
  /**
   * Soft-launch PRD §5 — true when a live debit was restored after failure.
   * Absent/false when no debit occurred (validation, rate limit, demo path).
   */
  creditsRefunded?: boolean;
  /**
   * Ledger timeout / kill mid-flight — do not claim credits restored.
   * Client should re-check /api/me balance.
   */
  refundUnconfirmed?: boolean;
};

/** Future metering hook — flat cost today, structured for model×duration later. */
export type JobMeterInput = {
  freeTier: boolean;
  durationSec: number;
  resolution: SeedanceResolution;
  modelId: string;
};

/**
 * Credit cost for one generation job.
 * Today: flat CREDITS_PER_VIDEO. Tomorrow: branch on model/duration/resolution.
 */
export function jobCostCredits(job?: JobMeterInput): number {
  void job; // reserved for model×duration metering
  return CREDITS_PER_VIDEO;
}
