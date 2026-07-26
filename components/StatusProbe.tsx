"use client";

import { useEffect, useState } from "react";

type Health = {
  ok?: boolean;
  degraded?: boolean;
  mode?: string;
  fal?: boolean;
  sessionSecret?: boolean;
  ready?: {
    demo?: boolean;
    softLive?: boolean;
    paid?: boolean;
    durableCredits?: boolean;
  };
  product?: {
    primary?: string;
    stills?: string;
  };
  billing?: {
    freeTrial?: {
      scope?: string;
      stillsOnFree?: string;
      failedLiveRefunds?: boolean;
      failedLiveRefundPolicy?: string;
      ledgerTimeoutRefund?: string;
      clipsPerPeriod?: number;
    };
  };
  demos?: {
    ok?: boolean;
    present?: number;
    required?: number;
    note?: string;
    samples?: { present?: number; required?: number };
  };
  t6?: { status?: string; freeLiveRawDownload?: string };
  forceGenerateFail?: boolean;
  rateLimit?: {
    inflight?: number;
    inflightTtlMs?: number;
  };
  assets?: {
    mode?: string;
    count?: number;
    ttlMs?: number;
    note?: string;
  };
  jobs?: {
    mode?: string;
    count?: number;
    open?: number;
    jobTimeoutMs?: number;
    byStatus?: Record<string, number>;
    note?: string;
  };
  /** Still studio process-memory ledger (counts only — no image bytes). */
  imageJobs?: {
    total?: number;
    open?: number;
    byStatus?: Record<string, number>;
    jobTimeoutMs?: number;
    timedOutThisProbe?: number;
    note?: string;
  };
  videoWebhook?: {
    secretConfigured?: boolean;
    requiresSecretInProduction?: boolean;
  };
  community?: {
    ugcConfigured?: boolean;
    note?: string;
  };
};

export function StatusProbe() {
  const [data, setData] = useState<Health | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const json = (await res.json()) as Health;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setErr("Could not reach /api/health");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) {
    return (
      <p className="mt-6 text-sm text-amber-200" role="alert">
        {err}
      </p>
    );
  }
  if (!data) {
    return (
      <p className="mt-6 text-sm text-[var(--fg-dim)]">Loading health…</p>
    );
  }

  const ft = data.billing?.freeTrial;
  const demos = data.demos;
  const demosLabel =
    demos && typeof demos.present === "number" && typeof demos.required === "number"
      ? `${demos.ok ? "ok" : "MISSING"} · ${demos.present}/${demos.required} clips` +
        (demos.samples
          ? ` · samples ${demos.samples.present ?? "?"}/${demos.samples.required ?? "?"}`
          : "")
      : "—";
  const jobsOpen =
    typeof data.jobs?.open === "number"
      ? data.jobs.open
      : data.jobs?.byStatus
        ? (data.jobs.byStatus.queued ?? 0) + (data.jobs.byStatus.running ?? 0)
        : null;

  const rows: Array<[string, string, boolean?]> = [
    ["Overall", data.ok ? "ok" : "degraded", data.ok],
    ["Mode", String(data.mode ?? "—")],
    [
      "Product",
      data.product?.primary
        ? `${data.product.primary}${data.product.stills ? ` · stills ${data.product.stills}` : ""}`
        : "—",
    ],
    ["Demo path", data.ready?.demo ? "ready" : "no", data.ready?.demo],
    [
      "Soft-live (FAL)",
      data.ready?.softLive ? "ready" : "no",
      data.ready?.softLive,
    ],
    ["Paid", data.ready?.paid ? "ready" : "off (expected)", data.ready?.paid],
    [
      "Durable credits",
      data.ready?.durableCredits ? "on" : "local/off",
      data.ready?.durableCredits,
    ],
    ["Session secret", data.sessionSecret ? "set" : "missing", data.sessionSecret],
    ["FAL key", data.fal ? "set" : "missing", data.fal],
    [
      "Lab demos on disk",
      demosLabel,
      demos?.ok === true ? true : demos?.ok === false ? false : undefined,
    ],
    [
      "Free trial scope",
      ft?.scope
        ? `${ft.scope}${ft.stillsOnFree ? ` · stills ${ft.stillsOnFree}` : ""}${
            ft.failedLiveRefunds
              ? ft.failedLiveRefundPolicy === "when_confirmed"
                ? " · refunds when confirmed"
                : " · refunds on fail"
              : ""
          }${
            ft.ledgerTimeoutRefund === "unconfirmed"
              ? " · TIMEOUT unconfirmed"
              : ""
          }`
        : "—",
    ],
    ["T6 watermark bake", data.t6?.status ?? "unknown"],
    [
      "Free live raw download",
      data.t6?.freeLiveRawDownload ?? "—",
    ],
    [
      "In-flight locks",
      typeof data.rateLimit?.inflight === "number"
        ? `${data.rateLimit.inflight} (TTL ${Math.round((data.rateLimit.inflightTtlMs ?? 0) / 1000)}s)`
        : "—",
    ],
    [
      "Local still assets",
      typeof data.assets?.count === "number"
        ? `${data.assets.count} · TTL ${Math.round((data.assets.ttlMs ?? 0) / 60000)}m slide`
        : "—",
    ],
    [
      "Session job ledger",
      typeof data.jobs?.count === "number"
        ? `${data.jobs.count}${jobsOpen != null ? ` · open ${jobsOpen}` : ""} · timeout ${Math.round((data.jobs.jobTimeoutMs ?? 0) / 60000)}m`
        : "—",
    ],
    [
      "Still image job ledger",
      typeof data.imageJobs?.total === "number"
        ? `${data.imageJobs.total} total · open ${data.imageJobs.open ?? 0}` +
          (data.imageJobs.jobTimeoutMs
            ? ` · timeout ${Math.round(data.imageJobs.jobTimeoutMs / 1000)}s`
            : "") +
          (data.imageJobs.timedOutThisProbe
            ? ` · swept ${data.imageJobs.timedOutThisProbe}`
            : "") +
          " (process-memory · Flux idempotency)"
        : "—",
    ],
    [
      "Video webhook secret",
      data.videoWebhook?.secretConfigured
        ? "set"
        : "missing (prod refuses unsigned)",
      data.videoWebhook?.secretConfigured,
    ],
    [
      "Community UGC",
      data.community?.ugcConfigured
        ? "Supabase configured (empty still = Lab only)"
        : "not configured — Lab only",
      data.community?.ugcConfigured,
    ],
  ];

  if (data.forceGenerateFail) {
    rows.push(["Force generate fail", "ON (non-prod ops only)", false]);
  }

  return (
    <dl className="mt-6 space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
      {rows.map(([k, v, good]) => (
        <div key={k} className="flex justify-between gap-4">
          <dt className="text-[var(--fg-dim)]">{k}</dt>
          <dd
            className={
              good === true
                ? "font-semibold text-[var(--mint)]"
                : good === false
                  ? "font-semibold text-white/70"
                  : "text-white/80"
            }
          >
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}
