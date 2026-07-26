"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { JobIntentId } from "@/lib/jobIntents";
import { getJobIntent } from "@/lib/jobIntents";
import { loadToyIdentity } from "@/lib/toyIdentity";
import {
  createRemixHref,
  remixOptsFromRecord,
} from "@/lib/remixIntent";

/**
 * Post-generate closed loop — product path first (CD Phase A + job carry):
 * Library · Seller Pack · Next SKU · Modules · Remix · Publish,
 * then Flow · Preview last (not a live job peer).
 * Shared by CreateStudio + LandingToolPanel + BatchStudio + Preview shelves.
 *
 * Job/SKU query carry keeps commercial context on the next hop
 * (Creative Director: same seller path, new photo or same goal).
 * When `sku` prop is omitted, device-local bible SKU is auto-hydrated so
 * Cinema / Supercomputer / Image shelves still carry Next SKU honesty.
 *
 * Full Generate / Next SKU use createRemixHref so ratio/duration/channel
 * from the last run (or recipe defaults) reopen Create correctly.
 */
function withQuery(
  base: string,
  params: Record<string, string | undefined | null>
): string {
  const u = new URL(base, "https://pikbo.ai");
  for (const [k, v] of Object.entries(params)) {
    if (v && String(v).trim()) u.searchParams.set(k, String(v).trim());
  }
  return `${u.pathname}${u.search}`;
}

export function GenerateAfterPath({
  effectSlug,
  demo = false,
  compact = false,
  className = "",
  jobIntentId,
  sku,
  aspectRatio,
  duration,
}: {
  effectSlug?: string;
  demo?: boolean;
  compact?: boolean;
  className?: string;
  /** Active commercial goal — carried into Next SKU / Full Generate links */
  jobIntentId?: JobIntentId | null;
  /**
   * Character bible SKU for next hop. When null/undefined, auto-loads
   * device-local bible (prop empty string still means "no SKU").
   */
  sku?: string | null;
  /** Last successful run ratio — Full Generate remake honesty. */
  aspectRatio?: string;
  /** Last successful run duration seconds (5 | 10). */
  duration?: number;
}) {
  const [deviceSku, setDeviceSku] = useState("");
  useEffect(() => {
    // Explicit prop (including "") wins — only auto-load when omitted.
    if (sku !== undefined && sku !== null) return;
    const t = window.setTimeout(() => {
      try {
        const id = loadToyIdentity();
        if (id.sku) setDeviceSku(id.sku);
      } catch {
        /* private mode */
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [sku]);

  const resolvedSku =
    sku !== undefined && sku !== null
      ? String(sku).trim() || undefined
      : deviceSku.trim() || undefined;

  const intent = jobIntentId ? getJobIntent(jobIntentId) : undefined;
  const effect = effectSlug || intent?.effect;
  const carry = {
    effect: effect || undefined,
    job: jobIntentId || undefined,
    sku: resolvedSku,
  };
  const remixOpts = remixOptsFromRecord({
    aspectRatio: aspectRatio || intent?.aspectRatio,
    duration,
    channel: intent?.channel,
  });

  /**
   * Jobs with `href` (Seller Pack) must land on mode=seller-pack — not
   * /create?job=seller-pack which CreateStudio used to ignore (href early-return).
   * Otherwise remix contract carries ratio/duration/channel (+ optional job).
   */
  const studioHref = intent?.href
    ? withQuery(intent.href, { sku: carry.sku })
    : carry.effect
      ? withQuery(
          createRemixHref(carry.effect, undefined, carry.sku, remixOpts),
          { job: carry.job }
        )
      : withQuery("/create", {
          job: carry.job,
          sku: carry.sku,
        });
  const nextSkuHref = intent?.href
    ? withQuery(intent.href, { sku: carry.sku, try: "1" })
    : carry.effect
      ? withQuery(
          createRemixHref(carry.effect, undefined, carry.sku, remixOpts),
          { job: carry.job, try: "1" }
        )
      : withQuery("/create", {
          job: carry.job,
          sku: carry.sku,
          try: "1",
        });
  const sellerPackHref = withQuery("/create", {
    mode: "seller-pack",
    sku: carry.sku,
  });

  const chip =
    "rounded-full border border-white/15 bg-white/[0.04] font-bold text-white/75 transition hover:border-white/30 hover:text-white " +
    (compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]");
  const chipMint =
    "rounded-full border border-[var(--mint)]/40 bg-[var(--mint)]/10 font-bold text-[var(--mint)] transition hover:bg-[var(--mint)]/20 " +
    (compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]");
  const chipPreview =
    "rounded-full border border-white/10 bg-white/[0.02] font-bold text-white/45 transition hover:border-white/20 hover:text-white/70 " +
    (compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]");

  const jobHint = intent
    ? `${intent.label} · ${intent.channel}`
    : "commercial path";

  return (
    <nav
      aria-label="After generate"
      data-after-path="product-first"
      data-after-job={jobIntentId || "none"}
      data-after-sku={resolvedSku ? "yes" : "no"}
      className={`flex flex-wrap items-center justify-center gap-1.5 ${className}`}
    >
      {intent ? (
        <span
          className={
            compact
              ? "w-full text-center text-[9px] font-bold uppercase tracking-wider text-white/35"
              : "w-full text-center text-[10px] font-bold uppercase tracking-wider text-white/40"
          }
          data-after-job-label={intent.id}
        >
          Next · {jobHint}
        </span>
      ) : null}
      <Link href="/library" className={chipMint} title="Save and review clips">
        Library
      </Link>
      <Link
        href={sellerPackHref}
        className={chipMint}
        title="Listing spin + box reveal + social hook"
        data-after-seller-pack="1"
      >
        Seller Pack
      </Link>
      <Link
        href={nextSkuHref}
        className={chip}
        title="New photo · same commercial path"
        data-after-next-sku="1"
      >
        Next SKU
      </Link>
      <Link href="/modules" className={chip}>
        Modules
      </Link>
      <Link href={studioHref} className={chip} data-after-full-generate="1">
        Full Generate
      </Link>
      {!demo ? (
        <Link
          href="/library"
          className={chip}
          title="Publish live clips from Library when signed in"
        >
          Publish path
        </Link>
      ) : null}
      <Link
        href="/flow"
        className={chipPreview}
        title="Preview media wall — not a live Seedance job"
      >
        Flow · Preview
      </Link>
    </nav>
  );
}
