/**
 * Shared client for POST /api/generate.
 * Keeps Create / Landing / Batch error + history shapes aligned.
 */

import type {
  GenerateErrorBody,
  GenerateRequestBody,
  GenerateSuccess,
} from "@/lib/contracts";
import { isSafeDeliverableUrl } from "@/lib/createTrust";
import {
  isAuthoritativeRecoveryResult,
  raceGenerateWithDurableRecovery,
} from "@/lib/generateRecoveryPolicy";
import type { HistoryItem } from "@/lib/history";
import {
  parseExactSellerPackServerJobs,
  type ExactSellerPackServerJob,
} from "@/lib/sellerPackContract";
import type { PublicSession } from "@/lib/session";

export type GenerateFail = {
  ok: false;
  status: number;
  error: string;
  code?: GenerateErrorBody["code"];
  session?: PublicSession;
  retryAfterSec?: number;
  /** Soft-launch: live debit restored after provider/validation failure. */
  creditsRefunded?: boolean;
  /** Current local generation-ledger id, when the server recorded this failure. */
  jobId?: string;
  /**
   * Ledger kill / TIMEOUT / network cut — do not claim credits restored.
   * Create/Batch should settle as "refund unconfirmed".
   */
  refundUnconfirmed?: boolean;
  /** Stop further batch jobs (credits / provider balance empty). */
  fatal: boolean;
  /** Open paywall UI (user allowance, not provider). */
  paywall: boolean;
};

export type GenerateOk = {
  ok: true;
  status: number;
  data: GenerateSuccess;
  /**
   * True when the first attempt used assetId, server returned ASSET_NOT_FOUND,
   * and a cached-only second POST with inline fallbackImage succeeded. Live
   * provider requests never downgrade a private asset into inline image bytes.
   */
  recoveredFromAssetMiss?: boolean;
};

export type GenerateResult = GenerateOk | GenerateFail;

function asErrorBody(data: unknown): GenerateErrorBody {
  if (data && typeof data === "object") {
    return data as GenerateErrorBody;
  }
  return { error: "Generation failed" };
}

function asSuccess(data: unknown): GenerateSuccess | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Partial<GenerateSuccess>;
  if (typeof d.videoUrl !== "string" || !d.videoUrl) return null;
  // Defense in depth — never treat javascript:/data: etc. as a playable success
  // even if a buggy proxy or future provider path leaks them past the API gate.
  if (!isSafeDeliverableUrl(d.videoUrl)) return null;
  return d as GenerateSuccess;
}

