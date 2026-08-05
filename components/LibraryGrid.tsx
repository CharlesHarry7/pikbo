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
  badge: string;
  statusCard: string;
  railLabel: string;
} {
  if (status === "succeeded") {
    return {
      label: "Ready",
      badge: "library-badge--ok",
      statusCard: "status-card--ok",
      railLabel: "Downloadable",
    };
  }
  if (status === "running") {
    return {
      label: "Generating",
      badge: "library-badge--progress",
      statusCard: "status-card--info",
      railLabel: "In progress",
    };
  }
  if (status === "queued") {
    return {
      label: "Preparing",
      badge: "library-badge--progress",
      statusCard: "status-card--info",
      railLabel: "Queued",
    };
  }
  return {
    label: "Needs retry",
    badge: "library-badge--err",
    statusCard: "status-card--err",
    railLabel: "Failed",
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

function ShelfIllustration() {
  return (
    <div className="library-shelf-illustration" aria-hidden>
      <span className="library-shelf-illustration__slot" />
      <span className="library-shelf-illustration__slot" />
      <span className="library-shelf-illustration__slot" />
    </div>
  );
}

export function LibraryGrid() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [accountReady, setAccountReady] = useState(false);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [jobsReady, setJobsReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [forkingId, setForkingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  // Keep selection valid as the list changes; default to the newest/open job.
  // Derived — avoid setState-in-effect cascading renders (react-hooks lint).
  const selectedJob = useMemo(() => {
    if (sortedJobs.length === 0) return null;
    return (
      sortedJobs.find((job) => job.id === selectedId) || sortedJobs[0] || null
    );
  }, [sortedJobs, selectedId]);
  const activeSelectedId = selectedJob?.id ?? null;

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
      <div className="collection-card mt-6 grid min-h-64 place-items-center">
        <p className="text-sm font-semibold text-[#0e0e12]/55">
          Opening your collector shelf…
        </p>
      </div>
    );
  }

  if (!me?.signedIn) {
    return (
      <section
        className="collection-card relative mt-6"
        data-library-state="guest"
      >
        <div className="grid min-h-[22rem] place-items-center p-6 text-center sm:p-10">
          <div className="max-w-lg">
            <ShelfIllustration />
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-[#a84578]">
              Private Library
            </p>
            <h2 className="mt-3 font-display text-3xl font-black tracking-[-0.04em] text-[#0e0e12] sm:text-4xl">
              Sign in to open your toy vault.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#0e0e12]/65">
              Real Moments belong to your account only. Sample previews and
              browser-cached demos never land on this shelf.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/login?next=/library" className="btn btn-primary text-sm">
                Sign in to Library
              </Link>
              <Link href={CREATE_MOMENT_HREF} className="btn btn-ghost text-sm">
                Preview Street Power-Up
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="mt-6"
      data-library-state={sortedJobs.length ? "filled" : "empty"}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`library-badge ${
                openCount > 0 ? "library-badge--progress" : "library-badge--ok"
              }`}
            >
              {openCount > 0
                ? `${openCount} in progress`
                : `${sortedJobs.length} saved`}
            </span>
            <span className="library-badge library-badge--muted">
              Collector shelf
            </span>
          </div>
          <p className="mt-2 text-xs text-white/45">
            Signed in as {me.auth?.email || "your Pikbo account"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refreshJobs()}
            disabled={refreshing}
            className="btn btn-ghost min-h-11 !px-4 !py-2 text-xs disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <Link
            href={CREATE_MOMENT_HREF}
            className="btn btn-primary min-h-11 !px-4 !py-2 text-xs"
          >
            Create new Moment
          </Link>
        </div>
      </div>

      {sortedJobs.length === 0 ? (
        <div className="collection-card relative grid min-h-[22rem] place-items-center p-6 text-center sm:p-10">
          <div className="max-w-lg">
            <ShelfIllustration />
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <span className="library-badge library-badge--muted">
                Empty shelf
              </span>
              <span className="library-badge library-badge--muted">
                One photo to start
              </span>
            </div>
            <h2 className="mt-4 font-display text-3xl font-black tracking-[-0.04em] text-[#0e0e12]">
              Your first real Moment starts with one toy photo.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#0e0e12]/62">
              Generated results return here after refresh. Only private,
              downloadable account results stay on this shelf.
            </p>
            <Link href={CREATE_MOMENT_HREF} className="btn btn-primary mt-7 text-sm">
              Create Street Power-Up
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
          {/* List — collection-card tiles */}
          <div className="motion-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {sortedJobs.map((job) => {
              const status = jobStatus(job.status);
              const selected = job.id === activeSelectedId;
              return (
                <div
                  key={job.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(job.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(job.id);
                    }
                  }}
                  className="collection-card w-full cursor-pointer p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#39ff14]"
                  data-selected={selected ? "true" : "false"}
                  aria-pressed={selected}
                  aria-label={`${effectName(job.effect)}, ${status.label}, ${formatDate(job.createdAt)}`}
                >
                  <div className="relative aspect-[16/10] overflow-hidden border-b border-[#ffb6d9]/50 bg-[#0e0e12]">
                    {job.status === "succeeded" && job.videoUrl ? (
                      <video
                        src={job.videoUrl}
                        muted
                        playsInline
                        preload="metadata"
                        tabIndex={-1}
                        aria-hidden
                        className="pointer-events-none h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_50%_20%,rgba(0,240,255,0.12),transparent_55%),#0e0e12]" />
                    )}
                    <span
                      className={`library-badge absolute left-2.5 top-2.5 ${status.badge} motion-state-in`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="p-3.5">
                    <p className="font-display text-base font-black tracking-[-0.03em] text-[#0e0e12]">
                      {effectName(job.effect)}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold text-[#0e0e12]/55">
                      <time dateTime={job.createdAt || undefined}>
                        {formatDate(job.createdAt)}
                      </time>
                      <span>
                        {[
                          job.aspectRatio,
                          job.duration ? `${job.duration}s` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Toy video"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail — result-card. Alias selectedJob as job so durable-library
              source contracts keep matching (void retry(job), canLocalRetry(job), …). */}
          {selectedJob
            ? (() => {
                const job = selectedJob;
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
                    className="result-card motion-state-in lg:sticky lg:top-6"
                    data-library-detail="true"
                  >
                    <div className="relative grid aspect-video place-items-center overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_50%_12%,rgba(57,255,20,0.12),transparent_52%),radial-gradient(circle_at_100%_0%,rgba(0,240,255,0.1),transparent_45%),#0a0614] text-center">
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
                          <span
                            className={`library-badge mx-auto ${status.badge} motion-state-in`}
                          >
                            {status.label}
                          </span>
                          <p className="mt-3 font-display text-2xl font-black tracking-[-0.03em] text-white">
                            {effectName(job.effect)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="p-4 sm:p-5">
                      <div
                        className={`status-card ${status.statusCard} motion-state-in`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/70">
                              {status.railLabel}
                            </p>
                            <p className="mt-1 font-display text-lg font-black tracking-[-0.03em] text-white">
                              {effectName(job.effect)}
                            </p>
                          </div>
                          <p className="text-[11px] font-semibold text-white/45">
                            {formatDate(job.createdAt)}
                            {job.aspectRatio || job.duration
                              ? ` · ${[
                                  job.aspectRatio,
                                  job.duration ? `${job.duration}s` : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      {isRetryable(job.status) ? (
                        <p className="mt-3 text-xs leading-5 text-[#ff4757]/90">
                          {friendlyFailure(job)}
                        </p>
                      ) : null}

                      {isOpen(job.status) &&
                      (job.capabilities?.refreshOnly ||
                        job.durable ||
                        job.adapter === "supabase-private") &&
                      !canLocalCancel(job) ? (
                        <p className="mt-3 text-xs leading-5 text-[#00f0ff]/85">
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
                            {forkingId === job.id
                              ? "Preparing…"
                              : "Retry Moment"}
                          </button>
                        ) : null}
                        {canNewAttempt(job) ? (
                          <Link
                            href={newAttemptHref(job)}
                            className="btn btn-primary min-h-11 flex-1 !px-4 !py-2 text-center text-xs"
                            data-library-action="new-attempt"
                            data-library-new-attempt={
                              acceptedSamePhotoHandoff(job)
                                ? "same-photo"
                                : "generic"
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
                            {cancellingId === job.id
                              ? "Canceling…"
                              : "Cancel"}
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

                      {/* Source photo slot — private inputs are not listed as URLs;
                          honest shelf frame until a controlled owner preview exists. */}
                      <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
                        <div
                          className="library-source-thumb grid place-items-center"
                          aria-hidden
                        >
                          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#ffb6d9]/90">
                            Toy
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
                            Original upload
                          </p>
                          <p className="mt-0.5 text-xs font-semibold leading-5 text-white/60">
                            Source photo stays private on your account — not
                            shown as a public URL.
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })()
            : null}
        </div>
      )}
    </section>
  );
}
