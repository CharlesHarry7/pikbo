"use client";

import { useEffect, useRef, useState } from "react";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";

/**
 * Below-fold home Lab card media (AIT-77).
 *
 * Problem: `<video poster>` loads every wall poster on first paint and competes
 * with the Moment hero LCP. Solution: low-priority lazy poster until the card
 * is near the viewport, then mount AutoPlayVideo (lazySources + wallDense).
 */
export function DeferredWallVideo({
  poster,
  webm,
  mp4,
  className,
  label,
  /** Warm slightly before the card is on screen; keep modest to protect LCP. */
  rootMargin = "180px 0px",
}: {
  poster: string;
  webm?: string;
  mp4: string;
  className?: string;
  label?: string;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inRange, setInRange] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inRange) return;

    if (typeof IntersectionObserver === "undefined") {
      setInRange(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInRange(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inRange, rootMargin]);

  return (
    <div
      ref={ref}
      className="relative h-full w-full bg-[#0A0A0F]"
      data-deferred-wall-video={inRange ? "active" : "poster"}
    >
      {inRange ? (
        <AutoPlayVideo
          poster={poster}
          webm={webm}
          mp4={mp4}
          lazySources
          wallDense
          focusable={false}
          label={label}
          className={className}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- demo poster; loading=lazy is the LCP contract
        <img
          src={poster}
          alt=""
          width={720}
          height={900}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          className={className}
          data-deferred-wall-poster
        />
      )}
    </div>
  );
}