/** Parse a fetch Response + JSON into a typed generate result. */
export function interpretGenerateResponse(
  status: number,
  raw: unknown
): GenerateResult {
  if (status >= 200 && status < 300) {
    const data = asSuccess(raw);
    if (!data) {
      const d =
        raw && typeof raw === "object"
          ? (raw as Partial<GenerateSuccess> & GenerateErrorBody)
          : null;
      const hasUrl = typeof d?.videoUrl === "string" && Boolean(d.videoUrl);
      const unsafe = hasUrl && !isSafeDeliverableUrl(d!.videoUrl as string);
      const creditsRefunded =
        d?.creditsRefunded === true ? true : undefined;
      // Live 200 without a safe clip may still have debited — never invent restore
      // (imageClient unsafe/empty still parity).
      const refundUnconfirmed = creditsRefunded !== true;
      const baseError = unsafe
        ? "Provider returned an unsafe video URL — not displaying"
        : "Model returned an empty clip";
      const error =
        creditsRefunded === true
          ? `${baseError} · 10 credits restored`
          : `${baseError} · check balance (refund unconfirmed)`;
      return {
        ok: false,
        status: unsafe ? 502 : status,
        error,
        code: unsafe ? "UNSAFE_URL" : "MODEL_EMPTY",
        session: d?.session,
        // Server may have already refunded; prefer echo when present.
        creditsRefunded,
        refundUnconfirmed: refundUnconfirmed || undefined,
        jobId: typeof d?.jobId === "string" ? d.jobId : undefined,
        fatal: false,
        paywall: false,
      };
    }
    return { ok: true, status, data };
  }

  const body = asErrorBody(raw);
  const code = body.code;
  const retryAfterSec =
    typeof body.retryAfterSec === "number" && body.retryAfterSec > 0
      ? body.retryAfterSec
      : undefined;

  const paywall = code === "INSUFFICIENT_CREDITS";
  const fatal =
    code === "INSUFFICIENT_CREDITS" || code === "PROVIDER_BALANCE";
  const creditsRefunded = body.creditsRefunded === true;

  // R1a capture ambiguity: provider may have produced media, but durable
  // settle did not commit. Output is withheld; never invent "10 used" or refund.
  if (code === "DURABLE_CREDITS_UNAVAILABLE") {
    return {
      ok: false,
      status,
      error:
        body.error ||
        "Credits could not be finalized. Output is withheld while the durable reservation is reconciled — do not retry with the same idempotency key.",
      code,
      session: body.session,
      retryAfterSec,
      jobId: typeof body.jobId === "string" ? body.jobId : undefined,
      // Hold is open / unknown — not a confirmed refund path.
      creditsRefunded: undefined,
      refundUnconfirmed: undefined,
      fatal: false,
      paywall: false,
    };
  }

  let error =
    body.error ||
    (code === "RATE_LIMITED"
      ? `Too many generates — wait ${retryAfterSec ?? "a few"}s, then Retry`
      : code === "JOB_IN_FLIGHT"
        ? `A generate is already running — wait ${retryAfterSec ?? "a few"}s or Cancel first`
        : code === "AUTH_REQUIRED"
          ? "Sign in before requesting live generation"
          : code === "LIVE_ACCESS_REQUIRED"
            ? "This account cannot run live generation yet — use cached demos or upgrade when beta opens"
            : code === "RESERVATION_FAILED"
              ? "Could not reserve credits for live generation — try again with a new attempt key"
              : code === "RETRY_TOKEN_INVALID"
                ? "Retry handoff expired or does not match this job — return to Library and choose Retry again"
                : code === "RETRY_JOB_NOT_READY"
                  ? "This retry child was already claimed or expired — choose Retry from the latest failed attempt"
                  : code === "RETRY_SPEC_MISMATCH"
                    ? "Retry settings changed — reopen Retry from Library to restore the selected attempt"
                    : code === "PROVIDER_BALANCE"
                      ? "Upstream provider balance empty — credits restored when the debit was confirmed."
                      : code === "RIGHTS_REQUIRED"
                        ? "Confirm you own this photo and have the right to animate it"
                        : code === "UNKNOWN_EFFECT"
                          ? "Unknown effect — open Recipes and pick a registered toy recipe"
                          : code === "IMAGE_TOO_LARGE"
                            ? "Image too large (max ~8MB) — compress or crop the product photo"
                            : code === "ASSET_NOT_FOUND"
                              ? "Photo asset expired on the server — re-upload or Retry with the same still"
                              : code === "UNSAFE_URL"
                                ? "Provider returned an unsafe video URL — credits restored when confirmed. Retry generate."
                                : code === "PROVIDER_RATE_LIMIT"
                                  ? `Provider busy — try again in ${retryAfterSec ?? "a few"}s`
                                  : code === "PROVIDER_TIMEOUT"
                                    ? `Provider timed out — Retry in ${retryAfterSec ?? "a few"}s (same still kept)`
                                    : code === "PROVIDER_NETWORK"
                                      ? `Provider network blip — Retry in ${retryAfterSec ?? "a few"}s (same still kept)`
                                      : code === "TIMEOUT"
                                        ? "Prior job timed out on the server — mint a new attempt (Retry). Check balance if refund is unconfirmed."
                                        : code === "CONTENT_POLICY"
                                          ? "Provider rejected this still or prompt — use a clear product photo on a simple background"
                                          : "Generation failed — Retry keeps your still, or try another recipe");

  // PRD §5: recoverable failures must say whether the 10 credits were restored.
  if (
    creditsRefunded &&
    !/refund|restored|credit/i.test(error)
  ) {
    error = `${error} · 10 credits restored`;
  }
  // Ledger kill / provider blip / unsafe deliverable after debit — never invent restore.
  // Capture-pending (DURABLE_CREDITS_UNAVAILABLE) is handled above — not refundUnconfirmed.
  const refundUnconfirmed =
    body.refundUnconfirmed === true ||
    code === "TIMEOUT" ||
    code === "PROVIDER_NETWORK" ||
    code === "PROVIDER_TIMEOUT" ||
    // Provider returned unusable URL after a live attempt may have debited.
    (code === "UNSAFE_URL" && !creditsRefunded) ||
    (code === "CONTENT_POLICY" && !creditsRefunded) ||
    // Empty clip after live attempt — same ambiguity as UNSAFE_URL (createTrust).
    (code === "MODEL_EMPTY" && !creditsRefunded);
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
    jobId: typeof body.jobId === "string" ? body.jobId : undefined,
    refundUnconfirmed: refundUnconfirmed || undefined,
    fatal,
    paywall,
  };
}

