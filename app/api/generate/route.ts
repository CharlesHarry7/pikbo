import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { getPreset } from "@/lib/presets";
import { getPlan } from "@/lib/pricing";
import { checkCredits, deductCredits, refundCredits } from "@/lib/credits";
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
import { isSafeDeliverableUrl } from "@/lib/createTrust";
import { buildGeneratePrompt } from "@/lib/promptBuild";
import type {
  GenerateErrorBody,
  GenerateRequestBody,
  GenerateSuccess,
} from "@/lib/contracts";
import {
  shadowRelease,
  shadowReserveForGenerate,
  shadowSettle,
  type ShadowReservation,
} from "@/lib/durableCredits/shadow";
import { getAuthUserFromRequest } from "@/lib/supabase/user";
import {
  beginSyncGenerateJob,
  completeSyncGenerateJob,
  failSyncGenerateJob,
  findJobByIdempotencyKey,
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
  return {
    videoUrl: job.videoUrl!,
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
    ...(demo ? { demoReason: "no_provider_key" as const } : {}),
    ...(replay ? { idempotentReplay: true } : {}),
  };
}

function noteFailed(
  sessionId: string,
  effect: string,
  body: GenerateErrorBody,
  jobId?: string
) {
  try {
    failSyncGenerateJob({
      jobId,
      sessionId,
      effect,
      error: body.error,
      errorCode: body.code,
      model: body.model,
      creditsRefunded: body.creditsRefunded,
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

  // Idempotent replay BEFORE image/asset resolve — network retries must not
  // re-upload multi-MB stills or fail on expired assetId after success.
  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey);
  if (idempotencyKey) {
    const prior = findJobByIdempotencyKey(session.id, idempotencyKey);
    if (prior) {
      if (
        prior.status === "succeeded" &&
        prior.videoUrl &&
        isSafeDeliverableUrl(prior.videoUrl)
      ) {
        return NextResponse.json(successFromJob(prior, session, true));
      }
      if (prior.status === "running" || prior.status === "queued") {
        const retryAfterSec = jobInFlightRetryAfterSec(session.id);
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
        const code =
          (prior.errorCode as GenerateErrorBody["code"]) || "GENERATION_FAILED";
        const status =
          code === "CONTENT_POLICY"
            ? 422
            : code === "PROVIDER_TIMEOUT"
              ? 504
              : code === "PROVIDER_BALANCE"
                ? 402
                : code === "PROVIDER_RATE_LIMIT"
                  ? 429
                  : code === "UNSAFE_URL" || code === "MODEL_EMPTY"
                    ? 502
                    : 500;
        return err(
          {
            error:
              prior.error ||
              "Prior generate attempt failed — mint a new idempotency key to retry",
            code,
            model: prior.model,
            session: publicSession(session),
            creditsRefunded: prior.creditsRefunded,
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

    // --- Demo path (no provider): free cached Lab clips — matches pricing honesty ---
    if (!process.env.FAL_KEY) {
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
        demoReason: "no_provider_key",
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
          idempotencyKey,
        });
        payload.requestId = job.id;
        payload.jobId = job.id;
      } catch {
        /* best-effort job ledger */
      }
      return NextResponse.json(payload);
    }

    // --- Live path: charge credits only when a real provider call will run ---
    const check = checkCredits(session);
    if (!check.ok) {
      return err(
        {
          error:
            session.plan === "free"
              ? "Free trial used up — upgrade on Pricing, or wait for monthly refresh"
              : "Not enough credits",
          code: "INSUFFICIENT_CREDITS",
          need: check.need,
          have: check.have,
          session: publicSession(session),
        },
        402
      );
    }

    session = deductCredits(session, check.cost);
    await saveSession(session);
    // Optional durable shadow ledger — prefer signed-in Supabase user.
    // Cookie remains authoritative until REQUIRE_DURABLE_CREDITS=1.
    const authUser = await getAuthUserFromRequest(req);
    let shadow: ShadowReservation | null = await shadowReserveForGenerate({
      authUserId: authUser?.id,
      guestSessionId: session.id,
    });

    const model = modelForTier({
      freeTier,
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
        idempotencyKey,
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
      session = refundCredits(session, check.cost);
      await saveSession(session);
      await shadowRelease(shadow, "force_fail");
      shadow = null;
      const failBody: GenerateErrorBody = {
        error:
          "Forced generate failure (PIKBO_FORCE_GENERATE_FAIL) — credits restored",
        code: "GENERATION_FAILED",
        model,
        session: publicSession(session),
        creditsRefunded: true,
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
        session = refundCredits(session, check.cost);
        await saveSession(session);
        await shadowRelease(shadow, "invalid_image");
        const failBody: GenerateErrorBody = {
          error: "Could not read image data",
          code: "INVALID_REQUEST",
          model,
          session: publicSession(session),
          creditsRefunded: true,
        };
        noteFailed(session.id, preset.slug, failBody, liveJobId);
        return err(failBody, 400);
      }
      if (!blob || blob.size < 32) {
        session = refundCredits(session, check.cost);
        await saveSession(session);
        await shadowRelease(shadow, "empty_image");
        const failBody: GenerateErrorBody = {
          error: "Image data empty or too small",
          code: "INVALID_REQUEST",
          model,
          session: publicSession(session),
          creditsRefunded: true,
        };
        noteFailed(session.id, preset.slug, failBody, liveJobId);
        return err(failBody, 400);
      }
      const file = new File([blob], "toy.png", {
        type: blob.type || "image/png",
      });
      const imageUrl = await fal.storage.upload(file);

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

      const result = await fal.subscribe(model, {
        input,
        logs: false,
      });

      const data = result.data as { video?: { url?: string } };
      const videoUrl = data?.video?.url;
      if (!videoUrl) {
        session = refundCredits(session, check.cost);
        await saveSession(session);
        await shadowRelease(shadow, "model_empty");
        const failBody: GenerateErrorBody = {
          error: "Model returned no video",
          code: "MODEL_EMPTY",
          model,
          session: publicSession(session),
          creditsRefunded: true,
        };
        noteFailed(session.id, preset.slug, failBody, liveJobId);
        return err(failBody, 502);
      }
      // Refuse non-http(s) / non-relative deliverables (open-redirect / injection).
      // Code must be UNSAFE_URL (image + client + downloads parity — not MODEL_EMPTY).
      if (!isSafeDeliverableUrl(videoUrl)) {
        session = refundCredits(session, check.cost);
        await saveSession(session);
        await shadowRelease(shadow, "unsafe_url");
        const failBody: GenerateErrorBody = {
          error: "Model returned an unsafe video URL — credits restored",
          code: "UNSAFE_URL",
          model,
          session: publicSession(session),
          creditsRefunded: true,
        };
        noteFailed(session.id, preset.slug, failBody, liveJobId);
        return err(failBody, 502);
      }

      await shadowSettle(shadow, result.requestId);
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
          costCredits: check.cost,
          creditsOutcome: "10 used",
          requestId: result.requestId || liveJobId,
          provider: "bytedance-seedance",
        });
        ledgerJobId = job.id;
      } catch {
        /* best-effort */
      }
      const payload: GenerateSuccess = {
        videoUrl,
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
        costCredits: check.cost,
        creditsOutcome: "10 used",
      };
      return NextResponse.json(payload);
    } catch (e) {
      console.error("generate error:", model, e);
      session = refundCredits(session, check.cost);
      await saveSession(session);
      await shadowRelease(shadow, "provider_error");
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
        creditsRefunded: true,
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
