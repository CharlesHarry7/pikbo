"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT } from "@/lib/i18n";
import { useI18n } from "@/components/LanguageProvider";

/** Globe dropdown to switch UI language. Compact variant for the mobile header. */
export function LanguageSwitcher({
  compact = false,
  tone = "dark",
}: {
  compact?: boolean;
  tone?: "dark" | "light";
}) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("lang.change")}
        title={t("lang.change")}
        className={`flex items-center gap-1.5 rounded-full border transition-colors ${
          tone === "light"
            ? "border-[#C9CED8] text-[#5F6774] hover:border-[#2457E6] hover:text-[#15171B]"
            : "border-white/10 text-white/70 hover:border-white/25 hover:text-white"
        } ${
          compact ? "h-11 px-3 text-[11px]" : "px-3 py-1.5 text-[13px]"
        }`}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.5 3.5 5.7 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.7-3.5-9s1-6.5 3.5-9Z" />
        </svg>
        <span className="font-semibold">{LOCALE_SHORT[locale]}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-xl border border-white/10 bg-[#0c0c0e] py-1 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]"
        >
          {LOCALES.map((l) => (
            <li key={l} role="option" aria-selected={l === locale}>
              <button
                type="button"
                onClick={() => {
                  setLocale(l);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition-colors hover:bg-white/[0.06] ${
                  l === locale ? "text-[var(--neon-pink)]" : "text-white/80"
                }`}
              >
                {LOCALE_LABELS[l]}
                {l === locale && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
