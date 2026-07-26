"use client";

import { useEffect, useState } from "react";

/**
 * Sticky generate CTA while browsing the video wall.
 * Shows after leaving hero, hides when generate section is in view.
 * Keeps "browse first" without losing the path to create.
 */
export function HomeBrowseCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const wall = document.getElementById("toy-wall");
    const create = document.getElementById("home-create");
    if (!wall) return;

    let wallIn = false;
    let createIn = false;

    const sync = () => setVisible(wallIn && !createIn);

    const wallIo = new IntersectionObserver(
      ([e]) => {
        // Any part of wall in view (or scrolled past top of wall)
        wallIn = e.isIntersecting || e.boundingClientRect.top < 0;
        sync();
      },
      { threshold: [0, 0.02, 0.1], rootMargin: "0px 0px -20% 0px" }
    );
    wallIo.observe(wall);

    let createIo: IntersectionObserver | null = null;
    if (create) {
      createIo = new IntersectionObserver(
        ([e]) => {
          createIn = e.isIntersecting && e.intersectionRatio > 0.12;
          sync();
        },
        { threshold: [0, 0.12, 0.35] }
      );
      createIo.observe(create);
    }

    // Fallback scroll: after hero (~70vh)
    const onScroll = () => {
      if (!wall) return;
      const pastHero = window.scrollY > window.innerHeight * 0.55;
      const createTop = create?.getBoundingClientRect().top ?? Infinity;
      const nearCreate = createTop < window.innerHeight * 0.75;
      setVisible(pastHero && !nearCreate);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      wallIo.disconnect();
      createIo?.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      data-home-browse-cta={visible ? "on" : "off"}
      /* Mobile: sit above sticky bottom suite bar (~4.75rem); desktop: float at edge */
      className={`pointer-events-none fixed inset-x-0 z-[35] flex justify-center px-3 pt-2 transition duration-300 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-0 lg:pb-[max(0.85rem,env(safe-area-inset-bottom))] ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <a
        href="#home-create"
        tabIndex={visible ? 0 : -1}
        className={`pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border border-[#c8ff3d]/50 bg-black/92 px-4 py-3 shadow-[0_0_40px_rgba(200,255,61,0.22),0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl transition hover:border-[#c8ff3d] hover:bg-black sm:max-w-lg ${
          visible ? "" : "pointer-events-none"
        }`}
      >
        <span className="min-w-0 text-left">
          <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#c8ff3d]/90">
            Free Mini · 静音墙 · no card
          </span>
          <span className="block truncate text-sm font-black text-white">
            看够了？用你的潮玩生成
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-[#c8ff3d] px-4 py-2 text-xs font-black text-black">
          去生成
        </span>
      </a>
    </div>
  );
}
