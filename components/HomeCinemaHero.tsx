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
    frame: "bg-[#4A55FF]",
    ink: "text-white",
  },
  {
    slug: "blind-box-unboxing",
    name: "Blind-box Reveal",
    spec: "9:16 · 5 sec",
    use: "Drop day",
    frame: "bg-[#FF5A47]",
    ink: "text-white",
  },
  {
    slug: "paparazzi-flash",
    name: "Social Flash",
    spec: "9:16 · 5 sec",
    use: "Reels & Shorts",
    frame: "bg-[#FFD447]",
    ink: "text-[#17131D]",
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
      className="relative isolate scroll-mt-14 overflow-hidden bg-[#F6F0E5] text-[#17131D]"
      aria-labelledby="home-hero-title"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(23,19,29,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(23,19,29,0.055)_1px,transparent_1px)] [background-size:32px_32px]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-[1600px] px-4 py-7 sm:px-8 sm:py-14 lg:px-10 lg:py-16 xl:px-16">
        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-12">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rotate-[-1deg] rounded-full bg-[#17131D] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#F6F0E5]">
                AI launch pack for designer toys
              </span>
              <span className="rounded-full border border-[#17131D]/16 bg-white/55 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#17131D]/58">
                {privateAccess ? "Private beta access" : "Lab preview · no upload"}
              </span>
            </div>

            <h1
              id="home-hero-title"
              className="mt-6 max-w-[820px] font-display text-[clamp(3rem,5vw,5.5rem)] font-black leading-[0.86] tracking-[-0.07em]"
            >
              One toy photo.
              <span className="mt-2 block text-[#4A55FF]">Three clips that sell it.</span>
            </h1>

            <p className="mt-6 max-w-xl text-sm font-semibold leading-6 text-[#17131D]/62 sm:text-lg sm:leading-7">
              Turn one owned product photo into a square listing spin, a
              vertical blind-box reveal, and a social launch flash. No prompt
              engineering. No model shopping.
            </p>

            <div className="mt-7 max-w-xl rounded-[1.6rem] border-2 border-[#17131D] bg-white/72 p-2 shadow-[8px_8px_0_#17131D] sm:p-3">
              <HeroUpload access={launchAccess} credits={credits} />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-black">
              <a
                href="#pack-formats"
                className="text-[#17131D] underline decoration-[#FF5A47] decoration-2 underline-offset-4 hover:text-[#4A55FF]"
              >
                See the three sell-ready formats ↘
              </a>
              <Link href="/pricing" className="text-[#17131D]/44 hover:text-[#17131D]">
                Founding Studio · coming soon
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-3 -top-5 z-20 rotate-[5deg] rounded-full border-2 border-[#17131D] bg-[#CBFF3D] px-4 py-2 text-[10px] font-black uppercase tracking-[0.13em] shadow-[4px_4px_0_#17131D] sm:right-2">
              1 input → 3 outputs
            </div>
            <div className="rounded-[2rem] border-2 border-[#17131D] bg-[#17131D] p-3 shadow-[12px_12px_0_rgba(74,85,255,0.32)] sm:p-4 lg:rounded-[2.6rem] lg:p-5">
              <div className="flex items-center justify-between gap-4 px-1 pb-3 text-[#F6F0E5]">
                <p className="text-[10px] font-black uppercase tracking-[0.18em]">
                  The fixed Launch Pack
                </p>
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#F6F0E5]/44">
                  Archived format prototypes
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                {formats.map(({ format, item }, index) => (
                  <article
                    key={format.slug}
                    className={`group relative min-w-0 overflow-hidden rounded-[1.35rem] border-2 border-[#F6F0E5]/18 ${format.frame}`}
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
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                      />
                    </div>
                    <div className={`${format.ink} relative min-h-[6.2rem] p-2.5 sm:p-3`}>
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-70">
                        {format.use}
                      </p>
                      <p className="mt-2 text-xs font-black leading-tight sm:text-base">
                        {format.name}
                      </p>
                      <p className="mt-1 text-[9px] font-bold opacity-70 sm:text-[10px]">
                        {format.spec}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-2.5 text-[9px] font-semibold leading-4 text-[#F6F0E5]/46 sm:text-[10px]">
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
