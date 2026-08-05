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
  return (
    <section
      className="relative isolate min-h-[calc(100vh-56px)] overflow-hidden bg-[var(--void)] px-4 pb-10 pt-6 text-[var(--cream)] sm:px-7 lg:px-10 lg:py-7"
      data-guest-create-first="street-power-up"
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

      <div className="mx-auto grid max-w-[1360px] gap-7 lg:min-h-[calc(100vh-7rem)] lg:grid-cols-[minmax(220px,0.75fr)_minmax(330px,390px)_minmax(260px,0.78fr)] lg:items-center lg:gap-10 xl:gap-14">
        <div className="order-2 max-w-[380px] lg:order-1">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#FF4ECD]">
            Current motion
          </p>
          <h1 className="mt-4 font-display text-[clamp(3rem,4.6vw,5.25rem)] font-black leading-[0.87] tracking-[-0.07em]">
            Street
            <br />
            Power-Up.
          </h1>
          <p className="mt-5 max-w-[330px] text-base font-semibold leading-7 text-white/55">
            A neon, drop-day direction built for designer-toy reveals and
            vertical launch posts.
          </p>
          <div className="mt-6 space-y-3 border-l border-white/10 pl-4 text-[10px] font-black uppercase tracking-[0.14em] text-white/36">
            <p><span className="text-white/72">01</span> Watch the real sample</p>
            <p><span className="text-white/72">02</span> Sign in for private access</p>
            <p><span className="text-white/72">03</span> Find the result in Library</p>
          </div>
        </div>

        <section
          className="order-1 mx-auto w-full max-w-[390px] lg:order-2"
          aria-label="Street Power-Up cached sample"
          data-guest-create-sample
        >
          <div className="relative rounded-[30px] border border-white/12 bg-[var(--card)] p-2 shadow-[0_42px_120px_-42px_rgba(255,32,122,0.62)]">
            <div className="relative aspect-[9/16] max-h-[calc(100vh-11rem)] overflow-hidden rounded-[23px] bg-black">
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
              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
                <span className="rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-xl">
                  Sample · Beatbot
                </span>
                <span className="rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/65 backdrop-blur-xl">
                  Archive · 6s
                </span>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/55 to-transparent px-5 pb-5 pt-24">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#FF4ECD]">
                  Street Power-Up
                </p>
                <div className="mt-1.5 flex items-end justify-between gap-5">
                  <p className="font-display text-2xl font-black tracking-[-0.04em] text-white">
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

        <div className="order-3">
          <div className="rounded-[26px] border border-white/10 bg-[var(--card)]/88 p-5 backdrop-blur-2xl lg:p-6">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/42">
              Make it yours
            </p>
            <h2 className="mt-3 font-display text-3xl font-black leading-[0.95] tracking-[-0.055em] text-white">
              One photo in.
              <br />
              One private clip out.
            </h2>
            <p className="mt-4 text-xs font-semibold leading-6 text-white/48">
              The invited path is fixed at 9:16 · 5s · 720p. Your finished
              result returns to your account Library.
            </p>
            {sessionBoot === "timeout" ? (
              <div
                className="mt-4 rounded-2xl border border-[#FF6B6B]/35 bg-[#FF6B6B]/10 px-4 py-3"
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
            <div className="mt-5 grid gap-3">
              {!signedIn && (
                <Link
                  href={guestSignInHref()}
                  data-guest-create-sign-in
                  className="btn-press inline-flex min-h-14 items-center justify-between rounded-2xl bg-[linear-gradient(135deg,#B14EFF,#FF4ECD)] px-5 text-xs font-black uppercase tracking-[0.12em] text-white shadow-[0_12px_40px_-12px_rgba(255,78,205,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#151519]"
                >
                  Sign in to make yours
                  <span aria-hidden className="text-lg">→</span>
                </Link>
              )}
              <a
                href={PRIVATE_BETA_MAILTO}
                data-guest-create-private-beta
                className={`inline-flex min-h-12 items-center justify-center rounded-2xl border px-5 text-[10px] font-black uppercase tracking-[0.14em] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  signedIn
                    ? "border-[#FF4ECD] bg-[linear-gradient(135deg,#B14EFF,#FF4ECD)] text-white"
                    : "border-white/12 text-white/62 hover:border-white/28 hover:text-white"
                }`}
              >
                Request private beta
              </a>
            </div>
            <p
              className="mt-4 text-[10px] font-semibold leading-5 text-white/35"
              data-guest-create-not-your-toy
            >
              Sample only · not your toy. The public page never receives or
              sends a visitor photo.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-3 text-[9px] font-black uppercase tracking-[0.13em] text-white/38 backdrop-blur-xl">
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
