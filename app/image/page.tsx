"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { CREDITS_PER_VIDEO } from "@/lib/pricing";
import {
  clearImageHistory,
  loadImageHistory,
  pushImageHistory,
  removeImageHistoryItem,
  type ImageHistoryItem,
} from "@/lib/imageHistory";
import { fetchMe, mergeMeSession, type MeResponse } from "@/lib/meClient";
import {
  mintImageIdempotencyKey,
  postImageWithRetry,
} from "@/lib/imageClient";
import { requestCreditStateFromFailure } from "@/lib/createTrust";
import { GenerateFailPanel } from "@/components/GenerateFailPanel";
import { GenerateAfterPath } from "@/components/GenerateAfterPath";
import { GenerateSuiteChrome } from "@/components/GenerateSuiteChrome";
import { loadToyIdentity } from "@/lib/toyIdentity";
import { createRemixHref } from "@/lib/remixIntent";

/** Default video recipe when handing a still into Generate (listing spin). */
const IMAGE_HANDOFF_EFFECT = "360-spin-showcase";

/** Process-memory still ledger row (GET /api/image — no multi-node claim). */
type SessionStillJob = {
  id: string;
  status: string;
  prompt?: string;
  aspect?: string;
  hasImage?: boolean;
  imageUrl?: string;
  demo?: boolean;
  creditsOutcome?: string;
  errorCode?: string;
  error?: string;
  demoReason?: string;
};

/** Handoff stills into Create — http(s) or same-origin path only. */
function canHandOffStill(url: string | null | undefined): url is string {
  if (!url) return false;
  return /^https?:\/\//i.test(url) || url.startsWith("/");
}

function stashPendingStill(url: string) {
  try {
    sessionStorage.setItem("pikbo_pending_still", url);
  } catch {
    /* private mode */
  }
}

