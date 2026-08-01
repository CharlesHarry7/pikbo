"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  canUsePrivateLaunch,
  fetchMe,
  type MeResponse,
} from "@/lib/meClient";
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
  const privateGenerationEnabled =
    privateCount > 0 || canUsePrivateLaunch(me);
  const authReady = isBrowserSupabaseReady() || Boolean(me?.authConfigured);
  const email = me?.auth?.email;

  return (
    <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[0.8rem] border border-white/[0.08] bg-[#1A1A1E] px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#C8FF3D]">
          {signedIn ? email || "Private account Library" : "Guest Library"}
        </p>
        <p className="mt-1 text-[10px] leading-4 text-white/43 sm:text-xs">
          {signedIn
            ? privateCount > 0
              ? `${privateCount} owner-only clip${privateCount === 1 ? "" : "s"} ready`
              : privateGenerationEnabled
                ? "Completed private clips persist here after refresh."
                : "Private generation access is not enabled."
            : authReady
              ? "Sign in to recover private Packs across sessions."
              : "Public preview mode · no private assets are stored here."}
        </p>
      </div>
      <div className="flex items-center gap-1.5 text-[9px] font-semibold">
        {deviceCount > 0 ? (
          <span className="rounded-full border border-white/10 px-2.5 py-1.5 text-white/52">
            {deviceCount} Device-local clip{deviceCount === 1 ? "" : "s"}
          </span>
        ) : null}
        {sessionOpen > 0 ? (
          <span className="rounded-full border border-[#C8FF3D]/30 px-2.5 py-1.5 text-[#C8FF3D]">
            {sessionOpen} in progress
          </span>
        ) : null}
        {!signedIn && authReady ? (
          <Link
            href="/login?next=/library"
            className="rounded-full bg-[#C8FF3D] px-3 py-1.5 text-[#09090B] hover:bg-[#D6FF70]"
          >
            Sign in
          </Link>
        ) : null}
      </div>
    </section>
  );
}
