"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";

const FORMATS = [
  {
    id: "listing-spin",
    name: "Listing Spin",
    shortName: "Spin",
    use: "Marketplace listing",
    sample: "Scout",
    poster: "/demos/scout-still.webp",
    mp4: "/demos/scout-packshot-spin.mp4",
    webm: "/demos/scout-packshot-spin.webm",
    actual: "Archived sample · 16:9 · 6 sec",
    target: "Target output · 1:1 · 5 sec",
    accent: "#FF6846",
  },
  {
    id: "blind-box-reveal",
    name: "Blind-box Reveal",
    shortName: "Reveal",
    use: "Drop announcement",
    sample: "Moon",
    poster: "/demos/moon-float.webp",
    mp4: "/demos/moon-box-reveal.mp4",
    webm: "/demos/moon-box-reveal.webm",
    actual: "Archived sample · 16:9 · 6 sec",
    target: "Target output · 9:16 · 5 sec",
    accent: "#7A66FF",
  },
  {
    id: "social-flash",
    name: "Social Flash",
    shortName: "Flash",
    use: "Reels and Shorts",
    sample: "Beatbot",
    poster: "/demos/beatbot-still.webp",
    mp4: "/demos/beatbot-viral-hook.mp4",
    webm: "/demos/beatbot-viral-hook.webm",
    actual: "Archived sample · 9:16 · 6 sec",
    target: "Target output · 9:16 · 5 sec",
    accent: "#2876FF",
  },
] as const;

