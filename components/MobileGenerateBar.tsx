"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createGenerate360Href } from "@/lib/jobIntents";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

/** Sticky mobile CTA when not already on Generate / Seller Pack */
const MOBILE_GENERATE_HREF = createGenerate360Href("mobile-bar");
const MOBILE_MOMENT_HREF = `${MOMENT_CREATE_HREF}&source=mobile-bar` as const;

/**
 * Suite secondary doors — text/outline weight only (AIT-606).
 * Not equal solid chips next to primary Generate.
 */
const suiteDoorSecondary =
  "pointer-events-auto rounded-full border border-white/10 bg-transparent px-3 py-2 text-xs font-medium text-[var(--fg-muted)] backdrop-blur-sm transition hover:border-white/20 hover:text-[var(--fg)]";

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
  // Gallery-calm home uses hero/gallery/trust doors (no remount here)
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
    <div
      data-floating-generate="mobile-bar"
      data-mobile-bar-weight="one-primary"
      className="pointer-events-none fixed inset-x-0 bottom-[var(--mobile-nav-clearance)] z-[var(--floating-generate-z)] flex justify-center gap-2 px-4 lg:hidden"
    >
      <Link
        href={MOBILE_GENERATE_HREF}
        className="pointer-events-auto btn btn-primary px-5 py-2.5 text-xs shadow-[0_0_30px_rgba(196,165,116,0.35)]"
        data-mobile-bar="generate-remix"
      >
        Generate
      </Link>
      {onLibrary ? (
        <Link
          href={MOBILE_MOMENT_HREF}
          className={suiteDoorSecondary}
          data-mobile-bar="secondary"
        >
          Create one Moment
        </Link>
      ) : (
        <Link
          href="/library"
          className={suiteDoorSecondary}
          data-mobile-bar="secondary"
        >
          Library
        </Link>
      )}
      <Link
        href="/modules"
        className={suiteDoorSecondary}
        data-mobile-bar="secondary"
      >
        Modules
      </Link>
    </div>
  );
}
