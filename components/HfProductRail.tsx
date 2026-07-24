"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";
import { FreeTrialCta } from "@/components/FreeTrialCta";

/**
 * HF homepage product entry strip — big capability cards in a horizontal rail.
 * Only real Pikbo paths; Video is first and hot.
 * Free trial is FreeTrialCta (exhausted → plans), not a static sample link.
 */
const PRODUCTS: {
  href: string;
  title: string;
  blurb: string;
  tag: string;
  hot?: boolean;
}[] = [
  {
    href: "/create",
    title: "Seedance Video",
    blurb: "Photo → short video in seconds",
    tag: "Video",
    hot: true,
  },
  {
    href: "/flow",
    title: "Flow",
    blurb: "Creation matrix",
    tag: "Matrix",
  },
  {
    href: "/modules",
    title: "Modules",
    blurb: "Fixed video jobs",
    tag: "Apps",
  },
  {
    href: "/create?mode=seller-pack",
    title: "Seller Pack",
    blurb: "3 videos · one photo",
    tag: "Shop",
  },
  {
    href: "/effects",
    title: "Viral Presets",
    blurb: "Full recipe wall",
    tag: "Presets",
  },
  {
    href: "/cinema",
    title: "Cinema",
    blurb: "Director board · Preview",
    tag: "Preview",
  },
  {
    href: "/image",
    title: "Image",
    blurb: "Stills · then animate",
    tag: "Optional",
  },
];

export function HfProductRail() {
  return (
    <section className="border-b border-white/10 bg-black px-3 py-5 sm:px-5">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-3 flex items-end justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c8ff3d]">
            Create
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <FreeTrialCta
              path="/#product-rail"
              labelTry="Try free · Mini 5s"
              hideClipsChip
              className="text-[11px] font-bold text-[#c8ff3d] hover:underline"
            />
            <Link
              href="/create"
              className="text-[11px] font-bold text-[#c8ff3d] hover:underline"
            >
              Open Generate →
            </Link>
          </div>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Free Mini honesty card — not a static always-free live claim */}
          <div className="group relative w-[9.5rem] shrink-0 overflow-hidden rounded-2xl border border-[#c8ff3d]/45 bg-[#c8ff3d]/[0.1] p-3.5 shadow-[0_0_32px_rgba(200,255,61,0.12)] sm:w-[11rem]">
            <span className="inline-flex rounded-full bg-[#c8ff3d] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-black">
              Free
            </span>
            <p className="mt-2 text-[13px] font-black leading-tight text-white">
              <FreeTrialCta
                path="/#product-rail-card"
                labelTry="Try free"
                labelDemo="Lab sample"
                labelPlans="Plans"
                hideClipsChip
                className="font-black text-white group-hover:text-[#c8ff3d]"
              />
            </p>
            <p className="mt-1 text-[10px] leading-snug text-white/45">
              Lab sample · Free Mini 5s
            </p>
          </div>
          {PRODUCTS.map((p) => (
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
              className={`group relative w-[9.5rem] shrink-0 overflow-hidden rounded-2xl border p-3.5 transition duration-200 hover:-translate-y-0.5 sm:w-[11rem] ${
                p.hot
                  ? "border-[#c8ff3d]/45 bg-[#c8ff3d]/[0.1] shadow-[0_0_32px_rgba(200,255,61,0.12)]"
                  : "border-white/10 bg-white/[0.04] hover:border-white/25"
              }`}
            >
              <span
                className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                  p.hot
                    ? "bg-[#c8ff3d] text-black"
                    : "border border-white/15 text-white/50"
                }`}
              >
                {p.tag}
              </span>
              <p className="mt-2 text-[13px] font-black leading-tight text-white group-hover:text-[#c8ff3d]">
                {p.title}
              </p>
              <p className="mt-1 text-[10px] leading-snug text-white/45">
                {p.blurb}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
