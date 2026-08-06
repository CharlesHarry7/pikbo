"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { useI18n } from "@/components/LanguageProvider";
import {
  canLiveGenerate,
  fetchMe,
  freeTrialExhausted,
  type MeResponse,
} from "@/lib/meClient";
import { createLabSampleTryHref } from "@/lib/jobIntents";
import { SESSION_EVENT } from "@/lib/sessionEvents";

/** Lab sample try — remix + try/sample (not bare /create?try=1). */
const MODULES_MOBILE_LAB_SAMPLE_HREF = createLabSampleTryHref("scout");

/** Sticky mobile CTA on Modules wall — above AppShell tab nav */
export function ModulesMobileCta() {
  const { t } = useI18n();
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    function load() {
      void fetchMe().then((d) => {
        if (d) setMe(d);
      });
    }
    const tmr = window.setTimeout(load, 0);
    window.addEventListener(SESSION_EVENT, load);
    return () => {
      window.clearTimeout(tmr);
      window.removeEventListener(SESSION_EVENT, load);
    };
  }, []);

  const trialDone = freeTrialExhausted(me);
  const clipsLeft =
    typeof me?.freeTrial?.clipsLeft === "number"
      ? me.freeTrial.clipsLeft
      : null;
  /** R0/T6: Free Mini left/used only when Live is open (parity FreeTrialCta). */
  const freeLiveOpen = Boolean(
    canLiveGenerate(me) &&
      me?.freeTrial?.freeLive &&
      me.freeTrial.freeLive.liveEnabled !== false
  );

  const primaryHref =
    trialDone && freeLiveOpen
      ? "/pricing"
      : MODULES_MOBILE_LAB_SAMPLE_HREF;
  const primaryLabel =
    trialDone && freeLiveOpen
      ? "Plans"
      : !freeLiveOpen
        ? "Lab sample"
        : t("modules.mobile.try");
  const hint =
    trialDone && freeLiveOpen
      ? "Free Mini used · Lab demos still free · finite plans"
      : clipsLeft !== null && freeLiveOpen
        ? `One photo · job ready · ~${clipsLeft} Free Mini left`
        : !freeLiveOpen
          ? "Cached Lab preview · 0 credits · live gated"
          : t("modules.mobile.hint");

  return (
    <div
      data-floating-generate="modules"
      className="fixed inset-x-0 bottom-[var(--mobile-nav-clearance)] z-[var(--floating-generate-z)] border-t border-white/10 bg-black/92 px-3 py-2.5 shadow-[0_-12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:hidden"
    >
      <p className="mb-1.5 text-center text-[10px] font-medium text-white/45">
        {hint}
      </p>
      <div className="flex gap-2">
        <Link
          href={primaryHref}
          onClick={() =>
            track({
              event: "landing_view",
              path: "/modules",
              meta: {
                cta:
                  trialDone && freeLiveOpen ? "try_pricing" : "try_free",
              },
            })
          }
          className="btn btn-primary min-w-0 flex-[1.4] py-3 text-sm font-black"
          data-modules-mobile-lab="remix"
        >
          {primaryLabel}
        </Link>
        <Link
          href="/create?effect=street-power-up&source=modules-mobile"
          onClick={() =>
            track({
              event: "landing_view",
              path: "/modules",
                meta: { cta: "single_moment" },
            })
          }
          className="btn btn-ghost shrink-0 border border-white/15 px-3 py-3 text-xs font-bold"
        >
          Create Moment
        </Link>
        <Link
          href="/library"
          onClick={() =>
            track({
              event: "landing_view",
              path: "/modules",
              meta: { cta: "library" },
            })
          }
          className="btn btn-ghost shrink-0 border border-white/15 px-3 py-3 text-xs font-bold"
        >
          Library
        </Link>
      </div>
    </div>
  );
}
