"use client";

import Link from "next/link";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { track } from "@/lib/analytics";
import { hasFeedVideo, type FeedItem } from "@/lib/videoFeed";
import { WAVE_A_DESTINATIONS } from "@/lib/softLaunch";

export function HomeCinemaHero({ items }: { items: FeedItem[] }) {
  const item = items.find(hasFeedVideo);
  const recipeSlug = item?.recipeSlug ?? "floating-hero";
  const createHref = item?.href ?? WAVE_A_DESTINATIONS.generate.href;

  return (
    <section
      data-home-hero="toy-cinema"
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
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              href={createHref}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#c8ff3d] px-7 text-sm font-black text-black shadow-[0_0_34px_rgba(200,255,61,0.26)] transition hover:-translate-y-0.5 hover:bg-[#d5ff6b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              data-hero-recipe={recipeSlug}
              data-hero-action="create"
              data-capability-state={WAVE_A_DESTINATIONS.generate.state}
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
            <a
              href="#toy-wall"
              className="text-sm font-bold text-white/60 underline-offset-4 transition hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8ff3d]"
            >
              Browse recipes ↓
            </a>
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
