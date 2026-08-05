import type { Metadata } from "next";
import Link from "next/link";
import { StatusProbe } from "@/components/StatusProbe";
import { createGenerate360Href } from "@/lib/jobIntents";
import { PRIVATE_ROBOTS } from "@/lib/seoIndex";

/** Status Generate door — listing spin remix (ratio/duration/channel). */
const STATUS_GENERATE_HREF = createGenerate360Href("status");

export const metadata: Metadata = {
  title: "System status",
  description: "Pikbo soft-launch readiness (no secrets).",
  robots: PRIVATE_ROBOTS,
};

export default function StatusPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--fg-dim)]">
        Ops
      </p>
      <h1 className="mt-2 font-display text-3xl font-black uppercase tracking-tight">
        System status
      </h1>
      <p className="mt-2 text-sm text-[var(--fg-muted)]">
        Live probe of{" "}
        <code className="text-[var(--mint)]">/api/health</code> — no secrets
        shown. Launch gates: docs/prd/GO_NO_GO.md.
      </p>
      <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed text-[var(--fg-dim)]">
        Product soft-live: Generate · directed Moments · Library · Cancel mid-job.
        Public Mode B still needs boss Vercel + DNS; paid path needs T6 bake +
        Stripe when you open charging.
      </p>
      <StatusProbe />
      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link
          href={STATUS_GENERATE_HREF}
          className="text-[var(--mint)] hover:underline"
          data-status-generate="remix"
        >
          Generate →
        </Link>
        <Link href="/#home-create" className="text-[var(--mint)] hover:underline">
          Home samples
        </Link>
        <Link href="/library" className="text-[var(--mint)] hover:underline">
          Library
        </Link>
        <Link href="/modules" className="text-[var(--mint)] hover:underline">
          Modules
        </Link>
        <Link
          href="/create?effect=street-power-up&source=status"
          className="text-[var(--fg-muted)] hover:text-white"
        >
          Create one Moment
        </Link>
        <Link href="/login" className="text-[var(--fg-muted)] hover:text-white">
          Sign in
        </Link>
        <Link href="/" className="text-[var(--fg-muted)] hover:text-white">
          Home
        </Link>
      </div>
    </main>
  );
}
