"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { CreditsBadge } from "@/components/CreditsBadge";
import { Footer } from "@/components/Footer";
import {
  LanguageProvider,
  useI18n,
} from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { ToastProvider } from "@/components/Toast";
import { trackPageView } from "@/lib/analytics";
import { MOBILE_NAV, PRIMARY_NAV } from "@/lib/softLaunch";
import { cn } from "@/lib/utils";

const MORE = [
  { href: "/tools", label: "Tools", tag: null },
  { href: "/guides", label: "Guides", tag: null },
  { href: "/toys", label: "Toy types", tag: null },
  { href: "/login", label: "Sign in", tag: null },
  { href: "/profile", label: "Profile", tag: null },
] as const;

function active(path: string, href: string) {
  const route = href.split("?")[0];
  if (route === "/") return path === "/";
  return path === route || path.startsWith(`${route}/`);
}

function MoreMenu({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const selected = MORE.some((item) => active(path, item.href));

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open]);

  return (
    <div ref={root} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "text-[13px] font-semibold transition-colors",
          open || selected ? "text-white" : "text-white/52 hover:text-white"
        )}
      >
        More <span aria-hidden>▾</span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-3 min-w-44 rounded-2xl border border-white/10 bg-[#0c0c10]/95 p-1.5 shadow-2xl backdrop-blur-xl"
        >
          {MORE.map((item) => (
            <Link
              key={item.href}
              role="menuitem"
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center justify-between gap-4 rounded-xl px-3 py-2 text-[13px] font-medium",
                active(path, item.href)
                  ? "bg-white/[0.07] text-[#c8ff3d]"
                  : "text-white/68 hover:bg-white/[0.05] hover:text-white"
              )}
            >
              <span>{item.label}</span>
              {item.tag ? (
                <span className="text-[9px] font-bold uppercase tracking-wide text-white/35">
                  {item.tag}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      ) : null}
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

  useEffect(() => {
    trackPageView(path);
  }, [path]);

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-black text-white">
      <header className="sticky top-0 z-50 hidden h-14 items-center gap-4 border-b border-white/[0.08] bg-black/80 px-5 backdrop-blur-xl lg:flex">
        <Link
          href="/"
          className="flex shrink-0 items-center"
          aria-label="Pikbo Explore"
        >
          <Logo size={30} />
        </Link>
        <nav
          className="mx-auto flex items-center gap-5 xl:gap-7"
          aria-label="Primary navigation"
        >
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(path, item.href) ? "page" : undefined}
              className={cn(
                "relative whitespace-nowrap text-[13px] font-semibold transition-colors",
                active(path, item.href)
                  ? "text-white"
                  : "text-white/52 hover:text-white"
              )}
            >
              {item.label}
              {active(path, item.href) ? (
                <span className="absolute -bottom-[18px] left-0 right-0 h-px bg-[#c8ff3d] shadow-[0_0_12px_#c8ff3d]" />
              ) : null}
            </Link>
          ))}
          <MoreMenu path={path} />
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher />
          <CreditsBadge />
          <Link
            href="/create?mode=seller-pack"
            className="rounded-full bg-[#c8ff3d] px-4 py-1.5 text-[13px] font-black text-black shadow-[0_0_24px_rgba(200,255,61,0.24)] transition hover:-translate-y-0.5 hover:bg-[#d5ff6b]"
            data-appshell-cta="generate"
          >
            {t("cta.launchPack")}
          </Link>
        </div>
      </header>

      <header className="sticky top-0 z-50 flex h-12 items-center justify-between border-b border-white/[0.08] bg-black/80 px-3 backdrop-blur-xl lg:hidden">
        <Link href="/" aria-label="Pikbo Explore">
          <Logo size={26} wordClassName="text-base" />
        </Link>
        <div className="flex items-center gap-1.5">
          <LanguageSwitcher compact />
          <CreditsBadge compact />
          <Link
            href="/create?mode=seller-pack"
            className="rounded-full bg-[#c8ff3d] px-3 py-1.5 text-[11px] font-black text-black"
            data-appshell-cta="generate"
          >
            {t("cta.launchPack")}
          </Link>
        </div>
      </header>

      <div className="flex min-w-0 flex-1 flex-col">
        <CommandPalette />
        <main className="min-w-0 flex-1 bg-black">{children}</main>
        {!hideFooter ? <Footer /> : null}
      </div>

      <nav
        className="sticky bottom-0 z-50 grid grid-cols-5 border-t border-white/[0.08] bg-[#070708]/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label="Mobile navigation"
      >
        {MOBILE_NAV.map((item) => {
          const on = active(path, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center px-0.5 py-3 text-[10px] font-semibold transition-colors",
                item.href.startsWith("/create")
                  ? "text-[#c8ff3d]"
                  : on
                    ? "text-[#c8ff3d]"
                    : "text-white/42"
              )}
            >
              <span
                className={cn(
                  "mb-1 h-1 w-1 rounded-full",
                  on ? "bg-[#c8ff3d]" : "bg-transparent"
                )}
                aria-hidden
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
