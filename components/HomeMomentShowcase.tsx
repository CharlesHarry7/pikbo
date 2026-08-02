"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MomentRail } from "@/components/MomentRail";
import { MomentStage } from "@/components/MomentStage";
import {
  DEFAULT_MOMENT_ID,
  getMoment,
  MOMENTS,
  type MomentId,
} from "@/lib/moments";

export function HomeMomentShowcase() {
  const [activeId, setActiveId] = useState<MomentId>(DEFAULT_MOMENT_ID);
  const active = useMemo(() => getMoment(activeId), [activeId]);

  return (
    <section
      id="moment-stage"
      className="min-h-[calc(100vh-64px)] bg-[#F2EFE7] px-4 pb-10 pt-8 text-[#171719] sm:px-7 lg:px-10 lg:pb-7 lg:pt-7"
      data-home-moment-showcase
    >
      <div className="mx-auto max-w-[1360px]">
        <div className="mb-7 grid gap-5 lg:grid-cols-[minmax(0,820px)_minmax(360px,1fr)] lg:items-end">
          <div>
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#F04E30]">
              Pikbo · Toy moments
            </p>
            <h1 className="max-w-[820px] font-display text-[clamp(3.4rem,6.1vw,5.55rem)] font-black leading-[0.84] tracking-[-0.07em]">
              Upload your toy. Pick its moment.
            </h1>
          </div>
          <div className="border-l border-[#171719]/20 pl-5 lg:pb-1">
            <p className="max-w-[420px] text-lg font-semibold leading-7 text-[#4A4843]">
              Start with a photo you own. Preview the composition, then continue
              to private generation when your seller access is ready.
            </p>
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-[#817D75]">
              Upload · pick · preview · private creation is invitation-only
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-3 border-y border-[#171719]/20 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F04E30]">
              First real Moment contract
            </p>
            <p className="mt-1 text-sm font-semibold text-[#45433F]">
              Street Power-Up · one owned photo → one private 9:16 · 5s · 720p clip
            </p>
          </div>
          <Link
            href="/create?mode=moment&effect=street-power-up"
            className="inline-flex min-h-12 items-center justify-between gap-8 rounded-full bg-[#171719] px-5 text-xs font-black uppercase tracking-[0.12em] text-[#F5F1E8] transition-transform hover:-translate-y-0.5"
            data-real-moment-cta
          >
            Try the real Moment
            <span aria-hidden className="text-lg">↗</span>
          </Link>
        </div>

        <MomentStage moment={active} />
        <div className="mt-5">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#817D75]">
            Six concept directions · choose one to preview with your toy
          </p>
          <MomentRail moments={MOMENTS} activeId={activeId} onSelect={setActiveId} />
        </div>
      </div>
    </section>
  );
}
