import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { getPreset } from "@/lib/presets";
import { getPlan } from "@/lib/pricing";
import {
  clampDuration,
  modelForPrivateLive,
  normalizeAspect,
  resolutionForTier,
  seedanceDuration,
  SELLER_PACK_LIVE_RESOLUTION,
  sellerPackLiveModelEndpoint,
} from "@/lib/models";
import {
  costAuditForResponse,
  privateLiveSeedanceModel,
} from "@/lib/liveGenerationCostGuard";
import {
  commitDurableProviderSpend,
  releaseDurableProviderSpend,
  reserveDurableProviderSpend,
} from "@/lib/durableProviderBudget";
import {
  ensureSession,
  publicCachedSession,
  publicSession,
  saveSession,
} from "@/lib/session";
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
  recordAmbiguousSettlementStateSafely,
  providerErrorMessage,
  providerFailureSettlementPlan,
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
  reserveStrictLiveGenerationWithAsset,
  settleStrictLiveGeneration,
  type StrictLiveReservation,
} from "@/lib/durableCredits/liveReservation";
import {
  authorizeSellerPackChildLive,
  releaseSellerPackChildAtomic,
  settleSellerPackChildAtomic,
} from "@/lib/durableCredits/sellerPack";
import { supabaseGetPersonalWallet } from "@/lib/durableCredits/supabaseStore";
import { parseSellerPackChildRequest } from "@/lib/durableCredits/sellerPackAtomic";
import {
  resolveBoundToyAssetDataUrl,
  resolveReadyPrivateToyAssetDataUrl,
} from "@/lib/privateToyAssets";
import { recordSellerPackReconciliation } from "@/lib/durableCredits/sellerPackReconciliation";
import { sellerPackItemBySlug } from "@/lib/sellerPackContract";
import { createReservationLifecycle } from "@/lib/reservationLifecycle";
import {
  recordConfirmedPreOutputFailure,
  recordProviderSucceededWithheld,
  recordSettlementUnknown,
} from "@/lib/durableCredits/reconciliation";
import { getAuthUserFromRequest } from "@/lib/supabase/user";
import {
  bindProviderSpendIntent,
  invokeReservedProvider,
  liveGenerationAccess,
} from "@/lib/liveGenerationGate.mjs";
import {
  cachedUploadHonesty,
} from "@/lib/privateLiveBeta.mjs";
import {
  tryConsumePrivateLiveBudget,
} from "@/lib/privateLiveBudgetStore";
import { resolvePrivateLiveAccess } from "@/lib/privateLiveAccessServer";
import { providerCompletionDecision } from "@/lib/generationReliability.mjs";
import {
  beginSyncGenerateJob,
  claimRetryJobForGenerate,
  completeSyncGenerateJob,
  failSyncGenerateJob,
  findJobByIdempotencyKey,
  getJob,
  jobLedgerInFlightRetryAfterSec,
  recordWorkerHeartbeat,
  recordSucceededGenerate,
  type GenerationJob,
} from "@/lib/generationJobs";
import {
  getPrivateGenerationResultByIdempotency,
  savePrivateGenerationResult,
} from "@/lib/privateGenerationResults";

export const runtime = "nodejs";
export const maxDuration = 180;

const PRIVATE_ASSET_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function reconciliationEventId(
  kind: "provider_succeeded" | "release_pending" | "settlement_unknown",
  jobId: string,
  suffix?: string
): string {
  return `recon:${kind}:${jobId}${suffix ? `:${suffix}` : ""}`.slice(0, 160);
}

