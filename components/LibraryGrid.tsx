"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/Toast";
import { interpretDownloadHead } from "@/lib/createTrust";
import { downloadVideoFile, privateDownloadHeaders } from "@/lib/history";
import { fetchMe, type MeResponse } from "@/lib/meClient";
import { createRemixHref, remixOptsFromRecord } from "@/lib/remixIntent";
import {
  acceptControlledLibraryNewAttemptUrl,
  libraryDurableTerminalFailureCopy,
  libraryNewAttemptButtonLabel,
} from "@/lib/privateGenerationResultsPure.mjs";
import {
  LIBRARY_EMPTY_GENERATE_HREF,
  LIBRARY_EMPTY_GENERATE_LABEL,
} from "@/lib/libraryEmpty";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

type JobCapabilities = {
  localRetry?: boolean;
  localCancel?: boolean;
  newAttempt?: boolean;
  refreshOnly?: boolean;
};

type GenerationJob = {
  id: string;
  requestId?: string;
  status: string;
  effect: string;
  demo?: boolean;
  owned?: boolean;
  downloadAllowed?: boolean;
  videoUrl?: string;
  /** Server-controlled relative Create URL for durable same-photo new attempt. */
  newAttemptUrl?: string;
  errorCode?: string;
  error?: string;
  createdAt?: string;
  duration?: number;
  aspectRatio?: string;
  durable?: boolean;
  adapter?: string;
  capabilities?: JobCapabilities;
};

type GenerationsResponse = {
  ok?: boolean;
  jobs?: GenerationJob[];
  open?: number;
};

const CREATE_MOMENT_HREF = `${MOMENT_CREATE_HREF}&source=library` as const;

function isOpen(status: string): boolean {
  return status === "queued" || status === "running";
}

function isRetryable(status: string): boolean {
  return status === "failed" || status === "canceled";
}

/** Process-memory Retry only — durable rows never call /api/generations/:id/retry. */
function canLocalRetry(job: GenerationJob): boolean {
  if (!isRetryable(job.status)) return false;
  if (job.durable === true || job.adapter === "supabase-private") return false;
  if (job.capabilities?.localRetry === false) return false;
  return job.capabilities?.localRetry === true || job.capabilities == null;
}

/** Process-memory Cancel only — durable open rows stay refresh/poll-only. */
function canLocalCancel(job: GenerationJob): boolean {
  if (!isOpen(job.status)) return false;
  if (job.durable === true || job.adapter === "supabase-private") return false;
  if (job.capabilities?.localCancel === false) return false;
  return job.capabilities?.localCancel === true || job.capabilities == null;
}

/** Durable terminal failure: honest Create/new-attempt, not process-memory Retry. */
function canNewAttempt(job: GenerationJob): boolean {
  if (!isRetryable(job.status)) return false;
  if (canLocalRetry(job)) return false;
  return (
    job.capabilities?.newAttempt === true ||
    job.durable === true ||
    job.adapter === "supabase-private"
  );
}

/**
 * Prefer the server-provided controlled Create link (asset-bound new attempt)
 * only after the strict client accept gate. Invalid/missing values fall back
 * to the honest generic Create path. Never invent client-side asset ids or
 * reuse old job idempotency keys.
 */
function acceptedSamePhotoHandoff(job: GenerationJob): string | undefined {
  return acceptControlledLibraryNewAttemptUrl(job.newAttemptUrl);
}

function newAttemptHref(job: GenerationJob): string {
  return acceptedSamePhotoHandoff(job) || CREATE_MOMENT_HREF;
}

function newAttemptLabel(job: GenerationJob): string {
  return libraryNewAttemptButtonLabel(Boolean(acceptedSamePhotoHandoff(job)));
}

function visibleAccountJob(job: GenerationJob): boolean {
  if (job.demo) return false;
  if (isOpen(job.status) || isRetryable(job.status)) return true;
  return (
    job.status === "succeeded" &&
    job.downloadAllowed === true &&
    Boolean(job.videoUrl)
  );
}

function jobStatus(status: string): {
  label: string;
  tone: string;
  dot: string;
} {
  if (status === "succeeded") {
    return {
      label: "Ready",
      tone: "text-[#c8ff3d]",
      dot: "bg-[#c8ff3d]",
    };
  }
  if (status === "running") {
    return {
      label: "Generating",
      tone: "text-sky-200",
      dot: "animate-pulse bg-sky-300",
    };
  }
  if (status === "queued") {
    return {
      label: "Preparing",
      tone: "text-sky-200",
      dot: "animate-pulse bg-sky-300",
    };
  }
  return {
    label: "Needs retry",
    tone: "text-amber-200",
    dot: "bg-amber-300",
  };
}

