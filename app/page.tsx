import type { Metadata } from "next";
import { HomeBrowseCta } from "@/components/HomeBrowseCta";
import { HomeCinemaHero } from "@/components/HomeCinemaHero";
import { HomeTrustFooter } from "@/components/HomeTrustFooter";
import { HomeViralWall } from "@/components/HomeViralWall";
import { HomeExploreRecipeRail } from "@/components/HomeExploreRecipeRail";
import { HfProductRail } from "@/components/HfProductRail";
import { JsonLd } from "@/components/JsonLd";
import {
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/jsonLd";
import { site } from "@/lib/site";
import { buildHomeShowcaseFeed } from "@/lib/videoFeed";

const HOME_DESCRIPTION =
  "Preview one Street Power-Up Moment for designer toys. Pikbo's public sample is cached and costs 0 credits; invited private beta sellers can submit one owned toy photo for one private result.";

export const metadata: Metadata = {
  title: { absolute: site.titleDefault },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: site.titleDefault,
    description: HOME_DESCRIPTION,
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
    description: HOME_DESCRIPTION,
    images: [site.socialImages.twitter],
  },
};

export default function Home() {
  const lcpPoster = "/demos/beatbot-still.webp";
  // AIT-241: Moment hero (primary LCP) → Lab proof wall → thin Explore recipe
  // rail → HF product suite rail. Generate doors use createGenerate360Href;
  // density without full HfExploreHome remount, Seller Pack, or fake UGC.
  const proofWall = buildHomeShowcaseFeed();

  return (
    <>
      <link rel="preload" as="image" href={lcpPoster} fetchPriority="high" />
      <JsonLd
        data={[
          { ...websiteJsonLd(), description: HOME_DESCRIPTION },
          { ...organizationJsonLd(), description: HOME_DESCRIPTION },
        ]}
      />

      <HomeCinemaHero />
      {/* AIT-371: last proof-wall / rail folds clear HomeBrowseCta + safe-bottom */}
      <div
        className="pb-[var(--home-browse-cta-pad)] lg:pb-0"
        data-home-content-pad="home-browse-cta"
      >
        <HomeViralWall items={proofWall} />
        <HomeExploreRecipeRail items={proofWall} />
      </div>
      {/* AIT-256/AIT-71: floating Generate clears home indicator; z below sticky header */}
      <HomeBrowseCta />
      <HfProductRail />
      <HomeTrustFooter />
    </>
  );
}
