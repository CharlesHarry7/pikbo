import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { IMAGE_MODEL } from "@/lib/models";
import {
  classifyProviderError,
  providerErrorMessage,
  providerFailHttp,
} from "@/lib/providerError";
import {
  endJob,
  jobInFlightRetryAfterSec,
  takeGenerateBudget,
  tryBeginJob,
} from "@/lib/rateLimit";
import { clientIp } from "@/lib/requestMeta";
import { ensureSession, publicSession, saveSession } from "@/lib/session";
import { isSafeDeliverableUrl } from "@/lib/createTrust";
import {
  releaseStrictLiveGeneration,
  reserveStrictLiveGeneration,
  settleStrictLiveGeneration,
} from "@/lib/durableCredits/liveReservation";
import { createReservationLifecycle } from "@/lib/reservationLifecycle";
import {
  recordConfirmedPreOutputFailure,
  recordProviderSucceededWithheld,
  recordSettlementUnknown,
} from "@/lib/durableCredits/reconciliation";
import { getAuthUserFromRequest } from "@/lib/supabase/user";
import {
  invokeReservedProvider,
  liveGenerationAccess,
} from "@/lib/liveGenerationGate.mjs";
import {
  beginImageJob,
  cancelImageJob,
  claimRetryImageJob,
  completeImageJob,
  failImageJob,
  findImageJobByIdempotencyKey,
  getImageJob,
  IMAGE_JOBS_LIST_LIMIT,
  imageJobInFlightRetryAfterSec,
  imageJobTimeoutMs,
  listImageJobCountsForSession,
  listImageJobsForSession,
  normalizeImageIdempotencyKey,
  recordImageWorkerHeartbeat,
  sweepTimedOutImageJobs,
  toPublicImageJob,
  type ImageJob,
} from "@/lib/imageJobs";
import { providerCompletionDecision } from "@/lib/generationReliability.mjs";

function reconciliationEventId(
  kind: "provider_succeeded" | "release_pending" | "settlement_unknown",
  jobId: string,
  suffix?: string
): string {
  return `recon:image:${kind}:${jobId}${suffix ? `:${suffix}` : ""}`.slice(
    0,
    160
  );
}

type ImageDemoReason =
  | "no_provider_key"
  | "anonymous_cached_only"
  | "free_live_delivery_blocked"
  | "free_trial_video_only";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cheap still-job probe (Library/ops) — counts only, no image bodies.
 * Sweeps TIMEOUT so open never sticks after process kill mid-Flux.
 */
export async function HEAD() {
  const session = await ensureSession();
  const counts = listImageJobCountsForSession(session.id);
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "X-Pikbo-Image-Jobs": String(counts.total),
      "X-Pikbo-Image-Jobs-Open": String(counts.open),
      "X-Pikbo-Image-Jobs-Queued": String(counts.queued),
      "X-Pikbo-Image-Jobs-Succeeded": String(counts.succeeded),
      "X-Pikbo-Image-Jobs-Failed": String(counts.failed),
      "X-Pikbo-Image-Jobs-Canceled": String(counts.canceled),
      "X-Pikbo-Image-Job-Timeout-Ms": String(imageJobTimeoutMs()),
      "X-Pikbo-Image-Jobs-List-Limit": String(IMAGE_JOBS_LIST_LIMIT),
    },
  });
}

/**
 * Phase D still ledger list — parity with GET /api/generations.
 * Newest page for Image recovery UI; byStatus/open/total are full-session.
 * R1b: GET is read-only — never extends fixed deadlineAt.
 * Never dumps multi-KB data: URLs into the list JSON.
 */
