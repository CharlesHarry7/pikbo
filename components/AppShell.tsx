"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/site";
import { CreditsBadge } from "@/components/CreditsBadge";
import { Logo } from "@/components/Logo";
import { CommandPalette } from "@/components/CommandPalette";
import { ToastProvider } from "@/components/Toast";
import { Footer } from "@/components/Footer";
import { LanguageProvider, useI18n } from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { cn } from "@/lib/utils";
import { MOBILE_NAV, PRIMARY_NAV } from "@/lib/softLaunch";

/**
 * Soft-launch suite nav — hrefs frozen in lib/softLaunch PRIMARY_NAV.
 * More destinations carry Local/Preview tags — not empty-door peers.
 */
const PRIMARY_KEYS = [
  "nav.explore",
  "nav.video",
  "nav.image",
  "nav.cinema",
  "nav.lab",
] as const;

const PRIMARY = PRIMARY_NAV.map((item, i) => ({
  href: item.href,
  key: PRIMARY_KEYS[i],
}));

/** Soft-nav: More entries. SEO hubs first (哥飞内链) — then suite / preview doors. */
const MORE = [
  { href: "/for", key: "nav.for", tag: null },
  { href: "/tools", key: "nav.tools", tag: null },
  { href: "/toys", key: "nav.toys", tag: null },
  { href: "/guides", key: "nav.guides", tag: null },
  { href: "/effects", key: "nav.presets", tag: null },
  { href: "/flow", key: "nav.flow", tag: null },
  { href: "/apps", key: "nav.apps", tag: null },
  { href: "/library", key: "nav.library", tag: "Local" },
  { href: "/image", key: "nav.image", tag: "Preview" },
  { href: "/supercomputer", key: "nav.batch", tag: "Preview" },
  { href: "/cinema", key: "nav.cinema", tag: "Preview" },
  { href: "/models", key: "nav.models", tag: "Preview" },
  { href: "/explore", key: "nav.feed", tag: "Preview" },
  { href: "/community", key: "nav.lab", tag: null },
  { href: "/login", key: "nav.signin", tag: "Preview" },
  { href: "/profile", key: "nav.profile", tag: "Local" },
] as const;

/**
 * Mobile bottom bar — hrefs frozen in MOBILE_NAV (Generate center primary).
 * Lab remains desktop PRIMARY + More (not a bottom-tab peer of Modules).
 */
const MOBILE_KEYS = [
  "nav.home",
  "nav.lab",
  "cta.generate",
  "nav.library",
  "nav.profile",
] as const;
const MOBILE_ICONS = ["⌂", "◎", "✦", "▢", "○"] as const;

const MOBILE = MOBILE_NAV.map((item, i) => ({
  href: item.href,
  key: MOBILE_KEYS[i],
  icon: MOBILE_ICONS[i],
  primary: "primary" in item && item.primary === true,
}));

function active(path: string, href: string) {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(href + "/");
}

function MoreMenu({ path }: { path: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const moreActive = MORE.some((item) => active(path, item.href));

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "shrink-0 whitespace-nowrap text-[13px] font-medium transition-colors",
          moreActive || open ? "text-[#c8ff3d]" : "text-white/55 hover:text-white"
        )}
      >
        {t("nav.more")}
        <span className="ml-0.5 text-[10px] opacity-70" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 min-w-[10.5rem] rounded-xl border border-white/10 bg-[#0c0c10]/95 py-1.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-md"
        >
          {MORE.map((item) => (
            <Link
              key={item.href}
              role="menuitem"
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center justify-between gap-3 px-3.5 py-2 text-[13px] font-medium transition-colors",
                active(path, item.href)
                  ? "bg-white/[0.06] text-[#c8ff3d]"
                  : "text-white/70 hover:bg-white/[0.04] hover:text-white"
              )}
            >
              <span>{t(item.key)}</span>
              {item.tag ? (
                <span className="text-[9px] font-bold uppercase tracking-wide text-white/35">
                  {item.tag}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AppShellInner>{children}</AppShellInner>
      </ToastProvider>
    </LanguageProvider>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const path = usePathname() || "/";
  const home = path === "/";
  const hideFooter =
    home ||
    path.startsWith("/create") ||
    path.startsWith("/supercomputer") ||
    path.startsWith("/explore") ||
    path.startsWith("/community");

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* Desktop top nav — soft-launch critical path + More */}
      <header className="sticky top-0 z-50 hidden h-14 items-center gap-6 border-b border-white/[0.07] bg-black/75 px-5 backdrop-blur-xl lg:flex">
        <Link href="/" className="flex shrink-0 items-center" title={site.name}>
          <Logo size={30} />
        </Link>
        <nav className="flex min-w-0 flex-1 items-center gap-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PRIMARY.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative shrink-0 whitespace-nowrap text-[13px] font-medium transition-colors",
                active(path, item.href)
                  ? "text-[#c8ff3d]"
                  : "text-white/55 hover:text-white"
              )}
            >
              {t(item.key)}
              {active(path, item.href) ? (
                <span className="absolute -bottom-[15px] left-0 right-0 h-px bg-[#c8ff3d] shadow-[0_0_12px_#c8ff3d]" />
              ) : null}
            </Link>
          ))}
          <MoreMenu path={path} />
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <LanguageSwitcher />
          <CreditsBadge />
          <Link
            href="/pricing"
            className={cn(
              "text-[13px] font-semibold transition-colors",
              active(path, "/pricing")
                ? "text-[#c8ff3d]"
                : "text-white/70 hover:text-white"
            )}
          >
            {t("cta.pricing")}
          </Link>
          <Link
            href={home ? "/#home-tool" : "/create"}
            className="rounded-full bg-[#c8ff3d] px-4 py-1.5 text-[13px] font-black text-black shadow-[0_0_24px_rgba(200,255,61,0.25)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_0_32px_rgba(200,255,61,0.4)]"
          >
            {t("cta.generate")}
          </Link>
        </div>
      </header>

      <div className="flex min-w-0 flex-1 flex-col bg-black">
        <header
          className={cn(
            "sticky top-0 z-40 flex h-12 items-center justify-between px-3 lg:hidden",
            home
              ? "border-b border-transparent bg-black/30 backdrop-blur-md"
              : "border-b border-white/[0.07] bg-black/80 backdrop-blur-md"
          )}
        >
          <Link href="/" className="flex items-center">
            <Logo size={26} wordClassName="text-base" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher compact />
            <CreditsBadge compact />
            <Link
              href={home ? "/#home-tool" : "/create"}
              className="rounded-full bg-[#c8ff3d] px-3 py-1.5 text-[11px] font-black text-black"
            >
              {t("cta.generate")}
            </Link>
          </div>
        </header>

        <CommandPalette />
        <main className="flex-1 bg-black">{children}</main>
        {!hideFooter && <Footer />}

        <nav className="sticky bottom-0 z-40 flex items-end border-t border-white/[0.07] bg-[#09090b]/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
          {MOBILE.map((item) => {
            const on = active(path, item.href);
            if (item.primary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-1 flex-col items-center gap-0.5 py-1.5"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#c8ff3d] text-lg font-black text-black shadow-[0_0_28px_rgba(200,255,61,0.45)]">
                    {item.icon}
                  </span>
                  <span className="text-[9px] font-bold text-[#c8ff3d]">
                    {t(item.key)}
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[9px] font-semibold",
                  on ? "text-[#c8ff3d]" : "text-white/40"
                )}
              >
                <span className="text-base">{item.icon}</span>
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
