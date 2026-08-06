import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { company } from "@/lib/company";
import { CONCEPT_ROBOTS } from "@/lib/seoIndex";

/**
 * Trust / E-E-A-T surface — short, honest, no fake team headcount.
 * Cold-start: noindex (follow) so crawl budget stays on rank URLs.
 */
export const metadata: Metadata = {
  title: { absolute: `About ${site.name} · Designer-toy AI video` },
  description:
    `${company.legalName} builds Pikbo, subscription-based AI software for turning owned designer-toy photos into listing and social videos.`,
  alternates: { canonical: "/about" },
  robots: CONCEPT_ROBOTS,
  openGraph: {
    title: `About ${site.name}`,
    description:
      "Private-beta AI video software for independent designer-toy sellers. Owned photos only.",
    url: `${site.url}/about`,
    siteName: site.name,
    type: "website",
    images: [site.socialImages.openGraph],
  },
  twitter: {
    card: "summary_large_image",
    title: `About ${site.name}`,
    description:
      "Private-beta AI video software for independent designer-toy sellers. Owned photos only.",
    images: [site.socialImages.twitter],
  },
};

export default function AboutPage() {
  return (
    <div className="bg-black text-white">
      <div className="container-x max-w-3xl py-12 sm:py-16">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--neon-pink)]">
          About
        </p>
        <h1 className="mt-2 font-display text-3xl font-black tracking-tight sm:text-4xl">
          AI product-video software for designer-toy sellers
        </h1>
        <p className="mt-4 text-base leading-relaxed text-white/60">
          {site.name} is built and operated by {company.legalName},{" "}
          {company.entityDescription}. It helps independent sellers turn{" "}
          <strong className="text-white/85">photos of toys they own</strong> into
          short videos for listings, drops, and social channels. The product is
          in an invited private beta; public visitors can inspect labeled Pikbo
          Lab format previews, but public checkout and public product-photo
          generation are closed.
        </p>

        <section className="mt-10 rounded-2xl border border-white/12 bg-white/[0.03] p-5">
          <h2 className="text-lg font-bold text-white">Company and operations</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-[9rem_1fr]">
            <dt className="text-white/35">Legal name</dt>
            <dd className="text-white/65">{company.legalName}</dd>
            <dt className="text-white/35">Formation</dt>
            <dd className="text-white/65">Wyoming limited liability company</dd>
            <dt className="text-white/35">Operations</dt>
            <dd className="text-white/65">
              Founder-operated and remote from Beijing, China. Pikbo does not
              claim a US office or storefront.
            </dd>
            <dt className="text-white/35">Business model</dt>
            <dd className="text-white/65">
              Finite monthly SaaS subscription after the private beta and
              payment-readiness checks are complete.
            </dd>
          </dl>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-bold text-white">What we optimize for</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-white/55">
            <li>Toy identity: paint, sculpt, and packaging stay the reference</li>
            <li>
              Commercial jobs: choose one directed Moment for a listing,
              reveal, drop, or social post
            </li>
            <li>
              Rights: live jobs require confirming you own the photo / rights
            </li>
            <li>
              Delivery honesty: confirmed failures restore their allowance;
              cancel/timeout outcomes may need reconciliation
            </li>
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-bold text-white">What we will not claim</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-white/55">
            <li>Guaranteed sales, rankings, or viral reach</li>
            <li>Public generation or payment before those gates are ready</li>
            <li>Customer UGC we do not have — Lab examples are cached Lab prototype demos</li>
            <li>Franchise IP cloning from packaging you do not control</li>
          </ul>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-lg font-bold text-white">Start here</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/contact"
              className="rounded-full bg-[var(--neon-pink)] px-4 py-2 text-xs font-black text-[var(--void)]"
            >
              Apply to the private beta
            </Link>
            <Link
              href="/tools/ai-toy-video-generator"
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white/80"
            >
              AI toy video generator
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/55"
            >
              Founding Studio plan
            </Link>
            <Link
              href="/guides/designer-toy-ai-video-vs-generic-tools"
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/55"
            >
              Why toy-vertical
            </Link>
          </div>
        </section>

        <p className="mt-12 text-xs leading-relaxed text-white/40">
          Product help starts on our{" "}
          <Link href="/contact" className="text-white/60 underline">
            contact page
          </Link>
          {" "}or the{" "}
          <Link
            href="/guides/how-to-photograph-toys-for-ai-video"
            className="text-white/60 underline"
          >
            toy-photo guide
          </Link>
          . Email:{" "}
          <a
            href={`mailto:${site.contact.supportEmail}`}
            className="text-white/60 underline"
          >
            {site.contact.supportEmail}
          </a>
          . Refunds:{" "}
          <Link href="/refund" className="text-white/50 underline">
            /refund
          </Link>
          . Privacy:{" "}
          <Link href="/privacy" className="text-white/50 underline">
            /privacy
          </Link>
          . Terms:{" "}
          <Link href="/terms" className="text-white/50 underline">
            /terms
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
