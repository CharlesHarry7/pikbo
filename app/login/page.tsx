import type { Metadata } from "next";
import Link from "next/link";
import { publicAuthStatus } from "@/lib/authConfig";
import { site } from "@/lib/site";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { LoginForm } from "@/components/LoginForm";
import { PRIVATE_ROBOTS } from "@/lib/seoIndex";

export const metadata: Metadata = {
  title: "Sign in",
  description: `Sign in to ${site.name} for cross-device credits and saved projects.`,
  robots: PRIVATE_ROBOTS,
};

export default function LoginPage() {
  const auth = publicAuthStatus();

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
          Cross-device balance and cloud Library need a durable account. Soft
          launch still works as a guest on this browser.
        </p>

        <div
          className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
            auth.configured
              ? "border-[var(--mint)]/30 bg-[var(--mint)]/[0.07] text-[var(--fg)]"
              : "border-white/10 bg-white/[0.03] text-[var(--fg-muted)]"
          }`}
        >
          <p className="text-[10px] font-black uppercase tracking-wide text-[var(--fg-dim)]">
            Status · {auth.mode}
          </p>
          <p className="mt-1 leading-relaxed">{auth.message}</p>
        </div>

        <LoginForm auth={auth} />

        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
          <Link href="/create" className="font-semibold text-[var(--mint)] hover:underline">
            Continue as guest → Generate
          </Link>
          <Link href="/#home-tool" className="text-[var(--mint)] hover:underline">
            Home tool
          </Link>
          <Link href="/library" className="text-[var(--mint)] hover:underline">
            Library
          </Link>
          <Link href="/flow" className="text-[var(--mint)] hover:underline">
            Flow
          </Link>
          <Link href="/modules" className="text-[var(--mint)] hover:underline">
            Modules
          </Link>
          <FreeTrialCta
            path="/login"
            className="text-[var(--fg-muted)] hover:text-white"
          />
          <Link
            href="/create?mode=seller-pack"
            className="text-[var(--fg-muted)] hover:text-white"
          >
            Seller Pack
          </Link>
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
