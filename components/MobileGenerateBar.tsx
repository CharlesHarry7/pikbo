"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createRemixHref } from "@/lib/remixIntent";

/** Sticky mobile CTA when not already on Generate / Seller Pack */
const MOBILE_GENERATE_HREF = createRemixHref("360-spin-showcase");

export function MobileGenerateBar() {
  const path = usePathname() || "/";
  // Hide when a full tool surface is already on-screen
  if (
    path.startsWith("/create") ||
    path.startsWith("/generate") ||
    path.startsWith("/supercomputer") ||
    path.startsWith("/effects/") ||
    path.startsWith("/for/") ||
    path.startsWith("/toys/") ||
    path.startsWith("/modules") ||
    path.startsWith("/image") ||
    path.startsWith("/cinema")
  ) {
    return null;
  }
  // Browse walls + home-adjacent — keep suite doors one tap away
  const showBar =
    path.startsWith("/explore") ||
    path.startsWith("/community") ||
    path === "/effects" ||
    path === "/apps" ||
    path === "/library" ||
    path === "/models" ||
    path === "/flow" ||
    path === "/pricing" ||
    path === "/login" ||
    path === "/profile" ||
    path === "/status";
  if (!showBar) return null;

  const onLibrary = path === "/library" || path.startsWith("/library/");

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[4.75rem] z-30 flex justify-center gap-2 px-4 lg:hidden">
      <Link
        href={MOBILE_GENERATE_HREF}
        className="pointer-events-auto btn btn-primary px-5 py-2.5 text-xs shadow-[0_0_30px_rgba(200,255,61,0.35)]"
        data-mobile-bar="generate-remix"
      >
        Generate
      </Link>
      {onLibrary ? (
        <Link
          href="/create?effect=street-power-up"
          className="pointer-events-auto rounded-full border border-[var(--mint)]/40 bg-black/70 px-4 py-2.5 text-xs font-semibold text-[var(--mint)] backdrop-blur"
        >
          Create one Moment
        </Link>
      ) : (
        <Link
          href="/library"
          className="pointer-events-auto rounded-full border border-[var(--mint)]/40 bg-black/70 px-4 py-2.5 text-xs font-semibold text-[var(--mint)] backdrop-blur"
        >
          Library
        </Link>
      )}
      <Link
        href="/modules"
        className="pointer-events-auto rounded-full border border-white/15 bg-black/70 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur"
      >
        Modules
      </Link>
    </div>
  );
}
