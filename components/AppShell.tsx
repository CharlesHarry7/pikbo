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
  MOMENT_CREATE_HREF,
  PRIMARY_NAV,
} from "@/lib/softLaunch";
import { cn } from "@/lib/utils";

const DEFAULT_MOMENT_CREATE_HREF = `${MOMENT_CREATE_HREF}&source=moment-shell`;
const PRIMARY_NAV_CREATE_HREF = `${MOMENT_CREATE_HREF}&source=primary-nav`;
/** Home Sign in must return to the fixed Moment, not the generic /profile fallback. */
const HOME_SIGN_IN_HREF = `/login?next=${encodeURIComponent(
  `${MOMENT_CREATE_HREF}&source=home-sign-in`
)}`;

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
  const fixedMomentEntry =
    create &&
    searchParams.get("mode") === "moment" &&
    searchParams.get("effect") === "street-power-up";
  const motionChrome = home;
  const motionBrand = home || fixedMomentEntry;
  const momentSurface = home || momentCreate;
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
        home
          ? "bg-[#08080A] text-[#F7F4ED]"
          : resultShell
          ? "bg-[#F2EFE7] text-[#171719]"
          : lightShell
            ? "bg-[#EEF0F4] text-[#15171B]"
            : "bg-[#0A0A0A] text-[#F7F4ED]"
      )}
    >
      <header
        className={cn(
          "sticky top-0 z-50 hidden items-center border-b px-7 backdrop-blur-xl lg:flex",
          motionChrome ? "h-16" : "h-14",
          motionChrome
            ? "border-white/10 bg-[#08080A]/92 px-8"
            : resultShell
            ? "border-[#171719]/15 bg-[#F2EFE7]/94 px-8"
            : lightShell
              ? "border-[#D4D8E0] bg-[#F7F8FA]/92"
              : "border-white/10 bg-[#0A0A0A]/92"
        )}
      >
        <Link href="/" className="shrink-0" aria-label="Pikbo home">
          {motionBrand ? (
            <span className="flex items-center gap-3 text-[#F7F4ED]">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#FF4D2E] font-display text-sm font-black text-[#140806]">
                P
              </span>
              <span>
                <span className="block font-display text-base font-black leading-none tracking-[-0.04em]">
                  Pikbo
                </span>
                <span className="mt-1 block text-[7px] font-black uppercase tracking-[0.2em] text-white/38">
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
            motionChrome
              ? DEFAULT_MOMENT_CREATE_HREF
              : PRIMARY_NAV_CREATE_HREF
          }
        >
          {(motionChrome
            ? [
                { href: DEFAULT_MOMENT_CREATE_HREF, label: "Create" },
                { href: "/library", label: "Library" },
                { href: "/pricing", label: "Pricing" },
                { href: HOME_SIGN_IN_HREF, label: "Sign in" },
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
                  motionChrome
                    ? on
                      ? "text-white"
                      : "text-white/42 hover:text-white"
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
                      motionBrand
                        ? "bg-[#FF4D2E]"
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
          {motionChrome ? (
            <Link
              href={home ? DEFAULT_MOMENT_CREATE_HREF : "/library"}
              className="inline-flex min-h-10 items-center rounded-full bg-[#FF4D2E] px-5 text-xs font-black text-[#140806] transition hover:-translate-y-0.5 hover:bg-[#FF6A4D]"
            >
              {home ? "Use this motion" : "Open Library"}
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
            </>
          )}
        </div>
      </header>

      <header
        className={cn(
          "sticky top-0 z-50 flex h-12 items-center justify-between border-b px-3 backdrop-blur-xl lg:hidden",
          home
            ? "border-white/10 bg-[#08080A]/92"
            : resultShell
            ? "border-black/10 bg-[#F2EFE7]/94"
            : lightShell
              ? "border-[#D4D8E0] bg-[#F7F8FA]/94"
              : "border-white/10 bg-[#0A0A0A]/92"
        )}
      >
        <Link href="/" aria-label="Pikbo home">
          {motionBrand ? (
            <span
              className="flex items-center gap-2.5 text-[#F7F4ED]"
              data-mobile-motion-brand
            >
              <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-[#FF4D2E] font-display text-xs font-black text-[#140806]">
                P
              </span>
              <span className="font-display text-base font-extrabold leading-none tracking-[-0.03em]">
                Pikbo<span className="text-[#FF6A4D]">.</span>
              </span>
            </span>
          ) : (
            <Logo
              size={26}
              wordClassName={cn(
                "text-base",
                home ? "!text-[#F7F4ED]" : lightShell && "!text-[#15171B]"
              )}
            />
          )}
        </Link>
        <div className="flex items-center gap-2">
          {momentSurface ? (
            <Link
              href={DEFAULT_MOMENT_CREATE_HREF}
              className={cn(
                "inline-flex min-h-9 items-center rounded-full px-4 text-[10px] font-black",
                home ? "bg-[#FF4D2E] text-[#140806]" : "bg-[#171719] text-[#F5F1E8]"
              )}
            >
              Use this motion
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
                fixedMomentEntry
                  ? "text-[#FF6A4D]"
                  : lightShell
                    ? "text-[#2457E6]"
                    : "text-[#CBFF3D]"
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
            home
              ? "bg-[#08080A]"
              : resultShell
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

      {/* Home keeps the five-door mobile nav; Moment Create and Seller Pack hide it. */}
      {!momentCreate && !sellerPackCreate ? (
        <nav
          className={cn(
            "z-50 grid grid-cols-5 border-t px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden",
            home
              ? "relative border-white/10 bg-[#08080A]/96"
              : "sticky bottom-0 border-white/10 bg-[#0A0A0A]/96"
          )}
          aria-label="Mobile navigation"
          data-mobile-nav={home ? "home-moment" : "default"}
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
                  motionBrand
                    ? on
                      ? "text-[#FF6A4D]"
                      : "text-[#F7F4ED]/44"
                    : on
                      ? "text-[#CBFF3D]"
                      : "text-[#F7F4ED]/38"
                )}
              >
                <span
                  className={cn(
                    "mb-1 h-1 w-1 rounded-full",
                    on
                      ? motionBrand
                        ? "bg-[#FF4D2E]"
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
      ) : null}
    </div>
  );
}
