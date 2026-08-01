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
      data-home-hero="toy-drop-studio"
      className="relative isolate scroll-mt-14 overflow-hidden bg-[#0C0B0F] text-[#F3EFE6]"
      aria-labelledby="home-hero-title"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[44rem] bg-[radial-gradient(50%_60%_at_78%_12%,rgba(196,92,74,0.12),transparent_72%),radial-gradient(40%_55%_at_20%_0%,rgba(198,181,154,0.08),transparent_70%)]" aria-hidden />
      <div className="relative mx-auto max-w-[1560px] px-4 py-9 sm:px-8 sm:py-16 lg:px-10 lg:py-20 xl:px-16">
        <div className="grid gap-10 lg:grid-cols-[0.84fr_1.16fr] lg:items-center lg:gap-14">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="border-l border-[#C45C4A] pl-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C6B59A]">
                AI launch pack for designer toys
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#F3EFE6]/44">
                {privateAccess ? "Private beta access" : "Lab preview · no upload"}
              </span>
            </div>

            <h1
              id="home-hero-title"
              className="mt-7 max-w-[820px] font-display text-[clamp(3rem,5.4vw,5.4rem)] font-medium leading-[0.91] tracking-[-0.062em]"
            >
              One toy photo.
              <span className="mt-2 block text-[#C45C4A]">Three clips that sell it.</span>
            </h1>

            <p className="mt-7 max-w-xl text-sm font-normal leading-6 text-[#F3EFE6]/58 sm:text-lg sm:leading-7">
              Turn one owned product photo into a square listing spin, a
              vertical blind-box reveal, and a social launch flash. No prompt
              engineering. No model shopping.
            </p>

            <div className="mt-8 max-w-xl rounded-[1.35rem] border border-white/10 bg-[#16141C]/88 p-2 shadow-[0_24px_80px_-48px_rgba(0,0,0,0.95)] sm:p-3">
              <HeroUpload access={launchAccess} credits={credits} />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-semibold">
              <a
                href="#pack-formats"
                className="text-[#F3EFE6] underline decoration-[#C45C4A] decoration-1 underline-offset-4 hover:text-[#C6B59A]"
              >
                See the three sell-ready formats ↘
              </a>
              <Link href="/pricing" className="text-[#F3EFE6]/38 hover:text-[#F3EFE6]">
                Founding Studio · coming soon
              </Link>
            </div>
          </div>

          <div className="relative min-w-0">
            <div className="rounded-[1.75rem] border border-white/10 bg-[#16141C] p-3 shadow-[0_38px_110px_-58px_rgba(0,0,0,1)] sm:p-4 lg:rounded-[2rem] lg:p-5">
              <div className="flex items-center justify-between gap-4 px-1 pb-3 text-[#F6F0E5]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C6B59A]">
                  The fixed Launch Pack
                </p>
                <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-[#F3EFE6]/38">
                  1 input · 3 fixed outputs
                </p>
              </div>

              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-3 sm:overflow-visible">
                {formats.map(({ format, item }, index) => (
                  <article
                    key={format.slug}
                    className="group relative min-w-[72%] snap-start overflow-hidden rounded-[1.15rem] border border-white/10 bg-[#1E1B26] sm:min-w-0"
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
                    <div className={index === 0 ? "aspect-[4/5]" : "aspect-[3/5] sm:aspect-[4/5]"}>
                      <AutoPlayVideo
                        poster={item.demo.poster}
                        webm={item.demo.webm}
                        mp4={item.demo.mp4}
                        eager={index === 0}
                        lazySources={index > 0}
                        wallDense
                        focusable={false}
                        label={`${format.name} archived prototype`}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.015]"
                      />
                    </div>
                    <div className="relative min-h-[6.2rem] border-t border-white/[0.08] p-3 text-[#F3EFE6]">
                      <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-[#C6B59A]/68">
                        {format.use}
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-tight sm:text-base">
                        {format.name}
                      </p>
                      <p className="mt-1 text-[9px] font-medium text-[#F3EFE6]/42 sm:text-[10px]">
                        {format.spec}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <p className="mt-3 border-t border-white/[0.08] px-1 pt-3 text-[9px] font-normal leading-4 text-[#F3EFE6]/40 sm:text-[10px]">
                These are separate archived Pikbo Lab prototypes, not one
                customer Pack. Listing Spin is the only format with a completed
                private end-to-end technical check so far.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
