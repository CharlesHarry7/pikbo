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
    <div className="relative min-h-screen overflow-hidden bg-[#09090B] px-3 py-5 text-[#F4F4F5] sm:px-6 sm:py-7">
      <div className="relative mx-auto max-w-[1500px]">
        <section className="mb-4 rounded-[0.95rem] border border-white/[0.08] bg-[#121214] p-4 sm:mb-5 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#C8FF3D]">
              Seller asset library
            </p>
            <h1 className="mt-2 max-w-3xl font-display text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Your Launch Packs.
            </h1>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-white/48 sm:text-sm">
              Completed clips return here after refresh with fresh owner-only
              links. Start the next SKU from the same fixed three-format Pack.
            </p>
          </div>
          <div>
            <Link
              href="/create?mode=seller-pack"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#C8FF3D] px-5 text-xs font-bold text-[#09090B] transition hover:bg-[#D6FF70]"
            >
              Create new Pack
            </Link>
          </div>
        </div>
          <div className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-2">
            {[
              ["Owner-only", "Private results use fresh download links"],
              ["Recoverable", "Completed clips return after refresh"],
              ["Review first", "Check product details before publishing"],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-[0.75rem] border border-white/[0.08] bg-[#1A1A1E] px-2.5 py-3 sm:px-4">
                <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-[#C8FF3D]">
                  {label}
                </p>
                <p className="mt-1 text-[9px] leading-3.5 text-white/44 sm:text-xs sm:leading-5">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>
        <div className="rounded-[0.95rem] border border-white/[0.08] bg-[#121214] p-3 text-[#F4F4F5] sm:p-4">
          <LibraryGrid />
        </div>
      </div>
    </div>
  );
}