async function generateAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window === "undefined") return headers;
  try {
    const { getSupabaseBrowser } = await import("@/lib/supabase/browser");
    const supabase = getSupabaseBrowser();
    if (!supabase) return headers;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    /* guest path */
  }
  return headers;
}

/**
 * Best-effort video ledger cancel (DELETE /api/generations).
 * Soft-launch fal may still complete upstream, but canceled local attempts
 * fail closed and withhold the late output pending settlement reconciliation.
 * Prefer jobId when known; else idempotencyKey from the aborted attempt.
 */
export async function cancelGenerateLedger(opts: {
  jobId?: string;
  idempotencyKey?: string;
}): Promise<void> {
  try {
    const payload: Record<string, string> = {};
    if (opts.jobId) payload.jobId = opts.jobId;
    if (opts.idempotencyKey) payload.idempotencyKey = opts.idempotencyKey;
    if (!payload.jobId && !payload.idempotencyKey) return;
    // Keep Bearer when present (Library recovery cancel parity) so owner-scoped
    // durable cancel does not fall through to guest / process-memory miss.
    const headers = await generateAuthHeaders();
    // Prefer collection DELETE (idempotencyKey); fall back to /[id] when only jobId.
    if (payload.idempotencyKey || !payload.jobId) {
      await fetch("/api/generations", {
        method: "DELETE",
        headers,
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } else {
      await fetch(`/api/generations/${encodeURIComponent(payload.jobId)}`, {
        method: "DELETE",
        headers,
        keepalive: true,
      });
    }
  } catch {
    /* ignore — client already refund-unconfirmed */
  }
}

export async function postGenerate(
  body: GenerateRequestBody,
  init?: { signal?: AbortSignal; cancelLedgerOnAbort?: boolean }
): Promise<GenerateResult> {
  try {
    const headers = await generateAuthHeaders();
    const res = await fetch("/api/generate", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: init?.signal,
    });
    let raw: unknown = null;
    try {
      raw = await res.json();
    } catch {
      raw = { error: "Invalid server response" };
    }
    return interpretGenerateResponse(res.status, raw);
  } catch (e) {
    const aborted =
      (e instanceof Error && e.name === "AbortError") ||
      (typeof DOMException !== "undefined" &&
        e instanceof DOMException &&
        e.name === "AbortError");
    if (
      aborted &&
      body.idempotencyKey &&
      init?.cancelLedgerOnAbort !== false
    ) {
      void cancelGenerateLedger({ idempotencyKey: body.idempotencyKey });
    }
    return {
      ok: false,
      status: 0,
      code: aborted ? "REQUEST_CANCELED" : "NETWORK_ERROR",
      error: aborted
        ? "Request canceled — if credits were debited, check balance or retry (refund unconfirmed until server confirms)"
        : e instanceof Error
          ? e.message || "Network error — check connection and balance"
          : "Network error — check connection and balance",
      // Client never saw a typed body — do not claim restore.
      refundUnconfirmed: true,
      fatal: false,
      paywall: false,
    };
  }
}

export type GenerateRecoveryState =
  | "checking"
  | "waiting"
  | "recovered"
  /** Recovery exhausted without durable authority; original POST still open. */
  | "awaiting_primary";

async function pollDurableGenerateRecovery(
  idempotencyKey: string,
  opts?: {
    signal?: AbortSignal;
    onState?: (state: GenerateRecoveryState) => void;
    startAfterMs?: number;
    pollEveryMs?: number;
    maxWaitMs?: number;
  }
): Promise<GenerateResult> {
  const startedAt = Date.now();
  const startAfterMs = Math.max(0, opts?.startAfterMs ?? 12_000);
  const pollEveryMs = Math.max(250, opts?.pollEveryMs ?? 5_000);
  const maxWaitMs = Math.max(
    startAfterMs + pollEveryMs,
    opts?.maxWaitMs ?? 185_000
  );
  let unresolved: GenerateResult = {
    ok: false,
    status: 0,
    code: "NETWORK_ERROR",
    error:
      "The render is still unresolved. Refresh Library before retrying so a completed private result is not generated twice.",
    refundUnconfirmed: true,
    fatal: false,
    paywall: false,
  };

  try {
    await sleep(startAfterMs, opts?.signal);
    opts?.onState?.("checking");
    while (Date.now() - startedAt < maxWaitMs) {
      try {
        const headers = await generateAuthHeaders();
        const res = await fetch(
          `/api/generations/recover?idempotencyKey=${encodeURIComponent(idempotencyKey)}`,
          {
            method: "GET",
            headers,
            cache: "no-store",
            signal: opts?.signal,
          }
        );
        const raw = (await res.json().catch(() => ({}))) as {
          recoveryState?: string;
        };
        if (res.status === 200) {
          const recovered = interpretGenerateResponse(res.status, raw);
          if (isAuthoritativeRecoveryResult(recovered)) {
            if (recovered.ok) opts?.onState?.("recovered");
            return recovered;
          }
          unresolved = recovered;
        }
        if (res.status === 202 && raw.recoveryState === "pending") {
          opts?.onState?.("waiting");
        } else if (res.status === 404 && raw.recoveryState === "not_found") {
          unresolved = {
            ok: false,
            status: 0,
            code: "NETWORK_ERROR",
            error:
              "Pikbo could not find this submitted attempt. Check your connection and Library before retrying; no second generation was started.",
            refundUnconfirmed: true,
            fatal: false,
            paywall: false,
          };
        } else if (res.status === 409 || res.status === 400 || res.status === 401) {
          const recovered = interpretGenerateResponse(res.status, raw);
          if (isAuthoritativeRecoveryResult(recovered)) return recovered;
          unresolved = recovered;
          // Invalid/expired auth will not improve through repeated reads. Stop
          // polling, but keep the recovery promise open for the provider window
          // so this read failure cannot cancel a still-live original request.
          break;
        } else {
          unresolved = {
            ok: false,
            status: 0,
            code: "NETWORK_ERROR",
            error:
              "Pikbo lost contact while checking the saved result. Refresh Library before starting another generation.",
            refundUnconfirmed: true,
            fatal: false,
            paywall: false,
          };
        }
      } catch (error) {
        const aborted =
          (error instanceof Error && error.name === "AbortError") ||
          (typeof DOMException !== "undefined" &&
            error instanceof DOMException &&
            error.name === "AbortError");
        if (aborted) throw error;
        unresolved = {
          ok: false,
          status: 0,
          code: "NETWORK_ERROR",
          error:
            "Pikbo lost contact while checking the saved result. Refresh Library before starting another generation.",
          refundUnconfirmed: true,
          fatal: false,
          paywall: false,
        };
      }
      // Keep checking after transient misses. They cannot win the race, but a
      // later durable success should still recover a disconnected POST.
      await sleep(pollEveryMs, opts?.signal);
    }
    const remainingMs = maxWaitMs - (Date.now() - startedAt);
    if (remainingMs > 0) await sleep(remainingMs, opts?.signal);
  } catch (error) {
    const aborted =
      (error instanceof Error && error.name === "AbortError") ||
      (typeof DOMException !== "undefined" &&
        error instanceof DOMException &&
        error.name === "AbortError");
    if (aborted) {
      return {
        ok: false,
        status: 0,
        code: "REQUEST_CANCELED",
        error:
          "Request canceled — if credits were debited, check balance or retry (refund unconfirmed until server confirms)",
        refundUnconfirmed: true,
        fatal: false,
        paywall: false,
      };
    }
  }
  return unresolved;
}

/**
 * Race the normal response against owner-only durable truth. A recovery read
 * never calls /api/generate, so a slow or disconnected response cannot create
 * a second provider job or a second debit.
 */
async function postGenerateRecoverable(
  body: GenerateRequestBody,
  opts?: {
    signal?: AbortSignal;
    onRecoveryState?: (state: GenerateRecoveryState) => void;
  }
): Promise<GenerateResult> {
  const primaryController = new AbortController();
  const recoveryController = new AbortController();
  const cancelForUser = () => {
    primaryController.abort();
    recoveryController.abort();
    void cancelGenerateLedger({ idempotencyKey: body.idempotencyKey });
  };
  if (opts?.signal?.aborted) cancelForUser();
  else opts?.signal?.addEventListener("abort", cancelForUser, { once: true });

  const primary = postGenerate(body, {
    signal: primaryController.signal,
    // The shared controller also aborts the losing fetch after a durable
    // recovery. Only an explicit caller abort may cancel the ledger.
    cancelLedgerOnAbort: false,
  });
  const recovery = pollDurableGenerateRecovery(body.idempotencyKey!, {
    signal: recoveryController.signal,
    onState: opts?.onRecoveryState,
  });
  try {
    return await raceGenerateWithDurableRecovery({
      primary,
      recovery,
      abortPrimary: () => primaryController.abort(),
      abortRecovery: () => recoveryController.abort(),
      onInconclusiveRecovery: () => {
        // Keep the original /api/generate alive. UI may detach without cancel.
        opts?.onRecoveryState?.("awaiting_primary");
      },
    });
  } finally {
    opts?.signal?.removeEventListener("abort", cancelForUser);
  }
}

/** Map a success payload into library history fields. */
export function historyFieldsFromSuccess(
  data: GenerateSuccess,
  meta: {
    effect: string;
    effectName: string;
    fallbackDuration?: number;
    fallbackAspect?: string;
    fallbackResolution?: string;
    /** Remix handoff — PIKBO Lab prototype project id */
    sourceProject?: string;
    channel?: string;
    /** Existing same-browser Library grouping. */
    projectId?: string;
    projectName?: string;
    inputImage?: string;
    /** Optional Toy Identity SKU for Library grouping/filter. */
    sku?: string;
  }
): Omit<HistoryItem, "id" | "createdAt"> {
  // Prefer server redaction; if a legacy free live provider URL slipped through,
  // pin history to the controlled download path (T6 gate re-checks ownership).
  const jobKey =
    typeof data.jobId === "string"
      ? data.jobId
      : typeof data.requestId === "string"
        ? data.requestId
        : "";
  let videoUrl = data.videoUrl;
  if (
    Boolean(data.watermark) &&
    !Boolean(data.demo) &&
    jobKey &&
    !videoUrl.startsWith("/api/downloads/") &&
    !videoUrl.startsWith("/demos/")
  ) {
    videoUrl = `/api/downloads/${encodeURIComponent(jobKey)}`;
  }
  return {
    videoUrl,
    projectId: meta.projectId,
    projectName: meta.projectName,
    inputImage: meta.inputImage,
    sku: meta.sku,
    effect: meta.effect,
    effectName: meta.effectName,
    model: data.model,
    watermark: Boolean(data.watermark),
    demo: Boolean(data.demo),
    duration:
      typeof data.duration === "number"
        ? data.duration
        : meta.fallbackDuration,
    aspectRatio:
      typeof data.aspectRatio === "string"
        ? data.aspectRatio
        : meta.fallbackAspect,
    resolution:
      typeof data.resolution === "string"
        ? data.resolution
        : meta.fallbackResolution,
    // Prefer process ledger jobId for cancel/download; provider requestId fallback.
    requestId:
      typeof data.jobId === "string"
        ? data.jobId
        : typeof data.requestId === "string"
          ? data.requestId
          : undefined,
    sourceProject: meta.sourceProject,
    channel: meta.channel,
    status: "succeeded",
    // Prefer server settlement echo over client demo guess (idempotent replay safe).
    creditStatus:
      data.creditsOutcome === "0 cached" || data.creditsOutcome === "10 used"
        ? data.creditsOutcome
        : typeof data.costCredits === "number"
          ? data.costCredits === 0
            ? "0 cached"
            : "10 used"
          : data.demo
            ? "0 cached"
            : "10 used",
  };
}

/** Sleep that rejects with AbortError when signal aborts (cancel mid-retry wait). */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(
        typeof DOMException !== "undefined"
          ? new DOMException("Aborted", "AbortError")
          : Object.assign(new Error("Aborted"), { name: "AbortError" })
      );
      return;
    }
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(t);
      reject(
        typeof DOMException !== "undefined"
          ? new DOMException("Aborted", "AbortError")
          : Object.assign(new Error("Aborted"), { name: "AbortError" })
      );
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function bearerAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window === "undefined") return headers;
  try {
    const { getSupabaseBrowser } = await import("@/lib/supabase/browser");
    const supabase = getSupabaseBrowser();
    if (!supabase) return headers;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    /* guest */
  }
  return headers;
}

