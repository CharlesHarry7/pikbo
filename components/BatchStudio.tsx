"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import {
  GenerateWaitMobileStrip,
  GenerateWaitStage,
} from "@/components/GenerateWaitStage";
import { GenerateAfterPath } from "@/components/GenerateAfterPath";
import {
  historyFieldsFromSuccess,
  postGenerateWithRetry,
  releaseSellerPackChildClient,
  reserveSellerPackShadowClient,
  settleSellerPackChildClient,
  sleep,
} from "@/lib/generateClient";
import { registerLocalAsset } from "@/lib/clientAssets";
import { pushHistory } from "@/lib/history";
import { CATEGORIES, PRESETS, type CategoryId } from "@/lib/presets";
import { CREDITS_PER_VIDEO } from "@/lib/pricing";
import { isValidImageDataUrl } from "@/lib/providerError";
import { SAMPLE_TOYS, sampleToDataUrl } from "@/lib/samples";
import {
  fetchMe,
  freeTrialExhausted,
  isDemoMode,
  mergeMeSession,
  type MeResponse,
} from "@/lib/meClient";
import { emitSessionRefresh } from "@/lib/sessionEvents";
import {
  canExportSellerPack,
  sellerPackAvailableDownloads,
  sellerPackCsv,
  sellerPackManifest,
  type SellerPackExportItem,
} from "@/lib/sellerPackExport";
import { downloadVideoFile } from "@/lib/history";
import {
  batchQuoteLabel,
  sellerPackBalanceCovers,
  sellerPackQuote,
  sellerPackQuoteLabel,
  sellerPackShortfall,
} from "@/lib/sellerPackQuote";
import {
  canDownloadResult,
  isSafeDeliverableUrl,
  requestCreditStateFromFailure,
} from "@/lib/createTrust";
import { sellerPackPostItems } from "@/lib/deliveryPack";
import { DeliveryChecklist } from "@/components/DeliveryChecklist";
import { GenerateFailPanel } from "@/components/GenerateFailPanel";
import { SellerPackSteps } from "@/components/SellerPackSteps";
import {
  parseSellerPackRecovery,
  reconcileSellerPackRecovery,
  SELLER_PACK_RECOVERY_KEY,
  type SellerPackChildStatus,
  type SellerPackPublicJob,
  type SellerPackRecoveryRun,
} from "@/lib/sellerPackRecovery";

type Job = {
  slug: string;
  name: string;
  status:
    | SellerPackChildStatus;
  error?: string;
  errorCode?: string;
  videoUrl?: string;
  demo?: boolean;
  model?: string;
  aspectRatio?: "9:16" | "1:1" | "16:9";
  duration?: number;
  resolution?: string;
  watermark?: boolean;
  creditState?:
    | "0 cached"
    | "10 used"
    | "10 restored"
    | "refund unconfirmed"
    | "not charged";
  requestId?: string;
  retryCount: number;
};

/** SELLER_PACK PRD v1 — three fixed outputs, not arbitrary batch. */
export const SELLER_PACK_ITEMS = [
  {
    key: "listing_spin",
    slug: "360-spin-showcase",
    label: "Listing Spin",
    channel: "Marketplace gallery",
    aspectRatio: "1:1" as const,
  },
  {
    key: "blind_box_reveal",
    slug: "blind-box-unboxing",
    label: "Blind-box Reveal",
    channel: "Launch / restock",
    aspectRatio: "9:16" as const,
  },
  {
    key: "social_flash",
    slug: "paparazzi-flash",
    label: "Social Flash",
    channel: "TikTok / Reels / Shorts",
    aspectRatio: "9:16" as const,
  },
] as const;

export const SELLER_PACK_SLUGS = SELLER_PACK_ITEMS.map((i) => i.slug);

function selectedMatchesSellerPack(slugs: string[]): boolean {
  if (slugs.length !== SELLER_PACK_SLUGS.length) return false;
  const set = new Set(slugs);
  return SELLER_PACK_SLUGS.every((s) => set.has(s));
}

/** Active-run pointer only: no image/video, balance, credits, or Library history. */
function saveSellerPackRecovery(projectId: string, jobs: Job[]) {
  if (typeof window === "undefined") return;
  const fixed = SELLER_PACK_SLUGS.map((slug) => jobs.find((job) => job.slug === slug));
  if (fixed.some((job) => !job)) return;
  const run: SellerPackRecoveryRun = {
    version: 1,
    projectId,
    savedAt: new Date().toISOString(),
    children: fixed.map((job) => ({
      slug: job!.slug,
      name: job!.name,
      aspectRatio: job!.aspectRatio ?? "9:16",
      requestId: job!.requestId,
      statusHint: job!.status,
      retryCount: job!.retryCount,
    })),
  };
  try {
    sessionStorage.setItem(SELLER_PACK_RECOVERY_KEY, JSON.stringify(run));
  } catch {
    // Private mode / quota can decline this optional current-session pointer.
  }
}

function toRecoveredJob(child: ReturnType<typeof reconcileSellerPackRecovery>["children"][number]): Job {
  const { statusHint: _hint, ...job } = child;
  void _hint;
  return job;
}

function retryEligible(job: Job): boolean {
  if (job.status === "not_started") return true;
  if (job.status === "refunded") return Boolean(job.requestId);
  return (
    job.status === "failed" &&
    job.creditState !== "refund unconfirmed" &&
    Boolean(job.requestId)
  );
}

/**
 * Shop-style batch: one toy photo → several presets in sequence.
 * Supports ?effects=slug1,slug2 and ?pack=seller (Seller Pack MVP).
 */
