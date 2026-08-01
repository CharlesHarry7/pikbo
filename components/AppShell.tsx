"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
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
        <Suspense fallback={children}>
          <AppShellInner>{children}</AppShellInner>
        </Suspense>
      </ToastProvider>
    </LanguageProvider>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const path = usePathname() || "/";
  const searchParams = useSearchParams();
  const home = path === "/";
  const create = path.startsWith("/create");
  const sellerPackCreate =
    create && ["seller-pack", "seller"].includes(searchParams.get("mode") || "");
  const lightShell = home || sellerPackCreate;
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
    <div
      className={cn(
        "flex min-h-screen min-w-0 flex-col",
        lightShell
          ? "bg-[#EEF0F4] text-[#15171B]"
          : "bg-[#0A0A0A] text-[#F7F4ED]"
      )}
    >
      <header
        className={cn(
          "sticky top-0 z-50 hidden h-16 items-center border-b px-7 backdrop-blur-xl lg:flex",
          lightShell
            ? "border-[#D4D8E0] bg-[#F7F8FA]/92"
            : "border-white/10 bg-[#0A0A0A]/92"
        )}
      >
        <Link href="/" className="shrink-0" aria-label="Pikbo home">
          <Logo
            size={30}
            wordClassName={cn("text-[19px]", lightShell && "!text-[#15171B]")}
          />
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
                  lightShell
                    ? on
                      ? "text-[#15171B]"
                      : "text-[#6D7480] hover:text-[#15171B]"
                    : on
                      ? "text-[#F7F4ED]"
                      : "text-[#F7F4ED]/46 hover:text-[#F7F4ED]"
                )}
              >
                {item.label}
                {on ? (
                  <span
                    className={cn(
                      "absolute inset-x-0 bottom-0 h-0.5",
                      lightShell ? "bg-[#2457E6]" : "bg-[#CBFF3D]"
                    )}
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <LanguageSwitcher tone={lightShell ? "light" : "dark"} />
          <CreditsBadge tone={lightShell ? "light" : "dark"} />
        </div>
      </header>

      <header
        className={cn(
          "sticky top-0 z-50 flex h-12 items-center justify-between border-b px-3 backdrop-blur-xl lg:hidden",
          lightShell
            ? "border-[#D4D8E0] bg-[#F7F8FA]/94"
            : "border-white/10 bg-[#0A0A0A]/92"
        )}
      >
        <Link href="/" aria-label="Pikbo home">
          <Logo
            size={26}
            wordClassName={cn("text-base", lightShell && "!text-[#15171B]")}
          />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact tone={lightShell ? "light" : "dark"} />
          <CreditsBadge compact tone={lightShell ? "light" : "dark"} />
          {create ? (
            <span
              className={cn(
                "text-[10px] font-black uppercase tracking-[0.16em]",
                lightShell ? "text-[#2457E6]" : "text-[#CBFF3D]"
              )}
            >
              {t("cta.launchPack")}
            </span>
          ) : null}
        </div>
      </header>

      <div className="flex min-w-0 flex-1 flex-col">
        <main
          className={cn(
            "min-w-0 flex-1",
            lightShell ? "bg-[#EEF0F4]" : "bg-[#0A0A0A]"
          )}
        >
          {children}
        </main>
        {!hideFooter ? <Footer /> : null}
      </div>

      {!sellerPackCreate ? <nav
        className={cn(
          "z-50 grid grid-cols-5 border-t px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden",
          home
            ? "relative border-[#D4D8E0] bg-[#F7F8FA]/96"
            : "sticky bottom-0 border-white/10 bg-[#0A0A0A]/96"
        )}
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
                home
                  ? on
                    ? "text-[#2457E6]"
                    : "text-[#747B87]"
                  : on
                    ? "text-[#CBFF3D]"
                    : "text-[#F7F4ED]/38"
              )}
            >
              <span
                className={cn(
                  "mb-1 h-1 w-1 rounded-full",
                  on
                    ? home
                      ? "bg-[#2457E6]"
                      : "bg-[#CBFF3D]"
                    : "bg-transparent"
                )}
                aria-hidden
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav> : null}
    </div>
  );
}
