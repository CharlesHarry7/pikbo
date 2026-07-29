"use client";

import Image from "next/image";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { hasFeedVideo, type FeedItem } from "@/lib/videoFeed";
import { getPreset } from "@/lib/presets";
import { getRecipeArt } from "@/lib/recipeArt";
import { WAVE_A_DESTINATIONS } from "@/lib/softLaunch";

export function HomeViralWall({ items }: { items: FeedItem[] }) {
  const wall = items.filter(hasFeedVideo).slice(0, 8);

  return (
    <section
      id="toy-wall"
      data-home-wall="recipe-gallery"
      className="scroll-mt-14 bg-[#11130f] px-2 py-12 sm:px-4 sm:py-16 lg:px-6 lg:py-20"
      aria-labelledby="recipe-wall-title"
    >
      <div className="mx-auto mb-7 flex max-w-[1600px] items-end justify-between gap-6 px-2 sm:mb-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b9f529]">
            Eight stories · one original character
          </p>
          <h2
            id="recipe-wall-title"
            className="mt-2 max-w-3xl font-display text-3xl font-black tracking-[-0.04em] text-[#f4f0e6] sm:text-5xl"
          >
            Pick a scene. Keep the character yours.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/52">
            Covers are editorial Recipe art. Open the separate Project proof to
            inspect the registered cached clip.
          </p>
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
          const cover = getRecipeArt(recipeSlug);
          const coverSrc = cover?.src ?? item.demo.poster;
          const coverAlt =
            cover?.alt ?? `${recipeName} registered cached project poster`;

          return (
            <article
              key={item.id}
              data-recipe-card={recipeSlug}
              data-media-provenance="editorial_recipe_art"
              className="group relative isolate aspect-[4/5] min-w-0 overflow-hidden rounded-[1rem] border border-white/[0.1] bg-[#20231d] focus-within:ring-2 focus-within:ring-[#b9f529] sm:rounded-[1.25rem]"
            >
              <Link
                href={item.detailHref || `/effects/${recipeSlug}`}
                prefetch
                aria-label={`Open ${recipeName} recipe`}
                data-home-card-destination="recipe"
                className="absolute inset-0 z-0 focus-visible:outline-none"
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
                <Image
                  src={coverSrc}
                  alt={coverAlt}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition duration-700 group-hover:scale-[1.025]"
                />
                <span
                  className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-black/10"
                  aria-hidden
                />
                <span className="absolute left-2 top-2 rounded-full border border-white/15 bg-black/58 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-white/78 backdrop-blur sm:left-3 sm:top-3 sm:text-[9px]">
                  Editorial recipe art
                </span>
                <span className="absolute inset-x-0 bottom-0 p-3 pb-[4.75rem] sm:p-4 sm:pb-20">
                  <span className="block text-sm font-black leading-tight text-white sm:text-lg">
                    {recipeName}
                  </span>
                  <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-white/58 sm:text-[10px]">
                    Open recipe →
                  </span>
                </span>
              </Link>

              {item.projectHref ? (
                <Link
                  href={item.projectHref}
                  aria-label={`Inspect cached project proof for ${recipeName}`}
                  data-home-card-destination="project"
                  className="absolute bottom-3 right-3 z-20 grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-black/88 text-[8px] font-black uppercase tracking-[0.08em] text-white shadow-lg backdrop-blur transition hover:scale-105 hover:border-[#b9f529] hover:text-[#b9f529] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:bottom-4 sm:right-4 sm:h-12 sm:w-12"
                  onClick={() =>
                    track({
                      event: "project_open",
                      path: "/",
                      recipe: recipeSlug,
                      demo: true,
                      meta: { source: "home_recipe_proof" },
                    })
                  }
                >
                  <span aria-hidden>Proof</span>
                  <span className="sr-only">Cached proof · Inside project</span>
                </Link>
              ) : null}

              <Link
                href={item.href}
                prefetch
                aria-label={`Use the ${recipeName} recipe`}
                data-home-card-destination="create"
                className="absolute bottom-3 left-3 z-20 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#b9f529] px-3 text-[9px] font-black uppercase tracking-[0.08em] text-black shadow-[0_8px_22px_rgba(0,0,0,0.28)] transition hover:bg-[#c8ff55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:bottom-4 sm:left-4 sm:text-[10px]"
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
                Use this recipe <span aria-hidden>↗</span>
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
