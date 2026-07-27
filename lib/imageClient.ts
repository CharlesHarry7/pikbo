/**
 * Shared client for POST /api/image.
 * Parity with generateClient: typed fail codes, Retry-After waits, idempotency.
 */

import type { PublicSession } from "@/lib/session";
import { isSafeDeliverableUrl } from "@/lib/createTrust";
import { sleep } from "@/lib/generateClient";

export type ImageErrorCode =
  | "INVALID_REQUEST"
  | "INSUFFICIENT_CREDITS"
  | "AUTH_REQUIRED"
  | "LIVE_ACCESS_REQUIRED"
  | "DURABLE_CREDITS_UNAVAILABLE"
  | "RESERVATION_FAILED"
  | "RATE_LIMITED"
  | "JOB_IN_FLIGHT"
  | "MODEL_EMPTY"
  | "GENERATION_FAILED"
  | "PROVIDER_BALANCE"
  | "PROVIDER_RATE_LIMIT"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_NETWORK"
  | "CONTENT_POLICY"
  | "UNSAFE_URL"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "REQUEST_CANCELED";

export type ImageSuccess = {
  imageUrl: string;
  demo: boolean;
  demoReason?: string;
  model?: string;
  aspect?: string;
  session?: PublicSession;
  costCredits?: number;
  creditsOutcome?: "0 cached" | "10 used";
  requestId?: string;
  jobId?: string;
  idempotentReplay?: boolean;
};

export type ImageFail = {
  ok: false;
  status: number;
  error: string;
  code?: ImageErrorCode;
  session?: PublicSession;
  retryAfterSec?: number;
  creditsRefunded?: boolean;
  refundUnconfirmed?: boolean;
};

export type ImageOk = {
  ok: true;
  status: number;
  data: ImageSuccess;
};

export type ImageResult = ImageOk | ImageFail;

