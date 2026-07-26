"use client";

import Link from "next/link";

/**
 * Post-generate closed loop — product path first (CD Phase A):
 * Library · Seller Pack · Next SKU · Modules · Remix · Publish,
 * then Flow · Preview last (not a live job peer).
 * Shared by CreateStudio + LandingToolPanel + BatchStudio.
 */
export function GenerateAfterPath({
  effectSlug,
  demo = false,
  compact = false,
  className = "",
}: {
  effectSlug?: string;
  demo?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const studioHref = effectSlug
    ? `/create?effect=${encodeURIComponent(effectSlug)}`
    : "/create";
  const nextSkuHref = effectSlug
    ? `/create?effect=${encodeURIComponent(effectSlug)}&try=1`
    : "/create?try=1";

  const chip =
    "rounded-full border border-white/15 bg-white/[0.04] font-bold text-white/75 transition hover:border-white/30 hover:text-white " +
    (compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]");
  const chipMint =
    "rounded-full border border-[var(--mint)]/40 bg-[var(--mint)]/10 font-bold text-[var(--mint)] transition hover:bg-[var(--mint)]/20 " +
    (compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]");
  const chipPreview =
    "rounded-full border border-white/10 bg-white/[0.02] font-bold text-white/45 transition hover:border-white/20 hover:text-white/70 " +
    (compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]");

  return (
    <nav
      aria-label="After generate"
      data-after-path="product-first"
      className={`flex flex-wrap items-center justify-center gap-1.5 ${className}`}
    >
      <Link href="/library" className={chipMint} title="Save and review clips">
        Library
      </Link>
      <Link
        href="/create?mode=seller-pack"
        className={chipMint}
        title="Listing spin + box reveal + social hook"
      >
        Seller Pack
      </Link>
      <Link href={nextSkuHref} className={chip} title="New photo · same commercial path">
        Next SKU
      </Link>
      <Link href="/modules" className={chip}>
        Modules
      </Link>
      <Link href={studioHref} className={chip}>
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
