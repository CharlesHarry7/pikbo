"use client";

import Link from "next/link";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { track } from "@/lib/analytics";
import { HOME_HERO_DEMO_ID } from "@/lib/demoVideos";
import { hasFeedVideo, type FeedItem } from "@/lib/videoFeed";

function pickHomeHeroItem(items: FeedItem[]) {
  // Prefer a full-subject cinematic clip over the first wall card (Orbit close-up).
  return (
    items.find(
      (candidate) =>
        hasFeedVideo(candidate) && candidate.demo.id === HOME_HERO_DEMO_ID
    ) ?? items.find(hasFeedVideo)
  );
}

export function HomeCinemaHero({ items }: { items: FeedItem[] }) {
  const item = pickHomeHeroItem(items);
  const recipeSlug = item?.recipeSlug ?? "mystery-box-reveal";

  return (
    <section
      data-home-hero="toy-cinema"
      data-home-hero-demo={item?.demo?.id ?? HOME_HERO_DEMO_ID}
      className="relative isolate overflow-hidden bg-[#050506] lg:min-h-[calc(100svh-3.5rem)]"
      aria-labelledby="home-hero-title"
    >
      {item?.demo ? (
        <div className="relative aspect-video w-full bg-[radial-gradient(circle_at_65%_42%,rgba(70,25,100,0.48),transparent_58%)] lg:absolute lg:inset-0 lg:aspect-auto">
          <AutoPlayVideo
            poster={item.demo.poster}
            webm={item.demo.webm}
            mp4={item.demo.mp4}
            eager
            showControls
            focusable={false}
            label={`${item.title} cached demo`}
            className="h-full w-full object-cover object-center lg:object-[62%_center]"
          />
        </div>
      ) : null}

      <div
        className="absolute inset-0 bg-[linear-gradient(0deg,#050506_0%,rgba(5,5,6,0.96)_38%,rgba(5,5,6,0.08)_62%,rgba(5,5,6,0.14)_100%)] lg:bg-[linear-gradient(90deg,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.58)_48%,rgba(0,0,0,0.12)_82%),linear-gradient(0deg,rgba(0,0,0,0.76)_0%,transparent_48%,rgba(0,0,0,0.18)_100%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:64px_64px]"
        aria-hidden
      />

      <div className="relative z-10 max-w-7xl px-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-7 sm:px-8 sm:pt-9 lg:flex lg:min-h-[calc(100svh-3.5rem)] lg:items-end lg:px-12 lg:pb-20 lg:pt-24">
        <div className="max-w-4xl">
          <span className="inline-flex rounded-full border border-white/20 bg-black/45 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/76 backdrop-blur">
            Cached demo
          </span>
          <h1
            id="home-hero-title"
            className="mt-5 max-w-4xl font-display text-[clamp(2.7rem,9vw,8.5rem)] font-black leading-[0.86] tracking-[-0.065em] text-white"
          >
            Bring your toy to life.
          </h1>
          <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-white/72 sm:text-lg lg:text-xl">
            Turn one designer-toy photo into cinematic videos, stories and
            launch content.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href="#toy-wall"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#c8ff3d] px-7 text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-[#d5ff6b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Explore recipes
            </a>
            <Link
              href={`/create?effect=${recipeSlug}`}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/28 bg-black/36 px-7 text-sm font-bold text-white backdrop-blur transition hover:border-white/55 hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8ff3d]"
              data-hero-recipe={recipeSlug}
              onClick={() =>
                track({
                  event: "recipe_use",
                  path: "/",
                  recipe: recipeSlug,
                  demo: true,
                  meta: { source: "home_hero" },
                })
              }
            >
              Create with your toy
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-5 z-10 hidden text-right text-[10px] font-bold uppercase tracking-[0.16em] text-white/44 sm:block">
        <p>{item?.title ?? "Toy Recipe"}</p>
        <p className="mt-1 text-white/28">{item?.subtitle ?? "Pikbo Lab"}</p>
      </div>
    </section>
  );
}
