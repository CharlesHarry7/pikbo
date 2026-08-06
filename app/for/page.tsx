import type { Metadata } from "next";
import Link from "next/link";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { USE_CASES } from "@/lib/usecases";
import { site } from "@/lib/site";
import { JsonLd } from "@/components/JsonLd";
import { itemListJsonLd } from "@/lib/jsonLd";
import { CONCEPT_ROBOTS, recipeHasUniqueProof } from "@/lib/seoIndex";

/**
 * 哥飞：场景枢纽页 — 冷启动 noindex（只索引白名单 /for/* 子页）。
 */
export const metadata: Metadata = {
  title: "Use Cases — Toy Video for Sellers & Collectors",
  description:
    "One page per job: Etsy listings, TikTok Shop, action figures, photo-to-video, collectibles marketing. Each opens Generate with a toy recipe.",
  alternates: { canonical: "/for" },
  robots: CONCEPT_ROBOTS,
  openGraph: {
    title: `Use Cases | ${site.name}`,
    description:
      "Commercial and collector jobs for AI toy video — each page is a tool landing, not a brochure.",
    url: `${site.url}/for`,
  },
};

/** Phase H: FAQ so /for is not a thin use-case index. */
const FOR_FAQ = [
  {
    q: "What is a use-case page?",
    a: "One search job (Etsy listing, TikTok hook, drop teaser…) with an on-page Generate tool and a registered recipe. Not a brochure or feature dump.",
  },
  {
    q: "Does Try free Mini mean unlimited clips?",
    a: "No. Try free is a cached Lab prototype at 0 credits and does not process your upload. When Live is enabled for an eligible account, the configured allowance is finite and the exact quote appears before submission.",
  },
  {
    q: "Are sales guaranteed for sellers?",
    a: "No. Pikbo makes short product clips from photos of toys you own. Marketplace results depend on your listing, price, and traffic.",
  },
] as const;

export default function ForHubPage() {
  // Prefer proof-backed primary recipes first for crawl quality signals.
  const ranked = [...USE_CASES].sort((a, b) => {
    const ap = recipeHasUniqueProof(a.recommendedEffects[0] ?? "") ? 0 : 1;
    const bp = recipeHasUniqueProof(b.recommendedEffects[0] ?? "") ? 0 : 1;
    return ap - bp;
  });

  const itemListLd = itemListJsonLd({
    name: "Pikbo toy video use cases",
    description:
      "One search job per page — sellers and collectors, each with an on-page Generate tool.",
    items: ranked.map((u) => ({
      name: u.label,
      url: `${site.url}/for/${u.slug}`,
      description: u.h1,
    })),
  });

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FOR_FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  return (
    <div className="relative px-4 py-10 sm:px-8">
      <JsonLd data={itemListLd} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(45%_80%_at_0%_0%,rgba(200,255,61,0.06),transparent_70%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-5xl">
        <p className="section-label">Use cases</p>
        <h1 className="mt-2 font-display text-3xl font-black tracking-tight sm:text-4xl">
          One job per page — then open the tool
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
          One URL, one search job. Every card opens a landing with an on-page
          Generate tool — not a feature dump. Lab prototypes are cached; Live
          eligibility and finite quotes are checked in the workbench.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <FreeTrialCta
            path="/for"
            variant="mint"
            labelTry="Preview cached Lab"
          />
          <Link href="/tools" className="btn btn-ghost text-sm">
            Tools hub
          </Link>
          <Link href="/guides" className="btn btn-ghost text-sm">
            Guides
          </Link>
          <Link href="/effects" className="btn btn-ghost text-sm">
            Recipes
          </Link>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ranked.map((u) => {
            const proof = recipeHasUniqueProof(u.recommendedEffects[0] ?? "");
            return (
              <Link
                key={u.slug}
                href={`/for/${u.slug}`}
                className="card group flex flex-col gap-2 p-4 transition hover:border-[var(--mint)]/40"
              >
                <span className="text-lg" aria-hidden>
                  {u.emoji}
                </span>
                <span className="text-sm font-bold text-[var(--fg)] group-hover:text-[var(--mint)]">
                  {u.label}
                </span>
                <span className="text-xs leading-relaxed text-[var(--fg-muted)]">
                  {u.h1}
                </span>
                <span className="mt-auto pt-2 text-[10px] font-bold uppercase tracking-wide text-[var(--fg-dim)]">
                  {proof ? "Lab proof · tool on page" : "Tool on page"} →
                </span>
              </Link>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-[var(--fg-dim)]">
          {USE_CASES.length} use-case landings · each deep-links Generate
        </p>

        <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-7">
          <h2 className="text-sm font-bold text-white">Use cases FAQ</h2>
          <p className="mt-1 text-xs text-white/40">
            One job per page · cached Lab · Live gated · no sales guarantee
          </p>
          <dl className="mt-4 space-y-4 text-left">
            {FOR_FAQ.map((f) => (
              <div key={f.q}>
                <dt className="text-sm font-semibold text-white/90">{f.q}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-white/55">
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
