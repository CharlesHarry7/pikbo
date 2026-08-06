import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { PRESETS } from "@/lib/presets";
import { allCategoryFeeds } from "@/lib/videoFeed";
import { VideoTile } from "@/components/VideoTile";
import { GenerateSuiteChrome } from "@/components/GenerateSuiteChrome";
import { listCreateShelfWorkflows } from "@/lib/workflows";
import { createGenerate360Href } from "@/lib/jobIntents";
import { proofBackedRecipeSlugs } from "@/lib/seoIndex";
import { site } from "@/lib/site";
import { CONCEPT_ROBOTS } from "@/lib/seoIndex";

/** Effects wall Generate doors — listing spin remix (ratio/duration/channel). */
const EFFECTS_GENERATE_HREF = createGenerate360Href("effects");

export const metadata: Metadata = {
  title: "Toy video presets · Recipes",
  description:
    "Verified Pikbo effects use their own cached clip. Unverified toy-video recipes stay static concepts until proof exists.",
  alternates: { canonical: "/effects" },
  robots: CONCEPT_ROBOTS,
  openGraph: {
    title: `Toy video presets · Recipes | ${site.name}`,
    description:
      "Verified Lab clips and clearly labeled static concept recipes for designer toys.",
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
    a: "Watching Lab demos costs 0 credits and never processes your upload. Public path is a cached Lab prototype. When Live is enabled for an eligible account, Generate shows the exact credit quote before you submit — Lab demos stay free.",
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

      <div className="sticky top-0 z-20 overflow-hidden border-b border-white/[0.07] bg-black/85 px-4 py-3.5 backdrop-blur-xl sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 max-w-full">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c8ff3d]">
              Viral presets · {PRESETS.length} · {proofPresets.length} with Lab video
            </p>
            <h1 className="font-display break-words text-lg font-black uppercase tracking-tight sm:text-2xl">
              Big-budget motion · remake as video
            </h1>
            <p className="mt-0.5 text-[11px] text-white/45">
              Pixel-parity with suite viral walls — tap any card to Generate video ·{" "}
              <Link
                href={EFFECTS_GENERATE_HREF}
                className="font-semibold text-[#c8ff3d] hover:underline"
                data-effects-generate="remix"
              >
                Open Generate →
              </Link>
            </p>
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-2">
            <FreeTrialCta
              path="/effects"
              variant="mint"
              labelTry="Try free"
              className="btn btn-primary !px-4 !py-2 text-xs font-black"
            />
            <Link
              href={EFFECTS_GENERATE_HREF}
              className="btn btn-ghost !px-3 !py-2 text-xs"
              data-effects-video="remix"
            >
              Video
            </Link>
            <Link
              href="/create?effect=street-power-up"
              className="btn btn-ghost !px-3 !py-2 text-xs"
            >
              Create one Moment
            </Link>
            <Link
              href="/modules"
              className="btn btn-ghost !px-3 !py-2 text-xs"
            >
              Modules
            </Link>
            <Link
              href="/flow"
              className="btn btn-ghost !px-3 !py-2 text-xs text-white/50"
              title="Preview media wall — not a live Seedance job"
            >
              Flow · Preview
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
            Lab vs concept · cached Lab · Live gated · no viral guarantee
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
