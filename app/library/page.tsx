import type { Metadata } from "next";
import Link from "next/link";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { LibraryGrid } from "@/components/LibraryGrid";
import { createRemixHref } from "@/lib/remixIntent";
import { PRIVATE_ROBOTS } from "@/lib/seoIndex";

/** Page chrome Generate — listing spin remix (ratio/duration/channel). */
const LIBRARY_PAGE_GENERATE_HREF = createRemixHref("360-spin-showcase");

export const metadata: Metadata = {
  title: "Library · Assets",
  description:
    "Your toy video assets — private account results and clips saved on this device.",
  robots: PRIVATE_ROBOTS,
};

/** Private account results plus clearly labeled device-only imports. */
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
              Private generations persist with your signed-in account and open
              through fresh owner-only links. Clips you import manually stay on
              this device.
            </p>
          </div>
          <div className="hidden flex-wrap items-center gap-2 sm:flex">
            <Link
              href={LIBRARY_PAGE_GENERATE_HREF}
              className="btn btn-primary text-sm"
              data-library-page-generate="remix"
            >
              Generate
            </Link>
            <Link
              href="/create?mode=seller-pack"
              className="btn btn-ghost text-sm"
            >
              Launch Pack
            </Link>
            <FreeTrialCta path="/library" variant="ghost" />
          </div>
        </div>
        <LibraryGrid />
      </div>
    </div>
  );
}
