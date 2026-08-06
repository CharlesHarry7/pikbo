"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  canLiveGenerate,
  fetchMe,
  type MeResponse,
} from "@/lib/meClient";
import { SESSION_EVENT } from "@/lib/sessionEvents";

/**
 * Marketing trust strip. Free-plan live product caps only when freeLiveOpen
 * (canLiveGenerate + freeLive.liveEnabled) — fail-closed to Live gated /
 * Cached Lab honesty while public Live is closed or /api/me is loading.
 * Open path uses free-plan live wording (parity AIT-411 Lab sample / free-plan).
 */
export function TrustStrip() {
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

  const freeLive = me?.freeTrial?.freeLive;
  /** R0/T6: free-plan live only when Live is open (fail-closed while /api/me loading). */
  const freeLiveOpen = Boolean(
    canLiveGenerate(me) && freeLive && freeLive.liveEnabled !== false
  );
  /** Private Fast invited path may stay; default open path uses free-plan live. */
  const freeLiveModelLabel =
    freeLive?.modelClass === "seedance-fast" ? "Private Fast" : "free-plan live";

  const productCapLine = freeLiveOpen
    ? freeLive
      ? `${freeLiveModelLabel} · ${freeLive.durationSec}s · ${freeLive.resolution} · on-player mark · refunds when confirmed`
      : "free-plan live · 5s · 480p · on-player mark · refunds when confirmed"
    : "Live gated · Cached Lab · refunds when confirmed";

  return (
    <section className="border-y border-white/10 bg-gradient-to-r from-black via-[#0a0a0c] to-black px-4 py-5 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center text-xs tracking-wide text-white/50">
        <span>
          <strong className="font-semibold text-[var(--mint)]">Seedance</strong>{" "}
          live path when configured
        </span>
        <span className="hidden h-3 w-px bg-white/15 sm:block" />
        <span>Cached demos clearly labeled</span>
        <span className="hidden h-3 w-px bg-white/15 sm:block" />
        <span data-trust-cap={freeLiveOpen ? "free-live" : "lab-gated"}>
          {productCapLine}
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
