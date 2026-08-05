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

/**
 * Guest / signed-in-but-not-invited first surface.
 * Honest cached sample only — never mounts private workbench controls or spend.
 * Visual language: 潮玩 collector ritual (Molly / Labubu shelf energy).
 */
function GuestMomentPreview({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <section
      className="create-ritual relative isolate min-h-[calc(100vh-56px)] overflow-hidden px-4 pb-12 pt-6 text-[var(--fg)] sm:px-7 lg:px-10 lg:py-8"
      data-guest-create-first="street-power-up"
    >
      <div
        className="absolute inset-[-12%] -z-20 scale-110 bg-[url('/demos/beatbot-still.webp')] bg-cover bg-center opacity-[0.18] blur-[88px] saturate-150"
        aria-hidden
      />
      <div className="create-ritual-grid" aria-hidden />

      <div className="relative z-[1] mx-auto grid max-w-[1360px] gap-8 lg:min-h-[calc(100vh-7rem)] lg:grid-cols-[minmax(220px,0.78fr)_minmax(330px,400px)_minmax(260px,0.82fr)] lg:items-center lg:gap-10 xl:gap-14">
        {/* Left — brand story */}
        <div className="order-2 max-w-[400px] toy-sticker-enter lg:order-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="toy-sticker toy-sticker-bubblegum">Current motion</span>
            <span className="toy-sticker toy-sticker-outline">Cached study</span>
          </div>
          <h1 className="mt-5 font-display text-[clamp(3rem,4.8vw,5.4rem)] font-black leading-[0.86] tracking-[-0.07em]">
            <span className="text-grad">Street</span>
            <br />
            Power-Up.
          </h1>
          <p className="mt-5 max-w-[340px] text-base font-semibold leading-7 text-[var(--fg-muted)]">
            A neon, drop-day direction built for designer-toy reveals and
            vertical launch posts.
          </p>

          <ol className="mt-7 space-y-3">
            {[
              { n: "01", label: "Watch the real sample", tone: "ready" as const },
              {
                n: "02",
                label: "Sign in for private access",
                tone: "progress" as const,
              },
              {
                n: "03",
                label: "Find the result in Library",
                tone: "private" as const,
              },
            ].map((step) => (
              <li key={step.n} className="status-card flex items-center gap-3" data-tone={step.tone}>
                <span className="font-display text-lg font-black tracking-[-0.04em] text-[var(--mint)]">
                  {step.n}
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Center — sample capsule */}
        <section
          className="order-1 mx-auto w-full max-w-[400px] toy-sticker-enter lg:order-2"
          style={{ animationDelay: "60ms" }}
          aria-label="Street Power-Up cached sample"
          data-guest-create-sample
        >
          <div className="result-card create-sample-capsule p-2">
            <span className="toy-corner-mark toy-corner-mark-tl" aria-hidden />
            <span className="toy-corner-mark toy-corner-mark-br" aria-hidden />
            <div className="relative aspect-[9/16] max-h-[calc(100vh-11rem)] overflow-hidden rounded-[1.35rem] bg-black">
              <AutoPlayVideo
                poster={STREET_POWER_UP_SAMPLE.poster}
                mp4={STREET_POWER_UP_SAMPLE.mp4}
                webm={STREET_POWER_UP_SAMPLE.webm}
                eager
                showControls
                label="Street Power-Up, the cached Beatbot sample, not your toy"
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
                <span className="toy-sticker toy-sticker-mango">Sample · Beatbot</span>
                <span className="toy-sticker toy-sticker-outline">Archive · 6s</span>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0c0618] via-[#0c0618]/70 to-transparent px-5 pb-5 pt-28">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--bubblegum)]">
                  Street Power-Up
                </p>
                <div className="mt-1.5 flex items-end justify-between gap-5">
                  <p className="font-display text-2xl font-black tracking-[-0.04em] text-[var(--paper)]">
                    Beatbot
                  </p>
                  <p className="text-right text-[9px] font-bold uppercase tracking-[0.12em] text-white/48">
                    Cached sample
                    <br />
                    not your toy
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right — access card */}
        <div
          className="order-3 toy-sticker-enter"
          style={{ animationDelay: "120ms" }}
        >
          <div className="collection-card p-5 sm:p-6">
            <span className="toy-corner-mark toy-corner-mark-tl" aria-hidden />
            <span className="toy-corner-mark toy-corner-mark-br" aria-hidden />

            <div className="flex flex-wrap gap-2">
              <span className="toy-sticker toy-sticker-lime">Private path</span>
              <span className="toy-sticker toy-sticker-grape">9:16 · 5s · 720p</span>
            </div>
            <p className="mt-4 text-[9px] font-black uppercase tracking-[0.2em] text-white/42">
              Make it yours
            </p>
            <h2 className="mt-2 font-display text-3xl font-black leading-[0.95] tracking-[-0.055em] text-[var(--paper)]">
              One photo in.
              <br />
              <span className="text-grad">One private clip out.</span>
            </h2>
            <p className="mt-4 text-xs font-semibold leading-6 text-white/50">
              The invited path is fixed at 9:16 · 5s · 720p. Your finished
              result returns to your account Library.
            </p>
            <div className="mt-5 grid gap-3">
              {!signedIn && (
                <Link
                  href={guestSignInHref()}
                  data-guest-create-sign-in
                  className="btn btn-primary inline-flex min-h-14 items-center justify-between rounded-2xl px-5 text-xs font-black uppercase tracking-[0.12em]"
                >
                  Sign in to make yours
                  <span aria-hidden className="text-lg">
                    →
                  </span>
                </Link>
              )}
              <a
                href={PRIVATE_BETA_MAILTO}
                data-guest-create-private-beta
                className={
                  signedIn
                    ? "btn btn-bubblegum inline-flex min-h-12 items-center justify-center rounded-2xl px-5 text-[10px] font-black uppercase tracking-[0.14em]"
                    : "btn btn-ghost inline-flex min-h-12 items-center justify-center rounded-2xl px-5 text-[10px] font-black uppercase tracking-[0.14em]"
                }
              >
                Request private beta
              </a>
            </div>
            <p
              className="mt-4 text-[10px] font-semibold leading-5 text-white/38"
              data-guest-create-not-your-toy
            >
              Sample only · not your toy. The public page never receives or
              sends a visitor photo.
            </p>
          </div>

          <div className="status-card mt-4 flex items-center gap-3" data-tone="private">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--aqua)] shadow-[0_0_12px_rgba(62,224,198,0.7)]" />
            <span className="text-[9px] font-black uppercase tracking-[0.13em] text-white/45">
              Owner-only result · no public feed
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function GuestMomentCreateGate({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchMe()
      .then((next) => {
        if (cancelled) return;
        setMe(next);
        setSessionResolved(true);
      })
      .catch(() => {
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