export default function ImageStudioPage() {
  const [prompt, setPrompt] = useState(
    "Studio product photo of a designer vinyl art toy, soft box lighting, matte finish, sharp paint apps, catalog ready"
  );
  const [aspect, setAspect] = useState("3:4");
  const [busy, setBusy] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Server Retry-After — FailPanel countdown locks Retry (parity with Create). */
  const [failRetryAfterSec, setFailRetryAfterSec] = useState<number | null>(
    null
  );
  /** Settlement honesty for FailPanel (restored vs unconfirmed). */
  const [failCreditState, setFailCreditState] = useState<
    null | "10 restored" | "refund unconfirmed"
  >(null);
  const [demo, setDemo] = useState(false);
  const [demoReason, setDemoReason] = useState<string | null>(null);
  const [history, setHistory] = useState<ImageHistoryItem[]>([]);
  /** Server settlement echo — 0 cached vs 10 used (honest soft-launch). */
  const [lastSettlement, setLastSettlement] = useState<string | null>(null);
  /** Free plan: stills are demo-only so Mini trial stays for Create video. */
  const [me, setMe] = useState<MeResponse | null>(null);
  /** Phase D/F parity — cancel mid still; refund unconfirmed if live debit started. */
  const abortRef = useRef<AbortController | null>(null);
  /** Device-local bible SKU — AfterPath hops (Create/Batch parity). */
  const [toySku, setToySku] = useState("");
  /** Process-memory Flux ledger (GET /api/image) — recovery honesty. */
  const [sessionStillJobs, setSessionStillJobs] = useState<SessionStillJob[]>(
    []
  );
  const [sessionStillMeta, setSessionStillMeta] = useState<{
    open: number;
    total: number;
    failed: number;
    canceled: number;
  } | null>(null);

  // Default optimistic Free until /api/me resolves (soft-launch default plan).
  const freeStillsDemoOnly =
    me == null
      ? true
      : me.plan === "free" || me.freeTrial?.isFreePlan === true;

  useEffect(() => {
    const t = window.setTimeout(() => {
      setHistory(loadImageHistory());
      try {
        const id = loadToyIdentity();
        if (id.sku) setToySku(id.sku);
      } catch {
        /* private mode */
      }
    }, 0);
    let cancelled = false;
    void fetchMe().then((m) => {
      if (!cancelled) setMe(m);
    });

    async function loadSessionStills() {
      try {
        const res = await fetch("/api/image", {
          method: "GET",
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          jobs?: SessionStillJob[];
          open?: number;
          total?: number;
          byStatus?: { failed?: number; canceled?: number };
        };
        if (cancelled) return;
        const jobs = Array.isArray(data.jobs) ? data.jobs : [];
        setSessionStillJobs(jobs.slice(0, 8));
        setSessionStillMeta({
          open: typeof data.open === "number" ? data.open : 0,
          total: typeof data.total === "number" ? data.total : jobs.length,
          failed: data.byStatus?.failed ?? 0,
          canceled: data.byStatus?.canceled ?? 0,
        });
      } catch {
        /* offline / private */
      }
    }
    void loadSessionStills();
    // Soft-launch: poll process-memory still ledger (GET touches open TTL).
    const poll = window.setInterval(() => {
      if (!cancelled) void loadSessionStills();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      window.clearInterval(poll);
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  /** Ledger cancel for a running still (DELETE /api/image/[id]) — refund unconfirmed. */
  async function cancelSessionStill(jobId: string) {
    try {
      const res = await fetch(`/api/image/${encodeURIComponent(jobId)}`, {
        method: "DELETE",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        refundUnconfirmed?: boolean;
        creditsOutcome?: string;
        message?: string;
      };
      if (data.refundUnconfirmed === true || data.creditsOutcome === "refund unconfirmed") {
        setFailCreditState("refund unconfirmed");
      }
      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Could not cancel still ledger row"
        );
      } else {
        setError(
          "Canceled · ledger cancel best-effort · refund unconfirmed until balance confirms"
        );
      }
    } catch {
      setError("Cancel failed · check network · refund unconfirmed");
      setFailCreditState("refund unconfirmed");
    }
    // Refresh process-memory strip
    try {
      const res = await fetch("/api/image", { method: "GET", cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as {
          jobs?: SessionStillJob[];
          open?: number;
          total?: number;
          byStatus?: { failed?: number; canceled?: number };
        };
        const jobs = Array.isArray(data.jobs) ? data.jobs : [];
        setSessionStillJobs(jobs.slice(0, 8));
        setSessionStillMeta({
          open: typeof data.open === "number" ? data.open : 0,
          total: typeof data.total === "number" ? data.total : jobs.length,
          failed: data.byStatus?.failed ?? 0,
          canceled: data.byStatus?.canceled ?? 0,
        });
      }
    } catch {
      /* ignore */
    }
  }

  /** Open single still via GET /api/image/[id] (data: demos included; list omits bodies). */
  async function openSessionStill(jobId: string) {
    try {
      const res = await fetch(`/api/image/${encodeURIComponent(jobId)}`, {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        job?: SessionStillJob & { demo?: boolean; creditsOutcome?: string };
      };
      const j = data.job;
      if (!j || j.status !== "succeeded") return;
      if (j.imageUrl) {
        setImageUrl(j.imageUrl);
        setDemo(Boolean(j.demo));
        setLastSettlement(
          j.creditsOutcome === "0 cached" || j.creditsOutcome === "10 used"
            ? j.creditsOutcome
            : null
        );
        setError(null);
      }
    } catch {
      /* offline */
    }
  }

  /** Retry terminal still: re-fill prompt/aspect and re-POST with a new key. */
  function retrySessionStill(j: SessionStillJob) {
    const nextPrompt = j.prompt?.trim() || prompt;
    const nextAspect = j.aspect?.trim() || aspect;
    if (j.prompt) setPrompt(j.prompt);
    if (j.aspect) setAspect(j.aspect);
    setError(null);
    setFailCreditState(null);
    setFailRetryAfterSec(null);
    // Pass overrides — setState is async; do not wait a tick that may still see old prompt.
    void generate({ prompt: nextPrompt, aspect: nextAspect });
  }

  function cancelInFlight() {
    const ctrl = abortRef.current;
    if (!ctrl) return;
    ctrl.abort();
    abortRef.current = null;
    // Create/Landing parity: settle immediately as unconfirmed until server echoes.
    setFailCreditState("refund unconfirmed");
    setError(
      "Canceled · ledger cancel best-effort · refund unconfirmed until balance confirms"
    );
  }

  async function generate(opts?: { prompt?: string; aspect?: string }) {
    const trimmed = (opts?.prompt ?? prompt).trim();
    const aspectUse = (opts?.aspect ?? aspect).trim() || aspect;
    if (trimmed.length < 4) {
      setError("Write a short prompt (at least 4 characters).");
      return;
    }
    abortRef.current?.abort();
    const abortCtrl = new AbortController();
    abortRef.current = abortCtrl;
    // One logical attempt — Retry mints a new key; auto-retry reuses this one.
    const idempotencyKey = mintImageIdempotencyKey();
    setBusy(true);
    setError(null);
    setFailRetryAfterSec(null);
    setFailCreditState(null);
    try {
      const result = await postImageWithRetry(
        { prompt: trimmed, aspect: aspectUse, idempotencyKey },
        { signal: abortCtrl.signal }
      );
      if (!result.ok) {
        const retryAfter =
          typeof result.retryAfterSec === "number" && result.retryAfterSec > 0
            ? result.retryAfterSec
            : null;
        setFailRetryAfterSec(retryAfter);
        // Shared settlement map (Create/Landing parity) — CONTENT_POLICY ·
        // PROVIDER_NETWORK · MODEL_EMPTY · TIMEOUT · cancel never invent restore.
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
        if (result.session) {
          setMe((prev) => mergeMeSession(prev, result.session as MeResponse));
        }
        setError(result.error || "Image generation failed");
        return;
      }
      const data = result.data;
      setImageUrl(data.imageUrl);
      setDemo(Boolean(data.demo));
      setDemoReason(
        typeof data.demoReason === "string" ? data.demoReason : null
      );
      const outcome =
        data.creditsOutcome === "0 cached" || data.creditsOutcome === "10 used"
          ? data.creditsOutcome
          : typeof data.costCredits === "number"
            ? data.costCredits === 0
              ? "0 cached"
              : `${data.costCredits} used`
            : null;
      // Idempotent replay honesty — same still, no second debit.
      setLastSettlement(
        data.idempotentReplay === true && outcome
          ? `${outcome} · replay`
          : outcome
      );
      // Authoritative session after still job — rehydrate freeTrial (badge honesty).
      if (data.session && typeof data.session === "object") {
        setMe((prev) => mergeMeSession(prev, data.session as MeResponse));
      }
      // Store live URLs + labeled demo placeholders so history stays honest.
      // Skip re-push on idempotent replay (same requestId / still).
      if (data.imageUrl && data.idempotentReplay !== true) {
        setHistory(
          pushImageHistory({
            imageUrl: data.imageUrl,
            prompt: trimmed,
            demo: Boolean(data.demo),
            costCredits:
              typeof data.costCredits === "number"
                ? data.costCredits
                : undefined,
            creditsOutcome:
              data.creditsOutcome === "0 cached" ||
              data.creditsOutcome === "10 used"
                ? data.creditsOutcome
                : undefined,
            requestId:
              typeof data.requestId === "string" ? data.requestId : undefined,
          })
        );
      }
    } catch (e) {
      setFailRetryAfterSec(null);
      setFailCreditState("refund unconfirmed");
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      if (abortRef.current === abortCtrl) abortRef.current = null;
      setBusy(false);
    }
  }

  return (
    <div>
      <Suspense
        fallback={
          <div className="border-b border-white/10 px-4 py-3 text-sm text-white/40">
            Generate · Stills
          </div>
        }
      >
        <GenerateSuiteChrome />
      </Suspense>
      <div className="px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="chip">🖼️ Optional support · Preview</span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Still studio
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--fg-muted)]">
              Optional packaging mock before video — not the product. Free plan
              keeps the Mini trial for{" "}
              <Link
                href={createRemixHref("360-spin-showcase")}
                className="text-[var(--mint)] underline-offset-2 hover:underline"
                data-image-create-video="remix"
              >
                Create video
              </Link>{" "}
              (stills stay labeled demo · 0 credits). Paid plans: Flux via fal (
              {CREDITS_PER_VIDEO} credits live). Hand a safe URL into Generate,
              Modules, or Seller Pack.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Link
              href={createRemixHref(
                IMAGE_HANDOFF_EFFECT,
                undefined,
                toySku.trim() || null
              )}
              className="btn btn-primary !px-3 !py-1.5 text-xs"
              data-image-handoff="create-header"
            >
              Generate video
            </Link>
            <GenerateAfterPath
              compact
              demo
              className="justify-end"
              sku={toySku || null}
              effectSlug={IMAGE_HANDOFF_EFFECT}
            />
          </div>
        </div>

        <div className="card mt-6 grid gap-5 p-5 sm:p-6 lg:grid-cols-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mint)]/80">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-[var(--mint)]/50 focus:shadow-[0_0_0_3px_rgba(200,255,61,0.1)]"
            />
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-white/35">
              Aspect
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
              {["1:1", "3:4", "16:9", "9:16"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAspect(r)}
                  className={`rounded-lg border px-2.5 py-1 font-semibold transition ${
                    aspect === r
                      ? "border-[var(--mint)]/50 bg-[var(--mint)]/12 text-[var(--mint)]"
                      : "border-white/10 text-[var(--fg-muted)] hover:border-white/25"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {busy ? (
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={cancelInFlight}
                  className="btn btn-ghost w-full border border-white/20"
                  title="Aborts this browser request. Soft-launch may still finish server-side."
                  data-image-cancel="settlement"
                >
                  Cancel request
                </button>
                <p className="text-center text-[10px] text-[var(--fg-dim)]">
                  Generating still… stops waiting in this tab. Live debit may
                  still settle — check balance before retry.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void generate()}
                className="btn btn-primary mt-4 w-full disabled:opacity-50"
              >
                {freeStillsDemoOnly
                  ? "Generate demo still · 0 credits"
                  : `Generate still · ${CREDITS_PER_VIDEO} credits`}
              </button>
            )}
            {freeStillsDemoOnly ? (
              <p className="mt-2 text-[11px] leading-relaxed text-[var(--fg-dim)]">
                Free Mini trial is video-only. Open{" "}
                <Link
                  href={createRemixHref(IMAGE_HANDOFF_EFFECT)}
                  className="text-[var(--mint)] underline-offset-2 hover:underline"
                  data-image-handoff="create-free-trial"
                >
                  Create
                </Link>{" "}
                for your Seedance clip, or{" "}
                <Link
                  href="/pricing"
                  className="text-[var(--mint)] underline-offset-2 hover:underline"
                >
                  upgrade
                </Link>{" "}
                for live Flux stills.
              </p>
            ) : null}
            {error ? (
              <GenerateFailPanel
                className="mt-3"
                message={error}
                creditState={failCreditState}
                creditsRestored={failCreditState === "10 restored"}
                retryAfterSec={failRetryAfterSec}
                compact
                onRetry={
                  !busy
                    ? () => {
                        setFailRetryAfterSec(null);
                        void generate();
                      }
                    : undefined
                }
                retryLabel="Retry still"
                showRecipes={false}
                showModules={false}
                showLabSample={false}
              />
            ) : null}
            {demo && (
              <p className="mt-2 text-xs text-[var(--fg-dim)]">
                {demoReason === "free_trial_video_only"
                  ? "Labeled demo — Free trial credits stay reserved for Create video Mini."
                  : demoReason === "no_provider_key"
                    ? "Demo placeholder — add FAL_KEY for Flux stills (paid plans)."
                    : "Demo placeholder — labeled 0 credits."}
              </p>
            )}
            {canHandOffStill(imageUrl) && (
              <div className="mt-3 flex flex-col gap-2">
                {(demo || lastSettlement) && (
                  <p className="text-center text-[11px] text-[var(--fg-dim)]">
                    {demo ? "Cached demo · 0 credits" : null}
                    {!demo && lastSettlement
                      ? `Settlement · ${lastSettlement}`
                      : null}
                  </p>
                )}
                <p className="text-center text-[10px] font-bold uppercase tracking-wider text-[var(--mint)]/70">
                  Delivery · next job
                </p>
                <Link
                  href={createRemixHref(
                    IMAGE_HANDOFF_EFFECT,
                    undefined,
                    toySku.trim() || null
                  )}
                  className="btn btn-primary w-full text-sm"
                  data-image-handoff="create"
                  onClick={() => stashPendingStill(imageUrl)}
                >
                  Animate in Generate →
                </Link>
                <Link
                  href={
                    toySku.trim()
                      ? `/create?mode=seller-pack&sku=${encodeURIComponent(toySku.trim().slice(0, 64))}`
                      : "/create?mode=seller-pack"
                  }
                  className="btn btn-ghost w-full text-sm"
                  data-image-handoff="seller-pack"
                  onClick={() => stashPendingStill(imageUrl)}
                >
                  Seller Pack · 3 clips →
                </Link>
                <Link
                  href="/modules"
                  className="btn btn-ghost w-full text-sm"
                  onClick={() => stashPendingStill(imageUrl)}
                >
                  Pick a Module job →
                </Link>
                <Link
                  href="/effects/360-spin-showcase"
                  className="btn btn-ghost w-full text-sm"
                  onClick={() => stashPendingStill(imageUrl)}
                >
                  Or spin on effect page →
                </Link>
                <GenerateAfterPath
                  demo={demo}
                  className="mt-1"
                  compact
                  sku={toySku || null}
                  effectSlug={IMAGE_HANDOFF_EFFECT}
                />
              </div>
            )}
          </div>
          <div className="media-stage relative grid min-h-[16rem] place-items-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-black/50 to-black/80 sm:min-h-[20rem]">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="generated still"
                className="max-h-[28rem] w-full object-contain"
              />
            ) : (
              <div className="p-8 text-center text-sm text-[var(--fg-dim)]">
                <p className="text-3xl" aria-hidden>
                  🧸
                </p>
                <p className="mt-2 font-semibold text-white/70">Still preview</p>
                <p className="mt-1 max-w-[14rem] text-[11px] leading-relaxed text-white/40">
                  Write a prompt · pick aspect · Generate still. Live uses Flux
                  when FAL_KEY is set; demos stay labeled.
                </p>
              </div>
            )}
            {imageUrl ? (
              <span
                className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                  demo
                    ? "border border-white/15 bg-black/60 text-white/70"
                    : "bg-[var(--mint)] text-black"
                }`}
              >
                {demo ? "Demo" : "Live still"}
              </span>
            ) : null}
          </div>
        </div>

        {sessionStillMeta && sessionStillMeta.total > 0 ? (
          <div
            className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3"
            data-image-session-ledger="process-memory"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Session still ledger · this instance
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/55">
              {sessionStillMeta.open > 0
                ? `${sessionStillMeta.open} open · `
                : ""}
              {sessionStillMeta.total} Flux process-memory job
              {sessionStillMeta.total === 1 ? "" : "s"}
              {sessionStillMeta.failed > 0 || sessionStillMeta.canceled > 0
                ? ` · ${sessionStillMeta.failed} failed · ${sessionStillMeta.canceled} canceled`
                : ""}
              {" · "}
              not multi-device cloud · TIMEOUT refund unconfirmed until balance
              confirms
            </p>
            {sessionStillJobs.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {sessionStillJobs.map((j) => (
                  <li
                    key={j.id}
                    className="flex flex-wrap items-center gap-2 text-[11px] text-white/60"
                    data-image-session-job={j.status}
                  >
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                        j.status === "succeeded"
                          ? "bg-[var(--mint)]/15 text-[var(--mint)]"
                          : j.status === "running"
                            ? "bg-amber-400/15 text-amber-100"
                            : j.status === "canceled"
                              ? "bg-white/10 text-white/50"
                              : "bg-red-400/15 text-red-200"
                      }`}
                    >
                      {j.status}
                    </span>
                    <span className="max-w-[14rem] truncate text-white/45 sm:max-w-xs">
                      {(j.prompt || j.id).slice(0, 48)}
                    </span>
                    {j.creditsOutcome ? (
                      <span className="text-white/35">{j.creditsOutcome}</span>
                    ) : null}
                    {j.errorCode ? (
                      <span className="text-amber-200/80">{j.errorCode}</span>
                    ) : null}
                    {j.status === "succeeded" && (j.imageUrl || j.hasImage) ? (
                      <button
                        type="button"
                        className="text-[var(--mint)] hover:underline"
                        data-image-session-open={j.id}
                        onClick={() => {
                          if (j.imageUrl) {
                            setImageUrl(j.imageUrl);
                            setDemo(Boolean(j.demo));
                            setLastSettlement(
                              j.creditsOutcome === "0 cached" ||
                                j.creditsOutcome === "10 used"
                                ? j.creditsOutcome
                                : null
                            );
                          } else {
                            // List omitted data: body — fetch single job for recovery.
                            void openSessionStill(j.id);
                          }
                        }}
                      >
                        Open
                      </button>
                    ) : null}
                    {j.status === "running" ? (
                      <button
                        type="button"
                        className="text-amber-100/90 hover:underline"
                        data-image-session-cancel={j.id}
                        title="Ledger cancel only — Flux may still finish server-side"
                        onClick={() => void cancelSessionStill(j.id)}
                      >
                        Cancel
                      </button>
                    ) : null}
                    {j.status === "failed" || j.status === "canceled" ? (
                      <button
                        type="button"
                        className="text-[var(--mint)] hover:underline"
                        data-image-session-retry={j.id}
                        disabled={busy}
                        onClick={() => retrySessionStill(j)}
                      >
                        Retry
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {history.length > 0 && (
          <div className="mt-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Recent stills</h2>
              <button
                type="button"
                className="text-xs text-[var(--fg-dim)] hover:text-[var(--brand)]"
                onClick={() => {
                  clearImageHistory();
                  setHistory([]);
                }}
              >
                Clear
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {history.map((h) => (
                <div key={h.id} className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={h.imageUrl}
                    alt=""
                    className="aspect-[3/4] w-full cursor-pointer rounded-lg object-cover ring-1 ring-[var(--border)] hover:ring-[var(--brand)]"
                    onClick={() => {
                      setImageUrl(h.imageUrl);
                      setDemo(Boolean(h.demo));
                      setDemoReason(h.demo ? "history" : null);
                      setLastSettlement(
                        h.creditsOutcome === "0 cached" ||
                          h.creditsOutcome === "10 used"
                          ? h.creditsOutcome
                          : h.demo
                            ? "0 cached"
                            : typeof h.costCredits === "number"
                              ? h.costCredits === 0
                                ? "0 cached"
                                : `${h.costCredits} used`
                              : null
                      );
                    }}
                  />
                  {h.demo && (
                    <span className="pointer-events-none absolute left-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold uppercase text-white/80">
                      demo
                    </span>
                  )}
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-white/80 opacity-0 transition group-hover:opacity-100"
                    onClick={() => setHistory(removeImageHistoryItem(h.id))}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-6 text-sm text-[var(--fg-muted)]">
          Have a real figure photo?{" "}
          <Link
            href={createRemixHref(IMAGE_HANDOFF_EFFECT)}
            className="font-semibold text-[var(--mint)] hover:underline"
            data-image-handoff="create-footer"
          >
            Animate it with Seedance
          </Link>
          {" · "}
          <Link href="/library" className="text-[var(--fg-dim)] hover:underline">
            Library
          </Link>
          {" · "}
          <Link href="/models" className="text-[var(--fg-dim)] hover:underline">
            Models honesty
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