export async function GET() {
  const session = await ensureSession();
  const timedOut = sweepTimedOutImageJobs().filter(
    (j) => j.sessionId === session.id
  ).length;
  const listed = listImageJobsForSession(session.id, IMAGE_JOBS_LIST_LIMIT);
  const jobs = listed.map((j) => toPublicImageJob(j, session.id));
  const full = listImageJobCountsForSession(session.id);
  const byStatus = {
    queued: full.queued,
    running: full.running,
    succeeded: full.succeeded,
    failed: full.failed,
    canceled: full.canceled,
  };
  return NextResponse.json({
    ok: true,
    mode: "local-memory",
    adapter: "process-memory",
    durable: false,
    jobTimeoutMs: imageJobTimeoutMs(),
    timedOutThisSweep: timedOut,
    /** R1b: polls never extend deadlineAt. */
    touchedOpen: 0,
    listLimit: IMAGE_JOBS_LIST_LIMIT,
    listed: jobs.length,
    total: full.total,
    byStatus,
    open: full.open,
    note:
      "In-process still ledger for soft-launch recovery. Not multi-node durable. Use POST /api/image for work. Open (queued|running) jobs past fixed deadlineAt fail with TIMEOUT. GET is read-only; byStatus/open/total are full-session. data: demo URLs omitted from list (hasImage flag only).",
    compatibility: {
      syncImage: "/api/image",
      jobStatus: "/api/image/[id]",
      cancel: "DELETE /api/image or DELETE /api/image/[id]",
      retry: "POST /api/image/[id]/retry",
      counts: "HEAD /api/image",
    },
    session: publicSession(session),
    jobs,
  });
}

/**
 * Phase D still cancel (ledger only) — parity with DELETE /api/generations/[id].
 * Does not interrupt in-flight Flux; complete may still stamp success.
 * Accepts jobId / requestId / idempotencyKey via query or JSON body.
 */
export async function DELETE(req: Request) {
  const session = await ensureSession();
  const url = new URL(req.url);
  let body: {
    jobId?: string;
    requestId?: string;
    id?: string;
    idempotencyKey?: string;
  } = {};
  try {
    const text = await req.text();
    if (text.trim()) {
      body = JSON.parse(text) as typeof body;
    }
  } catch {
    /* query-only cancel is fine */
  }
  // generations DELETE parity: jobId | requestId | id (body or query)
  const jobId =
    (typeof body.jobId === "string" && body.jobId.trim()) ||
    (typeof body.requestId === "string" && body.requestId.trim()) ||
    (typeof body.id === "string" && body.id.trim()) ||
    url.searchParams.get("jobId")?.trim() ||
    url.searchParams.get("requestId")?.trim() ||
    url.searchParams.get("id")?.trim() ||
    undefined;
  const idempotencyKey = normalizeImageIdempotencyKey(
    body.idempotencyKey ?? url.searchParams.get("idempotencyKey")
  );

  const result = cancelImageJob({
    sessionId: session.id,
    id: jobId || undefined,
    idempotencyKey,
  });
  if (!result.ok) {
    const status =
      result.code === "NOT_FOUND"
        ? 404
        : result.code === "NOT_OWNED"
          ? 403
          : result.code === "INVALID"
            ? 400
            : 409;
    return NextResponse.json(
      {
        ok: false,
        code: result.code,
        message: result.message,
        jobId: result.job?.id,
      },
      { status }
    );
  }
  return NextResponse.json({
    ok: true,
    mode: "local-memory",
    durable: false,
    jobId: result.job.id,
    status: result.job.status,
    errorCode: result.job.errorCode,
    creditsOutcome: result.job.creditsOutcome,
    // Soft-launch cancel never invents restore (generate DELETE parity).
    ...(result.job.creditsOutcome === "refund unconfirmed"
      ? { refundUnconfirmed: true }
      : {}),
    note: "Still ledger marked canceled. Soft-launch Flux may still complete server-side.",
  });
}

type ImageSuccessBody = {
  imageUrl: string;
  demo: boolean;
  demoReason?: ImageDemoReason;
  model: string;
  aspect: string;
  session: ReturnType<typeof publicSession>;
  costCredits: number;
  creditsOutcome: "0 cached" | "10 used";
  requestId?: string;
  jobId?: string;
  idempotentReplay?: boolean;
};

function successFromImageJob(
  job: ImageJob,
  session: Parameters<typeof publicSession>[0],
  aspectEcho: string,
  replay: boolean
): ImageSuccessBody | null {
  if (job.status !== "succeeded" || !job.imageUrl) return null;
  if (!job.demo && !isSafeDeliverableUrl(job.imageUrl)) return null;
  if (
    job.demo &&
    !job.imageUrl.startsWith("data:image/") &&
    !isSafeDeliverableUrl(job.imageUrl)
  ) {
    return null;
  }
  return {
    imageUrl: job.imageUrl,
    demo: Boolean(job.demo),
    ...(job.demoReason ? { demoReason: job.demoReason } : {}),
    model: job.model || (job.demo ? "demo" : "unknown"),
    aspect: job.aspect || aspectEcho,
    session: publicSession(session),
    costCredits:
      typeof job.costCredits === "number" ? job.costCredits : job.demo ? 0 : 10,
    creditsOutcome:
      job.creditsOutcome === "0 cached" || job.creditsOutcome === "10 used"
        ? job.creditsOutcome
        : job.demo
          ? "0 cached"
          : "10 used",
    requestId: job.requestId || job.id,
    jobId: job.id,
    ...(replay ? { idempotentReplay: true } : {}),
  };
}

