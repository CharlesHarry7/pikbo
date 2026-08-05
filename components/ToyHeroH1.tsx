"use client";

import { useId } from "react";
import { site } from "@/lib/site";

/** Small flame mark after “60 seconds” — SVG only, no emoji. */
function FlameMark({ className }: { className?: string }) {
  const gid = useId().replace(/:/g, "");
  return (
    <svg
      className={className}
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden
    >
      <path
        d="M14 2.5c1.2 3.4-.2 5.4-1.8 7.2-1.4 1.6-2.6 3-2.6 5.3 0 3.4 2.5 6 5.6 6 3.2 0 5.8-2.5 5.8-5.7 0-2.1-1-3.6-2.2-5.1 1.8 1.6 3.2 3.6 3.2 6.3C22 21.2 18.5 25 14 25S6 21.2 6 16.5c0-3.2 1.6-5.4 3.4-7.4C11.2 7 12.8 5.4 14 2.5z"
        fill={`url(#toy-flame-${gid})`}
      />
      <path
        d="M14 12.2c.6 1.4 0 2.3-.7 3.1-.6.7-1.1 1.3-1.1 2.3 0 1.5 1.1 2.6 2.5 2.6 1.4 0 2.5-1.1 2.5-2.5 0-.9-.4-1.6-1-2.3.8.7 1.4 1.6 1.4 2.8 0 2.1-1.6 3.7-3.5 3.7s-3.5-1.6-3.5-3.7c0-1.4.7-2.4 1.5-3.3.9-1 1.6-1.7 1.9-2.7z"
        fill="#0E0E12"
        fillOpacity="0.28"
      />
      <defs>
        <linearGradient
          id={`toy-flame-${gid}`}
          x1="8"
          y1="4"
          x2="20"
          y2="24"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F5FF40" />
          <stop offset="0.55" stopColor="#39FF14" />
          <stop offset="1" stopColor="#00F0FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Segmented display H1 for the frozen homeH1:
 * white / fluo yellow / neon green + keyword chip + flame mark.
 * Falls back to plain text if copy drifts.
 */
export function ToyHeroH1({
  id,
  className = "",
  as: Tag = "h1",
}: {
  id?: string;
  className?: string;
  as?: "h1" | "p" | "span";
}) {
  const copy = site.homeH1;
  const match = copy.match(
    /^(Turn one toy photo) (into a sellable video clip) (in 60 seconds\.)$/
  );

  if (!match) {
    return (
      <Tag id={id} className={`hero-h1-display ${className}`.trim()}>
        {copy}
      </Tag>
    );
  }

  const [, lead, , tail] = match;

  return (
    <Tag id={id} className={`hero-h1-display ${className}`.trim()}>
      <span className="hero-h1-white">{lead} </span>
      <span className="hero-h1-fluo">
        into a{" "}
        <span className="hero-keyword-chip">sellable</span>
        {" video clip "}
      </span>
      <span className="hero-h1-neon inline-flex items-center gap-1.5">
        <span>{tail}</span>
        <FlameMark className="inline-block h-[0.55em] w-[0.55em] shrink-0 translate-y-[-0.06em]" />
      </span>
    </Tag>
  );
}
