"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import {
  fetchMe,
  freeTrialExhausted,
  isDemoMode,
  type MeResponse,
} from "@/lib/meClient";
import {
  isClientTimeoutError,
  STUDIO_SESSION_BOOT_MS,
} from "@/lib/clientTimeout";
import {
  createGenerate360Href,
  createLabSampleTryHref,
} from "@/lib/jobIntents";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";
import { SESSION_EVENT } from "@/lib/sessionEvents";

/** Default listing recipe when opening full studio from the soft-launch strip. */
const SOFT_LAUNCH_GENERATE_HREF = createGenerate360Href("soft-launch");
/** Demo Lab sample — remix + try/sample (not bare /create?try=1). */
const SOFT_LAUNCH_LAB_SAMPLE_HREF = createLabSampleTryHref("scout");
const SOFT_LAUNCH_MOMENT_HREF =
  `${MOMENT_CREATE_HREF}&source=soft-launch` as const;

type SessionBoot = "checking" | "ready" | "timeout";

/**
 * Soft-launch conversion strip (哥飞 P0): honest free trial + primary Generate CTA.
 * Sits above the fold on Explore home — not a multi-step tour.
 * Reflects Free Mini exhausted state from /api/me when known.
 * 8s wall-clock session boot — never soft-stick Free Mini claims on hung getSession.
 */
export function SoftLaunchStrip() {
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

  const sessionKnown = sessionBoot === "ready" && me != null;
  const demo = sessionKnown ? isDemoMode(me) : false;
  const trialDone = sessionKnown ? freeTrialExhausted(me) : false;
  const freeLive = sessionKnown ? me?.freeTrial?.freeLive : undefined;
  const freeLiveModelLabel =
    freeLive?.modelClass === "seedance-fast" ? "Private Fast" : "Free Mini";
  const clipsLeft =
    sessionKnown && typeof me?.freeTrial?.clipsLeft === "number"
      ? me.freeTrial.clipsLeft
      : null;

  // Fail-closed while checking / after timeout / soft null session:
  // never claim Free Mini live or trial-used until /api/me resolves.
  const accessUnknown = !sessionKnown;
  const accessTimedOut = sessionBoot === "timeout";

  const line = accessTimedOut
    ? "Could not verify live eligibility · Lab demos still free"
    : accessUnknown
      ? sessionBoot === "checking"
        ? "Checking live eligibility…"
        : "Live access is not confirmed · continue with cached Lab prototypes"
      : demo
        ? "Cached Pikbo Lab prototypes · 0 credits · your upload is not processed"
        : trialDone
          ? "Free Mini trial used · Lab demos still free · compare finite plans"
          : freeLive
            ? `${freeLiveModelLabel} · ${freeLive.resolution} · ${freeLive.durationSec}s · live often 1–3 min · refunds when confirmed`
            : "Live access is not confirmed · continue with cached Lab prototypes";

  // Live primary stays first-dollar Moment; Generate secondary is 360 remix.
  // Unknown/timeout → Lab sample only (honest, not free-live claim).
  const primaryHref = accessUnknown
    ? SOFT_LAUNCH_LAB_SAMPLE_HREF
    : trialDone
      ? "/pricing"
      : demo
        ? SOFT_LAUNCH_LAB_SAMPLE_HREF
        : SOFT_LAUNCH_MOMENT_HREF;
  const primaryLabel = accessUnknown
    ? accessTimedOut
      ? "Preview cached Lab video"
      : "Open Lab sample"
    : trialDone
      ? "Compare plans"
      : demo
        ? "Preview cached Lab video"
        : `Create Moment · ${freeLiveModelLabel} 5s`;

  const badgeLabel = accessTimedOut
    ? "Access check timed out"
    : accessUnknown
      ? sessionBoot === "checking"
        ? "Checking access"
        : "Live eligibility"
      : demo
        ? "Cached preview"
        : trialDone
          ? "Trial used"
          : "Live eligibility";

  return (
    <div
      className="border-b border-[#c8ff3d]/25 bg-gradient-to-r from-[#c8ff3d]/[0.12] via-black to-black px-3 py-2.5 sm:px-5"
      data-soft-launch-boot={sessionBoot}
    >
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] leading-snug text-white/80 sm:text-[13px]">
          <span className="font-black text-[#c8ff3d]">{badgeLabel}</span>
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
          {accessTimedOut ? (
            <button
              type="button"
              onClick={() => load()}
              data-soft-launch-boot-retry
              className="rounded-full border border-[#FF6B6B]/45 bg-[#FF6B6B]/15 px-3 py-1.5 text-[12px] font-bold text-white/90 hover:bg-[#FF6B6B]/25"
            >
              Retry
            </button>
          ) : null}
          <Link
            href={primaryHref}
            onClick={() =>
              track({
                event: "landing_view",
                path: "/",
                meta: {
                  cta: trialDone
                    ? "soft_launch_pricing"
                    : accessUnknown
                      ? "soft_launch_lab"
                      : "soft_launch_try",
                },
              })
            }
            className="rounded-full bg-[#c8ff3d] px-4 py-1.5 text-[12px] font-black text-black shadow-[0_0_20px_rgba(200,255,61,0.25)]"
            data-soft-launch-try={
              trialDone
                ? "pricing"
                : accessUnknown || demo
                  ? "lab-sample-remix"
                  : "single-moment"
            }
          >
            {primaryLabel}
          </Link>
          <Link
            href={SOFT_LAUNCH_GENERATE_HREF}
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
            Open Generate
          </Link>
        </div>
      </div>
    </div>
  );
}
