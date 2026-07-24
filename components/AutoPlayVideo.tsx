"use client";

import { useEffect, useRef, type CSSProperties } from "react";

const playing = new Set<HTMLVideoElement>();

function playbackBudget() {
  if (typeof window === "undefined") return 2;
  return window.matchMedia("(max-width: 768px)").matches ? 1 : 2;
}

function claim(v: HTMLVideoElement) {
  if (playing.has(v)) return;
  if (playing.size >= playbackBudget()) {
    const oldest = playing.values().next().value;
    if (oldest && oldest !== v) {
      oldest.pause();
      playing.delete(oldest);
    }
  }
  playing.add(v);
  v.muted = true;
  void v.play().catch(() => undefined);
}

function release(v: HTMLVideoElement) {
  playing.delete(v);
  v.pause();
}

/** Viewport autoplay with metadata preload and ≤2 concurrent plays (G2 soft perf). */
export function AutoPlayVideo({
  poster,
  webm,
  mp4,
  className,
  style,
  eager,
  desktopPlayMode = "viewport",
  /** When false, video is not a keyboard focus target (e.g. nested inside a Link). */
  focusable = true,
  /** Accessible label — also used when crawlers inspect the video node */
  label,
}: {
  poster: string;
  webm?: string;
  mp4: string;
  className?: string;
  style?: CSSProperties;
  /** Kick play sooner when near the fold (still preload=metadata) */
  eager?: boolean;
  /** Explore uses deliberate hover/focus on desktop and viewport play on touch. */
  desktopPlayMode?: "viewport" | "interaction";
  /**
   * Wave B: Link cards must keep a single focus target. Set false when the
   * video is decorative inside an anchor; hover play still works via mouse.
   */
  focusable?: boolean;
  label?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    if (eager && (isMobile || desktopPlayMode === "viewport")) claim(v);

    const io = new IntersectionObserver(
      ([e]) => {
        if (!isMobile && desktopPlayMode === "interaction") {
          if (!e.isIntersecting) release(v);
          return;
        }
        if (e.isIntersecting && e.intersectionRatio >= 0.35) claim(v);
        else release(v);
      },
      { threshold: [0, 0.12, 0.35, 0.65], rootMargin: "80px 0px" }
    );
    io.observe(v);
    return () => {
      io.disconnect();
      release(v);
    };
  }, [desktopPlayMode, eager, mp4]);

  function playFromInteraction() {
    if (desktopPlayMode === "interaction") {
      const video = ref.current;
      if (!video) return;
      // Dense walls use preload=none — promote metadata on hover so first play is snappier.
      if (video.preload === "none") {
        video.preload = "metadata";
      }
      claim(video);
    }
  }

  function pauseFromInteraction() {
    if (desktopPlayMode === "interaction") {
      const video = ref.current;
      if (video) release(video);
    }
  }

  return (
    <video
      ref={ref}
      className={className}
      style={style}
      poster={poster}
      muted
      loop
      playsInline
      // Phase G: non-hero stays poster-only until interaction/viewport claim.
      preload={eager ? "metadata" : "none"}
      tabIndex={
        focusable && desktopPlayMode === "interaction" ? 0 : undefined
      }
      aria-label={
        label ||
        (focusable && desktopPlayMode === "interaction"
          ? "Focus to preview video"
          : "Official Pikbo Lab demo video")
      }
      onMouseEnter={playFromInteraction}
      onMouseLeave={pauseFromInteraction}
      onFocus={playFromInteraction}
      onBlur={pauseFromInteraction}
    >
      {webm ? <source src={webm} type="video/webm" /> : null}
      <source src={mp4} type="video/mp4" />
    </video>
  );
}