export type SellerPackClientJob = ExactSellerPackServerJob;

export type SellerPackReserveClientResult =
  | {
      ok: true;
      packRunId: string;
      reservationId: string;
      quoteCredits: 30;
      jobs: SellerPackClientJob[];
      idempotent: boolean;
      inputAssetId: string;
      skuLabel: string | null;
    }
  | {
      ok: false;
      code: string;
      error: string;
      quoteCredits?: number;
      need?: number;
      have?: number;
    };

/**
 * Authenticated atomic Launch Pack reserve: one 30-credit hold and exactly
 * three server-created child ids. A live client never falls back to the old
 * shadow reservation because that would reopen the double-debit path.
 */
export async function reserveSellerPackClient(input: {
  clientPackKey: string;
  inputAssetId: string;
  rightsConfirmed: true;
}): Promise<SellerPackReserveClientResult> {
  try {
    const headers = await bearerAuthHeaders();
    const res = await fetch("/api/seller-pack/reserve", {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });
    const raw = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      mode?: string;
      code?: string;
      error?: string;
      need?: number;
      have?: number;
      quoteCredits?: number;
      packRunId?: string;
      reservationId?: string;
      jobs?: unknown;
      idempotent?: boolean;
      inputAssetId?: string;
      skuLabel?: string | null;
    };
    const jobs = parseExactSellerPackServerJobs(raw.jobs);
    if (
      raw.ok &&
      raw.mode === "atomic" &&
      typeof raw.packRunId === "string" &&
      raw.packRunId.length >= 8 &&
      raw.packRunId.trim() === raw.packRunId &&
      typeof raw.reservationId === "string" &&
      raw.reservationId.length >= 8 &&
      raw.reservationId.trim() === raw.reservationId &&
      raw.quoteCredits === 30 &&
      raw.inputAssetId === input.inputAssetId &&
      jobs
    ) {
      return {
        ok: true,
        packRunId: raw.packRunId,
        reservationId: raw.reservationId,
        quoteCredits: 30,
        jobs,
        idempotent: raw.idempotent === true,
        inputAssetId: raw.inputAssetId,
        skuLabel: typeof raw.skuLabel === "string" ? raw.skuLabel : null,
      };
    }
    if (raw.ok) {
      return {
        ok: false,
        code: "INVALID_SERVER_CONTRACT",
        error:
          "Launch Pack reservation response failed fixed-pack verification",
      };
    }
    return {
      ok: false,
      code: raw.code || String(res.status),
      error:
        raw.error ||
        "Launch Pack requires an authenticated atomic 30-credit reservation",
      quoteCredits: raw.quoteCredits,
      need: raw.need,
      have: raw.have,
    };
  } catch (e) {
    return {
      ok: false,
      code: "NETWORK",
      error: e instanceof Error ? e.message : "reserve failed",
    };
  }
}

