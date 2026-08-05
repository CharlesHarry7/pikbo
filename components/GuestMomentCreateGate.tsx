"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import {
  isClientTimeoutError,
  STUDIO_SESSION_BOOT_MS,
} from "@/lib/clientTimeout";
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

function GuestMomentPreview({
  signedIn = false,
  sessionBoot,
  onRetrySession,
}: {
  signedIn?: boolean;
  sessionBoot: "checking" | "ready" | "timeout";
  onRetrySession: () => void;
}) {
  // Mobile (≤640px): compact chrome so sample + primary Sign-in stay above the
  // fold on ~390px. Desktop/lg keeps the archive study density.
  return (
    <section
      className="relative isolate min-h-[calc(100vh-56px)] overflow-hidden bg-[var(--void)] px-4 pb-6 pt-3 text-[var(--cream)] sm:px-7 sm:pb-10 sm:pt-6 lg:px-10 lg:py-7"
      data-guest-create-first="street-power-up"
      data-guest-create-compact="mobile"
      data-studio-open-state={sessionBoot}
    >
      <div className="absolute inset-0 -z-20 bg-[var(--void)]" aria-hidden />
      <div
        className="absolute inset-[-18%] -z-20 scale-110 bg-[url('/demos/beatbot-still.webp')] bg-cover bg-center opacity-20 blur-[92px] saturate-150"
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_45%,rgba(206,27,106,0.16),transparent_34%),linear-gradient(90deg,rgba(8,8,10,0.98)_0%,rgba(8,8,10,0.64)_50%,rgba(8,8,10,0.96)_100%)]"
        aria-hidden
      />

      <div className="mx-auto grid max-w-[1360px] gap-3 sm:gap-7 lg:min-h-[calc(100vh-7rem)] lg:grid-cols-[minmax(220px,0.75fr)_minmax(330px,390px)_minmax(260px,0.78fr)] lg:items-center lg:gap-10 xl:gap-14">
        <div className="order-3 max-w-[380px] lg:order-1">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#FF4ECD] sm:tracking-[0.2em]">
            Current motion
          </p>
          <h1 className="mt-1.5 font-display text-[1.65rem] font-black leading-[0.95] tracking-[-0.04em] sm:mt-4 sm:text-[clamp(3rem,4.6vw,5.25rem)] sm:leading-[0.87] sm:tracking-[-0.07em]">
            <span className="sm:hidden">Street Power-Up.</span>
            <span className="hidden sm:inline">
              Street
              <br />
              Power-Up.
            </span>
          </h1>
          <p className="mt-2 max-w-[330px] text-[13px] font-semibold leading-5 text-white/55 sm:mt-5 sm:text-base sm:leading-7">
            A neon, drop-day direction built for designer-toy reveals and
            vertical launch posts.
          </p>
          <div className="mt-3 hidden space-y-3 border-l border-white/10 pl-4 text-[10px] font-black uppercase tracking-[0.14em] text-white/36 sm:mt-6 sm:block">
            <p><span className="text-white/72">01</span> Watch the real sample</p>
            <p><span className="text-white/72">02</span> Sign in for private access</p>
            <p><span className="text-white/72">03</span> Find the result in Library</p>
          </div>
        </div>

        <section
          className="order-1 mx-auto w-full max-w-[188px] sm:max-w-[320px] lg:order-2 lg:max-w-[390px]"
          aria-label="Street Power-Up cached sample"
          data-guest-create-sample
        >
          <div className="relative rounded-[22px] border border-white/12 bg-[var(--card)] p-1.5 shadow-[0_42px_120px_-42px_rgba(255,32,122,0.62)] sm:rounded-[30px] sm:p-2">
            <div className="relative aspect-[9/16] max-h-[min(42svh,20rem)] overflow-hidden rounded-[17px] bg-black sm:max-h-[min(62vh,32rem)] sm:rounded-[23px] lg:max-h-[calc(100vh-11rem)]">
              <AutoPlayVideo
                poster={STREET_POWER_UP_SAMPLE.poster}
                mp4={STREET_POWER_UP_SAMPLE.mp4}
                webm={STREET_POWER_UP_SAMPLE.webm}
                eager
                showControls
                errorRetry
                label="Street Power-Up, the cached Beatbot sample, not your toy"
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5 sm:gap-3 sm:p-4">
                <span className="rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-white backdrop-blur-xl sm:px-3 sm:py-1.5 sm:text-[9px] sm:tracking-[0.16em]">
                  Sample · Beatbot
                </span>
                <span className="rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/65 backdrop-blur-xl sm:px-3 sm:py-1.5 sm:text-[9px] sm:tracking-[0.14em]">
                  Archive · 6s
                </span>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/55 to-transparent px-3 pb-3 pt-12 sm:px-5 sm:pb-5 sm:pt-24">
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#FF4ECD] sm:text-[9px] sm:tracking-[0.2em]">
                  Street Power-Up
                </p>
                <div className="mt-1 flex items-end justify-between gap-3 sm:mt-1.5 sm:gap-5">
                  <p className="font-display text-lg font-black tracking-[-0.04em] text-white sm:text-2xl">
                    Beatbot
                  </p>
                  <p className="text-right text-[8px] font-bold uppercase tracking-[0.12em] text-white/48 sm:text-[9px]">
                    Cached sample
                    <br />
                    not your toy
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="order-2 lg:order-3">
          <div className="rounded-[20px] border border-white/10 bg-[var(--card)]/88 p-3.5 backdrop-blur-2xl sm:rounded-[26px] sm:p-5 lg:p-6">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/42 sm:tracking-[0.2em]">
              Make it yours
            </p>
            <h2 className="mt-1.5 font-display text-xl font-black leading-[0.98] tracking-[-0.04em] text-white sm:mt-3 sm:text-3xl sm:leading-[0.95] sm:tracking-[-0.055em]">
              One photo in.
              <br />
              One private clip out.
            </h2>
            <p className="mt-2 text-[11px] font-semibold leading-snug text-white/48 sm:mt-4 sm:text-xs sm:leading-6">
              The invited path is fixed at 9:16 · 5s · 720p. Your finished
              result returns to your account Library.
            </p>
            {sessionBoot === "timeout" ? (
              <div
                className="mt-3 rounded-2xl border border-[#FF6B6B]/35 bg-[#FF6B6B]/10 px-3 py-2.5 sm:mt-4 sm:px-4 sm:py-3"
                data-studio-open-error="session-timeout"
                role="alert"
              >
                <p className="text-[11px] font-semibold leading-5 text-white/85">
                  Could not verify private access in time. Lab preview still
                  works — retry the check or sign in.
                </p>
                <button
                  type="button"
                  onClick={onRetrySession}
                  data-studio-open-retry
                  className="mt-2 inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 text-[10px] font-black uppercase tracking-[0.12em] text-black transition hover:bg-[#c8ff3d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                >
                  Retry access check
                </button>
              </div>
            ) : null}
            <div className="mt-3 grid gap-2 sm:mt-5 sm:gap-3">
              {!signedIn && (
                <Link
                  href={guestSignInHref()}
                  data-guest-create-sign-in
                  className="btn-press inline-flex min-h-12 items-center justify-between rounded-2xl bg-[linear-gradient(135deg,#B14EFF,#FF4ECD)] px-4 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-[0_12px_40px_-12px_rgba(255,78,205,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#151519] sm:min-h-14 sm:px-5 sm:text-xs"
                >
                  Sign in to make yours
                  <span aria-hidden className="text-lg">→</span>
                </Link>
              )}
              <a
                href={PRIVATE_BETA_MAILTO}
                data-guest-create-private-beta
                className={`inline-flex min-h-10 items-center justify-center rounded-2xl border px-4 text-[10px] font-black uppercase tracking-[0.14em] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:min-h-12 sm:px-5 ${
                  signedIn
                    ? "border-[#FF4ECD] bg-[linear-gradient(135deg,#B14EFF,#FF4ECD)] text-white"
                    : "border-white/12 text-white/62 hover:border-white/28 hover:text-white"
                }`}
              >
                Request private beta
              </a>
            </div>
            <p
              className="mt-2.5 text-[10px] font-semibold leading-5 text-white/35 sm:mt-4"
              data-guest-create-not-your-toy
            >
              Sample only · not your toy. The public page never receives or
              sends a visitor photo.
            </p>
          </div>
          <div className="mt-2.5 flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/20 px-3 py-2 text-[9px] font-black uppercase tracking-[0.13em] text-white/38 backdrop-blur-xl sm:mt-4 sm:px-4 sm:py-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7CFFB2]" />
            Owner-only result · no public feed
          </div>
        </div>
      </div>
    </section>
  );
}

export function GuestMomentCreateGate({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [sessionBoot, setSessionBoot] = useState<"checking" | "ready" | "timeout">(
    "checking"
  );
  const [bootNonce, setBootNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Defer so setState is not synchronous inside the effect body.
    const t = window.setTimeout(() => {
      void (async () => {
        setSessionResolved(false);
        setSessionBoot("checking");
        try {
          const next = await fetchMe({ timeoutMs: STUDIO_SESSION_BOOT_MS });
          if (cancelled) return;
          setMe(next);
          setSessionResolved(true);
          setSessionBoot("ready");
        } catch (err) {
          if (cancelled) return;
          // Explicit ClientTimeoutError from 8s /api/me abort — Retry CTA, Lab still up.
          setMe(null);
          setSessionResolved(true);
          setSessionBoot(isClientTimeoutError(err) ? "timeout" : "ready");
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [bootNonce]);

  if (sessionResolved && canUsePrivateLaunch(me)) return children;
  return (
    <GuestMomentPreview
      signedIn={sessionResolved && me?.signedIn === true}
      sessionBoot={sessionBoot}
      onRetrySession={() => setBootNonce((n) => n + 1)}
    />
  );
}
