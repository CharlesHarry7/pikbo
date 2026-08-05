import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { company } from "@/lib/company";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms for using ${site.name}, private-beta AI video software for designer-toy sellers.`,
  alternates: { canonical: "/terms" },
  openGraph: {
    title: `Terms of Service | ${site.name}`,
    description: `Terms for using ${site.name}, private-beta AI video software for designer-toy sellers.`,
    url: `${site.url}/terms`,
    siteName: site.name,
    type: "website",
    images: [site.socialImages.openGraph],
  },
  twitter: {
    card: "summary_large_image",
    title: `Terms of Service | ${site.name}`,
    description: `Terms for using ${site.name}, private-beta AI video software for designer-toy sellers.`,
    images: [site.socialImages.twitter],
  },
};

export default function TermsPage() {
  return (
    <div className="container-x max-w-3xl py-16">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--mint)]">
        Terms
      </p>
      <h1 className="mt-2 text-4xl font-bold">Terms of Service</h1>
      <p className="mt-2 text-sm text-[var(--fg-dim)]">
        Effective August 1, 2026 · {company.legalName}
      </p>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
        These terms cover {site.name}, subscription-based AI software from{" "}
        {company.legalName} that helps independent designer-toy (潮玩) sellers
        turn photos of toys they own into short listing and social videos. We are
        in an {company.stage.toLowerCase()}; public checkout is closed, and we do
        not publish customer UGC we do not have. For product context see{" "}
        <Link href="/about" className="underline underline-offset-4 hover:text-[var(--mint)]">
          About
        </Link>
        ; for founder-operated support see{" "}
        <Link href="/contact" className="underline underline-offset-4 hover:text-[var(--mint)]">
          Contact
        </Link>
        ; for the planned{" "}
        <Link href="/pricing" className="underline underline-offset-4 hover:text-[var(--mint)]">
          Founding Studio
        </Link>{" "}
        offer, see pricing.
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
            Operations: {company.operatingModel}. Pikbo does not claim a US
            office or storefront.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">Your content</h2>
          <p className="mt-2">
            You must only upload photos you have the right to use (typically toys you own).
            You keep rights to your original photos. If you submit an eligible Live
            job, you grant us a limited license to process its photo for generation.
            Cached prototype previews do not process your upload. You are responsible
            for how you use exported clips. Lab examples on the site are labeled
            cached prototypes, not community UGC.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">Credits & plans</h2>
          <p className="mt-2">
            Cached prototype previews cost 0 credits, are labeled, and do not
            animate your upload. Live generation requires an eligible signed-in
            account, durable credits, protected delivery, explicit enablement,
            and available provider capacity. Founding Studio is the only paid
            monthly candidate ({company.plannedOffer.launchPacksPerMonth} launch
            packs/month planned when billing opens), but production billing
            remains gated until the delivery, cost, and billing checks pass.
            When enabled, Stripe handles the subscription. Credits never
            guarantee unlimited Live generation, and we may rate-limit to
            protect the service. The current planned Founding Studio offer is
            described on the{" "}
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
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy
        </Link>
        <Link href="/refund" className="underline underline-offset-4">
          Refunds
        </Link>
      </nav>
    </div>
  );
}