/** Owner-scoped durable pack recovery; never mutates credits. */
export async function getSellerPackStatusClient(
  packRunId: string
): Promise<
  | {
      ok: true;
      packRunId: string;
      status: string;
      settledCredits: number;
      releasedCredits: number;
      inputAssetId: string;
      skuLabel: string | null;
      inputPreviewUrl: string | null;
      jobs: SellerPackClientJob[];
    }
  | { ok: false; code: string; error: string }
> {
  try {
    const headers = await bearerAuthHeaders();
    const res = await fetch(
      `/api/seller-pack/status?packRunId=${encodeURIComponent(packRunId)}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );
    const raw = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      code?: string;
      error?: string;
      packRunId?: string;
      status?: string;
      settledCredits?: number;
      releasedCredits?: number;
      inputAssetId?: string | null;
      skuLabel?: string | null;
      inputPreviewUrl?: string | null;
      jobs?: unknown;
    };
    const jobs = parseExactSellerPackServerJobs(raw.jobs);
    if (
      raw.ok &&
      raw.packRunId === packRunId &&
      typeof raw.status === "string" &&
      typeof raw.settledCredits === "number" &&
      typeof raw.releasedCredits === "number" &&
      typeof raw.inputAssetId === "string" &&
      jobs
    ) {
      return {
        ok: true,
        packRunId,
        status: raw.status,
        settledCredits: raw.settledCredits,
        releasedCredits: raw.releasedCredits,
        inputAssetId: raw.inputAssetId,
        skuLabel: typeof raw.skuLabel === "string" ? raw.skuLabel : null,
        inputPreviewUrl:
          typeof raw.inputPreviewUrl === "string" ? raw.inputPreviewUrl : null,
        jobs,
      };
    }
    if (raw.ok) {
      return {
        ok: false,
        code: "INVALID_SERVER_CONTRACT",
        error: "Launch Pack status response failed fixed-pack verification",
      };
    }
    return {
      ok: false,
      code: raw.code || String(res.status),
      error: raw.error || "Launch Pack status unavailable",
    };
  } catch (e) {
    return {
      ok: false,
      code: "NETWORK",
      error: e instanceof Error ? e.message : "status failed",
    };
  }
}

export type SellerPackDiscoveryItem = {
  packRunId: string;
  status: string;
  createdAt: string;
  inputAssetId: string;
  skuLabel: string | null;
  inputPreviewUrl: string | null;
  settledCredits: number;
  releasedCredits: number;
  jobs: SellerPackClientJob[];
};

/** Owner-scoped discovery survives cleared browser storage and new devices. */
export async function getSellerPackDiscoveryClient(
  scope: "active" | "recent" = "active"
): Promise<
  | { ok: true; packs: SellerPackDiscoveryItem[] }
  | { ok: false; code: string; error: string }
> {
  try {
    const headers = await bearerAuthHeaders();
    const res = await fetch(`/api/seller-pack/status?mine=${scope}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const raw = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      code?: string;
      error?: string;
      packs?: unknown;
    };
    if (!res.ok || !raw.ok || !Array.isArray(raw.packs)) {
      return {
        ok: false,
        code: raw.code || String(res.status),
        error: raw.error || "Launch Pack discovery unavailable",
      };
    }
    const packs: SellerPackDiscoveryItem[] = [];
    for (const value of raw.packs) {
      if (!value || typeof value !== "object") continue;
      const item = value as Record<string, unknown>;
      const jobs = parseExactSellerPackServerJobs(item.jobs);
      if (
        typeof item.packRunId !== "string" ||
        typeof item.status !== "string" ||
        typeof item.createdAt !== "string" ||
        typeof item.inputAssetId !== "string" ||
        typeof item.settledCredits !== "number" ||
        typeof item.releasedCredits !== "number" ||
        !jobs
      ) continue;
      packs.push({
        packRunId: item.packRunId,
        status: item.status,
        createdAt: item.createdAt,
        inputAssetId: item.inputAssetId,
        skuLabel: typeof item.skuLabel === "string" ? item.skuLabel : null,
        inputPreviewUrl:
          typeof item.inputPreviewUrl === "string" ? item.inputPreviewUrl : null,
        settledCredits: item.settledCredits,
        releasedCredits: item.releasedCredits,
        jobs,
      });
    }
    return { ok: true, packs };
  } catch (error) {
    return {
      ok: false,
      code: "NETWORK",
      error: error instanceof Error ? error.message : "discovery failed",
    };
  }
}