export function BatchStudio({
  initialEffects,
  pack,
}: {
  initialEffects?: string[];
  /** Named pack from SELLER_PACK PRD — freezes the three seller outputs. */
  pack?: "seller" | string;
}) {
  const isSellerPack = pack === "seller";

  const validInitial = useMemo(() => {
    if (isSellerPack) return [...SELLER_PACK_SLUGS];
    if (!initialEffects?.length) return null;
    return initialEffects.filter((s) => PRESETS.some((p) => p.slug === s));
  }, [initialEffects, isSellerPack]);

  const defaults = useMemo(
    () =>
      validInitial && validInitial.length > 0
        ? validInitial
        : PRESETS.filter((p) =>
            [
              "360-spin-showcase",
              "blind-box-unboxing",
              "paparazzi-flash",
            ].includes(p.slug)
          ).map((p) => p.slug),
    [validInitial]
  );

  const [image, setImage] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>(defaults);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failRetryAfterSec, setFailRetryAfterSec] = useState<number | null>(
    null
  );
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "1:1" | "16:9">(
    "9:16"
  );
  const [duration, setDuration] = useState<5 | 10>(5);
  const [catFilter, setCatFilter] = useState<CategoryId | "all">("all");
  const [me, setMe] = useState<MeResponse | null>(null);
  const [ownsRights, setOwnsRights] = useState(false);
  const [runProjectId, setRunProjectId] = useState<string | null>(null);
  const [sellerPackRecoveryHydrated, setSellerPackRecoveryHydrated] =
    useState(!isSellerPack);
  const [sellerPackRecoveryNote, setSellerPackRecoveryNote] = useState<
    string | null
  >(null);
  /** Wall-clock while pack/batch runs — feeds GenerateWaitStage (1–3 min Mini). */
  const [packElapsed, setPackElapsed] = useState(0);
  /** Abort in-flight pack child + rate-limit waits (parity with Create Cancel). */
  const packAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void fetchMe().then(setMe);
    }, 0);
    return () => {
      window.clearTimeout(t);
      packAbortRef.current?.abort();
      packAbortRef.current = null;
    };
  }, []);

  /**
   * Re-open only this browser's active pack against the current local ledger.
   * The browser hint merely identifies children; `/api/generations` decides
   * whether they still exist and what happened to their credits/results.
   */
  useEffect(() => {
    if (!isSellerPack) return;
    let canceled = false;
    const start = window.setTimeout(() => {
      let saved: SellerPackRecoveryRun | null = null;
      try {
        const raw = sessionStorage.getItem(SELLER_PACK_RECOVERY_KEY);
        saved = raw ? parseSellerPackRecovery(JSON.parse(raw)) : null;
      } catch {
        saved = null;
      }
      if (!saved) {
        setSellerPackRecoveryHydrated(true);
        return;
      }
      setRunProjectId(saved.projectId);
      setSelected([...SELLER_PACK_SLUGS]);
      setSellerPackRecoveryNote("Checking this device/server session for the active Seller Pack…");
      void fetch("/api/generations", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Generation job list unavailable");
        return (await response.json()) as { jobs?: unknown };
      })
      .then((body) => {
        if (canceled) return;
        const listed = Array.isArray(body.jobs)
          ? (body.jobs as SellerPackPublicJob[])
          : [];
        const recovered = reconcileSellerPackRecovery(saved!, listed);
        setJobs(recovered.children.map(toRecoveredJob));
        setSellerPackRecoveryNote(
          recovered.unavailable > 0
            ? `${recovered.unavailable} child${recovered.unavailable === 1 ? "" : "ren"} cannot recover on this device/server session. Old local hints were not treated as results or refunds.`
            : "Active pack restored from this device/server session."
        );
      })
      .catch(() => {
        if (canceled) return;
        const unavailable = reconcileSellerPackRecovery(saved!, []).children.map(
          toRecoveredJob
        );
        setJobs(unavailable);
        setSellerPackRecoveryNote(
          "Cannot recover on this device/server session while generation jobs are unavailable. No local success or refund claim was restored."
        );
      })
        .finally(() => {
          if (!canceled) setSellerPackRecoveryHydrated(true);
        });
      });
    return () => {
      canceled = true;
      window.clearTimeout(start);
    };
  }, [isSellerPack]);

  useEffect(() => {
    if (
      !isSellerPack ||
      !sellerPackRecoveryHydrated ||
      !runProjectId ||
      jobs.length === 0
    ) {
      return;
    }
    saveSellerPackRecovery(runProjectId, jobs);
  }, [isSellerPack, jobs, runProjectId, sellerPackRecoveryHydrated]);

  useEffect(() => {
    if (!running) return;
    // Elapsed clock only while pack is running; reset is done when starting a pack.
    const t0 = Date.now();
    const id = window.setInterval(() => {
      setPackElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [running]);

  function cancelInFlightPack() {
    const ctrl = packAbortRef.current;
    if (!ctrl) return;
    ctrl.abort();
    packAbortRef.current = null;
    setError(
      "Pack canceled — finished children kept. Live debit on the interrupted child may still settle server-side (refund unconfirmed until confirmed)."
    );
  }

  const isFree = me?.plan === "free" || me?.watermark === true;
  const demoMode = isDemoMode(me) || me?.mode === "demo-cached";
  /** Soft-launch freeTrial honesty — same contract as Create / SoftLaunchStrip. */
  const trialDone = freeTrialExhausted(me);
  const freeLive = me?.freeTrial?.freeLive;
  const clipsLeft =
    typeof me?.freeTrial?.clipsLeft === "number"
      ? me.freeTrial.clipsLeft
      : typeof me?.credits === "number"
        ? Math.floor(me.credits / CREDITS_PER_VIDEO)
        : null;
  /** Server free tier hard-locks 5s / 480p Mini; keep UI honest. */
  const effectiveDuration = isFree ? 5 : duration;
  const effectiveResolution = isFree ? "480p" : "720p";
  const effectiveModel = isFree ? "seedance-mini" : "seedance-fast";
  const cost = demoMode ? 0 : selected.length * CREDITS_PER_VIDEO;
  /** Label only when the frozen trio is selected (PRD: custom batch loses Seller Pack name). */
  const sellerPackActive = isSellerPack || selectedMatchesSellerPack(selected);

  const visiblePresets = useMemo(() => {
    if (sellerPackActive) {
      return SELLER_PACK_SLUGS.map(
        (slug) => PRESETS.find((p) => p.slug === slug)!
      ).filter(Boolean);
    }
    if (catFilter === "all") return PRESETS;
    return PRESETS.filter((p) => p.category === catFilter);
  }, [catFilter, sellerPackActive]);

  function loadFile(file: File | undefined | null) {
    if (!file?.type.startsWith("image/")) {
      setError("Upload a PNG/JPG of your toy.");
      return;
    }
    if (file.size > 8_000_000) {
      setError("Image too large (max ~8MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  function toggle(slug: string) {
    if (isSellerPack) return;
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  function selectCategory(id: CategoryId | "all") {
    if (isSellerPack) return;
    setCatFilter(id);
    if (id === "all") return;
    const slugs = PRESETS.filter((p) => p.category === id).map((p) => p.slug);
    setSelected(slugs);
  }

  function selectSellerPack() {
    setSelected([...SELLER_PACK_SLUGS]);
    setCatFilter("all");
  }

  function aspectForSlug(slug: string): "9:16" | "1:1" | "16:9" {
    if (sellerPackActive) {
      const item = SELLER_PACK_ITEMS.find((i) => i.slug === slug);
      if (item) return item.aspectRatio;
    }
    return aspectRatio;
  }

  async function executeJob(
    job: Job,
    projectId: string,
    packReservationId?: string | null,
    /** Phase D: shared still asset — avoids re-posting multi-MB Base64 per child */
    sharedAssetId?: string | null,
    signal?: AbortSignal
  ): Promise<{
    job: Job;
    stopQueue: boolean;
    /** Caller should re-register still for remaining pack children. */
    recoveredFromAssetMiss?: boolean;
    retryAfterSec?: number;
  }> {
    const jobAspect = job.aspectRatio ?? aspectRatio;
    const dualStill =
      image && image.startsWith("data:image") && image.length < 3_500_000
        ? image
        : undefined;
    const result = await postGenerateWithRetry(
      {
        effect: job.slug,
        // Dual-send when possible: assetId for smaller POSTs + inline still for
        // multi-instance (Vercel) memory-asset misses.
        ...(sharedAssetId
          ? {
              assetId: sharedAssetId,
              ...(dualStill ? { image: dualStill } : {}),
            }
          : { image: dualStill ?? image ?? undefined }),
        duration: effectiveDuration,
        aspectRatio: jobAspect,
        model: effectiveModel,
        resolution: effectiveResolution,
        ownsRights: true,
      },
      {
        maxRetries: 1,
        // Mid-pack asset TTL / process restart: recover with local still once.
        fallbackImage:
          sharedAssetId && image && image.startsWith("data:image")
            ? image
            : undefined,
        signal,
      }
    );

    if (!result.ok) {
      if (result.session) {
        setMe((previous) => mergeMeSession(previous, result.session));
        emitSessionRefresh();
      }
      const refunded = result.creditsRefunded === true;
      // TIMEOUT / network / abort → unconfirmed; confirmed refund → restored.
      const settlement = requestCreditStateFromFailure({
        creditsRefunded: result.creditsRefunded,
        refundUnconfirmed: result.refundUnconfirmed,
        status: result.status,
        code: result.code,
      });
      const unconfirmed = settlement === "refund unconfirmed";
      // Phase C: release 10 from Seller Pack shadow reservation on failed child.
      // Failures only occur on the live debit path (demo never debits).
      if (packReservationId) {
        void releaseSellerPackChildClient({
          reservationId: packReservationId,
          childKey: job.slug,
          reason: refunded ? "refunded" : "failed",
        });
      }
      return {
        job: {
          ...job,
          status: refunded ? "refunded" : "failed",
          error: result.error,
          errorCode: result.code,
          creditState: refunded
            ? "10 restored"
            : unconfirmed
              ? "refund unconfirmed"
              : settlement === null
                ? "not charged"
                : settlement,
          requestId: result.jobId,
        },
        // Unconfirmed network/TIMEOUT still stops the pack — operator should check balance.
        stopQueue: result.fatal || result.paywall || unconfirmed,
        recoveredFromAssetMiss: result.code === "ASSET_NOT_FOUND",
        retryAfterSec:
          typeof result.retryAfterSec === "number" && result.retryAfterSec > 0
            ? result.retryAfterSec
            : undefined,
      };
    }

    const data = result.data;
    if (data.session) {
      setMe((previous) => mergeMeSession(previous, data.session));
      emitSessionRefresh();
    }
    // Settle 10 on shadow pack when live child succeeds (demo = 0, no settle).
    if (packReservationId && !data.demo) {
      void settleSellerPackChildClient({
        reservationId: packReservationId,
        jobId:
          typeof data.requestId === "string" ? data.requestId : undefined,
        childKey: job.slug,
      });
    }
    pushHistory(
      historyFieldsFromSuccess(data, {
        effect: job.slug,
        effectName: job.name,
        fallbackDuration: effectiveDuration,
        fallbackAspect: jobAspect,
        fallbackResolution: effectiveResolution,
        projectId,
        projectName: sellerPackActive
          ? "Seller Pack · 3 outputs"
          : "Custom batch",
        inputImage:
          image && image.length <= 300_000 ? image : undefined,
        channel: SELLER_PACK_ITEMS.find((item) => item.slug === job.slug)
          ?.channel,
      })
    );
    emitSessionRefresh();
    return {
      job: {
        ...job,
        status: "succeeded",
        videoUrl: data.videoUrl,
        demo: data.demo,
        model: data.model,
        duration:
          typeof data.duration === "number"
            ? data.duration
            : effectiveDuration,
        resolution:
          typeof data.resolution === "string"
            ? data.resolution
            : effectiveResolution,
        aspectRatio:
          data.aspectRatio === "1:1" ||
          data.aspectRatio === "16:9" ||
          data.aspectRatio === "9:16"
            ? data.aspectRatio
            : jobAspect,
        watermark: Boolean(data.watermark),
        creditState: data.demo ? "0 cached" : "10 used",
        requestId:
          typeof data.requestId === "string" ? data.requestId : undefined,
      },
      stopQueue: false,
      recoveredFromAssetMiss: Boolean(result.recoveredFromAssetMiss),
    };
  }

  async function runBatch() {
    if (!image || !isValidImageDataUrl(image)) {
      setError("Add a toy photo first (JPEG, PNG, WebP, or GIF).");
      return;
    }
    if (selected.length === 0) {
      setError("Pick at least one preset.");
      return;
    }
    if (!ownsRights) {
      setError("Confirm you own this photo before running the batch.");
      return;
    }

    setError(null);
    setFailRetryAfterSec(null);
    setPackElapsed(0);
    setRunning(true);
    const projectId = `${sellerPackActive ? "seller-pack" : "batch"}-${Date.now()}`;
    setRunProjectId(projectId);

    // Abort any prior pack before starting a new one.
    packAbortRef.current?.abort();
    const abortCtrl = new AbortController();
    packAbortRef.current = abortCtrl;

    // Phase C: Seller Pack shadow-reserves 30 (or N×10) when durable is on.
    // Cookie still debits per child; DURABLE_OFF is non-fatal.
    let packReservationId: string | null = null;
    if (sellerPackActive && !demoMode) {
      const reserved = await reserveSellerPackShadowClient({
        childCount: selected.length,
        idempotencyKey: `ui-pack:${projectId}`,
      });
      if (reserved.ok && reserved.reservationId) {
        packReservationId = reserved.reservationId;
      } else if (reserved.code === "INSUFFICIENT_CREDITS") {
        // Shadow wallet empty — still allow cookie path; surface honesty only.
        setError(
          (reserved.error ||
            "Durable shadow wallet short — continuing with cookie credits only") +
            " · cookie generate remains authoritative"
        );
      }
    }

    // Phase D: register still once — Seller Pack / batch children reuse assetId.
    let sharedAssetId: string | null = null;
    if (image && image.startsWith("data:image")) {
      const reg = await registerLocalAsset(image);
      if (reg?.assetId) sharedAssetId = reg.assetId;
    }

    const queue: Job[] = selected.map((slug) => {
      const p = PRESETS.find((x) => x.slug === slug)!;
      const packItem = SELLER_PACK_ITEMS.find((i) => i.slug === slug);
      return {
        slug,
        name: sellerPackActive && packItem ? packItem.label : p.name,
        status: "queued" as const,
        aspectRatio: aspectForSlug(slug),
        retryCount: 0,
      };
    });
    setJobs(queue);

    try {
      for (let i = 0; i < queue.length; i++) {
        if (abortCtrl.signal.aborted) break;
        setJobs((prev) =>
          prev.map((j, idx) => (idx === i ? { ...j, status: "running" } : j))
        );
        const outcome = await executeJob(
          queue[i],
          projectId,
          packReservationId,
          sharedAssetId,
          abortCtrl.signal
        );
        queue[i] = outcome.job;
        setJobs((previous) =>
          previous.map((job, index) => (index === i ? outcome.job : job))
        );
        // Mid-pack asset miss: re-register still so remaining children use a fresh assetId.
        if (outcome.recoveredFromAssetMiss && image?.startsWith("data:image")) {
          sharedAssetId = null;
          try {
            const reg = await registerLocalAsset(image);
            if (reg?.assetId) sharedAssetId = reg.assetId;
          } catch {
            /* remaining children fall back to Base64 via executeJob */
          }
        }
        if (outcome.stopQueue || abortCtrl.signal.aborted) {
          if (!abortCtrl.signal.aborted) {
            setError(outcome.job.error ?? "Seller Pack paused");
            setFailRetryAfterSec(
              typeof outcome.retryAfterSec === "number"
                ? outcome.retryAfterSec
                : null
            );
          }
          setJobs((previous) =>
            previous.map((job, index) =>
              index > i && job.status === "queued"
                ? { ...job, status: "not_started" }
                : job
            )
          );
          // Release remaining shadow hold for children that never ran.
          if (packReservationId) {
            for (let j = i + 1; j < queue.length; j++) {
              void releaseSellerPackChildClient({
                reservationId: packReservationId,
                childKey: queue[j].slug,
                reason: "not_started",
              });
            }
          }
          break;
        }
        // Soft gap so sequential batch stays under session/IP soft limits.
        if (i < queue.length - 1) {
          await sleep(400, abortCtrl.signal);
        }
      }
    } catch (e) {
      const aborted =
        (e instanceof Error && e.name === "AbortError") ||
        abortCtrl.signal.aborted;
      if (aborted) {
        setJobs((previous) =>
          previous.map((job) =>
            job.status === "queued" || job.status === "running"
              ? {
                  ...job,
                  status:
                    job.status === "running" ? "failed" : "not_started",
                  error:
                    job.status === "running"
                      ? "Canceled · refund unconfirmed if live debit started"
                      : undefined,
                  creditState:
                    job.status === "running"
                      ? "refund unconfirmed"
                      : job.creditState,
                }
              : job
          )
        );
        if (packReservationId) {
          for (const job of queue) {
            if (job.status === "queued" || job.status === "running") {
              void releaseSellerPackChildClient({
                reservationId: packReservationId,
                childKey: job.slug,
                reason: "canceled",
              });
            }
          }
        }
      } else {
        setError(e instanceof Error ? e.message : "Batch failed");
      }
    } finally {
      if (packAbortRef.current === abortCtrl) {
        packAbortRef.current = null;
      }
      setRunning(false);
    }
  }

  async function retryJob(slug: string) {
    if (running || !image || !ownsRights) return;
    const target = jobs.find((job) => job.slug === slug);
    if (!target || !retryEligible(target)) {
      return;
    }
    const projectId =
      runProjectId ??
      `${sellerPackActive ? "seller-pack" : "batch"}-retry-${target.slug}`;
    setRunProjectId(projectId);
    setPackElapsed(0);
    setRunning(true);
    setError(null);
    packAbortRef.current?.abort();
    const abortCtrl = new AbortController();
    packAbortRef.current = abortCtrl;
    let sharedAssetId: string | null = null;
    if (image.startsWith("data:image")) {
      const reg = await registerLocalAsset(image);
      if (reg?.assetId) sharedAssetId = reg.assetId;
    }
    const retrying: Job = {
      ...target,
      status: "running",
      error: undefined,
      errorCode: undefined,
      creditState: undefined,
      retryCount: target.retryCount + 1,
    };
    setJobs((previous) =>
      previous.map((job) => (job.slug === slug ? retrying : job))
    );
    try {
      const outcome = await executeJob(
        retrying,
        projectId,
        null,
        sharedAssetId,
        abortCtrl.signal
      );
      setJobs((previous) =>
        previous.map((job) => (job.slug === slug ? outcome.job : job))
      );
      if (!outcome.job.videoUrl) {
        setError(outcome.job.error ?? "Retry failed");
      }
    } finally {
      if (packAbortRef.current === abortCtrl) {
        packAbortRef.current = null;
      }
      setRunning(false);
    }
  }

  /** Phase F: partial failure — re-run only failed/refunded children; successes stay. */
  async function retryAllFailed() {
    if (running || !image || !ownsRights) return;
    const failed = jobs.filter(retryEligible);
    if (failed.length === 0) return;
    const projectId =
      runProjectId ??
      `${sellerPackActive ? "seller-pack" : "batch"}-retry-failed-${Date.now().toString(36)}`;
    setRunProjectId(projectId);
    setPackElapsed(0);
    setRunning(true);
    setError(null);
    packAbortRef.current?.abort();
    const abortCtrl = new AbortController();
    packAbortRef.current = abortCtrl;
    let sharedAssetId: string | null = null;
    if (image.startsWith("data:image")) {
      const reg = await registerLocalAsset(image);
      if (reg?.assetId) sharedAssetId = reg.assetId;
    }
    try {
      for (let i = 0; i < failed.length; i++) {
        if (abortCtrl.signal.aborted) break;
        const target = failed[i];
        const retrying: Job = {
          ...target,
          status: "running",
          error: undefined,
          errorCode: undefined,
          creditState: undefined,
          retryCount: target.retryCount + 1,
        };
        setJobs((previous) =>
          previous.map((job) => (job.slug === target.slug ? retrying : job))
        );
        const outcome = await executeJob(
          retrying,
          projectId,
          null,
          sharedAssetId,
          abortCtrl.signal
        );
        setJobs((previous) =>
          previous.map((job) =>
            job.slug === target.slug ? outcome.job : job
          )
        );
        if (!outcome.job.videoUrl) {
          setError(outcome.job.error ?? `Retry failed · ${target.name}`);
        }
        if (i < failed.length - 1) {
          await sleep(400, abortCtrl.signal);
        }
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) {
        setError(e instanceof Error ? e.message : "Retry failed");
      }
    } finally {
      if (packAbortRef.current === abortCtrl) {
        packAbortRef.current = null;
      }
      setRunning(false);
    }
  }

  const doneCount = jobs.filter((j) => j.status === "succeeded").length;
  /** HF Product three-step: upload → run → deliver */
  const sellerStep: 1 | 2 | 3 = !image
    ? 1
    : doneCount > 0
      ? 3
      : running || jobs.some((j) => j.status === "running" || j.status === "queued")
        ? 2
        : image
          ? 2
          : 1;
  const failedRetryCount = jobs.filter(
    retryEligible
  ).length;
  const needsAttentionCount = jobs.filter(
    (job) =>
      job.status === "failed" ||
      job.status === "refunded" ||
      job.status === "not_started" ||
      job.status === "recovery_unavailable"
  ).length;

  const exportItems: SellerPackExportItem[] = useMemo(() => {
    return jobs.map((j) => {
      const packMeta = SELLER_PACK_ITEMS.find((p) => p.slug === j.slug);
      return {
        key: packMeta?.key || j.slug,
        slug: j.slug,
        label: packMeta?.label || j.name,
        status: j.status,
        videoUrl: j.videoUrl,
        demo: j.demo,
        watermark: j.watermark,
        creditState: j.creditState,
        requestId: j.requestId,
        downloadable: Boolean(
          j.videoUrl &&
            canDownloadResult({
              demo: Boolean(j.demo),
              watermark: Boolean(j.watermark),
            })
        ),
      };
    });
  }, [jobs]);
  const canExportPack = canExportSellerPack(exportItems);
  const availableDownloads = useMemo(
    () => sellerPackAvailableDownloads(exportItems),
    [exportItems]
  );
  const [exportBusy, setExportBusy] = useState(false);

  function downloadText(filename: string, body: string, mime: string) {
    const blob = new Blob([body], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportAvailableCsv() {
    const csv = sellerPackCsv(exportItems);
    if (!csv) return;
    downloadText(
      `pikbo-seller-pack-${Date.now()}.csv`,
      csv,
      "text/csv;charset=utf-8"
    );
  }

  function exportAvailableManifest() {
    const manifest = sellerPackManifest(exportItems);
    downloadText(
      `pikbo-seller-pack-manifest-${Date.now()}.json`,
      JSON.stringify(manifest, null, 2),
      "application/json"
    );
  }

  /**
   * Phase F: sequential multi-file save of downloadable children only.
   * No server ZIP (needs object storage). Free raw / failed siblings omitted.
   */
  async function downloadAvailableClips() {
    const targets = sellerPackAvailableDownloads(exportItems);
    if (targets.length === 0 || exportBusy) return;
    setExportBusy(true);
    try {
      let ok = 0;
      let fallback = 0;
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        const result = await downloadVideoFile(t.href, t.filename);
        if (result === "ok") ok += 1;
        else if (result === "fallback") fallback += 1;
        // "unsafe" / "fail" stay uncounted — never claim multi-download success
        if (i < targets.length - 1) {
          await sleep(350);
        }
      }
      if (ok + fallback === 0) {
        setError(
          "Could not download available clips — blocked, unsafe URL, or expired. Try each child Download link."
        );
      } else if (fallback > 0 && ok === 0) {
        setError(null);
      }
    } finally {
      setExportBusy(false);
    }
  }
  // Y5: pure quote helpers — Seller Pack always 3×10; batch uses selected length.
  const packQuote = useMemo(
    () =>
      sellerPackQuote({
        demo: demoMode,
        childCount: sellerPackActive ? undefined : selected.length || 1,
      }),
    [demoMode, sellerPackActive, selected.length]
  );
  const liveQuoteCovered = sellerPackBalanceCovers(packQuote, me?.credits);
  const canRun =
    !running &&
    Boolean(image) &&
    selected.length > 0 &&
    ownsRights &&
    liveQuoteCovered;

  const primaryBatchLabel = running
    ? `${sellerPackActive ? "Seller Pack" : "Batch"} running… ${doneCount}/${jobs.length}`
    : !image
      ? "Upload owned toy photo"
      : !ownsRights
        ? "Confirm ownership to continue"
        : demoMode
          ? `${sellerPackActive ? "Preview Seller Pack" : "Run batch"} · ${selected.length} · cached free`
          : trialDone && isFree && !liveQuoteCovered
            ? "Free Mini trial used · open single Generate or plans"
            : sellerPackActive
              ? `Run Seller Pack · ${sellerPackQuoteLabel(packQuote)}`
              : `Run batch · ${batchQuoteLabel(packQuote)}`;

  const creditStrip = (
    <div
      className={`rounded-lg border px-2.5 py-2 text-[11px] leading-relaxed text-[var(--fg-muted)] ${
        sellerPackActive
          ? "border-[var(--mint)]/20 bg-black/25"
          : "border-white/12 bg-black/30"
      }`}
    >
      <p
        className={`font-bold ${
          sellerPackActive ? "text-[var(--mint)]" : "text-white/85"
        }`}
      >
        Credits ·{" "}
        {sellerPackActive
          ? sellerPackQuoteLabel(packQuote)
          : batchQuoteLabel(packQuote)}
      </p>
      {demoMode ? (
        <p className="mt-0.5 text-[var(--fg-dim)]">
          Demo mode · no debit · upload is not sent to the model.
        </p>
      ) : (
        <p className="mt-0.5 text-[var(--fg-dim)]">
          Session balance:{" "}
          <b className="text-[var(--fg)]">{me?.credits ?? "…"} credits</b>
          {isFree ? (
            <span
              className={
                trialDone ? " text-amber-200" : " text-[var(--fg-dim)]"
              }
            >
              {trialDone
                ? " · Free Mini trial used"
                : freeLive
                  ? ` · Free Mini · ${freeLive.resolution} ${freeLive.durationSec}s`
                  : " · Free Mini"}
              {clipsLeft !== null && !trialDone
                ? ` · ~${clipsLeft} live left`
                : ""}
            </span>
          ) : null}
          {typeof me?.credits !== "number" ? (
            <span> · loading balance…</span>
          ) : !sellerPackBalanceCovers(packQuote, me.credits) ? (
            <span className="text-amber-200">
              {" "}
              · short {sellerPackShortfall(packQuote, me.credits)}
              {trialDone && isFree
                ? " — trial exhausted; Lab demos still free · single Generate needs a plan top-up"
                : sellerPackActive
                  ? " — Free Mini covers one 10-cr job, not a full pack"
                  : " — Free Mini is one 10-cr job; deselect recipes or open single Generate"}
            </span>
          ) : (
            <span>
              {" "}
              · covers this {sellerPackActive ? "pack" : "batch"}
            </span>
          )}
          . Each confirmed fail restores {demoMode ? 0 : CREDITS_PER_VIDEO}.
        </p>
      )}
    </div>
  );

  return (
    <div className="mt-8 grid gap-6 pb-36 lg:grid-cols-[1fr_1.1fr] lg:pb-0">
      <div className="space-y-4">
        {sellerPackActive && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-[var(--mint)]/35 bg-gradient-to-br from-[var(--mint)]/[0.1] to-black/40 px-3.5 py-3 text-xs text-[var(--fg-muted)] shadow-[inset_0_1px_0_rgba(200,255,61,0.08)]">
              <p className="font-bold text-[var(--mint)]">
                Seller Pack · product three-step
              </p>
              <p className="mt-1 leading-relaxed text-white/55">
                Upload product photo → generate three formats → export & post.
                Listing Spin (1:1) · Blind-box Reveal (9:16) · Social Flash
                (9:16).
              </p>
              {/* Y5 credit transparency — balance · per child · total · refund */}
              <div className="mt-2">{creditStrip}</div>
              <ul className="mt-2 space-y-0.5 text-[10px] text-[var(--fg-dim)]">
                {SELLER_PACK_ITEMS.map((item) => (
                  <li key={item.key}>
                    {item.label} → {item.channel}
                    {!demoMode
                      ? ` · ${CREDITS_PER_VIDEO} credits`
                      : " · 0 cached"}
                  </li>
                ))}
              </ul>
            </div>
            <SellerPackSteps step={sellerStep} />
            <p
              data-seller-pack-recovery="device-local"
              className="rounded-lg border border-amber-300/20 bg-amber-300/[0.04] px-3 py-2 text-[10px] leading-relaxed text-amber-100/85"
            >
              Current device/server session only — this reopens the active
              pack from the local generation-job ledger. It is not cloud
              storage, cross-device history, or a durable credits claim.
            </p>
            {sellerPackRecoveryNote ? (
              <p className="text-[10px] leading-relaxed text-[var(--fg-dim)]">
                {sellerPackRecoveryNote}
              </p>
            ) : null}
          </div>
        )}
        {!sellerPackActive ? (
          <div className="rounded-2xl border border-white/12 bg-gradient-to-br from-white/[0.04] to-black/40 px-3.5 py-3 text-xs text-[var(--fg-muted)]">
            <p className="font-bold text-white/85">
              Custom batch · Preview
            </p>
            <p className="mt-1 leading-relaxed text-white/50">
              Queue any recipes · sequential Seedance jobs · not multi-model
              Supercomputer. Prefer fixed shop formats?{" "}
              <Link
                href="/create?mode=seller-pack"
                className="font-semibold text-[var(--mint)] hover:underline"
              >
                Seller Pack
              </Link>
              .
            </p>
            <div className="mt-2">{creditStrip}</div>
          </div>
        ) : null}
        <div data-seller-pack-step="upload">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--fg-muted)] sm:hidden">
            <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--mint)] text-[9px] text-black">
              1
            </span>
            Upload owned toy photo
          </p>
          <label
            id="seller-pack-photo"
            htmlFor="seller-pack-photo-input"
            className={`flex aspect-video cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-black/40 transition-all duration-200 hover:border-[var(--mint)]/55 hover:bg-black/55 ${
              image
                ? "border-white/12 ring-1 ring-white/5"
                : "border-[var(--mint)]/40 shadow-[0_0_40px_rgba(200,255,61,0.06)]"
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              loadFile(e.dataTransfer.files?.[0]);
            }}
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt="toy"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="px-4 text-center text-sm text-[var(--fg-dim)]">
                <span className="mb-2 block text-2xl" aria-hidden>
                  🧸
                </span>
                Drop one toy photo for the whole{" "}
                {sellerPackActive ? "pack" : "batch"}
                <br />
                <span className="text-xs">
                  or tap · JPEG / PNG / WebP · under ~8 MB
                </span>
              </span>
            )}
            <input
              id="seller-pack-photo-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => loadFile(e.target.files?.[0])}
            />
          </label>
          {!image && (
            <div className="mt-2 flex flex-wrap gap-2">
              {SAMPLE_TOYS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="rounded-lg border border-[var(--border)] px-2 py-1 text-[10px] hover:border-[var(--brand)]"
                  onClick={async () => {
                    try {
                      setImage(await sampleToDataUrl(s.path));
                      setError(null);
                    } catch {
                      setError("Sample load failed");
                    }
                  }}
                >
                  Sample: {s.label}
                </button>
              ))}
              <p className="w-full text-[10px] font-semibold text-[var(--mint)]">
                Lab samples are official examples · not a customer upload.
              </p>
            </div>
          )}
        </div>

        <div className={`grid gap-2 ${isSellerPack ? "" : "grid-cols-2"}`}>
          {!isSellerPack ? (
            <>
              <div>
                <p className="text-[10px] font-semibold text-[var(--fg-dim)]">
                  Duration
                </p>
                <div className="mt-1 flex gap-1">
                  {([5, 10] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      disabled={isFree && d === 10}
                      onClick={() => setDuration(d)}
                      className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold disabled:opacity-40 ${
                        effectiveDuration === d
                          ? "border-[var(--brand)]"
                          : "border-[var(--border)] text-[var(--fg-muted)]"
                      }`}
                    >
                      {d}s{isFree && d === 10 ? " · paid" : ""}
                    </button>
                  ))}
                </div>
                {isFree && (
                  <p className="mt-1 text-[10px] text-[var(--fg-dim)]">
                    {trialDone
                      ? "Free Mini trial used · Lab demos still free"
                      : freeLive
                        ? `Free Mini · ${freeLive.resolution} · ${freeLive.durationSec}s (server-enforced)`
                        : "Free · Mini · 480p · 5s (server-enforced)"}
                    {clipsLeft !== null && !trialDone
                      ? ` · ~${clipsLeft} live left`
                      : ""}
                  </p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[var(--fg-dim)]">
                  Aspect
                </p>
                <div className="mt-1 flex gap-1">
                  {(["9:16", "1:1", "16:9"] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAspectRatio(a)}
                      className={`flex-1 rounded-lg border py-1.5 text-[10px] font-semibold ${
                        aspectRatio === a
                          ? "border-[var(--brand)]"
                          : "border-[var(--border)] text-[var(--fg-muted)]"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3 text-xs text-[var(--fg-muted)]">
              Per-output formats are fixed: Listing Spin uses 1:1; Reveal and
              Social Flash use 9:16. All three use the current 5s plan path.
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-[var(--fg-muted)]">
              Presets in this batch
            </p>
            {!isSellerPack ? (
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={selectSellerPack}
                  className={`rounded-md border px-2 py-0.5 text-[10px] ${
                    sellerPackActive
                      ? "border-[var(--mint)] bg-[var(--mint)]/10 text-[var(--mint)]"
                      : "border-[var(--border)] text-[var(--mint)] hover:border-[var(--mint)]"
                  }`}
                >
                  Seller Pack · 3
                </button>
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="rounded-md border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--fg-dim)]"
                >
                  Clear
                </button>
              </div>
            ) : (
              <span className="rounded-full border border-[var(--mint)]/30 bg-[var(--mint)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--mint)]">
                Frozen v1 configuration
              </span>
            )}
          </div>
          {!isSellerPack ? (
            <>
              <div className="mt-2 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setCatFilter("all")}
                  className={`rounded-full border px-2 py-0.5 text-[10px] ${
                    catFilter === "all"
                      ? "border-[var(--brand)]"
                      : "border-[var(--border)] text-[var(--fg-dim)]"
                  }`}
                >
                  All
                </button>
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCategory(c.id)}
                    className={`rounded-full border px-2 py-0.5 text-[10px] ${
                      catFilter === c.id
                        ? "border-[var(--brand)]"
                        : "border-[var(--border)] text-[var(--fg-dim)]"
                    }`}
                    title={c.blurb}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex max-h-56 flex-wrap gap-2 overflow-y-auto">
                {visiblePresets.map((p) => {
                  const on = selected.includes(p.slug);
                  return (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => toggle(p.slug)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                        on
                          ? "border-[var(--brand)] bg-[var(--grad-soft)]"
                          : "border-[var(--border)] text-[var(--fg-muted)]"
                      }`}
                    >
                      {p.emoji} {p.name}
                    </button>
                  );
                })}
              </div>
              {validInitial && validInitial.length > 0 && (
                <p className="mt-2 text-[10px] text-[var(--mint)]">
                  Pre-selected from tool page link ({validInitial.length} effects).
                </p>
              )}
            </>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {SELLER_PACK_ITEMS.map((item, index) => (
                <article
                  key={item.key}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3"
                >
                  <span className="text-[10px] font-black text-[var(--mint)]">
                    0{index + 1}
                  </span>
                  <p className="mt-1 text-xs font-bold">{item.label}</p>
                  <p className="mt-1 text-[10px] text-[var(--fg-dim)]">
                    {item.aspectRatio} · 5s · {item.channel}
                  </p>
                  <p className="mt-2 text-[10px] font-semibold text-[var(--fg-muted)]">
                    {demoMode ? "0 cached" : "10 credits"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>

        <label
          id="batch-ownership"
          className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-[11px] leading-snug text-[var(--fg-muted)]"
        >
          <input
            type="checkbox"
            checked={ownsRights}
            onChange={(e) => setOwnsRights(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--mint)]"
          />
          <span>
            I own this photo and have the right to animate and publish this toy
            for every preset in the batch.
          </span>
        </label>

        {running ? (
          <>
            <GenerateWaitStage
              elapsed={packElapsed}
              demoMode={demoMode}
              image={image}
              effectLabel={
                jobs.find((j) => j.status === "running")?.name ||
                (sellerPackActive
                  ? `Seller Pack · ${doneCount}/${jobs.length || 3}`
                  : `Batch · ${doneCount}/${jobs.length || selected.length}`)
              }
              onCancel={cancelInFlightPack}
              compact
              className="mb-1"
            />
            <button
              type="button"
              onClick={cancelInFlightPack}
              className="btn btn-ghost hidden w-full border border-white/20 lg:flex"
              title="Aborts this browser request. Live debit on the running child may still settle server-side."
            >
              Cancel pack · keep finished children
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={!canRun}
            onClick={() => void runBatch()}
            className="btn btn-primary hidden w-full disabled:opacity-50 lg:flex"
          >
            {primaryBatchLabel}
          </button>
        )}
        {!liveQuoteCovered && sellerPackActive ? (
          <div className="rounded-xl border border-amber-300/25 bg-amber-300/[0.06] p-3 text-xs text-amber-100">
            <p className="font-bold">
              {trialDone && isFree
                ? "Free Mini trial used · full Seller Pack needs paid credits"
                : `Full live pack needs ${cost} credits; this session has ${me?.credits ?? 0}.`}
            </p>
            <p className="mt-1 text-[11px] text-white/50">
              {trialDone && isFree ? (
                <>
                  Cached Lab demos stay free. One live Mini job needs{" "}
                  {CREDITS_PER_VIDEO} credits after top-up.{" "}
                  <Link
                    href="/pricing"
                    className="font-semibold text-[var(--mint)] hover:underline"
                  >
                    Compare plans
                  </Link>
                  .
                </>
              ) : (
                <>
                  Free Mini covers one 10-cr job
                  {clipsLeft !== null ? ` (~${clipsLeft} left)` : ""} — not a
                  full pack. Choose one recipe in single Generate; paid
                  activation remains gated.
                </>
              )}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SELLER_PACK_ITEMS.map((item) => (
                <Link
                  key={item.key}
                  href={`/create?effect=${item.slug}`}
                  className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-bold text-white/70"
                >
                  Try {item.label}
                </Link>
              ))}
              {trialDone && isFree ? (
                <Link
                  href="/pricing"
                  className="rounded-full border border-[var(--mint)]/35 px-2.5 py-1 text-[10px] font-bold text-[var(--mint)]"
                >
                  Plans
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
        {error ? (
          <GenerateFailPanel
            message={error}
            retryAfterSec={failRetryAfterSec}
            onRetry={
              image && !running && selected.length > 0
                ? () => {
                    setFailRetryAfterSec(null);
                    void runBatch();
                  }
                : undefined
            }
            retryLabel={
              sellerPackActive ? "Retry Seller Pack" : "Retry batch"
            }
            showLabSample={!image}
            showModules={false}
          />
        ) : null}
        <p className="text-[11px] text-[var(--fg-dim)]">
          Sequential jobs use the same generate API
          {demoMode
            ? " (demo-cached · 0 credits)"
            : isFree
              ? trialDone
                ? " (Free Mini trial used · Lab demos still free)"
                : freeLive
                  ? ` (Free Mini ${freeLive.resolution} ${freeLive.durationSec}s)`
                  : " (Free Mini 480p 5s)"
              : " (paid Fast 720p path)"}
          . Finished clips land in{" "}
          <Link href="/library" className="text-[var(--brand)] hover:underline">
            Library
          </Link>
          .
        </p>
      </div>

      <div className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">
              {sellerPackActive ? "Seller Pack queue" : "Queue"}
            </h2>
            {jobs.length > 0 ? (
              <p className="mt-0.5 text-[10px] text-[var(--fg-dim)]">
                {doneCount} ready
                {needsAttentionCount > 0
                  ? ` · ${needsAttentionCount} need attention`
                  : ""}
                {failedRetryCount > 0
                  ? ` · ${failedRetryCount} failed (siblings kept)`
                  : ""}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {failedRetryCount > 0 ? (
              <button
                type="button"
                disabled={running || !image || !ownsRights}
                onClick={() => void retryAllFailed()}
                className="rounded-full border border-[var(--mint)]/35 px-3 py-1 text-[10px] font-bold text-[var(--mint)] disabled:opacity-40"
                title="Re-quote only confirmed failed or unsubmitted children · successful outputs stay playable; unconfirmed refunds never auto-retry"
              >
                Retry eligible only
              </button>
            ) : null}
            {jobs.length > 0 ? (
              <span className="text-[10px] text-[var(--fg-dim)]">
                Current device/session only
              </span>
            ) : null}
          </div>
        </div>
        {jobs.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/12 bg-black/25 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-[var(--fg)]">
              {sellerPackActive
                ? "Your pack queue is empty"
                : "No batch jobs yet"}
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--fg-dim)]">
              {sellerPackActive
                ? "Upload one owned toy photo → Generate pack. Three formats land here with independent success/fail. Failed children refund; siblings stay."
                : "Pick presets (or open Batch from an effect page), confirm ownership, then run. Finished clips also save on this device Library."}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <FreeTrialCta
                path="/create?mode=seller-pack"
                labelTry="Try free · Lab sample"
                labelDemo="Try free · Lab sample"
                hideClipsChip
                className="rounded-full border border-[var(--mint)]/35 px-3 py-1.5 text-[11px] font-bold text-[var(--mint)]"
              />
              {!sellerPackActive ? (
                <Link
                  href="/create?mode=seller-pack"
                  className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-bold text-white/70"
                >
                  Seller Pack · 3 outputs
                </Link>
              ) : (
                <Link
                  href="/create"
                  className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-bold text-white/70"
                >
                  Single Generate
                </Link>
              )}
            </div>
          </div>
        )}
        {jobs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-black/30 px-3 py-2">
            <p className="text-[11px] text-[var(--fg-muted)]">
              Export only succeeded downloadable clips
              {canExportPack
                ? ` · ${availableDownloads.length} available`
                : " · none ready yet"}
            </p>
            <button
              type="button"
              disabled={!canExportPack || exportBusy}
              onClick={() => void downloadAvailableClips()}
              className="rounded-full border border-[var(--mint)]/40 bg-[var(--mint)]/10 px-3 py-1 text-[10px] font-bold text-[var(--mint)] disabled:opacity-40"
              title="Saves each available clip sequentially. Failed siblings and Free raw live files are omitted."
            >
              {exportBusy
                ? "Saving clips…"
                : `Download available${
                    availableDownloads.length
                      ? ` · ${availableDownloads.length}`
                      : ""
                  }`}
            </button>
            <button
              type="button"
              disabled={!canExportPack || exportBusy}
              onClick={exportAvailableCsv}
              className="rounded-full border border-[var(--mint)]/30 px-3 py-1 text-[10px] font-bold text-[var(--mint)] disabled:opacity-40"
            >
              Export CSV
            </button>
            <button
              type="button"
              disabled={!canExportPack || exportBusy}
              onClick={exportAvailableManifest}
              className="rounded-full border border-[var(--border)] px-3 py-1 text-[10px] font-bold text-[var(--fg-muted)] disabled:opacity-40"
            >
              Manifest JSON
            </button>
            <span className="text-[10px] text-[var(--fg-dim)]">
              Multi-file save · no server ZIP yet · Free raw / failures omitted
            </span>
          </div>
        )}
        {/* Post pack checklist — interactive ticks after first success */}
        {sellerPackActive && doneCount > 0 && (
          <DeliveryChecklist
            title={`Post pack · ${
              jobs.filter(
                (j) =>
                  j.status === "succeeded" &&
                  canDownloadResult({
                    demo: Boolean(j.demo),
                    watermark: Boolean(j.watermark),
                  })
              ).length
            }/${doneCount} downloadable`}
            surface="seller-pack"
            items={sellerPackPostItems({
              readyCount: doneCount,
              downloadableCount: jobs.filter(
                (j) =>
                  j.status === "succeeded" &&
                  canDownloadResult({
                    demo: Boolean(j.demo),
                    watermark: Boolean(j.watermark),
                  })
              ).length,
            })}
            className="border-[var(--mint)]/25 bg-[var(--mint)]/[0.06]"
          />
        )}
        {doneCount > 0 && !running ? (
          <GenerateAfterPath
            demo={demoMode}
            className="mt-3 justify-start"
          />
        ) : null}
        {jobs.map((j) => (
          <div
            key={j.slug}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3"
          >
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">{j.name}</span>
              <span
                className={`text-[10px] font-bold uppercase ${
                  j.status === "succeeded"
                    ? "text-[var(--mint)]"
                    : j.status === "failed" || j.status === "refunded"
                      ? "text-[var(--brand)]"
                      : j.status === "running"
                        ? "text-[var(--brand-2)]"
                        : "text-[var(--fg-dim)]"
                }`}
              >
                {j.status}
              </span>
            </div>
            {j.error && (
              <p className="mt-1 text-xs text-[var(--brand)]">{j.error}</p>
            )}
            <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-[var(--fg-dim)]">
              <span>{j.aspectRatio ?? aspectRatio}</span>
              <span>· {j.duration ?? effectiveDuration}s</span>
              <span>· {j.resolution ?? effectiveResolution}</span>
              {j.creditState ? (
                <span
                  className={
                    j.creditState === "refund unconfirmed"
                      ? "font-bold text-amber-300"
                      : "font-bold text-[var(--fg-muted)]"
                  }
                >
                  · {j.creditState}
                </span>
              ) : null}
            </div>
            {j.videoUrl && isSafeDeliverableUrl(j.videoUrl) ? (
              <video
                src={j.videoUrl}
                controls
                muted
                playsInline
                className="mt-2 max-h-40 w-full rounded-lg bg-black/40"
              />
            ) : null}
            {j.status === "succeeded" && (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase ${
                    j.demo ? "text-[var(--fg-dim)]" : "text-[var(--mint)]"
                  }`}
                >
                  {j.demo ? "Cached demo" : "Live generation"}
                </span>
                {j.model && (
                  <span className="text-[10px] text-[var(--fg-dim)]">
                    {j.model.split("/").pop()}
                  </span>
                )}
                <Link
                  href={`/effects/${j.slug}`}
                  className="text-[10px] text-[var(--mint)] hover:underline"
                >
                  Effect page →
                </Link>
                {j.demo || !j.watermark ? (
                  j.requestId ||
                  (j.videoUrl && isSafeDeliverableUrl(j.videoUrl)) ? (
                    <a
                      href={
                        j.requestId
                          ? `/api/downloads/${encodeURIComponent(j.requestId)}`
                          : j.videoUrl!
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-[var(--mint)] hover:underline"
                    >
                      Download / open
                    </a>
                  ) : (
                    <span
                      className="text-[10px] text-amber-100/80"
                      title="Unsafe deliverable URL — download blocked"
                    >
                      Download blocked · unsafe URL
                    </span>
                  )
                ) : (
                  <span
                    className="text-[10px] text-amber-100/80"
                    title="Free Mini live clips cannot download the raw provider file until server watermark bake ships."
                  >
                    Download blocked · Free raw
                  </span>
                )}
              </div>
            )}
            {retryEligible(j) && (
              <button
                type="button"
                disabled={running || !image || !ownsRights}
                onClick={() => void retryJob(j.slug)}
                className="mt-2 rounded-full border border-[var(--mint)]/30 px-3 py-1 text-[10px] font-bold text-[var(--mint)] disabled:opacity-40"
              >
                Retry this item · new 10-credit quote
              </button>
            )}
            {j.creditState === "refund unconfirmed" ? (
              <p className="mt-2 text-[10px] text-amber-200">
                Refund unconfirmed — check balance first; this child is not auto-retried.
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {/* Phase F: sticky mobile Seller Pack / Batch CTA above tab nav */}
      <div
        className="fixed inset-x-0 bottom-[4.75rem] z-40 border-t border-white/10 bg-black/92 px-4 py-2.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:hidden"
        data-seller-pack-sticky="mobile"
      >
        {image ? (
          <p className="mb-1.5 truncate text-center text-[10px] font-medium text-white/55">
            {sellerPackActive
              ? `Seller Pack · 3 outputs · ${sellerPackQuoteLabel(packQuote)}`
              : `Batch · ${selected.length} recipes · ${batchQuoteLabel(packQuote)}`}
            {doneCount > 0 ? ` · ${doneCount} ready` : ""}
            {failedRetryCount > 0 ? ` · ${failedRetryCount} failed kept` : ""}
          </p>
        ) : null}
        {image && !ownsRights ? (
          <label className="mb-2 flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-[10px] leading-snug text-[var(--fg-muted)]">
            <input
              type="checkbox"
              checked={ownsRights}
              onChange={(e) => setOwnsRights(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--mint)]"
            />
            <span>I own this photo for every pack child.</span>
          </label>
        ) : null}
        {running ? (
          <GenerateWaitMobileStrip
            elapsed={packElapsed}
            demoMode={demoMode}
            onCancel={cancelInFlightPack}
          />
        ) : !image ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("seller-pack-photo")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
              className="btn btn-primary min-w-0 flex-1 py-3 text-sm"
              data-seller-pack-action="upload"
            >
              Upload owned toy photo
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  setImage(await sampleToDataUrl(SAMPLE_TOYS[0].path));
                  setError(null);
                } catch {
                  setError("Sample load failed");
                }
              }}
              className="btn btn-ghost shrink-0 px-3 py-3 text-xs"
              title="Official Lab sample · not a customer upload"
            >
              Try free · Lab
            </button>
          </div>
        ) : doneCount > 0 ? (
          <div className="flex gap-2">
            <Link
              href="/library"
              className="btn btn-primary min-w-0 flex-1 py-3 text-sm"
              data-seller-pack-action="library"
            >
              Library
            </Link>
            {failedRetryCount > 0 ? (
              <button
                type="button"
                disabled={running || !image || !ownsRights}
                onClick={() => void retryAllFailed()}
                className="btn btn-ghost min-w-0 flex-1 border border-white/15 py-3 text-sm disabled:opacity-50"
                data-seller-pack-action="retry-failed"
                title="Re-run only failed children · successes stay"
              >
                Retry failed only
              </button>
            ) : (
              <button
                type="button"
                disabled={!canRun}
                onClick={() => {
                  if (canRun) void runBatch();
                }}
                className="btn btn-ghost min-w-0 flex-1 border border-white/15 py-3 text-sm disabled:opacity-50"
                data-seller-pack-action="run-again"
              >
                Run pack again
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled={!canRun}
            onClick={() => {
              if (!ownsRights) {
                document
                  .getElementById("batch-ownership")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
                return;
              }
              if (canRun) void runBatch();
            }}
            className="btn btn-primary w-full py-3.5 text-[15px] font-black tracking-tight disabled:opacity-50"
            data-seller-pack-action="generate"
          >
            {primaryBatchLabel}
          </button>
        )}
      </div>
    </div>
  );
}
