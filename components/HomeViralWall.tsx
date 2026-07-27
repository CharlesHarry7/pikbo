"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  hasFeedVideo,
  type FeedItem,
  type FeedVideoItem,
} from "@/lib/videoFeed";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { track } from "@/lib/analytics";
import { useI18n } from "@/components/LanguageProvider";

/**
 * Dense toy video wall — browse first, then remake.
 * Sticky chips + denser grid for dwell (HF-style).
 */

const INITIAL_WALL = 24;

/** Homepage wall filters — 潮玩内容向 */
export const TOY_WALL_FILTERS = [
  { id: "all", labelKey: "home.wall.filter.all" },
  { id: "spin", labelKey: "home.wall.filter.spin" },
  { id: "unbox", labelKey: "home.wall.filter.unbox" },
  { id: "float", labelKey: "home.wall.filter.float" },
  { id: "collect", labelKey: "home.wall.filter.collect" },
  { id: "listing", labelKey: "home.wall.filter.listing" },
] as const;

export type ToyWallFilterId = (typeof TOY_WALL_FILTERS)[number]["id"];

function matchesToyFilter(item: FeedItem, filter: ToyWallFilterId): boolean {
  if (filter === "all") return true;
  const slug = (item.recipeSlug || "").toLowerCase();
  const cat = item.category || "";
  switch (filter) {
    case "spin":
      return slug.includes("360") || slug.includes("spin");
    case "unbox":
      return (
        cat === "unboxing" ||
        slug.includes("unbox") ||
        slug.includes("reveal") ||
        slug.includes("blind") ||
        slug.includes("mystery") ||
        slug.includes("claw")
      );
    case "float":
      return (
        slug.includes("float") || slug.includes("zero") || slug.includes("hero")
      );
    case "collect":
      return (
        slug.includes("display") ||
        slug.includes("shelf") ||
        slug.includes("collection") ||
        slug.includes("glam")
      );
    case "listing":
      return (
        slug.includes("360") ||
        slug.includes("spin") ||
        slug.includes("float") ||
        cat === "showcase"
      );
    default:
      return true;
  }
}

