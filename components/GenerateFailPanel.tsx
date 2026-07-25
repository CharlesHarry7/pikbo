"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/LanguageProvider";

export type FailCreditHint =
  | null
  | "10 restored"
  | "refund unconfirmed"
  | "0 cached"
  | "10 used"
  | string;

/**
 * Shared generate failure surface — Create / Batch / Landing / Image.
 * Always ends with a next action. Optional Retry-After countdown for
 * RATE_LIMITED / JOB_IN_FLIGHT / PROVIDER_NETWORK honesty.
 */
export function GenerateFailPanel({
  message,
  creditState = null,
  creditsRestored = false,
  onRetry,
  retryLabel,
  retryAfterSec = null,
  showLabSample = true,
  showRecipes = true,
  showModules = true,
  compact = false,
  className = "",
}: {
  message?: string | null;
  creditState?: FailCreditHint;
  creditsRestored?: boolean;
  onRetry?: () => void;
  retryLabel?: string;
  /** Seconds until Retry should unlock (server Retry-After). */
  retryAfterSec?: number | null;
  showLabSample?: boolean;
  showRecipes?: boolean;
  showModules?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const restored =
    creditsRestored ||
    creditState === "10 restored" ||
    (typeof creditState === "string" && /restored|refunded/i.test(creditState));
  const unconfirmed = creditState === "refund unconfirmed";

  const initialWait =
    typeof retryAfterSec === "number" && retryAfterSec > 0
      ? Math.ceil(retryAfterSec)
      : 0;
  // Reset countdown when message / retry budget changes (render-time adjust, no effect setState).
  const waitKey = `${message ?? ""}:${initialWait}`;
  const [waitLeft, setWaitLeft] = useState(initialWait);
  const [countdownKey, setCountdownKey] = useState(waitKey);
  if (countdownKey !== waitKey) {
    setCountdownKey(waitKey);
    setWaitLeft(initialWait);
  }

  const counting = waitLeft > 0;
  useEffect(() => {
    if (!counting) return;
    const id = window.setInterval(() => {
      setWaitLeft((w) => (w > 0 ? w - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [counting]);

  if (!message && !restored && !unconfirmed) return null;

  const tone = restored || unconfirmed ? "amber" : "brand";
  const retryText = retryLabel || t("fail.retry");
  const retryLocked = Boolean(onRetry) && waitLeft > 0;

  return (
    <div
      role="alert"
      className={`rounded-xl border shadow-[0_0_24px_rgba(0,0,0,0.25)] ${
        tone === "amber"
          ? "border-amber-400/35 bg-amber-400/[0.07] text-amber-50"
          : "border-[var(--brand)]/40 bg-[var(--brand)]/[0.08] text-[var(--brand)]"
      } ${compact ? "px-3 py-2.5" : "px-3.5 py-3.5"} ${className}`}
    >
      <p
        className={`font-black uppercase tracking-[0.14em] ${
          compact ? "text-[9px]" : "text-[10px]"
        } ${tone === "amber" ? "text-amber-200/80" : "text-[var(--mint)]/90"}`}
      >
        Generate · next step
      </p>
      {message ? (
        <p
          className={`mt-1 font-semibold leading-snug ${
            compact ? "text-xs" : "text-sm"
          } ${tone === "amber" ? "text-amber-50" : "text-[var(--brand)]"}`}
        >
          {message}
        </p>
      ) : null}

      {restored ? (
        <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-amber-200/90">
          {t("fail.restored")}
        </p>
      ) : null}
      {unconfirmed ? (
        <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-amber-200/90">
          {t("fail.unconfirmed")}
        </p>
      ) : null}

      {retryLocked ? (
        <p className="mt-1 font-mono text-[11px] font-bold tabular-nums text-white/55">
          Retry in {waitLeft}s
        </p>
      ) : null}

      <p
        className={`leading-relaxed text-amber-100/70 ${
          compact ? "mt-1 text-[10px]" : "mt-1.5 text-[11px]"
        }`}
      >
        {t("fail.next")}
      </p>

      <div
        className={`flex flex-wrap items-center gap-1.5 ${
          compact ? "mt-1.5" : "mt-2.5"
        }`}
      >
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={retryLocked}
            className="rounded-full bg-[var(--mint)] px-3.5 py-1.5 text-[11px] font-black text-black shadow-[0_0_16px_rgba(200,255,61,0.3)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {retryLocked ? `Wait ${waitLeft}s` : retryText}
          </button>
        ) : null}
        {showLabSample ? (
          <Link
            href="/create?try=1&sample=scout"
            className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/75 transition hover:border-white/30 hover:text-white"
          >
            {t("fail.labSample")}
          </Link>
        ) : null}
        {showRecipes ? (
          <Link
            href="/effects"
            className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/75 transition hover:border-white/30 hover:text-white"
          >
            {t("fail.anotherRecipe")}
          </Link>
        ) : null}
        {showModules ? (
          <Link
            href="/modules"
            className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/75 transition hover:border-white/30 hover:text-white"
          >
            {t("fail.modules")}
          </Link>
        ) : null}
        <Link
          href="/library"
          className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/75 transition hover:border-white/30 hover:text-white"
        >
          Library
        </Link>
      </div>
    </div>
  );
}
