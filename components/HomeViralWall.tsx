"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FeedItem } from "@/lib/videoFeed";
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

function wallLabelKey(item: FeedItem): string {
  const slug = (item.recipeSlug || "").toLowerCase();
  if (slug.includes("360") || slug.includes("spin")) {
    return "home.wall.label.spin";
  }
  if (
    slug.includes("unbox") ||
    slug.includes("reveal") ||
    slug.includes("blind")
  ) {
    return "home.wall.label.unbox";
  }
  if (slug.includes("float") || slug.includes("zero")) {
    return "home.wall.label.float";
  }
  if (slug.includes("display") || slug.includes("glam")) {
    return "home.wall.label.display";
  }
  return "home.wall.label.motion";
}

export function HomeViralWall({ items }: { items: FeedItem[] }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<ToyWallFilterId>("all");
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<FeedItem | null>(null);

  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selected]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: items.length };
    for (const f of TOY_WALL_FILTERS) {
      if (f.id === "all") continue;
      m[f.id] = items.filter((i) => matchesToyFilter(i, f.id)).length;
    }
    return m;
  }, [items]);

  const wall = useMemo(
    () => items.filter((i) => matchesToyFilter(i, filter)),
    [filter, items]
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
              {t("home.wall.eyebrow")} · {items.length}
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
                <button
                  type="button"
                  className="absolute inset-0"
                  onClick={() => {
                    setSelected(item);
                    track({
                      event: "project_open",
                      path: "/",
                      recipe: item.recipeSlug,
                      meta: {
                        source: "toy_wall_featured_watch",
                        itemId: item.id,
                      },
                    });
                  }}
                  aria-label={`${t("home.wall.watch")} ${item.title}`}
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
                </button>
                <span className="pointer-events-none absolute left-2 top-2 rounded-full border border-[#c8ff3d]/40 bg-black/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#c8ff3d] backdrop-blur">
                  Premiere
                </span>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
                  <p className="line-clamp-2 text-xs font-black uppercase tracking-wide text-white sm:text-sm">
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
                        meta: { source: "toy_wall_featured_remake" },
                      })
                    }
                    className="pointer-events-auto mt-1.5 inline-flex rounded-full bg-[#c8ff3d] px-2.5 py-1 text-[10px] font-black text-black"
                  >
                    {t("home.wall.remake")}
                  </Link>
                </div>
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
              <button
                type="button"
                className="absolute inset-0 z-0"
                onClick={() => {
                  setSelected(item);
                  track({
                    event: "project_open",
                    path: "/",
                    recipe: item.recipeSlug,
                    meta: { source: "toy_wall_watch", itemId: item.id },
                  });
                }}
                aria-label={`${t("home.wall.watch")} ${item.title}`}
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
              </button>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-2 sm:p-2.5">
                <span className="mb-1 inline-flex rounded-full border border-white/15 bg-black/35 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-white/60 backdrop-blur-sm">
                  {t(wallLabelKey(item))}
                </span>
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

      {selected ? (
        <div className="fixed inset-0 z-[80] grid place-items-center p-3 sm:p-6">
          <button
            type="button"
            aria-label={t("home.wall.viewer.close")}
            onClick={() => setSelected(null)}
            className="absolute inset-0 bg-black/85 backdrop-blur-xl"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.title} · ${t("home.wall.viewer.close")}`}
            className="relative z-10 flex max-h-[94svh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0a090d] shadow-[0_32px_120px_rgba(0,0,0,0.9)] md:grid md:grid-cols-[minmax(0,1fr)_280px]"
          >
            <div className="relative grid min-h-0 place-items-center overflow-hidden bg-black">
              <video
                key={selected.id}
                poster={selected.demo.poster}
                autoPlay
                muted
                loop
                playsInline
                controls
                className="max-h-[72svh] w-full object-contain"
                aria-label={`${selected.title} · ${t("home.cinema.lab")}`}
              >
                {selected.demo.webm ? (
                  <source src={selected.demo.webm} type="video/webm" />
                ) : null}
                <source src={selected.demo.mp4} type="video/mp4" />
              </video>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent" />
              <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/70 backdrop-blur-md">
                {t("home.cinema.lab")} · {t(wallLabelKey(selected))}
              </span>
            </div>

            <div className="flex flex-col justify-between gap-6 border-t border-white/10 bg-[radial-gradient(circle_at_85%_10%,rgba(157,82,255,0.18),transparent_35%),radial-gradient(circle_at_10%_90%,rgba(255,78,158,0.16),transparent_38%),#0a090d] p-5 md:border-l md:border-t-0">
              <div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="float-right grid h-9 w-9 place-items-center rounded-full border border-white/12 bg-white/[0.05] text-lg text-white/65 transition hover:bg-white/10 hover:text-white"
                  aria-label={t("home.wall.viewer.close")}
                >
                  ×
                </button>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#c8ff3d]">
                  {t("home.wall.viewer.eyebrow")}
                </p>
                <h3 className="font-display mt-3 pr-10 text-2xl font-black uppercase leading-tight text-white">
                  {selected.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/50">
                  {t("home.wall.viewer.body")}
                </p>
              </div>

              <div className="space-y-2">
                <Link
                  href={selected.href}
                  prefetch
                  onClick={() =>
                    track({
                      event: "recipe_use",
                      path: "/",
                      recipe: selected.recipeSlug,
                      meta: { source: "toy_wall_lightbox" },
                    })
                  }
                  className="flex w-full items-center justify-center rounded-full bg-[#c8ff3d] px-5 py-3 text-center text-sm font-black text-black shadow-[0_0_32px_rgba(200,255,61,0.28)] transition hover:brightness-110"
                >
                  {t("home.wall.viewer.primary")}
                </Link>
                {selected.projectHref || selected.detailHref ? (
                  <Link
                    href={
                      selected.projectHref ||
                      selected.detailHref ||
                      "/effects"
                    }
                    prefetch
                    className="flex w-full items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    {t("home.wall.viewer.details")}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
