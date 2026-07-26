"use client";

import type { DirectorPlan } from "@/lib/directorPlan";
import { useI18n } from "@/components/LanguageProvider";

/**
 * CD Phase B2 — confirm commercial plan + cost before generate.
 */
export function DirectorPlanPanel({
  plan,
  className = "",
}: {
  plan: DirectorPlan;
  className?: string;
}) {
  const { t } = useI18n();
  if (!plan.ready) return null;

  return (
    <section
      data-director-plan="cd-phase-b2"
      aria-label="Director Plan"
      className={`rounded-xl border border-[var(--mint)]/20 bg-gradient-to-b from-[var(--mint)]/[0.06] to-[var(--bg-soft)] p-3 text-xs ${className}`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--mint)]">
            {t("plan.title")}
          </p>
          <p className="mt-0.5 text-[10px] text-white/40">{t("plan.sub")}</p>
        </div>
        <span className="rounded-full border border-white/15 bg-black/30 px-2 py-0.5 text-[10px] font-bold text-white/70">
          {plan.modeLabel}
        </span>
      </div>

      <dl className="space-y-1.5">
        {plan.rows.map((row) => (
          <div key={row.id} className="flex gap-2 text-[11px] leading-snug">
            <dt className="w-14 shrink-0 font-semibold text-white/40">
              {row.label}
            </dt>
            <dd
              className={
                row.tone === "warn"
                  ? "text-amber-100/90"
                  : row.tone === "muted"
                    ? "text-white/45"
                    : "text-white/80"
              }
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <p
        className={`mt-2.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
          plan.blockers.length
            ? "border-amber-400/30 bg-amber-400/[0.08] text-amber-100/90"
            : "border-[var(--mint)]/25 bg-[var(--mint)]/[0.08] text-[var(--mint)]"
        }`}
      >
        {plan.blockers.length ? plan.blockers[0] : plan.costLabel}
      </p>
      {plan.blockers.length > 1 ? (
        <ul className="mt-1 space-y-0.5 text-[10px] text-amber-100/70">
          {plan.blockers.slice(1).map((b) => (
            <li key={b}>· {b}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
