"use client";

import Link from "next/link";

/**
 * HF post-generate loop chips — Library · Pack · Flow · Modules.
 * Shared by CreateStudio + LandingToolPanel (Generate closed loop).
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

  const chip =
    "rounded-full border border-white/15 bg-white/[0.04] font-bold text-white/75 transition hover:border-white/30 hover:text-white " +
    (compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]");
  const chipMint =
    "rounded-full border border-[var(--mint)]/40 bg-[var(--mint)]/10 font-bold text-[var(--mint)] transition hover:bg-[var(--mint)]/20 " +
    (compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]");

  return (
    <nav
      aria-label="After generate"
      className={`flex flex-wrap items-center justify-center gap-1.5 ${className}`}
    >
      <Link href="/library" className={chipMint}>
        Library
      </Link>
      <Link href={studioHref} className={chip}>
        Full Generate
      </Link>
      <Link href="/create?mode=seller-pack" className={chip}>
        Seller Pack
      </Link>
      <Link href="/flow" className={chip}>
        Flow
      </Link>
      <Link href="/modules" className={chip}>
        Modules
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
    </nav>
  );
}
