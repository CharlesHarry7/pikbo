"use client";

import Image from "next/image";
import Link from "next/link";
import type { PikboMoment } from "@/lib/moments";

export function MomentStage({ moment }: { moment: PikboMoment }) {
  return (
    <div className="grid min-h-0 gap-6 lg:grid-cols-[minmax(0,800px)_minmax(360px,1fr)]">
      <div
        key={moment.id}
        className="moment-stage-enter relative aspect-video min-h-0 overflow-hidden rounded-[10px] bg-[#171719]"
      >
        <Image
          src={moment.media}
          alt={moment.alt}
          fill
          priority={moment.id === "capsule-reveal"}
          sizes="(min-width: 1024px) 800px, 100vw"
          className="object-cover"
          style={{ objectPosition: moment.objectPosition }}
        />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/65 to-transparent" />
        <span className="absolute left-4 top-4 border border-white/55 bg-black/45 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-sm">
          Official Concept
        </span>
        <span className="absolute bottom-4 left-4 text-[10px] font-black uppercase tracking-[0.18em] text-white/75">
          Original Pikbo art direction
        </span>
      </div>

      <aside className="flex min-h-full flex-col border-y border-[#171719]/20 py-5 lg:py-7">
        <div className="flex items-center justify-between gap-4 text-[10px] font-black uppercase tracking-[0.18em] text-[#6D6A63]">
          <span>{moment.evidence}</span>
          <span>{moment.toyType}</span>
        </div>
        <div className="my-auto py-8">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#F04E30]">
            {moment.useLabel} moment
          </p>
          <h2 className="mt-3 max-w-[500px] font-display text-[clamp(2.4rem,4.2vw,4.75rem)] font-black leading-[0.86] tracking-[-0.065em] text-[#171719]">
            {moment.name}
          </h2>
          <p className="mt-5 max-w-md text-[17px] font-semibold leading-7 text-[#45433F]">
            {moment.desire}
          </p>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.16em] text-[#79756D]">
            For {moment.sellerUse}
          </p>
        </div>
        <Link
          href={`/create?moment=${moment.id}`}
          className="group inline-flex min-h-14 items-center justify-between border-t border-[#171719] pt-4 text-sm font-black text-[#171719]"
          data-moment-primary-cta={moment.id}
        >
          Preview with my toy
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-full bg-[#171719] text-lg text-[#F5F1E8] transition-transform duration-200 group-hover:translate-x-1"
          >
            →
          </span>
        </Link>
        <p className="mt-2 text-[9px] font-black uppercase tracking-[0.16em] text-[#817D75]">
          Local preview · no Provider call
        </p>
      </aside>
    </div>
  );
}
