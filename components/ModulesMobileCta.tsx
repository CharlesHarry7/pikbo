"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { useI18n } from "@/components/LanguageProvider";
import {
  canLiveGenerate,
  fetchMe,
  freeTrialExhausted,
  type MeResponse,
} from "@/lib/meClient";
import {
  isClientTimeoutError,
  STUDIO_SESSION_BOOT_MS,
} from "@/lib/clientTimeout";
import { createLabSampleTryHref } from "@/lib/jobIntents";
import { SESSION_EVENT } from "@/lib/sessionEvents";

/** Lab sample try — remix + try/sample (not bare /create?try=1). */
const MODULES_MOBILE_LAB_SAMPLE_HREF = createLabSampleTryHref("scout");

type SessionBoot = "checking" | "ready" | "timeout";

/** Sticky mobile CTA on Modules wall — above AppShell tab nav */
export function ModulesMobileCta() {
  const { t } = useI18n();
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
    const tmr = window.setTimeout(load, 0);
    window.addEventListener(SESSION_EVENT, load);
    return () => {
      window.clearTimeout(tmr);
      window.removeEventListener(SESSION_EVENT, load);
    };
  }, [load]);

  const sessionKnown = sessionBoot === "ready" && me != null;
  const accessUnknown = !sessionKnown;
  const accessTimedOut = sessionBoot === "timeout";

  const trialDone = sessionKnown ? freeTrialExhausted(me) : false;
  const clipsLeft =
    sessionKnown && typeof me?.freeTrial?.clipsLeft === "number"
      ? me.freeTrial.clipsLeft
      : null;
  /** R0/T6: Free Mini left/used only when Live is open (parity FreeTrialCta). */
  const freeLiveOpen = Boolean(
    sessionKnown &&
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
      : accessUnknown || !freeLiveOpen
        ? "Lab sample"
        : t("modules.mobile.try");
  const hint = accessTimedOut
    ? "Could not verify access · Lab demos still free"
    : accessUnknown
      ? sessionBoot === "checking"
        ? "Checking live eligibility…"
        : "Cached Lab preview · 0 credits · live gated"
      : trialDone && freeLiveOpen
        ? "Free Mini used · Lab demos still free · finite plans"
        : clipsLeft !== null && freeLiveOpen
          ? `One photo · job ready · ~${clipsLeft} Free Mini left`
          : !freeLiveOpen
            ? "Cached Lab preview · 0 credits · live gated"
            : t("modules.mobile.hint");

  return (
    <div
      data-floating-generate="modules"
      data-modules-mobile-boot={sessionBoot}
      className="fixed inset-x-0 bottom-[var(--mobile-nav-clearance)] z-[var(--floating-generate-z)] border-t border-white/10 bg-black/92 px-3 py-2.5 shadow-[0_-12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:hidden"
    >
      <p className="mb-1.5 text-center text-[10px] font-medium text-white/45">
        {hint}
        {accessTimedOut ? (
          <>
            {" · "}
            <button
              type="button"
              onClick={() => load()}
              data-modules-mobile-boot-retry
              className="font-bold text-white/75 underline-offset-2 hover:underline"
              title="Retry access check"
            >
              Retry
            </button>
          </>
        ) : null}
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
                  trialDone && freeLiveOpen
                    ? "try_pricing"
                    : accessUnknown || !freeLiveOpen
                      ? "try_lab"
                      : "try_free",
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
