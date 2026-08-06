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
          ? "bg-void text-cream"
          : resultShell
          ? "bg-cream text-void"
          : lightShell
            ? "bg-cream text-void"
            : "bg-void text-cream"
      )}
    >
      <header
        data-scrolled={navScrolled ? "true" : "false"}
        className={cn(
          "nav-shell sticky top-0 z-50 hidden items-center border-b px-7 backdrop-blur-xl lg:flex",
          motionChrome ? "h-16" : "h-14",
          motionChrome
            ? "border-white/10 bg-[color-mix(in_srgb,var(--void)_45%,transparent)] px-8"
            : resultShell
            ? "border-black/10 bg-cream/94 px-8"
            : lightShell
              ? "border-black/10 bg-cream/92"
              : "border-white/10 bg-[color-mix(in_srgb,var(--void)_92%,transparent)]"
        )}
      >
        <Link href="/" className="shrink-0" aria-label="Pikbo home">
          {motionBrand ? (
            <span className="flex items-center gap-3 text-cream">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--electric-purple),var(--neon-pink))] font-display text-sm font-black text-white shadow-[0_0_18px_color-mix(in_srgb,var(--neon-pink)_45%,transparent)]">
                🧸
              </span>
              <span>
                <span className="block font-display text-base font-black leading-none tracking-[-0.04em]">
                  Pikbo
                </span>
                <span className="mt-1 block text-[7px] font-black uppercase tracking-[0.2em] text-neon-pink/80">
                  Toy moments
                </span>
              </span>
            </span>
          ) : (
            <Logo
              size={30}
              wordClassName={cn(
                "text-[19px]",
                lightShell && "!text-void"
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
                  motionChrome
                    ? on
                      ? "text-white"
                      : "text-white/42 hover:text-white"
                    : resultShell
                    ? on
                      ? "text-void"
                      : "text-void/45 hover:text-void"
                    : lightShell
                      ? on
                        ? "text-void"
                        : "text-void/48 hover:text-void"
                    : on
                      ? "text-cream"
                      : "text-cream/46 hover:text-cream"
                )}
              >
                {item.label}
                {on ? (
                  <span
                    className={cn(
                      "absolute inset-x-0 bottom-0 h-0.5",
                      motionBrand
                        ? "bg-[linear-gradient(90deg,var(--electric-purple),var(--neon-pink))]"
                        : resultShell
                        ? "bg-neon-pink"
                        : lightShell
                          ? "bg-electric-purple"
                          : "bg-neon-pink"
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
              className="btn-press inline-flex min-h-10 items-center rounded-full bg-[linear-gradient(135deg,var(--electric-purple),var(--neon-pink))] px-5 text-xs font-black text-white shadow-[0_0_24px_color-mix(in_srgb,var(--neon-pink)_35%,transparent)]"
            >
              {home ? "Try Street Power-Up" : "Open Library"}
            </Link>
          ) : resultShell ? (
            <Link
              href={DEFAULT_MOMENT_CREATE_HREF}
              className="btn-press inline-flex min-h-10 items-center rounded-full bg-[linear-gradient(135deg,var(--electric-purple),var(--neon-pink))] px-5 text-xs font-black text-white"
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
            ? "border-white/10 bg-[color-mix(in_srgb,var(--void)_55%,transparent)]"
            : resultShell
            ? "border-black/10 bg-cream/94"
            : lightShell
              ? "border-black/10 bg-cream/94"
              : "border-white/10 bg-[color-mix(in_srgb,var(--void)_92%,transparent)]"
        )}
      >
        <Link href="/" aria-label="Pikbo home">
          <Logo
            size={26}
            wordClassName={cn(
              "text-base",
              home ? "!text-cream" : lightShell && "!text-void"
            )}
          />
        </Link>
        <div className="flex items-center gap-2">
          {momentSurface ? (
            <Link
              href={DEFAULT_MOMENT_CREATE_HREF}
              className="inline-flex min-h-9 items-center rounded-full bg-[linear-gradient(135deg,var(--electric-purple),var(--neon-pink))] px-4 text-[10px] font-black text-white"
            >
              {home ? "Create my drop clip" : "Use this motion"}
            </Link>
          ) : resultShell ? (
            <>
              <Link
                href={DEFAULT_MOMENT_CREATE_HREF}
                className="inline-flex min-h-9 items-center rounded-full bg-[linear-gradient(135deg,var(--electric-purple),var(--neon-pink))] px-4 text-[10px] font-black text-white"
              >
                Create a Moment
              </Link>
              <details className="group relative">
                <summary className="grid min-h-9 cursor-pointer list-none place-items-center rounded-full border border-black/15 bg-white/55 px-3 text-[10px] font-black text-void [&::-webkit-details-marker]:hidden">
                  Menu
                </summary>
                <nav
                  aria-label="Mobile product menu"
                  className="absolute right-0 top-11 z-[70] w-44 overflow-hidden rounded-2xl border border-black/10 bg-cream p-1.5 text-void shadow-[0_22px_60px_-24px_rgba(0,0,0,0.55)]"
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
                lightShell ? "text-electric-purple" : "text-neon-pink"
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
              ? "bg-void"
              : resultShell
              ? "bg-cream"
              : lightShell
                ? "bg-cream"
                : "bg-void"
          )}
        >
          {children}
        </main>
        {!hideFooter ? <Footer /> : null}
      </div>

      {!resultShell && !sellerPackCreate ? <nav
        className={cn(
          "z-50 grid grid-cols-5 border-t px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden",
          home
            ? "relative border-white/10 bg-[color-mix(in_srgb,var(--void)_96%,transparent)]"
            : "sticky bottom-0 border-white/10 bg-[color-mix(in_srgb,var(--void)_96%,transparent)]"
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
                    ? "text-neon-pink"
                    : "text-white/45"
                  : on
                    ? "text-neon-pink"
                    : "text-cream/38"
              )}
            >
              <span
                className={cn(
                  "mb-1 h-1 w-1 rounded-full",
                  on
                    ? "bg-neon-pink"
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
