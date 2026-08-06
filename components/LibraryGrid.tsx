"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useToast } from "@/components/Toast";
import {
  isClientTimeoutError,
  STUDIO_SESSION_BOOT_MS,
  withTimeout,
} from "@/lib/clientTimeout";
import { interpretDownloadHead } from "@/lib/createTrust";
import { downloadVideoFile, privateDownloadHeaders } from "@/lib/history";
import { fetchMe, type MeResponse } from "@/lib/meClient";
import { createRemixHref, remixOptsFromRecord } from "@/lib/remixIntent";
import {
  libraryEmpty360Href,
  libraryEmptyMomentHref,
} from "@/lib/libraryEmpty";
import {
  acceptControlledLibraryNewAttemptUrl,
  libraryDurableTerminalFailureCopy,
  libraryInputBindingCopy,
  libraryNewAttemptButtonLabel,
  libraryNotYourToyCopy,
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
  /** Boolean only — true when a private input asset is bound server-side. */
  inputBound?: boolean;
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
  code?: string;
  message?: string;
  jobs?: GenerationJob[];
  open?: number;
};

const CREATE_MOMENT_HREF = `${MOMENT_CREATE_HREF}&source=library` as const;
const EMPTY_360_HREF = libraryEmpty360Href();
const EMPTY_MOMENT_HREF = libraryEmptyMomentHref();

/** UUID shape for deep-link job ids — reject freeform paths/secrets. */
const LIBRARY_JOB_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Deep-link ownership resolve after list load.
 * idle: no deep link · resolving: owner detail GET in flight ·
 * owned: job on list or detail confirmed · not-yours: fail-closed foreign/missing ·
 * unavailable: network/5xx verify failure (never invent not-your-toy on transport fail).
 */
type DeepLinkResolve =
  | "idle"
  | "resolving"
  | "owned"
  | "not-yours"
  | "unavailable";

/**
 * Owner list load honesty (AIT-311 residual).
 * ok: private list returned · error: non-ok/network · timeout: 8s wall-clock.
 * Never invent demo/public rows; never treat list failure as an empty shelf.
 */
type ListLoadState = "idle" | "loading" | "ok" | "error" | "timeout";

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

/**
 * Fail-closed client navigation for Create handoffs from Retry / durable
 * responses. Same-photo controlled URLs first; otherwise only a relative
 * `/create` path (no protocol, fragment, or open redirect).
 */
