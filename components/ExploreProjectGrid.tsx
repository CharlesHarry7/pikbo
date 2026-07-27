"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import {
  SHOWCASE_CATEGORIES,
  showcaseProjectHref,
  showcaseProvenanceLabel,
  showcaseRecipeHref,
  type ShowcaseCategory,
  type ShowcaseProject,
} from "@/lib/showcaseProjects";
import { track } from "@/lib/analytics";

type ExploreCategory = "all" | ShowcaseCategory;

export function ExploreProjectGrid({
  projects,
  initialCategory = "all",
}: {
  projects: ShowcaseProject[];
  initialCategory?: ExploreCategory;
}) {
  const [category, setCategory] = useState<ExploreCategory>(
    SHOWCASE_CATEGORIES.some((item) => item.id === initialCategory)
      ? initialCategory
      : "all"
  );

  const visible = useMemo(
    () =>
      category === "all"
        ? projects
        : projects.filter((project) => project.category === category),
    [category, projects]
  );

  return (
    <>
      <div
        className="flex gap-2 overflow-x-auto px-4 pb-3 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Explore project categories"
      >
        {SHOWCASE_CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={category === item.id}
            onClick={() => {
              setCategory(item.id);
              const query = item.id === "all" ? "" : `?cat=${item.id}`;
              window.history.replaceState({}, "", `/explore${query}`);
            }}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition ${
              category === item.id
                ? "bg-[#c8ff3d] text-black"
                : "border border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="px-3 pb-16 sm:px-5" aria-live="polite">
        <div className="columns-2 gap-2 sm:columns-3 sm:gap-3 lg:columns-4 xl:columns-5">
          {visible.map((project, index) => (
            <article
              key={project.slug}
              className="group relative mb-2 break-inside-avoid overflow-hidden rounded-2xl border border-white/[0.08] bg-neutral-950 shadow-[0_12px_32px_-18px_rgba(0,0,0,0.9)] transition duration-300 hover:-translate-y-0.5 hover:border-[#c8ff3d]/35 hover:shadow-[0_20px_40px_-20px_rgba(200,255,61,0.12)] sm:mb-3"
            >
              <Link
                href={showcaseProjectHref(project)}
                className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8ff3d]"
                aria-label={`Open ${project.title} project details`}
                onClick={() =>
                  track({
                    event: "project_open",
                    path: "/explore",
                    recipe: project.recipeSlug,
                    meta: { slug: project.slug, source: "explore_grid" },
                  })
                }
              >
                <div
                  className={
                    project.aspectRatio === "1:1"
                      ? "relative aspect-square"
                      : project.aspectRatio === "16:9"
                        ? "relative aspect-video"
                        : index % 3 === 1
                          ? "relative aspect-[9/13]"
                          : "relative aspect-[9/14]"
                  }
                >
                  <AutoPlayVideo
                    poster={project.poster}
                    webm={project.outputWebm}
                    mp4={project.outputVideo}
                    desktopPlayMode="interaction"
                    /** Wave B: Link owns focus — no nested tabIndex video */
                    focusable={false}
                    eager={index === 0}
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out will-change-transform group-hover:scale-[1.05]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c8ff3d]/40 to-transparent opacity-0 transition group-hover:opacity-100" />
                  <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                    <span className="rounded-full border border-white/10 bg-black/65 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-[#c8ff3d] backdrop-blur">
                      {showcaseProvenanceLabel(project)}
                    </span>
                    <span
                      className="rounded-full border border-white/15 bg-black/65 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-white/55 backdrop-blur"
                      title="Provider task ID and formal QA are not recorded"
                    >
                      Evidence pending
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/45">
                      {project.character} · {project.aspectRatio}
                    </p>
                    <h2 className="mt-1 line-clamp-2 text-sm font-bold leading-tight text-white">
                      {project.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/50">
                      {project.result}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] font-bold text-white/80 transition group-hover:border-[#c8ff3d]/40 group-hover:bg-[#c8ff3d]/15 group-hover:text-[#c8ff3d]">
                      Inside project →
                    </span>
                  </div>
                </div>
              </Link>
              <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-black/40 px-3 py-2">
                <span className="truncate text-[10px] text-white/40">
                  {project.model}
                </span>
                <Link
                  href={showcaseRecipeHref(project)}
                  className="shrink-0 rounded-full bg-[#c8ff3d]/15 px-2.5 py-1 text-[10px] font-black text-[#c8ff3d] transition hover:bg-[#c8ff3d] hover:text-black"
                  onClick={() =>
                    track({
                      event: "recipe_use",
                      path: "/explore",
                      recipe: project.recipeSlug,
                      meta: { slug: project.slug, source: "explore_use_recipe" },
                    })
                  }
                >
                  Remake →
                </Link>
              </div>
            </article>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
            <p className="text-sm font-bold text-white">
              No approved project in this category yet
            </p>
            <p className="mt-1 text-xs text-white/40">
              We do not reuse another recipe&apos;s clip to fake a full wall.
            </p>
            <Link
              href="/effects"
              className="mt-4 inline-flex text-xs font-bold text-[#c8ff3d]"
            >
              Browse concept recipes →
            </Link>
          </div>
        ) : null}
      </section>
    </>
  );
}
