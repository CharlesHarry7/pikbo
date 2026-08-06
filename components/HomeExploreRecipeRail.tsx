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
 * Thin HfExplore-style horizontal recipe rail under the gallery-calm hero.
 * Lab/archive samples only — secondary Remake + one Listing 360 door.
 * Does not compete with HomeCinemaHero as the primary Generate→360 CTA.
 * AIT-449: remount under gallery-calm home with honest Lab vs Live copy.
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
        className="border-t border-[var(--border)] bg-[var(--bg)] px-4 py-8 sm:px-7 lg:px-10"
      >
        <div className="mx-auto max-w-[1200px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">
            Explore · Lab
          </p>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            Lab recipe previews unavailable right now.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href={listing360Href}
              data-home-explore-rail-360
              className="text-[11px] font-semibold text-[var(--brand)] underline-offset-4 hover:underline"
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
              className="text-[11px] font-semibold text-[var(--fg-dim)] underline-offset-4 hover:text-[var(--fg-muted)] hover:underline"
            >
              All recipes
            </Link>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-[var(--fg-dim)]">
            Cached Lab prototypes only · Live generation stays gated for eligible
            invited accounts.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      data-home-explore-rail="lab"
      data-home-explore-rail-count={rail.length}
      aria-labelledby="home-explore-rail-title"
      className="border-t border-[var(--border)] bg-[var(--bg)] px-4 py-8 sm:px-7 lg:px-10"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">
              Explore · Lab recipes
            </p>
            <h2
              id="home-explore-rail-title"
              className="mt-1 font-display text-lg font-semibold tracking-[-0.02em] text-[var(--fg)] sm:text-xl"
            >
              Remake a Lab recipe
            </h2>
            <p className="mt-1 max-w-xl text-[12px] leading-5 text-[var(--fg-muted)]">
              Cached prototypes only — swipe, remake with your figure. Not
              customer results. Live gen stays gated.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <Link
              href={listing360Href}
              data-home-explore-rail-360
              className="text-[11px] font-semibold text-[var(--brand)] underline-offset-4 hover:underline"
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
              Listing 360° · Lab
            </Link>
            <Link
              href="/effects"
              className="text-[11px] font-semibold text-[var(--fg-dim)] underline-offset-4 hover:text-[var(--fg-muted)] hover:underline"
            >
              All recipes →
            </Link>
          </div>
        </div>

        <div
          className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                className={`group relative h-[10rem] w-[8rem] shrink-0 overflow-hidden rounded-xl border transition duration-200 hover:-translate-y-0.5 sm:h-[11.5rem] sm:w-[9.5rem] ${
                  is360
                    ? "border-[var(--brand)]/45 shadow-[var(--shadow-md)]"
                    : "border-[var(--border)] hover:border-[var(--brand)]/35"
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />
                <div className="relative z-10 flex h-full flex-col justify-between p-2.5">
                  <div className="flex flex-wrap gap-1">
                    <span className="inline-flex rounded-md border border-white/15 bg-black/55 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wide text-white/80 backdrop-blur-sm">
                      {badge}
                    </span>
                    {is360 ? (
                      <span className="inline-flex rounded-md bg-[var(--brand)] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-[var(--primary-foreground)]">
                        360
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold leading-tight text-white group-hover:text-[var(--brand)] sm:text-[13px]">
                      {recipeName}
                    </p>
                    <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/70 opacity-90 transition group-hover:text-[var(--brand)] group-hover:opacity-100">
                      Remake · Lab →
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <p className="mt-4 text-[11px] leading-5 text-[var(--fg-dim)]">
          Lab archive only · not Free Mini open trial · Live generation gated for
          eligible invited accounts. Primary Generate stays above.
        </p>
      </div>
    </section>
  );
}
