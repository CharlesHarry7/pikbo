"use client";

import Link from "next/link";
import type { FeedItem } from "@/lib/videoFeed";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { track } from "@/lib/analytics";

/**
 * Homepage first fold — video cinema (HF-style).
 * Minimal copy. CTAs: generate with my toy · browse examples.
 */
export function HomeCinemaHero({
  item,
}: {
  item: FeedItem | null | undefined;
}) {
  if (!item?.demo) {
    return (
      <section className="flex min-h-[70svh] flex-col items-center justify-center bg-black px-4 text-center">
        <h1 className="font-display text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">
          Your toy. In motion.
        </h1>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="#home-create"
            className="rounded-full bg-[#c8ff3d] px-8 py-3.5 text-sm font-black text-black"
          >
            用我的潮玩生成
          </a>
          <a
            href="#toy-wall"
            className="rounded-full border border-white/25 px-6 py-3.5 text-sm font-bold text-white"
          >
            先看看示例
          </a>
        </div>
      </section>
    );
  }

  return (
    <section
      data-home-hero="cinema"
      className="relative min-h-[min(92svh,900px)] overflow-hidden bg-black"
      aria-label="Cinema hero"
    >
      {/* Full-bleed Lab video — product, not brochure */}
      <div className="absolute inset-0">
        <AutoPlayVideo
          poster={item.demo.poster}
          webm={item.demo.webm}
          mp4={item.demo.mp4}
          eager
          desktopPlayMode="viewport"
          lazySources={false}
          focusable={false}
          label={item.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-[min(92svh,900px)] max-w-6xl flex-col justify-end px-4 pb-12 pt-24 sm:px-6 sm:pb-16 md:pb-20">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c8ff3d]/90">
          Pikbo · Designer toy video
        </p>
        <h1 className="font-display mt-3 max-w-2xl text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-6xl md:text-7xl">
          Your toy.
          <br />
          In motion.
        </h1>
        <p className="mt-3 max-w-md text-sm font-medium text-white/70 sm:text-base">
          {item.title}
          <span className="text-white/40"> · Lab example</span>
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href="#home-create"
            className="inline-flex items-center justify-center rounded-full bg-[#c8ff3d] px-8 py-3.5 text-sm font-black text-black shadow-[0_0_48px_-6px_rgba(200,255,61,0.55)] transition hover:brightness-110"
          >
            用我的潮玩生成
          </a>
          <a
            href="#toy-wall"
            className="inline-flex items-center justify-center rounded-full border border-white/25 bg-black/40 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:border-white/45"
          >
            先看看示例
          </a>
          <Link
            href={item.href}
            onClick={() =>
              track({
                event: "recipe_use",
                path: "/",
                recipe: item.recipeSlug,
                meta: { source: "hero_remake" },
              })
            }
            className="text-xs font-semibold text-white/50 underline-offset-4 hover:text-white hover:underline sm:text-sm"
          >
            生成同款 · {item.title} →
          </Link>
        </div>
      </div>
    </section>
  );
}
