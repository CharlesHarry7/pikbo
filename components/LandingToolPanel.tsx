"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  historyFieldsFromSuccess,
  postGenerateWithRetry,
} from "@/lib/generateClient";
import { pushHistory } from "@/lib/history";
import { fetchMe, mergeMeSession, type MeResponse } from "@/lib/meClient";
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
  freeLiveDownloadBlockReason,
} from "@/lib/createTrust";
import { deliveryItemsForJob } from "@/lib/deliveryPack";
import { DeliveryChecklist } from "@/components/DeliveryChecklist";
import { GenerateFailPanel } from "@/components/GenerateFailPanel";
import { track } from "@/lib/analytics";

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
  const [demo, setDemo] = useState(false);
  const [watermark, setWatermark] = useState(true);
  const [session, setSession] = useState<MeResponse | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loadingSample, setLoadingSample] = useState(false);
  const [ownsRights, setOwnsRights] = useState(false);
  const [usedModel, setUsedModel] = useState<string | null>(null);
  const [resultResolution, setResultResolution] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const generateAbortRef = useRef<AbortController | null>(null);
  const toast = useToast();
  const downloadAllowed = canDownloadResult({
    demo,
    watermark,
  });

  const refreshSession = useCallback(async () => {
    const data = await fetchMe();
    if (!data) return;
    setSession(data);
    setWatermark(data.watermark);
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
    toast(
      "Canceled · check balance before retry if live debit may have started"
    );
  }

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refreshSession();
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
    const resolution = freeTier ? "480p" : "720p";
    setError(null);
    setVideoUrl(null);
    setRequestId(null);
    setElapsed(0);
    setStatus("generating");
    generateAbortRef.current?.abort();
    const abortCtrl = new AbortController();
    generateAbortRef.current = abortCtrl;
    const useAsset = Boolean(assetId);
    const result = await postGenerateWithRetry(
      {
        effect: effectSlug,
        image: useAsset ? undefined : image,
        assetId: useAsset && assetId ? assetId : undefined,
        duration,
        aspectRatio,
        resolution,
        ownsRights: true,
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
    setStatus("done");
    pushHistory(
      historyFieldsFromSuccess(data, {
        effect: effectSlug,
        effectName,
        fallbackDuration: duration,
        fallbackAspect: aspectRatio,
        fallbackResolution: resolution,
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
  const progress = busy ? Math.min(95, 12 + elapsed * 4) : status === "done" ? 100 : 0;

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
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--fg-dim)]">
              Try free · {effectName}
            </p>
            <p className="mt-0.5 text-sm text-[var(--fg-muted)]">
              Upload one photo → clip on this page (no extra hop).
            </p>
          </div>
          {session && (
            <div className="text-right text-xs">
              <p className="font-semibold text-[var(--mint)]">
                {session.credits} credits
              </p>
              <p className="text-[var(--fg-dim)]">
                ≈ {Math.floor(session.credits / CREDITS_PER_VIDEO)}-job allowance ·{" "}
                {session.planName}
              </p>
            </div>
          )}
        </div>
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
              {duration}s
            </span>
            <span className="rounded-md border border-[var(--border)] px-2 py-1">
              {aspectRatio}
            </span>
            <span className="rounded-md border border-[var(--border)] px-2 py-1">
              Seedance
            </span>
            <span className="rounded-md border border-[var(--border)] px-2 py-1">
              {CREDITS_PER_VIDEO} credits
            </span>
            {(session?.plan === "free" || session?.watermark) && (
              <span className="rounded-md border border-[var(--border)] px-2 py-1">
                Mini · 480p · on-player mark
              </span>
            )}
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
          ) : (
            <button
              type="button"
              disabled={!image || !ownsRights}
              onClick={() => void generate()}
              className="btn btn-primary w-full disabled:opacity-50"
            >
              {`Generate ${effectName} · ${CREDITS_PER_VIDEO} credits`}
            </button>
          )}

          {error === "INSUFFICIENT" ||
          (error && error.toLowerCase().includes("credit")) ? (
            <PaywallCard />
          ) : error ? (
            <GenerateFailPanel
              message={error}
              compact
              showModules={false}
              showRecipes={false}
              showLabSample
              onRetry={image && !busy ? () => void generate() : undefined}
              retryLabel="Retry"
            />
          ) : null}

          <p className="text-center text-[10px] text-[var(--fg-dim)]">
            <Link
              href={`/create?effect=${effectSlug}`}
              className="text-[var(--mint)] hover:underline"
            >
              Full studio
            </Link>
            {" · "}
            <Link
              href={`/supercomputer?effects=${effectSlug},360-spin-showcase,floating-hero,blind-box-unboxing`}
              className="text-[var(--mint)] hover:underline"
            >
              Batch more
            </Link>
          </p>
        </div>

        <div className="relative min-h-[220px] border-t border-[var(--border)] bg-black/40 lg:border-t-0 lg:border-l">
          {busy && (
            <div className="grid h-full min-h-[220px] place-items-center p-8 text-center">
              <div>
                <div
                  className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-[var(--brand)]"
                />
                <p className="mt-4 text-sm text-[var(--fg-muted)]">
                  Preparing your result…
                </p>
                <p className="mt-1 text-xs text-[var(--fg-dim)]">
                  Live renders usually take 30–90s; cached demos return faster · {elapsed}s
                </p>
                <button
                  type="button"
                  onClick={cancelInFlightGenerate}
                  className="btn btn-ghost mt-4 border border-amber-400/35 px-3 py-1.5 text-xs text-amber-100"
                >
                  Cancel request
                </button>
              </div>
            </div>
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
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                muted
                playsInline
                className="mx-auto max-h-[320px] w-full rounded-lg"
              />
              {watermark && (
                <div
                  className="pointer-events-none absolute bottom-8 right-8 rounded-md px-2 py-1 text-[10px] font-bold text-white/90"
                  style={{ background: "var(--grad)" }}
                >
                  {site.name}
                </div>
              )}
              {demo ? (
                <p className="mt-2 text-center text-[10px] text-[var(--fg-dim)]">
                  {PROVENANCE.cachedDemo} — does not animate your upload or call a
                  live model. Configure FAL_KEY for a live Seedance render.
                </p>
              ) : (
                <p className="mt-2 text-center text-[10px] text-[var(--fg-dim)]">
                  {PROVENANCE.liveGeneration} — AI motion varies. Failed jobs
                  refund credits. Free live uses Mini · 480p ·{" "}
                  {PROVENANCE.onPlayerMark.toLowerCase()}.
                </p>
              )}
              <p className="mt-1 text-center text-[10px] text-[var(--fg-dim)]">
                {(usedModel || "Seedance").split("/").pop()} · {duration}s ·{" "}
                {aspectRatio}
                {resultResolution ? ` · ${resultResolution}` : ""} ·{" "}
                {demo ? PROVENANCE.cachedDemo : localLibraryNote()}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {downloadAllowed ? (
                  <a
                    href={
                      requestId
                        ? `/api/downloads/${encodeURIComponent(requestId)}`
                        : videoUrl || "#"
                    }
                    download={
                      requestId ? undefined : `pikbo-${effectSlug}.mp4`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary px-3 py-1.5 text-xs"
                    onClick={() =>
                      track({
                        event: "export_click",
                        path: `/effects/${effectSlug}`,
                        recipe: effectSlug,
                        demo: Boolean(demo),
                        meta: {
                          via: requestId ? "downloads_api" : "direct",
                          source: "landing",
                        },
                      })
                    }
                  >
                    Download
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    title={freeLiveDownloadBlockReason()}
                    className="btn btn-primary cursor-not-allowed px-3 py-1.5 text-xs opacity-50"
                  >
                    Download blocked · Free raw
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void generate()}
                  className="btn btn-ghost px-3 py-1.5 text-xs"
                >
                  Regenerate
                </button>
                <Link
                  href={`/create?effect=${encodeURIComponent(effectSlug)}`}
                  className="btn btn-ghost px-3 py-1.5 text-xs"
                >
                  Full Generate
                </Link>
                <Link
                  href="/modules"
                  className="btn btn-ghost px-3 py-1.5 text-xs"
                >
                  Modules
                </Link>
                <Link
                  href="/create?mode=seller-pack"
                  className="btn btn-ghost px-3 py-1.5 text-xs"
                >
                  Seller Pack
                </Link>
                <Link
                  href="/library"
                  className="btn btn-ghost px-3 py-1.5 text-xs"
                >
                  Library
                </Link>
              </div>
              {/* First-principles delivery steps (honest Free download). */}
              <DeliveryChecklist
                className="mx-auto mt-3 max-w-sm"
                title="Delivery · next steps"
                surface="landing:default"
                items={deliveryItemsForJob(null, { demo, downloadAllowed })}
              />
              {!downloadAllowed ? (
                <p className="mt-2 text-center text-[10px] leading-snug text-amber-100/80">
                  {freeLiveDownloadBlockReason()}
                </p>
              ) : null}
            </div>
          ) : null}
          {!busy && !videoUrl ? (
            <div className="grid h-full min-h-[220px] place-items-center p-8 text-center text-sm text-[var(--fg-dim)]">
              <div>
                <p className="text-2xl">▶</p>
                <p className="mt-2">Your clip lands here</p>
                <p className="mt-1 text-xs">
                  Tool + landing on one page — ready for search & convert
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
