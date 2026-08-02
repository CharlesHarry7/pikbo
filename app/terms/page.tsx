import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { company } from "@/lib/company";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms for using ${site.name}, the designer toy video maker.`,
  alternates: { canonical: "/terms" },
  openGraph: {
    title: `Terms of Service | ${site.name}`,
    description: `Terms for using ${site.name}, the designer toy video maker.`,
    url: `${site.url}/terms`,
    siteName: site.name,
    type: "website",
    images: [site.socialImages.openGraph],
  },
  twitter: {
    card: "summary_large_image",
    title: `Terms of Service | ${site.name}`,
    description: `Terms for using ${site.name}, the designer toy video maker.`,
    images: [site.socialImages.twitter],
  },
};

export default function TermsPage() {
  return (
    <div className="container-x py-16 max-w-3xl">
      <h1 className="text-4xl font-bold">Terms of Service</h1>
      <p className="mt-2 text-sm text-[var(--fg-dim)]">
        Effective August 1, 2026 · {company.legalName}
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-[var(--fg-muted)]">
        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">The service</h2>
          <p className="mt-2">
            These terms are between you and {company.legalName},{" "}
            {company.entityDescription}, which operates {site.name}. Pikbo is
            subscription-based AI software for turning customer-owned
            designer-toy photos into short product and social-media videos.
            Features and allowances may change as the private beta develops.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">Your content</h2>
          <p className="mt-2">
            You must only upload photos you have the right to use (typically toys you own).
            You keep rights to your original photos. If you submit an eligible Live
            job, you grant us a limited license to process its photo for generation.
            Cached prototype previews do not process your upload. You are responsible
            for how you use exported clips.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">Credits & plans</h2>
          <p className="mt-2">
            Cached prototype previews cost 0 credits, are labeled, and do not
            animate your upload. Live generation requires an eligible signed-in
            account, durable credits, protected delivery, explicit enablement,
            and available provider capacity. Founding Studio is the only paid
            monthly candidate, but production billing remains gated until the
            delivery, cost, and billing checks pass. When enabled, Stripe
            handles the subscription. Credits never guarantee unlimited Live
            generation, and we may rate-limit to protect the service. The
            current planned Founding Studio offer is described on the{" "}
            <Link href="/pricing" className="underline hover:text-[var(--mint)]">
              pricing page
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">
            Cancellation & refunds
          </h2>
          <p className="mt-2">
            There is no public paid checkout during the current private beta.
            When billing opens, cancellation, first-purchase, duplicate-charge,
            and failed-generation rules are governed by our{" "}
            <Link href="/refund" className="underline hover:text-[var(--mint)]">
              Refund Policy
            </Link>
            , subject to any stronger non-waivable consumer rights.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">Acceptable use</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>No illegal content, no impersonation of brands you do not represent.</li>
            <li>No attempts to reverse-engineer, scrape, or overload the API.</li>
            <li>No generating content that infringes others&apos; IP as the primary purpose.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">Disclaimer</h2>
          <p className="mt-2">
            The service is provided &quot;as is&quot;. AI outputs may contain artifacts.{" "}
            {site.name} is not affiliated with any toy manufacturer or brand.
            Review every output before publishing it or relying on it for a
            product listing.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">Contact</h2>
          <p className="mt-2">
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
