"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchMe, type MeResponse } from "@/lib/meClient";
import { isBrowserSupabaseReady } from "@/lib/supabase/browser";

/**
 * HF Library honesty strip — cloud feel without lying about multi-device sync.
 * Layers: device clips · session jobs · optional signed-in identity.
 */
export function LibraryStorageBanner({
  deviceCount,
  sessionOpen,
}: {
  deviceCount: number;
  sessionOpen: number;
}) {
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void fetchMe().then((data) => {
        if (data) setMe(data);
      });
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const signedIn = Boolean(me?.signedIn && me?.auth?.id);
  const authReady = isBrowserSupabaseReady() || Boolean(me?.authConfigured);
  const email = me?.auth?.email;

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent">
      <div className="grid gap-0 sm:grid-cols-3">
        <div className="border-b border-white/10 p-4 sm:border-b-0 sm:border-r">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--mint)]">
            Device
          </p>
          <p className="mt-1 text-lg font-black tabular-nums text-white">
            {deviceCount}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/45">
            Clips in this browser · export JSON to move devices
          </p>
        </div>
        <div className="border-b border-white/10 p-4 sm:border-b-0 sm:border-r">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">
            Session jobs
          </p>
          <p className="mt-1 text-lg font-black tabular-nums text-white">
            {sessionOpen}
            <span className="ml-1 text-xs font-semibold text-white/40">
              open
            </span>
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/45">
            This server process ledger · not multi-node cloud
          </p>
        </div>
        <div className="p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">
            Account
          </p>
          {signedIn ? (
            <>
              <p className="mt-1 truncate text-sm font-bold text-white">
                {email || "Signed in"}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-white/45">
                Identity ready · clip cloud sync still device-local until
                durable assets ship
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm font-bold text-white/80">Guest</p>
              <p className="mt-0.5 text-[11px] leading-snug text-white/45">
                {authReady
                  ? "Sign in to publish live clips to Community"
                  : "Auth not configured · Library stays on-device"}
              </p>
              {authReady ? (
                <Link
                  href="/login?next=/library"
                  className="mt-2 inline-block text-[11px] font-bold text-[var(--mint)] hover:underline"
                >
                  Sign in →
                </Link>
              ) : null}
            </>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black/30 px-4 py-2">
        <p className="text-[10px] text-white/40">
          HF Assets pattern · honest storage labels · no fake multi-device claim
        </p>
        <Link
          href="/community"
          className="text-[10px] font-bold text-[var(--mint)] hover:underline"
        >
          Community wall →
        </Link>
      </div>
    </section>
  );
}
