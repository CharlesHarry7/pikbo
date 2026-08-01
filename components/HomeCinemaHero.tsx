"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  HeroUpload,
  type HomeLaunchAccess,
} from "@/components/HeroUpload";
import {
  canUsePrivateLaunch,
  displayCredits,
  fetchMe,
} from "@/lib/meClient";
import { SELLER_PACK_LIVE_TOTAL_CREDITS } from "@/lib/sellerPackContract";
import type { FeedItem } from "@/lib/videoFeed";

const STYLE_STUDIES = [
  {
    name: "Art vinyl",
    detail: "Graphic form",
    image: "/style-studies/art-vinyl-guardian-v1.jpg",
    alt: "Original white, cobalt, and red art-vinyl toy style study",
  },
  {
    name: "Plush hybrid",
    detail: "Soft character",
    image: "/style-studies/plush-hybrid-v1.jpg",
    alt: "Original cream plush-hybrid toy style study",
  },
  {
    name: "Precision mecha",
    detail: "Hard-surface detail",
    image: "/style-studies/precision-mecha-v1.jpg",
    alt: "Original white, black, and orange mecha toy style study",
  },
] as const;

const FORMAT_DIRECTIONS = [
  {
    slug: "360-spin-showcase",
    name: "Listing Spin",
    use: "Marketplace listing",
    spec: "1:1 · 5 sec",
    image: "/style-studies/art-vinyl-guardian-v1.jpg",
    alt: "Art-vinyl sample on a product plinth for the Listing Spin direction",
    evidence: "Original sample",
    tone: "blue",
  },
  {
    slug: "blind-box-unboxing",
    name: "Blind-box Reveal",
    use: "Drop announcement",
    spec: "9:16 · 5 sec",
    image: "/style-studies/art-vinyl-blind-box-direction-v1.jpg",
    alt: "Same art-vinyl sample emerging from an unbranded blind box",
    evidence: "Format direction",
    tone: "coral",
  },
  {
    slug: "paparazzi-flash",
    name: "Social Flash",
    use: "Reels and short-form",
    spec: "9:16 · 5 sec",
    image: "/style-studies/art-vinyl-social-flash-direction-v1.jpg",
    alt: "Same art-vinyl sample in a bold direct-flash social launch scene",
    evidence: "Format direction",
    tone: "coral",
  },
] as const;

