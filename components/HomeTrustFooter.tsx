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
      className="border-t border-white/10 bg-[#08080A] px-4 py-6 text-[#F7F4ED] sm:px-7 lg:px-10"
      data-home-trust-footer
    >
      <div className="mx-auto flex max-w-[1360px] flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#FF6A4D]">
            Pikbo · creative moments for designer toys
          </p>
          <p className="mt-2 max-w-xl text-xs font-semibold leading-5 text-white/52">
            Concepts are labeled. Private creation stays gated. Check every generated detail against the physical toy before publishing.
          </p>
        </div>

        <div className="lg:text-right">
          <nav
            aria-label="Pikbo trust and support"
            className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-black uppercase tracking-[0.12em] lg:justify-end"
          >
            <Link href="/about" className="text-white/55 hover:text-[#FF6A4D]">
              About
            </Link>
            <Link href="/contact" className="text-white/55 hover:text-[#FF6A4D]">
              Contact
            </Link>
            <Link href="/refund" className="text-white/55 hover:text-[#FF6A4D]">
              Refunds
            </Link>
            <Link
              href="/guides/how-to-photograph-toys-for-ai-video"
              className="text-white/55 hover:text-[#FF6A4D]"
            >
              Photo guide
            </Link>
            <Link href="/privacy" className="text-white/55 hover:text-[#FF6A4D]">
              Privacy
            </Link>
            <Link href="/terms" className="text-white/55 hover:text-[#FF6A4D]">
              Terms
            </Link>
          </nav>
          <div className="mt-3 space-y-1 text-[10px] font-semibold text-white/40">
            <p>
              Support:{" "}
              <a
                href={`mailto:${site.contact.supportEmail}`}
                className="underline decoration-white/20 underline-offset-2 hover:text-[#FF6A4D]"
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