export async function POST(req: Request) {
  let body: {
    prompt?: string;
    aspect?: string;
    idempotencyKey?: string;
    retryJobId?: string;
    retryToken?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request", code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  const prompt = body.prompt?.trim();
  const retryJobId =
    typeof body.retryJobId === "string" && body.retryJobId.trim().length >= 8
      ? body.retryJobId.trim().slice(0, 128)
      : undefined;
  const retryToken =
    typeof body.retryToken === "string" && body.retryToken.trim().length >= 16
      ? body.retryToken.trim().slice(0, 200)
      : undefined;
  const hasRetryHandoff = Boolean(retryJobId || retryToken);
  if (!prompt || prompt.length < 4) {
    return NextResponse.json(
      { error: "Prompt required", code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }
  if (prompt.length > 2000) {
    return NextResponse.json(
      { error: "Prompt too long (max 2000 chars)", code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  let session = await ensureSession();
  const authUser = await getAuthUserFromRequest(req);
  // Founding Studio sells one fixed video Launch Pack, not unmetered Flux
  // stills. This route stays cached-only until it has a weighted entitlement
  // and the same private-output settlement guarantees as video.
  const access = liveGenerationAccess({
    providerConfigured: Boolean(process.env.FAL_KEY),
    authenticated: Boolean(authUser),
    planId: "free",
    // T6 is deliberately blocked. Free live Flux cannot reopen until a
    // verified server-owned derivative path exists (same gate as video).
    freeDeliveryReady: false,
  });

  const aspectEcho =
    typeof body.aspect === "string" && body.aspect.trim()
      ? body.aspect.trim().slice(0, 16)
      : "3:4";

  // Idempotent replay BEFORE locks/reserve — network retries must not double-charge Flux.
  const idempotencyKey = normalizeImageIdempotencyKey(body.idempotencyKey);
  const ledgerIdempotencyKey =
    access.kind === "cached" && idempotencyKey
      ? `cached:${idempotencyKey}`.slice(0, 128)
      : idempotencyKey;
  if (ledgerIdempotencyKey) {
    const prior = findImageJobByIdempotencyKey(session.id, ledgerIdempotencyKey);
    if (prior) {
      if (prior.status === "succeeded") {
        const replay = successFromImageJob(prior, session, aspectEcho, true);
        if (replay) {
          return NextResponse.json(replay);
        }
      }
      if (prior.status === "running") {
        // Prefer ledger age over inflight lock — lock frees after kill while row open.
        const lockRetry = jobInFlightRetryAfterSec(`img:${session.id}`);
        const jobRetry = imageJobInFlightRetryAfterSec(prior);
        const retryAfterSec = Math.max(lockRetry, jobRetry);
        return NextResponse.json(
          {
            error: `An image job with this idempotency key is still running — try again in ${retryAfterSec}s`,
            code: "JOB_IN_FLIGHT",
            retryAfterSec,
            session: publicSession(session),
          },
          {
            status: 409,
            headers: { "Retry-After": String(retryAfterSec) },
          }
        );
      }
      if (prior.status === "failed" || prior.status === "canceled") {
        const code = prior.errorCode || "GENERATION_FAILED";
        // HTTP status map parity with /api/generate fail replay.
        const status =
          code === "CONTENT_POLICY"
            ? 422
            : code === "PROVIDER_TIMEOUT" || code === "TIMEOUT"
              ? 504
              : code === "PROVIDER_NETWORK"
                ? 503
                : code === "PROVIDER_BALANCE"
                  ? 402
                  : code === "PROVIDER_RATE_LIMIT"
                    ? 429
                    : code === "CANCELED" || code === "REQUEST_CANCELED"
                      ? 409
                      : code === "UNSAFE_URL" || code === "MODEL_EMPTY"
                        ? 502
                        : 500;
        return NextResponse.json(
          {
            error:
              prior.error ||
              (prior.status === "canceled"
                ? "Prior image attempt was canceled — mint a new idempotency key to retry"
                : "Prior image attempt failed — mint a new idempotency key to retry"),
            code,
            model: prior.model,
            session: publicSession(session),
            creditsRefunded: prior.creditsRefunded,
            // Timeout/crash/cancel: do not claim credits restored.
            ...(prior.creditsOutcome === "refund unconfirmed"
              ? { refundUnconfirmed: true }
              : {}),
          },
          { status }
        );
      }
    }
  }

  const rl = takeGenerateBudget(session.id, clientIp(req), "img");
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: `Too many image jobs — try again in ${rl.retryAfterSec}s`,
        code: "RATE_LIMITED",
        retryAfterSec: rl.retryAfterSec,
        session: publicSession(session),
      },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }

  const imgLockKey = `img:${session.id}`;
  if (!tryBeginJob(imgLockKey)) {
    const retryAfterSec = jobInFlightRetryAfterSec(imgLockKey);
    return NextResponse.json(
      {
        error: `An image job is already running — try again in ${retryAfterSec}s`,
        code: "JOB_IN_FLIGHT",
        retryAfterSec,
        session: publicSession(session),
      },
      {
        status: 409,
        headers: { "Retry-After": String(retryAfterSec) },
      }
    );
  }

  let liveJobId: string | undefined;
  // Reservation lifecycle: release ≤1; never release after settle/withhold.
  const reservationLife = createReservationLifecycle({
    release: async (reservation, reason) => {
      const released = await releaseStrictLiveGeneration(reservation, reason);
      if (!released.ok) return { ok: false, error: released.error };
      return {
        ok: true,
        availableCredits: released.data.availableCredits,
      };
    },
    settle: async (reservation, providerRequestId) => {
      const captured = await settleStrictLiveGeneration(
        reservation,
        providerRequestId
      );
      if (!captured.ok) return { ok: false, error: captured.error };
      return {
        ok: true,
        availableCredits: captured.data.availableCredits,
      };
    },
  });
  let runSafetyNetRelease: (() => Promise<void>) | null = null;
  try {
    try {
      if (hasRetryHandoff) {
        if (!retryJobId || !retryToken) {
          return NextResponse.json(
            {
              error:
                "Still ledger retry requires both retryJobId and one-time retryToken",
              code: "RETRY_TOKEN_INVALID",
              session: publicSession(session),
            },
            { status: 400 }
          );
        }
        const claimed = claimRetryImageJob({
          sessionId: session.id,
          retryJobId,
          retryToken,
          prompt,
          aspect: aspectEcho,
          idempotencyKey: ledgerIdempotencyKey,
        });
        if (!claimed.ok) {
          const status =
            claimed.code === "RETRY_SPEC_MISMATCH"
              ? 422
              : claimed.code === "IDEMPOTENCY_CONFLICT"
                ? 409
                : claimed.code === "RETRY_JOB_NOT_READY"
                  ? 409
                  : 403;
          return NextResponse.json(
            {
              error: claimed.message,
              code: claimed.code,
              session: publicSession(session),
            },
            { status }
          );
        }
        liveJobId = claimed.job.id;
      } else {
        liveJobId = beginImageJob({
          sessionId: session.id,
          prompt,
          aspect: aspectEcho,
          idempotencyKey: ledgerIdempotencyKey,
        }).id;
      }
    } catch {
      liveJobId = undefined;
    }

    // Shared free/demo still — never charges credits (R0 + video-first free trial).
    const demoStillPayload = (demoReason: ImageDemoReason): ImageSuccessBody => {
      // placeholder gradient SVG data URL as demo (lime/black brand, not purple)
      const sub =
        demoReason === "free_trial_video_only" ||
        demoReason === "free_live_delivery_blocked"
          ? "Flux stills are outside the Launch Pack beta"
          : demoReason === "anonymous_cached_only"
            ? "sign in for paid Flux stills"
            : "set FAL_KEY for Flux";
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0a0a0a"/><stop offset="1" stop-color="#1a2e0a"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="48%" fill="#b8ff3c" font-size="28" text-anchor="middle" font-family="sans-serif">Pikbo demo still</text><text x="50%" y="54%" fill="#b8ff3c" font-size="14" text-anchor="middle" opacity=".75">${sub}</text></svg>`;
      const imageUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
      let requestId: string | undefined;
      let jobId: string | undefined;
      try {
        const job = completeImageJob({
          jobId: liveJobId,
          sessionId: session.id,
          prompt,
          aspect: aspectEcho,
          imageUrl,
          demo: true,
          demoReason,
          model: "demo",
          costCredits: 0,
          creditsOutcome: "0 cached",
          idempotencyKey: ledgerIdempotencyKey,
        });
        requestId = job.requestId || job.id;
        jobId = job.id;
      } catch {
        /* best-effort ledger */
      }
      return {
        imageUrl,
        demo: true as const,
        demoReason,
        model: "demo",
        aspect: aspectEcho,
        session: publicSession(session),
        // Parity with /api/generate honesty — cached demos never charge.
        costCredits: 0,
        creditsOutcome: "0 cached" as const,
        requestId,
        jobId,
      };
    };

    // Cost gate: anonymous + Free always receive a labeled demo still, even when
    // FAL_KEY exists. Cookie plan/credits are never live-spend authority.
    if (access.kind === "cached") {
      await new Promise((r) => setTimeout(r, 600));
      // Preserve free_trial_video_only product copy for free plan stills.
      const demoReason: ImageDemoReason =
        access.reason === "no_provider_key"
          ? "no_provider_key"
          : access.reason === "anonymous_cached_only"
            ? "anonymous_cached_only"
            : session.plan === "free"
              ? "free_trial_video_only"
              : "free_live_delivery_blocked";
      return NextResponse.json(demoStillPayload(demoReason));
    }

    // Live is fail-closed: verified Supabase user + committed Supabase reserve.
    if (!authUser) {
      return NextResponse.json(
        {
          error: "Sign in before requesting live Flux stills",
          code: "AUTH_REQUIRED",
          session: publicSession(session),
        },
        { status: 401 }
      );
    }
    if (!idempotencyKey) {
      return NextResponse.json(
        {
          error: "Live image generation requires a stable idempotency key",
          code: "RESERVATION_FAILED",
          session: publicSession(session),
        },
        { status: 400 }
      );
    }
    const reserved = await reserveStrictLiveGeneration({
      userId: authUser.id,
      idempotencyKey: `image:${idempotencyKey}`,
      effectSlug: "flux-toy-still",
    });
    if (!reserved.ok) {
      const status =
        reserved.code === "INSUFFICIENT_CREDITS"
          ? 402
          : reserved.code === "JOB_IN_FLIGHT"
            ? 409
          : reserved.code === "LIVE_ACCESS_REQUIRED"
            ? 403
            : 503;
      return NextResponse.json(
        {
          error: reserved.error,
          code: reserved.code,
          need: reserved.need,
          have: reserved.have,
          session: publicSession(session),
        },
        { status }
      );
    }
    reservationLife.assign(reserved.reservation);
    session = {
      ...session,
      plan: reserved.reservation.planId,
      credits: reserved.availableCredits,
    };
    const releaseReservation = async (reason: string): Promise<boolean> => {
      const target = reservationLife.get() ?? reserved.reservation;
      const released = await reservationLife.release(reason);
      if (released.skipped) return false;
      if (!released.ok) {
        // R1c parity with generate: enqueue release_pending or settlement_unknown.
        const confirmedPreOutput = new Set([
          "force_fail",
          "retry_claim_rejected",
          "unexpected_exit_safety_net",
        ]).has(reason);
        const recorded = confirmedPreOutput
          ? await recordConfirmedPreOutputFailure(target, {
              eventId: reconciliationEventId(
                "release_pending",
                target.jobId,
                reason
              ),
              reason,
            })
          : await recordSettlementUnknown(target, {
              eventId: reconciliationEventId(
                "settlement_unknown",
                target.jobId,
                reason
              ),
              reason,
            });
        if (!recorded.ok) {
          console.error(
            "[live-reconciliation] image release enqueue failed",
            recorded.code
          );
        }
        return false;
      }
      if (typeof released.availableCredits === "number") {
        session = {
          ...session,
          credits: released.availableCredits,
        };
        await saveSession(session);
      }
      return true;
    };
    runSafetyNetRelease = async () => {
      await releaseReservation("unexpected_exit_safety_net");
    };
    await saveSession(session);

    // Match generate: non-prod forced fail for refund path tests (never production).
    const forceFail =
      process.env.PIKBO_FORCE_GENERATE_FAIL === "1" &&
      process.env.NODE_ENV !== "production" &&
      process.env.VERCEL_ENV !== "production";
    if (forceFail) {
      const released = await releaseReservation("force_fail");
      const failBody = {
        error:
          "Forced image failure (PIKBO_FORCE_GENERATE_FAIL) — credits restored",
        code: "GENERATION_FAILED" as const,
        session: publicSession(session),
        creditsRefunded: released,
        ...(!released ? { refundUnconfirmed: true as const } : {}),
      };
      try {
        failImageJob({
          jobId: liveJobId,
          sessionId: session.id,
          prompt,
          error: failBody.error,
          errorCode: failBody.code,
          creditsRefunded: released,
          refundUnconfirmed: !released,
          idempotencyKey: ledgerIdempotencyKey,
        });
      } catch {
        /* best-effort */
      }
      return NextResponse.json(failBody, { status: 500 });
    }

    try {
      fal.config({ credentials: process.env.FAL_KEY });
      const aspect = aspectEcho;
      // flux schnell uses image_size enums often
      const sizeMap: Record<string, string> = {
        "1:1": "square_hd",
        "3:4": "portrait_4_3",
        "9:16": "portrait_16_9",
        "16:9": "landscape_16_9",
      };

      if (liveJobId) recordImageWorkerHeartbeat(liveJobId);
      const result = await invokeReservedProvider(
        reserved.reservation,
        () =>
          fal.subscribe(IMAGE_MODEL, {
            input: {
              prompt: `${prompt}. Product photography style, designer toy / collectible figure, sharp detail, studio lighting.`,
              image_size: sizeMap[aspect] || "portrait_4_3",
              num_images: 1,
            },
            logs: false,
          })
      );
      if (liveJobId) recordImageWorkerHeartbeat(liveJobId);

      const data = result.data as {
        images?: Array<{ url?: string }>;
        image?: { url?: string };
      };
      const imageUrl = data.images?.[0]?.url || data.image?.url;
      if (!imageUrl) {
        const released = await releaseReservation("model_empty");
        const failBody = {
          error: "No image returned",
          code: "MODEL_EMPTY" as const,
          session: publicSession(session),
          creditsRefunded: released,
          ...(!released ? { refundUnconfirmed: true as const } : {}),
        };
        try {
          failImageJob({
            jobId: liveJobId,
            sessionId: session.id,
            prompt,
            error: failBody.error,
            errorCode: failBody.code,
            model: IMAGE_MODEL,
            creditsRefunded: released,
            refundUnconfirmed: !released,
            idempotencyKey: ledgerIdempotencyKey,
          });
        } catch {
          /* best-effort */
        }
        return NextResponse.json(failBody, { status: 502 });
      }
      // Parity with /api/generate — refuse non-http(s) open-redirect / injection URLs.
      if (!isSafeDeliverableUrl(imageUrl)) {
        const released = await releaseReservation("unsafe_url");
        const failBody = {
          error: "Model returned an unsafe image URL — credits restored",
          code: "UNSAFE_URL" as const,
          session: publicSession(session),
          creditsRefunded: released,
          ...(!released ? { refundUnconfirmed: true as const } : {}),
        };
        try {
          failImageJob({
            jobId: liveJobId,
            sessionId: session.id,
            prompt,
            error: failBody.error,
            errorCode: failBody.code,
            model: IMAGE_MODEL,
            creditsRefunded: released,
            refundUnconfirmed: !released,
            idempotencyKey: ledgerIdempotencyKey,
          });
        } catch {
          /* best-effort */
        }
        return NextResponse.json(failBody, { status: 502 });
      }

      const providerRequestId =
        typeof (result as { requestId?: string }).requestId === "string"
          ? (result as { requestId?: string }).requestId
          : undefined;

      // Late Flux after cancel/timeout: withhold + R1c enqueue (never free still).
      if (liveJobId) {
        const deadlineState = getImageJob(liveJobId);
        const completionDecision = providerCompletionDecision(deadlineState);
        if (!completionDecision.allow) {
          // Provider output already exists. Close the release path before any
          // reconciliation I/O, because that I/O may itself throw.
          reservationLife.markWithheld(completionDecision.code);
          const recorded = await recordProviderSucceededWithheld(
            reserved.reservation,
            {
              eventId: reconciliationEventId(
                "provider_succeeded",
                reserved.reservation.jobId
              ),
              providerRequestId:
                providerRequestId || liveJobId || reserved.reservation.jobId,
              outputRef: imageUrl,
              reason: completionDecision.code,
            }
          );
          if (!recorded.ok) {
            console.error(
              "[live-reconciliation] image late output enqueue failed",
              recorded.code
            );
          }
          return NextResponse.json(
            {
              error: completionDecision.message,
              code: completionDecision.code,
              model: IMAGE_MODEL,
              jobId: liveJobId,
              session: publicSession(session),
              refundUnconfirmed: true,
            },
            { status: completionDecision.httpStatus }
          );
        }
      }

      const captured = await reservationLife.settle(
        providerRequestId || liveJobId || reserved.reservation.reservationId
      );
      if (!captured.ok) {
        console.error("[live-reservation] image capture failed");
        // settle() already moves failed/thrown capture to withheld.
        reservationLife.markWithheld("capture_failed");
        const recorded = await recordProviderSucceededWithheld(
          reserved.reservation,
          {
            eventId: reconciliationEventId(
              "provider_succeeded",
              reserved.reservation.jobId
            ),
            providerRequestId:
              providerRequestId || liveJobId || reserved.reservation.jobId,
            outputRef: imageUrl,
            reason: "capture_failed",
          }
        );
        if (!recorded.ok) {
          console.error(
            "[live-reconciliation] image capture enqueue failed",
            recorded.code
          );
        }
        return NextResponse.json(
          {
            error:
              "The still was generated, but credits could not be finalized. The output is withheld while the durable reservation is reconciled; do not retry with the same idempotency key.",
            code: "DURABLE_CREDITS_UNAVAILABLE",
            model: IMAGE_MODEL,
            jobId: reserved.reservation.jobId,
            session: publicSession(session),
          },
          { status: 503 }
        );
      }

      let jobId = liveJobId;
      let requestId = providerRequestId || liveJobId;
      try {
        const job = completeImageJob({
          jobId: liveJobId,
          sessionId: session.id,
          prompt,
          aspect,
          imageUrl,
          demo: false,
          model: IMAGE_MODEL,
          costCredits: reserved.reservation.credits,
          creditsOutcome: "10 used",
          requestId: providerRequestId,
          idempotencyKey: ledgerIdempotencyKey,
        });
        jobId = job.id;
        requestId = job.requestId || job.id;
      } catch {
        /* best-effort ledger */
      }

      return NextResponse.json({
        imageUrl,
        demo: false,
        model: IMAGE_MODEL,
        aspect,
        session: publicSession(session),
        // Server-echo settlement (Wave B parity with generate).
        costCredits: reserved.reservation.credits,
        creditsOutcome: "10 used" as const,
        requestId,
        jobId,
      });
    } catch (err) {
      console.error("image gen error:", err);
      const released = await releaseReservation("provider_error");
      const raw =
        err && typeof err === "object" && "body" in err
          ? JSON.stringify((err as { body?: unknown }).body)
          : err instanceof Error
            ? err.message
            : "Image generation failed";
      const kind = classifyProviderError(raw);
      const fallback =
        err instanceof Error ? err.message : "Image generation failed";
      const msg = providerErrorMessage(kind, fallback);
      const http = providerFailHttp(kind);
      try {
        failImageJob({
          jobId: liveJobId,
          sessionId: session.id,
          prompt,
          error: msg,
          errorCode: http.code,
          model: IMAGE_MODEL,
          creditsRefunded: released,
          refundUnconfirmed: !released,
          idempotencyKey: ledgerIdempotencyKey,
        });
      } catch {
        /* best-effort */
      }
      return NextResponse.json(
        {
          error: msg,
          code: http.code,
          session: publicSession(session),
          creditsRefunded: released,
          ...(!released ? { refundUnconfirmed: true as const } : {}),
          ...(http.retryAfterSec != null
            ? { retryAfterSec: http.retryAfterSec }
            : {}),
        },
        {
          status: http.status,
          ...(http.retryAfterSec != null
            ? { headers: { "Retry-After": String(http.retryAfterSec) } }
            : {}),
        }
      );
    }
  } finally {
    // Only while still reserved; never after settle/withhold; backend ≤1 call.
    try {
      if (runSafetyNetRelease) {
        await runSafetyNetRelease();
      } else {
        await reservationLife.safetyNetRelease();
      }
    } catch {
      /* best-effort — reconciliation worker will pick up */
    }
    endJob(imgLockKey);
  }
}
