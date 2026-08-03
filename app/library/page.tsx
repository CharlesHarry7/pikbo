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
    <div className="relative min-h-screen overflow-hidden bg-[#09090a] px-4 py-8 sm:px-8 sm:py-12">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(42%_80%_at_8%_0%,rgba(200,255,61,0.12),transparent_72%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl">
        <section className="mb-8 rounded-[2rem] border border-white/10 bg-[#111113] p-5 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--mint)]">
              Private Library
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-black tracking-[-0.055em] sm:text-6xl">
              Your Moments.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--fg-muted)]">
              Find every real toy video generated with your account. Download a
              finished result, retry a failed render, or use the same Moment
              again with your next product photo.
            </p>
          </div>
          <div>
            <Link
              href={`${MOMENT_CREATE_HREF}&source=library-empty`}
              className="btn btn-primary text-sm"
            >
              Create new Moment
            </Link>
          </div>
        </div>
          <div className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
            {[
              ["Private", "Only your account can access these results"],
              ["Recoverable", "Finished videos return after refresh"],
              ["Ready to use", "Download or generate the Moment again"],
            ].map(([label, value]) => (
              <div key={label} className="bg-black/25 px-4 py-3.5">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#c8ff3d]">
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
