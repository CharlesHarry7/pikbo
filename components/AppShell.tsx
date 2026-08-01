"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
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

function active(path: string, href: string) {
  const route = href.split("?")[0];
  if (route === "/") return path === "/";
  return path === route || path.startsWith(`${route}/`);
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
  const create = path.startsWith("/create");
  const editorialFrontDoor = home || create;
  const hideFooter =
    home ||
    create ||
    path.startsWith("/supercomputer") ||
    path.startsWith("/explore") ||
    path.startsWith("/community");

  useEffect(() => {
    trackPageView(path);
  }, [path]);

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-[#0A0A0A] text-[#F7F4ED]">
      <header className="sticky top-0 z-50 hidden h-16 items-center border-b border-white/10 bg-[#0A0A0A]/92 px-7 backdrop-blur-xl lg:flex">
        <Link href="/" className="shrink-0" aria-label="Pikbo home">
          <Logo size={30} accent={editorialFrontDoor ? "#E94B35" : "#CBFF3D"} />
        </Link>
        <nav
          className="mx-auto flex items-center gap-9"
          aria-label="Primary navigation"
          data-primary-create-href="/create?mode=seller-pack"
        >
          {PRIMARY_NAV.map((item) => {
            const on = active(path, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative py-5 text-[13px] font-bold transition-colors",
                  on
                    ? "text-[#F7F4ED]"
                    : "text-[#F7F4ED]/46 hover:text-[#F7F4ED]"
                )}
              >
                {item.label}
                {on ? (
                  <span
                    className={cn(
                      "absolute inset-x-0 bottom-0 h-0.5",
                      editorialFrontDoor ? "bg-[#E94B35]" : "bg-[#CBFF3D]"
                    )}
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <LanguageSwitcher />
          <CreditsBadge />
        </div>
      </header>

      <header className="sticky top-0 z-50 flex h-12 items-center justify-between border-b border-white/10 bg-[#0A0A0A]/92 px-3 backdrop-blur-xl lg:hidden">
        <Link href="/" aria-label="Pikbo home">
          <Logo
            size={26}
            wordClassName="text-base"
            accent={editorialFrontDoor ? "#E94B35" : "#CBFF3D"}
          />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <CreditsBadge compact />
          {create ? (
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#E94B35]">
              {t("cta.launchPack")}
            </span>
          ) : null}
        </div>
      </header>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-w-0 flex-1 bg-[#0A0A0A]">{children}</main>
        {!hideFooter ? <Footer /> : null}
      </div>

      <nav
        className="sticky bottom-0 z-50 grid grid-cols-5 border-t border-white/10 bg-[#0A0A0A]/96 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
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
                "flex min-w-0 flex-col items-center justify-center px-1 py-3 text-[10px] font-bold transition-colors",
                on
                  ? editorialFrontDoor
                    ? "text-[#E94B35]"
                    : "text-[#CBFF3D]"
                  : "text-[#F7F4ED]/38"
              )}
            >
              <span
                className={cn(
                  "mb-1 h-1 w-1 rounded-full",
                  on
                    ? editorialFrontDoor
                      ? "bg-[#E94B35]"
                      : "bg-[#CBFF3D]"
                    : "bg-transparent"
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
