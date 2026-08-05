import Link from "next/link";
import { site } from "@/lib/site";
import { company } from "@/lib/company";
import { createGenerate360Href } from "@/lib/jobIntents";
import { Logo } from "@/components/Logo";

/** Product footer Create — same Generate→360 deep link as primary nav CTAs. */
const FOOTER_CREATE_HREF = createGenerate360Href("footer");

const FOOTER_GROUPS = [
  {
    label: "Product",
    links: [
      [FOOTER_CREATE_HREF, "Generate 360°"],
      ["/library", "Library"],
      ["/pricing", "Pricing"],
    ],
  },
  {
    label: "Learn",
    links: [
      ["/tools/ai-toy-video-generator", "AI toy video generator"],
      [
        "/guides/how-to-make-a-figure-spin-video",
        "Figure spin guide",
      ],
    ],
  },
  {
    label: "Company",
    links: [
      ["/about", "About"],
      ["/contact", "Contact"],
      ["/refund", "Refunds"],
      ["/privacy", "Privacy"],
      ["/terms", "Terms"],
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="mt-10 border-t border-white/[0.07] bg-gradient-to-b from-[#0a0a0c] to-black">
      <div className="container-x py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo size={30} />

            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/45">
              Turn one owned toy photo into a listing-ready 360° spin — same
              Generate path as primary nav.
            </p>
            <Link
              href={FOOTER_CREATE_HREF}
              className="btn btn-primary mt-5 !px-4 !py-2 text-xs"
              data-footer-path="generate-360"
              data-footer-cta="generate-360"
            >
              Generate 360° spin
            </Link>
          </div>
          {FOOTER_GROUPS.map((group) => (
            <div key={group.label}>
              <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--mint)]/80">
                {group.label}
              </h4>
              <ul className="space-y-2 text-sm text-white/50">
                {group.links.map(([href, label]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="transition hover:text-[var(--mint)]"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-[var(--border)] pt-6 text-xs text-[var(--fg-dim)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {company.legalName} · {site.domain}</p>
          <a
            href={`mailto:${site.contact.supportEmail}`}
            className="hover:text-[var(--mint)]"
          >
            {site.contact.supportEmail}
          </a>
        </div>
      </div>
    </footer>
  );
}
