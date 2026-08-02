"use client";

import { useMemo, useState } from "react";
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
              Choose the moment your toy enters.
            </h1>
          </div>
          <div className="border-l border-[#171719]/20 pl-5 lg:pb-1">
            <p className="max-w-[420px] text-lg font-semibold leading-7 text-[#4A4843]">
              Pick a world. Place your toy inside. Create its first scene.
            </p>
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-[#817D75]">
              Six original directions · private creation is invitation-only
            </p>
          </div>
        </div>

        <MomentStage moment={active} />
        <div className="mt-5">
          <MomentRail moments={MOMENTS} activeId={activeId} onSelect={setActiveId} />
        </div>
      </div>
    </section>
  );
}
