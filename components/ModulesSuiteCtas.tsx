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
import {
  createGenerate360Href,
  createLabSampleTryHref,
} from "@/lib/jobIntents";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";
import { SESSION_EVENT } from "@/lib/sessionEvents";

/** Primary Generate door — listing spin remix (ratio/duration/channel). */
const MODULES_PHOTO_CLIP_HREF = createGenerate360Href("modules-photo-clip");
/** Lab sample try — remix + try/sample (not bare /create?try=1). */
const MODULES_LAB_SAMPLE_HREF = createLabSampleTryHref("scout");
const MODULES_MOMENT_HREF =
  `${MOMENT_CREATE_HREF}&source=modules-suite` as const;

/**
 * Modules sticky header CTAs — freeTrial honesty (Phase F) + one primary Generate.
 *
 * AIT-232 friction cut: one filled primary Generate→360 CTA.
 * Free / Lab sample / plans stay secondary outline — no second filled primary.
 */
export function ModulesSuiteCtas() {
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
  const clipsLeft =
    typeof me?.freeTrial?.clipsLeft === "number"
      ? me.freeTrial.clipsLeft
      : null;

  // Secondary Free / Lab / plans (outline only — honest exhaustion → pricing).
  const secondaryHref =
    trialDone && !demo ? "/pricing" : MODULES_LAB_SAMPLE_HREF;
  const secondaryLabel =
    trialDone && !demo
      ? "Compare plans"
      : demo
        ? "Try Lab sample"
        : "Try free · Lab";

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-modules-primary-generate="360"
    >
      {clipsLeft !== null && !demo && !trialDone ? (
        <span className="hidden text-[10px] text-white/40 sm:inline">
          ~{clipsLeft} Free Mini left
        </span>
      ) : null}
      {trialDone && !demo ? (
        <span className="hidden text-[10px] font-semibold text-amber-200/90 sm:inline">
          Free Mini used · Lab demos still free
        </span>
      ) : null}
      {/* One primary Generate → 360 (AIT-232). */}
      <Link
        href={MODULES_PHOTO_CLIP_HREF}
        onClick={() =>
          track({
            event: "landing_view",
            path: "/modules",
            meta: { cta: "modules_primary_generate_360" },
          })
        }
        className="rounded-full bg-[#c8ff3d] px-4 py-2 text-xs font-black text-black shadow-[0_0_24px_rgba(200,255,61,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_0_32px_rgba(200,255,61,0.4)]"
        title="One owned toy photo → short listing or social clip"
        data-modules-path="photo-clip"
        data-modules-primary-generate-cta
      >
        Generate 360° →
      </Link>
      {/* Secondary Free / Lab sample / plans — outline only, not a filled primary. */}
      <Link
        href={secondaryHref}
        onClick={() =>
          track({
            event: "landing_view",
            path: "/modules",
            meta: {
              cta: trialDone && !demo ? "modules_pricing" : "modules_try",
            },
          })
        }
        className="rounded-full border border-white/20 bg-transparent px-4 py-2 text-xs font-semibold text-white/70 transition hover:border-white/40 hover:text-white"
        data-modules-lab-sample="remix"
      >
        {secondaryLabel}
      </Link>
      <Link
        href={MODULES_MOMENT_HREF}
        className="rounded-full border border-[var(--mint)]/35 bg-[var(--mint)]/10 px-4 py-2 text-xs font-bold text-[var(--mint)]"
        title="Choose one directed toy Moment"
      >
        Create one Moment
      </Link>
      <Link
        href="/library"
        className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/55"
      >
        Library
      </Link>
      <Link
        href="/flow"
        className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-white/40"
        title="Preview media wall — not a live Seedance job"
      >
        Flow · Preview
      </Link>
    </div>
  );
}
