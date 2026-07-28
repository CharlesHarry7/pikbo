"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { Footer } from "@/components/Footer";
import { LanguageProvider } from "@/components/LanguageProvider";
import { Logo } from "@/components/Logo";
import { ToastProvider } from "@/components/Toast";
import { trackPageView } from "@/lib/analytics";
import { MOBILE_NAV, PRIMARY_NAV } from "@/lib/softLaunch";
import { cn } from "@/lib/utils";

function active(path: string, href: string) {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
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
      <header className="sticky top-0 z-50 hidden h-14 items-center border-b border-white/[0.08] bg-black/80 px-6 backdrop-blur-xl lg:flex">
        <Link
          href="/"
          className="flex shrink-0 items-center"
          aria-label="Pikbo Explore"
        >
          <Logo size={30} />
        </Link>
        <nav
          className="mx-auto flex items-center gap-8"
          aria-label="Primary navigation"
        >
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
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
        </nav>
        <div className="w-[112px]" aria-hidden />
      </header>

      <header className="sticky top-0 z-50 flex h-12 items-center justify-between border-b border-white/[0.08] bg-black/80 px-3 backdrop-blur-xl lg:hidden">
        <Link href="/" aria-label="Pikbo Explore">
          <Logo size={26} wordClassName="text-base" />
        </Link>
        <Link
          href="/create"
          className="rounded-full bg-[#c8ff3d] px-4 py-1.5 text-[11px] font-black text-black"
        >
          Create
        </Link>
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
              className={cn(
                "flex min-w-0 flex-col items-center justify-center px-0.5 py-3 text-[10px] font-semibold transition-colors",
                on ? "text-[#c8ff3d]" : "text-white/42"
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
