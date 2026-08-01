import type { Metadata } from "next";
import Link from "next/link";
import { HomeCinemaHero } from "@/components/HomeCinemaHero";
import { HomeSeoBody } from "@/components/HomeSeoBody";
import { HomeTrustFooter } from "@/components/HomeTrustFooter";
import { JsonLd } from "@/components/JsonLd";
import {
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/jsonLd";
import { site } from "@/lib/site";
import { buildHomeShowcaseFeed } from "@/lib/videoFeed";

export const metadata: Metadata = {
  title: { absolute: site.titleDefault },
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: site.titleDefault,
    description: site.description,
    url: site.url,
    siteName: site.name,
    type: "website",
    images: [
      {
        url: site.socialImages.openGraph,
        width: site.socialImages.width,
        height: site.socialImages.height,
        alt: site.socialImages.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: site.titleDefault,
    description: site.description,
    images: [site.socialImages.twitter],
  },
};

const FORMATS = [
  {
    n: "01",
    name: "Listing Spin",
    ratio: "1:1",
    channel: "Marketplace listings",
    description:
      "A centered product view designed for a square listing gallery.",
  },
  {
    n: "02",
    name: "Blind-box Reveal",
    ratio: "9:16",
    channel: "Drops and restocks",
    description:
      "A vertical reveal beat for packaging, launch, and unboxing posts.",
  },
  {
    n: "03",
    name: "Social Flash",
    ratio: "9:16",
    channel: "Reels and short-form",
    description:
      "A fast vertical hero moment for the first seconds of a social post.",
  },
] as const;

export default function Home() {
  const showcase = buildHomeShowcaseFeed();
  const lcpPoster = "/style-studies/art-vinyl-guardian-v1.jpg";

  return (
    <>
      <link rel="preload" as="image" href={lcpPoster} fetchPriority="high" />
      <JsonLd
        data={[
          websiteJsonLd(),
          organizationJsonLd(),
        ]}
      />

      <HomeCinemaHero items={showcase} />

      <section
        id="pack-formats"
        data-home-upgrade="launch-pack"
        className="scroll-mt-16 border-t border-white/[0.08] bg-[#09090B] px-3 py-10 text-[#F4F4F5] sm:px-5 sm:py-14"
      >
        <div className="mx-auto max-w-[1500px]">
          <div className="grid gap-3 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#C8FF3D]">
                The fixed Launch Pack
              </p>
              <h2 className="mt-2 max-w-3xl font-display text-2xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">
                Three formats. One selling job.
              </h2>
            </div>
            <p className="max-w-2xl text-xs leading-5 text-white/46 sm:text-sm">
              A predictable pack for the places toy sellers already publish—without a wall of models and settings.
            </p>
          </div>

          <div className="mt-5 grid gap-2 lg:grid-cols-3">
            {FORMATS.map((format) => (
              <article
                key={format.name}
                className="relative overflow-hidden rounded-[0.9rem] border border-white/[0.08] bg-[#121214] p-4"
              >
                <p className="text-[9px] font-semibold tracking-[0.12em] text-[#C8FF3D]">
                  {format.n}
                </p>
                <div className="mt-5 flex items-end justify-between gap-3">
                  <h3 className="text-lg font-semibold tracking-[-0.03em]">
                    {format.name}
                  </h3>
                  <span className="rounded-full border border-white/12 px-2 py-1 text-[9px] font-semibold text-white/62">
                    {format.ratio}
                  </span>
                </div>
                <p className="mt-2 text-[9px] font-medium uppercase tracking-[0.1em] text-white/36">
                  {format.channel}
                </p>
                <p className="mt-3 text-xs leading-5 text-white/50">
                  {format.description}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-5">
            <Link
              href="/create?mode=seller-pack"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#C8FF3D] px-5 text-xs font-bold text-[#09090B] transition hover:bg-[#D6FF70]"
            >
              Open the fixed Launch Pack
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.08] bg-[#0D0D0F] px-3 py-9 text-[#F4F4F5] sm:px-5 sm:py-12">
        <div className="mx-auto grid max-w-[1500px] gap-5 lg:grid-cols-[0.6fr_1.4fr] lg:items-center">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#C8FF3D]">
              One straight line
            </p>
            <h2 className="mt-2 max-w-xl font-display text-2xl font-semibold leading-tight tracking-[-0.04em] sm:text-3xl">
              Photo in. Private assets out.
            </h2>
          </div>
          <ol className="grid gap-2 sm:grid-cols-3">
            {[
              ["01", "Choose", "Public sample or invited private photo."],
              ["02", "Create", "The three launch formats stay fixed."],
              ["03", "Review", "Check product details before publishing."],
            ].map(([n, title, body]) => (
              <li key={n} className="rounded-[0.9rem] border border-white/[0.08] bg-[#161619] p-4 text-[#F4F4F5]">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#C8FF3D]">
                  Step {n}
                </p>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-[11px] leading-4 text-white/46">
                  {body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <HomeSeoBody />
      <HomeTrustFooter />
    </>
  );
}
