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

const FIRST_RUN_JOBS: JobIntentId[] = [
  "etsy-listing",
  "blind-box-drop",
  "tiktok-hook",
  "seller-pack",
];

/**
 * First-run selling tasks — four outcomes, not a model shelf.
 * The broader recipe catalog remains available inside Advanced.
 */
export function JobIntentBar({
  activeId,
  onPick,
  showSellerPack = true,
}: {
  activeId?: JobIntentId | null;
  onPick: (id: JobIntentId) => void;
  showSellerPack?: boolean;
}) {
  const { t } = useI18n();

  return (
    <div data-first-run-step="recipe">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--fg-muted)]">
          <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--mint)] text-[9px] text-black">
            2
          </span>
          Choose a selling task
        </p>
        <p className="text-[10px] text-white/40">
          One tap sets the recipe and format
        </p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
          {JOB_INTENTS.filter(
            (job) =>
              FIRST_RUN_JOBS.includes(job.id) &&
              (showSellerPack || job.id !== "seller-pack")
          ).map((job) => {
            const i18n = JOB_I18N[job.id];
            const label = t(i18n.label);
            const blurb = t(i18n.blurb);
            if (job.href) {
              return (
                <Link
                  key={job.id}
                  href={job.href}
                  onClick={() => onPick(job.id)}
                  className="min-w-0 rounded-xl border border-[var(--mint)]/45 bg-[var(--mint)]/[0.12] px-3 py-2.5 text-left shadow-[0_0_20px_color-mix(in_srgb,var(--neon-pink)_12%,transparent)] transition hover:border-[var(--mint)] hover:bg-[var(--mint)]/20"
                >
                  <span className="block text-[11px] font-bold leading-tight text-[var(--mint)]">
                    {label}
                  </span>
                  <span className="mt-1 block text-[9px] leading-snug text-white/50">
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
                className={`min-w-0 rounded-xl border px-3 py-2.5 text-left transition ${
                  active
                    ? "border-[var(--mint)] bg-[var(--mint)]/15 text-[var(--mint)] shadow-[0_0_22px_color-mix(in_srgb,var(--neon-pink)_14%,transparent)]"
                    : "border-white/12 bg-black/30 text-white/75 hover:border-white/30 hover:bg-black/45"
                }`}
              >
                <span className="block text-[11px] font-bold leading-tight">{label}</span>
                <span className="mt-1 block text-[9px] leading-snug opacity-70">
                  {blurb}
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
