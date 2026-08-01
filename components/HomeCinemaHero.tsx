"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HeroUpload, type HomeLaunchAccess } from "@/components/HeroUpload";
import { canUsePrivateLaunch, displayCredits, fetchMe } from "@/lib/meClient";
import { SELLER_PACK_LIVE_TOTAL_CREDITS } from "@/lib/sellerPackContract";
import type { FeedItem } from "@/lib/videoFeed";

const STYLE_STUDIES = [
  {
    slug: "art-vinyl",
    name: "Art vinyl",
    material: "Soft vinyl · translucent resin",
    image: "/style-studies/art-vinyl-guardian-v1.jpg",
    alt: "Original abstract art-vinyl guardian on a cobalt and vermilion display plinth",
  },
  {
    slug: "precision-mecha",
    name: "Precision mecha",
    material: "Articulated ABS · die-cast detail",
    image: "/style-studies/precision-mecha-v1.jpg",
    alt: "Original precision mecha collectible photographed on a brushed metal turntable",
  },
  {
    slug: "plush-hybrid",
    name: "Plush hybrid",
    material: "Fleece · matte vinyl · woven textile",
    image: "/style-studies/plush-hybrid-v1.jpg",
    alt: "Original plush-and-vinyl hybrid collectible in a warm editorial studio",
  },
] as const;

export function HomeCinemaHero({ items }: { items: FeedItem[] }) {
  const [launchAccess, setLaunchAccess] =
    useState<HomeLaunchAccess>("checking");
  const [credits, setCredits] = useState(0);
  const archivedPrototypeCount = items.length;

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
      data-archived-prototype-count={archivedPrototypeCount}
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
              Three fixed seller formats are shown below. This style board reflects the range of collectibles Pikbo is being built for.
            </p>
          </div>

          <div className="lg:justify-self-end lg:w-[420px]">
            <HeroUpload access={launchAccess} credits={credits} />
          </div>
        </div>

        <div className="mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-3 sm:overflow-visible">
          {STYLE_STUDIES.map((study, index) => (
            <article
              key={study.slug}
              className="group relative min-w-[86%] snap-start overflow-hidden rounded-[0.9rem] border border-white/[0.08] bg-[#121214] sm:min-w-0"
              data-home-style-study={study.slug}
            >
              <div className="relative aspect-[5/4] min-h-[240px] sm:min-h-0 lg:aspect-[16/10]">
                <Image
                  src={study.image}
                  alt={study.alt}
                  fill
                  priority={index === 0}
                  sizes="(max-width: 639px) 86vw, 33vw"
                  className="object-cover transition duration-700 group-hover:scale-[1.015]"
                />
              </div>
              <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-[#C8FF3D] backdrop-blur-md">
                Original style study
              </span>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/70 to-transparent px-3 pb-3 pt-14 text-white">
                <p className="text-sm font-bold sm:text-base">{study.name}</p>
                <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.1em] text-white/62">
                  {study.material}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[9px] leading-4 text-white/38 sm:text-[10px]">
          <p className="max-w-4xl">
            Original Pikbo style studies for category direction — not Launch Pack outputs or customer uploads.
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
