"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { useI18n } from "@/components/LanguageProvider";
import {
  fetchMe,
  freeTrialExhausted,
  isDemoMode,
  type MeResponse,
} from "@/lib/meClient";
import { createLabSampleTryHref } from "@/lib/jobIntents";
import { SESSION_EVENT } from "@/lib/sessionEvents";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

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

  const demo = isDemoMode(me);
  const trialDone = freeTrialExhausted(me);
  const clipsLeft =
    typeof me?.freeTrial?.clipsLeft === "number"
      ? me.freeTrial.clipsLeft
      : null;

  const primaryHref =
    trialDone && !demo ? "/pricing" : MODULES_MOBILE_LAB_SAMPLE_HREF;
  const primaryLabel =
    trialDone && !demo
      ? "Plans"
      : demo
        ? "Lab sample"
        : t("modules.mobile.try");
  const hint =
    trialDone && !demo
      ? "Free Mini used · Lab demos still free · finite plans"
      : clipsLeft !== null && !demo
        ? `One photo · job ready · ~${clipsLeft} Free Mini left`
        : t("modules.mobile.hint");

  return (
    <div className="fixed inset-x-0 bottom-[4.75rem] z-40 border-t border-white/10 bg-black/92 px-3 py-2.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:hidden">
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
                cta: trialDone && !demo ? "try_pricing" : "try_free",
              },
            })
          }
          className="btn btn-primary min-w-0 flex-[1.4] py-3 text-sm font-black"
          data-modules-mobile-lab="remix"
        >
          {primaryLabel}
        </Link>
        <Link
          href={`${MOMENT_CREATE_HREF}&source=modules-mobile`}
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
