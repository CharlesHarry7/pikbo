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
          launch still works as a guest on this browser — Generate, Seller Pack,
          and Free Mini do not require sign-in today.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-[11px] leading-relaxed text-white/45">
          <li>
            <strong className="text-white/65">Live now:</strong> guest cookie on
            this device (credits, history, softLive generate)
          </li>
          <li>
            <strong className="text-white/65">Needs boss keys:</strong> Supabase
            URL + anon (+ service role for wallets) so magic-link / Google light
            up
          </li>
          <li>
            <strong className="text-white/65">Also later:</strong> SQL migration
            for multi-node durable credits (T5)
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
            Status · {auth.mode}
          </p>
          <p className="mt-1 leading-relaxed">{auth.message}</p>
        </div>

        <LoginForm auth={auth} />

        <div
          className="mt-8 flex flex-wrap items-center gap-3 text-sm"
          data-auth-guest-path="product-first"
        >
          <Link href="/create" className="font-semibold text-[var(--mint)] hover:underline">
            Continue as guest → Generate
          </Link>
          <Link
            href="/create?mode=seller-pack"
            className="text-[var(--mint)] hover:underline"
          >
            Seller Pack
          </Link>
          <Link href="/library" className="text-[var(--mint)] hover:underline">
            Library
          </Link>
          <Link href="/modules" className="text-[var(--fg-muted)] hover:text-white">
            Modules
          </Link>
          <Link href="/#home-tool" className="text-[var(--fg-muted)] hover:text-white">
            Home tool
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
