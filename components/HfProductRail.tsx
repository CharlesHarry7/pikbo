"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { createGenerate360Href } from "@/lib/jobIntents";
import {
  canLiveGenerate,
  fetchMe,
  type MeResponse,
} from "@/lib/meClient";
import {
  isClientTimeoutError,
  STUDIO_SESSION_BOOT_MS,
} from "@/lib/clientTimeout";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";
import { SESSION_EVENT } from "@/lib/sessionEvents";

/** Primary Generate door — listing spin remix (ratio/duration/channel). */
const GENERATE_REMIX_HREF = createGenerate360Href("hf-product-rail");
/** Moment door — mode=moment contract + honest source (never bare /create). */
const MOMENT_RAIL_HREF = `${MOMENT_CREATE_HREF}&source=hf-product-rail` as const;

/**
 * HF homepage product entry strip — media-backed capability cards.
 * Only real Pikbo paths; Video is first and hot. Owned Lab posters only.
 * Below-fold suite density under Moment hero (AIT-241); secondary to hero CTA.
 * Free Mini product-cap blurb only when freeLiveOpen (parity FreeTrialCta).
 * 8s wall-clock session boot — never soft-stick Free Mini on hung getSession.
 */
/** Product doors first; Flow/Cinema/Image are Preview (not live job peers). */
const PRODUCTS: {
  href: string;
  title: string;
  blurb: string;
  tag: string;
  hot?: boolean;
  /** Index into DEMO_VIDEOS for poster background */
  demoIndex: number;
}[] = [
  {
    href: GENERATE_REMIX_HREF,
    title: "Seedance Video",
    blurb: "Photo → short video",
    tag: "Video",
    hot: true,
    demoIndex: 0,
  },
  {
    href: MOMENT_RAIL_HREF,
    title: "Street Power-Up Moment",
    blurb: "1 directed video · one photo",
    tag: "Toy Moment",
    hot: true,
    demoIndex: 3,
  },
  {
    href: "/modules",
    title: "Modules",
    blurb: "Fixed video jobs",
    tag: "Jobs",
    hot: true,
    demoIndex: 2,
  },
  {
    href: "/effects",
    title: "Viral Presets",
    blurb: "Full recipe wall",
    tag: "Presets",
    hot: true,
    demoIndex: 4,
  },
  {
    href: "/flow",
    title: "Flow",
    blurb: "Preview media wall",
    tag: "Preview",
    demoIndex: 1,
  },
  {
    href: "/cinema",
    title: "Cinema",
    blurb: "Director board · Preview",
    tag: "Preview",
    demoIndex: 2,
  },
  {
    href: "/image",
    title: "Image",
    blurb: "Stills · then animate",
    tag: "Preview",
    demoIndex: 3,
  },
];

type SessionBoot = "checking" | "ready" | "timeout";

