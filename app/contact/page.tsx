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
    <div className="bg-black text-white">
      <div className="container-x max-w-3xl py-12 sm:py-16">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--mint)]">
          Contact
        </p>
        <h1 className="mt-2 font-display text-3xl font-black tracking-tight sm:text-4xl">
          Talk to Pikbo
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/60">
          For product help, private-beta access, privacy requests, or future
          billing questions, use the form below or email our founder-operated
          support desk. We normally reply within two business days.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border border-white/12 bg-white/[0.03] p-5">
            <h2 className="text-lg font-semibold text-white">Email support</h2>
            <a
              href={`mailto:${site.contact.supportEmail}?subject=${subject}`}
              className="mt-3 inline-block break-all font-semibold text-[var(--mint)] underline underline-offset-4"
            >
              {site.contact.supportEmail}
            </a>
            <p className="mt-3 text-xs leading-5 text-white/40">
              Include the email used for Pikbo and, if relevant, the affected job
              or charge reference. Never send card numbers or passwords.
            </p>
            <p className="mt-4 text-xs leading-5 text-white/45">
              Typical topics: private Library recovery, beta access status,
              privacy requests, and future Founding Studio billing questions.
            </p>
          </section>

          <section className="rounded-2xl border border-white/12 bg-white/[0.03] p-5">
            <h2 className="text-lg font-semibold text-white">Private beta</h2>
            <p className="mt-3 text-xs leading-5 text-white/55">
              Independent designer-toy sellers can ask to join the invited beta.
              Tell us where you sell. An application is not a purchase and does
              not guarantee admission. Public checkout is closed.
            </p>
            <BetaRequestForm />
          </section>
        </div>

        <section className="mt-10 rounded-2xl border border-white/12 bg-white/[0.03] p-5">
          <h2 className="text-lg font-semibold text-white">Company information</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-white/35">Legal operator</dt>
            <dd className="text-white/65">
              {company.legalName}, {company.entityDescription}
            </dd>
            <dt className="text-white/35">Business</dt>
            <dd className="text-white/65">{company.productDescription}</dd>
            <dt className="text-white/35">Operating model</dt>
            <dd className="text-white/65">
              {company.operatingModel}. Pikbo does not claim a US office or
              storefront.
            </dd>
            <dt className="text-white/35">Current availability</dt>
            <dd className="text-white/65">
              {company.stage}; public checkout is closed.
            </dd>
            <dt className="text-white/35">Official profiles</dt>
            <dd className="text-white/65">
              {site.officialProfiles.length > 0
                ? site.officialProfiles.join(", ")
                : "No verified public social profiles are listed yet. Prefer email so requests stay durable and private."}
            </dd>
          </dl>
        </section>

        <nav className="mt-10 flex flex-wrap gap-3 text-xs font-semibold text-white/55">
          <Link
            href="/about"
            className="underline underline-offset-4 hover:text-[var(--mint)]"
          >
            About Pikbo
          </Link>
          <Link
            href="/pricing"
            className="underline underline-offset-4 hover:text-[var(--mint)]"
          >
            Founding Studio
          </Link>
          <Link
            href="/refund"
            className="underline underline-offset-4 hover:text-[var(--mint)]"
          >
            Refund policy
          </Link>
          <Link
            href="/privacy"
            className="underline underline-offset-4 hover:text-[var(--mint)]"
          >
            Privacy policy
          </Link>
          <Link
            href="/terms"
            className="underline underline-offset-4 hover:text-[var(--mint)]"
          >
            Terms of service
          </Link>
        </nav>
      </div>
    </div>
  );
}
