import Link from "next/link";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { site } from "@/lib/site";
import { Logo } from "@/components/Logo";
import { CATEGORIES } from "@/lib/presets";
import { USE_CASES } from "@/lib/usecases";
import { TOY_TYPES } from "@/lib/toytypes";

export function Footer() {
  return (
    <footer className="mt-10 border-t border-white/[0.07] bg-gradient-to-b from-[#0a0a0c] to-black">
      <div className="container-x py-14">
        <div className="grid gap-10 md:grid-cols-6">
          <div className="md:col-span-2">
            <Logo size={30} />

            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/45">
              {site.tagline} Video-first studio for toys you own — Generate,
              Modules, Seller Pack.
            </p>
            <div
              className="mt-4 flex flex-wrap items-center gap-2"
              data-footer-path="product-first"
            >
              <Link
                href="/#home-tool"
                className="btn btn-primary !px-3 !py-1.5 text-xs"
              >
                Generate
              </Link>
              <Link
                href="/create?mode=seller-pack"
                className="btn btn-ghost !px-3 !py-1.5 text-xs"
              >
                Seller Pack
              </Link>
              <Link href="/modules" className="btn btn-ghost !px-3 !py-1.5 text-xs">
                Modules
              </Link>
              <Link href="/library" className="btn btn-ghost !px-3 !py-1.5 text-xs">
                Library
              </Link>
              <Link href="/flow" className="btn btn-ghost !px-3 !py-1.5 text-xs text-white/50">
                Flow · Preview
              </Link>
              <FreeTrialCta
                path="/"
                variant="ghost"
                className="btn btn-ghost !px-3 !py-1.5 text-xs"
              />
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--mint)]/80">
              Effects
            </h4>
            <ul className="space-y-2 text-sm text-white/50">
              <li>
                <Link href="/effects" className="transition hover:text-[var(--mint)]">
                  All presets
                </Link>
              </li>
              {CATEGORIES.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/effects#cat-${c.id}`}
                    className="transition hover:text-[var(--mint)]"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--mint)]/80">
              Product
            </h4>
            <ul className="space-y-2 text-sm text-white/50">
              {[
                ["/create", "Generate"],
                ["/effects", "Effects"],
                ["/pricing", "Pricing"],
                ["/explore", "Explore Lab"],
                ["/tools/ai-toy-video-generator", "AI toy video generator"],
                ["/create?mode=seller-pack", "Seller Pack"],
                ["/modules", "Modules"],
                ["/library", "Assets · Local"],
                ["/flow", "Flow · Preview"],
                ["/community", "Lab · noindex"],
                ["/privacy", "Privacy"],
                ["/terms", "Terms"],
              ].map(([h, l]) => (
                <li key={h}>
                  <Link href={h} className="transition hover:text-[var(--mint)]">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--fg-dim)]">
              For
            </h4>
            <ul className="space-y-2 text-sm text-[var(--fg-muted)]">
              <li>
                <Link href="/for" className="font-semibold text-[var(--mint)]/90 hover:text-[var(--mint)]">
                  All use cases
                </Link>
              </li>
              {USE_CASES.slice(0, 10).map((u) => (
                <li key={u.slug}>
                  <Link
                    href={`/for/${u.slug}`}
                    className="hover:text-[var(--mint)]"
                  >
                    {u.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--fg-dim)]">
              Toys
            </h4>
            <ul className="space-y-2 text-sm text-[var(--fg-muted)]">
              {TOY_TYPES.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/toys/${t.slug}`}
                    className="hover:text-[var(--mint)]"
                  >
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-[var(--border)] pt-6 text-xs text-[var(--fg-dim)]">
          © {new Date().getFullYear()} {site.name} · {site.domain}
        </div>
      </div>
    </footer>
  );
}
