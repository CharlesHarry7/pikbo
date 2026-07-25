"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { useI18n } from "@/components/LanguageProvider";

const KEY = "pikbo_onboard_v3";

export function OnboardingBanner() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const tmr = window.setTimeout(() => {
      try {
        if (!localStorage.getItem(KEY)) setShow(true);
      } catch {
        setShow(true);
      }
    }, 0);
    return () => window.clearTimeout(tmr);
  }, []);

  if (!show) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
    setShow(false);
  }

  return (
    <div className="border-b border-[var(--mint)]/20 bg-gradient-to-r from-[var(--mint)]/[0.08] via-black/80 to-black/90 px-4 py-2.5 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-sm">
          <span className="font-bold text-[var(--mint)]">
            {t("onboard.title")}
          </span>
          <span className="text-white/55"> {t("onboard.sub")}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FreeTrialCta
            path="/"
            labelTry={`${t("cta.tryFree")} · Mini 5s`}
            onNavigate={dismiss}
            hideClipsChip
            className="btn btn-primary px-3.5 py-1.5 text-xs font-black"
          />
          <Link
            href="/flow"
            onClick={dismiss}
            className="btn btn-ghost px-3 py-1.5 text-xs"
          >
            {t("nav.flow")}
          </Link>
          <Link
            href="/modules"
            onClick={dismiss}
            className="btn btn-ghost px-3 py-1.5 text-xs"
          >
            {t("nav.modules")}
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="text-xs text-white/40 hover:text-white/70"
          >
            {t("onboard.dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
