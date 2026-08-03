"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
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

  useEffect(() => {
    let active = true;
    void fetchMe().then((me) => {
      if (!active) return;
      const nextAllowed = canUsePrivateLaunch(me);
      setAllowed(nextAllowed);
      setResolved(true);
      if (!nextAllowed) router.replace(PUBLIC_MOMENT_HREF);
    });
    return () => {
      active = false;
    };
  }, [router]);

  if (allowed) return children;

  return (
    <main
      className="grid min-h-[calc(100vh-3.5rem)] place-items-center bg-[#0A0A0A] px-6 text-[#F7F4ED]"
      data-private-seller-pack-gate={resolved ? "redirecting" : "checking"}
    >
      <div className="max-w-xl text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF6846]">
          Pikbo private validation
        </p>
        <h1 className="mt-4 font-display text-5xl font-black leading-[0.92] tracking-[-0.055em] sm:text-6xl">
          Choose one toy Moment.
        </h1>
        <p className="mx-auto mt-5 max-w-md text-sm font-semibold leading-6 text-white/55">
          The multi-output Seller Pack is available only to invited validation
          accounts. Public creation starts with one directed preset and one
          launch-ready clip.
        </p>
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
