"use client";

import Link from "next/link";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";

/**
 * Flow matrix card — Lab media with shared AutoPlay budget
 * (mobile ≤1 concurrent · preload none · Link owns focus).
 * Never autoPlay all cards at once.
 *
 * HF Flow density with clearly labeled cached Lab prototypes;
 * hover CTA is Remake (product path), not a fake multi-model door.
 */
export function FlowMediaCard({
  href,
  title,
  blurb,
  badge,
  isPreview,
  poster,
  webm,
  mp4,
  recipeSlug,
  exactDemo = false,
}: {
  href: string;
  title: string;
  blurb: string;
  badge: string;
  isPreview?: boolean;
  poster: string;
  webm?: string;
  mp4: string;
  /** Registered recipe slug for this cached Lab prototype. */
  recipeSlug?: string;
  /** True when poster/mp4 is the registered DEMO for this recipe (not concept fill) */
  exactDemo?: boolean;
}) {
  void recipeSlug;
  const ctaLabel = isPreview ? "Preview path →" : "Remake →";

  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl bg-neutral-900 ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-28px_rgba(255,78,205,0.2)] hover:ring-neon-pink/50"
      aria-label={`${isPreview ? "Preview" : "Remake"} ${title}`}
      data-flow-card={isPreview ? "preview" : "live-path"}
    >
      <div className="relative aspect-video overflow-hidden">
        <AutoPlayVideo
          poster={poster}
          webm={webm}
          mp4={mp4}
          focusable={false}
          desktopPlayMode="interaction"
          className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out will-change-transform group-hover:scale-[1.05]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-pink/40 to-transparent opacity-0 transition group-hover:opacity-100" />
        <div className="absolute left-2.5 top-2.5 flex max-w-[75%] flex-wrap gap-0.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide shadow-sm ${
              isPreview
                ? "bg-amber-400/90 text-black"
                : "bg-black/65 text-neon-pink backdrop-blur-sm"
            }`}
          >
            {badge}
          </span>
          {exactDemo ? (
            <span
              className="rounded-full border border-white/10 bg-black/55 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white/75 backdrop-blur-sm"
              title="Cached Lab prototype · provider evidence pending"
            >
              Lab · cached prototype
            </span>
          ) : null}
        </div>
        <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-medium text-white/50 backdrop-blur-sm">
          Lab media
        </span>
        <span className="absolute bottom-2 left-2 translate-y-1 rounded-full bg-neon-pink px-2.5 py-1 text-[10px] font-black text-void opacity-0 shadow-[0_0_20px_rgba(255,78,205,0.35)] transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          {ctaLabel}
        </span>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold tracking-tight text-white transition group-hover:text-neon-pink">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-snug text-white/50">{blurb}</p>
        <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-neon-pink/90">
          {isPreview ? "Preview path" : "Remake · your toy photo"} →
        </p>
      </div>
    </Link>
  );
}
