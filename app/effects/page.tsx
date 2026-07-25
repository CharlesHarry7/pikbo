import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { PRESETS } from "@/lib/presets";
import { allCategoryFeeds } from "@/lib/videoFeed";
import { VideoTile } from "@/components/VideoTile";
import { GenerateSuiteChrome } from "@/components/GenerateSuiteChrome";
import { listCreateShelfWorkflows } from "@/lib/workflows";
import { proofBackedRecipeSlugs } from "@/lib/seoIndex";
import { site } from "@/lib/site";
import { CONCEPT_ROBOTS } from "@/lib/seoIndex";

export const metadata: Metadata = {
  title: "Toy video presets · Recipes",
  description:
    "Every Pikbo effect as a playable video — spin, unbox, dance, cinematic scenes for designer toys. Remake in Generate.",
  alternates: { canonical: "/effects" },
  robots: CONCEPT_ROBOTS,
  openGraph: {
    title: `Toy video presets · Recipes | ${site.name}`,
    description:
      "Playable Lab recipes for designer toys — spin, unbox, dance, shelf. Remix in Generate.",
    url: `${site.url}/effects`,
  },
};

/** Phase H: FAQ so /effects is not a thin recipe wall. */
const EFFECTS_FAQ = [
  {
    q: "What is a Lab recipe vs a concept recipe?",
    a: "Lab recipes have a unique cached demo clip and open Generate with that effect. Concept recipes are reachable for SEO/IA but stay labeled concept and may be noindex until proof exists.",
  },
  {
    q: "Does remaking a preset cost credits?",
    a: "Watching Lab demos costs 0. Live Seedance Mini uses Free Mini (about one 5s 480p clip with on-player mark) or paid credits. Exhausted trial CTAs go to plans — Lab still free.",
  },
  {
    q: "Is every card a guaranteed viral look?",
    a: "No. Recipes are motion templates for toys you own. Marketplace or social performance is not guaranteed.",
  },
] as const;

/** HF viral-presets wall + suite chrome (toy vertical) */
export default function EffectsHub() {
  const groups = allCategoryFeeds();
  const jobBlocks = listCreateShelfWorkflows().filter(
    (w) => w.id !== "photo-to-clip"
  );
  // Phase H: ItemList only proof-backed recipes (concept walls stay reachable/noindex).
  const proofSlugs = new Set(proofBackedRecipeSlugs());
  const proofPresets = PRESETS.filter((p) => proofSlugs.has(p.slug));
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Pikbo Lab toy video recipes with proof",
    description:
      "Effect landings that have a unique Lab cached demo. Concept recipes without proof are omitted.",
    numberOfItems: proofPresets.length,
    itemListElement: proofPresets.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.name,
      url: `${site.url}/effects/${p.slug}`,
      description: p.seoDescription,
    })),
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: EFFECTS_FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  return (
    <div className="pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <Suspense
        fallback={
          <div className="border-b border-white/10 px-4 py-3 text-sm text-white/40">
            Generate · Recipes
          </div>
        }
      >
        <GenerateSuiteChrome compact />
      </Suspense>

      <div className="sticky top-0 z-20 border-b border-white/[0.07] bg-black/85 px-4 py-3.5 backdrop-blur-xl sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c8ff3d]">
              Viral presets · {PRESETS.length} · {proofPresets.length} with Lab video
            </p>
            <h1 className="font-display text-xl font-black uppercase tracking-tight sm:text-2xl">
              Big-budget motion · remake as video
            </h1>
            <p className="mt-0.5 text-[11px] text-white/45">
              Pixel-parity with suite viral walls — tap any card to Generate video ·{" "}
              <Link href="/create" className="font-semibold text-[#c8ff3d] hover:underline">
                Open Generate →
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FreeTrialCta
              path="/effects"
              variant="mint"
              labelTry="Try free"
              className="btn btn-primary !px-4 !py-2 text-xs font-black"
            />
            <Link
              href="/flow"
              className="btn btn-ghost !px-3 !py-2 text-xs"
            >
              Flow
            </Link>
            <Link
              href="/create"
              className="btn btn-ghost !px-3 !py-2 text-xs"
            >
              Video
            </Link>
            <Link
              href="/create?mode=seller-pack"
              className="btn btn-ghost !px-3 !py-2 text-xs"
            >
              Seller Pack
            </Link>
          </div>
        </div>

        {/* Job-first chips — suite modules on the recipe wall */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {jobBlocks.map((w) => (
            <Link
              key={w.id}
              href={w.href}
              className="shrink-0 rounded-full border border-[var(--mint)]/35 bg-[var(--mint)]/[0.1] px-3 py-1.5 text-[11px] font-semibold text-[var(--mint)] shadow-[0_0_20px_rgba(200,255,61,0.08)] transition hover:border-[var(--mint)] hover:bg-[var(--mint)]/15"
            >
              {w.emoji} {w.label}
            </Link>
          ))}
          {groups.map(({ category }) => (
            <a
              key={category.id}
              href={`#cat-${category.id}`}
              className="shrink-0 rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-white/55 transition hover:border-[var(--mint)]/40 hover:text-[var(--mint)]"
            >
              {category.label}
            </a>
          ))}
        </div>
      </div>

      {groups.map(({ category, items }) => (
        <section
          key={category.id}
          id={`cat-${category.id}`}
          className="scroll-mt-40 border-b border-white/[0.06] px-3 py-8 sm:px-5"
        >
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2 px-1">
            <div>
              <h2 className="font-display text-base font-bold tracking-tight sm:text-lg">
                {category.label}
              </h2>
              <p className="mt-0.5 text-xs text-white/40">{category.blurb}</p>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
              {items.length} looks
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
            {items.map((item) => (
              <VideoTile key={item.id} item={item} compact />
            ))}
          </div>
        </section>
      ))}

      <section className="mx-auto max-w-7xl px-3 pb-10 pt-6 sm:px-5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-7">
          <h2 className="text-sm font-bold text-white">Recipes FAQ</h2>
          <p className="mt-1 text-xs text-white/40">
            Lab vs concept · Free Mini · no viral guarantee
          </p>
          <dl className="mt-4 space-y-4">
            {EFFECTS_FAQ.map((f) => (
              <div key={f.q}>
                <dt className="text-sm font-semibold text-white/90">{f.q}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-white/55">
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
