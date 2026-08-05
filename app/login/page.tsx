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
    <main
      className="login-ritual create-ritual relative isolate min-h-[calc(100vh-56px)] overflow-hidden px-4 pb-16 pt-8 text-[var(--fg)] sm:px-7 lg:px-10 lg:pb-20 lg:pt-12"
      data-login-ritual="vault"
    >
      <div className="create-ritual-grid" aria-hidden />

      <div className="relative z-[1] mx-auto grid max-w-[1100px] gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(340px,420px)] lg:items-start lg:gap-14">
        {/* Left — private vault story */}
        <div className="toy-sticker-enter max-w-[480px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="toy-sticker toy-sticker-lime">Private beta</span>
            <span className="toy-sticker toy-sticker-outline">Magic link</span>
            <span className="toy-sticker toy-sticker-grape">Owner only</span>
          </div>

          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.22em] text-white/42">
            Collector vault
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.75rem,5.2vw,4.6rem)] font-black leading-[0.88] tracking-[-0.06em]">
            <span className="text-grad">Sign in</span>
            <br />
            to your shelf.
          </h1>

          <p className="mt-5 max-w-[380px] text-base font-semibold leading-7 text-[var(--fg-muted)]">
            Sign in to keep your balance and completed private results available
            across devices. This browser also keeps local history. You can still
            try cached Lab previews as a guest; they cost 0 credits and do not
            process your uploaded photo.
          </p>

          <ol className="mt-8 space-y-3" aria-label="What sign-in unlocks">
            <li
              className="status-card flex items-start gap-3"
              data-tone="ready"
            >
              <span className="font-display text-lg font-black tracking-[-0.04em] text-[var(--mint)]">
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
              <span className="font-display text-lg font-black tracking-[-0.04em] text-[var(--toy-mango)]">
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
              <span className="font-display text-lg font-black tracking-[-0.04em] text-[var(--toy-bubblegum)]">
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

        {/* Right — sign-in capsule */}
        <div
          className="toy-sticker-enter w-full"
          style={{ animationDelay: "80ms" }}
        >
          <div className="collection-card login-vault-card relative p-5 sm:p-6">
            <span className="toy-corner-mark toy-corner-mark-tl" aria-hidden />
            <span className="toy-corner-mark toy-corner-mark-br" aria-hidden />

            <div className="flex flex-wrap gap-2">
              <span className="toy-sticker toy-sticker-bubblegum">Vault key</span>
              <span className="toy-sticker toy-sticker-aqua">Cross-device</span>
            </div>

            <p className="mt-4 text-[9px] font-black uppercase tracking-[0.2em] text-white/42">
              Account access
            </p>
            <h2 className="mt-2 font-display text-3xl font-black leading-[0.95] tracking-[-0.055em] text-[var(--paper)]">
              Open your{" "}
              <span className="text-grad">private shelf</span>
            </h2>
            <p className="mt-3 text-xs font-semibold leading-6 text-white/50">
              Email link preferred. Google appears only when configured.
              Product honesty: guests stay on cached / not-your-toy previews.
            </p>

            <div
              className={`status-card mt-5 ${
                auth.configured ? "status-card--ok" : "status-card--warn"
              }`}
              data-tone={auth.configured ? "ready" : "warn"}
              data-login-auth-status={auth.configured ? "ready" : "unavailable"}
            >
              <p className="text-[10px] font-black uppercase tracking-wide text-white/55">
                Sign-in availability
              </p>
              <p className="mt-1.5 text-sm font-semibold leading-relaxed text-[var(--fg)]">
                {auth.message}
              </p>
            </div>

            <LoginForm auth={auth} next={next} />

            <div
              className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/8 pt-5"
              data-auth-guest-path="product-first"
            >
              <Link
                href={LOGIN_GUEST_MOMENT_HREF}
                className="btn-pink !px-3.5 !py-2 text-xs"
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
