"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  downloadVideoFile,
  historyDownloadBlockReason,
  historyItemDownloadAllowed,
  LIBRARY_HISTORY_CHANGED_EVENT,
  loadHistory,
  privateDownloadHeaders,
  remoteClipMayExpire,
  removeHistoryItem,
  type HistoryItem,
} from "@/lib/history";
import { createLabSampleTryHref } from "@/lib/jobIntents";
import { createRemixHref, remixOptsFromRecord } from "@/lib/remixIntent";

const LIBRARY_LAB_SAMPLE_HREF = createLabSampleTryHref("scout");
import {
  freeLiveDownloadBlockReason,
  interpretDownloadHead,
  isPlayableResultVideoUrl,
  isSafeDeliverableUrl,
  isSessionGatedDownloadUrl,
  publicShareableVideoUrl,
} from "@/lib/createTrust";
import { useToast } from "@/components/Toast";
import { LibraryStorageBanner } from "@/components/LibraryStorageBanner";
import { PROVENANCE, resultProvenanceLabel } from "@/lib/provenance";
import { track } from "@/lib/analytics";

type KindFilter = "all" | "live" | "demo";
/** Assets-like: project = upload/remix group · sku = Toy Identity SKU · flat. */
type GroupMode = "flat" | "project" | "sku";

type SessionJob = {
  id: string;
  status: string;
  effect: string;
  demo?: boolean;
  downloadAllowed?: boolean;
  videoUrl?: string;
  creditsOutcome?: string;
  /** Server ledger code — TIMEOUT / CANCELED / provider codes. */
  errorCode?: string;
  creditsRefunded?: boolean;
  requestId?: string;
  error?: string;
  createdAt?: string;
  /** Server echo when job recorded from generate. */
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
  model?: string;
  watermark?: boolean;
};

type SessionByStatus = {
  queued: number;
  running: number;
  succeeded: number;
  failed: number;
  canceled: number;
};

type SessionJobsMeta = {
  byStatus: SessionByStatus;
  open: number;
  jobTimeoutMs: number | null;
  timedOutThisSweep: number;
  mode: string | null;
  /** Server newest-first page size (GET listLimit). */
  listLimit: number | null;
  /** How many job rows were returned this poll. */
  listed: number;
};

/** Match server SESSION_JOBS_LIST_LIMIT — do not silently drop to 12. */
const SESSION_JOBS_UI_LIMIT = 50;

/** Library sticky / empty Generate door — listing spin remix contract. */
const LIBRARY_GENERATE_HREF = createRemixHref("360-spin-showcase");

const EMPTY_BY_STATUS: SessionByStatus = {
  queued: 0,
  running: 0,
  succeeded: 0,
  failed: 0,
  canceled: 0,
};

function isCancellableSessionJob(status: string): boolean {
  return status === "queued" || status === "running";
}

function isCancellableStillJob(status: string): boolean {
  return status === "running" || status === "queued";
}

function statusTone(status: string): string {
  if (status === "succeeded") return "text-[var(--mint)]";
  if (status === "failed" || status === "canceled") return "text-amber-200";
  if (status === "running" || status === "queued") return "text-[var(--brand-2)]";
  return "text-[var(--fg-dim)]";
}

/** Library → Still studio handoff (prompt/aspect/job/retry for recovery). */
function createStillStudioHref(opts?: {
  prompt?: string;
  aspect?: string;
  jobId?: string;
  /** R1b exact retry child id (bearer lives in sessionStorage). */
  retryJobId?: string;
}): string {
  const sp = new URLSearchParams();
  const p = opts?.prompt?.trim();
  if (p && p.length >= 4) sp.set("prompt", p.slice(0, 500));
  const a = opts?.aspect?.trim();
  if (a) sp.set("aspect", a.slice(0, 16));
  const job = opts?.jobId?.trim();
  if (job) sp.set("job", job.slice(0, 128));
  const retry = opts?.retryJobId?.trim();
  if (retry && retry.length >= 8) sp.set("retryJobId", retry.slice(0, 128));
  const q = sp.toString();
  return q ? `/image?${q}` : "/image";
}

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
  requestId?: string;
};

type SessionStillMeta = {
  open: number;
  total: number;
  succeeded: number;
  failed: number;
  canceled: number;
  running: number;
  queued: number;
  jobTimeoutMs: number | null;
  listLimit: number | null;
  listed: number;
  mode: string | null;
};

const EMPTY_STILL_META: SessionStillMeta = {
  open: 0,
  total: 0,
  succeeded: 0,
  failed: 0,
  canceled: 0,
  running: 0,
  queued: 0,
  jobTimeoutMs: null,
  listLimit: SESSION_JOBS_UI_LIMIT,
  listed: 0,
  mode: null,
};

/**
 * Process-memory Flux still ledger (GET /api/image) — Library recovery parity
 * with video SessionJobsPanel. Not multi-node durable.
 */
