"use client";

import Link from "next/link";
import {
  BIBLE_MATERIAL_CHIPS,
  type AssetBrief,
} from "@/lib/assetBrief";
import {
  FIDELITY_ANGLE_CHIPS,
  type ToyIdentity,
} from "@/lib/toyIdentity";
import { useI18n } from "@/components/LanguageProvider";

/**
 * CD Phase B/C-lite — Asset Brief + bible + optional angle/secondary still.
 * Secondary still is client preview only (not multi-image model input).
 */
export function AssetBriefPanel({
  brief,
  identity,
  onIdentityPatch,
  onPickRecipe,
  fidelityAngles = [],
  onToggleAngle,
  secondaryStill = null,
  onSecondaryStill,
  collapsed = false,
  onToggle,
  className = "",
}: {
  brief: AssetBrief;
  identity: ToyIdentity;
  onIdentityPatch: (patch: Partial<ToyIdentity>) => void;
  onPickRecipe: (slug: string) => void;
  fidelityAngles?: string[];
  onToggleAngle?: (angle: string) => void;
  secondaryStill?: string | null;
  onSecondaryStill?: (dataUrl: string | null) => void;
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const angleLabel = (a: string) => {
    if (locale !== "zh") return a;
    const map: Record<string, string> = {
      front: "正面",
      side: "侧面",
      back: "背面",
      detail: "细节",
      packaging: "包装",
    };
    return map[a] ?? a;
  };

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
            <p className="mt-2 text-[9px] font-bold uppercase tracking-wide text-white/35">
              {t("brief.materials")}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {BIBLE_MATERIAL_CHIPS.map((chip) => {
                const active = identity.preserve
                  .toLowerCase()
                  .includes(chip.toLowerCase());
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      const cur = identity.preserve.trim();
                      if (active) {
                        // Remove chip token (case-insensitive, optional comma)
                        const next = cur
                          .split(/[,;/]+/)
                          .map((s) => s.trim())
                          .filter(
                            (s) => s.toLowerCase() !== chip.toLowerCase()
                          )
                          .join(", ");
                        onIdentityPatch({ preserve: next });
                      } else {
                        const next = cur ? `${cur}, ${chip}` : chip;
                        onIdentityPatch({
                          preserve: next.slice(0, 120),
                        });
                      }
                    }}
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${
                      active
                        ? "border-[var(--mint)]/50 bg-[var(--mint)]/15 text-[var(--mint)]"
                        : "border-white/12 bg-black/30 text-white/55 hover:border-white/25 hover:text-white/80"
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>

            {/* Phase C-lite: angle tags + optional secondary still (not Soul ID) */}
            <div
              data-fidelity-refs="c-lite"
              className="mt-3 border-t border-white/[0.06] pt-2"
            >
              <p className="text-[9px] font-bold uppercase tracking-wide text-white/35">
                {t("brief.angles")}
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-white/40">
                {t("brief.angles.hint")}
              </p>
              {onToggleAngle ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {FIDELITY_ANGLE_CHIPS.map((angle) => {
                    const active = fidelityAngles.includes(angle);
                    return (
                      <button
                        key={angle}
                        type="button"
                        onClick={() => onToggleAngle(angle)}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${
                          active
                            ? "border-[var(--mint)]/50 bg-[var(--mint)]/15 text-[var(--mint)]"
                            : "border-white/12 bg-black/30 text-white/55 hover:border-white/25"
                        }`}
                      >
                        {angleLabel(angle)}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {onSecondaryStill ? (
                <div className="mt-2">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-white/35">
                    {t("brief.secondary")}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/40">
                    {t("brief.secondary.hint")}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {secondaryStill ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={secondaryStill}
                        alt="secondary fidelity still"
                        className="h-14 w-14 rounded-lg border border-white/15 object-cover"
                      />
                    ) : null}
                    <label className="cursor-pointer rounded-lg border border-white/15 bg-black/40 px-2.5 py-1.5 text-[10px] font-semibold text-white/70 hover:border-[var(--mint)]/40 hover:text-[var(--mint)]">
                      {secondaryStill
                        ? t("brief.secondary.replace")
                        : t("brief.secondary.add")}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (!file) return;
                          if (file.size > 8_000_000) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const r = reader.result;
                            if (typeof r === "string" && r.startsWith("data:image")) {
                              onSecondaryStill(r);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    {secondaryStill ? (
                      <button
                        type="button"
                        onClick={() => onSecondaryStill(null)}
                        className="text-[10px] font-semibold text-white/45 hover:text-white/75"
                      >
                        {t("brief.secondary.clear")}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
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
