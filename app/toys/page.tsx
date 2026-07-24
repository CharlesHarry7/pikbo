import type { Metadata } from "next";
import Link from "next/link";
import { TOY_TYPES } from "@/lib/toytypes";
import { site } from "@/lib/site";
import { JsonLd } from "@/components/JsonLd";
import { itemListJsonLd } from "@/lib/jsonLd";
import { recipeHasUniqueProof } from "@/lib/seoIndex";

/** 哥飞：玩具品类枢纽 — 按「我有什么」搜索，进带工具的落地页 */
export const metadata: Metadata = {
  title: "Toy Types — Video for Figures, Plush, Blind Boxes & More",
  description:
    "One page per collectible type: action figures, art toys, anime figures, blind boxes, plush. Each opens Generate with a matching recipe.",
  alternates: { canonical: "/toys" },
  openGraph: {
    title: `Toy Types | ${site.name}`,
    description:
      "Subject-axis SEO landings for the toys you own — tool on every page.",
    url: `${site.url}/toys`,
  },
};

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

  return (
    <div className="relative px-4 py-10 sm:px-8">
      <JsonLd data={itemListLd} />
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
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/create?try=1&sample=scout" className="btn btn-primary text-sm">
            Try free Mini
          </Link>
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
      </div>
    </div>
  );
}
