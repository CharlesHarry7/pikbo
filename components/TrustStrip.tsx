"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  canLiveGenerate,
  fetchMe,
  type MeResponse,
} from "@/lib/meClient";
import {
  isClientTimeoutError,
  STUDIO_SESSION_BOOT_MS,
} from "@/lib/clientTimeout";
import { SESSION_EVENT } from "@/lib/sessionEvents";

type SessionBoot = "checking" | "ready" | "timeout";

/**
 * Marketing trust strip. Free Mini product caps only when freeLiveOpen
 * (canLiveGenerate + freeLive.liveEnabled) — fail-closed to Live gated /
 * Cached Lab honesty while public Live is closed, /api/me loading, or 8s timeout.
 */
export function TrustStrip() {
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
        // Fail closed Lab — never soft-stick Free Mini on hung getSession.
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
  const accessTimedOut = sessionBoot === "timeout";

  const freeLive = sessionKnown ? me?.freeTrial?.freeLive : undefined;
  /** R0/T6: never hardcode Free Mini as if public trial is open. */
  const freeLiveOpen = Boolean(
    sessionKnown &&
      canLiveGenerate(me) &&
      freeLive &&
      freeLive.liveEnabled !== false
  );
  const freeLiveModelLabel =
    freeLive?.modelClass === "seedance-fast" ? "Private Fast" : "Free Mini";

  const productCapLine = accessTimedOut
    ? "Access check timed out · Live gated · Cached Lab"
    : sessionBoot === "checking"
      ? "Checking live eligibility…"
      : freeLiveOpen
        ? freeLive
          ? `${freeLiveModelLabel} · ${freeLive.durationSec}s · ${freeLive.resolution} · on-player mark · refunds when confirmed`
          : "Free Mini · 5s · 480p · on-player mark · refunds when confirmed"
        : "Live gated · Cached Lab · refunds when confirmed";

  return (
    <section
      className="border-y border-white/10 bg-gradient-to-r from-black via-[#0a0a0c] to-black px-4 py-5 sm:px-8"
      data-trust-boot={sessionBoot}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center text-xs tracking-wide text-white/50">
        <span>
          <strong className="font-semibold text-[var(--mint)]">Seedance</strong>{" "}
          live path when configured
        </span>
        <span className="hidden h-3 w-px bg-white/15 sm:block" />
        <span>Cached demos clearly labeled</span>
        <span className="hidden h-3 w-px bg-white/15 sm:block" />
        <span
          data-trust-cap={
            accessTimedOut
              ? "timeout"
              : sessionBoot === "checking"
                ? "checking"
                : freeLiveOpen
                  ? "free-live"
                  : "lab-gated"
          }
        >
          {productCapLine}
          {accessTimedOut ? (
            <>
              {" · "}
              <button
                type="button"
                onClick={() => load()}
                data-trust-boot-retry
                className="font-semibold text-white/70 underline-offset-2 hover:text-[var(--mint)] hover:underline"
                title="Retry access check"
              >
                Retry
              </button>
            </>
          ) : null}
        </span>
        <span className="hidden h-3 w-px bg-white/15 sm:block" />
        <span>
          Made for{" "}
          <Link
            href="/for/etsy-listing-videos"
            className="font-medium text-white/80 underline-offset-2 hover:text-[var(--mint)] hover:underline"
          >
            Etsy
          </Link>
          {" · "}
          <Link
            href="/for/tiktok-shop-product-videos"
            className="font-medium text-white/80 underline-offset-2 hover:text-[var(--mint)] hover:underline"
          >
            TikTok Shop
          </Link>
          {" · "}
          <Link
            href="/tools/ai-toy-video-generator"
            className="font-medium text-white/80 underline-offset-2 hover:text-[var(--mint)] hover:underline"
          >
            AI toy video generator
          </Link>
        </span>
      </div>
    </section>
  );
}
