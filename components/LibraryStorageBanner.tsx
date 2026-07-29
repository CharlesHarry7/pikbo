"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchMe, type MeResponse } from "@/lib/meClient";
import { isBrowserSupabaseReady } from "@/lib/supabase/browser";

/** Distinguish private account results from device-only imports. */
export function LibraryStorageBanner({
  deviceCount,
  sessionOpen,
  privateCount = 0,
}: {
  deviceCount: number;
  sessionOpen: number;
  privateCount?: number;
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

  const signedIn =
    privateCount > 0 || Boolean(me?.signedIn && me?.auth?.id);
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
            Saved only in this browser · export JSON to move it
          </p>
        </div>
        <div className="border-b border-white/10 p-4 sm:border-b-0 sm:border-r">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">
            In progress
          </p>
          <p className="mt-1 text-lg font-black tabular-nums text-white">
            {sessionOpen}
            <span className="ml-1 text-xs font-semibold text-white/40">
              open
            </span>
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/45">
            Jobs started in this browser session
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
                {privateCount > 0
                  ? `${privateCount} private clip${privateCount === 1 ? "" : "s"} · owner-only cloud download`
                  : "Signed in · private generations will persist here"}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm font-bold text-white/80">Guest</p>
              <p className="mt-0.5 text-[11px] leading-snug text-white/45">
                {authReady
                  ? "Sign in to save private generations to your account"
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
      <div className="border-t border-white/10 bg-black/30 px-4 py-2">
        <p className="text-[10px] text-white/40">
          Private generations persist by account · device imports stay local
        </p>
      </div>
    </section>
  );
}
