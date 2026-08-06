"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import {
  canLiveGenerate,
  fetchMe,
  freeTrialExhausted,
  type MeResponse,
} from "@/lib/meClient";
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

/**
 * Modules sticky header CTAs — freeTrial honesty (Phase F).
 * Free Mini left/used only when freeLiveOpen; else Cached Lab (parity FreeTrialCta).
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

  const trialDone = freeTrialExhausted(me);
  const clipsLeft =
    typeof me?.freeTrial?.clipsLeft === "number"
      ? me.freeTrial.clipsLeft
      : null;
  /** R0/T6: do not advertise Free Mini while Live is closed (incl. me loading). */
  const freeLiveOpen = Boolean(
    canLiveGenerate(me) &&
      me?.freeTrial?.freeLive &&
      me.freeTrial.freeLive.liveEnabled !== false
  );

  const primaryHref =
    trialDone && freeLiveOpen ? "/pricing" : MODULES_LAB_SAMPLE_HREF;
  const primaryLabel =
    trialDone && freeLiveOpen
      ? "Compare plans"
      : !freeLiveOpen
        ? "Try Lab sample"
        : "Try free · Lab";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {clipsLeft !== null && freeLiveOpen && !trialDone ? (
        <span className="hidden text-[10px] text-white/40 sm:inline">
          ~{clipsLeft} Free Mini left
        </span>
      ) : null}
      {!freeLiveOpen ? (
        <span className="hidden text-[10px] text-white/40 sm:inline">
          Cached Lab preview · 0 credits
        </span>
      ) : null}
      {trialDone && freeLiveOpen ? (
        <span className="hidden text-[10px] font-semibold text-amber-200/90 sm:inline">
          Free Mini used · Lab demos still free
        </span>
      ) : null}
      <Link
        href={primaryHref}
        onClick={() =>
          track({
            event: "landing_view",
            path: "/modules",
            meta: {
              cta:
                trialDone && freeLiveOpen ? "modules_pricing" : "modules_try",
            },
          })
        }
        className="rounded-full bg-[var(--neon-pink)] px-4 py-2 text-xs font-black text-[var(--void)]"
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
