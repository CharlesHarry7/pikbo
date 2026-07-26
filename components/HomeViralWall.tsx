"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FeedItem } from "@/lib/videoFeed";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { track } from "@/lib/analytics";

/**
 * Dense toy video wall — browse first, then remake.
 * Categories match CD commercial language (not generic SaaS).
 */

const INITIAL_WALL = 18;

/** Homepage wall filters — 潮玩内容向 */
export const TOY_WALL_FILTERS = [
  { id: "all", label: "全部" },
  { id: "spin", label: "360°展示" },
  { id: "unbox", label: "开箱" },
  { id: "float", label: "漂浮" },
  { id: "collect", label: "收藏展示" },
  { id: "listing", label: "Listing" },
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
      return slug.includes("float") || slug.includes("zero") || slug.includes("hero");
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
  const [filter, setFilter] = useState<ToyWallFilterId>("all");
  const [expanded, setExpanded] = useState(false);

  const wall = useMemo(
    () => items.filter((i) => matchesToyFilter(i, filter)),
    [filter, items]
  );

  const visible = expanded ? wall : wall.slice(0, INITIAL_WALL);
  const hasMore = wall.length > INITIAL_WALL && !expanded;

  const nameTicker = useMemo(
    () => wall.slice(0, 28).map((i) => i.title.toUpperCase()),
    [wall]
  );

  return (
    <section
      id="toy-wall"
      data-home-wall="toy-video"
      className="scroll-mt-16 border-b border-white/10 bg-black px-2 py-10 sm:px-3 sm:py-12"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c8ff3d]/85">
            Toy video wall
          </p>
          <h2 className="font-display mt-1 text-2xl font-black uppercase tracking-tight text-white sm:text-4xl">
            先看潮玩怎么动
          </h2>
          <p className="mt-1.5 max-w-xl text-sm text-white/45">
            官方 Lab 示例 · 点任意卡片生成同款 · 不是用户 UGC
          </p>
        </div>
        <Link
          href="/effects"
          className="text-xs font-bold text-[#c8ff3d] hover:underline"
        >
          全部配方 →
        </Link>
      </div>

      {nameTicker.length > 0 ? (
        <div className="mb-3 flex gap-x-3 gap-y-1 overflow-x-auto px-2 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {nameTicker.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="shrink-0 text-[10px] font-black uppercase tracking-[0.12em] text-white/30"
            >
              {name}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mb-4 flex gap-2 overflow-x-auto px-2 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TOY_WALL_FILTERS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setFilter(c.id);
              setExpanded(false);
            }}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-bold tracking-wide transition ${
              filter === c.id
                ? "border-[#c8ff3d] bg-[#c8ff3d] text-black"
                : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25 hover:text-white"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {visible.map((item, i) => (
          <article
            key={item.id}
            className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-zinc-900 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] sm:aspect-[9/14]"
          >
            <Link
              href={item.href}
              className="absolute inset-0 z-0"
              onClick={() =>
                track({
                  event: "recipe_use",
                  path: "/",
                  recipe: item.recipeSlug,
                  meta: { source: "toy_wall_card" },
                })
              }
              aria-label={`${item.title} · 生成同款`}
            >
              <AutoPlayVideo
                poster={item.demo.poster}
                webm={item.demo.webm}
                mp4={item.demo.mp4}
                focusable={false}
                desktopPlayMode="interaction"
                lazySources
                label={`${item.title} — Lab demo`}
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
                style={{
                  filter:
                    i % 5 === 1
                      ? "saturate(1.15)"
                      : i % 5 === 2
                        ? "contrast(1.08)"
                        : undefined,
                  objectPosition:
                    i % 3 === 0
                      ? "center top"
                      : i % 3 === 1
                        ? "center 30%"
                        : "center center",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent" />
            </Link>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-2.5 sm:p-3">
              <p className="line-clamp-2 text-[11px] font-bold uppercase leading-tight tracking-wide text-white sm:text-xs">
                {item.title}
              </p>
              <Link
                href={item.href}
                onClick={() =>
                  track({
                    event: "recipe_use",
                    path: "/",
                    recipe: item.recipeSlug,
                    meta: { source: "toy_wall_remake" },
                  })
                }
                className="pointer-events-auto mt-2 inline-flex rounded-full bg-[#c8ff3d] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-black opacity-100 shadow-[0_0_16px_rgba(200,255,61,0.25)] transition sm:opacity-0 sm:group-hover:opacity-100"
              >
                生成同款
              </Link>
            </div>
          </article>
        ))}
      </div>

      {wall.length === 0 ? (
        <p className="px-2 py-10 text-center text-sm text-white/40">
          这一类暂时没有示例 · 试试「全部」
        </p>
      ) : null}

      {hasMore ? (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-full border border-white/15 bg-white/[0.04] px-6 py-2.5 text-xs font-bold text-white/75 hover:border-[#c8ff3d]/40 hover:text-white"
          >
            看更多潮玩视频（+{wall.length - INITIAL_WALL}）
          </button>
        </div>
      ) : null}
    </section>
  );
}
