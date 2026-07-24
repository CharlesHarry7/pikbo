"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FeedItem } from "@/lib/videoFeed";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { CATEGORIES } from "@/lib/presets";

/**
 * HF Viral Presets wall — uniform dense GRID of posters + hover video.
 * Name ticker + category chips mirror HF density; media is Pikbo Lab only.
 */
/** First paint: denser than before (HF feel) while still poster-first for LCP. */
const INITIAL_WALL = 18;

export function HomeViralWall({ items }: { items: FeedItem[] }) {
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(false);

  const chips = useMemo(
    () => [
      { id: "all", label: "ALL" },
      ...CATEGORIES.map((c) => ({ id: c.id, label: c.label.toUpperCase() })),
    ],
    []
  );

  const wall = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.category === filter);
  }, [filter, items]);

  const visible = expanded ? wall : wall.slice(0, INITIAL_WALL);
  const hasMore = wall.length > INITIAL_WALL && !expanded;

  /** HF-style uppercase name strip above the grid */
  const nameTicker = useMemo(
    () => wall.slice(0, 28).map((i) => i.title.toUpperCase()),
    [wall]
  );

  return (
    <section className="px-2 py-8 sm:px-3">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-2">
        <div>
          <Link
            href="/effects"
            className="font-display text-xl font-black uppercase tracking-tight text-white hover:text-[var(--mint)] sm:text-3xl"
          >
            Viral presets
          </Link>
          <p className="mt-1 max-w-xl text-sm text-white/45">
            Big-budget toy motion from one photo — tap any card to open Generate.
            Lab samples only · not customer UGC.
          </p>
        </div>
        <Link
          href="/effects"
          className="text-xs font-bold text-[var(--mint)] hover:underline"
        >
          View all presets →
        </Link>
      </div>

      {/* HF name ticker — dense uppercase labels */}
      {nameTicker.length > 0 ? (
        <div className="mb-3 flex gap-x-3 gap-y-1 overflow-x-auto px-2 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {nameTicker.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="shrink-0 text-[10px] font-black uppercase tracking-[0.12em] text-white/35"
            >
              {name}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mb-4 flex gap-2 overflow-x-auto px-2 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setFilter(c.id);
              setExpanded(false);
            }}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold tracking-wide transition ${
              filter === c.id
                ? "border-[var(--mint)] bg-[var(--mint)] text-black"
                : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Uniform dense grid — posters first (LCP); video only on hover/tap */}
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 sm:gap-1.5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {visible.map((item, i) => (
          <Link
            key={item.id}
            href={item.href}
            className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-zinc-900 transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(0,0,0,0.45)] sm:aspect-[9/14]"
          >
            <AutoPlayVideo
              poster={item.demo.poster}
              webm={item.demo.webm}
              mp4={item.demo.mp4}
              focusable={false}
              desktopPlayMode="interaction"
              lazySources
              label={`${item.title} — official Lab demo. Tap to generate video.`}
              className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out will-change-transform group-hover:scale-[1.06]"
              style={{
                filter:
                  i % 5 === 1
                    ? "saturate(1.2)"
                    : i % 5 === 2
                      ? "contrast(1.1) brightness(1.03)"
                      : i % 5 === 3
                        ? "saturate(0.9) hue-rotate(8deg)"
                        : i % 5 === 4
                          ? "brightness(1.06)"
                          : undefined,
                objectPosition:
                  i % 3 === 0
                    ? "center top"
                    : i % 3 === 1
                      ? "center 30%"
                      : "center center",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-90" />
            {/* Hover Remake chip — HF remix affordance */}
            <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-[#c8ff3d] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-black opacity-0 shadow-[0_0_16px_rgba(200,255,61,0.35)] transition group-hover:opacity-100">
              Remake
            </span>
            <div className="absolute inset-x-0 bottom-0 p-2 sm:p-2.5">
              <p className="line-clamp-2 text-[11px] font-bold uppercase leading-tight tracking-wide text-white sm:text-xs">
                {item.title}
              </p>
            </div>
          </Link>
        ))}
      </div>
      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-full border border-white/15 bg-white/[0.04] px-5 py-2 text-xs font-bold text-white/70 hover:border-[var(--mint)]/40 hover:text-white"
          >
            Show more presets ({wall.length - INITIAL_WALL})
          </button>
        </div>
      ) : null}
    </section>
  );
}
