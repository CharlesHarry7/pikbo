import type { Metadata } from "next";
import Link from "next/link";
import { ProfilePanel } from "@/components/ProfilePanel";
import { publicAuthStatus } from "@/lib/authConfig";
import { createRemixHref } from "@/lib/remixIntent";
import { PRIVATE_ROBOTS } from "@/lib/seoIndex";

/** Page chrome Generate — listing spin remix (ratio/duration/channel). */
const PROFILE_PAGE_GENERATE_HREF = createRemixHref("360-spin-showcase");

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your Pikbo account, plan, balance, and saved work.",
  robots: PRIVATE_ROBOTS,
};

export default function ProfilePage() {
  const auth = publicAuthStatus();

  return (
    <div className="relative px-4 py-10 sm:px-8">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(40%_70%_at_50%_0%,rgba(200,255,61,0.07),transparent_70%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-lg">
        <span className="chip">Account</span>
        <h1 className="mt-3 font-display text-2xl font-black uppercase tracking-tight">
          Profile
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--fg-muted)]">
          Manage your account, plan, balance, and saved work.
        </p>
        <p className="mt-3 text-xs text-[var(--fg-dim)]">
          {auth.message}{" "}
          <Link href="/login" className="text-[var(--mint)] hover:underline">
            Sign-in options →
          </Link>
        </p>
        <div
          className="mt-4 flex flex-wrap gap-2"
          data-profile-page-path="product-first"
        >
          <Link
            href={PROFILE_PAGE_GENERATE_HREF}
            className="btn btn-primary !px-3 !py-1.5 text-xs"
            data-profile-page-generate="remix"
          >
            Generate
          </Link>
          <Link
            href="/create?effect=street-power-up&source=profile"
            className="btn btn-ghost !px-3 !py-1.5 text-xs"
          >
            Create one Moment
          </Link>
          <Link href="/library" className="btn btn-ghost !px-3 !py-1.5 text-xs">
            Library
          </Link>
          <Link href="/pricing" className="btn btn-ghost !px-3 !py-1.5 text-xs">
            Plans
          </Link>
        </div>
        <ProfilePanel />
      </div>
    </div>
  );
}
