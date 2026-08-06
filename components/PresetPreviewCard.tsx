"use client";

import Link from "next/link";
import type { Preset } from "@/lib/presets";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { createRemixHref } from "@/lib/remixIntent";

/** Exact Lab clips and static concept art are labeled separately. */
export function PresetPreviewCard({ preset }: { preset: Preset }) {
  const demo = DEMO_VIDEOS.find((d) => d.preset === preset.slug);
  const exact = Boolean(demo);

  return (
    <Link
      href={
        demo
          ? createRemixHref(preset.slug, demo.id)
          : `/effects/${preset.slug}`
      }
      className="video-tile group block overflow-hidden transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
    >
      <div className="relative aspect-[3/4]">
        {demo ? (
          <AutoPlayVideo
            poster={demo.poster}
            webm={demo.webm}
            mp4={demo.mp4}
            focusable={false}
            desktopPlayMode="interaction"
            className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out will-change-transform group-hover:scale-[1.06]"
          />
        ) : (
          <div
            className="absolute inset-0 grid place-items-center"
            style={{ background: preset.gradient }}
            data-concept-recipe-art={preset.slug}
          >
            <span
              aria-hidden
              className="text-6xl drop-shadow-[0_12px_28px_rgba(0,0,0,0.55)] transition duration-300 group-hover:scale-105"
            >
              {preset.emoji}
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-95 transition duration-300 group-hover:opacity-100" />
        <div className="absolute left-2 top-2 flex max-w-[70%] flex-wrap gap-0.5">
          {exact ? (
            <span
              className="rounded-full border border-white/10 bg-black/55 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white/75 backdrop-blur-sm"
              title="Cached Lab prototype · provider evidence pending"
            >
              Lab · cached prototype
            </span>
          ) : null}
        </div>
        <span
          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider transition duration-300 ${
            exact
              ? "bg-[var(--mint)] text-black shadow-[0_0_16px_color-mix(in_srgb,var(--neon-pink)_35%,transparent)]"
              : "border border-white/15 bg-black/60 text-white/70"
          }`}
        >
          {exact ? "Prototype" : "Concept"}
        </span>
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="text-[13px] font-bold leading-snug text-white">
            {preset.emoji} {preset.name}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-white/60">
            {preset.tagline}
          </p>
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--mint)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--mint)] ring-1 ring-[var(--mint)]/25 opacity-90 transition duration-300 group-hover:bg-[var(--mint)] group-hover:text-black group-hover:opacity-100">
            {exact ? "Remake →" : "View recipe notes →"}
          </p>
        </div>
      </div>
    </Link>
  );
}
