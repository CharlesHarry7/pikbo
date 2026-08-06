"use client";

import Link from "next/link";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { track } from "@/lib/analytics";
import { createGenerate360Href } from "@/lib/jobIntents";
import {
  hasFeedVideo,
  type FeedItem,
  type FeedVideoItem,
} from "@/lib/videoFeed";
import { getPreset } from "@/lib/presets";
import {
  HOME_PROOF_BADGE,
  HOME_PROOF_LIMIT,
  MOMENT_CREATE_HREF,
} from "@/lib/softLaunch";

/** Analytics + guest-intent entry for the home Lab proof wall (AIT-87 / AIT-38 PR-1). */
const HOME_PROOF_ENTRY = "home-proof-wall" as const;
const LISTING_360_SLUG = "360-spin-showcase" as const;
/** Mobile 2-col wall shows first 4 cards in a 2×2 above deep scroll. */
const MOBILE_FIRST_ROW_SLOTS = 4;

/** Append entry attribution without clobbering remix `source` (project slug). */
function withProofEntry(href: string): string {
  if (href.includes(`entry=${HOME_PROOF_ENTRY}`)) return href;
  const joiner = href.includes("?") ? "&" : "?";
  return `${href}${joiner}entry=${HOME_PROOF_ENTRY}`;
}

/**
 * Keep 360 listing spin inside the first mobile 2×2 even if feed order drifts.
 * Does not invent cards — only reorders existing Lab media.
 */
function pinListing360InFirstSlots(
  items: FeedVideoItem[],
  slots = MOBILE_FIRST_ROW_SLOTS
): FeedVideoItem[] {
  const idx = items.findIndex(
    (item) => (item.recipeSlug ?? item.demo.preset) === LISTING_360_SLUG
  );
  if (idx < 0 || idx < slots) return items;
  const next = items.slice();
  const [spin] = next.splice(idx, 1);
  next.unshift(spin);
  return next;
}

/**
 * Below-fold Lab proof wall for Moment home: ≤ HOME_PROOF_LIMIT cached recipes
 * from HOME_PROOF_SLUGS (360 pinned in first 4 for mobile). Honest Lab badge
 * only — not a full HfExploreHome remount, Pack sample, or UGC wall.
 * Listing 360° door goes through createGenerate360Href (AIT-108 / AIT-121).
 *
 * Gallery-calm copper board tokens only — no residual carnival pink/cyan/purple hex.
 * Dormant via HfExploreHome (not mounted on gallery-calm app/page.tsx).
 */
export function HomeViralWall({ items }: { items: FeedItem[] }) {
  const wall = pinListing360InFirstSlots(
    items.filter(hasFeedVideo).slice(0, HOME_PROOF_LIMIT)
  );
  const momentHref = `${MOMENT_CREATE_HREF}&source=${HOME_PROOF_ENTRY}`;
  // entry= for guest-intent; remix source tags the Generate door surface.
  const listing360Href = withProofEntry(
    createGenerate360Href("home-proof-wall")
  );

  return (
    <section
      id="toy-wall"
      data-home-wall="lab-proof"
      data-home-proof-wall="true"
      data-home-proof-360-pinned="true"
      className="scroll-mt-14 overflow-hidden bg-[var(--void)] px-2 py-12 sm:px-4 sm:py-14 lg:px-6 lg:py-20"
      aria-labelledby="recipe-wall-title"
    >
      <div className="mx-auto mb-7 flex max-w-[1600px] items-end justify-between gap-6 px-2 sm:mb-9">
        <div className="max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--brand)]">
            {HOME_PROOF_BADGE}
          </p>
          <h2
            id="recipe-wall-title"
            className="mt-3 font-display text-4xl font-black tracking-[-0.055em] text-[var(--cream)] sm:text-6xl"
          >
            One toy. More ways to move.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/48 sm:text-base">
            Eight cached Lab prototypes — including a 360 listing spin in the
            first row. Archive previews only, not customer results. Pick a
            recipe and remake it with your own figure.
          </p>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
          <Link
            href={momentHref}
            className="rounded-full border border-[var(--brand)]/35 bg-[rgba(196,165,116,0.1)] px-5 py-2.5 text-xs font-black text-[var(--brand)] transition hover:border-[var(--brand-2)]/50 hover:text-[var(--brand-2)]"
          >
            Create a Moment ↗
          </Link>
          <Link
            href={listing360Href}
            data-home-proof-360-cta
            className="rounded-full border border-[var(--brand-2)]/35 bg-[rgba(168,144,112,0.08)] px-5 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--brand-2)] transition hover:border-[var(--brand-2)]/60"
            onClick={() =>
              track({
                event: "recipe_use",
                path: "/",
                recipe: LISTING_360_SLUG,
                meta: {
                  source: "home_proof_wall_360_door",
                  entry: HOME_PROOF_ENTRY,
                },
              })
            }
          >
            Listing 360° · Lab
          </Link>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4">
        {wall.map((item, index) => {
          const recipeSlug = item.recipeSlug ?? item.demo.preset;
          const recipeName =
            getPreset(recipeSlug)?.name || item.demo.title || item.title;
          const projectHref = item.projectHref
            ? withProofEntry(item.projectHref)
            : undefined;
          const remakeHref = withProofEntry(item.href);
          const cardHref = projectHref || remakeHref;
          const badge = item.badge || HOME_PROOF_BADGE;
          const is360 = recipeSlug === LISTING_360_SLUG;

          return (
            <article
              key={item.id}
              data-recipe-card={recipeSlug}
              data-home-proof-card={recipeSlug}
              data-home-proof-slot={index}
              className="toy-card group relative isolate aspect-[4/5] min-w-0 overflow-hidden p-1.5 transition duration-200 hover:scale-[1.02] focus-within:ring-2 focus-within:ring-[var(--brand)]"
            >
              <div className="relative h-full w-full overflow-hidden rounded-[1.35rem] bg-[#0A0A0F]">
                <Link
                  href={cardHref}
                  prefetch
                  aria-label={`Explore inside ${recipeName}`}
                  className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]"
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
                  {is360 ? (
                    <span
                      data-home-proof-360
                      className="absolute right-2 top-2 rounded-full border border-[var(--brand)]/40 bg-[var(--brand)]/15 px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-[var(--brand)] backdrop-blur sm:right-3 sm:top-3 sm:text-[9px]"
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
                  className="absolute bottom-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-[var(--grad-cta)] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-[var(--primary-foreground)] shadow-[0_0_18px_rgba(196,165,116,0.28)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] sm:bottom-4 sm:left-4 sm:text-[10px]"
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

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:hidden">
        <Link
          href={momentHref}
          className="rounded-full border border-[var(--brand)]/35 px-5 py-2.5 text-xs font-bold text-[var(--brand)]"
        >
          Create a Moment
        </Link>
        <Link
          href={listing360Href}
          data-home-proof-360-cta
          className="rounded-full border border-[var(--brand-2)]/35 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--brand-2)]"
          onClick={() =>
            track({
              event: "recipe_use",
              path: "/",
              recipe: LISTING_360_SLUG,
              meta: {
                source: "home_proof_wall_360_door_mobile",
                entry: HOME_PROOF_ENTRY,
              },
            })
          }
        >
          Listing 360°
        </Link>
      </div>
    </section>
  );
}
