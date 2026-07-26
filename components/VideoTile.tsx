"use client";

import Link from "next/link";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import type { FeedItem } from "@/lib/videoFeed";

function aspectClass(ratio: FeedItem["ratio"], compact?: boolean) {
  if (compact) {
    if (ratio === "9:16") return "aspect-[9/13]";
    if (ratio === "1:1") return "aspect-square";
    if (ratio === "16:9") return "aspect-video";
    return "aspect-[4/5]";
  }
  if (ratio === "9:16") return "aspect-[9/14]";
  if (ratio === "1:1") return "aspect-square";
  if (ratio === "16:9") return "aspect-video";
  return "aspect-[4/5]";
}

/**
 * Autoplay-on-visible video card — shared AutoPlayVideo budget
 * (mobile ≤1 concurrent · non-hero preload none · Link owns focus).
 */
export function VideoTile({
  item,
  compact,
}: {
  item: FeedItem;
  compact?: boolean;
}) {
  return (
    <Link
      href={item.href}
      data-proof-status={
        "proofStatus" in item ? item.proofStatus : undefined
      }
      data-recipe-slug={item.recipeSlug}
      className="video-tile group block overflow-hidden rounded-xl border border-white/[0.08] bg-black shadow-[0_12px_32px_-14px_rgba(0,0,0,0.85)] transition duration-300 hover:-translate-y-0.5 hover:border-[var(--mint)]/45 hover:shadow-[0_20px_48px_-16px_rgba(200,255,61,0.12)]"
      aria-label={`Open ${item.title}`}
    >
      <div className={`relative ${aspectClass(item.ratio, compact)}`}>
        <AutoPlayVideo
          poster={item.demo.poster}
          webm={item.demo.webm}
          mp4={item.demo.mp4}
          focusable={false}
          desktopPlayMode="interaction"
          className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out will-change-transform group-hover:scale-[1.05]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-95" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c8ff3d]/45 to-transparent opacity-0 transition group-hover:opacity-100" />
        {item.badge && (
          <span className="absolute left-2 top-2 rounded-full border border-white/10 bg-black/55 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/80 backdrop-blur">
            {item.badge}
          </span>
        )}
        <span className="absolute right-2 top-2 rounded-full bg-[#c8ff3d] px-1.5 py-0.5 text-[8px] font-black text-black opacity-0 shadow transition group-hover:opacity-100">
          Remake
        </span>
        <div
          className={`absolute inset-x-0 bottom-0 ${compact ? "p-2.5" : "p-3 sm:p-4"}`}
        >
          <p className="line-clamp-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white/50">
            {item.subtitle}
          </p>
          <h3
            className={`mt-0.5 line-clamp-2 font-semibold text-white ${
              compact ? "text-[12px] leading-snug" : "text-sm sm:text-base"
            }`}
          >
            {item.title}
          </h3>
          {compact ? (
            <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-[#c8ff3d] opacity-0 transition group-hover:opacity-100">
              Your photo →
            </p>
          ) : (
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[var(--mint)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--mint)] ring-1 ring-[var(--mint)]/30 transition group-hover:bg-[var(--mint)] group-hover:text-black">
              Remix with my toy
              <span aria-hidden>→</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
