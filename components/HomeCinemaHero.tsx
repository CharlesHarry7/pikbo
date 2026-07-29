"use client";

import Link from "next/link";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { track } from "@/lib/analytics";
import { hasFeedVideo, type FeedItem } from "@/lib/videoFeed";

const FORMAT_DEFS = [
  {
    slug: "360-spin-showcase",
    name: "Listing Spin",
    spec: "1:1 · 5 sec",
    use: "Product pages",
  },
  {
    slug: "blind-box-unboxing",
    name: "Blind-box Reveal",
    spec: "9:16 · 5 sec",
    use: "Launch posts",
  },
  {
    slug: "paparazzi-flash",
    name: "Social Flash",
    spec: "9:16 · 5 sec",
    use: "Reels & Shorts",
  },
] as const;

export function HomeCinemaHero({ items }: { items: FeedItem[] }) {
  const formats = FORMAT_DEFS.flatMap((format) => {
    const item = items.find((candidate) => candidate.recipeSlug === format.slug);
    return item && hasFeedVideo(item) ? [{ format, item }] : [];
  });
  const inputPoster =
    formats[0]?.item.demo.poster ?? "/demos/scout-still.webp";

  return (
    <section
      data-home-hero="collector-drop-desk"
      className="relative isolate overflow-hidden bg-[#f1eee6] text-[#090909]"
      aria-labelledby="home-hero-title"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-45 [background-image:radial-gradient(rgba(8,8,8,0.16)_0.7px,transparent_0.7px)] [background-size:9px_9px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 top-32 h-52 w-52 rounded-full bg-[#c8ff3d]/75 blur-[80px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[-5rem] top-20 h-56 w-56 rounded-full bg-[#ff6a4d]/20 blur-[90px]"
        aria-hidden
      />

      <div className="relative mx-auto grid min-h-[calc(100svh-3rem)] max-w-[1600px] items-center gap-8 px-5 py-8 sm:gap-12 sm:px-8 sm:py-16 lg:min-h-[calc(100svh-3.5rem)] lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:px-10 lg:py-10 xl:gap-14 xl:px-16">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#090909] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white">
              For designer-toy sellers
            </span>
            <span className="hidden rounded-full border border-black/15 bg-white/45 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-black/55 sm:inline-flex">
              Private beta · invite only
            </span>
          </div>

          <h1
            id="home-hero-title"
            className="mt-5 max-w-[760px] font-display text-[clamp(3rem,5.8vw,6.6rem)] font-black leading-[0.84] tracking-[-0.068em] sm:mt-6"
          >
            One toy photo.
            <span className="mt-2 block text-[#5e7800]">
              Three product videos.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base font-semibold leading-relaxed text-black/62 sm:mt-7 sm:text-lg">
            A square Listing Spin, a vertical Blind-box Reveal, and a vertical
            Social Flash—each 5 seconds, delivered to your private Library.
          </p>

          <div className="mt-6 flex flex-col gap-1 sm:mt-8 sm:flex-row sm:gap-3">
            <Link
              href="/create?mode=seller-pack"
              className="inline-flex min-h-13 items-center justify-center rounded-full bg-[#090909] px-7 text-sm font-black text-white shadow-[0_14px_34px_-16px_rgba(0,0,0,0.7)] transition hover:-translate-y-0.5 hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5e7800]"
            >
              Preview the 3-video Pack
              <span className="ml-2 text-[#c8ff3d]" aria-hidden>
                ↗
              </span>
            </Link>
            <a
              href="#pack-formats"
              className="inline-flex min-h-10 items-center justify-center px-1 text-xs font-black text-black underline decoration-black/20 underline-offset-4 transition hover:text-[#5e7800] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black sm:min-h-13 sm:rounded-full sm:border sm:border-black/20 sm:bg-white/50 sm:px-7 sm:text-sm sm:no-underline sm:hover:-translate-y-0.5 sm:hover:bg-white"
            >
              See the 3 formats
            </a>
          </div>

          <div className="mt-8 hidden max-w-lg grid-cols-3 border-y border-black/15 py-4 text-[10px] font-black uppercase tracking-[0.11em] text-black/48 sm:grid">
            <span>30 credits max</span>
            <span className="border-x border-black/15 px-3 text-center">
              720p beta
            </span>
            <span className="text-right">Private delivery</span>
          </div>
        </div>

        <div className="relative">
          <div
            className="absolute -right-3 -top-5 rotate-3 rounded-sm bg-[#2477ff] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg"
            aria-hidden
          >
            Drop desk / 001
          </div>

          <div className="rounded-[2rem] border border-black/10 bg-[#0a0a0b] p-3 text-white shadow-[0_38px_80px_-36px_rgba(0,0,0,0.78)] sm:p-4 lg:rounded-[2.5rem] lg:p-5">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-1 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#c8ff3d] shadow-[0_0_18px_#c8ff3d]" />
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/72">
                  Pikbo format board
                </p>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/36">
                Cached previews
              </p>
            </div>

            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-2.5 sm:p-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/12 bg-[#ded8ca] sm:h-20 sm:w-20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={inputPoster}
                  alt="Pikbo Lab reference still"
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-white">
                  Reference
                </span>
              </div>
              <span className="text-xl text-[#c8ff3d]" aria-hidden>
                →
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black sm:text-base">
                  One owned toy photo
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
                  Fixed into three selling formats
                </p>
              </div>
              <span className="ml-auto hidden rounded-full border border-[#c8ff3d]/30 bg-[#c8ff3d]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#c8ff3d] sm:inline-flex">
                3 outputs
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
              {formats.map(({ format, item }, index) => (
                <article
                  key={format.slug}
                  className="group relative min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#151517]"
                  data-home-format-preview={format.slug}
                >
                  <Link
                    href={item.projectHref || item.href}
                    aria-label={`Open ${format.name} cached preview`}
                    className="absolute inset-0 z-10"
                    onClick={() =>
                      track({
                        event: item.projectHref
                          ? "project_open"
                          : "recipe_use",
                        path: "/",
                        recipe: format.slug,
                        meta: { source: "home_format_board" },
                      })
                    }
                  />
                  <div
                    className={
                      index === 0
                        ? "aspect-square sm:aspect-[4/5]"
                        : "aspect-[3/4] sm:aspect-[4/5]"
                    }
                  >
                    <AutoPlayVideo
                      poster={item.demo.poster}
                      webm={item.demo.webm}
                      mp4={item.demo.mp4}
                      eager={index === 0}
                      lazySources={index > 0}
                      wallDense
                      focusable={false}
                      label={`${format.name} cached preview`}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]"
                    />
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/0 to-black/5"
                      aria-hidden
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 z-20 p-2.5 sm:p-3">
                    <p className="truncate text-[10px] font-black sm:text-sm">
                      {format.name}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-2 text-[7px] font-bold uppercase tracking-[0.1em] text-white/50 sm:text-[9px]">
                      <span>{format.spec}</span>
                      <span className="hidden xl:inline">{format.use}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <p className="px-1 pt-3 text-[11px] font-semibold leading-relaxed text-white/62">
              Three archived Pikbo Lab format previews. They are not presented
              as one verified customer Pack.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
