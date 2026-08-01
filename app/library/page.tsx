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
    <div className="relative min-h-screen overflow-hidden bg-[#0C0B0F] px-4 py-7 text-[#F3EFE6] sm:px-8 sm:py-12">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(42%_80%_at_8%_0%,rgba(196,92,74,0.11),transparent_72%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl">
        <section className="mb-6 rounded-[1.6rem] border border-white/10 bg-[#16141C] p-4 shadow-[0_28px_86px_-58px_rgba(0,0,0,1)] sm:mb-8 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="border-l border-[#C45C4A] pl-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#C6B59A]">
              Seller asset shelf
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-3xl font-medium tracking-[-0.055em] sm:text-6xl">
              Your Launch Packs.
            </h1>
            <p className="mt-3 max-w-2xl text-xs font-normal leading-5 text-[#F3EFE6]/50 sm:mt-4 sm:text-sm sm:leading-6">
              Completed clips return here after refresh with fresh owner-only
              links. Start the next SKU from the same fixed three-format Pack.
            </p>
          </div>
          <div>
            <Link
              href="/create?mode=seller-pack"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#EDE8DF] px-6 text-sm font-semibold text-[#121014] transition hover:bg-[#F3EFE6]"
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
              <div key={label} className="min-w-0 rounded-xl border border-white/[0.08] bg-[#1E1B26] px-2.5 py-3 sm:px-4 sm:py-3.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#C6B59A]">
                  {label}
                </p>
                <p className="mt-1 text-[9px] font-normal leading-3.5 text-[#F3EFE6]/46 sm:text-xs sm:leading-5">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>
        <div className="rounded-[1.6rem] border border-white/10 bg-[#16141C] p-3 text-[#F3EFE6] sm:p-6">
          <LibraryGrid />
        </div>
      </div>
    </div>
  );
}