export function HomeCinemaHero({ items }: { items: FeedItem[] }) {
  const [launchAccess, setLaunchAccess] =
    useState<HomeLaunchAccess>("checking");
  const [credits, setCredits] = useState(0);
  const formats = FORMAT_DIRECTIONS.flatMap((format) => {
    const item = items.find((candidate) => candidate.recipeSlug === format.slug);
    return item ? [{ format, item }] : [];
  });
  const archivedListing = formats.find(
    ({ format }) => format.slug === "360-spin-showcase"
  )?.item;

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
      data-home-hero="result-selector"
      data-home-upgrade="launch-pack"
      className="scroll-mt-14 overflow-hidden bg-[#EEF0F4] px-3 pb-12 pt-4 text-[#15171B] sm:px-7 sm:pb-20 sm:pt-7 lg:px-10"
      aria-labelledby="home-hero-title"
    >
      <div className="mx-auto max-w-[1480px]">
        <div className="flex items-center justify-between gap-4 border-b border-[#C9CED8] pb-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#586170]">
            AI launch pack for designer toys
          </p>
          <p className="text-[10px] font-bold text-[#727A87]">
            {privateAccess
              ? "Invited private validation"
              : "Public format preview · no upload"}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-3 lg:max-w-[720px]">
          {STYLE_STUDIES.map((style) => (
            <article
              key={style.name}
              className="grid min-w-0 grid-cols-[52px_1fr] items-center gap-2 overflow-hidden rounded-xl border border-[#D5D9E1] bg-white p-1.5 sm:grid-cols-[68px_1fr] sm:gap-3 sm:p-2"
            >
              <div className="relative aspect-square overflow-hidden rounded-lg bg-[#DDE1E8]">
                <Image
                  src={style.image}
                  alt={style.alt}
                  fill
                  sizes="(max-width: 640px) 52px, 68px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-[10px] font-black sm:text-xs">
                  {style.name}
                </h2>
                <p className="mt-0.5 hidden text-[9px] text-[#747C89] sm:block">
                  {style.detail}
                </p>
                <p className="mt-1 truncate text-[7px] font-black uppercase tracking-[0.09em] text-[#2457E6] sm:text-[8px]">
                  Original study
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end lg:gap-12">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2457E6]">
              One owned product photo → one fixed Pack
            </p>
            <h1
              id="home-hero-title"
              className="mt-3 max-w-5xl font-display text-[clamp(2.55rem,5.8vw,6.25rem)] font-black leading-[0.91] tracking-[-0.065em]"
            >
              Choose the launch look for your toy.
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-[#626B78] sm:text-base">
              Pikbo turns one authorized toy photo into three fixed video jobs:
              a listing spin, a blind-box reveal, and a social flash. No model
              hunting, prompt writing, or timeline editing.
            </p>
          </div>

          <HeroUpload access={launchAccess} credits={credits} />
        </div>

        <div
          id="pack-formats"
          className="mt-7 grid scroll-mt-20 gap-3 lg:grid-cols-3"
        >
          {formats.map(({ format, item }, index) => (
            <article
              key={format.slug}
              data-home-format-preview={format.slug}
              className="group overflow-hidden rounded-2xl border border-[#C9CED8] bg-white shadow-[0_14px_40px_-32px_rgba(22,32,51,0.5)]"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-[#DDE1E8]">
                <Image
                  src={format.image}
                  alt={format.alt}
                  fill
                  priority={index === 0}
                  sizes="(max-width: 1023px) 100vw, 33vw"
                  className="object-cover transition duration-700 group-hover:scale-[1.025]"
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent"
                  aria-hidden
                />
                <span
                  className={`absolute left-3 top-3 rounded-md px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.11em] text-white ${
                    format.tone === "blue" ? "bg-[#2457E6]" : "bg-[#E85C45]"
                  }`}
                >
                  {format.evidence}
                </span>
                <Link
                  href={item.projectHref || item.href}
                  aria-label={`Open a different archived ${format.name} Lab prototype`}
                  className="absolute right-3 top-3 rounded-md border border-white/25 bg-black/45 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-[0.1em] text-white backdrop-blur transition hover:bg-black/70"
                >
                  Other toy · motion ↗
                </Link>
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.13em] text-white/68">
                      {format.use}
                    </p>
                    <h2 className="mt-1 text-xl font-black tracking-[-0.035em] sm:text-2xl">
                      {format.name}
                    </h2>
                  </div>
                  <span className="shrink-0 rounded-md border border-white/25 bg-black/35 px-2 py-1 text-[9px] font-black backdrop-blur">
                    {format.spec}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-3 grid gap-3 border-t border-[#C9CED8] pt-4 md:grid-cols-[1fr_auto] md:items-center">
          <p className="max-w-4xl text-[11px] font-semibold leading-5 text-[#69717E]">
            Direction frames use one original Pikbo sample toy. They are not
            customer results or completed videos. A separate internal synthetic
            Listing Spin run passed the private generation, recovery, and
            download path; its media is not presented as the Pack above.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-black">
            {archivedListing ? (
              <Link
                href={archivedListing.projectHref || archivedListing.href}
                className="text-[#2457E6] underline decoration-[#2457E6]/25 underline-offset-4 hover:decoration-[#2457E6]"
              >
                View archived Lab motion ↗
              </Link>
            ) : null}
            <Link href="/pricing" className="text-[#5F6774] hover:text-[#15171B]">
              Founding Studio · coming soon
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-px overflow-hidden rounded-xl border border-[#C9CED8] bg-[#C9CED8] sm:grid-cols-4">
          {[
            ["Validated", "1 internal single-clip run"],
            ["Output", "5.042-second Listing Spin"],
            ["Recovery", "Library refresh + private download"],
            ["Public state", "Sample preview only"],
          ].map(([label, value]) => (
            <div key={label} className="bg-white px-4 py-3">
              <p className="text-[8px] font-black uppercase tracking-[0.13em] text-[#7B8390]">
                {label}
              </p>
              <p className="mt-1 text-[11px] font-black text-[#2A2E35]">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
