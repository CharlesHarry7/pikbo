"use client";

import { createRemixHref } from "@/lib/remixIntent";
import { createGenerate360Href } from "@/lib/jobIntents";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";
import Link from "next/link";
import { useState } from "react";
import type { DemoVideo } from "@/lib/demoVideos";
import {
  hasFeedVideo,
  type FeedItem,
  type FeedVideoItem,
} from "@/lib/videoFeed";
import { getPreset } from "@/lib/presets";
import {
  showcaseProjectAsDemo,
  showcaseProjectHref,
  showcaseRecipeHref,
  type ShowcaseProject,
} from "@/lib/showcaseProjects";
import { track } from "@/lib/analytics";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { SuiteEntryStrip } from "@/components/SuiteEntryStrip";
import { HomeViralPresetRail } from "@/components/HomeViralPresetRail";
import { HomeViralWall } from "@/components/HomeViralWall";
import { HfProductRail } from "@/components/HfProductRail";
import { SeedanceCampaign } from "@/components/SeedanceCampaign";
import { SoftLaunchStrip } from "@/components/SoftLaunchStrip";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { useI18n } from "@/components/LanguageProvider";
import { site } from "@/lib/site";

/** Primary Generate door for Explore remount — listing 360 workbench. */
const HF_EXPLORE_360_HREF = createGenerate360Href("hf-explore");
/** Honest Moment door — mode=moment + source (never bare street-power-up). */
const HF_EXPLORE_MOMENT_HREF =
  `${MOMENT_CREATE_HREF}&source=hf-explore` as const;

function Clip({
  demo,
  className,
  eager}: {
  demo: DemoVideo;
  className?: string;
  eager?: boolean;
}) {
  // Reuse wall policy: posters first; sources only when playing (LCP / 养站)
  return (
    <AutoPlayVideo
      poster={demo.poster}
      webm={demo.webm}
      mp4={demo.mp4}
      className={className}
      eager={eager}
      desktopPlayMode={eager ? "viewport" : "interaction"}
      lazySources={!eager}
      focusable={false}
      label={demo.title}
    />
  );
}

/**
 * HF Explore home — pixel-parity structure:
 * product rail → dense viral video wall → inside projects → suite doors.
 * Video is the product; stills are not the homepage hero job.
 */
