"use client";

import Link from "next/link";
import type { FeedItem } from "@/lib/videoFeed";
import {
  showcaseProjectAsDemo,
  showcaseProjectHref,
  showcaseRecipeHref,
  type ShowcaseProject,
} from "@/lib/showcaseProjects";
import { track } from "@/lib/analytics";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { HeroUpload } from "@/components/HeroUpload";
import { HfProductRail } from "@/components/HfProductRail";
import { HomeViralPresetRail } from "@/components/HomeViralPresetRail";
import { HomeViralWall } from "@/components/HomeViralWall";
import { SeedanceCampaign } from "@/components/SeedanceCampaign";
import { SuiteEntryStrip } from "@/components/SuiteEntryStrip";

function ProofVideo({
  project,
  className,
  eager = false,
  interactionOnly = true,
}: {
  project: ShowcaseProject;
  className?: string;
  eager?: boolean;
  interactionOnly?: boolean;
}) {
  const demo = showcaseProjectAsDemo(project);
  return (
    <AutoPlayVideo
      poster={demo.poster}
      webm={demo.webm}
      mp4={demo.mp4}
      className={className}
      eager={eager}
      desktopPlayMode={interactionOnly ? "interaction" : "viewport"}
      lazySources={!eager}
      focusable={false}
      label={`${project.title} official cached example`}
    />
  );
}

function ProofBadge() {
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#c8ff3d]/30 bg-black/70 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#c8ff3d] backdrop-blur">
      <span className="h-1.5 w-1.5 rounded-full bg-[#c8ff3d]" />
      Official example · cached
    </span>
  );
}

/**
 * Home retention order:
 * 1. One proof-backed toy premiere + compact upload composer.
 * 2. The exact source still beside the cached output.
 * 3. At most eight traceable projects with Inside / Use recipe.
 *
 * Product shelves and preview surfaces deliberately start after those screens.
 */