function effectName(effect: string): string {
  const known: Record<string, string> = {
    "street-power-up": "Street Power-Up",
    "360-spin-showcase": "360° Showcase",
    "listing-spin": "Listing Spin",
    "blind-box-reveal": "Blind-box Reveal",
    "social-flash": "Social Flash",
  };
  return (
    known[effect] ||
    effect
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") ||
    "Toy Moment"
  );
}

function friendlyFailure(job: GenerationJob): string {
  const durable = job.durable === true || job.adapter === "supabase-private";
  if (durable) {
    // Copy branches on the same client-accepted handoff URL as the CTA.
    return libraryDurableTerminalFailureCopy({
      status: job.status,
      errorCode: job.errorCode,
      samePhotoHandoff: Boolean(acceptedSamePhotoHandoff(job)),
    });
  }
  if (job.errorCode === "CONTENT_POLICY") {
    return "This image could not be processed. Try a clear product photo you own.";
  }
  if (
    job.errorCode === "TIMEOUT" ||
    job.errorCode === "PROVIDER_TIMEOUT" ||
    job.errorCode === "PROVIDER_NETWORK"
  ) {
    return "The render did not finish. Your completed results are safe; retry this Moment.";
  }
  if (job.status === "canceled") {
    return "This attempt was canceled. Start it again when you are ready.";
  }
  return "This render needs another attempt. Your other completed results are unchanged.";
}

