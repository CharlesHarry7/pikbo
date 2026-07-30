import Link from "next/link";
import { site } from "@/lib/site";
import { Logo } from "@/components/Logo";

const FOOTER_GROUPS = [
  {
    label: "Product",
    links: [
      ["/create?mode=seller-pack&source=footer&try=1&sample=scout", "Create"],
      ["/library", "Library"],
      ["/pricing", "Pricing"],
    ],
  },
  {
    label: "Learn",
    links: [
      ["/tools/ai-toy-video-generator", "AI toy video generator"],
      [
        "/guides/seller-pack-workflow-listing-reveal-hook",
        "Launch Pack guide",
      ],
    ],
  },
  {
    label: "Company",
    links: [
      ["/about", "About"],
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
              Turn one owned toy photo into a fixed Listing Spin, Blind-box
              Reveal, and Social Flash.
            </p>
            <Link
              href="/create?mode=seller-pack&source=footer&try=1&sample=scout"
              className="btn btn-primary mt-5 !px-4 !py-2 text-xs"
              data-footer-path="product-first"
            >
              Preview Launch Pack
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
        <div className="mt-10 border-t border-[var(--border)] pt-6 text-xs text-[var(--fg-dim)]">
          © {new Date().getFullYear()} {site.name} · {site.domain}
        </div>
      </div>
    </footer>
  );
}
