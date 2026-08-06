"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/LanguageProvider";
import { createGenerate360Href } from "@/lib/jobIntents";

/**
 * Sticky generate CTA while browsing the video wall.
 * Shows after leaving hero, hides when generate section is in view.
 */
export function HomeBrowseCta() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const wall = document.getElementById("toy-wall");
    const create = document.getElementById("home-create");
    if (!wall) return;

    // Prefetch listing-spin remix Create for faster jump
    const prefetch = document.createElement("link");
    prefetch.rel = "prefetch";
    prefetch.href = createGenerate360Href("home-browse");
    prefetch.as = "document";
    document.head.appendChild(prefetch);

    const onScroll = () => {
      const pastHero = window.scrollY > window.innerHeight * 0.55;
      const createTop = create?.getBoundingClientRect().top ?? Infinity;
      const nearCreate = createTop < window.innerHeight * 0.75;
      setVisible(pastHero && !nearCreate);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      prefetch.remove();
    };
  }, []);

  return (
    <div
      data-home-browse-cta={visible ? "on" : "off"}
      className={`pointer-events-none fixed inset-x-0 z-[35] flex justify-center px-3 pt-2 transition duration-300 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-0 lg:pb-[max(0.85rem,env(safe-area-inset-bottom))] ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <Link
        href="#home-create"
        prefetch={false}
        tabIndex={visible ? 0 : -1}
        className={`pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border border-[var(--neon-pink)]/50 bg-black/92 px-4 py-3 shadow-[0_0_40px_rgba(255,78,205,0.22),0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl transition hover:border-[var(--neon-pink)] hover:bg-black sm:max-w-lg ${
          visible ? "" : "pointer-events-none"
        }`}
      >
        <span className="min-w-0 text-left">
          <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--neon-pink)]/90">
            {t("home.browseCta.chip")}
          </span>
          <span className="block truncate text-sm font-black text-white">
            {t("home.browseCta.title")}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-[var(--neon-pink)] px-4 py-2 text-xs font-black text-[var(--void)]">
          {t("home.browseCta.btn")}
        </span>
      </Link>
    </div>
  );
}
