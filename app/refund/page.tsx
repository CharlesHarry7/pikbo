import type { Metadata } from "next";
import Link from "next/link";
import { company } from "@/lib/company";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: `Cancellation, refund, duplicate-charge, and failed-generation policy for ${site.name} (private beta; public checkout closed).`,
  alternates: { canonical: "/refund" },
  openGraph: {
    title: `Refund Policy | ${site.name}`,
    description:
      "Cancellation, refund, duplicate-charge, and failed-generation rules for Pikbo designer-toy video software.",
    url: `${site.url}/refund`,
    siteName: site.name,
    type: "website",
    images: [site.socialImages.openGraph],
  },
  twitter: {
    card: "summary_large_image",
    title: `Refund Policy | ${site.name}`,
    description:
      "Cancellation, refund, duplicate-charge, and failed-generation rules for Pikbo designer-toy video software.",
    images: [site.socialImages.twitter],
  },
};

export default function RefundPage() {
  return (
    <div className="container-x max-w-3xl py-16">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--mint)]">
        Refunds
      </p>
      <h1 className="mt-2 text-4xl font-bold">Refund Policy</h1>
      <p className="mt-2 text-sm text-[var(--fg-dim)]">
        Effective August 1, 2026 · {company.legalName}
      </p>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
        {site.name} is founder-operated AI video software for independent
        designer-toy (潮玩) sellers. {company.stage}; public checkout is closed
        today, so visitors cannot buy a subscription on this site. The rules
        below describe how Founding Studio billing, first-purchase refunds, and
        failed paid generations will work when charges open. Product context:{" "}
        <Link href="/about" className="underline underline-offset-4 hover:text-[var(--mint)]">
          About
        </Link>
        . Support:{" "}
        <Link href="/contact" className="underline underline-offset-4 hover:text-[var(--mint)]">
          Contact
        </Link>
        . Planned offer:{" "}
        <Link href="/pricing" className="underline underline-offset-4 hover:text-[var(--mint)]">
          Founding Studio pricing
        </Link>
        .
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-[var(--fg-muted)]">
        <section className="rounded-2xl border border-[var(--mint)]/30 bg-[var(--mint)]/5 p-5">
          <h2 className="text-lg font-semibold text-[var(--fg)]">Current beta status</h2>
          <p className="mt-2">
            Pikbo does not currently offer public paid checkout.{" "}
            {company.operatingModel}. When Founding Studio billing opens
            ({company.plannedOffer.launchPacksPerMonth} launch packs/month
            planned), these rules will be shown again before the first charge.
            Until then, no subscription purchase can be completed on{" "}
            {site.domain}.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">Cancel renewal</h2>
          <p className="mt-2">
            You may cancel a paid subscription at any time. Cancellation stops
            the next renewal; access continues through the already-paid billing
            period unless we state otherwise when processing a refund.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">Seven-day first-purchase refund</h2>
          <p className="mt-2">
            We will refund a first subscription purchase requested within seven
            calendar days if no paid generation allowance
            has been used. Renewal charges are not covered by this voluntary
            first-purchase rule, but duplicate or incorrect charges are covered
            below.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">Billing errors</h2>
          <p className="mt-2">
            We refund duplicate charges and charges we confirm were made in
            error. Contact us promptly with the account email, charge date, and
            the last four digits shown on your receipt. Do not send a full card
            number.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">Failed generations</h2>
          <p className="mt-2">
            If our system confirms that a paid generation failed before a
            deliverable result, the associated generation allowance or credits
            are restored automatically. Timeout, cancellation, or an uncertain
            provider outcome may remain pending while we reconcile the job; we
            will not promise a refund before that outcome is confirmed.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">Mandatory rights</h2>
          <p className="mt-2">
            Nothing in this policy limits non-waivable consumer rights that
            apply where you live. If local law provides a stronger refund or
            cancellation right, that law controls.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--fg)]">Request help</h2>
          <p className="mt-2">
            Email{" "}
            <a
              href={`mailto:${site.contact.supportEmail}?subject=${encodeURIComponent("Pikbo refund request")}`}
              className="underline hover:text-[var(--mint)]"
            >
              {site.contact.supportEmail}
            </a>
            . We normally acknowledge requests within two business days. See
            our{" "}
            <Link href="/contact" className="underline hover:text-[var(--mint)]">
              contact page
            </Link>{" "}
            for the information to include.
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
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy
        </Link>
      </nav>
    </div>
  );
}
