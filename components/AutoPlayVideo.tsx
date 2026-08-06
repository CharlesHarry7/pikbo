"use client";

import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { LAB_VIDEO_READY_MS } from "@/lib/clientTimeout";

const playing = new Set<HTMLVideoElement>();
let visibilityHooked = false;
let resizeHooked = false;

function playbackBudget() {
  if (typeof window === "undefined") return 2;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return 0;
  }
  return window.matchMedia("(max-width: 768px)").matches ? 1 : 2;
}

function enforcePlaybackBudget() {
  const budget = playbackBudget();
  while (playing.size > budget) {
    const oldest = playing.values().next().value;
    if (!oldest) break;
    oldest.pause();
    playing.delete(oldest);
  }
}

/** Pause every claimed clip when the tab is hidden (battery / background). */
function ensurePlaybackHooks() {
  if (visibilityHooked || typeof document === "undefined") return;
  visibilityHooked = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      for (const v of [...playing]) {
        v.pause();
      }
      return;
    }
    enforcePlaybackBudget();
    // Resume only still-registered clips (viewport logic re-claims on scroll)
    for (const v of [...playing]) {
      void v.play().catch(() => undefined);
    }
  });
  if (!resizeHooked && typeof window !== "undefined") {
    resizeHooked = true;
    window.addEventListener("resize", enforcePlaybackBudget, { passive: true });
  }
}

