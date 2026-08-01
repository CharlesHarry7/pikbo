import { useId } from "react";
import { site } from "@/lib/site";

/**
 * Pikbo brand mark — a lacquer squircle "play" chip (video-first product)
 * paired with the display wordmark. One source of truth across header/footer.
 *
 * Gradient ids are useId()-scoped so multiple Logos on one page do not collide.
 */
export function Logo({
  size = 30,
  showWord = true,
  className = "",
  wordClassName = "text-[19px]",
}: {
  size?: number;
  showWord?: boolean;
  className?: string;
  wordClassName?: string;
}) {
  const rawId = useId().replace(/:/g, "");
  const sheenId = `pikbo-sheen-${rawId}`;

  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="1" y="1" width="30" height="30" rx="9.5" fill="#C45C4A" />
        <rect
          x="1"
          y="1"
          width="30"
          height="30"
          rx="9.5"
          fill={`url(#${sheenId})`}
        />
        {/* play glyph with softened corners = video, but bespoke */}
        <path
          d="M13 10.4c0-1 1.05-1.62 1.9-1.12l8.2 4.72c.86.5.86 1.74 0 2.24l-8.2 4.72c-.85.5-1.9-.12-1.9-1.12V10.4Z"
          fill="#F3EFE6"
        />
        <defs>
          <linearGradient id={sheenId} x1="0" y1="0" x2="0" y2="32">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      {showWord && (
        <span
          className={`font-display font-extrabold leading-none tracking-[-0.03em] text-white ${wordClassName}`}
        >
          {site.name}
          <span className="text-[#C45C4A]">.</span>
        </span>
      )}
    </span>
  );
}
