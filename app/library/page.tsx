import type { Metadata } from "next";
import Link from "next/link";
import { LibraryGrid } from "@/components/LibraryGrid";
import { PRIVATE_ROBOTS } from "@/lib/seoIndex";

export const metadata: Metadata = {
  title: "Library · Assets",
  description:
    "Your toy video assets — private account results and clips saved on this device.",
  robots: PRIVATE_ROBOTS,
};

/** Account results plus clearly labeled device-only imports. */
export default function LibraryPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F6F0E5] px-4 py-7 text-[#17131D] sm:px-8 sm:py-12">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(42%_80%_at_8%_0%,rgba(74,85,255,0.17),transparent_72%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl">
        <section className="mb-6 rounded-[2rem] border-2 border-[#17131D] bg-[#FFD447] p-4 shadow-[9px_9px_0_#17131D] sm:mb-8 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="inline-flex rounded-full bg-[#4A55FF] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white">
              Seller asset shelf
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-3xl font-black tracking-[-0.055em] sm:text-6xl">
              Your Launch Packs.
            </h1>
            <p className="mt-3 max-w-2xl text-xs font-semibold leading-5 text-[#17131D]/58 sm:mt-4 sm:text-sm sm:leading-6">
              Completed clips return here after refresh with fresh owner-only
              links. Start the next SKU from the same fixed three-format Pack.
            </p>
          </div>
          <div>
            <Link
              href="/create?mode=seller-pack"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#FF5A47] px-6 text-sm font-black text-white shadow-[4px_4px_0_#17131D] transition hover:-translate-y-0.5"
            >
              Create new Pack
            </Link>
          </div>
        </div>
          <div className="mt-5 grid grid-cols-3 gap-1.5 sm:mt-7 sm:gap-2">
            {[
              ["Owner-only", "Private results use fresh download links"],
              ["Recoverable", "Completed clips return after refresh"],
              ["Review first", "Check product details before publishing"],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-xl border border-[#17131D]/18 bg-white/55 px-2.5 py-3 sm:px-4 sm:py-3.5">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#4A55FF]">
                  {label}
                </p>
                <p className="mt-1 text-[9px] font-semibold leading-3.5 text-[#17131D]/58 sm:text-xs sm:leading-5">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>
        <div className="rounded-[2rem] border-2 border-[#17131D] bg-[#17131D] p-3 text-[#F6F0E5] shadow-[9px_9px_0_rgba(74,85,255,0.3)] sm:p-6">
          <LibraryGrid />
        </div>
      </div>
    </div>
  );
}
