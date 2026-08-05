"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

/**
 * Floating Generate CTA — same Studio/Moment path as hero + shell (AIT-39).
 * Shows after the first viewport so nav/hero stay the first 3s focus.
 */
export function HomeFloatGenerate() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.55);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      data-home-float-generate={visible ? "on" : "off"}
      className={`pointer-events-none fixed inset-x-0 z-[40] flex justify-center px-3 transition duration-300 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-0 lg:pb-[max(0.85rem,env(safe-area-inset-bottom))] ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <Link
        href={`${MOMENT_CREATE_HREF}&source=home-float`}
        data-home-float-cta="generate"
        prefetch={false}
        tabIndex={visible ? 0 : -1}
        className={`btn-press pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border border-[#FF4ECD]/45 bg-[rgba(10,10,15,0.94)] px-4 py-3 shadow-[0_0_40px_rgba(255,78,205,0.22),0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl transition hover:border-[#FF4ECD] sm:max-w-lg ${
          visible ? "" : "pointer-events-none"
        }`}
      >
        <span className="min-w-0 text-left">
          <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#FF4ECD]">
            Generate
          </span>
          <span className="block truncate text-sm font-black text-white">
            Street Power-Up · Studio
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-[linear-gradient(135deg,#B14EFF,#FF4ECD)] px-4 py-2 text-xs font-black text-white">
          Open →
        </span>
      </Link>
    </div>
  );
}