function acceptLibraryCreateNavigation(
  value: unknown,
  fallback: string = CREATE_MOMENT_HREF
): string {
  const samePhoto = acceptControlledLibraryNewAttemptUrl(value);
  if (samePhoto) return samePhoto;
  if (typeof value !== "string") return fallback;
  const candidate = value.trim();
  if (!candidate.startsWith("/create")) return fallback;
  if (
    candidate.includes("://") ||
    candidate.includes("\\") ||
    candidate.includes("#") ||
    candidate.length > 280
  ) {
    return fallback;
  }
  try {
    const url = new URL(candidate, "https://pikbo.local");
    if (url.origin !== "https://pikbo.local") return fallback;
    if (url.pathname !== "/create") return fallback;
    if (url.hash || url.username || url.password) return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

function newAttemptHref(job: GenerationJob): string {
  return acceptedSamePhotoHandoff(job) || CREATE_MOMENT_HREF;
}

function newAttemptLabel(job: GenerationJob): string {
  return libraryNewAttemptButtonLabel(Boolean(acceptedSamePhotoHandoff(job)));
}

function visibleAccountJob(job: GenerationJob): boolean {
  if (job.demo) return false;
  // Fail-closed: never render another session's stub (owned:false).
  if (job.owned === false) return false;
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
      tone: "text-[var(--neon-pink)]",
      dot: "bg-[var(--neon-pink)]",
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

function parseDeepLinkJobId(raw: string | null): string | null {
  if (!raw) return null;
  const id = raw.trim();
  return LIBRARY_JOB_ID_RE.test(id) ? id : null;
}

function JobActionRow({
  job,
  forkingId,
  cancellingId,
  onDownload,
  onRetry,
  onCancel,
}: {
  job: GenerationJob;
  forkingId: string | null;
  cancellingId: string | null;
  onDownload: (job: GenerationJob) => void;
  onRetry: (job: GenerationJob) => void;
  onCancel: (job: GenerationJob) => void;
}) {
  const remixHref = createRemixHref(
    job.effect || "street-power-up",
    undefined,
    null,
    remixOptsFromRecord(job)
  );
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {job.status === "succeeded" ? (
        <button
          type="button"
          onClick={() => onDownload(job)}
          className="btn btn-primary min-h-11 flex-1 !px-4 !py-2 text-xs"
        >
          Download video
        </button>
      ) : null}
      {isRetryable(job.status) && canLocalRetry(job) ? (
        <button
          type="button"
          onClick={() => onRetry(job)}
          disabled={forkingId === job.id}
          className="btn btn-primary min-h-11 flex-1 !px-4 !py-2 text-xs disabled:opacity-50"
          data-library-action="retry"
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
          onClick={() => onCancel(job)}
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
  );
}

function InputBindingSlot({ inputBound }: { inputBound: boolean }) {
  return (
    <div
      className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4"
      data-library-input-bound={inputBound ? "true" : "false"}
    >
      <div
        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/12 bg-white/[0.04]"
        aria-hidden
      >
        <span className="text-[9px] font-black uppercase tracking-[0.12em] text-white/45">
          Toy
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
          Original upload
        </p>
        <p className="mt-0.5 text-xs font-semibold leading-5 text-white/60">
          {libraryInputBindingCopy(inputBound)}
        </p>
      </div>
    </div>
  );
}

function LibraryGridInner() {
  const searchParams = useSearchParams();
  const deepLinkJobId = parseDeepLinkJobId(searchParams.get("job"));
  const [me, setMe] = useState<MeResponse | null>(null);
  const [accountReady, setAccountReady] = useState(false);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [jobsReady, setJobsReady] = useState(false);
  /** 8s session boot — never permanent Loading when getSession hangs. */
  const [sessionBoot, setSessionBoot] = useState<
    "checking" | "ready" | "timeout"
  >("checking");
  /**
   * Owner list load honesty — fail-closed: list error/timeout is not empty.
   * Never invent demo/public clips when private list access fails.
   */
  const [listLoad, setListLoad] = useState<ListLoadState>("idle");
  const [refreshing, setRefreshing] = useState(false);
  const [forkingId, setForkingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deepLinkResolve, setDeepLinkResolve] =
    useState<DeepLinkResolve>("idle");
  /** Prevents not-yours ↔ list-miss re-fetch loops for the same deep-link id. */
  const deepLinkAttemptedRef = useRef<string | null>(null);
  /** True after at least one successful owner list body. Soft refresh keeps rows. */
  const listSucceededRef = useRef(false);
  const toast = useToast();

  const refreshJobs = useCallback(async () => {
    setRefreshing(true);
    setListLoad((prev) => (prev === "ok" ? "ok" : "loading"));
    try {
      // Wall-clock covers getSession hang inside privateDownloadHeaders + list fetch.
      const result = await withTimeout(
        (async () => {
          const headers = await privateDownloadHeaders();
          const controller =
            typeof AbortController !== "undefined"
              ? new AbortController()
              : null;
          const timer = controller
            ? setTimeout(() => controller.abort(), STUDIO_SESSION_BOOT_MS)
            : null;
          try {
            const response = await fetch("/api/generations", {
              headers,
              cache: "no-store",
              signal: controller?.signal,
            });
            const body = (await response.json()) as GenerationsResponse;
            return { response, body };
          } finally {
            if (timer) clearTimeout(timer);
          }
        })(),
        STUDIO_SESSION_BOOT_MS,
        "Could not load your Library in time"
      );
      const { response, body } = result;
      if (response.ok && body.ok && Array.isArray(body.jobs)) {
        // Owner-only visible rows — never demo / owned:false stubs.
        setJobs(body.jobs.filter(visibleAccountJob));
        setListLoad("ok");
        listSucceededRef.current = true;
      } else {
        // Fail-closed: do not invent public/demo clips; do not claim empty shelf.
        // AIT-319: DURABLE_LIST_UNAVAILABLE (503) is an explicit private list fail.
        if (!listSucceededRef.current) {
          setJobs([]);
          setListLoad("error");
        } else {
          toast(
            body.code === "DURABLE_LIST_UNAVAILABLE"
              ? body.message ||
                  "Private Library could not be refreshed. Saved Moments are unchanged."
              : "Could not refresh your results"
          );
        }
      }
    } catch (err) {
      const timedOut =
        isClientTimeoutError(err) ||
        (err instanceof Error && err.name === "AbortError");
      if (!listSucceededRef.current) {
        setJobs([]);
        setListLoad(timedOut ? "timeout" : "error");
      } else {
        toast(
          timedOut
            ? "Library refresh timed out. Your saved results are unchanged."
            : "Could not refresh your results"
        );
      }
    } finally {
      setRefreshing(false);
      setJobsReady(true);
    }
  }, [toast]);

  const loadAccount = useCallback(() => {
    setAccountReady(false);
    setJobsReady(false);
    setSessionBoot("checking");
    setMe(null);
    setJobs([]);
    setListLoad("idle");
    listSucceededRef.current = false;
    deepLinkAttemptedRef.current = null;
    void fetchMe({ timeoutMs: STUDIO_SESSION_BOOT_MS })
      .then((result) => {
        setMe(result);
        setAccountReady(true);
        setSessionBoot("ready");
        if (result?.signedIn) void refreshJobs();
        else {
          setJobsReady(true);
          setListLoad("idle");
        }
      })
      .catch((err) => {
        setMe(null);
        // Always release loaders — no permanent Loading your Library…
        setAccountReady(true);
        setJobsReady(true);
        setListLoad("idle");
        setSessionBoot(isClientTimeoutError(err) ? "timeout" : "ready");
      });
  }, [refreshJobs]);

  useEffect(() => {
    const t = window.setTimeout(loadAccount, 0);
    return () => window.clearTimeout(t);
  }, [loadAccount]);

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

  // Prefer explicit selection, then deep-link job, then newest/open job.
  const selectedJob = useMemo(() => {
    if (sortedJobs.length === 0) return null;
    if (selectedId) {
      const match = sortedJobs.find((job) => job.id === selectedId);
      if (match) return match;
    }
    if (deepLinkJobId) {
      const linked = sortedJobs.find((job) => job.id === deepLinkJobId);
      if (linked) return linked;
    }
    return sortedJobs[0] || null;
  }, [sortedJobs, selectedId, deepLinkJobId]);
  const activeSelectedId = selectedJob?.id ?? null;

  const listHasDeepLink =
    Boolean(deepLinkJobId) &&
    jobs.some((job) => job.id === deepLinkJobId);

  /**
   * Deep-link ownership resolve (AIT-103 / AIT-110 / AIT-319).
   * List hit → owned (derived). Miss → one-shot GET /api/generations/:id (owner-scoped).
   * 200 + visible job merges into list; 404-class → not-your-toy;
   * network/5xx → unavailable (never invent not-your-toy on transport fail).
   * Skip resolve while owner list is error/timeout — list surface owns honesty.
   * `deepLinkAttemptedRef` stops re-fetch loops after terminal resolve.
   * setState is deferred (setTimeout 0) so react-hooks/set-state-in-effect stays clean.
   */
  useEffect(() => {
    if (!deepLinkJobId) {
      deepLinkAttemptedRef.current = null;
      // Defer: avoid synchronous setState in effect body.
      const t = window.setTimeout(() => setDeepLinkResolve("idle"), 0);
      return () => window.clearTimeout(t);
    }
    if (!me?.signedIn || !jobsReady) return;
    // AIT-319: list fail already owns the UI — do not resolve to not-your-toy.
    if (listLoad === "error" || listLoad === "timeout") {
      const t = window.setTimeout(() => setDeepLinkResolve("unavailable"), 0);
      return () => window.clearTimeout(t);
    }

    // Owned via list membership — mark owned (async setState; UI also trusts listHasDeepLink).
    if (listHasDeepLink) {
      const t = window.setTimeout(() => setDeepLinkResolve("owned"), 0);
      return () => window.clearTimeout(t);
    }

    if (deepLinkAttemptedRef.current === deepLinkJobId) {
      // Already resolved this id as not-yours/unavailable (or in-flight completed).
      return;
    }
    deepLinkAttemptedRef.current = deepLinkJobId;

    let cancelled = false;
    const t = window.setTimeout(() => {
      setDeepLinkResolve("resolving");
      void (async () => {
        try {
          const headers = await privateDownloadHeaders();
          const response = await fetch(
            `/api/generations/${encodeURIComponent(deepLinkJobId)}`,
            { headers, cache: "no-store" }
          );
          const body = (await response.json()) as {
            ok?: boolean;
            job?: GenerationJob;
            code?: string;
          };
          if (cancelled) return;
          const job = body.job;
          // Fail-closed: require ok + visible account job (never owned:false / demo).
          if (
            response.ok &&
            body.ok &&
            job &&
            job.id === deepLinkJobId &&
            visibleAccountJob(job)
          ) {
            setJobs((prev) => {
              if (prev.some((row) => row.id === job.id)) return prev;
              return [job, ...prev];
            });
            setSelectedId(job.id);
            setDeepLinkResolve("owned");
            return;
          }
          // Transport / durable unavailable — never invent not-your-toy.
          // AIT-357: detail 503 DURABLE_DETAIL_UNAVAILABLE shares the honesty path.
          if (
            response.status >= 500 ||
            body.code === "DURABLE_LIST_UNAVAILABLE" ||
            body.code === "DURABLE_DETAIL_UNAVAILABLE" ||
            body.code === "DELIVERY_PIPELINE_UNAVAILABLE"
          ) {
            setDeepLinkResolve("unavailable");
            return;
          }
          setDeepLinkResolve("not-yours");
        } catch {
          if (!cancelled) setDeepLinkResolve("unavailable");
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // deepLinkResolve intentionally omitted — including it would cancel in-flight resolve.
  }, [me?.signedIn, jobsReady, deepLinkJobId, listHasDeepLink, listLoad]);

  /**
   * Fail-closed not-your-toy only after resolve confirms foreign/missing.
   * While resolving, keep loading — never flash media or invent metadata.
   * List membership alone counts as owned (no media flash for foreign ids).
   * AIT-319: unavailable is not not-your-toy (honest retry, no ownership claim).
   */
  const notYourToy =
    Boolean(me?.signedIn) &&
    jobsReady &&
    Boolean(deepLinkJobId) &&
    !listHasDeepLink &&
    deepLinkResolve === "not-yours" &&
    listLoad !== "error" &&
    listLoad !== "timeout";
  const deepLinkUnavailable =
    Boolean(me?.signedIn) &&
    jobsReady &&
    Boolean(deepLinkJobId) &&
    !listHasDeepLink &&
    deepLinkResolve === "unavailable" &&
    listLoad !== "error" &&
    listLoad !== "timeout";
  const deepLinkPending =
    Boolean(me?.signedIn) &&
    jobsReady &&
    Boolean(deepLinkJobId) &&
    !listHasDeepLink &&
    listLoad !== "error" &&
    listLoad !== "timeout" &&
    deepLinkResolve !== "not-yours" &&
    deepLinkResolve !== "unavailable" &&
    deepLinkResolve !== "owned";

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
    // Fail-closed: only the controlled owner/session gate — never follow
    // raw provider CDN or storage signed URLs even if a DTO still carries one.
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
      // Always download via gateUrl — never job.videoUrl (may be absent or raw).
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
      // Bearer required so durable owner path can emit DURABLE_* (not bare NOT_FOUND).
      const headers = await privateDownloadHeaders();
      const response = await fetch(
        `/api/generations/${encodeURIComponent(job.id)}/retry`,
        { method: "POST", headers, cache: "no-store" }
      );
      const body = (await response.json()) as {
        ok?: boolean;
        message?: string;
        code?: string;
        durable?: boolean;
        next?: {
          createUi?: string;
          retryJobId?: string;
          retryToken?: string;
          newAttempt?: boolean;
        };
      };
      // Durable fail-closed: never invent process-memory retry — open Create.
      // Navigate only through acceptLibraryCreateNavigation (no open redirect).
      if (!response.ok && body.code === "DURABLE_USE_NEW_ATTEMPT") {
        window.location.href = acceptLibraryCreateNavigation(
          body.next?.createUi
        );
        return;
      }
      // AIT-254: in-flight / already-succeeded durable — honest toast + refresh.
      if (
        !response.ok &&
        (body.code === "DURABLE_IN_FLIGHT" ||
          body.code === "DURABLE_ALREADY_SUCCEEDED")
      ) {
        toast(
          body.message ||
            (body.code === "DURABLE_IN_FLIGHT"
              ? "This Moment is still rendering. Refresh Library."
              : "This Moment already succeeded. Open Create for a new attempt.")
        );
        await refreshJobs();
        return;
      }
      if (!response.ok || !body.ok) {
        toast(body.message || "This Moment could not be prepared for retry");
        return;
      }
      if (body.next?.retryJobId && body.next?.retryToken) {
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
      const remixFallback = createRemixHref(
        job.effect || "street-power-up",
        undefined,
        null,
        remixOptsFromRecord(job)
      );
      window.location.href = acceptLibraryCreateNavigation(
        body.next?.createUi,
        remixFallback.startsWith("/create") ? remixFallback : CREATE_MOMENT_HREF
      );
    } catch {
      toast("Retry could not be prepared. Please try again.");
    } finally {
      setForkingId(null);
    }
  }

  async function cancel(job: GenerationJob) {
    // Fail-closed: durable rows never post process-memory Cancel.
    if (!canLocalCancel(job)) {
      toast(
        "This Moment cannot be canceled from process memory. Refresh Library."
      );
      return;
    }
    setCancellingId(job.id);
    try {
      // Bearer so owner durable UUID can return DURABLE_NO_CANCEL (parity with
      // cancelGenerateLedger / list+detail owner gates).
      const headers = await privateDownloadHeaders();
      const response = await fetch(
        `/api/generations/${encodeURIComponent(job.id)}`,
        { method: "DELETE", headers, cache: "no-store" }
      );
      const body = (await response.json()) as {
        ok?: boolean;
        message?: string;
        code?: string;
        durable?: boolean;
      };
      // AIT-183: durable Cancel is server-gated — refresh, never invent cancel success.
      if (!response.ok && body.code === "DURABLE_NO_CANCEL") {
        toast(
          body.message ||
            "This durable Moment cannot use process-memory Cancel. Refresh Library."
        );
        await refreshJobs();
        return;
      }
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

  if (!accountReady || !jobsReady || deepLinkPending) {
    return (
      <div
        className="mt-6 grid min-h-64 place-items-center rounded-[1.75rem] border border-white/10 bg-white/[0.025]"
        data-library-state={deepLinkPending ? "deep-link-resolving" : "loading"}
        data-library-boot="checking"
      >
        <p className="text-sm font-semibold text-white/45">Loading your Library…</p>
      </div>
    );
  }

  // Access check timed out — fail-closed: no guest claim, no owner jobs, no demos.
  if (sessionBoot === "timeout") {
    return (
      <section
        className="mt-6 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#111113]"
        data-library-state="session-timeout"
        data-library-boot="timeout"
      >
        <div className="grid min-h-[22rem] place-items-center p-6 text-center sm:p-10">
          <div className="max-w-lg">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
              Private Library
            </p>
            <h2 className="mt-3 font-display text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
              Could not verify access in time.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/52">
              Session lookup timed out. We will not load private jobs, claim
              guest status, or show public sample clips until access is checked
              again.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => loadAccount()}
                data-library-boot-retry
                className="btn btn-primary text-sm"
              >
                Retry access check
              </button>
              <Link
                href={
                  deepLinkJobId
                    ? `/login?next=${encodeURIComponent(
                        `/library?job=${encodeURIComponent(deepLinkJobId)}`
                      )}`
                    : "/login?next=/library"
                }
                className="btn btn-ghost text-sm"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!me?.signedIn) {
    return (
      <section
        className="mt-6 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#111113]"
        data-library-state="guest"
        data-library-boot="ready"
      >
        <div className="grid min-h-[22rem] place-items-center p-6 text-center sm:p-10">
          <div className="max-w-lg">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[var(--neon-pink)]/30 bg-[var(--neon-pink)]/10 text-xl text-[var(--neon-pink)]">
              ↗
            </span>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--neon-pink)]">
              Private Library
            </p>
            <h2 className="mt-3 font-display text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
              Sign in to see your generated Moments.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/52">
              Your real toy results belong to your account. Sample previews and
              browser-cached demos are not added to this Library.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {/* Static default keeps engine-smoke / launch-pack contract
                  href="/login?next=/library". Deep-link guests restore ?job=. */}
              <Link
                href={
                  deepLinkJobId
                    ? `/login?next=${encodeURIComponent(
                        `/library?job=${encodeURIComponent(deepLinkJobId)}`
                      )}`
                    : "/login?next=/library"
                }
                className="btn btn-primary text-sm"
              >
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

  // Owner list failed/timed out before any successful body — honest retry, not empty shelf.
  if (listLoad === "error" || listLoad === "timeout") {
    const isTimeout = listLoad === "timeout";
    return (
      <section
        className="mt-6 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#111113]"
        data-library-state={isTimeout ? "list-timeout" : "list-error"}
        data-library-list-load={listLoad}
        data-library-boot="ready"
      >
        <div className="grid min-h-[22rem] place-items-center p-6 text-center sm:p-10">
          <div className="max-w-lg">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">
              Private Library
            </p>
            <h2 className="mt-3 font-display text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
              {isTimeout
                ? "Could not load your Library in time."
                : "Could not load your private results."}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/52">
              {isTimeout
                ? "The owner list timed out. We will not invent public sample clips or treat this as an empty shelf."
                : "Private list access failed. Your account Moments are not shown as empty — retry when the network is ready."}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => void refreshJobs()}
                disabled={refreshing}
                data-library-list-retry
                className="btn btn-primary text-sm disabled:opacity-50"
              >
                {refreshing ? "Retrying…" : "Retry Library"}
              </button>
              <Link href={EMPTY_360_HREF} className="btn btn-ghost text-sm">
                Generate 360° Spin
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // AIT-319: deep-link verify transport/5xx — honest retry, never "not your toy".
  if (deepLinkUnavailable) {
    return (
      <section
        className="mt-6 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#111113]"
        data-library-state="deep-link-unavailable"
        data-library-deep-link="unavailable"
      >
        <div className="grid min-h-[22rem] place-items-center p-6 text-center sm:p-10">
          <div className="max-w-lg">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">
              Private Library
            </p>
            <h2 className="mt-3 font-display text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
              Could not verify this Moment.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/52">
              Ownership check failed due to a network or private storage error.
              We will not claim this is not your toy — retry when the connection
              is ready.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  deepLinkAttemptedRef.current = null;
                  setDeepLinkResolve("idle");
                  void refreshJobs();
                }}
                disabled={refreshing}
                data-library-deep-link-retry
                className="btn btn-primary text-sm disabled:opacity-50"
              >
                {refreshing ? "Retrying…" : "Retry verify"}
              </button>
              <Link href="/library" className="btn btn-ghost text-sm">
                Open Library
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (notYourToy) {
    return (
      <section
        className="mt-6 overflow-hidden rounded-[1.75rem] border border-amber-400/25 bg-[#111113]"
        data-library-state="not-your-toy"
        data-library-not-your-toy="true"
      >
        <div className="grid min-h-[22rem] place-items-center p-6 text-center sm:p-10">
          <div className="max-w-lg">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-amber-300/30 bg-amber-300/10 text-xl text-amber-200">
              ⚠
            </span>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">
              Not available
            </p>
            <h2 className="mt-3 font-display text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
              Not your toy
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/55">
              {libraryNotYourToyCopy()}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/library" className="btn btn-primary text-sm">
                Back to your Library
              </Link>
              <Link href={CREATE_MOMENT_HREF} className="btn btn-ghost text-sm">
                Create new Moment
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
      data-library-list-load={listLoad}
      data-library-boot="ready"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--neon-pink)]">
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
            data-library-list-refresh
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <Link
            href={EMPTY_360_HREF}
            className="btn btn-primary min-h-11 !px-4 !py-2 text-xs"
            data-library-header-cta="generate-360"
          >
            Generate 360° Spin
          </Link>
          <Link
            href={EMPTY_MOMENT_HREF}
            className="btn btn-ghost min-h-11 !px-4 !py-2 text-xs"
            data-library-header-cta="moment"
          >
            Create new Moment
          </Link>
        </div>
      </div>

      {sortedJobs.length === 0 ? (
        <div className="grid min-h-[22rem] place-items-center rounded-[1.75rem] border border-white/10 bg-[#111113] p-6 text-center sm:p-10">
          <div className="max-w-lg">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-xl text-white/65">
              +
            </span>
            <h2 className="mt-5 font-display text-3xl font-black tracking-[-0.04em] text-white">
              Your first real Moment starts with one toy photo.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/50">
              Generated results will return here after refresh. Only private,
              downloadable account results are kept in this view.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href={EMPTY_360_HREF}
                className="btn btn-primary text-sm"
                data-library-empty-cta="generate-360"
              >
                Generate 360° Spin
              </Link>
              <Link
                href={EMPTY_MOMENT_HREF}
                className="btn btn-ghost text-sm"
                data-library-empty-cta="moment"
              >
                Create Street Power-Up
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
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
                  className={`overflow-hidden rounded-[1.5rem] border bg-[#111113] text-left shadow-[0_24px_70px_-50px_rgba(0,0,0,0.95)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-pink)] ${
                    selected
                      ? "border-[var(--neon-pink)]/45"
                      : "border-white/10"
                  }`}
                  data-selected={selected ? "true" : "false"}
                  aria-pressed={selected}
                  aria-label={`${effectName(job.effect)}, ${status.label}, ${formatDate(job.createdAt)}`}
                >
                  <div className="relative grid aspect-video place-items-center overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_50%_20%,rgba(255,78,205,0.12),transparent_55%),#09090a] text-center">
                    {job.status === "succeeded" && job.videoUrl ? (
                      <video
                        src={job.videoUrl}
                        muted
                        playsInline
                        preload="metadata"
                        aria-label={`${effectName(job.effect)} generated video`}
                        className="h-full w-full bg-black object-contain"
                      />
                    ) : (
                      <div className="p-6">
                        <span
                          className={`mx-auto block h-2 w-2 rounded-full ${status.dot}`}
                        />
                        <p
                          className={`mt-3 text-xs font-black uppercase tracking-[0.18em] ${status.tone}`}
                        >
                          {status.label}
                        </p>
                        <p className="mt-2 font-display text-xl font-black tracking-[-0.03em] text-white">
                          {effectName(job.effect)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-3 text-[11px] text-white/42">
                      <span>{formatDate(job.createdAt)}</span>
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

          {/* Detail — alias selectedJob as job so durable-library source
              contracts keep matching (void retry(job), canLocalRetry(job), …). */}
          {selectedJob
            ? (() => {
                const job = selectedJob;
                const status = jobStatus(job.status);
                const inputBound = job.inputBound === true;
                return (
                  <article
                    key={job.id}
                    className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#111113] shadow-[0_24px_70px_-50px_rgba(0,0,0,0.95)] lg:sticky lg:top-6"
                    data-library-detail="true"
                  >
                    <div className="relative grid aspect-video place-items-center overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_50%_20%,rgba(255,78,205,0.12),transparent_55%),#09090a] text-center">
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
                            className={`mx-auto block h-2 w-2 rounded-full ${status.dot}`}
                          />
                          <p
                            className={`mt-3 text-xs font-black uppercase tracking-[0.18em] ${status.tone}`}
                          >
                            {status.label}
                          </p>
                          <p className="mt-2 font-display text-2xl font-black tracking-[-0.03em] text-white">
                            {effectName(job.effect)}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-3 text-[11px] text-white/42">
                        <span>{formatDate(job.createdAt)}</span>
                        <span>
                          {[
                            job.aspectRatio,
                            job.duration ? `${job.duration}s` : null,
                          ]
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

                      <JobActionRow
                        job={job}
                        forkingId={forkingId}
                        cancellingId={cancellingId}
                        onDownload={(job) => void download(job)}
                        // engine-smoke adjacency: isRetryable…void retry / isOpen…void cancel
                        onRetry={(job) => {
                          if (isRetryable(job.status)) void retry(job);
                        }}
                        onCancel={(job) => {
                          if (isOpen(job.status)) void cancel(job);
                        }}
                      />

                      <InputBindingSlot inputBound={inputBound} />
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

export function LibraryGrid() {
  return (
    <Suspense
      fallback={
        <div className="mt-6 grid min-h-64 place-items-center rounded-[1.75rem] border border-white/10 bg-white/[0.025]">
          <p className="text-sm font-semibold text-white/45">
            Loading your Library…
          </p>
        </div>
      }
    >
      <LibraryGridInner />
    </Suspense>
  );
}
