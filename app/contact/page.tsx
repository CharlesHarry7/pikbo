import type { Metadata } from "next";
import Link from "next/link";
import { company } from "@/lib/company";
import { site } from "@/lib/site";
import { BetaRequestForm } from "@/components/BetaRequestForm";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${company.legalName} about Pikbo support, private-beta access, privacy, or billing.`,
  alternates: { canonical: "/contact" },
  openGraph: {
    title: `Contact ${company.legalName}`,
    description:
      "Product support and private-beta contact information for Pikbo.",
    url: `${site.url}/contact`,
    siteName: site.name,
    type: "website",
    images: [site.socialImages.openGraph],
  },
  twitter: {
    card: "summary_large_image",
    title: `Contact ${company.legalName}`,
    description:
      "Product support and private-beta contact information for Pikbo.",
    images: [site.socialImages.twitter],
  },
};

const subject = encodeURIComponent("Pikbo support request");

export default function ContactPage() {
  return (
    <div className="container-x max-w-3xl py-16">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--mint)]">
        Contact
      </p>
      <h1 className="mt-2 text-4xl font-bold">Talk to Pikbo</h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
        For product help, private-beta access, privacy requests, or future
        billing questions, email our founder-operated support desk. We normally
        reply within two business days.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-[var(--border)] bg-white/[0.03] p-5">
          <h2 className="text-lg font-semibold text-[var(--fg)]">Email support</h2>
          <a
            href={`mailto:${site.contact.supportEmail}?subject=${subject}`}
            className="mt-3 inline-block break-all font-semibold text-[var(--mint)] underline underline-offset-4"
          >
            {site.contact.supportEmail}
          </a>
          <p className="mt-3 text-xs leading-5 text-[var(--fg-dim)]">
            Include the email used for Pikbo and, if relevant, the affected job
            or charge reference. Never send card numbers or passwords.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-white/[0.03] p-5">
          <h2 className="text-lg font-semibold text-[var(--fg)]">Private beta</h2>
          <p className="mt-3 text-xs leading-5 text-[var(--fg-muted)]">
            Independent designer-toy sellers can ask to join the invited beta.
            Tell us where you sell and which product-video formats you need. An
            application is not a purchase and does not guarantee admission.
          </p>
          <BetaRequestForm />
        </section>
      </div>

      <section className="mt-10 border-t border-[var(--border)] pt-8">
        <h2 className="text-lg font-semibold text-[var(--fg)]">Company information</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="text-[var(--fg-dim)]">Legal operator</dt>
          <dd className="text-[var(--fg-muted)]">
            {company.legalName}, {company.entityDescription}
          </dd>
          <dt className="text-[var(--fg-dim)]">Business</dt>
          <dd className="text-[var(--fg-muted)]">{company.productDescription}</dd>
          <dt className="text-[var(--fg-dim)]">Operating model</dt>
          <dd className="text-[var(--fg-muted)]">
            {company.operatingModel}. Pikbo does not claim a US office or
            storefront.
          </dd>
          <dt className="text-[var(--fg-dim)]">Current availability</dt>
          <dd className="text-[var(--fg-muted)]">
            {company.stage}; public checkout is closed.
          </dd>
        </dl>
      </section>

      <nav className="mt-10 flex flex-wrap gap-3 text-xs font-semibold">
        <Link href="/refund" className="underline underline-offset-4">
          Refund policy
        </Link>
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy policy
        </Link>
        <Link href="/terms" className="underline underline-offset-4">
          Terms of service
        </Link>
      </nav>
    </div>
  );
}
