"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/LanguageProvider";

/**
 * HF Generate–style suite chrome for the toy vertical.
 * Modes map to real Pikbo surfaces only (no fake Cinema tabs).
 */
/** Video modes first — Library/Assets next; Stills optional support (not the product). */
const MODE_DEFS = [
  {
    id: "generate" as const,
    href: "/create",
    labelKey: "suite.mode.generate",
    blurbKey: "suite.mode.generate.blurb",
  },
  {
    id: "flow" as const,
    href: "/flow",
    labelKey: "suite.mode.flow",
    blurbKey: "suite.mode.flow.blurb",
  },
  {
    id: "modules" as const,
    href: "/modules",
    labelKey: "suite.mode.modules",
    blurbKey: "suite.mode.modules.blurb",
  },
  {
    id: "seller" as const,
    href: "/create?mode=seller-pack",
    labelKey: "suite.mode.seller",
    blurbKey: "suite.mode.seller.blurb",
  },
  {
    id: "recipes" as const,
    href: "/effects",
    labelKey: "suite.mode.recipes",
    blurbKey: "suite.mode.recipes.blurb",
  },
  {
    id: "library" as const,
    href: "/library",
    labelKey: "suite.mode.library",
    blurbKey: "suite.mode.library.blurb",
  },
  {
    id: "cinema" as const,
    href: "/cinema",
    labelKey: "suite.mode.cinema",
    blurbKey: "suite.mode.cinema.blurb",
  },
  {
    id: "image" as const,
    href: "/image",
    labelKey: "suite.mode.stills",
    blurbKey: "suite.mode.stills.blurb",
  },
];

export function GenerateSuiteChrome({
  compact,
}: {
  compact?: boolean;
}) {
  const { t } = useI18n();
  const path = usePathname() || "";
  const sp = useSearchParams();
  const sellerMode =
    sp?.get("mode") === "seller-pack" || sp?.get("mode") === "seller";
  const isImage = path === "/image" || path.startsWith("/image/");

  function isActive(id: (typeof MODE_DEFS)[number]["id"]) {
    if (id === "generate") {
      return (path === "/create" || path === "/generate") && !sellerMode;
    }
    if (id === "image") {
      return isImage;
    }
    if (id === "seller") {
      return path === "/create" && sellerMode;
    }
    if (id === "modules") {
      return path === "/modules" || path === "/apps";
    }
    if (id === "recipes") {
      return path.startsWith("/effects");
    }
    if (id === "flow") {
      return path === "/flow";
    }
    if (id === "library") {
      return path === "/library" || path.startsWith("/library/");
    }
    if (id === "cinema") {
      return path === "/cinema" || path.startsWith("/cinema/");
    }
    return false;
  }

  return (
    <div className="suite-chrome px-4 py-3">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1
              className={cn(
                "font-display font-black tracking-tight text-white",
                compact ? "text-base" : "text-lg sm:text-xl"
              )}
            >
              {isImage ? t("suite.stills") : t("cta.generate")}
            </h1>
            <span className="rounded-full border border-[var(--mint)]/40 bg-[var(--mint)]/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[var(--mint)] shadow-[0_0_20px_rgba(200,255,61,0.12)]">
              {t("suite.toyStudio")}
            </span>
            {isImage ? (
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-100/90">
                {t("suite.preview")}
              </span>
            ) : (
              <span className="hidden rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-semibold text-white/40 sm:inline">
                {t("suite.seedanceLive")}
              </span>
            )}
          </div>
          {!compact && (
            <p className="mt-0.5 text-[11px] text-white/45 sm:text-xs">
              {isImage ? t("suite.line.stills") : t("suite.line.video")}
            </p>
          )}
        </div>
        <nav
          aria-label="Suite modes"
          className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]"
        >
          {MODE_DEFS.map((m) => {
            const active = isActive(m.id);
            return (
              <Link
                key={m.id}
                href={m.href}
                className={cn(
                  "shrink-0 rounded-xl border px-3 py-1.5 transition duration-200",
                  active
                    ? "border-[var(--mint)] bg-[var(--mint)]/15 text-[var(--mint)] shadow-[0_0_24px_rgba(200,255,61,0.12)]"
                    : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25 hover:bg-white/[0.05] hover:text-white"
                )}
              >
                <span className="block text-[11px] font-bold leading-none">
                  {t(m.labelKey)}
                </span>
                <span className="mt-0.5 block text-[9px] opacity-60">
                  {t(m.blurbKey)}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
