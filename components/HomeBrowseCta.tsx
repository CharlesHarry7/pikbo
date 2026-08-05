"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/LanguageProvider";
import { createGenerate360Href } from "@/lib/jobIntents";

const BROWSE_GENERATE_HREF = createGenerate360Href("home-browse");

/**
 * Sticky Generate CTA while browsing the Lab proof wall (HF Explore density).
 * Moment-first home hides the tab nav — only clear the home indicator.
 * z-index sits above page content and below sticky header (z-50).
 * Shows after leaving the hero; hides when the product-rail Generate suite is near.
 */
export function HomeBrowseCta() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const wall = document.getElementById("toy-wall");
    if (!wall) return;

    // Prefetch listing-spin Generate for faster jump
    const prefetch = document.createElement("link");
    prefetch.rel = "prefetch";
    prefetch.href = BROWSE_GENERATE_HREF;
    prefetch.as = "document";
    document.head.appendChild(prefetch);

    const onScroll = () => {
      const pastHero = window.scrollY > window.innerHeight * 0.55;
      // Prefer product rail (suite doors under the wall); fall back to wall bottom.
      const hideTarget =
        document.getElementById("hf-product-rail") ??
        document.getElementById("toy-wall");
      const hideTop = hideTarget?.getBoundingClientRect().bottom ?? Infinity;
      // Hide once the suite / wall bottom is well into view
      const nearSuite =
        hideTarget?.id === "hf-product-rail"
          ? hideTarget.getBoundingClientRect().top < window.innerHeight * 0.78
          : hideTop < window.innerHeight * 0.55;
      setVisible(pastHero && !nearSuite);
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
      data-floating-generate="home-browse"
      className={`pointer-events-none fixed inset-x-0 z-[var(--floating-generate-z)] flex justify-center px-3 pt-2 transition duration-300 bottom-[var(--floating-cta-safe-bottom)] lg:bottom-[var(--floating-cta-safe-bottom)] ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <Link
        href={BROWSE_GENERATE_HREF}
        prefetch={false}
        tabIndex={visible ? 0 : -1}
        data-home-browse-generate="360"
        className={`pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border border-[#c8ff3d]/50 bg-black/92 px-4 py-3 shadow-[0_0_40px_rgba(200,255,61,0.22),0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl transition hover:border-[#c8ff3d] hover:bg-black sm:max-w-lg ${
          visible ? "" : "pointer-events-none"
        }`}
      >
        <span className="min-w-0 text-left">
          <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#c8ff3d]/90">
            {t("home.browseCta.chip")}
          </span>
          <span className="block truncate text-sm font-black text-white">
            {t("home.browseCta.title")}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-[#c8ff3d] px-4 py-2 text-xs font-black text-black">
          {t("home.browseCta.btn")}
        </span>
      </Link>
    </div>
  );
}
