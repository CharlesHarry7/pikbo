import type { Metadata } from "next";
import Link from "next/link";
import { LibraryGrid } from "@/components/LibraryGrid";
import { PRIVATE_ROBOTS } from "@/lib/seoIndex";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

export const metadata: Metadata = {
  title: "Your Moments · Library",
  description:
    "Your private Pikbo toy video results — download, retry, or generate again.",
  robots: PRIVATE_ROBOTS,
};

/** Owner-only results. Public samples and device-cached demos stay out. */
export default function LibraryPage() {
  return (
    <div className="library-cabinet px-4 py-8 sm:px-8 sm:py-12">
      <div className="relative z-[1] mx-auto max-w-7xl">
        <section className="collection-card toy-sticker-enter mb-8 p-5 sm:p-8">
          <span className="toy-corner-mark toy-corner-mark-tl" aria-hidden />
          <span className="toy-corner-mark toy-corner-mark-br" aria-hidden />

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="toy-sticker toy-sticker-lime">Private vault</span>
                <span className="toy-sticker toy-sticker-grape">Owner only</span>
                <span className="toy-sticker toy-sticker-outline">No public demos</span>
              </div>
              <h1 className="mt-4 max-w-3xl font-display text-4xl font-black tracking-[-0.055em] sm:text-6xl">
                <span className="text-grad">Your Moments.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--fg-muted)]">
                A private collector shelf for every real toy video on your
                account. Download a finished clip, retry a failed render, or
                run the same Moment with your next product photo.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
              <Link
                href={`${MOMENT_CREATE_HREF}&source=library-empty`}
                className="btn btn-primary text-sm"
              >
                Create new Moment
              </Link>
              <p className="text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35 sm:text-right">
                One photo · private delivery
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {(
              [
                {
                  label: "Private",
                  value: "Only your account can open these results",
                  tone: "private" as const,
                  sticker: "toy-sticker-grape",
                },
                {
                  label: "Recoverable",
                  value: "Finished videos return after refresh",
                  tone: "ready" as const,
                  sticker: "toy-sticker-lime",
                },
                {
                  label: "Ready to use",
                  value: "Download or generate the Moment again",
                  tone: "progress" as const,
                  sticker: "toy-sticker-aqua",
                },
              ] as const
            ).map((item) => (
              <div
                key={item.label}
                className="status-card"
                data-tone={item.tone}
              >
                <span className={`toy-sticker ${item.sticker}`}>{item.label}</span>
                <p className="mt-2 text-xs font-semibold leading-5 text-white/55">
                  {item.value}
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
