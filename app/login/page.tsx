import type { Metadata } from "next";
import Link from "next/link";
import { publicAuthStatus } from "@/lib/authConfig";
import { site } from "@/lib/site";
import { LoginForm } from "@/components/LoginForm";
import { PRIVATE_ROBOTS } from "@/lib/seoIndex";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";
import { sanitizeInternalNextPath } from "@/lib/authRedirect";

/** Guest login fallback — preview the fixed Street Power-Up Moment. */
const LOGIN_GUEST_MOMENT_HREF = `${MOMENT_CREATE_HREF}&source=login-guest`;

export const metadata: Metadata = {
  title: "Sign in",
  description: `Sign in to ${site.name} for cross-device credits and saved projects.`,
  robots: PRIVATE_ROBOTS,
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  const auth = publicAuthStatus();
  const params = await searchParams;
  const next = sanitizeInternalNextPath(
    typeof params?.next === "string" ? params.next : null
  );

  return (
    // Mobile (≤640px): compact vault so email + primary submit stay above the
    // fold on ~390px — especially when `next` returns to Create/360.
    // Desktop/lg keeps the full AIT-36b vault story density.
    <main
      className="login-ritual create-ritual relative isolate min-h-[calc(100vh-56px)] overflow-hidden px-4 pb-10 pt-3 text-[var(--fg)] sm:px-7 sm:pb-16 sm:pt-8 lg:px-10 lg:pb-20 lg:pt-12"
      data-login-ritual="vault"
      data-login-compact="mobile"
    >
      <div className="particle-field login-ritual-particles" aria-hidden>
        <span style={{ left: "8%", top: "18%" }} />
        <span style={{ left: "22%", top: "62%" }} />
        <span style={{ left: "48%", top: "12%" }} />
        <span style={{ left: "68%", top: "44%" }} />
        <span style={{ left: "84%", top: "22%" }} />
        <span style={{ left: "76%", top: "72%" }} />
        <span style={{ left: "38%", top: "78%" }} />
        <span style={{ left: "14%", top: "40%" }} />
      </div>
      <div className="create-ritual-grid" aria-hidden />

      <div className="relative z-[1] mx-auto grid max-w-[1100px] gap-4 sm:gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(340px,420px)] lg:items-start lg:gap-14">
        {/* Story — after form on mobile so magic-link wins the fold */}
        <div className="toy-sticker-enter order-2 max-w-[480px] lg:order-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="toy-sticker toy-sticker-lime">Private beta</span>
            <span className="toy-sticker toy-sticker-outline">Magic link</span>
            <span className="toy-sticker toy-sticker-grape hidden sm:inline-flex">
              Owner only
            </span>
          </div>

          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/42 sm:mt-6 sm:tracking-[0.22em]">
            Collector vault
          </p>
          <h1 className="mt-1.5 font-display text-[1.7rem] font-black leading-[0.95] tracking-[-0.04em] sm:mt-3 sm:text-[clamp(2.75rem,5.2vw,4.6rem)] sm:leading-[0.88] sm:tracking-[-0.06em]">
            <span className="sm:hidden">
              <span className="text-grad text-bling">Sign in</span> to your
              shelf.
            </span>
            <span className="hidden sm:inline">
              <span className="text-grad text-bling">Sign in</span>
              <br />
              to your shelf.
            </span>
          </h1>

          <p className="mt-2 max-w-[380px] text-[13px] font-semibold leading-5 text-[var(--fg-muted)] sm:mt-5 sm:text-base sm:leading-7">
            <span className="sm:hidden">
              Keep balance and private results across devices. Guest Lab
              previews stay cached / not-your-toy.
            </span>
            <span className="hidden sm:inline">
              Sign in to keep your balance and completed private results
              available across devices. This browser also keeps local history.
              You can still try cached Lab previews as a guest; they cost 0
              credits and do not process your uploaded photo.
            </span>
          </p>

          <ol
            className="mt-4 hidden space-y-3 sm:mt-8 sm:block"
            aria-label="What sign-in unlocks"
          >
            <li className="status-card flex items-start gap-3" data-tone="ready">
              <span className="font-display text-lg font-black tracking-[-0.04em] text-[var(--tide-green)]">
                01
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/70">
                  Guest preview
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-white/48">
                  Cached Lab examples on this device — not your toy.
                </p>
              </div>
            </li>
            <li
              className="status-card flex items-start gap-3"
              data-tone="progress"
            >
              <span className="font-display text-lg font-black tracking-[-0.04em] text-[var(--lemon)]">
                02
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/70">
                  Real generation
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-white/48">
                  Available only to eligible signed-in accounts; the credit cost
                  is shown before you start.
                </p>
              </div>
            </li>
            <li
              className="status-card flex items-start gap-3"
              data-tone="private"
            >
              <span className="font-display text-lg font-black tracking-[-0.04em] text-[var(--neon-pink)]">
                03
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/70">
                  Private results
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-white/48">
                  Finished clips stay in your Library with protected downloads.
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* Sign-in capsule — first on mobile so email + submit clear the fold */}
        <div
          className="toy-sticker-enter order-1 w-full lg:order-2"
          style={{ animationDelay: "80ms" }}
        >
          <div className="collection-card login-vault-card relative p-3.5 sm:p-5 lg:p-6">
            <span className="toy-corner-mark toy-corner-mark-tl" aria-hidden />
            <span className="toy-corner-mark toy-corner-mark-br" aria-hidden />

            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <span className="toy-sticker toy-sticker-bubblegum">Vault key</span>
              <span className="toy-sticker toy-sticker-aqua hidden sm:inline-flex">
                Cross-device
              </span>
            </div>

            <p className="mt-2.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/42 sm:mt-4 sm:tracking-[0.2em]">
              Account access
            </p>
            <h2 className="mt-1 font-display text-xl font-black leading-[0.98] tracking-[-0.04em] text-[var(--cream)] sm:mt-2 sm:text-3xl sm:leading-[0.95] sm:tracking-[-0.055em]">
              Open your <span className="text-grad">private shelf</span>
            </h2>
            <p className="mt-2 text-[11px] font-semibold leading-snug text-white/50 sm:mt-3 sm:text-xs sm:leading-6">
              Email link preferred. Google appears only when configured. Product
              honesty: guests stay on cached / not-your-toy previews.
            </p>

            <div
              className={`status-card mt-3 sm:mt-5 ${
                auth.configured ? "status-card--ok" : "status-card--warn"
              }`}
              data-tone={auth.configured ? "ready" : "warn"}
              data-login-auth-status={
                auth.configured ? "ready" : "unavailable"
              }
            >
              <p className="text-[10px] font-black uppercase tracking-wide text-white/55">
                Sign-in availability
              </p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--fg)] sm:mt-1.5">
                {auth.message}
              </p>
            </div>

            <LoginForm auth={auth} next={next} />

            <div
              className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.08] pt-3.5 sm:mt-6 sm:pt-5"
              data-auth-guest-path="product-first"
            >
              <Link
                href={LOGIN_GUEST_MOMENT_HREF}
                className="btn btn-primary !px-3.5 !py-2 text-xs"
                data-login-guest="moment-preview"
              >
                Preview Street Power-Up
              </Link>
              <Link
                href="/library"
                className="btn btn-ghost !px-3 !py-2 text-xs"
              >
                Library
              </Link>
              <Link
                href="/#home-create"
                className="btn btn-ghost !px-3 !py-2 text-xs"
              >
                Home samples
              </Link>
              <Link
                href="/pricing"
                className="btn btn-ghost !px-3 !py-2 text-xs"
              >
                Plans
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
