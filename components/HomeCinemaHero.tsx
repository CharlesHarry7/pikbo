"use client";

import Image from "next/image";
import Link from "next/link";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { track } from "@/lib/analytics";
import { WAVE_A_DESTINATIONS } from "@/lib/softLaunch";

const PROOF_STEPS = [
  {
    eyebrow: "01 · Input",
    title: "Your phone photo",
    src: "/demos/visual-v2/hero-input.webp",
    alt: "Plain phone photo of Pikbo's original matte ivory vinyl character",
    truth: "Original editorial input",
  },
  {
    eyebrow: "02 · Set",
    title: "A tiny world",
    src: "/demos/visual-v2/hero-set.webp",
    alt: "Miniature rainy workbench set being arranged around the same original character",
    truth: "Editorial process view",
  },
  {
    eyebrow: "03 · Output",
    title: "A 9:16 story",
    src: "/demos/visual-v2/hero-output.webp",
    alt: "Vertical story frame of the same original character at a rain-lit workbench",
    truth: "Cached editorial preview",
  },
] as const;

/**
 * A proof-led brand story, not a Recipe card. The primary action therefore
 * enters Create without borrowing a Recipe slug or Recipe conversion event.
 */
export function HomeCinemaHero() {
  return (
    <section
      data-home-hero="proof-story"
      className="relative isolate overflow-hidden border-b border-black/10 bg-[#eee9dc] px-4 pb-[calc(7.75rem+env(safe-area-inset-bottom))] pt-8 text-[#171713] sm:px-7 sm:pb-16 sm:pt-12 lg:min-h-[calc(100svh-3.5rem)] lg:px-10 lg:py-12"
      aria-labelledby="home-hero-title"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-55 [background-image:radial-gradient(circle_at_14%_8%,rgba(255,255,255,0.95),transparent_34%),linear-gradient(115deg,transparent_57%,rgba(143,162,151,0.18)_100%)]"
        aria-hidden
      />
      <div className="mx-auto grid max-w-[1500px] gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-12">
        <div className="max-w-xl lg:py-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/45 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]">
            <span
              className="h-2 w-2 rounded-full bg-[#b9f529] shadow-[0_0_0_3px_rgba(185,245,41,0.18)]"
              aria-hidden
            />
            Cached brand story · 0 credits
          </p>
          <h1
            id="home-hero-title"
            className="mt-5 max-w-[11ch] font-display text-[clamp(3.35rem,7.1vw,7.5rem)] font-black leading-[0.83] tracking-[-0.07em]"
          >
            One toy photo. A world worth sharing.
          </h1>
          <p className="mt-6 max-w-lg text-base font-medium leading-relaxed text-black/62 sm:text-lg">
            Build launch-ready toy stories from one photo, with every Recipe,
            setting and cached proof open for inspection.
          </p>

          <div className="mt-7 flex flex-col items-stretch gap-3 min-[440px]:flex-row min-[440px]:items-center">
            <Link
              href={WAVE_A_DESTINATIONS.generate.href}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#b9f529] px-7 text-sm font-black text-black shadow-[0_12px_30px_rgba(80,106,18,0.18)] transition hover:-translate-y-0.5 hover:bg-[#c8ff55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-[#eee9dc]"
              data-hero-action="create"
              data-capability-state={WAVE_A_DESTINATIONS.generate.state}
              onClick={() =>
                track({
                  event: "landing_view",
                  path: "/",
                  meta: { source: "home_hero", destination: "create" },
                })
              }
            >
              Create with your toy
            </Link>
            <a
              href="#toy-wall"
              className="inline-flex min-h-11 items-center justify-center px-3 text-sm font-black underline decoration-black/25 underline-offset-4 transition hover:decoration-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              Explore recipe stories ↓
            </a>
          </div>

          <p className="mt-4 max-w-lg text-xs leading-relaxed text-black/48">
            Preview mode is cached: your upload is not processed, no provider is
            called, and no credits are charged.
          </p>
        </div>

        <div className="min-w-0">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-black/10 bg-[#1d211e] shadow-[0_28px_70px_rgba(44,46,38,0.24)] sm:rounded-[2.25rem]">
            <AutoPlayVideo
              poster="/demos/visual-v2/hero-desktop.webp"
              mobilePoster="/demos/visual-v2/hero-mobile.webp"
              mp4="/demos/visual-v2/hero-loop.mp4"
              eager
              showControls
              mobilePlayback="poster-only"
              label="Original Pikbo editorial workbench loop"
              className="aspect-[4/5] w-full object-cover sm:aspect-[16/10] lg:aspect-[16/9]"
            />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/55 to-transparent p-4 pb-12 text-white sm:p-5">
              <span className="rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] backdrop-blur">
                Original editorial scene
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/70">
                Rain desk · v2
              </span>
            </div>
          </div>

          <div
            className="-mt-5 grid grid-cols-3 gap-2 px-2 sm:-mt-8 sm:gap-3 sm:px-6"
            aria-label="Input, set, and cached output proof"
          >
            {PROOF_STEPS.map((step) => (
              <article
                key={step.eyebrow}
                className="relative min-w-0 overflow-hidden rounded-2xl border border-black/10 bg-[#faf7ef] p-1.5 shadow-[0_13px_30px_rgba(42,45,38,0.15)] sm:rounded-[1.25rem] sm:p-2"
              >
                <Image
                  src={step.src}
                  alt={step.alt}
                  width={540}
                  height={675}
                  sizes="(max-width: 768px) 28vw, 16vw"
                  className="aspect-[4/5] w-full rounded-xl object-cover sm:rounded-[0.9rem]"
                />
                <div className="px-1 pb-1 pt-2 sm:px-2 sm:pb-2">
                  <p className="text-[7px] font-black uppercase tracking-[0.13em] text-black/40 sm:text-[9px]">
                    {step.eyebrow}
                  </p>
                  <h2 className="mt-0.5 truncate text-[9px] font-black sm:text-xs">
                    {step.title}
                  </h2>
                  <p className="mt-0.5 hidden text-[8px] font-semibold text-black/42 sm:block">
                    {step.truth}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
