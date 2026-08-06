import Link from "next/link";
import { site } from "@/lib/site";
import { company } from "@/lib/company";

/**
 * Compact trust surface for the cinema-style homepage.
 * The full site footer intentionally stays hidden on Home because it links to
 * many noindex product/Lab surfaces; this block exposes only truthful trust and
 * support destinations.
 */
export function HomeTrustFooter() {
  return (
    <footer
      className="border-t border-[var(--border)] bg-[var(--bg)] px-4 py-8 text-[var(--fg)] sm:px-7 lg:px-10"
      data-home-trust-footer
    >
      <div className="mx-auto flex max-w-[1120px] flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
            Pikbo · motion for designer toys &amp; 潮玩
          </p>
          <p className="mt-2 max-w-xl text-xs font-medium leading-5 text-[var(--fg-muted)]">
            Style studies and lab samples are labeled. Private creation stays
            gated. Always check generated motion against the physical toy before
            publishing.
          </p>
        </div>

        <div className="lg:text-right">
          <nav
            aria-label="Pikbo trust and support"
            className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-semibold uppercase tracking-[0.12em] lg:justify-end"
          >
            <Link href="/about" className="text-[var(--fg-muted)] hover:text-[var(--brand)]">
              About
            </Link>
            <Link href="/contact" className="text-[var(--fg-muted)] hover:text-[var(--brand)]">
              Contact
            </Link>
            <Link href="/refund" className="text-[var(--fg-muted)] hover:text-[var(--brand)]">
              Refunds
            </Link>
            <Link
              href="/guides/how-to-photograph-toys-for-ai-video"
              className="text-[var(--fg-muted)] hover:text-[var(--brand)]"
            >
              Photo guide
            </Link>
            <Link href="/privacy" className="text-[var(--fg-muted)] hover:text-[var(--brand)]">
              Privacy
            </Link>
            <Link href="/terms" className="text-[var(--fg-muted)] hover:text-[var(--brand)]">
              Terms
            </Link>
          </nav>
          <div className="mt-3 space-y-1 text-[10px] font-medium text-[var(--fg-dim)]">
            <p>
              Support:{" "}
              <a
                href={`mailto:${site.contact.supportEmail}`}
                className="underline decoration-[var(--border)] underline-offset-2 hover:text-[var(--brand)]"
              >
                {site.contact.supportEmail}
              </a>
            </p>
            <p>{company.legalName} · Wyoming LLC · remote operations from Beijing, China</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
