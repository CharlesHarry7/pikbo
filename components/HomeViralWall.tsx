"use client";

import Image from "next/image";
import Link from "next/link";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { track } from "@/lib/analytics";
import { createGenerate360Href } from "@/lib/jobIntents";
import {
  type AttractionCard,
  buildHomeAttractionFeed,
} from "@/lib/homeAttractionFeed";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

const HOME_PROOF_ENTRY = "home-proof-wall" as const;
const LISTING_360_SLUG = "360-spin-showcase" as const;
const MOBILE_FIRST_ROW_SLOTS = 4;

function withProofEntry(href: string): string {
  if (href.includes(`entry=${HOME_PROOF_ENTRY}`)) return href;
  const joiner = href.includes("?") ? "&" : "?";
  return `${href}${joiner}entry=${HOME_PROOF_ENTRY}`;
}

function pin360(cards: AttractionCard[]): AttractionCard[] {
  const proof = cards.filter((c) => c.isProof);
  const rest = cards.filter((c) => !c.isProof);
  const idx = proof.findIndex(
    (c) => c.is360 || c.recipeSlug === LISTING_360_SLUG
  );
  if (idx < 0 || idx < MOBILE_FIRST_ROW_SLOTS) return [...proof, ...rest];
  const next = proof.slice();
  const [spin] = next.splice(idx, 1);
  next.unshift(spin);
  return [...next, ...rest];
}

/**
 * Clean dense wall — one visual language, 4-col grid, calm chrome.
 * Media is the product; labels stay minimal.
 */
export function HomeViralWall({
  items,
}: {
  items?: AttractionCard[] | import("@/lib/videoFeed").FeedItem[];
}) {
  const raw: AttractionCard[] =
    items && items.length && "poster" in (items[0] as AttractionCard)
      ? (items as AttractionCard[])
      : buildHomeAttractionFeed();

  const wall = pin360(raw);
  const momentHref = `${MOMENT_CREATE_HREF}&source=${HOME_PROOF_ENTRY}`;
  const listing360Href = withProofEntry(
    createGenerate360Href("home-proof-wall")
  );

  return (
    <section
      id="toy-wall"
      data-home-wall="lab-proof"
      data-home-proof-wall="true"
      data-home-proof-360-pinned="true"
      data-home-attraction="clean-v2"
      className="scroll-mt-14 border-b border-[var(--border)] bg-white px-3 py-8 sm:px-5 sm:py-10"
      aria-labelledby="recipe-wall-title"
    >
      <div className="mx-auto mb-5 flex max-w-[1200px] items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-muted)]">
            Explore
          </p>
          <h2
            id="recipe-wall-title"
            className="mt-1 font-display text-xl font-semibold tracking-tight text-[var(--fg)] sm:text-2xl"
          >
            One toy. More ways to move.
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-[12px]">
          <Link
            href={listing360Href}
            data-home-proof-360-cta
            className="hidden text-[var(--fg-muted)] transition hover:text-[var(--fg)] sm:inline"
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
            Listing 360°
          </Link>
          <Link
            href="/effects"
            className="text-[var(--brand)] transition hover:underline"
          >
            View all
          </Link>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
        {wall.map((item, index) => {
          const recipeSlug = item.recipeSlug;
          const hasMotion = Boolean(item.demo?.mp4);
          const cardHref = item.projectHref
            ? withProofEntry(item.projectHref)
            : item.isProof
              ? withProofEntry(item.href)
              : item.href;
          const remakeHref = item.isProof
            ? withProofEntry(item.href)
            : item.href;

          return (
            <article
              key={item.id}
              data-recipe-card={recipeSlug || item.id}
              data-home-proof-card={item.isProof ? recipeSlug : undefined}
              data-home-proof-slot={item.isProof ? index : undefined}
              data-attraction-id={item.id}
              className="group relative isolate aspect-[3/4] overflow-hidden rounded-2xl bg-[var(--card)] ring-1 ring-[var(--border)] transition duration-300 hover:ring-[var(--brand)]/30"
            >
              <Link
                href={cardHref}
                prefetch
                aria-label={`Open ${item.title}`}
                className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]"
                onClick={() =>
                  track({
                    event: item.projectHref ? "project_open" : "recipe_use",
                    path: "/",
                    recipe: recipeSlug || item.id,
                    meta: {
                      source: "home_attraction_card",
                      entry: HOME_PROOF_ENTRY,
                      motion: hasMotion,
                    },
                  })
                }
              >
                {hasMotion && item.demo ? (
                  <AutoPlayVideo
                    poster={item.demo.poster}
                    webm={item.demo.webm}
                    mp4={item.demo.mp4}
                    lazySources
                    wallDense
                    focusable={false}
                    label={`${item.title} preview`}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <Image
                    src={item.poster}
                    alt={item.title}
                    fill
                    sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                )}
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"
                  aria-hidden
                />
                {item.is360 ? (
                  <span
                    data-home-proof-360
                    className="absolute left-2.5 top-2.5 rounded-md bg-white px-2 py-0.5 text-[9px] font-bold text-black"
                  >
                    360°
                  </span>
                ) : (
                  <span className="absolute left-2.5 top-2.5 rounded-md bg-black/50 px-2 py-0.5 text-[9px] font-medium text-white/70 backdrop-blur-sm">
                    {item.badge}
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="text-[13px] font-semibold leading-snug tracking-tight text-white">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/50">
                    {hasMotion ? "Motion" : "Still · try motion"}
                  </p>
                </div>
              </Link>
              <Link
                href={remakeHref}
                prefetch
                aria-label={`Try ${item.title}`}
                className="absolute bottom-3 right-3 z-20 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-black opacity-0 shadow transition group-hover:opacity-100"
                onClick={() =>
                  track({
                    event: "recipe_use",
                    path: "/",
                    recipe: recipeSlug || item.id,
                    meta: {
                      source: "home_attraction_remake",
                      entry: HOME_PROOF_ENTRY,
                    },
                  })
                }
              >
                Try
              </Link>
            </article>
          );
        })}
      </div>

      <div className="mx-auto mt-6 flex max-w-[1200px] justify-center gap-2 sm:hidden">
        <Link
          href={momentHref}
          className="rounded-full [background:var(--grad-cta)] px-5 py-2.5 text-xs font-semibold text-white shadow-sm"
        >
          Create with my toy
        </Link>
        <Link
          href={listing360Href}
          data-home-proof-360-cta
          className="rounded-full border border-[var(--border)] bg-white px-4 py-2.5 text-xs text-[var(--fg-muted)]"
        >
          360°
        </Link>
      </div>
    </section>
  );
}
