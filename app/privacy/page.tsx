import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { company } from "@/lib/company";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${site.name} handles designer-toy photos, private-beta accounts, and billing data.`,
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: `Privacy Policy | ${site.name}`,
    description: `How ${site.name} handles designer-toy photos, private-beta accounts, analytics, and billing data.`,
    url: `${site.url}/privacy`,
    siteName: site.name,
    type: "website",
    images: [site.socialImages.openGraph],
  },
  twitter: {
    card: "summary_large_image",
    title: `Privacy Policy | ${site.name}`,
    description: `How ${site.name} handles designer-toy photos, private-beta accounts, analytics, and billing data.`,
    images: [site.socialImages.twitter],
  },
};

export default function PrivacyPage() {
  return (
    <div className="container-x max-w-3xl py-16">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--mint)]">
        Privacy
      </p>
      <h1 className="mt-2 text-4xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[var(--fg-dim)]">
        Effective August 1, 2026 · {company.legalName}
      </p>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
        {site.name} is AI product-video software for independent designer-toy
        (潮玩) sellers, operated by {company.legalName}. This policy explains how
        we handle owned toy photos, private-beta accounts, and (when billing
        opens) payment metadata. We are in an {company.stage.toLowerCase()};
        public checkout is closed, and we do not invent customer galleries or
        social proof. Company facts live on{" "}
        <Link href="/about" className="underline underline-offset-4 hover:text-[var(--mint)]">
          About
        </Link>
        ; privacy or deletion requests go through{" "}
        <Link href="/contact" className="underline underline-offset-4 hover:text-[var(--mint)]">
          Contact
        </Link>
        ; planned paid access is described under{" "}
        <Link href="/pricing" className="underline underline-offset-4 hover:text-[var(--mint)]">
          Founding Studio
        </Link>
        .
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-[var(--fg-muted)]">
        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">What we collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Photos submitted through an eligible Live generation path. Cached
              prototype previews do not process your upload.
            </li>
            <li>
              Account, session, entitlement, and job information needed to
              operate an eligible private-beta account.
            </li>
            <li>
              Billing metadata if paid subscriptions open (via Stripe; we do
              not store full card numbers).
            </li>
            <li>Basic technical logs (errors, request timing) to keep the service running.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">How we use uploads</h2>
          <p className="mt-2">
            If an eligible Live submission is accepted, its photo is sent to our
            video generation provider solely to produce that clip. Cached Lab
            prototypes never send your photo to the provider. Do not upload
            images of people or products you do not have rights to use. Prefer
            photos of designer toys you own. We do not train public social feeds
            from your private jobs, and site demos are labeled Lab prototypes—not
            other sellers&apos; UGC.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">Accounts & cookies</h2>
          <p className="mt-2">
            We use an HTTP-only cookie to maintain a browser session. Invited
            accounts may also use an authentication provider and durable
            account records so private jobs and entitlements can be recovered.
            Device-only Library entries can remain in local browser storage.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">
            Product analytics (optional)
          </h2>
          <p className="mt-2">
            If configured, we may load Google Analytics 4 or a first-party beacon
            to count coarse product events (page view, upload ready, generate
            start/result, export click). We do not send your uploaded photos,
            generation prompts, emails, or raw media URLs through analytics.
            Analytics is env-gated and disabled when measurement IDs are unset.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">Payments</h2>
          <p className="mt-2">
            Public paid checkout is currently closed. If Founding Studio
            subscriptions open, Stripe will process payment details and its
            privacy policy will apply to payment data. See{" "}
            <Link href="/pricing" className="underline hover:text-[var(--mint)]">
              pricing
            </Link>{" "}
            for the planned offer and{" "}
            <Link href="/refund" className="underline hover:text-[var(--mint)]">
              refunds
            </Link>{" "}
            for charge handling.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">
            Access, deletion & retention
          </h2>
          <p className="mt-2">
            You may ask us to access or delete personal information associated
            with your account. We may retain limited records when required for
            security, dispute handling, accounting, or law. Operational logs
            and provider records are kept only as long as reasonably needed for
            those purposes. Support and privacy requests are handled by our
            founder-operated desk ({company.operatingModel.toLowerCase()}).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">Contact</h2>
          <p className="mt-2">
            Questions:{" "}
            <a
              href={`mailto:${site.contact.supportEmail}`}
              className="underline hover:text-[var(--mint)]"
            >
              {site.contact.supportEmail}
            </a>
            {" "}or use our{" "}
            <Link href="/contact" className="underline hover:text-[var(--mint)]">
              contact page
            </Link>
            .
          </p>
        </section>
      </div>

      <nav className="mt-10 flex flex-wrap gap-3 border-t border-[var(--border)] pt-8 text-xs font-semibold">
        <Link href="/about" className="underline underline-offset-4">
          About
        </Link>
        <Link href="/contact" className="underline underline-offset-4">
          Contact
        </Link>
        <Link href="/pricing" className="underline underline-offset-4">
          Founding Studio
        </Link>
        <Link href="/terms" className="underline underline-offset-4">
          Terms
        </Link>
        <Link href="/refund" className="underline underline-offset-4">
          Refunds
        </Link>
      </nav>
    </div>
  );
}
