"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadFavorites, toggleFavorite } from "@/lib/favorites";
import {
  historyFieldsFromSuccess,
  postGenerateWithRetry,
} from "@/lib/generateClient";
import { planGenerateWaitLeave } from "@/lib/generateRecoveryPolicy";
import {
  downloadVideoFile,
  privateDownloadHeaders,
  pushHistory,
} from "@/lib/history";
import {
  canUsePrivateLaunch,
  fetchMe,
  freeTrialExhausted,
  generationDisplayCredits,
  mergeMeSession,
  type MeResponse,
} from "@/lib/meClient";
import { isValidImageDataUrl } from "@/lib/providerError";
import { SAMPLE_TOYS, sampleToDataUrl } from "@/lib/samples";
import { PRESETS } from "@/lib/presets";
import { viralName } from "@/lib/viralNames";
import { CREDITS_PER_VIDEO } from "@/lib/pricing";
import { site } from "@/lib/site";
import { stripeBillingAuthHeaders } from "@/lib/stripeBillingClient";
import { useToast } from "@/components/Toast";
import { PaywallCard } from "@/components/PaywallCard";
import { emitSessionRefresh } from "@/lib/sessionEvents";
import {
  isIgnoredOwnedUploadResult,
  localLibraryNote,
  privateLibraryNote,
  PROVENANCE,
  resultProvenanceLabel,
} from "@/lib/provenance";
import { seedanceModelLabel } from "@/lib/models";
import { parseRemixSearchParams } from "@/lib/remixIntent";
import {
  buildGenerationSpec,
  canDownloadResult,
  downloadBlockedCtaLabel,
  downloadPolicyLabel,
  classifyDownloadHead,
  isPlayableResultVideoUrl,
  freeLiveDownloadBlockReason,
  internSourceImage,
  isSafeDeliverableUrl,
  isSessionGatedDownloadUrl,
  publicShareableVideoUrl,
  preserveRequestSettlementOnVersionRestore,
  requestCreditStateFromFailure,
  requestCreditStateFromSuccess,
  requestSettlementAfterSelectVersion,
  resolveGenerateStill,
  resolveSpecImage,
  type GenerationSpec,
  type RequestCreditState,
} from "@/lib/createTrust";
import { track } from "@/lib/analytics";
import { JobIntentBar } from "@/components/JobIntentBar";
import { AssetBriefPanel } from "@/components/AssetBriefPanel";
import { DirectorPlanPanel } from "@/components/DirectorPlanPanel";
import { GenerateSuiteChrome } from "@/components/GenerateSuiteChrome";
import {
  buildAssetBrief,
  probeImageSize,
  type ImageProbe,
} from "@/lib/assetBrief";
import { buildDirectorPlan } from "@/lib/directorPlan";
import { markActivationJob, markActivationShared } from "@/components/ActivationChecklist";
import { GenerateFailPanel } from "@/components/GenerateFailPanel";
import {
  GenerateWaitMobileStrip,
  GenerateWaitStage,
} from "@/components/GenerateWaitStage";
import { GenerateAfterPath } from "@/components/GenerateAfterPath";
import { useI18n } from "@/components/LanguageProvider";
import { getJobIntent, JOB_INTENTS, type JobIntentId } from "@/lib/jobIntents";
import {
  composeExtraWithIdentity,
  hydrateToyIdentityFromQuery,
  identityProjectName,
  saveToyIdentity,
  type ToyIdentity,
} from "@/lib/toyIdentity";
import { deliveryItemsForJob } from "@/lib/deliveryPack";
import { DeliveryChecklist } from "@/components/DeliveryChecklist";

type Status = "idle" | "uploading" | "generating" | "done" | "error";
type Mode = "i2v" | "t2v";

type ResultVersion = {
  id: string;
  videoUrl: string;
  demo: boolean;
  watermark: boolean;
  model: string;
  duration: number;
  aspectRatio: string;
  resolution: string;
  /** What this successful version cost — never "restored" / unconfirmed. */
  creditState: "0 cached" | "10 used";
  createdAt: string;
  /** Session source-store key for this version's still (shared Base64). */
  sourceKey: string;
  requestId?: string;
  provider?: string;
  /** Server-confirmed owner-scoped object in Pikbo private storage. */
  privateResult: boolean;
  effect: string;
  effectName: string;
  /** Immutable inputs that produced this success (Retry must reuse). */
  spec: GenerationSpec;
  /** Credits the server reported for this success (only when present). */
  costCredits?: number;
  /** True when effect/model/duration/etc. came from the generate response. */
  serverEcho: boolean;
};

