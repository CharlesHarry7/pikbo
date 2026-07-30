"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import {
  HeroUpload,
  type HomeLaunchAccess,
} from "@/components/HeroUpload";
import { track } from "@/lib/analytics";
import {
  canUsePrivateLaunch,
  displayCredits,
  fetchMe,
} from "@/lib/meClient";
import { SELLER_PACK_LIVE_TOTAL_CREDITS } from "@/lib/sellerPackContract";
import { hasFeedVideo, type FeedItem } from "@/lib/videoFeed";

const FORMAT_DEFS = [
  {
    slug: "360-spin-showcase",
    name: "Listing Spin",
    spec: "Target · 1:1 · Fast 720p · 5 sec",
    use: "Product pages",
  },
  {
    slug: "blind-box-unboxing",
    name: "Blind-box Reveal",
    spec: "Target · 9:16 · Fast 720p · 5 sec",
    use: "Launch posts",
  },
  {
    slug: "paparazzi-flash",
    name: "Social Flash",
    spec: "Target · 9:16 · Fast 720p · 5 sec",
    use: "Reels & Shorts",
  },
] as const;

export function HomeCinemaHero({ items }: { items: FeedItem[] }) {
  const [launchAccess, setLaunchAccess] =
    useState<HomeLaunchAccess>("checking");
  const [credits, setCredits] = useState(0);
  const formats = FORMAT_DEFS.flatMap((format) => {
    const item = items.find((candidate) => candidate.recipeSlug === format.slug);
    return item && hasFeedVideo(item) ? [{ format, item }] : [];
  });
  const inputPoster =
    formats[0]?.item.demo.poster ?? "/demos/scout-still.webp";

  useEffect(() => {
    let canceled = false;
    void fetchMe().then((me) => {
      if (canceled) return;
      if (!canUsePrivateLaunch(me)) {
        setLaunchAccess("public-preview");
        setCredits(0);
        return;
      }
      const balance = displayCredits(me);
      setCredits(balance);
      setLaunchAccess(
        balance >= SELLER_PACK_LIVE_TOTAL_CREDITS
          ? "private-ready"
          : "private-short"
      );
    });
    return () => {
      canceled = true;
    };
  }, []);

  const privateAccess =
    launchAccess === "private-short" || launchAccess === "private-ready";

  return (
    <section
      id="home-create"
      data-home-hero="launch-studio"
      className="relative isolate scroll-mt-14 overflow-hidden bg-[#080809] text-white"
      aria-labelledby="home-hero-title"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.22)_0.65px,transparent_0.65px)] [background-size:10px_10px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-28 top-12 h-80 w-80 rounded-full bg-[#c8ff3d]/14 blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[-8rem] top-32 h-96 w-96 rounded-full bg-[#2477ff]/10 blur-[140px]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1600px] px-4 py-6 sm:px-8 sm:py-14 lg:px-10 lg:py-12 xl:px-16">
        <div className="grid gap-5 sm:gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-12">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#c8ff3d] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-black">
                Launch Studio for toy sellers
              </span>
              <span className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/48">
                {privateAccess
                  ? "Private beta access"
                  : "Public format preview · no upload"}
              </span>
            </div>

            <h1
              id="home-hero-title"
              className="mt-5 max-w-[780px] font-display text-[clamp(2.8rem,6vw,7rem)] font-black leading-[0.84] tracking-[-0.072em] sm:mt-6"
            >
              One toy photo.
              <span className="mt-2 block text-[#c8ff3d]">
                Three product videos.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-sm font-semibold leading-6 text-white/58 sm:mt-6 sm:text-lg sm:leading-relaxed">
              A fixed Listing Spin, Blind-box Reveal, and Social Flash for toy
              sellers. Preview the formats now; generation from your own photo
              is invite-only.
            </p>

            <div className="mt-7 hidden flex-wrap items-center gap-x-5 gap-y-3 text-xs font-black sm:flex">
              <a
                href="#pack-formats"
                className="text-white/74 underline decoration-white/20 underline-offset-4 hover:text-[#c8ff3d]"
              >
                See what the Pack includes ↘
              </a>
              <Link
                href="/pricing"
                className="text-white/42 hover:text-white"
              >
                Founding Studio · coming soon
              </Link>
            </div>

            <div className="mt-8 hidden max-w-xl grid-cols-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] text-[9px] font-black uppercase tracking-[0.1em] text-white/42 sm:grid sm:text-[10px]">
              <span className="px-3 py-3.5">5 sec each</span>
              <span className="border-x border-white/10 px-3 py-3.5 text-center">
                720p beta
              </span>
              <span className="px-3 py-3.5 text-right">Private Library</span>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#111113]/95 p-3 shadow-[0_38px_100px_-42px_rgba(0,0,0,0.95)] sm:p-4 lg:rounded-[2.5rem] lg:p-5">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-1 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#c8ff3d] shadow-[0_0_18px_#c8ff3d]" />
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/72">
                  {privateAccess
                    ? "Prepare a private Launch Pack"
                    : "Preview a Launch Pack"}
                </p>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/32">
                1 input · 3 outputs
              </p>
            </div>

            <div className="mt-3">
              <HeroUpload access={launchAccess} credits={credits} />
            </div>

            <div className="mt-3 flex items-center gap-2 px-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/28">
              <span className="h-px flex-1 bg-white/10" />
              or inspect the fixed formats
              <span className="h-px flex-1 bg-white/10" />
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

            <div className="mt-3 flex items-start gap-3 rounded-2xl border border-white/8 bg-black/30 p-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#ded8ca]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={inputPoster}
                  alt="Pikbo Lab reference still"
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="text-[10px] font-semibold leading-4 text-white/38">
                The three clips above are archived Pikbo Lab format previews,
                not one customer Pack. Only Listing Spin has completed Pikbo&apos;s
                internal end-to-end check. Public visitors do not upload a
                product image here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
