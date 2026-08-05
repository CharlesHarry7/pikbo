"use client";

import Link from "next/link";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { track } from "@/lib/analytics";
import { getPreset } from "@/lib/presets";
import { createRemixHref } from "@/lib/remixIntent";
import { HOME_PROOF_BADGE, HOME_PROOF_LIMIT } from "@/lib/softLaunch";
import { hasFeedVideo, type FeedItem } from "@/lib/videoFeed";

/** Analytics + Create deep-link source for the home Lab proof wall (AIT-55). */
export const HOME_PROOF_WALL_SOURCE = "home-proof-wall" as const;

export function HomeViralWall({ items }: { items: FeedItem[] }) {
  const wall = items.filter(hasFeedVideo).slice(0, HOME_PROOF_LIMIT);

  return (
    <section
      id="toy-wall"
      data-home-wall="lab-proof"
      className="scroll-mt-14 overflow-hidden bg-[var(--void)] px-3 py-14 text-[var(--cream)] sm:px-6 sm:py-16 lg:px-10 lg:py-20"
      aria-labelledby="recipe-wall-title"
    >
      <div className="mx-auto mb-8 flex max-w-[1480px] items-end justify-between gap-6 px-1 sm:mb-10">
        <div className="max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#FF4ECD]">
            {HOME_PROOF_BADGE}
          </p>
          <h2
            id="recipe-wall-title"
            className="mt-3 font-display text-4xl font-black tracking-[-0.055em] text-[var(--cream)] sm:text-5xl lg:text-6xl"
          >
            Lab recipes worth a look
          </h2>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-white/52 sm:text-base">
            Up to eight cached Lab previews — including a 360 spin. Each card is
            archive media, not a customer result. Try a recipe to open Create
            with honest guest → sign-in intent.
          </p>
        </div>
        <Link
          href="/effects"
          className="hidden shrink-0 rounded-full border border-white/15 px-5 py-2.5 text-xs font-black text-white/60 transition hover:border-[#FF4ECD]/50 hover:text-[#FF4ECD] sm:block"
        >
          Browse recipe notes ↗
        </Link>
      </div>

      <div className="mx-auto grid max-w-[1480px] grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        {wall.map((item) => {
          const recipeSlug = item.recipeSlug ?? item.demo.preset;
          const recipeName =
            getPreset(recipeSlug)?.name || item.demo.title || item.title;
          const remakeHref = createRemixHref(
            recipeSlug,
            HOME_PROOF_WALL_SOURCE
          );
          const badge = item.badge || HOME_PROOF_BADGE;

          return (
            <article
              key={item.id}
              data-recipe-card={recipeSlug}
              className="group relative isolate aspect-[4/5] min-w-0 overflow-hidden rounded-[1.5rem] border border-white/[0.12] bg-[var(--card)] shadow-[0_24px_60px_-28px_rgba(177,78,255,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4ECD] sm:rounded-[1.75rem]"
            >
              <Link
                href={item.projectHref || remakeHref}
                prefetch
                aria-label={`Explore inside ${recipeName}`}
                className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF4ECD]"
                onClick={() =>
                  track({
                    event: item.projectHref ? "project_open" : "recipe_use",
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
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.045]"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/15"
                  aria-hidden
                />
                <span className="absolute left-2 top-2 rounded-full border border-white/15 bg-black/55 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-white/78 backdrop-blur sm:left-3 sm:top-3 sm:text-[9px]">
                  {badge}
                </span>
                <span className="absolute inset-x-0 bottom-0 p-3 pb-12 sm:p-4 sm:pb-14">
                  <span className="block text-sm font-black leading-tight text-white sm:text-lg">
                    {recipeName}
                  </span>
                  <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-white/50 sm:text-[10px]">
                    Open recipe proof →
                  </span>
                </span>
              </Link>
              <Link
                href={remakeHref}
                prefetch
                aria-label={`Use the ${recipeName} recipe`}
                data-home-proof-cta={HOME_PROOF_WALL_SOURCE}
                className="absolute bottom-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#B14EFF] to-[#FF4ECD] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-[var(--void)] shadow-[0_0_18px_rgba(255,78,205,0.35)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:bottom-4 sm:left-4 sm:text-[10px]"
                onClick={() =>
                  track({
                    event: "recipe_use",
                    path: "/",
                    recipe: recipeSlug,
                    meta: {
                      source: "home_recipe_remake",
                      project: item.projectHref || null,
                      wall: HOME_PROOF_WALL_SOURCE,
                    },
                  })
                }
              >
                Try this recipe
                <span aria-hidden>↗</span>
              </Link>
            </article>
          );
        })}
      </div>

      <div className="mt-7 flex justify-center sm:hidden">
        <Link
          href="/effects"
          className="rounded-full border border-white/15 px-5 py-2.5 text-xs font-bold text-white/70"
        >
          Browse recipe notes
        </Link>
      </div>
    </section>
  );
}
