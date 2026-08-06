"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { createGenerate360Href } from "@/lib/jobIntents";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

/** Primary Generate door — listing spin remix (ratio/duration/channel). */
const GENERATE_REMIX_HREF = createGenerate360Href("hf-product-rail");
/** Moment door — mode=moment contract + honest source (never bare /create). */
const MOMENT_RAIL_HREF = `${MOMENT_CREATE_HREF}&source=hf-product-rail` as const;

/**
 * HF homepage product entry strip — media-backed capability cards.
 * Only real Pikbo paths; Video is first and hot. Owned Lab posters only.
 * Below-fold suite density under Moment hero (AIT-121 / AIT-156); secondary to hero CTA.
 */
/** Product doors first; Flow/Cinema/Image are Preview (not live job peers). */
const PRODUCTS: {
  href: string;
  title: string;
  blurb: string;
  tag: string;
  hot?: boolean;
  /** Index into DEMO_VIDEOS for poster background */
  demoIndex: number;
}[] = [
  {
    href: GENERATE_REMIX_HREF,
    title: "Seedance Video",
    blurb: "Photo → short video",
    tag: "Video",
    hot: true,
    demoIndex: 0,
  },
  {
    href: MOMENT_RAIL_HREF,
    title: "Street Power-Up Moment",
    blurb: "1 directed video · one photo",
    tag: "Toy Moment",
    hot: true,
    demoIndex: 3,
  },
  {
    href: "/modules",
    title: "Modules",
    blurb: "Fixed video jobs",
    tag: "Jobs",
    hot: true,
    demoIndex: 2,
  },
  {
    href: "/effects",
    title: "Viral Presets",
    blurb: "Full recipe wall",
    tag: "Presets",
    hot: true,
    demoIndex: 4,
  },
  {
    href: "/flow",
    title: "Flow",
    blurb: "Preview media wall",
    tag: "Preview",
    demoIndex: 1,
  },
  {
    href: "/cinema",
    title: "Cinema",
    blurb: "Director board · Preview",
    tag: "Preview",
    demoIndex: 2,
  },
  {
    href: "/image",
    title: "Image",
    blurb: "Stills · then animate",
    tag: "Preview",
    demoIndex: 3,
  },
];

export function HfProductRail() {
  return (
    <section
      data-home-suite-rail="hf-product"
      className="border-b border-white/10 bg-black px-3 py-5 sm:px-5"
      aria-label="Generate suite"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c8ff3d]">
              Suite
            </p>
            <p className="mt-0.5 text-[11px] text-white/40">
              Generate 360° and more lab doors · secondary to the Moment above
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <FreeTrialCta
              path="/#product-rail"
              labelTry="Try free · Mini 5s"
              hideClipsChip
              className="text-[11px] font-bold text-[#c8ff3d] hover:underline"
            />
            <Link
              href={GENERATE_REMIX_HREF}
              className="text-[11px] font-bold text-[#c8ff3d] hover:underline"
              data-hf-rail-generate="remix"
              data-home-suite-360
            >
              Generate 360° →
            </Link>
          </div>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Free Mini honesty card */}
          <div className="group relative h-[9.5rem] w-[8.5rem] shrink-0 overflow-hidden rounded-2xl border border-[#c8ff3d]/45 bg-[#c8ff3d]/[0.1] p-3.5 shadow-[0_0_32px_rgba(200,255,61,0.12)] sm:h-[11rem] sm:w-[10rem]">
            <span className="relative z-10 inline-flex rounded-full bg-[#c8ff3d] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-black">
              Free
            </span>
            <p className="relative z-10 mt-2 text-[13px] font-black leading-tight text-white">
              <FreeTrialCta
                path="/#product-rail-card"
                labelTry="Try free"
                labelDemo="Lab sample"
                labelPlans="Plans"
                hideClipsChip
                className="font-black text-white group-hover:text-[#c8ff3d]"
              />
            </p>
            <p className="relative z-10 mt-1 text-[10px] leading-snug text-white/45">
              Lab sample · Free Mini 5s
            </p>
          </div>
          {PRODUCTS.map((p) => {
            const demo = DEMO_VIDEOS[p.demoIndex % DEMO_VIDEOS.length];
            return (
              <Link
                key={p.href + p.title}
                href={p.href}
                onClick={() =>
                  track({
                    event: "landing_view",
                    path: "/",
                    meta: { cta: "hf_product_rail", label: p.title },
                  })
                }
                className={`group relative h-[9.5rem] w-[8.5rem] shrink-0 overflow-hidden rounded-2xl border transition duration-200 hover:-translate-y-0.5 sm:h-[11rem] sm:w-[10rem] ${
                  p.hot
                    ? "border-[#c8ff3d]/50 shadow-[0_0_32px_rgba(200,255,61,0.14)]"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={demo.poster}
                  alt=""
                  width={200}
                  height={280}
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${
                    p.hot
                      ? "from-black via-black/70 to-black/25"
                      : "from-black via-black/75 to-black/35"
                  }`}
                />
                <div className="relative z-10 flex h-full flex-col justify-between p-3">
                  <span
                    className={`inline-flex w-fit rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                      p.hot
                        ? "bg-[#c8ff3d] text-black"
                        : "border border-white/20 bg-black/50 text-white/70 backdrop-blur"
                    }`}
                  >
                    {p.tag}
                  </span>
                  <div>
                    <p className="text-[13px] font-black leading-tight text-white group-hover:text-[#c8ff3d]">
                      {p.title}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-white/55">
                      {p.blurb}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
