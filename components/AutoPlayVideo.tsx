"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

const playing = new Set<HTMLVideoElement>();

/** Desktop wall can hold a few muted clips; mobile stays tight for battery. */
function playbackBudget(wallDense?: boolean) {
  if (typeof window === "undefined") return 2;
  const mobile = window.matchMedia("(max-width: 768px)").matches;
  if (wallDense) return mobile ? 2 : 4;
  return mobile ? 1 : 2;
}

function claim(v: HTMLVideoElement, wallDense?: boolean) {
  if (playing.has(v)) return;
  const budget = playbackBudget(wallDense);
  while (playing.size >= budget) {
    const oldest = playing.values().next().value;
    if (!oldest || oldest === v) break;
    oldest.pause();
    playing.delete(oldest);
  }
  playing.add(v);
  v.muted = true;
  void v.play().catch(() => undefined);
}

function release(v: HTMLVideoElement) {
  playing.delete(v);
  v.pause();
}

/**
 * Viewport / interaction video.
 * - interaction + lazySources: posters until hover/tap (default wall)
 * - viewport + lazySources: load+play when card enters view (dense wall browse)
 * - eager: hero / LCP
 */
export function AutoPlayVideo({
  poster,
  webm,
  mp4,
  className,
  style,
  eager,
  desktopPlayMode = "viewport",
  focusable = true,
  label,
  /** Defer <source> until interaction or viewport entry. */
  lazySources = false,
  /**
   * Home wall dense mode: higher concurrent muted plays when cards scroll in.
   * Only meaningful with desktopPlayMode="viewport".
   */
  wallDense = false,
}: {
  poster: string;
  webm?: string;
  mp4: string;
  className?: string;
  style?: CSSProperties;
  eager?: boolean;
  desktopPlayMode?: "viewport" | "interaction";
  focusable?: boolean;
  label?: string;
  lazySources?: boolean;
  wallDense?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [sourcesOn, setSourcesOn] = useState(!lazySources || Boolean(eager));
  const wantPlay = useRef(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Interaction-only: no viewport autoplay (hover/tap walls).
    if (desktopPlayMode === "interaction" && !eager) {
      if (sourcesOn && wantPlay.current) {
        if (v.preload === "none") v.preload = "metadata";
        claim(v, wallDense);
      }
      return () => {
        release(v);
      };
    }

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (eager && sourcesOn && (isMobile || desktopPlayMode === "viewport")) {
      claim(v, wallDense);
    }

    const io = new IntersectionObserver(
      ([e]) => {
        if (desktopPlayMode === "interaction") {
          if (!e.isIntersecting) release(v);
          return;
        }
        // Viewport mode: mount sources when near/in view, then play.
        if (e.isIntersecting && e.intersectionRatio >= 0.28) {
          if (!sourcesOn) {
            setSourcesOn(true);
            return;
          }
          if (v.preload === "none") v.preload = "metadata";
          claim(v, wallDense);
        } else if (!e.isIntersecting) {
          release(v);
        }
      },
      {
        threshold: [0, 0.12, 0.28, 0.45, 0.65],
        rootMargin: wallDense ? "120px 0px" : "80px 0px",
      }
    );
    io.observe(v);
    return () => {
      io.disconnect();
      release(v);
    };
  }, [desktopPlayMode, eager, mp4, sourcesOn, wallDense]);

  // After lazy sources flip on from viewport, try play immediately.
  useEffect(() => {
    if (!sourcesOn || desktopPlayMode !== "viewport") return;
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // If already in view, claim after sources attach.
    const rect = v.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const visible =
      rect.bottom > 0 && rect.top < vh && rect.height > 0
        ? Math.min(rect.bottom, vh) - Math.max(rect.top, 0) >= rect.height * 0.28
        : false;
    if (visible || eager) {
      if (v.preload === "none") v.preload = "metadata";
      claim(v, wallDense);
    }
  }, [sourcesOn, desktopPlayMode, eager, wallDense, mp4]);

  function playFromInteraction() {
    if (desktopPlayMode !== "interaction") return;
    wantPlay.current = true;
    if (!sourcesOn) {
      setSourcesOn(true);
      return;
    }
    const video = ref.current;
    if (!video) return;
    if (video.preload === "none") video.preload = "metadata";
    claim(video, wallDense);
  }

  function pauseFromInteraction() {
    if (desktopPlayMode === "interaction") {
      wantPlay.current = false;
      const video = ref.current;
      if (video) release(video);
    }
  }

  const aria =
    label ||
    (focusable && desktopPlayMode === "interaction"
      ? "Focus to preview video"
      : "Official Pikbo Lab demo video");

  return (
    <video
      ref={ref}
      className={className}
      style={style}
      poster={poster}
      width={720}
      height={1280}
      muted
      loop
      playsInline
      preload={eager || (wallDense && sourcesOn) ? "metadata" : "none"}
      tabIndex={
        focusable && desktopPlayMode === "interaction" ? 0 : undefined
      }
      aria-label={aria}
      onMouseEnter={playFromInteraction}
      onMouseLeave={pauseFromInteraction}
      onFocus={playFromInteraction}
      onBlur={pauseFromInteraction}
      onTouchStart={playFromInteraction}
    >
      {sourcesOn && webm ? <source src={webm} type="video/webm" /> : null}
      {sourcesOn ? <source src={mp4} type="video/mp4" /> : null}
    </video>
  );
}
