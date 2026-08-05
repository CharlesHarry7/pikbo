import Link from "next/link";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

const STREET_POWER_UP_SAMPLE = {
  video: "/demos/beatbot-viral-hook.mp4",
  webm: "/demos/beatbot-viral-hook.webm",
  poster: "/demos/beatbot-still.webp",
  title: "Beatbot",
} as const;

/** Tiny SVG mascot — Pikbo "Pikko" toy-bot IP mark for the hero. */
function PikkoMascot({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="48" cy="48" r="44" fill="url(#pikko-body)" />
      <circle cx="48" cy="48" r="44" stroke="url(#pikko-ring)" strokeWidth="3" />
      <ellipse cx="34" cy="44" rx="9" ry="11" fill="#0A0A0F" />
      <ellipse cx="62" cy="44" rx="9" ry="11" fill="#0A0A0F" />
      <circle cx="36" cy="42" r="3.5" fill="#00D9FF" />
      <circle cx="64" cy="42" r="3.5" fill="#00D9FF" />
      <path
        d="M36 62c4 6 20 6 24 0"
        stroke="#FFE600"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="20" cy="28" r="6" fill="#FF4ECD" />
      <circle cx="76" cy="28" r="6" fill="#B14EFF" />
      <path
        d="M48 8v8M48 80v8M8 48h8M80 48h8"
        stroke="#00FFA3"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.85"
      />
      <defs>
        <linearGradient id="pikko-body" x1="12" y1="8" x2="84" y2="88">
          <stop stopColor="#B14EFF" />
          <stop offset="0.55" stopColor="#FF4ECD" />
          <stop offset="1" stopColor="#00D9FF" />
        </linearGradient>
        <linearGradient id="pikko-ring" x1="0" y1="0" x2="96" y2="96">
          <stop stopColor="#FFE600" />
          <stop offset="1" stopColor="#00FFA3" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * The public front door is one honest, cached Moment. It never starts a
 * Provider call and never presents the archive study as a customer result.
 * Visual layer only: Pop Mart / designer-toy blind-box energy.
 */
export function HomeCinemaHero() {
  return (
    <section
      id="home-create"
      data-home-hero="street-power-up"
      data-visual="toy-pop-v1"
      className="relative isolate overflow-hidden bg-[var(--void)] px-4 pb-10 pt-6 text-[var(--cream)] sm:px-7 lg:min-h-[calc(100vh-4rem)] lg:px-10 lg:py-8"
      aria-labelledby="home-moment-title"
    >
      {/* Aurora + blurred sample wash */}
      <div className="absolute inset-0 -z-20 bg-[var(--void)]" aria-hidden />
      <div
        className="absolute inset-[-18%] -z-20 scale-110 bg-[url('/demos/beatbot-still.webp')] bg-cover bg-center opacity-30 blur-[90px] saturate-150"
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_48%_42%,rgba(177,78,255,0.28),transparent_38%),radial-gradient(circle_at_78%_20%,rgba(255,78,205,0.18),transparent_32%),radial-gradient(circle_at_18%_70%,rgba(0,217,255,0.14),transparent_36%),linear-gradient(90deg,rgba(10,10,15,0.96)_0%,rgba(10,10,15,0.55)_48%,rgba(10,10,15,0.96)_100%)]"
        aria-hidden
      />

      {/* Floating toy confetti / particles */}
      <div className="particle-field" aria-hidden>
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            style={{
              left: `${6 + ((i * 17) % 88)}%`,
              top: `${10 + ((i * 23) % 75)}%`,
              animationDelay: `${(i % 9) * 0.45}s`,
            }}
          />
        ))}
      </div>

      {/* Decorative toy stickers */}
      <span
        className="pointer-events-none absolute left-[6%] top-[18%] hidden text-2xl opacity-70 lg:block"
        style={{ animation: "float-y 4s ease-in-out infinite" }}
        aria-hidden
      >
        ⭐
      </span>
      <span
        className="pointer-events-none absolute right-[8%] top-[28%] hidden text-xl opacity-60 lg:block"
        style={{ animation: "float-y 5s ease-in-out 0.6s infinite" }}
        aria-hidden
      >
        💫
      </span>
      <span
        className="pointer-events-none absolute bottom-[16%] left-[12%] hidden text-xl opacity-55 lg:block"
        style={{ animation: "float-y 4.5s ease-in-out 1s infinite" }}
        aria-hidden
      >
        ❤️
      </span>

      <div className="relative z-[1] mx-auto grid max-w-[1480px] gap-8 lg:min-h-[calc(100vh-7.5rem)] lg:grid-cols-[minmax(230px,0.82fr)_minmax(340px,430px)_minmax(270px,0.82fr)] lg:items-center lg:gap-10 xl:gap-16">
        {/* Copy column */}
        <div className="order-2 max-w-[460px] lg:order-1">
          <div className="fade-up flex items-center gap-3">
            <PikkoMascot className="h-14 w-14 shrink-0 drop-shadow-[0_0_18px_rgba(255,78,205,0.55)]" />
            <p className="inline-flex items-center gap-2 rounded-full border border-[#FF4ECD]/35 bg-[rgba(255,78,205,0.1)] px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#FF4ECD] backdrop-blur-xl">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00FFA3] shadow-[0_0_18px_rgba(0,255,163,0.95)]" />
              AI motion for designer toys
            </p>
          </div>

          <h1
            id="home-moment-title"
            className="fade-up fade-up-d1 mt-6 font-display text-[clamp(3.2rem,5.4vw,5.9rem)] font-black leading-[0.86] tracking-[-0.075em]"
          >
            <span className="text-bling">Put your toy</span>
            <br />
            <span className="text-[var(--cream)]">in motion.</span>
          </h1>

          <p className="fade-up fade-up-d2 mt-6 max-w-[390px] text-base font-semibold leading-7 text-white/60 lg:text-lg">
            One directed effect. Your toy photo. A private vertical clip ready
            for launch day.
          </p>

          <div className="fade-up fade-up-d3 mt-7 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-white/55">
            <span className="stat-card px-3 py-2 text-[#00D9FF]">Private target</span>
            <span className="stat-card px-3 py-2 text-[#FFE600]">9:16 · 5 sec</span>
            <span className="stat-card px-3 py-2 text-[#00FFA3]">720p</span>
          </div>
        </div>

        {/* Video stage — toy display case, not a plain phone bezel */}
        <div className="order-1 mx-auto w-full max-w-[430px] lg:order-2">
          <div className="fade-up fade-up-d1 toy-card relative p-2.5 shadow-[0_42px_120px_-36px_rgba(177,78,255,0.7)]">
            {/* Neon orbit ring */}
            <div
              className="pointer-events-none absolute -inset-3 -z-10 rounded-[40px] opacity-70"
              style={{
                background:
                  "conic-gradient(from 120deg, #B14EFF, #FF4ECD, #00D9FF, #00FFA3, #FFE600, #B14EFF)",
                filter: "blur(14px)",
              }}
              aria-hidden
            />
            <div className="relative aspect-[9/16] max-h-[calc(100vh-12rem)] overflow-hidden rounded-[26px] bg-black ring-2 ring-[#FF4ECD]/40">
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
                <span className="rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-xl">
                  Sample · Beatbot
                </span>
                <span className="rounded-full border border-[#00D9FF]/40 bg-[#00D9FF]/15 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#00D9FF] backdrop-blur-xl">
                  Archive sample · 6s
                </span>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent px-5 pb-5 pt-24">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#FF4ECD]">
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

        {/* Motion panel */}
        <div className="order-3 lg:pl-2">
          <div className="fade-up fade-up-d2 effect-card bg-[rgba(20,20,30,0.88)] p-5 backdrop-blur-2xl lg:p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/45">
                Selected motion
              </p>
              <span className="h-2 w-2 rounded-full bg-[#FF4ECD] shadow-[0_0_16px_rgba(255,78,205,0.9)]" />
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-[#B14EFF]/35 bg-[linear-gradient(135deg,rgba(177,78,255,0.22),rgba(255,78,205,0.08))] p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,#B14EFF,#FF4ECD)] text-lg text-white shadow-[0_0_18px_rgba(255,78,205,0.45)]">
                  ↗
                </span>
                <div>
                  <p className="font-display text-xl font-black tracking-[-0.035em] text-white">
                    Street Power-Up
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-white/55">
                    Neon impact for drops, reels and product reveals.
                  </p>
                </div>
              </div>
            </div>
            <Link
              href={MOMENT_CREATE_HREF}
              data-home-moment-cta
              className="btn-press mt-5 inline-flex min-h-14 w-full items-center justify-between rounded-2xl bg-[linear-gradient(135deg,#B14EFF,#FF4ECD)] px-5 text-xs font-black uppercase tracking-[0.12em] text-white shadow-[0_12px_40px_-12px_rgba(255,78,205,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#14141E]"
            >
              Use this motion
              <span aria-hidden className="text-lg">
                →
              </span>
            </Link>
            <p className="mt-4 text-[10px] font-semibold leading-5 text-white/40">
              Sample shown: cached 6s archive, not a completed customer
              deliverable. Private target: 9:16 · 5s · 720p.
            </p>
          </div>

          <div className="fade-up fade-up-d3 mt-4 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/25 px-4 py-3 text-[9px] font-black uppercase tracking-[0.13em] text-white/42 backdrop-blur-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00FFA3] shadow-[0_0_12px_#00FFA3]" />
            Cached sample · 0 credits · no upload
          </div>
        </div>
      </div>
    </section>
  );
}
