"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/LanguageProvider";
import { createGenerate360Href } from "@/lib/jobIntents";

const BROWSE_GENERATE_HREF = createGenerate360Href("home-browse");

/**
 * Calm floating Generate CTA while browsing the home gallery.
 * Gallery-calm home hides tab nav — only clear the home indicator.
 * z-index sits above page content and below sticky header (z-50).
 * Shows after leaving the hero; hides near product rail (legacy) or trust footer.
 */
export function HomeBrowseCta() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Gallery-calm: designer-toy shelf. Legacy density: #toy-wall proof grid.
    const browseSurface =
      document.getElementById("toy-wall") ??
      document.querySelector<HTMLElement>('[data-home-gallery="designer-toy"]');
    if (!browseSurface) return;

    // Prefetch listing-spin Generate for faster jump
    const prefetch = document.createElement("link");
    prefetch.rel = "prefetch";
    prefetch.href = BROWSE_GENERATE_HREF;
    prefetch.as = "document";
    document.head.appendChild(prefetch);

    const onScroll = () => {
      const pastHero = window.scrollY > window.innerHeight * 0.55;
      // Prefer product rail; then trust footer; fall back to browse surface bottom.
      const hideTarget =
        document.getElementById("hf-product-rail") ??
        document.querySelector<HTMLElement>("[data-home-trust-footer]") ??
        browseSurface;
      const hideTop = hideTarget?.getBoundingClientRect().bottom ?? Infinity;
      const hideRectTop = hideTarget?.getBoundingClientRect().top ?? Infinity;
      const isEarlyHideTarget =
        hideTarget?.id === "hf-product-rail" ||
        hideTarget?.hasAttribute("data-home-trust-footer");
      // Hide once suite / trust is well into view (or surface bottom nears fold)
      const nearEnd = isEarlyHideTarget
        ? hideRectTop < window.innerHeight * 0.78
        : hideTop < window.innerHeight * 0.55;
      setVisible(pastHero && !nearEnd);
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
        className={`pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border border-[var(--neon-pink)]/40 bg-[var(--card)]/95 px-4 py-3 shadow-[0_0_32px_rgba(196,165,116,0.14),0_12px_36px_rgba(0,0,0,0.45)] backdrop-blur-xl transition hover:border-[var(--neon-pink)]/70 hover:bg-[var(--card)] sm:max-w-lg ${
          visible ? "" : "pointer-events-none"
        }`}
      >
        <span className="min-w-0 text-left">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--neon-pink)]/90">
            {t("home.browseCta.chip")}
          </span>
          <span className="block truncate text-sm font-semibold text-[var(--fg)]">
            {t("home.browseCta.title")}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-[var(--neon-pink)] px-4 py-2 text-xs font-semibold text-[var(--primary-foreground)]">
          {t("home.browseCta.btn")}
        </span>
      </Link>
    </div>
  );
}
