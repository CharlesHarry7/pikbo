"use client";

import Image from "next/image";
import type { MomentId, PikboMoment } from "@/lib/moments";
import { cn } from "@/lib/utils";

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
      className="grid grid-cols-2 border-y border-void/20 sm:grid-cols-3 lg:grid-cols-6"
      role="tablist"
      aria-label="Toy moments"
      data-moment-rail
    >
      {moments.map((moment) => {
        const active = moment.id === activeId;
        return (
          <button
            key={moment.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(moment.id)}
            className={cn(
              "group relative grid min-w-0 grid-cols-[64px_1fr] items-center gap-3 border-r border-void/10 px-2 py-3 text-left transition-colors duration-200 last:border-r-0 lg:grid-cols-1 lg:gap-2 lg:px-2 lg:py-2",
              active ? "bg-void text-cream" : "text-void hover:bg-white/55"
            )}
          >
            <span className="relative block aspect-video overflow-hidden rounded-[3px] bg-cream/70 lg:w-full">
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
            </span>
            <span className="min-w-0">
              <span className={cn(
                "block text-[8px] font-black uppercase tracking-[0.18em]",
                active ? "text-neon-pink" : "text-void/45"
              )}>
                {moment.index} · {moment.toyType}
              </span>
              <span className="mt-1 block truncate text-[11px] font-black lg:text-xs">
                {moment.name}
              </span>
            </span>
            <span
              className={cn(
                "absolute inset-x-0 bottom-0 h-0.5 bg-[linear-gradient(90deg,var(--electric-purple),var(--neon-pink))] transition-opacity duration-200",
                active ? "opacity-100" : "opacity-0"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
