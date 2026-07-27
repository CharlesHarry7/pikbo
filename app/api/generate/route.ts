import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { getPreset } from "@/lib/presets";
import { getPlan } from "@/lib/pricing";
import {
  clampDuration,
  modelForTier,
  normalizeAspect,
  resolutionForTier,
  seedanceDuration,
  type ModelPreference,
} from "@/lib/models";
import { ensureSession, publicSession, saveSession } from "@/lib/session";
import { demoClipForEffect } from "@/lib/demoClips";
import {
  endJob,
  jobInFlightRetryAfterSec,
  takeGenerateBudget,
  tryBeginJob,
} from "@/lib/rateLimit";
import { clientIp } from "@/lib/requestMeta";
import {
  classifyProviderError,
  isValidImageDataUrl,
  providerErrorMessage,
  providerFailHttp,
} from "@/lib/providerError";
import {
  customerFacingGenerateVideoUrl,
  isSafeDeliverableUrl,
} from "@/lib/createTrust";
import { buildGeneratePrompt } from "@/lib/promptBuild";
import type {
  GenerateErrorBody,
  GenerateRequestBody,
  GenerateSuccess,
} from "@/lib/contracts";
import {
  releaseStrictLiveGeneration,
  reserveStrictLiveGeneration,
  settleStrictLiveGeneration,
  type StrictLiveReservation,
} from "@/lib/durableCredits/liveReservation";
import { getAuthUserFromRequest } from "@/lib/supabase/user";
import {
  invokeReservedProvider,
  liveGenerationAccess,
} from "@/lib/liveGenerationGate.mjs";
import {
  beginSyncGenerateJob,
  completeSyncGenerateJob,
  failSyncGenerateJob,
  findJobByIdempotencyKey,
  jobLedgerInFlightRetryAfterSec,
  recordSucceededGenerate,
  type GenerationJob,
} from "@/lib/generationJobs";
import { getLocalAsset } from "@/lib/localAssets";

export const runtime = "nodejs";
export const maxDuration = 180;

function err(
  body: GenerateErrorBody,
  status: number,
  headers?: HeadersInit
): NextResponse<GenerateErrorBody> {
  return NextResponse.json(body, { status, headers });
}

function normalizeIdempotencyKey(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim().slice(0, 128);
  // Reject tiny keys (collision / abuse); UUID is 36 chars.
  if (t.length < 8) return undefined;
  return t;
}

/** R1b explicit ledger-retry fork token (process-memory job id). */
function normalizeRetryJobId(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim().slice(0, 128);
  if (t.length < 8) return undefined;
  return t;
}

function successFromJob(
  job: GenerationJob,
  session: Parameters<typeof publicSession>[0],
  replay: boolean
): GenerateSuccess {
  const demo = Boolean(job.demo);
  const outcome =
    job.creditsOutcome === "0 cached" || job.creditsOutcome === "10 used"
      ? job.creditsOutcome
      : demo
        ? ("0 cached" as const)
        : ("10 used" as const);
  // Free live provider output stays server-only until a verified baked
  // derivative exists. Controlled /api/downloads re-checks T6 ownership.
  const customerVideoUrl = customerFacingGenerateVideoUrl({
    demo,
    watermark: job.watermark,
    jobId: job.id,
    videoUrl: job.videoUrl || "",
  });
  return {
    videoUrl: customerVideoUrl,
    demo,
    watermark: job.watermark,
    model: job.model || (demo ? "demo-cached" : "unknown"),
    duration: typeof job.duration === "number" ? job.duration : 5,
    aspectRatio: job.aspectRatio || "1:1",
    resolution: job.resolution || "480p",
    session: publicSession(session),
    requestId: job.requestId || job.id,
    jobId: job.id,
    provider: job.provider,
    effect: job.effect,
    costCredits:
      typeof job.costCredits === "number" ? job.costCredits : demo ? 0 : 10,
    creditsOutcome: outcome,
    ...(replay ? { idempotentReplay: true } : {}),
  };
}

