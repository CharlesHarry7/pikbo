"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { createGenerate360Href } from "@/lib/jobIntents";

/** Default listing recipe when leaving How it works → Generate. */
const HOW_IT_WORKS_GENERATE_HREF = createGenerate360Href("how-it-works");

const STEPS = [
  {
    n: "1",
    t: "Snap your figure",
    d: "One clear photo — full toy, even light, clean background. You must own the rights.",
  },
  {
    n: "2",
    t: "Pick a toy recipe",
    d: "Spin, unbox, dance, shelf — Modules and presets open Generate with the job ready.",
  },
  {
    n: "3",
    t: "Generate with Seedance",
    d: "Eligible Live jobs use a fixed deadline. Failed jobs restore credits only when release is confirmed; TIMEOUT stays unconfirmed.",
  },
  {
    n: "4",
    t: "Library · post or list",
    d: "Your selected clip returns through Library. Check paint, sculpt, and packaging before you publish.",
  },
];

/**
 * How it works process strip.
 *
 * AIT-190 friction cut: one filled primary Generate→360 footer CTA.
 * FreeTrial / Lab sample stay secondary outline; Library + SEO tool are tertiary.
 */
export function HowItWorks() {
  return (
    <section
      className="border-b border-white/10 bg-black px-4 py-16 text-white sm:px-8"
      data-how-primary-generate="360"
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--mint)]">
          Process
        </p>
        <h2 className="mt-2 text-center font-display text-3xl font-black uppercase tracking-tight">
          How it works
        </h2>
        <p className="mx-auto mt-3 max-w-md text-center text-sm text-white/50">
          Four steps from shelf photo to post-ready clip
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <span className="font-display text-3xl font-black text-[var(--mint)]">
                {s.n.padStart(2, "0")}
              </span>
              <h3 className="mt-4 font-semibold tracking-tight text-white">
                {s.t}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{s.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {/* Secondary Free / Lab sample — outline only, not a filled primary. */}
          <FreeTrialCta
            path="/how-it-works"
            labelTry="Try free · Mini 5s"
            labelDemo="Lab sample"
            hideClipsChip
            className="rounded-full border border-white/20 bg-transparent px-3 py-1.5 text-[11px] font-semibold text-white/70 transition hover:border-white/40 hover:text-white"
          />
          {/* One primary Generate → 360 (AIT-190). */}
          <Link
            href={HOW_IT_WORKS_GENERATE_HREF}
            className="rounded-full bg-[#c8ff3d] px-4 py-2 text-[11px] font-black text-black shadow-[0_0_24px_rgba(200,255,61,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_0_32px_rgba(200,255,61,0.4)]"
            data-how-it-works="generate-remix"
            data-how-primary-generate-cta
            onClick={() =>
              track({
                event: "landing_view",
                path: "/how-it-works",
                meta: { cta: "how_primary_generate_360" },
              })
            }
          >
            Generate 360° →
          </Link>
          {/* Tertiary Library + SEO tool — ghost/text only. */}
          <Link
            href="/library"
            className="text-[11px] font-semibold text-white/55 hover:text-white hover:underline"
          >
            Library
          </Link>
          <Link
            href="/tools/ai-toy-video-generator"
            className="text-[11px] font-semibold text-white/55 hover:text-white hover:underline"
          >
            AI toy video generator
          </Link>
        </div>
      </div>
    </section>
  );
}
