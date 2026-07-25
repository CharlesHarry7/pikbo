import type { Metadata } from "next";
import Link from "next/link";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { TOY_TYPES } from "@/lib/toytypes";
import { site } from "@/lib/site";
import { JsonLd } from "@/components/JsonLd";
import { itemListJsonLd } from "@/lib/jsonLd";
import { CONCEPT_ROBOTS, recipeHasUniqueProof } from "@/lib/seoIndex";

/** 哥飞：玩具品类枢纽 — 冷启动 noindex */
export const metadata: Metadata = {
  title: "Toy Types — Video for Figures, Plush, Blind Boxes & More",
  description:
    "One page per collectible type: action figures, art toys, anime figures, blind boxes, plush. Each opens Generate with a matching recipe.",
  alternates: { canonical: "/toys" },
  robots: CONCEPT_ROBOTS,
  openGraph: {
    title: `Toy Types | ${site.name}`,
    description:
      "Subject-axis SEO landings for the toys you own — tool on every page.",
    url: `${site.url}/toys`,
  },
};

/** Phase H: FAQ so /toys is not a thin subject index. */
const TOYS_FAQ = [
  {
    q: "What is a toy-type page?",
    a: "One subject cluster (action figure, art toy, blind box…) with an on-page Generate tool and a matching recipe. Search by what you own, not by model name.",
  },
  {
    q: "Do I need a professional product shoot?",
    a: "No. A clear photo of a toy you own is enough to start. Better lighting and a clean background help motion quality, but Lab demos show the look first.",
  },
  {
    q: "Is Free Mini a 10-second clip?",
    a: "No. Free Mini live is about one Seedance Mini result (5s · 480p · on-player mark). Longer or paid durations need credits. Lab samples cost 0.",
  },
] as const;

export default function ToysHubPage() {
  const ranked = [...TOY_TYPES].sort((a, b) => {
    const ap = recipeHasUniqueProof(a.recommendedEffects[0] ?? "") ? 0 : 1;
    const bp = recipeHasUniqueProof(b.recommendedEffects[0] ?? "") ? 0 : 1;
    return ap - bp;
  });

  const itemListLd = itemListJsonLd({
    name: "Pikbo toy type video landings",
    description:
      "Photo-to-video landings organized by what you own — each with an on-page Generate tool.",
    items: ranked.map((t) => ({
      name: t.label,
      url: `${site.url}/toys/${t.slug}`,
      description: t.h1,
    })),
  });

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: TOYS_FAQ.map((f) => ({
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
      <div className="relative mx-auto max-w-5xl">
        <p className="section-label">Toys</p>
        <h1 className="mt-2 font-display text-3xl font-black tracking-tight sm:text-4xl">
          Video for the toy you actually own
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
          Search by subject (action figure, art toy, blind box…). Each page is one
          keyword cluster with an on-page upload → generate tool. Free Mini caps
          apply; Lab demos are cached samples.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <FreeTrialCta
            path="/toys"
            variant="mint"
            labelTry="Try free Mini"
          />
          <Link href="/for" className="btn btn-ghost text-sm">
            Use cases
          </Link>
          <Link href="/tools" className="btn btn-ghost text-sm">
            Tools
          </Link>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ranked.map((t) => {
            const proof = recipeHasUniqueProof(t.recommendedEffects[0] ?? "");
            return (
              <Link
                key={t.slug}
                href={`/toys/${t.slug}`}
                className="card group flex flex-col gap-2 p-4 transition hover:border-[var(--mint)]/40"
              >
                <span className="text-lg" aria-hidden>
                  {t.emoji}
                </span>
                <span className="text-sm font-bold group-hover:text-[var(--mint)]">
                  {t.label}
                </span>
                <span className="text-xs text-[var(--fg-muted)]">{t.h1}</span>
                <span className="mt-auto pt-2 text-[10px] font-bold uppercase tracking-wide text-[var(--fg-dim)]">
                  {proof ? "Lab proof · tool on page" : "Tool on page"} →
                </span>
              </Link>
            );
          })}
        </div>
        <p className="mt-8 text-center text-xs text-[var(--fg-dim)]">
          {TOY_TYPES.length} toy-type landings
        </p>

        <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-7">
          <h2 className="text-sm font-bold text-white">Toy types FAQ</h2>
          <p className="mt-1 text-xs text-white/40">
            Subject landings · Free Mini 5s · tool on page
          </p>
          <dl className="mt-4 space-y-4 text-left">
            {TOYS_FAQ.map((f) => (
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
