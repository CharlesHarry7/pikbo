"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type KeyboardEvent } from "react";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";

const FORMATS = [
  {
    id: "listing-spin",
    archive: "001",
    name: "Listing Spin",
    shortName: "Spin",
    use: "Product page motion",
    sample: "Scout",
    poster: "/demos/scout-still.webp",
    mp4: "/demos/scout-packshot-spin.mp4",
    webm: "/demos/scout-packshot-spin.webm",
    evidence: "Verified motion sample",
    actual: "Archive media · 16:9 · 6 sec",
    target: "Target format · 1:1 · 5 sec",
    accent: "#D84A35",
  },
  {
    id: "blind-box-reveal",
    archive: "002",
    name: "Blind-box Reveal",
    shortName: "Reveal",
    use: "Collector reveal direction",
    sample: "Moon",
    poster: "/demos/moon-float.webp",
    mp4: "/demos/moon-box-reveal.mp4",
    webm: "/demos/moon-box-reveal.webm",
    evidence: "Archived format study",
    actual: "Archive media · 16:9 · 6 sec",
    target: "Target format · 9:16 · 5 sec",
    accent: "#7A66FF",
  },
  {
    id: "social-flash",
    archive: "003",
    name: "Social Flash",
    shortName: "Flash",
    use: "Drop announcement motion",
    sample: "Beatbot",
    poster: "/demos/beatbot-still.webp",
    mp4: "/demos/beatbot-viral-hook.mp4",
    webm: "/demos/beatbot-viral-hook.webm",
    evidence: "Archived format study",
    actual: "Archive media · 9:16 · 6 sec",
    target: "Target format · 9:16 · 5 sec",
    accent: "#2876FF",
  },
] as const;

const PRIVATE_BETA_MAILTO =
  "mailto:support@pikbo.ai?subject=Pikbo%20private%20beta%20request&body=I%20sell%20designer%20toys%20and%20would%20like%20to%20request%20private%20beta%20access.";

type Format = (typeof FORMATS)[number];

export function PublicLaunchPackSample({
  surface,
}: {
  surface: "home" | "create";
}) {
  const [activeId, setActiveId] = useState<Format["id"]>("listing-spin");
  const active = FORMATS.find((format) => format.id === activeId) || FORMATS[0];

  if (surface === "home") {
    return (
      <HomeDropArchive
        active={active}
        onSelect={(format) => setActiveId(format.id)}
      />
    );
  }

  return (
    <CreateSampleBrowser
      active={active}
      onSelect={(format) => setActiveId(format.id)}
    />
  );
}

