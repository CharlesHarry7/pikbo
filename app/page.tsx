import type { Metadata } from "next";
import Link from "next/link";
import { buildHomeShowcaseFeed } from "@/lib/videoFeed";
import { HomeCinemaHero } from "@/components/HomeCinemaHero";
import { HomeViralWall } from "@/components/HomeViralWall";
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
  const lcpPoster = showcase[0]?.demo?.poster ?? "/demos/orbit-still.webp";

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
      <HomeViralWall items={showcase} />

      <section
        id="home-create"
        data-home-upgrade="launch-pack"
        className="relative isolate overflow-hidden border-t border-white/[0.08] bg-[#0a0a0c] px-5 py-20 sm:px-8 sm:py-28"
      >
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(200,255,61,0.12),transparent_42%)]"
          aria-hidden
        />
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c8ff3d]">
            Launch Pack
          </p>
          <h2 className="mt-3 font-display text-4xl font-black tracking-[-0.045em] text-white sm:text-6xl">
            When one clip is only the beginning.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/58 sm:text-lg">
            Turn the same toy into a coordinated product spin, reveal and social
            hook for your next drop.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/create?mode=seller-pack"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#c8ff3d] px-7 text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-[#d5ff6b]"
            >
              Build a Launch Pack
            </Link>
            <Link
              href="/pricing"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/18 px-7 text-sm font-bold text-white/72 transition hover:border-white/40 hover:text-white"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
