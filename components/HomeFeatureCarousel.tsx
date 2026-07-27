"use client";

import Link from "next/link";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { createLabSampleTryHref } from "@/lib/jobIntents";
import { createRemixHref } from "@/lib/remixIntent";
import { provisionalLabQualityLabel } from "@/lib/showcaseProjects";

/** Seedance Mini trial door — Lab sample remix + try/sample flags. */
const FEATURE_LAB_SAMPLE_HREF = createLabSampleTryHref("scout");

type Promo = {
  id: string;
  title: string;
  blurb: string;
  /** Recipe slug for remake · null for suite doors (Seller Pack / bare Generate) */
  recipeSlug?: string;
  /** Absolute suite path when not a recipe remake */
  suiteHref?: string;
  cta: string;
  badge?: string;
  demoIndex: number;
  /** Seller Pack door — not a single-recipe remake */
  sellerPack?: boolean;
};

const PROMOS: Promo[] = [
  {
    id: "seedance",
    title: "Seedance Mini trial",
    blurb: "Cached preview · live: 5s / 480p",
    suiteHref: FEATURE_LAB_SAMPLE_HREF,
    cta: "Try Mini",
    badge: "Official example · cached",
    demoIndex: 0,
  },
  {
    id: "unbox",
    title: "Blind-box unboxing",
    blurb: "Reveal for Reels & Shop",
    recipeSlug: "blind-box-unboxing",
    cta: "Remake · your toy",
    demoIndex: 1,
  },
  {
    id: "spin",
    title: "360° listing spin",
    blurb: "Marketplace packshot",
    recipeSlug: "360-spin-showcase",
    cta: "Remake · your toy",
    demoIndex: 4,
  },
  {
    id: "viral",
    title: "Drop-day viral hook",
    blurb: "Stop-the-scroll first second",
    recipeSlug: "paparazzi-flash",
    cta: "Remake · your toy",
    demoIndex: 3,
  },
  {
    id: "batch",
    title: "Seller Starter Pack · 3 clips",
    blurb: "Spin · unbox · social hook",
    suiteHref: "/create?mode=seller-pack",
    cta: "Open Seller Starter Pack",
    badge: "Shop · 3 formats",
    demoIndex: 5,
    sellerPack: true,
  },
  {
    id: "story",
    title: "Miniature story world",
    blurb: "Shelf figure → scene",
    recipeSlug: "miniature-scene",
    cta: "Remake · your toy",
    demoIndex: 2,
  },
  {
    id: "unboxed",
    title: "Collector unbox cut",
    blurb: "Launch-day format",
    recipeSlug: "mystery-box-reveal",
    cta: "Remake · your toy",
    demoIndex: 5,
  },
  {
    id: "float",
    title: "Zero-G product hero",
    blurb: "Premium float loop",
    recipeSlug: "floating-hero",
    cta: "Remake · your toy",
    demoIndex: 0,
  },
];

function promoHref(promo: Promo, demoId?: string): string {
  if (promo.sellerPack || promo.suiteHref) {
    return promo.suiteHref || "/create?mode=seller-pack";
  }
  if (promo.recipeSlug) {
    return createRemixHref(promo.recipeSlug, demoId);
  }
  // Fallback Generate door — same listing-spin remix contract as shell CTAs
  return createRemixHref("360-spin-showcase");
}

/** HF top: large full-bleed video cards, almost no chrome */
export function HomeFeatureCarousel() {
  return (
    <section className="pt-2" data-home-carousel="feature">
      <div className="flex gap-3 overflow-x-auto px-3 pb-1 snap-x snap-mandatory sm:gap-4 sm:px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PROMOS.map((promo, i) => {
          const demo = DEMO_VIDEOS[promo.demoIndex % DEMO_VIDEOS.length];
          const recipe =
            promo.recipeSlug ||
            (demo?.preset && !promo.sellerPack ? demo.preset : undefined);
          const labQuality = recipe
            ? provisionalLabQualityLabel(recipe)
            : null;
          const href = promoHref(
            promo,
            recipe && demo?.preset === recipe ? demo.id : undefined
          );
          return (
            <Link
              key={promo.id}
              href={href}
              className="group relative h-[min(62vh,520px)] w-[min(78vw,340px)] shrink-0 snap-start overflow-hidden rounded-3xl bg-zinc-900 sm:h-[min(68vh,560px)] sm:w-[300px] md:w-[320px]"
              data-home-promo={promo.id}
              data-home-promo-path={
                promo.sellerPack
                  ? "seller-pack"
                  : promo.recipeSlug
                    ? "remake"
                    : "suite"
              }
            >
              <AutoPlayVideo
                poster={demo.poster}
                webm={demo.webm}
                mp4={demo.mp4}
                focusable={false}
                desktopPlayMode="interaction"
                eager={i < 3}
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute left-3 top-3 flex max-w-[85%] flex-wrap gap-1">
                {promo.badge ? (
                  <span className="rounded-full bg-[var(--mint)] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-black">
                    {promo.badge}
                  </span>
                ) : (
                  <span
                    className="rounded-full border border-white/10 bg-black/55 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white/80 backdrop-blur"
                    title="Official Lab cached demo · not live customer output"
                  >
                    Official · cached
                  </span>
                )}
                {labQuality ? (
                  <span
                    className="rounded-full border border-amber-200/25 bg-black/55 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-amber-100/90 backdrop-blur"
                    title="Provisional Lab self-check · all scores ≥4/5 · not external human QA"
                    data-proof-quality="provisional-lab"
                  >
                    Lab ≥4
                  </span>
                ) : null}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                <h3 className="text-lg font-bold leading-tight text-white sm:text-xl">
                  {promo.title}
                </h3>
                <p className="mt-1 text-sm text-white/65">{promo.blurb}</p>
                <span className="mt-4 inline-flex rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-md transition group-hover:bg-[var(--mint)] group-hover:text-black">
                  {promo.cta}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
