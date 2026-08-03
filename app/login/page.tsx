import type { Metadata } from "next";
import Link from "next/link";
import { publicAuthStatus } from "@/lib/authConfig";
import { site } from "@/lib/site";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { LoginForm } from "@/components/LoginForm";
import { PRIVATE_ROBOTS } from "@/lib/seoIndex";
import { createRemixHref } from "@/lib/remixIntent";
import { sanitizeInternalNextPath } from "@/lib/authRedirect";

/** Guest Generate from login — listing spin remix (ratio/duration/channel). */
const LOGIN_GUEST_GENERATE_HREF = createRemixHref("360-spin-showcase");

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
    <main className="min-h-[70vh] px-4 py-12 sm:px-8">
      <div className="mx-auto max-w-md">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--fg-dim)]">
          Account
        </p>
        <h1 className="mt-2 font-display text-3xl font-black uppercase tracking-tight">
          Sign in
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
          Sign in to keep your balance and completed private results available
          across devices. This browser also keeps local history. You can still
          try cached Lab previews as a guest; they cost 0 credits and do not
          process your uploaded photo.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-[11px] leading-relaxed text-white/45">
          <li>
            <strong className="text-white/65">Guest preview:</strong> cached Lab
            examples on this device.
          </li>
          <li>
            <strong className="text-white/65">Real generation:</strong>{" "}
            available only to eligible signed-in accounts; the credit cost is
            shown before you start.
          </li>
          <li>
            <strong className="text-white/65">Private results:</strong> finished
            clips stay in your Library with protected downloads.
          </li>
        </ul>

        <div
          className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
            auth.configured
              ? "border-[var(--mint)]/30 bg-[var(--mint)]/[0.07] text-[var(--fg)]"
              : "border-white/10 bg-white/[0.03] text-[var(--fg-muted)]"
          }`}
        >
          <p className="text-[10px] font-black uppercase tracking-wide text-[var(--fg-dim)]">
            Sign-in availability
          </p>
          <p className="mt-1 leading-relaxed">{auth.message}</p>
        </div>

        <LoginForm auth={auth} next={next} />

        <div
          className="mt-8 flex flex-wrap items-center gap-3 text-sm"
          data-auth-guest-path="product-first"
        >
          <Link
            href={LOGIN_GUEST_GENERATE_HREF}
            className="font-semibold text-[var(--mint)] hover:underline"
            data-login-guest="generate-remix"
          >
            Continue as guest → Generate
          </Link>
          <Link
            href="/create?effect=street-power-up&source=login-guest"
            className="text-[var(--mint)] hover:underline"
          >
            Toy Moment
          </Link>
          <Link href="/library" className="text-[var(--mint)] hover:underline">
            Library
          </Link>
          <Link href="/modules" className="text-[var(--fg-muted)] hover:text-white">
            Modules
          </Link>
          <Link href="/#home-create" className="text-[var(--fg-muted)] hover:text-white">
            Home samples
          </Link>
          <FreeTrialCta
            path="/login"
            className="text-[var(--fg-muted)] hover:text-white"
          />
          <Link href="/profile" className="text-[var(--fg-muted)] hover:text-white">
            Profile
          </Link>
          <Link href="/pricing" className="text-[var(--fg-muted)] hover:text-white">
            Plans
          </Link>
        </div>
      </div>
    </main>
  );
}
