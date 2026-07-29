import type { Metadata } from "next";
import Link from "next/link";
import { buildHomeShowcaseFeed } from "@/lib/videoFeed";
import { HomeCinemaHero } from "@/components/HomeCinemaHero";
import { HomeViralWall } from "@/components/HomeViralWall";
import { HomeSeoBody } from "@/components/HomeSeoBody";
import { HomeTrustFooter } from "@/components/HomeTrustFooter";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";
import {
  organizationJsonLd,
  softwareApplicationJsonLd,
  websiteJsonLd,
} from "@/lib/jsonLd";

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

export default function Home() {
  const showcase = buildHomeShowcaseFeed();
  const lcpPoster =
    showcase.find((item) => item.recipeSlug === "360-spin-showcase")?.demo
      ?.poster ?? "/demos/scout-still.webp";

  const formats = [
    {
      n: "01",
      name: "Listing Spin",
      spec: "1:1 · 5 sec · 720p",
      use: "A centered product-showcase draft for marketplace listings and product pages.",
      note: "Check inferred side and back details before publishing.",
    },
    {
      n: "02",
      name: "Blind-box Reveal",
      spec: "9:16 · 5 sec · 720p",
      use: "A vertical box-to-figure reveal for drop announcements and unboxing posts.",
      note: "Check packaging, logos, paint, and small product details.",
    },
    {
      n: "03",
      name: "Social Flash",
      spec: "9:16 · 5 sec · 720p",
      use: "A fast vertical hero shot for Reels, Shorts, and launch teasers.",
      note: "Check the first frame, silhouette, and accessory stability.",
    },
  ] as const;

  return (
    <>
      <link rel="preload" as="image" href={lcpPoster} fetchPriority="high" />
      <JsonLd
        data={[
          websiteJsonLd(),
          organizationJsonLd(),
          softwareApplicationJsonLd({
            name: `${site.name} — Designer Toy AI Video`,
            url: site.url,
            description: site.description,
          }),
        ]}
      />

      <HomeCinemaHero items={showcase} />

      <section
        id="pack-formats"
        data-home-upgrade="launch-pack"
        className="scroll-mt-14 border-y border-white/10 bg-[#0b0b0c] px-5 py-18 text-white sm:px-8 sm:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c8ff3d]">
                The fixed Launch Pack
              </p>
              <h2 className="mt-3 max-w-4xl font-display text-4xl font-black tracking-[-0.055em] text-white sm:text-6xl">
                Three formats. One selling job.
              </h2>
            </div>
            <Link
              href="/create?mode=seller-pack"
              className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-[#c8ff3d] px-7 text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-[#d5ff6b]"
            >
              Preview the Pack ↗
            </Link>
          </div>

          <div className="mt-10 grid gap-3 lg:grid-cols-3">
            {formats.map((format) => (
              <article
                key={format.name}
                className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6 transition hover:-translate-y-1 hover:border-[#c8ff3d]/35 sm:p-7"
              >
                <div
                  className="absolute right-[-1rem] top-[-2.5rem] font-display text-[8rem] font-black leading-none text-white/[0.035]"
                  aria-hidden
                >
                  {format.n}
                </div>
                <div className="relative">
                  <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-[#c8ff3d]/35 bg-[#c8ff3d]/10 px-2 text-[10px] font-black text-[#c8ff3d]">
                    {format.n}
                  </span>
                  <h3 className="mt-10 text-2xl font-black tracking-[-0.035em]">
                    {format.name}
                  </h3>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#c8ff3d]">
                    {format.spec}
                  </p>
                  <p className="mt-5 text-sm leading-6 text-white/62">
                    {format.use}
                  </p>
                  <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-white/36">
                    {format.note}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="home-create"
        className="overflow-hidden bg-[#c8ff3d] px-5 py-16 text-black sm:px-8 sm:py-20"
      >
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.84fr_1.16fr] lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/55">
              The shortest useful path
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-4xl font-black tracking-[-0.055em] sm:text-6xl">
              From shelf photo to private Library.
            </h2>
            <p className="mt-5 max-w-xl text-sm font-semibold leading-6 text-black/62 sm:text-base">
              No model maze. No public gallery. Upload a photo you have the
              right to use, confirm the fixed Pack, then recover every completed
              clip from the same signed-in account.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-[1.75rem] border border-black/20 bg-black/20 sm:grid-cols-3">
            {[
              ["01", "Add one SKU", "Use a clear, full-product photo you own."],
              [
                "02",
                "Create the trio",
                "30 credits reserved; 10 settled per completed clip.",
              ],
              [
                "03",
                "Review & download",
                "Private results reopen through short-lived owner links.",
              ],
            ].map(([n, title, body]) => (
              <div key={n} className="bg-[#d6ff69] p-5 sm:min-h-48 sm:p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
                  Step {n}
                </p>
                <h3 className="mt-8 text-xl font-black tracking-[-0.03em]">
                  {title}
                </h3>
                <p className="mt-3 text-xs font-semibold leading-5 text-black/58">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HomeViralWall items={showcase} />
      <HomeSeoBody />
      <HomeTrustFooter />
    </>
  );
}