function noteFailed(
  sessionId: string,
  effect: string,
  body: GenerateErrorBody,
  jobId?: string
) {
  // Returning the already-created local ledger id lets a current-device UI
  // reconcile this terminal failure after refresh. It is not a durable id.
  if (jobId) body.jobId = jobId;
  try {
    failSyncGenerateJob({
      jobId,
      sessionId,
      effect,
      error: body.error,
      errorCode: body.code,
      model: body.model,
      creditsRefunded: body.creditsRefunded,
      // Ambiguous debit codes (TIMEOUT · PROVIDER_* · CONTENT_POLICY · …)
      // stamp refund unconfirmed on the ledger when restore is not confirmed.
      refundUnconfirmed: body.refundUnconfirmed === true,
    });
  } catch {
    /* job ledger is best-effort */
  }
}

export async function POST(req: Request) {
  let body: GenerateRequestBody;
  try {
    body = (await req.json()) as GenerateRequestBody;
  } catch {
    return err({ error: "Invalid request", code: "INVALID_REQUEST" }, 400);
  }

  const {
    effect,
    image: imageField,
    assetId,
    extra,
    duration,
    aspectRatio,
    model: modelPref,
    resolution: resPref,
    seed,
    ownsRights,
  } = body;

  const preset = effect ? getPreset(effect) : undefined;
  if (!preset) {
    return err({ error: "Unknown effect", code: "UNKNOWN_EFFECT" }, 400);
  }
  // Soft-launch PRD §3/§5 — server-enforced rights attestation (not UI-only).
  if (ownsRights !== true) {
    return err(
      {
        error:
          "Confirm you own this photo and have the right to animate it before generating",
        code: "RIGHTS_REQUIRED",
      },
      400
    );
  }

  let session = await ensureSession();
  const authUser = await getAuthUserFromRequest(req);
  const access = liveGenerationAccess({
    providerConfigured: Boolean(process.env.FAL_KEY),
    authenticated: Boolean(authUser),
    planId: session.plan,
    // T6 is deliberately blocked. Free live cannot reopen until a verified
    // server-owned derivative is available.
    freeDeliveryReady: false,
  });

  // Idempotent replay BEFORE image/asset resolve — network retries must not
  // re-upload multi-MB stills or fail on expired assetId after success.
  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey);
  const retryJobId = normalizeRetryJobId(body.retryJobId);
  const ledgerIdempotencyKey =
    access.kind === "cached" && idempotencyKey
      ? `cached:${idempotencyKey}`.slice(0, 128)
      : idempotencyKey;
  if (ledgerIdempotencyKey) {
    const prior = findJobByIdempotencyKey(
      session.id,
      ledgerIdempotencyKey
    );
    if (prior) {
      if (
        prior.status === "succeeded" &&
        prior.videoUrl &&
        isSafeDeliverableUrl(prior.videoUrl)
      ) {
        return NextResponse.json(successFromJob(prior, session, true));
      }
      if (prior.status === "running" || prior.status === "queued") {
        // Prefer ledger age over inflight lock — lock frees after kill while row open.
        const lockRetry = jobInFlightRetryAfterSec(session.id);
        const ledgerRetry = jobLedgerInFlightRetryAfterSec(prior);
        const retryAfterSec = Math.max(lockRetry, ledgerRetry);
        return err(
          {
            error: `A generate with this idempotency key is still running — try again in ${retryAfterSec}s`,
            code: "JOB_IN_FLIGHT",
            retryAfterSec,
            session: publicSession(session),
          },
          409,
          { "Retry-After": String(retryAfterSec) }
        );
      }
      if (prior.status === "failed" || prior.status === "canceled") {
        // Ledger may store CANCELED/TIMEOUT strings not on GenerateErrorBody union.
        const rawCode = prior.errorCode || "GENERATION_FAILED";
        const code = (
          rawCode === "CANCELED" ? "REQUEST_CANCELED" : rawCode
        ) as GenerateErrorBody["code"];
        // HTTP status map parity with /api/image fail replay.
        const status =
          rawCode === "CONTENT_POLICY"
            ? 422
            : rawCode === "PROVIDER_TIMEOUT" || rawCode === "TIMEOUT"
              ? 504
              : rawCode === "PROVIDER_NETWORK"
                ? 503
                : rawCode === "PROVIDER_BALANCE"
                  ? 402
                  : rawCode === "PROVIDER_RATE_LIMIT"
                    ? 429
                    : rawCode === "CANCELED" || rawCode === "REQUEST_CANCELED"
                      ? 409
                      : rawCode === "UNSAFE_URL" || rawCode === "MODEL_EMPTY"
                        ? 502
                        : 500;
        return err(
          {
            error:
              prior.error ||
              (prior.status === "canceled"
                ? "Prior generate attempt was canceled — mint a new idempotency key to retry"
                : "Prior generate attempt failed — mint a new idempotency key to retry"),
            code,
            model: prior.model,
            session: publicSession(session),
            creditsRefunded: prior.creditsRefunded,
            ...(prior.creditsOutcome === "refund unconfirmed"
              ? { refundUnconfirmed: true }
              : {}),
          },
          status
        );
      }
    }
  }

  // Phase D: prefer session-local asset over re-posted Base64.
  // On multi-instance hosts (Vercel), memory assets often miss on another node —
  // if the client also sent a data URL, fall through instead of hard-failing.
  let image =
    typeof imageField === "string" && imageField.startsWith("data:image")
      ? imageField
      : undefined;
  if (typeof assetId === "string" && assetId.startsWith("asset_")) {
    const asset = getLocalAsset(assetId, session.id);
    if (asset) {
      image = asset.dataUrl;
    } else if (!image) {
      return err(
        {
          error:
            "Asset missing, expired, or not owned by this session — re-upload the photo",
          code: "ASSET_NOT_FOUND",
          session: publicSession(session),
        },
        404
      );
    }
  }

  if (!image || !isValidImageDataUrl(image)) {
    return err(
      {
        error:
          "A toy photo is required (JPEG, PNG, WebP, or GIF data URL, or assetId from /api/assets)",
        code: "INVALID_REQUEST",
      },
      400
    );
  }
  if (image.length > 12_000_000) {
    return err(
      { error: "Image too large (max ~8MB)", code: "IMAGE_TOO_LARGE" },
      413
    );
  }

  const rl = takeGenerateBudget(session.id, clientIp(req), "gen");
  if (!rl.ok) {
    return err(
      {
        error: `Too many generates — try again in ${rl.retryAfterSec}s`,
        code: "RATE_LIMITED",
        retryAfterSec: rl.retryAfterSec,
        session: publicSession(session),
      },
      429,
      { "Retry-After": String(rl.retryAfterSec) }
    );
  }

  if (!tryBeginJob(session.id)) {
    const retryAfterSec = jobInFlightRetryAfterSec(session.id);
    return err(
      {
        error: `A generate is already running for this session — try again in ${retryAfterSec}s`,
        code: "JOB_IN_FLIGHT",
        retryAfterSec,
        session: publicSession(session),
      },
      409,
      { "Retry-After": String(retryAfterSec) }
    );
  }

  try {
    const plan = getPlan(session.plan);
    const freeTier = plan.watermark;
    const secs = freeTier ? 5 : clampDuration(duration, preset.duration);
    const aspect = normalizeAspect(aspectRatio, preset.aspectRatio);
    const resolution = resolutionForTier(freeTier, resPref);

    // Always keep preset template as base — freeform-only used to wipe toy prompts.
    const prompt = buildGeneratePrompt(preset.promptTemplate, extra);

    // Cost gate: anonymous users and Free accounts always receive an official
    // cached clip, even when FAL_KEY exists. The upload is not processed.
    if (access.kind === "cached") {
      await new Promise((r) => setTimeout(r, 600));
      // Prefer on-disk clip; refuse unsafe paths even from internal catalog.
      let videoUrl = demoClipForEffect(preset.slug);
      if (!isSafeDeliverableUrl(videoUrl)) {
        videoUrl = "/demos/orbit-dance.mp4";
      }
      if (!isSafeDeliverableUrl(videoUrl)) {
        return err(
          {
            error:
              "Demo catalog has no safe deliverable on this host — check Lab demos deploy",
            code: "MODEL_EMPTY",
            session: publicSession(session),
          },
          502
        );
      }
      const payload: GenerateSuccess = {
        videoUrl,
        demo: true,
        demoReason: access.reason,
        watermark: plan.watermark,
        model: "demo-cached",
        duration: secs,
        aspectRatio: aspect,
        resolution,
        session: publicSession(session),
        // Wave B — echo server-validated recipe + free settlement
        effect: preset.slug,
        costCredits: 0,
        creditsOutcome: "0 cached",
      };
      try {
        const job = recordSucceededGenerate({
          sessionId: session.id,
          effect: preset.slug,
          videoUrl: payload.videoUrl,
          demo: true,
          watermark: plan.watermark,
          model: payload.model,
          duration: secs,
          aspectRatio: aspect,
          resolution,
          costCredits: 0,
          creditsOutcome: "0 cached",
          provider: "demo-cached",
          idempotencyKey: ledgerIdempotencyKey,
        });
        payload.requestId = job.id;
        payload.jobId = job.id;
      } catch {
        /* best-effort job ledger */
      }
      return NextResponse.json(payload);
    }

    // Live is fail-closed: verified Supabase user + committed Supabase reserve.
    // Cookie credits and local files are never live-spend authority.
    if (!authUser) {
      return err(
        {
          error: "Sign in before requesting live generation",
          code: "AUTH_REQUIRED",
          session: publicSession(session),
        },
        401
      );
    }
    if (!idempotencyKey) {
      return err(
        {
          error: "Live generation requires a stable idempotency key",
          code: "RESERVATION_FAILED",
          session: publicSession(session),
        },
        400
      );
    }
    const reserved = await reserveStrictLiveGeneration({
      userId: authUser.id,
      idempotencyKey,
      effectSlug: preset.slug,
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
      return err(
        {
          error: reserved.error,
          code: reserved.code,
          need: reserved.need,
          have: reserved.have,
          session: publicSession(session),
        },
        status
      );
    }
    let liveReservation: StrictLiveReservation | null = reserved.reservation;
    session = {
      ...session,
      plan: liveReservation.planId,
      credits: reserved.availableCredits,
    };
    await saveSession(session);
    const releaseReservation = async (reason: string): Promise<boolean> => {
      if (!liveReservation) return false;
      const released = await releaseStrictLiveGeneration(
        liveReservation,
        reason
      );
      if (!released.ok) return false;
      session = {
        ...session,
        credits: released.data.availableCredits,
      };
      await saveSession(session);
      liveReservation = null;
      return true;
    };

    const model = modelForTier({
      freeTier: false,
      prefer: modelPref as ModelPreference,
    });

    // Open process-memory `running` row so Library cancel/timeout/poll work
    // during the long fal.subscribe (previously only terminal rows existed).
    let liveJobId: string | undefined;
    try {
      liveJobId = beginSyncGenerateJob({
        sessionId: session.id,
        effect: preset.slug,
        model,
        watermark: plan.watermark,
        provider: "bytedance-seedance",
        idempotencyKey: ledgerIdempotencyKey,
        // R1b: only promote the fork the client explicitly names.
        retryJobId,
        // Stamp ratio/duration at open so Library remake after fail/cancel
        // still carries the attempted run (not only success completeSync).
        duration: secs,
        aspectRatio: aspect,
        resolution,
      }).id;
    } catch {
      liveJobId = undefined;
    }

    // G6 ops: prove post-debit refund without burning fal when not on production.
    // Never enable on Vercel production or NODE_ENV=production.
    const forceFail =
      process.env.PIKBO_FORCE_GENERATE_FAIL === "1" &&
      process.env.NODE_ENV !== "production" &&
      process.env.VERCEL_ENV !== "production";
    if (forceFail) {
      const released = await releaseReservation("force_fail");
      const failBody: GenerateErrorBody = {
        error:
          released
            ? "Forced generate failure (PIKBO_FORCE_GENERATE_FAIL) — credits restored"
            : "Forced generate failure — reservation release needs review",
        code: "GENERATION_FAILED",
        model,
        session: publicSession(session),
        creditsRefunded: released,
        ...(!released ? { refundUnconfirmed: true } : {}),
      };
      noteFailed(session.id, preset.slug, failBody, liveJobId);
      return err(failBody, 500);
    }

    try {
      fal.config({ credentials: process.env.FAL_KEY });

      let blob: Blob;
      try {
        blob = await (await fetch(image)).blob();
      } catch {
        const released = await releaseReservation("invalid_image");
        const failBody: GenerateErrorBody = {
          error: "Could not read image data",
          code: "INVALID_REQUEST",
          model,
          session: publicSession(session),
          creditsRefunded: released,
          ...(!released ? { refundUnconfirmed: true } : {}),
        };
        noteFailed(session.id, preset.slug, failBody, liveJobId);
        return err(failBody, 400);
      }
      if (!blob || blob.size < 32) {
        const released = await releaseReservation("empty_image");
        const failBody: GenerateErrorBody = {
          error: "Image data empty or too small",
          code: "INVALID_REQUEST",
          model,
          session: publicSession(session),
          creditsRefunded: released,
          ...(!released ? { refundUnconfirmed: true } : {}),
        };
        noteFailed(session.id, preset.slug, failBody, liveJobId);
        return err(failBody, 400);
      }
      const file = new File([blob], "toy.png", {
        type: blob.type || "image/png",
      });
      const imageUrl = await invokeReservedProvider(
        reserved.reservation,
        () => fal.storage.upload(file)
      );

      const input: Record<string, unknown> = {
        prompt,
        image_url: imageUrl,
        duration: seedanceDuration(secs),
        aspect_ratio: aspect,
        resolution,
        generate_audio: !freeTier,
      };
      if (typeof seed === "number" && Number.isFinite(seed) && seed >= 0) {
        input.seed = Math.floor(seed);
      }

      const result = await invokeReservedProvider(
        reserved.reservation,
        () =>
          fal.subscribe(model, {
            input,
            logs: false,
          })
      );

      const data = result.data as { video?: { url?: string } };
      const videoUrl = data?.video?.url;
      if (!videoUrl) {
        const released = await releaseReservation("model_empty");
        const failBody: GenerateErrorBody = {
          error: "Model returned no video",
          code: "MODEL_EMPTY",
          model,
          session: publicSession(session),
          creditsRefunded: released,
          ...(!released ? { refundUnconfirmed: true } : {}),
        };
        noteFailed(session.id, preset.slug, failBody, liveJobId);
        return err(failBody, 502);
      }
      // Refuse non-http(s) / non-relative deliverables (open-redirect / injection).
      // Code must be UNSAFE_URL (image + client + downloads parity — not MODEL_EMPTY).
      if (!isSafeDeliverableUrl(videoUrl)) {
        const released = await releaseReservation("unsafe_url");
        const failBody: GenerateErrorBody = {
          error: "Model returned an unsafe video URL — credits restored",
          code: "UNSAFE_URL",
          model,
          session: publicSession(session),
          creditsRefunded: released,
          ...(!released ? { refundUnconfirmed: true } : {}),
        };
        noteFailed(session.id, preset.slug, failBody, liveJobId);
        return err(failBody, 502);
      }

      const captured = await settleStrictLiveGeneration(
        reserved.reservation,
        result.requestId || liveJobId || reserved.reservation.reservationId
      );
      if (!captured.ok) {
        console.error(
          "[live-reservation] capture failed",
          captured.code,
          captured.error
        );
        // Provider work exists, so releasing would create a free result; but
        // claiming "10 used" would also be false because the durable capture
        // did not commit. Withhold the output and leave the reservation for
        // the R1b reconciliation worker. The same idempotency key remains
        // blocked by the durable job.
        const failBody: GenerateErrorBody = {
          error:
            "The video was generated, but credits could not be finalized. The output is withheld while the durable reservation is reconciled; do not retry with the same idempotency key.",
          code: "DURABLE_CREDITS_UNAVAILABLE",
          model,
          jobId: reserved.reservation.jobId,
          session: publicSession(session),
        };
        return err(failBody, 503);
      }
      liveReservation = null;
      let ledgerJobId = liveJobId;
      try {
        const job = completeSyncGenerateJob({
          jobId: liveJobId,
          sessionId: session.id,
          effect: preset.slug,
          videoUrl,
          demo: false,
          watermark: plan.watermark,
          model,
          duration: secs,
          aspectRatio: aspect,
          resolution,
          costCredits: reserved.reservation.credits,
          creditsOutcome: "10 used",
          requestId: result.requestId || liveJobId,
          provider: "bytedance-seedance",
        });
        ledgerJobId = job.id;
      } catch {
        /* best-effort */
      }
      const payload: GenerateSuccess = {
        // Never expose the raw Free provider URL. Paid/raw keeps provider URL;
        // Free delivery waits for a verified T6 derivative via /api/downloads.
        videoUrl: customerFacingGenerateVideoUrl({
          demo: false,
          watermark: plan.watermark,
          jobId: ledgerJobId || result.requestId || "unavailable",
          videoUrl,
        }),
        demo: false,
        watermark: plan.watermark,
        model,
        duration: secs,
        aspectRatio: aspect,
        resolution,
        session: publicSession(session),
        // Prefer provider requestId; fall back to local ledger id for poll/cancel.
        requestId: result.requestId || ledgerJobId,
        jobId: ledgerJobId,
        provider: "bytedance-seedance",
        // Wave B — echo server-validated recipe + live settlement
        effect: preset.slug,
        costCredits: reserved.reservation.credits,
        creditsOutcome: "10 used",
      };
      return NextResponse.json(payload);
    } catch (e) {
      console.error("generate error:", model, e);
      const released = await releaseReservation("provider_error");
      const raw =
        e && typeof e === "object" && "body" in e
          ? JSON.stringify((e as { body?: unknown }).body)
          : e instanceof Error
            ? e.message
            : "Generation failed";
      const kind = classifyProviderError(raw);
      const fallback =
        e instanceof Error ? e.message : "Generation failed";
      const msg = providerErrorMessage(kind, fallback);
      const http = providerFailHttp(kind);
      const failBody: GenerateErrorBody = {
        error: msg,
        code: http.code,
        model,
        session: publicSession(session),
        creditsRefunded: released,
        ...(!released ? { refundUnconfirmed: true } : {}),
        ...(http.retryAfterSec != null
          ? { retryAfterSec: http.retryAfterSec }
          : {}),
      };
      noteFailed(session.id, preset.slug, failBody, liveJobId);
      return err(
        failBody,
        http.status,
        http.retryAfterSec != null
          ? { "Retry-After": String(http.retryAfterSec) }
          : undefined
      );
    }
  } finally {
    endJob(session.id);
  }
}
