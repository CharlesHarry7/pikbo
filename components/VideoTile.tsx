"use client";

import Link from "next/link";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import type { FeedItem } from "@/lib/videoFeed";
import { MEDIA_PROVENANCE_LABELS } from "@/lib/mediaProvenance";

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
 * Cached Lab prototypes are labeled; concepts stay static.
 */
export function VideoTile({
  item,
  compact,
}: {
  item: FeedItem;
  compact?: boolean;
}) {
  const recipe =
    item.recipeSlug ||
    (item.kind === "demo" || item.kind === "preset"
      ? item.demo?.preset
      : undefined);
  const isCachedPrototype =
    Boolean(item.demo) &&
    (Boolean(item.badge && /prototype|cached/i.test(item.badge)) ||
      item.kind === "demo");
  const isConcept = !item.demo;

  return (
    <Link
      href={item.href}
      data-media-provenance={item.mediaProvenance}
      className="video-tile group block overflow-hidden rounded-xl border border-white/[0.08] bg-black shadow-[0_12px_32px_-14px_rgba(0,0,0,0.85)] transition duration-300 hover:-translate-y-0.5 hover:border-[var(--mint)]/45 hover:shadow-[0_20px_48px_-16px_rgba(200,255,61,0.12)]"
      aria-label={`Open ${item.title}`}
    >
      <div className={`relative ${aspectClass(item.ratio, compact)}`}>
        {item.demo ? (
          <AutoPlayVideo
            poster={item.demo.poster}
            webm={item.demo.webm}
            mp4={item.demo.mp4}
            focusable={false}
            desktopPlayMode="interaction"
            className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out will-change-transform group-hover:scale-[1.05]"
          />
        ) : (
          <div
            className="absolute inset-0 grid place-items-center overflow-hidden"
            style={{
              background:
                item.conceptArt?.gradient ??
                "linear-gradient(145deg, #16181d, #090a0d)",
            }}
            data-concept-recipe-art={recipe ?? item.id}
          >
            {item.conceptArt?.src ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={item.conceptArt.src}
                alt={item.conceptArt.alt ?? ""}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
              />
            ) : (
              <span
                aria-hidden
                className="text-5xl drop-shadow-[0_12px_28px_rgba(0,0,0,0.55)] transition duration-300 group-hover:scale-105"
              >
                {item.conceptArt?.emoji ?? "✦"}
              </span>
            )}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-95" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c8ff3d]/45 to-transparent opacity-0 transition group-hover:opacity-100" />
        <div className="absolute left-2 top-2 flex max-w-[80%] flex-wrap gap-0.5">
          {item.mediaProvenance ? (
            <span
              className="rounded-full border border-white/10 bg-black/60 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white/75 backdrop-blur"
              title={MEDIA_PROVENANCE_LABELS[item.mediaProvenance]}
            >
              Media · {item.mediaProvenance}
            </span>
          ) : item.badge ? (
            <span className="rounded-full border border-white/10 bg-black/55 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/80 backdrop-blur">
              {item.badge}
            </span>
          ) : isCachedPrototype ? (
            <span
              className="rounded-full border border-white/10 bg-black/55 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white/75 backdrop-blur"
              title="Cached Lab prototype · provider evidence pending"
            >
              Lab · cached prototype
            </span>
          ) : null}
        </div>
        {!isConcept ? (
          <span className="absolute right-2 top-2 rounded-full bg-[#c8ff3d] px-1.5 py-0.5 text-[8px] font-black text-black opacity-0 shadow transition group-hover:opacity-100">
            Remake
          </span>
        ) : null}
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
              {isConcept ? "View recipe notes →" : "Your photo →"}
            </p>
          ) : (
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[var(--mint)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--mint)] ring-1 ring-[var(--mint)]/30 transition group-hover:bg-[var(--mint)] group-hover:text-black">
              {isConcept ? "View concept recipe" : "Remix with my toy"}
              <span aria-hidden>→</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
