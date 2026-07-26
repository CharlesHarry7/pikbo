"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

const playing = new Set<HTMLVideoElement>();

function playbackBudget() {
  // One moving proof at a time keeps mobile data, desktop attention, and
  // reduced-motion expectations predictable across every wall.
  return 1;
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

/**
 * Viewport / interaction video. Wall: lazySources defers network until hover/tap (LCP).
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
  /** Defer <source> until first interaction — posters only on first paint. */
  lazySources = false,
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
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [sourcesOn, setSourcesOn] = useState(!lazySources || Boolean(eager));
  const wantPlay = useRef(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Interaction-only: no viewport autoplay (desktop + mobile walls).
    if (desktopPlayMode === "interaction" && !eager) {
      if (sourcesOn && wantPlay.current) {
        if (v.preload === "none") v.preload = "metadata";
        claim(v);
      }
      return () => {
        release(v);
      };
    }

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (eager && sourcesOn && (isMobile || desktopPlayMode === "viewport")) {
      claim(v);
    }

    const io = new IntersectionObserver(
      ([e]) => {
        if (desktopPlayMode === "interaction") {
          if (!e.isIntersecting) release(v);
          return;
        }
        if (!sourcesOn) return;
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
  }, [desktopPlayMode, eager, mp4, sourcesOn]);

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
    claim(video);
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
      // 哥飞: 首屏关键视频用 metadata；墙卡片仍 none 直到交互
      preload={eager ? "metadata" : "none"}
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
