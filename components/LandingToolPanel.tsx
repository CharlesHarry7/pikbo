"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  historyFieldsFromSuccess,
  postGenerateWithRetry,
} from "@/lib/generateClient";
import { downloadVideoFile, pushHistory } from "@/lib/history";
import {
  canLiveGenerate,
  fetchMe,
  freeTrialExhausted,
  generationDisplayCredits,
  mergeMeSession,
  type MeResponse,
} from "@/lib/meClient";
import {
  isClientTimeoutError,
  STUDIO_SESSION_BOOT_MS,
} from "@/lib/clientTimeout";
import { CREDITS_PER_VIDEO } from "@/lib/pricing";
import { isValidImageDataUrl } from "@/lib/providerError";
import { SAMPLE_TOYS, sampleToDataUrl } from "@/lib/samples";
import { site } from "@/lib/site";
import { useToast } from "@/components/Toast";
import { PaywallCard } from "@/components/PaywallCard";
import { emitSessionRefresh } from "@/lib/sessionEvents";
import {
  localLibraryNote,
  PROVENANCE,
  resultProvenanceLabel,
} from "@/lib/provenance";
import {
  canDownloadResult,
  downloadBlockedCtaLabel,
  downloadPolicyLabel,
  freeLiveDownloadBlockReason,
  classifyDownloadHead,
  isPlayableResultVideoUrl,
  isSafeDeliverableUrl,
  requestCreditStateFromFailure,
  requestCreditStateFromSuccess,
} from "@/lib/createTrust";
import { deliveryItemsForJob } from "@/lib/deliveryPack";
import { DeliveryChecklist } from "@/components/DeliveryChecklist";
import { GenerateFailPanel } from "@/components/GenerateFailPanel";
import { GenerateWaitStage } from "@/components/GenerateWaitStage";
import { GenerateAfterPath } from "@/components/GenerateAfterPath";
import { track } from "@/lib/analytics";
import { loadToyIdentity } from "@/lib/toyIdentity";
import { createRemixHref } from "@/lib/remixIntent";

type Status = "idle" | "generating" | "done" | "error";

/**
 * 哥飞 V2 精品工具页 — 工具块（客户端）
 * 与落地文案同页：上传 → 生成 → 结果，不跳到 /create 也能完成需求。
 */