export function HfExploreHome({
  demos,
  projects,
  feed,
  viralWall,
  /** 哥飞: tool already on page — skip strip + demote hero H1 */
  toolFirstLayout = false}: {
  demos: DemoVideo[];
  projects: ShowcaseProject[];
  feed: FeedItem[];
  /** Dense HF-style viral presets grid (owned Lab media only) */
  viralWall?: FeedItem[];
  toolFirstLayout?: boolean;
}) {
  const { t } = useI18n();
  const proofFeed = feed.filter(hasFeedVideo);
  const showcase: FeedVideoItem[] = proofFeed.length
    ? proofFeed
    : demos.slice(0, 8).map((d) => ({
        id: d.id,
        title: d.title,
        subtitle: d.character,
        href: createRemixHref(d.preset, d.id),
        projectHref: `/projects/${d.id}`,
        detailHref: `/effects/${d.preset}`,
        badge: "PIKBO Lab · cached prototype",
        ratio: d.ratio as FeedItem["ratio"],
        demo: d,
        kind: "demo" as const,
        recipeSlug: d.preset}));

  const wallItems = viralWall?.filter(hasFeedVideo).length
    ? viralWall.filter(hasFeedVideo)
    : showcase;

  const [active, setActive] = useState(0);
  const item = showcase[active] ?? showcase[0];
  const preset = item?.recipeSlug ? getPreset(item.recipeSlug) : undefined;

  if (!item) {
    return (
      <div className="min-h-screen bg-black px-4 py-20 text-center text-white">
        <p className="text-white/50">No cached Lab prototypes yet.</p>
        <Link
          href={HF_EXPLORE_360_HREF}
          className="mt-4 inline-block text-[#c8ff3d]"
          data-hf-empty-generate="remix"
        >
          Generate 360° →
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`bg-black text-white sm:pb-16 ${
        toolFirstLayout ? "pb-8" : "min-h-screen pb-28"
      }`}
    >
      {!toolFirstLayout ? <SoftLaunchStrip /> : null}

      {/* HF product entry rail — secondary when tool already on page */}
      <HfProductRail />

      {/* HF Viral Presets wall */}
      <HomeViralWall items={wallItems} />

      <SeedanceCampaign />

      {/* Premiere strip — H1 only when tool-first layout did not already emit H1 */}
      <section className="relative min-h-[min(320px,45svh)] overflow-hidden border-b border-white/10 sm:min-h-[min(420px,55svh)]">
        <div className="absolute inset-0">
          <Clip
            key={item.id}
            demo={item.demo}
            eager
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30" />
        </div>

        <div className="relative mx-auto flex min-h-[min(420px,50svh)] max-w-6xl flex-col justify-end px-4 pb-8 pt-12 sm:min-h-[min(520px,55svh)] sm:px-6 sm:pb-12 sm:pt-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
            {t("home.feelFirst")}
          </p>
          <span className="mt-3 inline-flex w-fit items-center rounded-full border border-[#c8ff3d]/30 bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#c8ff3d] shadow-[0_0_24px_rgba(200,255,61,0.15)] backdrop-blur">
            {item.badge ?? "PIKBO Lab · cached prototype"}
          </span>
          {toolFirstLayout ? (
            <p className="font-display mt-3 max-w-xl text-2xl font-black uppercase leading-[1.02] tracking-tight text-white/90 sm:text-4xl">
              {item.title}
            </p>
          ) : (
            <h1 className="font-display mt-3 max-w-xl text-3xl font-black uppercase leading-[1.02] tracking-tight sm:text-5xl md:text-6xl">
              {site.homeH1}
            </h1>
          )}
          {!toolFirstLayout ? (
            <p className="mt-2 max-w-md text-base font-semibold text-white/80 sm:text-lg">
              {item.title}
            </p>
          ) : null}
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/65 sm:text-[15px]">
            {t("home.hero.sub")}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={HF_EXPLORE_360_HREF}
              data-hf-explore-primary-generate="360"
              className="inline-flex items-center justify-center rounded-full bg-[#c8ff3d] px-7 py-3.5 text-sm font-black text-black shadow-[0_0_48px_-6px_rgba(200,255,61,0.55)]"
            >
              Generate 360° listing spin
            </Link>
            <Link
              href={item.href}
              onClick={() =>
                track({
                  event: "recipe_use",
                  path: "/",
                  recipe: item.recipeSlug})
              }
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-black/50 px-5 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:border-[#c8ff3d]/50 hover:bg-black/60"
            >
              {t("home.useRecipe")}
            </Link>
            <Link
              href="/tools/ai-toy-video-generator"
              className="text-sm font-semibold text-white/55 underline-offset-4 hover:text-white hover:underline"
            >
              Keyword tool page
            </Link>
            <Link
              href="/for/photo-to-video-for-toys"
              className="text-sm font-semibold text-white/45 underline-offset-4 hover:text-white/80 hover:underline"
            >
              Photo → video use case
            </Link>
          </div>
          <p className="mt-3 text-[11px] text-white/45">
            Designer-toy suite · cached Lab prototypes · Live access gated
          </p>

          {/* Progress rail */}
          <div className="mt-8 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {showcase.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(i)}
                className={`relative h-14 w-10 shrink-0 overflow-hidden rounded-lg ring-2 transition sm:h-16 sm:w-12 ${
                  i === active
                    ? "ring-[#c8ff3d]"
                    : "ring-white/10 opacity-70 hover:opacity-100"
                }`}
                aria-label={`Show ${s.title}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.demo.poster}
                  alt=""
                  width={80}
                  height={112}
                  className="h-full w-full object-cover"
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={i === 0 ? "high" : "low"}
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Suite doors — Generate + Modules + Seller Pack */}
      <SuiteEntryStrip />

      {/* HF Viral Presets pattern — toy-native Lab rail */}
      <HomeViralPresetRail />

      {/* ── Screen 2: Before → after ── */}
      <section className="border-b border-white/10 bg-gradient-to-b from-black via-[#08080c] to-black px-3 py-12 sm:px-5">
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c8ff3d]/90">
            {t("home.proof")}
          </p>
          <h2 className="font-display mt-1 text-xl font-bold uppercase tracking-tight sm:text-3xl">
            {t("home.beforeAfter")}
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/50">
            Reference poster beside a cached Lab prototype. The repository does
            not prove that the poster was the provider input.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="overflow-hidden rounded-2xl bg-neutral-950 ring-1 ring-white/10 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.9)]">
              <div className="relative aspect-[4/5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.demo.poster}
                  alt={`Input still for ${item.title}`}
                  width={720}
                  height={900}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/70 backdrop-blur">
                  Reference
                </span>
              </div>
              <p className="p-3.5 text-xs font-bold uppercase tracking-wide text-white/55">
                Reference poster · not verified input
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl bg-neutral-950 ring-1 ring-[#c8ff3d]/25 shadow-[0_24px_60px_-24px_rgba(200,255,61,0.2)]">
              <div className="relative aspect-[4/5]">
                <Clip
                  demo={item.demo}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="absolute left-3 top-3 rounded-full bg-[#c8ff3d] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-black shadow-[0_0_16px_rgba(200,255,61,0.4)]">
                  Preview
                </span>
              </div>
              <p className="p-3.5 text-xs font-bold uppercase tracking-wide text-[#c8ff3d]">
                Cached prototype · evidence pending
              </p>
            </div>
          </div>
          <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[12px] text-white/55">
            <div>
              <dt className="inline text-white/35">Recipe · </dt>
              <dd className="inline font-semibold text-white/85">
                {item.title}
              </dd>
            </div>
            {preset && (
              <>
                <div>
                  <dt className="inline text-white/35">Duration · </dt>
                  <dd className="inline">{preset.duration}s</dd>
                </div>
                <div>
                  <dt className="inline text-white/35">Aspect · </dt>
                  <dd className="inline">{preset.aspectRatio}</dd>
                </div>
              </>
            )}
            <div>
              <dt className="inline text-white/35">Mode · </dt>
              <dd className="inline">Cached Lab · not live</dd>
            </div>
            <div>
              <dt className="inline text-white/35">Evidence · </dt>
              <dd className="inline">Provider task ID and formal QA pending</dd>
            </div>
          </dl>
          <div className="mt-7 flex flex-wrap gap-2">
            <Link
              href={item.href}
              className="inline-flex rounded-full bg-[#c8ff3d] px-7 py-3.5 text-sm font-black text-black shadow-[0_0_40px_-8px_rgba(200,255,61,0.5)] transition hover:-translate-y-0.5"
            >
              {t("home.replaceMine")}
            </Link>
            <Link
              href={item.projectHref || item.detailHref || "/explore"}
              className="inline-flex rounded-full border border-white/20 bg-black/40 px-5 py-3.5 text-sm font-bold text-white/85 backdrop-blur transition hover:border-[#c8ff3d]/45"
            >
              {t("home.insideProject")}
            </Link>
            <Link
              href={HF_EXPLORE_MOMENT_HREF}
              className="inline-flex rounded-full border border-white/15 px-5 py-3.5 text-sm font-bold text-white/70 transition hover:border-white/30 hover:text-white"
            >
              {t("cta.sellerPack")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Screen 3: traceable projects ── */}
      <section className="px-3 py-10 sm:px-5">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-bold uppercase tracking-tight sm:text-2xl">
                Explore inside every project
              </h2>
              <p className="mt-1 text-sm text-white/45">
                Open the input, output, recipe, model record, and review state
                before using it with your own toy.
              </p>
            </div>
            <Link
              href="/explore"
              className="text-[12px] font-semibold text-[#c8ff3d] hover:underline"
            >
              All projects →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:gap-3">
            {projects.slice(0, 8).map((project, i) => (
              <div
                key={project.slug}
                className="group relative overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-white/10 shadow-[0_12px_32px_-18px_rgba(0,0,0,0.85)] transition duration-300 hover:-translate-y-1 hover:ring-[#c8ff3d]/45 hover:shadow-[0_20px_40px_-20px_rgba(200,255,61,0.12)]"
              >
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => setActive(i)}
                >
                  <div className="relative aspect-[3/4] sm:aspect-[9/14]">
                    <Clip
                      demo={showcaseProjectAsDemo(project)}
                      eager={i < 2}
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute left-2 top-2 flex max-w-[92%] flex-wrap gap-1">
                      <span className="rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#c8ff3d] ring-1 ring-white/10">
                        PIKBO Lab · cached prototype
                      </span>
                    </div>
                    <p className="absolute inset-x-0 bottom-12 p-2 text-[11px] font-bold uppercase leading-tight tracking-wide sm:text-xs">
                      {project.title}
                    </p>
                  </div>
                </button>
                <div className="absolute inset-x-0 bottom-0 flex gap-1 p-2">
                  <Link
                    href={showcaseRecipeHref(project)}
                    className="flex-1 rounded-full bg-[#c8ff3d] py-1.5 text-center text-[10px] font-black text-black shadow-[0_0_16px_rgba(200,255,61,0.25)] transition hover:brightness-110"
                  >
                    {t("home.remake")}
                  </Link>
                  <Link
                    href={showcaseProjectHref(project)}
                    className="rounded-full border border-white/20 bg-black/55 px-2.5 py-1.5 text-[10px] font-bold text-white backdrop-blur-sm transition hover:border-[#c8ff3d]/40"
                  >
                    {t("home.insideProject")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HF Flow–class creation matrix strip */}
      <section className="border-b border-white/10 px-3 py-8 sm:px-5">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#c8ff3d]">
                Creation flow
              </p>
              <h2 className="font-display text-xl font-bold uppercase tracking-tight sm:text-2xl">
                Every way to make a clip
              </h2>
            </div>
            <Link
              href={HF_EXPLORE_360_HREF}
              className="text-[12px] font-semibold text-[#c8ff3d] hover:underline"
              data-hf-flow-generate="remix"
            >
              Generate 360° →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 transition hover:border-[#c8ff3d]/40 hover:bg-[#c8ff3d]/5">
              <FreeTrialCta
                path="/#jobs"
                labelTry="Try free video"
                labelDemo="Lab sample"
                hideClipsChip
                className="text-sm font-bold text-white hover:text-[#c8ff3d]"
              />
              <p className="text-[11px] text-white/40">Mini 5s · Sample ready</p>
            </div>
            {[
              {
                href: HF_EXPLORE_MOMENT_HREF,
                label: "Street Power-Up Moment",
                sub: "one directed clip"},
              { href: "/modules", label: "Modules", sub: "Video jobs" },
              { href: "/effects", label: "Video presets", sub: "Viral recipes" },
              { href: "/library", label: "Library", sub: "This device" },
              { href: "/flow", label: "Flow · Preview", sub: "Media wall" },
              { href: "/models", label: "Engines · Preview", sub: "Access gated" },
            ].map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 transition hover:border-[#c8ff3d]/40 hover:bg-[#c8ff3d]/5"
              >
                <p className="text-sm font-bold text-white">{c.label}</p>
                <p className="text-[11px] text-white/40">{c.sub}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Public path: one directed Moment at a time. */}
      <section className="px-3 pb-6 sm:px-5">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[#c8ff3d]">
              One toy Moment — one directed result
            </p>
            <h3 className="mt-1 font-display text-lg font-bold uppercase tracking-tight sm:text-xl">
              One photo → one directed clip
            </h3>
            <p className="mt-1 max-w-md text-[12px] text-white/50">
              Choose one preset for a listing, drop, or social post. Own photos
              only. Lab is free to watch; private live access is gated.
            </p>
          </div>
          <Link
            href={HF_EXPLORE_MOMENT_HREF}
            className="inline-flex shrink-0 items-center rounded-full border border-[#c8ff3d]/40 px-5 py-2.5 text-sm font-bold text-[#c8ff3d] transition hover:bg-[#c8ff3d]/10"
          >
            Create one Moment →
          </Link>
        </div>
      </section>

      <section className="px-3 pb-10 text-center sm:px-5">
        <p className="mb-3 text-[12px] text-white/40">
          Watch a toy recipe. Replace with your figure. Generate a sellable
          clip.
        </p>
        <Link
          href={item.href}
          className="inline-flex items-center justify-center rounded-full bg-[#c8ff3d] px-8 py-3 text-sm font-black text-black"
        >
          Remix the premiere recipe
        </Link>
      </section>
    </div>
  );
}