/**
 * Re-reserve exactly one failed child's released 10 credits. The returned
 * attempt key must be reused by the following /api/generate authorization.
 */
export async function retrySellerPackChildClient(input: {
  packRunId: string;
  packJobId: string;
  attemptKey: string;
}): Promise<
  | { ok: true; attemptKey: string }
  | { ok: false; code: string; error: string }
> {
  try {
    const headers = await bearerAuthHeaders();
    const res = await fetch("/api/seller-pack/retry", {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });
    const raw = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      code?: string;
      error?: string;
      attemptKey?: string;
    };
    if (raw.ok && raw.attemptKey === input.attemptKey) {
      return { ok: true, attemptKey: raw.attemptKey };
    }
    return {
      ok: false,
      code: raw.code || String(res.status),
      error: raw.error || "Launch Pack retry could not reserve 10 credits",
    };
  } catch (e) {
    return {
      ok: false,
      code: "NETWORK",
      error: e instanceof Error ? e.message : "retry failed",
    };
  }
}

/** One logical generate attempt — reused across rate-limit / in-flight retries. */
export function mintGenerateIdempotencyKey(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `idemp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * POST generate with automatic recovery:
 * - one retry on RATE_LIMITED / PROVIDER_RATE_LIMIT / JOB_IN_FLIGHT /
 *   PROVIDER_NETWORK / PROVIDER_TIMEOUT (transient provider blips)
 * - cached-only ASSET_NOT_FOUND recovery for legacy process-local previews;
 *   live provider requests must keep the owner-scoped private asset boundary
 * - stable idempotencyKey for the whole attempt (network retry = no double debit)
 * - owner-only durable polling if the POST stays open after the private result saved
 * - never auto-retry TIMEOUT (ledger kill) — client must mint a new key
 */
export async function postGenerateWithRetry(
  body: GenerateRequestBody,
  opts?: {
    maxRetries?: number;
    signal?: AbortSignal;
    onRecoveryState?: (state: GenerateRecoveryState) => void;
    /**
     * Local data URL for cached compatibility only. Live provider requests do
     * not remove assetId or transmit this fallback.
     */
    fallbackImage?: string;
  }
): Promise<GenerateResult> {
  const maxRetries = opts?.maxRetries ?? 1;
  // One key per user-facing attempt. Caller Retry button must not reuse body key.
  const idempotencyKey =
    typeof body.idempotencyKey === "string" && body.idempotencyKey.trim().length >= 8
      ? body.idempotencyKey.trim().slice(0, 128)
      : mintGenerateIdempotencyKey();
  const keyed: GenerateRequestBody = { ...body, idempotencyKey };
  let attempt = 0;
  let result = await postGenerateRecoverable(keyed, {
    signal: opts?.signal,
    onRecoveryState: opts?.onRecoveryState,
  });
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
    // Prefer server Retry-After; keep JOB_IN_FLIGHT waits short (active job may finish soon).
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
        void cancelGenerateLedger({ idempotencyKey });
        return {
          ok: false,
          status: 0,
          code: "REQUEST_CANCELED",
          error:
            "Request canceled — if credits were debited, check balance or retry (refund unconfirmed until server confirms)",
          refundUnconfirmed: true,
          fatal: false,
          paywall: false,
        };
      }
      throw e;
    }
    result = await postGenerateRecoverable(keyed, {
      signal: opts?.signal,
      onRecoveryState: opts?.onRecoveryState,
    });
  }

  // Asset registry miss: re-post with inline still once (no second rate-limit loop).
  const fallback = opts?.fallbackImage;
  if (
    !result.ok &&
    result.code === "ASSET_NOT_FOUND" &&
    body.allowProviderSpend !== true &&
    typeof body.assetId === "string" &&
    body.assetId &&
    typeof fallback === "string" &&
    fallback.startsWith("data:image") &&
    fallback.length >= 32
  ) {
    const recovered = await postGenerateRecoverable(
      { ...keyed, assetId: undefined, image: fallback },
      {
        signal: opts?.signal,
        onRecoveryState: opts?.onRecoveryState,
      }
    );
    if (recovered.ok) {
      return { ...recovered, recoveredFromAssetMiss: true };
    }
    return recovered;
  }
  return result;
}