function HomeDropArchive({
  active,
  onSelect,
}: {
  active: Format;
  onSelect: (format: Format) => void;
}) {
  function moveSelection(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const current = FORMATS.findIndex((format) => format.id === active.id);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = (current + direction + FORMATS.length) % FORMATS.length;
    const nextFormat = FORMATS[next];
    onSelect(nextFormat);
    event.currentTarget
      .querySelector<HTMLButtonElement>(
        `[data-home-format-preview="${nextFormat.id}"]`
      )
      ?.focus();
  }

  return (
    <section
      id="home-create"
      data-home-hero="drop-archive"
      data-home-upgrade="launch-pack"
      className="overflow-hidden bg-[#F2EDE3] px-3 pb-12 pt-3 text-[#171717] sm:px-6 sm:pb-16 sm:pt-6 lg:min-h-[calc(100vh-4rem)] lg:bg-[#111111] lg:px-8 lg:pb-8 lg:pt-7 lg:text-[#F5F1E8]"
      aria-label="Pikbo toy launch archive"
    >
      <div className="mx-auto max-w-[1360px]">
        <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_390px] lg:items-end lg:gap-16">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D84A35] sm:text-[11px]">
              Pikbo motion archive / study {active.archive}
            </p>
            <h1
              id="home-launch-title"
              className="mt-3 max-w-[840px] font-display text-[clamp(2.8rem,5vw,4.6rem)] font-black leading-[0.9] tracking-[-0.06em] lg:mt-4"
            >
              See how toys become launches.
            </h1>
          </div>

          <div className="mt-5 lg:mt-0 lg:pb-1">
            <p className="max-w-[390px] text-sm font-semibold leading-6 text-[#686159] lg:text-[15px] lg:text-[#A39C91]">
              Pikbo creates product motion, collector reveals, and social drops
              from your own toy.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Link
                href="/create?mode=seller-pack&preview=1&source=home-drop-archive"
                className="inline-flex min-h-12 items-center justify-between gap-6 rounded-[10px] bg-[#D84A35] px-5 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-[#E25A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F1E8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
              >
                Preview Launch Pack <span aria-hidden>↗</span>
              </Link>
              <a
                href="#archive-selector"
                className="text-xs font-black text-[#171717] underline decoration-[#D84A35]/50 underline-offset-4 hover:decoration-[#D84A35] lg:text-[#F5F1E8]"
              >
                Explore archive ↓
              </a>
            </div>
          </div>
        </div>

        <div className="relative flex flex-col overflow-hidden rounded-[24px] bg-[#101012] text-[#FAF7F0] shadow-[0_30px_80px_-50px_rgba(0,0,0,0.85)] sm:rounded-[32px] lg:mt-8 lg:block lg:h-[455px] lg:rounded-[18px] lg:border lg:border-white/12 lg:bg-[#181818] lg:shadow-[0_38px_100px_rgba(0,0,0,0.34)]">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.10) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
            aria-hidden
          />

          <div className="relative order-1 grid h-[224px] bg-[#050507] p-2 sm:h-[420px] sm:p-3 lg:h-full lg:grid-cols-[190px_minmax(0,1fr)_220px] lg:bg-transparent lg:p-0">
            <aside className="hidden border-r border-white/10 p-6 lg:flex lg:flex-col lg:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#D84A35]">
                  Archive
                </p>
                <p className="mt-2 font-display text-[72px] font-black leading-none tracking-[-0.08em] text-[#F5F1E8]">
                  {active.archive}
                </p>
              </div>
              <dl className="space-y-4 text-[9px] font-bold uppercase tracking-[0.14em] text-[#A39C91]">
                <div>
                  <dt className="text-white/32">Object</dt>
                  <dd className="mt-1 text-[#F5F1E8]">{active.sample}</dd>
                </div>
                <div>
                  <dt className="text-white/32">Study</dt>
                  <dd className="mt-1 text-[#F5F1E8]">{active.name}</dd>
                </div>
                <div>
                  <dt className="text-white/32">Use</dt>
                  <dd className="mt-1 leading-4 text-[#F5F1E8]">{active.use}</dd>
                </div>
              </dl>
            </aside>

            <div className="relative h-full overflow-hidden rounded-[18px] bg-black sm:rounded-[24px] lg:rounded-none">
              <Image
                key={`${active.id}-archive-backdrop`}
                src={active.poster}
                alt=""
                fill
                priority
                sizes="(max-width: 1023px) 100vw, 68vw"
                className="scale-110 object-cover opacity-25 blur-3xl"
                aria-hidden
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,rgba(0,0,0,0.5)_100%)]" aria-hidden />
              <AutoPlayVideo
                key={active.id}
                poster={active.poster}
                mp4={active.mp4}
                webm={active.webm}
                eager
                showControls
                label={`${active.name}, ${active.evidence.toLowerCase()} using the ${active.sample} archive toy`}
                className="absolute inset-0 h-full w-full object-contain"
              />

              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4 lg:p-5">
                <span className="rounded-[8px] border border-white/16 bg-black/58 px-3 py-2 text-[8px] font-black uppercase tracking-[0.18em] text-white/75 backdrop-blur">
                  <span className="lg:hidden">Pikbo Lab archive</span>
                  <span className="hidden lg:inline">Archive motion sample</span>
                </span>
                <span className="border-l-2 border-[#D84A35] bg-black/58 px-3 py-2 text-[8px] font-black uppercase tracking-[0.16em] text-white/78 backdrop-blur">
                  <span className="lg:hidden">{active.sample} sample</span>
                  <span className="hidden lg:inline">{active.evidence}</span>
                </span>
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/45 to-transparent p-5 pt-20 lg:p-7 lg:pt-28">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#D84A35]">
                  {active.sample} / motion study
                </p>
                <h2 className="mt-1 font-display text-3xl font-black tracking-[-0.05em] text-[#F5F1E8] lg:text-[42px]">
                  {active.name}
                </h2>
                <p className="mt-1 text-[9px] font-bold text-white/52 lg:hidden">
                  {active.actual}
                </p>
              </div>
            </div>

            <aside className="hidden border-l border-white/10 p-6 lg:flex lg:flex-col lg:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/34">
                  Format record
                </p>
                <p className="mt-4 text-sm font-black leading-5 text-[#F5F1E8]">
                  {active.use}
                </p>
                <p className="mt-3 text-[10px] font-semibold leading-4 text-[#A39C91]">
                  {active.actual}
                </p>
                <p className="mt-1 text-[10px] font-semibold leading-4 text-[#A39C91]">
                  {active.target}
                </p>
              </div>
              <div className="border-t border-white/10 pt-5">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#D84A35]">
                  Seller outcome
                </p>
                <p className="mt-3 text-xs font-semibold leading-5 text-[#C5BEB3]">
                  A directed launch asset with a defined job—not an open-ended
                  prompt demo.
                </p>
              </div>
            </aside>
          </div>

          <div className="order-2 px-5 pb-6 pt-6 sm:px-8 sm:pb-8 lg:hidden">
            <p className="text-[10px] font-black uppercase tracking-[0.21em] text-[#C9FF45] sm:text-[11px]">
              Toy launch engine
            </p>
            <div
              id="home-mobile-launch-title"
              role="heading"
              aria-level={1}
              className="mt-3 max-w-[620px] font-display text-[clamp(2.35rem,5.2vw,5.1rem)] font-black leading-[0.9] tracking-[-0.065em]"
            >
              Three video formats for your next toy launch.
            </div>
            <p className="mt-4 max-w-[560px] text-[13px] font-semibold leading-5 text-white/58 sm:text-[15px] sm:leading-6">
              Explore three separate Pikbo Lab prototypes for listing spin,
              blind-box reveal, and social hook—without prompt or model setup.
            </p>

            <div className="mt-5 grid gap-2 sm:grid-cols-3" role="group" aria-label="Launch video format">
              {FORMATS.map((format) => {
                const selected = format.id === active.id;
                return (
                  <button
                    key={format.id}
                    type="button"
                    onClick={() => onSelect(format)}
                    aria-pressed={selected}
                    data-mobile-format-preview={format.id}
                    className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 text-left transition sm:min-h-14 lg:px-3 xl:px-3 ${
                      selected
                        ? "border-white bg-white text-[#111113]"
                        : "border-white/14 bg-white/[0.035] text-white"
                    }`}
                  >
                    <span>
                      <span className="block text-[11px] font-black sm:text-xs">
                        {format.shortName}
                      </span>
                      <span className={`mt-0.5 block text-[8px] font-bold uppercase tracking-[0.11em] ${selected ? "text-black/45" : "text-white/38"}`}>
                        {format.sample} sample
                      </span>
                    </span>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: format.accent }} aria-hidden />
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/create?mode=seller-pack&preview=1&source=home-result-browser"
                className="inline-flex min-h-14 items-center justify-between gap-4 rounded-full bg-[#C9FF45] px-6 text-sm font-black text-[#0A1700]"
              >
                Try a sample Pack <span aria-hidden>↗</span>
              </Link>
              <Link
                href={PRIVATE_BETA_MAILTO}
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/18 px-6 text-sm font-black text-white"
                aria-label="Email Pikbo to request seller beta access"
              >
                Request seller beta
              </Link>
            </div>
            <p className="mt-3 text-[10px] font-bold leading-4 text-white/40">
              Uses Pikbo-owned samples. No product upload in this public preview.
            </p>
          </div>
        </div>

        <div
          id="archive-selector"
          role="group"
          aria-label="Designer toy motion archive"
          onKeyDown={moveSelection}
          className="mt-3 hidden gap-3 lg:grid lg:grid-cols-3"
        >
          {FORMATS.map((format) => {
            const selected = format.id === active.id;
            return (
              <button
                key={format.id}
                type="button"
                onClick={() => onSelect(format)}
                aria-pressed={selected}
                data-home-format-preview={format.id}
                className={`group grid min-h-[104px] grid-cols-[76px_1fr_auto] items-center gap-4 rounded-[14px] border p-3 text-left transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84A35] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111] lg:min-h-[116px] ${
                  selected
                    ? "border-[#D84A35] bg-[#F5F1E8] text-[#111111]"
                    : "border-black/12 bg-white/55 text-[#171717] hover:-translate-y-1 hover:border-black/30 lg:border-white/12 lg:bg-[#181818] lg:text-[#F5F1E8] lg:hover:border-white/28"
                }`}
              >
                <span className="relative h-[76px] overflow-hidden rounded-[10px] bg-black">
                  <Image
                    src={format.poster}
                    alt={`${format.sample} archive poster`}
                    fill
                    sizes="76px"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </span>
                <span className="min-w-0">
                  <span className="block text-[8px] font-black uppercase tracking-[0.18em] text-[#D84A35]">
                    Archive {format.archive}
                  </span>
                  <span className="mt-1 block font-display text-lg font-black tracking-[-0.035em]">
                    {format.sample}
                  </span>
                  <span
                    className={`mt-1 block truncate text-[9px] font-bold uppercase tracking-[0.1em] ${
                      selected ? "text-black/48" : "text-black/45 lg:text-white/38"
                    }`}
                  >
                    {format.name}
                  </span>
                </span>
                <span
                  className={`h-full w-1 rounded-full ${
                    selected ? "bg-[#D84A35]" : "bg-black/10 lg:bg-white/10"
                  }`}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-col justify-between gap-2 px-2 text-[10px] font-bold leading-4 text-[#69645C] sm:flex-row sm:items-center lg:mt-4 lg:border-t lg:border-white/10 lg:px-0 lg:pt-4 lg:text-[9px] lg:uppercase lg:tracking-[0.12em] lg:text-[#A39C91]">
          <p>
            <span className="lg:hidden">{active.target}</span>
            <span className="hidden lg:inline">Product target · one toy · three launch formats</span>
          </p>
          <p className="hidden lg:block lg:normal-case lg:tracking-normal">
            Archive shown · three different Pikbo-owned prototypes · no product upload on this public page.
          </p>
        </div>

        <p className="mt-2 px-2 text-[10px] font-bold leading-4 text-[#69645C] lg:px-0 lg:text-right lg:text-[9px] lg:text-[#A39C91]">
          Three separate archived format prototypes—not one completed customer Pack.
        </p>

        <div className="mt-10 border-t border-black/15 pt-6 sm:mt-14 sm:pt-8 lg:hidden">
          <p className="text-[10px] font-black uppercase tracking-[0.19em] text-[#6A655E]">
            Built for every shelf personality
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Art vinyl", "Blind box", "Mecha", "Weird art toy"].map((style) => (
              <span key={style} className="rounded-full border border-black/15 bg-white/60 px-4 py-2 text-xs font-black">
                {style}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CreateSampleBrowser({
  active,
  onSelect,
}: {
  active: Format;
  onSelect: (format: Format) => void;
}) {
  return (
    <section
      id="sample-create"
      data-public-pack-preview="instant-archived-samples"
      className="min-h-[calc(100vh-3rem)] bg-[#F2EDE3] px-3 pb-24 pt-3 text-[#171717] sm:px-6 sm:pt-6 lg:min-h-[calc(100vh-4rem)] lg:px-8"
      aria-labelledby="create-launch-title"
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-3 flex items-center justify-between gap-3 px-1 sm:mb-5">
          <p className="text-[10px] font-black uppercase tracking-[0.19em] text-[#67635B]">
            Public sample studio
          </p>
          <p className="text-[10px] font-bold text-[#67635B]">
            No sign-in · no upload
          </p>
        </div>

        <div className="flex flex-col overflow-hidden rounded-[24px] bg-[#101012] text-[#FAF7F0] shadow-[0_30px_80px_-50px_rgba(0,0,0,0.85)] sm:rounded-[32px] lg:grid lg:min-h-[690px] lg:grid-cols-[0.72fr_1.28fr]">
          <div className="order-2 flex flex-col justify-between px-5 pb-6 pt-6 sm:px-8 sm:pb-8 lg:order-1 lg:px-10 lg:py-12 xl:px-14 xl:py-14">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.21em] text-[#C9FF45] sm:text-[11px]">
                Pick a format
              </p>
              <h1
                id="create-launch-title"
                className="mt-3 max-w-[620px] font-display text-[clamp(2.35rem,5.2vw,5.1rem)] font-black leading-[0.9] tracking-[-0.065em] lg:mt-5"
              >
                Preview all three launch formats.
              </h1>
              <p className="mt-4 max-w-[560px] text-[13px] font-semibold leading-5 text-white/58 sm:text-[15px] sm:leading-6">
                Explore three separate Pikbo Lab prototypes for listing spin,
                blind-box reveal, and social hook—without prompt or model setup.
              </p>

              <div
                className="mt-5 grid gap-2 sm:grid-cols-3 lg:mt-8 lg:grid-cols-1 xl:grid-cols-3"
                role="group"
                aria-label="Launch video format"
              >
                {FORMATS.map((format) => {
                  const selected = format.id === active.id;
                  return (
                    <button
                      key={format.id}
                      type="button"
                      onClick={() => onSelect(format)}
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
                  href={PRIVATE_BETA_MAILTO}
                  className="inline-flex min-h-14 items-center justify-between gap-4 rounded-full bg-[#C9FF45] px-6 text-sm font-black text-[#0A1700] transition hover:bg-[#DCFF81] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#101012]"
                  aria-label="Email Pikbo to request seller beta access"
                >
                  Request seller beta <span aria-hidden>↗</span>
                </Link>
                <Link
                  href="/login?next=%2Fcreate%3Fmode%3Dseller-pack"
                  className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/18 px-6 text-sm font-black text-white transition hover:border-white/45 hover:bg-white/[0.06]"
                >
                  Private studio sign in
                </Link>
              </div>
              <p className="mt-3 text-[10px] font-bold leading-4 text-white/40">
                Uses Pikbo-owned samples. No product upload in this public preview.
              </p>
            </div>
          </div>

          <div className="order-1 bg-[#050507] p-2 sm:p-3 lg:order-2 lg:p-4">
            <div className="relative h-[224px] overflow-hidden rounded-[18px] bg-black sm:h-[420px] sm:rounded-[24px] lg:h-full lg:min-h-[658px]">
              <Image
                key={`${active.id}-sample-backdrop`}
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
      </div>
    </section>
  );
}
