"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createGenerate360Href } from "@/lib/jobIntents";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

/** Sticky mobile CTA when not already on Generate / Seller Pack */
const MOBILE_GENERATE_HREF = createGenerate360Href("mobile-bar");
const MOBILE_MOMENT_HREF = `${MOMENT_CREATE_HREF}&source=mobile-bar` as const;

/**
 * Suite floating doors — secondary outline weight only.
 * Board tokens: neon-pink / cream / white (no competitor lime fill/glow).
 */
const suiteDoorSecondary =
  "pointer-events-auto rounded-full border border-white/20 bg-black/70 px-4 py-2.5 text-xs font-semibold text-[var(--cream)]/90 backdrop-blur transition hover:border-[var(--neon-pink)]/45 hover:text-[var(--neon-pink)]";

/** Generate is the lead suite door but still outline secondary (not filled primary). */
const suiteDoorGenerate =
  "pointer-events-auto rounded-full border border-[var(--neon-pink)]/40 bg-black/70 px-5 py-2.5 text-xs font-semibold text-[var(--cream)] backdrop-blur transition hover:border-[var(--neon-pink)]/65 hover:text-[var(--neon-pink)]";

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
    <div
      data-mobile-bar-suite="secondary"
      className="pointer-events-none fixed inset-x-0 bottom-[4.75rem] z-30 flex justify-center gap-2 px-4 lg:hidden"
    >
      <Link
        href={MOBILE_GENERATE_HREF}
        className={suiteDoorGenerate}
        data-mobile-bar="generate-remix"
      >
        Generate
      </Link>
      {onLibrary ? (
        <Link href={MOBILE_MOMENT_HREF} className={suiteDoorSecondary}>
          Create one Moment
        </Link>
      ) : (
        <Link href="/library" className={suiteDoorSecondary}>
          Library
        </Link>
      )}
      <Link href="/modules" className={suiteDoorSecondary}>
        Modules
      </Link>
    </div>
  );
}
