import type { Metadata } from "next";
import Link from "next/link";
import { LibraryGrid } from "@/components/LibraryGrid";
import {
  LIBRARY_EMPTY_GENERATE_HREF,
  LIBRARY_EMPTY_GENERATE_LABEL,
} from "@/lib/libraryEmpty";
import { PRIVATE_ROBOTS } from "@/lib/seoIndex";

export const metadata: Metadata = {
  title: "Your Moments · Library",
  description:
    "Your private Pikbo toy video results — download, retry, or generate again.",
  robots: PRIVATE_ROBOTS,
};

/** Owner-only results. Public samples and device-cached demos stay out. */
export default function LibraryPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--void)] px-4 py-4 text-[var(--cream)] sm:px-8 sm:py-12">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(42%_80%_at_8%_0%,rgba(177,78,255,0.2),transparent_72%),radial-gradient(36%_70%_at_92%_0%,rgba(255,78,205,0.14),transparent_68%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl">
        {/*
          Mobile (~390px): keep one primary Generate 360 CTA above the fold.
          Long copy + stat cards stay sm+ so empty shelf action is immediate.
        */}
        <section
          className="toy-card mb-4 p-4 sm:mb-8 sm:p-8"
          data-library-header="owner-shelf"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#FF4ECD]">
                Private Library
              </p>
              <h1 className="mt-2 max-w-3xl font-display text-3xl font-black tracking-[-0.055em] sm:mt-3 sm:text-6xl">
                <span className="text-bling">Your Moments.</span>
              </h1>
              <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-[var(--fg-muted)] sm:mt-4 sm:block">
                Find every real toy video generated with your account. Download a
                finished result, retry a failed render, or use the same Moment
                again with your next product photo.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
              <Link
                href={LIBRARY_EMPTY_GENERATE_HREF}
                className="btn btn-primary min-h-11 w-full justify-center text-sm sm:w-auto"
                data-library-empty-cta="generate"
                data-library-header-cta="generate"
              >
                {LIBRARY_EMPTY_GENERATE_LABEL}
              </Link>
              <Link
                href="/guides"
                className="text-center text-[11px] font-semibold text-white/40 underline-offset-2 transition hover:text-white/65 hover:underline sm:text-right"
                data-library-empty-cta="docs-secondary"
              >
                How Moments work
              </Link>
            </div>
          </div>
          <div className="mt-7 hidden gap-3 sm:grid sm:grid-cols-3">
            {[
              ["Private", "Only your account can access these results", "#B14EFF"],
              ["Recoverable", "Finished videos return after refresh", "#00D9FF"],
              ["Ready to use", "Download or generate the Moment again", "#00FFA3"],
            ].map(([label, value, accent]) => (
              <div key={label} className="stat-card px-4 py-3.5">
                <p
                  className="text-[9px] font-black uppercase tracking-[0.15em]"
                  style={{ color: accent }}
                >
                  {label}
                </p>
                <p className="mt-1 text-xs font-semibold text-white/48">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>
        <LibraryGrid />
      </div>
    </div>
  );
}
