import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { company } from "@/lib/company";
import { CONCEPT_ROBOTS } from "@/lib/seoIndex";
import {
  CREDITS_PER_VIDEO,
  FOUNDING_STUDIO_MOMENTS,
  getPlan,
} from "@/lib/pricing";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

/**
 * Trust / E-E-A-T surface — short, honest, no fake team headcount.
 * Cold-start: noindex (follow) so crawl budget stays on rank URLs.
 */
export const metadata: Metadata = {
  title: { absolute: `About ${site.name} · Designer-toy AI video` },
  description:
    `${company.legalName} builds Pikbo, private-beta AI software that turns one owned designer-toy photo into a directed Street Power-Up Moment in a private Library.`,
  alternates: { canonical: "/about" },
  robots: CONCEPT_ROBOTS,
  openGraph: {
    title: `About ${site.name}`,
    description:
      "Private-beta AI video software for independent designer-toy sellers. One Moment loop: owned photo → Street Power-Up → private Library.",
    url: `${site.url}/about`,
    siteName: site.name,
    type: "website",
    images: [site.socialImages.openGraph],
  },
  twitter: {
    card: "summary_large_image",
    title: `About ${site.name}`,
    description:
      "Private-beta AI video software for independent designer-toy sellers. One Moment loop: owned photo → Street Power-Up → private Library.",
    images: [site.socialImages.twitter],
  },
};

const LOOP_STEPS = [
  {
    step: "01",
    title: "Upload one owned toy photo",
    body: "Use a rights-owned product still of a figure, plush, or blind-box SKU you sell. Live jobs require confirming ownership and rights.",
  },
  {
    step: "02",
    title: "Create one Street Power-Up Moment",
    body: "The first directed contract is Street Power-Up: vertical 9:16, 5 seconds, Fast 720p. The server owns the priced fields — no freeform prompt shopping.",
  },
  {
    step: "03",
    title: "Recover in your private Library",
    body: "Completed results land in your owner-only Library for playback and download. Failed Moments release their credit reservation.",
  },
] as const;

const PREVIEW_HREF =
  `${MOMENT_CREATE_HREF}&source=about-preview&try=1&sample=beatbot` as const;

export default function AboutPage() {
  const foundingStudio = getPlan("founding_studio");

  return (
    <div className="bg-black text-white">
      <div className="container-x max-w-3xl py-12 sm:py-16">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--mint)]">
          About
        </p>
        <h1 className="mt-2 font-display text-3xl font-black tracking-tight sm:text-4xl">
          Designer-toy AI video for one honest Moment
        </h1>
        <p className="mt-4 text-base leading-relaxed text-white/60">
          {site.name} is built and operated by {company.legalName},{" "}
          {company.entityDescription}. It helps independent designer-toy sellers
          turn{" "}
          <strong className="text-white/85">photos of toys they own</strong>{" "}
          into one directed product-video Moment for listings, drops, and social
          posts. The product is in an invited private beta: public visitors can
          inspect labeled Pikbo Lab previews, but public product-photo generation
          and public checkout stay closed until delivery gates pass.
        </p>

        <section className="mt-10" aria-labelledby="about-loop-title">
          <h2 id="about-loop-title" className="text-lg font-bold text-white">
            The one Moment loop
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            Pikbo is not a multi-model cinema suite or public community wall. The
            active path is deliberately narrow so quality, privacy, recovery, and
            cost can be measured with real sellers.
          </p>
          <ol className="mt-5 space-y-3">
            {LOOP_STEPS.map((item) => (
              <li
                key={item.step}
                className="rounded-2xl border border-white/12 bg-white/[0.03] p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--mint)]/15 text-[10px] font-black text-[var(--mint)]">
                    {item.step}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-white/55">
                      {item.body}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="mt-10 overflow-hidden rounded-2xl border border-white/12 bg-white/[0.03]"
          aria-labelledby="about-founding-title"
        >
          <div className="border-b border-white/10 bg-white/[0.03] px-5 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--mint)]">
              Planned offer · not open for public checkout
            </p>
          </div>
          <div className="p-5">
            <h2
              id="about-founding-title"
              className="text-lg font-bold text-white"
            >
              Founding Studio
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              When private delivery, billing, refund, and measured cost gates
              pass, the founding subscription is{" "}
              <strong className="text-white/85">
                ${foundingStudio.priceMonthly}/month
              </strong>{" "}
              for{" "}
              <strong className="text-white/85">
                {FOUNDING_STUDIO_MOMENTS} directed Moments
              </strong>{" "}
              ({CREDITS_PER_VIDEO} credits each;{" "}
              {foundingStudio.credits} credits total). Outputs stay fixed at
              5-second Fast 720p with private Library delivery and owner-only
              downloads. Credits roll over while the subscription remains active.
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-white/55">
              <li>No unlimited generation and no free live provider runs</li>
              <li>
                Public visitors still get labeled cached prototypes only — their
                upload is not processed
              </li>
              <li>
                Admission is invite-only during private beta; an application is
                not a purchase
              </li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/pricing"
                className="rounded-full bg-[#c8ff3d] px-4 py-2 text-xs font-black text-black"
              >
                Founding Studio plan
              </Link>
              <Link
                href="/contact?source=about-founding-studio"
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white/80"
              >
                Request private beta
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-bold text-white">What we optimize for</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-white/55">
            <li>Toy identity: paint, sculpt, and packaging stay the reference</li>
            <li>
              One commercial job at a time: a single directed Moment for a
              listing, reveal, drop, or social post
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
            <li>
              Customer UGC we do not have — Lab examples are cached Lab prototype
              demos
            </li>
            <li>Franchise IP cloning from packaging you do not control</li>
            <li>
              Frozen suite surfaces (Explore, Community, batch tools, model
              marketplace) as active product
            </li>
          </ul>
        </section>

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
              Finite monthly SaaS subscription (Founding Studio) after private
              beta and payment-readiness checks are complete.
            </dd>
            <dt className="text-white/35">Stage</dt>
            <dd className="text-white/65">
              {company.stage}; public checkout is closed.
            </dd>
          </dl>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-lg font-bold text-white">Start here</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/contact?source=about-cta"
              className="rounded-full bg-[#c8ff3d] px-4 py-2 text-xs font-black text-black"
            >
              Apply to the private beta
            </Link>
            <Link
              href={PREVIEW_HREF}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white/80"
            >
              Preview Street Power-Up
            </Link>
            <Link
              href="/tools/ai-toy-video-generator"
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/55"
            >
              AI toy video generator
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/55"
            >
              Founding Studio plan
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
