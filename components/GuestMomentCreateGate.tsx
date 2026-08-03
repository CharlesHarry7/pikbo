"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { canUsePrivateLaunch, fetchMe, type MeResponse } from "@/lib/meClient";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

const PRIVATE_BETA_MAILTO =
  "mailto:support@pikbo.ai?subject=Pikbo%20private%20beta%20request&body=I%20sell%20designer%20toys%20and%20would%20like%20to%20request%20private%20beta%20access.";

const STREET_POWER_UP_SAMPLE = {
  poster: "/demos/beatbot-still.webp",
  mp4: "/demos/beatbot-viral-hook.mp4",
  webm: "/demos/beatbot-viral-hook.webm",
} as const;

function guestSignInHref() {
  return `/login?next=${encodeURIComponent(
    `${MOMENT_CREATE_HREF}&source=guest-create`
  )}`;
}

function GuestMomentPreview({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <main
      className="min-h-[calc(100vh-64px)] bg-[#F2EDE3] px-4 pb-16 pt-8 text-[#171719] sm:px-7 lg:px-10 lg:pt-10"
      data-guest-create-first="street-power-up"
    >
      <div className="mx-auto grid max-w-[1240px] gap-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center lg:gap-16">
        <div className="max-w-[700px]">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F04E30]">
            Pikbo Moment · Street Power-Up
          </p>
          <h1 className="mt-4 max-w-[700px] font-display text-[clamp(3rem,5vw,4.6rem)] font-black leading-[0.9] tracking-[-0.065em]">
            <span className="block lg:whitespace-nowrap">See Street Power-Up.</span>
            <span className="block">Then make it yours.</span>
          </h1>
          <p className="mt-6 max-w-[620px] text-lg font-semibold leading-7 text-[#4A4843] sm:text-xl sm:leading-8">
            Watch a neon, drop-day direction for launch posts and reels. This
            cached archive study runs 6 seconds; the invited private path
            targets one 9:16 · 5s · 720p clip.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {!signedIn && (
              <Link
                href={guestSignInHref()}
                data-guest-create-sign-in
                className="inline-flex min-h-12 items-center rounded-full bg-[#171719] px-5 text-xs font-black uppercase tracking-[0.12em] text-[#F5F1E8] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04E30] focus-visible:ring-offset-2"
              >
                Sign in to animate your toy
              </Link>
            )}
            <a
              href={PRIVATE_BETA_MAILTO}
              data-guest-create-private-beta
              className={`inline-flex min-h-12 items-center rounded-full px-5 text-xs font-black uppercase tracking-[0.12em] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04E30] focus-visible:ring-offset-2 ${
                signedIn
                  ? "bg-[#171719] text-[#F5F1E8]"
                  : "border border-[#171719]/25 text-[#171719] hover:border-[#F04E30] hover:text-[#F04E30]"
              }`}
            >
              Request private beta
            </a>
          </div>
          <p
            className="mt-5 max-w-[560px] text-[11px] font-semibold leading-5 text-[#6C6861]"
            data-guest-create-not-your-toy
          >
            Sample only · not your toy. This public preview does not change or
            send a visitor photo anywhere.
          </p>
        </div>

        <section
          className="relative mx-auto w-full max-w-[390px]"
          aria-label="Street Power-Up cached sample"
          data-guest-create-sample
        >
          <div className="absolute -inset-5 rounded-[36px] bg-[#F04E30]/10 blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-[22px] border border-[#171719]/15 bg-[#171719] p-2 shadow-[0_28px_80px_-42px_rgba(23,23,25,0.8)] sm:p-3">
            <div className="relative overflow-hidden rounded-[16px] bg-black">
              <AutoPlayVideo
                poster={STREET_POWER_UP_SAMPLE.poster}
                mp4={STREET_POWER_UP_SAMPLE.mp4}
                webm={STREET_POWER_UP_SAMPLE.webm}
                eager
                showControls
                label="Street Power-Up, a cached Pikbo Lab sample, not your toy"
                className="aspect-[9/16] h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                <span className="rounded-full border border-white/20 bg-black/70 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white">
                  Pikbo Lab · cached sample
                </span>
                <span className="rounded-full border border-white/20 bg-black/70 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/75">
                  Archive study · 6s
                </span>
              </div>
            </div>
            <div className="flex items-start justify-between gap-4 px-2 pb-1 pt-3 text-[#F5F1E8] sm:px-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F04E30]">
                  Street Power-Up
                </p>
                <p className="mt-1 text-[11px] font-semibold leading-5 text-white/55">
                  Cached result · drop-day motion study · not your toy
                </p>
              </div>
              <p className="text-right text-[9px] font-black uppercase tracking-[0.14em] text-white/45">
                Private target
                <br />
                9:16 · 5s · 720p
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function GuestMomentCreateGate({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchMe().then((next) => {
      if (cancelled) return;
      setMe(next);
      setSessionResolved(true);
    }).catch(() => {
      // fetchMe currently fail-closes to null, but keep this boundary safe if
      // its implementation or a browser fetch shim ever rejects instead.
      if (cancelled) return;
      setMe(null);
      setSessionResolved(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (sessionResolved && canUsePrivateLaunch(me)) return children;
  return <GuestMomentPreview signedIn={sessionResolved && me?.signedIn === true} />;
}
