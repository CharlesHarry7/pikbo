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
import { createLabSampleTryHref } from "@/lib/jobIntents";
import { createRemixHref } from "@/lib/remixIntent";
import { SESSION_EVENT } from "@/lib/sessionEvents";

/** Default listing recipe when opening full studio from the soft-launch strip. */
const SOFT_LAUNCH_GENERATE_EFFECT = "360-spin-showcase";
/** Demo Lab sample — remix + try/sample (not bare /create?try=1). */
const SOFT_LAUNCH_LAB_SAMPLE_HREF = createLabSampleTryHref("scout");

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
  const freeLiveModelLabel =
    freeLive?.modelClass === "seedance-fast" ? "Private Fast" : "Free Mini";
  const clipsLeft =
    typeof me?.freeTrial?.clipsLeft === "number"
      ? me.freeTrial.clipsLeft
      : null;

  // HF-class campaign energy first; honesty stays secondary (no fake live).
  const badge = demo
    ? "FREE TOY LAB"
    : trialDone
      ? "Trial used"
      : freeLive
        ? freeLiveModelLabel
        : "Live eligibility";
  const line = demo
    ? "8 designer-toy video recipes · watch free · generate with your figure when signed in"
    : trialDone
      ? "Free Mini used · Lab demos still free · compare finite plans"
      : freeLive
        ? `${freeLive.resolution} · ${freeLive.durationSec}s · live often 1–3 min · refunds when confirmed`
        : "Continue with cached Lab · private live for invited sellers";

  // Keep every public conversion on one preset-first Moment.
  const primaryHref = trialDone
    ? "/pricing"
    : demo
      ? `/create?effect=${SOFT_LAUNCH_GENERATE_EFFECT}&source=soft-launch`
      : "/create?effect=street-power-up&source=soft-launch";
  const primaryLabel = trialDone
    ? "Compare plans"
    : demo
      ? "Generate"
      : `Generate · ${freeLiveModelLabel} 5s`;
  const secondaryHref = demo
    ? SOFT_LAUNCH_LAB_SAMPLE_HREF
    : createRemixHref(SOFT_LAUNCH_GENERATE_EFFECT);
  const secondaryLabel = demo ? "Watch Lab sample" : "Open studio";

  return (
    <div className="border-b border-[#c8ff3d]/30 bg-gradient-to-r from-[#c8ff3d]/[0.16] via-black to-black px-3 py-3 sm:px-5">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] leading-snug text-white/85 sm:text-[13px]">
          <span className="font-black uppercase tracking-[0.12em] text-[#c8ff3d]">
            {badge}
          </span>
          <span className="text-white/45"> · </span>
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
            data-soft-launch-try={
              trialDone ? "pricing" : demo ? "generate" : "single-moment"
            }
          >
            {primaryLabel}
          </Link>
          <Link
            href={secondaryHref}
            onClick={() =>
              track({
                event: "landing_view",
                path: "/",
                meta: { cta: "soft_launch_generate" },
              })
            }
            className="rounded-full border border-white/20 px-3 py-1.5 text-[12px] font-bold text-white/85 hover:border-[#c8ff3d]/40"
            data-soft-launch="generate-remix"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
