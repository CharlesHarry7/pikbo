"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  canUsePrivateLaunch,
  fetchMe,
  type MeResponse,
} from "@/lib/meClient";
import {
  isClientTimeoutError,
  STUDIO_SESSION_BOOT_MS,
} from "@/lib/clientTimeout";
import { isBrowserSupabaseReady } from "@/lib/supabase/browser";

type SessionBoot = "checking" | "ready" | "timeout";

/**
 * Distinguish private account results from device-only imports.
 * 8s wall-clock /api/me boot — never soft-stick Guest/Account labels on hang.
 */
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
  const [sessionBoot, setSessionBoot] = useState<SessionBoot>("checking");

  const load = useCallback(() => {
    setSessionBoot("checking");
    void fetchMe({ timeoutMs: STUDIO_SESSION_BOOT_MS })
      .then((data) => {
        setMe(data);
        setSessionBoot("ready");
      })
      .catch((err) => {
        setMe(null);
        setSessionBoot(isClientTimeoutError(err) ? "timeout" : "ready");
      });
  }, []);

  useEffect(() => {
    const t = window.setTimeout(load, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const sessionKnown = sessionBoot === "ready" && me != null;
  const accessUnknown = !sessionKnown;
  const accessTimedOut = sessionBoot === "timeout";

  // Owner evidence from privateCount is independent of /api/me; session labels
  // only claim signed-in / private access when me is known (or privateCount > 0).
  const signedIn =
    privateCount > 0 ||
    (sessionKnown && Boolean(me?.signedIn && me?.auth?.id));
  const privateGenerationEnabled =
    privateCount > 0 || (sessionKnown && canUsePrivateLaunch(me));
  const authReady =
    isBrowserSupabaseReady() ||
    (sessionKnown && Boolean(me?.authConfigured));
  const email = sessionKnown ? me?.auth?.email : undefined;

  const accountLabel = accessTimedOut
    ? "Access check timed out"
    : accessUnknown && sessionBoot === "checking" && privateCount === 0
      ? "Checking account…"
      : signedIn
        ? email || "Signed in"
        : "Guest";

  const accountDetail = accessTimedOut
    ? "Could not verify account in time · device imports still local"
    : accessUnknown && sessionBoot === "checking" && privateCount === 0
      ? "Verifying whether private results are available…"
      : signedIn
        ? privateCount > 0
          ? `${privateCount} private clip${privateCount === 1 ? "" : "s"} · owner-only cloud download`
          : privateGenerationEnabled
            ? "Private generation access enabled · completed clips persist here"
            : "Signed in · private generation access is not enabled"
        : authReady
          ? "Sign in to save private generations to your account"
          : "Auth not configured · Library stays on-device";

  return (
    <section
      className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent"
      data-library-storage-boot={sessionBoot}
    >
      <div className="grid gap-0 sm:grid-cols-3">
        <div className="border-b border-white/10 p-4 sm:border-b-0 sm:border-r">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--mint)]">
            Device
          </p>
          <p className="mt-1 text-lg font-black tabular-nums text-white">
            {deviceCount}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/45">
            Saved only in this browser
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
          <p className="mt-1 truncate text-sm font-bold text-white">
            {accountLabel}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/45">
            {accountDetail}
            {accessTimedOut ? (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() => load()}
                  data-library-storage-boot-retry
                  className="font-bold text-[var(--mint)] underline-offset-2 hover:underline"
                  title="Retry access check"
                >
                  Retry
                </button>
              </>
            ) : null}
          </p>
          {!signedIn && !accessUnknown && authReady ? (
            <Link
              href="/login?next=/library"
              className="mt-2 inline-block text-[11px] font-bold text-[var(--mint)] hover:underline"
            >
              Sign in →
            </Link>
          ) : null}
          {accessTimedOut && authReady ? (
            <Link
              href="/login?next=/library"
              className="mt-2 inline-block text-[11px] font-bold text-[var(--mint)] hover:underline"
            >
              Sign in →
            </Link>
          ) : null}
        </div>
      </div>
      <div className="border-t border-white/10 bg-black/30 px-4 py-2">
        <p className="text-[10px] text-white/40">
          Private results persist by account when access is enabled · device
          imports stay local
        </p>
      </div>
    </section>
  );
}