function localProjectId(image: string, source?: string): string {
  if (source) return `project-${source}`;
  let hash = 2166136261;
  const sample = image.slice(0, 4096);
  for (let i = 0; i < sample.length; i += 1) {
    hash ^= sample.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `local-${(hash >>> 0).toString(36)}`;
}

const MODELS = [
  {
    id: "seedance-mini",
    label: "Seedance Mini",
    vendor: "ByteDance",
    blurb: "Free tier · 480p",
    free: true,
  },
  {
    id: "seedance-fast",
    label: "Seedance Fast",
    vendor: "ByteDance",
    blurb: "Private beta · balanced speed",
    free: false,
  },
  {
    id: "seedance-2",
    label: "Seedance 2.0",
    vendor: "ByteDance",
    blurb: "Private beta · high quality",
    free: false,
  },
] as const;

export function CreateStudio({
  initialEffect,
  initialModel,
  initialResolution,
  initialMode,
  initialPrompt,
  initialSource,
  initialRatio,
  initialDuration,
  initialChannel,
  initialSample,
  initialJob,
  initialSku,
  initialRetryJobId,
  initialRetryToken,
  fixedMomentContract = false,
}: {
  initialEffect?: string;
  initialModel?: string;
  initialResolution?: string;
  initialMode?: Mode;
  initialPrompt?: string;
  /** PIKBO Lab prototype project id (remix attribution) — RETENTION_REMIX_LOOP */
  initialSource?: string;
  initialRatio?: string;
  initialDuration?: string;
  initialChannel?: string;
  /** First-run sample id (orbit|moon|scout|beatbot) — load photo + ready to generate */
  initialSample?: string;
  /** Job-to-be-done: etsy-listing | tiktok-hook | blind-box-drop | shelf-display */
  initialJob?: string;
  /** Character bible SKU from ?sku= (Next SKU carry) */
  initialSku?: string;
  /** Exact process-ledger retry child + one-time token. */
  initialRetryJobId?: string;
  initialRetryToken?: string;
  /** Hide catalog choices for a real, fixed Moment contract. */
  fixedMomentContract?: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const retryHandoffRef = useRef<{
    retryJobId: string;
    retryToken: string;
  } | null>(
    initialRetryJobId && initialRetryToken
      ? {
          retryJobId: initialRetryJobId,
          retryToken: initialRetryToken,
        }
      : null
  );
  const remix = useMemo(
    () =>
      parseRemixSearchParams({
        effect: initialEffect,
        source: initialSource,
        ratio: initialRatio,
        duration: initialDuration,
        channel: initialChannel,
      }),
    [initialEffect, initialSource, initialRatio, initialDuration, initialChannel]
  );

  const bootPreset =
    PRESETS.find((p) => p.slug === (remix.intent?.recipeSlug || initialEffect)) ??
    PRESETS[0];
  // Soft launch is photo → video only (no Text→Video / multi-model theater).
  const mode: Mode = "i2v";
  void initialMode;
  const [modelId, setModelId] = useState<(typeof MODELS)[number]["id"]>(() => {
    if (fixedMomentContract) return "seedance-fast";
    if (initialModel === "seedance-mini") return "seedance-mini";
    if (initialModel === "seedance-fast") return "seedance-fast";
    if (initialModel === "seedance-2") return "seedance-2";
    return "seedance-mini";
  });
  const [effect, setEffect] = useState(bootPreset.slug);
  const [image, setImage] = useState<string | null>(null);
  /** Phase D local asset id — generate prefers assetId over re-posting Base64. */
  const [assetId, setAssetId] = useState<string | null>(null);
  /** CD Phase B — natural size for rule-based Asset Brief */
  const [imageProbe, setImageProbe] = useState<ImageProbe | null>(null);
  /** True when still is PIKBO Lab prototype sample (not customer SKU) */
  const [labStill, setLabStill] = useState(false);
  const [briefCollapsed, setBriefCollapsed] = useState(true);
  /** Phase C-lite: claimed angles + secondary still (client preview only). */
  const [fidelityAngles, setFidelityAngles] = useState<string[]>([]);
  const [secondaryStill, setSecondaryStill] = useState<string | null>(null);
  /** Soft-applied primary recipe once per still (Phase B2). */
  const briefAutoAppliedRef = useRef(false);
  const [extra, setExtra] = useState(initialPrompt ?? "");
  /** Optional SKU lock — first principles, not Character/Soul cloud */
  const [toyIdentity, setToyIdentity] = useState<ToyIdentity>({
    sku: (initialSku || "").trim().slice(0, 64),
    preserve: "",
  });
  const [duration, setDuration] = useState<5 | 10>(() => {
    if (remix.intent?.durationSeconds === 10 || remix.intent?.durationSeconds === 5) {
      return remix.intent.durationSeconds;
    }
    return bootPreset.duration === 10 ? 10 : 5;
  });
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9" | "1:1">(() => {
    if (
      remix.intent?.aspectRatio === "16:9" ||
      remix.intent?.aspectRatio === "1:1" ||
      remix.intent?.aspectRatio === "9:16"
    ) {
      return remix.intent.aspectRatio;
    }
    return bootPreset.aspectRatio === "16:9" || bootPreset.aspectRatio === "1:1"
      ? bootPreset.aspectRatio
      : "9:16";
  });
  const [status, setStatus] = useState<Status>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Cached fallback after an owned upload is a blocked outcome, not READY. */
  const [lastUploadIgnored, setLastUploadIgnored] = useState(false);
  /** Server Retry-After for rate limit / inflight / provider network. */
  const [failRetryAfterSec, setFailRetryAfterSec] = useState<number | null>(
    null
  );
  const [demo, setDemo] = useState(false);
  const [watermark, setWatermark] = useState(true);
  const [session, setSession] = useState<MeResponse | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);
  const privateUploadEnabled = canUsePrivateLaunch(session);
  const [showPaywall, setShowPaywall] = useState(false);
  const [upgradedBanner, setUpgradedBanner] = useState(false);
  const [usedModel, setUsedModel] = useState<string | null>(null);
  /** Server-enforced meta from last success (prefer over client prefs). */
  const [resultDuration, setResultDuration] = useState<number | null>(null);
  const [resultAspect, setResultAspect] = useState<string | null>(null);
  const [resultResolution, setResultResolution] = useState<string | null>(null);
  const [presetFilter, setPresetFilter] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [recoveringSavedResult, setRecoveringSavedResult] = useState(false);
  /** Durable recovery exhausted without authority; original POST still open. */
  const [awaitingPrimaryAfterRecovery, setAwaitingPrimaryAfterRecovery] =
    useState(false);
  const [copied, setCopied] = useState(false);
  // PRD soft-launch §3/§5: user must confirm rights before submitting.
  const [ownsRights, setOwnsRights] = useState(false);
  // PRD soft-launch §5.2: an unknown deep-link slug must not silently pretend
  // the requested recipe is active.
  const requestedUnknownEffect =
    Boolean(initialEffect) && !PRESETS.some((p) => p.slug === initialEffect);
  const [showUnknownNotice, setShowUnknownNotice] = useState(
    requestedUnknownEffect
  );
  const [favorites, setFavorites] = useState<string[]>([]);
  const [compare, setCompare] = useState(true);
  const [resolution, setResolution] = useState<"480p" | "720p">(
    initialResolution === "480p" ? "480p" : "720p"
  );
  const [seed, setSeed] = useState<string>("");
  /** Collapsed by default — soft launch is photo → recipe → one generate. */
  const [showAdvanced, setShowAdvanced] = useState(false);
  /** Last failed live job restored credits (PRD §5 / W5 trust). */
  const [lastRefunded, setLastRefunded] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  /** Successful retries/variants remain selectable; a new run never overwrites one. */
  const [versions, setVersions] = useState<ResultVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  /** Shared still pool — versions hold keys, not duplicated multi-MB Base64. */
  const [sourceStore, setSourceStore] = useState<Record<string, string>>({});
  /**
   * Wave B: settlement of the *last generate request* — independent of which
   * historical version is selected. Failures must not be overwritten by Vn's
   * used/cached chip.
   */
  const [lastRequestCreditState, setLastRequestCreditState] =
    useState<RequestCreditState>(null);
  /** In-flight generate abort — cancel marks refund unconfirmed if network cut mid-debit. */
  const generateAbortRef = useRef<AbortController | null>(null);
  /**
   * When true, UI stopped waiting but the original /api/generate must keep
   * running (no abort, no ledger cancel, no second provider call).
   */
  const detachedWaitRef = useRef(false);
  const generateMountedRef = useRef(true);
  /** Avoid duplicate quote-view events while React rerenders the same quote. */
  const quoteEventRef = useRef("");
  const toast = useToast();

  useEffect(() => {
    generateMountedRef.current = true;
    return () => {
      // Non-destructive leave: drop UI ownership only. Explicit Cancel is the
      // sole path that aborts primary + best-effort cancels the ledger.
      generateMountedRef.current = false;
      generateAbortRef.current = null;
    };
  }, []);

  function cancelInFlightGenerate() {
    const ctrl = generateAbortRef.current;
    if (!ctrl) return;
    // Explicit cancel only — abort signal triggers ledger cancel in generateClient.
    // Detach (leaveWaitingKeepBackground) never calls abort().
    ctrl.abort();
    generateAbortRef.current = null;
    detachedWaitRef.current = false;
    setRecoveringSavedResult(false);
    setAwaitingPrimaryAfterRecovery(false);
    // Immediate Wave B settlement until the aborted POST resolves (also refundUnconfirmed).
    setLastRequestCreditState("refund unconfirmed");
    toast(
      "Canceled · ledger cancel best-effort · refund unconfirmed until balance confirms"
    );
  }

  /**
   * Stop waiting on Create without aborting the original generate or canceling
   * the ledger. User can open Library while the same private task finishes.
   */
  function leaveWaitingKeepBackground() {
    const plan = planGenerateWaitLeave("detach");
    if (plan.abortPrimary || plan.cancelLedger || plan.startNewGenerate) {
      // Defensive: detach plan must never harm the in-flight job.
      return;
    }
    // Drop the AbortController ref without abort() so cleanup cannot cancel.
    generateAbortRef.current = null;
    detachedWaitRef.current = true;
    setRecoveringSavedResult(false);
    setAwaitingPrimaryAfterRecovery(false);
    setElapsed(0);
    setStatus("idle");
    toast(
      "Still generating in the background · open Library when ready — no cancel sent"
    );
    // Soft client navigation keeps the original fetch alive in this document.
    // Hard reload would drop the browser request without canceling the ledger,
    // but would also lose the chance to pushHistory when primary settles.
    router.push("/library");
  }

  const preset = useMemo(
    () => PRESETS.find((p) => p.slug === effect)!,
    [effect]
  );

  const filteredPresets = useMemo(() => {
    const q = presetFilter.trim().toLowerCase();
    if (!q) return PRESETS;
    return PRESETS.filter((p) => {
      const viral = viralName(p.slug, p.name).toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        viral.includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.category.includes(q)
      );
    });
  }, [presetFilter]);

  function selectEffect(slug: string) {
    setEffect(slug);
    const p = PRESETS.find((x) => x.slug === slug);
    if (!p) return;
    track({
      event: "recipe_selected",
      path: "/create",
      recipe: slug,
      demo: demoMode,
    });
    // Free trial: always 5s (unit economics)
    const free = session?.plan === "free" || session?.watermark;
    setDuration(!free && p.duration === 10 ? 10 : 5);
    if (
      p.aspectRatio === "9:16" ||
      p.aspectRatio === "16:9" ||
      p.aspectRatio === "1:1"
    ) {
      setAspectRatio(p.aspectRatio);
    }
  }

  /** One-tap joy path: PIKBO Lab prototype still + matching recipe. Rights = Lab sample. */
  async function loadSampleToy(sampleId: string, autoGenerate = false) {
    const s = SAMPLE_TOYS.find((x) => x.id === sampleId) ?? SAMPLE_TOYS[0];
    setSampleLoading(true);
    setError(null);
    try {
      const data = await sampleToDataUrl(s.path);
      await adoptImage(data, { labSample: true });
      selectEffect(s.effect);
      // PIKBO Lab reference stills — not a visitor upload or verified provider input.
      setOwnsRights(true);
      if (autoGenerate) {
        toast("Previewing PIKBO Lab prototype sample · cached · 0 credits…");
        await generate({
          imageOverride: data,
          effectOverride: s.effect,
          rightsOverride: true,
          labSampleId: s.id,
        });
      } else {
        toast("PIKBO Lab prototype still ready — tap Generate when you want the clip");
      }
    } catch {
      setError(
        privateUploadEnabled
          ? "Could not load sample photo — try another or upload your own"
          : "Could not load that Lab sample — try another cached sample"
      );
    } finally {
      setSampleLoading(false);
    }
  }

  // First-run: ?sample=scout or ?try=1 → load sample and auto-generate
  useEffect(() => {
    if (!initialSample) return;
    const id = SAMPLE_TOYS.some((s) => s.id === initialSample)
      ? initialSample
      : "scout";
    // Defer so we don't setState synchronously inside the effect body.
    const t = window.setTimeout(() => {
      void loadSampleToy(id, true);
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSample]);

  // Deep link: ?job=etsy-listing → select recipe + aspect (outcome routing).
  // Jobs with href (Seller Pack) redirect to mode=seller-pack + sku carry —
  // never silently drop commercial context on /create?job=seller-pack.
  useEffect(() => {
    if (!initialJob) return;
    const job = getJobIntent(initialJob);
    if (!job) return;
    const t = window.setTimeout(() => {
      if (job.href) {
        try {
          const u = new URL(job.href, window.location.origin);
          const sku = (initialSku || "").trim().slice(0, 64);
          if (sku) u.searchParams.set("sku", sku);
          const tryParam = new URLSearchParams(window.location.search).get(
            "try"
          );
          if (tryParam) u.searchParams.set("try", tryParam);
          const dest = `${u.pathname}${u.search}`;
          const here = `${window.location.pathname}${window.location.search}`;
          if (dest !== here) {
            window.location.replace(dest);
          }
        } catch {
          /* ignore bad href */
        }
        return;
      }
      applyJobIntent(job.id);
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJob, initialSku]);

  useEffect(() => {
    if (status !== "generating") return;
    const t0 = Date.now();
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [status]);

  function rememberEffect(slug: string) {
    try {
      const raw = localStorage.getItem("pikbo_recent_effects");
      const prev = raw ? (JSON.parse(raw) as string[]) : [];
      const next = [slug, ...prev.filter((s) => s !== slug)].slice(0, 6);
      localStorage.setItem("pikbo_recent_effects", JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  const refreshSession = useCallback(async () => {
    const data = await fetchMe();
    setSessionResolved(true);
    if (!data) return;
    setSession(data);
    setWatermark(data.watermark);
    // Free path: Mini (cheapest wool) + 480p
    if (data.plan === "free" || data.watermark) {
      setModelId("seedance-mini");
      setResolution("480p");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      await refreshSession();
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const checkoutId = params.get("session_id");
      if (checkoutId?.startsWith("cs_")) {
        let clearCheckoutParam = false;
        try {
          const headers = await stripeBillingAuthHeaders();
          const res = await fetch("/api/checkout/confirm", {
            method: "POST",
            headers,
            body: JSON.stringify({ session_id: checkoutId }),
          });
          const data = await res.json();
          if (!cancelled && res.ok && data.ok === true) {
            setUpgradedBanner(true);
            await refreshSession();
            clearCheckoutParam = true;
          } else if (!cancelled && data.pending === true) {
            // Keep session_id for a manual refresh while the signed webhook
            // commits; the browser return can never grant the plan itself.
            await refreshSession();
          } else if (res.status >= 400 && res.status < 500) {
            clearCheckoutParam = true;
          }
        } catch {
          if (!cancelled) await refreshSession();
        }
        if (clearCheckoutParam) {
          const url = new URL(window.location.href);
          url.searchParams.delete("session_id");
          window.history.replaceState({}, "", url.pathname + url.search);
        }
        return;
      }
      if (params.get("upgraded") === "1" && !cancelled) {
        setUpgradedBanner(true);
        await refreshSession();
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  // One-time retry bearers must not remain in browser history/referrers after
  // hydration. The in-memory handoff is consumed by the next Generate submit.
  useEffect(() => {
    if (
      !retryHandoffRef.current &&
      initialRetryJobId &&
      typeof window !== "undefined"
    ) {
      try {
        const token = sessionStorage.getItem(
          `pikbo_retry_token:${initialRetryJobId}`
        );
        if (token) {
          retryHandoffRef.current = {
            retryJobId: initialRetryJobId,
            retryToken: token,
          };
          sessionStorage.removeItem(
            `pikbo_retry_token:${initialRetryJobId}`
          );
        }
      } catch {
        /* Create remains a normal new-attempt surface. */
      }
    }
    if (!initialRetryToken || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("retryToken");
    window.history.replaceState({}, "", url.pathname + url.search);
  }, [initialRetryJobId, initialRetryToken]);

  const adoptImage = useCallback(
    async (dataUrl: string, opts?: { labSample?: boolean }) => {
      if (!opts?.labSample && !privateUploadEnabled) {
        setError(
          "Real product-photo upload is available only to invited private-beta accounts. Choose a Pikbo Lab sample instead."
        );
        return;
      }
      setImage(dataUrl);
      setAssetId(null);
      setImageProbe(null);
      setLabStill(Boolean(opts?.labSample));
      setBriefCollapsed(true);
      setFidelityAngles([]);
      setSecondaryStill(null);
      briefAutoAppliedRef.current = false;
      setError(null);
      setLastUploadIgnored(false);
      setStatus("idle");
      setVideoUrl(null);
      setDemo(false);
      setUsedModel(null);
      setResultDuration(null);
      setResultAspect(null);
      setResultResolution(null);
      setVersions([]);
      setActiveVersionId(null);
      setLastRequestCreditState(null);
      track({
        event: "upload_ready",
        path: "/create",
        recipe: effect,
        meta: { bytes: dataUrl.length, lab: Boolean(opts?.labSample) },
      });
      track({
        event: "asset_upload_complete",
        path: "/create",
        recipe: effect,
        demo: Boolean(opts?.labSample),
        meta: {
          source: opts?.labSample ? "lab_prototype" : "owned_upload",
        },
      });
      // Geometry for Asset Brief (rule-based, not vision).
      void probeImageSize(dataUrl).then((meta) => {
        if (meta) setImageProbe(meta);
      });
      // Register into process-memory asset store so generate can skip large JSON.
      try {
        const { registerLocalAsset } = await import("@/lib/clientAssets");
        const reg = await registerLocalAsset(dataUrl);
        if (reg?.assetId) setAssetId(reg.assetId);
      } catch {
        /* generate still works with inline data URL */
      }
    },
    [effect, privateUploadEnabled]
  );

  // Favorites + toy identity + optional still from Image studio (after adoptImage exists).
  // Query ?sku= wins over device bible so Next SKU / AfterPath carry survives mount.
  useEffect(() => {
    if (!sessionResolved) return;
    const t = window.setTimeout(() => {
      setFavorites(loadFavorites());
      setToyIdentity(hydrateToyIdentityFromQuery(initialSku));
      try {
        const pending = sessionStorage.getItem("pikbo_pending_still");
        if (!privateUploadEnabled && pending) {
          sessionStorage.removeItem("pikbo_pending_still");
        } else if (pending?.startsWith("data:image")) {
          sessionStorage.removeItem("pikbo_pending_still");
          void adoptImage(pending);
        } else if (
          pending?.startsWith("https://") ||
          pending?.startsWith("http://")
        ) {
          sessionStorage.removeItem("pikbo_pending_still");
          sampleToDataUrl(pending)
            .then((data) => void adoptImage(data))
            .catch(() => undefined);
        } else if (pending) {
          // Drop unsafe schemes (javascript:, data: non-image, //protocol-relative).
          sessionStorage.removeItem("pikbo_pending_still");
        }
      } catch {
        // ignore
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [adoptImage, initialSku, privateUploadEnabled, sessionResolved]);

  function loadFile(file: File | undefined | null) {
    if (!privateUploadEnabled) {
      setError(
        "Public preview does not accept or process product photos. Choose a Pikbo Lab sample."
      );
      return;
    }
    if (!file || !file.type.startsWith("image/")) {
      setError("Please drop a PNG or JPG of your toy.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      void adoptImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    loadFile(e.target.files?.[0]);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    loadFile(e.dataTransfer.files?.[0]);
  }

  const creditsLeft = session ? generationDisplayCredits(session) : null;
  const liveEntitled = privateUploadEnabled;
  const canAfford = liveEntitled;
  const isFree = session?.plan === "free" || session?.watermark;
  // Fail closed: anonymous, non-durable, unknown, and zero-credit sessions
  // may only use the cached prototype path.
  const demoMode = !privateUploadEnabled || labStill;
  const trialDone = freeTrialExhausted(session);
  const freeLive = session?.freeTrial?.freeLive;
  const clipsLeft =
    typeof session?.freeTrial?.clipsLeft === "number"
      ? session.freeTrial.clipsLeft
      : creditsLeft !== null
        ? Math.floor(creditsLeft / CREDITS_PER_VIDEO)
        : null;
  // Private validation is one measured Fast 720p / 5s cost envelope. Cached
  // Free remains the labeled Mini 480p prototype contract.
  const effectiveDuration = liveEntitled
    ? freeLive?.durationSec ?? 5
    : isFree
      ? 5
      : duration;
  const effectiveResolution = liveEntitled
    ? freeLive?.resolution ?? "720p"
    : isFree
      ? "480p"
      : resolution;
  const effectiveModel = liveEntitled
    ? freeLive?.modelClass ?? "seedance-fast"
    : modelId;
  const effectiveModelLabel =
    effectiveModel === "seedance-fast" ? "Fast" : "Mini";

  async function generate(opts?: {
    imageOverride?: string;
    effectOverride?: string;
    aspectOverride?: "9:16" | "16:9" | "1:1";
    rightsOverride?: boolean;
    /** PIKBO Lab prototype sample id — stored as Library sourceProject for support */
    labSampleId?: string;
    /**
     * Wave B Retry — immutable GenerationSpec from a prior success.
     * When set, overrides composer fields for this request only.
     */
    retrySpec?: GenerationSpec;
  }) {
    const retry = opts?.retrySpec;
    const requestUsesLabSample = Boolean(opts?.labSampleId || labStill);
    if (!requestUsesLabSample && !privateUploadEnabled) {
      setError(
        "Public preview does not accept or process product photos. Choose a Pikbo Lab sample."
      );
      return;
    }
    // Retry freezes the version still — never the composer's latest re-upload asset.
    const still = resolveGenerateStill({
      retry,
      sourceStore,
      imageOverride: opts?.imageOverride,
      image,
      assetId,
    });
    const img = still.image ?? null;
    const postAssetId = still.assetId ?? undefined;
    const useAsset = still.mode === "asset" || still.mode === "retry-asset";
    const fx = retry?.effect ?? opts?.effectOverride ?? effect;
    const rights = opts?.rightsOverride ?? ownsRights;
    // Retry freezes prior extra; new runs merge optional Toy Identity into extra.
    const requestExtra = retry
      ? retry.extra
      : composeExtraWithIdentity(toyIdentity, extra, {
          angles: fidelityAngles,
          hasSecondaryStill: Boolean(secondaryStill),
        });
    const requestAspect = (retry?.aspectRatio ??
      opts?.aspectOverride ??
      aspectRatio) as "9:16" | "16:9" | "1:1";
    const requestDuration = retry?.duration ?? effectiveDuration;
    const requestModel = retry?.model ?? effectiveModel;
    const requestRes = retry?.resolution ?? effectiveResolution;
    const requestSeed =
      retry && typeof retry.seed === "number"
        ? retry.seed
        : seed.trim() === ""
          ? undefined
          : Number(seed);
    if (!useAsset && (!img || !isValidImageDataUrl(img))) {
      setError(
        "Upload a reference image first (JPEG, PNG, WebP, or GIF · image-to-video)."
      );
      return;
    }
    if (img && img.length > 12_000_000) {
      setError("Image is too large. Use a photo under ~8MB.");
      return;
    }
    if (!rights) {
      setError("Confirm you own this photo before generating.");
      return;
    }
    // Do not hard-block on client credits: demo-cached mode (no FAL_KEY) is free.
    // Live path enforces credits server-side and returns 402 / paywall.

    track({
      event: "generate_start",
      recipe: fx,
      path: "/create",
    });
    setError(null);
    setLastUploadIgnored(false);
    setLastRefunded(false);
    // Clear only the *request* settlement for a new attempt — version chips stay.
    setLastRequestCreditState(null);
    setShowPaywall(false);
    setElapsed(0);
    setRecoveringSavedResult(false);
    setAwaitingPrimaryAfterRecovery(false);
    detachedWaitRef.current = false;
    setStatus("generating");
    // Abort any prior in-flight POST before starting a new one (explicit replace).
    generateAbortRef.current?.abort();
    const abortCtrl = new AbortController();
    generateAbortRef.current = abortCtrl;
    document
      .getElementById("create-result")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    // Prefer assetId when registered (smaller POST); always also send data URL when
    // available so multi-instance (Vercel) asset-memory misses still generate.
    // ASSET_NOT_FOUND auto-recovers via fallbackImage when only assetId was sent.
    const fallbackStill =
      (img && isValidImageDataUrl(img) ? img : null) ||
      (image && isValidImageDataUrl(image) ? image : null) ||
      undefined;
    // Keep dual payload under rough Vercel body comfort (~3.5MB JSON).
    const dualImageOk =
      Boolean(fallbackStill) && (fallbackStill?.length ?? 0) < 3_500_000;
    const retryHandoff = retryHandoffRef.current;
    const result = await postGenerateWithRetry(
      {
        effect: fx,
        image: useAsset
          ? dualImageOk
            ? fallbackStill
            : undefined
          : img ?? undefined,
        assetId: useAsset && postAssetId ? postAssetId : undefined,
        extra: requestExtra,
        duration: requestDuration,
        aspectRatio: requestAspect,
        model: requestModel,
        resolution: requestRes,
        ownsRights: true,
        allowProviderSpend: !demoMode && !requestUsesLabSample,
        retryJobId: retryHandoff?.retryJobId,
        retryToken: retryHandoff?.retryToken,
        seed:
          typeof requestSeed === "number" && Number.isFinite(requestSeed)
            ? requestSeed
            : undefined,
      },
      {
        maxRetries: 1,
        fallbackImage: useAsset ? fallbackStill : undefined,
        signal: abortCtrl.signal,
        onRecoveryState: (state) => {
          if (detachedWaitRef.current || !generateMountedRef.current) return;
          setRecoveringSavedResult(
            state === "checking" || state === "waiting"
          );
          setAwaitingPrimaryAfterRecovery(state === "awaiting_primary");
        },
      }
    );
    // Keep the bearer when the server rejected work before the child claim
    // (upload/rate/reserve preflight), or when transport failed. Clear it after
    // success, an explicit retry rejection, or any provider-stage response.
    const preClaimFailure =
      !result.ok &&
      [
        "INVALID_REQUEST",
        "IMAGE_TOO_LARGE",
        "ASSET_NOT_FOUND",
        "RATE_LIMITED",
        "JOB_IN_FLIGHT",
        "INSUFFICIENT_CREDITS",
        "AUTH_REQUIRED",
        "LIVE_ACCESS_REQUIRED",
        "DURABLE_CREDITS_UNAVAILABLE",
      ].includes(result.code || "");
    if (
      retryHandoffRef.current === retryHandoff &&
      result.status !== 0 &&
      !preClaimFailure
    ) {
      retryHandoffRef.current = null;
    }
    if (generateAbortRef.current === abortCtrl) {
      generateAbortRef.current = null;
    }

    // Detached wait / unmounted Create: never abort, cancel, or setState.
    // On success still persist to device Library (Base64 length-capped).
    if (detachedWaitRef.current || !generateMountedRef.current) {
      if (result.ok) {
        const data = result.data;
        const serverEffect =
          typeof data.effect === "string" && data.effect ? data.effect : fx;
        const usedPreset =
          PRESETS.find((p) => p.slug === serverEffect) ?? preset;
        const stillForStore =
          (img && isValidImageDataUrl(img) ? img : null) ||
          (image && isValidImageDataUrl(image) ? image : null) ||
          "";
        pushHistory(
          historyFieldsFromSuccess(data, {
            effect: serverEffect,
            effectName: usedPreset.name,
            fallbackDuration: requestDuration,
            fallbackAspect: requestAspect,
            fallbackResolution: requestRes,
            sourceProject: opts?.labSampleId
              ? `lab-sample-${opts.labSampleId}`
              : remix.intent?.sourceProjectSlug,
            channel: remix.intent?.channel,
            projectId: localProjectId(
              stillForStore || fx,
              opts?.labSampleId
                ? `lab-sample-${opts.labSampleId}`
                : remix.intent?.sourceProjectSlug
            ),
            projectName: opts?.labSampleId
              ? `PIKBO Lab sample · ${opts.labSampleId}`
              : remix.intent?.sourceProjectSlug
                ? `Remix · ${remix.intent.sourceProjectSlug}`
                : identityProjectName(toyIdentity) || "Owned toy project",
            inputImage:
              stillForStore &&
              (stillForStore.startsWith("/") || stillForStore.length <= 8_000)
                ? stillForStore
                : undefined,
            sku: toyIdentity.sku || undefined,
          })
        );
      }
      detachedWaitRef.current = false;
      return;
    }

    setRecoveringSavedResult(false);
    setAwaitingPrimaryAfterRecovery(false);

    // Dead assetId after process restart/TTL — clear and re-register for next POST.
    if (
      (!result.ok && result.code === "ASSET_NOT_FOUND") ||
      (result.ok && result.recoveredFromAssetMiss)
    ) {
      setAssetId(null);
      const still = fallbackStill;
      if (still && isValidImageDataUrl(still)) {
        try {
          const { registerLocalAsset } = await import("@/lib/clientAssets");
          const reg = await registerLocalAsset(still);
          if (reg?.assetId) setAssetId(reg.assetId);
        } catch {
          /* next generate can still post Base64 */
        }
      }
    }

    if (!result.ok) {
      if (result.session) {
        setSession((prev) => mergeMeSession(prev, result.session));
      }
      if (result.paywall) setShowPaywall(true);
      setLastRefunded(Boolean(result.creditsRefunded));
      setFailRetryAfterSec(
        typeof result.retryAfterSec === "number" && result.retryAfterSec > 0
          ? result.retryAfterSec
          : null
      );
      const failSettlement = requestCreditStateFromFailure({
        creditsRefunded: result.creditsRefunded,
        refundUnconfirmed: result.refundUnconfirmed,
        status: result.status,
        code: result.code,
      });
      setLastRequestCreditState(failSettlement);
      setError(
        result.error ||
          (result.paywall
            ? "This private allowance is used up. Public checkout remains closed."
            : "Something went wrong")
      );
      // Keep prior versions visible after a failed attempt; leave error banner on.
      // Wave B B1: do NOT overwrite lastRequestCreditState with keep.creditState.
      if (versions.length > 0) {
        const keep =
          versions.find((v) => v.id === activeVersionId) ?? versions[0];
        if (keep) {
          setActiveVersionId(keep.id);
          setVideoUrl(keep.videoUrl);
          setDemo(keep.demo);
          setWatermark(keep.watermark);
          setUsedModel(keep.model);
          setResultDuration(keep.duration);
          setResultAspect(keep.aspectRatio);
          setResultResolution(keep.resolution);
          setLastRequestCreditState(
            preserveRequestSettlementOnVersionRestore(
              failSettlement,
              keep.creditState
            )
          );
          setStatus("done");
        } else {
          setStatus("error");
        }
      } else {
        setStatus("error");
      }
      void refreshSession();
      return;
    }

    const data = result.data;
    if (data.session) {
      setSession((prev) => mergeMeSession(prev, data.session));
      // Keep freeTrial + durable wallet honest after live debit (badge/strip).
      void refreshSession();
      emitSessionRefresh();
    }
    // Network-retry recovery: same idempotencyKey, no second debit/fal.
    if (data.idempotentReplay) {
      toast("Recovered prior clip · no second charge");
    }
    const ignoredOwnedUpload = isIgnoredOwnedUploadResult({
      demo: Boolean(data.demo),
      processedUpload: data.processedUpload,
      uploadIgnored: data.uploadIgnored,
      labSample: Boolean(opts?.labSampleId || labStill),
    });
    if (ignoredOwnedUpload) {
      setVideoUrl(null);
      setDemo(false);
      setWatermark(true);
      setUsedModel(null);
      setResultDuration(null);
      setResultAspect(null);
      setResultResolution(null);
      setVersions([]);
      setActiveVersionId(null);
      setLastRequestCreditState("0 cached");
      setLastUploadIgnored(true);
      setError(
        "Your photo was not processed. Live generation is not enabled for this account yet, so Pikbo did not show an unrelated Lab clip as your result. No credits were used."
      );
      setStatus("error");
      track({
        event: "generate_result",
        recipe: fx,
        demo: true,
        path: "/create",
        meta: {
          processedUpload: false,
          uploadIgnored: true,
        },
      });
      toast("Photo not processed · no credits used");
      void refreshSession();
      return;
    }
    const serverDuration =
      typeof data.duration === "number" ? data.duration : requestDuration;
    const serverAspect =
      typeof data.aspectRatio === "string" ? data.aspectRatio : requestAspect;
    const serverRes =
      typeof data.resolution === "string" ? data.resolution : requestRes;
    const serverModel = data.model || requestModel;
    const serverEffect =
      typeof data.effect === "string" && data.effect ? data.effect : fx;
    const usedPreset = PRESETS.find((p) => p.slug === serverEffect) ?? preset;
    const creditState =
      typeof data.creditsOutcome === "string"
        ? data.creditsOutcome
        : requestCreditStateFromSuccess(Boolean(data.demo));
    setVideoUrl(data.videoUrl);
    setDemo(Boolean(data.demo));
    setWatermark(Boolean(data.watermark));
    setUsedModel(serverModel);
    setResultDuration(serverDuration);
    setResultAspect(serverAspect);
    setResultResolution(serverRes);
    const versionId =
      typeof data.requestId === "string" && data.requestId
        ? data.requestId
        : `v-${versions.length + 1}-${serverEffect}-${serverDuration}`;
    // Prefer the still we actually used (retry frozen / override / composer).
    const stillForStore =
      (img && isValidImageDataUrl(img) ? img : null) ||
      (image && isValidImageDataUrl(image) ? image : null) ||
      "";
    const interned = stillForStore
      ? internSourceImage(sourceStore, stillForStore)
      : { key: retry?.sourceKey || "src-missing", store: sourceStore };
    if (interned.store !== sourceStore) {
      setSourceStore(interned.store);
    }
    // Freeze the asset that produced this success (retry must not pick a later re-upload).
    const specAssetId =
      still.mode === "retry-asset"
        ? postAssetId
        : still.mode === "retry-still"
          ? retry?.assetId
          : postAssetId || assetId || undefined;
    const spec = buildGenerationSpec({
      sourceKey: interned.key,
      assetId: specAssetId,
      effect: serverEffect,
      extra: requestExtra,
      aspectRatio: serverAspect,
      duration: serverDuration,
      resolution: serverRes,
      model: serverModel,
      seed:
        typeof requestSeed === "number" && Number.isFinite(requestSeed)
          ? requestSeed
          : undefined,
      requestId:
        typeof data.requestId === "string" ? data.requestId : undefined,
    });
    const version: ResultVersion = {
      id: versionId,
      videoUrl: data.videoUrl,
      demo: Boolean(data.demo),
      watermark: Boolean(data.watermark),
      model: serverModel,
      duration: serverDuration,
      aspectRatio: serverAspect,
      resolution: serverRes,
      creditState,
      createdAt: new Date().toISOString(),
      sourceKey: interned.key,
      requestId:
        typeof data.requestId === "string" ? data.requestId : undefined,
      provider: typeof data.provider === "string" ? data.provider : undefined,
      privateResult: data.privateResult === true,
      effect: serverEffect,
      effectName: usedPreset.name,
      spec,
      costCredits:
        typeof data.costCredits === "number" ? data.costCredits : undefined,
      serverEcho:
        typeof data.effect === "string" ||
        typeof data.costCredits === "number" ||
        typeof data.requestId === "string",
    };
    setVersions((current) => [
      version,
      ...current.filter((item) => item.id !== version.id),
    ].slice(0, 8));
    setActiveVersionId(version.id);
    setLastRequestCreditState(creditState);
    setStatus("done");
    rememberEffect(serverEffect);
    pushHistory(
      historyFieldsFromSuccess(data, {
        effect: serverEffect,
        effectName: usedPreset.name,
        fallbackDuration: requestDuration,
        fallbackAspect: requestAspect,
        fallbackResolution: requestRes,
        sourceProject: opts?.labSampleId
          ? `lab-sample-${opts.labSampleId}`
          : remix.intent?.sourceProjectSlug,
        channel: remix.intent?.channel,
        projectId: localProjectId(
          stillForStore || fx,
          opts?.labSampleId
            ? `lab-sample-${opts.labSampleId}`
            : remix.intent?.sourceProjectSlug
        ),
        projectName: opts?.labSampleId
          ? `PIKBO Lab sample · ${opts.labSampleId}`
          : remix.intent?.sourceProjectSlug
            ? `Remix · ${remix.intent.sourceProjectSlug}`
            : identityProjectName(toyIdentity) || "Owned toy project",
        // Phase A4/G: do not ship multi-MB Base64 into device Library.
        // Keep path samples (/demos/…) or tiny stills only; session sourceStore
        // holds the full still for Retry/Variant in this tab.
        inputImage:
          stillForStore &&
          (stillForStore.startsWith("/") || stillForStore.length <= 8_000)
            ? stillForStore
            : undefined,
        sku: toyIdentity.sku || undefined,
      })
    );
    emitSessionRefresh();
    track({
      event: "generate_result",
      recipe: serverEffect,
      demo: Boolean(data.demo),
      path: "/create",
      meta: {
        costCredits:
          typeof data.costCredits === "number" ? data.costCredits : null,
      },
    });
    toast(
      data.demo
        ? `${PROVENANCE.cachedDemo} ready`
        : result.recoveredFromAssetMiss
          ? `${PROVENANCE.liveGeneration} ready · photo re-synced after asset miss`
          : `${PROVENANCE.liveGeneration} ready · saved to this browser`
    );
  }

  /** Wave B Retry — exact GenerationSpec from the active success; appends a new version. */
  function retryActiveVersion() {
    const v =
      versions.find((item) => item.id === activeVersionId) ?? versions[0];
    if (!v?.spec) {
      void generate();
      return;
    }
    void generate({ retrySpec: v.spec, rightsOverride: true });
  }

  /** Wave B Make variant — current Composer settings, not the frozen spec. */
  function makeVariant() {
    void generate();
  }

  async function copyLink() {
    if (!videoUrl) return;
    // Free Mini raw provider URL is not a deliverable (T6) — do not leak via clipboard.
    if (!downloadAllowed) {
      toast(freeLiveDownloadBlockReason());
      return;
    }
    // /api/downloads is session-cookie gated — not a portable public link.
    const share = publicShareableVideoUrl(
      videoUrl,
      typeof window !== "undefined" ? window.location.origin : undefined
    );
    if (!share) {
      toast(
        isSessionGatedDownloadUrl(videoUrl)
          ? "Session download only — use Download (not a public link)"
          : "Unsafe deliverable URL — not copied"
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(share);
      setCopied(true);
      markActivationShared();
      toast("Link copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not copy link");
    }
  }

  function selectVersion(version: ResultVersion) {
    setActiveVersionId(version.id);
    setVideoUrl(version.videoUrl);
    setDemo(version.demo);
    setWatermark(version.watermark);
    setUsedModel(version.model);
    setResultDuration(version.duration);
    setResultAspect(version.aspectRatio);
    setResultResolution(version.resolution);
    // Wave B B1: switching Vn must not clear/overwrite last request settlement.
    setLastRequestCreditState((prev) =>
      requestSettlementAfterSelectVersion(prev)
    );
    // Do not overwrite the compose upload — Before/After uses sourceStore key.
    setStatus("done");
    // Keep refund banners visible; only clear soft non-settlement errors.
    if (
      lastRequestCreditState !== "refund unconfirmed" &&
      lastRequestCreditState !== "10 restored" &&
      !lastRefunded
    ) {
      setError(null);
    }
  }

  const activeVersion =
    versions.find((v) => v.id === activeVersionId) ?? versions[0] ?? null;
  const showingCompletedResult = Boolean(
    activeVersion &&
      videoUrl &&
      (status === "done" || status === "error")
  );
  const bannerIsDemo = showingCompletedResult
    ? Boolean(activeVersion?.demo)
    : demoMode;
  const activeResultModelLabel = seedanceModelLabel(
    activeVersion?.model ?? usedModel
  );
  /** Still tied to the active result version (honest A/B when switching Vn). */
  const compareStill =
    (activeVersion
      ? sourceStore[activeVersion.sourceKey] ||
        resolveSpecImage(activeVersion.spec, sourceStore)
      : null) || image;
  const downloadAllowed = canDownloadResult({
    demo: Boolean(activeVersion?.demo ?? demo),
    watermark: Boolean(activeVersion?.watermark ?? watermark),
  });
  const playableVideo = isPlayableResultVideoUrl({
    videoUrl,
    demo: Boolean(activeVersion?.demo ?? demo),
    watermark: Boolean(activeVersion?.watermark ?? watermark),
  });

  /**
   * Phase D: HEAD /api/downloads first when we have a job/request id so
   * canceled/timeout/in-flight never open a dead tab (Library parity).
   * Allowed GET always uses downloadVideoFile (blob) — never window.open
   * the gate URL (403/409 JSON tabs).
   */
  async function downloadActiveResult() {
    if (!downloadAllowed) {
      toast(freeLiveDownloadBlockReason());
      return;
    }
    const requestId = activeVersion?.requestId;
    const filename = `pikbo-${(activeVersion?.effect || effect || "clip").slice(0, 32)}.mp4`;
    if (requestId) {
      const gateUrl = `/api/downloads/${encodeURIComponent(requestId)}`;
      try {
        const head = await fetch(gateUrl, {
          method: "HEAD",
          headers: await privateDownloadHeaders(),
        });
        const decision = classifyDownloadHead({
          status: head.status,
          code: head.headers.get("X-Pikbo-Download-Code") || "",
          t6Mode: head.headers.get("X-Pikbo-T6"),
        });
        if (decision.kind === "block") {
          toast(decision.message);
          return;
        }
        if (decision.kind === "allow") {
          markActivationShared();
          track({
            event: "export_click",
            path: "/create",
            recipe: activeVersion?.effect || effect,
            demo: Boolean(demo),
            meta: { via: "downloads_api_blob", head: "allowed" },
          });
          const result = await downloadVideoFile(gateUrl, filename);
          if (result === "ok") toast("Download started");
          else if (result === "fallback") toast("Opened video — save from browser");
          else if (result === "blocked" || result === "unsafe") {
            toast("Download blocked — T6 / cancel / timeout / unsafe");
          } else toast("Download failed");
          return;
        }
        if (decision.kind === "not_found" && decision.message) {
          toast(decision.message);
          // Fall through only when a safe demo/paid URL exists.
        }
      } catch {
        /* network — try direct below when safe */
      }
    }
    if (videoUrl && isSafeDeliverableUrl(videoUrl)) {
      markActivationShared();
      track({
        event: "export_click",
        path: "/create",
        recipe: activeVersion?.effect || effect,
        demo: Boolean(demo),
        meta: {
          via: requestId ? "direct_after_gate" : "direct",
        },
      });
      const result = await downloadVideoFile(videoUrl, filename);
      if (result === "ok") toast("Download started");
      else if (result === "fallback") toast("Opened video — save from browser");
      else if (result === "unsafe") toast("Unsafe deliverable URL — download blocked");
      else if (result === "blocked") toast("Download blocked — no file");
      else toast("Download failed");
      return;
    }
    toast("No safe download URL for this result");
  }

  function shareX() {
    if (!videoUrl) return;
    // Free raw share would bypass T6 download gate — keep honesty.
    if (!downloadAllowed) {
      toast(freeLiveDownloadBlockReason());
      return;
    }
    // Never tweet a session-gated /api/downloads path (cookie-bound · not public).
    const share = publicShareableVideoUrl(
      videoUrl,
      typeof window !== "undefined" ? window.location.origin : undefined
    );
    if (!share) {
      toast(
        isSessionGatedDownloadUrl(videoUrl)
          ? "Session download only — use Download (not a public X link)"
          : "Unsafe deliverable URL — not shared"
      );
      return;
    }
    markActivationShared();
    const text = encodeURIComponent(
      `Made with ${site.name} — ${preset.name} 🧸`
    );
    const url = encodeURIComponent(share);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  const busy = status === "generating" || status === "uploading";
  const canGenerate =
    !busy && mode === "i2v" && Boolean(image) && ownsRights;
  const primaryLabel = busy
    ? t("create.generating")
    : !image
      ? t("create.addPhotoFirst")
      : !ownsRights
        ? t("create.confirmOwnership")
        : demoMode
          ? t("create.genCached")
          : !canAfford || trialDone
            ? t("create.needsCredits", { n: CREDITS_PER_VIDEO })
            : isFree
              ? t("create.genMini", { n: CREDITS_PER_VIDEO })
              : t("create.genPaid", { n: CREDITS_PER_VIDEO });

  // Path clarity for mobile: 1 photo → 2 recipe → 3 run → 4 result
  const pathStep: 1 | 2 | 3 | 4 =
    status === "done" && videoUrl
      ? 4
      : status === "generating"
        ? 3
        : image
          ? 2
          : 1;

  // Cmd/Ctrl + Enter to generate
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (canGenerate) void generate();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canGenerate,
    image,
    effect,
    effectiveDuration,
    aspectRatio,
    modelId,
    extra,
    mode,
    session,
    seed,
    resolution,
    ownsRights,
  ]);

  const [showAllRecipes, setShowAllRecipes] = useState(false);
  const [jobIntentId, setJobIntentId] = useState<JobIntentId | null>(null);
  const activeSellingTask =
    jobIntentId ??
    JOB_INTENTS.find((job) => !job.href && job.effect === effect)?.id ??
    null;
  const featuredPresets = useMemo(() => {
    // Phase F: eight launch recipes first (HOME_PROOF + seller staples).
    const heroes = [
      "360-spin-showcase",
      "blind-box-unboxing",
      "paparazzi-flash",
      "make-figure-dance",
      "floating-hero",
      "display-case-glam",
      "miniature-scene",
      "mystery-box-reveal",
    ];
    const ordered = heroes
      .map((slug) => PRESETS.find((p) => p.slug === slug))
      .filter(Boolean) as typeof PRESETS;
    const rest = filteredPresets.filter(
      (p) => !heroes.includes(p.slug)
    );
    if (presetFilter.trim()) return filteredPresets;
    if (showAllRecipes) return [...ordered, ...rest];
    return ordered;
  }, [filteredPresets, presetFilter, showAllRecipes]);

  function applyJobIntent(id: JobIntentId) {
    const job = getJobIntent(id);
    if (!job) return;
    if (job.href) {
      track({
        event: "recipe_selected",
        path: "/create",
        recipe: "seller-starter-pack",
        demo: demoMode,
        meta: { job: id, outputs: 3, credits: demoMode ? 0 : 30 },
      });
      return;
    }
    setJobIntentId(id);
    selectEffect(job.effect);
    setAspectRatio(job.aspectRatio);
    markActivationJob();
    track({ event: "recipe_use", path: "/create", recipe: job.effect, meta: { job: id } });
    toast(`${job.label} · recipe ready`);
  }

  /**
   * Same photo · next job (Step 4 accelerate).
   * Prefills recipe/aspect and runs generate without a full page remount.
   */
  async function generateForJob(id: JobIntentId) {
    const job = getJobIntent(id);
    if (!job) return;
    if (job.href) {
      window.location.href = job.href;
      return;
    }
    if (!image) {
      toast("Add your toy photo first");
      return;
    }
    setJobIntentId(id);
    selectEffect(job.effect);
    setAspectRatio(job.aspectRatio);
    markActivationJob();
    track({
      event: "recipe_use",
      path: "/create",
      recipe: job.effect,
      meta: { job: id, samePhoto: true },
    });
    toast(`${job.label} · generating…`);
    await generate({
      effectOverride: job.effect,
      aspectOverride: job.aspectRatio,
    });
  }

  function updateToyIdentity(patch: Partial<ToyIdentity>) {
    setToyIdentity((prev) => {
      const next = { ...prev, ...patch };
      return saveToyIdentity(next);
    });
  }

  const assetBrief = useMemo(
    () =>
      buildAssetBrief({
        hasImage: Boolean(image),
        probe: imageProbe,
        effect,
        jobId: jobIntentId,
        identity: toyIdentity,
        labSample: labStill,
        locale: locale === "zh" ? "zh" : "en",
        fidelityAngles,
        hasSecondaryStill: Boolean(secondaryStill),
      }),
    [
      image,
      imageProbe,
      effect,
      jobIntentId,
      toyIdentity,
      labStill,
      locale,
      fidelityAngles,
      secondaryStill,
    ]
  );

  // Phase B2: soft-apply shape-primary recipe once (skip deep-link / job / Lab sample).
  // Defer setState out of the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!image || !imageProbe || !assetBrief.primaryRecipe) return;
    if (briefAutoAppliedRef.current) return;
    if (labStill) return;
    if (initialEffect || initialJob) return;
    if (jobIntentId) return;
    const primary = assetBrief.primaryRecipe;
    if (effect === primary.slug) {
      briefAutoAppliedRef.current = true;
      return;
    }
    briefAutoAppliedRef.current = true;
    const shape = assetBrief.shape;
    const slug = primary.slug;
    const label = primary.label;
    const timer = window.setTimeout(() => {
      selectEffect(slug);
      track({
        event: "recipe_use",
        path: "/create",
        recipe: slug,
        meta: { source: "asset_brief_auto", shape },
      });
      toast(`Director · ${label} for ${shape} photo · change anytime`);
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot soft apply on probe
  }, [
    image,
    imageProbe,
    assetBrief.primaryRecipe?.slug,
    labStill,
    initialEffect,
    initialJob,
    jobIntentId,
  ]);

  const directorPlan = useMemo(() => {
    const job = jobIntentId ? getJobIntent(jobIntentId) : undefined;
    return buildDirectorPlan({
      hasImage: Boolean(image),
      effect,
      effectName: preset.name,
      aspectRatio,
      durationSec: effectiveDuration,
      resolution: effectiveResolution,
      modelClass: effectiveModel,
      demoMode,
      isFree: Boolean(isFree),
      trialDone,
      creditsLeft,
      clipsLeft,
      identity: toyIdentity,
      ownsRights,
      labSample: labStill,
      jobLabel: job?.label ?? null,
    });
  }, [
    image,
    effect,
    preset.name,
    aspectRatio,
    effectiveDuration,
    effectiveResolution,
    effectiveModel,
    isFree,
    demoMode,
    trialDone,
    creditsLeft,
    clipsLeft,
    toyIdentity,
    ownsRights,
    labStill,
    jobIntentId,
  ]);

  useEffect(() => {
    if (!image) return;
    const credits = demoMode ? 0 : CREDITS_PER_VIDEO;
    const signature = `${effect}:${credits}:${effectiveDuration}:${aspectRatio}`;
    if (quoteEventRef.current === signature) return;
    quoteEventRef.current = signature;
    track({
      event: "generation_quote_view",
      path: "/create",
      recipe: effect,
      demo: demoMode,
      meta: {
        outputs: 1,
        credits,
        duration_seconds: effectiveDuration,
        aspect_ratio: aspectRatio,
      },
    });
  }, [image, effect, demoMode, effectiveDuration, aspectRatio]);

  return (
    <div className="flex h-full min-h-[calc(100vh-3.5rem)] flex-col pb-36 lg:min-h-screen lg:pb-0">
      {/* Suite chrome: desktop only — mobile uses bottom nav + Modules shelf */}
      <div className="hidden lg:block">
        <GenerateSuiteChrome compact />
      </div>
      {/* ── Mode banner: demo vs live (W5) · tighter on phone ── */}
      <div
        role="status"
        className={`border-b px-4 py-1.5 sm:py-2.5 ${
          bannerIsDemo
            ? "border-white/10 bg-white/[0.04]"
            : "border-[var(--mint)]/25 bg-[var(--mint)]/[0.08]"
        }`}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                bannerIsDemo
                  ? "bg-white/10 text-white/80"
                  : "bg-[var(--mint)] text-black"
              }`}
            >
              {showingCompletedResult
                ? activeVersion?.demo
                  ? PROVENANCE.cachedDemo
                  : activeVersion?.privateResult
                    ? "Private result ready"
                    : "Live result ready"
                : demoMode
                  ? PROVENANCE.cachedDemo
                  : isFree
                    ? "Private Fast validation"
                    : PROVENANCE.liveGeneration}
            </span>
            <p className="text-[11px] leading-snug text-[var(--fg-muted)] sm:text-xs">
              {showingCompletedResult && activeVersion ? (
                activeVersion.demo ? (
                  <>
                    Lab example · <b className="text-[var(--fg)]">not your photo</b>
                    <span className="hidden sm:inline"> · 0 credits</span>
                  </>
                ) : (
                  <>
                    Your result · {activeResultModelLabel}{" "}
                    {activeVersion.duration}s {activeVersion.resolution} ·{" "}
                    {activeVersion.creditState}
                    {activeVersion.privateResult ? (
                      <span className="hidden sm:inline">
                        {" "}
                        · owner-only Library copy saved
                      </span>
                    ) : null}
                  </>
                )
              ) : demoMode ? (
                <>
                  Lab example · <b className="text-[var(--fg)]">not your photo</b>
                  <span className="hidden sm:inline"> · 0 credits</span>
                </>
              ) : trialDone && isFree ? (
                <>
                  Free Mini trial used · cached Lab demos still free ·{" "}
                  <Link href="/pricing" className="font-semibold text-[var(--mint)] hover:underline">
                    compare plans
                  </Link>
                </>
              ) : (
                <>
                  Your photo ·{" "}
                  {isFree && freeLive
                    ? `${effectiveModelLabel} ${freeLive.durationSec}s ${freeLive.resolution}`
                    : isFree
                      ? `${effectiveModelLabel} 5s ${effectiveResolution}`
                      : `${effectiveDuration}s · ${effectiveResolution}`}{" "}
                  · {CREDITS_PER_VIDEO} cr
                  {clipsLeft !== null
                    ? ` · ~${clipsLeft} live left`
                    : creditsLeft !== null
                      ? ` · ${creditsLeft} cr left`
                      : ""}
                  <span className="hidden sm:inline">
                    {" "}
                    ·{" "}
                    <b className="text-[var(--fg)]">
                      refunds when confirmed
                    </b>
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[var(--fg-muted)]">
            {privateUploadEnabled ? (
              <>
                {session ? (
                  <span>
                    <span className="font-semibold text-[var(--mint)]">
                      {creditsLeft ?? 0}
                    </span>{" "}
                    credits · private beta
                  </span>
                ) : null}
                <Link
                  href="/pricing"
                  className="text-[var(--mint)] hover:underline"
                >
                  Access status
                </Link>
              </>
            ) : (
              <span className="font-semibold text-white/65">
                Public Lab · cached 0 credits
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Remix context (from Home / project deep link) ── */}
      {(remix.sourceLabel || remix.notices.length > 0 || remix.intent) && (
        <div className="border-b border-[var(--mint)]/20 bg-[var(--mint)]/[0.06] px-4 py-3">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
            {remix.sourcePoster && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={remix.sourcePoster}
                alt=""
                className="h-14 w-10 shrink-0 rounded-md object-cover ring-1 ring-white/15"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-[var(--mint)]">
                Remix this recipe · replace the toy
              </p>
              <p className="text-sm font-semibold text-[var(--fg)]">
                {remix.sourceLabel || preset.name}
                {remix.intent?.channel ? (
                  <span className="ml-2 text-[11px] font-normal text-[var(--fg-muted)]">
                    · {remix.intent.channel} · {remix.intent.aspectRatio} ·{" "}
                    {remix.intent.durationSeconds}s
                  </span>
                ) : null}
              </p>
              <p className="text-[11px] text-[var(--fg-muted)]">
                {privateUploadEnabled
                  ? "Upload a photo you own to create a separate private result. The example is never presented as your output."
                  : "Public preview keeps this archived Lab example. It does not accept or process your product photo."}
              </p>
              {remix.notices.map((n) => (
                <p key={n} className="text-[11px] text-amber-200/90">
                  {n}
                </p>
              ))}
            </div>
            {initialSource && (
              <Link
                href={`/projects/${encodeURIComponent(initialSource)}`}
                className="text-[11px] font-semibold text-[var(--mint)] hover:underline"
              >
                Inside recipe →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Mobile first-run: goal → upload → recipe → generate (CD Phase A) ── */}
      <div className="border-b border-[var(--border)] px-4 py-2 lg:hidden">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mint)]/85">
          Creative Director · commercial path
        </p>
        <ol
          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide"
          aria-label="Create steps"
        >
          {(
            [
              {
                n: 1 as const,
                label: privateUploadEnabled ? "Photo" : "Lab sample",
              },
              { n: 2 as const, label: "Recipe" },
              {
                n: 3 as const,
                label: privateUploadEnabled ? "Generate" : "Preview",
              },
            ] as const
          ).map((s, i) => (
            <li key={s.n} className="flex flex-1 items-center gap-1">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] ${
                  pathStep >= s.n
                    ? "bg-[var(--mint)] text-black"
                    : "bg-white/10 text-white/40"
                }`}
              >
                {s.n}
              </span>
              <span
                className={
                  pathStep >= s.n ? "text-[var(--fg)]" : "text-[var(--fg-dim)]"
                }
              >
                {s.label}
              </span>
              {i < 2 && (
                <span className="mx-0.5 flex-1 border-t border-white/10" aria-hidden />
              )}
            </li>
          ))}
        </ol>
      </div>

      {/* HF Generate: narrow recipe rail · controls · dominant result stage */}
      <div className="grid flex-1 lg:min-h-0 lg:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.4fr)]">
        {/* Full recipe catalog is retained for future use but hidden from first run. */}
        <aside className="hidden">
          <p className="mb-0.5 px-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#c8ff3d]/90">
            Toy recipes
          </p>
          <p className="mb-2 px-1 text-[9px] leading-snug text-white/35">
            360 · Reveal · Zero-G · Dance · Glow
          </p>
          <input
            value={presetFilter}
            onChange={(e) => setPresetFilter(e.target.value)}
            placeholder="Search spin, reveal, zero-g…"
            className="mb-2 w-full rounded-lg border border-white/10 bg-black/50 px-2.5 py-2 text-xs outline-none focus:border-[var(--mint)]/50 focus:shadow-[0_0_0_3px_rgba(200,255,61,0.12)]"
          />
          {favorites.length > 0 && !presetFilter && (
            <div className="mb-2">
              <p className="mb-1 px-1 text-[9px] font-bold uppercase text-[var(--fg-dim)]">
                ★ Favorites
              </p>
              <div className="flex flex-wrap gap-1">
                {favorites.map((slug) => {
                  const p = PRESETS.find((x) => x.slug === slug);
                  if (!p) return null;
                  return (
                    <button
                      key={`fav-${slug}`}
                      type="button"
                      onClick={() => selectEffect(slug)}
                      className="rounded-md border border-[var(--brand)]/40 px-1.5 py-0.5 text-[10px]"
                    >
                      {p.emoji} {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1">
            {featuredPresets.map((p) => (
              <div
                key={p.slug}
                className={`flex items-stretch gap-1 rounded-xl border transition duration-150 ${
                  effect === p.slug
                    ? "border-[var(--mint)]/60 bg-[var(--mint)]/[0.08] shadow-[0_0_24px_rgba(200,255,61,0.1)]"
                    : "border-transparent bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.05]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => selectEffect(p.slug)}
                  className="flex flex-1 items-center gap-2 p-2.5 text-left text-sm"
                >
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-lg"
                    style={{ background: p.gradient }}
                  >
                    {p.emoji}
                  </span>
                  <span className="leading-tight">
                    <span className="block text-[11px] font-bold tracking-wide">
                      {viralName(p.slug, p.name)}
                    </span>
                    <span className="block text-[10px] text-[var(--fg-dim)]">
                      {p.duration}s · {p.aspectRatio}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  title="Favorite"
                  className="px-2 text-xs text-[var(--fg-dim)] hover:text-[var(--brand)]"
                  onClick={() => setFavorites(toggleFavorite(p.slug))}
                >
                  {favorites.includes(p.slug) ? "★" : "☆"}
                </button>
              </div>
            ))}
            {featuredPresets.length === 0 && (
              <p className="px-1 text-xs text-[var(--fg-dim)]">No presets match</p>
            )}
            {!presetFilter.trim() && (
              <button
                type="button"
                onClick={() => setShowAllRecipes((v) => !v)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] px-2 py-1.5 text-[11px] font-semibold text-[var(--fg-muted)] hover:border-[var(--mint)]/40 hover:text-[var(--mint)]"
              >
                {showAllRecipes
                  ? t("create.launchOnly")
                  : t("create.moreRecipes")}
              </button>
            )}
          </div>
          <Link
            href="/create?mode=seller-pack"
            className="mt-3 block rounded-xl border border-[var(--mint)]/30 bg-[var(--mint)]/[0.06] px-3 py-2.5 text-[11px] leading-snug text-[var(--fg-muted)] transition hover:border-[var(--mint)]/50"
          >
            <span className="font-bold text-[var(--mint)]">
              {demoMode
                ? "Seller Starter Pack — 3 cached prototype previews"
                : "Seller Starter Pack — 3 live clips / 30 credits"}
            </span>
            <span className="mt-0.5 block text-[10px] text-[var(--fg-dim)]">
              {demoMode
                ? "0 credits · your upload is not processed"
                : "Eligible live account · review the quote before submission"}
            </span>
          </Link>
        </aside>

        {/* ── Controls: upload → recipe → preflight ── */}
        <section className="space-y-4 overflow-y-auto border-b border-white/[0.07] bg-[#08080a] p-4 lg:max-h-[calc(100vh-8rem)] lg:border-b-0 lg:border-r">
          {upgradedBanner && (
            <div className="rounded-xl border border-[var(--mint)]/40 bg-[color-mix(in_srgb,var(--mint)_10%,transparent)] px-3 py-2 text-xs">
              Private allowance active — 720p path, no on-player watermark.
            </div>
          )}

          {showUnknownNotice && (
            <div className="flex items-start justify-between gap-2 rounded-xl border border-amber-400/40 bg-amber-400/[0.08] px-3 py-2 text-xs text-amber-200">
              <span>
                The recipe <b>“{initialEffect}”</b> isn’t available — showing{" "}
                <b>{preset.name}</b> instead. Pick any recipe below.
              </span>
              <button
                type="button"
                onClick={() => setShowUnknownNotice(false)}
                className="shrink-0 text-amber-200/70 hover:text-amber-100"
                aria-label="Dismiss notice"
              >
                ✕
              </button>
            </div>
          )}

          {/* Step 1 — public Lab-only preview or invited private upload */}
          {privateUploadEnabled ? (
            <div id="create-photo-step" data-first-run-step="upload">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label
                  htmlFor="create-photo-input"
                  className="text-xs font-bold uppercase tracking-wide text-[var(--fg-muted)]"
                >
                  <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--mint)] text-[9px] text-black lg:hidden">
                    1
                  </span>
                  <span className="lg:hidden">Upload owned toy photo</span>
                  <span className="hidden lg:inline">{t("create.yourPhoto")}</span>
                </label>
                {image && (
                  <button
                    type="button"
                    className="text-[10px] font-semibold text-[var(--fg-dim)] hover:text-[var(--brand)]"
                    onClick={() => {
                      setImage(null);
                      setAssetId(null);
                      setImageProbe(null);
                      setLabStill(false);
                      setFidelityAngles([]);
                      setSecondaryStill(null);
                    }}
                  >
                    {t("create.replace")}
                  </button>
                )}
              </div>
              <label
                className={`group/drop relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-black/40 transition-all duration-200 hover:border-[var(--mint)]/55 hover:bg-black/55 ${
                  image
                    ? "aspect-[16/10] border-[var(--mint)]/25 ring-1 ring-[var(--mint)]/15"
                    : "min-h-[160px] border-[var(--mint)]/40 shadow-[0_0_40px_rgba(200,255,61,0.06)] sm:aspect-video"
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
              >
                {image ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt="your toy"
                      className="h-full w-full object-contain"
                    />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2.5 text-center text-[10px] font-semibold text-white/70 opacity-0 transition group-hover/drop:opacity-100">
                      {t("create.replaceStill")}
                    </span>
                  </>
                ) : (
                  <span className="px-6 text-center text-sm text-[var(--fg-dim)]">
                    <span className="mb-2 mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-[var(--mint)]/30 bg-[var(--mint)]/[0.08] text-2xl" aria-hidden>
                      🧸
                    </span>
                    <span className="block font-semibold text-white/80">
                      {t("create.dropPhoto")}
                    </span>
                    <span className="mt-1 block text-xs text-white/45">
                      {t("create.dropHint")}
                    </span>
                  </span>
                )}
                <input
                  id="create-photo-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFile}
                />
              </label>
            </div>
          ) : (
            <div
              id="create-photo-step"
              data-public-single-preview="lab-only"
              className="rounded-2xl border border-[var(--mint)]/25 bg-[var(--mint)]/[0.06] p-4"
            >
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--mint)]">
                {sessionResolved
                  ? "Public Lab preview · no upload"
                  : "Checking private-beta access…"}
              </p>
              <p className="mt-2 text-sm font-bold text-white">
                {sessionResolved
                  ? "Choose a Pikbo Lab sample below."
                  : "Real product-photo controls stay hidden until access is verified."}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--fg-muted)]">
                Public preview does not accept, register, or process your
                product photo. Invited signed-in accounts see a separate
                owner-only upload control here.
              </p>
            </div>
          )}

          {/* Step 2 — choose a sales outcome; model and full catalog stay Advanced. */}
          <JobIntentBar activeId={activeSellingTask} onPick={applyJobIntent} />

          {/* Collapsed Lab path — after recipe so first-run stays upload→recipe→generate */}
          {!image && (
            <div
              className="rounded-2xl border border-[var(--mint)]/25 bg-[var(--mint)]/[0.06] p-3"
              data-first-run-lab="samples"
            >
              <p className="text-sm font-bold text-[var(--fg)]">
                {t("create.noPhotoSample")}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
                PIKBO Lab reference stills (not a customer upload). Cached
                prototypes cost 0 credits and never process your photo. One
                tap loads the recipe and opens the preview path.
              </p>
              <p className="mt-1 text-[10px] font-semibold text-[var(--mint)]">
                Preview a Lab sample · cached prototype, not your upload.
              </p>
              <button
                type="button"
                disabled={sampleLoading || busy}
                onClick={() => void loadSampleToy("scout", true)}
                className="btn btn-primary mt-3 w-full py-3 text-sm disabled:opacity-50"
              >
                {sampleLoading || busy
                  ? t("create.generating")
                  : demoMode
                    ? t("create.oneTapCached")
                    : t("create.oneTapMini")}
              </button>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SAMPLE_TOYS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={sampleLoading || busy}
                    className="group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)] text-left transition hover:border-[var(--mint)] disabled:opacity-50"
                    onClick={() => void loadSampleToy(s.id, true)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.path}
                      alt={s.label}
                      className="aspect-square w-full object-cover transition group-hover:scale-[1.03]"
                    />
                    <span className="block px-2 py-1.5 text-[11px] font-bold">
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
              {sampleLoading && (
                <p className="mt-2 text-[11px] text-[var(--mint)]">
                  Loading sample…
                </p>
              )}
            </div>
          )}

          {/* Active recipe summary + aspect (essential only) */}
          <div className="rounded-xl border border-[var(--mint)]/20 bg-gradient-to-br from-[var(--mint)]/[0.07] to-black/40 p-3 shadow-[inset_0_1px_0_rgba(200,255,61,0.08)]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--mint)]/80">
                  {t("create.selectedRecipe")}
                </p>
                <p className="mt-0.5 text-sm font-bold text-white">
                  {preset.emoji} {viralName(preset.slug, preset.name)}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-white/45">
                  {preset.tagline}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-[var(--mint)]/25 bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-[var(--mint)]">
                {effectiveDuration}s · {effectiveResolution}
              </span>
            </div>
          </div>

          {/* Advanced — models, duration, seed, prompt (collapsed by default) */}
          <div className="rounded-xl border border-white/10 bg-black/25">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              aria-expanded={showAdvanced}
              aria-controls="create-advanced-options"
              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-semibold text-white/65 transition hover:text-white"
            >
              {t("create.advanced")}
              <span className="text-[10px] text-white/40">
                {showAdvanced
                  ? t("create.advancedHide")
                  : t("create.advancedHint")}
              </span>
            </button>
            {showAdvanced && (
              <div
                id="create-advanced-options"
                className="space-y-3 border-t border-[var(--border)] p-3"
              >
                <div>
                  <p className="text-[10px] font-semibold text-[var(--fg-dim)]">
                    Format / channel
                  </p>
                  <div className="mt-1.5 flex gap-2">
                    {(
                      [
                        { id: "9:16" as const, label: "9:16", hint: "TikTok" },
                        { id: "1:1" as const, label: "1:1", hint: "Listing" },
                        { id: "16:9" as const, label: "16:9", hint: "Wide" },
                      ] as const
                    ).map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setAspectRatio(a.id)}
                        className={`flex-1 rounded-lg border py-2 text-[11px] font-semibold transition ${
                          aspectRatio === a.id
                            ? "border-[var(--mint)] bg-[var(--mint)]/15 text-[var(--mint)]"
                            : "border-white/10 text-white/55 hover:border-white/25"
                        }`}
                      >
                        <span className="block">{a.label}</span>
                        <span className="mt-0.5 block text-[9px] font-medium opacity-70">
                          {a.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-[var(--fg-dim)]">
                    Full recipe catalog
                  </p>
                  <input
                    value={presetFilter}
                    onChange={(e) => setPresetFilter(e.target.value)}
                    placeholder="Search spin, unbox, dance…"
                    className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 text-xs outline-none focus:border-[var(--brand)]"
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(showAllRecipes
                      ? featuredPresets
                      : featuredPresets.slice(0, 8)
                    ).map((p) => (
                      <button
                        key={p.slug}
                        type="button"
                        onClick={() => selectEffect(p.slug)}
                        className={`min-w-0 rounded-xl border px-2.5 py-2 text-left transition ${
                          effect === p.slug
                            ? "border-[var(--mint)] bg-[var(--mint)]/12 text-[var(--mint)]"
                            : "border-white/10 bg-black/35 text-white/70 hover:border-white/25"
                        }`}
                      >
                        <span className="block text-[11px] font-bold leading-tight">
                          {p.emoji} {viralName(p.slug, p.name)}
                        </span>
                        <span className="mt-0.5 block text-[9px] opacity-65">
                          {p.aspectRatio} · {p.duration}s
                        </span>
                      </button>
                    ))}
                  </div>
                  {!presetFilter.trim() ? (
                    <button
                      type="button"
                      onClick={() => setShowAllRecipes((v) => !v)}
                      className="mt-2 w-full rounded-lg border border-[var(--border)] px-2 py-1.5 text-[11px] font-semibold text-[var(--fg-muted)] hover:border-[var(--mint)]/40 hover:text-[var(--mint)]"
                    >
                      {showAllRecipes
                        ? t("create.launchOnly")
                        : t("create.moreRecipes")}
                    </button>
                  ) : null}
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-[var(--fg-dim)]">
                    Duration
                  </p>
                  <div className="mt-1.5 flex gap-2">
                    {([5, 10] as const).map((d) => {
                      const freeLock = Boolean(isFree && d === 10);
                      return (
                        <button
                          key={d}
                          type="button"
                          disabled={freeLock}
                          onClick={() => {
                            if (freeLock) {
                              setShowPaywall(true);
                              return;
                            }
                            setDuration(d);
                          }}
                          className={`flex-1 rounded-lg border py-2 text-sm font-semibold ${
                            effectiveDuration === d
                              ? "border-[var(--brand)] bg-[var(--grad-soft)]"
                              : "border-[var(--border)] text-[var(--fg-muted)]"
                          } ${freeLock ? "cursor-not-allowed opacity-50" : ""}`}
                        >
                          {d}s{freeLock ? " · unavailable" : ""}
                        </button>
                      );
                    })}
                  </div>
                  {isFree && (
                    <p className="mt-1 text-[10px] text-[var(--fg-dim)]">
                      {liveEntitled
                        ? "Invited validation is fixed to Fast · 5s · 720p · private delivery"
                        : "Free cached prototype · Mini · 5s · 480p · on-player mark"}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-[var(--fg-dim)]">
                    Resolution
                  </p>
                  <div className="mt-1.5 flex gap-2">
                    {(["480p", "720p"] as const).map((r) => {
                      const locked = liveEntitled
                        ? r !== effectiveResolution
                        : Boolean(isFree && r === "720p");
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            if (locked) {
                              if (liveEntitled) {
                                setError(
                                  "Invited validation is fixed to Fast 720p."
                                );
                              } else {
                                setShowPaywall(true);
                                setError(
                                  "720p is unavailable in the public Lab preview."
                                );
                              }
                              return;
                            }
                            setResolution(r);
                          }}
                          className={`flex-1 rounded-lg border py-2 text-sm font-semibold ${
                            effectiveResolution === r
                              ? "border-[var(--brand)] bg-[var(--grad-soft)]"
                              : "border-[var(--border)] text-[var(--fg-muted)]"
                          } ${locked ? "opacity-60" : ""}`}
                        >
                          {r}
                          {locked ? " · private" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-[var(--fg-dim)]">
                    Model
                  </p>
                  {fixedMomentContract ? (
                    <div className="mt-1.5 rounded-xl border border-[var(--mint)]/40 bg-[var(--mint)]/10 px-3 py-2 text-xs font-semibold text-[var(--mint)]">
                      Seedance Fast · fixed private validation contract
                    </div>
                  ) : (
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {MODELS.map((m) => {
                      const lockedForValidation =
                        liveEntitled && m.id !== effectiveModel;
                      const lockedPaid = Boolean(
                        !liveEntitled && isFree && !m.free
                      );
                      const active = effectiveModel === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            if (lockedForValidation) {
                              setError(
                                "Invited validation is fixed to Seedance Fast."
                              );
                              return;
                            }
                            if (lockedPaid) {
                              setShowPaywall(true);
                              setError(
                                "Private models are unavailable in the public Lab preview."
                              );
                              setModelId("seedance-mini");
                              return;
                            }
                            setModelId(m.id);
                          }}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                            active
                              ? "border-[var(--mint)] bg-[var(--mint)]/15 text-[var(--mint)]"
                              : "border-[var(--border)] text-[var(--fg-muted)]"
                          } ${lockedPaid || lockedForValidation ? "opacity-60" : ""}`}
                        >
                          {m.label}
                          {lockedForValidation
                            ? " · fixed off"
                            : lockedPaid
                              ? " · private"
                              : liveEntitled && active
                                ? " · fixed"
                                : m.free
                                  ? " · free"
                                  : ""}
                        </button>
                      );
                      })}
                    </div>
                  )}
                  <p className="mt-1 text-[10px] text-[var(--fg-dim)]">
                    {fixedMomentContract
                      ? "One owned toy photo · FAL Seedance Fast · 9:16 · 5s · 720p."
                      : liveEntitled
                      ? "Private validation enforces one measured Fast 720p contract."
                      : "Cached Free uses Mini 480p. No fake multi-model shelf."}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[10px] font-semibold text-[var(--fg-dim)]">
                      Seed (optional)
                    </label>
                    <button
                      type="button"
                      className="text-[10px] text-[var(--fg-dim)] hover:text-[var(--fg)]"
                      onClick={() =>
                        setSeed(
                          String(Math.floor(Math.random() * 1_000_000_000))
                        )
                      }
                    >
                      Random
                    </button>
                  </div>
                  <input
                    value={seed}
                    onChange={(e) =>
                      setSeed(e.target.value.replace(/[^\d]/g, ""))
                    }
                    placeholder="Empty = random"
                    className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-[var(--fg-dim)]">
                      Motion prompt
                    </label>
                    <button
                      type="button"
                      className="text-[10px] text-[var(--brand)] hover:underline"
                      onClick={() => setExtra(preset.promptTemplate)}
                    >
                      Reset to preset
                    </button>
                  </div>
                  <textarea
                    value={extra || preset.promptTemplate}
                    onChange={(e) => setExtra(e.target.value)}
                    rows={4}
                    className="mt-1.5 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      "slow turntable",
                      "soft studio light",
                      "keep paint sharp",
                      "subtle float",
                      "no morph face",
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--fg-dim)] hover:border-[var(--brand)] hover:text-[var(--fg)]"
                        onClick={() => {
                          const base = extra || preset.promptTemplate;
                          setExtra(`${base} ${chip}.`);
                        }}
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {image && assetBrief.ready ? (
                  <AssetBriefPanel
                    brief={assetBrief}
                    identity={toyIdentity}
                    onIdentityPatch={updateToyIdentity}
                    onPickRecipe={(slug) => {
                      selectEffect(slug);
                      track({
                        event: "recipe_use",
                        path: "/create",
                        recipe: slug,
                        meta: { source: "asset_brief" },
                      });
                    }}
                    fidelityAngles={fidelityAngles}
                    onToggleAngle={(angle) => {
                      setFidelityAngles((prev) =>
                        prev.includes(angle)
                          ? prev.filter((a) => a !== angle)
                          : [...prev, angle].slice(0, 6)
                      );
                    }}
                    secondaryStill={secondaryStill}
                    onSecondaryStill={
                      privateUploadEnabled ? setSecondaryStill : undefined
                    }
                    collapsed={briefCollapsed}
                    onToggle={() => setBriefCollapsed((v) => !v)}
                  />
                ) : null}

                {image ? <DirectorPlanPanel plan={directorPlan} /> : null}
              </div>
            )}
          </div>

          {/* Step 3 — exact quote, rights confirmation, one Generate action. */}
          <div
            data-first-run-step="quote"
            className="rounded-xl border border-[var(--mint)]/25 bg-[var(--mint)]/[0.06] p-3"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--fg-muted)]">
              <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--mint)] text-[9px] text-black">
                3
              </span>
              {showingCompletedResult
                ? "Next generation quote"
                : "Review and generate"}
            </p>
            {image ? (
              <div className="mt-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {preset.emoji} {viralName(preset.slug, preset.name)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/50">
                    {aspectRatio} · {effectiveDuration}s ·{" "}
                    {effectiveResolution}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-[var(--mint)]/30 bg-black/35 px-2.5 py-1 text-[11px] font-black text-[var(--mint)]">
                  {demoMode ? "0 credits" : `${CREDITS_PER_VIDEO} credits`}
                </span>
              </div>
            ) : (
              <p className="mt-2 text-xs text-[var(--fg-muted)]">
                {privateUploadEnabled
                  ? "Upload one owned front photo to unlock the exact quote."
                  : "Choose one Pikbo Lab sample to preview this recipe at 0 credits."}
              </p>
            )}
            {image && demoMode ? (
              <p className="mt-2 rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 text-[10px] leading-snug text-white/55">
                Cached Pikbo Lab prototype · no visitor product photo is sent
                to a model or used in this preview.
              </p>
            ) : null}
            {trialDone && isFree && !demoMode ? (
              <p className="mt-2 text-[11px] text-[var(--fg-dim)]">
                Cached Lab samples stay free ·{" "}
                <Link
                  href="/pricing"
                  className="font-semibold text-[var(--mint)] hover:underline"
                >
                  finite plans
                </Link>{" "}
                when live billing opens.
              </p>
            ) : null}
          </div>

          {!demoMode ? (
            <label
              id="create-ownership"
              className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-[11px] leading-snug text-[var(--fg-muted)]"
            >
              <input
                type="checkbox"
                checked={ownsRights}
                onChange={(e) => setOwnsRights(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--mint)]"
              />
              <span>
                I own this photo and have the right to animate and publish this
                toy or character. Pikbo grants no third-party IP rights.
              </span>
            </label>
          ) : (
            <div
              id="create-ownership"
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-[11px] leading-snug text-[var(--fg-muted)]"
            >
              Pikbo Lab sample · cached prototype · not a customer upload.
            </div>
          )}

          {status === "generating" ? (
            <button
              type="button"
              onClick={cancelInFlightGenerate}
              className="btn btn-ghost hidden w-full border border-white/20 lg:flex"
              title="Aborts this browser request. Live debit may still settle server-side."
            >
              Cancel request · {elapsed}s
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void generate()}
              disabled={!canGenerate}
              className="btn btn-primary hidden w-full py-3.5 text-[15px] font-black tracking-tight disabled:opacity-50 lg:flex"
            >
              {primaryLabel}
            </button>
          )}

          {(error ||
            lastRefunded ||
            lastRequestCreditState === "refund unconfirmed" ||
            lastRequestCreditState === "10 restored") && (
            <GenerateFailPanel
              message={error}
              creditState={lastRequestCreditState}
              creditsRestored={lastRefunded}
              retryAfterSec={failRetryAfterSec}
              onRetry={
                !lastUploadIgnored && image && !busy
                  ? () => {
                      setFailRetryAfterSec(null);
                      if (activeVersion) retryActiveVersion();
                      else void generate();
                    }
                  : undefined
              }
              retryLabel={
                activeVersion
                  ? t("fail.retryVersion")
                  : t("fail.retryGenerate")
              }
              showLabSample={lastUploadIgnored || !image}
              showModules={!lastUploadIgnored}
            />
          )}

          {showPaywall && (
            <PaywallCard title="Private beta access is not available here" />
          )}
        </section>

        {/* ── Result panel — cinematic stage ── */}
        <section
          id="create-result"
          className={`flex flex-col border-l border-white/[0.06] bg-[#050506] p-4 ${
            status === "done" ||
            status === "generating" ||
            status === "uploading"
              ? "order-first lg:order-none"
              : ""
          }`}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">
              <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--mint)] text-[9px] text-black lg:hidden">
                4
              </span>
              {t("create.result")}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              {(status === "generating" || status === "uploading") && (
                <span className="rounded-full border border-[var(--mint)]/35 bg-[var(--mint)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--mint)]">
                  Live · {elapsed}s
                </span>
              )}
              {status === "done" && videoUrl ? (
                <span className="rounded-full border border-[var(--mint)]/40 bg-[var(--mint)] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black">
                  Ready
                </span>
              ) : null}
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold text-white/50">
                {seedanceModelLabel(
                  usedModel || MODELS.find((m) => m.id === modelId)?.label
                )}
              </span>
            </div>
          </div>
          <div className="media-stage relative flex min-h-[280px] flex-1 items-center justify-center overflow-hidden sm:min-h-[420px]">
            {(status === "generating" || status === "uploading") && (
              <GenerateWaitStage
                elapsed={elapsed}
                demoMode={demoMode}
                image={image}
                effectLabel={viralName(preset.slug, preset.name)}
                onCancel={cancelInFlightGenerate}
                onLeaveToLibrary={leaveWaitingKeepBackground}
                recoveryChecking={recoveringSavedResult}
                awaitingPrimary={awaitingPrimaryAfterRecovery}
              />
            )}
            {(status === "done" || status === "error") && videoUrl && (
              <div className="relative w-full p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                        demo
                          ? "border border-white/20 bg-white/15 text-white"
                          : "border border-[var(--mint)]/40 bg-[var(--mint)] text-black"
                      }`}
                    >
                      {resultProvenanceLabel(demo)}
                    </span>
                    {watermark && (
                      <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/70">
                        {PROVENANCE.onPlayerMark}
                      </span>
                    )}
                    {lastRequestCreditState === "refund unconfirmed" ||
                    lastRequestCreditState === "10 restored" ? (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          lastRequestCreditState === "refund unconfirmed"
                            ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                            : "border-amber-400/40 bg-amber-400/10 text-amber-100"
                        }`}
                      >
                        last request · {lastRequestCreditState}
                      </span>
                    ) : activeVersion ? (
                      <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/60">
                        {activeVersion.creditState}
                      </span>
                    ) : lastRequestCreditState ? (
                      <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/60">
                        {lastRequestCreditState}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCompare((c) => !c)}
                    className="text-[10px] font-semibold text-[var(--brand)] hover:underline"
                  >
                    {compare ? "Video only" : "Photo ↔ video"}
                  </button>
                </div>
                {versions.length > 0 ? (
                  <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-[var(--fg-dim)]">
                      Versions
                    </span>
                    {versions.map((version, index) => (
                      <button
                        key={version.id}
                        type="button"
                        onClick={() => selectVersion(version)}
                        className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold ${
                          activeVersionId === version.id
                            ? "border-[var(--mint)] bg-[var(--mint)]/10 text-[var(--mint)]"
                            : "border-[var(--border)] text-[var(--fg-muted)]"
                        }`}
                        title={`${version.effectName || version.effect} · ${version.creditState}`}
                      >
                        V{versions.length - index} · {version.creditState}
                      </button>
                    ))}
                  </div>
                ) : null}
                {compare && compareStill ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-center text-[10px] font-bold uppercase text-[var(--fg-dim)]">
                        Before
                        {activeVersion
                          ? ` · ${activeVersion.effectName || activeVersion.effect}`
                          : ""}
                      </p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={compareStill}
                        alt="before"
                        className="mx-auto max-h-[45vh] rounded-lg object-contain"
                      />
                    </div>
                    <div className="relative">
                      <p className="mb-1 text-center text-[10px] font-bold uppercase text-[var(--fg-dim)]">
                        After · server output
                      </p>
                      {playableVideo ? (
                        <video
                          key={videoUrl}
                          src={videoUrl || undefined}
                          controls
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="mx-auto max-h-[45vh] rounded-lg"
                        />
                      ) : (
                        <div className="mx-auto flex max-h-[45vh] min-h-[160px] max-w-md flex-col items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-4 py-6 text-center">
                          <p className="text-sm font-bold text-amber-100">
                            Free live held for T6 bake
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed text-white/55">
                            {freeLiveDownloadBlockReason()} Player will unlock
                            when a server-owned derivative is ready.
                          </p>
                        </div>
                      )}
                      {watermark && playableVideo ? (
                        <div
                          className="pointer-events-none absolute bottom-3 right-3 rounded-md px-2 py-1 text-[10px] font-bold text-white/90"
                          style={{ background: "var(--grad)" }}
                        >
                          {site.name}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    {playableVideo ? (
                      <video
                        key={videoUrl}
                        src={videoUrl || undefined}
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="mx-auto max-h-[65vh] rounded-lg"
                      />
                    ) : (
                      <div className="mx-auto flex max-h-[65vh] min-h-[200px] max-w-md flex-col items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-4 py-8 text-center">
                        <p className="text-sm font-bold text-amber-100">
                          Free live held for T6 bake
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-white/55">
                          {freeLiveDownloadBlockReason()} Credits already
                          settled; file bake is still blocked.
                        </p>
                      </div>
                    )}
                    {watermark && playableVideo ? (
                      <div
                        className="pointer-events-none absolute bottom-6 right-6 rounded-md px-2 py-1 text-xs font-bold text-white/90"
                        style={{ background: "var(--grad)" }}
                      >
                        {site.name}
                      </div>
                    ) : null}
                  </div>
                )}
                <div className="mx-auto mt-4 max-w-md rounded-2xl border border-[var(--mint)]/35 bg-gradient-to-b from-[var(--mint)]/[0.12] to-black/40 px-4 py-3.5 text-center shadow-[0_0_40px_rgba(200,255,61,0.1)]">
                  <p className="text-[15px] font-black tracking-tight text-white">
                    {demo ? t("create.labReady") : t("create.ready")}
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-white/55">
                    {demo ? t("create.labReady.sub") : t("create.ready.sub")}
                  </p>
                </div>

                {status === "done" && videoUrl ? (
                  <GenerateAfterPath
                    effectSlug={activeVersion?.effect || effect}
                    demo={demo}
                    jobIntentId={jobIntentId}
                    sku={toyIdentity.sku || null}
                    aspectRatio={
                      activeVersion?.aspectRatio ||
                      activeVersion?.spec?.aspectRatio
                    }
                    duration={
                      activeVersion?.duration ??
                      activeVersion?.spec?.duration
                    }
                    className="mx-auto mt-3 max-w-md"
                  />
                ) : null}

                {/* Delivery pack — interactive ticks (session-local, first principles P4) */}
                <DeliveryChecklist
                  className="mx-auto mt-3 max-w-md"
                  title={
                    toyIdentity.sku
                      ? `Delivery · QC · ${toyIdentity.sku}`
                      : "Delivery · fidelity QC"
                  }
                  surface={`create:${jobIntentId ?? "default"}`}
                  items={deliveryItemsForJob(jobIntentId, {
                    demo,
                    downloadAllowed,
                    includeQc: true,
                  })}
                />

                {/* Same photo · next job — accelerate cycle, no re-upload */}
                {image && status === "done" && (
                  <div className="mx-auto mt-4 max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/40 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <div className="mb-2.5 flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mint)]">
                          {t("create.nextJob")}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-white/45">
                          {t("create.nextJob.hint")}
                        </p>
                      </div>
                      {toyIdentity.sku ? (
                        <span className="rounded-full border border-[var(--mint)]/25 bg-[var(--mint)]/10 px-2 py-0.5 text-[9px] font-bold text-[var(--mint)]">
                          {toyIdentity.sku}
                        </span>
                      ) : null}
                    </div>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {JOB_INTENTS.filter((j) => j.id !== jobIntentId).map(
                        (job) =>
                          job.href ? (
                            <Link
                              key={job.id}
                              href={job.href}
                              className="rounded-xl border border-[var(--mint)]/40 bg-[var(--mint)]/[0.12] px-3 py-2.5 text-left transition hover:border-[var(--mint)] hover:bg-[var(--mint)]/20"
                            >
                              <span className="block text-[11px] font-bold text-[var(--mint)]">
                                {job.label}
                              </span>
                              <span className="mt-0.5 block text-[10px] leading-snug text-white/45">
                                {job.blurb}
                              </span>
                            </Link>
                          ) : (
                            <button
                              key={job.id}
                              type="button"
                              onClick={() => void generateForJob(job.id)}
                              className="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2.5 text-left transition hover:border-white/30 hover:bg-white/[0.08]"
                            >
                              <span className="block text-[11px] font-bold text-white/90">
                                {job.label}
                              </span>
                              <span className="mt-0.5 block text-[10px] leading-snug text-white/40">
                                {job.blurb} · {job.aspectRatio}
                              </span>
                            </button>
                          )
                      )}
                    </div>
                  </div>
                )}

                <p className="mx-auto mt-2 max-w-md text-center text-[11px] leading-relaxed text-[var(--fg-dim)]">
                  {demo
                    ? `${PROVENANCE.cachedDemo} — does not animate your upload.`
                    : `${PROVENANCE.liveGeneration} — each run creates a separate version. Provider failures restore credits when confirmed; TIMEOUT / network / cancel stay refund unconfirmed.`}
                </p>
                <div className="mt-4 flex flex-col items-center gap-2">
                  {downloadAllowed &&
                  (activeVersion?.requestId ||
                    (videoUrl && isSafeDeliverableUrl(videoUrl))) ? (
                    <button
                      type="button"
                      data-create-download="gated"
                      className="btn btn-primary w-full max-w-sm px-6 py-3.5 text-sm font-black tracking-tight sm:w-auto sm:min-w-[14rem]"
                      onClick={() => void downloadActiveResult()}
                    >
                      {t("create.download")}
                    </button>
                  ) : downloadAllowed ? (
                    <button
                      type="button"
                      disabled
                      title="Unsafe deliverable URL — download blocked"
                      className="btn btn-primary w-full max-w-sm cursor-not-allowed px-6 py-3.5 text-sm font-black opacity-50 sm:w-auto sm:min-w-[14rem]"
                    >
                      {downloadBlockedCtaLabel({
                        downloadAllowed: true,
                        unsafeUrl: true,
                      })}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title={freeLiveDownloadBlockReason()}
                      className="btn btn-primary w-full max-w-sm cursor-not-allowed px-6 py-3.5 text-sm font-black opacity-50 sm:w-auto sm:min-w-[14rem]"
                    >
                      {downloadBlockedCtaLabel({ downloadAllowed: false })}
                    </button>
                  )}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={copyLink}
                    className="btn btn-ghost px-3.5 py-2 text-xs"
                  >
                    {copied ? t("create.copied") : t("create.copyLink")}
                  </button>
                  <button
                    type="button"
                    onClick={shareX}
                    className="btn btn-ghost px-3.5 py-2 text-xs"
                  >
                    {t("create.shareX")}
                  </button>
                  <button
                    type="button"
                    onClick={retryActiveVersion}
                    title="Reuse this version's exact recipe, still, duration, aspect, model, and seed. Appends a new version."
                    className="btn btn-ghost px-3.5 py-2 text-xs"
                  >
                    {t("create.retrySame")}
                  </button>
                  <button
                    type="button"
                    onClick={makeVariant}
                    title="Uses your current Composer settings (recipe, duration, aspect, model) — not the frozen version."
                    className="btn btn-ghost px-3.5 py-2 text-xs"
                  >
                    {t("create.makeVariant")}
                  </button>
                {!downloadAllowed ? (
                  <p className="basis-full text-center text-[10px] leading-relaxed text-amber-100/80">
                    {freeLiveDownloadBlockReason()}
                  </p>
                ) : null}
                  <Link
                    href="/effects"
                    className="btn btn-ghost px-4 py-2 text-xs"
                  >
                    {t("create.anotherRecipe")}
                  </Link>
                  {remix.intent?.sourceProjectSlug ? (
                    <Link
                      href={`/projects/${encodeURIComponent(remix.intent.sourceProjectSlug)}`}
                      className="btn btn-ghost px-4 py-2 text-xs"
                    >
                      Open source recipe
                    </Link>
                  ) : null}
                  <Link
                    href="/library"
                    className="btn btn-ghost px-4 py-2 text-xs"
                  >
                    {t("create.savedLibrary")}
                  </Link>
                  <Link
                    href="/create?mode=seller-pack"
                    className="btn btn-ghost px-3.5 py-2 text-xs"
                  >
                    {t("cta.sellerPack")}
                  </Link>
                  </div>
                </div>

                {/* Wave A: server-returned metadata for the active version */}
                <dl className="mx-auto mt-4 grid max-w-lg grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-[11px] sm:grid-cols-3">
                  <div>
                    <dt className="text-[var(--fg-dim)]">Recipe</dt>
                    <dd className="font-semibold text-[var(--fg)]">
                      {activeVersion?.effectName || preset.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--fg-dim)]">Model</dt>
                    <dd className="font-semibold text-[var(--fg)]">
                      {seedanceModelLabel(
                        usedModel ||
                          MODELS.find((m) => m.id === modelId)?.label ||
                          null
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--fg-dim)]">Duration</dt>
                    <dd className="font-semibold text-[var(--fg)]">
                      {resultDuration ?? effectiveDuration}s
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--fg-dim)]">Aspect</dt>
                    <dd className="font-semibold text-[var(--fg)]">
                      {resultAspect ?? aspectRatio}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--fg-dim)]">Resolution</dt>
                    <dd className="font-semibold text-[var(--fg)]">
                      {resultResolution ?? effectiveResolution}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--fg-dim)]">Settlement</dt>
                    <dd className="font-semibold text-[var(--fg)]">
                      {activeVersion?.creditState ||
                        (demo ? "0 cached" : "10 used")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--fg-dim)]">Download policy</dt>
                    <dd
                      className="font-semibold text-[var(--fg)]"
                      data-download-policy={
                        downloadAllowed
                          ? demo
                            ? "demo-open"
                            : "allowed"
                          : "t6-held"
                      }
                    >
                      {downloadPolicyLabel({ demo, downloadAllowed })}
                    </dd>
                  </div>
                  {typeof activeVersion?.costCredits === "number" ? (
                    <div>
                      <dt className="text-[var(--fg-dim)]">Cost (server)</dt>
                      <dd className="font-semibold text-[var(--fg)]">
                        {activeVersion.costCredits} cr
                      </dd>
                    </div>
                  ) : null}
                  {lastRequestCreditState === "refund unconfirmed" ||
                  lastRequestCreditState === "10 restored" ? (
                    <div>
                      <dt className="text-[var(--fg-dim)]">Last request</dt>
                      <dd className="font-semibold text-amber-100">
                        {lastRequestCreditState}
                      </dd>
                    </div>
                  ) : null}
                  {activeVersion?.provider ? (
                    <div>
                      <dt className="text-[var(--fg-dim)]">Provider</dt>
                      <dd className="font-semibold text-[var(--fg)]">
                        {activeVersion.provider}
                      </dd>
                    </div>
                  ) : null}
                  {activeVersion?.requestId ? (
                    <div className="col-span-2 sm:col-span-3">
                      <dt className="text-[var(--fg-dim)]">Task ID</dt>
                      <dd className="truncate font-mono text-[10px] text-[var(--fg-muted)]">
                        {activeVersion.requestId}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <p className="mt-2 text-center text-[10px] text-[var(--fg-dim)]">
                  {activeVersion?.serverEcho
                    ? "Metadata includes server-echoed fields for this version (recipe, cost, task id when live)."
                    : "Metadata uses the last response when available — client prefs only fill gaps."}
                  {versions.length > 1
                    ? ` · ${versions.length} versions in this session`
                    : ""}
                </p>
                <p className="mt-1 text-center text-[10px] text-[var(--fg-dim)]">
                  {demo
                    ? `${PROVENANCE.cachedDemo} only — not from your upload · not cloud-backed`
                    : activeVersion?.privateResult
                      ? privateLibraryNote()
                      : localLibraryNote()}
                </p>
              </div>
            )}
            {status === "error" && !videoUrl && (
              <div className="relative z-[2] flex flex-col items-center p-8 text-center sm:p-10">
                <span className="grid h-14 w-14 place-items-center rounded-2xl border border-[var(--brand)]/35 bg-[var(--brand)]/[0.08] text-[var(--brand)] sm:h-16 sm:w-16">
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v5" />
                    <path d="M12 16h.01" />
                  </svg>
                </span>
                <p className="mt-4 font-display text-base font-bold uppercase tracking-tight text-white sm:text-lg">
                  {t("create.clipDidntLand")}
                </p>
                <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--fg-muted)]">
                  {error ||
                    "Something blocked this run. Your still is still here — retry or switch recipe."}
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {image ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void generate()}
                      className="btn btn-primary px-6 py-2.5 text-sm disabled:opacity-50"
                    >
                      {t("create.retryGenerate")}
                    </button>
                  ) : null}
                  <Link
                    href="/effects"
                    className="rounded-full border border-white/20 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/85 hover:border-white/35"
                  >
                    {t("create.pickRecipe")}
                  </Link>
                  <button
                    type="button"
                    disabled={sampleLoading || busy}
                    onClick={() => void loadSampleToy("scout", true)}
                    className="rounded-full border border-[var(--mint)]/35 bg-[var(--mint)]/10 px-4 py-2.5 text-sm font-semibold text-[var(--mint)] hover:bg-[var(--mint)]/18 disabled:opacity-50"
                  >
                    {t("create.freeLabSample")}
                  </button>
                </div>
              </div>
            )}
            {status === "idle" && !videoUrl && (
              <div className="flex flex-col items-center p-8 text-center sm:p-10">
                <span className="grid h-14 w-14 place-items-center rounded-2xl border border-[var(--mint)]/30 bg-[var(--mint)]/[0.06] text-[var(--mint)] sm:h-16 sm:w-16">
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
                  </svg>
                </span>
                <p className="mt-4 font-display text-base font-bold uppercase tracking-tight text-white sm:text-lg">
                  {t("create.clipLands")}
                </p>
                <p className="mt-1.5 max-w-xs text-xs text-[var(--fg-muted)]">
                  {image
                    ? t("create.hitGenerate")
                    : demoMode
                      ? t("create.noPhotoCached")
                      : t("create.noPhotoLive")}
                </p>
                {!image && (
                  <button
                    type="button"
                    disabled={sampleLoading || busy}
                    onClick={() => void loadSampleToy("scout", true)}
                    className="btn btn-primary mt-5 px-6 py-2.5 text-sm disabled:opacity-50"
                  >
                    {demoMode
                      ? t("create.labSampleFree")
                      : t("create.labSampleMini")}
                  </button>
                )}
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--mint)]/25 bg-black/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--mint)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--mint)]" />
                  {aspectRatio} · {effectiveDuration}s
                </span>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Sticky mobile primary CTA — above AppShell tab nav ── */}
      <div
        className="fixed inset-x-0 bottom-[4.75rem] z-40 border-t border-white/10 bg-black/92 px-4 py-2.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:hidden"
        data-create-sticky="mobile"
      >
        {image ? (
          <p className="mb-1.5 truncate text-center text-[10px] font-medium text-white/55">
            {preset.emoji} {viralName(preset.slug, preset.name)} · {aspectRatio}
            {toyIdentity.sku ? ` · ${toyIdentity.sku}` : ""} ·{" "}
            {demoMode
              ? "0 credits · cached prototype"
              : `${CREDITS_PER_VIDEO} credits when Live`}
          </p>
        ) : null}
        {!image ? (
          privateUploadEnabled ? (
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("create-photo-step")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
              className="btn btn-primary w-full py-3 text-sm"
              data-first-run-action="upload"
            >
              Upload owned toy photo
            </button>
          ) : (
            <button
              type="button"
              disabled={sampleLoading || busy}
              onClick={() => void loadSampleToy("scout", true)}
              className="btn btn-primary w-full py-3 text-sm disabled:opacity-50"
              data-first-run-action="lab-preview"
            >
              Preview a Lab sample · 0 credits
            </button>
          )
        ) : busy ? (
          <GenerateWaitMobileStrip
            elapsed={elapsed}
            demoMode={demoMode}
            onCancel={cancelInFlightGenerate}
            onLeaveToLibrary={leaveWaitingKeepBackground}
            awaitingPrimary={awaitingPrimaryAfterRecovery}
          />
        ) : status === "done" && videoUrl ? (
          <button
            type="button"
            onClick={() => {
              if (!ownsRights) {
                document
                  .getElementById("create-ownership")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
                return;
              }
              void generate();
              document
                .getElementById("create-result")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            disabled={!ownsRights}
            className="btn btn-primary w-full py-3 text-sm disabled:opacity-50"
          >
            Generate again
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!ownsRights) {
                document
                  .getElementById("create-ownership")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
                return;
              }
              void generate();
              document
                .getElementById("create-result")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            disabled={busy || !ownsRights || (mode === "i2v" && !image)}
            className="btn btn-primary w-full py-3.5 text-[15px] font-black tracking-tight disabled:opacity-50"
            data-first-run-action="generate"
          >
            {primaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
