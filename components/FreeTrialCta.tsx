"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { createLabSampleTryHref } from "@/lib/jobIntents";
import {
  canLiveGenerate,
  fetchMe,
  freeTrialExhausted,
  isDemoMode,
  type MeResponse,
} from "@/lib/meClient";
import { SESSION_EVENT } from "@/lib/sessionEvents";

/** Cached sample try path — remix + try=1&sample=scout. */
const FREE_TRIAL_TRY_HREF = createLabSampleTryHref("scout");

type Variant = "primary" | "ghost" | "mint";

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    "rounded-full bg-[#c8ff3d] px-5 py-2.5 text-xs font-black text-black shadow-[0_0_28px_rgba(200,255,61,0.22)] transition hover:-translate-y-0.5",
  mint: "btn btn-primary !px-4 !py-2 text-xs",
  ghost:
    "btn btn-ghost text-sm",
};

/**
 * Soft-launch primary CTA — never claims public generation when it is closed.
 * The sample path stays cached; exhausted private access → plans.
 */
export function FreeTrialCta({
  path,
  variant = "primary",
  className,
  labelTry,
  labelPlans,
  labelDemo,
  onNavigate,
  hideClipsChip = false,
}: {
  /** Analytics path (e.g. /apps, /explore). */
  path: string;
  variant?: Variant;
  className?: string;
  labelTry?: string;
  labelPlans?: string;
  labelDemo?: string;
  /** Optional side-effect (e.g. dismiss onboarding). */
  onNavigate?: () => void;
  /** Hide ~clipsLeft / trial-used chips (dense rails). */
  hideClipsChip?: boolean;
}) {
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
  /** R0/T6: do not advertise live Free Mini clips while liveEnabled is false. */
  const freeLiveOpen = Boolean(
    canLiveGenerate(me) &&
      me?.freeTrial?.freeLive &&
      me.freeTrial.freeLive.liveEnabled !== false
  );

  // On homepage analytics paths, prefer on-page tool (哥飞: tool not jump-only).
  const onHome =
    path === "/" ||
    path.startsWith("/#") ||
    path.includes("home") ||
    path.includes("product-rail") ||
    path.includes("seedance");
  // Prefer the cached sample when public generation is blocked.
  const href =
    trialDone && !demo && freeLiveOpen
      ? "/pricing"
      : trialDone && !demo
        ? FREE_TRIAL_TRY_HREF
        : demo || !freeLiveOpen
          ? FREE_TRIAL_TRY_HREF
          : onHome
            ? "/#home-create"
            : FREE_TRIAL_TRY_HREF;
  const label =
    trialDone && !demo && freeLiveOpen
      ? labelPlans ?? "Compare plans"
      : demo || !freeLiveOpen
        ? labelDemo ?? "Try cached sample"
        : labelTry ?? "Try free";

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {!hideClipsChip &&
      clipsLeft !== null &&
      !demo &&
      !trialDone &&
      freeLiveOpen ? (
        <span className="hidden text-[10px] text-white/40 sm:inline">
          ~{clipsLeft} Free Mini left
        </span>
      ) : null}
      {!hideClipsChip && !demo && !freeLiveOpen ? (
        <span className="hidden text-[10px] text-white/40 sm:inline">
          Cached preview
        </span>
      ) : null}
      {!hideClipsChip && trialDone && !demo && freeLiveOpen ? (
        <span className="hidden text-[10px] font-semibold text-amber-200/90 sm:inline">
          Free Mini used
        </span>
      ) : null}
      <Link
        href={href}
        onClick={() => {
          track({
            event: "landing_view",
            path,
            meta: {
              cta: trialDone && !demo ? "free_trial_pricing" : "free_trial_try",
            },
          });
          onNavigate?.();
        }}
        className={className ?? VARIANT_CLASS[variant]}
      >
        {label}
      </Link>
    </span>
  );
}
