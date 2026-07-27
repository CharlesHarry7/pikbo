import type { Metadata } from "next";
import { buildHomeShowcaseFeed } from "@/lib/videoFeed";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { HomeCinemaHero } from "@/components/HomeCinemaHero";
import { HomeViralWall } from "@/components/HomeViralWall";
import { HomeBrowseCta } from "@/components/HomeBrowseCta";
import { LandingToolPanel } from "@/components/LandingToolPanel";
import { HomeSeoBody } from "@/components/HomeSeoBody";
import { SoftLaunchStrip } from "@/components/SoftLaunchStrip";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";
import {
  organizationJsonLd,
  softwareApplicationJsonLd,
  videoObjectJsonLd,
  websiteJsonLd,
} from "@/lib/jsonLd";

/**
 * 首页 = 潮玩视频内容驱动（学 HF）：
 * 1 Cinema hero → 2 视频墙 → 3 生成入口 → 4 SEO 底文
 * 主词 Title 仍不与 /tools 抢；页内工具保留但放在墙后。
 */
export const metadata: Metadata = {
  title: { absolute: site.titleDefault },
  description: site.description,
  keywords: [
    "Pikbo",
    "designer toy AI video",
    "toy photo to video",
    "photo into short video toys",
    "figure video from photo",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: site.titleDefault,
    description: site.description,
    url: site.url,
    siteName: site.name,
    type: "website",
    images: [
      {
        url: `${site.url}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: site.titleDefault,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: site.titleDefault,
    description: site.description,
    images: [`${site.url}/opengraph-image`],
  },
};

export default function Home() {
  const showcase = buildHomeShowcaseFeed();
  const demos = showcase
    .map((item) => item.demo)
    .filter((demo): demo is NonNullable<typeof demo> => Boolean(demo));
  const labDemos = demos.length ? demos : DEMO_VIDEOS.slice(0, 8);
  const videoLd = labDemos.slice(0, 6).map(videoObjectJsonLd);
  const heroClips =
    showcase.length > 0 ? showcase.slice(0, 6) : [];
  const lcpPoster =
    heroClips[0]?.demo?.poster ||
    labDemos[0]?.poster ||
    DEMO_VIDEOS[0]?.poster ||
    "/demos/orbit-still.webp";

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
          ...videoLd,
        ]}
      />

      {/* 1 · Cinema hero — multi-clip rotate, minimal copy */}
      <HomeCinemaHero items={heroClips} />

      {/* 2 · Dense toy video wall — browse & remake (no strip between cinema→wall) */}
      <HomeViralWall items={showcase} />

      {/* Sticky convert while browsing wall (hides at #home-create) */}
      <HomeBrowseCta />

      {/* Soft-live honesty — after wall, before generate (does not break cinema dwell) */}
      <SoftLaunchStrip />

      {/* 3 · Generate after wall — “your turn” */}
      <section
        id="home-create"
        data-home-create="after-wall"
        className="scroll-mt-16 border-b border-white/10 bg-gradient-to-b from-black via-[#08080a] to-black px-4 py-12 sm:px-6 sm:py-16"
      >
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c8ff3d]">
            Your turn · 轮到你了
          </p>
          <h2 className="font-display mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
            轮到你的潮玩了
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/55 sm:text-[15px]">
            Upload a photo you own — preview a cached Lab recipe first; Live
            eligibility and the exact quote appear before submission. 上传自有潮玩照片即可预览流程。
            {" "}
            <a
              href={site.rankToolPath}
              className="font-semibold text-[#c8ff3d]/90 hover:underline"
            >
              tool guide
            </a>
          </p>
          <div className="mt-8">
            <LandingToolPanel
              effectSlug="360-spin-showcase"
              effectName="360° Spin Showcase"
              duration={5}
              aspectRatio="1:1"
            />
          </div>
        </div>
      </section>

      {/* 4 · SEO body — below the product experience */}
      <HomeSeoBody />
    </>
  );
}
