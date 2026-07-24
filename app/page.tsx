import type { Metadata } from "next";
import {
  buildHomeShowcaseFeed,
  buildViralPresetsWallFeed,
} from "@/lib/videoFeed";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { listHomeShowcaseProjects } from "@/lib/showcaseProjects";
import { HfExploreHome } from "@/components/HfExploreHome";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";
import {
  organizationJsonLd,
  softwareApplicationJsonLd,
  videoObjectJsonLd,
  websiteJsonLd,
} from "@/lib/jsonLd";

/**
 * TDH FREEZE (哥飞 1–4 weeks post go-live): title / description / H1
 * live only in lib/site.ts — do not rotate with demos.
 */
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
  },
};

/**
 * HF Explore home — video OS, not marketing blog.
 * Dense viral wall first; product rail; projects; honest Lab media only.
 * SSR emits TDH-aligned metadata + JSON-LD for crawlers (哥飞 structured data).
 */
export default function Home() {
  const showcase = buildHomeShowcaseFeed();
  const viralWall = buildViralPresetsWallFeed();
  const demos = showcase.map((item) => item.demo);
  const labDemos = demos.length ? demos : DEMO_VIDEOS.slice(0, 8);
  // Cap VideoObject graph size — first 6 Lab samples on home.
  const videoLd = labDemos.slice(0, 6).map(videoObjectJsonLd);
  // 哥飞养站 LCP: preload first wall poster (not full video)
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
            url: site.url,
            description: site.description,
          }),
          ...videoLd,
        ]}
      />
      {/* Crawlable one-liner under HF shell — primary job + single CTA path */}
      <div className="sr-only">
        <p>
          {site.homeH1}. {site.description} Open Generate to upload a photo of a
          toy you own and create a short AI video.
        </p>
        <a href="/create?try=1&sample=scout">Try free Mini trial</a>
      </div>
      <HfExploreHome
        demos={labDemos}
        projects={listHomeShowcaseProjects()}
        feed={showcase}
        viralWall={viralWall}
      />
    </>
  );
}
