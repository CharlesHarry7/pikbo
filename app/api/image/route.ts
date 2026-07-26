import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { checkCredits, deductCredits, refundCredits } from "@/lib/credits";
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
  beginImageJob,
  cancelImageJob,
  completeImageJob,
  failImageJob,
  findImageJobByIdempotencyKey,
  imageJobInFlightRetryAfterSec,
  imageJobTimeoutMs,
  listImageJobCountsForSession,
  normalizeImageIdempotencyKey,
  type ImageJob,
} from "@/lib/imageJobs";

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
      "X-Pikbo-Image-Jobs-Succeeded": String(counts.succeeded),
      "X-Pikbo-Image-Jobs-Failed": String(counts.failed),
      "X-Pikbo-Image-Jobs-Canceled": String(counts.canceled),
      "X-Pikbo-Image-Job-Timeout-Ms": String(imageJobTimeoutMs()),
    },
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
  const jobId =
    (typeof body.jobId === "string" && body.jobId.trim()) ||
    (typeof body.requestId === "string" && body.requestId.trim()) ||
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
    note: "Still ledger marked canceled. Soft-launch Flux may still complete server-side.",
  });
}

type ImageSuccessBody = {
  imageUrl: string;
  demo: boolean;
  demoReason?: "no_provider_key" | "free_trial_video_only";
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
  let body: { prompt?: string; aspect?: string; idempotencyKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request", code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  const prompt = body.prompt?.trim();
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

  const aspectEcho =
    typeof body.aspect === "string" && body.aspect.trim()
      ? body.aspect.trim().slice(0, 16)
      : "3:4";

  // Idempotent replay BEFORE locks/deduct — network retries must not double-charge Flux.
  const idempotencyKey = normalizeImageIdempotencyKey(body.idempotencyKey);
  if (idempotencyKey) {
    const prior = findImageJobByIdempotencyKey(session.id, idempotencyKey);
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
        const status =
          code === "CONTENT_POLICY"
            ? 422
            : code === "PROVIDER_TIMEOUT" || code === "TIMEOUT"
              ? 504
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
  try {
    try {
      liveJobId = beginImageJob({
        sessionId: session.id,
        prompt,
        aspect: aspectEcho,
        idempotencyKey,
      }).id;
    } catch {
      liveJobId = undefined;
    }

    // Shared free/demo still — never charges credits (video-first free trial honesty).
    const demoStillPayload = (
      demoReason: "no_provider_key" | "free_trial_video_only"
    ): ImageSuccessBody => {
      // placeholder gradient SVG data URL as demo (lime/black brand, not purple)
      const sub =
        demoReason === "free_trial_video_only"
          ? "Free trial is Create video · upgrade for Flux"
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
          idempotencyKey,
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

    // Demo stills are free when no provider is configured (parity with video demos).
    if (!process.env.FAL_KEY) {
      await new Promise((r) => setTimeout(r, 800));
      return NextResponse.json(demoStillPayload("no_provider_key"));
    }

    // Free plan Mini trial is Create video only — stills must not burn the 10-credit trial.
    // Paid plans may live-charge Flux; free always labeled demo (0 credits).
    if (session.plan === "free") {
      await new Promise((r) => setTimeout(r, 600));
      return NextResponse.json(demoStillPayload("free_trial_video_only"));
    }

    // Paid plans only below (Free returned demo above — trial is video Create only).
    const check = checkCredits(session);
    if (!check.ok) {
      return NextResponse.json(
        {
          error: "Not enough credits — top up on Pricing or wait for plan refresh",
          code: "INSUFFICIENT_CREDITS",
          need: check.need,
          have: check.have,
          session: publicSession(session),
        },
        { status: 402 }
      );
    }

    session = deductCredits(session, check.cost);
    await saveSession(session);

    // Match generate: non-prod forced fail for refund path tests (never production).
    const forceFail =
      process.env.PIKBO_FORCE_GENERATE_FAIL === "1" &&
      process.env.NODE_ENV !== "production" &&
      process.env.VERCEL_ENV !== "production";
    if (forceFail) {
      session = refundCredits(session, check.cost);
      await saveSession(session);
      const failBody = {
        error:
          "Forced image failure (PIKBO_FORCE_GENERATE_FAIL) — credits restored",
        code: "GENERATION_FAILED" as const,
        session: publicSession(session),
        creditsRefunded: true as const,
      };
      try {
        failImageJob({
          jobId: liveJobId,
          sessionId: session.id,
          prompt,
          error: failBody.error,
          errorCode: failBody.code,
          creditsRefunded: true,
          idempotencyKey,
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

      const result = await fal.subscribe(IMAGE_MODEL, {
        input: {
          prompt: `${prompt}. Product photography style, designer toy / collectible figure, sharp detail, studio lighting.`,
          image_size: sizeMap[aspect] || "portrait_4_3",
          num_images: 1,
        },
        logs: false,
      });

      const data = result.data as {
        images?: Array<{ url?: string }>;
        image?: { url?: string };
      };
      const imageUrl = data.images?.[0]?.url || data.image?.url;
      if (!imageUrl) {
        session = refundCredits(session, check.cost);
        await saveSession(session);
        const failBody = {
          error: "No image returned",
          code: "MODEL_EMPTY" as const,
          session: publicSession(session),
          creditsRefunded: true as const,
        };
        try {
          failImageJob({
            jobId: liveJobId,
            sessionId: session.id,
            prompt,
            error: failBody.error,
            errorCode: failBody.code,
            model: IMAGE_MODEL,
            creditsRefunded: true,
            idempotencyKey,
          });
        } catch {
          /* best-effort */
        }
        return NextResponse.json(failBody, { status: 502 });
      }
      // Parity with /api/generate — refuse non-http(s) open-redirect / injection URLs.
      if (!isSafeDeliverableUrl(imageUrl)) {
        session = refundCredits(session, check.cost);
        await saveSession(session);
        const failBody = {
          error: "Model returned an unsafe image URL — credits restored",
          code: "UNSAFE_URL" as const,
          session: publicSession(session),
          creditsRefunded: true as const,
        };
        try {
          failImageJob({
            jobId: liveJobId,
            sessionId: session.id,
            prompt,
            error: failBody.error,
            errorCode: failBody.code,
            model: IMAGE_MODEL,
            creditsRefunded: true,
            idempotencyKey,
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
          costCredits: check.cost,
          creditsOutcome: "10 used",
          requestId: providerRequestId,
          idempotencyKey,
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
        costCredits: check.cost,
        creditsOutcome: "10 used" as const,
        requestId,
        jobId,
      });
    } catch (err) {
      console.error("image gen error:", err);
      session = refundCredits(session, check.cost);
      await saveSession(session);
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
          creditsRefunded: true,
          idempotencyKey,
        });
      } catch {
        /* best-effort */
      }
      return NextResponse.json(
        {
          error: msg,
          code: http.code,
          session: publicSession(session),
          creditsRefunded: true,
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
    endJob(imgLockKey);
  }
}
