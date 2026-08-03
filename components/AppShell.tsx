"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { CreditsBadge } from "@/components/CreditsBadge";
import { Footer } from "@/components/Footer";
import {
  LanguageProvider,
} from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { ToastProvider } from "@/components/Toast";
import { trackPageView } from "@/lib/analytics";
import { parseMomentId } from "@/lib/moments";
import {
  MOBILE_NAV,
  PRIMARY_NAV,
} from "@/lib/softLaunch";
import { cn } from "@/lib/utils";

/** Moment shell (invited private) vs full studio Generate door. */
const DEFAULT_MOMENT_CREATE_HREF =
  "/create?mode=moment&effect=street-power-up&source=moment-shell";
const PRIMARY_NAV_CREATE_HREF =
  "/create?effect=360-spin-showcase&source=primary-nav";

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
  const path = usePathname() || "/";
  const searchParams = useSearchParams();
  const home = path === "/";
  const create = path.startsWith("/create");
  const sellerPackCreate =
    create && ["seller-pack", "seller"].includes(searchParams.get("mode") || "");
  const momentValues = searchParams.getAll("moment");
  const momentCreate =
    create &&
    momentValues.length === 1 &&
    Boolean(parseMomentId(momentValues[0]));
  // Home = HF dark Explore suite; moment chrome only for explicit moment create.
  const momentSurface = momentCreate;
  const lightShell = momentSurface || sellerPackCreate;
  const resultShell = momentSurface;
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
        resultShell
          ? "bg-[#F2EFE7] text-[#171719]"
          : lightShell
            ? "bg-[#EEF0F4] text-[#15171B]"
            : "bg-[#0A0A0A] text-[#F7F4ED]"
      )}
    >
      <header
        className={cn(
          "sticky top-0 z-50 hidden items-center border-b px-7 backdrop-blur-xl lg:flex",
          momentSurface ? "h-16" : "h-14",
          resultShell
            ? "border-[#171719]/15 bg-[#F2EFE7]/94 px-8"
            : lightShell
              ? "border-[#D4D8E0] bg-[#F7F8FA]/92"
              : "border-white/10 bg-[#0A0A0A]/92"
        )}
      >
        <Link href="/" className="shrink-0" aria-label="Pikbo home">
          {momentSurface ? (
            <span className="flex items-center gap-3 text-[#171719]">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#FF5A36] font-display text-sm font-black text-[#171719]">
                P
              </span>
              <span>
                <span className="block font-display text-base font-black leading-none tracking-[-0.04em]">
                  Pikbo
                </span>
                <span className="mt-1 block text-[7px] font-black uppercase tracking-[0.2em] text-[#79756D]">
                  Toy moments
                </span>
              </span>
            </span>
          ) : (
            <Logo
              size={30}
              wordClassName={cn(
                "text-[19px]",
                lightShell && "!text-[#15171B]"
              )}
            />
          )}
        </Link>
        <nav
          className="mx-auto flex items-center gap-9"
          aria-label="Primary navigation"
          data-primary-create-href={
            momentSurface
              ? DEFAULT_MOMENT_CREATE_HREF
              : "/create?effect=360-spin-showcase&source=primary-nav"
          }
        >
          {(momentSurface
            ? [
                {
                  href: "/#archive-selector",
                  label: "Explore",
                },
                { href: DEFAULT_MOMENT_CREATE_HREF, label: "Create" },
                { href: "/library", label: "Projects" },
                { href: "/login", label: "Sign in" },
              ]
            : PRIMARY_NAV.filter(
                (item) => !resultShell || item.href !== "/"
              )
          ).map((item) => {
            const on = active(path, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative py-5 text-[13px] font-bold transition-colors",
                  momentSurface
                    ? on
                      ? "text-[#171719]"
                      : "text-[#77736C] hover:text-[#171719]"
                    : resultShell
                    ? on
                      ? "text-[#15171B]"
                      : "text-[#716C64] hover:text-[#15171B]"
                    : lightShell
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
                      momentSurface
                        ? "bg-[#FF5A36]"
                        : resultShell
                        ? "bg-[#FF6846]"
                        : lightShell
                          ? "bg-[#2457E6]"
                          : "bg-[#CBFF3D]"
                    )}
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          {momentSurface ? (
            <Link
              href={DEFAULT_MOMENT_CREATE_HREF}
              className="inline-flex min-h-10 items-center rounded-full bg-[#171719] px-5 text-xs font-black text-[#F5F1E8] transition hover:-translate-y-0.5 hover:bg-[#FF5A36] hover:text-[#171719]"
            >
              Create a Moment
            </Link>
          ) : resultShell ? (
            <Link
              href={DEFAULT_MOMENT_CREATE_HREF}
              className="inline-flex min-h-10 items-center rounded-full bg-[#171717] px-5 text-xs font-black text-white transition hover:bg-[#FF6846]"
            >
              Create a Moment
            </Link>
          ) : (
            <>
              <LanguageSwitcher tone={lightShell ? "light" : "dark"} />
              <CreditsBadge tone={lightShell ? "light" : "dark"} />
              {home ? (
                <Link
                  href="/create?effect=360-spin-showcase&source=home-header-generate"
                  className="inline-flex min-h-10 items-center rounded-full bg-[#CBFF3D] px-5 text-xs font-black text-black shadow-[0_0_28px_-6px_rgba(203,255,61,0.55)] transition hover:-translate-y-0.5"
                >
                  Generate
                </Link>
              ) : null}
            </>
          )}
        </div>
      </header>

      <header
        className={cn(
          "sticky top-0 z-50 flex h-12 items-center justify-between border-b px-3 backdrop-blur-xl lg:hidden",
          resultShell
            ? "border-black/10 bg-[#F2EFE7]/94"
            : lightShell
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
          {momentSurface ? (
            <Link
              href={DEFAULT_MOMENT_CREATE_HREF}
              className="inline-flex min-h-9 items-center rounded-full bg-[#171719] px-4 text-[10px] font-black text-[#F5F1E8]"
            >
              Create a Moment
            </Link>
          ) : resultShell ? (
            <>
              <Link
                href={DEFAULT_MOMENT_CREATE_HREF}
                className="inline-flex min-h-9 items-center rounded-full bg-[#171717] px-4 text-[10px] font-black text-white"
              >
                Create a Moment
              </Link>
              <details className="group relative">
                <summary className="grid min-h-9 cursor-pointer list-none place-items-center rounded-full border border-black/15 bg-white/55 px-3 text-[10px] font-black text-[#171717] [&::-webkit-details-marker]:hidden">
                  Menu
                </summary>
                <nav
                  aria-label="Mobile product menu"
                  className="absolute right-0 top-11 z-[70] w-44 overflow-hidden rounded-2xl border border-black/10 bg-[#FAF7F0] p-1.5 text-[#171717] shadow-[0_22px_60px_-24px_rgba(0,0,0,0.55)]"
                >
                  {PRIMARY_NAV.filter((item) => item.href !== "/").map(
                    (item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block rounded-xl px-3 py-2.5 text-xs font-black hover:bg-black/[0.06]"
                      >
                        {item.label}
                      </Link>
                    )
                  )}
                </nav>
              </details>
            </>
          ) : (
            <>
              <LanguageSwitcher compact tone={lightShell ? "light" : "dark"} />
              <CreditsBadge compact tone={lightShell ? "light" : "dark"} />
            </>
          )}
          {create && !resultShell ? (
            <span
              className={cn(
                "text-[10px] font-black uppercase tracking-[0.16em]",
                lightShell ? "text-[#2457E6]" : "text-[#CBFF3D]"
              )}
            >
              Create
            </span>
          ) : null}
        </div>
      </header>

      <div className="flex min-w-0 flex-1 flex-col">
        <main
          className={cn(
            "min-w-0 flex-1",
            resultShell
              ? "bg-[#F2EFE7]"
              : lightShell
                ? "bg-[#EEF0F4]"
                : "bg-[#0A0A0A]"
          )}
        >
          {children}
        </main>
        {!hideFooter ? <Footer /> : null}
      </div>

      {!resultShell && !sellerPackCreate ? <nav
        className="z-50 sticky bottom-0 grid grid-cols-5 border-t border-white/10 bg-[#0A0A0A]/96 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label="Mobile navigation"
      >
        {MOBILE_NAV.map((item) => {
          const on = active(path, item.href);
          const isCreate = item.href.startsWith("/create");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center px-1 py-3 text-[10px] font-bold transition-colors",
                isCreate || on
                  ? "text-[#CBFF3D]"
                  : "text-[#F7F4ED]/38"
              )}
            >
              <span
                className={cn(
                  "mb-1 h-1 w-1 rounded-full",
                  isCreate || on ? "bg-[#CBFF3D]" : "bg-transparent"
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