export function HomeViralWall({ items }: { items: FeedItem[] }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<ToyWallFilterId>("all");
  const [expanded, setExpanded] = useState(false);
  const proofItems: FeedVideoItem[] = useMemo(
    () => items.filter(hasFeedVideo).slice(0, 8),
    [items]
  );

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: proofItems.length };
    for (const f of TOY_WALL_FILTERS) {
      if (f.id === "all") continue;
      m[f.id] = proofItems.filter((i) => matchesToyFilter(i, f.id)).length;
    }
    return m;
  }, [proofItems]);

  const wall = useMemo(
    () => proofItems.filter((i) => matchesToyFilter(i, filter)),
    [filter, proofItems]
  );

  /** Large premiere strip (only on "all" — more cinema energy before dense grid) */
  const featured = useMemo(
    () => (filter === "all" ? wall.slice(0, 4) : []),
    [filter, wall]
  );
  const gridPool = useMemo(() => {
    if (filter !== "all" || featured.length === 0) return wall;
    const ids = new Set(featured.map((f) => f.id));
    return wall.filter((w) => !ids.has(w.id));
  }, [wall, featured, filter]);

  const visible = expanded ? gridPool : gridPool.slice(0, INITIAL_WALL);
  const hasMore = gridPool.length > INITIAL_WALL && !expanded;

  const nameTicker = useMemo(
    () => wall.slice(0, 32).map((i) => i.title.toUpperCase()),
    [wall]
  );

  return (
    <section
      id="toy-wall"
      data-home-wall="toy-video"
      data-wall-autoplay="viewport-dense"
      className="scroll-mt-14 border-b border-white/10 bg-[radial-gradient(ellipse_at_top,_rgba(200,255,61,0.06),_transparent_55%),#000]"
    >
      <div className="px-2 pt-10 sm:px-3 sm:pt-12">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c8ff3d]">
              {t("home.wall.eyebrow")} · {proofItems.length}
            </p>
            <h2 className="font-display mt-1 text-3xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-5xl">
              {t("home.wall.h2a")}
              <span className="text-[#c8ff3d]">{t("home.wall.h2b")}</span>
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-white/45">
              {t("home.wall.sub")}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">
              {t("home.wall.mutedNote")}
            </p>
          </div>
          <Link
            href="/effects"
            prefetch
            className="rounded-full border border-[#c8ff3d]/35 px-3 py-1.5 text-xs font-bold text-[#c8ff3d] transition hover:bg-[#c8ff3d]/10"
          >
            {t("home.wall.allRecipes")}
          </Link>
        </div>

        {nameTicker.length > 0 ? (
          <div className="mb-2 flex gap-x-3 overflow-x-auto px-2 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {nameTicker.map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="shrink-0 text-[10px] font-black uppercase tracking-[0.12em] text-white/28"
              >
                {name}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Sticky category chips — stay while scrolling the wall */}
      <div className="sticky top-14 z-20 border-y border-[#c8ff3d]/15 bg-black/90 px-2 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.65)] backdrop-blur-md sm:px-3">
        <div className="flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TOY_WALL_FILTERS.map((c) => {
            const n = counts[c.id] ?? 0;
            const empty = c.id !== "all" && n === 0;
            return (
              <button
                key={c.id}
                type="button"
                disabled={empty}
                onClick={() => {
                  setFilter(c.id);
                  setExpanded(false);
                }}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-30 ${
                  filter === c.id
                    ? "border-[#c8ff3d] bg-[#c8ff3d] text-black shadow-[0_0_20px_rgba(200,255,61,0.35)]"
                    : "border-white/12 bg-white/[0.05] text-white/70 hover:border-[#c8ff3d]/40 hover:text-white"
                }`}
              >
                {t(c.labelKey)}
                <span
                  className={`ml-1.5 tabular-nums ${
                    filter === c.id ? "text-black/55" : "text-white/35"
                  }`}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-1 py-3 sm:px-1.5 sm:py-4">
        {/* Premiere row — bigger cards, viewport play */}
        {featured.length > 0 ? (
          <div
            data-wall-featured="premiere"
            className="mb-2 grid grid-cols-2 gap-1 sm:mb-3 sm:gap-1.5 md:grid-cols-4"
          >
            {featured.map((item, i) => (
              <article
                key={`feat-${item.id}`}
                className="group relative aspect-[9/14] overflow-hidden rounded-lg bg-zinc-950 ring-1 ring-[#c8ff3d]/20 sm:aspect-[3/4] sm:rounded-xl"
              >
                <Link
                  href={item.href}
                  prefetch
                  className="absolute inset-0"
                  onClick={() =>
                    track({
                      event: "recipe_use",
                      path: "/",
                      recipe: item.recipeSlug,
                      meta: { source: "toy_wall_featured" },
                    })
                  }
                  aria-label={`${item.title} · ${t("home.wall.remake")}`}
                >
                  <AutoPlayVideo
                    poster={item.demo.poster}
                    webm={item.demo.webm}
                    mp4={item.demo.mp4}
                    focusable={false}
                    desktopPlayMode="viewport"
                    lazySources={i > 0}
                    wallDense
                    eager={i === 0}
                    label={item.title}
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  <div className="absolute left-2 top-2 flex max-w-[90%] flex-wrap gap-1">
                    <span className="rounded-full border border-[#c8ff3d]/40 bg-black/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#c8ff3d] backdrop-blur">
                      Premiere
                    </span>
                    {item.badge ? (
                      <span className="rounded-full border border-white/15 bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/80 backdrop-blur">
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
                    <p className="line-clamp-2 text-xs font-black uppercase tracking-wide text-white sm:text-sm">
                      {item.title}
                    </p>
                    <span className="mt-1.5 inline-flex rounded-full bg-[#c8ff3d] px-2.5 py-1 text-[10px] font-black text-black">
                      {t("home.wall.remake")}
                    </span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-0.5 sm:grid-cols-3 sm:gap-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {visible.map((item, i) => (
            <article
              key={item.id}
              className="group relative aspect-[3/4] overflow-hidden rounded-md bg-zinc-950 ring-1 ring-white/[0.06] transition duration-300 hover:-translate-y-1 hover:z-[1] hover:ring-[#c8ff3d]/45 hover:shadow-[0_0_0_1px_rgba(200,255,61,0.25),0_16px_48px_rgba(0,0,0,0.6)] sm:rounded-lg sm:aspect-[9/14]"
            >
              <Link
                href={item.href}
                prefetch
                className="absolute inset-0 z-0"
                onClick={() =>
                  track({
                    event: "recipe_use",
                    path: "/",
                    recipe: item.recipeSlug,
                    meta: { source: "toy_wall_card" },
                  })
                }
                aria-label={`${item.title} · ${t("home.wall.remake")}`}
              >
                <AutoPlayVideo
                  poster={item.demo.poster}
                  webm={item.demo.webm}
                  mp4={item.demo.mp4}
                  focusable={false}
                  /* Viewport dense: muted multi-play while browsing */
                  desktopPlayMode="viewport"
                  lazySources
                  wallDense
                  label={`${item.title} — Lab demo`}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.07]"
                  style={{
                    filter:
                      i % 5 === 1
                        ? "saturate(1.2) contrast(1.05)"
                        : i % 5 === 2
                          ? "contrast(1.1) brightness(1.04)"
                          : i % 5 === 3
                            ? "saturate(1.08)"
                            : undefined,
                    objectPosition:
                      i % 3 === 0
                        ? "center top"
                        : i % 3 === 1
                          ? "center 28%"
                          : "center center",
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent opacity-90" />
                <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-[radial-gradient(circle_at_50%_80%,rgba(200,255,61,0.12),transparent_55%)]" />
                <div className="pointer-events-none absolute left-1.5 top-1.5 z-[1] flex max-w-[92%] flex-wrap gap-0.5">
                  {item.badge ? (
                    <span className="rounded-full border border-white/10 bg-black/65 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white/75 backdrop-blur sm:text-[9px]">
                      {item.badge}
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-black/65 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white/65 backdrop-blur sm:text-[9px]">
                      Lab demo
                    </span>
                  )}
                </div>
              </Link>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-2 sm:p-2.5">
                <p className="line-clamp-2 text-[10px] font-black uppercase leading-tight tracking-wide text-white drop-shadow sm:text-[11px]">
                  {item.title}
                </p>
                <Link
                  href={item.href}
                  prefetch
                  onClick={() =>
                    track({
                      event: "recipe_use",
                      path: "/",
                      recipe: item.recipeSlug,
                      meta: { source: "toy_wall_remake" },
                    })
                  }
                  className="pointer-events-auto mt-1.5 inline-flex rounded-full bg-[#c8ff3d] px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-black shadow-[0_0_18px_rgba(200,255,61,0.45)] transition sm:text-[10px]"
                >
                  {t("home.wall.remake")}
                </Link>
              </div>
            </article>
          ))}
        </div>

        {wall.length === 0 ? (
          <p className="px-2 py-12 text-center text-sm text-white/40">
            {t("home.wall.empty")}
          </p>
        ) : null}

        {hasMore ? (
          <div className="mt-5 flex justify-center pb-4">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="rounded-full border border-white/15 bg-white/[0.04] px-6 py-2.5 text-xs font-bold text-white/75 hover:border-[#c8ff3d]/40 hover:text-white"
            >
              {t("home.wall.more")}（+{gridPool.length - INITIAL_WALL}）
            </button>
          </div>
        ) : (
          <div className="pb-6" />
        )}
      </div>
    </section>
  );
}
