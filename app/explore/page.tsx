import type { Metadata } from "next";
import Link from "next/link";
import { ExploreProjectGrid } from "@/components/ExploreProjectGrid";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import {
  SHOWCASE_CATEGORIES,
  listShowcaseProjects,
  type ShowcaseCategory,
} from "@/lib/showcaseProjects";
import { createGenerate360Href } from "@/lib/jobIntents";
import { site } from "@/lib/site";
import { CONCEPT_ROBOTS } from "@/lib/seoIndex";

/** Explore Generate doors — listing spin remix (ratio/duration/channel). */
const EXPLORE_GENERATE_HREF = createGenerate360Href("explore");

export const metadata: Metadata = {
  title: "Explore PIKBO Lab Toy Video Prototypes",
  description:
    "Lab Viewer free path: open cached PIKBO Lab toy-video prototypes only. Your upload is not processed, and no live provider runs without private beta.",
  alternates: { canonical: "/explore" },
  // Cold-start 2026-07-27: dropped from 13-URL sitemap (long-tail tools win crawl
  // budget). Stay crawlable + follow for deep links; noindex so Lab wall does
  // not compete with rank landings.
  robots: CONCEPT_ROBOTS,
  openGraph: {
    title: `Explore cached toy video prototypes | ${site.name}`,
    description:
      "Lab Viewer free path — labeled cached demos only. No upload processed. No live provider without private beta.",
    url: `${site.url}/explore`,
  },
};

