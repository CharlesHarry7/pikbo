import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buildHomeShowcaseFeed, hasFeedVideo } from "@/lib/videoFeed";
import { DEMO_VIDEOS, HOME_HERO_DEMO_ID } from "@/lib/demoVideos";
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

/** Launch Pack commercial trio — maps to seller pack child recipes. */
const LAUNCH_PACK_PROOF = [
  {
    key: "listing-spin",
    step: "01",
    label: "Listing-style preview",
    channel: "Marketplace",
    demoId: "scout-spin",
  },
  {
    key: "box-reveal",
    step: "02",
    label: "Reveal-format preview",
    channel: "Drop / unbox",
    demoId: "moon-reveal",
  },
  {
    key: "social-hook",
    step: "03",
    label: "Social-hook preview",
    channel: "Reels / Shorts",
    demoId: "beatbot-hook",
  },
] as const;

export default function Home() {
  const showcase = buildHomeShowcaseFeed();
  const heroItem =
    showcase.find(
      (item) => hasFeedVideo(item) && item.demo.id === HOME_HERO_DEMO_ID
    ) ?? showcase.find(hasFeedVideo);
  // Preload exactly the hero poster used by HomeCinemaHero — no stale duplicate.
  const lcpPoster =
    heroItem?.demo.poster ??
    DEMO_VIDEOS.find((d) => d.id === HOME_HERO_DEMO_ID)?.poster ??
    "/demos/posters/beatbot-unboxed.webp";

  const launchPackAssets = LAUNCH_PACK_PROOF.map((slot) => {
    const demo = DEMO_VIDEOS.find((entry) => entry.id === slot.demoId);
    return {
      ...slot,
      poster: demo?.poster ?? "",
      character: demo?.character ?? "Toy",
      title: demo?.title ?? slot.label,
    };
  }).filter((asset) => Boolean(asset.poster));

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
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-3xl text-center">
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
          </div>

          {launchPackAssets.length === 3 ? (
            <div
              className="mx-auto mt-10 max-w-4xl"
              data-launch-pack-proof="cached-format-trio"
              aria-label="Three cached Launch Pack format previews from different Pikbo Lab toys"
            >
              <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-white/42">
                Three cached format previews
                <span className="mx-2 text-white/20" aria-hidden>
                  ·
                </span>
                Different Pikbo Lab toys
              </p>
              <ol className="grid grid-cols-3 gap-2 sm:gap-3">
                {launchPackAssets.map((asset) => (
                  <li
                    key={asset.key}
                    className="relative min-w-0"
                    data-launch-pack-asset={asset.key}
                  >
                    <article className="overflow-hidden rounded-[1.1rem] border border-white/[0.1] bg-[#111114]">
                      <div className="relative aspect-[3/4] overflow-hidden bg-black">
                        <Image
                          src={asset.poster}
                          alt={`${asset.label} — ${asset.character} cached format preview`}
                          fill
                          sizes="(max-width: 639px) 30vw, 260px"
                          loading="lazy"
                          className="h-full w-full object-cover object-center"
                        />
                        <div
                          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent"
                          aria-hidden
                        />
                        <span className="absolute left-2.5 top-2.5 rounded-full border border-white/15 bg-black/55 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-white/72 backdrop-blur sm:text-[9px]">
                          Cached demo
                        </span>
                        <span className="absolute right-2.5 top-2.5 rounded-full bg-[#c8ff3d] px-2 py-1 text-[9px] font-black tabular-nums text-black">
                          {asset.step}
                        </span>
                        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-3.5">
                          <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#c8ff3d] sm:text-[10px] sm:tracking-[0.14em]">
                            {asset.channel}
                          </p>
                          <p className="mt-1 text-[11px] font-black leading-tight text-white sm:text-base">
                            {asset.label}
                          </p>
                          <p className="mt-0.5 hidden truncate text-[11px] text-white/50 sm:block">
                            {asset.character} · {asset.title}
                          </p>
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-white/38 sm:text-xs">
                These are three format examples from different cached Pikbo Lab
                toys — not one customer Launch Pack and not live generation.
              </p>
            </div>
          ) : null}

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
      <HomeSeoBody />
      <HomeTrustFooter />
    </>
  );
}