export function PublicLaunchPackSample({
  surface,
}: {
  surface: "home" | "create";
}) {
  const [activeId, setActiveId] = useState<(typeof FORMATS)[number]["id"]>(
    "listing-spin"
  );
  const active =
    FORMATS.find((format) => format.id === activeId) || FORMATS[0];
  const isHome = surface === "home";

  return (
    <section
      id={isHome ? "home-create" : "sample-create"}
      data-home-hero={isHome ? "launch-result-browser" : undefined}
      data-home-upgrade={isHome ? "launch-pack" : undefined}
      data-public-pack-preview={isHome ? undefined : "instant-archived-samples"}
      className={
        isHome
          ? "bg-[#F2EDE3] px-3 pb-14 pt-3 text-[#171717] sm:px-6 sm:pb-20 sm:pt-6 lg:px-8"
          : "min-h-[calc(100vh-3rem)] bg-[#F2EDE3] px-3 pb-24 pt-3 text-[#171717] sm:px-6 sm:pt-6 lg:min-h-[calc(100vh-4rem)] lg:px-8"
      }
      aria-labelledby={`${surface}-launch-title`}
    >
      <div className="mx-auto max-w-[1440px]">
        {!isHome ? (
          <div className="mb-3 flex items-center justify-between gap-3 px-1 sm:mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.19em] text-[#67635B]">
              Public sample studio
            </p>
            <p className="text-[10px] font-bold text-[#67635B]">
              No sign-in · no upload
            </p>
          </div>
        ) : null}

        <div className="flex flex-col overflow-hidden rounded-[24px] bg-[#101012] text-[#FAF7F0] shadow-[0_30px_80px_-50px_rgba(0,0,0,0.85)] sm:rounded-[32px] lg:grid lg:min-h-[690px] lg:grid-cols-[0.72fr_1.28fr]">
          <div className="order-2 flex flex-col justify-between px-5 pb-6 pt-6 sm:px-8 sm:pb-8 lg:order-1 lg:px-10 lg:py-12 xl:px-14 xl:py-14">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.21em] text-[#C9FF45] sm:text-[11px]">
                {isHome ? "Toy launch engine" : "Pick a format"}
              </p>
              <h1
                id={`${surface}-launch-title`}
                className="mt-3 max-w-[620px] font-display text-[clamp(2.35rem,5.2vw,5.1rem)] font-black leading-[0.9] tracking-[-0.065em] lg:mt-5"
              >
                {isHome
                  ? "Three video formats for your next toy launch."
                  : "Preview all three launch formats."}
              </h1>
              <p className="mt-4 max-w-[560px] text-[13px] font-semibold leading-5 text-white/58 sm:text-[15px] sm:leading-6">
                Explore three separate Pikbo Lab prototypes for listing spin,
                blind-box reveal, and social hook—without prompt or model setup.
              </p>

              <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:mt-8 lg:grid-cols-1 xl:grid-cols-3" role="group" aria-label="Launch video format">
                {FORMATS.map((format) => {
                  const selected = format.id === active.id;
                  return (
                    <button
                      key={format.id}
                      type="button"
                      onClick={() => setActiveId(format.id)}
                      aria-pressed={selected}
                      data-home-format-preview={format.id}
                      className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 text-left transition sm:min-h-14 lg:px-3 xl:px-3 ${
                        selected
                          ? "border-white bg-white text-[#111113]"
                          : "border-white/14 bg-white/[0.035] text-white hover:border-white/35 hover:bg-white/[0.07]"
                      }`}
                    >
                      <span>
                        <span className="block text-[11px] font-black sm:text-xs">
                          {format.shortName}
                        </span>
                        <span
                          className={`mt-0.5 block text-[8px] font-bold uppercase tracking-[0.11em] ${
                            selected ? "text-black/45" : "text-white/38"
                          }`}
                        >
                          {format.sample} sample
                        </span>
                      </span>
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: format.accent }}
                        aria-hidden
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                <Link
                  href={
                    isHome
                      ? "/create?mode=seller-pack&preview=1&source=home-result-browser"
                      : "/contact?source=sample-launch-pack"
                  }
                  className="inline-flex min-h-14 items-center justify-between gap-4 rounded-full bg-[#C9FF45] px-6 text-sm font-black text-[#0A1700] transition hover:bg-[#DCFF81] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#101012]"
                >
                  {isHome ? "Try a sample Pack" : "Request seller beta"}
                  <span aria-hidden>↗</span>
                </Link>
                <Link
                  href={
                    isHome
                      ? "/contact?source=home-seller-beta"
                      : "/login?next=%2Fcreate%3Fmode%3Dseller-pack"
                  }
                  className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/18 px-6 text-sm font-black text-white transition hover:border-white/45 hover:bg-white/[0.06]"
                >
                  {isHome ? "Request seller beta" : "Private studio sign in"}
                </Link>
              </div>
              <p className="mt-3 text-[10px] font-bold leading-4 text-white/40">
                Uses Pikbo-owned samples. No product upload in this public
                preview.
              </p>
            </div>
          </div>

          <div className="order-1 bg-[#050507] p-2 sm:p-3 lg:order-2 lg:p-4">
            <div className="relative h-[224px] overflow-hidden rounded-[18px] bg-black sm:h-[420px] sm:rounded-[24px] lg:h-full lg:min-h-[658px]">
              <Image
                key={`${active.id}-backdrop`}
                src={active.poster}
                alt=""
                fill
                priority
                sizes="(max-width: 1023px) 100vw, 68vw"
                className="scale-110 object-cover opacity-30 blur-2xl"
                aria-hidden
              />
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,0,0,0.12),rgba(0,0,0,0.52))]" aria-hidden />
              <AutoPlayVideo
                key={active.id}
                poster={active.poster}
                mp4={active.mp4}
                webm={active.webm}
                eager
                showControls
                label={`${active.name}, archived Pikbo Lab format prototype using the ${active.sample} sample toy`}
                className="absolute inset-0 h-full w-full object-contain"
              />

              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 sm:p-5">
                <span className="rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/75 backdrop-blur sm:text-[9px]">
                  Pikbo Lab archive
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.12em] text-black sm:text-[9px]">
                  {active.sample} sample
                </span>
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/50 to-transparent p-4 pt-20 sm:p-6 sm:pt-28">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/48">
                  {active.use}
                </p>
                <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
                  <h2 className="font-display text-2xl font-black tracking-[-0.04em] sm:text-4xl">
                    {active.name}
                  </h2>
                  <p className="text-[9px] font-bold text-white/52 sm:text-[10px]">
                    {active.actual}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-col justify-between gap-2 px-2 text-[10px] font-bold leading-4 text-[#69645C] sm:flex-row sm:items-center">
          <p>{active.target}</p>
          <p>
            Three separate archived format prototypes—not one completed
            customer Pack.
          </p>
        </div>

        {isHome ? (
          <div className="mt-10 border-t border-black/15 pt-6 sm:mt-14 sm:pt-8">
            <p className="text-[10px] font-black uppercase tracking-[0.19em] text-[#6A655E]">
              Built for every shelf personality
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Art vinyl", "Blind box", "Mecha", "Weird art toy"].map(
                (style) => (
                  <span
                    key={style}
                    className="rounded-full border border-black/15 bg-white/60 px-4 py-2 text-xs font-black"
                  >
                    {style}
                  </span>
                )
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
