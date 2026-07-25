"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  clearHistory,
  downloadVideoFile,
  exportHistoryJson,
  historyDownloadBlockReason,
  historyItemDownloadAllowed,
  importHistoryJson,
  loadHistory,
  remoteClipMayExpire,
  removeHistoryItem,
  type HistoryItem,
} from "@/lib/history";
import { createRemixHref } from "@/lib/remixIntent";
import { isSafeDeliverableUrl } from "@/lib/createTrust";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { useToast } from "@/components/Toast";
import { LibraryStorageBanner } from "@/components/LibraryStorageBanner";
import { CommunityPublishButton } from "@/components/CommunityPublishButton";
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
};

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

function statusTone(status: string): string {
  if (status === "succeeded") return "text-[var(--mint)]";
  if (status === "failed" || status === "canceled") return "text-amber-200";
  if (status === "running" || status === "queued") return "text-[var(--brand-2)]";
  return "text-[var(--fg-dim)]";
}

/** Phase D: process-memory ledger — must show even when device history is empty. */
function SessionJobsPanel({
  jobs,
  meta,
  cancellingId,
  onCancel,
  onRefresh,
}: {
  jobs: SessionJob[];
  meta: SessionJobsMeta;
  cancellingId: string | null;
  onCancel: (id: string) => void;
  onRefresh: () => void;
}) {
  if (jobs.length === 0) return null;
  const { byStatus, open, jobTimeoutMs, timedOutThisSweep } = meta;
  const timeoutMin =
    typeof jobTimeoutMs === "number" && jobTimeoutMs > 0
      ? Math.round(jobTimeoutMs / 60000)
      : null;

  return (
    <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--fg-dim)]">
            Session jobs · this server process
            {open > 0 ? (
              <span className="ml-1.5 font-bold text-[var(--mint)]">
                · {open} open
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            Local ledger from Generate (not multi-node cloud). Device Library
            below is this browser only — empty until a clip is saved here.
            Cancel marks the ledger only; in-flight fal may still finish.
            TIMEOUT rows show refund unconfirmed (check balance) — not a confirmed restore.
            {timeoutMin ? (
              <span className="text-[var(--fg-dim)]">
                {" "}
                Open jobs time out after ~{timeoutMin}m without poll.
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
            href="/create"
            className="text-[11px] font-semibold text-[var(--mint)] hover:underline"
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
                  {j.errorCode ? ` · ${j.errorCode}` : ""}
                  {j.creditsOutcome ? ` · ${j.creditsOutcome}` : ""}
                </span>
              </p>
              <p className="mt-0.5 truncate text-[10px] text-[var(--fg-dim)]">
                {j.demo ? "Cached demo" : "Live"}
                {j.aspectRatio ? ` · ${j.aspectRatio}` : ""}
                {typeof j.duration === "number" ? ` · ${j.duration}s` : ""}
                {j.resolution ? ` · ${j.resolution}` : ""}
                {j.model ? ` · ${j.model.split("/").pop()}` : ""}
                {j.watermark ? " · on-player mark" : ""}
                {j.creditsRefunded === true
                  ? " · 10 restored"
                  : j.creditsOutcome === "refund unconfirmed" ||
                      j.errorCode === "TIMEOUT"
                    ? " · refund unconfirmed"
                    : ""}
              </p>
              {j.error ? (
                <p className="mt-0.5 truncate text-[10px] text-amber-100/80">
                  {j.errorCode === "TIMEOUT"
                    ? "Timed out — Retry on Create (mint new attempt). Check balance if credits were debited."
                    : j.error}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link
                href={`/create?effect=${encodeURIComponent(j.effect)}`}
                className="text-[var(--mint)] hover:underline"
              >
                {j.status === "failed" || j.status === "canceled"
                  ? "Retry recipe"
                  : "Use recipe"}
              </Link>
              {(j.status === "failed" || j.status === "canceled") &&
              (j.errorCode === "TIMEOUT" ||
                j.creditsOutcome === "refund unconfirmed") ? (
                <Link
                  href="/create?try=1&sample=scout"
                  className="text-white/55 hover:text-white hover:underline"
                  title="Lab sample · 0 credits if live is blocked"
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
                  title="Marks local ledger canceled — does not kill provider mid-flight"
                >
                  {cancellingId === j.id ? "Canceling…" : "Cancel ledger"}
                </button>
              ) : null}
              {j.status === "succeeded" && j.downloadAllowed && j.videoUrl ? (
                <a
                  href={
                    j.requestId || j.id
                      ? `/api/downloads/${encodeURIComponent(j.requestId || j.id)}`
                      : j.videoUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--fg-muted)] hover:text-white"
                >
                  Download
                </a>
              ) : j.status === "succeeded" && !j.downloadAllowed ? (
                <span
                  className="text-amber-100/70"
                  title="Free Mini live raw is gated until T6 file watermark bake"
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
  });
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const toast = useToast();

  function applyGenerationsBody(body: {
    ok?: boolean;
    jobs?: SessionJob[];
    byStatus?: Partial<SessionByStatus>;
    open?: number;
    jobTimeoutMs?: number;
    timedOutThisSweep?: number;
    mode?: string;
  }) {
    if (!body?.ok || !Array.isArray(body.jobs)) return;
    setSessionJobs(body.jobs.slice(0, 12));
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
    });
  }

  useEffect(() => {
    const t = window.setTimeout(() => {
      setItems(loadHistory());
      setReady(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  async function refreshSessionJobs() {
    try {
      const r = await fetch("/api/generations");
      const body = (await r.json()) as Parameters<typeof applyGenerationsBody>[0];
      applyGenerationsBody(body);
    } catch {
      /* ignore */
    }
  }

  // Phase D: process-memory job ledger for this browser session (refresh recovery).
  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      void fetch("/api/generations")
        .then((r) => r.json())
        .then((body: Parameters<typeof applyGenerationsBody>[0]) => {
          if (cancelled) return;
          applyGenerationsBody(body);
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
      void fetch("/api/generations")
        .then((r) => r.json())
        .then((body: Parameters<typeof applyGenerationsBody>[0]) => {
          applyGenerationsBody(body);
        })
        .catch(() => undefined);
    }, 8000);
    return () => window.clearInterval(t);
  }, [sessionJobs, sessionMeta.open]);

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
      };
      if (!res.ok || !body.ok) {
        toast(body.message || body.code || "Could not cancel job");
      } else {
        toast(
          body.note ||
            "Ledger canceled · in-flight provider may still complete"
        );
      }
      await refreshSessionJobs();
    } catch {
      toast("Network error canceling job");
    } finally {
      setCancellingId(null);
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

  function onImportFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const n = importHistoryJson(text);
      if (n < 0) {
        toast("Import failed — need a Pikbo library JSON export");
        return;
      }
      setItems(loadHistory());
      toast(`Library restored · ${n} clip${n === 1 ? "" : "s"}`);
    };
    reader.onerror = () => toast("Could not read file");
    reader.readAsText(file);
  }

  async function copyLink(url: string) {
    if (!isSafeDeliverableUrl(url)) {
      toast("Unsafe deliverable URL — not copied");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
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
    // Prefer controlled download endpoint when we have a server job / request id.
    // HEAD first so Free-blocked / expired process-memory jobs never open a dead tab.
    if (item.requestId) {
      const gateUrl = `/api/downloads/${encodeURIComponent(item.requestId)}`;
      try {
        const head = await fetch(gateUrl, { method: "HEAD" });
        const code = head.headers.get("X-Pikbo-Download-Code") || "";
        const t6Mode = head.headers.get("X-Pikbo-T6") || "";
        if (head.status === 403 || code === "DOWNLOAD_BLOCKED") {
          toast(
            t6Mode === "bake_on_download"
              ? "Free Mini needs watermark bake — worker may be down. Upgrade for a clean file."
              : historyDownloadBlockReason()
          );
          return;
        }
        if (head.status === 404 || code === "NOT_FOUND") {
          toast(
            "Session job not on this server process — try direct open or remake"
          );
          // Fall through to direct only for demos/paid with a known URL.
        } else if (head.status === 409 || code === "NOT_READY") {
          toast("Deliverable not ready yet — refresh session jobs");
          return;
        } else if (head.status === 422 || code === "UNSAFE_URL") {
          toast("Unsafe deliverable URL — download blocked");
          return;
        } else if (head.ok) {
          track({
            event: "export_click",
            path: "/library",
            recipe: item.effect,
            demo: Boolean(item.demo),
            meta: {
              via: "downloads_api",
              sku: item.sku || null,
              head: "allowed",
            },
          });
          window.open(gateUrl, "_blank", "noopener,noreferrer");
          toast("Download via server gate…");
          return;
        }
      } catch {
        /* network — try open / direct below */
      }
    }
    track({
      event: "export_click",
      path: "/library",
      recipe: item.effect,
      demo: Boolean(item.demo),
      meta: {
        via: item.requestId ? "downloads_api_fallback" : "direct",
        sku: item.sku || null,
      },
    });
    if (item.requestId) {
      // Gate unreachable — last resort open (GET re-applies the same auth).
      window.open(
        `/api/downloads/${encodeURIComponent(item.requestId)}`,
        "_blank",
        "noopener,noreferrer"
      );
      toast("Download via server gate…");
      return;
    }
    const name = `pikbo-${item.effect}-${item.id.slice(0, 8)}.mp4`;
    const result = await downloadVideoFile(item.videoUrl, name);
    if (result === "ok") toast("Download started");
    else if (result === "fallback") toast("Opened video — save from browser");
    else if (result === "unsafe") toast("Unsafe deliverable URL — download blocked");
    else toast("Download failed");
  }

  if (!ready) {
    return (
      <p className="py-20 text-center text-sm text-[var(--fg-dim)]">Loading…</p>
    );
  }

  // Device history empty: still surface process-memory session jobs (Phase D recovery).
  if (items.length === 0) {
    return (
      <div className="mt-6" id="library-assets">
        <LibraryStorageBanner
          deviceCount={0}
          sessionOpen={sessionMeta.open}
        />
        <SessionJobsPanel
          jobs={sessionJobs}
          meta={sessionMeta}
          cancellingId={cancellingId}
          onCancel={(id) => void cancelSessionJob(id)}
          onRefresh={() => void refreshSessionJobs()}
        />
        <div className="media-stage grid place-items-center py-16 text-center sm:py-20">
          <div className="relative z-[2] flex flex-col items-center px-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl border border-[var(--mint)]/30 bg-[var(--mint)]/[0.06] text-2xl text-[var(--mint)]">
              ▢
            </span>
            <p className="mt-4 font-display text-base font-bold uppercase tracking-tight text-white sm:text-lg">
              {sessionJobs.length > 0
                ? "No clips saved on this device yet"
                : "Your first listing clip starts on Create"}
            </p>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-[var(--fg-muted)]">
              {sessionJobs.length > 0 ? (
                <>
                  Session jobs above are this server process only. Successful
                  generates also save under{" "}
                  <span className="font-semibold text-[var(--mint)]">
                    {PROVENANCE.localLibrary}
                  </span>{" "}
                  when storage allows — not cloud-synced.
                </>
              ) : (
                <>
                  {PROVENANCE.localLibrary} · this device only. One photo → job
                  (Etsy spin, TikTok hook, reveal) → generate → optional
                  Community publish when signed in.
                </>
              )}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <FreeTrialCta
                path="/library"
                variant="mint"
                labelTry="▶ Free sample · Mini 5s"
                labelDemo="▶ Lab sample · free"
                labelPlans="Compare plans"
              />
              <Link href="/modules" className="btn btn-ghost text-sm">
                Toy Modules
              </Link>
              <Link
                href="/create?mode=seller-pack"
                className="btn btn-ghost text-sm"
              >
                Seller Pack · 3 outputs
              </Link>
              <Link href="/flow" className="btn btn-ghost text-sm">
                Browse Flow
              </Link>
            </div>
            <p className="mt-4 max-w-xs text-[10px] text-[var(--fg-dim)]">
              Clips land here after success · failed live jobs usually restore
              credits · TIMEOUT stays refund unconfirmed
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6" id="library-assets">
      <LibraryStorageBanner
        deviceCount={items.length}
        sessionOpen={sessionMeta.open}
      />
      <SessionJobsPanel
        jobs={sessionJobs}
        meta={sessionMeta}
        cancellingId={cancellingId}
        onCancel={(id) => void cancelSessionJob(id)}
        onRefresh={() => void refreshSessionJobs()}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
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
            {filtered.length} / {items.length} · this browser only
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-xs text-[var(--fg-muted)] hover:text-[var(--mint)]"
            onClick={() => {
              exportHistoryJson();
              toast("Library JSON exported");
            }}
          >
            Export JSON
          </button>
          <label className="cursor-pointer text-xs text-[var(--fg-muted)] hover:text-[var(--mint)]">
            Import JSON
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                onImportFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            className="text-xs text-[var(--fg-dim)] hover:text-[var(--brand)]"
            onClick={() => {
              if (confirm("Clear all clips from this browser?")) {
                clearHistory();
                setItems([]);
              }
            }}
          >
            Clear all
          </button>
        </div>
      </div>

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
                      group.items[0].sourceProject
                    )}
                    className="rounded-full border border-[var(--mint)]/35 bg-[var(--mint)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--mint)] hover:border-[var(--mint)]"
                  >
                    Remake · same recipe
                  </Link>
                ) : null}
                <Link
                  href="/create?mode=seller-pack"
                  className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-bold text-white/70 hover:border-white/30"
                >
                  Seller Pack
                </Link>
                <Link
                  href="/modules"
                  className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-bold text-white/70 hover:border-white/30"
                >
                  Modules
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
                  {isSafeDeliverableUrl(item.videoUrl) ? (
                    <video
                      src={item.videoUrl}
                      className="h-full w-full object-cover sm:object-contain"
                      controls
                      muted
                      playsInline
                      preload="metadata"
                    />
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
                      watermark bake (T6). Preview on-player only.
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
                    {historyItemDownloadAllowed(item) &&
                    (item.requestId ||
                      isSafeDeliverableUrl(item.videoUrl)) ? (
                      <a
                        href={
                          item.requestId
                            ? `/api/downloads/${encodeURIComponent(item.requestId)}`
                            : item.videoUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-[var(--mint)] hover:underline"
                      >
                        Open result
                      </a>
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
                    <CommunityPublishButton
                      videoUrl={item.videoUrl}
                      posterUrl={item.inputImage}
                      effectSlug={item.effect}
                      effectName={item.effectName}
                      demo={Boolean(item.demo)}
                      watermark={Boolean(item.watermark)}
                    />
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
                      href={
                        item.sourceProject
                          ? createRemixHref(item.effect, item.sourceProject)
                          : `/create?effect=${encodeURIComponent(item.effect)}`
                      }
                      className="text-xs text-[var(--fg-muted)] hover:text-[var(--mint)]"
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
    </div>
  );
}
