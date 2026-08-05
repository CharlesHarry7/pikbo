"use client";

import { createRemixHref } from "@/lib/remixIntent";
import { createWorkbenchHref } from "@/lib/jobIntents";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DEMO_VIDEOS } from "@/lib/demoVideos";

/** Full-bleed rotating hero — first thing users see (HF-style immersion) */
export function HeroVideoBanner() {
  const [idx, setIdx] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const demo = DEMO_VIDEOS[idx % DEMO_VIDEOS.length];

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % DEMO_VIDEOS.length);
    }, 7000);
    return () => window.clearInterval(t);
  }, [reducedMotion]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (reducedMotion) {
      v.pause();
      return;
    }
    v.play().catch(() => undefined);
  }, [idx, reducedMotion]);

  return (
    <section className="relative h-[min(72vh,640px)] w-full overflow-hidden border-b border-[var(--border)]">
      <video
        key={demo.id}
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        poster={demo.poster}
        muted
        loop
        playsInline
        autoPlay={!reducedMotion}
        preload="metadata"
      >
        <source src={demo.webm} type="video/webm" />
        <source src={demo.mp4} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-black/50 to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />

      <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-10 pt-20 sm:px-8 sm:pb-12">
        <div className="max-w-xl">
          <p className="section-label">Seedance · designer toys</p>
          <h1 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            One figure photo.
            <br />
            <span className="text-[var(--mint)]">Listing & viral clips.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
            Cached Lab prototype Pikbo example — not your upload. Open this recipe with
            an owned-toy photo; live provider results can vary.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={createWorkbenchHref()}
              className="btn btn-primary px-6 py-3 text-sm"
              data-hero-try-photo="remix"
            >
              Try with my photo
            </Link>
            <Link
              href={createRemixHref(demo.preset, demo.id)}
              className="btn btn-ghost border-white/20 px-6 py-3 text-sm"
            >
              Try this recipe
            </Link>
          </div>
        </div>

        {/* Mini filmstrip of demos */}
        <div className="mt-8 flex gap-2 overflow-x-auto pb-1">
          {DEMO_VIDEOS.map((d, i) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`Show ${d.title} cached example`}
              aria-pressed={i === idx}
              className={`relative h-14 w-10 shrink-0 overflow-hidden rounded-lg border transition sm:h-16 sm:w-12 ${
                i === idx
                  ? "border-[var(--mint)] ring-1 ring-[var(--mint)]"
                  : "border-white/15 opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={d.poster}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
