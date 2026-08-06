"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import {
  createGenerate360Href,
  createLabSampleTryHref,
} from "@/lib/jobIntents";
import {
  canLiveGenerate,
  fetchMe,
  freeTrialExhausted,
  isDemoMode,
  type MeResponse,
} from "@/lib/meClient";
import {
  isClientTimeoutError,
  STUDIO_SESSION_BOOT_MS,
} from "@/lib/clientTimeout";
import { SESSION_EVENT } from "@/lib/sessionEvents";

/** Cached sample try path — remix + try=1&sample=scout. */
const FREE_TRIAL_TRY_HREF = createLabSampleTryHref("scout");

type Variant = "primary" | "ghost" | "mint";
type SessionBoot = "checking" | "ready" | "timeout";

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
 * 8s wall-clock session boot — never soft-stick Free Mini chips on hung getSession.
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
  const [sessionBoot, setSessionBoot] = useState<SessionBoot>("checking");

  const load = useCallback(() => {
    setSessionBoot("checking");
    void fetchMe({ timeoutMs: STUDIO_SESSION_BOOT_MS })
      .then((d) => {
        setMe(d);
        setSessionBoot("ready");
      })
      .catch((err) => {
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

  // Fail-closed while checking / after timeout: never claim Free Mini live.
  const sessionKnown = sessionBoot === "ready" && me != null;
  const accessUnknown = !sessionKnown;
  const accessTimedOut = sessionBoot === "timeout";

  const demo = sessionKnown ? isDemoMode(me) : false;
  const trialDone = sessionKnown ? freeTrialExhausted(me) : false;
  const clipsLeft =
    sessionKnown && typeof me?.freeTrial?.clipsLeft === "number"
      ? me.freeTrial.clipsLeft
      : null;
  /** R0/T6: do not advertise live Free Mini clips while liveEnabled is false. */
  const freeLiveOpen = Boolean(
    sessionKnown &&
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
  // Prefer the cached sample when public generation is blocked / access unknown.
  const href =
    accessUnknown
      ? FREE_TRIAL_TRY_HREF
      : trialDone && !demo && freeLiveOpen
        ? "/pricing"
        : trialDone && !demo
          ? FREE_TRIAL_TRY_HREF
          : demo || !freeLiveOpen
            ? FREE_TRIAL_TRY_HREF
            : onHome
              ? createGenerate360Href("free-trial")
              : FREE_TRIAL_TRY_HREF;
  const label =
    accessUnknown
      ? accessTimedOut
        ? labelDemo ?? "Try cached sample"
        : labelDemo ?? "Open Lab sample"
      : trialDone && !demo && freeLiveOpen
        ? labelPlans ?? "Compare plans"
        : demo || !freeLiveOpen
          ? labelDemo ?? "Try cached sample"
          : labelTry ?? "Try free";

  return (
    <span
      className="inline-flex flex-wrap items-center gap-2"
      data-free-trial-boot={sessionBoot}
    >
      {!hideClipsChip &&
      !accessUnknown &&
      clipsLeft !== null &&
      !demo &&
      !trialDone &&
      freeLiveOpen ? (
        <span className="hidden text-[10px] text-white/40 sm:inline">
          ~{clipsLeft} Free Mini left
        </span>
      ) : null}
      {!hideClipsChip && accessTimedOut ? (
        <span className="hidden text-[10px] text-white/40 sm:inline">
          Access check timed out
        </span>
      ) : null}
      {!hideClipsChip &&
      !accessUnknown &&
      !demo &&
      !freeLiveOpen ? (
        <span className="hidden text-[10px] text-white/40 sm:inline">
          Cached preview
        </span>
      ) : null}
      {!hideClipsChip &&
      !accessUnknown &&
      trialDone &&
      !demo &&
      freeLiveOpen ? (
        <span className="hidden text-[10px] font-semibold text-amber-200/90 sm:inline">
          Free Mini used
        </span>
      ) : null}
      {accessTimedOut ? (
        <button
          type="button"
          onClick={() => load()}
          data-free-trial-boot-retry
          className="rounded-full border border-white/15 px-2.5 py-1.5 text-[10px] font-bold text-white/70"
          title="Retry access check"
        >
          Retry
        </button>
      ) : null}
      <Link
        href={href}
        onClick={() => {
          track({
            event: "landing_view",
            path,
            meta: {
              cta:
                accessUnknown
                  ? "free_trial_lab"
                  : trialDone && !demo
                    ? "free_trial_pricing"
                    : "free_trial_try",
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