export function LandingToolPanel({
  effectSlug,
  effectName,
  duration = 5,
  aspectRatio = "9:16",
}: {
  effectSlug: string;
  effectName: string;
  duration?: number;
  aspectRatio?: string;
}) {
  const [image, setImage] = useState<string | null>(null);
  /** Phase D local asset — avoid re-posting large Base64 on generate. */
  const [assetId, setAssetId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failRetryAfterSec, setFailRetryAfterSec] = useState<number | null>(
    null
  );
  /** FailPanel settlement honesty (TIMEOUT / network → unconfirmed). */
  const [failCreditState, setFailCreditState] = useState<
    null | "10 restored" | "refund unconfirmed"
  >(null);
  const [demo, setDemo] = useState(false);
  const [watermark, setWatermark] = useState(true);
  const [session, setSession] = useState<MeResponse | null>(null);
  /** Finite session boot — never leave generate CTA on capability-unknown forever. */
  const [sessionResolved, setSessionResolved] = useState(false);
  const [sessionBoot, setSessionBoot] = useState<
    "checking" | "ready" | "timeout"
  >("checking");
  const [elapsed, setElapsed] = useState(0);
  const [loadingSample, setLoadingSample] = useState(false);
  const [ownsRights, setOwnsRights] = useState(false);
  const [usedModel, setUsedModel] = useState<string | null>(null);
  const [resultResolution, setResultResolution] = useState<string | null>(null);
  const [costCredits, setCostCredits] = useState<number | null>(null);
  const [resultSettlement, setResultSettlement] = useState<
    "0 cached" | "10 used" | null
  >(null);
  const [serverEcho, setServerEcho] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  /** Device-local bible SKU — carry into AfterPath Next SKU / Seller Pack hops. */
  const [toySku, setToySku] = useState<string>("");
  const generateAbortRef = useRef<AbortController | null>(null);
  const toast = useToast();
  const downloadAllowed = canDownloadResult({
    demo,
    watermark,
  });
  const playableVideo = isPlayableResultVideoUrl({
    videoUrl,
    demo,
    watermark,
  });

  const trialDone = freeTrialExhausted(session);
  const isFree =
    session?.plan === "free" ||
    session?.watermark === true ||
    session?.freeTrial?.isFreePlan === true;
  // Fail closed while /api/me is loading or unavailable. Public landing tools
  // must never flash a paid-provider promise before capability is known.
  const demoMode = !canLiveGenerate(session);
  const liveCredits = generationDisplayCredits(session);
  const freeLive = session?.freeTrial?.freeLive;
  /** R0/T6: Free Mini left/used chips only when Live is actually open. */
  const freeLiveOpen = Boolean(
    canLiveGenerate(session) &&
      freeLive &&
      freeLive.liveEnabled !== false
  );
  const freeLiveModelLabel =
    freeLive?.modelClass === "seedance-fast" ? "Fast" : "Mini";
  const clipsLeft =
    typeof session?.freeTrial?.clipsLeft === "number"
      ? session.freeTrial.clipsLeft
      : session && typeof session.credits === "number" && freeLiveOpen
        ? Math.floor(session.credits / CREDITS_PER_VIDEO)
        : null;

  const refreshSession = useCallback(async () => {
    setSessionBoot("checking");
    try {
      const data = await fetchMe({ timeoutMs: STUDIO_SESSION_BOOT_MS });
      setSessionResolved(true);
      setSessionBoot("ready");
      if (!data) return;
      setSession(data);
      setWatermark(data.watermark);
    } catch (err) {
      // 8s open contract: honest timeout + Retry, never hang demoMode forever.
      setSessionResolved(true);
      setSessionBoot(isClientTimeoutError(err) ? "timeout" : "ready");
    }
  }, []);

  useEffect(() => {
    return () => {
      generateAbortRef.current?.abort();
      generateAbortRef.current = null;
    };
  }, []);

  function cancelInFlightGenerate() {
    const ctrl = generateAbortRef.current;
    if (!ctrl) return;
    ctrl.abort();
    generateAbortRef.current = null;
    // Immediate settlement honesty until the aborted POST resolves.
    setFailCreditState("refund unconfirmed");
    toast(
      "Canceled · ledger cancel best-effort · refund unconfirmed until balance confirms"
    );
  }

  /**
   * HEAD gate then blob download — canceled/timeout/in-flight never open a
   * dead tab, and /api/downloads never window.open as JSON.
   */
  async function downloadLandingResult() {
    if (!downloadAllowed) {
      toast(freeLiveDownloadBlockReason());
      return;
    }
    const filename = `pikbo-${effectSlug.slice(0, 32)}.mp4`;
    if (requestId) {
      const gateUrl = `/api/downloads/${encodeURIComponent(requestId)}`;
      try {
        const head = await fetch(gateUrl, { method: "HEAD" });
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
          track({
            event: "export_click",
            path: `/effects/${effectSlug}`,
            recipe: effectSlug,
            demo: Boolean(demo),
            meta: {
              via: "downloads_api_blob",
              source: "landing",
              head: "allowed",
            },
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
        }
      } catch {
        /* fall through */
      }
    }
    if (videoUrl && isSafeDeliverableUrl(videoUrl)) {
      track({
        event: "export_click",
        path: `/effects/${effectSlug}`,
        recipe: effectSlug,
        demo: Boolean(demo),
        meta: {
          via: requestId ? "direct_after_gate" : "direct",
          source: "landing",
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

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refreshSession();
      // Device-local character bible SKU for commercial AfterPath carry.
      try {
        const id = loadToyIdentity();
        if (id.sku) setToySku(id.sku);
      } catch {
        /* private mode */
      }
      // Still studio → effect page handoff
      try {
        const pending = sessionStorage.getItem("pikbo_pending_still");
        if (pending?.startsWith("http") || pending?.startsWith("data:")) {
          sessionStorage.removeItem("pikbo_pending_still");
          if (pending.startsWith("data:")) {
            void adoptImage(pending);
          } else {
            sampleToDataUrl(pending)
              .then((data) => void adoptImage(data))
              .catch(() => undefined);
          }
        }
      } catch {
        // ignore
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [refreshSession]);

  useEffect(() => {
    if (status !== "generating") return;
    const t0 = Date.now();
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [status]);

  async function adoptImage(dataUrl: string) {
    setImage(dataUrl);
    setAssetId(null);
    setError(null);
    setFailCreditState(null);
    setVideoUrl(null);
    setStatus("idle");
    try {
      const { registerLocalAsset } = await import("@/lib/clientAssets");
      const reg = await registerLocalAsset(dataUrl);
      if (reg?.assetId) setAssetId(reg.assetId);
    } catch {
      /* generate still works with inline data URL */
    }
  }

  function loadFile(file: File | undefined | null) {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please drop a PNG or JPG of your toy.");
      return;
    }
    if (file.size > 8_000_000) {
      setError("Image too large (max ~8MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      void adoptImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function loadSampleStill(path: string) {
    setLoadingSample(true);
    setError(null);
    try {
      const data = await sampleToDataUrl(path);
      await adoptImage(data);
    } catch {
      setError("Could not load sample photo");
    } finally {
      setLoadingSample(false);
    }
  }

  async function generate() {
    if (!image || !isValidImageDataUrl(image)) {
      setError("Upload a toy photo first (JPEG, PNG, WebP, or GIF).");
      return;
    }
    if (!ownsRights) {
      setError("Confirm you own this photo before generating.");
      return;
    }
    // Server enforces live credits; demo-cached path is free when no provider.
    const freeTier = session?.plan === "free" || session?.watermark;
    const resolution = demoMode
      ? freeTier
        ? "480p"
        : "720p"
      : freeLive?.resolution ?? "720p";
    setError(null);
    setFailRetryAfterSec(null);
    setFailCreditState(null);
    setVideoUrl(null);
    setRequestId(null);
    setCostCredits(null);
    setResultSettlement(null);
    setServerEcho(false);
    setElapsed(0);
    setStatus("generating");
    generateAbortRef.current?.abort();
    const abortCtrl = new AbortController();
    generateAbortRef.current = abortCtrl;
    const useAsset = Boolean(assetId);
    // Dual-send image + assetId so multi-instance hosts don't fail asset-memory miss.
    const dualImageOk = image.length < 3_500_000;
    const result = await postGenerateWithRetry(
      {
        effect: effectSlug,
        image: useAsset ? (dualImageOk ? image : undefined) : image,
        assetId: useAsset && assetId ? assetId : undefined,
        duration,
        aspectRatio,
        model: demoMode ? undefined : freeLive?.modelClass,
        resolution,
        ownsRights: true,
        allowProviderSpend: !demoMode,
      },
      {
        maxRetries: 1,
        fallbackImage: useAsset && image ? image : undefined,
        signal: abortCtrl.signal,
      }
    );
    if (generateAbortRef.current === abortCtrl) {
      generateAbortRef.current = null;
    }
    // Dead asset after TTL/process restart — clear and re-register for next try.
    if (
      (!result.ok && result.code === "ASSET_NOT_FOUND") ||
      (result.ok && result.recoveredFromAssetMiss)
    ) {
      setAssetId(null);
      if (image && isValidImageDataUrl(image)) {
        try {
          const { registerLocalAsset } = await import("@/lib/clientAssets");
          const reg = await registerLocalAsset(image);
          if (reg?.assetId) setAssetId(reg.assetId);
        } catch {
          /* inline Base64 still works */
        }
      }
    }
    if (result.ok === false) {
      if (result.session) {
        setSession((prev) => mergeMeSession(prev, result.session));
      }
      setFailRetryAfterSec(
        typeof result.retryAfterSec === "number" && result.retryAfterSec > 0
          ? result.retryAfterSec
          : null
      );
      const settlement = requestCreditStateFromFailure({
        creditsRefunded: result.creditsRefunded,
        refundUnconfirmed: result.refundUnconfirmed,
        status: result.status,
        code: result.code,
      });
      setFailCreditState(
        settlement === "10 restored" || settlement === "refund unconfirmed"
          ? settlement
          : null
      );
      if (result.paywall) {
        setError("INSUFFICIENT");
      } else {
        setError(result.error);
      }
      setStatus("error");
      void refreshSession();
      return;
    }
    const data = result.data;
    if (data.session) {
      setSession((prev) => mergeMeSession(prev, data.session));
      void refreshSession();
      emitSessionRefresh();
    }
    setVideoUrl(data.videoUrl);
    setDemo(Boolean(data.demo));
    setWatermark(Boolean(data.watermark));
    setUsedModel(data.model || null);
    setResultResolution(
      typeof data.resolution === "string" ? data.resolution : resolution
    );
    setRequestId(
      typeof data.requestId === "string" && data.requestId
        ? data.requestId
        : null
    );
    setCostCredits(
      typeof data.costCredits === "number" ? data.costCredits : null
    );
    setResultSettlement(requestCreditStateFromSuccess(Boolean(data.demo)));
    setServerEcho(
      typeof data.costCredits === "number" ||
        typeof data.requestId === "string" ||
        typeof data.model === "string"
    );
    setStatus("done");
    pushHistory(
      historyFieldsFromSuccess(data, {
        effect: effectSlug,
        effectName,
        fallbackDuration: duration,
        fallbackAspect: aspectRatio,
        fallbackResolution: resolution,
        // Device bible SKU for Library By-SKU + Remake carry
        sku: toySku || undefined,
      })
    );
    emitSessionRefresh();
    toast(
      data.demo
        ? `${PROVENANCE.cachedDemo} ready`
        : `${PROVENANCE.liveGeneration} ready · saved to this browser`
    );
  }

  const busy = status === "generating";
  // Pace progress for a provider job, not a false ~30s completion promise.
  const progress = busy
    ? Math.min(95, 8 + elapsed * 0.5)
    : status === "done"
      ? 100
      : 0;

  // Prefer samples tagged for this effect, else all
  const samples = [
    ...SAMPLE_TOYS.filter((s) => s.effect === effectSlug),
    ...SAMPLE_TOYS.filter((s) => s.effect !== effectSlug),
  ].slice(0, 4);

  return (
    <div className="card overflow-hidden p-0">
      <div className="border-b border-[var(--border)] bg-[var(--bg-soft)] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p
              className={`text-xs font-bold uppercase tracking-wider ${
                trialDone && isFree && freeLiveOpen
                  ? "text-amber-200/90"
                  : "text-[var(--fg-dim)]"
              }`}
              data-studio-open-state={sessionBoot}
              data-landing-session-boot={sessionBoot}
            >
              {!sessionResolved || sessionBoot === "checking"
                ? `Checking access · ${effectName}`
                : sessionBoot === "timeout"
                  ? `Access timed out · ${effectName}`
                  : !freeLiveOpen
                    ? `Cached Lab preview · ${effectName}`
                    : trialDone && isFree
                      ? `Free Mini used · ${effectName}`
                      : `Try free Mini · ${effectName}`}
            </p>
            <p className="mt-0.5 text-sm text-[var(--fg-muted)]">
              {!sessionResolved || sessionBoot === "checking" ? (
                "Verifying credits and live capability — fail-closed to Lab if this times out."
              ) : sessionBoot === "timeout" ? (
                "Could not verify private access in time. Generate stays on cached Lab until you retry."
              ) : !freeLiveOpen ? (
                "0 credits · your upload is not processed in this preview."
              ) : trialDone && isFree ? (
                <>
                  Lab demos still free ·{" "}
                  <Link
                    href="/pricing"
                    className="font-semibold text-[var(--mint)] hover:underline"
                  >
                    compare plans
                  </Link>
                </>
              ) : (
                "Upload one photo → clip on this page (no extra hop)."
              )}
            </p>
          </div>
          {session && (
            <div className="text-right text-xs">
              <p className="font-semibold text-[var(--mint)]">
                {liveCredits} credits
              </p>
              <p
                className={
                  trialDone && isFree && freeLiveOpen
                    ? "text-amber-200/90"
                    : "text-[var(--fg-dim)]"
                }
              >
                {!freeLiveOpen
                  ? `Live gated · ${session.planName}`
                  : trialDone && isFree
                    ? `trial used · ${session.planName}`
                    : clipsLeft !== null
                      ? `~${clipsLeft} live left · ${session.planName}`
                      : `≈ ${Math.floor(liveCredits / CREDITS_PER_VIDEO)}-job · ${session.planName}`}
              </p>
            </div>
          )}
        </div>
        {sessionBoot === "timeout" ? (
          <div
            className="mt-3 rounded-xl border border-[#FF6B6B]/35 bg-[#FF6B6B]/10 px-3 py-2.5"
            data-studio-open-error="session-timeout"
            role="alert"
          >
            <p className="text-[11px] font-semibold leading-5 text-white/85">
              Access check timed out — capability stays Lab-only until
              verification succeeds.
            </p>
            <button
              type="button"
              onClick={() => void refreshSession()}
              data-studio-open-retry
              className="mt-2 inline-flex min-h-9 items-center justify-center rounded-full bg-white px-3 text-[10px] font-black uppercase tracking-[0.12em] text-black transition hover:bg-[#c8ff3d]"
            >
              Retry access check
            </button>
          </div>
        ) : null}
        {busy && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/30">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: "var(--grad)",
              }}
            />
          </div>
        )}
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        <div className="space-y-4 p-5">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              loadFile(e.dataTransfer.files?.[0]);
            }}
            className="relative grid min-h-[200px] place-items-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg)] p-4"
          >
            {image ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt="Your toy"
                  className="max-h-56 rounded-lg object-contain"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImage(null);
                    setVideoUrl(null);
                    setStatus("idle");
                  }}
                  className="absolute right-3 top-3 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-[10px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                >
                  Clear
                </button>
              </>
            ) : (
              <div className="text-center text-sm text-[var(--fg-dim)]">
                <p className="text-3xl">🧸</p>
                <p className="mt-2 font-medium text-[var(--fg-muted)]">
                  Drop a toy photo
                </p>
                <p className="mt-1 text-xs">PNG / JPG · toys you own</p>
              </div>
            )}
            {!image && (
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) => loadFile(e.target.files?.[0])}
              />
            )}
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--fg-dim)]">
              Or try a sample still
            </p>
            <div className="flex flex-wrap gap-2">
              {samples.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={loadingSample || busy}
                  onClick={() => void loadSampleStill(s.path)}
                  className="rounded-lg border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--fg-muted)] hover:border-[var(--brand)] disabled:opacity-50"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[10px] text-[var(--fg-dim)]">
            <span className="rounded-md border border-[var(--border)] px-2 py-1">
              {isFree && freeLive ? `${freeLive.durationSec}s` : `${duration}s`}
            </span>
            <span className="rounded-md border border-[var(--border)] px-2 py-1">
              {aspectRatio}
            </span>
            <span className="rounded-md border border-[var(--border)] px-2 py-1">
              Seedance
            </span>
            <span className="rounded-md border border-[var(--border)] px-2 py-1">
              {demoMode ? "0 cached" : `${CREDITS_PER_VIDEO} credits`}
            </span>
            {!freeLiveOpen ? (
              <span className="rounded-md border border-[var(--border)] px-2 py-1">
                Upload not processed
              </span>
            ) : isFree ? (
              <span
                className={`rounded-md border px-2 py-1 ${
                  trialDone
                    ? "border-amber-300/30 text-amber-100"
                    : "border-[var(--border)]"
                }`}
              >
                {trialDone
                  ? "Free Mini trial used"
                  : freeLive
                    ? `${freeLiveModelLabel} · ${freeLive.resolution} · on-player mark`
                    : "Mini · 480p · on-player mark"}
              </span>
            ) : null}
          </div>

          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-[11px] leading-snug text-[var(--fg-muted)]">
            <input
              type="checkbox"
              checked={ownsRights}
              onChange={(e) => setOwnsRights(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--mint)]"
            />
            <span>
              I own this photo and have the right to animate and publish this
              toy. Pikbo grants no rights to third-party brands or characters.
            </span>
          </label>

          {busy ? (
            <button
              type="button"
              onClick={cancelInFlightGenerate}
              title="Aborts this browser request. Soft-launch may still finish server-side; refund unconfirmed until balance confirms."
              className="btn btn-ghost w-full border border-amber-400/40 text-amber-100"
            >
              Cancel request · {elapsed}s
            </button>
          ) : trialDone && isFree && freeLiveOpen ? (
            <div className="space-y-2">
              <p className="rounded-lg border border-amber-300/25 bg-amber-300/[0.06] px-3 py-2 text-[11px] leading-snug text-amber-100">
                Free Mini trial exhausted · cached Lab demos still free · failed
                live jobs restore credits when confirmed.
              </p>
              <Link href="/pricing" className="btn btn-primary w-full text-center">
                Compare plans
              </Link>
              <Link
                href={createRemixHref(effectSlug, undefined, toySku || null)}
                className="btn btn-ghost w-full border border-white/15 text-center text-xs text-white/70"
                data-landing-studio="lab-sample"
              >
                Open studio · Lab sample
              </Link>
            </div>
          ) : (
            <button
              type="button"
              disabled={!image || !ownsRights}
              onClick={() => void generate()}
              className="btn btn-primary w-full disabled:opacity-50"
            >
              {demoMode
                ? `Preview ${effectName} · cached free`
                : `Generate ${effectName} · ${CREDITS_PER_VIDEO} credits`}
            </button>
          )}

          {error === "INSUFFICIENT" ||
          (error && error.toLowerCase().includes("credit")) ? (
            <PaywallCard />
          ) : error ? (
            <GenerateFailPanel
              message={error}
              compact
              creditState={failCreditState}
              creditsRestored={failCreditState === "10 restored"}
              showModules={false}
              showRecipes={false}
              showLabSample
              retryAfterSec={failRetryAfterSec}
              onRetry={
                image && !busy
                  ? () => {
                      setFailRetryAfterSec(null);
                      setFailCreditState(null);
                      void generate();
                    }
                  : undefined
              }
              retryLabel="Retry"
            />
          ) : null}

          <p
            className="text-center text-[10px] text-[var(--fg-dim)]"
            data-landing-paths="product-first"
          >
            <Link
              href={createRemixHref(effectSlug, undefined, toySku || null)}
              className="text-[var(--mint)] hover:underline"
              data-landing-studio="full"
            >
              Full studio
            </Link>
            {" · "}
            <Link
              href={
                toySku.trim()
                  ? `/create?effect=street-power-up&sku=${encodeURIComponent(toySku.trim().slice(0, 64))}`
                  : "/create?effect=street-power-up"
              }
              className="text-[var(--mint)] hover:underline"
              data-landing-studio="single-moment"
              title="Listing spin + box reveal + social hook"
            >
              Create one Moment
            </Link>
            {" · "}
            <Link
              href={`/supercomputer?effects=${encodeURIComponent(effectSlug)},360-spin-showcase,floating-hero,blind-box-unboxing`}
              className="text-white/45 hover:text-white/70 hover:underline"
              title="Custom multi-preset batch · Preview"
            >
              Batch · Preview
            </Link>
          </p>
        </div>

        <div className="relative min-h-[220px] border-t border-[var(--border)] bg-black/40 lg:border-t-0 lg:border-l">
          {busy && (
            <GenerateWaitStage
              elapsed={elapsed}
              demoMode={demoMode}
              image={image}
              effectLabel={effectName}
              onCancel={cancelInFlightGenerate}
              compact
              className="min-h-[220px]"
            />
          )}
          {!busy && videoUrl ? (
            <div className="relative p-4">
              <div className="mb-2 flex flex-wrap items-center justify-center gap-1.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    demo
                      ? "border border-white/15 bg-white/10 text-[var(--fg-muted)]"
                      : "border border-[var(--mint)]/30 bg-[var(--mint)]/15 text-[var(--mint)]"
                  }`}
                >
                  {resultProvenanceLabel(demo)}
                </span>
                {watermark && (
                  <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/70">
                    {PROVENANCE.onPlayerMark}
                  </span>
                )}
              </div>
              {playableVideo ? (
                <video
                  src={videoUrl || undefined}
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="mx-auto max-h-[320px] w-full rounded-lg"
                />
              ) : (
                <div className="mx-auto flex min-h-[180px] max-w-md flex-col items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-4 py-6 text-center">
                  <p className="text-sm font-bold text-amber-100">
                    Free live held for T6 bake
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/55">
                    {freeLiveDownloadBlockReason()}
                  </p>
                </div>
              )}
              {watermark && playableVideo ? (
                <div
                  className="pointer-events-none absolute bottom-8 right-8 rounded-md px-2 py-1 text-[10px] font-bold text-white/90"
                  style={{ background: "var(--grad)" }}
                >
                  {site.name}
                </div>
              ) : null}
              {demo ? (
                <p className="mt-2 text-center text-[10px] text-[var(--fg-dim)]">
                  {PROVENANCE.cachedDemo} — does not animate your upload or call a
                  live model. Configure FAL_KEY for a live Seedance render.
                </p>
              ) : playableVideo ? (
                <p className="mt-2 text-center text-[10px] text-[var(--fg-dim)]">
                  {PROVENANCE.liveGeneration} — AI motion varies. Failed jobs
                  restore credits when confirmed. Free live uses Mini · 480p ·{" "}
                  {PROVENANCE.onPlayerMark.toLowerCase()}.
                </p>
              ) : (
                <p className="mt-2 text-center text-[10px] text-[var(--fg-dim)]">
                  {PROVENANCE.liveGeneration} settled · Free raw is not exposed.
                  Download unlocks only after server-owned T6 bake.
                </p>
              )}
              <dl
                className="mx-auto mt-3 grid max-w-sm grid-cols-2 gap-x-3 gap-y-1.5 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-[10px] sm:grid-cols-3"
                data-landing-result-meta="server-echo"
              >
                <div>
                  <dt className="text-[var(--fg-dim)]">Recipe</dt>
                  <dd className="font-semibold text-[var(--fg)]">{effectName}</dd>
                </div>
                <div>
                  <dt className="text-[var(--fg-dim)]">Model</dt>
                  <dd className="font-semibold text-[var(--fg)]">
                    {(usedModel || "Seedance").split("/").pop()}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--fg-dim)]">Duration</dt>
                  <dd className="font-semibold text-[var(--fg)]">{duration}s</dd>
                </div>
                <div>
                  <dt className="text-[var(--fg-dim)]">Aspect</dt>
                  <dd className="font-semibold text-[var(--fg)]">{aspectRatio}</dd>
                </div>
                <div>
                  <dt className="text-[var(--fg-dim)]">Resolution</dt>
                  <dd className="font-semibold text-[var(--fg)]">
                    {resultResolution || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--fg-dim)]">Settlement</dt>
                  <dd className="font-semibold text-[var(--fg)]">
                    {resultSettlement || (demo ? "0 cached" : "10 used")}
                  </dd>
                </div>
                <div className="col-span-2 sm:col-span-1">
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
                {typeof costCredits === "number" ? (
                  <div>
                    <dt className="text-[var(--fg-dim)]">Cost (server)</dt>
                    <dd className="font-semibold text-[var(--fg)]">
                      {costCredits} cr
                    </dd>
                  </div>
                ) : null}
                {requestId ? (
                  <div className="col-span-2 sm:col-span-3">
                    <dt className="text-[var(--fg-dim)]">Task ID</dt>
                    <dd className="truncate font-mono text-[9px] text-[var(--fg-muted)]">
                      {requestId}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <p className="mt-1.5 text-center text-[10px] text-[var(--fg-dim)]">
                {serverEcho
                  ? "Metadata includes server-echoed fields when the API returned them."
                  : "Metadata uses the last response when available."}{" "}
                · {demo ? PROVENANCE.cachedDemo : localLibraryNote()}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {downloadAllowed &&
                (requestId ||
                  (videoUrl && isSafeDeliverableUrl(videoUrl))) ? (
                  <button
                    type="button"
                    data-landing-download="gated"
                    className="btn btn-primary px-3 py-1.5 text-xs"
                    onClick={() => void downloadLandingResult()}
                  >
                    Download
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    title={
                      downloadAllowed
                        ? "Unsafe deliverable URL — download blocked"
                        : freeLiveDownloadBlockReason()
                    }
                    className="btn btn-primary cursor-not-allowed px-3 py-1.5 text-xs opacity-50"
                  >
                    {downloadBlockedCtaLabel({
                      downloadAllowed,
                      unsafeUrl: downloadAllowed,
                    })}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void generate()}
                  className="btn btn-ghost px-3 py-1.5 text-xs"
                >
                  Regenerate
                </button>
              </div>
              <GenerateAfterPath
                effectSlug={effectSlug}
                demo={demo}
                compact
                className="mt-2"
                sku={toySku || null}
                aspectRatio={aspectRatio}
                duration={duration}
              />
              {/* First-principles delivery steps (honest Free download). */}
              <DeliveryChecklist
                className="mx-auto mt-3 max-w-sm"
                title="Delivery · fidelity QC"
                surface="landing:default"
                items={deliveryItemsForJob(null, {
                  demo,
                  downloadAllowed,
                  includeQc: true,
                })}
              />
              {!downloadAllowed ? (
                <p className="mt-2 text-center text-[10px] leading-snug text-amber-100/80">
                  {freeLiveDownloadBlockReason()}
                </p>
              ) : null}
            </div>
          ) : null}
          {!busy && !videoUrl ? (
            <div className="grid h-full min-h-[220px] place-items-center p-6 text-center text-sm text-[var(--fg-dim)]">
              <div className="max-w-[16rem]">
                <p className="text-2xl text-[var(--mint)]">▶</p>
                <p className="mt-2 font-semibold text-white/70">
                  Your clip lands here
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">
                  {demoMode
                    ? "Choose a sample or upload a toy photo to preview this cached recipe. The cached preview never uses your upload."
                    : "Upload a toy photo → Generate. The live quote and job status appear before submission; keep this tab open while it runs."}
                </p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-white/30">
                  {effectName} · {duration}s · {aspectRatio}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
