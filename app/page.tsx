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
 * 哥飞 2026-07-25：首页 = 承接页，工具在页内，非纯跳转。
 * Primary keyword: AI toy video generator (site.ts).
 */
export const metadata: Metadata = {
  title: { absolute: site.titleDefault },
  description: site.description,
  keywords: [
    site.keyword,
    "AI toy video generator from one photo",
    "toy photo to video",
    "photo into short video toys",
    "designer toy video maker",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: site.titleDefault,
    description: site.description,
    url: site.url,
    siteName: site.name,
    type: "website",
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
            name: `${site.name} — ${site.keyword}`,
            url: site.url,
            description: site.description,
          }),
          ...videoLd,
        ]}
      />

      {/* 哥飞 P0: trial strip + on-page tool (landing = 承接页) */}
      <SoftLaunchStrip />

      <section
        id="home-tool"
        className="border-b border-white/10 bg-gradient-to-b from-black via-[#0a0a0c] to-black px-4 py-10 sm:px-6"
      >
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--mint)]">
            On this page · no extra hop
          </p>
          <h1 className="font-display mt-2 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
            {site.homeH1}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
            Use this <strong className="text-white/85">AI toy video generator</strong>{" "}
            right here: upload one photo of a designer toy you own and{" "}
            <strong className="text-white/85">turn that photo into short video</strong>{" "}
            for listings or social. Free Mini trial · often 1–3 minutes live ·
            Lab demos below are official samples, not customer UGC.
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

      {/* Density / Lab wall — secondary to on-page tool */}
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
