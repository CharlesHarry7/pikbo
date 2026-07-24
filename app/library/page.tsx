import type { Metadata } from "next";
import Link from "next/link";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { LibraryGrid } from "@/components/LibraryGrid";
import { PRIVATE_ROBOTS } from "@/lib/seoIndex";

export const metadata: Metadata = {
  title: "Library · Assets",
  description:
    "Your toy video assets — device clips, session jobs, optional Community publish. Not multi-device cloud until durable assets ship.",
  robots: PRIVATE_ROBOTS,
};

/**
 * HF Library / Assets pattern — cloud-feel IA with honest local storage.
 * Group by project or SKU; publish live clips to Community when signed in.
 */
export default function LibraryPage() {
  return (
    <div className="relative px-4 py-10 sm:px-8">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(50%_80%_at_0%_0%,rgba(200,255,61,0.07),transparent_70%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--mint)]">
              Assets · Library
            </p>
            <h1 className="mt-1 font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">
              Your clips
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
              HF-style asset shelf for designer toys: group by project or SKU ·
              remake into Generate · publish live results to Community when
              signed in. Storage is{" "}
              <span className="font-semibold text-[var(--mint)]">
                this device + session ledger
              </span>{" "}
              until multi-device cloud ships — we never claim fake sync.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/create" className="btn btn-primary text-sm">
              Generate
            </Link>
            <FreeTrialCta path="/library" variant="ghost" />
            <Link href="/community" className="btn btn-ghost text-sm">
              Community
            </Link>
            <Link href="/flow" className="btn btn-ghost text-sm">
              Flow
            </Link>
            <Link
              href="/create?mode=seller-pack"
              className="btn btn-ghost text-sm"
            >
              Seller Pack
            </Link>
          </div>
        </div>
        <LibraryGrid />
      </div>
    </div>
  );
}
