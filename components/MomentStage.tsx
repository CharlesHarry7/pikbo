"use client";

import Image from "next/image";
import Link from "next/link";
import type { PikboMoment } from "@/lib/moments";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

/** Private Live door — fixed Street Power-Up contract, invite/eligibility gated. */
const STAGE_PRIVATE_CREATE_HREF =
  `${MOMENT_CREATE_HREF}&source=moment-stage` as const;

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
        <span
          className="absolute left-4 top-4 border border-white/55 bg-black/45 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-sm"
          data-concept-preview="true"
        >
          Concept · Cached Lab
        </span>
        <span className="absolute bottom-4 left-4 text-[10px] font-black uppercase tracking-[0.18em] text-white/75">
          Original Pikbo art direction · not Live
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

        <div className="space-y-3 border-t border-[#171719] pt-4">
          {/* Concept door — local composition preview only */}
          <Link
            href={`/create?moment=${moment.id}`}
            className="group inline-flex min-h-14 w-full items-center justify-between text-sm font-black text-[#171719]"
            data-moment-primary-cta={moment.id}
            data-concept-preview="true"
          >
            <span className="flex flex-col items-start gap-0.5">
              <span>Preview with my toy</span>
              <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#817D75]">
                Cached Lab · not Live
              </span>
            </span>
            <span
              aria-hidden
              className="grid h-9 w-9 place-items-center rounded-full bg-[#171719] text-lg text-[#F5F1E8] transition-transform duration-200 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>

          {/* Primary private Create — fixed Moment contract, Live-gated */}
          <Link
            href={STAGE_PRIVATE_CREATE_HREF}
            className="group inline-flex min-h-12 w-full items-center justify-between border border-[#171719]/20 px-1 text-sm font-black text-[#171719] transition-colors hover:border-[#F04E30] hover:text-[#F04E30]"
            data-moment-create-cta
            data-live-gated="true"
          >
            <span className="flex flex-col items-start gap-0.5 py-2 pl-3">
              <span>Create Street Power-Up</span>
              <span
                className="text-[9px] font-black uppercase tracking-[0.14em] text-current opacity-55"
                data-live-gated-chip
              >
                Live-gated · not open checkout
              </span>
            </span>
            <span
              aria-hidden
              className="grid h-9 w-9 place-items-center text-lg transition-transform duration-200 group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>
        </div>

        <p className="mt-2 text-[9px] font-black uppercase tracking-[0.16em] text-[#817D75]">
          Local preview · no Provider call · private render is invitation-only
        </p>
      </aside>
    </div>
  );
}
