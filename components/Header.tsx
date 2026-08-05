import Link from "next/link";
import { site } from "@/lib/site";
import { CreditsBadge } from "@/components/CreditsBadge";
import {
  CHROME_GENERATE_SOURCE,
  createGenerate360Href,
} from "@/lib/jobIntents";

/**
 * Primary header CTA — listing spin remix (ratio/duration/channel).
 * AIT-122: deep-links `/create` only (no bare `/login`). Guest sign-in on
 * Create preserves effect/source via guestCreateIntent.
 */
const HEADER_GENERATE_HREF = createGenerate360Href(
  CHROME_GENERATE_SOURCE.header
);

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span
            className="grid h-8 w-8 place-items-center rounded-xl text-base"
            style={{ background: "var(--grad)" }}
          >
            🧸
          </span>
          <span>{site.name}</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-[var(--fg-muted)] md:flex">
          <Link href="/effects" className="hover:text-[var(--fg)]">
            Effects
          </Link>
          <Link href="/#how" className="hover:text-[var(--fg)]">
            How it works
          </Link>
          <Link href="/pricing" className="hover:text-[var(--fg)]">
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <CreditsBadge />
          <Link
            href={HEADER_GENERATE_HREF}
            className="btn btn-primary text-sm"
            data-header-cta="generate-remix"
            data-chrome-generate-source={CHROME_GENERATE_SOURCE.header}
          >
            Create a clip
          </Link>
        </div>
      </div>
    </header>
  );
}
