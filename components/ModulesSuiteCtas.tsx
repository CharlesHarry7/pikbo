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

/** Default listing spin when opening Generate from Modules (remix contract). */
const MODULES_PHOTO_CLIP_HREF = createGenerate360Href("modules-photo-clip");
/** Lab sample try — remix + try/sample (not bare /create?try=1). */
const MODULES_LAB_SAMPLE_HREF = createLabSampleTryHref("scout");
const MODULES_MOMENT_HREF =
  `${MOMENT_CREATE_HREF}&source=modules-suite` as const;

type SessionBoot = "checking" | "ready" | "timeout";

/**
 * Modules sticky header CTAs — freeTrial honesty (Phase F).
 * Trial exhausted → Lab still free + plans; never claim free live when spent.
 * 8s wall-clock session boot — never soft-stick Free Mini labels on hung getSession.
 */
export function ModulesSuiteCtas() {
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
  const accessUnknown = !sessionKnown;
  const accessTimedOut = sessionBoot === "timeout";

  const demo = sessionKnown ? isDemoMode(me) : false;
  const trialDone = sessionKnown ? freeTrialExhausted(me) : false;
  const clipsLeft =
    sessionKnown && typeof me?.freeTrial?.clipsLeft === "number"
      ? me.freeTrial.clipsLeft
      : null;

  // Unknown/timeout → Lab sample only (no Free Mini / plans claim until known).
  const primaryHref =
    accessUnknown
      ? MODULES_LAB_SAMPLE_HREF
      : trialDone && !demo
        ? "/pricing"
        : MODULES_LAB_SAMPLE_HREF;
  const primaryLabel =
    accessUnknown
      ? "Open Lab sample"
      : trialDone && !demo
        ? "Compare plans"
        : demo
          ? "Try Lab sample"
          : "Try free · Lab";

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-modules-suite-boot={sessionBoot}
    >
      {!accessUnknown && clipsLeft !== null && !demo && !trialDone ? (
        <span className="hidden text-[10px] text-white/40 sm:inline">
          ~{clipsLeft} Free Mini left
        </span>
      ) : null}
      {!accessUnknown && trialDone && !demo ? (
        <span className="hidden text-[10px] font-semibold text-amber-200/90 sm:inline">
          Free Mini used · Lab demos still free
        </span>
      ) : null}
      {accessTimedOut ? (
        <button
          type="button"
          onClick={() => load()}
          data-modules-suite-boot-retry
          className="rounded-full border border-white/15 px-2.5 py-1.5 text-[10px] font-bold text-white/70"
          title="Retry access check"
        >
          Retry
        </button>
      ) : null}
      <Link
        href={primaryHref}
        onClick={() =>
          track({
            event: "landing_view",
            path: "/modules",
            meta: {
              cta:
                accessUnknown
                  ? "modules_lab"
                  : trialDone && !demo
                    ? "modules_pricing"
                    : "modules_try",
            },
          })
        }
        className="rounded-full bg-[#c8ff3d] px-4 py-2 text-xs font-black text-black"
        data-modules-lab-sample="remix"
      >
        {primaryLabel}
      </Link>
      <Link
        href={MODULES_PHOTO_CLIP_HREF}
        className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white/80"
        title="One owned toy photo → short listing or social clip"
        data-modules-path="photo-clip"
      >
        Photo → Clip
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
