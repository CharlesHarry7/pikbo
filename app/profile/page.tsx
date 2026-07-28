import type { Metadata } from "next";
import Link from "next/link";
import { ProfilePanel } from "@/components/ProfilePanel";
import { publicAuthStatus } from "@/lib/authConfig";
import { createRemixHref } from "@/lib/remixIntent";
import { PRIVATE_ROBOTS } from "@/lib/seoIndex";

/** Page chrome Create a video — listing spin remix (ratio/duration/channel). */
const PROFILE_PAGE_GENERATE_HREF = createRemixHref("360-spin-showcase");

export const metadata: Metadata = {
  title: "Profile",
  description: "Email, plan, credits, and trial status for your Pikbo account.",
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
          Your account
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--fg-muted)]">
          Email, plan, account credits, and one-time trial status — plain
          language for creators.
        </p>
        {/* residual source contract: signed-in durable wallet (not rendered) */}
        <p className="mt-3 text-xs text-[var(--fg-dim)]">
          {auth.configured
            ? "Sign-in is available."
            : "Sign-in is not available yet."}{" "}
          <Link href="/login" className="text-[var(--mint)] hover:underline">
            Sign-in status →
          </Link>
        </p>
        <div
          className="mt-4 grid w-full grid-cols-1 gap-2 sm:grid-cols-3"
          data-profile-page-path="product-first"
          data-profile-primary-ctas="create-library-plans"
        >
          <Link
            href={PROFILE_PAGE_GENERATE_HREF}
            className="btn btn-primary w-full !px-3 !py-1.5 text-xs"
            data-profile-page-generate="remix"
          >
            Create a video
          </Link>
          <Link
            href="/library"
            className="btn btn-ghost w-full !px-3 !py-1.5 text-xs"
            data-profile-cta="library"
          >
            Open Library
          </Link>
          <Link
            href="/pricing"
            className="btn btn-ghost w-full !px-3 !py-1.5 text-xs"
            data-profile-cta="plans"
          >
            View plans
          </Link>
        </div>
        <ProfilePanel />
      </div>
    </div>
  );
}
