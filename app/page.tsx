import type { Metadata } from "next";
import { HfExploreHome } from "@/components/HfExploreHome";
import { JsonLd } from "@/components/JsonLd";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import {
  organizationJsonLd,
  softwareApplicationJsonLd,
  videoObjectJsonLd,
  websiteJsonLd,
} from "@/lib/jsonLd";
import { listShowcaseProjects } from "@/lib/showcaseProjects";
import { site } from "@/lib/site";
import {
  buildHomeShowcaseFeed,
  buildViralPresetsWallFeed,
} from "@/lib/videoFeed";

/**
 * Homepage = 潮玩版 Higgsfield Explore shell.
 * Market-validated structure: product rail → viral wall → premiere →
 * projects → suite doors. Toy vertical only; no fake multi-model.
 */
export const metadata: Metadata = {
  title: { absolute: site.titleDefault },
  description: site.description,
  keywords: [
    "Pikbo",
    "designer toy AI video",
    "toy photo to video",
    "figure video from photo",
    "blind box AI video",
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
  const feed = buildHomeShowcaseFeed();
  const viralWall = buildViralPresetsWallFeed();
  const projects = listShowcaseProjects();
  const demos = DEMO_VIDEOS;
  const lcpPoster =
    feed[0]?.demo?.poster ||
    viralWall[0]?.demo?.poster ||
    demos[0]?.poster ||
    "/demos/scout-still.webp";
  const videoLd = demos.slice(0, 6).map((demo) => videoObjectJsonLd(demo));

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
      <HfExploreHome
        demos={demos}
        projects={projects}
        feed={feed}
        viralWall={viralWall}
      />
    </>
  );
}
