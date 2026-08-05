"use client";

import Link from "next/link";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { track } from "@/lib/analytics";
import { hasFeedVideo, type FeedItem } from "@/lib/videoFeed";
import { getPreset } from "@/lib/presets";
import {
  HOME_PROOF_BADGE,
  HOME_PROOF_LIMIT,
  MOMENT_CREATE_HREF,
} from "@/lib/softLaunch";

/** Analytics + guest-intent entry for the home Lab proof wall (AIT-87 / AIT-38 PR-1). */
const HOME_PROOF_ENTRY = "home-proof-wall" as const;

/** Append entry attribution without clobbering remix `source` (project slug). */
function withProofEntry(href: string): string {
  if (href.includes(`entry=${HOME_PROOF_ENTRY}`)) return href;
  const joiner = href.includes("?") ? "&" : "?";
  return `${href}${joiner}entry=${HOME_PROOF_ENTRY}`;
}

/**
 * Below-fold Lab proof wall for Moment home: ≤ HOME_PROOF_LIMIT cached recipes
 * from HOME_PROOF_SLUGS (includes 360-spin-showcase). Honest Lab badge only —
 * not a full HfExploreHome remount, Pack sample, or UGC wall.
 */
export function HomeViralWall({ items }: { items: FeedItem[] }) {
  const wall = items.filter(hasFeedVideo).slice(0, HOME_PROOF_LIMIT);
  const momentHref = `${MOMENT_CREATE_HREF}&source=${HOME_PROOF_ENTRY}`;

  return (
    <section
      id="toy-wall"
      data-home-wall="lab-proof"
      data-home-proof-wall="true"
      className="scroll-mt-14 overflow-hidden bg-[var(--void)] px-2 py-14 sm:px-4 sm:py-16 lg:px-6 lg:py-24"
      aria-labelledby="recipe-wall-title"
    >
      <div className="mx-auto mb-8 flex max-w-[1600px] items-end justify-between gap-6 px-2 sm:mb-11">
        <div className="max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#FF4ECD]">
            {HOME_PROOF_BADGE}
          </p>
          <h2
            id="recipe-wall-title"
            className="mt-3 font-display text-4xl font-black tracking-[-0.055em] text-[var(--cream)] sm:text-6xl"
          >
            One toy. More ways to move.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/48 sm:text-base">
            Eight cached Lab prototypes — including a 360 spin. These are
            archive previews, not customer results. Pick a recipe and remake it
            with your own figure.
          </p>
        </div>
        <Link
          href={momentHref}
          className="hidden shrink-0 rounded-full border border-[#FF4ECD]/35 bg-[rgba(255,78,205,0.1)] px-5 py-2.5 text-xs font-black text-[#FF4ECD] transition hover:border-[#00D9FF]/50 hover:text-[#00D9FF] sm:block"
        >
          Create a Moment ↗
        </Link>
      </div>

      <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        {wall.map((item) => {
          const recipeSlug = item.recipeSlug ?? item.demo.preset;
          const recipeName =
            getPreset(recipeSlug)?.name || item.demo.title || item.title;
          const projectHref = item.projectHref
            ? withProofEntry(item.projectHref)
            : undefined;
          const remakeHref = withProofEntry(item.href);
          const cardHref = projectHref || remakeHref;
          const badge = item.badge || HOME_PROOF_BADGE;

          return (
            <article
              key={item.id}
              data-recipe-card={recipeSlug}
              data-home-proof-card={recipeSlug}
              className="toy-card group relative isolate aspect-[4/5] min-w-0 overflow-hidden p-1.5 transition duration-200 hover:scale-[1.02] focus-within:ring-2 focus-within:ring-[#00D9FF]"
            >
              <div className="relative h-full w-full overflow-hidden rounded-[1.35rem] bg-[#0A0A0F]">
                <Link
                  href={cardHref}
                  prefetch
                  aria-label={`Explore inside ${recipeName}`}
                  className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00D9FF]"
                  onClick={() =>
                    track({
                      event: item.projectHref ? "project_open" : "recipe_use",
                      path: "/",
                      recipe: recipeSlug,
                      meta: {
                        source: "home_recipe_card",
                        entry: HOME_PROOF_ENTRY,
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
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/5 to-black/10"
                    aria-hidden
                  />
                  <span className="absolute left-2 top-2 rounded-full border border-white/15 bg-black/55 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-white/72 backdrop-blur sm:left-3 sm:top-3 sm:text-[9px]">
                    {badge}
                  </span>
                  {recipeSlug === "360-spin-showcase" ? (
                    <span
                      data-home-proof-360
                      className="absolute right-2 top-2 rounded-full border border-[#00D9FF]/40 bg-[#00D9FF]/15 px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-[#00D9FF] backdrop-blur sm:right-3 sm:top-3 sm:text-[9px]"
                    >
                      360 spin
                    </span>
                  ) : null}
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
                  className="absolute bottom-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#B14EFF,#FF4ECD)] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-white shadow-[0_0_18px_rgba(255,78,205,0.35)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] sm:bottom-4 sm:left-4 sm:text-[10px]"
                  onClick={() =>
                    track({
                      event: "recipe_use",
                      path: "/",
                      recipe: recipeSlug,
                      meta: {
                        source: "home_recipe_remake",
                        entry: HOME_PROOF_ENTRY,
                        project: item.projectHref || null,
                      },
                    })
                  }
                >
                  Try this recipe
                  <span aria-hidden>↗</span>
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-7 flex justify-center sm:hidden">
        <Link
          href={momentHref}
          className="rounded-full border border-[#FF4ECD]/35 px-5 py-2.5 text-xs font-bold text-[#FF4ECD]"
        >
          Create a Moment
        </Link>
      </div>
    </section>
  );
}
