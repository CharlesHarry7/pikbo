"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import {
  fetchMe,
  freeTrialExhausted,
  isDemoMode,
  type MeResponse,
} from "@/lib/meClient";
import { SESSION_EVENT } from "@/lib/sessionEvents";

/**
 * Soft-launch conversion strip (哥飞 P0): honest free trial + primary Generate CTA.
 * Sits above the fold on Explore home — not a multi-step tour.
 * Reflects Free Mini exhausted state from /api/me when known.
 */
export function SoftLaunchStrip() {
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    function load() {
      void fetchMe().then((d) => {
        if (d) setMe(d);
      });
    }
    const t = window.setTimeout(load, 0);
    window.addEventListener(SESSION_EVENT, load);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener(SESSION_EVENT, load);
    };
  }, []);

  const demo = isDemoMode(me);
  const trialDone = freeTrialExhausted(me);
  const freeLive = me?.freeTrial?.freeLive;
  const clipsLeft =
    typeof me?.freeTrial?.clipsLeft === "number"
      ? me.freeTrial.clipsLeft
      : null;

  const line = demo
    ? "Demo-cached Lab clips free · live Mini when FAL_KEY is set"
    : trialDone
      ? "Free Mini trial used · Lab demos still free · compare finite plans"
      : freeLive
        ? `Free Mini · ${freeLive.resolution} · ${freeLive.durationSec}s · live often 1–3 min · failed jobs refund`
        : "Free Mini · photo → short video · no card · live often 1–3 min · failed jobs refund";

  // Homepage: keep convert on-page (#home-tool). Elsewhere: studio sample path.
  const primaryHref = trialDone
    ? "/pricing"
    : demo
      ? "/create?try=1&sample=scout"
      : "/#home-tool";
  const primaryLabel = trialDone
    ? "Compare plans"
    : demo
      ? "Try free Lab video"
      : "Try free · Mini 5s";

  return (
    <div className="border-b border-[#c8ff3d]/25 bg-gradient-to-r from-[#c8ff3d]/[0.12] via-black to-black px-3 py-2.5 sm:px-5">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] leading-snug text-white/80 sm:text-[13px]">
          <span className="font-black text-[#c8ff3d]">
            {trialDone && !demo ? "Trial used" : "Free Mini trial"}
          </span>
          <span className="text-white/50"> · </span>
          {line}
          {clipsLeft !== null && !demo && !trialDone ? (
            <span className="text-white/45">
              {" "}
              · ~{clipsLeft} live left
            </span>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={primaryHref}
            onClick={() =>
              track({
                event: "landing_view",
                path: "/",
                meta: {
                  cta: trialDone ? "soft_launch_pricing" : "soft_launch_try",
                },
              })
            }
            className="rounded-full bg-[#c8ff3d] px-4 py-1.5 text-[12px] font-black text-black shadow-[0_0_20px_rgba(200,255,61,0.25)]"
          >
            {primaryLabel}
          </Link>
          <Link
            href="/create"
            onClick={() =>
              track({
                event: "landing_view",
                path: "/",
                meta: { cta: "soft_launch_generate" },
              })
            }
            className="rounded-full border border-white/20 px-3 py-1.5 text-[12px] font-bold text-white/85 hover:border-[#c8ff3d]/40"
          >
            Open Generate
          </Link>
        </div>
      </div>
    </div>
  );
}
