import Link from "next/link";
import { createGenerate360Href } from "@/lib/jobIntents";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { createRemixHref } from "@/lib/remixIntent";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

/** Full-bleed flagship banner — HF Seedance battle pattern (H1). */
export function SeedanceCampaign() {
  const hero = DEMO_VIDEOS[0];
  const strip = DEMO_VIDEOS.slice(0, 8);

  return (
    <section className="relative my-2 overflow-hidden border-y border-white/[0.06]">
      <div className="absolute inset-0">
        <AutoPlayVideo
          poster={hero.poster}
          webm={hero.webm}
          mp4={hero.mp4}
          // 哥飞养站 LCP: campaign uses poster + metadata, not eager full download
          focusable={false}
          desktopPlayMode="interaction"
          lazySources
          className="h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
      </div>

      <div className="relative grid gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:py-16">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--mint)]">
              Flagship · already on Pikbo
            </p>
            <span className="rounded-full border border-[var(--mint)]/40 bg-[var(--mint)]/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[var(--mint)]">
              Live Mini
            </span>
          </div>
          <h2 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Seedance
            <span className="block text-[var(--mint)]">TOY VIDEO</span>
          </h2>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-white/50">
            Designer-toy OS · photo → short clip
          </p>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/45">
            One live engine (Seedance) for figures, blind boxes, listings.
            Not a multi-model zoo — Kling / Veo / Sora stay Soon until real
            keys land.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <FreeTrialCta
              path="/seedance-campaign"
              labelTry="Try free video"
              labelDemo="Try Lab sample"
              className="rounded-full bg-[var(--mint)] px-6 py-2.5 text-sm font-black text-black shadow-[0_0_28px_rgba(200,255,61,0.25)] transition hover:-translate-y-0.5"
            />
            <Link
              href={createGenerate360Href("seedance-campaign")}
              className="rounded-full border border-[var(--mint)]/40 bg-[var(--mint)]/10 px-5 py-2.5 text-sm font-bold text-[var(--mint)] transition hover:bg-[var(--mint)]/15"
              data-seedance-generate="remix"
            >
              Generate video
            </Link>
            <Link
              href="/modules"
              className="rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:border-white/35"
            >
              Modules
            </Link>
            <Link
              href={`${MOMENT_CREATE_HREF}&source=seedance-campaign`}
              className="rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:border-white/35"
            >
              Create one Moment
            </Link>
            <Link
              href="/flow"
              className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-white/45 transition hover:border-white/25 hover:text-white/70"
              title="Preview media wall — not a live Seedance job"
            >
              Flow · Preview
            </Link>
            <Link
              href="/community"
              className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
            >
              PIKBO Lab
            </Link>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 lg:justify-end [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {strip.map((d) => (
            <Link
              key={d.id}
              href={createRemixHref(d.preset, d.id)}
              className="group relative h-40 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 transition duration-300 ease-out hover:-translate-y-0.5 hover:border-[var(--mint)]/45 hover:shadow-[0_10px_28px_rgba(0,0,0,0.45)] sm:h-48 sm:w-28"
            >
              <AutoPlayVideo
                poster={d.poster}
                webm={d.webm}
                mp4={d.mp4}
                focusable={false}
                desktopPlayMode="interaction"
                className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 px-1 py-1.5 text-center text-[9px] font-bold uppercase tracking-wide text-white">
                <span className="rounded-full bg-[var(--mint)]/15 px-1.5 py-0.5 text-[var(--mint)] ring-1 ring-[var(--mint)]/25 transition group-hover:bg-[var(--mint)] group-hover:text-black">
                  Remake →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
