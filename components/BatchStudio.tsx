"use client";

import { createRemixHref } from "@/lib/remixIntent";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AssetBriefPanel } from "@/components/AssetBriefPanel";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import {
  buildAssetBrief,
  probeImageSize,
  type ImageProbe,
} from "@/lib/assetBrief";
import {
  composeExtraWithIdentity,
  hydrateToyIdentityFromQuery,
  saveToyIdentity,
  type ToyIdentity,
} from "@/lib/toyIdentity";
import { useI18n } from "@/components/LanguageProvider";
import {
  GenerateWaitMobileStrip,
  GenerateWaitStage,
} from "@/components/GenerateWaitStage";
import {
  getActiveSellerPackClient,
  getSellerPackStatusClient,
  historyFieldsFromSuccess,
  mintGenerateIdempotencyKey,
  postGenerateWithRetry,
  reserveSellerPackClient,
  retrySellerPackChildClient,
  sleep,
} from "@/lib/generateClient";
import {
  registerLocalAsset,
  registerPrivateToyAsset,
  type PrivateToyAssetUploadStage,
} from "@/lib/clientAssets";
import { pushHistory } from "@/lib/history";
import { CATEGORIES, PRESETS, type CategoryId } from "@/lib/presets";
import { CREDITS_PER_VIDEO } from "@/lib/pricing";
import {
  SELLER_PACK_LIVE_MODEL_ID,
  SELLER_PACK_LIVE_RESOLUTION,
} from "@/lib/models";
import { isValidImageDataUrl } from "@/lib/providerError";
import { SAMPLE_TOYS, sampleToDataUrl } from "@/lib/samples";
import {
  canUsePrivateLaunch,
  fetchMe,
  freeTrialExhausted,
  mergeMeSession,
  type MeResponse,
} from "@/lib/meClient";
import { emitSessionRefresh } from "@/lib/sessionEvents";
import {
  canExportSellerPack,
  sellerPackAvailableDownloads,
  type SellerPackExportItem,
} from "@/lib/sellerPackExport";
import { downloadVideoFile } from "@/lib/history";
import {
  batchQuoteLabel,
  sellerPackBalanceCovers,
  sellerPackLiveStartAllowed,
  sellerPackQuote,
  sellerPackQuoteLabel,
  sellerPackShortfall,
} from "@/lib/sellerPackQuote";
import {
  canDownloadResult,
  classifyDownloadHead,
  freeLiveDownloadBlockReason,
  isPlayableResultVideoUrl,
  isSafeDeliverableUrl,
  requestCreditStateFromFailure,
} from "@/lib/createTrust";
import { DirectorPlanPanel } from "@/components/DirectorPlanPanel";
import { GenerateFailPanel } from "@/components/GenerateFailPanel";
import { SellerPackSteps } from "@/components/SellerPackSteps";
import { buildSellerPackDirectorPlan } from "@/lib/directorPlan";
import {
  reconcileSellerPackRecovery,
  SELLER_PACK_RECOVERY_KEY,
  type SellerPackChildStatus,
  type SellerPackRecoveryRun,
} from "@/lib/sellerPackRecovery";
import {
  SELLER_PACK_ITEMS,
  SELLER_PACK_SLUGS,
  isSellerPackRetryableStatus,
  isExactSellerPackSelection,
  parseExactSellerPackServerJobs,
} from "@/lib/sellerPackContract";
import { track } from "@/lib/analytics";

export {
  SELLER_PACK_ITEMS,
  SELLER_PACK_SLUGS,
  isExactSellerPackSelection,
} from "@/lib/sellerPackContract";

