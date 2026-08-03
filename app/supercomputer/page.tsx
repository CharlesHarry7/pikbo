import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BatchStudio } from "@/components/BatchStudio";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { GenerateAfterPath } from "@/components/GenerateAfterPath";
import { createRemixHref } from "@/lib/remixIntent";
import { PREVIEW_ROBOTS } from "@/lib/seoIndex";

/** Supercomputer Generate doors — listing spin remix (ratio/duration/channel). */
const BATCH_GENERATE_HREF = createRemixHref("360-spin-showcase");

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{
    pack?: string;
    effects?: string;
    sku?: string;
    try?: string;
    sample?: string;
  }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  if (sp.pack === "seller") {
    // Legacy entry resolves to the single public Moment before redirect.
    return {
      title: "Street Power-Up toy Moment",
      description:
        "Choose one directed Street Power-Up toy-video Moment from one owned photo.",
      // Not a rank landing — canonical lives on /create?effect=street-power-up (also noindex).
      robots: PREVIEW_ROBOTS,
    };
  }
  return {
    title: "Batch agent · Preview",
    description:
      "Run multiple toy video presets from one photo — Pikbo batch generate for shops.",
    alternates: { canonical: "/supercomputer" },
    // Preview: noindex + crawlable (no robots.txt dual-block)
    robots: PREVIEW_ROBOTS,
  };
}

export default async function SupercomputerPage({
  searchParams,
}: {
  searchParams: Promise<{
    effects?: string;
    pack?: string;
    sku?: string;
    try?: string;
    sample?: string;
  }>;
}) {
  const sp = await searchParams;
  // Legacy Pack links now converge on one public preset-first Moment.
  if (sp.pack === "seller") {
    const q = new URLSearchParams({ effect: "street-power-up" });
    if (sp.sku?.trim()) q.set("sku", sp.sku.trim().slice(0, 64));
    if (sp.try?.trim()) q.set("try", sp.try.trim());
    if (sp.sample?.trim()) q.set("sample", sp.sample.trim());
    redirect(`/create?${q.toString()}`);
  }
  const initialEffects = sp.effects
    ? sp.effects.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  return (
    <div className="relative px-4 py-10 sm:px-8">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[radial-gradient(55%_80%_at_10%_0%,rgba(200,255,61,0.08),transparent_70%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="chip">🧠 Batch agent · Preview</span>
            <h1 className="mt-3 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
              One photo · many clips
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
              This archived lab explored multi-preset batch rendering. Pikbo&apos;s
              public workflow now starts with one toy photo and one directed
              Moment, so you can validate a useful clip before generating more.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap justify-end gap-2">
              <Link
                href="/create?effect=street-power-up"
                className="btn btn-primary text-sm"
              >
                Create one Moment
              </Link>
              <FreeTrialCta
                path="/supercomputer"
                variant="ghost"
                hideClipsChip
              />
              <Link
                href={BATCH_GENERATE_HREF}
                className="btn btn-ghost text-sm"
                data-batch-generate="remix"
              >
                Generate
              </Link>
            </div>
            <GenerateAfterPath compact demo className="justify-end" />
          </div>
        </div>
        <nav
          aria-label="Suite path"
          className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/50"
        >
          <Link
            href={BATCH_GENERATE_HREF}
            className="rounded-full border border-white/15 px-3 py-1.5 hover:border-white/30 hover:text-white"
            data-batch-path-generate="remix"
          >
            Generate
          </Link>
          <span aria-hidden className="text-white/25">
            →
          </span>
          <Link
            href="/create?effect=street-power-up"
            className="rounded-full border border-white/15 px-3 py-1.5 hover:border-white/30 hover:text-white"
          >
            Create one Moment
          </Link>
          <span aria-hidden className="text-white/25">
            →
          </span>
          <span className="rounded-full border border-white/20 bg-white/[0.06] px-3 py-1.5 text-white">
            Batch
          </span>
          <span aria-hidden className="text-white/25">
            →
          </span>
          <Link
            href="/library"
            className="rounded-full border border-white/15 px-3 py-1.5 hover:border-white/30 hover:text-white"
          >
            Library
          </Link>
        </nav>
        <p className="mt-3 text-xs text-[var(--fg-dim)]">
          Honest Preview · not multi-model Supercomputer. Credits debit per
          child job · failed children refund when confirmed.
        </p>
        <BatchStudio initialEffects={initialEffects} />
      </div>
    </div>
  );
}
