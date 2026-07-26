"use client";

import Link from "next/link";
import type { AssetBrief } from "@/lib/assetBrief";
import type { ToyIdentity } from "@/lib/toyIdentity";
import { useI18n } from "@/components/LanguageProvider";

/**
 * CD Phase B — post-upload Asset Brief + lightweight character bible draft.
 * Pure UI over `buildAssetBrief` + toyIdentity fields.
 */
export function AssetBriefPanel({
  brief,
  identity,
  onIdentityPatch,
  onPickRecipe,
  collapsed = false,
  onToggle,
  className = "",
}: {
  brief: AssetBrief;
  identity: ToyIdentity;
  onIdentityPatch: (patch: Partial<ToyIdentity>) => void;
  onPickRecipe: (slug: string) => void;
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}) {
  const { t } = useI18n();

  if (!brief.ready) return null;

  return (
    <section
      data-asset-brief="cd-phase-b"
      aria-label="Asset Brief"
      className={`overflow-hidden rounded-2xl border border-[var(--mint)]/25 bg-gradient-to-b from-[var(--mint)]/[0.07] to-black/40 ${className}`}
    >
      <div className="flex items-start justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--mint)]">
            {t("brief.title")}
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-white/40">
            {t("brief.disclaimer")}
          </p>
        </div>
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-semibold text-white/55 hover:border-white/30 hover:text-white/80"
          >
            {collapsed ? t("brief.expand") : t("brief.collapse")}
          </button>
        ) : null}
      </div>

      {!collapsed ? (
        <div className="space-y-3 border-t border-white/[0.06] px-3 py-3">
          <ul className="space-y-1.5">
            {brief.bullets.map((b) => (
              <li
                key={b.id}
                className={`flex gap-2 text-[11px] leading-snug ${
                  b.tone === "warn"
                    ? "text-amber-100/90"
                    : b.tone === "ok"
                      ? "text-white/75"
                      : "text-white/55"
                }`}
              >
                <span
                  className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                    b.tone === "warn"
                      ? "bg-amber-300"
                      : b.tone === "ok"
                        ? "bg-[var(--mint)]"
                        : "bg-white/35"
                  }`}
                  aria-hidden
                />
                <span>{b.text}</span>
              </li>
            ))}
          </ul>

          {brief.recipes.length > 0 ? (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-white/40">
                {t("brief.tryRecipes")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {brief.recipes.map((r) => (
                  <button
                    key={r.slug}
                    type="button"
                    onClick={() => onPickRecipe(r.slug)}
                    className="rounded-xl border border-white/12 bg-black/35 px-2.5 py-1.5 text-left transition hover:border-[var(--mint)]/50 hover:bg-[var(--mint)]/10"
                  >
                    <span className="block text-[11px] font-bold text-white/90">
                      {r.label}
                    </span>
                    <span className="block text-[9px] text-white/40">
                      {r.reason}
                    </span>
                  </button>
                ))}
                <Link
                  href={brief.sellerPackHref}
                  className="rounded-xl border border-[var(--mint)]/40 bg-[var(--mint)]/[0.12] px-2.5 py-1.5 text-left transition hover:bg-[var(--mint)]/20"
                >
                  <span className="block text-[11px] font-bold text-[var(--mint)]">
                    {t("brief.sellerPack")}
                  </span>
                  <span className="block text-[9px] text-white/45">
                    {t("brief.sellerPack.sub")}
                  </span>
                </Link>
              </div>
            </div>
          ) : null}

          {/* Character bible draft — first-run surface (not advanced-only) */}
          <div
            data-character-bible="draft"
            className="rounded-xl border border-white/10 bg-black/35 px-2.5 py-2"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--mint)]/85">
              {t("brief.bible")}
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-white/40">
              {t("brief.bible.hint")}
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="text-[10px] font-semibold text-white/45">
                  {t("create.sku")}
                </span>
                <input
                  value={identity.sku}
                  onChange={(e) => onIdentityPatch({ sku: e.target.value })}
                  placeholder={t("brief.sku.ph")}
                  maxLength={48}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-xs outline-none focus:border-[var(--mint)] focus:ring-1 focus:ring-[var(--mint)]/30"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold text-white/45">
                  {t("create.preserve")}
                </span>
                <input
                  value={identity.preserve}
                  onChange={(e) =>
                    onIdentityPatch({ preserve: e.target.value })
                  }
                  placeholder={t("brief.preserve.ph")}
                  maxLength={120}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-xs outline-none focus:border-[var(--mint)] focus:ring-1 focus:ring-[var(--mint)]/30"
                />
              </label>
            </div>
          </div>
        </div>
      ) : (
        <p className="border-t border-white/[0.06] px-3 py-2 text-[11px] text-white/45">
          {brief.aspectLabel}
          {identity.sku ? ` · ${identity.sku}` : ""} · {t("brief.collapsedHint")}
        </p>
      )}
    </section>
  );
}
