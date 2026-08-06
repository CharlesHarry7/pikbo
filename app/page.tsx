import type { Metadata } from "next";
import { HomeCinemaHero } from "@/components/HomeCinemaHero";
import { HomeTrustFooter } from "@/components/HomeTrustFooter";
import { HomeViralWall } from "@/components/HomeViralWall";
import { HfProductRail } from "@/components/HfProductRail";
import { SoftLaunchStrip } from "@/components/SoftLaunchStrip";
import { JsonLd } from "@/components/JsonLd";
import {
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/jsonLd";
import { site } from "@/lib/site";
import { buildHomeAttractionFeed } from "@/lib/homeAttractionFeed";
import { buildHomeShowcaseFeed } from "@/lib/videoFeed";

const HOME_DESCRIPTION =
  "AI video for designer toys — JP/US collectible IP wall, Moments, listing motion. Lab previews free; private create when ready.";

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

/**
 * Clean HF-shaped home (not a module landfill):
 * 1. Soft free strip
 * 2. Apps product rail
 * 3. One curated IP / motion wall (main stage)
 * 4. One Moment CTA band
 * 5. Trust
 *
 * Promo / Seedance / extra rails / duplicate galleries removed — less visual noise.
 * Wall stills later swap to video via demos/loops + VIDEO_LOOP_IDS.
 */
export default function Home() {
  const proofWall = buildHomeShowcaseFeed();
  const attractionWall = buildHomeAttractionFeed();
  const lcpPoster =
    attractionWall[0]?.poster ??
    proofWall[0]?.demo?.poster ??
    "/collectibles/jp-anime-scale.webp";

  return (
    <div className="bg-black text-white" data-home-layout="hf-clean-v1">
      <link rel="preload" as="image" href={lcpPoster} fetchPriority="high" />
      <JsonLd
        data={[
          { ...websiteJsonLd(), description: HOME_DESCRIPTION },
          { ...organizationJsonLd(), description: HOME_DESCRIPTION },
        ]}
      />

      <SoftLaunchStrip />
      <HfProductRail />
      <HomeViralWall items={attractionWall} />
      <HomeCinemaHero />
      <HomeTrustFooter />
    </div>
  );
}
