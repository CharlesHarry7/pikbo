import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BatchStudio } from "@/components/BatchStudio";
import { FreeTrialCta } from "@/components/FreeTrialCta";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string; effects?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  if (sp.pack === "seller") {
    // Legacy entry — still resolve metadata before redirect.
    return {
      title: "Seller Pack · 3 outputs",
      description:
        "One owned toy photo → listing spin, blind-box reveal, and social hook. Marketplace seller workflow on Pikbo.",
    };
  }
  return {
    title: "Batch agent · Preview",
    description:
      "Run multiple toy video presets from one photo — Pikbo batch generate for shops.",
    robots: { index: false, follow: false },
  };
}

export default async function SupercomputerPage({
  searchParams,
}: {
  searchParams: Promise<{ effects?: string; pack?: string }>;
}) {
  const sp = await searchParams;
  // Wave A: Seller Pack canonical is /create?mode=seller-pack
  if (sp.pack === "seller") {
    redirect("/create?mode=seller-pack");
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
              Shop workflow: upload a figure once, queue recipes, render with
              Seedance. Fixed three-format seller path lives on Seller Pack —
              this page is custom multi-preset batch Preview.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/create?mode=seller-pack"
              className="btn btn-primary text-sm"
            >
              Seller Pack · 3
            </Link>
            <FreeTrialCta path="/supercomputer" variant="ghost" />
            <Link href="/create" className="btn btn-ghost text-sm">
              Generate
            </Link>
            <Link href="/library" className="btn btn-ghost text-sm">
              Library
            </Link>
            <Link href="/flow" className="btn btn-ghost text-sm">
              Flow
            </Link>
            <Link href="/modules" className="btn btn-ghost text-sm">
              Modules
            </Link>
          </div>
        </div>
        <nav
          aria-label="Suite path"
          className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/50"
        >
          <Link
            href="/create"
            className="rounded-full border border-white/15 px-3 py-1.5 hover:border-white/30 hover:text-white"
          >
            Generate
          </Link>
          <span aria-hidden className="text-white/25">
            →
          </span>
          <Link
            href="/create?mode=seller-pack"
            className="rounded-full border border-white/15 px-3 py-1.5 hover:border-white/30 hover:text-white"
          >
            Seller Pack
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
