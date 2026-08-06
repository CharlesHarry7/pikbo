import type { Metadata } from "next";
import Link from "next/link";
import { LibraryGrid } from "@/components/LibraryGrid";
import {
  libraryEmpty360Href,
  libraryEmptyMomentHref,
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
  const empty360Href = libraryEmpty360Href();
  const emptyMomentHref = libraryEmptyMomentHref();

  return (
    <div className="toy-page min-h-screen px-4 py-8 sm:px-8 sm:py-12">
      <div className="toy-page-glow h-96" aria-hidden />
      <div className="relative mx-auto max-w-7xl">
        <section className="toy-card mb-8 p-5 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="section-label tracking-[0.18em]">Private Library</p>
              <h1 className="mt-3 max-w-3xl font-display text-4xl font-black tracking-[-0.055em] sm:text-6xl">
                <span className="text-bling">Your Moments.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-fg-muted">
                Find every real toy video generated with your account. Download a
                finished result, retry a failed render, or use the same Moment
                again with your next product photo.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={empty360Href}
                className="btn btn-primary text-sm"
                data-library-header-cta="generate-360"
              >
                Generate 360° Spin
              </Link>
              <Link
                href={emptyMomentHref}
                className="btn btn-ghost text-sm"
                data-library-header-cta="moment"
              >
                Create new Moment
              </Link>
            </div>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              {
                label: "Private",
                value: "Only your account can access these results",
                tone: "text-electric-purple",
              },
              {
                label: "Recoverable",
                value: "Finished videos return after refresh",
                tone: "text-tide-blue",
              },
              {
                label: "Ready to use",
                value: "Download or generate the Moment again",
                tone: "text-tide-green",
              },
            ].map(({ label, value, tone }) => (
              <div key={label} className="stat-card px-4 py-3.5">
                <p
                  className={`text-[9px] font-black uppercase tracking-[0.15em] ${tone}`}
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
