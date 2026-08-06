"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { isClientTimeoutError, STUDIO_SESSION_BOOT_MS } from "@/lib/clientTimeout";
import {
  canUsePrivateLaunch,
  fetchMe,
} from "@/lib/meClient";

const PUBLIC_MOMENT_HREF =
  "/create?effect=street-power-up&source=seller-pack-gate";
const PRIVATE_BETA_MAILTO =
  "mailto:support@pikbo.ai?subject=Pikbo%20private%20beta%20request&body=I%20sell%20designer%20toys%20and%20would%20like%20to%20request%20private%20beta%20access.";

/**
 * The three-output Seller Pack is an internal validation tool, not a public
 * product door. Resolve the authenticated bearer-backed session before any
 * Pack UI is rendered; public and non-invited visitors are sent to the single
 * preset-first Moment workflow instead.
 */
export function PrivateSellerPackGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [sessionBoot, setSessionBoot] = useState<
    "checking" | "ready" | "timeout"
  >("checking");
  const [bootNonce, setBootNonce] = useState(0);

  useEffect(() => {
    let active = true;
    // Defer setState (GuestMomentCreateGate pattern) — avoid set-state-in-effect lint.
    const t = window.setTimeout(() => {
      void (async () => {
        setSessionBoot("checking");
        setResolved(false);
        try {
          const me = await fetchMe({ timeoutMs: STUDIO_SESSION_BOOT_MS });
          if (!active) return;
          const nextAllowed = canUsePrivateLaunch(me);
          setAllowed(nextAllowed);
          setResolved(true);
          setSessionBoot("ready");
          if (!nextAllowed) router.replace(PUBLIC_MOMENT_HREF);
        } catch (err) {
          if (!active) return;
          // 8s open contract: never stick on gate "checking".
          setAllowed(false);
          setResolved(true);
          setSessionBoot(isClientTimeoutError(err) ? "timeout" : "ready");
          if (!isClientTimeoutError(err)) {
            router.replace(PUBLIC_MOMENT_HREF);
          }
        }
      })();
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(t);
    };
  }, [router, bootNonce]);

  if (allowed) return children;

  return (
    <main
      className="grid min-h-[calc(100vh-3.5rem)] place-items-center bg-[#0A0A0A] px-6 text-[#F7F4ED]"
      data-private-seller-pack-gate={
        resolved
          ? sessionBoot === "timeout"
            ? "timeout"
            : "redirecting"
          : "checking"
      }
      data-studio-open-state={sessionBoot}
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
            ? "Could not verify private access in time. Retry the check, open one Moment, or request private beta."
            : "The multi-output Seller Pack is available only to invited validation accounts. Public creation starts with one directed preset and one launch-ready clip."}
        </p>
        {sessionBoot === "timeout" ? (
          <div
            className="mx-auto mt-5 max-w-md rounded-2xl border border-[#FF6B6B]/35 bg-[#FF6B6B]/10 px-4 py-3 text-left"
            data-studio-open-error="session-timeout"
            role="alert"
          >
            <p className="text-[11px] font-semibold leading-5 text-white/85">
              Access check timed out — Pack UI stays closed until verification
              succeeds.
            </p>
            <button
              type="button"
              onClick={() => setBootNonce((n) => n + 1)}
              data-studio-open-retry
              className="mt-2 inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 text-[10px] font-black uppercase tracking-[0.12em] text-black transition hover:bg-[var(--mint)]"
            >
              Retry access check
            </button>
          </div>
        ) : null}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
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
