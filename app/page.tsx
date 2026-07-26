import type { Metadata } from "next";
import {
  buildHomeShowcaseFeed,
  buildViralPresetsWallFeed,
} from "@/lib/videoFeed";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { listHomeShowcaseProjects } from "@/lib/showcaseProjects";
import { HfExploreHome } from "@/components/HfExploreHome";
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
  const viralWall = buildViralPresetsWallFeed();
  const demos = showcase.map((item) => item.demo);
  const labDemos = demos.length ? demos : DEMO_VIDEOS.slice(0, 8);
  const projects = listHomeShowcaseProjects();
  const videoLd = labDemos.slice(0, 6).map(videoObjectJsonLd);
  const lcpPoster =
    projects.find((project) => project.model.includes("Seedance"))?.poster ||
    projects[0]?.poster ||
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

      <HfExploreHome
        projects={projects}
        viralWall={viralWall}
      />

      <HomeSeoBody />
    </>
  );
}
