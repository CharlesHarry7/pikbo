import Link from "next/link";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

const STREET_POWER_UP_SAMPLE = {
  video: "/demos/beatbot-viral-hook.mp4",
  webm: "/demos/beatbot-viral-hook.webm",
  poster: "/demos/beatbot-still.webp",
  title: "Beatbot Motion Study",
  source: "Pikbo-owned archive motion study",
} as const;

/**
 * The public front door is one honest Moment, not a bundle pitch.
 * The media is a cached Lab sample: it is not made from a visitor's photo and
 * never starts a Provider call from Home.
 */
export function HomeCinemaHero() {
  return (
    <section
      id="home-create"
      data-home-hero="street-power-up"
      className="overflow-hidden bg-[#F2EDE3] px-4 pb-12 pt-6 text-[#171719] sm:px-7 sm:pb-16 sm:pt-8 lg:min-h-[calc(100vh-4rem)] lg:px-10 lg:pb-8 lg:pt-8"
      aria-labelledby="home-moment-title"
    >
      <div className="mx-auto grid max-w-[1360px] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,480px)] lg:items-center lg:gap-16">
        <div className="max-w-[760px]">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F04E30] sm:text-[11px]">
            Pikbo Moment · Street Power-Up
          </p>
          <h1
            id="home-moment-title"
            className="mt-4 max-w-[760px] font-display text-[clamp(3.25rem,7vw,6.8rem)] font-black leading-[0.84] tracking-[-0.075em]"
          >
            Put your toy in motion.
          </h1>
          <p className="mt-6 max-w-[620px] text-lg font-semibold leading-7 text-[#4A4843] sm:text-xl sm:leading-8">
            Start with one owned toy photo. Street Power-Up is Pikbo&apos;s
            single directed Moment for a private beta run: one vertical,
            five-second result you can review before publishing.
          </p>

          <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link
              href={MOMENT_CREATE_HREF}
              data-home-moment-cta
              className="inline-flex min-h-14 items-center justify-between gap-8 rounded-full bg-[#171719] px-6 text-sm font-black uppercase tracking-[0.12em] text-[#F5F1E8] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04E30] focus-visible:ring-offset-2"
            >
              Try Street Power-Up
              <span aria-hidden className="text-lg">
                ↗
              </span>
            </Link>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7C776F]">
              Private beta · invited sellers only
            </span>
          </div>

          <div className="mt-8 grid max-w-[650px] gap-4 border-t border-[#171719]/20 pt-5 text-[11px] font-semibold leading-5 text-[#6C6861] sm:grid-cols-3 sm:gap-6">
            <div>
              <p className="font-black uppercase tracking-[0.16em] text-[#F04E30]">
                Input
              </p>
              <p className="mt-1">One rights-owned toy photo.</p>
            </div>
            <div>
              <p className="font-black uppercase tracking-[0.16em] text-[#F04E30]">
                Output
              </p>
              <p className="mt-1">One private 9:16 · 5s · 720p result.</p>
            </div>
            <div>
              <p className="font-black uppercase tracking-[0.16em] text-[#F04E30]">
                Public preview
              </p>
              <p className="mt-1">Cached sample · 0 credits · no upload.</p>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[480px] lg:mx-0">
          <div className="absolute -inset-5 rounded-[36px] bg-[#F04E30]/10 blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-[22px] border border-[#171719]/15 bg-[#171719] p-2 shadow-[0_28px_80px_-42px_rgba(23,23,25,0.8)] sm:p-3">
            <div className="relative overflow-hidden rounded-[16px] bg-black">
              <AutoPlayVideo
                poster={STREET_POWER_UP_SAMPLE.poster}
                mp4={STREET_POWER_UP_SAMPLE.video}
                webm={STREET_POWER_UP_SAMPLE.webm}
                eager
                showControls
                label={`${STREET_POWER_UP_SAMPLE.title}, a cached Pikbo Lab sample`}
                className="aspect-[9/16] h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                <span className="rounded-full border border-white/20 bg-black/70 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white">
                  PIKBO Lab · cached prototype
                </span>
                <span className="rounded-full border border-white/20 bg-black/70 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/75">
                  0 credits
                </span>
              </div>
            </div>
            <div className="flex items-start justify-between gap-4 px-2 pb-1 pt-3 text-[#F5F1E8] sm:px-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F04E30]">
                  {STREET_POWER_UP_SAMPLE.title}
                </p>
                <p className="mt-1 text-[11px] font-semibold leading-5 text-white/55">
                  {STREET_POWER_UP_SAMPLE.source} · not your toy
                </p>
              </div>
              <p className="text-right text-[9px] font-black uppercase tracking-[0.14em] text-white/45">
                Sample only
                <br />
                no upload
              </p>
            </div>
          </div>
          <p className="mt-3 px-1 text-[10px] font-semibold leading-4 text-[#777168]">
            Private creation is invitation-only. The public sample is a single
            result reference, not a completed customer deliverable.
          </p>
        </div>
      </div>
    </section>
  );
}
