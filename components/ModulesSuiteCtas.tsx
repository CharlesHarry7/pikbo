"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import {
  fetchMe,
  freeTrialExhausted,
  isDemoMode,
  type MeResponse,
} from "@/lib/meClient";
import { SESSION_EVENT } from "@/lib/sessionEvents";

/**
 * Modules sticky header CTAs — freeTrial honesty (Phase F).
 * Trial exhausted → Lab still free + plans; never claim free live when spent.
 */
export function ModulesSuiteCtas() {
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

  const demo = isDemoMode(me);
  const trialDone = freeTrialExhausted(me);
  const clipsLeft =
    typeof me?.freeTrial?.clipsLeft === "number"
      ? me.freeTrial.clipsLeft
      : null;

  const primaryHref = trialDone && !demo ? "/pricing" : "/create?try=1&sample=scout";
  const primaryLabel =
    trialDone && !demo
      ? "Compare plans"
      : demo
        ? "Try Lab sample"
        : "Try free · Lab";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {clipsLeft !== null && !demo && !trialDone ? (
        <span className="hidden text-[10px] text-white/40 sm:inline">
          ~{clipsLeft} Free Mini left
        </span>
      ) : null}
      {trialDone && !demo ? (
        <span className="hidden text-[10px] font-semibold text-amber-200/90 sm:inline">
          Free Mini used · Lab demos still free
        </span>
      ) : null}
      <Link
        href={primaryHref}
        onClick={() =>
          track({
            event: "landing_view",
            path: "/modules",
            meta: {
              cta: trialDone && !demo ? "modules_pricing" : "modules_try",
            },
          })
        }
        className="rounded-full bg-[#c8ff3d] px-4 py-2 text-xs font-black text-black"
      >
        {primaryLabel}
      </Link>
      <Link
        href="/create"
        className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white/80"
      >
        Video
      </Link>
      <Link
        href="/create?mode=seller-pack"
        className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/55"
      >
        Seller Pack
      </Link>
      <Link
        href="/library"
        className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/55"
      >
        Library
      </Link>
      <Link
        href="/flow"
        className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-white/40"
        title="Preview media wall — not a live Seedance job"
      >
        Flow · Preview
      </Link>
    </div>
  );
}
