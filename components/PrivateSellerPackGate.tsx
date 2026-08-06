"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  canUsePrivateLaunch,
  fetchMe,
} from "@/lib/meClient";
import {
  isClientTimeoutError,
  STUDIO_SESSION_BOOT_MS,
} from "@/lib/clientTimeout";

const PUBLIC_MOMENT_HREF =
  "/create?effect=street-power-up&source=seller-pack-gate";
const PRIVATE_BETA_MAILTO =
  "mailto:support@pikbo.ai?subject=Pikbo%20private%20beta%20request&body=I%20sell%20designer%20toys%20and%20would%20like%20to%20request%20private%20beta%20access.";

type SessionBoot = "checking" | "ready" | "timeout";

/**
 * The three-output Seller Pack is an internal validation tool, not a public
 * product door. Resolve the authenticated bearer-backed session before any
 * Pack UI is rendered; public and non-invited visitors are sent to the single
 * preset-first Moment workflow instead.
 *
 * 8s wall-clock boot — never infinite "checking" when getSession hangs.
 * Timeout fail-closed: do not grant Pack; offer Retry + public Moment exit.
 */
export function PrivateSellerPackGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [sessionBoot, setSessionBoot] = useState<SessionBoot>("checking");

  const load = useCallback(() => {
    setSessionBoot("checking");
    setAllowed(false);
    void fetchMe({ timeoutMs: STUDIO_SESSION_BOOT_MS })
      .then((me) => {
        const nextAllowed = canUsePrivateLaunch(me);
        setAllowed(nextAllowed);
        setSessionBoot("ready");
        if (!nextAllowed) router.replace(PUBLIC_MOMENT_HREF);
      })
      .catch((err) => {
        setAllowed(false);
        setSessionBoot(isClientTimeoutError(err) ? "timeout" : "ready");
        // Non-timeout soft failure: same as denied — public Moment.
        if (!isClientTimeoutError(err)) {
          router.replace(PUBLIC_MOMENT_HREF);
        }
      });
  }, [router]);

  useEffect(() => {
    let active = true;
    const t = window.setTimeout(() => {
      if (!active) return;
      load();
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(t);
    };
  }, [load]);

  if (allowed) return children;

  const gateState =
    sessionBoot === "timeout"
      ? "timeout"
      : sessionBoot === "checking"
        ? "checking"
        : "redirecting";

  return (
    <main
      className="grid min-h-[calc(100vh-3.5rem)] place-items-center bg-[#0A0A0A] px-6 text-[#F7F4ED]"
      data-private-seller-pack-gate={gateState}
      data-private-seller-pack-boot={sessionBoot}
    >
      <div className="max-w-xl text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF6846]">
          Pikbo private validation
        </p>
        <h1 className="mt-4 font-display text-5xl font-black leading-[0.92] tracking-[-0.055em] sm:text-6xl">
          Choose one toy Moment.
        </h1>
        <p className="mx-auto mt-5 max-w-md text-sm font-semibold leading-6 text-white/55">
          {sessionBoot === "timeout"
            ? "Could not verify private access in time. The multi-output Seller Pack stays closed until access is confirmed."
            : sessionBoot === "checking"
              ? "Checking private validation access…"
              : "The multi-output Seller Pack is available only to invited validation accounts. Public creation starts with one directed preset and one launch-ready clip."}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {sessionBoot === "timeout" ? (
            <button
              type="button"
              onClick={() => load()}
              data-private-seller-pack-boot-retry
              className="inline-flex min-h-11 items-center rounded-full border border-white/25 px-6 text-xs font-black text-white"
              title="Retry access check"
            >
              Retry access check
            </button>
          ) : null}
          <Link
            href={PUBLIC_MOMENT_HREF}
            className="inline-flex min-h-11 items-center rounded-full bg-[#FF6846] px-6 text-xs font-black text-black"
          >
            Create one Moment
          </Link>
          <Link
            href={PRIVATE_BETA_MAILTO}
            className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-6 text-xs font-black text-white"
          >
            Request private beta
          </Link>
        </div>
      </div>
    </main>
  );
}
