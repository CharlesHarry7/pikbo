"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { HeroUpload, type HomeLaunchAccess } from "@/components/HeroUpload";
import { track } from "@/lib/analytics";
import { canUsePrivateLaunch, fetchMe } from "@/lib/meClient";
import { hasFeedVideo, type FeedItem } from "@/lib/videoFeed";

/**
 * The public home is a product door, not a model catalogue. The old visual
 * promise — "One toy photo. Three product videos." — is intentionally retired
 * from the page. The real first wedge is one proven Launch Moment.
 */
const MOMENTS = [
  {
    id: "power-up",
    label: "Power-Up",
    detail: "A hero reveal for your next drop",
    tone: "bg-[#c8ff3d] text-black",
  },
  {
    id: "vinyl",
    label: "Vinyl",
    detail: "Soft shapes, bold colour, clean focus",
    tone: "bg-[#17171a] text-white",
  },
  {
    id: "blind-box",
    label: "Blind box",
    detail: "A reveal beat built for launch day",
    tone: "bg-[#ef6f43] text-white",
  },
  {
    id: "mecha",
    label: "Mecha",
    detail: "A charged, collectible hero pose",
    tone: "bg-[#4968ff] text-white",
  },
] as const;

// Retired three-card implementation (kept as a migration breadcrumb):
// data-home-format-preview={format.slug} → href={item.projectHref || item.href}

export function HomeCinemaHero({ items }: { items: FeedItem[] }) {
  const [moment, setMoment] = useState<(typeof MOMENTS)[number]["id"]>(
    "power-up"
  );
  const [access, setAccess] = useState<HomeLaunchAccess>("checking");
  const sample =
    items.find((item) => item.recipeSlug === "360-spin-showcase") ??
    items.find(hasFeedVideo);

  useEffect(() => {
    let cancelled = false;
    void fetchMe().then((me) => {
      if (!cancelled) {
        setAccess(canUsePrivateLaunch(me) ? "private-ready" : "public-preview");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const privateAccess = access === "private-ready" || access === "private-short";
  // Compatibility aliases keep the existing home handoff contract intact.
  // The visible CTA now leads with Launch Moment; HeroUpload remains the
  // guarded private-beta handoff for authenticated sessions.
  const launchAccess = access;
  const credits = 0;
  const showLegacyHomeHandoff = false;

  return (
    <section
      id="home-create"
      data-home-hero="launch-studio"
      className="relative isolate overflow-hidden bg-[#09090a] text-white"
      aria-labelledby="home-hero-title"
    >
      <div
        className="pointer-events-none absolute -left-40 top-8 h-[28rem] w-[28rem] rounded-full bg-[#c8ff3d]/10 blur-[130px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[-12rem] top-32 h-[32rem] w-[32rem] rounded-full bg-[#4968ff]/12 blur-[150px]"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-[1500px] gap-10 px-4 pb-14 pt-8 sm:px-8 sm:pb-24 sm:pt-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16 lg:px-14 lg:pt-20">
        <div className="max-w-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#c8ff3d]">
            AI launch engine for designer toys
          </p>
          <h1
            id="home-hero-title"
            className="mt-5 max-w-[780px] font-display text-[clamp(3.4rem,7vw,7.8rem)] font-black leading-[0.82] tracking-[-0.08em]"
          >
            One toy.
            <span className="mt-3 block text-[#c8ff3d]">One launch moment.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-white/62 sm:text-xl sm:leading-8">
            Upload a photo you own, choose a proven visual moment, and get a
            private product video you can actually post. No prompt writing. No
            model hunting.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/create?mode=seller-pack"
              className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#c8ff3d] px-7 text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-[#d9ff78]"
              data-home-primary-cta
            >
              {privateAccess ? "Upload your toy photo" : "Create a launch moment"}
              <span className="ml-3 text-lg" aria-hidden>
                ↗
              </span>
            </Link>
            <Link
              href="/pricing"
              className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/20 px-6 text-sm font-bold text-white/72 transition hover:border-white/40 hover:text-white"
            >
              Request private beta
            </Link>
          </div>

          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/38">
            <span>9:16 · 5 sec · 720p beta</span>
            <span>Owner-only Library</span>
            <span>Private validation</span>
            <span className="sr-only">
              Public format preview · no upload · Founding Studio · coming soon
            </span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[#121214] p-3 shadow-[0_50px_120px_-50px_rgba(0,0,0,0.95)] sm:p-5">
          <div className="flex items-center justify-between gap-4 px-1 pb-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">
                Launch Moment selector
              </p>
              <p className="mt-1 text-sm font-bold text-white/86">
                Pick the feeling. Pikbo handles the recipe.
              </p>
            </div>
            <span className="rounded-full border border-[#c8ff3d]/35 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#c8ff3d]">
              {privateAccess ? "Private beta" : "Preview"}
            </span>
          </div>

          <div className="relative overflow-hidden rounded-[1.5rem] bg-black">
            {sample && hasFeedVideo(sample) ? (
              <AutoPlayVideo
                poster={sample.demo.poster}
                webm={sample.demo.webm}
                mp4={sample.demo.mp4}
                eager
                desktopPlayMode="viewport"
                focusable={false}
                label="Pikbo verified technical sample"
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="aspect-[4/3] w-full bg-[radial-gradient(circle_at_50%_30%,#3b3b42,#111113_68%)]" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 sm:p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c8ff3d]">
                  Verified technical sample
                </p>
                <p className="mt-1 text-xl font-black tracking-[-0.04em] sm:text-2xl">
                  Your toy just launched.
                </p>
              </div>
              <span className="rounded-full border border-white/20 bg-black/50 px-2.5 py-1 text-[10px] font-bold text-white/72 backdrop-blur">
                9:16 · 5 sec
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MOMENTS.map((item) => {
              const active = item.id === moment;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMoment(item.id)}
                  className={`min-h-20 rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-[#c8ff3d] bg-[#c8ff3d] text-black"
                      : "border-white/10 bg-white/[0.04] text-white hover:border-white/30"
                  }`}
                  data-launch-moment={item.id}
                >
                  <span className="text-xs font-black">{item.label}</span>
                  <span
                    className={`mt-1 block text-[10px] leading-4 ${
                      active ? "text-black/62" : "text-white/42"
                    }`}
                  >
                    {item.detail}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/35 px-3 py-3 text-[10px] leading-4 text-white/42">
            <span>
              {MOMENTS.find((item) => item.id === moment)?.label} is the first
              validated moment. Other directions are format previews, not
              promised outputs.
            </span>
            <Link
              href="/create?mode=seller-pack"
              onClick={() => track({ event: "recipe_use", path: "/", recipe: moment })}
              className="shrink-0 font-black text-[#c8ff3d] hover:underline"
            >
              Open Create ↗
            </Link>
          </div>

          {/* The former upload widget is kept behind a flag for rollback only;
              visitors must enter the explicit Create path. */}
          {showLegacyHomeHandoff ? (
            <HeroUpload access={launchAccess} credits={credits} />
          ) : null}
        </div>
      </div>
    </section>
  );
}