export function mintImageIdempotencyKey(): string {
  try {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function asErrorBody(data: unknown): {
  error?: string;
  code?: string;
  session?: PublicSession;
  retryAfterSec?: number;
  creditsRefunded?: boolean;
  refundUnconfirmed?: boolean;
} {
  if (data && typeof data === "object") {
    return data as {
      error?: string;
      code?: string;
      session?: PublicSession;
      retryAfterSec?: number;
      creditsRefunded?: boolean;
      refundUnconfirmed?: boolean;
    };
  }
  return { error: "Image generation failed" };
}

/** Parse a fetch Response + JSON into a typed still result. */
export function interpretImageResponse(
  status: number,
  raw: unknown
): ImageResult {
  if (status >= 200 && status < 300) {
    if (!raw || typeof raw !== "object") {
      return {
        ok: false,
        status,
        error: "Model returned an empty still",
        code: "MODEL_EMPTY",
      };
    }
    const d = raw as Partial<ImageSuccess> & {
      creditsRefunded?: boolean;
    };
    if (typeof d.imageUrl !== "string" || !d.imageUrl) {
      const creditsRefunded =
        d.creditsRefunded === true ? true : undefined;
      // Empty 200 still may have debited — never invent restore (generateClient parity).
      return {
        ok: false,
        status,
        error:
          creditsRefunded === true
            ? "Model returned an empty still · 10 credits restored"
            : "Model returned an empty still · check balance (refund unconfirmed)",
        code: "MODEL_EMPTY",
        session: d.session,
        creditsRefunded,
        refundUnconfirmed: creditsRefunded !== true ? true : undefined,
      };
    }
    // Live stills must be http(s) or same-origin path; demos may be data:image.
    const demo = Boolean(d.demo);
    if (!demo) {
      if (
        !/^https?:\/\//i.test(d.imageUrl) &&
        !d.imageUrl.startsWith("/")
      ) {
        return {
          ok: false,
          status: 502,
          error:
            "Server returned an unsafe image URL — not displaying · check balance",
          code: "UNSAFE_URL",
          session: d.session,
          creditsRefunded: d.creditsRefunded === true ? true : undefined,
          refundUnconfirmed: d.creditsRefunded !== true,
        };
      }
      if (
        /^https?:\/\//i.test(d.imageUrl) &&
        !isSafeDeliverableUrl(d.imageUrl)
      ) {
        return {
          ok: false,
          status: 502,
          error:
            "Server returned an unsafe image URL — not displaying · check balance",
          code: "UNSAFE_URL",
          session: d.session,
          creditsRefunded: d.creditsRefunded === true ? true : undefined,
          refundUnconfirmed: d.creditsRefunded !== true,
        };
      }
    } else if (
      !d.imageUrl.startsWith("data:image/") &&
      !isSafeDeliverableUrl(d.imageUrl) &&
      !d.imageUrl.startsWith("/")
    ) {
      return {
        ok: false,
        status: 502,
        error: "Demo still URL is unsafe — not displaying",
        code: "UNSAFE_URL",
        session: d.session,
      };
    }
    return { ok: true, status, data: d as ImageSuccess };
  }

  const body = asErrorBody(raw);
  const code = (body.code as ImageErrorCode | undefined) || undefined;
  const retryAfterSec =
    typeof body.retryAfterSec === "number" && body.retryAfterSec > 0
      ? body.retryAfterSec
      : undefined;
  const creditsRefunded = body.creditsRefunded === true;

  // R1a capture ambiguity parity with generateClient — withhold, no invented refund.
  if (code === "DURABLE_CREDITS_UNAVAILABLE") {
    return {
      ok: false,
      status,
      error:
        body.error ||
        "Credits could not be finalized. Still withheld while the durable reservation is reconciled — do not retry with the same idempotency key.",
      code,
      session: body.session,
      retryAfterSec,
      creditsRefunded: undefined,
      refundUnconfirmed: undefined,
    };
  }

  // TIMEOUT / provider blip / unsafe deliverable after debit — never invent restore.
  const refundUnconfirmed =
    body.refundUnconfirmed === true ||
    code === "TIMEOUT" ||
    code === "PROVIDER_NETWORK" ||
    code === "PROVIDER_TIMEOUT" ||
    (code === "UNSAFE_URL" && !creditsRefunded) ||
    (code === "CONTENT_POLICY" && !creditsRefunded) ||
    // Empty still after live attempt — generateClient + createTrust parity.
    (code === "MODEL_EMPTY" && !creditsRefunded);

  let error =
    body.error ||
    (code === "RATE_LIMITED"
      ? `Too many image jobs — wait ${retryAfterSec ?? "a few"}s, then Retry`
      : code === "JOB_IN_FLIGHT"
        ? `An image job is already running — wait ${retryAfterSec ?? "a few"}s`
        : code === "AUTH_REQUIRED"
          ? "Sign in before requesting live Flux stills"
          : code === "LIVE_ACCESS_REQUIRED"
            ? "This account cannot run live stills yet — use labeled demos for Free"
            : code === "RESERVATION_FAILED"
              ? "Could not reserve credits for live stills — mint a new attempt key"
              : code === "PROVIDER_BALANCE"
                ? "Upstream provider balance empty — credits restored when the debit was confirmed."
                : code === "PROVIDER_RATE_LIMIT"
                  ? `Provider busy — try again in ${retryAfterSec ?? "a few"}s`
                  : code === "PROVIDER_TIMEOUT"
                    ? `Provider timed out — Retry in ${retryAfterSec ?? "a few"}s`
                    : code === "PROVIDER_NETWORK"
                      ? `Provider network blip — Retry in ${retryAfterSec ?? "a few"}s`
                      : code === "TIMEOUT"
                        ? "Prior still job timed out — mint a new attempt (Retry). Check balance if refund is unconfirmed."
                        : code === "CONTENT_POLICY"
                          ? "Provider rejected this prompt — try a clearer product description"
                          : code === "UNSAFE_URL"
                            ? "Provider returned an unsafe image URL — check balance"
                            : code === "INSUFFICIENT_CREDITS"
                              ? "Not enough credits — top up on Pricing or wait for plan refresh"
                              : "Image generation failed — Retry keeps your prompt");

  if (creditsRefunded && !/refund|restored|credit/i.test(error)) {
    error = `${error} · 10 credits restored`;
  }
  if (
    refundUnconfirmed &&
    !creditsRefunded &&
    !/refund unconfirmed|check balance/i.test(error)
  ) {
    error = `${error} · check balance (refund unconfirmed)`;
  }

  return {
    ok: false,
    status,
    error,
    code,
    session: body.session,
    retryAfterSec,
    creditsRefunded,
    refundUnconfirmed: refundUnconfirmed || undefined,
  };
}

/**
 * Best-effort still ledger cancel (DELETE /api/image).
 * Soft-launch Flux may still complete server-side; complete wins over cancel.
 */
export async function cancelImageLedger(opts: {
  jobId?: string;
  idempotencyKey?: string;
}): Promise<void> {
  try {
    const payload: Record<string, string> = {};
    if (opts.jobId) payload.jobId = opts.jobId;
    if (opts.idempotencyKey) payload.idempotencyKey = opts.idempotencyKey;
    if (!payload.jobId && !payload.idempotencyKey) return;
    await fetch("/api/image", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    /* ignore — client already treats as cancel/refund unconfirmed */
  }
}

export async function postImage(
  body: {
    prompt: string;
    aspect?: string;
    idempotencyKey?: string;
    /** R1b process-memory fork token from POST /api/image/[id]/retry */
    retryJobId?: string;
  },
  init?: { signal?: AbortSignal }
): Promise<ImageResult> {
  try {
    const res = await fetch("/api/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: init?.signal,
    });
    let raw: unknown = null;
    try {
      raw = await res.json();
    } catch {
      raw = { error: "Invalid server response" };
    }
    return interpretImageResponse(res.status, raw);
  } catch (e) {
    const aborted =
      (e instanceof Error && e.name === "AbortError") ||
      (typeof DOMException !== "undefined" &&
        e instanceof DOMException &&
        e.name === "AbortError");
    if (aborted && body.idempotencyKey) {
      void cancelImageLedger({ idempotencyKey: body.idempotencyKey });
    }
    return {
      ok: false,
      status: 0,
      code: aborted ? "REQUEST_CANCELED" : "NETWORK_ERROR",
      error: aborted
        ? "Request canceled — if credits were debited, check balance or retry (refund unconfirmed until server confirms)"
        : e instanceof Error
          ? e.message ||
            "Network error — check connection and balance (refund unconfirmed until server confirms)"
          : "Network error — check connection and balance (refund unconfirmed until server confirms)",
      // Client never saw a typed body — do not claim restore (parity with generateClient).
      refundUnconfirmed: true,
    };
  }
}

/**
 * POST still with one automatic recovery on rate / in-flight / network / timeout.
 * Stable idempotencyKey for the whole attempt (no double Flux debit).
 * User Retry must call again without reusing a failed key (mint fresh).
 * Never auto-retries ledger TIMEOUT — mint a new key after kill recovery.
 */
export async function postImageWithRetry(
  body: {
    prompt: string;
    aspect?: string;
    idempotencyKey?: string;
    retryJobId?: string;
  },
  opts?: { maxRetries?: number; signal?: AbortSignal }
): Promise<ImageResult> {
  const maxRetries = opts?.maxRetries ?? 1;
  const idempotencyKey =
    typeof body.idempotencyKey === "string" &&
    body.idempotencyKey.trim().length >= 8
      ? body.idempotencyKey.trim().slice(0, 128)
      : mintImageIdempotencyKey();
  const keyed = { ...body, idempotencyKey };
  let attempt = 0;
  let result = await postImage(keyed, { signal: opts?.signal });
  while (
    !result.ok &&
    attempt < maxRetries &&
    (result.code === "RATE_LIMITED" ||
      result.code === "PROVIDER_RATE_LIMIT" ||
      result.code === "PROVIDER_NETWORK" ||
      result.code === "PROVIDER_TIMEOUT" ||
      result.code === "JOB_IN_FLIGHT")
  ) {
    attempt += 1;
    const waitSec =
      result.code === "JOB_IN_FLIGHT"
        ? Math.min(8, Math.max(2, result.retryAfterSec ?? 2))
        : result.code === "PROVIDER_NETWORK"
          ? Math.min(12, Math.max(3, result.retryAfterSec ?? 8))
          : result.code === "PROVIDER_TIMEOUT"
            ? Math.min(15, Math.max(5, result.retryAfterSec ?? 5))
            : (result.retryAfterSec ?? 8);
    try {
      await sleep(Math.min(60, Math.max(1, waitSec)) * 1000, opts?.signal);
    } catch (e) {
      const aborted =
        (e instanceof Error && e.name === "AbortError") ||
        (typeof DOMException !== "undefined" &&
          e instanceof DOMException &&
          e.name === "AbortError");
      if (aborted) {
        void cancelImageLedger({ idempotencyKey });
        return {
          ok: false,
          status: 0,
          code: "REQUEST_CANCELED",
          error:
            "Request canceled — if credits were debited, check balance or retry (refund unconfirmed until server confirms)",
          refundUnconfirmed: true,
        };
      }
      throw e;
    }
    result = await postImage(keyed, { signal: opts?.signal });
  }
  return result;
}