export function HfExploreHome({
  projects,
  viralWall = [],
}: {
  projects: ShowcaseProject[];
  viralWall?: FeedItem[];
}) {
  const premiere =
    projects.find((project) => project.model.includes("Seedance")) ??
    projects[0];

  if (!premiere) {
    return (
      <main className="grid min-h-[70svh] place-items-center bg-black px-4 text-center text-white">
        <div>
          <p className="text-sm text-white/55">No approved Lab proof yet.</p>
          <Link
            href="/create"
            className="mt-4 inline-flex rounded-full bg-[#c8ff3d] px-6 py-3 text-sm font-black text-black"
          >
            Open Generate
          </Link>
        </div>
      </main>
    );
  }

  const proofProjects = projects.slice(0, 8);

  return (
    <main className="overflow-x-clip bg-black text-white">
      {/* Screen 1 — proof and action share the first viewport. */}
      <section
        id="home-tool"
        className="relative isolate h-[calc(100svh-3rem)] overflow-hidden border-b border-white/10 md:grid md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:h-[calc(100svh-3.5rem)]"
      >
        <div className="absolute inset-0 overflow-hidden md:relative md:col-start-2 md:row-start-1 md:h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={premiere.poster}
            alt=""
            width={960}
            height={1280}
            className="absolute inset-0 h-full w-full object-cover"
            fetchPriority="high"
            aria-hidden="true"
          />
          <ProofVideo
            project={premiere}
            eager
            interactionOnly={false}
            className="relative h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/25 md:bg-gradient-to-r md:from-black md:via-black/25 md:to-transparent" />
          <div className="absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/85 to-transparent px-6 pb-6 pt-20 md:block">
            <div className="ml-auto max-w-sm text-right">
              <ProofBadge />
              <p className="mt-2 text-sm font-bold text-white">
                {premiere.title}
              </p>
              <p className="text-[11px] text-white/50">
                {premiere.model} · {premiere.aspectRatio} ·{" "}
                {premiere.durationSeconds}s
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex h-full min-w-0 flex-col justify-center overflow-hidden bg-gradient-to-b from-black/70 via-black/35 to-black px-4 pb-20 pt-8 md:col-start-1 md:row-start-1 md:bg-black md:px-8 md:py-8 lg:px-12">
          <div className="min-w-0">
            <ProofBadge />
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/55">
              The AI video studio built for toys
            </p>
            <h1 className="font-display mt-2 max-w-full text-[clamp(1.9rem,7.8vw,4.75rem)] font-black leading-[0.96] tracking-[-0.04em] text-white md:text-[clamp(2.7rem,4.4vw,4.6rem)]">
              <span className="block">Turn one toy photo</span>
              <span className="block">into a clip ready to</span>
              <span className="block">list or post.</span>
            </h1>
            <p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-white/70 sm:text-base">
              Pick a toy-native recipe, upload a photo you own, and review the
              generated details before publishing.
            </p>
          </div>

          <div className="mt-5 min-w-0 max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-black/75 p-3 shadow-[0_28px_80px_-28px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:p-4">
            <HeroUpload />
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-[10px] text-white/45">
              <span>Free Mini: 1 live 5s clip · 480p · PIKBO watermark</span>
              <a
                href="#proof"
                className="shrink-0 font-bold text-white/75 hover:text-[#c8ff3d]"
              >
                See the proof ↓
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Screen 2 — one source image, one distinct output. */}
      <section
        id="proof"
        className="border-b border-white/10 bg-gradient-to-b from-[#09090c] to-black px-4 py-14 sm:px-6 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c8ff3d]">
              One owned photo → one video draft
            </p>
            <h2 className="font-display mt-2 text-3xl font-black tracking-tight sm:text-5xl">
              See exactly what changed.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/55 sm:text-base">
              This is a PIKBO Lab example, not a customer post. Cached playback
              costs 0 credits and does not process your upload.
            </p>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 md:gap-5">
            <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0f]">
              <div className="relative aspect-[4/5] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={premiere.inputImage}
                  alt={`Source photo for ${premiere.title}`}
                  width={960}
                  height={1200}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/70 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white/75 backdrop-blur">
                  Input · source photo
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 p-4">
                <p className="text-sm font-bold">{premiere.character}</p>
                <p className="text-[11px] text-white/40">Owned Lab asset</p>
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-[#c8ff3d]/25 bg-[#0c0c0f] shadow-[0_24px_80px_-40px_rgba(200,255,61,0.35)]">
              <div className="group relative aspect-[4/5] overflow-hidden">
                <ProofVideo
                  project={premiere}
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-14">
                  <ProofBadge />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-bold">{premiere.title}</p>
                  <p className="mt-0.5 text-[11px] text-white/45">
                    Hover, focus, or tap to play · not auto-playing beside hero
                  </p>
                </div>
                <Link
                  href={showcaseRecipeHref(premiere)}
                  onClick={() =>
                    track({
                      event: "recipe_use",
                      path: "/",
                      recipe: premiere.recipeSlug,
                    })
                  }
                  className="rounded-full bg-[#c8ff3d] px-4 py-2 text-xs font-black text-black"
                >
                  Use this recipe
                </Link>
              </div>
            </article>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-4">
            {[
              ["Recipe", premiere.recipeSlug],
              ["Model", premiere.model],
              ["Format", `${premiere.aspectRatio} · ${premiere.durationSeconds}s`],
              ["Mode", "Cached Lab · 0 credits"],
            ].map(([label, value]) => (
              <div key={label} className="bg-[#09090c] p-3">
                <dt className="text-[9px] font-bold uppercase tracking-wider text-white/35">
                  {label}
                </dt>
                <dd className="mt-1 text-[11px] font-semibold text-white/75">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Screen 3 — no shared loops, no fake UGC, no autoplay storm. */}
      <section className="border-b border-white/10 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c8ff3d]">
                Eight recipes · eight distinct files
              </p>
              <h2 className="font-display mt-2 text-3xl font-black tracking-tight sm:text-5xl">
                Open the proof, then use the recipe.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/55">
                Every card opens its source, output, settings, and provisional
                Lab review. These are official cached examples—not customer UGC.
              </p>
            </div>
            <Link
              href="/explore"
              className="text-sm font-bold text-[#c8ff3d] hover:underline"
            >
              Explore all projects →
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4">
            {proofProjects.map((project) => (
              <article
                key={project.slug}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0f] transition hover:-translate-y-1 hover:border-[#c8ff3d]/35"
              >
                <Link
                  href={showcaseProjectHref(project)}
                  className="relative block aspect-[3/4] overflow-hidden"
                  aria-label={`Open ${project.title} project`}
                >
                  <ProofVideo
                    project={project}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/5 to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3">
                    <ProofBadge />
                    <h3 className="mt-2 text-xs font-black leading-tight text-white sm:text-sm">
                      {project.title}
                    </h3>
                    <p className="mt-1 text-[9px] uppercase tracking-wider text-white/45">
                      {project.aspectRatio} · {project.durationSeconds}s ·{" "}
                      {project.resolution}
                    </p>
                  </div>
                </Link>
                <div className="grid grid-cols-2 gap-1.5 p-2">
                  <Link
                    href={showcaseProjectHref(project)}
                    className="rounded-full border border-white/15 px-2 py-2 text-center text-[10px] font-bold text-white/75 hover:border-white/30 hover:text-white"
                  >
                    Inside
                  </Link>
                  <Link
                    href={showcaseRecipeHref(project)}
                    onClick={() =>
                      track({
                        event: "recipe_use",
                        path: "/",
                        recipe: project.recipeSlug,
                      })
                    }
                    className="rounded-full bg-[#c8ff3d] px-2 py-2 text-center text-[10px] font-black text-black"
                  >
                    Use recipe
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Product breadth starts only after proof and activation. */}
      <section className="border-b border-white/10 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
            More ways to work
          </p>
          <h2 className="font-display mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Build a listing clip or a three-video Seller Pack.
          </h2>
        </div>
        <SuiteEntryStrip />
        <HfProductRail />
      </section>

      {viralWall.length > 0 ? (
        <section className="border-b border-white/10 py-8">
          <div className="mx-auto mb-4 max-w-7xl px-4 sm:px-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
              Additional Lab references
            </p>
          </div>
          <HomeViralWall items={viralWall} />
        </section>
      ) : null}

      <SeedanceCampaign />
      <HomeViralPresetRail />

      <section className="px-4 py-14 text-center sm:px-6">
        <p className="text-sm text-white/50">
          Upload a toy you own. Pick the job. Review the result before posting.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <FreeTrialCta
            path="/create"
            labelTry="Generate a toy clip"
            labelDemo="Open cached Lab"
            hideClipsChip
            className="inline-flex rounded-full bg-[#c8ff3d] px-7 py-3 text-sm font-black text-black"
          />
          <Link
            href="/create?mode=seller-pack"
            className="inline-flex rounded-full border border-white/15 px-6 py-3 text-sm font-bold text-white/75 hover:border-white/30 hover:text-white"
          >
            Open Seller Pack
          </Link>
        </div>
      </section>
    </main>
  );
}
