"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";
import { createGenerate360Href } from "@/lib/jobIntents";
import { getPreset } from "@/lib/presets";
import {
  hasFeedVideo,
  type FeedItem,
  type FeedVideoItem,
} from "@/lib/videoFeed";
import { HOME_PROOF_BADGE, HOME_PROOF_LIMIT } from "@/lib/softLaunch";

/** Analytics + guest-intent entry for the thin Home explore recipe rail (AIT-156). */
const HOME_EXPLORE_RAIL_ENTRY = "home-explore-rail" as const;
const LISTING_360_SLUG = "360-spin-showcase" as const;
/** Thin strip cap — same Lab registry as the proof wall, never denser. */
const RAIL_LIMIT = Math.min(8, HOME_PROOF_LIMIT);

function withRailEntry(href: string): string {
  if (href.includes(`entry=${HOME_EXPLORE_RAIL_ENTRY}`)) return href;
  const joiner = href.includes("?") ? "&" : "?";
  return `${href}${joiner}entry=${HOME_EXPLORE_RAIL_ENTRY}`;
}

/**
 * Thin HfExplore-style horizontal recipe rail under the Lab proof wall.
 * Lab/archive samples only — secondary Remake + Listing 360 doors.
 * Does not compete with HomeCinemaHero as the primary Moment CTA.
 * AIT-241: remounts Explore density under Moment-first (not full HfExploreHome).
 */
export function HomeExploreRecipeRail({ items }: { items: FeedItem[] }) {
  const rail: FeedVideoItem[] = items
    .filter(hasFeedVideo)
    .slice(0, RAIL_LIMIT);
  // String literal source for generate-360-cta smoke surface freeze.
  const listing360Href = withRailEntry(
    createGenerate360Href("home-explore-rail")
  );

  if (rail.length === 0) {
    return (
      <section
        data-home-explore-rail="empty"
        aria-label="Lab recipe rail"
        className="border-b border-white/10 bg-black px-3 py-5 sm:px-5"
      >
        <div className="mx-auto max-w-[1400px]">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--neon-pink)]/80">
            Explore · Lab
          </p>
          <p className="mt-2 text-sm text-white/45">
            Lab recipe previews unavailable right now.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href={listing360Href}
              data-home-explore-rail-360
              className="text-[11px] font-bold text-[#00D9FF] hover:underline"
              onClick={() =>
                track({
                  event: "recipe_use",
                  path: "/",
                  recipe: LISTING_360_SLUG,
                  meta: {
                    source: "home_explore_rail_empty_360",
                    entry: HOME_EXPLORE_RAIL_ENTRY,
                  },
                })
              }
            >
              Listing 360° · Lab →
            </Link>
            <Link
              href="/effects"
              className="text-[11px] font-bold text-white/50 hover:text-white/80 hover:underline"
            >
              All recipes
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      data-home-explore-rail="lab"
      data-home-explore-rail-count={rail.length}
      aria-labelledby="home-explore-rail-title"
      className="border-b border-white/10 bg-black px-3 py-5 sm:px-5"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--neon-pink)]">
              Explore · Lab recipes
            </p>
            <h2
              id="home-explore-rail-title"
              className="mt-0.5 text-sm font-black tracking-tight text-white sm:text-base"
            >
              Remake a Lab recipe
            </h2>
            <p className="mt-0.5 max-w-xl text-[11px] leading-snug text-white/40">
              Cached prototypes only — swipe, remake with your figure. Not
              customer results.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <Link
              href={listing360Href}
              data-home-explore-rail-360
              className="text-[11px] font-bold text-[#00D9FF] hover:underline"
              onClick={() =>
                track({
                  event: "recipe_use",
                  path: "/",
                  recipe: LISTING_360_SLUG,
                  meta: {
                    source: "home_explore_rail_360_door",
                    entry: HOME_EXPLORE_RAIL_ENTRY,
                  },
                })
              }
            >
              Listing 360°
            </Link>
            <Link
              href="/effects"
              className="text-[11px] font-bold text-[var(--neon-pink)] hover:underline"
            >
              All recipes →
            </Link>
          </div>
        </div>

        <div
          className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="list"
        >
          {rail.map((item) => {
            const recipeSlug = item.recipeSlug ?? item.demo.preset;
            const recipeName =
              getPreset(recipeSlug)?.name || item.demo.title || item.title;
            const remakeHref = withRailEntry(item.href);
            const badge = item.badge || HOME_PROOF_BADGE;
            const is360 = recipeSlug === LISTING_360_SLUG;

            return (
              <Link
                key={item.id}
                href={remakeHref}
                role="listitem"
                data-home-explore-rail-card={recipeSlug}
                prefetch
                onClick={() =>
                  track({
                    event: "recipe_use",
                    path: "/",
                    recipe: recipeSlug,
                    meta: {
                      source: "home_explore_rail_remake",
                      entry: HOME_EXPLORE_RAIL_ENTRY,
                    },
                  })
                }
                className={`group relative h-[9.5rem] w-[7.5rem] shrink-0 overflow-hidden rounded-2xl border transition duration-200 hover:-translate-y-0.5 sm:h-[11rem] sm:w-[9rem] ${
                  is360
                    ? "border-[#00D9FF]/45 shadow-[0_0_28px_rgba(0,217,255,0.12)]"
                    : "border-white/10 hover:border-[var(--neon-pink)]/40"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.demo.poster}
                  alt=""
                  width={180}
                  height={240}
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/20" />
                <div className="relative z-10 flex h-full flex-col justify-between p-2.5">
                  <div className="flex flex-wrap gap-1">
                    <span className="inline-flex rounded-full border border-white/15 bg-black/55 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white/75 backdrop-blur">
                      {badge}
                    </span>
                    {is360 ? (
                      <span className="inline-flex rounded-full bg-[#00D9FF] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-black">
                        360
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-[12px] font-black leading-tight text-white group-hover:text-[var(--neon-pink)] sm:text-[13px]">
                      {recipeName}
                    </p>
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--neon-pink)]/90 opacity-80 transition group-hover:opacity-100">
                      Remake →
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
