"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { useI18n } from "@/components/LanguageProvider";
import { createGenerate360Href } from "@/lib/jobIntents";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

/**
 * Toy suite entry rail — HF Generate + Yiha modules pattern, verticalized.
 * Used on Home after premiere so users hit real product doors, not model zoo.
 */
/** Default listing recipe for suite Generate doors (remix contract). */
const SUITE_GENERATE_HREF = createGenerate360Href("suite-entry");
const SUITE_MOMENT_HREF = `${MOMENT_CREATE_HREF}&source=suite-entry` as const;

/** Product doors first; Flow is Preview (not a live Seedance job peer). */
const ENTRY_DEFS = [
  {
    href: SUITE_GENERATE_HREF,
    labelKey: "suite.generate",
    blurbKey: "suite.generate.blurb",
    emoji: "✦",
    hot: true,
    tagKey: "suite.tag.flagship" as const,
  },
  {
    href: SUITE_MOMENT_HREF,
    labelKey: "suite.seller",
    blurbKey: "suite.seller.blurb",
    emoji: "🛍️",
    hot: true,
    tagKey: "suite.tag.sell" as const,
  },
  {
    href: "/modules",
    labelKey: "suite.modules",
    blurbKey: "suite.modules.blurb",
    emoji: "▦",
    hot: true,
    tagKey: "suite.tag.jobs" as const,
  },
  {
    href: "/effects",
    labelKey: "suite.recipes",
    blurbKey: "suite.recipes.blurb",
    emoji: "🧸",
    hot: true,
    tagKey: "suite.tag.flagship" as const,
  },
  {
    href: "/flow",
    labelKey: "suite.flow",
    blurbKey: "suite.flow.blurb",
    emoji: "◎",
    hot: false,
    tagKey: "suite.tag.preview" as const,
  },
] as const;

export function SuiteEntryStrip({
  titleKey = "suite.title",
  subtitleKey = "suite.sub",
}: {
  titleKey?: string;
  subtitleKey?: string;
}) {
  const { t } = useI18n();

  return (
    <section className="border-b border-white/10 bg-gradient-to-b from-[#0c0c14] via-[#08080c] to-black px-3 py-8 sm:px-5">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--neon-pink)]">
              {t(titleKey)}
            </p>
            <p className="mt-1 text-[12px] text-white/50">{t(subtitleKey)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <FreeTrialCta
              path="/#suite"
              labelTry={t("suite.tryFree")}
              hideClipsChip
              className="text-[11px] font-semibold text-[var(--neon-pink)] hover:underline"
            />
            <Link
              href="/flow"
              className="text-[11px] font-semibold text-white/55 hover:text-white hover:underline"
            >
              {t("suite.browseFlow")}
            </Link>
            <Link
              href={SUITE_GENERATE_HREF}
              className="text-[11px] font-semibold text-[var(--neon-pink)] hover:underline"
              data-suite-entry="generate-remix"
            >
              {t("suite.openGenerate")}
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {ENTRY_DEFS.map((e) => (
            <Link
              key={e.href + e.labelKey}
              href={e.href}
              onClick={() =>
                track({
                  event: "landing_view",
                  path: "/",
                  meta: { cta: "suite_entry", label: e.labelKey },
                })
              }
              className={`group relative overflow-hidden rounded-2xl border px-3 py-3.5 transition duration-200 hover:-translate-y-0.5 ${
                "hot" in e && e.hot
                  ? "border-[var(--neon-pink)]/40 bg-[var(--neon-pink)]/[0.09] shadow-[0_0_32px_rgba(196,165,116,0.08)] hover:shadow-[0_0_40px_rgba(196,165,116,0.14)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
              }`}
            >
              <span
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--neon-pink)]/50 to-transparent opacity-0 transition group-hover:opacity-100"
                aria-hidden
              />
              <div className="flex items-start justify-between gap-1">
                <span className="text-lg" aria-hidden>
                  {e.emoji}
                </span>
                {"tagKey" in e && e.tagKey ? (
                  <span className="rounded-full border border-white/12 bg-black/35 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/45">
                    {t(e.tagKey)}
                  </span>
                ) : null}
              </div>
              <span className="mt-1.5 block text-[13px] font-bold text-white">
                {t(e.labelKey)}
              </span>
              <span className="mt-0.5 block text-[10px] leading-snug text-white/45">
                {t(e.blurbKey)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
