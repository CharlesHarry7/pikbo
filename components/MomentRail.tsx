"use client";

import Image from "next/image";
import type { MomentId, PikboMoment } from "@/lib/moments";
import { cn } from "@/lib/utils";

/**
 * Concept direction picker for Home Moment showcase chrome.
 * Cards are art-direction Lab concepts — not seller uploads or Live renders.
 */
export function MomentRail({
  moments,
  activeId,
  onSelect,
}: {
  moments: readonly PikboMoment[];
  activeId: MomentId;
  onSelect: (id: MomentId) => void;
}) {
  return (
    <div
      className="grid grid-cols-2 border-y border-[#171719]/20 sm:grid-cols-3 lg:grid-cols-6"
      role="tablist"
      aria-label="Concept toy moments · Cached Lab"
      data-moment-rail
      data-concept-rail="true"
    >
      {moments.map((moment) => {
        const active = moment.id === activeId;
        return (
          <button
            key={moment.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={`${moment.name} concept · Cached Lab`}
            onClick={() => onSelect(moment.id)}
            data-concept-rail-item={moment.id}
            data-concept-preview="true"
            className={cn(
              "group relative grid min-w-0 grid-cols-[64px_1fr] items-center gap-3 border-r border-[#171719]/10 px-2 py-3 text-left transition-colors duration-200 last:border-r-0 lg:grid-cols-1 lg:gap-2 lg:px-2 lg:py-2",
              active ? "bg-[#171719] text-[#F5F1E8]" : "text-[#171719] hover:bg-white/55"
            )}
          >
            <span className="relative block aspect-video overflow-hidden rounded-[3px] bg-[#D7D2C8] lg:w-full">
              <Image
                src={moment.media}
                alt=""
                fill
                sizes="160px"
                className={cn(
                  "object-cover transition duration-200",
                  !active && "saturate-[0.72] group-hover:saturate-100"
                )}
                style={{ objectPosition: moment.objectPosition }}
              />
              <span
                className={cn(
                  "absolute left-1 top-1 border px-1 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] backdrop-blur-sm",
                  active
                    ? "border-white/40 bg-black/50 text-white/90"
                    : "border-[#171719]/20 bg-white/75 text-[#6D6A63]"
                )}
                data-concept-lab-chip
              >
                Lab
              </span>
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-[8px] font-black uppercase tracking-[0.18em]",
                  active ? "text-[#FF6748]" : "text-[#8A867E]"
                )}
              >
                {moment.index} · {moment.toyType}
              </span>
              <span className="mt-1 block truncate text-[11px] font-black lg:text-xs">
                {moment.name}
              </span>
              <span
                className={cn(
                  "mt-0.5 block text-[8px] font-black uppercase tracking-[0.14em]",
                  active ? "text-white/45" : "text-[#9A968E]"
                )}
              >
                Concept · Cached Lab
              </span>
            </span>
            <span
              className={cn(
                "absolute inset-x-0 bottom-0 h-0.5 bg-[#FF5A36] transition-opacity duration-200",
                active ? "opacity-100" : "opacity-0"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
