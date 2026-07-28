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
  const recipeSlug = item?.recipeSlug ?? "miniature-scene";

  return (
    <section
      data-home-hero="toy-cinema"
      data-home-hero-demo={item?.demo?.id ?? HOME_HERO_DEMO_ID}
      className="relative isolate min-h-[calc(100svh-3rem)] overflow-hidden bg-[#050506] lg:min-h-[calc(100svh-3.5rem)]"
      aria-labelledby="home-hero-title"
    >
      {item?.demo ? (
        <div className="absolute inset-0">
          <AutoPlayVideo
            poster={item.demo.poster}
            webm={item.demo.webm}
            mp4={item.demo.mp4}
            eager
            showControls
            focusable={false}
            label={`${item.title} cached demo`}
            className="h-full w-full object-cover object-center"
          />
        </div>
      ) : null}

      <div
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.54)_48%,rgba(0,0,0,0.16)_78%),linear-gradient(0deg,rgba(0,0,0,0.72)_0%,transparent_46%,rgba(0,0,0,0.18)_100%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:64px_64px]"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-[calc(100svh-3rem)] max-w-7xl items-end px-5 pb-10 pt-24 sm:px-8 sm:pb-16 lg:min-h-[calc(100svh-3.5rem)] lg:px-12 lg:pb-20">
        <div className="max-w-4xl">
          <span className="inline-flex rounded-full border border-white/20 bg-black/45 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/76 backdrop-blur">
            Cached demo
          </span>
          <h1
            id="home-hero-title"
            className="mt-5 max-w-4xl font-display text-[clamp(3rem,9vw,8.5rem)] font-black leading-[0.86] tracking-[-0.065em] text-white"
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
