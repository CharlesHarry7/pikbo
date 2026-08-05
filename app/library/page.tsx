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
        <section className="collection-card motion-enter mb-8 p-5 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#a84578]">
                Private collector shelf
              </p>
              <h1 className="mt-3 max-w-3xl font-display text-4xl font-black tracking-[-0.055em] text-[#0e0e12] sm:text-6xl">
                Your Moments.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#0e0e12]/72">
                Every real toy video on your account lives here. Download a
                finished clip, retry a failed render, or run the same Moment
                with your next product photo.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
              <Link
                href={`${MOMENT_CREATE_HREF}&source=library-empty`}
                className="btn btn-primary text-sm"
              >
                Create new Moment
              </Link>
              <p className="text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0e0e12]/45 sm:text-right">
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
                  tone: "status-card--private" as const,
                },
                {
                  label: "Recoverable",
                  value: "Finished videos return after refresh",
                  tone: "status-card--ok" as const,
                },
                {
                  label: "Ready to use",
                  value: "Download or generate the Moment again",
                  tone: "status-card--info" as const,
                },
              ] as const
            ).map((item) => (
              <div key={item.label} className={`status-card ${item.tone}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/80">
                  {item.label}
                </p>
                <p className="mt-1.5 text-xs font-semibold leading-5 text-white/55">
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
