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
      className="border-t border-white/10 bg-[#111722] px-4 py-10 text-white sm:px-6"
      data-home-trust-footer
    >
      <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-[1.4fr_1fr] sm:items-start">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#85A5FF]">
            Built for product truth
          </p>
          <h2 className="mt-2 text-xl font-black text-white">
            Know what Pikbo can—and cannot—do before you publish
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
            Pikbo drafts launch videos from photos of toys you own. Cached Lab
            prototypes are labeled, Live access remains gated, and generated
            angles must be checked against the physical product. We do not
            guarantee sales, reach, rankings, or exact unseen details.
          </p>
        </div>

        <div>
          <nav
            aria-label="Pikbo trust and support"
            className="flex flex-wrap gap-x-4 gap-y-2 text-sm"
          >
            <Link href="/about" className="text-white/75 hover:text-[#85A5FF]">
              About
            </Link>
            <Link href="/contact" className="text-white/75 hover:text-[#85A5FF]">
              Contact
            </Link>
            <Link href="/refund" className="text-white/75 hover:text-[#85A5FF]">
              Refunds
            </Link>
            <Link
              href="/guides/how-to-photograph-toys-for-ai-video"
              className="text-white/75 hover:text-[#85A5FF]"
            >
              Photo guide
            </Link>
            <Link href="/privacy" className="text-white/75 hover:text-[#85A5FF]">
              Privacy
            </Link>
            <Link href="/terms" className="text-white/75 hover:text-[#85A5FF]">
              Terms
            </Link>
          </nav>
          <div className="mt-4 space-y-1 text-xs text-white/45">
            <p>
              Support:{" "}
              <a
                href={`mailto:${site.contact.supportEmail}`}
                className="text-white/65 underline decoration-white/25 underline-offset-2 hover:text-[#85A5FF]"
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