export function HfProductRail() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [sessionBoot, setSessionBoot] = useState<SessionBoot>("checking");

  const load = useCallback(() => {
    setSessionBoot("checking");
    void fetchMe({ timeoutMs: STUDIO_SESSION_BOOT_MS })
      .then((d) => {
        setMe(d);
        setSessionBoot("ready");
      })
      .catch((err) => {
        // Fail closed Lab — never Free Mini claim while unknown/timeout.
        setMe(null);
        setSessionBoot(isClientTimeoutError(err) ? "timeout" : "ready");
      });
  }, []);

  useEffect(() => {
    const t = window.setTimeout(load, 0);
    window.addEventListener(SESSION_EVENT, load);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener(SESSION_EVENT, load);
    };
  }, [load]);

  const sessionKnown = sessionBoot === "ready" && me != null;
  const accessTimedOut = sessionBoot === "timeout";
  const accessUnknown = !sessionKnown;

  /** R0/T6: Free Mini 5s only when Live is open (fail-closed while loading/timeout). */
  const freeLiveOpen = Boolean(
    sessionKnown &&
      canLiveGenerate(me) &&
      me?.freeTrial?.freeLive &&
      me.freeTrial.freeLive.liveEnabled !== false
  );
  const freeCardBlurb = accessTimedOut
    ? "Access check timed out · Cached Lab"
    : accessUnknown
      ? "Checking access… · Lab sample"
      : freeLiveOpen
        ? "Lab sample · Free Mini 5s"
        : "Cached Lab · 0 credits · Live gated";
  const headerTryLabel = freeLiveOpen
    ? "Try free · Mini 5s"
    : "Try free · Lab sample";
  const headerDemoLabel = "Lab sample · 0 credits";

  return (
    <section
      id="hf-product-rail"
      data-home-suite-rail="hf-product"
      data-hf-product-rail="true"
      data-hf-rail-boot={sessionBoot}
      className="border-b border-[var(--border)] bg-white px-3 py-5 sm:px-5"
      aria-label="Generate suite"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--brand)]">
              Suite
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
              Generate 360° and more Lab doors · secondary to the Moment above
              {accessTimedOut ? (
                <>
                  {" · "}
                  <button
                    type="button"
                    onClick={() => load()}
                    data-hf-rail-boot-retry
                    className="font-bold text-[var(--fg-muted)] underline-offset-2 hover:text-[var(--brand)] hover:underline"
                    title="Retry access check"
                  >
                    Retry
                  </button>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <FreeTrialCta
              path="/#product-rail"
              labelTry={headerTryLabel}
              labelDemo={headerDemoLabel}
              hideClipsChip
              className="text-[11px] font-bold text-[var(--brand)] hover:underline"
            />
            <Link
              href={GENERATE_REMIX_HREF}
              className="text-[11px] font-bold text-[var(--brand)] hover:underline"
              data-hf-rail-generate="remix"
              data-home-suite-360
            >
              Generate 360° →
            </Link>
          </div>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Free card — Free Mini product caps only when freeLiveOpen */}
          <div className="group relative h-[9.5rem] w-[8.5rem] shrink-0 overflow-hidden rounded-2xl border border-[var(--brand)]/30 bg-[var(--brand)]/[0.06] p-3.5 shadow-[0_0_24px_rgba(255,78,205,0.08)] sm:h-[11rem] sm:w-[10rem]">
            <span className="relative z-10 inline-flex rounded-full bg-[var(--brand)] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
              Free
            </span>
            <p className="relative z-10 mt-2 text-[13px] font-black leading-tight text-[var(--fg)]">
              <FreeTrialCta
                path="/#product-rail-card"
                labelTry={freeLiveOpen ? "Try free · Mini 5s" : "Lab sample"}
                labelDemo="Lab sample"
                labelPlans="Plans"
                hideClipsChip
                className="font-black text-[var(--fg)] group-hover:text-[var(--brand)]"
              />
            </p>
            <p
              className="relative z-10 mt-1 text-[10px] leading-snug text-[var(--fg-muted)]"
              data-hf-rail-free-cap={
                accessTimedOut
                  ? "timeout"
                  : accessUnknown
                    ? "checking"
                    : freeLiveOpen
                      ? "free-live"
                      : "lab-gated"
              }
            >
              {freeCardBlurb}
            </p>
          </div>
          {PRODUCTS.map((p) => {
            const demo = DEMO_VIDEOS[p.demoIndex % DEMO_VIDEOS.length];
            return (
              <Link
                key={p.href + p.title}
                href={p.href}
                onClick={() =>
                  track({
                    event: "landing_view",
                    path: "/",
                    meta: { cta: "hf_product_rail", label: p.title },
                  })
                }
                className={`group relative h-[9.5rem] w-[8.5rem] shrink-0 overflow-hidden rounded-2xl border transition duration-200 hover:-translate-y-0.5 sm:h-[11rem] sm:w-[10rem] ${
                  p.hot
                    ? "border-[var(--neon-pink)]/50 shadow-[0_0_32px_rgba(255,78,205,0.14)]"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={demo.poster}
                  alt=""
                  width={200}
                  height={280}
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${
                    p.hot
                      ? "from-black/70 via-black/40 to-black/10"
                      : "from-black/60 via-black/30 to-transparent"
                  }`}
                />
                <div className="relative z-10 flex h-full flex-col justify-between p-3">
                  <span
                    className={`inline-flex w-fit rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                      p.hot
                        ? "bg-[var(--brand)] text-white"
                        : "border border-white/30 bg-black/30 text-white/80 backdrop-blur"
                    }`}
                  >
                    {p.tag}
                  </span>
                  <div>
                    <p className="text-[13px] font-black leading-tight text-white group-hover:text-[var(--brand)]">
                      {p.title}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-white/60">
                      {p.blurb}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
