import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { company } from "@/lib/company";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${site.name} handles photos, generations, and billing data.`,
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: `Privacy Policy | ${site.name}`,
    description: `How ${site.name} handles photos, generations, analytics, and billing data.`,
    url: `${site.url}/privacy`,
    siteName: site.name,
    type: "website",
    images: [site.socialImages.openGraph],
  },
  twitter: {
    card: "summary_large_image",
    title: `Privacy Policy | ${site.name}`,
    description: `How ${site.name} handles photos, generations, analytics, and billing data.`,
    images: [site.socialImages.twitter],
  },
};

export default function PrivacyPage() {
  return (
    <div className="container-x py-16 prose-invert max-w-3xl">
      <h1 className="text-4xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[var(--fg-dim)]">
        Effective August 1, 2026 · {company.legalName}
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
            photos of toys you own.
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
            Public paid checkout is currently closed. If subscriptions open,
            Stripe will process payment details and its privacy policy will
            apply to payment data.
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
            those purposes.
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
    </div>
  );
}
