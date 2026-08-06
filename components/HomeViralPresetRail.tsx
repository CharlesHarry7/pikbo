"use client";

import Link from "next/link";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { track } from "@/lib/analytics";
import { createRemixHref } from "@/lib/remixIntent";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { useI18n } from "@/components/LanguageProvider";

/**
 * HF Viral Presets pattern — dense horizontal rail of unique Lab clips.
 * One card = one recipe deep link. No shared-loop masquerade.
 */
export function HomeViralPresetRail() {
  const { t } = useI18n();
  // Prefer unique presets; keep order of DEMO_VIDEOS as Lab batch order
  const seen = new Set<string>();
  const clips = DEMO_VIDEOS.filter((d) => {
    if (seen.has(d.preset)) return false;
    seen.add(d.preset);
    return true;
  }).slice(0, 12);

  return (
    <section className="border-b border-white/10 px-3 py-10 sm:px-5">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neon-pink/90">
              {t("home.viral.eyebrow")}
            </p>
            <h2 className="mt-1 font-display text-xl font-bold uppercase tracking-tight sm:text-2xl">
              {t("home.viral.h2")}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-white/45">
              {t("home.viral.sub")}
            </p>
          </div>
          <Link
            href="/effects"
            className="text-[12px] font-semibold text-neon-pink hover:underline"
          >
            {t("home.viral.allRecipes")}
          </Link>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {clips.map((d) => (
            <Link
              key={d.id}
              href={createRemixHref(d.preset, d.id)}
              onClick={() =>
                track({
                  event: "recipe_use",
                  path: "/",
                  recipe: d.preset,
                  meta: { surface: "home_viral_rail" },
                })
              }
              className="group relative w-[9.5rem] shrink-0 overflow-hidden rounded-2xl bg-neutral-900 ring-1 ring-white/10 transition duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_color-mix(in_srgb,var(--neon-pink)_18%,transparent)] hover:ring-neon-pink/50 sm:w-[11.5rem]"
            >
              <div className="relative aspect-[3/4]">
                <AutoPlayVideo
                  poster={d.poster}
                  webm={d.webm}
                  mp4={d.mp4}
                  focusable={false}
                  desktopPlayMode="interaction"
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out will-change-transform group-hover:scale-[1.07]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                <div className="absolute left-2 top-2 flex max-w-[88%] flex-wrap gap-0.5">
                  <span className="rounded-full bg-black/60 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-neon-pink backdrop-blur-sm">
                    {d.eyebrow}
                  </span>
                  <span
                    className="rounded-full border border-white/10 bg-black/55 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white/75 backdrop-blur-sm"
                    title="Cached Lab prototype · provider evidence pending"
                  >
                    Lab · cached prototype
                  </span>
                </div>
                <span className="absolute right-2 top-2 rounded-full bg-neon-pink px-1.5 py-0.5 text-[8px] font-black text-black opacity-0 shadow transition group-hover:opacity-100">
                  {t("home.remake")}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                  <p className="text-[12px] font-bold leading-tight text-white">
                    {d.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/50">{d.character}</p>
                  <p className="mt-1.5 text-[9px] font-bold uppercase tracking-wide text-neon-pink opacity-0 transition group-hover:opacity-100">
                    {t("home.yourPhoto")}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
