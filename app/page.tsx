import type { Metadata } from "next";
import {
  buildHomeShowcaseFeed,
  buildViralPresetsWallFeed,
} from "@/lib/videoFeed";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { listHomeShowcaseProjects } from "@/lib/showcaseProjects";
import { HfExploreHome } from "@/components/HfExploreHome";
import { SoftLaunchStrip } from "@/components/SoftLaunchStrip";
import { LandingToolPanel } from "@/components/LandingToolPanel";
import { HomeSeoBody } from "@/components/HomeSeoBody";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";
import {
  organizationJsonLd,
  softwareApplicationJsonLd,
  videoObjectJsonLd,
  websiteJsonLd,
} from "@/lib/jsonLd";

/**
 * 潮玩版 HF OS + 哥飞养站：
 * 首页 = 品牌 suite + 页内工具；主词完整 Title 只在 /tools/ai-toy-video-generator。
 * Product north star: docs/PRODUCT_NORTH_STAR.md
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
        url: `${site.url}/opengraph-image.png`,
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
    images: [`${site.url}/opengraph-image.png`],
  },
};

export default function Home() {
  const showcase = buildHomeShowcaseFeed();
  const viralWall = buildViralPresetsWallFeed();
  const demos = showcase.map((item) => item.demo);
  const labDemos = demos.length ? demos : DEMO_VIDEOS.slice(0, 8);
  const videoLd = labDemos.slice(0, 6).map(videoObjectJsonLd);
  const lcpPoster =
    viralWall[0]?.demo?.poster ||
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
            name: `${site.name} — Designer Toy AI Video Suite`,
            url: site.url,
            description: site.description,
          }),
          ...videoLd,
        ]}
      />

      {/* Soft live strip + Generate on-page (SEO) · below = full toy OS (HF) */}
      <SoftLaunchStrip />

      <section
        id="home-tool"
        className="border-b border-white/10 bg-gradient-to-b from-black via-[#0a0a0c] to-black px-4 py-7 sm:px-6 sm:py-9"
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--mint)]">
              Generate · on this page
            </p>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/40">
              Designer-toy OS
            </span>
          </div>
          <h1 className="font-display mt-2 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
            {site.homeH1}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-[15px]">
            Upload one photo of a designer toy you own → short video for listings
            or social. Free Mini · live often 1–3 min · wall below is the full
            suite. Keyword guide:{" "}
            <a
              href={site.rankToolPath}
              className="font-semibold text-[var(--mint)] hover:underline"
            >
              AI toy video generator
            </a>
            .
          </p>
          <div className="mt-6">
            <LandingToolPanel
              effectSlug="360-spin-showcase"
              effectName="360° Spin Showcase"
              duration={5}
              aspectRatio="1:1"
            />
          </div>
        </div>
      </section>

      {/* 潮玩版 HF: product rail · viral wall · inside projects · suite doors */}
      <HfExploreHome
        demos={labDemos}
        projects={listHomeShowcaseProjects()}
        feed={showcase}
        viralWall={viralWall}
        toolFirstLayout
      />

      <HomeSeoBody />
    </>
  );
}
