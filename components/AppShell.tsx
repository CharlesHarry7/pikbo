"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CreditsBadge } from "@/components/CreditsBadge";
import { Footer } from "@/components/Footer";
import {
  LanguageProvider,
} from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { MobileGenerateBar } from "@/components/MobileGenerateBar";
import { ToastProvider } from "@/components/Toast";
import { trackPageView } from "@/lib/analytics";
import { createGenerate360Href } from "@/lib/jobIntents";
import { parseMomentId } from "@/lib/moments";
import {
  MOBILE_NAV,
  MOMENT_CREATE_HREF,
  PRIMARY_NAV,
} from "@/lib/softLaunch";
import { cn } from "@/lib/utils";

const DEFAULT_MOMENT_CREATE_HREF = `${MOMENT_CREATE_HREF}&source=moment-shell`;
const PRIMARY_NAV_CREATE_HREF = `${MOMENT_CREATE_HREF}&source=primary-nav`;
/** Home sticky shell: one primary Generate→360 (AIT-413 friction cut). */
const HOME_SHELL_GENERATE_HREF = createGenerate360Href("app-shell-home");

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
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > window.innerHeight * 0.5);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
  // Home + Moment Create (?moment=) hide via resultShell; real MOMENT_CREATE_HREF
  // is fixedMomentEntry (mode=moment&effect=street-power-up). Seller Pack also
  // hides so sticky primaries are not parked over a ghost tab gap.
  const hideMobileNav =
    resultShell || fixedMomentEntry || sellerPackCreate;
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
          ? "bg-[var(--void)] text-[var(--cream)]"
          : resultShell
          ? "bg-[#FAF7F2] text-[#0A0A0F]"
          : lightShell
            ? "bg-[#FAF7F2] text-[#0A0A0F]"
            : "bg-[var(--void)] text-[var(--cream)]"
      )}
    >
      <header
        data-scrolled={navScrolled ? "true" : "false"}
        className={cn(
          "nav-shell sticky top-0 z-50 hidden items-center border-b px-7 backdrop-blur-xl lg:flex",
          motionChrome ? "h-16" : "h-14",
          motionChrome
            ? "border-white/10 bg-[rgba(10,10,15,0.45)] px-8"
            : resultShell
            ? "border-black/10 bg-[#FAF7F2]/94 px-8"
            : lightShell
              ? "border-black/10 bg-[#FAF7F2]/92"
              : "border-white/10 bg-[rgba(10,10,15,0.92)]"
        )}
      >
        <Link href="/" className="shrink-0" aria-label="Pikbo home">
          {motionBrand ? (
            <span className="flex items-center gap-3 text-[var(--cream)]">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[linear-gradient(135deg,#B14EFF,#FF4ECD)] font-display text-sm font-black text-white shadow-[0_0_18px_rgba(255,78,205,0.45)]">
                🧸
              </span>
              <span>
                <span className="block font-display text-base font-black leading-none tracking-[-0.04em]">
                  Pikbo
                </span>
                <span className="mt-1 block text-[7px] font-black uppercase tracking-[0.2em] text-[#FF4ECD]/80">
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
              ? HOME_SHELL_GENERATE_HREF
              : PRIMARY_NAV_CREATE_HREF
          }
          data-home-primary-nav={motionChrome ? "generate-360" : undefined}
        >
          {(motionChrome
            ? [
                // AIT-462: one primary money door — Generate→360 (not Moment Create)
                {
                  href: HOME_SHELL_GENERATE_HREF,
                  label: "Generate",
                  marker: "home-nav-generate-360" as const,
                },
                { href: "/library", label: "Library" },
                { href: "/pricing", label: "Pricing" },
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
                {...("marker" in item && item.marker
                  ? { "data-home-nav-generate": "360" as const }
                  : {})}
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
                        ? "bg-[linear-gradient(90deg,#B14EFF,#FF4ECD)]"
                        : resultShell
                        ? "bg-[#FF4ECD]"
                        : lightShell
                          ? "bg-[#B14EFF]"
                          : "bg-[#FF4ECD]"
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
              href={home ? HOME_SHELL_GENERATE_HREF : "/library"}
              data-app-shell-home-generate={home ? "360" : undefined}
              className="btn-press inline-flex min-h-10 items-center rounded-full bg-[linear-gradient(135deg,#B14EFF,#FF4ECD)] px-5 text-xs font-black text-white shadow-[0_0_24px_rgba(255,78,205,0.35)]"
            >
              {home ? "Generate 360°" : "Open Library"}
            </Link>
          ) : resultShell ? (
            <Link
              href={DEFAULT_MOMENT_CREATE_HREF}
              className="btn-press inline-flex min-h-10 items-center rounded-full bg-[linear-gradient(135deg,#B14EFF,#FF4ECD)] px-5 text-xs font-black text-white"
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
        data-scrolled={navScrolled ? "true" : "false"}
        className={cn(
          "nav-shell sticky top-0 z-50 flex h-12 items-center justify-between border-b px-3 backdrop-blur-xl lg:hidden",
          home
            ? "border-white/10 bg-[rgba(10,10,15,0.55)]"
            : resultShell
            ? "border-black/10 bg-[#FAF7F2]/94"
            : lightShell
              ? "border-black/10 bg-[#FAF7F2]/94"
              : "border-white/10 bg-[rgba(10,10,15,0.92)]"
        )}
      >
        <Link href="/" aria-label="Pikbo home">
          <Logo
            size={26}
            wordClassName={cn(
              "text-base",
              home ? "!text-[var(--cream)]" : lightShell && "!text-[#0A0A0F]"
            )}
          />
        </Link>
        <div className="flex items-center gap-2">
          {momentSurface ? (
            <Link
              href={home ? HOME_SHELL_GENERATE_HREF : DEFAULT_MOMENT_CREATE_HREF}
              data-app-shell-home-generate={home ? "360" : undefined}
              className={cn(
                "inline-flex min-h-9 items-center rounded-full px-4 text-[10px] font-black",
                home
                  ? "bg-[linear-gradient(135deg,#B14EFF,#FF4ECD)] text-white"
                  : "bg-[linear-gradient(135deg,#B14EFF,#FF4ECD)] text-white"
              )}
            >
              {home ? "Generate 360°" : "Use this motion"}
            </Link>
          ) : resultShell ? (
            <>
              <Link
                href={DEFAULT_MOMENT_CREATE_HREF}
                className="inline-flex min-h-9 items-center rounded-full bg-[linear-gradient(135deg,#B14EFF,#FF4ECD)] px-4 text-[10px] font-black text-white"
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
                lightShell ? "text-[#B14EFF]" : "text-[#FF4ECD]"
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
              ? "bg-[var(--void)]"
              : resultShell
              ? "bg-[#FAF7F2]"
              : lightShell
                ? "bg-[#FAF7F2]"
                : "bg-[var(--void)]"
          )}
        >
          {children}
        </main>
        {!hideFooter ? <Footer /> : null}
      </div>

      {/* Sticky Generate→360 on browse surfaces (explore/library/pricing/models/flow…).
          Self-gates via showBar; clearance uses --mobile-nav-clearance (AIT-150 / AIT-71). */}
      <MobileGenerateBar />
      {!hideMobileNav ? (
        <nav
          data-mobile-nav="primary"
          className={cn(
            // Tab content ≈ --mobile-nav-content-h; floating CTAs clear
            // content-h + safe-area via --mobile-nav-clearance (AIT-150).
            "z-50 grid grid-cols-5 border-t border-white/10 bg-[rgba(10,10,15,0.96)] px-1 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl lg:hidden",
            home ? "relative" : "sticky bottom-0"
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
                  // 44px min touch target; truncate labels so 5-up still fits 390px
                  "flex min-h-11 min-w-0 flex-col items-center justify-center px-1 py-2.5 text-[10px] font-bold transition-colors",
                  on ? "text-[#FF4ECD]" : "text-white/45"
                )}
              >
                <span
                  className={cn(
                    "mb-1 h-1 w-1 rounded-full",
                    on ? "bg-[#FF4ECD]" : "bg-transparent"
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
