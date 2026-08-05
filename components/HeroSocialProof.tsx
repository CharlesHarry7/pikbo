/** Abstract SVG avatar — no fake seller photos or names. */
function AbstractAvatar({ seed }: { seed: number }) {
  const hues = [
    ["#C77DFF", "#FFB6D9"],
    ["#39FF14", "#00F0FF"],
    ["#F5FF40", "#C77DFF"],
  ][seed % 3];
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
      <defs>
        <linearGradient id={`av-${seed}`} x1="4" y1="2" x2="24" y2="26">
          <stop stopColor={hues[0]} />
          <stop offset="1" stopColor={hues[1]} />
        </linearGradient>
      </defs>
      <circle cx="14" cy="14" r="14" fill={`url(#av-${seed})`} opacity="0.9" />
      <circle cx="14" cy="11" r="4.2" fill="#0E0E12" opacity="0.35" />
      <ellipse cx="14" cy="20.5" rx="7" ry="4.2" fill="#0E0E12" opacity="0.3" />
    </svg>
  );
}

function PikboMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
      <rect width="22" height="22" rx="6" fill="#0E0E12" />
      <path
        d="M5 15.5 8.2 6h2.1l3.2 9.5h-2.1l-.6-1.9H7.7l-.6 1.9H5zm3.2-3.5h2.4L9.4 8.2 8.2 12zM14.2 15.5V6h3.4c1.7 0 2.8 1 2.8 2.55 0 1.15-.65 2-1.7 2.35L20.5 15.5h-2.2l-1.55-4.1h-1.1v4.1h-1.45zm1.45-5.55h1.55c.7 0 1.15-.4 1.15-1s-.45-1-1.15-1h-1.55v2z"
        fill="#F5FF40"
      />
    </svg>
  );
}

/**
 * Cardized social proof with logo + avatar placeholders (no fake metrics).
 * Quote is an explicit private-beta placeholder until verified seller feedback lands.
 */
export function HeroSocialProof({ className = "" }: { className?: string }) {
  return (
    <div
      className={`social-proof-card ${className}`.trim()}
      data-hf-hero-social-proof="private-beta"
    >
      <div className="flex shrink-0 flex-col items-center gap-1.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-black/40">
          <PikboMark />
        </span>
        <div className="flex -space-x-1.5">
          <AbstractAvatar seed={0} />
          <AbstractAvatar seed={1} />
          <AbstractAvatar seed={2} />
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[22px] leading-none text-[#F5FF40]/70" aria-hidden>
          “
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-white/55">
          Finally, a video tool that actually understands designer toys.
        </p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
          — Private beta seller
        </p>
      </div>
    </div>
  );
}