type Job = {
  /** Server-created fixed child id. Required for every live Launch Pack job. */
  packJobId?: string;
  childKey?: string;
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

type PrivatePackStartIntent = {
  /** Browser-local equality fence only; never used as durable Pack identity. */
  image: string;
  clientPackKey: string;
  inputAssetId: string | null;
};

function selectedMatchesSellerPack(slugs: string[]): boolean {
  return isExactSellerPackSelection(slugs);
}

/** Active-run pointer only: no image/video, balance, credits, or Library history. */
function saveSellerPackRecovery(
  projectId: string,
  packRunId: string,
  jobs: Job[]
) {
  if (typeof window === "undefined") return;
  const fixed = SELLER_PACK_SLUGS.map((slug) => jobs.find((job) => job.slug === slug));
  if (
    fixed.some(
      (job) =>
        !job ||
        typeof job.packJobId !== "string" ||
        typeof job.childKey !== "string"
    )
  ) {
    return;
  }
  const run: SellerPackRecoveryRun = {
    version: 2,
    projectId,
    packRunId,
    savedAt: new Date().toISOString(),
    children: fixed.map((job) => ({
      packJobId: job!.packJobId!,
      childKey: job!.childKey!,
      slug: job!.slug,
      name: job!.name,
      aspectRatio: job!.aspectRatio === "1:1" ? "1:1" : "9:16",
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

function recoveryRunFromServerJobs(
  packRunId: string,
  jobs: NonNullable<ReturnType<typeof parseExactSellerPackServerJobs>>
): SellerPackRecoveryRun {
  return {
    version: 2,
    projectId: `account-pack:${packRunId}`,
    packRunId,
    savedAt: new Date().toISOString(),
    children: jobs.map((job, index) => {
      const fixed = SELLER_PACK_ITEMS[index];
      return {
        packJobId: job.jobId,
        childKey: fixed.key,
        slug: fixed.slug,
        name: fixed.label,
        aspectRatio: fixed.aspectRatio,
        statusHint: job.status,
        retryCount: 0,
      };
    }),
  };
}

function recoverSellerPackFromServer(
  packRunId: string,
  jobs: NonNullable<ReturnType<typeof parseExactSellerPackServerJobs>>
) {
  const run = recoveryRunFromServerJobs(packRunId, jobs);
  const recovered = reconcileSellerPackRecovery(run, jobs);
  return {
    run,
    jobs: recovered.children.map(toRecoveredJob),
    unavailable: recovered.unavailable,
  };
}

function toRecoveredJob(child: ReturnType<typeof reconcileSellerPackRecovery>["children"][number]): Job {
  const { statusHint: _hint, ...job } = child;
  void _hint;
  return job;
}

/**
 * Seller Pack / batch partial-retry eligibility.
 * Allow failed with TIMEOUT / cancel settlement (refund unconfirmed) —
 * Retry mints a new generate attempt; blocking unconfirmed left users stuck.
 * Never retry succeeded / running mid-flight (server forkRetry parity).
 */
function retryEligible(job: Job): boolean {
  // failed covers TIMEOUT · cancel-as-failed · provider fails (any creditState)
  return isSellerPackRetryableStatus(job.status);
}

/**
 * Shop-style batch: one toy photo → several presets in sequence.
 * Supports ?effects=slug1,slug2 and ?pack=seller (Seller Pack MVP).
 */
export function BatchStudio({
  initialEffects,
  pack,
  initialSku,
  initialSample,
}: {
  initialEffects?: string[];
  /** Named pack from SELLER_PACK PRD — freezes the three seller outputs. */
  pack?: "seller" | string;
  /** Character bible SKU from ?sku= (AfterPath / Next SKU carry). */
  initialSku?: string;
  /**
   * First-run Lab still from ?sample= or ?try=1 (AfterPath Next SKU).
   * Loads photo only — does not auto-run the 3-child pack (cost honesty).
   */
  initialSample?: string;
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
  const [imageProbe, setImageProbe] = useState<ImageProbe | null>(null);
  const [labStill, setLabStill] = useState(false);
  const [briefCollapsed, setBriefCollapsed] = useState(true);
  const [toyIdentity, setToyIdentity] = useState<ToyIdentity>({
    sku: (initialSku || "").trim().slice(0, 64),
    preserve: "",
  });
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
  const [meResolved, setMeResolved] = useState(false);
  const [ownsRights, setOwnsRights] = useState(false);
  const [runProjectId, setRunProjectId] = useState<string | null>(null);
  const [activePackRunId, setActivePackRunId] = useState<string | null>(null);
  const [verifiedPackRunId, setVerifiedPackRunId] = useState<string | null>(
    null
  );
  const [sellerPackRecoveryHydrated, setSellerPackRecoveryHydrated] =
    useState(!isSellerPack);
  const [sellerPackRecoveryNote, setSellerPackRecoveryNote] = useState<
    string | null
  >(null);
  /** Wall-clock while pack/batch runs — feeds GenerateWaitStage (1–3 min Mini). */
  const [packElapsed, setPackElapsed] = useState(0);
  /** Private input progress before the first Provider request is allowed. */
  const [privateInputStage, setPrivateInputStage] =
    useState<PrivateToyAssetUploadStage | null>(null);
  /** Abort in-flight pack child + rate-limit waits (parity with Create Cancel). */
  const packAbortRef = useRef<AbortController | null>(null);
  const privatePackStartIntentRef = useRef<PrivatePackStartIntent | null>(
    null
  );
  const quoteEventRef = useRef("");
  const privateUploadEnabled = canUsePrivateLaunch(me);
  const accountRecoveryEnabled =
    me?.signedIn === true && me.durableCreditsActive === true;
  const hasBoundPrivatePack = Boolean(
    activePackRunId &&
      verifiedPackRunId === activePackRunId &&
      jobs.some((job) => Boolean(job.packJobId))
  );
  // New spend intent is derived only from the current gate + current still.
  // A prior Pack may affect how its existing results are displayed, never
  // whether a new upload/provider request is allowed.
  const demoMode = !privateUploadEnabled || labStill;
  const displayDemoMode = hasBoundPrivatePack && !image ? false : demoMode;
  const canRetryBoundPrivatePack =
    hasBoundPrivatePack && privateUploadEnabled;
  const packRefreshKey = jobs
    .filter(
      (job) =>
        job.packJobId &&
        (job.status === "running" ||
          job.status === "recovery_unavailable" ||
          job.creditState === "refund unconfirmed")
    )
    .map((job) => `${job.packJobId}:${job.status}:${job.creditState || ""}`)
    .join(",");

  const { locale } = useI18n();

  function clearPrivatePackStartIntent() {
    privatePackStartIntentRef.current = null;
  }

  function privatePackStartIntentFor(
    currentImage: string
  ): PrivatePackStartIntent {
    const current = privatePackStartIntentRef.current;
    if (current?.image === currentImage) return current;
    const next: PrivatePackStartIntent = {
      image: currentImage,
      clientPackKey: `ui-pack:${mintGenerateIdempotencyKey()}`,
      inputAssetId: null,
    };
    privatePackStartIntentRef.current = next;
    return next;
  }

  useEffect(() => {
    const t = window.setTimeout(() => {
      void fetchMe().then((next) => {
        setMe(next);
        setMeResolved(true);
      });
      // Query ?sku= wins so Seller Pack AfterPath carry is not wiped by localStorage.
      setToyIdentity(hydrateToyIdentityFromQuery(initialSku));
    }, 0);
    return () => {
      window.clearTimeout(t);
      packAbortRef.current?.abort();
      packAbortRef.current = null;
    };
  }, [initialSku]);

  /**
   * Still handoff order (Create parity):
   * 1) `pikbo_pending_still` from Image studio / HeroUpload (customer still)
   * 2) else ?sample= / ?try=1 Lab still (AfterPath Next SKU)
   * Never auto-run three live children (would debit 30 without an explicit tap).
   * Customer pending still does not auto-check ownsRights (user must confirm).
   */
  useEffect(() => {
    if (!meResolved) return;
    let canceled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        // 1) Image → Seller Pack · 3 clips stashes session still; Batch must adopt.
        try {
          const pending = sessionStorage.getItem("pikbo_pending_still");
          if (pending) {
            sessionStorage.removeItem("pikbo_pending_still");
            if (!privateUploadEnabled) {
              // Public validation never displays or submits a visitor still.
              // Continue to the explicit Lab sample path, when requested.
            } else if (pending.startsWith("data:image")) {
              if (canceled) return;
              clearPrivatePackStartIntent();
              setImage(pending);
              setLabStill(false);
              setImageProbe(null);
              setBriefCollapsed(true);
              setError(null);
              // Do not setOwnsRights — customer still needs ownership confirm.
              void probeImageSize(pending).then((meta) => {
                if (!canceled && meta) setImageProbe(meta);
              });
              return;
            } else if (
              pending.startsWith("https://") ||
              pending.startsWith("http://") ||
              (pending.startsWith("/") && !pending.startsWith("//"))
            ) {
              try {
                const dataUrl = await sampleToDataUrl(pending);
                if (canceled) return;
                clearPrivatePackStartIntent();
                setImage(dataUrl);
                setLabStill(false);
                setImageProbe(null);
                setBriefCollapsed(true);
                setError(null);
                void probeImageSize(dataUrl).then((meta) => {
                  if (!canceled && meta) setImageProbe(meta);
                });
                return;
              } catch {
                if (!canceled) {
                  setError(
                    "Could not load handed-off still — upload your toy photo"
                  );
                }
                // Fall through to Lab sample if try=1 was also present.
              }
            }
            // Public, unsafe, or non-image handoffs are discarded.
          }
        } catch {
          /* private mode */
        }

        // 2) AfterPath Next SKU → /create?mode=seller-pack&try=1&sku=…
        if (!initialSample) return;
        const id = SAMPLE_TOYS.some((s) => s.id === initialSample)
          ? initialSample
          : "scout";
        try {
          const s =
            SAMPLE_TOYS.find((x) => x.id === id) ?? SAMPLE_TOYS[0];
          const dataUrl = await sampleToDataUrl(s.path);
          if (canceled) return;
          clearPrivatePackStartIntent();
          setImage(dataUrl);
          setLabStill(true);
          setImageProbe(null);
          setBriefCollapsed(true);
          // PIKBO Lab reference stills — not a visitor upload or verified provider input.
          setOwnsRights(true);
          setError(null);
          void probeImageSize(dataUrl).then((meta) => {
            if (!canceled && meta) setImageProbe(meta);
          });
        } catch {
          if (!canceled) {
            setError(
              "Could not load Lab sample — upload your toy photo or pick a sample below"
            );
          }
        }
      })();
    }, 0);
    return () => {
      canceled = true;
      window.clearTimeout(t);
    };
  }, [initialSample, meResolved, privateUploadEnabled]);

  /**
   * Re-open only the newest actionable Pack returned by the owner-scoped DB
   * endpoint. sessionStorage is an optional hint, never live identity.
   */
  useEffect(() => {
    if (!isSellerPack || !meResolved) return;
    let canceled = false;
    void (async () => {
      // A local pointer can be stale, cross-account, or terminal. It never
      // selects a Pack; the owner-scoped active endpoint is the sole authority.
      try {
        sessionStorage.removeItem(SELLER_PACK_RECOVERY_KEY);
      } catch {
        /* optional local pointer */
      }
      if (!accountRecoveryEnabled) {
        setActivePackRunId(null);
        setVerifiedPackRunId(null);
        setJobs([]);
        setSellerPackRecoveryHydrated(true);
        return;
      }

      setSellerPackRecoveryNote(
        "Checking your account for an active private Launch Pack…"
      );
      const active = await getActiveSellerPackClient();
      if (canceled) return;
      if (!active.ok) {
        setRunProjectId(null);
        setActivePackRunId(null);
        setVerifiedPackRunId(null);
        setJobs([]);
        setSellerPackRecoveryNote(
          active.code === "ACTIVE_PACK_NOT_FOUND" ||
            active.code === "404"
            ? null
            : "Private Pack recovery is temporarily unavailable."
        );
        setSellerPackRecoveryHydrated(true);
        return;
      }

      const recovered = recoverSellerPackFromServer(
        active.packRunId,
        active.jobs
      );
      setRunProjectId(recovered.run.projectId);
      setActivePackRunId(active.packRunId);
      setVerifiedPackRunId(active.packRunId);
      setSelected([...SELLER_PACK_SLUGS]);
      setJobs(recovered.jobs);
      if (active.input.skuLabel) {
        setToyIdentity((previous) => ({
          ...previous,
          sku: active.input.skuLabel || previous.sku,
        }));
      }
      setSellerPackRecoveryNote(
        recovered.unavailable > 0
          ? `${recovered.unavailable} format${recovered.unavailable === 1 ? "" : "s"} is still being checked.`
          : "Private Launch Pack restored from your account."
      );
      setSellerPackRecoveryHydrated(true);
    })();
    return () => {
      canceled = true;
    };
  }, [isSellerPack, meResolved, accountRecoveryEnabled]);

  /**
   * A recovered in-flight child may finish in another request/worker. Refresh
   * owner-scoped truth until no child is running; reads never call Provider or
   * mutate credits.
   */
  useEffect(() => {
    if (
      !isSellerPack ||
      !accountRecoveryEnabled ||
      !hasBoundPrivatePack ||
      !activePackRunId ||
      running ||
      !packRefreshKey
    ) {
      return;
    }
    let canceled = false;
    let timer: number | null = null;
    const poll = async () => {
      const status = await getSellerPackStatusClient(activePackRunId);
      if (canceled || packAbortRef.current) return;
      if (status.ok) {
        const recovered = recoverSellerPackFromServer(
          activePackRunId,
          status.jobs
        );
        setJobs(recovered.jobs);
        setSellerPackRecoveryNote(
          recovered.unavailable > 0
            ? "Some Pack state still needs reconciliation."
            : "Private Launch Pack refreshed from your account."
        );
      }
      if (!canceled) {
        // Recursive scheduling is single-flight: a slow response can never
        // overlap a newer poll and overwrite a terminal state.
        timer = window.setTimeout(() => void poll(), 5_000);
      }
    };
    timer = window.setTimeout(() => void poll(), 1_500);
    return () => {
      canceled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [
    isSellerPack,
    accountRecoveryEnabled,
    hasBoundPrivatePack,
    activePackRunId,
    running,
    packRefreshKey,
  ]);

  useEffect(() => {
    if (
      !isSellerPack ||
      !sellerPackRecoveryHydrated ||
      !runProjectId ||
      !activePackRunId ||
      verifiedPackRunId !== activePackRunId ||
      jobs.length === 0
    ) {
      return;
    }
    saveSellerPackRecovery(runProjectId, activePackRunId, jobs);
  }, [
    activePackRunId,
    isSellerPack,
    jobs,
    runProjectId,
    sellerPackRecoveryHydrated,
    verifiedPackRunId,
  ]);

  useEffect(() => {
    if (!running) return;
    // Elapsed clock only while pack is running; reset is done when starting a pack.
    const t0 = Date.now();
    const id = window.setInterval(() => {
      setPackElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [running]);

  function beginPackOperation(): AbortController | null {
    // React state is not a synchronous lock: two taps in one event turn can
    // both observe running=false. The ref owns exactly one operation.
    if (packAbortRef.current) return null;
    const controller = new AbortController();
    packAbortRef.current = controller;
    setRunning(true);
    return controller;
  }

  function finishPackOperation(controller: AbortController) {
    // A stale finally block must never unlock a newer operation.
    if (packAbortRef.current !== controller) return;
    packAbortRef.current = null;
    setRunning(false);
  }

  async function refreshVerifiedPackFromServer(
    packRunId: string,
    successNote = "Private Launch Pack refreshed from your account."
  ): Promise<Job[] | null> {
    const status = await getSellerPackStatusClient(packRunId);
    if (!status.ok) return null;
    const recovered = recoverSellerPackFromServer(packRunId, status.jobs);
    setJobs(recovered.jobs);
    setSellerPackRecoveryNote(
      recovered.unavailable > 0
        ? "Some Pack state still needs reconciliation."
        : successNote
    );
    return recovered.jobs;
  }

  function cancelInFlightPack() {
    const ctrl = packAbortRef.current;
    if (!ctrl) return;
    ctrl.abort();
    // The owning operation releases the mutex in its guarded finally block.
    setError(
      "Stopping this browser operation. Finished formats stay available; Pikbo will refresh the server record before another action."
    );
  }

  const isFree = me?.plan === "free" || me?.watermark === true;
  /** Soft-launch freeTrial honesty — same contract as Create / SoftLaunchStrip. */
  const trialDone = freeTrialExhausted(me);
  const freeLive = me?.freeTrial?.freeLive;
  const clipsLeft =
    typeof me?.freeTrial?.clipsLeft === "number"
      ? me.freeTrial.clipsLeft
      : typeof me?.credits === "number"
        ? Math.floor(me.credits / CREDITS_PER_VIDEO)
        : null;
  /** Any admitted private Live call uses the measured Fast 720p / 5s envelope. */
  const effectiveDuration = demoMode ? (isFree ? 5 : duration) : 5;
  const effectiveResolution = demoMode
    ? isFree
      ? "480p"
      : "720p"
    : SELLER_PACK_LIVE_RESOLUTION;
  const effectiveModel = demoMode
    ? isFree
      ? "seedance-mini"
      : "seedance-fast"
    : SELLER_PACK_LIVE_MODEL_ID;
  const liveContractLabel =
    effectiveModel === SELLER_PACK_LIVE_MODEL_ID
      ? `Invited Fast · ${effectiveResolution} · ${effectiveDuration}s`
      : `Free Mini · ${effectiveResolution} · ${effectiveDuration}s`;
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
    if (packAbortRef.current) {
      setError("Stop the current Pack before replacing its photo.");
      return;
    }
    if (!privateUploadEnabled) {
      setError(
        "Product-photo upload is available only inside the invited private beta."
      );
      return;
    }
    if (
      !file ||
      !["image/jpeg", "image/png", "image/webp"].includes(
        file.type.toLowerCase()
      )
    ) {
      setError("Upload a JPEG, PNG, or WebP photo of your toy.");
      return;
    }
    if (file.size > 8_000_000) {
      setError("Image too large (max ~8MB).");
      return;
    }
    // A deliberate file selection starts a new upload intent, even when the
    // user selects the same bytes again.
    clearPrivatePackStartIntent();
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImage(dataUrl);
      setImageProbe(null);
      setLabStill(false);
      setOwnsRights(false);
      setBriefCollapsed(true);
      setError(null);
      track({
        event: "asset_upload_complete",
        path: "/create",
        recipe: sellerPackActive ? "seller-starter-pack" : "custom-batch",
        demo: demoMode,
        meta: { source: "owned_upload" },
      });
      void probeImageSize(dataUrl).then((meta) => {
        if (meta) setImageProbe(meta);
      });
    };
    reader.readAsDataURL(file);
  }

  async function chooseLabSample(sampleId: string) {
    if (packAbortRef.current) {
      setError("Stop the current Pack before changing its sample.");
      return;
    }
    try {
      const sample =
        SAMPLE_TOYS.find((candidate) => candidate.id === sampleId) ??
        SAMPLE_TOYS[0];
      const dataUrl = await sampleToDataUrl(sample.path);
      clearPrivatePackStartIntent();
      setImage(dataUrl);
      setLabStill(true);
      setOwnsRights(true);
      setImageProbe(null);
      setBriefCollapsed(false);
      setError(null);
      void probeImageSize(dataUrl).then((meta) => {
        if (meta) setImageProbe(meta);
      });
    } catch {
      setError("Lab sample could not be loaded. Try another sample.");
    }
  }

  const packAssetBrief = useMemo(
    () =>
      buildAssetBrief({
        hasImage: Boolean(image),
        probe: imageProbe,
        effect: "360-spin-showcase",
        jobId: "seller-pack",
        identity: toyIdentity,
        labSample: labStill,
        locale: locale === "zh" ? "zh" : "en",
      }),
    [image, imageProbe, toyIdentity, labStill, locale]
  );

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
    packRunId?: string | null,
    /** Phase D: shared still asset — avoids re-posting multi-MB Base64 per child */
    sharedAssetId?: string | null,
    signal?: AbortSignal,
    retryAttemptKey?: string
  ): Promise<{
    job: Job;
    stopQueue: boolean;
    /** Caller should re-register still for remaining pack children. */
    recoveredFromAssetMiss?: boolean;
    retryAfterSec?: number;
  }> {
    const jobAspect = job.aspectRatio ?? aspectRatio;
    const boundPrivateChild = Boolean(packRunId && job.packJobId);
    const jobDemoMode = boundPrivateChild ? false : demoMode;
    const jobDuration = boundPrivateChild ? 5 : effectiveDuration;
    const jobResolution = boundPrivateChild
      ? SELLER_PACK_LIVE_RESOLUTION
      : effectiveResolution;
    const jobModel = boundPrivateChild
      ? SELLER_PACK_LIVE_MODEL_ID
      : effectiveModel;
    const dualStill =
      image && image.startsWith("data:image") && image.length < 3_500_000
        ? image
        : undefined;
    // CD: same still + character bible across all pack children (prompt extra only).
    const packExtra = composeExtraWithIdentity(toyIdentity, "");
    // Unique key per child attempt so abort cancelGenerateLedger hits the right row.
    const childIdempotencyKey =
      retryAttemptKey ?? mintGenerateIdempotencyKey();
    // A verified server-owned child is always resumed against its private
    // bound input. The currently selected Lab still controls only a new run.
    const privateInputPayload = jobDemoMode || boundPrivateChild
      ? {}
      : sharedAssetId
        ? {
            assetId: sharedAssetId,
            ...(dualStill ? { image: dualStill } : {}),
          }
        : { image: dualStill ?? image ?? undefined };
    const result = await postGenerateWithRetry(
      {
        effect: job.slug,
        idempotencyKey: childIdempotencyKey,
        ...(packRunId && job.packJobId
          ? { packRunId, packJobId: job.packJobId }
          : {}),
        // Dual-send when possible: assetId for smaller POSTs + inline still for
        // multi-instance (Vercel) memory-asset misses.
        ...privateInputPayload,
        duration: jobDuration,
        aspectRatio: jobAspect,
        model: jobModel,
        resolution: jobResolution,
        ownsRights: boundPrivateChild ? true : ownsRights,
        allowProviderSpend: !jobDemoMode,
        ...(packExtra ? { extra: packExtra } : {}),
      },
      {
        maxRetries: 1,
        // Mid-pack asset TTL / process restart: recover with local still once.
        fallbackImage:
          !jobDemoMode &&
          !packRunId &&
          sharedAssetId &&
          image &&
          image.startsWith("data:image")
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
    pushHistory(
      historyFieldsFromSuccess(data, {
        effect: job.slug,
        effectName: job.name,
        fallbackDuration: jobDuration,
        fallbackAspect: jobAspect,
        fallbackResolution: jobResolution,
        projectId,
        projectName: sellerPackActive
          ? "Launch Pack · 3 clips / 30 credits"
          : "Custom batch",
        inputImage:
          !jobDemoMode && image && image.length <= 300_000
            ? image
            : undefined,
        channel: SELLER_PACK_ITEMS.find((item) => item.slug === job.slug)
          ?.channel,
        // SKU for Library By-SKU + Remake bible carry
        sku: toyIdentity.sku || undefined,
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
            : jobDuration,
        resolution:
          typeof data.resolution === "string"
            ? data.resolution
            : jobResolution,
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
    if (isSellerPack && !sellerPackRecoveryHydrated) {
      setError("Checking your account for an active Launch Pack…");
      return;
    }
    if (packAbortRef.current) return;
    if (!image || !isValidImageDataUrl(image)) {
      setError("Add a toy photo first (JPEG, PNG, or WebP).");
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

    // Phase F / PRD §6: never start a live full pack on Free Mini (10 < 30).
    // Cached demos stay free. Live children use generate cost gate (not cookie).
    const liveStart = sellerPackLiveStartAllowed({
      demo: demoMode,
      balance: typeof me?.credits === "number" ? me.credits : undefined,
      childCount: selected.length,
    });
    if (!liveStart.ok) {
      setError(liveStart.message);
      return;
    }

    const abortCtrl = beginPackOperation();
    if (!abortCtrl) return;
    const projectId = `${sellerPackActive ? "seller-pack" : "batch"}-${Date.now()}`;
    track({
      event: "pack_start",
      path: "/create",
      recipe: sellerPackActive ? "seller-starter-pack" : "custom-batch",
      demo: demoMode,
      meta: {
        outputs: selected.length,
        credits: demoMode ? 0 : selected.length * CREDITS_PER_VIDEO,
      },
    });
    setError(null);
    setFailRetryAfterSec(null);
    setPackElapsed(0);
    setPrivateInputStage(null);
    try {
      // Live Launch Pack opens one atomic 30-credit reservation and receives
      // exactly three server-created child ids. Failure is terminal for this
      // run; there is no shadow/per-child fallback.
      let reservedPack:
        | Extract<
            Awaited<ReturnType<typeof reserveSellerPackClient>>,
            { ok: true }
          >
        | null = null;
      let runPackId: string | null = null;
      if (sellerPackActive && !demoMode) {
        const startIntent = privatePackStartIntentFor(image);
        if (!startIntent.inputAssetId) {
          const registeredInput = await registerPrivateToyAsset(
            image,
            toyIdentity.sku,
            setPrivateInputStage
          );
          if (!registeredInput.ok) {
            setPrivateInputStage("error");
            setError(registeredInput.error);
            return;
          }
          startIntent.inputAssetId = registeredInput.inputAssetId;
        }
        if (abortCtrl.signal.aborted) return;
        const reserved = await reserveSellerPackClient({
          clientPackKey: startIntent.clientPackKey,
          inputAssetId: startIntent.inputAssetId,
          rightsConfirmed: true,
        });
        if (!reserved.ok) {
          setError(reserved.error);
          return;
        }
        reservedPack = reserved;
        runPackId = reserved.packRunId;
      }

      // Defense in depth: never translate or run a server-owned child unless
      // the complete response still matches the frozen three-child contract.
      const verifiedReservedJobs = reservedPack
        ? parseExactSellerPackServerJobs(reservedPack.jobs)
        : null;
      if (reservedPack && !verifiedReservedJobs) {
        setError(
          "Pikbo could not verify this Launch Pack. No generation started; your 30 credits remain protected while the Pack is checked."
        );
        return;
      }

      // A lost reserve response may be retried with the same browser-local
      // clientPackKey. On an idempotent replay, restore owner-scoped truth and
      // stop: never translate the replay into three new provider calls.
      if (reservedPack?.idempotent && runPackId && verifiedReservedJobs) {
        const recovered = recoverSellerPackFromServer(
          runPackId,
          verifiedReservedJobs
        );
        setRunProjectId(recovered.run.projectId);
        setActivePackRunId(runPackId);
        setVerifiedPackRunId(runPackId);
        setSelected([...SELLER_PACK_SLUGS]);
        setJobs(recovered.jobs);
        setSellerPackRecoveryNote(
          "Existing Launch Pack reservation restored. Continue only server-confirmed pending formats."
        );
        return;
      }

      // Phase D: register still once — non-Pack batch children reuse assetId.
      let sharedAssetId: string | null = null;
      if (
        !demoMode &&
        !sellerPackActive &&
        image.startsWith("data:image")
      ) {
        const reg = await registerLocalAsset(image);
        if (reg?.assetId) sharedAssetId = reg.assetId;
      }

      const queue: Job[] = verifiedReservedJobs
        ? verifiedReservedJobs.map((serverJob, index) => {
            // parseExactSellerPackServerJobs proves positional identity.
            const item = SELLER_PACK_ITEMS[index];
            return {
              packJobId: serverJob.jobId,
              childKey: serverJob.childKey,
              slug: item.slug,
              name: item.label,
              status: "queued" as const,
              aspectRatio: item.aspectRatio,
              retryCount: 0,
            };
          })
        : selected.map((slug) => {
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

      // Commit Pack identity and its three children as one validated UI step.
      // A malformed/failed reserve can never pair a new run id with old jobs.
      setRunProjectId(projectId);
      if (runPackId && verifiedReservedJobs) {
        setActivePackRunId(runPackId);
        setVerifiedPackRunId(runPackId);
      }
      setJobs(queue);
      setPrivateInputStage(null);

      for (let i = 0; i < queue.length; i++) {
        if (abortCtrl.signal.aborted) break;
        setJobs((prev) =>
          prev.map((j, idx) => (idx === i ? { ...j, status: "running" } : j))
        );
        const outcome = await executeJob(
          queue[i],
          projectId,
          runPackId,
          sharedAssetId,
          abortCtrl.signal
        );
        queue[i] = outcome.job;
        setJobs((previous) =>
          previous.map((job, index) => (index === i ? outcome.job : job))
        );
        // Mid-pack asset miss: re-register still so remaining children use a fresh assetId.
        if (
          !demoMode &&
          !sellerPackActive &&
          outcome.recoveredFromAssetMiss &&
          image?.startsWith("data:image")
        ) {
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
            setError(outcome.job.error ?? "Launch Pack paused");
            setFailRetryAfterSec(
              typeof outcome.retryAfterSec === "number"
                ? outcome.retryAfterSec
                : null
            );
          }
          setJobs((previous) =>
            previous.map((job, index) =>
              index > i && job.status === "queued"
                ? {
                    ...job,
                    error:
                      "Reserved but unstarted; the worker will release it at expiry.",
                  }
                : job
            )
          );
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
                    job.status === "running" ? "failed" : "queued",
                  error:
                    job.status === "running"
                      ? "Canceled · refund unconfirmed if live debit started"
                      : "Reserved but unstarted; the worker will release it at expiry.",
                  creditState:
                    job.status === "running"
                      ? "refund unconfirmed"
                      : job.creditState,
                }
              : job
          )
        );
      } else {
        setError(e instanceof Error ? e.message : "Batch failed");
      }
    } finally {
      setPrivateInputStage(null);
      finishPackOperation(abortCtrl);
    }
  }

  async function retryJob(slug: string) {
    const boundLivePackRetry =
      sellerPackActive && canRetryBoundPrivatePack;
    if (
      running ||
      packAbortRef.current ||
      (!boundLivePackRetry && (!image || !ownsRights))
    ) {
      return;
    }
    const target = jobs.find((job) => job.slug === slug);
    if (!target || !retryEligible(target)) {
      return;
    }
    const abortCtrl = beginPackOperation();
    if (!abortCtrl) return;
    const projectId =
      runProjectId ??
      `${sellerPackActive ? "seller-pack" : "batch"}-retry-${target.slug}`;
    setRunProjectId(projectId);
    setPackElapsed(0);
    setError(null);
    try {
      let sharedAssetId: string | null = null;
      if (
        !boundLivePackRetry &&
        !demoMode &&
        image?.startsWith("data:image")
      ) {
        const reg = await registerLocalAsset(image);
        if (reg?.assetId) sharedAssetId = reg.assetId;
      }
      if (abortCtrl.signal.aborted) return;
      const retryAttemptKey = mintGenerateIdempotencyKey();
      if (boundLivePackRetry) {
        if (!activePackRunId || !target.packJobId) {
          setError("Durable Launch Pack ids are missing; refresh to recover.");
          return;
        }
        const reopened = await retrySellerPackChildClient({
          packRunId: activePackRunId,
          packJobId: target.packJobId,
          attemptKey: retryAttemptKey,
        });
        if (!reopened.ok) {
          setError(reopened.error);
          await refreshVerifiedPackFromServer(activePackRunId);
          return;
        }
        if (abortCtrl.signal.aborted) {
          await refreshVerifiedPackFromServer(activePackRunId);
          return;
        }
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
      const outcome = await executeJob(
        retrying,
        projectId,
        boundLivePackRetry ? activePackRunId : null,
        sharedAssetId,
        abortCtrl.signal,
        retryAttemptKey
      );
      setJobs((previous) =>
        previous.map((job) => (job.slug === slug ? outcome.job : job))
      );
      if (!outcome.job.videoUrl) {
        setError(outcome.job.error ?? "Retry failed");
      }
    } catch (retryError) {
      if (boundLivePackRetry && activePackRunId) {
        const refreshed = await refreshVerifiedPackFromServer(activePackRunId);
        if (!refreshed) {
          setJobs((previous) =>
            previous.map((job) =>
              job.packJobId === target.packJobId
                ? {
                    ...job,
                    status: "recovery_unavailable",
                    error: "Checking the server record before another retry.",
                  }
                : job
            )
          );
        }
      }
      if (
        !(
          retryError instanceof Error &&
          retryError.name === "AbortError"
        )
      ) {
        setError(
          retryError instanceof Error ? retryError.message : "Retry failed"
        );
      }
    } finally {
      finishPackOperation(abortCtrl);
    }
  }

  /** Phase F: partial failure — re-run only failed/refunded children; successes stay. */
  async function retryAllFailed() {
    const boundLivePackRetry =
      sellerPackActive && canRetryBoundPrivatePack;
    if (
      running ||
      packAbortRef.current ||
      (!boundLivePackRetry && (!image || !ownsRights))
    ) {
      return;
    }
    const failed = jobs.filter(retryEligible);
    if (failed.length === 0) return;
    const abortCtrl = beginPackOperation();
    if (!abortCtrl) return;
    const projectId =
      runProjectId ??
      `${sellerPackActive ? "seller-pack" : "batch"}-retry-failed-${Date.now().toString(36)}`;
    setRunProjectId(projectId);
    setPackElapsed(0);
    setError(null);
    try {
      let sharedAssetId: string | null = null;
      if (
        !boundLivePackRetry &&
        !demoMode &&
        image?.startsWith("data:image")
      ) {
        const reg = await registerLocalAsset(image);
        if (reg?.assetId) sharedAssetId = reg.assetId;
      }
      for (let i = 0; i < failed.length; i++) {
        if (abortCtrl.signal.aborted) break;
        const target = failed[i];
        const retryAttemptKey = mintGenerateIdempotencyKey();
        if (boundLivePackRetry) {
          if (!activePackRunId || !target.packJobId) {
            setError(
              `Cannot retry ${target.name}: durable Launch Pack ids are missing.`
            );
            break;
          }
          const reopened = await retrySellerPackChildClient({
            packRunId: activePackRunId,
            packJobId: target.packJobId,
            attemptKey: retryAttemptKey,
          });
          if (!reopened.ok) {
            setError(reopened.error);
            await refreshVerifiedPackFromServer(activePackRunId);
            break;
          }
          if (abortCtrl.signal.aborted) {
            await refreshVerifiedPackFromServer(activePackRunId);
            break;
          }
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
          previous.map((job) => (job.slug === target.slug ? retrying : job))
        );
        const outcome = await executeJob(
          retrying,
          projectId,
          boundLivePackRetry ? activePackRunId : null,
          sharedAssetId,
          abortCtrl.signal,
          retryAttemptKey
        );
        setJobs((previous) =>
          previous.map((job) =>
            job.slug === target.slug ? outcome.job : job
          )
        );
        if (!outcome.job.videoUrl) {
          setError(outcome.job.error ?? `Retry failed · ${target.name}`);
        }
        if (outcome.stopQueue || abortCtrl.signal.aborted) {
          if (boundLivePackRetry && activePackRunId) {
            await refreshVerifiedPackFromServer(activePackRunId);
          }
          if (!abortCtrl.signal.aborted) {
            setError(
              outcome.job.error ??
                "Retry paused until this format's server state is confirmed."
            );
          }
          break;
        }
        if (i < failed.length - 1) {
          await sleep(400, abortCtrl.signal);
        }
      }
    } catch (e) {
      if (boundLivePackRetry && activePackRunId) {
        const refreshed = await refreshVerifiedPackFromServer(activePackRunId);
        if (!refreshed) {
          setJobs((previous) =>
            previous.map((job) =>
              job.status === "running"
                ? {
                    ...job,
                    status: "recovery_unavailable",
                    error: "Checking the server record before another retry.",
                  }
                : job
            )
          );
        }
      }
      if (!(e instanceof Error && e.name === "AbortError")) {
        setError(e instanceof Error ? e.message : "Retry failed");
      }
    } finally {
      finishPackOperation(abortCtrl);
    }
  }

  /** Continue only already-reserved queued children after refresh or a pause. */
  async function continueQueuedPack() {
    if (
      running ||
      packAbortRef.current ||
      !sellerPackRecoveryHydrated ||
      !canRetryBoundPrivatePack ||
      !activePackRunId
    ) {
      return;
    }
    const abortCtrl = beginPackOperation();
    if (!abortCtrl) return;
    const boundPackRunId = activePackRunId;
    const projectId =
      runProjectId ?? `account-pack:${boundPackRunId}`;
    setRunProjectId(projectId);
    setPackElapsed(0);
    setError(null);
    try {
      // Local queued hints are never authority. Fetch owner-scoped DB truth
      // first so a delayed success/conflict cannot be submitted again.
      const currentStatus = await getSellerPackStatusClient(boundPackRunId);
      if (!currentStatus.ok) {
        setError(currentStatus.error);
        return;
      }
      const canonical = recoverSellerPackFromServer(
        boundPackRunId,
        currentStatus.jobs
      );
      setJobs(canonical.jobs);
      const pending = canonical.jobs.filter(
        (job) => job.status === "queued"
      );
      if (pending.length === 0 || abortCtrl.signal.aborted) {
        setSellerPackRecoveryNote(
          "No server-confirmed queued format needs continuation."
        );
        return;
      }

      for (let index = 0; index < pending.length; index++) {
        if (abortCtrl.signal.aborted) break;
        const target: Job = {
          ...pending[index],
          status: "running",
          error: undefined,
          errorCode: undefined,
        };
        setJobs((previous) =>
          previous.map((job) =>
            job.packJobId === target.packJobId ? target : job
          )
        );
        const outcome = await executeJob(
          target,
          projectId,
          boundPackRunId,
          null,
          abortCtrl.signal
        );
        // Generate success and all conflicts are reconciled from the server.
        // Never translate an ambiguous client response into a local failure.
        const refreshed = await refreshVerifiedPackFromServer(
          boundPackRunId,
          "Continued Pack refreshed from your account."
        );
        if (!refreshed) {
          setJobs((previous) =>
            previous.map((job) =>
              job.packJobId === target.packJobId
                ? {
                    ...job,
                    status: "recovery_unavailable",
                    error:
                      "The server result is being checked before another action.",
                  }
                : job
            )
          );
          setError(
            "Could not confirm the server result. Pikbo will keep checking; no local failure was recorded."
          );
          break;
        }
        const confirmed = refreshed.find(
          (job) => job.packJobId === target.packJobId
        );
        if (confirmed?.status !== "succeeded") {
          setError(
            outcome.job.error ??
              "The server has not confirmed this format as ready; Pikbo will keep checking."
          );
          break;
        }
        if (index < pending.length - 1) {
          await sleep(400, abortCtrl.signal);
        }
      }
    } catch (error) {
      const refreshed = await refreshVerifiedPackFromServer(boundPackRunId);
      if (!refreshed) {
        setJobs((previous) =>
          previous.map((job) =>
            job.status === "running"
              ? {
                  ...job,
                  status: "recovery_unavailable",
                  error: "The server result is being checked.",
                }
              : job
          )
        );
      }
      if (!(error instanceof Error && error.name === "AbortError")) {
        setError(
          error instanceof Error
            ? error.message
            : "Could not continue the queued Pack"
        );
      }
    } finally {
      finishPackOperation(abortCtrl);
    }
  }

  const doneCount = jobs.filter((j) => j.status === "succeeded").length;
  /** HF Product three-step: upload → run → deliver */
  const sellerStep: 1 | 2 | 3 = !image && !hasBoundPrivatePack
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
  const queuedContinueCount = jobs.filter(
    (job) => job.status === "queued"
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

  /**
   * Phase F: sequential multi-file save of downloadable children only.
   * No server ZIP (needs object storage). Free raw / failed siblings omitted.
   */
  /**
   * Per-child download: HEAD /api/downloads first (Create/Library parity) so
   * canceled / timeout / in-flight never open a dead tab. Allowed GET uses
   * downloadVideoFile (blob) — never window.open the gate (JSON error tabs).
   */
  async function downloadChild(j: Job) {
    const downloadAllowed = canDownloadResult({
      demo: Boolean(j.demo),
      watermark: Boolean(j.watermark),
    });
    if (!downloadAllowed) {
      setError(freeLiveDownloadBlockReason());
      return;
    }
    const filename = `pikbo-pack-${(j.slug || j.name || "clip")
      .toString()
      .slice(0, 32)}.mp4`;
    if (j.requestId) {
      const gateUrl = `/api/downloads/${encodeURIComponent(j.requestId)}`;
      try {
        const head = await fetch(gateUrl, { method: "HEAD" });
        const gate = classifyDownloadHead({
          status: head.status,
          code: head.headers.get("X-Pikbo-Download-Code"),
          t6Mode: head.headers.get("X-Pikbo-T6"),
        });
        if (gate.kind === "block") {
          setError(`${j.name || j.slug}: ${gate.message}`);
          return;
        }
        if (gate.kind === "allow") {
          setError(null);
          const result = await downloadVideoFile(gateUrl, filename);
          if (result === "ok" || result === "fallback") return;
          if (result === "blocked" || result === "unsafe") {
            setError(
              `${j.name || j.slug}: download blocked by a delivery safety check`
            );
            return;
          }
          setError(`${j.name || j.slug}: download failed`);
          return;
        }
        if (gate.kind === "not_found") {
          setError(`${j.name || j.slug}: ${gate.message}`);
        }
      } catch {
        /* fall through to safe direct URL */
      }
    }
    if (j.videoUrl && isSafeDeliverableUrl(j.videoUrl)) {
      setError(null);
      const result = await downloadVideoFile(j.videoUrl, filename);
      if (result === "ok" || result === "fallback") return;
      if (result === "unsafe") {
        setError(`${j.name || j.slug}: unsafe deliverable URL`);
        return;
      }
      setError(`${j.name || j.slug}: download failed`);
      return;
    }
    setError(`No safe download URL for ${j.name || j.slug}`);
  }

  async function downloadAvailableClips() {
    const targets = sellerPackAvailableDownloads(exportItems);
    if (targets.length === 0 || exportBusy) return;
    setExportBusy(true);
    try {
      let ok = 0;
      let fallback = 0;
      let blocked = 0;
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        const result = await downloadVideoFile(t.href, t.filename);
        if (result === "ok") ok += 1;
        else if (result === "fallback") fallback += 1;
        else if (result === "blocked" || result === "unsafe") blocked += 1;
        // "fail" stays uncounted — never claim multi-download success
        if (i < targets.length - 1) {
          await sleep(350);
        }
      }
      if (ok + fallback === 0) {
        setError(
          blocked > 0
            ? "Could not download the Pack. Try each available clip's Download button."
            : "Could not download the available clips. A link may be blocked or expired; try each clip's Download button."
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

  useEffect(() => {
    if (!image || selected.length === 0) return;
    const signature = `${sellerPackActive}:${selected.join(",")}:${packQuote.totalCredits}:${demoMode}`;
    if (quoteEventRef.current === signature) return;
    quoteEventRef.current = signature;
    track({
      event: "pack_quote_view",
      path: "/create",
      recipe: sellerPackActive ? "seller-starter-pack" : "custom-batch",
      demo: demoMode,
      meta: {
        outputs: selected.length,
        credits: packQuote.totalCredits,
      },
    });
  }, [
    image,
    selected,
    sellerPackActive,
    packQuote.totalCredits,
    demoMode,
  ]);

  /** CD Phase B3 — Seller Pack Director Plan (total cost before run). */
  const sellerDirectorPlan = useMemo(() => {
    if (!sellerPackActive) return null;
    return buildSellerPackDirectorPlan({
      hasImage: Boolean(image),
      demoMode,
      isFree: Boolean(isFree),
      trialDone,
      creditsLeft: typeof me?.credits === "number" ? me.credits : null,
      clipsLeft,
      ownsRights,
      durationSec: freeLive?.durationSec ?? effectiveDuration,
      resolution: freeLive?.resolution ?? effectiveResolution,
      labSample: labStill,
      identity: toyIdentity,
    });
  }, [
    sellerPackActive,
    image,
    demoMode,
    isFree,
    trialDone,
    me?.credits,
    freeLive?.durationSec,
    freeLive?.resolution,
    clipsLeft,
    ownsRights,
    effectiveDuration,
    effectiveResolution,
    labStill,
    toyIdentity,
  ]);
  const canRun =
    !running &&
    (!isSellerPack || sellerPackRecoveryHydrated) &&
    Boolean(image) &&
    selected.length > 0 &&
    ownsRights &&
    liveQuoteCovered;

  const primaryBatchLabel = running
    ? `${sellerPackActive ? "Launch Pack" : "Batch"} running… ${doneCount}/${jobs.length}`
    : !image
      ? privateUploadEnabled
        ? "Upload owned toy photo"
        : "Choose a Pikbo Lab sample"
      : !ownsRights
        ? "Confirm ownership to continue"
        : demoMode
          ? sellerPackActive
            ? "Preview the 3 Launch Pack formats"
            : `Run batch · ${selected.length} · cached free`
          : trialDone && isFree && !liveQuoteCovered
            ? "Free Mini trial used · open single Generate or plans"
            : sellerPackActive
              ? `Generate Launch Pack · ${sellerPackQuoteLabel(packQuote)}`
              : `Run batch · ${batchQuoteLabel(packQuote)}`;

  const privateInputStageLabel = privateInputStage
    ? {
        reading: "Reading your toy photo…",
        hashing: "Checking photo integrity…",
        reserving: "Preparing private storage…",
        uploading: "Uploading privately…",
        verifying: "Verifying the private photo…",
        ready: "Photo verified · reserving 30 credits…",
        error: "Private upload needs retry",
      }[privateInputStage]
    : null;

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
          Public Lab preview · no product photo is accepted or processed · 0
          credits.
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
                : ` · ${liveContractLabel}`}
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
                ? " — trial exhausted; Lab previews stay free · Founding Studio is not open yet"
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
    <div className="mt-5 grid gap-6 pb-44 lg:mt-8 lg:grid-cols-[1fr_1.1fr] lg:pb-0">
      <div className="space-y-4">
        {sellerPackActive && (
          <div className="space-y-3">
            <div className="rounded-[0.9rem] border border-white/[0.08] bg-[#121214] px-3.5 py-3 text-xs text-[var(--fg-muted)]">
              <p className="font-semibold text-[#C8FF3D]">
                {displayDemoMode
                  ? "Launch Pack — 3 cached prototype previews"
                  : "Launch Pack — 3 private clips / 30 credits"}
              </p>
              <p className="mt-1 leading-relaxed text-white/55">
                {displayDemoMode
                  ? "Preview three formats at 0 credits. Cached prototypes do not process your upload."
                  : "Review the 30-credit quote, then create three independent private clips."}
              </p>
              <div
                className="mt-3 grid grid-cols-3 gap-2"
                data-seller-pack-outcomes="preset-first"
                aria-label="Fixed Launch Pack outcomes"
              >
                {SELLER_PACK_ITEMS.map((item, index) => (
                  <article
                    key={item.key}
                    className="min-w-0 rounded-xl border border-white/[0.08] bg-[#1A1A1E] p-2.5 text-[#F4F4F5] sm:p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-medium uppercase tracking-[0.13em] text-[#C8FF3D]">
                        0{index + 1}
                      </span>
                      <span className="hidden rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-medium text-white/58 sm:inline-flex">
                        {item.aspectRatio} · {item.durationSec}s
                      </span>
                    </div>
                    <p className="mt-6 text-[11px] font-semibold leading-tight sm:text-sm">
                      {item.label}
                    </p>
                    <p className="mt-1 hidden text-[10px] font-normal text-[#F4F4F5]/42 sm:block">
                      {item.channel}
                    </p>
                    <p className="mt-2 text-[9px] font-medium text-[#F4F4F5]/52 sm:text-[10px]">
                      {displayDemoMode
                        ? "Cached Lab preview · 0 credits"
                        : "Private output · 10 credits"}
                    </p>
                  </article>
                ))}
              </div>
              {/* Y5 + CD B3: full Director Plan when still ready; strip before photo */}
              {hasBoundPrivatePack && !image ? null : demoMode ? null : sellerDirectorPlan?.ready ? (
                <div className="mt-2" data-seller-pack-plan="director">
                  <DirectorPlanPanel plan={sellerDirectorPlan} />
                </div>
              ) : (
                <div className="mt-2">{creditStrip}</div>
              )}
            </div>
            <SellerPackSteps step={sellerStep} demoMode={displayDemoMode} />
            {hasBoundPrivatePack ? (
              <p
                data-seller-pack-recovery="durable-pointer"
                className="rounded-lg border border-amber-300/20 bg-amber-300/[0.04] px-3 py-2 text-[10px] leading-relaxed text-amber-100/85"
              >
                This active Pack, its original private input, and every
                available result are restored after refresh or sign-in.
              </p>
            ) : null}
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
                Launch Pack
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
            {privateUploadEnabled
              ? "Upload owned toy photo"
              : "Choose a Pikbo Lab sample"}
          </p>
          {privateUploadEnabled ? (
            <label
              id="seller-pack-photo"
              htmlFor="seller-pack-photo-input"
              tabIndex={0}
              className={`flex aspect-video cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[0.9rem] border bg-[#121214] transition-all duration-200 hover:border-[#C8FF3D]/45 hover:bg-[#1A1A1E] ${
                image
                  ? "border-white/12 ring-1 ring-white/5"
                  : "border-[#C8FF3D]/28"
              }`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                loadFile(event.dataTransfer.files?.[0]);
              }}
              onPaste={(event) => {
                const pasted = Array.from(event.clipboardData.items)
                  .find((item) => item.kind === "file")
                  ?.getAsFile();
                if (pasted) loadFile(pasted);
              }}
            >
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt={labStill ? "Pikbo Lab sample" : "Uploaded toy"}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="px-4 text-center text-sm text-[var(--fg-dim)]">
                  <span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[#C8FF3D]" aria-hidden>
                    Product input
                  </span>
                  Drop or paste one rights-owned toy photo for the whole{" "}
                  {sellerPackActive ? "pack" : "batch"}
                  <br />
                  <span className="text-xs">
                    or tap to choose · JPEG / PNG / WebP · under ~8 MB
                  </span>
                </span>
              )}
              <input
                id="seller-pack-photo-input"
                type="file"
                disabled={running}
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => loadFile(event.target.files?.[0])}
              />
            </label>
          ) : (
            <div
              id="seller-pack-photo"
              data-public-pack-preview="lab-only"
              className="flex aspect-video flex-col items-center justify-center overflow-hidden rounded-[0.9rem] border border-[#C8FF3D]/24 bg-[#121214]"
            >
              {image && labStill ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt="Selected Pikbo Lab sample"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="max-w-sm px-5 text-center text-sm leading-6 text-[var(--fg-dim)]">
                  <span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[#C8FF3D]" aria-hidden>
                    Pikbo Lab
                  </span>
                  Public preview uses Pikbo Lab samples only.
                  <br />
                  <span className="text-xs">
                    No product-photo input is accepted or processed here.
                  </span>
                </span>
              )}
            </div>
          )}
          {privateUploadEnabled &&
          image &&
          !labStill &&
          packAssetBrief.ready ? (
            <AssetBriefPanel
              className="mt-3"
              brief={packAssetBrief}
              identity={toyIdentity}
              onIdentityPatch={(patch) => {
                setToyIdentity((prev) => {
                  const next = { ...prev, ...patch };
                  return saveToyIdentity(next);
                });
              }}
              onPickRecipe={(slug) => {
                // Seller Pack trio is fixed — deep-link single Generate for other recipes.
                if (typeof window !== "undefined") {
                  window.location.href = createRemixHref(
                    slug,
                    undefined,
                    toyIdentity.sku || null
                  );
                }
              }}
              collapsed={briefCollapsed}
              onToggle={() => setBriefCollapsed((v) => !v)}
            />
          ) : null}
          {!image || labStill ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {SAMPLE_TOYS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  className="min-h-11 rounded-full border border-white/10 bg-white/[0.025] px-3 py-2.5 text-xs font-medium text-white/60 hover:border-[#C8FF3D]/40 hover:text-[#C8FF3D]"
                  onClick={() => void chooseLabSample(sample.id)}
                >
                  Sample: {sample.label}
                </button>
              ))}
              <p className="w-full text-[10px] font-medium text-[#C8FF3D]">
                {privateUploadEnabled
                  ? "Lab samples stay cached. Replace the sample with your own photo for private generation."
                  : "Lab samples are archived prototypes · not a customer upload · 0 credits."}
              </p>
            </div>
          ) : null}
        </div>

        {!isSellerPack ? (
          <div className="grid grid-cols-2 gap-2">
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
                    : `${liveContractLabel} fixed`}
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
          </div>
        ) : null}

        {!isSellerPack ? (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[var(--fg-muted)]">
                Presets in this batch
              </p>
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
                  Launch Pack · 3 clips
                </button>
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="rounded-md border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--fg-dim)]"
                >
                  Clear
                </button>
              </div>
            </div>
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
          </div>
        ) : null}

        {image && !demoMode ? (
          <label
            id="batch-ownership"
            data-launch-pack-primary-action="2"
            className="hidden cursor-pointer items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-[11px] leading-snug text-[var(--fg-muted)] lg:flex"
          >
            <input
              type="checkbox"
              checked={ownsRights}
              onChange={(e) => setOwnsRights(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--mint)]"
            />
            <span>
              I own this photo and have the right to animate and publish this
              toy for every preset in the batch.
            </span>
          </label>
        ) : null}

        {running ? (
          <>
            {privateInputStageLabel ? (
              <p
                className="rounded-lg border border-[#C8FF3D]/20 bg-[#C8FF3D]/[0.05] px-3 py-2 text-[11px] font-semibold text-[#C8FF3D]"
                data-private-input-stage={privateInputStage}
                aria-live="polite"
              >
                {privateInputStageLabel}
              </p>
            ) : null}
            <GenerateWaitStage
              elapsed={packElapsed}
              demoMode={demoMode}
              image={image}
              effectLabel={
                privateInputStageLabel ||
                jobs.find((j) => j.status === "running")?.name ||
                (sellerPackActive
                  ? `Launch Pack · ${doneCount}/${jobs.length || 3}`
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
              title="Stops waiting in this browser. A render already in progress may still finish."
            >
              Cancel pack · keep finished formats
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={!canRun}
            onClick={() => void runBatch()}
            className="btn btn-primary hidden w-full disabled:opacity-50 lg:flex"
            data-launch-pack-primary-action={image ? "3" : "1"}
          >
            {primaryBatchLabel}
          </button>
        )}
        {!liveQuoteCovered && sellerPackActive ? (
          <div className="rounded-xl border border-amber-300/25 bg-amber-300/[0.06] p-3 text-xs text-amber-100">
            <p className="font-bold">
              {trialDone && isFree
                ? "Free Mini trial used · Launch Pack needs 30 live credits"
                : `Full live pack needs ${cost} credits; this session has ${me?.credits ?? 0}.`}
            </p>
            <p className="mt-1 text-[11px] text-white/50">
              {trialDone && isFree ? (
                <>
                  Cached Lab demos stay free (0 credits · upload not processed).
                  Private generation remains invite-only; public checkout is
                  closed while Founding Studio is validated.{" "}
                  <Link
                    href="/pricing"
                    className="font-semibold text-[var(--mint)] hover:underline"
                  >
                    See the validation gate
                  </Link>
                  .
                </>
              ) : (
                <>
                  Free Mini covers one 10-cr job
                  {clipsLeft !== null ? ` (~${clipsLeft} left)` : ""} — not a
                  full 30-credit pack. Pick one child recipe below for single
                  Generate, or Preview the pack as cached demos.
                </>
              )}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SELLER_PACK_ITEMS.map((item) => (
                <Link
                  key={item.key}
                  href={createRemixHref(
                    item.slug,
                    undefined,
                    toyIdentity.sku || null,
                    { ratio: item.aspectRatio }
                  )}
                  data-seller-pack-free-mini="single-child"
                  title="Open this format in single Generate (10 credits when Live)"
                  className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-bold text-white/70"
                  data-pack-try-recipe={item.slug}
                  data-pack-try-ratio={item.aspectRatio}
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
              image &&
              !running &&
              selected.length > 0 &&
              !hasBoundPrivatePack
                ? () => {
                    setFailRetryAfterSec(null);
                    void runBatch();
                  }
                : undefined
            }
            retryLabel={
              sellerPackActive ? "Retry Launch Pack" : "Retry batch"
            }
            showLabSample={!image}
            showModules={false}
          />
        ) : null}
        <p className="text-[11px] text-[var(--fg-dim)]">
          Each format runs independently
          {displayDemoMode
            ? " as a cached Lab preview"
            : isFree
              ? trialDone
                ? " (Free Mini trial used · Lab demos still free)"
                : ` (${liveContractLabel})`
              : " (private 720p)"}
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
              {sellerPackActive ? "Launch Pack queue" : "Queue"}
            </h2>
            {jobs.length > 0 ? (
              <p className="mt-0.5 text-[10px] text-[var(--fg-dim)]">
                {doneCount} ready
                {needsAttentionCount > 0
                  ? ` · ${needsAttentionCount} need attention`
                  : ""}
                {failedRetryCount > 0
                  ? ` · ${failedRetryCount} failed (completed formats kept)`
                  : ""}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {queuedContinueCount > 0 && hasBoundPrivatePack ? (
              <button
                type="button"
                disabled={running || !canRetryBoundPrivatePack}
                onClick={() => void continueQueuedPack()}
                className="rounded-full border border-[var(--mint)]/35 px-3 py-1 text-[10px] font-bold text-[var(--mint)] disabled:opacity-40"
                title={
                  canRetryBoundPrivatePack
                    ? "Continue only the formats already covered by this Pack reservation"
                    : "Private generation is currently gated; existing results remain available"
                }
              >
                Continue pending · {queuedContinueCount}
              </button>
            ) : null}
            {failedRetryCount > 0 ? (
              <button
                type="button"
                disabled={
                  running ||
                  !(canRetryBoundPrivatePack || (image && ownsRights))
                }
                onClick={() => void retryAllFailed()}
                className="rounded-full border border-[var(--mint)]/35 px-3 py-1 text-[10px] font-bold text-[var(--mint)] disabled:opacity-40"
                title="Retry only confirmed failed or unsubmitted formats; completed clips stay available"
              >
                Retry eligible only
              </button>
            ) : null}
            {jobs.length > 0 ? (
              <span className="text-[10px] text-[var(--fg-dim)]">
                {displayDemoMode ? "Browser preview" : "Private account run"}
              </span>
            ) : null}
          </div>
        </div>
        {jobs.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/12 bg-black/25 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-[var(--fg)]">
              {sellerPackActive
                ? "Your Launch Pack queue is empty"
                : "No batch jobs yet"}
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--fg-dim)]">
              {sellerPackActive
                ? demoMode
                  ? "Choose one Pikbo Lab sample → preview the three archived formats. No product photo is accepted or processed."
                  : "Upload one owned toy photo → Generate pack. Each format finishes independently; a confirmed failed format restores its 10 credits while completed clips stay."
                : "Pick presets (or open Batch from an effect page), confirm ownership, then run. Finished clips also save on this device Library."}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <FreeTrialCta
                path="/create?mode=seller-pack"
                labelTry="Preview Lab sample"
                labelDemo="Preview Lab sample"
                hideClipsChip
                className="rounded-full border border-[var(--mint)]/35 px-3 py-1.5 text-[11px] font-bold text-[var(--mint)]"
              />
              {!sellerPackActive ? (
                <Link
                  href="/create?mode=seller-pack"
                  className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-bold text-white/70"
                >
                  {demoMode
                    ? "Launch Pack — 3 cached previews / 0 credits"
                    : "Launch Pack — 3 private clips / 30 credits"}
                </Link>
              ) : (
                <Link
                  href={createRemixHref("360-spin-showcase")}
                  className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-bold text-white/70"
                  data-batch-single-generate="remix"
                >
                  Single-format preview
                </Link>
              )}
            </div>
          </div>
        )}
        {jobs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-black/30 px-3 py-2">
            <p className="text-[11px] text-[var(--fg-muted)]">
              {displayDemoMode
                ? "Lab previews only — not made from your upload"
                : "Launch Pack includes only succeeded downloadable clips"}
              {canExportPack
                ? ` · ${availableDownloads.length} available`
                : " · none ready yet"}
            </p>
            <button
              type="button"
              disabled={!canExportPack || exportBusy}
              onClick={() => void downloadAvailableClips()}
              className="rounded-full border border-[var(--mint)]/40 bg-[var(--mint)]/10 px-3 py-1 text-[10px] font-bold text-[var(--mint)] disabled:opacity-40"
              title="Saves each available clip. Failed formats and unavailable raw files are omitted."
              data-launch-pack-export="downloadable-only"
            >
              {exportBusy
                ? "Saving clips…"
                : `${displayDemoMode ? "Download Lab previews" : "Download available videos"}${
                    availableDownloads.length
                      ? ` · ${availableDownloads.length}`
                      : ""
                  }`}
            </button>
            <span className="text-[10px] text-[var(--fg-dim)]">
              Only completed, downloadable clips are included.
            </span>
          </div>
        )}
        {doneCount > 0 && !running ? (
          <nav
            aria-label="Launch Pack next steps"
            className="mt-3 hidden flex-wrap items-center gap-2 lg:flex"
          >
            <Link
              href="/library"
              className="btn btn-primary px-4 py-2 text-xs"
            >
              Open in Library
            </Link>
            <a
              href={
                displayDemoMode
                  ? "/create?mode=seller-pack&try=1&source=next-sample"
                  : "/create?mode=seller-pack&source=next-sku"
              }
              className="btn btn-ghost border border-white/15 px-4 py-2 text-xs"
            >
              {displayDemoMode ? "Preview another sample" : "Create next SKU"}
            </a>
          </nav>
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
            {j.status === "succeeded" &&
            isPlayableResultVideoUrl({
              videoUrl: j.videoUrl,
              demo: Boolean(j.demo),
              watermark: Boolean(j.watermark),
            }) ? (
              <video
                src={j.videoUrl}
                controls
                muted
                playsInline
                className="mt-2 max-h-40 w-full rounded-lg bg-black/40"
              />
            ) : j.status === "succeeded" && j.videoUrl && j.watermark && !j.demo ? (
              <div className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-3 py-3 text-[10px] leading-snug text-amber-100/90">
                <p className="font-bold">Free live held for T6 bake</p>
                <p className="mt-0.5 text-white/50">{freeLiveDownloadBlockReason()}</p>
              </div>
            ) : null}
            {j.status === "succeeded" && (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase ${
                    j.demo ? "text-[var(--fg-dim)]" : "text-[var(--mint)]"
                  }`}
                >
                  {j.demo ? "Cached demo" : "Private generation"}
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
                    <button
                      type="button"
                      data-seller-download="gated"
                      onClick={() => void downloadChild(j)}
                      className="text-[10px] text-[var(--mint)] hover:underline"
                    >
                      Download / open
                    </button>
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
                    title={freeLiveDownloadBlockReason()}
                  >
                    Download blocked · Free raw
                  </span>
                )}
              </div>
            )}
            {retryEligible(j) && (
              <button
                type="button"
                disabled={
                  running ||
                  !(canRetryBoundPrivatePack || (image && ownsRights))
                }
                onClick={() => void retryJob(j.slug)}
                className="mt-2 rounded-full border border-[var(--mint)]/30 px-3 py-1 text-[10px] font-bold text-[var(--mint)] disabled:opacity-40"
              >
                Retry this item · new 10-credit quote
              </button>
            )}
            {j.creditState === "refund unconfirmed" ? (
              <p className="mt-2 text-[10px] text-amber-200">
                Credit restoration is not confirmed — check your balance before retrying this format.
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {/* Phase F: sticky mobile Seller Pack / Batch CTA above tab nav */}
      <div
        className="fixed inset-x-0 bottom-[4.75rem] z-40 border-t border-white/10 bg-[#09090B]/97 px-4 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-16px_44px_rgba(0,0,0,0.6)] backdrop-blur-xl lg:hidden"
        data-seller-pack-sticky="mobile"
      >
        {image ? (
          <p className="mb-1.5 truncate text-center text-[10px] font-medium text-white/55">
            {sellerPackActive
              ? demoMode
                ? "Launch Pack · 3 cached previews"
                : `Launch Pack · ${sellerPackQuoteLabel(packQuote)}`
              : `Batch · ${selected.length} recipes · ${batchQuoteLabel(packQuote)}`}
            {doneCount > 0 ? ` · ${doneCount} ready` : ""}
            {failedRetryCount > 0 ? ` · ${failedRetryCount} failed kept` : ""}
          </p>
        ) : null}
        {image && !ownsRights && !demoMode ? (
          <label
            className="mb-2 flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-[10px] leading-snug text-[var(--fg-muted)]"
            data-launch-pack-primary-action="2"
          >
            <input
              type="checkbox"
              checked={ownsRights}
              onChange={(e) => setOwnsRights(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--mint)]"
            />
            <span>I own this photo and may use it for all three formats.</span>
          </label>
        ) : null}
        {running ? (
          <div>
            {privateInputStageLabel ? (
              <p
                className="mb-2 text-center text-[10px] font-semibold text-[#C8FF3D]"
                data-private-input-stage-mobile={privateInputStage}
                aria-live="polite"
              >
                {privateInputStageLabel}
              </p>
            ) : null}
            <GenerateWaitMobileStrip
              elapsed={packElapsed}
              demoMode={demoMode}
              onCancel={cancelInFlightPack}
            />
          </div>
        ) : hasBoundPrivatePack && !image ? (
          <div className="flex gap-2">
            <Link
              href="/library"
              className="btn btn-primary min-w-0 flex-1 py-3 text-sm"
              data-seller-pack-action="library"
            >
              Open recovered Pack
            </Link>
            {queuedContinueCount > 0 ? (
              <button
                type="button"
                disabled={running || !canRetryBoundPrivatePack}
                onClick={() => void continueQueuedPack()}
                className="btn btn-ghost min-w-0 flex-1 border border-white/15 py-3 text-sm disabled:opacity-50"
                data-seller-pack-action="continue-pending"
              >
                Continue {queuedContinueCount} pending
              </button>
            ) : failedRetryCount > 0 ? (
              <button
                type="button"
                disabled={running || !canRetryBoundPrivatePack}
                onClick={() => void retryAllFailed()}
                className="btn btn-ghost min-w-0 flex-1 border border-white/15 py-3 text-sm disabled:opacity-50"
                data-seller-pack-action="retry-failed"
                title={
                  canRetryBoundPrivatePack
                    ? "Re-run only confirmed failed formats"
                    : "Private generation is currently gated; existing downloads stay available"
                }
              >
                Retry failed only
              </button>
            ) : null}
          </div>
        ) : !image ? (
          privateUploadEnabled ? (
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
                onClick={() => void chooseLabSample(SAMPLE_TOYS[0].id)}
                className="btn btn-ghost shrink-0 px-3 py-3 text-xs"
                title="Pikbo Lab prototype sample · never sent to private generation"
              >
                Preview Lab
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void chooseLabSample(SAMPLE_TOYS[0].id)}
              className="btn btn-primary w-full py-3 text-sm"
              data-seller-pack-action="preview-lab"
            >
              Preview 3 Lab formats · 0 credits
            </button>
          )
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
                disabled={
                  running ||
                  !(canRetryBoundPrivatePack || (image && ownsRights))
                }
                onClick={() => void retryAllFailed()}
                className="btn btn-ghost min-w-0 flex-1 border border-white/15 py-3 text-sm disabled:opacity-50"
                data-seller-pack-action="retry-failed"
                title="Re-run only confirmed failed formats; completed clips stay"
              >
                Retry failed only
              </button>
            ) : (
              <a
                href={
                  displayDemoMode
                    ? "/create?mode=seller-pack&try=1&source=next-sample"
                    : "/create?mode=seller-pack&source=next-sku"
                }
                className="btn btn-ghost min-w-0 flex-1 border border-white/15 py-3 text-sm disabled:opacity-50"
                data-seller-pack-action="next-sku"
              >
                {displayDemoMode ? "Another sample" : "Create next SKU"}
              </a>
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
            data-launch-pack-primary-action={image ? "3" : "1"}
          >
            {primaryBatchLabel}
          </button>
        )}
      </div>
    </div>
  );
}