function formatDate(value?: string): string {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function LibraryGrid() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [accountReady, setAccountReady] = useState(false);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [jobsReady, setJobsReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [forkingId, setForkingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const toast = useToast();

  const refreshJobs = useCallback(async () => {
    setRefreshing(true);
    try {
      const headers = await privateDownloadHeaders();
      const response = await fetch("/api/generations", {
        headers,
        cache: "no-store",
      });
      const body = (await response.json()) as GenerationsResponse;
      if (response.ok && body.ok && Array.isArray(body.jobs)) {
        setJobs(body.jobs.filter(visibleAccountJob));
      }
    } catch {
      toast("Could not refresh your results");
    } finally {
      setRefreshing(false);
      setJobsReady(true);
    }
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    void fetchMe()
      .then((result) => {
        if (cancelled) return;
        setMe(result);
        setAccountReady(true);
        if (result?.signedIn) void refreshJobs();
        else setJobsReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setAccountReady(true);
          setJobsReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshJobs]);

  const openCount = useMemo(
    () => jobs.filter((job) => isOpen(job.status)).length,
    [jobs]
  );

  const sortedJobs = useMemo(
    () =>
      [...jobs].sort((a, b) => {
        const aOpen = isOpen(a.status) ? 1 : 0;
        const bOpen = isOpen(b.status) ? 1 : 0;
        if (aOpen !== bOpen) return bOpen - aOpen;
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      }),
    [jobs]
  );

  useEffect(() => {
    if (!me?.signedIn || openCount === 0) return;
    const timer = window.setInterval(() => void refreshJobs(), 8000);
    return () => window.clearInterval(timer);
  }, [me?.signedIn, openCount, refreshJobs]);

  async function download(job: GenerationJob) {
    const id = (job.requestId || job.id || "").trim();
    if (!id) {
      toast("This result is not ready to download");
      return;
    }
    const gateUrl = `/api/downloads/${encodeURIComponent(id)}`;
    try {
      const headers = await privateDownloadHeaders();
      const head = await fetch(gateUrl, {
        method: "HEAD",
        headers,
        cache: "no-store",
      });
      const decision = interpretDownloadHead({
        status: head.status,
        code: head.headers.get("X-Pikbo-Download-Code"),
        t6Mode: head.headers.get("X-Pikbo-T6"),
      });
      if (decision.action !== "allow") {
        toast(
          decision.toast ||
            "This private result is not available yet. Refresh and try again."
        );
        return;
      }
      const result = await downloadVideoFile(
        gateUrl,
        `pikbo-${job.effect || "toy-moment"}.mp4`
      );
      if (result === "ok") toast("Download started");
      else if (result === "fallback") toast("Opened video — save it from your browser");
      else toast("Download could not start. Refresh and try again.");
    } catch {
      toast("Download could not start. Refresh and try again.");
    }
  }

  async function retry(job: GenerationJob) {
    setForkingId(job.id);
    try {
      const response = await fetch(
        `/api/generations/${encodeURIComponent(job.id)}/retry`,
        { method: "POST" }
      );
      const body = (await response.json()) as {
        ok?: boolean;
        message?: string;
        code?: string;
        next?: {
          createUi?: string;
          retryJobId?: string;
          retryToken?: string;
        };
      };
      if (!response.ok || !body.ok) {
        toast(body.message || "This Moment could not be prepared for retry");
        return;
      }
      if (body.next?.retryJobId && body.next.retryToken) {
        try {
          sessionStorage.setItem(
            `pikbo_retry_token:${body.next.retryJobId}`,
            body.next.retryToken
          );
        } catch {
          toast("Retry could not be prepared. Please try again.");
          return;
        }
      }
      const createUi =
        body.next?.createUi?.startsWith("/")
          ? body.next.createUi
          : createRemixHref(
              job.effect || "street-power-up",
              undefined,
              null,
              remixOptsFromRecord(job)
            );
      window.location.href = createUi;
    } catch {
      toast("Retry could not be prepared. Please try again.");
    } finally {
      setForkingId(null);
    }
  }

  async function cancel(job: GenerationJob) {
    setCancellingId(job.id);
    try {
      const response = await fetch(
        `/api/generations/${encodeURIComponent(job.id)}`,
        { method: "DELETE" }
      );
      const body = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !body.ok) {
        toast(body.message || "Could not cancel this render");
        return;
      }
      toast("Render canceled");
      await refreshJobs();
    } catch {
      toast("Could not cancel this render");
    } finally {
      setCancellingId(null);
    }
  }

  if (!accountReady || !jobsReady) {
    return (
      <div className="mt-6 grid min-h-64 place-items-center rounded-[1.75rem] border border-white/10 bg-white/[0.025]">
        <p className="text-sm font-semibold text-white/45">Loading your Library…</p>
      </div>
    );
  }

  if (!me?.signedIn) {
    return (
      <section
        className="mt-4 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#111113] sm:mt-6"
        data-library-state="guest"
      >
        <div className="grid place-items-center p-5 text-center sm:min-h-[18rem] sm:p-10">
          <div className="max-w-lg">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c8ff3d]">
              Private Library
            </p>
            <h2 className="mt-3 font-display text-2xl font-black tracking-[-0.04em] text-white sm:text-4xl">
              Sign in to see your generated Moments.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/52 sm:mt-3">
              Your real toy results belong to your account. Sample previews and
              browser-cached demos are not added to this Library.
            </p>
            <div className="mt-5 flex flex-col items-center gap-3 sm:mt-7">
              <Link
                href="/login?next=/library"
                className="btn btn-primary min-h-11 w-full max-w-xs justify-center text-sm sm:w-auto"
                data-library-empty-cta="sign-in"
              >
                Sign in to Library
              </Link>
              <Link
                href={LIBRARY_EMPTY_GENERATE_HREF}
                className="text-[11px] font-semibold text-white/40 underline-offset-2 transition hover:text-white/65 hover:underline"
                data-library-empty-cta="generate-secondary"
              >
                Preview {LIBRARY_EMPTY_GENERATE_LABEL}
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const isEmpty = sortedJobs.length === 0;

  return (
    <section
      className="mt-4 sm:mt-6"
      data-library-state={isEmpty ? "empty" : "filled"}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 sm:mb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c8ff3d]">
            {openCount > 0
              ? `${openCount} Moment${openCount === 1 ? "" : "s"} in progress`
              : `${sortedJobs.length} saved Moment${sortedJobs.length === 1 ? "" : "s"}`}
          </p>
          <p className="mt-1 text-xs text-white/45">
            Signed in as {me.auth?.email || "your Pikbo account"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refreshJobs()}
            disabled={refreshing}
            className="btn btn-ghost min-h-11 !px-4 !py-2 text-xs disabled:opacity-50"
            data-library-action="refresh"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          {/* Filled shelf only: empty keeps a single header Generate 360 above fold. */}
          {!isEmpty ? (
            <Link
              href={CREATE_MOMENT_HREF}
              className="btn btn-primary min-h-11 !px-4 !py-2 text-xs"
              data-library-action="generate-moment"
            >
              {LIBRARY_EMPTY_GENERATE_LABEL}
            </Link>
          ) : null}
        </div>
      </div>

      {isEmpty ? (
        <div
          className="rounded-[1.75rem] border border-white/10 bg-[#111113] p-5 text-center sm:min-h-[16rem] sm:p-10"
          data-library-empty="signed-in"
        >
          <div className="mx-auto max-w-lg">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF4ECD]">
              Empty collector shelf
            </p>
            <h2 className="mt-2 font-display text-2xl font-black tracking-[-0.04em] text-white sm:mt-3 sm:text-3xl">
              Your first real Moment starts with one toy photo.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/50 sm:mt-3">
              Generated results return here after refresh. Only private,
              downloadable account results are kept — never sample demos.
            </p>
            {/*
              Mobile: header already exposes the sole primary Generate 360 CTA.
              Keep a same-contract primary here for desktop/keyboard users only
              (sm+), so ~390px never shows two competing primary buttons.
            */}
            <Link
              href={LIBRARY_EMPTY_GENERATE_HREF}
              className="btn btn-primary mt-5 hidden min-h-11 text-sm sm:inline-flex"
              data-library-empty-cta="generate-panel"
            >
              {LIBRARY_EMPTY_GENERATE_LABEL}
            </Link>
            <p className="mt-4 text-[11px] font-semibold text-white/38 sm:hidden">
              Use{" "}
              <span className="text-white/55">{LIBRARY_EMPTY_GENERATE_LABEL}</span>{" "}
              above to start.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortedJobs.map((job) => {
            const status = jobStatus(job.status);
            const remixHref = createRemixHref(
              job.effect || "street-power-up",
              undefined,
              null,
              remixOptsFromRecord(job)
            );
            return (
              <article
                key={job.id}
                className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#111113] shadow-[0_24px_70px_-50px_rgba(0,0,0,0.95)]"
              >
                <div className="relative grid aspect-video place-items-center overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_50%_20%,rgba(200,255,61,0.12),transparent_55%),#09090a] text-center">
                  {job.status === "succeeded" && job.videoUrl ? (
                    <video
                      src={job.videoUrl}
                      controls
                      playsInline
                      preload="metadata"
                      aria-label={`${effectName(job.effect)} generated video`}
                      className="h-full w-full bg-black object-contain"
                    />
                  ) : (
                    <div className="p-6">
                      <span className={`mx-auto block h-2 w-2 rounded-full ${status.dot}`} />
                      <p className={`mt-3 text-xs font-black uppercase tracking-[0.18em] ${status.tone}`}>
                        {status.label}
                      </p>
                      <p className="mt-2 font-display text-2xl font-black tracking-[-0.03em] text-white">
                        {effectName(job.effect)}
                      </p>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-3 text-[11px] text-white/42">
                    <span>{formatDate(job.createdAt)}</span>
                    <span>
                      {[job.aspectRatio, job.duration ? `${job.duration}s` : null]
                        .filter(Boolean)
                        .join(" · ") || "Toy video"}
                    </span>
                  </div>

                  {isRetryable(job.status) ? (
                    <p className="mt-3 text-xs leading-5 text-amber-100/72">
                      {friendlyFailure(job)}
                    </p>
                  ) : null}

                  {isOpen(job.status) &&
                  (job.capabilities?.refreshOnly ||
                    job.durable ||
                    job.adapter === "supabase-private") &&
                  !canLocalCancel(job) ? (
                    <p className="mt-3 text-xs leading-5 text-sky-100/70">
                      Still generating. Refresh keeps this durable status in
                      sync — Cancel is only available for local in-progress
                      jobs.
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {job.status === "succeeded" ? (
                      <button
                        type="button"
                        onClick={() => void download(job)}
                        className="btn btn-primary min-h-11 flex-1 !px-4 !py-2 text-xs"
                      >
                        Download video
                      </button>
                    ) : null}
                    {isRetryable(job.status) && canLocalRetry(job) ? (
                      <button
                        type="button"
                        onClick={() => void retry(job)}
                        disabled={forkingId === job.id}
                        className="btn btn-primary min-h-11 flex-1 !px-4 !py-2 text-xs disabled:opacity-50"
                      >
                        {forkingId === job.id ? "Preparing…" : "Retry Moment"}
                      </button>
                    ) : null}
                    {canNewAttempt(job) ? (
                      <Link
                        href={newAttemptHref(job)}
                        className="btn btn-primary min-h-11 flex-1 !px-4 !py-2 text-center text-xs"
                        data-library-action="new-attempt"
                        data-library-new-attempt={
                          acceptedSamePhotoHandoff(job) ? "same-photo" : "generic"
                        }
                      >
                        {newAttemptLabel(job)}
                      </Link>
                    ) : null}
                    {isOpen(job.status) && canLocalCancel(job) ? (
                      <button
                        type="button"
                        onClick={() => void cancel(job)}
                        disabled={cancellingId === job.id}
                        className="btn btn-ghost min-h-11 !px-4 !py-2 text-xs disabled:opacity-50"
                      >
                        {cancellingId === job.id ? "Canceling…" : "Cancel"}
                      </button>
                    ) : null}
                    {!isOpen(job.status) && !canNewAttempt(job) ? (
                      <Link
                        href={remixHref}
                        className="btn btn-ghost min-h-11 flex-1 !px-4 !py-2 text-center text-xs"
                      >
                        Generate again
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
