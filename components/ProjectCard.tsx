"use client";

import Link from "next/link";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import type { CommunityProject } from "@/lib/videoFeed";

/**
 * PIKBO Lab recipe card:
 * playable cached media + provenance row + preset path into Studio.
 * Uses shared AutoPlayVideo budget (mobile ≤1 concurrent · non-hero preload none).
 */
export function ProjectCard({ project }: { project: CommunityProject }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-md)]">
      <Link
        href={project.remakeHref}
        className="relative block aspect-[4/5] overflow-hidden bg-black sm:aspect-[3/4]"
        aria-label={`Remix ${project.title}`}
      >
        <AutoPlayVideo
          poster={project.demo.poster}
          webm={project.demo.webm}
          mp4={project.demo.mp4}
          /** Wave B: Link owns focus — no nested video tab target */
          focusable={false}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
        <div className="absolute left-2.5 top-2.5 flex max-w-[90%] flex-wrap gap-1">
          <span className="rounded-full border border-white/10 bg-black/55 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/85 backdrop-blur">
            {project.visibility}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
            {project.look}
          </p>
          <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold text-white sm:text-base">
            {project.title}
          </h3>
        </div>
      </Link>

      <div className="flex items-center gap-2.5 border-t border-[var(--border)] px-3 py-2.5">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-black text-black"
          style={{ background: "var(--mint)" }}
          aria-hidden
        >
          {project.author.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-[var(--fg)]">
            {project.title}
          </p>
          <p className="truncate text-[11px] text-[var(--fg-dim)]">
            {project.author.name}
            {project.author.badge ? (
              <span className="text-[var(--mint)]"> · {project.author.badge}</span>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Link
            href={project.detailHref}
            className="rounded-full border border-white/15 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/80 hover:border-[var(--mint)]/50 hover:text-[var(--mint)]"
          >
            Inside
          </Link>
          <Link
            href={project.remakeHref}
            className="rounded-full bg-[var(--mint)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-black hover:brightness-110"
          >
            Remix
          </Link>
        </div>
      </div>
    </article>
  );
}