function claim(v: HTMLVideoElement) {
  ensurePlaybackHooks();
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return;
  }
  if (playing.has(v)) return;
  const budget = playbackBudget();
  if (budget <= 0) return;
  while (playing.size >= budget) {
    const oldest = playing.values().next().value;
    if (!oldest || oldest === v) break;
    oldest.pause();
    playing.delete(oldest);
  }
  playing.add(v);
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
   * Home wall dense mode: desktop may preload metadata for near cards.
   * Mobile stays poster-first (preload=none) until claim — Phase G 4G LCP.
   * Only meaningful with desktopPlayMode="viewport".
   */
  wallDense = false,
  /** Visible controls for hero / featured players. Dense cards keep Link focus. */
  showControls = false,
  /**
   * Studio / guest Lab path: surface load failure + timeout with an honest
   * Retry control instead of a silent poster forever.
   */
  errorRetry = false,
  /** Override ready timeout when errorRetry is on (default LAB_VIDEO_READY_MS). */
  readyTimeoutMs = LAB_VIDEO_READY_MS,
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
  showControls?: boolean;
  errorRetry?: boolean;
  readyTimeoutMs?: number;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [sourcesOn, setSourcesOn] = useState(!lazySources || Boolean(eager));
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  /** SSR + first paint: assume mobile so wall cards stay poster-first. */
  const [isNarrow, setIsNarrow] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const wantPlay = useRef(false);
  const readyRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Honest Lab ready/timeout when this player is a Studio-facing preview.
  useEffect(() => {
    if (!errorRetry || !sourcesOn) return;
    readyRef.current = false;
    const v = ref.current;
    if (!v) return;

    const markReady = () => {
      readyRef.current = true;
      setMediaError((prev) => (prev ? null : prev));
    };
    const markError = () => {
      if (readyRef.current) return;
      setMediaError(
        "Lab preview failed to load. Check your connection and retry."
      );
    };

    v.addEventListener("loadeddata", markReady);
    v.addEventListener("canplay", markReady);
    v.addEventListener("error", markError);

    const timer = window.setTimeout(() => {
      if (readyRef.current) return;
      // Already have dimensions → treat as ready (poster-only reduced motion etc.).
      if (v.readyState >= 2) {
        markReady();
        return;
      }
      setMediaError(
        "Lab preview timed out. Tap Retry — this is a cached sample, not your toy."
      );
    }, readyTimeoutMs);

    // Kick load after remount / retry (async to stay off the effect body path).
    const loadTimer = window.setTimeout(() => {
      try {
        v.load();
      } catch {
        /* ignore */
      }
    }, 0);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(loadTimer);
      v.removeEventListener("loadeddata", markReady);
      v.removeEventListener("canplay", markReady);
      v.removeEventListener("error", markError);
    };
  }, [errorRetry, sourcesOn, mp4, webm, retryNonce, readyTimeoutMs]);

  // Desktop wallDense may warm metadata; mobile never preloads non-hero clips.
  const allowMetadataPreload =
    Boolean(eager) || (Boolean(wallDense) && sourcesOn && !isNarrow);

  function retryMedia() {
    setMediaError(null);
    readyRef.current = false;
    setRetryNonce((n) => n + 1);
  }

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Interaction-only: no viewport autoplay (hover/tap walls).
    if (desktopPlayMode === "interaction" && !eager) {
      if (sourcesOn && wantPlay.current) {
        if (allowMetadataPreload && v.preload === "none") v.preload = "metadata";
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
        // Viewport mode: mount sources when near/in view, then play.
        if (e.isIntersecting && e.intersectionRatio >= 0.28) {
          if (!sourcesOn) {
            setSourcesOn(true);
            return;
          }
          if (allowMetadataPreload && v.preload === "none") {
            v.preload = "metadata";
          }
          claim(v);
        } else if (!e.isIntersecting) {
          release(v);
        }
      },
      {
        threshold: [0, 0.12, 0.28, 0.45, 0.65],
        // Tighter margin on mobile so wall does not warm many clips off-screen.
        rootMargin: wallDense
          ? isMobile
            ? "40px 0px"
            : "120px 0px"
          : "80px 0px",
      }
    );
    io.observe(v);
    return () => {
      io.disconnect();
      release(v);
    };
  }, [desktopPlayMode, eager, mp4, sourcesOn, wallDense, allowMetadataPreload]);

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
      if (allowMetadataPreload && v.preload === "none") v.preload = "metadata";
      claim(v);
    }
  }, [sourcesOn, desktopPlayMode, eager, wallDense, mp4, allowMetadataPreload]);

  function playFromInteraction() {
    if (desktopPlayMode !== "interaction") return;
    wantPlay.current = true;
    if (!sourcesOn) {
      setSourcesOn(true);
      return;
    }
    const video = ref.current;
    if (!video) return;
    // Interaction may still play with preload=none; browser fetches on play().
    if (allowMetadataPreload && video.preload === "none") {
      video.preload = "metadata";
    }
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
      : "PIKBO Lab cached prototype video");

  function togglePlayback() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      if (!sourcesOn) setSourcesOn(true);
      wantPlay.current = true;
      claim(video);
    } else {
      wantPlay.current = false;
      release(video);
    }
  }

  function toggleMuted() {
    const video = ref.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }

  return (
    <>
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
        preload={allowMetadataPreload ? "metadata" : "none"}
        data-video-preload={allowMetadataPreload ? "metadata" : "none"}
        data-video-mobile-poster-first={isNarrow && !eager ? "1" : "0"}
        data-lab-video-error={mediaError ? "1" : "0"}
        tabIndex={
          focusable && desktopPlayMode === "interaction" ? 0 : undefined
        }
        aria-label={aria}
        onMouseEnter={playFromInteraction}
        onMouseLeave={pauseFromInteraction}
        onFocus={playFromInteraction}
        onBlur={pauseFromInteraction}
        onTouchStart={playFromInteraction}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onVolumeChange={(event) => setIsMuted(event.currentTarget.muted)}
      >
        {sourcesOn && webm ? <source src={webm} type="video/webm" /> : null}
        {sourcesOn ? <source src={mp4} type="video/mp4" /> : null}
      </video>
      {showControls ? (
        <div
          className="absolute right-4 top-16 z-20 flex items-center gap-2"
          data-video-controls="visible"
        >
          <button
            type="button"
            onClick={togglePlayback}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-black/65 text-white shadow-lg backdrop-blur transition hover:border-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
            aria-label={isPlaying ? "Pause example video" : "Play example video"}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            type="button"
            onClick={toggleMuted}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-black/65 text-white shadow-lg backdrop-blur transition hover:border-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
            aria-label={isMuted ? "Unmute example video" : "Mute example video"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      ) : null}
      {errorRetry && mediaError ? (
        <div
          className="absolute inset-x-3 bottom-3 z-30 rounded-2xl border border-[#FF6B6B]/45 bg-black/82 p-3 text-left shadow-xl backdrop-blur-md sm:inset-x-4 sm:bottom-4 sm:p-4"
          data-lab-preview-error="1"
          role="alert"
        >
          <p className="text-[11px] font-semibold leading-5 text-white/90 sm:text-xs">
            {mediaError}
          </p>
          <button
            type="button"
            onClick={retryMedia}
            data-lab-preview-retry
            className="mt-2 inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 text-[10px] font-black uppercase tracking-[0.12em] text-black transition hover:bg-[var(--brand)] hover:text-[var(--primary-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
          >
            Retry Lab preview
          </button>
        </div>
      ) : null}
    </>
  );
}
