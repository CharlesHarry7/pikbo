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

type Variant = "primary" | "ghost" | "mint";

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    "rounded-full bg-[#c8ff3d] px-5 py-2.5 text-xs font-black text-black shadow-[0_0_28px_rgba(200,255,61,0.22)] transition hover:-translate-y-0.5",
  mint: "btn btn-primary !px-4 !py-2 text-xs",
  ghost:
    "btn btn-ghost text-sm",
};

/**
 * Soft-launch primary CTA — never claims free live when Free Mini is spent.
 * Lab sample path stays free (cached); exhausted → plans.
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

  const href =
    trialDone && !demo ? "/pricing" : "/create?try=1&sample=scout";
  const label =
    trialDone && !demo
      ? labelPlans ?? "Compare plans"
      : demo
        ? labelDemo ?? "Try Lab sample"
        : labelTry ?? "Try free";

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {!hideClipsChip && clipsLeft !== null && !demo && !trialDone ? (
        <span className="hidden text-[10px] text-white/40 sm:inline">
          ~{clipsLeft} Free Mini left
        </span>
      ) : null}
      {!hideClipsChip && trialDone && !demo ? (
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