/** Phase H: FAQ so Explore is not a thin Lab wall (reachable · noindex). */
const EXPLORE_FAQ = [
  {
    q: "Are Explore projects customer uploads?",
    a: "No. Every card is a PIKBO Lab cached prototype with a reference poster, a distinct cached output, and a registered recipe. It is not community UGC, and the poster is not claimed as the provider input.",
  },
  {
    q: "Is Lab Viewer free generation of my photo?",
    a: "No. The public free path is cached demos only. Your upload is not processed on Explore, and no live provider call runs without private-beta access.",
  },
  {
    q: "What does Remix / Generate do?",
    a: "Primary Generate doors open the Generate→360 helper with an honest source tag. Recipe remakes open that project’s registered preset. Lab stills are style references only — not your deliverable, and not free live generation.",
  },
  {
    q: "Do cached demos cost credits?",
    a: "No. Cached Lab playback costs 0 credits. Live Seedance Mini uses Free Mini (about one 5s 480p clip with on-player mark) or paid credits when live is enabled for an eligible account.",
  },
] as const;

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const initialCategory =
    cat && SHOWCASE_CATEGORIES.some((item) => item.id === cat)
      ? (cat as "all" | ShowcaseCategory)
      : "all";
  const projects = listShowcaseProjects();

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Pikbo Lab cached toy video prototypes",
    description:
      "Cached prototypes — reference poster, distinct output, registered recipe, and no verified input-output claim.",
    numberOfItems: projects.length,
    itemListElement: projects.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.title,
      url: `${site.url}/projects/${p.slug}`,
      description: p.result,
    })),
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: EXPLORE_FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  return (
    <main
      className="min-h-screen min-w-0 overflow-x-clip bg-black pb-24 text-white"
      data-explore-lab-viewer="free-path"
      data-explore-honesty="cached-only"
      data-explore-mobile="390-safe"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <header className="sticky top-0 z-20 min-w-0 border-b border-white/10 bg-black/90 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex min-w-0 max-w-7xl flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#c8ff3d]">
              Lab Viewer · free path · cached demos only
            </p>
            <h1 className="font-display mt-1 text-2xl font-black uppercase tracking-tight sm:text-3xl">
              Open the project, not just the clip
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-white/45 sm:text-sm">
              Every card is a labeled Pikbo Lab cached prototype — reference
              poster, distinct output, registered recipe. Your upload is not
              processed here. No live provider call without private beta.
              Provider task evidence is still pending.
            </p>
          </div>
          <div
            className="flex min-w-0 max-w-full flex-wrap items-center gap-2"
            data-explore-path="product-first"
          >
            <FreeTrialCta
              path="/explore"
              variant="primary"
              labelDemo="Try cached sample"
            />
            <Link
              href={EXPLORE_GENERATE_HREF}
              className="rounded-full border border-[#c8ff3d]/40 bg-[#c8ff3d]/10 px-5 py-2.5 text-xs font-black text-[#c8ff3d] transition hover:bg-[#c8ff3d]/15"
              data-explore-generate="remix"
            >
              Generate
            </Link>
            <Link
              href="/create?effect=street-power-up&source=explore"
              className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2.5 text-xs font-bold text-white/80 transition hover:border-white/30"
            >
              Create one Moment
            </Link>
            <Link
              href="/modules"
              className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2.5 text-xs font-bold text-white/80 transition hover:border-white/30"
            >
              Modules
            </Link>
            <Link
              href="/library"
              className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2.5 text-xs font-bold text-white/70 transition hover:border-white/30"
            >
              Library
            </Link>
            <Link
              href="/effects"
              className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2.5 text-xs font-bold text-white/70 transition hover:border-white/30"
            >
              Recipes
            </Link>
            <Link
              href="/flow"
              className="rounded-full border border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs font-bold text-white/45 transition hover:border-white/20"
              title="Preview media wall — not a live Seedance job"
            >
              Flow · Preview
            </Link>
          </div>
        </div>
        {/* Free-path honesty chips — guests from pricing Lab Viewer CTA land here */}
        <div
          className="mx-auto mt-3 flex min-w-0 max-w-7xl flex-wrap items-center gap-1.5"
          data-explore-free-path="honesty-chips"
          aria-label="Lab Viewer free path honesty"
        >
          <span className="rounded-full border border-[#c8ff3d]/25 bg-[#c8ff3d]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#c8ff3d]">
            Cached demos only
          </span>
          <span className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-white/55">
            0 credits
          </span>
          <span className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-white/55">
            Upload not processed
          </span>
          <span className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-white/55">
            No live provider without private beta
          </span>
        </div>
        <div className="mx-auto mt-2 flex min-w-0 max-w-7xl flex-wrap items-center gap-2 text-[11px] font-semibold text-white/45">
          <span className="text-[10px] font-normal text-white/30">
            Path ·
          </span>
          <Link
            href={EXPLORE_GENERATE_HREF}
            className="text-[#c8ff3d] hover:underline"
            data-explore-path-generate="remix"
          >
            Generate
          </Link>
          <span aria-hidden className="text-white/20">
            →
          </span>
          <span className="text-white/70">Explore Lab</span>
          <span aria-hidden className="text-white/20">
            →
          </span>
          <Link href="/library" className="hover:text-white hover:underline">
            Library
          </Link>
          <span className="mx-1 text-white/15">|</span>
          <span className="text-[10px] font-normal text-white/30">
            {projects.length} distinct outputs · cached 0 credits · not UGC
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-7xl">
        <div className="px-4 pb-5 pt-7 sm:px-6">
          <h2 className="text-sm font-black uppercase tracking-wide text-white">
            Choose a toy job
          </h2>
          <p className="mt-1 text-xs text-white/40">
            Hover or focus to preview on desktop. On mobile, the project in view
            plays and the previous clip pauses.
          </p>
        </div>
        <ExploreProjectGrid
          projects={projects}
          initialCategory={initialCategory}
        />
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[#c8ff3d]">
              Seller workflow
            </p>
            <h2 className="mt-1 text-lg font-black">
              One photo → one directed marketplace clip
            </h2>
            <p className="mt-1 text-xs text-white/45">
              Pick a preset for the selling job; Pikbo keeps the public choice
              focused on one result at a time.
            </p>
          </div>
          <Link
            href="/create?effect=street-power-up&source=explore-seller-workflow"
            className="shrink-0 rounded-full border border-[#c8ff3d]/40 px-5 py-2.5 text-xs font-black text-[#c8ff3d]"
          >
            Create one Moment →
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-7">
          <h2 className="text-sm font-bold text-white">Explore FAQ</h2>
          <p className="mt-1 text-xs text-white/40">
            PIKBO Lab prototype only · Remix · cached vs live credits
          </p>
          <dl className="mt-4 space-y-4">
            {EXPLORE_FAQ.map((f) => (
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
    </main>
  );
}
