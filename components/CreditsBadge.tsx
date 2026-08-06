"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  canLiveGenerate,
  displayCredits,
  fetchMe,
  freeTrialExhausted,
  isDemoMode,
  type MeResponse,
} from "@/lib/meClient";
import {
  isClientTimeoutError,
  STUDIO_SESSION_BOOT_MS,
} from "@/lib/clientTimeout";
import { CREDITS_PER_VIDEO } from "@/lib/pricing";
import { SESSION_EVENT } from "@/lib/sessionEvents";
import { useI18n } from "@/components/LanguageProvider";

type SessionBoot = "checking" | "ready" | "timeout";

export function CreditsBadge({
  compact,
  tone = "dark",
}: {
  compact?: boolean;
  tone?: "dark" | "light";
}) {
  const { t } = useI18n();
  const [session, setSession] = useState<MeResponse | null>(null);
  const [sessionBoot, setSessionBoot] = useState<SessionBoot>("checking");

  const load = useCallback(() => {
    setSessionBoot("checking");
    void fetchMe({ timeoutMs: STUDIO_SESSION_BOOT_MS })
      .then((data) => {
        setSession(data);
        setSessionBoot("ready");
      })
      .catch((err) => {
        // 8s open contract: fail closed to Lab/unknown — never permanent "…".
        setSession(null);
        setSessionBoot(isClientTimeoutError(err) ? "timeout" : "ready");
      });
  }, []);

  useEffect(() => {
    const t = window.setTimeout(load, 0);
    const onRefresh = () => load();
    window.addEventListener(SESSION_EVENT, onRefresh);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener(SESSION_EVENT, onRefresh);
    };
  }, [load]);

  const dimClass = compact
    ? tone === "light"
      ? "text-[10px] text-[#7C8490]"
      : "text-[10px] text-white/30"
    : "hidden text-xs text-[var(--fg-dim)] sm:inline";

  // Finite checking — only while boot is in flight (≤ ~8s).
  if (sessionBoot === "checking") {
    return (
      <span
        className={dimClass}
        data-credits-boot="checking"
        title="Checking balance…"
      >
        …
      </span>
    );
  }

  // Timeout / soft fail: Lab unknown + Retry — never hang on "…".
  if (sessionBoot === "timeout" || !session) {
    const timeout = sessionBoot === "timeout";
    const title = timeout
      ? "Balance check timed out · Lab unknown · retry"
      : "Balance unavailable · Lab unknown · retry";
    if (compact) {
      return (
        <button
          type="button"
          onClick={() => load()}
          className={`grid h-11 min-w-11 place-items-center rounded-full border px-2 text-[10px] font-bold ${
            tone === "light"
              ? "border-[#C9CED8] text-[#5F6774]"
              : "border-white/10 text-white/45"
          }`}
          title={title}
          data-credits-boot={timeout ? "timeout" : "unknown"}
          data-credits-boot-retry
        >
          Lab
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => load()}
        className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:flex ${
          tone === "light"
            ? "border-[#C9CED8] bg-white text-[#5F6774] hover:border-[#2457E6] hover:text-[#15171B]"
            : "border-white/12 bg-white/[0.04] text-[var(--fg-muted)] hover:border-[var(--mint)]/35 hover:text-[var(--fg)]"
        }`}
        title={title}
        data-credits-boot={timeout ? "timeout" : "unknown"}
        data-credits-boot-retry
      >
        <span className="font-bold tabular-nums text-[var(--fg-dim)]">—</span>
        <span>{t("credits.credits")}</span>
        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--fg-dim)]">
          Lab
        </span>
        <span className="text-[10px] font-semibold text-[var(--mint)]">
          Retry
        </span>
      </button>
    );
  }

  const credits = displayCredits(session);
  const perJob = session.liveJobCredits ?? CREDITS_PER_VIDEO;
  const clips =
    typeof session.freeTrial?.clipsLeft === "number"
      ? session.freeTrial.clipsLeft
      : Math.floor(credits / perJob);
  const low = credits < perJob;
  const demo = isDemoMode(session);
  const signed = Boolean(session.signedIn && session.durable);
  const trialDone = freeTrialExhausted(session);
  const freeLive = session.freeTrial?.freeLive;
  /** R0/T6: Free live Mini is product intent only until liveEnabled. */
  const freeLiveOpen = Boolean(
    canLiveGenerate(session) &&
      freeLive &&
      freeLive.liveEnabled !== false
  );

  const compactTitle = demo
    ? signed
      ? `${credits} account credits · live generation unavailable · cached previews free`
      : "0 credits · cached previews free (upload not processed)"
    : trialDone && freeLiveOpen
      ? `Free Mini display balance ${credits} cr · cached demos still free · compare plans`
      : trialDone
        ? `Cached Lab preview · 0 credits · live gated · compare plans`
        : signed
          ? `${credits} account credits · live generation available`
          : freeLiveOpen
            ? `${credits} cr · Free Mini ${freeLive!.resolution} ${freeLive!.durationSec}s when Live is enabled`
            : "Cached Lab preview · 0 credits · live gated";

  const fullTitle = demo
    ? signed
      ? `${session.planName} · ${credits} account credits · live generation unavailable · cached previews free`
      : `${session.planName} · cached previews · 0 credits`
    : trialDone && freeLiveOpen
      ? `Free Mini display exhausted · cached demos still free · compare plans`
      : trialDone
        ? `Cached Lab preview · 0 credits · live gated · compare plans`
        : signed
          ? `Signed in · ${credits} account credits · live generation available`
          : freeLiveOpen
            ? `Free Mini · ${freeLive!.resolution} · ${freeLive!.durationSec}s · ~${clips} live when enabled · on-player mark`
            : `${session.planName} · Cached Lab preview · 0 credits · live gated`;

  if (compact) {
    return (
      <Link
        href={signed ? "/profile" : "/pricing"}
        className={`grid h-11 min-w-11 place-items-center rounded-full border px-2 text-[10px] font-bold ${
          low && !demo
            ? "border-amber-400/50 text-amber-300"
            : tone === "light"
              ? "border-[#C9CED8] text-[#2457E6]"
              : "border-white/10 text-[var(--mint)]"
        }`}
        title={compactTitle}
        data-credits-boot="ready"
      >
        {credits}
      </Link>
    );
  }

  return (
    <Link
      href={signed ? "/profile" : "/pricing"}
      className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:flex ${
        low && !demo
          ? "border-amber-400/45 bg-amber-400/10 text-[var(--fg)]"
          : tone === "light"
            ? "border-[#C9CED8] bg-white text-[#5F6774] hover:border-[#2457E6] hover:text-[#15171B]"
            : "border-white/12 bg-white/[0.04] text-[var(--fg-muted)] hover:border-[var(--mint)]/35 hover:text-[var(--fg)]"
      }`}
      title={fullTitle}
      data-credits-boot="ready"
    >
      <span
        className={`font-bold tabular-nums ${
          low && !demo
            ? "text-amber-200"
            : tone === "light"
              ? "text-[#2457E6]"
              : "text-[var(--mint)]"
        }`}
      >
        {credits}
      </span>
      <span>{t("credits.credits")}</span>
      {demo ? (
        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--fg-dim)]">
          {t("credits.demo")}
        </span>
      ) : signed ? (
        <span className="rounded-full bg-[var(--mint)]/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--mint)]">
          {t("credits.account")}
        </span>
      ) : low ? (
        <span className="rounded-full bg-[var(--brand)]/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--brand)]">
          {t("credits.upgrade")}
        </span>
      ) : session.plan !== "free" ? (
        <span className="rounded-full bg-[var(--grad-soft)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--fg)]">
          {session.planName}
        </span>
      ) : freeLiveOpen ? (
        <span className="text-[10px] text-[var(--fg-dim)]">~{clips}</span>
      ) : (
        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--fg-dim)]">
          Lab
        </span>
      )}
    </Link>
  );
}
