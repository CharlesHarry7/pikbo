"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FeedItem } from "@/lib/videoFeed";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { track } from "@/lib/analytics";
import { useI18n } from "@/components/LanguageProvider";
import { provisionalLabQualityLabel } from "@/lib/showcaseProjects";
import { createRemixHref } from "@/lib/remixIntent";

/**
 * Homepage first fold — video cinema (HF-style).
 * Multi-clip rotate for dwell; minimal copy; dual CTAs.
 */
export function HomeCinemaHero({
  items,
}: {
  /** Prefer 3–6 Lab showcase clips for rotation */
  items: FeedItem[];
}) {
  const { t } = useI18n();
  const clips = items.filter((i) => i?.demo).slice(0, 6);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (clips.length < 2) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % clips.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, [clips.length]);

  // Prefetch generate surfaces for faster convert
  useEffect(() => {
    try {
      void import("next/router").catch(() => undefined);
    } catch {
      /* App Router — use link prefetch only */
    }
    const link = document.createElement("link");
    link.rel = "prefetch";
    // Prefetch listing-spin remix (same contract as shell Generate CTAs)
    link.href = createRemixHref("360-spin-showcase");
    link.as = "document";
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, []);

  const item = clips[active] ?? clips[0];

  if (!item?.demo) {
    return (
      <section className="flex min-h-[70svh] flex-col items-center justify-center bg-black px-4 text-center">
        <h1 className="font-display text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">
          {t("home.cinema.h1a")}
          <br />
          {t("home.cinema.h1b")}
        </h1>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="#home-create"
            className="rounded-full bg-[#c8ff3d] px-8 py-3.5 text-sm font-black text-black"
          >
            {t("home.cinema.ctaPrimary")}
          </a>
          <Link
            href="/create?mode=seller-pack"
            className="rounded-full border border-[#c8ff3d]/40 bg-[#c8ff3d]/10 px-6 py-3.5 text-sm font-bold text-[#c8ff3d]"
            data-cinema-cta="seller-pack"
          >
            Seller Pack
          </Link>
          <a
            href="#toy-wall"
            className="rounded-full border border-white/25 px-6 py-3.5 text-sm font-bold text-white"
          >
            {t("home.cinema.ctaSecondary")}
          </a>
        </div>
      </section>
    );
  }

  return (
    <section
      data-home-hero="cinema"
      className="relative min-h-[min(92svh,920px)] overflow-hidden bg-black"
      aria-label="Cinema hero"
    >
      <div className="absolute inset-0">
        {clips.map((c, i) => (
          <div
            key={c.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === active ? "z-[1] opacity-100" : "z-0 opacity-0"
            }`}
            aria-hidden={i !== active}
          >
            {i === active || Math.abs(i - active) <= 1 ? (
              <AutoPlayVideo
                poster={c.demo.poster}
                webm={c.demo.webm}
                mp4={c.demo.mp4}
                eager={i === active}
                desktopPlayMode="viewport"
                lazySources={i !== active}
                focusable={false}
                label={c.title}
                className="h-full w-full object-cover"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.demo.poster}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
          </div>
        ))}
        <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black via-black/40 to-black/20" />
        <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-r from-black/55 via-transparent to-black/20" />
      </div>

      <div className="relative z-[3] mx-auto flex min-h-[min(92svh,920px)] max-w-6xl flex-col justify-end px-4 pb-10 pt-24 sm:px-6 sm:pb-14 md:pb-16">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c8ff3d]/90">
          {t("home.cinema.eyebrow")}
        </p>
        <h1 className="font-display mt-3 max-w-2xl text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-6xl md:text-7xl">
          {t("home.cinema.h1a")}
          <br />
          {t("home.cinema.h1b")}
        </h1>
        <p className="mt-3 max-w-md text-sm font-medium text-white/70 sm:text-base">
          {item.title}
          <span className="text-white/40"> · {t("home.cinema.lab")}</span>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {item.badge ? (
            <span className="rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/75">
              {item.badge}
            </span>
          ) : null}
          {provisionalLabQualityLabel(item.recipeSlug) ? (
            <span
              className="rounded-full border border-amber-200/30 bg-black/45 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-100/90"
              title="Provisional Lab self-check · all scores ≥4/5 · not external human QA"
              data-proof-quality="provisional-lab"
            >
              Lab ≥4 · provisional
            </span>
          ) : null}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <a
            href="#home-create"
            className="inline-flex items-center justify-center rounded-full bg-[#c8ff3d] px-8 py-3.5 text-sm font-black text-black shadow-[0_0_48px_-6px_rgba(200,255,61,0.55)] transition hover:brightness-110"
          >
            {t("home.cinema.ctaPrimary")}
          </a>
          <Link
            href="/create?mode=seller-pack"
            prefetch
            className="inline-flex items-center justify-center rounded-full border border-[#c8ff3d]/40 bg-[#c8ff3d]/10 px-5 py-3.5 text-sm font-bold text-[#c8ff3d] backdrop-blur-md transition hover:border-[#c8ff3d] hover:bg-[#c8ff3d]/15"
            data-cinema-cta="seller-pack"
          >
            Seller Pack
          </Link>
          <a
            href="#toy-wall"
            className="inline-flex items-center justify-center rounded-full border border-white/25 bg-black/45 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:border-white/50"
          >
            {t("home.cinema.ctaSecondary")}
          </a>
          <Link
            href={
              item.recipeSlug
                ? createRemixHref(item.recipeSlug)
                : item.href
            }
            prefetch
            onClick={() =>
              track({
                event: "recipe_use",
                path: "/",
                recipe: item.recipeSlug,
                meta: { source: "hero_remake" },
              })
            }
            className="text-xs font-semibold text-white/55 underline-offset-4 hover:text-white hover:underline sm:text-sm"
            data-cinema-cta="remake"
          >
            {t("home.cinema.remake")}
          </Link>
        </div>

        {clips.length > 1 ? (
          <div
            className="mt-6 flex flex-wrap items-center gap-2"
            role="tablist"
            aria-label="Hero clips"
          >
            {clips.map((c, i) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => setActive(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === active
                    ? "w-8 bg-[#c8ff3d]"
                    : "w-3 bg-white/30 hover:bg-white/50"
                }`}
                title={c.title}
              />
            ))}
            <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-white/35">
              {active + 1}/{clips.length}
            </span>
          </div>
        ) : null}

        <a
          href="#toy-wall"
          className="mt-8 inline-flex w-fit items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40 transition hover:text-white/70"
        >
          {t("home.cinema.scroll")}
          <span aria-hidden className="animate-bounce">
            ↓
          </span>
        </a>
      </div>
    </section>
  );
}
