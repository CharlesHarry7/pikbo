"use client";

import Link from "next/link";
import { JOB_INTENTS, type JobIntentId } from "@/lib/jobIntents";
import { useI18n } from "@/components/LanguageProvider";

const JOB_I18N: Record<
  JobIntentId,
  { label: string; blurb: string }
> = {
  "etsy-listing": { label: "job.etsy", blurb: "job.etsy.blurb" },
  "tiktok-hook": { label: "job.tiktok", blurb: "job.tiktok.blurb" },
  "blind-box-drop": { label: "job.blindbox", blurb: "job.blindbox.blurb" },
  "shelf-display": { label: "job.shelf", blurb: "job.shelf.blurb" },
  "seller-pack": { label: "job.seller", blurb: "job.seller.blurb" },
};

/**
 * Creative Director commercial goals — pick an outcome, not a model name.
 * Visible on all viewports (Phase A); Seller Pack is the default launch path.
 */
export function JobIntentBar({
  activeId,
  onPick,
}: {
  activeId?: JobIntentId | null;
  onPick: (id: JobIntentId) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="border-b border-white/10 bg-gradient-to-r from-[var(--mint)]/[0.05] via-black/50 to-black/40 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--mint)]/85">
            {t("job.what")}
          </p>
          <p className="text-[9px] text-white/35 sm:text-[10px]">
            Sales mode · fidelity first · own photos only
          </p>
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {JOB_INTENTS.map((job) => {
            const i18n = JOB_I18N[job.id];
            const label = t(i18n.label);
            const blurb = t(i18n.blurb);
            if (job.href) {
              return (
                <Link
                  key={job.id}
                  href={job.href}
                  className="shrink-0 rounded-2xl border border-[var(--mint)]/45 bg-[var(--mint)]/[0.12] px-3 py-2 text-left shadow-[0_0_20px_rgba(200,255,61,0.1)] transition hover:border-[var(--mint)] hover:bg-[var(--mint)]/20 sm:px-3.5"
                >
                  <span className="block text-[11px] font-bold text-[var(--mint)]">
                    {label}
                  </span>
                  <span className="mt-0.5 block max-w-[11rem] text-[10px] leading-snug text-white/50">
                    {blurb}
                  </span>
                </Link>
              );
            }
            const active = activeId === job.id;
            return (
              <button
                key={job.id}
                type="button"
                onClick={() => onPick(job.id)}
                className={`shrink-0 rounded-2xl border px-3 py-2 text-left transition sm:px-3.5 ${
                  active
                    ? "border-[var(--mint)] bg-[var(--mint)]/15 text-[var(--mint)] shadow-[0_0_22px_rgba(200,255,61,0.12)]"
                    : "border-white/12 bg-black/30 text-white/75 hover:border-white/30 hover:bg-black/45"
                }`}
              >
                <span className="block text-[11px] font-bold">{label}</span>
                <span className="mt-0.5 block max-w-[11rem] text-[10px] leading-snug opacity-70">
                  {blurb}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
