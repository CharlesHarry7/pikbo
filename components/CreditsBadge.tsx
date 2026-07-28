"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  displayCredits,
  fetchMe,
  freeTrialExhausted,
  isDemoMode,
  type MeResponse,
} from "@/lib/meClient";
import { CREDITS_PER_VIDEO } from "@/lib/pricing";
import { SESSION_EVENT } from "@/lib/sessionEvents";
import { useI18n } from "@/components/LanguageProvider";

export function CreditsBadge({ compact }: { compact?: boolean }) {
  const { t } = useI18n();
  const [session, setSession] = useState<MeResponse | null>(null);

  const load = useCallback(() => {
    void fetchMe().then((data) => {
      if (data) setSession(data);
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

  if (!session) {
    return (
      <span
        className={
          compact
            ? "text-[10px] text-white/30"
            : "hidden text-xs text-[var(--fg-dim)] sm:inline"
        }
      >
        …
      </span>
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
  const freeLiveOpen = Boolean(freeLive && freeLive.liveEnabled !== false);
  const cookieIsLive = session.cookieIsLiveSpendAuthority === true;

  const compactTitle = demo
    ? `${credits} credits · demo-cached free (upload not processed)`
    : trialDone
      ? `Free Mini display balance ${credits} cr · cached demos still free · compare plans`
      : signed
        ? cookieIsLive
          ? `${credits} durable audit · unexpected cookie live-spend claim (R0 expects false)`
          : `${credits} durable wallet (audit) · live needs atomic reserve`
        : freeLiveOpen
          ? `${credits} cr · Free Mini ${freeLive!.resolution} ${freeLive!.durationSec}s when Live is enabled`
          : freeLive
            ? `${credits} cr · Free Mini product caps (${freeLive.resolution} ${freeLive.durationSec}s) · live blocked until T6 · cached demos free`
            : `${credits} credits · cached demos free`;

  const fullTitle = demo
    ? `${session.planName} · demo-cached · live needs ${perJob} credits each when enabled`
    : trialDone
      ? `Free Mini display exhausted · cached demos still free · compare plans`
      : signed
        ? cookieIsLive
          ? `Signed-in · durable shadow ${credits} cr · unexpected cookie live-spend claim (R0 expects false)`
          : `Signed-in · durable audit ${credits} cr · live requires atomic reserve (cookie is not live-spend authority)`
        : freeLiveOpen
          ? `Free Mini · ${freeLive!.resolution} · ${freeLive!.durationSec}s · ~${clips} live when enabled · on-player mark`
          : freeLive
            ? `Free Mini product caps · ${freeLive.resolution} · ${freeLive.durationSec}s · live blocked until T6 · cached demos free`
            : `${session.planName} · ${credits} credits · cached demos free`;

  if (compact) {
    return (
      <Link
        href={signed ? "/profile" : "/pricing"}
        className={`grid h-8 min-w-8 place-items-center rounded-full border px-1.5 text-[10px] font-bold ${
          low && !demo
            ? "border-amber-400/50 text-amber-300"
            : "border-white/10 text-[var(--mint)]"
        }`}
        title={compactTitle}
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
          : "border-white/12 bg-white/[0.04] text-[var(--fg-muted)] hover:border-[var(--mint)]/35 hover:text-[var(--fg)]"
      }`}
      title={fullTitle}
    >
      <span
        className={`font-bold tabular-nums ${
          low && !demo ? "text-amber-200" : "text-[var(--mint)]"
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
