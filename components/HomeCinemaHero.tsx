import Link from "next/link";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { HeroSocialProof } from "@/components/HeroSocialProof";
import { ToyHeroH1 } from "@/components/ToyHeroH1";
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
 * AIT-31: toy design-system hero (display type, collection card, featured CTA).
 */
export function HomeCinemaHero() {
  return (
    <section
      id="home-create"
      data-home-hero="street-power-up"
      className="relative isolate overflow-hidden bg-[#08080A] px-4 pb-10 pt-6 text-[#F7F4ED] sm:px-7 lg:min-h-[calc(100vh-4rem)] lg:px-10 lg:py-8"
      aria-labelledby="home-moment-title"
    >
      <div className="absolute inset-0 -z-20 bg-[#08080A]" aria-hidden />
      <div
        className="absolute inset-[-18%] -z-20 scale-110 bg-[url('/demos/beatbot-still.webp')] bg-cover bg-center opacity-25 blur-[88px] saturate-150"
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(circle at 52% 48%, rgba(199,125,255,0.16), transparent 36%), radial-gradient(circle at 18% 20%, rgba(245,255,64,0.08), transparent 32%), linear-gradient(90deg, rgba(8,8,10,0.98) 0%, rgba(8,8,10,0.64) 48%, rgba(8,8,10,0.96) 100%)",
        }}
      />

      <div className="mx-auto grid max-w-[1480px] gap-7 lg:min-h-[calc(100vh-7.5rem)] lg:grid-cols-[minmax(230px,0.9fr)_minmax(340px,430px)_minmax(270px,0.85fr)] lg:items-center lg:gap-10 xl:gap-14">
        <div className="order-2 max-w-[480px] lg:order-1">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/60 backdrop-blur-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon-green)] shadow-[0_0_18px_rgba(57,255,20,0.95)]" />
            AI motion for designer toys
          </p>
          <ToyHeroH1 id="home-moment-title" className="mt-6" />
          <p className="mt-6 max-w-[390px] text-base font-semibold leading-7 text-white/58 lg:text-lg">
            One directed effect. Your toy photo. A private vertical clip ready
            for launch day.
          </p>
          <div className="mt-7 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-white/48">
            <span className="rounded-full border border-white/10 px-3 py-2">
              Private target
            </span>
            <span className="rounded-full border border-white/10 px-3 py-2">
              9:16 · 5 sec
            </span>
            <span className="rounded-full border border-white/10 px-3 py-2">
              720p
            </span>
          </div>
        </div>

        <div className="order-1 mx-auto w-full max-w-[430px] lg:order-2">
          <div className="collection-card shine-sweep p-2 shadow-[0_42px_120px_-42px_rgba(199,125,255,0.55)]">
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
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--fluo-yellow)]">
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
          <div className="rounded-[26px] border border-white/10 bg-[#151519]/88 p-5 shadow-[0_24px_80px_-46px_rgba(0,0,0,0.9)] backdrop-blur-2xl lg:p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/42">
                Selected motion
              </p>
              <span className="h-2 w-2 rounded-full bg-[var(--neon-green)] shadow-[0_0_16px_rgba(57,255,20,0.9)]" />
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--fluo-yellow)]/28 bg-[linear-gradient(135deg,rgba(245,255,64,0.14),rgba(199,125,255,0.08))] p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--fluo-yellow)] text-lg text-[#120705]">
                  ↗
                </span>
                <div>
                  <p className="font-display text-xl font-black tracking-[-0.035em] text-white">
                    Street Power-Up
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-white/50">
                    Neon impact for drops, reels and product reveals.
                  </p>
                </div>
              </div>
            </div>

            <HeroSocialProof className="mt-4 max-w-none" />

            <Link
              href={MOMENT_CREATE_HREF}
              data-home-moment-cta
              className="pricing-card-featured shine-sweep mt-5 inline-flex min-h-14 w-full items-center justify-between px-5 text-xs font-black uppercase tracking-[0.12em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#151519]"
            >
              Use this motion
              <span aria-hidden className="text-lg">
                →
              </span>
            </Link>
            <p className="mt-4 text-[10px] font-semibold leading-5 text-white/38">
              Sample shown: cached 6s archive, not a completed customer deliverable.
              Private target: 9:16 · 5s · 720p.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-3 text-[9px] font-black uppercase tracking-[0.13em] text-white/38 backdrop-blur-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7CFFB2]" />
            Cached sample · 0 credits · no upload
          </div>
        </div>
      </div>
    </section>
  );
}
