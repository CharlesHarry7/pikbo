import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${site.name} handles photos, generations, and billing data.`,
};

export default function PrivacyPage() {
  return (
    <div className="container-x py-16 prose-invert max-w-3xl">
      <h1 className="text-4xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[var(--fg-dim)]">
        Last updated: July 22, 2026 · {site.domain}
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-[var(--fg-muted)]">
        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">What we collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Photos you upload to generate clips (processed to create your video).</li>
            <li>Session / credit balance stored in a browser cookie.</li>
            <li>Billing metadata if you subscribe (via Stripe; we do not store full card numbers).</li>
            <li>Basic technical logs (errors, request timing) to keep the service running.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">How we use uploads</h2>
          <p className="mt-2">
            Uploaded photos are sent to our video generation provider solely to produce
            your clip. Do not upload images of people or products you do not have rights to use.
            Prefer photos of toys you own.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">Cookies</h2>
          <p className="mt-2">
            We use an HTTP-only cookie to remember your plan and credit balance on this device.
            Clearing cookies resets your free guest session.
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
            Paid plans are processed by Stripe. Their privacy policy applies to payment data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">Contact</h2>
          <p className="mt-2">
            Questions: privacy@{site.domain.replace(/^www\./, "")}
          </p>
        </section>
      </div>
    </div>
  );
}