function SessionStillJobsPanel({
  jobs,
  meta,
  cancellingId,
  forkingId,
  onCancel,
  onForkRetry,
  onRefresh,
}: {
  jobs: SessionStillJob[];
  meta: SessionStillMeta;
  cancellingId: string | null;
  forkingId: string | null;
  onCancel: (id: string) => void;
  onForkRetry: (id: string) => void;
  onRefresh: () => void;
}) {
  if (jobs.length === 0 && meta.total === 0) return null;
  const timeoutSec =
    typeof meta.jobTimeoutMs === "number" && meta.jobTimeoutMs > 0
      ? Math.round(meta.jobTimeoutMs / 1000)
      : null;
  const histogramTotal =
    meta.queued +
    meta.running +
    meta.succeeded +
    meta.failed +
    meta.canceled;

  return (
    <section
      className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
      data-library-panel="session-stills"
      data-session-stills-listed={meta.listed}
      id="library-session-stills-panel"
      tabIndex={-1}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--fg-dim)]">
            Session stills · Flux process-memory
            {meta.open > 0 ? (
              <span className="ml-1.5 font-bold text-[var(--mint)]">
                · {meta.open} open
              </span>
            ) : null}
            {meta.listed > 0 ? (
              <span className="ml-1.5 font-semibold text-white/45">
                · showing {meta.listed}
                {histogramTotal > meta.listed ? ` of ${histogramTotal}` : ""}
              </span>
            ) : null}
            <span className="ml-1.5 font-semibold text-white/40">
              · {meta.mode || "local-memory"} · not durable cloud
            </span>
          </p>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            Optional packaging stills from{" "}
            <Link href="/image" className="text-[var(--mint)] hover:underline">
              Still studio
            </Link>
            . A canceled request may still finish if rendering already started.
            Credit restoration is shown only after confirmation.
            {timeoutSec ? (
              <span className="text-[var(--fg-dim)]">
                {" "}
                Open stills time out after ~{timeoutSec}s without poll.
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            className="text-[11px] font-semibold text-[var(--fg-muted)] hover:text-white"
          >
            Refresh
          </button>
          <Link
            href="/image"
            className="text-[11px] font-semibold text-[var(--mint)] hover:underline"
            data-session-open-still="studio"
          >
            Open Still studio →
          </Link>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
        {(
          [
            ["queued", meta.queued],
            ["running", meta.running],
            ["succeeded", meta.succeeded],
            ["failed", meta.failed],
            ["canceled", meta.canceled],
          ] as const
        ).map(([label, n]) =>
          n > 0 ? (
            <span
              key={label}
              className={`rounded-full border border-white/10 bg-black/35 px-2 py-0.5 font-semibold tabular-nums ${statusTone(label)}`}
            >
              {label} {n}
            </span>
          ) : null
        )}
      </div>
      {jobs.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {jobs.map((j) => (
            <li
              key={j.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs"
              data-library-still-job={j.status}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-[var(--fg)]">
                  {(j.prompt || j.id).slice(0, 56)}{" "}
                  <span className={`font-normal ${statusTone(j.status)}`}>
                    · {j.status}
                    {j.creditsOutcome === "refund unconfirmed"
                      ? " · credit restoration pending"
                      : j.creditsOutcome
                        ? ` · ${j.creditsOutcome}`
                        : ""}
                  </span>
                </p>
                <p className="mt-0.5 truncate text-[10px] text-[var(--fg-dim)]">
                  {j.demo ? "Cached demo · 0 credits" : "Live Flux"}
                  {j.aspect ? ` · ${j.aspect}` : ""}
                  {j.creditsOutcome === "refund unconfirmed" ||
                  j.status === "canceled" ||
                  j.errorCode === "TIMEOUT" ||
                  j.errorCode === "CANCELED" ||
                  j.errorCode === "PROVIDER_NETWORK" ||
                  j.errorCode === "PROVIDER_TIMEOUT"
                    ? " · credit restoration pending"
                    : ""}
                </p>
                {j.error ? (
                  <p className="mt-0.5 truncate text-[10px] text-amber-100/80">
                    {j.error}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {j.status === "succeeded" && (j.imageUrl || j.hasImage) ? (
                  <Link
                    href={createStillStudioHref({ jobId: j.id })}
                    className="text-[var(--mint)] hover:underline"
                    data-library-still-open="job"
                  >
                    Open
                  </Link>
                ) : null}
                {j.status === "failed" || j.status === "canceled" ? (
                  <>
                    <Link
                      href={createStillStudioHref({
                        prompt: j.prompt,
                        aspect: j.aspect,
                      })}
                      className="text-[var(--mint)] hover:underline"
                      data-library-still-retry="prompt"
                      title="Opens Still studio with this prompt — Generate mints a new key"
                    >
                      Retry still
                    </Link>
                    <button
                      type="button"
                      disabled={
                        forkingId === j.id || cancellingId === j.id
                      }
                      onClick={() => onForkRetry(j.id)}
                      className="text-[var(--mint)]/90 hover:text-[var(--mint)] disabled:opacity-50"
                      data-library-still-retry="ledger-fork"
                      title="Prepare a new attempt, then open Still studio"
                    >
                      {forkingId === j.id ? "Preparing…" : "Retry request"}
                    </button>
                  </>
                ) : null}
                {isCancellableStillJob(j.status) ? (
                  <button
                    type="button"
                    disabled={cancellingId === j.id}
                    onClick={() => onCancel(j.id)}
                    className="text-amber-100/80 hover:text-amber-50 disabled:opacity-50"
                    data-library-still-cancel="ledger"
                    title="Stops waiting here; a render already in progress may still finish"
                  >
                    {cancellingId === j.id ? "Canceling…" : "Cancel request"}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** Phase D: process-memory ledger — must show even when device history is empty. */
function SessionJobsPanel({
  jobs,
  meta,
  cancellingId,
  forkingId,
  onCancel,
  onForkRetry,
  onRefresh,
  onDownload,
}: {
  jobs: SessionJob[];
  meta: SessionJobsMeta;
  cancellingId: string | null;
  /** Job id currently POSTing /api/generations/[id]/retry */
  forkingId: string | null;
  onCancel: (id: string) => void;
  /** Fork terminal failure into a new queued ledger row + Create remix UI */
  onForkRetry: (id: string) => void;
  onRefresh: () => void;
  /** HEAD gate then open — never raw <a> that dumps 403 JSON into a tab. */
  onDownload: (job: SessionJob) => void;
}) {
  if (jobs.length === 0) return null;
  const { byStatus, open, jobTimeoutMs, timedOutThisSweep, listed, listLimit } =
    meta;
  const hasDurablePrivate = meta.mode?.includes("supabase-private") === true;
  const timeoutMin =
    typeof jobTimeoutMs === "number" && jobTimeoutMs > 0
      ? Math.round(jobTimeoutMs / 60000)
      : null;
  const histogramTotal =
    byStatus.queued +
    byStatus.running +
    byStatus.succeeded +
    byStatus.failed +
    byStatus.canceled;
  const pageCap = listLimit ?? SESSION_JOBS_UI_LIMIT;
  const truncated = histogramTotal > listed && listed > 0;

  return (
    <section
      className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
      data-library-panel="session-jobs"
      data-session-list-limit={pageCap}
      data-session-listed={listed}
      id="library-session-jobs-panel"
      tabIndex={-1}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--fg-dim)]">
            {hasDurablePrivate ? "Private results" : "Current session"}
            {open > 0 ? (
              <span className="ml-1.5 font-bold text-[var(--mint)]">
                · {open} open
              </span>
            ) : null}
            {listed > 0 ? (
              <span className="ml-1.5 font-semibold text-white/45">
                · showing {listed}
                {histogramTotal > listed ? ` of ${histogramTotal}` : ""}
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            {hasDurablePrivate ? (
              <>
                Completed clips persist in your account and download through a
                fresh owner-only link. In-progress jobs remain visible here.
              </>
            ) : (
              <>
                Results saved below remain in this browser. Your device Library
                is{" "}
                <span className="font-semibold text-[var(--mint)]">
                  Saved on this device
                </span>{" "}
                only — empty until a clip is saved here.
              </>
            )}{" "}
            A canceled request may still finish if rendering already started.
            Credit restoration is shown only after confirmation.
            {timeoutMin ? (
              <span className="text-[var(--fg-dim)]">
                {" "}
                Open jobs time out after ~{timeoutMin}m without poll.
              </span>
            ) : null}
            {truncated ? (
              <span className="text-amber-100/75">
                {" "}
                Newest {pageCap} rows listed — histogram counts the full session
                ledger on this instance.
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            className="text-[11px] font-semibold text-[var(--fg-muted)] hover:text-white"
          >
            Refresh
          </button>
          <Link
            href={LIBRARY_GENERATE_HREF}
            className="text-[11px] font-semibold text-[var(--mint)] hover:underline"
            data-session-open-create="generate-remix"
          >
            Open Create →
          </Link>
        </div>
      </div>
      {/* Server byStatus histogram — recovery at a glance */}
      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
        {(
          [
            ["queued", byStatus.queued],
            ["running", byStatus.running],
            ["succeeded", byStatus.succeeded],
            ["failed", byStatus.failed],
            ["canceled", byStatus.canceled],
          ] as const
        ).map(([label, n]) =>
          n > 0 ? (
            <span
              key={label}
              className={`rounded-full border border-white/10 bg-black/35 px-2 py-0.5 font-semibold tabular-nums ${statusTone(label)}`}
            >
              {label} {n}
            </span>
          ) : null
        )}
        {timedOutThisSweep > 0 ? (
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 font-semibold text-amber-100">
            timeout sweep {timedOutThisSweep}
          </span>
        ) : null}
      </div>
      <ul className="mt-3 space-y-2">
        {jobs.map((j) => (
          <li
            key={j.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-[var(--fg)]">
                {j.effect}{" "}
                <span className={`font-normal ${statusTone(j.status)}`}>
                  · {j.status}
                  {j.creditsOutcome === "refund unconfirmed"
                    ? " · credit restoration pending"
                    : j.creditsOutcome
                      ? ` · ${j.creditsOutcome}`
                      : ""}
                </span>
              </p>
              <p className="mt-0.5 truncate text-[10px] text-[var(--fg-dim)]">
                {j.demo ? "Cached demo" : "Live"}
                {j.aspectRatio ? ` · ${j.aspectRatio}` : ""}
                {typeof j.duration === "number" ? ` · ${j.duration}s` : ""}
                {j.resolution ? ` · ${j.resolution}` : ""}
                {j.model ? ` · ${j.model.split("/").pop()}` : ""}
                {j.watermark ? " · on-player mark" : ""}
                {j.creditsRefunded === true ||
                j.creditsOutcome === "10 restored"
                  ? " · 10 restored"
                  : j.creditsOutcome === "refund unconfirmed" ||
                      j.status === "canceled" ||
                      j.errorCode === "TIMEOUT" ||
                      j.errorCode === "PROVIDER_TIMEOUT" ||
                      j.errorCode === "PROVIDER_NETWORK" ||
                      j.errorCode === "CANCELED" ||
                      j.errorCode === "REQUEST_CANCELED" ||
                      j.errorCode === "UNSAFE_URL" ||
                      j.errorCode === "CONTENT_POLICY" ||
                      j.errorCode === "MODEL_EMPTY"
                    ? " · credit restoration pending"
                    : ""}
              </p>
              {j.error || j.status === "canceled" ? (
                <p className="mt-0.5 truncate text-[10px] text-amber-100/80">
                  {j.errorCode === "TIMEOUT" ||
                  j.errorCode === "PROVIDER_TIMEOUT"
                    ? "Timed out — retry from Create after checking your balance."
                    : j.status === "canceled" ||
                        j.errorCode === "CANCELED" ||
                        j.errorCode === "REQUEST_CANCELED"
                      ? "Canceled — check your balance before starting another attempt."
                      : j.errorCode === "PROVIDER_NETWORK"
                        ? "Network issue — retry from Create after checking your balance."
                        : j.error}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link
                href={createRemixHref(
                  j.effect,
                  undefined,
                  null,
                  remixOptsFromRecord(j)
                )}
                className="text-[var(--mint)] hover:underline"
                data-session-remake="remix"
                data-session-remake-params="job"
              >
                {j.status === "failed" || j.status === "canceled"
                  ? "Retry recipe"
                  : "Use recipe"}
              </Link>
              {j.status === "failed" || j.status === "canceled" ? (
                <button
                  type="button"
                  disabled={forkingId === j.id || cancellingId === j.id}
                  onClick={() => onForkRetry(j.id)}
                  className="text-[var(--mint)]/90 hover:text-[var(--mint)] disabled:opacity-50"
                  data-session-retry="ledger-fork"
                  title="Prepare a new attempt, then open Create"
                >
                  {forkingId === j.id ? "Preparing…" : "Retry request"}
                </button>
              ) : null}
              {(j.status === "failed" || j.status === "canceled") &&
              (j.creditsOutcome === "refund unconfirmed" ||
                j.errorCode === "TIMEOUT" ||
                j.errorCode === "PROVIDER_TIMEOUT" ||
                j.errorCode === "PROVIDER_NETWORK" ||
                j.errorCode === "CONTENT_POLICY" ||
                j.errorCode === "UNSAFE_URL" ||
                j.errorCode === "MODEL_EMPTY" ||
                j.errorCode === "CANCELED" ||
                j.errorCode === "REQUEST_CANCELED" ||
                j.status === "canceled") ? (
                <Link
                  href={LIBRARY_LAB_SAMPLE_HREF}
                  className="text-white/55 hover:text-white hover:underline"
                  title="Lab sample · 0 credits if live is blocked"
                  data-session-lab="sample"
                >
                  Lab sample
                </Link>
              ) : null}
              {isCancellableSessionJob(j.status) ? (
                <button
                  type="button"
                  disabled={cancellingId === j.id}
                  onClick={() => onCancel(j.id)}
                  className="text-amber-100/80 hover:text-amber-50 disabled:opacity-50"
                  title="Stops waiting here; a render already in progress may still finish"
                >
                  {cancellingId === j.id ? "Canceling…" : "Cancel request"}
                </button>
              ) : null}
              {j.status === "succeeded" && j.downloadAllowed && j.videoUrl ? (
                <button
                  type="button"
                  onClick={() => onDownload(j)}
                  className="text-[var(--fg-muted)] hover:text-white"
                  title="Open after delivery and ownership checks"
                  data-session-download="gated"
                >
                  Download
                </button>
              ) : j.status === "succeeded" && !j.downloadAllowed ? (
                <span
                  className="text-amber-100/70"
                  title="This raw preview is not available for download"
                >
                  Download blocked · Free raw
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LibraryGrid() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [sort, setSort] = useState<"new" | "name">("new");
  /** Wave A: group device-local clips by remix/sample project key */
  const [groupMode, setGroupMode] = useState<GroupMode>("project");
  const [sessionJobs, setSessionJobs] = useState<SessionJob[]>([]);
  const [sessionMeta, setSessionMeta] = useState<SessionJobsMeta>({
    byStatus: EMPTY_BY_STATUS,
    open: 0,
    jobTimeoutMs: null,
    timedOutThisSweep: 0,
    mode: null,
    listLimit: SESSION_JOBS_UI_LIMIT,
    listed: 0,
  });
  /** Process-memory Flux stills (GET /api/image) — video ledger parity. */
  const [sessionStills, setSessionStills] = useState<SessionStillJob[]>([]);
  const [sessionStillMeta, setSessionStillMeta] =
    useState<SessionStillMeta>(EMPTY_STILL_META);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancellingStillId, setCancellingStillId] = useState<string | null>(
    null
  );
  const [forkingId, setForkingId] = useState<string | null>(null);
  const [forkingStillId, setForkingStillId] = useState<string | null>(null);
  const toast = useToast();

  function applyGenerationsBody(body: {
    ok?: boolean;
    jobs?: SessionJob[];
    byStatus?: Partial<SessionByStatus>;
    open?: number;
    jobTimeoutMs?: number;
    timedOutThisSweep?: number;
    mode?: string;
    listLimit?: number;
    listed?: number;
  }) {
    if (!body?.ok || !Array.isArray(body.jobs)) return;
    // Honor server page (≤ SESSION_JOBS_UI_LIMIT) — do not silently drop to 12.
    const page =
      typeof body.listLimit === "number" && body.listLimit > 0
        ? Math.min(body.listLimit, SESSION_JOBS_UI_LIMIT)
        : SESSION_JOBS_UI_LIMIT;
    const jobs = body.jobs.slice(0, page);
    setSessionJobs(jobs);
    const bs = body.byStatus ?? {};
    const byStatus: SessionByStatus = {
      queued: Number(bs.queued) || 0,
      running: Number(bs.running) || 0,
      succeeded: Number(bs.succeeded) || 0,
      failed: Number(bs.failed) || 0,
      canceled: Number(bs.canceled) || 0,
    };
    const openFromServer =
      typeof body.open === "number"
        ? body.open
        : byStatus.queued + byStatus.running;
    setSessionMeta({
      byStatus,
      open: openFromServer,
      jobTimeoutMs:
        typeof body.jobTimeoutMs === "number" ? body.jobTimeoutMs : null,
      timedOutThisSweep:
        typeof body.timedOutThisSweep === "number"
          ? body.timedOutThisSweep
          : 0,
      mode: typeof body.mode === "string" ? body.mode : null,
      listLimit: page,
      listed:
        typeof body.listed === "number" && body.listed >= 0
          ? Math.min(body.listed, jobs.length)
          : jobs.length,
    });
  }

  useEffect(() => {
    const refreshDeviceHistory = () => setItems(loadHistory());
    const t = window.setTimeout(() => {
      refreshDeviceHistory();
      setReady(true);
    }, 0);
    window.addEventListener(
      LIBRARY_HISTORY_CHANGED_EVENT,
      refreshDeviceHistory
    );
    return () => {
      window.clearTimeout(t);
      window.removeEventListener(
        LIBRARY_HISTORY_CHANGED_EVENT,
        refreshDeviceHistory
      );
    };
  }, []);

  async function refreshSessionJobs() {
    try {
      const headers = await privateDownloadHeaders();
      const r = await fetch("/api/generations", {
        headers,
        cache: "no-store",
      });
      const body = (await r.json()) as Parameters<typeof applyGenerationsBody>[0];
      applyGenerationsBody(body);
    } catch {
      /* ignore */
    }
  }

  function applyImageJobsBody(body: {
    ok?: boolean;
    jobs?: SessionStillJob[];
    byStatus?: {
      queued?: number;
      running?: number;
      succeeded?: number;
      failed?: number;
      canceled?: number;
    };
    open?: number;
    total?: number;
    jobTimeoutMs?: number;
    mode?: string;
    listLimit?: number;
    listed?: number;
  }) {
    if (!body?.ok || !Array.isArray(body.jobs)) return;
    const page =
      typeof body.listLimit === "number" && body.listLimit > 0
        ? Math.min(body.listLimit, SESSION_JOBS_UI_LIMIT)
        : SESSION_JOBS_UI_LIMIT;
    const jobs = body.jobs.slice(0, page);
    setSessionStills(jobs);
    const bs = body.byStatus ?? {};
    const queued = Number(bs.queued) || 0;
    const running = Number(bs.running) || 0;
    const succeeded = Number(bs.succeeded) || 0;
    const failed = Number(bs.failed) || 0;
    const canceled = Number(bs.canceled) || 0;
    const openFromServer =
      typeof body.open === "number" ? body.open : queued + running;
    setSessionStillMeta({
      open: openFromServer,
      total:
        typeof body.total === "number"
          ? body.total
          : queued + running + succeeded + failed + canceled,
      queued,
      running,
      succeeded,
      failed,
      canceled,
      jobTimeoutMs:
        typeof body.jobTimeoutMs === "number" ? body.jobTimeoutMs : null,
      mode: typeof body.mode === "string" ? body.mode : null,
      listLimit: page,
      listed:
        typeof body.listed === "number" && body.listed >= 0
          ? Math.min(body.listed, jobs.length)
          : jobs.length,
    });
  }

  async function refreshSessionStills() {
    try {
      const r = await fetch("/api/image", { cache: "no-store" });
      const body = (await r.json()) as Parameters<typeof applyImageJobsBody>[0];
      applyImageJobsBody(body);
    } catch {
      /* ignore */
    }
  }

  // Phase D: process-memory job ledger for this browser session (refresh recovery).
  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      void privateDownloadHeaders()
        .then((headers) =>
          fetch("/api/generations", { headers, cache: "no-store" })
        )
        .then((r) => r.json())
        .then((body: Parameters<typeof applyGenerationsBody>[0]) => {
          if (cancelled) return;
          applyGenerationsBody(body);
        })
        .catch(() => undefined);
      void fetch("/api/image", { cache: "no-store" })
        .then((r) => r.json())
        .then((body: Parameters<typeof applyImageJobsBody>[0]) => {
          if (cancelled) return;
          applyImageJobsBody(body);
        })
        .catch(() => undefined);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  // Poll while any job is still open so TIMEOUT/cancel/success surfaces without reload.
  useEffect(() => {
    const open =
      sessionMeta.open > 0 ||
      sessionJobs.some((j) => isCancellableSessionJob(j.status));
    if (!open) return;
    const t = window.setInterval(() => {
      void privateDownloadHeaders()
        .then((headers) =>
          fetch("/api/generations", { headers, cache: "no-store" })
        )
        .then((r) => r.json())
        .then((body: Parameters<typeof applyGenerationsBody>[0]) => {
          applyGenerationsBody(body);
        })
        .catch(() => undefined);
    }, 8000);
    return () => window.clearInterval(t);
  }, [sessionJobs, sessionMeta.open]);

  // Legacy still ledger currently touches its TTL. Video generation polls are
  // read-only and use fixed deadlineAt (R1b); image parity is a later change.
  useEffect(() => {
    const open =
      sessionStillMeta.open > 0 ||
      sessionStills.some((j) => isCancellableStillJob(j.status));
    if (!open) return;
    const t = window.setInterval(() => {
      void fetch("/api/image", { cache: "no-store" })
        .then((r) => r.json())
        .then((body: Parameters<typeof applyImageJobsBody>[0]) => {
          applyImageJobsBody(body);
        })
        .catch(() => undefined);
    }, 8000);
    return () => window.clearInterval(t);
  }, [sessionStills, sessionStillMeta.open]);


  async function downloadSessionJob(job: SessionJob) {
    const id = (job.requestId || job.id || "").trim();
    if (!id) {
      if (job.videoUrl && isSafeDeliverableUrl(job.videoUrl)) {
        const name = `pikbo-session-${(job.effect || "clip").slice(0, 24)}.mp4`;
        const result = await downloadVideoFile(job.videoUrl, name);
        if (result === "ok") toast("Download started");
        else if (result === "fallback") toast("Opened video — save from browser");
        else if (result === "unsafe") toast("Unsafe deliverable URL — download blocked");
        else if (result === "blocked") toast("Download blocked — no file");
        else toast("Download failed");
        return;
      }
      toast("No download id for this session job");
      return;
    }
    const gateUrl = `/api/downloads/${encodeURIComponent(id)}`;
    try {
      const headers = await privateDownloadHeaders();
      const head = await fetch(gateUrl, { method: "HEAD", headers });
      const decision = interpretDownloadHead({
        status: head.status,
        code: head.headers.get("X-Pikbo-Download-Code"),
        t6Mode: head.headers.get("X-Pikbo-T6"),
      });
      if (decision.action === "block") {
        toast(decision.toast);
        return;
      }
      if (decision.action === "allow") {
        track({
          event: "export_click",
          path: "/library",
          recipe: job.effect,
          demo: Boolean(job.demo),
          meta: {
            via: "downloads_api_blob",
            surface: "session_jobs",
            head: "allowed",
          },
        });
        // Blob path — never window.open /api/downloads (JSON error tabs).
        const name = `pikbo-session-${(job.effect || "clip").slice(0, 24)}.mp4`;
        const result = await downloadVideoFile(gateUrl, name);
        if (result === "ok") toast("Download started");
        else if (result === "fallback") toast("Opened video — save from browser");
        else if (result === "blocked" || result === "unsafe") {
          toast("Download blocked by a delivery safety check");
        } else toast("Download failed");
        return;
      }
      if (decision.action === "fallthrough" && decision.toast) {
        toast(decision.toast);
      }
    } catch {
      /* network */
    }
    // Last resort: demo direct URL only — never open gate GET as a tab.
    if (job.videoUrl && isSafeDeliverableUrl(job.videoUrl) && job.demo) {
      const name = `pikbo-session-${(job.effect || "clip").slice(0, 24)}.mp4`;
      const result = await downloadVideoFile(job.videoUrl, name);
      if (result === "ok") toast("Download started");
      else if (result === "fallback") toast("Opened video — save from browser");
      else toast("Download failed");
      return;
    }
    toast("Download gate unreachable — remake or try again");
  }

  async function cancelSessionJob(id: string) {
    setCancellingId(id);
    try {
      const res = await fetch(`/api/generations/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const body = (await res.json()) as {
        ok?: boolean;
        message?: string;
        note?: string;
        code?: string;
        creditsOutcome?: string;
        refundUnconfirmed?: boolean;
      };
      if (!res.ok || !body.ok) {
        toast(body.message || body.code || "Could not cancel job");
      } else if (
        body.refundUnconfirmed === true ||
        body.creditsOutcome === "refund unconfirmed"
      ) {
        // Server DELETE echoes unconfirmed — never invent "10 restored".
        toast(
          "Request canceled · credit restoration pending; a render already in progress may still complete"
        );
      } else {
        toast(
          body.note ||
            "Request canceled · a render already in progress may still complete"
        );
      }
      await refreshSessionJobs();
    } catch {
      toast("Network error canceling job");
    } finally {
      setCancellingId(null);
    }
  }

  async function cancelSessionStill(id: string) {
    setCancellingStillId(id);
    try {
      const res = await fetch(`/api/image/${encodeURIComponent(id)}`, {
        method: "DELETE",
        cache: "no-store",
      });
      const body = (await res.json()) as {
        ok?: boolean;
        message?: string;
        note?: string;
        code?: string;
        creditsOutcome?: string;
        refundUnconfirmed?: boolean;
      };
      if (!res.ok || !body.ok) {
        toast(body.message || body.code || "Could not cancel still");
      } else if (
        body.refundUnconfirmed === true ||
        body.creditsOutcome === "refund unconfirmed"
      ) {
        toast(
          "Still request canceled · credit restoration pending; a render already in progress may still complete"
        );
      } else {
        toast(
          body.note ||
            "Still request canceled · a render already in progress may still complete"
        );
      }
      await refreshSessionStills();
    } catch {
      toast("Network error canceling still");
    } finally {
      setCancellingStillId(null);
    }
  }

  /**
   * POST /api/image/[id]/retry forks a queued child (failed|canceled only).
   * Navigate to imageUi handoff — does not re-run Flux.
   */
  async function forkSessionStillRetry(id: string) {
    setForkingStillId(id);
    try {
      const res = await fetch(
        `/api/image/${encodeURIComponent(id)}/retry`,
        { method: "POST", cache: "no-store" }
      );
      const body = (await res.json()) as {
        ok?: boolean;
        message?: string;
        code?: string;
        next?: {
          imageUi?: string;
          prompt?: string;
          aspect?: string;
          retryJobId?: string;
          retryToken?: string;
        };
      };
      if (!res.ok || !body.ok) {
        const code = body.code || "";
        if (code === "JOB_IN_FLIGHT") {
          toast(
            body.message ||
              "This still is still in progress — wait or cancel the request first"
          );
        } else if (code === "NOT_RETRYABLE") {
          toast(
            body.message ||
              "This still cannot be retried here — open Still studio"
          );
        } else {
          toast(body.message || body.code || "Could not fork still retry");
        }
        return;
      }
      toast(
        body.message ||
          "New still attempt prepared · open Still studio to continue"
      );
      await refreshSessionStills();
      const parent = sessionStills.find((j) => j.id === id);
      if (
        typeof body.next?.retryJobId === "string" &&
        typeof body.next?.retryToken === "string"
      ) {
        try {
          sessionStorage.setItem(
            `pikbo_retry_token:${body.next.retryJobId}`,
            body.next.retryToken
          );
        } catch {
          toast("Retry could not be prepared — choose Retry request again");
          return;
        }
      }
      // Prefer server imageUi; fall back to prompt/aspect + exact child id.
      const imageUi =
        typeof body.next?.imageUi === "string" &&
        body.next.imageUi.startsWith("/image")
          ? body.next.imageUi
          : createStillStudioHref({
              prompt:
                typeof body.next?.prompt === "string"
                  ? body.next.prompt
                  : parent?.prompt,
              aspect:
                typeof body.next?.aspect === "string"
                  ? body.next.aspect
                  : parent?.aspect,
              retryJobId: body.next?.retryJobId,
            });
      window.location.href = imageUi;
    } catch {
      toast("Network error forking still retry");
    } finally {
      setForkingStillId(null);
    }
  }

  /**
   * Phase D: POST /api/generations/[id]/retry forks a queued child (failed|canceled
   * only). Navigate to createUi remix path — does not re-run the provider.
   */
  async function forkSessionRetry(id: string) {
    setForkingId(id);
    try {
      const res = await fetch(
        `/api/generations/${encodeURIComponent(id)}/retry`,
        { method: "POST" }
      );
      const body = (await res.json()) as {
        ok?: boolean;
        message?: string;
        code?: string;
        next?: {
          createUi?: string;
          retryJobId?: string;
          retryToken?: string;
        };
      };
      if (!res.ok || !body.ok) {
        const code = body.code || "";
        if (code === "JOB_IN_FLIGHT") {
          toast(
            body.message ||
              "This job is still in progress — wait or cancel the request first"
          );
        } else if (code === "NOT_RETRYABLE") {
          toast(
            body.message ||
              "This job cannot be retried here — open Create for a new attempt"
          );
        } else {
          toast(body.message || body.code || "Could not fork retry job");
        }
        return;
      }
      toast(
        body.message ||
          "New attempt prepared · open Create with your photo to continue"
      );
      await refreshSessionJobs();
      const parentJob = sessionJobs.find((j) => j.id === id);
      const createUi =
        typeof body.next?.createUi === "string" && body.next.createUi.startsWith("/")
          ? body.next.createUi
          : createRemixHref(
              parentJob?.effect || "360-spin-showcase",
              undefined,
              null,
              parentJob ? remixOptsFromRecord(parentJob) : undefined
            );
      if (
        typeof body.next?.retryJobId === "string" &&
        typeof body.next?.retryToken === "string"
      ) {
        try {
          sessionStorage.setItem(
            `pikbo_retry_token:${body.next.retryJobId}`,
            body.next.retryToken
          );
        } catch {
          toast("Retry token could not be stored — choose Retry again");
          return;
        }
      }
      window.location.href = createUi;
    } catch {
      toast("Network error forking retry job");
    } finally {
      setForkingId(null);
    }
  }

  const effectNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of items) map.set(i.effect, i.effectName);
    return [...map.entries()];
  }, [items]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let list = items;
    if (kind === "live") list = list.filter((i) => !i.demo);
    if (kind === "demo") list = list.filter((i) => i.demo);
    if (q) {
      list = list.filter(
        (i) =>
          i.effectName.toLowerCase().includes(q) ||
          i.effect.toLowerCase().includes(q) ||
          (i.projectName || "").toLowerCase().includes(q) ||
          (i.projectId || "").toLowerCase().includes(q) ||
          (i.sourceProject || "").toLowerCase().includes(q) ||
          (i.sku || "").toLowerCase().includes(q)
      );
    }
    if (sort === "name") {
      list = [...list].sort((a, b) =>
        a.effectName.localeCompare(b.effectName)
      );
    }
    return list;
  }, [items, filter, sort, kind]);

  /** Group by device-local project or SKU; never imply cloud sync. */
  const grouped = useMemo(() => {
    if (groupMode === "flat") {
      return [
        { key: "all", label: "All clips", input: undefined as string | undefined, items: filtered },
      ];
    }
    const map = new Map<string, HistoryItem[]>();
    for (const item of filtered) {
      let key: string;
      if (groupMode === "sku") {
        const sku = item.sku?.trim();
        key = sku ? `sku:${sku}` : "__no_sku__";
      } else {
        key =
          item.projectId?.trim() ||
          item.sourceProject?.trim() ||
          `legacy-${item.effect}`;
      }
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()]
      .map(([key, groupItems]) => {
        const input = groupItems.find((item) => item.inputImage)?.inputImage;
        if (groupMode === "sku") {
          return {
            key,
            label:
              key === "__no_sku__"
                ? "No SKU · set Name/SKU on Create"
                : `SKU · ${key.replace(/^sku:/, "")}`,
            input,
            items: groupItems,
          };
        }
        const named = groupItems.find((item) => item.projectName)?.projectName;
        return {
          key,
          label:
            named ||
            (key.includes("lab-sample-")
              ? `PIKBO Lab sample · ${key.split("lab-sample-").pop()}`
              : key.startsWith("legacy-")
                ? `Legacy project · ${groupItems[0]?.effectName ?? "clip"}`
                : `Owned toy project · ${key.replace(/^local-/, "")}`),
          input,
          items: groupItems,
        };
      })
      .sort((a, b) => {
        // SKU: put "No SKU" last; otherwise alpha.
        if (groupMode === "sku") {
          if (a.key === "__no_sku__") return 1;
          if (b.key === "__no_sku__") return -1;
        }
        return a.label.localeCompare(b.label);
      });
  }, [filtered, groupMode]);

  async function copyLink(url: string) {
    // Session-gated /api/downloads is cookie-bound — not a portable public link.
    const share = publicShareableVideoUrl(
      url,
      typeof window !== "undefined" ? window.location.origin : undefined
    );
    if (!share) {
      toast(
        isSessionGatedDownloadUrl(url)
          ? "Session download only — use Download (not a public link)"
          : "Unsafe deliverable URL — not copied"
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(share);
      toast("Link copied");
    } catch {
      toast("Could not copy");
    }
  }

  async function downloadClip(item: HistoryItem) {
    if (!historyItemDownloadAllowed(item)) {
      toast(historyDownloadBlockReason());
      return;
    }
    const name = `pikbo-${item.effect}-${item.id.slice(0, 8)}.mp4`;
    // Prefer controlled download endpoint when we have a server job / request id.
    // HEAD first so Free-blocked / expired process-memory jobs never open a dead tab.
    // Allowed GET always goes through downloadVideoFile (blob) — never window.open
    // /api/downloads (403/409 JSON tabs).
    if (item.requestId) {
      const gateUrl = `/api/downloads/${encodeURIComponent(item.requestId)}`;
      try {
        const head = await fetch(gateUrl, { method: "HEAD" });
        const decision = interpretDownloadHead({
          status: head.status,
          code: head.headers.get("X-Pikbo-Download-Code"),
          t6Mode: head.headers.get("X-Pikbo-T6"),
        });
        if (decision.action === "block") {
          toast(decision.toast);
          return;
        }
        if (decision.action === "fallthrough") {
          if (decision.toast) toast(decision.toast);
          // Fall through to direct only for demos/paid with a known URL.
        } else if (decision.action === "allow") {
          track({
            event: "export_click",
            path: "/library",
            recipe: item.effect,
            demo: Boolean(item.demo),
            meta: {
              via: "downloads_api_blob",
              sku: item.sku || null,
              head: "allowed",
            },
          });
          const result = await downloadVideoFile(gateUrl, name);
          if (result === "ok") toast("Download started");
          else if (result === "fallback") toast("Opened video — save from browser");
          else if (result === "blocked" || result === "unsafe") {
            toast("Download blocked by a delivery safety check");
          } else toast("Download failed");
          return;
        }
      } catch {
        /* network — try direct below when safe */
      }
    }
    track({
      event: "export_click",
      path: "/library",
      recipe: item.effect,
      demo: Boolean(item.demo),
      meta: {
        via: item.requestId ? "direct_after_gate" : "direct",
        sku: item.sku || null,
      },
    });
    // Never window.open /api/downloads — blob or honest fail only.
    if (!item.videoUrl) {
      toast(
        item.requestId
          ? "Download gate unreachable — remake or try again"
          : "No video URL for this history item"
      );
      return;
    }
    const result = await downloadVideoFile(item.videoUrl, name);
    if (result === "ok") toast("Download started");
    else if (result === "fallback") toast("Opened video — save from browser");
    else if (result === "unsafe") toast("Unsafe deliverable URL — download blocked");
    else if (result === "blocked") toast("Download blocked — no file");
    else toast("Download failed");
  }

  if (!ready) {
    return (
      <p className="py-20 text-center text-sm text-[var(--fg-dim)]">Loading…</p>
    );
  }

  const activeJobs = sessionMeta.open + sessionStillMeta.open;

  // Recovery CTA: when jobs are open, scroll/focus the existing recovery panel
  // (video wins when both are open) instead of opening a duplicate /create door.
  function handleReviewActiveJobs() {
    const targetId =
      sessionMeta.open > 0
        ? "library-session-jobs-panel"
        : "library-session-stills-panel";
    const el = document.getElementById(targetId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.focus({ preventScroll: true });
  }

  const stickyCta = (
    <div
      className="fixed inset-x-0 bottom-[4.75rem] z-40 flex items-center gap-3 border-t-2 border-[#4A55FF]/55 bg-[#17131D]/97 px-3 py-2.5 shadow-[0_-12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:hidden"
      data-library-sticky="mobile"
      data-library-active-jobs={activeJobs}
    >
      <p className="min-w-0 flex-1 truncate text-left text-[10px] font-medium text-white/55">
        {items.length > 0
          ? `${items.length} available clip${items.length === 1 ? "" : "s"}`
          : "Your Launch Pack Library"}
        {activeJobs > 0
          ? ` · ${activeJobs} active job${activeJobs === 1 ? "" : "s"}`
          : ""}
      </p>
      {activeJobs > 0 ? (
        <button
          type="button"
          onClick={handleReviewActiveJobs}
          className="btn btn-primary shrink-0 px-4 py-2.5 text-xs"
          data-library-action="review-active"
          aria-label={`Review ${activeJobs} active job${activeJobs === 1 ? "" : "s"}`}
        >
          Review {activeJobs} active job{activeJobs === 1 ? "" : "s"}
        </button>
      ) : (
        <Link
          href="/create?mode=seller-pack"
          className="btn btn-primary shrink-0 px-4 py-2.5 text-xs"
          data-library-action="seller-pack"
        >
          Create new Pack
        </Link>
      )}
    </div>
  );

  // Device history empty: still surface process-memory session jobs (Phase D recovery).
  if (items.length === 0) {
    return (
      <div className="mt-6 pb-36 lg:pb-0" id="library-assets" data-library-state="empty">
        <LibraryStorageBanner
          deviceCount={0}
          sessionOpen={sessionMeta.open}
          privateCount={
            sessionJobs.filter(
              (job) =>
                job.status === "succeeded" &&
                !job.demo &&
                job.videoUrl?.startsWith("/api/downloads/")
            ).length
          }
        />
        <SessionJobsPanel
          jobs={sessionJobs}
          meta={sessionMeta}
          cancellingId={cancellingId}
          forkingId={forkingId}
          onCancel={(id) => void cancelSessionJob(id)}
          onForkRetry={(id) => void forkSessionRetry(id)}
          onRefresh={() => void refreshSessionJobs()}
          onDownload={(job) => void downloadSessionJob(job)}
        />
        <SessionStillJobsPanel
          jobs={sessionStills}
          meta={sessionStillMeta}
          cancellingId={cancellingStillId}
          forkingId={forkingStillId}
          onCancel={(id) => void cancelSessionStill(id)}
          onForkRetry={(id) => void forkSessionStillRetry(id)}
          onRefresh={() => void refreshSessionStills()}
        />
        <div className="media-stage grid place-items-center py-16 text-center sm:py-20">
          <div className="relative z-[2] flex flex-col items-center px-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl border border-[var(--mint)]/30 bg-[var(--mint)]/[0.06] text-2xl text-[var(--mint)]">
              ▢
            </span>
            <p className="mt-4 font-display text-base font-bold uppercase tracking-tight text-white sm:text-lg">
              {sessionJobs.length > 0 || sessionStills.length > 0
                ? "No clips saved on this device yet"
                : "Your first listing clip starts on Create"}
            </p>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-[var(--fg-muted)]">
              {sessionJobs.length > 0 || sessionStills.length > 0 ? (
                <>
                  {sessionMeta.mode?.includes("supabase-private")
                    ? "Private results above persist in your account. Device-only clips also save under "
                    : "In-progress jobs above are temporary. Successful clips also save under "}
                  <span className="font-semibold text-[var(--mint)]">
                    {PROVENANCE.localLibrary}
                  </span>{" "}
                  (
                  <span className="font-semibold text-white/80">
                    Saved on this device
                  </span>
                  ) when storage allows — not cloud-synced.
                </>
              ) : (
                <>
                  {PROVENANCE.localLibrary} ·{" "}
                  <span className="font-semibold text-[var(--mint)]">
                    Saved on this device
                  </span>
                  . Public Lab previews stay labeled. Invited private results
                  remain attached to the same signed-in account.
                </>
              )}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/create?mode=seller-pack"
                className="btn btn-primary text-sm"
              >
                Create your first Pack
              </Link>
            </div>
            <p className="mt-4 max-w-xs text-[10px] text-[var(--fg-dim)]">
              Clips land here after success · confirmed failed items restore
              their 10-credit charge
            </p>
          </div>
        </div>
        {stickyCta}
      </div>
    );
  }

  return (
    <div
      className="mt-6 pb-36 lg:pb-0"
      id="library-assets"
      data-library-state="filled"
    >
      <p
        className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--mint)]/30 bg-[var(--mint)]/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--mint)]"
        data-library-label="device-local"
      >
        Saved on this device · {items.length} clip
        {items.length === 1 ? "" : "s"} · not multi-device cloud
      </p>
      <LibraryStorageBanner
        deviceCount={items.length}
        sessionOpen={sessionMeta.open}
        privateCount={
          sessionJobs.filter(
            (job) =>
              job.status === "succeeded" &&
              !job.demo &&
              job.videoUrl?.startsWith("/api/downloads/")
          ).length
        }
      />
      <SessionJobsPanel
        jobs={sessionJobs}
        meta={sessionMeta}
        cancellingId={cancellingId}
        forkingId={forkingId}
        onCancel={(id) => void cancelSessionJob(id)}
        onForkRetry={(id) => void forkSessionRetry(id)}
        onRefresh={() => void refreshSessionJobs()}
        onDownload={(job) => void downloadSessionJob(job)}
      />
      <SessionStillJobsPanel
        jobs={sessionStills}
        meta={sessionStillMeta}
        cancellingId={cancellingStillId}
        forkingId={forkingStillId}
        onCancel={(id) => void cancelSessionStill(id)}
        onForkRetry={(id) => void forkSessionStillRetry(id)}
        onRefresh={() => void refreshSessionStills()}
      />

      {items.length >= 10 ? (
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by preset, SKU, project…"
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-1.5 text-sm outline-none focus:border-[var(--brand)]"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "new" | "name")}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-2 py-1.5 text-xs outline-none"
          >
            <option value="new">Newest</option>
            <option value="name">By name</option>
          </select>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as KindFilter)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-2 py-1.5 text-xs outline-none"
            aria-label="Filter live vs cached demo"
          >
            <option value="all">All kinds</option>
            <option value="live">{PROVENANCE.liveGeneration}</option>
            <option value="demo">{PROVENANCE.cachedDemo}s</option>
          </select>
          <select
            value={groupMode}
            onChange={(e) => setGroupMode(e.target.value as GroupMode)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-2 py-1.5 text-xs outline-none"
            aria-label="Group library clips"
          >
            <option value="project">By project</option>
            <option value="sku">By SKU</option>
            <option value="flat">Flat list</option>
          </select>
          <span className="text-[10px] text-[var(--fg-dim)]">
            {filtered.length} / {items.length} · Saved on this device
          </span>
        </div>
      </div>
      ) : null}

      {effectNames.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("")}
            className={`rounded-full border px-2.5 py-0.5 text-[10px] ${
              !filter
                ? "border-[var(--brand)] text-[var(--fg)]"
                : "border-[var(--border)] text-[var(--fg-dim)]"
            }`}
          >
            All
          </button>
          {effectNames.map(([slug, name]) => (
            <button
              key={slug}
              type="button"
              onClick={() => setFilter(name)}
              className={`rounded-full border px-2.5 py-0.5 text-[10px] ${
                filter === name
                  ? "border-[var(--brand)] text-[var(--fg)]"
                  : "border-[var(--border)] text-[var(--fg-dim)]"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {grouped.map((group) => (
        <section
          key={group.key}
          className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-soft)]/40 p-3 sm:p-4"
        >
          {(groupMode === "project" || groupMode === "sku") && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {group.input ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={group.input}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-[var(--border)]"
                  />
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-dashed border-[var(--border)] text-[10px] text-[var(--fg-dim)]">
                    {groupMode === "sku" ? "SKU" : "input"}
                  </span>
                )}
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-[var(--fg)]">
                    {group.label}
                  </h2>
                  <p className="mt-0.5 text-[10px] text-[var(--fg-dim)]">
                    {group.items.length} version
                    {group.items.length === 1 ? "" : "s"} · Saved on this
                    device
                    {groupMode === "sku" ? " · Assets-style SKU group" : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {group.items[0]?.effect ? (
                  <Link
                    href={createRemixHref(
                      group.items[0].effect,
                      group.items[0].sourceProject,
                      group.items[0].sku,
                      remixOptsFromRecord(group.items[0])
                    )}
                    className="rounded-full border border-[var(--mint)]/35 bg-[var(--mint)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--mint)] hover:border-[var(--mint)]"
                    data-library-remake="sku-carry"
                    data-library-remake-params="job"
                  >
                    Remake · same recipe
                  </Link>
                ) : null}
                <Link
                  href={
                    group.items[0]?.sku
                      ? `/create?mode=seller-pack&sku=${encodeURIComponent(group.items[0].sku)}`
                      : "/create?mode=seller-pack"
                  }
                  className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-bold text-white/70 hover:border-white/30"
                >
                  Launch Pack
                </Link>
                <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[10px] font-bold uppercase text-[var(--fg-dim)]">
                  Local only
                </span>
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.items.map((item) => (
              <article
                key={item.id}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.9)] transition hover:-translate-y-0.5 hover:border-white/20"
              >
                <div className="relative aspect-[9/14] bg-black sm:aspect-video">
                  {isPlayableResultVideoUrl({
                    videoUrl: item.videoUrl,
                    demo: Boolean(item.demo),
                    watermark: Boolean(item.watermark),
                  }) ? (
                    <video
                      src={item.videoUrl}
                      className="h-full w-full object-cover sm:object-contain"
                      controls
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : item.watermark && !item.demo ? (
                    <div className="grid h-full place-items-center p-4 text-center text-[11px] leading-snug text-amber-100/80">
                      <p className="font-bold text-amber-100">
                        Free live held for T6 bake
                      </p>
                      <p className="mt-1 max-w-[14rem] text-white/50">
                        {freeLiveDownloadBlockReason()}
                      </p>
                    </div>
                  ) : (
                    <div className="grid h-full place-items-center p-4 text-center text-[11px] text-amber-100/80">
                      Unsafe video URL — not rendered
                    </div>
                  )}
                  <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase text-white/90 ${
                        item.demo
                          ? "bg-black/70"
                          : "bg-[var(--mint)]/80 text-black"
                      }`}
                    >
                      {resultProvenanceLabel(Boolean(item.demo))}
                    </span>
                    {item.watermark && (
                      <span className="rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white/80">
                        {PROVENANCE.onPlayerMark}
                      </span>
                    )}
                    <span className="rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white/80">
                      {item.creditStatus ??
                        (item.demo ? "0 cached" : "10 used")}
                    </span>
                    {remoteClipMayExpire(item) && (
                      <span className="rounded bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase text-black">
                        link aging
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-white">
                    {item.effectName}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--mint)]">
                    {item.status ?? "succeeded"} · this device
                  </p>
                  <p className="mt-0.5 text-[10px] text-[var(--fg-dim)]">
                    {new Date(item.createdAt).toLocaleString()}
                    {item.model ? ` · ${item.model.split("/").pop()}` : ""}
                    {item.duration ? ` · ${item.duration}s` : ""}
                    {item.aspectRatio ? ` · ${item.aspectRatio}` : ""}
                    {item.resolution ? ` · ${item.resolution}` : ""}
                    {item.sourceProject
                      ? ` · remix from ${item.sourceProject}`
                      : ""}
                    {item.channel ? ` · ${item.channel}` : ""}
                  </p>
                  {remoteClipMayExpire(item) && historyItemDownloadAllowed(item) && (
                    <p className="mt-1 text-[10px] text-amber-600/90">
                      Provider CDN links expire — download soon or re-generate.
                    </p>
                  )}
                  {!historyItemDownloadAllowed(item) ? (
                    <p className="mt-1 text-[10px] leading-snug text-amber-700/90 dark:text-amber-100/80">
                      Free Mini live — raw file download blocked until server
                      downloadable watermark. Preview on-player only.
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
                    {historyItemDownloadAllowed(item) &&
                    (item.requestId ||
                      isSafeDeliverableUrl(item.videoUrl)) ? (
                      <button
                        type="button"
                        onClick={() => void downloadClip(item)}
                        className="text-xs font-medium text-[var(--mint)] hover:underline"
                        title="Open after delivery and ownership checks"
                        data-history-open="gated"
                      >
                        Open result
                      </button>
                    ) : (
                      <span
                        className="text-xs font-medium text-[var(--fg-dim)]"
                        title={
                          historyItemDownloadAllowed(item)
                            ? "Unsafe deliverable URL"
                            : historyDownloadBlockReason()
                        }
                      >
                        Open raw blocked
                      </span>
                    )}
                    {historyItemDownloadAllowed(item) ? (
                      <button
                        type="button"
                        onClick={() => void downloadClip(item)}
                        className="text-xs font-medium text-[var(--mint)] hover:underline"
                      >
                        Download
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        title={historyDownloadBlockReason()}
                        className="cursor-not-allowed text-xs font-medium text-[var(--fg-dim)] opacity-60"
                      >
                        Download blocked
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-xs text-[var(--fg-muted)] hover:text-[var(--mint)]"
                      onClick={() => {
                        if (!historyItemDownloadAllowed(item)) {
                          toast(historyDownloadBlockReason());
                          return;
                        }
                        if (!isSafeDeliverableUrl(item.videoUrl)) {
                          toast("Unsafe deliverable URL — not copied");
                          return;
                        }
                        void copyLink(item.videoUrl);
                      }}
                    >
                      Copy link
                    </button>
                    <Link
                      href={`/effects/${item.effect}`}
                      className="text-xs text-[var(--fg-muted)] hover:text-[var(--mint)]"
                    >
                      Tool page
                    </Link>
                    <Link
                      href={createRemixHref(
                        item.effect,
                        item.sourceProject,
                        item.sku,
                        remixOptsFromRecord(item)
                      )}
                      className="text-xs text-[var(--fg-muted)] hover:text-[var(--mint)]"
                      data-library-remake="sku-carry"
                      data-library-remake-params="job"
                    >
                      Regenerate
                    </Link>
                    {item.sourceProject &&
                    !item.sourceProject.startsWith("lab-sample-") ? (
                      <Link
                        href={`/projects/${item.sourceProject}`}
                        className="text-xs text-[var(--fg-muted)] hover:text-[var(--mint)]"
                      >
                        Source
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      className="text-xs text-[var(--fg-dim)] hover:text-[var(--brand)]"
                      onClick={() => setItems(removeHistoryItem(item.id))}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
      {filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-[var(--fg-dim)]">
          No saved results match this filter
        </p>
      )}
      {stickyCta}
    </div>
  );
}
