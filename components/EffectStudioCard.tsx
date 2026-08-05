import Image from "next/image";
import Link from "next/link";
import type { ToyEffect } from "@/lib/effects";
import { effectStatusLabel } from "@/lib/effects";

/**
 * Toy Effect Studio grid card — preview, name, description, Try Now / Coming Soon.
 * Live cards deep-link into Create; coming-soon cards open the detail page only.
 */
export function EffectStudioCard({ effect }: { effect: ToyEffect }) {
  const live = effect.status === "live";
  const href = `/effects/${effect.slug}`;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_12px_40px_-20px_rgba(0,0,0,0.8)] transition duration-300 ease-out hover:-translate-y-1 hover:border-[var(--mint)]/35 hover:shadow-[0_20px_50px_-18px_rgba(200,255,61,0.18)]">
      <Link
        href={href}
        className="relative block aspect-[3/4] overflow-hidden bg-neutral-900"
        aria-label={`${effect.name} — ${effectStatusLabel(effect.status)}`}
      >
        <Image
          src={effect.previewImage}
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition duration-700 ease-out will-change-transform group-hover:scale-[1.06]"
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-40 mix-blend-soft-light"
          style={{ background: effect.gradient }}
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />

        <div className="absolute left-2 top-2 flex max-w-[75%] flex-wrap gap-1">
          <span className="rounded-full border border-white/10 bg-black/55 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white/70 backdrop-blur-sm">
            {effect.emoji} {effect.aspectRatio} · {effect.durationSec}s
          </span>
        </div>

        <span
          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
            live
              ? "bg-[var(--mint)] text-black shadow-[0_0_16px_rgba(200,255,61,0.35)]"
              : "border border-white/15 bg-black/65 text-white/75"
          }`}
        >
          {effectStatusLabel(effect.status)}
        </span>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="text-[13px] font-bold leading-snug text-white sm:text-sm">
            {effect.name}
          </p>
          {effect.nameZh ? (
            <p className="mt-0.5 text-[10px] font-medium text-white/45">
              {effect.nameZh}
            </p>
          ) : null}
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/60">
            {effect.description}
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-2 border-t border-white/[0.06] px-3 py-2.5">
        {live && effect.tryHref ? (
          <Link
            href={effect.tryHref}
            className="btn btn-primary !min-h-0 flex-1 !px-3 !py-2 text-center text-[11px] font-black"
            data-effect-studio-try={effect.slug}
          >
            Try Now
          </Link>
        ) : (
          <span
            className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-white/45"
            data-effect-studio-soon={effect.slug}
          >
            Coming Soon
          </span>
        )}
        <Link
          href={href}
          className="btn btn-ghost !min-h-0 !px-3 !py-2 text-[11px]"
        >
          Details
        </Link>
      </div>
    </article>
  );
}
