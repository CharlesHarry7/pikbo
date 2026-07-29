"use client";

import Link from "next/link";
import type { CommunityProject } from "@/lib/videoFeed";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { WAVE_A_DESTINATIONS } from "@/lib/softLaunch";

/**
 * HF “Explore the inside of every project” — tall portrait cards.
 * P6: remake + Inside project (input/output) secondary door.
 */
export function HomeProjectsExplore({
  projects,
}: {
  projects: CommunityProject[];
}) {
  return (
    <section className="py-6">
      <div className="mb-4 flex items-end justify-between gap-3 px-4 sm:px-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Explore the inside of every project
          </h2>
          <p className="mt-1 max-w-xl text-sm text-white/45">
            Cached Lab prototypes — open the evidence status, or reuse the
            recipe with a toy photo you own
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
          <Link
            href={WAVE_A_DESTINATIONS.explore.href}
            data-capability-state={WAVE_A_DESTINATIONS.explore.state}
            className="text-xs font-semibold text-white/55 hover:text-white hover:underline"
          >
            Explore grid
          </Link>
          <Link
            href="/community"
            className="text-xs font-semibold text-[var(--mint)] hover:underline"
          >
            Lab prototypes
          </Link>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory sm:gap-3.5 sm:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {projects.map((p, i) => (
          <article
            key={p.id}
            className="group relative h-[380px] w-[min(62vw,210px)] shrink-0 snap-start overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-white/10 transition duration-300 hover:-translate-y-0.5 hover:ring-[var(--mint)]/35 sm:h-[420px] sm:w-[200px]"
          >
            <Link
              href={p.detailHref}
              className="absolute inset-0 z-0"
              aria-label={`Open ${p.title} project evidence`}
              data-home-project-destination="project"
            >
              <AutoPlayVideo
                poster={p.demo.poster}
                webm={p.demo.webm}
                mp4={p.demo.mp4}
                lazySources
                focusable={false}
                desktopPlayMode="interaction"
                className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
                style={{
                  filter:
                    i % 4 === 1
                      ? "saturate(1.15) contrast(1.05)"
                      : i % 4 === 2
                        ? "saturate(0.95) brightness(1.05)"
                        : i % 4 === 3
                          ? "contrast(1.08)"
                          : undefined,
                  objectPosition: i % 2 === 0 ? "center top" : "center center",
                }}
              />
            </Link>
            <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black via-black/25 to-transparent" />
            <div className="pointer-events-none absolute left-2.5 top-2.5 z-[2] flex max-w-[90%] flex-wrap gap-1">
              <span className="rounded-full border border-white/15 bg-black/45 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/90 backdrop-blur">
                {p.visibility}
              </span>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--mint)] text-[9px] font-black text-black">
                  {p.author.initials}
                </span>
                <span className="truncate text-[10px] text-white/60">
                  {p.author.name}
                </span>
              </div>
              <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-white">
                {p.title}
              </h3>
              <p className="mt-0.5 line-clamp-1 text-[10px] text-white/45">
                {p.look}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Link
                  href={p.remakeHref}
                  data-home-project-destination="create"
                  className="pointer-events-auto rounded-full bg-[var(--mint)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--mint)] ring-1 ring-[var(--mint)]/25 transition group-hover:bg-[var(--mint)] group-hover:text-black"
                >
                  Use recipe →
                </Link>
                <span className="rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/70">
                  Inside project
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
