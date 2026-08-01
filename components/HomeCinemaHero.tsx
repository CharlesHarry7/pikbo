"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { HeroUpload, type HomeLaunchAccess } from "@/components/HeroUpload";
import { track } from "@/lib/analytics";
import { canUsePrivateLaunch, displayCredits, fetchMe } from "@/lib/meClient";
import { SELLER_PACK_LIVE_TOTAL_CREDITS } from "@/lib/sellerPackContract";
import { hasFeedVideo, type FeedItem } from "@/lib/videoFeed";

const FORMAT_DEFS = [
  {
    slug: "360-spin-showcase",
    name: "Listing Spin",
    spec: "1:1 · 5 sec",
    use: "Shop listing",
  },
  {
    slug: "blind-box-unboxing",
    name: "Blind-box Reveal",
    spec: "9:16 · 5 sec",
    use: "Drop day",
  },
  {
    slug: "paparazzi-flash",
    name: "Social Flash",
    spec: "9:16 · 5 sec",
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
      data-home-hero="seller-explore"
      className="relative isolate scroll-mt-14 overflow-hidden bg-[#09090B] text-[#F4F4F5]"
      aria-labelledby="home-hero-title"
    >
      <div className="relative mx-auto max-w-[1600px] px-3 py-4 sm:px-5 sm:py-6 lg:px-6">
        <div className="grid gap-4 border-b border-white/[0.08] pb-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.12em]">
              <span className="text-[#C8FF3D]">AI launch pack for designer toys</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-white/46">
                {privateAccess ? "Private beta access" : "Lab preview · no upload"}
              </span>
            </div>
            <h1
              id="home-hero-title"
              className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] font-semibold leading-[0.98] tracking-[-0.05em]"
            >
              One toy photo. Three clips that sell it.
            </h1>
            <p className="mt-3 max-w-2xl text-xs leading-5 text-white/52 sm:text-sm">
              Three fixed seller formats. No prompt writing, model hunting, or timeline editing.
            </p>
          </div>

          <div className="lg:justify-self-end lg:w-[420px]">
            <HeroUpload access={launchAccess} credits={credits} />
          </div>
        </div>

        <div className="mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-3 sm:overflow-visible">
          {formats.map(({ format, item }, index) => (
            <article
              key={format.slug}
              className="group relative min-w-[86%] snap-start overflow-hidden rounded-[0.9rem] border border-white/[0.08] bg-[#121214] sm:min-w-0"
              data-home-format-preview={format.slug}
            >
              <Link
                href={item.projectHref || item.href}
                aria-label={`Open ${format.name} archived prototype`}
                className="absolute inset-0 z-20"
                onClick={() =>
                  track({
                    event: item.projectHref ? "project_open" : "recipe_use",
                    path: "/",
                    recipe: format.slug,
                    meta: { source: "home_format_board" },
                  })
                }
              />
              <div className="aspect-[5/4] min-h-[240px] sm:min-h-0 lg:aspect-[16/10]">
                <AutoPlayVideo
                  poster={item.demo.poster}
                  webm={item.demo.webm}
                  mp4={item.demo.mp4}
                  eager={index === 0}
                  lazySources={index > 0}
                  wallDense
                  focusable={false}
                  label={`${format.name} archived prototype`}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/70 to-transparent px-3 pb-3 pt-14 text-white">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-[#C8FF3D]">
                      {format.use}
                    </p>
                    <p className="mt-1 text-sm font-bold sm:text-base">{format.name}</p>
                  </div>
                  <span className="rounded-full border border-white/20 bg-black/30 px-2 py-1 text-[9px] font-semibold text-white/76 backdrop-blur">
                    {format.spec}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[9px] leading-4 text-white/38 sm:text-[10px]">
          <p className="max-w-4xl">
            Separate Pikbo Lab prototypes, not one customer Pack. Listing Spin is the completed private technical check.
          </p>
          <div className="flex gap-4 font-semibold">
            <a href="#pack-formats" className="text-white/66 hover:text-[#C8FF3D]">View format details</a>
            <Link href="/pricing" className="text-white/42 hover:text-[#C8FF3D]">Founding Studio · coming soon</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
