"use client";

import { createRemixHref } from "@/lib/remixIntent";
import { createGenerate360Href } from "@/lib/jobIntents";
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
  getSellerPackStatusClient,
  getSellerPackDiscoveryClient,
  historyFieldsFromSuccess,
  mintGenerateIdempotencyKey,
  postGenerateWithRetry,
  reserveSellerPackClient,
  retrySellerPackChildClient,
  sleep,
  type SellerPackDiscoveryItem,
  type SellerPackClientJob,
} from "@/lib/generateClient";
import {
  registerLocalAsset,
  registerPrivateToyAsset,
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
  canLiveGenerate,
  canPreparePrivateInput,
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
  freeLiveDownloadBlockReason,
  isPlayableResultVideoUrl,
  isSafeDeliverableUrl,
  requestCreditStateFromFailure,
} from "@/lib/createTrust";
import { DirectorPlanPanel } from "@/components/DirectorPlanPanel";
import { GenerateFailPanel } from "@/components/GenerateFailPanel";
import { buildSellerPackDirectorPlan } from "@/lib/directorPlan";
import {
  parseSellerPackRecovery,
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

function toRecoveredJob(child: ReturnType<typeof reconcileSellerPackRecovery>["children"][number]): Job {
  const { statusHint: _hint, ...job } = child;
  void _hint;
  return job;
}

function recoveryRunFromServerJobs(
  packRunId: string,
  jobs: SellerPackClientJob[],
  savedAt: string
): SellerPackRecoveryRun {
  return {
    version: 2,
    projectId: `recovered-${packRunId}`,
    packRunId,
    savedAt,
    children: jobs.map((job, index) => ({
      packJobId: job.jobId,
      childKey: job.childKey,
      slug: job.effectSlug,
      name: SELLER_PACK_ITEMS[index].label,
      aspectRatio: job.aspectRatio,
      statusHint: job.status,
      retryCount: 0,
    })),
  };
}

function recoveryRunFromDiscovery(pack: SellerPackDiscoveryItem): SellerPackRecoveryRun {
  return recoveryRunFromServerJobs(pack.packRunId, pack.jobs, pack.createdAt);
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

function launchWorkspaceStatus(status: Job["status"]): string {
  if (status === "succeeded") return "Ready";
  if (
    status === "failed" ||
    status === "refunded" ||
    status === "not_started"
  ) {
    return "Needs retry";
  }
  if (status === "recovery_unavailable") return "Checking status";
  if (status === "running") return "Creating";
  return "Preparing";
}

const SELLER_PACK_DIRECTION_FRAMES = [
  {
    evidence: "Original direction frame",
    use: "Product page motion",
  },
  {
    evidence: "Format direction",
    use: "Drop-day reveal",
  },
  {
    evidence: "Format direction",
    use: "Short-form launch",
  },
] as const;

/**
 * Shop-style batch: one toy photo → several presets in sequence.
 * Supports ?effects=slug1,slug2 and ?pack=seller (Seller Pack MVP).
 */
export function BatchStudio({
  initialEffects,
  pack,
  initialSku,
  initialSample,
  initialRecoverPackRunId,
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
  /** Explicit owner-scoped Pack selected in Library; takes recovery priority. */
  initialRecoverPackRunId?: string;
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
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);
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
  const [sellerPackRecoveryHydrated, setSellerPackRecoveryHydrated] =
    useState(!isSellerPack);
  const [sellerPackRecoveryNote, setSellerPackRecoveryNote] = useState<
    string | null
  >(null);
  const [verifiedInputAssetId, setVerifiedInputAssetId] = useState<
    string | null
  >(null);
  const [verifyingInput, setVerifyingInput] = useState(false);
  /** Wall-clock while pack/batch runs — feeds GenerateWaitStage (1–3 min Mini). */
  const [packElapsed, setPackElapsed] = useState(0);
  /** Abort in-flight pack child + rate-limit waits (parity with Create Cancel). */
  const packAbortRef = useRef<AbortController | null>(null);
  const quoteEventRef = useRef("");
  const privateInputEnabled = canPreparePrivateInput(me);
  const privateLaunchEnabled = canUsePrivateLaunch(me);
  const demoMode = !privateLaunchEnabled || labStill;
  const privateInputOnly =
    privateInputEnabled && !privateLaunchEnabled && !labStill;

  const { locale } = useI18n();

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
            if (!privateInputEnabled) {
              // Public validation never displays or submits a visitor still.
              // Continue to the explicit Lab sample path, when requested.
            } else if (pending.startsWith("data:image")) {
              if (canceled) return;
              setImage(pending);
              setLabStill(false);
              setActiveSampleId(null);
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
                setImage(dataUrl);
                setLabStill(false);
                setActiveSampleId(null);
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
          setImage(dataUrl);
          setLabStill(true);
          setActiveSampleId(s.id);
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
  }, [initialSample, meResolved, privateInputEnabled]);

  /**
   * Re-open this owner's active pack from durable pack/job ids. The browser
   * pointer contains no asset URL or credit authority.
   */
  useEffect(() => {
    if (!isSellerPack) return;
    let canceled = false;
    const start = window.setTimeout(() => {
      void (async () => {
        let saved: SellerPackRecoveryRun | null = null;
        let savedFromSession = false;
        let explicitStatus: Awaited<ReturnType<typeof getSellerPackStatusClient>> | null = null;
        if (initialRecoverPackRunId) {
          explicitStatus = await getSellerPackStatusClient(initialRecoverPackRunId);
          if (!explicitStatus.ok) throw new Error(explicitStatus.error);
          saved = recoveryRunFromServerJobs(
            explicitStatus.packRunId,
            explicitStatus.jobs,
            new Date().toISOString()
          );
        }
        try {
          if (!saved) {
            const raw = sessionStorage.getItem(SELLER_PACK_RECOVERY_KEY);
            saved = raw ? parseSellerPackRecovery(JSON.parse(raw)) : null;
            savedFromSession = Boolean(saved);
          }
        } catch {
          saved = null;
        }
        if (!saved) {
          const discovered = await getSellerPackDiscoveryClient("active");
          const newest = discovered.ok ? discovered.packs[0] : null;
          if (!newest) return;
          saved = recoveryRunFromDiscovery(newest);
        }
        if (canceled) return;
        let status = explicitStatus ?? await getSellerPackStatusClient(saved.packRunId);
        if (!status.ok && savedFromSession) {
          // A stale browser pointer must not permanently lock Create. Remove
          // it, leave local run state empty, and ask the owner-scoped server
          // once for the current active Pack. Explicit deep links never fall
          // through to a different Pack.
          sessionStorage.removeItem(SELLER_PACK_RECOVERY_KEY);
          setRunProjectId(null);
          setActivePackRunId(null);
          const discovered = await getSellerPackDiscoveryClient("active");
          const newest = discovered.ok ? discovered.packs[0] : null;
          if (!newest) return;
          saved = recoveryRunFromDiscovery(newest);
          status = await getSellerPackStatusClient(saved.packRunId);
        }
        if (!status.ok) throw new Error(status.error);
        if (canceled) return;
        setRunProjectId(saved.projectId);
        setActivePackRunId(saved.packRunId);
        // Server discovery only returns packs whose rights confirmation was
        // recorded at reserve; this does not trust a new browser assertion.
        setOwnsRights(true);
        setSelected([...SELLER_PACK_SLUGS]);
        setSellerPackRecoveryNote("Checking the private Launch Pack record…");
        if (status.inputPreviewUrl) setImage(status.inputPreviewUrl);
        if (status.skuLabel) {
          setToyIdentity((previous) => ({ ...previous, sku: status.skuLabel || "" }));
        }
        const recovered = reconcileSellerPackRecovery(saved, status.jobs);
        setJobs(recovered.children.map(toRecoveredJob));
        setSellerPackRecoveryNote(
          recovered.unavailable > 0
            ? `${recovered.unavailable} format${recovered.unavailable === 1 ? "" : "s"} is still being checked.`
            : "Private Launch Pack restored."
        );
      })()
        .catch(() => {
          if (!canceled) {
            setSellerPackRecoveryNote(
              "Private pack status is unavailable. No local success or refund claim was restored."
            );
          }
        })
        .finally(() => {
          if (!canceled) setSellerPackRecoveryHydrated(true);
        });
      });
    return () => {
      canceled = true;
      window.clearTimeout(start);
    };
  }, [initialRecoverPackRunId, isSellerPack]);

  useEffect(() => {
    if (
      !isSellerPack ||
      !sellerPackRecoveryHydrated ||
      !runProjectId ||
      !activePackRunId ||
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

  function cancelInFlightPack() {
    const ctrl = packAbortRef.current;
    if (!ctrl) return;
    ctrl.abort();
    packAbortRef.current = null;
    // Immediate Wave B settlement UI (parity with Create cancel) before the
    // generate loop unwinds — finished siblings stay; running → unconfirmed.
    setJobs((previous) =>
      previous.map((job) =>
        job.status === "queued" || job.status === "running"
          ? {
              ...job,
              status: job.status === "running" ? "failed" : "queued",
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
    setError(
      "Pack canceled — finished formats stay available. The interrupted format may still complete; check your balance before trying again."
    );
  }

  const isFree = me?.plan === "free" || me?.watermark === true;
  /** Soft-launch freeTrial honesty — same contract as Create / SoftLaunchStrip. */
  const trialDone = freeTrialExhausted(me);
  const freeLive = me?.freeTrial?.freeLive;
  /** R0/T6: Free Mini product-cap / trial-used only when Live is actually open. */
  const freeLiveOpen = Boolean(
    canLiveGenerate(me) &&
      freeLive &&
      freeLive.liveEnabled !== false
  );
  const clipsLeft =
    typeof me?.freeTrial?.clipsLeft === "number"
      ? me.freeTrial.clipsLeft
      : typeof me?.credits === "number" && freeLiveOpen
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
      : freeLiveOpen
        ? `Free Mini · ${effectiveResolution} · ${effectiveDuration}s`
        : "Cached Lab · 0 credits · Live gated";
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
    if (!privateInputEnabled) {
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
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImage(dataUrl);
      setImageProbe(null);
      setLabStill(false);
      setActiveSampleId(null);
      setOwnsRights(false);
      setVerifiedInputAssetId(null);
      setVerifyingInput(false);
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
    try {
      const sample =
        SAMPLE_TOYS.find((candidate) => candidate.id === sampleId) ??
        SAMPLE_TOYS[0];
      const dataUrl = await sampleToDataUrl(sample.path);
      setImage(dataUrl);
      setLabStill(true);
      setActiveSampleId(sample.id);
      setOwnsRights(true);
      setVerifiedInputAssetId(null);
      setVerifyingInput(false);
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

  async function verifyPrivateInput() {
    if (
      !privateInputEnabled ||
      !image ||
      !image.startsWith("data:image") ||
      labStill ||
      verifyingInput
    ) {
      return;
    }
    if (!ownsRights) {
      setError("Confirm you own this photo before private verification.");
      return;
    }
    setError(null);
    setVerifyingInput(true);
    try {
      const registered = await registerPrivateToyAsset(image, toyIdentity.sku);
      if (!registered?.assetId) {
        setError("Your private photo could not be verified. No credits were reserved.");
        return;
      }
      setVerifiedInputAssetId(registered.assetId);
    } finally {
      setVerifyingInput(false);
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
    const dualStill =
      image && image.startsWith("data:image") && image.length < 3_500_000
        ? image
        : undefined;
    // CD: same still + character bible across all pack children (prompt extra only).
    const packExtra = composeExtraWithIdentity(toyIdentity, "");
    // Unique key per child attempt so abort cancelGenerateLedger hits the right row.
    const childIdempotencyKey =
      retryAttemptKey ?? mintGenerateIdempotencyKey();
    const privateInputPayload = demoMode
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
        duration: effectiveDuration,
        aspectRatio: jobAspect,
        model: effectiveModel,
        resolution: effectiveResolution,
        ownsRights,
        allowProviderSpend: !demoMode,
        ...(packExtra ? { extra: packExtra } : {}),
      },
      {
        maxRetries: 1,
        // Mid-pack asset TTL / process restart: recover with local still once.
        fallbackImage:
          !demoMode &&
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
        fallbackDuration: effectiveDuration,
        fallbackAspect: jobAspect,
        fallbackResolution: effectiveResolution,
        projectId,
        projectName: sellerPackActive
          ? "Launch Pack · 3 clips / 30 credits"
          : "Custom batch",
        inputImage:
          !demoMode && image && image.length <= 300_000 ? image : undefined,
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
    if (!labStill && !privateLaunchEnabled) {
      setError(
        "Your photo can be verified privately, but generation is temporarily unavailable. No credits were reserved."
      );
      return;
    }
    if (
      sellerPackActive &&
      (jobs.length > 0 ||
        activePackRunId !== null ||
        runProjectId !== null ||
        !sellerPackRecoveryHydrated)
    ) {
      setError(
        "This Launch Pack already has a run record. Review its format cards or refresh status; Pikbo will not reserve another 30 credits."
      );
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
    setRunning(true);
    const projectId = `${sellerPackActive ? "seller-pack" : "batch"}-${Date.now()}`;

    // Abort any prior pack before starting a new one.
    packAbortRef.current?.abort();
    const abortCtrl = new AbortController();
    packAbortRef.current = abortCtrl;

    // Live Launch Pack opens one atomic 30-credit reservation and receives
    // exactly three server-created child ids. Failure is terminal for this run;
    // there is no shadow/per-child fallback.
    let reservedPack:
      | Extract<Awaited<ReturnType<typeof reserveSellerPackClient>>, { ok: true }>
      | null = null;
    let runPackId: string | null = null;
    // A live Launch Pack cannot reserve credits until its one private input is
    // durably uploaded and verified. All three children bind to this asset.
    let sharedAssetId: string | null = verifiedInputAssetId;
    if (!demoMode && image && image.startsWith("data:image")) {
      if (!sharedAssetId) {
        const reg = sellerPackActive
          ? await registerPrivateToyAsset(image, toyIdentity.sku)
          : await registerLocalAsset(image);
        if (reg?.assetId) sharedAssetId = reg.assetId;
      }
    }
    if (sellerPackActive && !demoMode) {
      if (!sharedAssetId) {
        setError("Your private toy photo could not be verified. No credits were reserved.");
        setRunning(false);
        if (packAbortRef.current === abortCtrl) packAbortRef.current = null;
        return;
      }
      const reserved = await reserveSellerPackClient({
        clientPackKey: `ui-pack:${projectId}`,
        inputAssetId: sharedAssetId,
        rightsConfirmed: true,
      });
      if (!reserved.ok) {
        setError(reserved.error);
        setRunning(false);
        if (packAbortRef.current === abortCtrl) packAbortRef.current = null;
        return;
      }
      reservedPack = reserved;
      runPackId = reserved.packRunId;
      setActivePackRunId(reserved.packRunId);
    }

    // Defense in depth: never translate or run a server-owned child unless the
    // complete response still matches the frozen three-child contract. The
    // client adapter already performs this check; this second boundary keeps a
    // future adapter regression from throwing outside the run try/catch.
    const verifiedReservedJobs = reservedPack
      ? parseExactSellerPackServerJobs(reservedPack.jobs)
      : null;
    if (reservedPack && !verifiedReservedJobs) {
      setError(
        "Pikbo could not verify this Launch Pack. No generation started; your 30 credits remain protected while the Pack is checked."
      );
      setRunning(false);
      if (packAbortRef.current === abortCtrl) packAbortRef.current = null;
      return;
    }
    // Only persist a run pointer after every pre-reserve failure boundary has
    // passed. Upload/verification/reserve errors must leave Create retryable.
    setRunProjectId(projectId);

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
      if (packAbortRef.current === abortCtrl) {
        packAbortRef.current = null;
      }
      setRunning(false);
    }
  }

  async function retryJob(slug: string) {
    if (
      running ||
      !ownsRights ||
      (!image && !(sellerPackActive && !demoMode && activePackRunId))
    ) return;
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
    if (!demoMode && image?.startsWith("data:image")) {
      const reg = await registerLocalAsset(image);
      if (reg?.assetId) sharedAssetId = reg.assetId;
    }
    const retryAttemptKey = mintGenerateIdempotencyKey();
    if (sellerPackActive && !demoMode) {
      if (!activePackRunId || !target.packJobId) {
        setError("Durable Launch Pack ids are missing; refresh to recover.");
        setRunning(false);
        packAbortRef.current = null;
        return;
      }
      const reopened = await retrySellerPackChildClient({
        packRunId: activePackRunId,
        packJobId: target.packJobId,
        attemptKey: retryAttemptKey,
      });
      if (!reopened.ok) {
        setError(reopened.error);
        setRunning(false);
        packAbortRef.current = null;
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
    try {
      const outcome = await executeJob(
        retrying,
        projectId,
        sellerPackActive && !demoMode ? activePackRunId : null,
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
    } finally {
      if (packAbortRef.current === abortCtrl) {
        packAbortRef.current = null;
      }
      setRunning(false);
    }
  }

  /** Phase F: partial failure — re-run only failed/refunded children; successes stay. */
  async function retryAllFailed() {
    if (
      running ||
      !ownsRights ||
      (!image && !(sellerPackActive && !demoMode && activePackRunId))
    ) return;
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
    if (!demoMode && image?.startsWith("data:image")) {
      const reg = await registerLocalAsset(image);
      if (reg?.assetId) sharedAssetId = reg.assetId;
    }
    try {
      for (let i = 0; i < failed.length; i++) {
        if (abortCtrl.signal.aborted) break;
        const target = failed[i];
        const retryAttemptKey = mintGenerateIdempotencyKey();
        if (sellerPackActive && !demoMode) {
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
          sellerPackActive && !demoMode ? activePackRunId : null,
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

  /**
   * Phase F: sequential multi-file save of downloadable children only.
   * No server ZIP (needs object storage). Free raw / failed siblings omitted.
   */
  /**
   * Per-child download delegates the private gate check to downloadVideoFile.
   * That helper sends the signed-in bearer token for both HEAD and GET; an
   * unauthenticated duplicate probe here would reject every private Pack.
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
      freeLiveOpen,
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
    freeLiveOpen,
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
    Boolean(image) &&
    selected.length > 0 &&
    ownsRights &&
    (labStill || privateLaunchEnabled) &&
    liveQuoteCovered;
  const canRetryUnreservedPack =
    Boolean(image) &&
    !running &&
    selected.length > 0 &&
    jobs.length === 0 &&
    activePackRunId === null &&
    runProjectId === null &&
    sellerPackRecoveryHydrated;
  const canStartFreshSellerPack =
    canRun &&
    jobs.length === 0 &&
    activePackRunId === null &&
    runProjectId === null &&
    sellerPackRecoveryHydrated;

  const primaryBatchLabel = running
    ? `${sellerPackActive ? "Launch Pack" : "Batch"} running… ${doneCount}/${jobs.length}`
    : !image
      ? privateInputEnabled
        ? "Upload owned toy photo"
        : "Choose a Pikbo Lab sample"
      : !ownsRights
        ? "Confirm ownership to continue"
        : !labStill && !privateLaunchEnabled
          ? verifiedInputAssetId
            ? "Photo verified privately"
            : verifyingInput
              ? "Verifying private photo…"
              : "Verify private photo"
          : demoMode
          ? sellerPackActive
            ? "Open 3 archived motion tests"
            : `Run batch · ${selected.length} · cached free`
          : trialDone && isFree && !liveQuoteCovered
            ? freeLiveOpen
              ? "Free Mini trial used · open single Generate or plans"
              : "Live gated · open Lab sample or plans"
            : sellerPackActive
              ? `Generate Launch Pack · ${sellerPackQuoteLabel(packQuote)}`
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
          {privateInputEnabled && !privateLaunchEnabled && !labStill
            ? "Private photo verification only · generation unavailable · 0 credits reserved."
            : "Public Lab preview · no product photo is accepted or processed · 0 credits."}
        </p>
      ) : (
        <p className="mt-0.5 text-[var(--fg-dim)]">
          Session balance:{" "}
          <b className="text-[var(--fg)]">{me?.credits ?? "…"} credits</b>
          {isFree ? (
            <span
              className={
                trialDone && freeLiveOpen
                  ? " text-amber-200"
                  : " text-[var(--fg-dim)]"
              }
            >
              {!freeLiveOpen
                ? " · Cached Lab · 0 credits · Live gated"
                : trialDone
                  ? " · Free Mini trial used"
                  : ` · ${liveContractLabel}`}
              {clipsLeft !== null && freeLiveOpen && !trialDone
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
              {!freeLiveOpen && isFree
                ? " — Live gated · Lab previews stay free (0 credits) · Founding Studio is not open yet"
                : trialDone && isFree
                  ? " — trial exhausted; Lab previews stay free · Founding Studio is not open yet"
                  : freeLiveOpen && sellerPackActive
                    ? " — Free Mini covers one 10-cr job, not a full pack"
                    : freeLiveOpen
                      ? " — Free Mini is one 10-cr job; deselect recipes or open single Generate"
                      : " — Live pack needs paid credits when Live opens · Lab demos stay free"}
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
    <div
      className={
        // AIT-383: content pad = sticky chrome + matching clearance token
        isSellerPack
          ? "mt-4 grid gap-4 pb-[var(--sticky-generate-pad-safe)] text-[#111827] lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-5 lg:pb-0"
          : sellerPackActive
            ? "mt-4 grid gap-4 pb-[var(--sticky-generate-pad)] text-[#111827] lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-5 lg:pb-0"
            : "mt-8 grid gap-6 pb-[var(--sticky-generate-pad)] lg:grid-cols-[1fr_1.1fr] lg:pb-0"
      }
      data-launch-workspace={sellerPackActive ? "seller-pack" : undefined}
      data-batch-content-pad={isSellerPack ? "safe-bottom" : "mobile-nav"}
    >
      <div className="space-y-4">
        {sellerPackActive && meResolved && !privateLaunchEnabled ? (
          <div
            className="rounded-2xl border border-[#BFCDF7] bg-[#F6F8FF] p-4 sm:p-5"
            data-seller-pack-eligibility="closed"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2457E6]">
                  {privateInputEnabled
                    ? "Private input access"
                    : "Private beta access"}
                </p>
                <h2 className="mt-1 text-lg font-black tracking-[-0.03em] text-[#111827] sm:text-xl">
                  {privateInputEnabled
                    ? "Your photo can be checked privately."
                    : "Public preview is not your product run."}
                </h2>
                <p className="mt-1.5 max-w-xl text-xs font-semibold leading-5 text-[#667085]">
                  {privateInputEnabled
                    ? "Verify one owned toy photo first. Video generation is still closed, so this step reserves 0 credits and creates no jobs."
                    : "Your own toy is not processed in public preview. Apply for private beta access; once approved, the path is one owned photo → rights check → three-format Pack."
                  }
                </p>
              </div>
              <span className="rounded-full border border-[#BFCDF7] bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-[#2457E6]">
                Validation · generation closed
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {privateInputEnabled ? (
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("seller-pack-photo")
                      ?.scrollIntoView({ behavior: "smooth", block: "center" })
                  }
                  className="inline-flex min-h-10 items-center rounded-xl bg-[#2457E6] px-3.5 text-xs font-black text-white transition hover:bg-[#1948C7]"
                  data-seller-pack-eligibility-action="verify"
                >
                  Verify private photo
                </button>
              ) : (
                <Link
                  href="/contact?source=seller-pack-beta"
                  className="inline-flex min-h-10 items-center rounded-xl bg-[#2457E6] px-3.5 text-xs font-black text-white transition hover:bg-[#1948C7]"
                  data-seller-pack-eligibility-action="request"
                >
                  Request private beta
                </Link>
              )}
              <button
                type="button"
                onClick={() => void chooseLabSample(SAMPLE_TOYS[0].id)}
                className="inline-flex min-h-10 items-center rounded-xl border border-[#BFCDF7] bg-white px-3.5 text-xs font-black text-[#2457E6] transition hover:border-[#2457E6]"
                data-seller-pack-eligibility-action="sample"
              >
                Try cached sample Pack
              </button>
            </div>
          </div>
        ) : null}
        {sellerPackActive && (
          <div className="hidden rounded-2xl border border-[#D5D9E1] bg-white p-4 shadow-[0_18px_50px_-38px_rgba(22,32,51,0.45)] sm:p-5 lg:block">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2457E6]">
                  {privateInputEnabled ? "Your toy" : "Pikbo sample toy"}
                </p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.035em] sm:text-2xl">
                  {privateInputEnabled
                    ? privateLaunchEnabled
                      ? "Create your toy launch."
                      : "Prepare your toy privately."
                    : "Explore the three Launch Pack formats."}
                </h2>
              </div>
              <span className="rounded-md border border-[#D5D9E1] bg-[#F7F8FA] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-[#667085]">
                {privateInputEnabled && !privateLaunchEnabled && !labStill
                  ? "Input validation"
                  : demoMode
                    ? "Three fixed outputs"
                    : "Private validation"}
              </span>
            </div>
            <p className="mt-2 max-w-xl text-xs font-semibold leading-5 text-[#667085]">
              {privateInputEnabled && !privateLaunchEnabled && !labStill
                ? "Upload and privately verify one authorized product photo. Video generation is still closed, and this step reserves no credits."
                : demoMode
                  ? "Choose a Pikbo-owned sample to inspect three static format directions. The archived motion tests use separate sample toys and are not generated from your selection."
                  : "Drop one authorized product photo. Pikbo keeps the fixed three-format Pack and server-led status checks unchanged."}
            </p>
            {!demoMode ? (
              sellerDirectorPlan?.ready ? (
                <div className="mt-3" data-seller-pack-plan="director">
                  <DirectorPlanPanel plan={sellerDirectorPlan} />
                </div>
              ) : (
                <div className="mt-3">{creditStrip}</div>
              )
            ) : null}
            <p
              data-seller-pack-recovery="session-pointer"
              className="mt-3 border-t border-[#E1E4EA] pt-3 text-[10px] font-semibold leading-4 text-[#7A8290]"
            >
              {privateInputEnabled && !privateLaunchEnabled && !labStill
                ? "A verified photo is a private input asset, not a Launch Pack. No jobs are created until the full generation gate opens."
                : demoMode
                  ? "Direction frames are not completed customer videos."
                  : "This browser can reopen the active Pack after refresh using its session pointer. Server status remains authoritative; completed signed-in results can appear in Library."}
            </p>
            {sellerPackRecoveryNote ? (
              <p className="mt-2 text-[10px] font-semibold leading-relaxed text-[#667085]">
                {sellerPackRecoveryNote}
              </p>
            ) : null}
            <button
              type="button"
              disabled={
                verifyingInput ||
                (Boolean(image) &&
                  (privateLaunchEnabled
                    ? !canStartFreshSellerPack
                    : Boolean(verifiedInputAssetId)))
              }
              onClick={() => {
                if (image) {
                  if (!labStill && !privateLaunchEnabled) {
                    void verifyPrivateInput();
                  } else if (canStartFreshSellerPack) {
                    void runBatch();
                  }
                  return;
                }
                if (privateInputEnabled) {
                  document
                    .getElementById("seller-pack-photo")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                  return;
                }
                void chooseLabSample(SAMPLE_TOYS[0].id);
              }}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#2457E6] px-4 text-sm font-black text-white transition hover:bg-[#1948C7] disabled:cursor-not-allowed disabled:opacity-45"
              data-seller-pack-action="desktop-primary"
            >
              {image
                ? jobs.length > 0 || activePackRunId || runProjectId
                  ? "Review this Pack below"
                  : primaryBatchLabel
                : privateInputEnabled
                  ? "Upload owned toy photo"
                  : "Choose a sample toy"}
            </button>
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
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#667085] sm:hidden">
            {privateInputEnabled
              ? "Your product photo"
              : "Selected sample"}
          </p>
          {privateInputEnabled ? (
            <label
              id="seller-pack-photo"
              htmlFor="seller-pack-photo-input"
              className={`flex aspect-[16/5] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-white transition-all duration-200 hover:border-[#2457E6] hover:bg-[#F8FAFF] sm:aspect-[16/10] ${
                image
                  ? "border-[#D5D9E1] shadow-[0_18px_50px_-38px_rgba(22,32,51,0.45)]"
                  : "border-[#2457E6]/45"
              }`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                loadFile(event.dataTransfer.files?.[0]);
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
                <span className="px-4 text-center text-sm font-semibold text-[#667085]">
                  <span className="mb-2 block text-2xl text-[#2457E6]" aria-hidden>
                    +
                  </span>
                  Drop your product photo
                  <br />
                  <span className="text-xs font-medium text-[#8A919D]">
                    One owned toy image · JPEG / PNG / WebP · under 8 MB
                  </span>
                </span>
              )}
              <input
                id="seller-pack-photo-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => loadFile(event.target.files?.[0])}
              />
            </label>
          ) : (
            <div
              id="seller-pack-photo"
              data-public-pack-preview="lab-only"
              className="flex aspect-[16/5] flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#D5D9E1] bg-white shadow-[0_18px_50px_-38px_rgba(22,32,51,0.45)] sm:aspect-[16/10]"
            >
              {image && labStill ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt="Selected Pikbo sample toy"
                  className="h-full w-full bg-[#F7F8FA] object-contain"
                />
              ) : (
                <span className="max-w-sm px-5 text-center text-sm font-semibold leading-6 text-[#667085]">
                  Choose a Pikbo-owned sample.
                  <br />
                  <span className="text-xs font-medium text-[#8A919D]">
                    No product-photo input is accepted or processed here.
                  </span>
                </span>
              )}
            </div>
          )}
          {privateInputEnabled && image && !labStill && !privateLaunchEnabled ? (
            <div
              className="mt-3 rounded-xl border border-[#D5D9E1] bg-[#F7F8FA] px-3 py-2.5 text-xs font-semibold leading-5 text-[#667085]"
              data-private-input-only="true"
            >
              <p className="font-black text-[#111827]">
                {verifiedInputAssetId
                  ? "Photo verified privately"
                  : "Private photo verification"}
              </p>
              <p>
                {verifiedInputAssetId
                  ? "Your photo passed the private size, type, and checksum checks. Generation is temporarily unavailable."
                  : "Verify this photo in Pikbo's private input storage. This does not create a Pack or reserve credits."}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#2457E6]">
                0 credits reserved · 0 video jobs created
              </p>
            </div>
          ) : null}
          {privateInputEnabled &&
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
            <div className="mt-2 grid grid-cols-4 gap-2">
              {SAMPLE_TOYS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  className={`grid min-h-14 items-center justify-center gap-2 rounded-xl border bg-white p-1.5 text-left text-[11px] font-black transition sm:grid-cols-[42px_1fr] sm:justify-stretch ${
                    activeSampleId === sample.id
                      ? "border-[#2457E6] text-[#2457E6] ring-2 ring-[#2457E6]/12"
                      : "border-[#D5D9E1] text-[#4E5663] hover:border-[#2457E6] hover:text-[#2457E6]"
                  }`}
                  onClick={() => void chooseLabSample(sample.id)}
                  aria-pressed={activeSampleId === sample.id}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sample.path}
                    alt=""
                    className="h-10 w-10 rounded-lg bg-[#E4E7ED] object-cover"
                  />
                  <span className="sr-only sm:not-sr-only">{sample.label}</span>
                </button>
              ))}
              <p className="col-span-4 hidden text-[10px] font-semibold leading-4 text-[#667085] sm:block">
                {privateInputEnabled
                  ? privateLaunchEnabled
                    ? "Samples stay public. Replace one with your own photo for invited private generation."
                    : "Samples stay public. Your own photo is accepted only for private verification while generation is closed."
                  : "Pikbo-owned samples · no customer upload · 0 credits."}
              </p>
            </div>
          ) : null}
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
                    {!freeLiveOpen
                      ? "Cached Lab · 0 credits · Live gated"
                      : trialDone
                        ? "Free Mini trial used · Lab demos still free"
                        : `${liveContractLabel} fixed`}
                    {clipsLeft !== null && freeLiveOpen && !trialDone
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
            <div className="rounded-xl border border-[#D5D9E1] bg-white px-3 py-2.5 text-xs font-semibold text-[#667085]">
              Three fixed formats · Listing Spin 1:1 · Reveal and Social Flash
              9:16 · 5 seconds each
            </div>
          )}
        </div>

        <div className={isSellerPack ? "hidden" : undefined}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-[var(--fg-muted)]">
              {isSellerPack ? "Included formats" : "Presets in this batch"}
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
            ) : (
              <span className="rounded-full border border-[var(--mint)]/30 bg-[var(--mint)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--mint)]">
                Fixed launch formats
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
                    {demoMode ? "Cached preview" : "10 credits"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>

        {image && privateInputEnabled && !labStill ? (
          <label
            id="batch-ownership"
            data-launch-pack-primary-action="2"
            className="hidden cursor-pointer items-start gap-2 rounded-xl border border-[#D5D9E1] bg-white px-3 py-2.5 text-[11px] font-semibold leading-snug text-[#667085] lg:flex"
          >
            <input
              type="checkbox"
              checked={ownsRights}
              onChange={(e) => setOwnsRights(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#2457E6]"
            />
            <span>
              {privateLaunchEnabled
                ? "I own this photo and have the right to animate and publish this toy for every preset in the batch."
                : "I own this photo and authorize Pikbo to store and verify it privately."}
            </span>
          </label>
        ) : null}

        {running ? (
          sellerPackActive ? (
            <div className="rounded-2xl border border-[#BFCDF7] bg-[#F6F8FF] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2457E6]">
                Creating your Launch Pack
              </p>
              <p className="mt-1 text-lg font-black tracking-[-0.03em]">
                {doneCount} of 3 clips ready
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[#667085]">
                Completed clips stay available if another format needs
                attention. Server status confirms settlement and restoration.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {SELLER_PACK_ITEMS.map((item) => {
                  const job = jobs.find((candidate) => candidate.slug === item.slug);
                  return (
                    <div key={item.key} className="rounded-lg border border-[#D5D9E1] bg-white px-2.5 py-2">
                      <p className="truncate text-[10px] font-black">{item.label}</p>
                      <p className="mt-1 text-[9px] font-bold text-[#2457E6]">
                        {job ? launchWorkspaceStatus(job.status) : "Preparing"}
                      </p>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={cancelInFlightPack}
                className="mt-3 min-h-10 w-full rounded-xl border border-[#D5D9E1] bg-white px-4 text-xs font-black text-[#4E5663]"
                title="Stops waiting in this browser. A render already in progress may still finish."
              >
                Cancel Pack · keep finished clips
              </button>
            </div>
          ) : (
            <>
            <GenerateWaitStage
              elapsed={packElapsed}
              demoMode={demoMode}
              image={image}
              effectLabel={
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
          )
        ) : (
          <button
            type="button"
            disabled={!canRun}
            onClick={() => void runBatch()}
            className={
              sellerPackActive
                ? "hidden"
                : "btn btn-primary hidden w-full disabled:opacity-50 lg:flex"
            }
            data-launch-pack-primary-action={image ? "3" : "1"}
          >
            {primaryBatchLabel}
          </button>
        )}
        {!liveQuoteCovered && sellerPackActive ? (
          <div className="rounded-xl border border-[#F2C9BE] bg-[#FFF6F3] p-3 text-xs text-[#8A3C2C]">
            <p className="font-black">
              {trialDone && isFree && freeLiveOpen
                ? "Free Mini trial used · Launch Pack needs 30 live credits"
                : !freeLiveOpen && isFree
                  ? "Live gated · Launch Pack needs 30 live credits when Live opens"
                  : `Full live pack needs ${cost} credits; this session has ${me?.credits ?? 0}.`}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-[#8A5A50]">
              {trialDone && isFree && freeLiveOpen ? (
                <>
                  Cached Lab demos stay free (0 credits · upload not processed).
                  Private generation remains invite-only; public checkout is
                  closed while Founding Studio is validated.{" "}
                  <Link
                    href="/pricing"
                    className="font-bold text-[#2457E6] hover:underline"
                  >
                    See the validation gate
                  </Link>
                  .
                </>
              ) : freeLiveOpen ? (
                <>
                  Free Mini covers one 10-cr job
                  {clipsLeft !== null ? ` (~${clipsLeft} left)` : ""} — not a
                  full 30-credit pack. Pick one child recipe below for single
                  Generate, or Preview the pack as cached demos.
                </>
              ) : (
                <>
                  Cached Lab demos stay free (0 credits · upload not processed).
                  Live pack credits are not available while Live is closed —
                  preview as cached demos, or open single Generate when Live is
                  enabled.
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
                  title={
                    freeLiveOpen
                      ? "Open this format in single Generate (10 credits when Live)"
                      : "Open this format as Cached Lab / single Generate (Live gated)"
                  }
                  className="rounded-md border border-[#D5D9E1] bg-white px-2.5 py-1 text-[10px] font-bold text-[#596170]"
                  data-pack-try-recipe={item.slug}
                  data-pack-try-ratio={item.aspectRatio}
                >
                  Try {item.label}
                </Link>
              ))}
              {trialDone && isFree && freeLiveOpen ? (
                <Link
                  href="/pricing"
                  className="rounded-md border border-[#2457E6]/30 bg-white px-2.5 py-1 text-[10px] font-bold text-[#2457E6]"
                >
                  Plans
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
        {error ? (
          sellerPackActive ? (
            <div className="rounded-xl border border-[#F2C9BE] bg-[#FFF6F3] p-3 text-xs text-[#8A3C2C]">
              <p className="font-black">
                {privateInputOnly
                  ? "Private photo verification needs attention"
                  : "This Pack needs attention"}
              </p>
              <p className="mt-1 font-semibold leading-5">{error}</p>
              {canRetryUnreservedPack ? (
                <button
                  type="button"
                  onClick={() => {
                    setFailRetryAfterSec(null);
                    if (privateInputOnly) {
                      void verifyPrivateInput();
                    } else {
                      void runBatch();
                    }
                  }}
                  className="mt-3 rounded-xl bg-[#2457E6] px-4 py-2 text-[11px] font-black text-white"
                  data-private-input-action={
                    privateInputOnly ? "retry-verify-private-input" : undefined
                  }
                >
                  {privateInputOnly
                    ? "Retry photo verification"
                    : "Try Pack setup again"}
                </button>
              ) : jobs.length > 0 || activePackRunId || runProjectId ? (
                <p className="mt-2 text-[10px] font-bold text-[#8A5A50]">
                  Completed formats stay available. Use the failed-format
                  controls or refresh the owner status. If Pack setup was
                  interrupted, refresh before trying again; this notice will
                  not rerun the whole Pack.
                </p>
              ) : null}
            </div>
          ) : (
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
              retryLabel="Retry batch"
              showLabSample={!image}
              showModules={false}
            />
          )
        ) : null}
        {privateInputOnly ? (
          <p className="hidden text-[11px] font-semibold text-[#717987] lg:block">
            This step verifies one private input only. It creates no Pack,
            video jobs, Library result, or credit reservation.
          </p>
        ) : (
          <p className={sellerPackActive ? "hidden text-[11px] font-semibold text-[#717987] lg:block" : "text-[11px] text-[var(--fg-dim)]"}>
            {demoMode && sellerPackActive
              ? "Open three archived examples for the fixed launch formats"
              : "Each format runs independently"}
            {!demoMode || !sellerPackActive
              ? demoMode
                ? " as a cached Lab preview"
              : isFree
                ? freeLiveOpen
                  ? trialDone
                    ? " (Free Mini trial used · Lab demos still free)"
                    : ` (${liveContractLabel})`
                  : " (Cached Lab · 0 credits · Live gated)"
                : " (private 720p)"
              : null}
            . Finished clips land in{" "}
            <Link href="/library" className={sellerPackActive ? "text-[#2457E6] hover:underline" : "text-[var(--brand)] hover:underline"}>
              Library
            </Link>
            .
          </p>
        )}
      </div>

      <div
        className={
          sellerPackActive
            ? "space-y-3 rounded-2xl border border-[#D5D9E1] bg-white p-3 shadow-[0_18px_50px_-38px_rgba(22,32,51,0.45)] sm:p-4"
            : "card space-y-3 p-4"
        }
      >
        <div className="flex items-center justify-between">
          <div>
            <p className={sellerPackActive ? "text-[9px] font-black uppercase tracking-[0.14em] text-[#2457E6]" : "hidden"}>
              {privateInputOnly ? "Private input" : "Three fixed outputs"}
            </p>
            <h2 className={sellerPackActive ? "mt-1 text-xl font-black tracking-[-0.035em]" : "font-semibold"}>
              {sellerPackActive
                ? privateInputOnly
                  ? verifiedInputAssetId
                    ? "Private photo verified"
                    : "Verify before generation"
                  : demoMode
                  ? jobs.length > 0
                    ? "Archived format motion tests"
                    : "Launch Pack directions"
                  : running
                    ? "Creating your Launch Pack"
                    : doneCount > 0 && doneCount < 3
                      ? "Your Pack is partially ready"
                      : doneCount === 3 && availableDownloads.length === 3
                        ? "Your Launch Pack is ready"
                        : "Your Launch Pack"
                : "Queue"}
            </h2>
            {jobs.length > 0 ? (
              <p className={sellerPackActive ? "mt-1 text-[10px] font-semibold text-[#717987]" : "mt-0.5 text-[10px] text-[var(--fg-dim)]"}>
                {demoMode
                  ? `${doneCount} archived prototype${doneCount === 1 ? "" : "s"} · separate sample toys`
                  : `${doneCount} of 3 clips ready`}
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
            {failedRetryCount > 0 && !sellerPackActive ? (
              <button
                type="button"
                disabled={running || !image || !ownsRights}
                onClick={() => void retryAllFailed()}
                className={sellerPackActive ? "rounded-md border border-[#2457E6]/30 bg-[#F6F8FF] px-3 py-1.5 text-[10px] font-black text-[#2457E6] disabled:opacity-40" : "rounded-full border border-[var(--mint)]/35 px-3 py-1 text-[10px] font-bold text-[var(--mint)] disabled:opacity-40"}
                title="Retry only confirmed failed or unsubmitted formats; completed clips stay available"
              >
                Retry failed formats
              </button>
            ) : null}
            {jobs.length > 0 ? (
              <span className={sellerPackActive ? "text-[10px] font-semibold text-[#8A919D]" : "text-[10px] text-[var(--fg-dim)]"}>
                {demoMode ? "Public sample" : "Private validation"}
              </span>
            ) : null}
          </div>
        </div>
        {jobs.length === 0 && (
          sellerPackActive ? (
            privateInputOnly ? (
              <div
                className="rounded-xl border border-[#D5D9E1] bg-[#F7F8FA] px-4 py-5"
                data-private-input-review="original-only"
              >
                <p className="text-sm font-black tracking-[-0.025em] text-[#111827]">
                  Original photo only · no generated outputs
                </p>
                <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-[#667085]">
                  Pikbo is storing and verifying the selected original. It is
                  not shown as a Launch Pack result, and no output cards exist
                  until the separate generation gate opens.
                </p>
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.08em] text-[#2457E6]">
                  0 Pack jobs · 0 Library results · 0 credits reserved
                </p>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-3">
                {SELLER_PACK_ITEMS.map((item, index) => {
                  const direction = SELLER_PACK_DIRECTION_FRAMES[index];
                  return (
                    <article
                      key={item.key}
                      className="overflow-hidden rounded-xl border border-[#D5D9E1] bg-[#F7F8FA]"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden bg-[#E2E5EB]">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={image}
                            alt={`${item.label} direction using the selected toy sample`}
                            className={`h-full w-full ${
                              index === 0
                                ? "bg-[#EDF0F5] object-contain"
                                : index === 1
                                  ? "object-cover object-center"
                                  : "object-cover object-top"
                            }`}
                          />
                        ) : (
                          <div className="grid h-full place-items-center px-4 text-center text-[10px] font-black uppercase tracking-[0.1em] text-[#7A8290]">
                            Choose a sample toy
                          </div>
                        )}
                        <span className={`absolute left-2 top-2 rounded-md px-2 py-1 text-[7px] font-black uppercase tracking-[0.08em] text-white ${index === 0 ? "bg-[#2457E6]" : "bg-[#E85C45]"}`}>
                          {index === 0 ? "Selected toy still" : direction.evidence}
                        </span>
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-black tracking-[-0.025em]">{item.label}</p>
                        <p className="mt-1 text-[9px] font-semibold text-[#717987]">
                          {direction.use} · {item.aspectRatio} · 5 sec
                        </p>
                      </div>
                    </article>
                  );
                })}
                <p className="sm:col-span-3 text-[10px] font-semibold leading-4 text-[#717987]">
                  The selected toy stays visible across three static format
                  directions. These are not completed videos or customer results.
                </p>
              </div>
            )
          ) : (
            <div className="rounded-xl border border-dashed border-white/12 bg-black/25 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-[var(--fg)]">No batch jobs yet</p>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--fg-dim)]">
                Pick presets, confirm ownership, then run. Finished clips also
                save on this device Library.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <FreeTrialCta
                  path="/create?mode=seller-pack"
                  labelTry="Preview Lab sample"
                  labelDemo="Preview Lab sample"
                  hideClipsChip
                  className="rounded-full border border-[var(--mint)]/35 px-3 py-1.5 text-[11px] font-bold text-[var(--mint)]"
                />
                <Link
                  href={createGenerate360Href("batch-studio")}
                  className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-bold text-white/70"
                  data-batch-single-generate="remix"
                >
                  Single-format preview
                </Link>
              </div>
            </div>
          )
        )}
        {jobs.length > 0 && (
          <div className={sellerPackActive ? "flex flex-wrap items-center gap-2 rounded-xl border border-[#D5D9E1] bg-[#F7F8FA] px-3 py-2" : "flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-black/30 px-3 py-2"}>
            <p className={sellerPackActive ? "text-[11px] font-semibold text-[#667085]" : "text-[11px] text-[var(--fg-muted)]"}>
              {demoMode
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
              className={sellerPackActive ? "rounded-md bg-[#2457E6] px-3 py-1.5 text-[10px] font-black text-white disabled:opacity-40" : "rounded-full border border-[var(--mint)]/40 bg-[var(--mint)]/10 px-3 py-1 text-[10px] font-bold text-[var(--mint)] disabled:opacity-40"}
              title="Saves each available clip. Failed formats and unavailable raw files are omitted."
              data-launch-pack-export="downloadable-only"
            >
              {exportBusy
                ? "Saving clips…"
                : `${demoMode ? "Download archived tests" : "Download available videos"}${
                    availableDownloads.length
                      ? ` · ${availableDownloads.length}`
                      : ""
                  }`}
            </button>
            <span className={sellerPackActive ? "text-[10px] font-semibold text-[#8A919D]" : "text-[10px] text-[var(--fg-dim)]"}>
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
              className={sellerPackActive ? "inline-flex min-h-10 items-center rounded-xl bg-[#2457E6] px-4 py-2 text-xs font-black text-white" : "btn btn-primary px-4 py-2 text-xs"}
            >
              Open in Library
            </Link>
            <a
              href={
                demoMode
                  ? "/create?mode=seller-pack&try=1&source=next-sample"
                  : "/create?mode=seller-pack&source=next-sku"
              }
              className={sellerPackActive ? "inline-flex min-h-10 items-center rounded-xl border border-[#D5D9E1] bg-white px-4 py-2 text-xs font-black text-[#4E5663]" : "btn btn-ghost border border-white/15 px-4 py-2 text-xs"}
            >
              {demoMode ? "Preview another sample" : "Create next SKU"}
            </a>
          </nav>
        ) : null}
        {jobs.map((j) => (
          <div
            key={j.slug}
            id={`pack-job-${j.slug}`}
            className={sellerPackActive ? "rounded-xl border border-[#D5D9E1] bg-[#F7F8FA] p-3" : "rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3"}
          >
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className={sellerPackActive ? "font-black tracking-[-0.02em]" : "font-medium"}>{j.name}</span>
              <span
                className={`text-[10px] font-bold uppercase ${
                  sellerPackActive
                    ? j.status === "succeeded"
                      ? "text-[#16824B]"
                      : j.status === "failed" || j.status === "refunded"
                        ? "text-[#C34732]"
                        : j.status === "running" || j.status === "queued"
                          ? "text-[#2457E6]"
                          : "text-[#7A8290]"
                    : j.status === "succeeded"
                      ? "text-[var(--mint)]"
                      : j.status === "failed" || j.status === "refunded"
                        ? "text-[var(--brand)]"
                        : j.status === "running"
                          ? "text-[var(--brand-2)]"
                          : "text-[var(--fg-dim)]"
                }`}
              >
                {sellerPackActive ? launchWorkspaceStatus(j.status) : j.status}
              </span>
            </div>
            {j.error && (
              <p className={sellerPackActive ? "mt-1 text-xs font-semibold text-[#C34732]" : "mt-1 text-xs text-[var(--brand)]"}>{j.error}</p>
            )}
            <div className={sellerPackActive ? "mt-1 flex flex-wrap gap-1.5 text-[10px] font-semibold text-[#717987]" : "mt-1 flex flex-wrap gap-1.5 text-[10px] text-[var(--fg-dim)]"}>
              <span>{j.aspectRatio ?? aspectRatio}</span>
              <span>· {j.duration ?? effectiveDuration}s</span>
              {!sellerPackActive ? <span>· {j.resolution ?? effectiveResolution}</span> : null}
              {j.creditState && !demoMode ? (
                <span
                  className={
                    j.creditState === "refund unconfirmed"
                      ? sellerPackActive
                        ? "font-bold text-[#B45309]"
                        : "font-bold text-amber-300"
                      : sellerPackActive
                        ? "font-bold text-[#667085]"
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
                className="mt-2 max-h-52 w-full rounded-lg bg-black"
              />
            ) : j.status === "succeeded" && j.videoUrl && j.watermark && !j.demo ? (
              <div className={sellerPackActive ? "mt-2 rounded-lg border border-[#E8C88D] bg-[#FFF8EA] px-3 py-3 text-[10px] font-semibold leading-snug text-[#8A5A12]" : "mt-2 rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-3 py-3 text-[10px] leading-snug text-amber-100/90"}>
                <p className="font-bold">Free live held for T6 bake</p>
                <p className={sellerPackActive ? "mt-0.5 text-[#8A6A35]" : "mt-0.5 text-white/50"}>{freeLiveDownloadBlockReason()}</p>
              </div>
            ) : null}
            {j.status === "succeeded" && (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase ${
                    sellerPackActive
                      ? j.demo
                        ? "text-[#E85C45]"
                        : "text-[#16824B]"
                      : j.demo
                        ? "text-[var(--fg-dim)]"
                        : "text-[var(--mint)]"
                  }`}
                >
                  {j.demo
                    ? sellerPackActive
                      ? "Archived motion test · separate sample toy"
                      : "Cached demo"
                    : "Private generation"}
                </span>
                {j.model && !sellerPackActive && (
                  <span className="text-[10px] text-[var(--fg-dim)]">
                    {j.model.split("/").pop()}
                  </span>
                )}
                {!sellerPackActive ? (
                  <Link
                    href={`/effects/${j.slug}`}
                    className="text-[10px] text-[var(--mint)] hover:underline"
                  >
                    Effect page →
                  </Link>
                ) : null}
                {j.demo || !j.watermark ? (
                  j.requestId ||
                  (j.videoUrl && isSafeDeliverableUrl(j.videoUrl)) ? (
                    <button
                      type="button"
                      data-seller-download="gated"
                      onClick={() => void downloadChild(j)}
                      className={sellerPackActive ? "text-[10px] font-black text-[#2457E6] hover:underline" : "text-[10px] text-[var(--mint)] hover:underline"}
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
                disabled={running || !image || !ownsRights}
                onClick={() => void retryJob(j.slug)}
                className={sellerPackActive ? "mt-2 rounded-md border border-[#2457E6]/30 bg-white px-3 py-1.5 text-[10px] font-black text-[#2457E6] disabled:opacity-40" : "mt-2 rounded-full border border-[var(--mint)]/30 px-3 py-1 text-[10px] font-bold text-[var(--mint)] disabled:opacity-40"}
              >
                Retry this format · reserve 10 credits
              </button>
            )}
            {j.creditState === "refund unconfirmed" ? (
              <p className={sellerPackActive ? "mt-2 text-[10px] font-semibold text-[#B45309]" : "mt-2 text-[10px] text-amber-200"}>
                Credit restoration is not confirmed — check your balance before retrying this format.
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {/* Phase F: sticky mobile Seller Pack / Batch CTA
          Nav-less Seller Pack (pack=seller) hides AppShell tab → safe-area only.
          Tab-sharing custom batch / selected seller-trio clears tab + home indicator. */}
      <div
        className={
          isSellerPack
            ? "fixed inset-x-0 bottom-[var(--floating-cta-safe-bottom)] z-[var(--floating-generate-z)] border-t border-[#D5D9E1] bg-white/96 px-4 py-2.5 shadow-[0_-12px_36px_rgba(22,32,51,0.12)] backdrop-blur-xl lg:hidden"
            : sellerPackActive
              ? "fixed inset-x-0 bottom-[var(--mobile-nav-clearance)] z-[var(--floating-generate-z)] border-t border-[#D5D9E1] bg-white/96 px-4 py-2.5 shadow-[0_-12px_36px_rgba(22,32,51,0.12)] backdrop-blur-xl lg:hidden"
              : "fixed inset-x-0 bottom-[var(--mobile-nav-clearance)] z-[var(--floating-generate-z)] border-t border-white/10 bg-black/92 px-4 py-2.5 shadow-[0_-12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:hidden"
        }
        data-seller-pack-sticky="mobile"
        data-floating-generate="batch-sticky"
        data-batch-sticky-clearance={isSellerPack ? "safe-bottom" : "mobile-nav"}
      >
        {image ? (
          <p className={sellerPackActive ? "mb-1.5 truncate text-center text-[10px] font-bold text-[#667085]" : "mb-1.5 truncate text-center text-[10px] font-medium text-white/55"}>
            {sellerPackActive
              ? privateInputEnabled && !privateLaunchEnabled && !labStill
                ? verifiedInputAssetId
                  ? "Photo verified privately · generation closed"
                  : "Private photo verification · 0 credits reserved"
                : demoMode
                  ? "3 archived motion tests · separate sample toys"
                  : `Launch Pack · ${sellerPackQuoteLabel(packQuote)}`
              : `Batch · ${selected.length} recipes · ${batchQuoteLabel(packQuote)}`}
            {doneCount > 0 ? ` · ${doneCount} ready` : ""}
            {failedRetryCount > 0 ? ` · ${failedRetryCount} failed kept` : ""}
          </p>
        ) : null}
        {image && !ownsRights && privateInputEnabled && !labStill ? (
          <label
            className="mb-2 flex cursor-pointer items-start gap-2 rounded-lg border border-[#D5D9E1] bg-[#F7F8FA] px-2.5 py-2 text-[10px] font-semibold leading-snug text-[#667085]"
            data-launch-pack-primary-action="2"
          >
            <input
              type="checkbox"
              checked={ownsRights}
              onChange={(e) => setOwnsRights(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#2457E6]"
            />
            <span>I own this photo and may use it for all three formats.</span>
          </label>
        ) : null}
        {running ? (
          sellerPackActive ? (
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-[#111827]">
                  Creating your Pack · {doneCount}/3 ready
                </p>
                <p className="mt-0.5 text-[9px] font-semibold leading-3 text-[#717987]">
                  Stops waiting here; a render may still finish. Check Pack
                  status and balance before retrying.
                </p>
              </div>
              <button
                type="button"
                onClick={cancelInFlightPack}
                className="shrink-0 rounded-xl border border-[#D5D9E1] bg-white px-3 py-2 text-[10px] font-black text-[#4E5663]"
              >
                Cancel Pack
              </button>
            </div>
          ) : (
            <GenerateWaitMobileStrip
              elapsed={packElapsed}
              demoMode={demoMode}
              onCancel={cancelInFlightPack}
            />
          )
        ) : !image ? (
          privateInputEnabled ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("seller-pack-photo")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
                className="min-w-0 flex-1 rounded-xl bg-[#2457E6] px-4 py-3 text-sm font-black text-white"
                data-seller-pack-action="upload"
              >
                Upload owned toy photo
              </button>
              <button
                type="button"
                onClick={() => void chooseLabSample(SAMPLE_TOYS[0].id)}
                className="shrink-0 rounded-xl border border-[#D5D9E1] bg-white px-3 py-3 text-xs font-black text-[#4E5663]"
                title="Pikbo Lab prototype sample · never sent to private generation"
              >
                Preview Lab
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void chooseLabSample(SAMPLE_TOYS[0].id)}
              className="w-full rounded-xl bg-[#2457E6] px-4 py-3 text-sm font-black text-white"
              data-seller-pack-action="preview-lab"
            >
              Open 3 archived motion tests · 0 credits
            </button>
          )
        ) : jobs.length > 0 ? (
          <div className="flex gap-2">
            <Link
              href="/library"
              className="min-w-0 flex-1 rounded-xl bg-[#2457E6] px-4 py-3 text-center text-sm font-black text-white"
              data-seller-pack-action="library"
            >
              Library
            </Link>
            {failedRetryCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  const firstFailed = jobs.find(retryEligible);
                  if (!firstFailed) return;
                  document
                    .getElementById(`pack-job-${firstFailed.slug}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className="min-w-0 flex-1 rounded-xl border border-[#D5D9E1] bg-white px-3 py-3 text-sm font-black text-[#2457E6] disabled:opacity-50"
                data-seller-pack-action="review-failed"
                title="Review the failed clip before confirming a per-format retry"
              >
                Review failed clip
              </button>
            ) : (
              <a
                href={
                  demoMode
                    ? "/create?mode=seller-pack&try=1&source=next-sample"
                    : "/create?mode=seller-pack&source=next-sku"
                }
                className="min-w-0 flex-1 rounded-xl border border-[#D5D9E1] bg-white px-3 py-3 text-center text-sm font-black text-[#4E5663]"
                data-seller-pack-action="next-sku"
              >
                {demoMode ? "Another sample" : "Create next SKU"}
              </a>
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled={
              !labStill && !privateLaunchEnabled
                ? !ownsRights || verifyingInput || Boolean(verifiedInputAssetId)
                : !canStartFreshSellerPack
            }
            onClick={() => {
              if (!ownsRights) {
                document
                  .getElementById("batch-ownership")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
                return;
              }
              if (!labStill && !privateLaunchEnabled) {
                void verifyPrivateInput();
              } else if (canStartFreshSellerPack) {
                void runBatch();
              }
            }}
            className={
              sellerPackActive
                ? "w-full rounded-xl bg-[#2457E6] px-4 py-3.5 text-[15px] font-black tracking-tight text-white disabled:opacity-45"
                : "btn btn-primary w-full py-3.5 text-[15px] font-black tracking-tight disabled:opacity-50"
            }
            data-seller-pack-action={
              privateInputOnly ? undefined : "generate"
            }
            data-private-input-action={
              !labStill && !privateLaunchEnabled ? "verify-private-input" : undefined
            }
            data-launch-pack-primary-action={image ? "3" : "1"}
          >
            {primaryBatchLabel}
          </button>
        )}
      </div>
    </div>
  );
}
