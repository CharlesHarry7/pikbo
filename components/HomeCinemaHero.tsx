import Link from "next/link";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

const STREET_POWER_UP_SAMPLE = {
  video: "/demos/beatbot-viral-hook.mp4",
  webm: "/demos/beatbot-viral-hook.webm",
  poster: "/demos/beatbot-still.webp",
  title: "Beatbot",
} as const;

/**
 * The public front door is one honest, cached Moment. It never starts a
 * Provider call and never presents the archive study as a customer result.
 */
export function HomeCinemaHero() {
  return (
    <section
      id="home-create"
      data-home-hero="street-power-up"
      className="relative isolate overflow-hidden bg-[#08080A] px-4 pb-8 pt-6 text-[#F7F4ED] sm:px-7 lg:min-h-[calc(100vh-4rem)] lg:px-10 lg:py-7"
      aria-labelledby="home-moment-title"
    >
      <div className="absolute inset-0 -z-20 bg-[#08080A]" aria-hidden />
      <div
        className="absolute inset-[-18%] -z-20 scale-110 bg-[url('/demos/beatbot-still.webp')] bg-cover bg-center opacity-25 blur-[88px] saturate-150"
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_52%_48%,rgba(206,27,106,0.18),transparent_36%),linear-gradient(90deg,rgba(8,8,10,0.98)_0%,rgba(8,8,10,0.64)_48%,rgba(8,8,10,0.96)_100%)]"
        aria-hidden
      />

      <div className="mx-auto grid max-w-[1480px] gap-7 lg:min-h-[calc(100vh-7.5rem)] lg:grid-cols-[minmax(0,0.9fr)_minmax(340px,430px)_minmax(0,0.9fr)] lg:items-center lg:gap-10 xl:gap-16">
        <div className="order-2 max-w-[500px] lg:order-1">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.065] px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/72 backdrop-blur-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF4D2E] shadow-[0_0_18px_rgba(255,77,46,0.95)]" />
            AI motion for designer toys
          </p>
          <h1
            id="home-moment-title"
            className="mt-6 max-w-[540px] font-display text-[clamp(3rem,4.2vw,4.65rem)] font-black leading-[0.9] tracking-[-0.065em]"
          >
            <span className="block xl:whitespace-nowrap">Put your toy</span>
            <span
              data-home-title-line="motion"
              className="mt-1 block bg-[linear-gradient(90deg,#F7F4ED_0%,#FFB09F_72%,#FF6A4D_100%)] bg-clip-text text-transparent"
            >
              in motion.
            </span>
          </h1>
          <p className="mt-6 max-w-[420px] text-base font-semibold leading-7 text-white/68 lg:text-lg">
            One directed effect. Your toy photo. A private vertical clip ready
            for launch day.
          </p>
          <div className="mt-7 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-white/62">
            <span className="rounded-full border border-white/14 bg-black/20 px-3 py-2">Private target</span>
            <span className="rounded-full border border-white/14 bg-black/20 px-3 py-2">9:16 · 5 sec</span>
            <span className="rounded-full border border-white/14 bg-black/20 px-3 py-2">720p</span>
          </div>
        </div>

        <div className="order-1 mx-auto w-full max-w-[330px] sm:max-w-[390px] lg:order-2 lg:max-w-[430px]">
          <div className="relative rounded-[30px] border border-white/18 bg-[#151519] p-2 shadow-[0_42px_120px_-42px_rgba(255,32,122,0.62)] ring-1 ring-[#FF4D2E]/10">
            <div className="relative aspect-[9/16] max-h-[calc(100vh-12rem)] overflow-hidden rounded-[23px] bg-black">
              <AutoPlayVideo
                poster={STREET_POWER_UP_SAMPLE.poster}
                mp4={STREET_POWER_UP_SAMPLE.video}
                webm={STREET_POWER_UP_SAMPLE.webm}
                eager
                showControls
                label="Beatbot, the cached Street Power-Up sample"
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
                <span className="rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-xl">
                  Sample · Beatbot
                </span>
                <span className="rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/65 backdrop-blur-xl">
                  Archive sample · 6s
                </span>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/55 to-transparent px-5 pb-5 pt-24">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#FF6A4D]">
                  Street Power-Up
                </p>
                <div className="mt-1.5 flex items-end justify-between gap-5">
                  <p className="font-display text-2xl font-black tracking-[-0.04em] text-white">
                    {STREET_POWER_UP_SAMPLE.title}
                  </p>
                  <p className="text-right text-[9px] font-bold uppercase tracking-[0.12em] text-white/48">
                    Pikbo Lab archive
                    <br />
                    not your toy
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="order-3 lg:pl-2">
          <div className="rounded-[26px] border border-white/14 bg-[#151519]/92 p-5 shadow-[0_28px_90px_-48px_rgba(255,77,46,0.45)] backdrop-blur-2xl lg:p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/55">
                Selected motion
              </p>
              <span className="h-2 w-2 rounded-full bg-[#FF4D2E] shadow-[0_0_16px_rgba(255,77,46,0.9)]" />
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-[#FF4D2E]/28 bg-[linear-gradient(135deg,rgba(255,77,46,0.2),rgba(255,255,255,0.03))] p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FF4D2E] text-lg text-[#120705]">
                  ↗
                </span>
                <div>
                  <p className="font-display text-2xl font-black tracking-[-0.04em] text-white">
                    Street Power-Up
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-white/62">
                    Neon impact for drops, reels and product reveals.
                  </p>
                </div>
              </div>
            </div>
            <Link
              href={MOMENT_CREATE_HREF}
              data-home-moment-cta
              className="mt-5 inline-flex min-h-14 w-full items-center justify-between rounded-2xl bg-[#FF4D2E] px-5 text-xs font-black uppercase tracking-[0.12em] text-[#140806] transition hover:-translate-y-0.5 hover:bg-[#FF6A4D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#151519]"
            >
              Use this motion
              <span aria-hidden className="text-lg">→</span>
            </Link>
            <p className="mt-4 text-[10px] font-semibold leading-5 text-white/52">
              Sample shown: cached 6s archive, not a completed customer deliverable.
              Private target: 9:16 · 5s · 720p.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/28 px-4 py-3 text-[9px] font-black uppercase tracking-[0.13em] text-white/52 backdrop-blur-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7CFFB2]" />
            Cached sample · 0 credits · no upload
          </div>
        </div>
      </div>
    </section>
  );
}