function packReconciliationEventId(
  kind: "provider_succeeded" | "release_pending" | "settlement_unknown",
  jobId: string,
  attemptKey: string,
  suffix?: string
): string {
  const attemptHash = createHash("sha256")
    .update(attemptKey)
    .digest("hex")
    .slice(0, 24);
  const suffixHash = suffix
    ? createHash("sha256").update(suffix).digest("hex").slice(0, 16)
    : "";
  return `pack-recon:${kind}:${jobId}:${attemptHash}${
    suffixHash ? `:${suffixHash}` : ""
  }`;
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
    session: demo ? publicCachedSession(session) : publicSession(session),
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
    productContract,
    image: imageField,
    assetId,
    extra,
    duration,
    aspectRatio,
    model: modelPref,
    resolution: resPref,
    seed,
    ownsRights,
    allowProviderSpend,
    retryJobId,
    retryToken,
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
  // Paid authority comes from the authenticated durable account, never from
  // the signed browser cookie. Missing/legacy/unknown account plans downgrade
  // to Free here and are checked again inside the transactional reserve RPC.
  const durableWallet = authUser
    ? await supabaseGetPersonalWallet(authUser.id)
    : null;
  const accessPlanId =
    authUser && durableWallet?.planId === "founding_studio"
      ? "founding_studio"
      : "free";
  const privateLive = resolvePrivateLiveAccess(authUser);
  const serverAccess = liveGenerationAccess({
    providerConfigured: Boolean(process.env.FAL_KEY),
    authenticated: Boolean(authUser),
    planId: accessPlanId,
    // Public Free stays blocked until T6 free delivery is ready.
    // Invited private-beta owners may open Free live only with remaining budget
    // (still fail-closed without durable reserve + provider).
    freeDeliveryReady: privateLive.freeDeliveryReady,
  });
  // Request-intent fence: loading/failed capability probes display cached mode.
  // That client state must never be silently upgraded into a credit debit and
  // paid provider call just because the POST independently carries auth.
  const access = bindProviderSpendIntent(serverAccess, allowProviderSpend);

  // Idempotent replay BEFORE image/asset resolve — network retries must not
  // re-upload multi-MB stills or fail on expired assetId after success.
  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey);
  if (authUser && idempotencyKey && access.kind === "live") {
    const durablePrior = await getPrivateGenerationResultByIdempotency({
      userId: authUser.id,
      idempotencyKey,
    });
    if (durablePrior) {
      // Controlled owner-gated download — never embed a short-lived storage
      // signed URL in the success body (mint happens only at /api/downloads).
      const controlledUrl = customerFacingGenerateVideoUrl({
        demo: false,
        watermark: false,
        jobId: durablePrior.jobId,
        videoUrl: "",
      });
      // The private Free allowance is one clip. Do not downgrade a paid
      // cookie on cross-device replay; its durable wallet remains authority.
      if (session.plan === "free" && session.credits !== 0) {
        session = { ...session, credits: 0 };
        await saveSession(session);
      }
      return NextResponse.json<GenerateSuccess>({
        videoUrl: controlledUrl,
        demo: false,
        watermark: false,
        model: durablePrior.model,
        duration: durablePrior.duration,
        aspectRatio: durablePrior.aspectRatio,
        resolution: durablePrior.resolution,
        session: publicSession(session),
        requestId: durablePrior.jobId,
        jobId: durablePrior.jobId,
        providerRequestId: durablePrior.providerRequestId,
        provider: "bytedance-seedance",
        effect: durablePrior.effect,
        costCredits: 10,
        creditsOutcome: "10 used",
        idempotentReplay: true,
        processedUpload: true,
        privateResult: true,
      });
    }
  }
  const hasRetryHandoff = Boolean(retryJobId || retryToken);
  if (
    hasRetryHandoff &&
    (typeof retryJobId !== "string" ||
      retryJobId.length < 8 ||
      typeof retryToken !== "string" ||
      retryToken.length < 16 ||
      !idempotencyKey)
  ) {
    return err(
      {
        error:
          "Retry requires an exact child job id, its one-time token, and a new idempotency key",
        code: "RETRY_TOKEN_INVALID",
        session:
          access.kind === "cached"
            ? publicCachedSession(session)
            : publicSession(session),
      },
      400
    );
  }
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

  const packBinding = parseSellerPackChildRequest(body);
  if (packBinding.kind === "invalid") {
    return err(
      {
        error: packBinding.error,
        code: "INVALID_REQUEST",
        session: publicSession(session),
      },
      400
    );
  }
  // A Seller Pack child is an invite-only private operation. Check the
  // current allowlist before resolving its private input or reserving either
  // provider spend or durable child credits. Ordinary single-Moment requests
  // intentionally keep their existing access path.
  if (packBinding.kind === "pack" && !privateLive.invite.invited) {
    return err(
      {
        error: "Private seller Preview access is required for Launch Pack children",
        code: "LIVE_ACCESS_REQUIRED",
        session: publicSession(session),
      },
      403
    );
  }
  const boundPackInput =
    access.kind === "live" && packBinding.kind === "pack" && authUser
      ? await resolveBoundToyAssetDataUrl({
          ownerUserId: authUser.id,
          packRunId: packBinding.packRunId,
          jobId: packBinding.packJobId,
        })
      : null;
  const directPrivateInput =
    access.kind === "live" &&
    packBinding.kind !== "pack" &&
    authUser &&
    typeof assetId === "string" &&
    PRIVATE_ASSET_ID_RE.test(assetId)
      ? await resolveReadyPrivateToyAssetDataUrl({
          ownerUserId: authUser.id,
          assetId,
        })
      : null;

  // Every direct live Moment must come from the authenticated owner's verified
  // private Storage object. Inline data URLs and the legacy process-local asset
  // registry are cached-demo compatibility only; neither may cross the live
  // provider boundary.
  if (access.kind === "live" && packBinding.kind !== "pack") {
    if (
      !authUser ||
      typeof assetId !== "string" ||
      !PRIVATE_ASSET_ID_RE.test(assetId) ||
      !directPrivateInput
    ) {
      return err(
        {
          error:
            "Your private toy photo is missing or not ready. Upload it again before generating.",
          code: "ASSET_NOT_FOUND",
          session: publicSession(session),
        },
        404
      );
    }
  }

  // Cached previews never inspect the user's still. Live Pack children ignore
  // client image bytes and resolve the one owner-verified server-bound asset.
  const image =
    access.kind === "cached"
      ? undefined
      : packBinding.kind === "pack"
        ? boundPackInput?.dataUrl
        : directPrivateInput?.dataUrl;

  if (access.kind !== "cached" && (!image || !isValidImageDataUrl(image))) {
    return err(
      {
        error:
          packBinding.kind === "pack"
            ? "The Launch Pack private input is missing or no longer usable"
            : "A toy photo is required (JPEG, PNG, WebP, or GIF data URL)",
        code: "INVALID_REQUEST",
      },
      400
    );
  }
  if (access.kind !== "cached" && image && image.length > 12_000_000) {
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

  // Seller Pack child binding (optional). When present, live spend uses the
  // parent 30-credit pack reservation and never opens R1a per-generation reserve.
  const packChild =
    packBinding.kind === "pack"
      ? {
          packRunId: packBinding.packRunId,
          packJobId: packBinding.packJobId,
        }
      : null;
  // Mutable pack context filled after authorize (for settle/release backends).
  let activePackChild: {
    packRunId: string;
    packJobId: string;
    userId: string;
    attemptKey: string;
  } | null = null;

  // Reservation lifecycle: release ≤1, never release after settle/withhold.
  // finally → safetyNetRelease only while phase === reserved.
  const reservationLife = createReservationLifecycle({
    release: async (reservation, reason) => {
      if (activePackChild) {
        const released = await releaseSellerPackChildAtomic({
          userId: activePackChild.userId,
          packRunId: activePackChild.packRunId,
          jobId: activePackChild.packJobId,
          attemptKey: activePackChild.attemptKey,
          reason,
        });
        if (!released.ok) return { ok: false, error: released.error };
        return {
          ok: true,
          availableCredits: released.data.availableCredits,
        };
      }
      const released = await releaseStrictLiveGeneration(reservation, reason);
      if (!released.ok) return { ok: false, error: released.error };
      return {
        ok: true,
        availableCredits: released.data.availableCredits,
      };
    },
    settle: async (reservation, providerRequestId) => {
      if (activePackChild) {
        const captured = await settleSellerPackChildAtomic({
          userId: activePackChild.userId,
          packRunId: activePackChild.packRunId,
          jobId: activePackChild.packJobId,
          attemptKey: activePackChild.attemptKey,
          providerRequestId,
        });
        if (!captured.ok) return { ok: false, error: captured.error };
        return {
          ok: true,
          availableCredits: captured.data.availableCredits,
        };
      }
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
    const plan = getPlan(accessPlanId);
    const freeTier = plan.watermark;
    // Live Seller Pack children use the fixed 5s + aspect contract from the
    // frozen pack item, not client-supplied duration/aspect overrides.
    const packItem = packChild ? sellerPackItemBySlug(preset.slug) : undefined;
    if (packChild && !packItem) {
      return err(
        {
          error:
            "Seller Pack children must use the frozen Launch Pack effect contract",
          code: "INVALID_REQUEST",
          session: publicSession(session),
        },
        400
      );
    }
    // Launch validation exposes one real cost envelope only: 5 seconds.
    // A broader duration selector may remain visible for cached prototypes,
    // but no private provider request can turn it into an unpriced 10s call.
    const secs = access.kind === "live"
      ? 5
      : packItem
        ? packItem.durationSec
        : freeTier
          ? 5
          : clampDuration(duration, preset.duration);
    const aspect = packItem
      ? packItem.aspectRatio
      : normalizeAspect(aspectRatio, preset.aspectRatio);
    const resolution = access.kind === "live"
      ? SELLER_PACK_LIVE_RESOLUTION
      : resolutionForTier(freeTier, resPref);

    // Founding Studio sells directed Moments, not arbitrary access to a model
    // or prompt box. The client names the product contract, then the server
    // independently verifies every priced field. Extra prompt text is ignored
    // for this contract below so a renamed request cannot become unpriced work.
    const fixedMomentRequest =
      !packChild &&
      productContract === "toy-moment-v1" &&
      effect === "street-power-up" &&
      duration === 5 &&
      aspectRatio === "9:16" &&
      modelPref === "seedance-fast" &&
      resPref === "720p";

    // Always keep preset template as base — freeform-only used to wipe toy prompts.
    const prompt = buildGeneratePrompt(
      preset.promptTemplate,
      fixedMomentRequest ? undefined : extra
    );

    // Cost gate: anonymous users and Free accounts always receive an official
    // cached clip, even when FAL_KEY exists. The upload is not processed.
    if (access.kind === "cached") {
      let cachedRetryJobId: string | undefined;
      if (hasRetryHandoff) {
        const claimed = claimRetryJobForGenerate({
          sessionId: session.id,
          retryJobId: retryJobId!,
          retryToken: retryToken!,
          idempotencyKey: ledgerIdempotencyKey!,
          effect: preset.slug,
          model: "demo-cached",
          watermark: plan.watermark,
          provider: "demo-cached",
          duration: secs,
          aspectRatio: aspect,
          resolution,
        });
        if (!claimed.ok) {
          return err(
            {
              error: claimed.message,
              code: claimed.code,
              session: publicSession(session),
            },
            claimed.code === "RETRY_JOB_NOT_READY" ? 409 : 400
          );
        }
        cachedRetryJobId = claimed.job.id;
      }
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
      const hadUpload = Boolean(
        (typeof imageField === "string" && imageField.length > 32) ||
          (typeof assetId === "string" && assetId.length > 4)
      );
      const honesty = cachedUploadHonesty({
        accessKind: "cached",
        hadUpload,
        reason: access.reason,
      });
      const payload: GenerateSuccess = {
        videoUrl,
        demo: true,
        demoReason: access.reason,
        watermark: plan.watermark,
        model: "demo-cached",
        duration: secs,
        aspectRatio: aspect,
        resolution,
        session: publicCachedSession(session),
        // Wave B — echo server-validated recipe + free settlement
        effect: preset.slug,
        costCredits: 0,
        creditsOutcome: "0 cached",
        processedUpload: honesty.processedUpload === true,
        ...(honesty.uploadIgnored
          ? {
              uploadIgnored: true,
              uploadIgnoredReason: honesty.uploadIgnoredReason,
            }
          : {}),
      };
      try {
        const job = cachedRetryJobId
          ? completeSyncGenerateJob({
              jobId: cachedRetryJobId,
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
            })
          : recordSucceededGenerate({
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

    // The cached branch has returned. A live request must still carry the
    // validated private input established above; keep this explicit so an
    // authorization refactor cannot accidentally call the provider without it.
    const liveImage = image;
    if (!liveImage) {
      return err(
        {
          error: "A validated toy photo is required for live generation",
          code: "INVALID_REQUEST",
          session: publicSession(session),
        },
        400
      );
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
    // Every direct live request, including an invited validation allowance,
    // is the same server-verified product. A free invite must not become an
    // arbitrary effect/aspect/model back door.
    if (!packChild && !fixedMomentRequest) {
      return err(
        {
          error:
            "Live generation requires the fixed Street Power-Up Moment contract",
          code: "LIVE_ACCESS_REQUIRED",
          session: publicSession(session),
        },
        403
      );
    }
    // P0 single clips and P1 pack children use the same pinned Fast endpoint.
    const model = packChild
      ? sellerPackLiveModelEndpoint()
      : modelForPrivateLive(modelPref);
    if (!packChild && model !== privateLiveSeedanceModel(modelPref)) {
      return err(
        {
          error: "Private live model selection failed closed",
          code: "INVALID_REQUEST",
          model,
          session: publicSession(session),
        },
        500
      );
    }
    // Non-production provider validation uses a database-atomic cumulative
    // budget capped at US$20. Production and unconfigured environments fail
    // before credits or provider work. Estimates stay explicitly labeled.
    const costAdmission = await reserveDurableProviderSpend({
      userId: authUser.id,
      idempotencyKey,
      durationSec: secs,
      resolution,
      modelId: model,
    });
    if (!costAdmission.ok) {
      const code =
        costAdmission.code === "PAID_CEILING_EXHAUSTED"
          ? ("PAID_CEILING_EXHAUSTED" as const)
          : costAdmission.code === "JOB_IN_FLIGHT"
            ? ("JOB_IN_FLIGHT" as const)
          : costAdmission.code === "PAID_CEILING_UNAVAILABLE"
            ? ("PAID_CEILING_UNAVAILABLE" as const)
            : ("PAID_CEILING_ZERO" as const);
      return err(
        {
          error: costAdmission.error,
          code,
          model,
          session: publicSession(session),
        },
        code === "JOB_IN_FLIGHT" ? 409 : 403
      );
    }
    const providerSpendReservation = costAdmission.reservation;
    let providerSpendHeld = true;
    const releaseProviderSpendIfHeld = async () => {
      if (!providerSpendHeld) return true;
      const released = await releaseDurableProviderSpend(
        providerSpendReservation
      );
      if (released) providerSpendHeld = false;
      return released;
    };
    const commitProviderSpendIfHeld = async () => {
      if (!providerSpendHeld) return true;
      const committed = await commitDurableProviderSpend(
        providerSpendReservation
      );
      if (committed) providerSpendHeld = false;
      return committed;
    };
    // Private Free live: consume one process-local admission slot after access
    // is live and before durable reserve/provider work. Durable wallet +
    // reservation remains the real cross-instance spend authority.
    if (
      accessPlanId === "free" &&
      privateLive.invite.invited &&
      !privateLive.t6FreeLiveDeliveryReady
    ) {
      const consume = tryConsumePrivateLiveBudget(
        authUser.id,
        privateLive.budgetMax
      );
      if (!consume.ok) {
        await releaseProviderSpendIfHeld();
        return err(
          {
            error:
              "Private live generation budget exhausted for this account — wait for a higher cap or T6 free delivery",
            code: "LIVE_ACCESS_REQUIRED",
            session: publicSession(session),
          },
          403
        );
      }
    }
    // Pack children: authorize against the parent 30-credit reservation.
    // Non-pack live: strict R1a per-generation reserve (unchanged).
    let reserved:
      | {
          ok: true;
          reservation: StrictLiveReservation;
          availableCredits: number;
        }
      | {
          ok: false;
          code:
            | "DURABLE_CREDITS_UNAVAILABLE"
            | "LIVE_ACCESS_REQUIRED"
            | "INSUFFICIENT_CREDITS"
            | "JOB_IN_FLIGHT"
            | "RESERVATION_FAILED"
            | string;
          error: string;
          need?: number;
          have?: number;
        };

    if (packChild) {
      if (!packItem) {
        return err(
          {
            error: "Seller Pack child contract mismatch",
            code: "INVALID_REQUEST",
            session: publicSession(session),
          },
          400
        );
      }
      const packAuth = await authorizeSellerPackChildLive({
        userId: authUser.id,
        packRunId: packChild.packRunId,
        jobId: packChild.packJobId,
        effectSlug: packItem.slug,
        durationSec: packItem.durationSec,
        aspectRatio: packItem.aspectRatio,
        attemptKey: idempotencyKey,
      });
      if (!packAuth.ok) {
        reserved = {
          ok: false,
          code: packAuth.code,
          error: packAuth.error,
          need: packAuth.need,
          have: packAuth.have,
        };
      } else {
        activePackChild = {
          packRunId: packChild.packRunId,
          packJobId: packChild.packJobId,
          userId: authUser.id,
          attemptKey: packAuth.attemptKey,
        };
        reserved = {
          ok: true,
          reservation: packAuth.reservation,
          availableCredits: packAuth.availableCredits,
        };
      }
    } else {
      // Direct Moment: durable reserve must bind the already-verified owner
      // photo before invokeReservedProvider can run. Flux stills keep the
      // no-asset reserveStrictLiveGeneration path on /api/image.
      if (
        typeof assetId !== "string" ||
        !PRIVATE_ASSET_ID_RE.test(assetId) ||
        !directPrivateInput
      ) {
        await releaseProviderSpendIfHeld();
        return err(
          {
            error:
              "Your private toy photo is missing or not ready. Upload it again before generating.",
            code: "ASSET_NOT_FOUND",
            session: publicSession(session),
          },
          404
        );
      }
      reserved = await reserveStrictLiveGenerationWithAsset({
        userId: authUser.id,
        idempotencyKey,
        effectSlug: preset.slug,
        inputAssetId: assetId,
        rightsConfirmed: true,
      });
    }
    if (!reserved.ok) {
      await releaseProviderSpendIfHeld();
      const status =
        reserved.code === "INSUFFICIENT_CREDITS"
          ? 402
          : reserved.code === "JOB_IN_FLIGHT" ||
              reserved.code === "IDEMPOTENCY_CONFLICT" ||
              reserved.code === "LEGACY_JOB_INPUT_UNBOUND"
            ? 409
          : reserved.code === "INPUT_ASSET_NOT_FOUND" ||
              reserved.code === "INPUT_ASSET_NOT_READY" ||
              reserved.code === "INPUT_ASSET_REQUIRED"
            ? 404
          : reserved.code === "LIVE_ACCESS_REQUIRED" ||
              reserved.code === "PACK_NOT_FOUND" ||
              reserved.code === "JOB_BINDING_MISMATCH" ||
              reserved.code === "CHILD_ALREADY_SUCCEEDED" ||
              reserved.code === "CHILD_REQUIRES_RETRY" ||
              reserved.code === "PACK_CHILD_CONTRACT_MISMATCH" ||
              reserved.code === "RIGHTS_CONFIRMATION_REQUIRED"
            ? 403
            : 503;
      const code = (
        reserved.code === "INSUFFICIENT_CREDITS" ||
        reserved.code === "LIVE_ACCESS_REQUIRED" ||
        reserved.code === "DURABLE_CREDITS_UNAVAILABLE" ||
        reserved.code === "JOB_IN_FLIGHT" ||
        reserved.code === "RESERVATION_FAILED"
          ? reserved.code
          : reserved.code === "INPUT_ASSET_NOT_FOUND" ||
              reserved.code === "INPUT_ASSET_NOT_READY" ||
              reserved.code === "INPUT_ASSET_REQUIRED"
            ? "ASSET_NOT_FOUND"
          : reserved.code === "RIGHTS_CONFIRMATION_REQUIRED"
            ? "RIGHTS_REQUIRED"
          : reserved.code === "PACK_NOT_FOUND" ||
              reserved.code === "JOB_BINDING_MISMATCH" ||
              reserved.code === "CHILD_ALREADY_SUCCEEDED" ||
              reserved.code === "CHILD_REQUIRES_RETRY" ||
              reserved.code === "PACK_CHILD_CONTRACT_MISMATCH" ||
              reserved.code === "IDEMPOTENCY_CONFLICT" ||
              reserved.code === "LEGACY_JOB_INPUT_UNBOUND"
            ? "INVALID_REQUEST"
            : "RESERVATION_FAILED"
      ) as GenerateErrorBody["code"];
      return err(
        {
          error: reserved.error,
          code,
          need: reserved.need,
          have: reserved.have,
          session: publicSession(session),
        },
        status
      );
    }
    reservationLife.assign(reserved.reservation);
    session = {
      ...session,
      plan: reserved.reservation.planId,
      credits: reserved.availableCredits,
    };
    const preProviderReleaseReasons = new Set([
      "retry_claim_rejected",
      "force_fail",
      "invalid_image",
      "empty_image",
      "deadline_before_upload",
      "deadline_before_generation",
      "provider_error_before_submit",
      "provider_rejected_before_execution",
      "unexpected_exit_safety_net",
    ]);
    const releaseReservation = async (reason: string): Promise<boolean> => {
      if (preProviderReleaseReasons.has(reason)) {
        await releaseProviderSpendIfHeld();
      }
      const target = reservationLife.get() ?? reserved.reservation;
      const released = await reservationLife.release(reason);
      if (released.skipped) {
        // Already settled / released / withheld — do not re-hit backend.
        return false;
      }
      if (!released.ok) {
        const confirmedPreOutput = preProviderReleaseReasons.has(reason);
        const eventKind = confirmedPreOutput
          ? "release_pending"
          : "settlement_unknown";
        const eventId = activePackChild
          ? packReconciliationEventId(
              eventKind,
              target.jobId,
              activePackChild.attemptKey,
              reason
            )
          : reconciliationEventId(eventKind, target.jobId, reason);
        const recorded = activePackChild
          ? await recordSellerPackReconciliation({
              userId: activePackChild.userId,
              packRunId: activePackChild.packRunId,
              jobId: activePackChild.packJobId,
              attemptKey: activePackChild.attemptKey,
              eventId,
              eventType: confirmedPreOutput
                ? "confirmed_pre_output_failure"
                : "settlement_unknown",
              reason,
            })
          : confirmedPreOutput
            ? await recordConfirmedPreOutputFailure(target, {
                eventId,
                reason,
              })
            : await recordSettlementUnknown(target, {
                eventId,
                reason,
              });
        if (!recorded.ok) {
          console.error(
            "[live-reconciliation] release enqueue failed",
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

    // Private Preview results are copied into authenticated, server-owned
    // storage. They are not public Free/T6 deliverables and never use a raw
    // provider URL as the customer result.
    const privateResultWatermark = false;

    // Open or explicitly claim the exact retry child before provider work.
    // Effect/prompt/list-order matching is intentionally forbidden.
    let liveJobId: string;
    if (hasRetryHandoff) {
      const claimed = claimRetryJobForGenerate({
        sessionId: session.id,
        retryJobId: retryJobId!,
        retryToken: retryToken!,
        idempotencyKey: ledgerIdempotencyKey!,
        effect: preset.slug,
        model,
        watermark: privateResultWatermark,
        provider: "bytedance-seedance",
        duration: secs,
        aspectRatio: aspect,
        resolution,
      });
      if (!claimed.ok) {
        const released = await releaseReservation("retry_claim_rejected");
        const failBody: GenerateErrorBody = {
          error: claimed.message,
          code: claimed.code,
          session: publicSession(session),
          creditsRefunded: released,
          ...(!released ? { refundUnconfirmed: true } : {}),
        };
        return err(
          failBody,
          claimed.code === "RETRY_JOB_NOT_READY" ? 409 : 400
        );
      }
      liveJobId = claimed.job.id;
    } else {
      liveJobId = beginSyncGenerateJob({
        sessionId: session.id,
        effect: preset.slug,
        model,
        watermark: privateResultWatermark,
        provider: "bytedance-seedance",
        idempotencyKey: ledgerIdempotencyKey,
        duration: secs,
        aspectRatio: aspect,
        resolution,
      }).id;
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

    let providerRequestStarted = false;
    try {
      fal.config({ credentials: process.env.FAL_KEY });

      let blob: Blob;
      try {
        blob = await (await fetch(liveImage)).blob();
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
      const uploadHeartbeat = recordWorkerHeartbeat(liveJobId);
      if (!uploadHeartbeat || uploadHeartbeat.status !== "running") {
        const released = await releaseReservation("deadline_before_upload");
        const failBody: GenerateErrorBody = {
          error: "Generation deadline expired before provider upload",
          code: "TIMEOUT",
          model,
          jobId: liveJobId,
          session: publicSession(session),
          creditsRefunded: released,
          ...(!released ? { refundUnconfirmed: true } : {}),
        };
        noteFailed(session.id, preset.slug, failBody, liveJobId);
        return err(failBody, 504);
      }
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

      const generationHeartbeat = recordWorkerHeartbeat(liveJobId);
      if (!generationHeartbeat || generationHeartbeat.status !== "running") {
        const released = await releaseReservation("deadline_before_generation");
        const failBody: GenerateErrorBody = {
          error: "Generation deadline expired before the model started",
          code: "TIMEOUT",
          model,
          jobId: liveJobId,
          session: publicSession(session),
          creditsRefunded: released,
          ...(!released ? { refundUnconfirmed: true } : {}),
        };
        noteFailed(session.id, preset.slug, failBody, liveJobId);
        return err(failBody, 504);
      }
      providerRequestStarted = true;
      const result = await invokeReservedProvider(
        reserved.reservation,
        () =>
          fal.subscribe(model, {
            input,
            logs: false,
          })
      );
      // Once the model request was sent, conservatively count the labeled
      // estimate against the validation ceiling even if delivery later fails.
      // A failed transition leaves the amount reserved, which still enforces
      // the hard cap and can be reconciled without inventing actual USD.
      if (!(await commitProviderSpendIfHeld())) {
        console.error("[provider-budget] commit pending");
      }

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

      const providerRequestId =
        typeof result.requestId === "string" && result.requestId.trim()
          ? result.requestId.trim().slice(0, 256)
          : null;
      if (!providerRequestId) {
        const released = await releaseReservation(
          "provider_request_id_missing"
        );
        const failBody: GenerateErrorBody = {
          error: released
            ? "The provider returned a video without an auditable request ID. No credits were used."
            : "The provider returned a video without an auditable request ID. Credit release needs review.",
          code: "DELIVERY_PIPELINE_UNAVAILABLE",
          model,
          jobId: reserved.reservation.jobId,
          session: publicSession(session),
          creditsRefunded: released,
          ...(!released ? { refundUnconfirmed: true } : {}),
        };
        noteFailed(session.id, preset.slug, failBody, liveJobId);
        return err(failBody, 502);
      }
      const saved = await savePrivateGenerationResult({
        jobId: reserved.reservation.jobId,
        userId: authUser.id,
        attemptKey: activePackChild?.attemptKey ?? null,
        providerRequestId,
        providerOutputUrl: videoUrl,
        effect: preset.slug,
        model,
        duration: secs,
        aspectRatio: aspect,
        resolution,
      });
      if (!saved.ok) {
        if (saved.settlementUncertain) {
          // The attach transaction may have committed even though its response
          // was lost. Deleting/refunding here could produce a free private
          // output or poison a deterministic retry. Withhold and let the
          // Worker discover the exact current Pack attempt (or R1c review it).
          reservationLife.markWithheld("private_attach_uncertain");
          const uncertainEventId = activePackChild
            ? packReconciliationEventId(
                "settlement_unknown",
                reserved.reservation.jobId,
                activePackChild.attemptKey,
                saved.code
              )
            : reconciliationEventId(
                "settlement_unknown",
                reserved.reservation.jobId,
                saved.code
              );
          const recorded = activePackChild
            ? await recordSellerPackReconciliation({
                userId: activePackChild.userId,
                packRunId: activePackChild.packRunId,
                jobId: activePackChild.packJobId,
                attemptKey: activePackChild.attemptKey,
                eventId: uncertainEventId,
                eventType: "settlement_unknown",
                providerRequestId,
                reason: saved.code,
              })
            : await recordSettlementUnknown(reserved.reservation, {
                eventId: uncertainEventId,
                reason: saved.code,
              });
          if (!recorded.ok) {
            console.error(
              "[live-reconciliation] private attach enqueue failed",
              recorded.code
            );
          }
          const failBody: GenerateErrorBody = {
            error:
              "The model finished, but private delivery confirmation was interrupted. Credits and output are withheld while reconciliation verifies the durable result.",
            code: "DURABLE_CREDITS_UNAVAILABLE",
            model,
            jobId: reserved.reservation.jobId,
            session: publicSession(session),
            refundUnconfirmed: true,
          };
          noteFailed(session.id, preset.slug, failBody, liveJobId);
          return err(failBody, 503);
        }
        const released = await releaseReservation("delivery_save_failed");
        const failBody: GenerateErrorBody = {
          error: released
            ? `The model finished, but Pikbo could not save the private result (${saved.code}). No credits were used.`
            : `The model finished, but Pikbo could not save the private result (${saved.code}). Credit release needs review.`,
          code: "DELIVERY_PIPELINE_UNAVAILABLE",
          model,
          jobId: reserved.reservation.jobId,
          session: publicSession(session),
          creditsRefunded: released,
          ...(!released ? { refundUnconfirmed: true } : {}),
        };
        noteFailed(session.id, preset.slug, failBody, liveJobId);
        return err(failBody, 502);
      }

      // fal may return after the fixed local deadline. Do not let a browser
      // poll or late provider response reopen the attempt, and do not claim a
      // refund/capture until R1c reconciliation inspects the durable job.
      const deadlineState = getJob(liveJobId);
      const completionDecision = providerCompletionDecision(deadlineState);
      if (!completionDecision.allow) {
        // Provider output already exists. Close the release path before any
        // reconciliation I/O, because that I/O may itself throw.
        reservationLife.markWithheld(completionDecision.code);
        const lateEventId = activePackChild
          ? packReconciliationEventId(
              "provider_succeeded",
              reserved.reservation.jobId,
              activePackChild.attemptKey
            )
          : reconciliationEventId(
              "provider_succeeded",
              reserved.reservation.jobId
            );
        const recorded = activePackChild
          ? await recordSellerPackReconciliation({
              userId: activePackChild.userId,
              packRunId: activePackChild.packRunId,
              jobId: activePackChild.packJobId,
              attemptKey: activePackChild.attemptKey,
              eventId: lateEventId,
              eventType: "provider_succeeded",
              providerRequestId,
              reason: completionDecision.code,
            })
          : await recordProviderSucceededWithheld(
              reserved.reservation,
              {
                eventId: lateEventId,
                providerRequestId,
                outputRef: videoUrl,
                reason: completionDecision.code,
              }
            );
        if (!recorded.ok) {
          console.error(
            "[live-reconciliation] late output enqueue failed",
            recorded.code
          );
        }
        const failBody: GenerateErrorBody = {
          error: completionDecision.message,
          code: completionDecision.code,
          model,
          jobId: liveJobId,
          session: publicSession(session),
          refundUnconfirmed: true,
        };
        return err(failBody, completionDecision.httpStatus);
      }

      const captured = await reservationLife.settle(
        providerRequestId
      );
      if (!captured.ok) {
        console.error("[live-reservation] capture failed");
        // settle() already moves failed/thrown capture to withheld. Keep this
        // explicit for route readability and future lifecycle implementations.
        reservationLife.markWithheld("capture_failed");
        const captureEventId = activePackChild
          ? packReconciliationEventId(
              "provider_succeeded",
              reserved.reservation.jobId,
              activePackChild.attemptKey
            )
          : reconciliationEventId(
              "provider_succeeded",
              reserved.reservation.jobId
            );
        const recorded = activePackChild
          ? await recordSellerPackReconciliation({
              userId: activePackChild.userId,
              packRunId: activePackChild.packRunId,
              jobId: activePackChild.packJobId,
              attemptKey: activePackChild.attemptKey,
              eventId: captureEventId,
              eventType: "provider_succeeded",
              providerRequestId,
              reason: "capture_failed",
            })
          : await recordProviderSucceededWithheld(
              reserved.reservation,
              {
                eventId: captureEventId,
                providerRequestId,
                outputRef: videoUrl,
                reason: "capture_failed",
              }
            );
        if (!recorded.ok) {
          console.error(
            "[live-reconciliation] capture enqueue failed",
            recorded.code
          );
        }
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
      // Object + settlement are durable. Customer-facing success always uses
      // the owner-gated download path — short-lived storage signed URLs are
      // minted only inside GET /api/downloads (never embedded in JSON).
      const privateDeliveryUrl = customerFacingGenerateVideoUrl({
        demo: false,
        watermark: privateResultWatermark,
        jobId: reserved.reservation.jobId,
        videoUrl: "",
      });
      try {
        completeSyncGenerateJob({
          jobId: liveJobId,
          sessionId: session.id,
          effect: preset.slug,
          videoUrl: privateDeliveryUrl,
          demo: false,
          watermark: privateResultWatermark,
          model,
          duration: secs,
          aspectRatio: aspect,
          resolution,
          costCredits: reserved.reservation.credits,
          creditsOutcome: "10 used",
          requestId: reserved.reservation.jobId,
          provider: "bytedance-seedance",
        });
      } catch {
        /* best-effort */
      }
      const payload: GenerateSuccess = {
        // Private Preview returns only the controlled owner download path.
        // The raw provider URL and storage signed URLs never cross this boundary.
        videoUrl: privateDeliveryUrl,
        demo: false,
        watermark: privateResultWatermark,
        model,
        duration: secs,
        aspectRatio: aspect,
        resolution,
        session: publicSession(session),
        // Public request/job identity is the durable Supabase job. Provider
        // evidence remains a separate field and is never a delivery URL.
        requestId: reserved.reservation.jobId,
        jobId: reserved.reservation.jobId,
        providerRequestId,
        provider: "bytedance-seedance",
        // Wave B — echo server-validated recipe + live settlement
        effect: preset.slug,
        costCredits: reserved.reservation.credits,
        creditsOutcome: "10 used",
        processedUpload: true,
        privateResult: true,
        costAudit: costAuditForResponse(providerSpendReservation.audit),
      };
      return NextResponse.json(payload);
    } catch (e) {
      console.error("generate error:", model, e);
      const raw =
        e && typeof e === "object" && "body" in e
          ? JSON.stringify((e as { body?: unknown }).body)
          : e instanceof Error
            ? e.message
            : "Generation failed";
      const kind = classifyProviderError(raw);
      const settlementPlan = providerFailureSettlementPlan({
        kind,
        providerRequestStarted,
      });

      if (settlementPlan.action === "withhold") {
        const target = reserved.reservation;
        const eventId = activePackChild
          ? packReconciliationEventId(
              "settlement_unknown",
              target.jobId,
              activePackChild.attemptKey,
              settlementPlan.reason
            )
          : reconciliationEventId(
              "settlement_unknown",
              target.jobId,
              settlementPlan.reason
            );
        const safeguard = await recordAmbiguousSettlementStateSafely({
          reason: settlementPlan.reason,
          markWithheld: reservationLife.markWithheld,
          commitProviderSpend: commitProviderSpendIfHeld,
          recordReconciliation: () =>
            activePackChild
              ? recordSellerPackReconciliation({
                  userId: activePackChild.userId,
                  packRunId: activePackChild.packRunId,
                  jobId: activePackChild.packJobId,
                  attemptKey: activePackChild.attemptKey,
                  eventId,
                  eventType: "settlement_unknown",
                  reason: settlementPlan.reason,
                })
              : recordSettlementUnknown(target, {
                  eventId,
                  reason: settlementPlan.reason,
                }),
        });
        if (!safeguard.providerSpendCommitted) {
          console.error("[provider-budget] failure commit pending");
        }
        if (!safeguard.reconciliationRecorded) {
          console.error(
            "[live-reconciliation] provider outcome enqueue failed",
            safeguard.reconciliationCode
          );
        }
        const failBody: GenerateErrorBody = {
          error: settlementPlan.error,
          code: settlementPlan.code,
          model,
          jobId: target.jobId,
          session: publicSession(session),
          refundUnconfirmed: settlementPlan.refundUnconfirmed,
        };
        // Do not stamp the process ledger terminal-failed. Durable Pack/R1
        // reconciliation owns the outcome and keeps retry closed meanwhile.
        return err(failBody, settlementPlan.status);
      }

      await releaseProviderSpendIfHeld();
      const released = await releaseReservation(settlementPlan.reason);
      const fallback =
        e instanceof Error ? e.message : "Generation failed";
      const msg = released
        ? providerErrorMessage(kind, fallback)
        : "The provider did not start the video, but credit release is still being verified.";
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
    // Defense-in-depth: only while still reserved (never after settle/withhold).
    // release backend is invoked at most once (lifecycle guard).
    try {
      if (runSafetyNetRelease) {
        await runSafetyNetRelease();
      } else {
        await reservationLife.safetyNetRelease();
      }
    } catch {
      /* best-effort — reconciliation worker will pick up */
    }
    endJob(session.id);
  }
}
