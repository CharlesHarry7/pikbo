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
  const lcpPoster =
    showcase.find((item) => item.recipeSlug === "360-spin-showcase")?.demo
      ?.poster ?? "/demos/scout-still.webp";

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
        className="scroll-mt-16 border-t border-white/[0.08] bg-[#0C0B0F] px-4 py-16 text-[#F3EFE6] sm:px-8 sm:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C6B59A]">
                The fixed Launch Pack
              </p>
              <h2 className="mt-4 max-w-3xl font-display text-4xl font-medium leading-[0.98] tracking-[-0.05em] sm:text-6xl">
                Three drop formats.
                <span className="block text-[#C45C4A]">One selling job.</span>
              </h2>
            </div>
            <p className="max-w-2xl text-sm font-normal leading-6 text-[#F3EFE6]/54 sm:text-base">
              Pikbo is intentionally not a wall of models and settings. The
              first Pack keeps the outputs predictable, reviewable, and ready
              for the places toy sellers already publish.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {FORMATS.map((format) => (
              <article
                key={format.name}
                className="relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#16141C] p-6 shadow-[0_22px_64px_-48px_rgba(0,0,0,0.98)]"
              >
                <p className="text-[10px] font-medium tracking-[0.18em] text-[#C45C4A]">
                  {format.n}
                </p>
                <div className="mt-12 flex items-end justify-between gap-3">
                  <h3 className="text-2xl font-semibold tracking-[-0.04em]">
                    {format.name}
                  </h3>
                  <span className="rounded-full border border-white/12 px-2.5 py-1 text-[10px] font-semibold text-[#C6B59A]">
                    {format.ratio}
                  </span>
                </div>
                <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.14em] text-[#F3EFE6]/38">
                  {format.channel}
                </p>
                <p className="mt-4 text-sm font-normal leading-6 text-[#F3EFE6]/55">
                  {format.description}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-8">
            <Link
              href="/create?mode=seller-pack"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#EDE8DF] px-6 text-sm font-semibold text-[#121014] transition hover:bg-[#F3EFE6]"
            >
              Open the fixed Launch Pack
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.08] bg-[#16141C] px-4 py-14 text-[#F3EFE6] sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C6B59A]">
              One straight line
            </p>
            <h2 className="mt-4 max-w-xl font-display text-4xl font-medium leading-[0.98] tracking-[-0.05em] sm:text-6xl">
              Photo in. Private assets out.
            </h2>
          </div>
          <ol className="grid gap-2 rounded-[1.5rem] sm:grid-cols-3">
            {[
              ["01", "Choose", "Public sample or invited private photo."],
              ["02", "Create", "The three launch formats stay fixed."],
              ["03", "Review", "Check product details before publishing."],
            ].map(([n, title, body]) => (
              <li key={n} className="rounded-[1.2rem] border border-white/10 bg-[#1E1B26] p-5 text-[#F3EFE6]">
                <p className="text-[9px] font-medium uppercase tracking-[0.17em] text-[#C45C4A]">
                  Step {n}
                </p>
                <h3 className="mt-8 text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-xs font-normal leading-5 text-[#F3EFE6]/48">
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
