"use client";

import Link from "next/link";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { track } from "@/lib/analytics";
import { hasFeedVideo, type FeedItem } from "@/lib/videoFeed";
import { getPreset } from "@/lib/presets";
import { WAVE_A_DESTINATIONS } from "@/lib/softLaunch";

export function HomeViralWall({ items }: { items: FeedItem[] }) {
  const wall = items.filter(hasFeedVideo).slice(0, 8);

  return (
    <section
      id="toy-wall"
      data-home-wall="recipe-gallery"
      className="scroll-mt-14 bg-[#050506] px-2 py-12 sm:px-4 sm:py-16 lg:px-6 lg:py-20"
      aria-labelledby="recipe-wall-title"
    >
      <div className="mx-auto mb-7 flex max-w-[1600px] items-end justify-between gap-6 px-2 sm:mb-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c8ff3d]">
            Viral Recipes · 8 proof-backed samples
          </p>
          <h2
            id="recipe-wall-title"
            className="mt-2 font-display text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl"
          >
            Pick a move. Make it yours.
          </h2>
        </div>
        <Link
          href={WAVE_A_DESTINATIONS.recipes.href}
          data-capability-state={WAVE_A_DESTINATIONS.recipes.state}
          className="hidden shrink-0 text-sm font-bold text-white/55 transition hover:text-white sm:block"
        >
          View all recipes →
        </Link>
      </div>

      <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {wall.map((item) => {
          const recipeSlug = item.recipeSlug ?? item.demo.preset;
          const recipeName =
            getPreset(recipeSlug)?.name || item.demo.title || item.title;

          return (
            <article
              key={item.id}
              data-recipe-card={recipeSlug}
              data-media-provenance={item.mediaProvenance}
              className="group relative isolate aspect-[4/5] min-w-0 overflow-hidden rounded-[1rem] border border-white/[0.1] bg-[#111114] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8ff3d] sm:rounded-[1.25rem]"
            >
              <Link
                href={item.detailHref || `/effects/${recipeSlug}`}
                prefetch
                aria-label={`Open ${recipeName} recipe`}
                data-home-card-destination="recipe"
                className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c8ff3d]"
                onClick={() =>
                  track({
                    event: "recipe_open",
                    path: "/",
                    recipe: recipeSlug,
                    meta: {
                      source: "home_recipe_card",
                      project: item.projectHref || null,
                    },
                  })
                }
              >
                <AutoPlayVideo
                  poster={item.demo.poster}
                  webm={item.demo.webm}
                  mp4={item.demo.mp4}
                  lazySources
                  wallDense
                  focusable={false}
                  label={`${recipeName} cached demo`}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/5 to-black/10"
                  aria-hidden
                />
                <span className="absolute left-2 top-2 rounded-full border border-white/15 bg-black/55 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-white/72 backdrop-blur sm:left-3 sm:top-3 sm:text-[9px]">
                  Cached demo
                </span>
                <span className="absolute inset-x-0 bottom-0 p-3 pb-12 sm:p-4 sm:pb-14">
                  <span className="block text-sm font-black leading-tight text-white sm:text-lg">
                    {recipeName}
                  </span>
                  <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-white/50 sm:text-[10px]">
                    Open recipe →
                  </span>
                </span>
              </Link>
              <Link
                href={item.href}
                prefetch
                aria-label={`Use the ${recipeName} recipe`}
                data-home-card-destination="create"
                className="absolute bottom-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-[#c8ff3d] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-black shadow-[0_0_18px_rgba(200,255,61,0.3)] transition hover:bg-[#d5ff6b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:bottom-4 sm:left-4 sm:text-[10px]"
                onClick={() =>
                  track({
                    event: "recipe_use",
                    path: "/",
                    recipe: recipeSlug,
                    meta: {
                      source: "home_recipe_remake",
                      project: item.projectHref || null,
                    },
                  })
                }
              >
                Use this recipe
                <span aria-hidden>↗</span>
              </Link>
            </article>
          );
        })}
      </div>

      <div className="mt-7 flex justify-center sm:hidden">
        <Link
          href={WAVE_A_DESTINATIONS.recipes.href}
          data-capability-state={WAVE_A_DESTINATIONS.recipes.state}
          className="rounded-full border border-white/15 px-5 py-2.5 text-xs font-bold text-white/70"
        >
          View all recipes
        </Link>
      </div>
    </section>
  );
}
