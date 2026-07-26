import type { Metadata } from "next";
import {
  buildHomeShowcaseFeed,
  buildViralPresetsWallFeed,
} from "@/lib/videoFeed";
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
  const viralWall = buildViralPresetsWallFeed();
  const demos = showcase.map((item) => item.demo);
  const labDemos = demos.length ? demos : DEMO_VIDEOS.slice(0, 8);
  const videoLd = labDemos.slice(0, 6).map(videoObjectJsonLd);
  const heroClips =
    showcase.length > 0
      ? showcase.slice(0, 6)
      : viralWall.slice(0, 6);
  const lcpPoster =
    heroClips[0]?.demo?.poster ||
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
      <HomeViralWall items={viralWall.length ? viralWall : showcase} />

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
        <div id="home-tool" className="mx-auto max-w-5xl scroll-mt-16">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c8ff3d]">
            Your turn · 轮到你了
          </p>
          <h2 className="font-display mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
            轮到你的潮玩了
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/55 sm:text-[15px]">
            Upload a photo you own — free Mini trial · ~5s · 480p · on-player
            mark. 上传自有潮玩照片即可试。
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

      {/* 4 · Three restrained value points */}
      <section
        data-home-value="three-points"
        className="relative overflow-hidden border-b border-white/10 bg-[#08070a] px-4 py-16 sm:px-6 sm:py-20"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_15%,rgba(255,73,160,0.16),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(129,83,255,0.16),transparent_30%),radial-gradient(circle_at_55%_100%,rgba(255,145,55,0.1),transparent_30%)]" />
        <div className="relative mx-auto max-w-6xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff74b7]">
            为潮玩而生，不是通用模板
          </p>
          <h2 className="font-display mt-2 max-w-3xl text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
            收藏展示和卖家上架，都要先认得出这只玩具
          </h2>
          <div className="mt-9 grid gap-3 md:grid-cols-3">
            {[
              {
                n: "01",
                title: "保留潮玩细节",
                body: "优先守住轮廓、涂装和 logo；生成后仍提供清晰的人工检查路径。",
                color: "from-[#ff5da8]/25",
              },
              {
                n: "02",
                title: "一张照片，多种输出",
                body: "同一张主图可继续做 360°、开箱、漂浮、特写和 Listing 风格。",
                color: "from-[#8f6bff]/25",
              },
              {
                n: "03",
                title: "可分享，也可上架",
                body: "既适合收藏玩家晒柜，也适合卖家制作商品展示和社媒钩子。",
                color: "from-[#ff9b52]/25",
              },
            ].map((item) => (
              <article
                key={item.n}
                className={`rounded-2xl border border-white/10 bg-gradient-to-br ${item.color} via-white/[0.035] to-transparent p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-6`}
              >
                <span className="text-[10px] font-black tracking-[0.18em] text-white/35">
                  {item.n}
                </span>
                <h3 className="mt-8 text-xl font-black text-white">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/55">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 5 · Bottom conversion loop */}
      <section
        data-home-final-cta="upload-or-watch"
        className="relative overflow-hidden bg-black px-4 py-20 text-center sm:px-6 sm:py-28"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_45%,rgba(255,73,160,0.18),transparent_28%),radial-gradient(circle_at_75%_45%,rgba(133,84,255,0.18),transparent_30%)]" />
        <div className="relative mx-auto max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c8ff3d]">
            你的玩具，下一条
          </p>
          <h2 className="font-display mt-3 text-4xl font-black uppercase leading-none tracking-tight text-white sm:text-6xl">
            看够了，就让它动起来
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/55 sm:text-base">
            上传一张你拥有的潮玩照片，先免费试一次 Mini；也可以回到视频墙继续找灵感。
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="#home-create"
              className="rounded-full bg-[#c8ff3d] px-8 py-3.5 text-sm font-black text-black shadow-[0_0_40px_rgba(200,255,61,0.3)] transition hover:-translate-y-0.5 hover:brightness-110"
            >
              上传照片生成
            </a>
            <a
              href="#toy-wall"
              className="rounded-full border border-white/15 bg-white/[0.04] px-7 py-3.5 text-sm font-bold text-white/75 transition hover:bg-white/[0.08] hover:text-white"
            >
              查看更多示例视频
            </a>
          </div>
        </div>
      </section>

      {/* SEO depth stays available but visually collapsed below the experience */}
      <HomeSeoBody />
    </>
  );
}
