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
      className="border-t border-[#171719]/15 bg-[#F2EFE7] px-4 py-6 text-[#171719] sm:px-7 lg:px-10"
      data-home-trust-footer
    >
      <div className="mx-auto flex max-w-[1360px] flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F04E30]">
            Pikbo · creative moments for designer toys
          </p>
          <p className="mt-2 max-w-xl text-xs font-semibold leading-5 text-[#6C6861]">
            Concepts are labeled. Private creation stays gated. Check every generated detail against the physical toy before publishing.
          </p>
        </div>

        <div className="lg:text-right">
          <nav
            aria-label="Pikbo trust and support"
            className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-black uppercase tracking-[0.12em] lg:justify-end"
          >
            <Link href="/about" className="text-[#5F5B54] hover:text-[#F04E30]">
              About
            </Link>
            <Link href="/contact" className="text-[#5F5B54] hover:text-[#F04E30]">
              Contact
            </Link>
            <Link href="/refund" className="text-[#5F5B54] hover:text-[#F04E30]">
              Refunds
            </Link>
            <Link
              href="/guides/how-to-photograph-toys-for-ai-video"
              className="text-[#5F5B54] hover:text-[#F04E30]"
            >
              Photo guide
            </Link>
            <Link href="/privacy" className="text-[#5F5B54] hover:text-[#F04E30]">
              Privacy
            </Link>
            <Link href="/terms" className="text-[#5F5B54] hover:text-[#F04E30]">
              Terms
            </Link>
          </nav>
          <div className="mt-3 space-y-1 text-[10px] font-semibold text-[#88837A]">
            <p>
              Support:{" "}
              <a
                href={`mailto:${site.contact.supportEmail}`}
                className="underline decoration-[#171719]/20 underline-offset-2 hover:text-[#F04E30]"
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
