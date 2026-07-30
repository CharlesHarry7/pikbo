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
              Launch Pack Library
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-black tracking-[-0.055em] sm:text-6xl">
              Your Launch Packs.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--fg-muted)]">
              Completed clips return here after refresh with fresh owner-only
              links. Start the next SKU from the same fixed three-format Pack.
            </p>
          </div>
          <div>
            <Link
              href="/create?mode=seller-pack"
              className="btn btn-primary text-sm"
            >
              Create new Pack
            </Link>
          </div>
        </div>
          <div className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
            {[
              ["Owner-only", "Private results use fresh download links"],
              ["Recoverable", "Completed clips return after refresh"],
              ["Review first", "Check product details before publishing"],
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
